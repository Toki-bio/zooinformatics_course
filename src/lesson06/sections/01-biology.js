(function(){
  var NS = 'http://www.w3.org/2000/svg';
  var el = function(id){ return document.getElementById(id); };
  if (!el('s01-seqfig') || !el('s01-calc-plot')) return;

  function rng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function mk(tag, attrs, txt){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  function svg(w, h, minw, label){
    return mk('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', style: 'min-width:' + minw + 'px;display:block', role: 'img', 'aria-label': label });
  }
  function tip(word, expl){ return '<span class="tip" title="' + expl + '">' + word + '</span>'; }
  var T_OE = 'CpG observed/expected: number of CpG times length, divided by number of C times number of G (Gardiner-Garden and Frommer 1987). About 1 in random sequence; low where methylation has turned CpG into TpG and CpA.';
  var T_LEV = 'Methylation level: the share of DNA copies (reads) that carry the methyl mark at a CpG, from 0 to 100 %.';
  var T_GC = 'G+C content: the share of bases that are G or C.';

  // generate a random sequence with G+C share gc; a G right after a C is kept with probability keep,
  // otherwise redrawn from A, C, T (this lowers CpG observed/expected)
  // boost: extra chance that a C is followed by G (raises CpG observed/expected above 1 if large)
  function gen(n, gc, keep, r, boost){
    var s = [], prev = '';
    for (var i = 0; i < n; i++){
      var b, u = r();
      if (prev === 'C' && boost && r() < boost) b = 'G';
      else if (u < gc){ b = r() < 0.5 ? 'C' : 'G'; } else { b = r() < 0.5 ? 'A' : 'T'; }
      if (prev === 'C' && b === 'G' && r() >= keep){ var alt = ['A', 'C', 'T']; b = alt[Math.floor(r() * 3)]; }
      s.push(b); prev = b;
    }
    return s.join('');
  }
  function counts(s){
    var c = 0, g = 0, n = 0, cg = 0;
    for (var i = 0; i < s.length; i++){
      var b = s[i];
      if (b === 'C') c++; else if (b === 'G') g++;
      if (b === 'A' || b === 'C' || b === 'G' || b === 'T') n++;
      if (b === 'C' && s[i + 1] === 'G') cg++;
    }
    return { c: c, g: g, n: n, cg: cg, oe: (c > 0 && g > 0) ? cg * n / (c * g) : NaN, gc: n ? (c + g) / n : NaN };
  }

  // ---------------- toy: one stretch in five contexts ----------------
  var LEN = 120, LINE = 60, NREAD = 12;
  var SEQ = {}, MUT = {};
  (function build(){
    SEQ.prom = gen(LEN, 0.7, 1, rng(511), 0.1);
    SEQ.silent = SEQ.prom;
    SEQ.body = gen(LEN, 0.46, 0.3, rng(534));
    SEQ.teY = gen(LEN, 0.58, 1, rng(523), 0.1);
    // old copy = the young one after CpG decay: most CpGs became TpG or CpA
    var r = rng(504), a = SEQ.teY.split(''), m = {};
    for (var i = 0; i < a.length - 1; i++){
      if (a[i] === 'C' && a[i + 1] === 'G' && r() < 0.75){
        if (r() < 0.5){ a[i] = 'T'; m[i] = 1; } else { a[i + 1] = 'A'; m[i + 1] = 1; }
        i++;
      }
    }
    SEQ.teO = a.join(''); MUT.teO = m;
  })();
  // illustrative methylation levels (share of copies methylated) per context and lineage
  var LEVEL = {
    vert: { prom: 0.03, silent: null, body: 0.85, teY: 0.92, teO: 0.9 },
    ins:  { prom: 0.02, silent: 0.02, body: 0.55, teY: 0.04, teO: 0.04 },
    fly:  { prom: 0, silent: 0, body: 0, teY: 0, teO: 0 }
  };
  var CTXNAME = { prom: 'promoter CpG island', silent: 'silenced CpG island', body: 'gene body', teY: 'young transposon copy', teO: 'old transposon copy' };
  var ctx = 'prom', lin = 'vert', readSeed = 7;

  function cpgPos(s){ var p = []; for (var i = 0; i < s.length - 1; i++) if (s[i] === 'C' && s[i + 1] === 'G') p.push(i); return p; }

  function siteLevels(pos){
    var r = rng(900 + pos.length + ctx.length * 13), out = [];
    for (var k = 0; k < pos.length; k++){
      var base, j = (r() - 0.5) * 0.1;
      if (ctx === 'silent' && lin === 'vert') base = 0.5 * 0.95 + 0.5 * 0.02;
      else base = LEVEL[lin][ctx];
      out.push(base === 0 ? 0 : Math.max(0, Math.min(1, base + j)));
    }
    return out;
  }
  function drawReads(pos, lev){
    var r = rng(readSeed * 7919 + pos.length), reads = [];
    for (var i = 0; i < NREAD; i++){
      var row = [], copyA = r() < 0.5;
      for (var k = 0; k < pos.length; k++){
        var p;
        if (ctx === 'silent' && lin === 'vert') p = copyA ? 0.95 : 0.02;
        else p = lev[k];
        row.push(r() < p ? 1 : 0);
      }
      reads.push(row);
    }
    return reads;
  }

  function renderSeq(s, pos, lev){
    var CW = 13.5, X0 = 64, W = 900, LH = 84, H = 30 + 2 * LH;
    var g = svg(W, H, 660, 'Toy sequence of the ' + CTXNAME[ctx] + ' with CpG sites as lollipops');
    g.appendChild(mk('text', { x: X0, y: 14, 'class': 'lab' }, 'Toy ' + LEN + '-bp stretch: ' + CTXNAME[ctx]));
    var isPos = {}; pos.forEach(function(p, k){ isPos[p] = k; });
    for (var ln = 0; ln < 2; ln++){
      var yb = 30 + ln * LH, ySeq = yb + 66;
      g.appendChild(mk('text', { x: X0 - 8, y: ySeq, 'text-anchor': 'end' }, String(ln * LINE + 1)));
      for (var i = 0; i < LINE; i++){
        var gi = ln * LINE + i, b = s[gi], x = X0 + i * CW + CW / 2;
        var inCpG = (isPos[gi] !== undefined) || (isPos[gi - 1] !== undefined);
        var mut = MUT[ctx] && MUT[ctx][gi];
        var t = mk('text', { x: x, y: ySeq, 'text-anchor': 'middle', style: 'font-size:13px;' + (inCpG ? 'fill:var(--accent);font-weight:700' : mut ? 'fill:var(--bad);font-weight:700' : 'fill:var(--fg)') }, b);
        g.appendChild(t);
        if (mut) g.appendChild(mk('text', { x: x, y: ySeq - 18, 'text-anchor': 'middle', style: 'fill:var(--bad);font-size:12px' }, '×'));
        if (isPos[gi] !== undefined){
          var k = isPos[gi], lx = x + CW / 2, top = yb + 16, r0 = 6.5;
          g.appendChild(mk('line', { x1: lx, x2: lx, y1: top + r0, y2: ySeq - 14, stroke: 'var(--muted)', 'stroke-width': 1.2 }));
          g.appendChild(mk('circle', { cx: lx, cy: top, r: r0, fill: 'var(--panel)', stroke: 'var(--accent)', 'stroke-width': 1.5 }));
          var L = lev[k];
          if (L > 0.001){
            // fill from the bottom of the head in proportion to the level
            var id = 's01-cl-' + ln + '-' + i;
            var cp = mk('clipPath', { id: id }); cp.appendChild(mk('rect', { x: lx - r0, y: top + r0 - 2 * r0 * L, width: 2 * r0, height: 2 * r0 * L }));
            g.appendChild(cp);
            g.appendChild(mk('circle', { cx: lx, cy: top, r: r0, fill: 'var(--accent)', 'clip-path': 'url(#' + id + ')' }));
          }
          var tt = mk('title', {}, 'CpG at ' + (gi + 1) + ': methylation level ' + Math.round(L * 100) + ' %');
          g.lastChild.appendChild(tt);
        }
      }
    }
    return g;
  }

  function renderReads(pos, reads, lev){
    var n = pos.length, X0 = 92, W = 900, RH = 17, Y0 = 34;
    var span = Math.min(44, n ? (W - X0 - 70) / n : 44);
    var H = Y0 + NREAD * RH + 46;
    var g = svg(W, H, 660, 'Twelve reads over the CpGs of the toy stretch; filled dots are methylated');
    g.appendChild(mk('text', { x: X0, y: 14, 'class': 'lab' }, n ? '12 reads (single DNA molecules) over the ' + n + ' CpGs, left to right' : 'No CpG left in this stretch'));
    for (var i = 0; i < NREAD; i++){
      var y = Y0 + i * RH, m = 0;
      g.appendChild(mk('text', { x: X0 - 12, y: y + 4, 'text-anchor': 'end' }, 'read ' + (i + 1)));
      if (n) g.appendChild(mk('line', { x1: X0, x2: X0 + (n - 1) * span, y1: y, y2: y, stroke: 'var(--line)' }));
      for (var k = 0; k < n; k++){
        var x = X0 + k * span, on = reads[i][k];
        m += on;
        g.appendChild(mk('circle', { cx: x, cy: y, r: 5, fill: on ? 'var(--accent)' : 'var(--panel)', stroke: 'var(--accent)', 'stroke-width': 1.3 }));
      }
      if (n) g.appendChild(mk('text', { x: X0 + (n - 1) * span + 16, y: y + 4 }, m + '/' + n));
    }
    var yl = Y0 + NREAD * RH + 14;
    g.appendChild(mk('text', { x: X0 - 12, y: yl + 4, 'text-anchor': 'end', 'class': 'lab' }, 'level'));
    for (var k2 = 0; k2 < n; k2++){
      var c = 0; for (var j = 0; j < NREAD; j++) c += reads[j][k2];
      g.appendChild(mk('text', { x: X0 + k2 * span, y: yl + 4, 'text-anchor': 'middle', style: 'font-size:10.5px' }, Math.round(100 * c / NREAD)));
    }
    g.appendChild(mk('text', { x: X0, y: yl + 24 }, '% of the 12 reads methylated at each CpG'));
    return g;
  }

  var NOTE = {
    vert: {
      prom: 'A CpG island at an active promoter: many CpGs, almost none methylated. In mammals islands stay unmethylated in most cells and tissues.',
      silent: 'A CpG island on one parental copy only, as on the inactive X of a female placental mammal or at an imprinted gene. The bulk level is near 50 %, but each read is almost all methylated or almost all unmethylated: two kinds of molecule, not one half-methylated kind.',
      body: 'The body of a gene: CpGs are scarce (they have decayed) and the few left are mostly methylated, like the rest of a mammalian genome. Methylation here does not mean that the gene is silent.',
      teY: 'A young transposon copy: still CpG-rich, because there has been little time for decay, and heavily methylated, which keeps its promoter silent.',
      teO: 'The same copy much later: most CpGs have become TpG or CpA (×). The surviving CpGs are still methylated. The lost CpGs are the scar that dates the copy.'
    },
    ins: {
      prom: 'In invertebrates studied so far, methylation sits mostly in gene bodies (Keller et al. 2016), and the role of promoter methylation is little explored; the toy shows this promoter unmethylated.',
      silent: 'X inactivation by island methylation is a mammalian mechanism; it is not modelled for an insect, so this copy is shown unmethylated.',
      body: 'Gene bodies are where insect methylation sits, and only in a subset of genes. The level here is illustrative; Bewick et al. (2017) found up to about 42 % in coding regions of the most methylated species.',
      teY: 'Transposons are not singled out for methylation in invertebrates (Zemach et al. 2010), so the copy is shown unmethylated, and its CpGs do not decay faster than other sites.',
      teO: 'The toy reuses the mammalian decayed copy so you can compare; in an insect without transposon methylation, CpG loss of this size would not be expected.'
    },
    fly: {
      prom: 'Flies (Diptera) have no DNA methylation and no DNMT1 or DNMT3 genes (Bewick et al. 2017): every CpG is empty, in every context.',
      silent: 'No DNA methylation in flies: nothing to show.',
      body: 'No DNA methylation in flies: gene bodies are empty too.',
      teY: 'No DNA methylation in flies: transposons are kept in check by other means.',
      teO: 'No DNA methylation in flies; the decayed toy copy is the mammalian one, kept for comparison.'
    }
  };

  function renderToy(){
    var s = SEQ[ctx], pos = cpgPos(s), lev = siteLevels(pos), reads = drawReads(pos, lev), cnt = counts(s);
    var fig = el('s01-seqfig'); fig.innerHTML = ''; fig.appendChild(renderSeq(s, pos, lev));
    var rf = el('s01-reads'); rf.innerHTML = ''; rf.appendChild(renderReads(pos, reads, lev));
    var tot = 0, m = 0; reads.forEach(function(r){ r.forEach(function(v){ tot++; m += v; }); });
    var allOrNone = 0; reads.forEach(function(r){ var sm = r.reduce(function(a, b){ return a + b; }, 0); if (r.length && (sm <= 1 || sm >= r.length - 1)) allOrNone++; });
    el('s01-out').innerHTML =
      '<div>CpGs in the ' + LEN + ' bp<b>' + pos.length + '</b></div>' +
      '<div>' + tip('CpG observed/expected', T_OE) + '<b>' + (isNaN(cnt.oe) ? 'n/a' : cnt.oe.toFixed(2)) + '</b></div>' +
      '<div>Mean ' + tip('methylation level', T_LEV) + ' over the reads<b>' + (tot ? Math.round(100 * m / tot) : 0) + ' %</b></div>' +
      '<div>Reads with all CpGs alike (at most one differs)<b>' + (pos.length > 3 ? allOrNone + ' of ' + NREAD : 'n/a') + '</b></div>' +
      '<div style="grid-column:1/-1">' + NOTE[lin][ctx] + '</div>';
  }
  function seg(id, set){
    var box = el(id);
    box.addEventListener('click', function(e){
      var b = e.target.closest('button'); if (!b) return;
      box.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      set(b.getAttribute('data-v'));
    });
  }
  seg('s01-ctx', function(v){ ctx = v; renderToy(); });
  seg('s01-lin', function(v){ lin = v; renderToy(); });
  el('s01-new').addEventListener('click', function(){ readSeed++; renderToy(); });
  el('s01-legend').innerHTML =
    '<span><i style="background:var(--accent);height:10px;width:10px;border-radius:50%"></i>methylated CpG (filled share = ' + tip('level', T_LEV) + ')</span>' +
    '<span><i style="background:var(--panel);border:1.5px solid var(--accent);height:10px;width:10px;border-radius:50%"></i>unmethylated CpG</span>' +
    '<span><i style="background:var(--bad);height:3px"></i>× = former CpG, now TG or CA</span>';
  renderToy();

  // ---------------- calculator ----------------
  var WIN = 200, MAXLEN = 200000;
  var EX = {
    bg: function(){ return gen(1500, 0.41, 0.15, rng(11)); },
    island: function(){ return gen(700, 0.41, 0.15, rng(12)) + gen(600, 0.65, 1, rng(13), 0.05) + gen(700, 0.41, 0.15, rng(14)); },
    random: function(){ return gen(1500, 0.5, 1.0, rng(15)); }
  };
  function wrap60(s){ return s.replace(/(.{60})/g, '$1\n').trim(); }
  function clean(txt){
    var lines = txt.split(/\r?\n/).filter(function(l){ return l.charAt(0) !== '>'; });
    var s = lines.join('').replace(/[\s0-9]/g, '').toUpperCase();
    return s.replace(/[^ACGT]/g, 'N');
  }
  var ta = el('s01-seq'), timer = null;
  function setEx(v){ ta.value = '>example_' + v + ' (generated in the page)\n' + wrap60(EX[v]()); runCalc(); }
  seg('s01-ex', setEx);
  ta.addEventListener('input', function(){ clearTimeout(timer); timer = setTimeout(runCalc, 250); });
  el('s01-calc-legend').innerHTML =
    '<span><i style="background:var(--accent)"></i>CpG observed/expected, 200-bp window (line at 0.6)</span>' +
    '<span><i style="background:var(--het)"></i>' + tip('G+C', T_GC) + ' share, 200-bp window (line at 0.5)</span>' +
    '<span><i style="background:var(--good);height:10px;opacity:.35"></i>window passes both</span>';

  function runCalc(){
    var s = clean(ta.value), out = el('s01-calc-out'), plot = el('s01-calc-plot');
    plot.innerHTML = '';
    if (s.length > MAXLEN){ out.innerHTML = '<div style="grid-column:1/-1" class="warn-text">Sequence longer than ' + MAXLEN.toLocaleString('en-US') + ' bp: paste a shorter stretch.</div>'; return; }
    var c = counts(s);
    if (c.n < 2){ out.innerHTML = '<div style="grid-column:1/-1">Paste a DNA sequence (A, C, G, T) or load an example.</div>'; return; }
    var exp = c.c * c.g / c.n;
    var fails = [];
    if (!(c.n > WIN)) fails.push('length not over 200 bp');
    if (!(c.gc >= 0.5)) fails.push('G+C below 50 %');
    if (!(c.oe > 0.6)) fails.push('observed/expected not above 0.6');
    out.innerHTML =
      '<div>Length (A, C, G, T counted)<b>' + c.n.toLocaleString('en-US') + ' bp</b></div>' +
      '<div>' + tip('G+C', T_GC) + '<b>' + (100 * c.gc).toFixed(1) + ' %</b></div>' +
      '<div>CpG count: observed / expected<b>' + c.cg + ' / ' + exp.toFixed(1) + '</b></div>' +
      '<div>' + tip('CpG observed/expected', T_OE) + '<b>' + (isNaN(c.oe) ? 'n/a (no C or no G)' : c.oe.toFixed(2)) + '</b></div>' +
      '<div style="grid-column:1/-1">Whole sequence against the Gardiner-Garden &amp; Frommer criteria: ' +
      (fails.length ? '<b style="display:inline;font-size:inherit;font-family:inherit">does not pass</b> (' + fails.join('; ') + ').' : '<b style="display:inline;font-size:inherit;font-family:inherit">passes all three</b>.') +
      (s.indexOf('N') >= 0 ? ' Letters other than A, C, G, T were found and not counted.' : '') + '</div>';
    if (s.length < WIN) return;
    // window scan with prefix sums
    var L = s.length, pc = new Int32Array(L + 1), pg = new Int32Array(L + 1), pn = new Int32Array(L + 1), pcg = new Int32Array(L + 1);
    for (var i = 0; i < L; i++){
      var b = s[i];
      pc[i + 1] = pc[i] + (b === 'C'); pg[i + 1] = pg[i] + (b === 'G'); pn[i + 1] = pn[i] + (b !== 'N');
      pcg[i + 1] = pcg[i] + (b === 'C' && s[i + 1] === 'G');
    }
    var nw = L - WIN + 1, oe = new Float32Array(nw), gc = new Float32Array(nw), pass = new Uint8Array(nw);
    for (var w = 0; w < nw; w++){
      var C = pc[w + WIN] - pc[w], G = pg[w + WIN] - pg[w], N = pn[w + WIN] - pn[w];
      var CG = pcg[w + WIN - 1] - pcg[w];        // CpG must start before the last base of the window
      oe[w] = (C && G) ? CG * N / (C * G) : 0; gc[w] = N ? (C + G) / N : 0;
      pass[w] = (gc[w] >= 0.5 && oe[w] > 0.6 && N === WIN) ? 1 : 0;
    }
    // merge passing windows whose 200-bp spans overlap or touch; a run is [first start, last start]
    var runs = [];
    for (var w2 = 0; w2 < nw; w2++){
      if (!pass[w2]) continue;
      var last = runs[runs.length - 1];
      if (last && w2 <= last[1] + WIN) last[1] = w2; else runs.push([w2, w2]);
    }
    var W = 900, X0 = 50, PW = 820, PH = 150, Y0 = 16, YMAX = 1.5;
    var g = svg(W, Y0 + PH + 44, 600, 'CpG observed/expected and G+C along the sequence in 200-bp windows');
    var tx = function(p){ return X0 + p / L * PW; }, ty = function(v){ return Y0 + PH - Math.min(v, YMAX) / YMAX * PH; };
    runs.forEach(function(r){ g.appendChild(mk('rect', { x: tx(r[0]), y: Y0, width: Math.max(1, tx(r[1] + WIN) - tx(r[0])), height: PH, fill: 'var(--good)', opacity: 0.22 })); });
    [0, 0.5, 1, 1.5].forEach(function(v){
      g.appendChild(mk('line', { x1: X0, x2: X0 + PW, y1: ty(v), y2: ty(v), 'class': 'grid' }));
      g.appendChild(mk('text', { x: X0 - 6, y: ty(v) + 4, 'text-anchor': 'end' }, v.toFixed(1)));
    });
    g.appendChild(mk('line', { x1: X0, x2: X0 + PW, y1: ty(0.6), y2: ty(0.6), stroke: 'var(--accent)', 'stroke-dasharray': '5 3' }));
    g.appendChild(mk('line', { x1: X0, x2: X0 + PW, y1: ty(0.5), y2: ty(0.5), stroke: 'var(--het)', 'stroke-dasharray': '5 3' }));
    var step = Math.max(1, Math.floor(nw / 900));
    function path(arr, col){
      var d = '';
      for (var w = 0; w < nw; w += step){ var x = tx(w + WIN / 2); d += (d ? 'L' : 'M') + x.toFixed(1) + ' ' + ty(arr[w]).toFixed(1); }
      g.appendChild(mk('path', { d: d, fill: 'none', stroke: col, 'stroke-width': 1.6 }));
    }
    path(gc, 'var(--het)'); path(oe, 'var(--accent)');
    g.appendChild(mk('line', { x1: X0, x2: X0 + PW, y1: Y0 + PH, y2: Y0 + PH, 'class': 'ax' }));
    var nt = 5;
    for (var t = 0; t <= nt; t++){
      var p = Math.round(L * t / nt);
      g.appendChild(mk('text', { x: tx(p), y: Y0 + PH + 16, 'text-anchor': t === 0 ? 'start' : t === nt ? 'end' : 'middle' }, p.toLocaleString('en-US')));
    }
    g.appendChild(mk('text', { x: X0 + PW / 2, y: Y0 + PH + 36, 'text-anchor': 'middle' }, 'position in the pasted sequence (bp)'));
    plot.appendChild(g);
    var desc = runs.length
      ? runs.length + ' island-like stretch' + (runs.length > 1 ? 'es' : '') + ' (passing windows that overlap merged): ' +
        runs.slice(0, 5).map(function(r){ return (r[0] + 1).toLocaleString('en-US') + '–' + (r[1] + WIN).toLocaleString('en-US') + ' (' + (r[1] - r[0] + WIN) + ' bp)'; }).join(', ') + (runs.length > 5 ? ', …' : '') + '.'
      : 'No 200-bp window passes both thresholds.';
    out.insertAdjacentHTML('beforeend', '<div style="grid-column:1/-1">Window scan: ' + desc + '</div>');
  }
  setEx('island');
})();
