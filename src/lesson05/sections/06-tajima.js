(function () {
  /* s06 Tajima's D. Two toys.
     (1) a worked alignment: S, k (pi), theta_W, D step by step (Tajima 1989 formulas).
     (2) coalescent simulation (Kingman, piecewise-constant population size, infinite sites):
         many loci, n sequences; mean site frequency spectrum and the distribution of D.
     Time in units of 2N0 generations (N0 = present size), theta = 4 N0 mu per locus;
     a branch of length t carries Poisson(theta * t / 2) mutations. */
  'use strict';

  /* ---------- Tajima 1989 ---------- */
  function consts(n) {
    var a1 = 0, a2 = 0;
    for (var i = 1; i < n; i++) { a1 += 1 / i; a2 += 1 / (i * i); }
    var b1 = (n + 1) / (3 * (n - 1));
    var b2 = 2 * (n * n + n + 3) / (9 * n * (n - 1));
    var c1 = b1 - 1 / a1;
    var c2 = b2 - (n + 2) / (a1 * n) + a2 / (a1 * a1);
    var e1 = c1 / a1, e2 = c2 / (a1 * a1 + a2);
    return { a1: a1, a2: a2, b1: b1, b2: b2, c1: c1, c2: c2, e1: e1, e2: e2 };
  }
  function tajimaD(n, S, k) {
    if (S === 0) return null;
    var c = consts(n);
    return (k - S / c.a1) / Math.sqrt(c.e1 * S + c.e2 * S * (S - 1));
  }
  /* from an alignment of equal-length strings (no gaps): S, k, unfolded counts of the minor allele */
  function fromAlignment(seqs) {
    var n = seqs.length, L = seqs[0].length, S = 0, diffSum = 0, sites = [];
    for (var j = 0; j < L; j++) {
      var cnt = {};
      for (var i = 0; i < n; i++) cnt[seqs[i][j]] = (cnt[seqs[i][j]] || 0) + 1;
      var keys = Object.keys(cnt);
      if (keys.length < 2) continue;
      S++;
      var pairsSame = 0;
      keys.forEach(function (b) { pairsSame += cnt[b] * (cnt[b] - 1) / 2; });
      var pairsDiff = n * (n - 1) / 2 - pairsSame;
      diffSum += pairsDiff;
      var minor = Math.min.apply(null, keys.map(function (b) { return cnt[b]; }));
      sites.push({ pos: j, minor: minor, alleles: keys.length, pairsDiff: pairsDiff });
    }
    var k = diffSum / (n * (n - 1) / 2);
    return { n: n, L: L, S: S, k: k, sites: sites };
  }

  /* ---------- coalescent ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function poisson(lam, R) {   // Knuth for small lambda, normal approximation above 30
    if (lam > 30) { var u = R() || 1e-12, v = R(); return Math.max(0, Math.round(lam + Math.sqrt(lam) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v))); }
    var L = Math.exp(-lam), p = 1, k = 0;
    do { k++; p *= R(); } while (p > L);
    return k - 1;
  }
  /* history: [{t: start time (back in time), size: relative size}] sorted by t, first t = 0 */
  function simulateLocus(n, theta, hist, R) {
    var sfs = new Array(n).fill(0);           // sfs[i] = sites where the derived allele is in i copies (1..n-1)
    var lin = []; for (var i = 0; i < n; i++) lin.push(1);
    var t = 0, ep = 0;
    while (lin.length > 1) {
      var k = lin.length, size = hist[ep].size;
      var rate = k * (k - 1) / 2 / size;
      var dt = -Math.log(R() || 1e-12) / rate;
      var end = ep + 1 < hist.length ? hist[ep + 1].t : Infinity;
      if (t + dt > end) {                     // epoch ends first: lineages grow to the boundary, redraw (memoryless)
        addMut(lin, end - t); t = end; ep++; continue;
      }
      addMut(lin, dt); t += dt;
      var a = Math.floor(R() * k), b = Math.floor(R() * (k - 1)); if (b >= a) b++;
      var merged = lin[a] + lin[b];
      lin = lin.filter(function (_, j) { return j !== a && j !== b; }); lin.push(merged);
    }
    return sfs;
    function addMut(ls, len) {
      ls.forEach(function (m) { var x = poisson(theta * len / 2, R); if (x) sfs[m] += x; });
    }
  }
  function dFromSfs(n, sfs) {
    var S = 0, k = 0;
    for (var i = 1; i < n; i++) { S += sfs[i]; k += sfs[i] * i * (n - i); }
    k /= n * (n - 1) / 2;
    return { S: S, k: k, D: tajimaD(n, S, k) };
  }
  var HIST = {
    constant: [{ t: 0, size: 1 }],
    growth: [{ t: 0, size: 1 }, { t: 0.1, size: 0.05 }],                       // 20-fold expansion 0.1 x 2N0 generations ago
    bottleneck: [{ t: 0, size: 1 }, { t: 0.02, size: 0.02 }, { t: 0.04, size: 1 }]  // short severe bottleneck, recent
  };
  function runScenario(name, n, theta, loci, seed) {
    var R = rng(seed), mean = new Array(n).fill(0), Ds = [], skipped = 0;
    for (var l = 0; l < loci; l++) {
      var s = simulateLocus(n, theta, HIST[name], R);
      for (var i = 1; i < n; i++) mean[i] += s[i] / loci;
      var d = dFromSfs(n, s);
      if (d.D === null) skipped++; else Ds.push(d.D);
    }
    var mD = Ds.reduce(function (a, b) { return a + b; }, 0) / Ds.length;
    return { mean: mean, Ds: Ds, meanD: mD, skipped: skipped };
  }

  var API = { consts: consts, tajimaD: tajimaD, fromAlignment: fromAlignment, simulateLocus: simulateLocus, dFromSfs: dFromSfs, runScenario: runScenario, rng: rng, HIST: HIST };
  /* presets for the worked alignment: n = 8; each site lists which sequences carry the derived base */
  var BASE = 'ATGCCTAGGATCCAGTTACGGATCAATGCA';
  var NEXTB = { A: 'G', G: 'A', C: 'T', T: 'C' };
  var PRESETS = {
    rare: { label: 'Many rare variants', sites: [[2, [0]], [6, [3]], [11, [5]], [15, [7]], [19, [1]], [24, [6]], [27, [2]]] },
    neutral: { label: 'A neutral-looking mix', sites: [[3, [0]], [8, [4]], [13, [6]], [17, [1, 2]], [21, [3, 5, 7]], [26, [0, 1, 2, 3]]] },
    middle: { label: 'Variants at middle frequency', sites: [[4, [0, 1, 2, 3]], [10, [4, 5, 6]], [16, [0, 1, 4, 5]], [22, [2, 3, 6, 7]], [28, [1, 3, 5]]] }
  };
  function presetSeqs(p) {
    var seqs = []; for (var i = 0; i < 8; i++) seqs.push(BASE.split(''));
    p.sites.forEach(function (s) { s[1].forEach(function (i) { seqs[i][s[0]] = NEXTB[BASE[s[0]]]; }); });
    return seqs.map(function (a) { return a.join(''); });
  }
  API.presetSeqs = presetSeqs; API.PRESETS = PRESETS;
  if (typeof document === 'undefined') { if (typeof module !== 'undefined') module.exports = API; return; }

  /* ---------- page ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, a, p, t) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (t != null) e.textContent = t; if (p) p.appendChild(e); return e; }
  function f(x, d) { return x.toFixed(d == null ? 3 : d); }

  /* toy 1: count it yourself */
  var cur = 'rare';
  function render1() {
    var seqs = presetSeqs(PRESETS[cur]), r = fromAlignment(seqs), c = consts(r.n), thW = r.S / c.a1, D = tajimaD(r.n, r.S, r.k);
    var box = $('s06-aln'); box.textContent = '';
    var vs = {}; r.sites.forEach(function (s) { vs[s.pos] = s; });
    seqs.forEach(function (s, i) {
      var d = document.createElement('div');
      d.appendChild(document.createTextNode('seq ' + (i + 1) + '  '));
      for (var j = 0; j < s.length; j++) {
        var sp = document.createElement('span'); sp.textContent = s[j];
        if (vs[j]) sp.className = s[j] !== BASE[j] ? 'x' : 'a'; else sp.style.opacity = '.55';
        d.appendChild(sp);
      }
      box.appendChild(d);
    });
    var cnt = document.createElement('div'); var line = 'copies  ';
    for (var j = 0; j < BASE.length; j++) line += vs[j] ? String(vs[j].minor) : ' ';
    cnt.textContent = line; box.appendChild(cnt);
    var steps = [
      ['n (sequences)', r.n],
      ['S (variable sites)', r.S],
      ['a<sub>1</sub> = 1 + 1/2 + &hellip; + 1/' + (r.n - 1), f(c.a1, 4)],
      ['&theta;<sub>W</sub> = S / a<sub>1</sub>', f(thW)],
      ['k = &pi; (mean differences per pair)', f(r.k)],
      ['k &minus; &theta;<sub>W</sub>', f(r.k - thW)],
      ['&radic;(e<sub>1</sub>S + e<sub>2</sub>S(S&minus;1))', f(Math.sqrt(c.e1 * r.S + c.e2 * r.S * (r.S - 1)))],
      ['<b>Tajima\'s D</b>', D === null ? 'undefined (S = 0)' : '<b>' + f(D, 2) + '</b>']
    ];
    $('s06-steps').innerHTML = steps.map(function (s) { return '<div>' + s[0] + '<b>' + s[1] + '</b></div>'; }).join('');
    ['rare', 'neutral', 'middle'].forEach(function (k) { $('s06-p-' + k).setAttribute('aria-pressed', k === cur ? 'true' : 'false'); });
  }
  ['rare', 'neutral', 'middle'].forEach(function (k) { $('s06-p-' + k).addEventListener('click', function () { cur = k; render1(); }); });

  /* toy 2: history -> SFS and D */
  var N = 10, THETA = 10, LOCI = 500, scen = 'constant';
  function ageFromSlider() { return Math.pow(10, -2.7 + 3.0 * $('s06-age').value / 100); }   // 0.002 .. 2 (x 2N0 generations)
  function hist() {
    if (scen === 'constant') return [{ t: 0, size: 1 }];
    if (scen === 'growth') return [{ t: 0, size: 1 }, { t: 0.2, size: 0.1 }];
    var a = ageFromSlider(); return [{ t: 0, size: 1 }, { t: a, size: 0.05 }, { t: a + 0.01, size: 1 }];
  }
  function render2() {
    HIST.toy = hist();
    var res = runScenario('toy', N, THETA, LOCI, 2026);
    $('s06-age-row').style.display = scen === 'bottleneck' ? '' : 'none';
    $('s06-age-o').textContent = f(ageFromSlider(), 3) + ' × 2N gen.';
    var svg = $('s06-sfs'); svg.textContent = '';
    var tot = res.mean.reduce(function (a, b) { return a + b; }, 0), H = 0;
    for (var i = 1; i < N; i++) H += 1 / i;
    var X0 = 40, W = 250, Y0 = 170, Hh = 140, bw = W / (N - 1);
    for (var q = 0; q <= 0.81; q += 0.2) {
      el('line', { x1: X0, x2: X0 + W, y1: Y0 - Hh * q / 0.8, y2: Y0 - Hh * q / 0.8, 'class': 'grid' }, svg);
      el('text', { x: X0 - 4, y: Y0 - Hh * q / 0.8 + 4, 'text-anchor': 'end' }, svg, q.toFixed(1));
    }
    var pts = [];
    for (i = 1; i < N; i++) {
      var p = tot ? res.mean[i] / tot : 0, x = X0 + (i - 1) * bw;
      el('rect', { x: x + 2, y: Y0 - Hh * Math.min(p, 0.8) / 0.8, width: bw - 4, height: Hh * Math.min(p, 0.8) / 0.8, fill: 'var(--accent)' }, svg)
        .appendChild(el('title', {}, null, i + ' of ' + N + ' copies: ' + (100 * p).toFixed(1) + ' % of variable sites'));
      el('text', { x: x + bw / 2, y: Y0 + 14, 'text-anchor': 'middle' }, svg, i);
      pts.push((x + bw / 2) + ',' + (Y0 - Hh * (1 / i / H) / 0.8));
    }
    el('polyline', { points: pts.join(' '), fill: 'none', stroke: 'var(--het)', 'stroke-width': 2, 'stroke-dasharray': '4 3' }, svg);
    el('text', { x: X0 + W / 2, y: Y0 + 30, 'text-anchor': 'middle' }, svg, 'copies of the new allele (of ' + N + ')');
    el('text', { x: X0, y: 16 }, svg, 'share of variable sites');
    /* D histogram */
    var X1 = 350, W2 = 270, lo = -3, hi = 3, nb = 24, bins = new Array(nb).fill(0);
    res.Ds.forEach(function (d) { var b = Math.floor((Math.max(lo, Math.min(hi - 1e-9, d)) - lo) / (hi - lo) * nb); bins[b]++; });
    var mx = Math.max.apply(null, bins) || 1, sxD = function (d) { return X1 + W2 * (d - lo) / (hi - lo); };
    bins.forEach(function (b, j) { el('rect', { x: X1 + j * W2 / nb + 1, y: Y0 - Hh * b / mx, width: W2 / nb - 2, height: Hh * b / mx, fill: 'var(--rep)' }, svg); });
    [-3, -2, -1, 0, 1, 2, 3].forEach(function (d) { el('text', { x: sxD(d), y: Y0 + 14, 'text-anchor': 'middle' }, svg, d); });
    el('line', { x1: sxD(0), x2: sxD(0), y1: Y0, y2: Y0 - Hh - 6, 'class': 'grid' }, svg);
    el('line', { x1: sxD(res.meanD), x2: sxD(res.meanD), y1: Y0, y2: Y0 - Hh - 6, stroke: 'var(--bad)', 'stroke-width': 2 }, svg);
    el('text', { x: X1 + W2 / 2, y: Y0 + 30, 'text-anchor': 'middle' }, svg, 'Tajima\'s D, one value per locus');
    el('text', { x: sxD(res.meanD), y: 16, 'text-anchor': 'middle', fill: 'var(--bad)' }, svg, 'mean ' + f(res.meanD, 2));
    var neg = res.Ds.filter(function (d) { return d < -2; }).length, pos = res.Ds.filter(function (d) { return d > 2; }).length;
    $('s06-sim-out').innerHTML =
      '<div>mean D over ' + res.Ds.length + ' loci<b>' + f(res.meanD, 2) + '</b></div>' +
      '<div>loci with D below &minus;2<b>' + neg + '</b></div>' +
      '<div>loci with D above +2<b>' + pos + '</b></div>' +
      '<div>loci with no variable site (D undefined)<b>' + res.skipped + '</b></div>';
    $('s06-sfs').setAttribute('aria-label', 'Simulated history ' + scen + ': mean Tajima\'s D ' + f(res.meanD, 2));
    ['constant', 'growth', 'bottleneck'].forEach(function (k) { $('s06-h-' + k).setAttribute('aria-pressed', k === scen ? 'true' : 'false'); });
  }
  ['constant', 'growth', 'bottleneck'].forEach(function (k) { $('s06-h-' + k).addEventListener('click', function () { scen = k; render2(); }); });
  $('s06-age').addEventListener('input', render2);
  /* code control: values computed independently (Python, standard formulas) */
  (function () {
    var checks = [
      ['D(n=4, S=3, k=1.5)', tajimaD(4, 3, 1.5), -0.7545],
      ['D(n=10, S=10, k=3)', tajimaD(10, 10, 3), -0.6707],
      ['a1(n=10)', consts(10).a1, 2.8290]
    ];
    var ok = checks.every(function (c) { return Math.abs(c[1] - c[2]) < 5e-5; });
    var al = fromAlignment(presetSeqs(PRESETS.middle));
    ok = ok && al.S === 5 && Math.abs(al.k - 39 / 14) < 1e-9;
    $('s06-ctl').textContent = 'Code control: ' + checks.map(function (c) { return c[0] + ' = ' + c[1].toFixed(4) + ' (expected ' + c[2].toFixed(4) + ')'; }).join('; ') +
      '; middle-frequency alignment S = 5, k = 39/14. Result: ' + (ok ? 'PASS' : 'FAIL');
  })();
  render1();
  render2();
})();
