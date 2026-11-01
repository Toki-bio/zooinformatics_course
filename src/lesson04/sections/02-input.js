(function(){
  var fig = document.getElementById('s02-fig');
  if (!fig) return;
  var NS = 'http://www.w3.org/2000/svg';
  var D = 30, TRUE_RATE = 2.5, SEG = 50, BIN = 100;
  var el = function(id){ return document.getElementById(id); };
  var ctl = { dmin: el('s02-dmin'), dmax: el('s02-dmax'), mq: el('s02-mq'), af: el('s02-af'),
    rep: el('s02-rep'), ssr: el('s02-ssr'), x: el('s02-x'), mt: el('s02-mt') };
  var rule = 'fq', seed = 20261031;
  var PRESETS = {
    loose:  { dmin: 1,  dmax: 200, mq: 0,  af: 0,    rep: false, ssr: false, x: false, mt: false },
    readme: { dmin: 10, dmax: 60,  mq: 20, af: 0.3,  rep: false, ssr: true,  x: true,  mt: true },
    strict: { dmin: 25, dmax: 36,  mq: 60, af: 0.45, rep: true,  ssr: true,  x: true,  mt: true }
  };
  var CONTIGS = [
    { name: 'ctg1', kind: 'auto', len: 8000, label: 'ctg1 · autosome',
      feats: [{ t: 'rep', a: 1200, b: 1900 }, { t: 'dup', a: 3000, b: 3400, c: 2 }, { t: 'ssr', a: 5200, b: 5260 }, { t: 'low', a: 6500, b: 6900 }] },
    { name: 'ctg2', kind: 'auto', len: 6000, label: 'ctg2 · autosome',
      feats: [{ t: 'rep', a: 800, b: 1400 }, { t: 'dup', a: 4000, b: 4450, c: 3 }] },
    { name: 'ctgX', kind: 'X', len: 4000, label: 'ctgX · X chromosome of a male (one copy)', feats: [] },
    { name: 'mt', kind: 'mt', len: 1600, label: 'mt · mitochondrion (shortened)', feats: [] }
  ];
  var TYPE_TXT = {
    err: 'sequencing errors', par: 'differences between copies of a collapsed duplication',
    map: 'reads from other repeat copies', ssr: 'microsatellite length alleles',
    mt: 'mixed mtDNA sites (heteroplasmy, NUMT reads)', x: 'errors on the single-copy X'
  };

  function rng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pois(r, m){
    if (m <= 0) return 0;
    if (m < 30){ var L = Math.exp(-m), k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }
    var u1 = r() || 1e-12, u2 = r(), z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.round(m + Math.sqrt(m) * z));
  }
  function binom(r, n, p){
    if (n <= 0) return 0;
    if (n < 80){ var k = 0; for (var i = 0; i < n; i++) if (r() < p) k++; return k; }
    var u1 = r() || 1e-12, u2 = r(), z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.min(n, Math.max(0, Math.round(n * p + Math.sqrt(n * p * (1 - p)) * z)));
  }
  function featAt(c, pos, t){ for (var i = 0; i < c.feats.length; i++){ var f = c.feats[i]; if (f.t === t && pos >= f.a && pos < f.b) return f; } return null; }

  // ---------- generate the toy genome ----------
  var G;
  function generate(){
    var r = rng(seed);
    G = CONTIGS.map(function(c){
      var nS = Math.ceil(c.len / SEG), dep = new Int32Array(nS), mq = new Int32Array(nS);
      for (var s = 0; s < nS; s++){
        var mid = s * SEG + SEG / 2, f = 1, q = 60;
        if (c.kind === 'X') f = 0.5;
        if (c.kind === 'mt') f = 40;
        var dup = featAt(c, mid, 'dup'); if (dup) f = dup.c;
        if (featAt(c, mid, 'low')) f = 0.2;
        if (featAt(c, mid, 'rep')) q = Math.floor(r() * 14);
        else if (featAt(c, mid, 'ssr')) q = 35;
        else if (c.kind !== 'mt' && r() < 0.04) q = 25 + Math.floor(r() * 25);
        dep[s] = pois(r, D * f);
        mq[s] = q;
      }
      var sites = [];
      function add(pos, af, type, real){
        pos = Math.floor(pos); if (pos < 0 || pos >= c.len) return;
        var d = dep[Math.floor(pos / SEG)], k = binom(r, d, af);
        sites.push({ pos: pos, d: d, k: k, f: d ? k / d : 0, type: type, real: real, emit: k >= 2 && d - k >= 2 });
      }
      function poisPos(rate, a, b, fn){ var n = pois(r, rate * (b - a) / 1000); for (var i = 0; i < n; i++) fn(a + r() * (b - a)); }
      if (c.kind === 'auto') poisPos(TRUE_RATE, 0, c.len, function(p){ add(p, 0.5, 'true', true); });
      poisPos(0.6, 0, c.len, function(p){ add(p, 0.07, c.kind === 'X' ? 'x' : (c.kind === 'mt' ? 'mt' : 'err'), false); });
      c.feats.forEach(function(f){
        if (f.t === 'dup') poisPos(7, f.a, f.b, function(p){ add(p, 1 / f.c, 'par', false); });
        if (f.t === 'rep') poisPos(6, f.a, f.b, function(p){ add(p, 0.15 + r() * 0.35, 'map', false); });
        if (f.t === 'ssr') for (var j = 0; j < 5; j++) add(f.a + 6 + j * 11, 0.45 + r() * 0.1, 'ssr', false);
      });
      if (c.kind === 'X') add(c.len * (0.2 + r() * 0.6), 0.4, 'x', false);
      if (c.kind === 'mt'){ for (var m = 0; m < 4; m++) add(r() * c.len, 0.03 + r() * 0.12, 'mt', false); add(r() * c.len, 0.35, 'mt', false); }
      sites.sort(function(a, b){ return a.pos - b.pos; });
      return { c: c, dep: dep, mq: mq, sites: sites };
    });
  }

  // ---------- apply filters ----------
  function settings(){
    return { dmin: +ctl.dmin.value, dmax: +ctl.dmax.value, mq: +ctl.mq.value, af: +ctl.af.value,
      rep: ctl.rep.checked, ssr: ctl.ssr.checked, x: ctl.x.checked, mt: ctl.mt.checked };
  }
  // reason a base is not callable ('' = callable)
  function why(g, pos, S){
    var c = g.c;
    if (c.kind === 'X' && S.x) return 'x';
    if (c.kind === 'mt' && S.mt) return 'mt';
    if (S.rep && featAt(c, pos, 'rep')) return 'rep';
    if (S.ssr && featAt(c, pos, 'ssr')) return 'ssr';
    var s = Math.floor(pos / SEG), d = g.dep[s];
    if (d < S.dmin) return 'lo';
    if (S.dmax < 200 && d > S.dmax) return 'hi';
    if (g.mq[s] < S.mq) return 'mq';
    return '';
  }
  function apply(S){
    var lo = S.af, hi = 1 - S.af;
    var tot = { len: 0, call: 0, lost: { x: 0, mt: 0, rep: 0, ssr: 0, lo: 0, hi: 0, mq: 0 },
      T: 0, K: 0, N: 0, trueAll: 0, trueKept: 0, trueBias: 0, trueGone: 0, falseKept: {}, falseN: 0, keptHets: 0, outLen: 0 };
    G.forEach(function(g){
      var c = g.c, call = new Uint8Array(c.len), removed = (c.kind === 'X' && S.x) || (c.kind === 'mt' && S.mt);
      for (var p = 0; p < c.len; p++){
        var w = why(g, p, S);
        if (!w) call[p] = 1; else tot.lost[w]++;
      }
      tot.len += c.len;
      g.call = call; g.removed = removed;
      g.sites.forEach(function(st){
        st.kept = st.emit && call[st.pos] === 1 && st.f >= lo - 1e-9 && st.f <= hi + 1e-9 && !removed;
        if (st.real){
          tot.trueAll++;
          if (st.kept) tot.trueKept++;
          else if (call[st.pos]) tot.trueBias++;   // base counted as callable, het lost: biased
          else tot.trueGone++;                       // lost together with its base
        } else if (st.kept){
          tot.falseN++; tot.falseKept[st.type] = (tot.falseKept[st.type] || 0) + 1;
        }
        if (st.kept) tot.keptHets++;
      });
      // bins
      var nb = Math.ceil(c.len / BIN), bins = [];
      for (var b = 0; b < nb; b++){
        var a0 = b * BIN, a1 = Math.min(c.len, a0 + BIN), good = 0, q;
        for (q = a0; q < a1; q++) good += call[q];
        var miss = BIN - good, het = false;
        g.sites.forEach(function(st){ if (st.kept && st.pos >= a0 && st.pos < a1) het = true; });
        var L = (rule === 'fq' ? miss / BIN > 0.9 : good < 50) ? 'N' : (het ? 'K' : 'T');
        bins.push({ L: L, good: good });
        if (!removed){ tot[L]++; }
      }
      g.bins = bins;
      if (!removed) tot.outLen += c.len;
    });
    // recount callable exactly (after base-exact masks)
    tot.call = 0;
    G.forEach(function(g){ if (!g.removed) for (var i = 0; i < g.c.len; i++) tot.call += g.call[i]; });
    return tot;
  }

  // ---------- drawing ----------
  function css(v){ return 'var(' + v + ')'; }
  function mk(tag, attrs, txt){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  var W = 960, X0 = 20, SC = 920 / 8000, ROW = 146;
  function xp(bp){ return X0 + bp * SC; }

  function draw(S){
    var H = ROW * G.length + 34;
    var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Toy genome strip: repeats, depth with filter bounds, callable bases, heterozygous sites and the resulting 100-bp bins' });
    svg.style.minWidth = '660px';
    svg.style.fontSize = '11px';
    var YMAX = 2.6 * D;
    G.forEach(function(g, gi){
      var c = g.c, y = gi * ROW + 4, wpx = c.len * SC;
      var off = g.removed;
      svg.appendChild(mk('text', { x: X0, y: y + 11, fill: css(off ? '--muted' : '--fg'), 'font-weight': '600' }, c.label + (off ? '  (left out)' : '')));
      // features band
      var yF = y + 18;
      svg.appendChild(mk('rect', { x: X0, y: yF, width: wpx, height: 7, fill: css('--line') }));
      c.feats.forEach(function(f){
        var col = f.t === 'rep' ? '--rep' : f.t === 'ssr' ? '--err' : f.t === 'dup' ? '--accent' : '--muted';
        var r = mk('rect', { x: xp(f.a), y: yF, width: Math.max(2, (f.b - f.a) * SC), height: 7, fill: css(col) });
        svg.appendChild(r);
        var t = f.t === 'rep' ? 'interspersed repeat' : f.t === 'ssr' ? 'microsatellite' : f.t === 'dup' ? 'collapsed duplication, ' + f.c + ' copies' : 'low coverage';
        svg.appendChild(mk('text', { x: xp(f.a), y: yF + 18, fill: css('--muted'), 'font-size': '10' }, t));
      });
      // depth panel
      var yD = y + 46, hD = 42;
      svg.appendChild(mk('rect', { x: X0, y: yD, width: wpx, height: hD, fill: 'none', stroke: css('--line') }));
      var d = '';
      for (var s = 0; s < g.dep.length; s++){
        var v = Math.min(g.dep[s], YMAX), yy = yD + hD - v / YMAX * hD;
        d += (s ? 'L' : 'M') + xp(s * SEG).toFixed(1) + ' ' + yy.toFixed(1) + 'L' + xp(Math.min(c.len, (s + 1) * SEG)).toFixed(1) + ' ' + yy.toFixed(1);
      }
      svg.appendChild(mk('path', { d: d, fill: 'none', stroke: css('--fg'), 'stroke-width': 1.2, opacity: off ? 0.35 : 0.8 }));
      [S.dmin, S.dmax < 200 ? S.dmax : null].forEach(function(b){
        if (b == null || b > YMAX) return;
        var yb = yD + hD - b / YMAX * hD;
        svg.appendChild(mk('line', { x1: X0, x2: X0 + wpx, y1: yb, y2: yb, stroke: css('--accent'), 'stroke-dasharray': '4 3', 'stroke-width': 1.2 }));
      });
      if (c.kind === 'mt') svg.appendChild(mk('text', { x: X0 + wpx + 6, y: yD + 10, fill: css('--muted') }, 'depth ≈ ' + (40 * D) + '×, off scale'));
      // callable band
      var yC = yD + hD + 4, dc = '';
      var run = -1;
      for (var i = 0; i <= c.len; i++){
        var on = i < c.len && g.call[i] && !off;
        if (on && run < 0) run = i;
        if (!on && run >= 0){ dc += 'M' + xp(run).toFixed(2) + ' ' + yC + 'h' + ((i - run) * SC).toFixed(2) + 'v6h' + (-(i - run) * SC).toFixed(2) + 'z'; run = -1; }
      }
      svg.appendChild(mk('rect', { x: X0, y: yC, width: wpx, height: 6, fill: css('--line') }));
      if (dc) svg.appendChild(mk('path', { d: dc, fill: css('--good') }));
      // het markers
      var yH = yC + 18;
      svg.appendChild(mk('line', { x1: X0, x2: X0 + wpx, y1: yH, y2: yH, stroke: css('--line') }));
      g.sites.forEach(function(st){
        if (!st.emit) {
          if (st.real) svg.appendChild(mk('circle', { cx: xp(st.pos), cy: yH, r: 2, fill: 'none', stroke: css('--muted'), 'stroke-width': 1, opacity: 0.6 }));
          return;
        }
        var x = xp(st.pos);
        if (st.real){
          svg.appendChild(mk('circle', { cx: x, cy: yH, r: 3.4, fill: st.kept ? css('--het') : 'none', stroke: css('--het'), 'stroke-width': 1.3, opacity: st.kept ? 1 : 0.55 }));
        } else {
          svg.appendChild(mk('path', { d: 'M' + (x - 3.2) + ' ' + (yH - 3.2) + 'l6.4 6.4M' + (x - 3.2) + ' ' + (yH + 3.2) + 'l6.4 -6.4', stroke: css('--bad'), 'stroke-width': st.kept ? 2 : 1, opacity: st.kept ? 1 : 0.35 }));
        }
      });
      // bins
      var yB = yH + 10, bw = BIN * SC;
      g.bins.forEach(function(b, k){
        var x = xp(k * BIN), fill = off ? 'none' : (b.L === 'K' ? css('--het') : b.L === 'N' ? css('--line') : 'none');
        svg.appendChild(mk('rect', { x: x + 0.4, y: yB, width: bw - 0.8, height: 13, fill: fill, stroke: css('--line'), 'stroke-width': 0.6 }));
        if (!off) svg.appendChild(mk('text', { x: x + bw / 2, y: yB + 10, 'text-anchor': 'middle', 'font-size': '9', 'font-family': 'var(--f-mono)', fill: b.L === 'K' ? css('--bg') : css('--muted') }, b.L));
      });
    });
    // scale bar
    var yA = ROW * G.length + 14;
    svg.appendChild(mk('line', { x1: X0, x2: xp(1000), y1: yA, y2: yA, stroke: css('--fg') }));
    svg.appendChild(mk('text', { x: xp(1000) + 6, y: yA + 4, fill: css('--muted') }, '1 kb = 10 bins of 100 bp'));
    fig.replaceChildren(svg);
  }

  function legend(){
    var items = [
      ['--rep', 'interspersed repeat (low mapping quality)'], ['--accent', 'collapsed duplication'], ['--err', 'microsatellite'],
      ['--good', 'callable bases'], ['--het', 'real het site: filled = kept, open = removed'], ['--bad', '× false het: bold = kept'],
      ['--muted', 'low coverage'], ['--line', 'N bin']
    ];
    el('s02-legend').innerHTML = items.map(function(it){ return '<span><i style="background:var(' + it[0] + ');height:8px"></i>' + it[1] + '</span>'; }).join('') +
      '<span><i style="background:var(--fg);height:2px"></i>read depth (scale 0 to ' + (2.6 * D) + '×)</span><span><i style="border-top:2px dashed var(--accent);height:0;background:none"></i>your depth bounds</span>';
  }

  function pct(a, b){ return b ? (100 * a / b).toFixed(1) + ' %' : '–'; }
  function readout(S, t){
    var keptRate = t.call ? t.keptHets / t.call * 1000 : 0;
    var nonN = t.T + t.K;
    // expected K share at the true rate
    var expK = 1 - Math.exp(-TRUE_RATE * BIN / 1000);
    var lostTxt = [['lo', 'below minimum depth'], ['hi', 'above maximum depth'], ['mq', 'low mapping quality'], ['rep', 'repeat mask'], ['ssr', 'simple-repeat mask'], ['x', 'X left out'], ['mt', 'mitochondrion left out']]
      .filter(function(k){ return t.lost[k[0]] > 0; }).map(function(k){ return k[1] + ' ' + pct(t.lost[k[0]], t.len); }).join(' · ') || 'nothing';
    el('s02-out').innerHTML =
      '<div>Callable bases (what PSMC can use)<b>' + (t.call / 1000).toFixed(1) + ' of ' + (t.len / 1000).toFixed(1) + ' kb (' + pct(t.call, t.len) + ')</b><span class="tool-note">removed: ' + lostTxt + '</span></div>' +
      '<div>Bins written: <span class="mono">T K N</span><b>' + t.T + ' · ' + t.K + ' · ' + t.N + '</b><span class="tool-note">missing data (N share): ' + pct(t.N, t.T + t.K + t.N) + '</span></div>' +
      '<div><span class="tip" title="Heterozygous sites kept by your filters, divided by the callable bases, per 1,000 bases. In the toy the real value on the autosomes is 2.5 per kb.">Het sites per callable kb</span><b>' + keptRate.toFixed(2) + ' (truth ' + TRUE_RATE.toFixed(1) + ')</b><span class="tool-note">share of K among non-N bins: ' + pct(t.K, nonN) + ' (expected about ' + (expK * 100).toFixed(0) + ' % at the true rate)</span></div>' +
      '<div>Real het sites (autosomes)<b>' + t.trueKept + ' of ' + t.trueAll + ' kept</b><span class="tool-note">' + t.trueBias + ' lost while their base stays callable (bias) · ' + t.trueGone + ' lost with their base (less data)</span></div>';
    // verdict
    var v = [];
    if (t.falseN > 0){
      var parts = Object.keys(t.falseKept).map(function(k){ return t.falseKept[k] + ' from ' + TYPE_TXT[k]; });
      v.push('<b class="s02-bad">' + t.falseN + ' false het site' + (t.falseN > 1 ? 's' : '') + ' kept</b> (' + pct(t.falseN, t.keptHets) + ' of all kept het sites): ' + parts.join('; ') + '. Each one can turn a T bin into a K bin, which PSMC reads as more diversity, so larger population sizes.');
    } else v.push('<b class="s02-good">No false het site kept.</b>');
    if (t.trueBias > 0){
      v.push('<b class="s02-bad">' + t.trueBias + ' real het site' + (t.trueBias > 1 ? 's' : '') + ' removed while the base still counts as callable</b>: those bins become T instead of K, as if the two copies were identical there. This biases heterozygosity, and the whole curve, downwards (the <span class="tip" title="False negative rate: the share of real heterozygous sites that the calls missed.">false negative rate</span> here is ' + pct(t.trueBias, t.trueAll) + ').');
    }
    if (!S.x) v.push('The X is in: its ' + (G[2].c.len / 1000) + ' kb of single-copy sequence is counted as if it were a diploid autosome with almost no heterozygosity.');
    if (!S.mt) v.push('The mitochondrion is in: a haploid molecule at ' + (40 * D) + '× depth, whose mixed sites become K bins.');
    if (t.call / t.len < 0.5) v.push('Less than half of the toy genome is left. In a real genome that means fewer informative stretches and wider error ranges (the bootstraps of s03); compare with the 25 % missing-data guide in the text.');
    el('s02-verdict').innerHTML = v.map(function(s){ return '<p>' + s + '</p>'; }).join('');
  }

  function psmcfaText(){
    var out = [];
    G.forEach(function(g){
      if (g.removed) return;
      var s = g.bins.map(function(b){ return b.L; }).join('');
      var lines = [];
      for (var i = 0; i < s.length; i += 60) lines.push(s.slice(i, i + 60));
      out.push('&gt;' + g.c.name + '\n' + lines.join('\n')
        .replace(/K+/g, function(m){ return '<span class="s02-k">' + m + '</span>'; })
        .replace(/N+/g, function(m){ return '<span class="s02-n">' + m + '</span>'; }));
    });
    el('s02-psmcfa').innerHTML = out.join('\n');
  }

  function labels(S){
    el('s02-dmin-o').textContent = S.dmin + '× (' + (S.dmin / D).toFixed(2) + ' of mean)';
    el('s02-dmax-o').textContent = S.dmax >= 200 ? 'no limit' : S.dmax + '× (' + (S.dmax / D).toFixed(1) + ' × mean)';
    el('s02-mq-o').textContent = S.mq;
    el('s02-af-o').textContent = S.af <= 0 ? 'no filter' : S.af.toFixed(2) + ' to ' + (1 - S.af).toFixed(2);
  }

  function update(){
    var S = settings();
    labels(S);
    var t = apply(S);
    draw(S); readout(S, t); psmcfaText();
  }
  function setPreset(name){
    var P = PRESETS[name];
    ctl.dmin.value = P.dmin; ctl.dmax.value = P.dmax; ctl.mq.value = P.mq; ctl.af.value = P.af;
    ctl.rep.checked = P.rep; ctl.ssr.checked = P.ssr; ctl.x.checked = P.x; ctl.mt.checked = P.mt;
    pressed('s02-preset', name);
    update();
  }
  function pressed(id, v){
    Array.prototype.forEach.call(el(id).querySelectorAll('button'), function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-v') === v ? 'true' : 'false'); });
  }
  el('s02-preset').addEventListener('click', function(e){ var b = e.target.closest('button'); if (b) setPreset(b.getAttribute('data-v')); });
  el('s02-rule').addEventListener('click', function(e){ var b = e.target.closest('button'); if (!b) return; rule = b.getAttribute('data-v'); pressed('s02-rule', rule); update(); });
  Object.keys(ctl).forEach(function(k){
    ctl[k].addEventListener('input', function(){ pressed('s02-preset', ''); update(); });
  });
  el('s02-new').addEventListener('click', function(){ seed = (seed * 1103515245 + 12345) >>> 0; generate(); update(); });
  legend();
  generate();
  update();
})();
