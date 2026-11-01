(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function $(id) { return document.getElementById(id); }
  function rng(seed) { // mulberry32
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function poisson(lam, r) {
    if (lam <= 0) return 0;
    if (lam > 40) return Math.max(0, Math.round(lam + Math.sqrt(lam) * gauss(r)));
    var L = Math.exp(-lam), k = 0, p = 1;
    do { k++; p *= r(); } while (p > L);
    return k - 1;
  }
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function bp(x) {
    if (x >= 1000) { var k = x / 1000; return (k >= 10 ? Math.round(k) : Math.round(k * 10) / 10) + ' kb'; }
    return Math.round(x) + ' bases';
  }
  function num(x) { return Math.round(x).toLocaleString('en-US'); }

  var nI = $('s07-arr-n'), mI = $('s07-arr-m'), rI = $('s07-arr-r'), cI = $('s07-arr-c'), bI = $('s07-arr-b');
  var fig = $('s07-arr-fig'), out = $('s07-arr-out'), verdict = $('s07-arr-verdict'), btn = $('s07-arr-new');
  if (!nI || !fig) return;
  var RL = [150, 250, 1000, 2000, 5000, 10000, 15000, 20000, 30000, 50000, 100000, 200000];
  var ANCHOR = 100, seed = 7;
  var preBtns = document.querySelectorAll('#s07-arr-pre button');

  // one sample of reads touching [a0, a1]; returns starts (for drawing) or only bases on the array
  function sampleBases(r, c, R, a0, a1, bias) {
    var span = a1 - a0 + R, n = poisson(c * span / R, r), s = 0;
    for (var i = 0; i < n; i++) {
      var st = a0 - R + r() * span, en = st + R;
      s += Math.max(0, Math.min(en, a1) - Math.max(st, a0));
    }
    return s * (1 + bias);
  }

  function draw() {
    var N = +nI.value, m = +mI.value, R = RL[+rI.value], c = +cI.value, bias = +bI.value / 100;
    $('s07-arr-no').textContent = N;
    $('s07-arr-mo').textContent = m;
    $('s07-arr-ro').textContent = bp(R);
    $('s07-arr-co').textContent = c + '×';
    $('s07-arr-bo').textContent = (bias > 0 ? '+' : bias < 0 ? '−' : '') + Math.abs(Math.round(bias * 100)) + ' %';
    preBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.r === +rI.value && +b.dataset.c === c)); });

    var L = N * m, F = Math.max(1000, Math.round(0.3 * L)), T = F + L + F, a0 = F, a1 = F + L;
    var r = rng(seed * 1000003 + N * 7919 + m * 104729 + (+rI.value) * 13 + c * 31);

    // reads that overlap the drawn region: starts in [-R, T]
    var nReads = poisson(c * (T + R) / R, r), reads = [], onArr = 0, nSpan = 0, nTouch = 0;
    for (var i = 0; i < nReads; i++) {
      var st = -R + r() * (T + R), en = st + R;
      var ov = Math.max(0, Math.min(en, a1) - Math.max(st, a0));
      var spanning = st <= a0 - ANCHOR && en >= a1 + ANCHOR;
      if (ov > 0) { onArr += ov; nTouch++; }
      if (spanning) nSpan++;
      reads.push({ s: st, e: en, sp: spanning, ov: ov > 0 });
    }
    onArr *= (1 + bias);
    var est = onArr / (c * m);

    // repeat sampling for the 95 % range
    var expReads = c * (L + R) / R, sims = Math.max(60, Math.min(400, Math.floor(3e6 / Math.max(1, expReads))));
    var r2 = rng(seed * 7 + 99), ests = [];
    for (var k = 0; k < sims; k++) ests.push(sampleBases(r2, c, R, a0, a1, bias) / (c * m));
    ests.sort(function (x, y) { return x - y; });
    var lo = ests[Math.floor(0.025 * (sims - 1))], hi = ests[Math.ceil(0.975 * (sims - 1))];

    var lamSpan = c * Math.max(0, R - L - 2 * ANCHOR) / R, pSpan = 1 - Math.exp(-lamSpan);
    var resolved = nSpan > 0;

    // ---------- drawing ----------
    fig.innerHTML = '';
    var W = 900, X0 = 20, X1 = 880;
    function Xc(p) { return X0 + (Math.max(0, Math.min(T, p)) / T) * (X1 - X0); }
    // pick reads to draw: all spanning + reads touching array, then others, capped
    var draws = reads.filter(function (d) { return d.e > 0 && d.s < T; });
    var shown = draws.filter(function (d) { return d.sp; }).concat(draws.filter(function (d) { return !d.sp && d.ov; }), draws.filter(function (d) { return !d.ov; }));
    var ROWS = 18, rowEnd = [], placed = [], gap = 4;
    shown.forEach(function (d) {
      var x0 = Xc(d.s), x1 = Xc(d.e);
      for (var q = 0; q < ROWS; q++) {
        if (rowEnd[q] == null || rowEnd[q] + gap <= x0) { rowEnd[q] = x1; placed.push({ d: d, q: q }); return; }
      }
    });
    var yG = 32, yR = 70, rh = 7, yA = yR + ROWS * rh + 34, H = yA + 92;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: 'min-width:640px', role: 'img',
      'aria-label': 'Toy genome with a satellite array, the reads drawn over it, and the resulting assembly' }, fig);
    el('text', { x: X0, y: 14, 'class': 'lab' }, svg, 'genome (truth): ' + bp(F) + ' unique · array ' + N + ' × ' + m + ' = ' + bp(L) + ' · ' + bp(F) + ' unique');
    el('rect', { x: X0, y: yG, width: Xc(a0) - X0, height: 8, fill: 'var(--err)' }, svg);
    el('rect', { x: Xc(a1), y: yG, width: X1 - Xc(a1), height: 8, fill: 'var(--err)' }, svg);
    var pxMono = (Xc(a1) - Xc(a0)) / N;
    if (pxMono >= 3) {
      for (var j = 0; j < N; j++) el('rect', { x: Xc(a0) + j * pxMono + 0.4, y: yG - 2, width: Math.max(1, pxMono - 0.8), height: 12, fill: 'var(--rep)' }, svg);
    } else {
      el('rect', { x: Xc(a0), y: yG - 2, width: Xc(a1) - Xc(a0), height: 12, fill: 'var(--rep)' }, svg);
    }
    el('text', { x: X0, y: yR - 8 }, svg, 'reads (' + (placed.length < draws.length ? 'showing ' + placed.length + ' of ' + num(draws.length) : num(draws.length)) + ' that overlap this window; ends that run out of the window are cut)');
    placed.forEach(function (p) {
      var d = p.d, col = d.sp ? 'var(--good)' : d.ov ? 'var(--het)' : 'var(--err)';
      el('rect', { x: Xc(d.s), y: yR + p.q * rh, width: Math.max(1.5, Xc(d.e) - Xc(d.s)), height: rh - 2.5, fill: col, opacity: d.sp ? 1 : 0.8 }, svg);
    });
    el('line', { x1: Xc(a0), x2: Xc(a0), y1: yG + 12, y2: yR + ROWS * rh, 'class': 'grid' }, svg);
    el('line', { x1: Xc(a1), x2: Xc(a1), y1: yG + 12, y2: yR + ROWS * rh, 'class': 'grid' }, svg);

    // assembly lane
    var yL = yA - 10;
    el('text', { x: X0, y: yL, 'class': 'lab' }, svg, resolved ? 'assembly: resolved, one contig with all ' + N + ' monomers' : 'assembly: collapsed, two contigs with a gap; the array is kept as one monomer');
    if (resolved) {
      el('rect', { x: X0, y: yA, width: Xc(a0) - X0, height: 8, fill: 'var(--err)' }, svg);
      el('rect', { x: Xc(a0), y: yA - 2, width: Xc(a1) - Xc(a0), height: 12, fill: 'var(--rep)' }, svg);
      el('rect', { x: Xc(a1), y: yA, width: X1 - Xc(a1), height: 8, fill: 'var(--err)' }, svg);
      el('rect', { x: X0 - 2, y: yA - 5, width: X1 - X0 + 4, height: 18, fill: 'none', stroke: 'var(--good)', 'stroke-width': 1.5, rx: 3 }, svg);
    } else {
      var w1 = Math.max(8, pxMono), gx = Xc(a0) + w1 + 10, gw = 60;
      el('rect', { x: X0, y: yA, width: Xc(a0) - X0, height: 8, fill: 'var(--err)' }, svg);
      el('rect', { x: Xc(a0), y: yA - 2, width: w1, height: 12, fill: 'var(--rep)', stroke: 'var(--bad)', 'stroke-width': 1.5 }, svg);
      el('rect', { x: gx, y: yA - 2, width: gw, height: 12, fill: 'none', stroke: 'var(--bad)', 'stroke-dasharray': '3 2' }, svg);
      el('text', { x: gx + gw / 2, y: yA + 8, 'text-anchor': 'middle', fill: 'var(--bad)' }, svg, 'NNNN');
      el('rect', { x: gx + gw + 10, y: yA, width: Math.max(10, X1 - (gx + gw + 10)), height: 8, fill: 'var(--err)' }, svg);
      el('text', { x: Xc(a0), y: yA + 28 }, svg, '↑ collapsed copy: 1 monomer carries the reads of ' + N + '; its depth ≈ ' + num(est * c) + ' instead of ' + c);
    }
    // depth comparison bars
    var yD = yA + 50, maxD = Math.max(est * c, c) * 1.05, bw = 360;
    el('text', { x: X0, y: yD - 4 }, svg, resolved ? 'read depth if the array were collapsed onto one monomer (= the depth estimate)' : 'read depth: unique DNA vs the collapsed monomer (all array reads stacked on it)');
    el('rect', { x: X0 + 150, y: yD + 2, width: bw * c / maxD, height: 9, fill: 'var(--err)' }, svg);
    el('text', { x: X0, y: yD + 10 }, svg, 'unique DNA');
    el('text', { x: X0 + 156 + bw * c / maxD, y: yD + 10, 'class': 'lab' }, svg, num(c));
    el('rect', { x: X0 + 150, y: yD + 18, width: bw * (est * c) / maxD, height: 9, fill: 'var(--rep)' }, svg);
    el('text', { x: X0, y: yD + 26 }, svg, 'one monomer');
    el('text', { x: X0 + 156 + bw * (est * c) / maxD, y: yD + 26, 'class': 'lab' }, svg, num(est * c) + '  → ÷ ' + c + ' = ' + (Math.round(est * 10) / 10) + ' monomers');

    // ---------- readout ----------
    var err = (est - N) / N * 100;
    var items = [
      { v: N + ' monomers', l: 'truth: ' + bp(L) + ' of array' },
      { v: num(nTouch), l: 'reads that touch the array' },
      { v: nSpan + ' spanning', l: 'expected on average ' + (Math.round(lamSpan * 10) / 10) + '; chance of at least one: ' + (pSpan > 0.99 ? '> 99' : Math.round(pSpan * 100)) + ' %' },
      { v: resolved ? N + ' monomers' : '1 monomer + gap', l: 'what the toy assembly holds', c: resolved ? 'good' : 'bad' },
      { v: (Math.round(est * 10) / 10) + ' monomers', l: 'depth estimate from these reads (' + (err >= 0 ? '+' : '−') + Math.abs(Math.round(err)) + ' % from the truth)', c: Math.abs(err) > 15 ? 'bad' : null },
      { v: (Math.round(lo * 10) / 10) + ' – ' + (Math.round(hi * 10) / 10), l: '95 % of repeated samples fall in this range' + (bias !== 0 ? ' (the bias shifts the whole range)' : '') }
    ];
    out.innerHTML = items.map(function (it) {
      return '<div><b' + (it.c ? ' style="color:var(--' + it.c + ')"' : '') + '>' + it.v + '</b>' + it.l + '</div>';
    }).join('');
    var msg;
    if (resolved) msg = '<b>Resolved.</b> At least one read crosses the whole array and reaches unique DNA on both sides, so the array length can be read directly from that read and the assembly can hold every monomer.';
    else if (R >= L + 2 * ANCHOR) msg = '<b>Collapsed, by bad luck.</b> Reads are long enough to span the array, but none happens to start in the right place. More coverage raises the chance (' + Math.round(pSpan * 100) + ' % now).';
    else msg = '<b>Collapsed.</b> The array plus 100 bases of unique DNA on each side (' + bp(L + 2 * ANCHOR) + ') is longer than every read (' + bp(R) + '), so no read can span it. The assembly cannot know how many monomers there are; only the read depth can tell.';
    if (bias !== 0) msg += ' The depth estimate is off by about ' + Math.abs(Math.round(bias * 100)) + ' % because of the library bias you set, and repeating the sampling would not reveal it.';
    verdict.innerHTML = msg;
  }

  [nI, mI, rI, cI, bI].forEach(function (i) { i.addEventListener('input', draw); });
  preBtns.forEach(function (b) {
    b.addEventListener('click', function () { rI.value = b.dataset.r; cI.value = b.dataset.c; draw(); });
  });
  btn.addEventListener('click', function () { seed++; draw(); });
  draw();
})();
