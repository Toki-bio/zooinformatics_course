(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ENGINE-BEGIN
  // d = expected substitutions per site along the whole path between the two sequences.
  // alpha = gamma shape (0 = all variable sites share one rate); f = share of invariable sites.
  // Variable sites run at rate r/(1-f), so the average rate over all sites is 1.
  function pExpected(d, alpha, f) {
    var dv = d / (1 - f);
    var v = alpha > 0 ? 0.75 * (1 - Math.pow(1 + 4 * dv / (3 * alpha), -alpha))
                      : 0.75 * (1 - Math.exp(-4 * dv / 3));
    return (1 - f) * v;
  }
  function dJC(p) { return p < 0.75 ? -0.75 * Math.log(1 - 4 * p / 3) : Infinity; }
  function normal(rand) { return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand()); }
  function gammaDraw(a, rand) { // Marsaglia-Tsang; a < 1 by the boost a+1 then times U^(1/a)
    if (a < 1) return gammaDraw(a + 1, rand) * Math.pow(1 - rand(), 1 / a);
    var d = a - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      var x = normal(rand), v = 1 + c * x;
      if (v <= 0) continue;
      v = v * v * v;
      var u = 1 - rand();
      if (Math.log(u) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v;
    }
  }
  function poisson(m, rand) {
    var L = Math.exp(-m), k = 0, p = 1;
    do { k++; p *= rand(); } while (p > L);
    return k - 1;
  }
  // Real events: a random ancestor, then for each lineage a Poisson number of substitutions per site
  // (mean rate*d/2); each substitution goes to one of the 3 other bases with equal chance.
  function simulatePair(L, d, alpha, f, rand) {
    var A = new Uint8Array(L), B = new Uint8Array(L), diff = 0;
    for (var i = 0; i < L; i++) {
      var r = rand() < f ? 0 : (alpha > 0 ? gammaDraw(alpha, rand) / alpha : 1) / (1 - f);
      var anc = Math.floor(rand() * 4), x = anc, y = anc, n, k;
      n = poisson(r * d / 2, rand); for (k = 0; k < n; k++) x = (x + 1 + Math.floor(rand() * 3)) & 3;
      n = poisson(r * d / 2, rand); for (k = 0; k < n; k++) y = (y + 1 + Math.floor(rand() * 3)) & 3;
      A[i] = x; B[i] = y; if (x !== y) diff++;
    }
    return { A: A, B: B, diff: diff, p: diff / L };
  }
  // ENGINE-END

  // Code control, run at load with a fixed seed: simulated p against the formula, and the correction round trip.
  function control() {
    var R = rng(20261106), L = 200000, worst = 0, rows = [], i, s, pe, ds = [0.1, 0.5, 1, 2];
    for (i = 0; i < ds.length; i++) {
      s = simulatePair(L, ds[i], 0, 0, R); pe = pExpected(ds[i], 0, 0);
      worst = Math.max(worst, Math.abs(s.p - pe)); rows.push(ds[i] + ': ' + s.p.toFixed(4) + ' vs ' + pe.toFixed(4));
    }
    var s2 = simulatePair(L, 1, 0.5, 0.2, R), pe2 = pExpected(1, 0.5, 0.2);
    var worst2 = Math.abs(s2.p - pe2);
    var rt = 0;
    for (i = 0; i < ds.length; i++) rt = Math.max(rt, Math.abs(dJC(pExpected(ds[i], 0, 0)) - ds[i]));
    var ok = worst < 0.005 && worst2 < 0.005 && rt < 1e-9;
    return { ok: ok, worst: worst, worst2: worst2, rt: rt, rows: rows, s2: s2.p, pe2: pe2 };
  }

  var dEl = $('s03-d'), LEl = $('s03-L'), aEl = $('s03-a'), fEl = $('s03-f');
  var svg = $('s03-svg'), pts = [], last = null, seed = 1;
  var W = 640, H = 310, ml = 52, mr = 14, mt = 14, mb = 44, XM = 3, YM = 0.8;
  function X(d) { return ml + d / XM * (W - ml - mr); }
  function Y(p) { return H - mb - p / YM * (H - mt - mb); }
  var BASES = 'ACGT';

  function curve(alpha, f, cls, sw) {
    var dd = '', i, d;
    for (i = 0; i <= 120; i++) { d = i / 120 * XM; dd += (i ? 'L' : 'M') + X(d).toFixed(1) + ' ' + Y(pExpected(d, alpha, f)).toFixed(1); }
    el('path', { d: dd, fill: 'none', stroke: 'var(' + cls + ')', 'stroke-width': sw }, svg);
  }
  function draw() {
    svg.textContent = '';
    var t, i;
    for (t = 0; t <= 3; t++) {
      el('line', { x1: X(t), x2: X(t), y1: mt, y2: H - mb, 'class': 'grid' }, svg);
      el('text', { x: X(t), y: H - mb + 16, 'text-anchor': 'middle' }, svg, String(t));
    }
    for (t = 0; t <= 0.8001; t += 0.25) {
      el('line', { x1: ml, x2: W - mr, y1: Y(t), y2: Y(t), 'class': 'grid' }, svg);
      el('text', { x: ml - 6, y: Y(t) + 4, 'text-anchor': 'end' }, svg, t.toFixed(2));
    }
    el('line', { x1: ml, x2: W - mr, y1: Y(0.75), y2: Y(0.75), stroke: 'var(--bad)', 'stroke-dasharray': '5 4', fill: 'none' }, svg);
    el('text', { x: W - mr - 4, y: Y(0.75) - 5, 'text-anchor': 'end', fill: 'var(--bad)', style: 'fill:var(--bad)' }, svg, 'ceiling 0.75');
    el('line', { x1: ml, x2: X(0.8), y1: Y(0), y2: Y(0.8), stroke: 'var(--muted)', 'stroke-width': 1.5, 'stroke-dasharray': '2 3' }, svg);
    el('rect', { x: ml, y: mt, width: W - ml - mr, height: H - mt - mb, fill: 'none', 'class': 'ax' }, svg);
    var al = +aEl.value, f = +fEl.value;
    if (al > 0 || f > 0) curve(0, 0, '--err', 2.5);
    curve(al, f, '--accent', 2.5);
    for (i = 0; i < pts.length; i++) el('circle', { cx: X(pts[i].d), cy: Y(pts[i].p), r: 3.5, fill: 'var(--het)', opacity: 0.55 }, svg);
    if (last) {
      el('circle', { cx: X(last.d), cy: Y(last.p), r: 6.5, fill: 'none', stroke: 'var(--het)', 'stroke-width': 2 }, svg);
      var dj = dJC(last.p);
      if (isFinite(dj) && dj <= XM) el('path', { d: 'M' + X(dj) + ' ' + (H - mb) + 'l-5 8h10z', fill: 'var(--good)' }, svg);
    }
    el('text', { x: (ml + W - mr) / 2, y: H - 6, 'text-anchor': 'middle' }, svg, 'true distance d (substitutions per site)');
    var yl = el('text', { transform: 'translate(13 ' + (H - mb) / 2 + ') rotate(-90)', 'text-anchor': 'middle' }, svg, 'observed p');
    el('text', { x: ml + 6, y: H - mb - 8, style: 'fill:var(--good)' }, svg, last && isFinite(dJC(last.p)) && dJC(last.p) <= XM ? '▲ = distance after correction (latest pair)' : '');
  }
  function show(sim, d, L) {
    var n = Math.min(40, L), s1 = '', s2 = '', m = '', i;
    for (i = 0; i < n; i++) {
      s1 += BASES[sim.A[i]] + ' '; s2 += BASES[sim.B[i]] + ' ';
      m += sim.A[i] === sim.B[i] ? '  ' : '<span class="x">^</span> ';
    }
    $('s03-aln').innerHTML = 'A  ' + s1 + '\nB  ' + s2 + '\n   ' + m + '\n(first ' + n + ' of ' + L + ' columns; ^ = visible difference)';
  }
  function run(keep) {
    var L = +LEl.value, d = +dEl.value, al = +aEl.value, f = +fEl.value;
    $('s03-d-o').textContent = d.toFixed(2); $('s03-L-o').textContent = L; $('s03-f-o').textContent = Math.round(f * 100) + ' %';
    var sim = simulatePair(L, d, al, f, rng(seed++ * 7919 + 13));
    if (!keep) pts = [];
    pts.push({ d: d, p: sim.p }); if (pts.length > 60) pts.shift();
    last = { d: d, p: sim.p };
    var dj = dJC(sim.p);
    $('s03-r-d').textContent = d.toFixed(2);
    $('s03-r-pe').textContent = pExpected(d, al, f).toFixed(3);
    $('s03-r-p').textContent = sim.p.toFixed(3);
    $('s03-r-dj').textContent = isFinite(dj) ? dj.toFixed(2) : 'cannot be computed';
    var v;
    if (!isFinite(dj)) v = 'The observed p reached 0.75, the ceiling. The two sequences look unrelated, and no correction can recover the distance.';
    else if (dj > 1.3 * d + 0.03 || dj < 0.77 * d - 0.03) v = 'The corrected distance (' + dj.toFixed(2) + ') is far from the true one (' + d.toFixed(2) + '). ' + (dj < d ? 'It is too small: the JC69 model assumes equal sites, and this simulation does not have them.' : 'It is too large: with this few sites the observed p is noisy, and the correction magnifies the noise.');
    else if (sim.p > 0.5) v = 'p is near the ceiling, where small changes in p mean large changes in the distance. Press the button again and watch the corrected value jump.';
    else v = 'The correction ' + (Math.abs(dj - d) < Math.abs(sim.p - d) ? 'gets closer to the true distance than raw p does.' : 'and raw p are about equally close at this small distance.');
    $('s03-verdict').textContent = v;
    show(sim, d, L);
    draw();
  }
  function reset() { run(false); }
  dEl.addEventListener('input', function () { run(true); });
  LEl.addEventListener('input', reset); aEl.addEventListener('change', reset); fEl.addEventListener('input', reset);
  $('s03-new').addEventListener('click', function () { run(true); });
  $('s03-clr').addEventListener('click', reset);
  run(false);

  var c = control();
  $('s03-control').innerHTML = 'Code control (run when this page loaded, 200,000 sites per test, fixed seed): simulated p against the formula, JC69, d = ' + c.rows.join('; ') +
    '; with gamma shape 0.5 and 20 % invariable sites, d = 1: ' + c.s2.toFixed(4) + ' vs ' + c.pe2.toFixed(4) +
    '. Largest gap ' + Math.max(c.worst, c.worst2).toFixed(4) + ' (limit 0.005, about five standard errors). Correction applied to the formula p returns d, largest error ' + c.rt.toExponential(1) + '. Result: ' +
    (c.ok ? '<span class="s03-ok">PASS</span>' : '<span class="s03-no">FAIL</span>');
})();
