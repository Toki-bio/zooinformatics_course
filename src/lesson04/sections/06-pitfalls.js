(function(){
  var fig = document.getElementById('s06-fig');
  if (!fig) return;
  var NS = 'http://www.w3.org/2000/svg';
  var NB = 20000, L = 1e5, MU = 5.4e-9, K = 2 * MU * L;   // 2 Gb in 100-kb blocks; expected hets per generation of TMRCA
  // true history: [start (generations ago), diploid Ne]
  var HIST = [[0, 30e3], [8e3, 130e3], [25e3, 70e3], [80e3, 170e3]];
  var DUP_HETS = 600;                                    // extra "hets" in a collapsed duplication block (6 per kb)
  var ROH_THR = 20, ROH_MINB = 3;                        // caller: < 0.2 het/kb over >= 3 blocks (300 kb)
  var XMIN = 300, XMAX = 3e6, YMIN = 3e3, YMAX = 1e7;
  var seed = 20261031;
  var el = function(id){ return document.getElementById(id); };
  var ctl = { fp: el('s06-fp'), fn: el('s06-fn'), roh: el('s06-roh'), dup: el('s06-dup'), mask: el('s06-mask') };
  var base, cleanCurve;

  function rng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(r){ var u1 = r() || 1e-12, u2 = r(); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); }
  function pois(r, m){
    if (m <= 0) return 0;
    if (m < 30){ var Lm = Math.exp(-m), k = 0, p = 1; do { k++; p *= r(); } while (p > Lm); return k - 1; }
    return Math.max(0, Math.round(m + Math.sqrt(m) * gauss(r)));
  }
  function binomKeep(r, n, pMiss){
    if (pMiss <= 0 || n === 0) return n;
    if (n < 60){ var k = 0; for (var i = 0; i < n; i++) if (r() >= pMiss) k++; return k; }
    var m = n * (1 - pMiss), s = Math.sqrt(n * pMiss * (1 - pMiss));
    return Math.max(0, Math.min(n, Math.round(m + s * gauss(r))));
  }
  function drawT(r){                                     // TMRCA by inverse cumulative hazard, rate 1/(2Ne)
    var E = -Math.log(1 - r());
    for (var i = 0; i < HIST.length; i++){
      var t0 = HIST[i][0], t1 = i + 1 < HIST.length ? HIST[i + 1][0] : Infinity, h = 1 / (2 * HIST[i][1]);
      var cap = (t1 - t0) * h;
      if (E < cap) return t0 + E / h;
      E -= cap;
    }
  }
  function trueNe(t){ var n = HIST[0][1]; for (var i = 0; i < HIST.length; i++) if (t >= HIST[i][0]) n = HIST[i][1]; return n; }

  function generate(){
    var r = rng(seed);
    var T = new Float64Array(NB), k = new Int32Array(NB);
    for (var i = 0; i < NB; i++){ T[i] = drawT(r); k[i] = pois(r, K * T[i]); }
    // fixed random layouts, so moving a slider adds to the same places
    var lr = rng(seed + 101), rohOrder = [], pos = 0;
    while (pos < NB){ var len = 5 + Math.floor(lr() * 46); rohOrder.push([pos, Math.min(NB, pos + len)]); pos += len; }
    for (i = rohOrder.length - 1; i > 0; i--){ var j = Math.floor(lr() * (i + 1)); var tmp = rohOrder[i]; rohOrder[i] = rohOrder[j]; rohOrder[j] = tmp; }
    var dr = rng(seed + 202), dupRank = new Float64Array(NB);
    for (i = 0; i < NB; i++) dupRank[i] = dr();
    base = { T: T, k: k, rohOrder: rohOrder, dupRank: dupRank };
  }

  // observed data for current slider settings
  function observe(fp, fn, rohShare, dupShare){
    var isRoh = new Uint8Array(NB), isDup = new Uint8Array(NB), obs = new Int32Array(NB), fpk = new Int32Array(NB);
    var target = Math.round(rohShare * NB), done = 0;
    for (var a = 0; a < base.rohOrder.length && done < target; a++){
      var s = base.rohOrder[a];
      for (var i = s[0]; i < s[1] && done < target; i++){ isRoh[i] = 1; done++; }
    }
    for (i = 0; i < NB; i++) isDup[i] = base.dupRank[i] < dupShare ? 1 : 0;
    var r = rng(seed + 404);
    for (i = 0; i < NB; i++){
      var tk = isRoh[i] ? 0 : base.k[i];
      var kept = binomKeep(rng((seed + i * 7919) | 0), tk, fn);
      var f = pois(rng((seed + 17 + i * 104729) | 0), fp * 100);
      var d = isDup[i] ? pois(r, DUP_HETS) : 0;
      fpk[i] = f;
      obs[i] = kept + f + d;
    }
    return { obs: obs, isRoh: isRoh, isDup: isDup, fpk: fpk };
  }

  function callMask(obs){                                // runs of >= ROH_MINB blocks with < ROH_THR hets
    var m = new Uint8Array(NB), s = -1;
    for (var i = 0; i <= NB; i++){
      var low = i < NB && obs[i] < ROH_THR;
      if (low && s < 0) s = i;
      if (!low && s >= 0){ if (i - s >= ROH_MINB) for (var j = s; j < i; j++) m[j] = 1; s = -1; }
    }
    return m;
  }

  var EDGES = [0];
  for (var e = 0; e <= 31; e++) EDGES.push(1e3 * Math.pow(10, e / 9));  // 1,000 .. ~2,800,000 generations
  EDGES.push(Infinity);
  function infer(tHat){                                  // piecewise-constant coalescence rate, intervals merged until >= 8 events
    var n = EDGES.length - 1, d = new Float64Array(n), ex = new Float64Array(n);
    for (var q = 0; q < tHat.length; q++){
      var t = tHat[q];
      for (var i = 0; i < n; i++){
        var a = EDGES[i], b = EDGES[i + 1];
        if (t < b){ ex[i] += t - a; d[i]++; break; }
        ex[i] += b - a;
      }
    }
    var out = [], acc = 0, ae = 0, s = 0;
    for (i = 0; i < n; i++){
      acc += d[i]; ae += ex[i];
      if (acc >= 8 || i === n - 1){ out.push([EDGES[s], EDGES[i + 1], ae / (2 * Math.max(acc, 1))]); acc = 0; ae = 0; s = i + 1; }
    }
    return out;
  }
  function neAt(curve, t){ for (var i = 0; i < curve.length; i++) if (t >= curve[i][0] && t < curve[i][1]) return curve[i][2]; return NaN; }

  function css(v){ return 'var(' + v + ')'; }
  function mk(tag, attrs, txt){
    var x = document.createElementNS(NS, tag);
    for (var k in attrs) x.setAttribute(k, attrs[k]);
    if (txt != null) x.textContent = txt;
    return x;
  }
  function fmtN(x){
    if (!isFinite(x)) return '–';
    if (x >= 1e6) return (x / 1e6).toFixed(x >= 1e7 ? 0 : 1) + ' M';
    if (x >= 1e3) return Math.round(x / 1e3) + 'k';
    return String(Math.round(x));
  }

  // ---- strip: first 300 blocks (30 Mb)
  function drawStrip(o, mask){
    var W = 960, H = 140, X0 = 78, PW = 870, NS_ = 300, bw = PW / NS_;
    var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Het count per 100-kb block along the first 30 Mb of the toy genome' });
    svg.style.minWidth = '640px';
    svg.appendChild(mk('text', { x: X0, y: 14, 'class': 'lab' }, 'The het mosaic: first 30 Mb, observed hets per kb in each 100-kb block'));
    var y0 = 26, h = 74, ymax = 6;
    svg.appendChild(mk('line', { x1: X0, x2: X0 + PW, y1: y0 + h, y2: y0 + h, 'class': 'ax' }));
    svg.appendChild(mk('text', { x: X0 - 8, y: y0 + 9, 'text-anchor': 'end' }, ymax + '/kb'));
    svg.appendChild(mk('text', { x: X0 - 8, y: y0 + h, 'text-anchor': 'end' }, '0'));
    for (var i = 0; i < NS_; i++){
      var v = Math.min(ymax, o.obs[i] / 100), bh = Math.max(v / ymax * h, 0.8);
      var col = o.isDup[i] ? '--bad' : (o.isRoh[i] ? '--accent' : '--het');
      var r = mk('rect', { x: (X0 + i * bw).toFixed(2), y: (y0 + h - bh).toFixed(2), width: Math.max(bw - 0.4, 0.6).toFixed(2), height: bh.toFixed(2), fill: css(col) });
      if (mask && mask[i]) r.setAttribute('opacity', '0.25');
      svg.appendChild(r);
      var fpH = Math.min(o.fpk[i] / 100, ymax) / ymax * h;
      if (fpH > 0.3) svg.appendChild(mk('rect', { x: (X0 + i * bw).toFixed(2), y: (y0 + h - bh).toFixed(2), width: Math.max(bw - 0.4, 0.6).toFixed(2), height: Math.min(fpH, bh).toFixed(2), fill: css('--err') }));
      if (o.isRoh[i]) svg.appendChild(mk('rect', { x: (X0 + i * bw).toFixed(2), y: y0 + h + 4, width: bw.toFixed(2), height: 5, fill: css('--accent') }));
      if (mask && mask[i]) svg.appendChild(mk('rect', { x: (X0 + i * bw).toFixed(2), y: y0 + h + 15, width: bw.toFixed(2), height: 5, fill: css('--fg') }));
    }
    svg.appendChild(mk('text', { x: X0 - 8, y: y0 + h + 10, 'text-anchor': 'end' }, 'true ROH'));
    svg.appendChild(mk('text', { x: X0 - 8, y: y0 + h + 21, 'text-anchor': 'end' }, 'masked'));
    [0, 10, 20, 30].forEach(function(mb){ svg.appendChild(mk('text', { x: X0 + mb * 10 * bw, y: H - 2, 'text-anchor': mb === 0 ? 'start' : (mb === 30 ? 'end' : 'middle') }, mb + ' Mb')); });
    el('s06-strip').replaceChildren(svg);
  }

  // ---- curve plot
  function drawCurve(curve){
    var W = 960, H = 330, X0 = 78, PW = 850, Y0 = 34, PH = 250;
    var lx = function(t){ return X0 + (Math.log10(Math.max(t, XMIN)) - Math.log10(XMIN)) / (Math.log10(XMAX) - Math.log10(XMIN)) * PW; };
    var ly = function(n){ var c = Math.min(Math.max(n, YMIN), YMAX); return Y0 + PH - (Math.log10(c) - Math.log10(YMIN)) / (Math.log10(YMAX) - Math.log10(YMIN)) * PH; };
    var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Toy population size curve: truth, estimate from clean data, estimate from the spoiled data' });
    svg.style.minWidth = '640px';
    svg.appendChild(mk('text', { x: X0, y: 16, 'class': 'lab' }, 'Toy PSMC-like curve: effective size against time, log–log'));
    svg.appendChild(mk('rect', { x: X0, y: Y0, width: PW, height: PH, 'class': 'ax' }));
    [1e3, 1e4, 1e5, 1e6].forEach(function(t){
      var x = lx(t);
      svg.appendChild(mk('line', { x1: x, x2: x, y1: Y0, y2: Y0 + PH, stroke: css('--line'), 'stroke-dasharray': '2 3' }));
      svg.appendChild(mk('text', { x: x, y: Y0 + PH + 15, 'text-anchor': 'middle' }, fmtN(t)));
    });
    [1e4, 1e5, 1e6].forEach(function(n){
      var y = ly(n);
      svg.appendChild(mk('line', { x1: X0, x2: X0 + PW, y1: y, y2: y, stroke: css('--line'), 'stroke-dasharray': '2 3' }));
      svg.appendChild(mk('text', { x: X0 - 6, y: y + 4, 'text-anchor': 'end' }, fmtN(n)));
    });
    svg.appendChild(mk('text', { x: X0 + PW / 2, y: H - 8, 'text-anchor': 'middle' }, 'generations ago (= years at one year per generation)'));
    svg.appendChild(mk('text', { x: 16, y: Y0 + PH / 2, 'text-anchor': 'middle', transform: 'rotate(-90 16 ' + (Y0 + PH / 2) + ')' }, 'Ne'));
    function stepPath(c){
      var d = '';
      c.forEach(function(s, i){
        var x1 = lx(Math.max(s[0], XMIN)), x2 = lx(Math.min(s[1], XMAX)), y = ly(s[2]);
        d += (i === 0 ? 'M' : 'L') + x1.toFixed(1) + ' ' + y.toFixed(1) + 'L' + x2.toFixed(1) + ' ' + y.toFixed(1);
      });
      return d;
    }
    var truth = HIST.map(function(h, i){ return [h[0], i + 1 < HIST.length ? HIST[i + 1][0] : Infinity, h[1]]; });
    svg.appendChild(mk('path', { d: stepPath(truth), fill: 'none', stroke: css('--fg'), 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }));
    svg.appendChild(mk('path', { d: stepPath(cleanCurve), fill: 'none', stroke: css('--err'), 'stroke-width': 2.5 }));
    svg.appendChild(mk('path', { d: stepPath(curve), fill: 'none', stroke: css('--accent'), 'stroke-width': 2.5 }));
    svg.appendChild(mk('text', { x: X0 + PW - 4, y: Y0 + 14, 'text-anchor': 'end' }, 'values above 10 M drawn at the top'));
    fig.replaceChildren(svg);
  }

  function legend(){
    var items = [['--fg', 'true history', true], ['--err', 'estimate, clean data'], ['--accent', 'estimate, your data'],
      ['--het', 'block hets'], ['--err', 'false hets in the block', false, true], ['--accent', 'ROH block', false, true], ['--bad', 'collapsed duplication'], ['--fg', 'masked by the ROH caller', false, true]];
    var lg = el('s06-legend'); lg.replaceChildren();
    items.forEach(function(it){
      var s = document.createElement('span'), i = document.createElement('i');
      i.style.background = css(it[0]);
      if (it[2]) { i.style.background = 'none'; i.style.borderTop = '2px dashed ' + css(it[0]); i.style.height = '0'; }
      else if (it[1].indexOf('estimate') === 0) i.style.height = '3px';
      else i.style.height = '10px';
      s.appendChild(i); s.appendChild(document.createTextNode(it[1])); lg.appendChild(s);
    });
  }

  function cell(label, val, tip){
    var d = document.createElement('div');
    var s = document.createElement('span'); s.innerHTML = label;
    if (tip){ s.className = 'tip'; s.title = tip; }
    var b = document.createElement('b'); b.textContent = val;
    d.appendChild(s); d.appendChild(b); return d;
  }

  function update(){
    var fp = +ctl.fp.value, fn = +ctl.fn.value / 100, roh = +ctl.roh.value / 100, dup = +ctl.dup.value / 100;
    el('s06-fp-o').textContent = fp.toFixed(2) + ' per kb';
    el('s06-fn-o').textContent = Math.round(fn * 100) + ' %';
    el('s06-roh-o').textContent = Math.round(roh * 100) + ' %';
    el('s06-dup-o').textContent = Math.round(dup * 100) + ' %';
    var o = observe(fp, fn, roh, dup);
    var mask = ctl.mask.checked ? callMask(o.obs) : null;
    var tHat = [], nMasked = 0, rohHit = 0, rohAll = 0, totHet = 0, totFp = 0;
    for (var i = 0; i < NB; i++){
      totHet += o.obs[i]; totFp += o.fpk[i];
      if (o.isRoh[i]){ rohAll++; if (mask && mask[i]) rohHit++; }
      if (mask && mask[i]){ nMasked++; continue; }
      tHat.push(o.obs[i] / K);
    }
    var curve = infer(tHat);
    drawStrip(o, mask);
    drawCurve(curve);
    var out = el('s06-out'); out.replaceChildren();
    [[3e3, '3,000'], [15e3, '15,000'], [50e3, '50,000'], [300e3, '300,000']].forEach(function(p){
      out.appendChild(cell('N<sub>e</sub> at ' + p[1] + ' generations: estimate (true)', fmtN(neAt(curve, p[0])) + '  (' + fmtN(trueNe(p[0])) + ')',
        'The toy estimate from your spoiled data at this time, with the true effective size in brackets. Compare also with the grey clean-data line: the toy estimator itself smooths sharp steps.'));
    });
    out.appendChild(cell('Genome-wide hets per kb (false share)', (totHet / NB / 100).toFixed(2) + '  (' + (totHet ? Math.round(totFp / totHet * 100) : 0) + ' % false)',
      'Observed heterozygous sites per kb over all blocks; in brackets the share that are false hets you added.'));
    out.appendChild(cell('Masked by the ROH caller', mask ? (nMasked / NB * 100).toFixed(1) + ' % of blocks; ' + (rohAll ? Math.round(rohHit / rohAll * 100) + ' % of true ROH' : 'no true ROH') : 'mask off',
      'The toy ROH caller flags runs of at least 3 blocks (300 kb) with fewer than 20 hets each (under 0.2 per kb). False hets inside true ROH can lift blocks over that line, so the caller misses them.'));
  }

  ['fp', 'fn', 'roh', 'dup'].forEach(function(k){ ctl[k].addEventListener('input', update); });
  ctl.mask.addEventListener('change', update);
  el('s06-new').addEventListener('click', function(){ seed = (seed * 1103515245 + 12345) & 0x7fffffff; generate(); cleanCurve = infer(Array.prototype.map.call(base.k, function(x){ return x / K; })); update(); });
  el('s06-reset').addEventListener('click', function(){ ctl.fp.value = 0; ctl.fn.value = 0; ctl.roh.value = 0; ctl.dup.value = 0; ctl.mask.checked = false; update(); });
  generate();
  cleanCurve = infer(Array.prototype.map.call(base.k, function(x){ return x / K; }));
  legend();
  update();
})();
