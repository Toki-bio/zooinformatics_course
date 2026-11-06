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
  function svgIn(id, w, h, minW, label) {
    var box = $(id);
    box.textContent = '';
    return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'img', 'aria-label': label, style: 'min-width:' + minW + 'px;display:block' }, box);
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
  // One gene, one copy sampled from each of three species. Species tree ((A,B),C).
  // t = generations on the internal branch, N = diploid animals, so 2N gene copies per generation.
  // Going back in time, two lines share a parent in a given generation with probability 1/(2N).
  function wait(p, rnd) {           // generations until an event of chance p per generation happens
    if (p >= 1) return 1;
    return Math.max(1, Math.ceil(Math.log(1 - rnd()) / Math.log(1 - p)));
  }
  function simGene(t, N, rnd) {
    var p = 1 / (2 * N), first, second;
    first = wait(p, rnd);           // A and B can meet as soon as they share the ancestral species
    if (first <= t) {               // they met inside the internal branch
      second = t + wait(p, rnd);    // C can join them only above the root of the species tree
      return { topo: 'AB', sorted: true, first: first, second: second };
    }
    // Not met: three lines enter the ancestor of all three species. Any pair is equally likely.
    var pair = ['AB', 'AC', 'BC'][Math.floor(rnd() * 3)];
    first = t + wait(1 - Math.pow(1 - p, 3), rnd);
    second = first + wait(p, rnd);
    return { topo: pair, sorted: false, first: first, second: second };
  }
  function expectedMatch(T) { return 1 - (2 / 3) * Math.exp(-T); }
  // ENGINE-END

  var T_VALS = [0, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
  var N_VALS = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];
  var NAMES = { AB: '((A,B),C)', AC: '((A,C),B)', BC: '((B,C),A)' };
  var COL = { good: 'var(--good)', luck: 'var(--het)', bad: 'var(--bad)' };
  var rnd = rng(20261106);
  var st = { n: 0, AB: 0, AC: 0, BC: 0, luck: 0, last: null };
  function fmt(x) { return x.toLocaleString('en-US'); }
  function tGen() { return T_VALS[+$('s10-t').value]; }
  function nPop() { return N_VALS[+$('s10-n').value]; }
  function tCo() { return tGen() / (2 * nPop()); }

  function add(k) {
    var t = tGen(), N = nPop(), g;
    for (var i = 0; i < k; i++) {
      g = simGene(t, N, rnd);
      st.n++; st[g.topo]++;
      if (g.topo === 'AB' && !g.sorted) st.luck++;
    }
    st.last = g;
  }
  function clear() { st.n = 0; st.AB = 0; st.AC = 0; st.BC = 0; st.luck = 0; st.last = null; }

  // Geometry of the species tree, drawn as tubes: A and B join at J, J and C join at R.
  var YT = 372, YJ = 312, XA = 110, XB = 250, XC = 430, XJ = 180, XR = 305, PX = 90, CAP = 2;
  function layout(T) {
    var h = Math.max(6, Math.min(T, CAP) * PX), yR = YJ - h;
    return { h: h, yR: yR, top: 22, w: 16 + 13 * Math.log10(nPop() / 1000) };
  }
  // Height on the page of a time given in coalescent units since the A/B split.
  function yOf(tau, T, L) {
    if (T > 0 && tau <= T) return YJ - L.h * tau / T;
    return L.yR - (L.yR - L.top) * (1 - Math.exp(-(tau - T) / 1.2));
  }
  function onSeg(x0, y0, x1, y1, y) { return x0 + (x1 - x0) * (y - y0) / (y1 - y0); }

  function drawTree() {
    var T = tCo(), L = layout(T), g = st.last;
    var svg = svgIn('s10-tree', 490, 400, 350, 'Three-species tree drawn as tubes with the lines of one gene inside it');
    var tube = 'fill:none;stroke:var(--line);stroke-linecap:round;stroke-linejoin:round;stroke-width:' + L.w;
    el('path', { d: 'M' + XA + ' ' + YT + 'L' + XJ + ' ' + YJ + 'L' + XR + ' ' + L.yR + 'L' + XR + ' ' + L.top, style: tube }, svg);
    el('path', { d: 'M' + XB + ' ' + YT + 'L' + XJ + ' ' + YJ, style: tube }, svg);
    el('path', { d: 'M' + XC + ' ' + YT + 'L' + XR + ' ' + L.yR, style: tube }, svg);
    [[YJ, 'A and B split', YJ + 13], [L.yR, 'all three split', L.yR - 5]].forEach(function (a) {
      el('line', { x1: 8, x2: 484, y1: a[0], y2: a[0], 'class': 'grid' }, svg);
      el('text', { x: 8, y: a[2] }, svg, a[1]);
    });
    el('text', { x: 8, y: 16 }, svg, 'further back in time');
    el('text', { x: 8, y: 392 }, svg, 'today');
    [['A', XA], ['B', XB], ['C', XC]].forEach(function (a) { el('text', { x: a[1], y: 393, 'text-anchor': 'middle', 'class': 'lab' }, svg, 'species ' + a[0]); });
    if (!g) return;
    var two = 2 * nPop(), t1 = g.first / two, t2 = g.second / two, d = L.w / 4;
    var y1 = yOf(t1, T, L), y2 = yOf(t2, T, L);
    var color = g.topo !== 'AB' ? COL.bad : g.sorted ? COL.good : COL.luck;
    var sty = 'fill:none;stroke-width:2.2;stroke-linejoin:round;stroke-linecap:round;stroke:' + color;
    function line(pts) { el('polyline', { points: pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '), style: sty }, svg); }
    var dot = 'stroke:var(--panel);stroke-width:1.5;fill:' + color;
    if (g.sorted) {
      // A and B meet in the internal branch; the joint line and C then meet in the root.
      var xm = onSeg(XJ, YJ, XR, L.yR, y1);
      line([[XA, YT], [XJ - d, YJ], [xm, y1]]);
      line([[XB, YT], [XJ + d, YJ], [xm, y1]]);
      line([[xm, y1], [XR - d, L.yR], [XR - d, y2 + 7], [XR, y2]]);
      line([[XC, YT], [XR + d, L.yR], [XR + d, y2 + 7], [XR, y2]]);
      line([[XR, y2], [XR, L.top - 8]]);
      el('circle', { cx: xm, cy: y1, r: 4.5, style: dot }, svg);
      el('circle', { cx: XR, cy: y2, r: 4.5, style: dot }, svg);
      return;
    }
    // Three separate lines reach the root. Each has its own lane there.
    var lane = { A: XR - d, B: XR, C: XR + d };
    var start = {
      A: [[XA, YT], [XJ - d, YJ], [XR - d, L.yR]],
      B: [[XB, YT], [XJ + d, YJ], [XR, L.yR]],
      C: [[XC, YT], [XR + d, L.yR]]
    };
    var a = g.topo[0], b = g.topo[1], c = 'ABC'.replace(a, '').replace(b, '');
    var xp = (lane[a] + lane[b]) / 2, xq = (xp + lane[c]) / 2;
    line(start[a].concat([[lane[a], y1 + 7], [xp, y1]]));
    line(start[b].concat([[lane[b], y1 + 7], [xp, y1]]));
    line([[xp, y1], [xp, y2 + 7], [xq, y2]]);
    line(start[c].concat([[lane[c], y2 + 7], [xq, y2]]));
    line([[xq, y2], [xq, L.top - 8]]);
    el('circle', { cx: xp, cy: y1, r: 4.5, style: dot }, svg);
    el('circle', { cx: xq, cy: y2, r: 4.5, style: dot }, svg);
  }

  function drawCurve() {
    var T = tCo(), W = 420, H = 230, x0 = 46, x1 = 404, y0 = 190, y1 = 14, XM = 3;
    var svg = svgIn('s10-curve', W, H, 320, 'Share of matching gene trees against the length of the internal branch');
    function X(v) { return x0 + (x1 - x0) * Math.min(v, XM) / XM; }
    function Y(v) { return y0 - (y0 - y1) * v; }
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      el('line', { x1: x0, x2: x1, y1: Y(v), y2: Y(v), 'class': 'grid' }, svg);
      el('text', { x: x0 - 6, y: Y(v) + 4, 'text-anchor': 'end' }, svg, (v * 100) + '%');
    });
    for (var i = 0; i <= XM; i++) el('text', { x: X(i), y: y0 + 16, 'text-anchor': 'middle' }, svg, String(i));
    el('text', { x: (x0 + x1) / 2, y: y0 + 33, 'text-anchor': 'middle' }, svg, 'T, internal branch in coalescent units');
    el('path', { d: 'M' + x0 + ' ' + Y(1 / 3) + 'H' + x1, style: 'fill:none;stroke:var(--bad);stroke-width:1;stroke-dasharray:5 4' }, svg);
    el('text', { x: x1, y: Y(1 / 3) + 14, 'text-anchor': 'end', style: 'fill:var(--bad)' }, svg, 'one in three: a blind guess');
    var d = '';
    for (var k = 0; k <= 60; k++) { var v = XM * k / 60; d += (k ? 'L' : 'M') + X(v).toFixed(1) + ' ' + Y(expectedMatch(v)).toFixed(1); }
    el('path', { d: d, style: 'fill:none;stroke:var(--accent);stroke-width:2' }, svg);
    if (T <= XM) {
      el('circle', { cx: X(T), cy: Y(expectedMatch(T)), r: 6, style: 'fill:none;stroke:var(--accent);stroke-width:2' }, svg);
      if (st.n) el('circle', { cx: X(T), cy: Y(st.AB / st.n), r: 3, style: 'fill:var(--het)' }, svg);
    } else {
      el('text', { x: x1, y: Y(1) + 14, 'text-anchor': 'end' }, svg, 'T = ' + T.toFixed(1) + ' is off this scale');
    }
  }

  function drawBars() {
    var T = tCo(), W = 420, H = 230, x0 = 92, x1 = 404;
    var svg = svgIn('s10-bars', W, H, 320, 'Counts of the three possible gene trees, with the expected share of each');
    var exp = { AB: expectedMatch(T), AC: Math.exp(-T) / 3, BC: Math.exp(-T) / 3 };
    function X(v) { return x0 + (x1 - x0) * v; }
    [0, 0.5, 1].forEach(function (v) {
      el('line', { x1: X(v), x2: X(v), y1: 16, y2: 190, 'class': 'grid' }, svg);
      el('text', { x: X(v), y: 206, 'text-anchor': 'middle' }, svg, (v * 100) + '%');
    });
    ['AB', 'AC', 'BC'].forEach(function (k, i) {
      var y = 26 + i * 56, share = st.n ? st[k] / st.n : 0;
      el('text', { x: x0 - 8, y: y + 17, 'text-anchor': 'end', 'class': 'lab' }, svg, NAMES[k]);
      el('rect', { x: x0, y: y, width: Math.max(0, X(share) - x0), height: 26, style: 'fill:' + (k === 'AB' ? 'var(--good)' : 'var(--bad)') + ';opacity:.8' }, svg);
      if (k === 'AB' && st.n) el('rect', { x: X((st.AB - st.luck) / st.n), y: y, width: X(share) - X((st.AB - st.luck) / st.n), height: 26, style: 'fill:var(--het)' }, svg);
      el('line', { x1: X(exp[k]), x2: X(exp[k]), y1: y - 5, y2: y + 31, style: 'stroke:var(--fg);stroke-width:2' }, svg);
    });
  }

  function readout() {
    var t = tGen(), N = nPop(), T = tCo(), e = expectedMatch(T);
    $('s10-t-o').textContent = fmt(t) + ' generations';
    $('s10-n-o').textContent = fmt(N) + ' animals';
    $('s10-r-T').textContent = T.toFixed(3);
    $('s10-r-exp').textContent = (e * 100).toFixed(1) + ' %';
    if (st.n) {
      var s = st.AB / st.n, se = Math.sqrt(e * (1 - e) / st.n);
      $('s10-r-sim').textContent = (s * 100).toFixed(1) + ' %' + (st.n >= 30 ? ' ± ' + (2 * se * 100).toFixed(1) : '');
      $('s10-r-n').textContent = fmt(st.n);
      $('s10-r-wrong').textContent = fmt(st.AC) + ' and ' + fmt(st.BC);
      $('s10-r-luck').textContent = fmt(st.luck) + ' of ' + fmt(st.AB);
    } else {
      $('s10-r-sim').textContent = '-'; $('s10-r-n').textContent = '0';
      $('s10-r-wrong').textContent = '-'; $('s10-r-luck').textContent = '-';
    }
    var g = st.last, msg = '';
    if (g) {
      var u = function (x) { return (x / (2 * N)).toFixed(2); };
      if (g.sorted) msg = 'Last gene: its tree is ' + NAMES.AB + ', the same as the species tree. A and B met inside the internal branch, ' + u(g.first) + ' units above their split.';
      else if (g.topo === 'AB') msg = 'Last gene: its tree is ' + NAMES.AB + ', the same as the species tree, but only by chance. A and B did not meet in the internal branch. All three lines reached the root, and A and B happened to meet first.';
      else msg = 'Last gene: its tree is ' + NAMES[g.topo] + ', which disagrees with the species tree. A and B did not meet in the internal branch, and in the root ' + g.topo[0] + ' and ' + g.topo[1] + ' happened to meet first.';
    }
    if (T > CAP) msg += ' The internal branch is too long for the picture, so it is drawn shortened.';
    $('s10-msg').textContent = msg;
  }
  function render() { drawTree(); drawCurve(); drawBars(); readout(); }
  function fresh() { clear(); add(1000); render(); }

  // Gene flow and paralogy: two fixed drawings on the same kind of tube.
  function fixed(id, label) {
    var svg = svgIn(id, 380, 250, 300, label);
    var tube = 'fill:none;stroke:var(--line);stroke-linecap:round;stroke-linejoin:round;stroke-width:22';
    el('path', { d: 'M70 214L120 150L200 70L200 18', style: tube }, svg);
    el('path', { d: 'M170 214L120 150', style: tube }, svg);
    el('path', { d: 'M310 214L200 70', style: tube }, svg);
    [['A', 70], ['B', 170], ['C', 310]].forEach(function (a) { el('text', { x: a[1], y: 240, 'text-anchor': 'middle', 'class': 'lab' }, svg, a[0]); });
    return svg;
  }
  function poly(svg, pts, color, dash) {
    el('polyline', { points: pts, style: 'fill:none;stroke-width:2.2;stroke-linejoin:round;stroke-linecap:round;stroke:' + color + (dash ? ';stroke-dasharray:5 4' : '') }, svg);
  }
  function drawFlow() {
    var svg = fixed('s10-flow', 'Gene flow: a gene copy moves from species C into species B, so B and C share a recent ancestor at this gene');
    poly(svg, '70,214 120,150 196,74 196,44 200,30', 'var(--accent)');
    poly(svg, '170,214 147,185', 'var(--bad)');
    poly(svg, '147,185 261,150', 'var(--bad)', true);
    poly(svg, '310,214 261,150 204,76 204,44 200,30', 'var(--bad)');
    poly(svg, '200,30 200,6', 'var(--fg)');
    el('path', { d: 'M158 173L147 185L163 188', style: 'fill:none;stroke:var(--bad);stroke-width:2' }, svg);
    el('text', { x: 196, y: 192, style: 'fill:var(--bad)' }, svg, 'a copy crosses');
    el('text', { x: 196, y: 205, style: 'fill:var(--bad)' }, svg, 'from C into B');
    el('circle', { cx: 261, cy: 150, r: 4.5, style: 'fill:var(--bad);stroke:var(--panel);stroke-width:1.5' }, svg);
    el('circle', { cx: 200, cy: 30, r: 4.5, style: 'fill:var(--fg);stroke:var(--panel);stroke-width:1.5' }, svg);
  }
  function drawPara() {
    var svg = fixed('s10-para', 'Paralogy: a duplication before the speciations, then different copies lost in different species');
    poly(svg, '200,6 200,30', 'var(--fg)');
    poly(svg, '200,30 195,44 195,70 116,150 66,214', 'var(--accent)');
    poly(svg, '195,70 305,214', 'var(--accent)');
    poly(svg, '200,30 205,44 205,76 126,152 174,214', 'var(--het)');
    poly(svg, '205,76 262,150', 'var(--het)', true);
    poly(svg, '116,150 160,192', 'var(--accent)', true);
    poly(svg, '126,152 94,192', 'var(--het)', true);
    el('circle', { cx: 200, cy: 30, r: 4.5, style: 'fill:var(--rep);stroke:var(--panel);stroke-width:1.5' }, svg);
    el('text', { x: 214, y: 26 }, svg, 'duplication');
    [[160, 192, 'var(--accent)'], [94, 192, 'var(--het)'], [262, 150, 'var(--het)']].forEach(function (c) {
      el('text', { x: c[0], y: c[1] + 6, 'text-anchor': 'middle', style: 'font-size:17px;font-weight:700;fill:' + c[2] }, svg, '×');
    });
  }

  $('s10-t').addEventListener('input', fresh);
  $('s10-n').addEventListener('input', fresh);
  $('s10-one').addEventListener('click', function () { add(1); render(); });
  $('s10-more').addEventListener('click', function () { add(10000); render(); });
  $('s10-clear').addEventListener('click', function () { clear(); render(); });
  drawFlow(); drawPara();
  fresh();
})();
