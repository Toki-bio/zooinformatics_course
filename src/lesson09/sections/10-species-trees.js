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

  // ---- Quartets on five tips. A tree: centre tip c, pairs p[0] and p[1]. The 15 unrooted trees.
  var QT = 'ABCDE';
  function qTrees() {
    var o = [], c, r;
    for (c = 0; c < 5; c++) {
      r = [0, 1, 2, 3, 4].filter(function (x) { return x !== c; });
      [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]].forEach(function (q) { o.push({ c: c, p: [[r[q[0]], r[q[1]]], [r[q[2]], r[q[3]]]] }); });
    }
    return o;
  }
  var Q_TREES = qTrees();
  function qKey(T) { return QT[T.p[0][0]] + QT[T.p[0][1]] + '|' + QT[T.c] + '|' + QT[T.p[1][0]] + QT[T.p[1][1]]; }
  function qRest(x) { return [0, 1, 2, 3, 4].filter(function (y) { return y !== x; }); }
  // Quartet x = all tips but x. Its arrangements are numbered 0, 1, 2: the first tip left is paired with the 2nd, 3rd, 4th.
  function qIndex(x, u, v) {               // the arrangement in which u and v are together
    var r = qRest(x), first = r[0], mate;
    if (u === first) mate = v; else if (v === first) mate = u;
    else mate = r.filter(function (y) { return y !== first && y !== u && y !== v; })[0];
    return r.indexOf(mate) - 1;
  }
  function qArr(T, x) {                    // the arrangement of quartet x shown by tree T
    var a = T.p[0], b = T.p[1];
    if (x === T.c || b.indexOf(x) >= 0) return qIndex(x, a[0], a[1]);
    return qIndex(x, b[0], b[1]);          // x is in a: the pair b stays whole
  }
  var Q_ARR = Q_TREES.map(function (T) { return [0, 1, 2, 3, 4].map(function (x) { return qArr(T, x); }); });
  function qCounts(n) {                    // n[t] = genes showing tree t -> counts of each arrangement of each quartet
    var Q = [0, 1, 2, 3, 4].map(function () { return [0, 0, 0]; });
    n.forEach(function (k, t) { var x; if (k) for (x = 0; x < 5; x++) Q[x][Q_ARR[t][x]] += k; });
    return Q;
  }
  function qScore(Q, t) { var s = 0, x; for (x = 0; x < 5; x++) s += Q[x][Q_ARR[t][x]]; return s; }
  // One gene in the species tree ((((A,B),C),D),E), internal branches br = [x, y, z] in coalescent units.
  function qSimGene(br, rnd) {
    var L = [1, 2], clades = [], enter = [4, 8, 16], k, t, w, i, j, m;
    function keep(q) { return q !== i && q !== j; }
    for (k = 0; k < 4; k++) {
      t = k < 3 ? br[k] : Infinity;
      while (L.length > 1) {
        w = -Math.log(1 - rnd()) / (L.length * (L.length - 1) / 2);
        if (w > t) break;
        t -= w;
        i = Math.floor(rnd() * L.length); j = Math.floor(rnd() * (L.length - 1)); if (j >= i) j++;
        m = L[i] | L[j];
        L = L.filter(function (_, q) { return keep(q); });
        L.push(m); clades.push(m);
      }
      if (k < 3) L.push(enter[k]);
    }
    return qTreeOf(clades);
  }
  function qBits(m) { var o = [], i; for (i = 0; i < 5; i++) if (m & (1 << i)) o.push(i); return o; }
  function qTreeOf(clades) {               // drop the root: clades of 2 or 3 tips give the two pairs of the unrooted tree
    var P = [], t, c;
    clades.forEach(function (m) {
      var b = qBits(m);
      if (b.length === 3) b = qBits(31 ^ m);
      if (b.length === 2 && !P.some(function (p) { return p[0] === b[0] && p[1] === b[1]; })) P.push(b);
    });
    c = [0, 1, 2, 3, 4].filter(function (x) { return P[0].indexOf(x) < 0 && P[1].indexOf(x) < 0; })[0];
    for (t = 0; t < 15; t++) {
      if (Q_TREES[t].c === c && Q_TREES[t].p.some(function (p) { return p[0] === P[0][0] && p[1] === P[0][1]; })) return t;
    }
    return -1;
  }
  // The branch that cuts the pair a,b from the rest of tree T. Around it lie four groups: a, b, centre, other pair.
  // Sayyari and Mirarab 2016: z1, z2, z3 are the counts of the three arrangements, averaged over the quartets around it.
  function qBranch(Q, T, side) {
    var a = T.p[side][0], b = T.p[side][1], c = T.c, o = T.p[1 - side], z = [0, 0, 0];
    o.forEach(function (y, i) {
      var x = o[1 - i];                    // quartet a, b, c, y leaves out the other tip of the far pair
      z[0] += Q[x][qIndex(x, a, b)] / 2;
      z[1] += Q[x][qIndex(x, a, c)] / 2;
      z[2] += Q[x][qIndex(x, b, c)] / 2;
    });
    return z;
  }
  // Theorem 1 of Sayyari and Mirarab 2016, lambda = 1/2 (flat prior).
  // h(x) = B(x+1, n-x+2L)(1 - I_1/3(x+1, n-x+2L)) is the integral from 1/3 to 1 of t^x (1-t)^(n-x+2L-1).
  function lnH(x, n, L) {
    var S = 4000, h = (2 / 3) / S, a = x, b = n - x + 2 * L - 1, v = [], i, t, mx = -Infinity, s = 0, w;
    for (i = 0; i <= S; i++) {
      t = 1 / 3 + i * h;
      w = i === S ? (b === 0 ? a * Math.log(t) : -Infinity) : a * Math.log(t) + b * Math.log(1 - t);
      v.push(w); if (w > mx) mx = w;
    }
    for (i = 0; i <= S; i++) s += (i === 0 || i === S ? 1 : (i % 2 ? 4 : 2)) * Math.exp(v[i] - mx);
    return mx + Math.log(s * h / 3);
  }
  function localPP(z, L) {
    var n = z[0] + z[1] + z[2], l = [0, 1, 2].map(function (j) { return lnH(z[j], n, L) + z[j] * Math.LN2; });
    var m = Math.max(l[0], l[1], l[2]), e = l.map(function (v) { return Math.exp(v - m); }), s = e[0] + e[1] + e[2];
    return e.map(function (v) { return v / s; });
  }
  function qLength(z1, n) {                // Theorem 2, MAP estimate with lambda = 1/2, which is what ASTRAL reports
    return n && z1 >= (n + 1) / 3 ? -Math.log(1.5 * (1 - z1 / (n + 1))) : 0;
  }

  // ---- ABBA-BABA. One stretch of DNA has one genealogy inside the species tree (((P1,P2),P3),O).
  // Times in coalescent units, M.t12 < M.t123 < M.tO. M.tg = time of gene flow.
  // moved = {from, to}: going back in time, the line of population `to` jumps into `from` at tg: genes went from `from` into `to`.
  function dPoisson(l, rnd) {
    var L, k = 0, p = 1, u;
    if (l <= 0) return 0;
    if (l > 30) { u = Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd()); return Math.max(0, Math.round(l + Math.sqrt(l) * u)); }
    L = Math.exp(-l);
    do { k++; p *= rnd(); } while (p > L);
    return k - 1;
  }
  function dGenealogy(M, moved, rnd) {
    var nodes = [], pops = [[], [], [], []], i;
    for (i = 0; i < 4; i++) { nodes.push({ t: 0, kids: null }); pops[i].push(i); }
    function run(p, t0, t1) {              // coalescence inside population p from time t0 to t1
      var t = t0, L = pops[p], w, a, b;
      function keep(_, k) { return k !== a && k !== b; }
      while (L.length > 1) {
        w = -Math.log(1 - rnd()) / (L.length * (L.length - 1) / 2);
        if (t + w >= t1) return;
        t += w;
        a = Math.floor(rnd() * L.length); b = Math.floor(rnd() * (L.length - 1)); if (b >= a) b++;
        nodes.push({ t: t, kids: [L[a], L[b]] });
        L = L.filter(keep); L.push(nodes.length - 1); pops[p] = L;
      }
    }
    var t0 = 0;
    if (moved) { pops[moved.from].push(pops[moved.to].pop()); t0 = M.tg; }
    run(0, t0, M.t12); run(1, t0, M.t12); run(2, t0, M.t12);
    pops[0] = pops[0].concat(pops[1]); pops[1] = [];
    run(0, M.t12, M.t123); run(2, M.t12, M.t123);
    pops[0] = pops[0].concat(pops[2]); pops[2] = [];
    run(0, M.t123, M.tO);
    pops[0] = pops[0].concat(pops[3]); pops[3] = [];
    run(0, M.tO, Infinity);
    return nodes;
  }
  // Drop mutations on the branches (Jukes-Cantor: each change goes to one of the other three bases), then read the columns
  // that changed. out = [ABBA, BABA, BBAA]. Only columns with exactly two bases and these patterns are counted.
  function dColumns(nodes, M, S, rnd, out, keep) {
    var root = nodes.length - 1, len = [], sites = {}, i, k, n, s;
    function setLen(i) {
      nodes[i].kids.forEach(function (c) {
        var l = nodes[i].t - nodes[c].t;
        if (c === 1) l += (M.rate - 1) * Math.min(l, M.t12);   // tip P2 runs faster until it leaves its own species
        len[c] = l;
      });
    }
    for (i = root; i >= 0; i--) if (nodes[i].kids) setLen(i);
    for (i = 0; i < root; i++) {
      n = dPoisson(len[i] * M.mu * S, rnd);
      for (k = 0; k < n; k++) { s = Math.floor(rnd() * S); (sites[s] = sites[s] || []).push(i); }
    }
    function column(ev) {
      var st = [], i2;
      function down(i) {
        nodes[i].kids.forEach(function (c) {
          var x = st[i];
          ev.forEach(function (e) { if (e === c) x = (x + 1 + Math.floor(rnd() * 3)) % 4; });
          st[c] = x;
        });
      }
      st[root] = 0;
      for (i2 = root; i2 >= 0; i2--) if (nodes[i2].kids) down(i2);
      return st;
    }
    Object.keys(sites).forEach(function (key) {
      var st = column(sites[key]), a = st[0], b = st[1], c = st[2], o = st[3], kind = -1;
      if (a === o && b === c && b !== a) kind = 0;
      else if (b === o && a === c && a !== b) kind = 1;
      else if (a === b && c === o && a !== c) kind = 2;
      if (kind >= 0) { out[kind]++; if (keep && keep.length < keep.max) keep.push({ s: [a, b, c, o], kind: kind }); }
    });
  }
  function dGenome(M, rnd, keep) {         // M.blocks blocks of M.per stretches of M.sites columns
    var B = [], i, j, c;
    for (i = 0; i < M.blocks; i++) {
      c = [0, 0, 0];
      for (j = 0; j < M.per; j++) dColumns(dGenealogy(M, M.moved && rnd() < M.f ? M.moved : null, rnd), M, M.sites, rnd, c, keep);
      B.push(c);
    }
    return B;
  }
  function dStat(ab, ba) { return ab + ba ? (ab - ba) / (ab + ba) : 0; }
  function dJackknife(B) {                 // leave out one block at a time
    var A = 0, C = 0, n = B.length, ss = 0, mean, loo, se;
    B.forEach(function (b) { A += b[0]; C += b[1]; });
    loo = B.map(function (b) { return dStat(A - b[0], C - b[1]); });
    mean = loo.reduce(function (s, v) { return s + v; }, 0) / n;
    loo.forEach(function (v) { ss += (v - mean) * (v - mean); });
    se = Math.sqrt((n - 1) / n * ss);
    return { ABBA: A, BABA: C, D: dStat(A, C), loo: loo, mean: mean, se: se, z: se ? dStat(A, C) / se : 0, naive: A + C ? (A - C) / Math.sqrt(A + C) : 0 };
  }
  // ---- KKSC test of Kuritzin et al. 2016, Eqs 20 and 22. y = three counts of shared insertions.
  var LNF = [0];
  function lnFact(n) { while (LNF.length <= n) LNF.push(LNF[LNF.length - 1] + Math.log(LNF.length)); return LNF[n]; }
  function binomTail(n, k, p) {            // P(X >= k), X binomial(n, p), summed in logs so that large n is safe
    var s = 0, i, ln = lnFact(n);
    if (k <= 0) return 1;
    for (i = k; i <= n; i++) s += Math.exp(ln - lnFact(i) - lnFact(n - i) + i * Math.log(p) + (n - i) * Math.log(1 - p));
    return Math.min(1, s);
  }
  function kkscRow(y, j) {                 // tree j against a third; the two other counts against each other
    var n = y[0] + y[1] + y[2], o = [0, 1, 2].filter(function (i) { return i !== j; }), a = y[o[0]], b = y[o[1]], hi = Math.max(a, b);
    return { tree: n ? binomTail(n, y[j], 1 / 3) : 1, sym: a === b ? 1 : Math.min(1, 2 * binomTail(a + b, hi, 0.5)) };
  }
  function kkscVerdict(y) {
    var o = [0, 1, 2].sort(function (a, b) { return y[b] - y[a]; }), r = kkscRow(y, o[0]);
    if (y[o[0]] === y[o[1]] && y[o[0]] > 0 && r.sym > 0.05) return { kind: 'none', top: o[0], r: r };
    if (r.sym <= 0.05) return { kind: 'hybrid', top: o[0], r: r };
    return { kind: r.tree <= 0.05 ? 'tree' : 'none', top: o[0], r: r };
  }
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

  // ---- Toy: count the quartets
  var Q_PRESETS = {
    long: { br: [1, 1, 1], note: 'Long branches: most genes match the species tree, so every approach gets it right with a few genes.' },
    anomaly: { br: [0.05, 0.05, 1], note: 'Anomaly zone: two short branches, then a long one above them. Three wrong trees with E in the middle are each more common than the species tree, and more genes only make that vote firmer. The quartets need many genes, but they get there.' },
    star: { br: [0.01, 0.01, 0.01], note: 'Almost a star: the branches are so short that hardly any gene carries a signal. Watch the support and the branch lengths stay low.' }
  };
  var qs = { preset: 'anomaly', n: null, total: 0, last: -1, pick: -1, rnd: rng(1906) };
  var Q_TRUE = Q_TREES.map(qKey).indexOf('AB|C|DE');
  function qName(x, a) {                   // arrangement a of quartet x, as text
    var r = qRest(x);
    var m = r[a + 1], o = r.slice(1).filter(function (y) { return y !== m; });
    return QT[r[0]] + QT[m] + '|' + QT[o[0]] + QT[o[1]];
  }
  function qClear() { qs.n = new Array(15).fill(0); qs.total = 0; qs.last = -1; qs.pick = -1; }
  function qAdd(k) {
    var br = Q_PRESETS[qs.preset].br, i;
    for (i = 0; i < k; i++) { qs.last = qSimGene(br, qs.rnd); qs.n[qs.last]++; qs.total++; }
  }
  function qBest(v) {
    var m = Math.max.apply(null, v), o = [];
    v.forEach(function (x, i) { if (x === m) o.push(i); });
    return o;
  }
  function qDrawSpecies() {
    var br = Q_PRESETS[qs.preset].br;
    var svg = svgIn('s10-q-sp', 320, 104, 280, 'The species tree of the toy: A and B are sisters, then C, D and E join in turn');
    function line(p) { el('polyline', { points: p, style: 'fill:none;stroke:var(--fg);stroke-width:2' }, svg); }
    line('20,14 66,14 66,34 20,34'); line('66,24 122,24'); line('122,24 122,54 20,54'); line('122,39 178,39'); line('178,39 178,74 20,74'); line('178,56 234,56'); line('234,56 234,94 20,94');
    ['A', 'B', 'C', 'D', 'E'].forEach(function (t, i) { el('text', { x: 6, y: [18, 38, 58, 78, 98][i] }, svg, t); });
    el('text', { x: 72, y: 18 }, svg, 'x = ' + br[0]);
    el('text', { x: 128, y: 33 }, svg, 'y = ' + br[1]);
    el('text', { x: 184, y: 50 }, svg, 'z = ' + br[2]);
  }
  function qRender() {
    var Q = qCounts(qs.n), sc = Q_TREES.map(function (_, t) { return qScore(Q, t); }), n = qs.total;
    var votes = qBest(qs.n), wins = qBest(sc), mark = qs.pick >= 0 ? qs.pick : wins[0];
    var order = sc.map(function (_, i) { return i; }).sort(function (a, b) { return sc[b] - sc[a] || qs.n[b] - qs.n[a]; });
    function names(l) { return n ? l.map(function (t) { return qKey(Q_TREES[t]); }).join(', ') : '–'; }
    $('s10-q-note').textContent = Q_PRESETS[qs.preset].note;
    $('s10-q-n').textContent = fmt(n);
    $('s10-q-vote').textContent = names(votes);
    $('s10-q-win').textContent = names(wins);
    $('s10-q-score').textContent = n ? (sc[wins[0]] / (5 * n)).toFixed(3) : '–';
    $('s10-q-last').textContent = qs.last < 0 ? 'No gene yet.' : 'Last gene: ' + qKey(Q_TREES[qs.last]) + '. Its five quartets: ' + [0, 1, 2, 3, 4].map(function (x) { return qName(x, Q_ARR[qs.last][x]); }).join(', ') + '.';
    var h = '<table><thead><tr><th>Four species</th><th colspan="3">Genes showing each arrangement</th></tr></thead><tbody>';
    [4, 3, 2, 1, 0].forEach(function (x) {
      var top = Math.max.apply(null, Q[x]);
      h += '<tr><td>' + qRest(x).map(function (y) { return QT[y]; }).join('') + '</td>';
      [0, 1, 2].forEach(function (a) {
        var isTrue = Q_ARR[Q_TRUE][x] === a, on = n && Q[x][a] === top;
        h += '<td' + (on ? ' class="s10-win"' : '') + '>' + qName(x, a) + ' ' + fmt(Q[x][a]) + (isTrue ? ' ✓' : '') + '</td>';
      });
      h += '</tr>';
    });
    $('s10-q-tab').innerHTML = h + '</tbody></table>';
    h = '<table><thead><tr><th>Candidate tree</th><th>Genes with this tree</th><th>Quartets shared</th><th>Share of all</th><th></th></tr></thead><tbody>';
    order.forEach(function (t) {
      var tags = [];
      if (t === Q_TRUE) tags.push('species tree');
      if (n && votes.indexOf(t) >= 0) tags.push('most common gene tree');
      if (n && wins.indexOf(t) >= 0) tags.push('most quartets');
      h += '<tr' + (t === mark ? ' class="s10-pick"' : '') + '><td><button type="button" class="s10-tb" data-t="' + t + '">' + qKey(Q_TREES[t]) + '</button></td><td>' + fmt(qs.n[t]) + '</td><td>' + fmt(sc[t]) + '</td><td>' + (n ? (sc[t] / (5 * n)).toFixed(3) : '–') + '</td><td>' + tags.join(', ') + '</td></tr>';
    });
    $('s10-q-trees').innerHTML = h + '</tbody></table>';
    var T = Q_TREES[mark];
    h = '<p><b>' + qKey(T) + '</b> contains these five quartets, so its score is their sum: ' + [4, 3, 2, 1, 0].map(function (x) { return qName(x, Q_ARR[mark][x]) + ' ' + fmt(Q[x][Q_ARR[mark][x]]); }).join(' + ') + ' = <b>' + fmt(sc[mark]) + '</b> of ' + fmt(5 * n) + ' possible.</p>';
    if (n) {
      h += '<table><thead><tr><th>Branch of this tree</th><th>z1 (this branch)</th><th>z2</th><th>z3</th><th><span class="tip" title="Local posterior probability of this branch against the two other arrangements around it, from the formula of Sayyari and Mirarab (2016) with a flat prior.">Local posterior</span></th><th>Length, coalescent units</th></tr></thead><tbody>';
      [0, 1].forEach(function (s) {
        var z = qBranch(Q, T, s), pp = localPP(z, 0.5), len = qLength(z[0], n), p = T.p[s];
        h += '<tr><td>' + QT[p[0]] + QT[p[1]] + ' | rest</td><td>' + z[0] + '</td><td>' + z[1] + '</td><td>' + z[2] + '</td><td>' + pp[0].toFixed(3) + '</td><td>' + len.toFixed(3) + '</td></tr>';
      });
      h += '</tbody></table>';
    }
    $('s10-q-why').innerHTML = h;
  }
  function qLoad(p) {
    qs.preset = p; qClear(); qAdd(100);
    Array.prototype.forEach.call($('s10-q-presets').children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.p === p)); });
    qDrawSpecies(); qRender();
  }

  // ---- Toy: ABBA-BABA
  var D_BASE = { t12: 0.5, t123: 1, tO: 3, tg: 0.1, mu: 0.02, rate: 1, blocks: 20, per: 100, sites: 100, f: 0, moved: null };
  var D_FLOW = { none: null, p2: { from: 2, to: 1 }, p1: { from: 2, to: 0 }, sis: { from: 0, to: 1 } };
  var ds = { flow: 'p2', fast: false, seed: 1, rep: null, busy: false };
  var D_BASES = 'ACGT';
  function dModel() {
    var M = Object.assign({}, D_BASE);
    M.moved = D_FLOW[ds.flow]; M.f = M.moved ? +$('s10-d-f').value / 100 : 0;
    if (ds.fast) { M.rate = 3; M.mu = 0.1; }
    return M;
  }
  function dDrawTree() {
    var svg = svgIn('s10-d-tree', 300, 122, 260, 'Species tree with P1 and P2 as sisters, then P3, then the outgroup, and a dashed line for gene flow if chosen');
    function line(p) { el('polyline', { points: p, style: 'fill:none;stroke:var(--fg);stroke-width:2' }, svg); }
    line('44,104 44,64 94,64 94,104'); line('69,64 69,44 144,44 144,104'); line('106,44 106,18 224,18 224,104');
    [[44, 'P1'], [94, 'P2'], [144, 'P3'], [224, 'O']].forEach(function (t) { el('text', { x: t[0], y: 119, 'text-anchor': 'middle' }, svg, t[1]); });
    var f = ds.flow, sty = 'fill:none;stroke:var(--het);stroke-width:2.5;stroke-dasharray:5 3';
    if (f === 'p2') el('polyline', { points: '144,92 94,92', style: sty }, svg);
    if (f === 'p1') el('path', { d: 'M144 96 C120 110 70 110 44 96', style: sty }, svg);
    if (f === 'sis') el('polyline', { points: '44,92 94,92', style: sty }, svg);
    if (ds.fast) el('text', { x: 98, y: 82, style: 'font-size:11px;fill:var(--bad)' }, svg, '3×');
  }
  function dRender() {
    $('s10-d-f-o').textContent = $('s10-d-f').value + ' %';
    Array.prototype.forEach.call($('s10-d-flow').children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.f === ds.flow)); });
    $('s10-d-f').disabled = ds.flow === 'none';
    dDrawTree();
    var keep = []; keep.max = 26;
    var B = dGenome(dModel(), rng(ds.seed), keep), j = dJackknife(B), bbaa = 0;
    B.forEach(function (b) { bbaa += b[2]; });
    var h = '';
    ['P1', 'P2', 'P3', 'O'].forEach(function (nm, r) {
      h += '<span class="s10-rn">' + nm + '</span>';
      keep.forEach(function (c) { h += '<span class="s10-k' + c.kind + '">' + D_BASES[c.s[r]] + '</span>'; });
    });
    var box = $('s10-d-cols');
    box.style.gridTemplateColumns = '2em repeat(' + keep.length + ',minmax(0,1fr))';
    box.innerHTML = h;
    $('s10-d-abba').textContent = fmt(j.ABBA);
    $('s10-d-baba').textContent = fmt(j.BABA);
    $('s10-d-bbaa').textContent = fmt(bbaa);
    $('s10-d-D').textContent = j.D.toFixed(3);
    $('s10-d-se').textContent = j.se.toFixed(3);
    $('s10-d-Z').textContent = j.z.toFixed(2);
    $('s10-d-nz').textContent = j.naive.toFixed(2);
    var svg = svgIn('s10-d-blocks', 600, 130, 420, 'D of each of the 20 blocks on its own, with the whole-genome D as a line');
    var y0 = 65, sc = 75, cap = 0.8;
    el('line', { x1: 34, y1: y0, x2: 596, y2: y0, style: 'stroke:var(--line)' }, svg);
    el('text', { x: 30, y: y0 - 54, 'text-anchor': 'end', style: 'font-size:10px' }, svg, '+0.8');
    el('text', { x: 30, y: y0 + 4, 'text-anchor': 'end', style: 'font-size:10px' }, svg, '0');
    el('text', { x: 30, y: y0 + 62, 'text-anchor': 'end', style: 'font-size:10px' }, svg, '−0.8');
    B.forEach(function (b, i) {
      var d = Math.max(-cap, Math.min(cap, dStat(b[0], b[1]))), x = 40 + i * 27.6, hgt = Math.abs(d) * sc;
      el('rect', { x: x, y: d >= 0 ? y0 - hgt : y0, width: 20, height: hgt, style: 'fill:var(--accent);opacity:.55' }, svg);
    });
    el('line', { x1: 34, y1: y0 - j.D * sc, x2: 596, y2: y0 - j.D * sc, style: 'stroke:var(--het);stroke-width:2' }, svg);
    var b0 = B[0];
    $('s10-d-calc').innerHTML =
      '<li>All 20 blocks: D = (' + fmt(j.ABBA) + ' − ' + fmt(j.BABA) + ') / (' + fmt(j.ABBA) + ' + ' + fmt(j.BABA) + ') = ' + j.D.toFixed(4) + '</li>' +
      '<li>Leave out block 1, which has ' + b0[0] + ' ABBA and ' + b0[1] + ' BABA: D = ' + j.loo[0].toFixed(4) + '. Repeat for each block, which gives 20 values with mean ' + j.mean.toFixed(4) + '.</li>' +
      '<li>Standard error = √(19/20 × sum of squared differences from that mean) = ' + j.se.toFixed(4) + '</li>' +
      '<li>Z = D / standard error = ' + j.D.toFixed(4) + ' / ' + j.se.toFixed(4) + ' = ' + j.z.toFixed(2) + '</li>' +
      '<li>For comparison, treating every column as independent (a plain binomial test): (ABBA − BABA) / √(ABBA + BABA) = ' + j.naive.toFixed(2) + '</li>';
    var big = Math.abs(j.z) > 3, msg;
    msg = big ? 'Z is beyond ±3: D differs from 0 in this genome. ' : 'Z is within ±3: this genome gives no evidence that D differs from 0. ';
    if (ds.fast) msg += ds.flow === 'none' ? 'There was no gene flow here: any signal comes from unequal rates.' : 'Here unequal rates and gene flow act together.';
    else if (ds.flow === 'none') msg += big ? 'There was no gene flow here, so this is a false alarm.' : 'There was no gene flow here.';
    else if (ds.flow === 'sis') msg += big ? 'Gene flow did happen here, but between sisters, which this test cannot see: this Z is a false alarm, not a detection.' : 'Gene flow did happen here, between sisters, where this test cannot see it.';
    else if (!big) msg += 'Gene flow did happen here, and this genome missed it.';
    $('s10-d-verdict').textContent = msg;
    ds.rep = null; dRenderRep();
  }
  function dRenderRep() {
    var R = ds.rep, svg, i, bins, W = 0.5, lo = -10, nb = 40;
    $('s10-d-reptext').textContent = R ? (R.done < R.total ? 'Running: ' + R.done + ' of ' + R.total + ' genomes.' : R.total + ' genomes with these settings: |Z| above 3 in ' + (100 * R.j / R.total).toFixed(1) + ' % with the block jackknife, and in ' + (100 * R.b / R.total).toFixed(1) + ' % with the plain binomial test. Mean D ' + (R.sd / R.total).toFixed(3) + '.') : 'Press the button to repeat the whole genome with these settings.';
    svg = svgIn('s10-d-hist', 600, 110, 420, 'Histogram of Z over repeated genomes, with lines at minus 3 and plus 3');
    function X(z) { return 20 + (z - lo) / (nb * W) * 560; }
    el('line', { x1: 20, y1: 92, x2: 580, y2: 92, style: 'stroke:var(--line)' }, svg);
    [-9, -6, -3, 0, 3, 6, 9].forEach(function (z) { el('text', { x: X(z), y: 106, 'text-anchor': 'middle', style: 'font-size:10px' }, svg, String(z).replace('-', '−')); });
    [-3, 3].forEach(function (z) { el('line', { x1: X(z), y1: 6, x2: X(z), y2: 92, style: 'stroke:var(--bad);stroke-dasharray:4 3' }, svg); });
    if (!R || !R.zs.length) return;
    bins = new Array(nb).fill(0);
    R.zs.forEach(function (z) { bins[Math.max(0, Math.min(nb - 1, Math.floor((z - lo) / W)))]++; });
    var m = Math.max.apply(null, bins);
    for (i = 0; i < nb; i++) if (bins[i]) el('rect', { x: X(lo + i * W) + 1, y: 92 - 84 * bins[i] / m, width: 560 / nb - 2, height: 84 * bins[i] / m, style: 'fill:var(--accent);opacity:.6' }, svg);
  }
  function dRepeat() {
    if (ds.busy) return;
    ds.busy = true; $('s10-d-rep').disabled = true;
    var M = dModel(), rnd = rng(ds.seed * 7919 + 13), R = { total: 200, done: 0, j: 0, b: 0, sd: 0, zs: [] };
    ds.rep = R;
    function stop() { ds.busy = false; $('s10-d-rep').disabled = false; }
    (function chunk() {
      if (ds.rep !== R) { stop(); return; }   // a setting changed: this run no longer describes the page
      for (var k = 0; k < 5 && R.done < R.total; k++) {
        var j = dJackknife(dGenome(M, rnd));
        R.done++; R.zs.push(j.z); R.sd += j.D;
        if (Math.abs(j.z) > 3) R.j++;
        if (Math.abs(j.naive) > 3) R.b++;
      }
      dRenderRep();
      if (R.done < R.total) setTimeout(chunk, 0); else stop();
    })();
  }

  // ---- Toy: KKSC
  var K_NAMES = ['((A,B),C)', '((A,C),B)', '((B,C),A)'];
  function kRender() {
    var y = ['s10-k1', 's10-k2', 's10-k3'].map(function (id) { var v = Math.round(+$(id).value); return v >= 0 ? Math.min(v, 2000) : 0; });
    var v = kkscVerdict(y), n = y[0] + y[1] + y[2], key = y.join(',');
    function pv(p) { return p < 1e-300 ? 'below 1e-300' : (p < 1e-4 ? p.toExponential(1) : p.toFixed(4)); }
    var h = '<table><thead><tr><th>Tree</th><th>Insertions</th><th>More than a third? p</th><th>Other two equal? p</th></tr></thead><tbody>';
    [0, 1, 2].forEach(function (j) {
      var r = kkscRow(y, j);
      h += '<tr' + (j === v.top && n ? ' class="s10-pick"' : '') + '><td>' + K_NAMES[j] + '</td><td>' + y[j] + '</td><td>' + pv(r.tree) + '</td><td>' + pv(r.sym) + '</td></tr>';
    });
    $('s10-k-tab').innerHTML = h + '</tbody></table>';
    var msg;
    if (!n) msg = 'No insertions yet.';
    else if (v.kind === 'tree') msg = 'A resolved tree: ' + K_NAMES[v.top] + ' has more than a third, and the two others do not differ.';
    else if (v.kind === 'hybrid') msg = 'Asymmetric: the two smaller counts differ, which ILS alone does not explain. The authors read this as a sign of ancestral hybridization.';
    else msg = 'No tree can be accepted, and the two smaller counts do not differ. These counts fit a polytomy, as under strong ILS, or too few insertions to tell.';
    $('s10-k-msg').textContent = msg;
    Array.prototype.forEach.call($('s10-k-pre').children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === key)); });
  }
  function kSet(v) { v.split(',').forEach(function (x, i) { $('s10-k' + (i + 1)).value = x; }); kRender(); }
  $('s10-k-pre').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) kSet(b.dataset.v); });
  ['s10-k1', 's10-k2', 's10-k3'].forEach(function (id) { $(id).addEventListener('input', kRender); });
  kSet('8,2,0');

  $('s10-q-presets').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) qLoad(b.dataset.p); });
  $('s10-q-add').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { qAdd(+b.dataset.k); qs.pick = -1; qRender(); } });
  $('s10-q-clear').addEventListener('click', function () { qClear(); qRender(); });
  $('s10-q-trees').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { qs.pick = +b.dataset.t; qRender(); } });
  $('s10-d-flow').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { ds.flow = b.dataset.f; dRender(); } });
  $('s10-d-f').addEventListener('input', dRender);
  $('s10-d-fast').addEventListener('change', function () { ds.fast = this.checked; dRender(); });
  $('s10-d-new').addEventListener('click', function () { ds.seed++; dRender(); });
  $('s10-d-rep').addEventListener('click', dRepeat);
  qLoad('anomaly');
  dRender();

  $('s10-t').addEventListener('input', fresh);
  $('s10-n').addEventListener('input', fresh);
  $('s10-one').addEventListener('click', function () { add(1); render(); });
  $('s10-more').addEventListener('click', function () { add(10000); render(); });
  $('s10-clear').addEventListener('click', function () { clear(); render(); });
  drawFlow(); drawPara();
  fresh();
})();
