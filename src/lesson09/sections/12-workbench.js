(function () {
  'use strict';
  // ENGINE-BEGIN
  // Everything between ENGINE-BEGIN and ENGINE-END is plain calculation with no page access,
  // so the same code is tested by 12-workbench.control.js.
  var TIPS = ['A', 'B', 'C', 'D', 'E'], NT = 5, BASES = 'ACGT';
  var MINB = 1e-6, MAXB = 10;

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

  // ---- The 15 unrooted trees of five tips. A tree is one centre tip and two pairs:
  // {c: 2, p: [[0,1],[3,4]]} is ((A,B),C,(D,E)). Branch lengths are an array of seven:
  // 0-4 the branch of each tip, 5 the inner branch of pair 0, 6 the inner branch of pair 1.
  function mkTree(c, a, b, d, e) {
    var p = [[Math.min(a, b), Math.max(a, b)], [Math.min(d, e), Math.max(d, e)]];
    if (p[0][0] > p[1][0]) p.reverse();
    return { c: c, p: p };
  }
  function pairName(p) { return TIPS[p[0]] + TIPS[p[1]]; }
  function treeKey(T) { return pairName(T.p[0]) + '|' + TIPS[T.c] + '|' + pairName(T.p[1]); }
  function newick(T) {
    return '((' + TIPS[T.p[0][0]] + ',' + TIPS[T.p[0][1]] + '),' + TIPS[T.c] + ',(' + TIPS[T.p[1][0]] + ',' + TIPS[T.p[1][1]] + '))';
  }
  function allTrees() {
    var out = [], c, r, i;
    for (c = 0; c < NT; c++) {
      r = [];
      for (i = 0; i < NT; i++) if (i !== c) r.push(i);
      out.push(mkTree(c, r[0], r[1], r[2], r[3]));
      out.push(mkTree(c, r[0], r[2], r[1], r[3]));
      out.push(mkTree(c, r[0], r[3], r[1], r[2]));
    }
    return out;
  }
  var TREES = allTrees();
  var TREE_INDEX = {};
  TREES.forEach(function (T, i) { TREE_INDEX[treeKey(T)] = i; });

  // A split of five tips always leaves two on one side: the pair names the split.
  function splitsOf(T) { return [pairName(T.p[0]), pairName(T.p[1])]; }
  function splitLabel(pair) {
    var rest = TIPS.filter(function (t) { return pair.indexOf(t) < 0; }).join('');
    return pair + ' | ' + rest;
  }
  function allSplits() {
    var o = [], i, j;
    for (i = 0; i < NT; i++) for (j = i + 1; j < NT; j++) o.push(TIPS[i] + TIPS[j]);
    return o;
  }

  // Trees for drawing and for Fitch: {tips:[..], kids:[..] or null, len, name}
  function nLeaf(i, len) { return { name: TIPS[i], tips: [i], kids: null, len: len }; }
  function nJoin(kids, len) {
    var tips = [];
    kids.forEach(function (k) { tips = tips.concat(k.tips); });
    tips.sort(function (a, b) { return a - b; });
    return { name: '', tips: tips, kids: kids, len: len };
  }
  // Root a five-tip tree on the middle of the branch to tip E.
  function rootOnE(T, bl) {
    var E = 4, a = T.p[0][0], b = T.p[0][1], d = T.p[1][0], e = T.p[1][1], c = T.c, rest;
    if (c === E) {
      rest = nJoin([nJoin([nLeaf(a, bl[a]), nLeaf(b, bl[b])], bl[5]), nJoin([nLeaf(d, bl[d]), nLeaf(e, bl[e])], bl[6])], bl[E] / 2);
    } else if (d === E || e === E) {
      var o = e === E ? d : e;                       // E's partner in the pair
      var Z = nJoin([nLeaf(c, bl[c]), nJoin([nLeaf(a, bl[a]), nLeaf(b, bl[b])], bl[5])], bl[6]);
      rest = nJoin([nLeaf(o, bl[o]), Z], bl[E] / 2);
    } else {
      var o2 = b === E ? a : b;
      var Z2 = nJoin([nLeaf(c, bl[c]), nJoin([nLeaf(d, bl[d]), nLeaf(e, bl[e])], bl[6])], bl[5]);
      rest = nJoin([nLeaf(o2, bl[o2]), Z2], bl[E] / 2);
    }
    return nJoin([rest, nLeaf(E, bl[E] / 2)], 0);
  }
  // Any node tree of five tips back to {T, bl}. Works for a root with two or three children.
  function nodeToTree(root) {
    var edges = {};
    function add(tips, len) {
      var side = tips.length > 2 ? [0, 1, 2, 3, 4].filter(function (t) { return tips.indexOf(t) < 0; }) : tips.slice();
      side.sort(function (x, y) { return x - y; });
      var k = side.join('');
      edges[k] = (edges[k] || 0) + len;
    }
    (function walk(n, top) {
      if (!top) add(n.tips, n.len);
      if (n.kids) n.kids.forEach(function (k) { walk(k, false); });
    })(root, true);
    var pairs = Object.keys(edges).filter(function (k) { return k.length === 2; }).map(function (k) { return [+k[0], +k[1]]; });
    var used = pairs[0].concat(pairs[1]);
    var c = [0, 1, 2, 3, 4].filter(function (t) { return used.indexOf(t) < 0; })[0];
    var T = mkTree(c, pairs[0][0], pairs[0][1], pairs[1][0], pairs[1][1]);
    var bl = [0, 0, 0, 0, 0, 0, 0], i;
    for (i = 0; i < NT; i++) bl[i] = edges[String(i)] || 0;
    bl[5] = edges[T.p[0].join('')]; bl[6] = edges[T.p[1].join('')];
    return { T: T, bl: bl };
  }

  // ---- The alignment. aln is five strings of equal length.
  function columns(aln) {
    var cols = [], i, j, col;
    for (j = 0; j < aln[0].length; j++) {
      col = [];
      for (i = 0; i < NT; i++) col.push(BASES.indexOf(aln[i].charAt(j)));
      cols.push(col);
    }
    return cols;
  }
  // Columns with the same bases give the same likelihood, so each pattern is computed once.
  function patterns(cols) {
    var map = {}, pats = [], idx = [];
    cols.forEach(function (c) {
      var k = c.join('');
      if (map[k] === undefined) { map[k] = pats.length; pats.push(c); }
      idx.push(map[k]);
    });
    return { pats: pats, idx: idx };
  }
  function patWeights(P, w) {
    var pw = new Array(P.pats.length).fill(0);
    P.idx.forEach(function (p, j) { pw[p] += w ? w[j] : 1; });
    return pw;
  }
  function colKind(col) {
    var n = [0, 0, 0, 0];
    col.forEach(function (b) { n[b]++; });
    var seen = n.filter(function (x) { return x > 0; }).length;
    var twice = n.filter(function (x) { return x >= 2; }).length;
    return seen === 1 ? 'constant' : (twice >= 2 ? 'informative' : 'single');
  }

  // ---- Distances
  function jc(p) {
    if (p >= 0.75) return { d: 3, sat: true };
    return { d: -0.75 * Math.log(1 - 4 * p / 3), sat: false };
  }
  // w: how many times each column counts (null = once each)
  function distances(cols, kind, w) {
    var D = [], diff = [], i, j, s, n = 0, sat = false;
    cols.forEach(function (c, q) { n += w ? w[q] : 1; });
    for (i = 0; i < NT; i++) { D.push(new Array(NT).fill(0)); diff.push(new Array(NT).fill(0)); }
    for (i = 0; i < NT; i++) for (j = i + 1; j < NT; j++) {
      s = 0;
      for (var q = 0; q < cols.length; q++) if (cols[q][i] !== cols[q][j]) s += w ? w[q] : 1;
      var p = s / n, r = kind === 'jc' ? jc(p) : { d: p, sat: false };
      if (r.sat) sat = true;
      D[i][j] = D[j][i] = r.d; diff[i][j] = diff[j][i] = s;
    }
    return { D: D, diff: diff, n: n, sat: sat };
  }
  function cp(M) { return M.map(function (r) { return r.slice(); }); }
  var EPS = 1e-12;

  // Choose the smallest cell. Ties go to the first in reading order, or at random when rnd is given.
  function pickMin(score, n, rnd) {
    var best = Infinity, list = [], i, j;
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
      var v = score(i, j);
      if (v < best - EPS) { best = v; list = [[i, j]]; }
      else if (Math.abs(v - best) <= EPS) list.push([i, j]);
    }
    var pick = rnd ? list[Math.floor(rnd() * list.length)] : list[0];
    return { i: pick[0], j: pick[1], ties: list.length };
  }
  function label(n) { return n.tips.map(function (t) { return TIPS[t]; }).join(''); }

  function upgma(D0, rnd) {
    var D = cp(D0), nodes = [], steps = [], i;
    for (i = 0; i < NT; i++) { var l = nLeaf(i, 0); l.h = 0; nodes.push(l); }
    while (nodes.length > 1) {
      var m = pickMin(function (a, b) { return D[a][b]; }, nodes.length, rnd);
      var a = nodes[m.i], b = nodes[m.j], h = D[m.i][m.j] / 2;
      var st = { labels: nodes.map(label), D: cp(D), i: m.i, j: m.j, ties: m.ties, h: h, d: D[m.i][m.j], na: a.tips.length, nb: b.tips.length };
      a.len = h - a.h; b.len = h - b.h;
      var u = nJoin([a, b], 0); u.h = h;
      var keep = [], k;
      for (k = 0; k < nodes.length; k++) if (k !== m.i && k !== m.j) keep.push(k);
      var row = keep.map(function (q) { return (a.tips.length * D[m.i][q] + b.tips.length * D[m.j][q]) / (a.tips.length + b.tips.length); });
      st.calc = keep.map(function (q, x) { return { k: label(nodes[q]), di: D[m.i][q], dj: D[m.j][q], v: row[x] }; });
      var ND = keep.map(function (q) { return keep.map(function (r) { return D[q][r]; }); });
      ND.forEach(function (r, x) { r.push(row[x]); });
      ND.push(row.concat([0]));
      D = ND;
      nodes = keep.map(function (q) { return nodes[q]; }).concat([u]);
      st.after = nodes.slice();
      steps.push(st);
    }
    return { root: nodes[0], steps: steps };
  }

  function nj(D0, rnd) {
    var D = cp(D0), nodes = [], steps = [], i;
    for (i = 0; i < NT; i++) nodes.push(nLeaf(i, 0));
    function sums() { return D.map(function (r) { return r.reduce(function (s, v) { return s + v; }, 0); }); }
    while (nodes.length > 3) {
      var n = nodes.length, r = sums();
      var Q = function (a, b) { return (n - 2) * D[a][b] - r[a] - r[b]; };
      var Qm = D.map(function (row, a) { return row.map(function (v, b) { return a === b ? 0 : Q(a, b); }); });
      var m = pickMin(Q, n, rnd);
      var dij = D[m.i][m.j];
      var li = dij / 2 + (r[m.i] - r[m.j]) / (2 * (n - 2)), lj = dij - li;
      var st = { labels: nodes.map(label), D: cp(D), r: r.slice(), Q: Qm, i: m.i, j: m.j, ties: m.ties, n: n, li: li, lj: lj, d: dij };
      var a = nodes[m.i], b = nodes[m.j];
      a.len = li; b.len = lj;
      var u = nJoin([a, b], 0), keep = [], k;
      for (k = 0; k < n; k++) if (k !== m.i && k !== m.j) keep.push(k);
      var row = keep.map(function (q) { return (D[m.i][q] + D[m.j][q] - dij) / 2; });
      st.calc = keep.map(function (q, x) { return { k: label(nodes[q]), di: D[m.i][q], dj: D[m.j][q], v: row[x] }; });
      var ND = keep.map(function (q) { return keep.map(function (t) { return D[q][t]; }); });
      ND.forEach(function (x, y) { x.push(row[y]); });
      ND.push(row.concat([0]));
      D = ND;
      nodes = keep.map(function (q) { return nodes[q]; }).concat([u]);
      st.after = nodes.slice();
      steps.push(st);
    }
    var l0 = (D[0][1] + D[0][2] - D[1][2]) / 2, l1 = D[0][1] - l0, l2 = D[0][2] - l0;
    nodes[0].len = l0; nodes[1].len = l1; nodes[2].len = l2;
    var root = nJoin(nodes, 0);
    steps.push({ labels: nodes.map(label), D: cp(D), l: [l0, l1, l2], last: true, after: [root] });
    return { root: root, steps: steps };
  }

  // ---- Parsimony (Fitch). Works on a two-way rooted node tree; the root does not change the count.
  function fitchNode(n, col, trace) {
    if (!n.kids) {
      var s0 = 1 << col[n.tips[0]];
      if (trace) trace.set(n, { set: s0, step: 0 });
      return { set: s0, steps: 0 };
    }
    var a = fitchNode(n.kids[0], col, trace), b = fitchNode(n.kids[1], col, trace);
    var both = a.set & b.set, set = both || (a.set | b.set), add = both ? 0 : 1;
    if (trace) trace.set(n, { set: set, step: add, l: a.set, r: b.set });
    return { set: set, steps: a.steps + b.steps + add };
  }
  // steps[tree][pattern]
  function parsimonyTable(P) {
    var unit = [1, 1, 1, 1, 1, 1, 1];
    return TREES.map(function (T) {
      var root = rootOnE(T, unit);
      return P.pats.map(function (c) { return fitchNode(root, c).steps; });
    });
  }
  function dot(a, b) { var s = 0, i; for (i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }

  // ---- Likelihood under the Jukes-Cantor model.
  function pSame(t) { return 0.25 + 0.75 * Math.exp(-4 * t / 3); }
  function pDiff(t) { return 0.25 - 0.25 * Math.exp(-4 * t / 3); }
  function siteLik(col, T, bl) {
    var a = T.p[0][0], b = T.p[0][1], d = T.p[1][0], e = T.p[1][1], c = T.c;
    var sa = pSame(bl[a]), da = pDiff(bl[a]), sb = pSame(bl[b]), db = pDiff(bl[b]);
    var sd = pSame(bl[d]), dd = pDiff(bl[d]), se = pSame(bl[e]), de = pDiff(bl[e]);
    var sc = pSame(bl[c]), dc = pDiff(bl[c]);
    var sx = pSame(bl[5]), dx = pDiff(bl[5]), sy = pSame(bl[6]), dy = pDiff(bl[6]);
    var X = [0, 0, 0, 0], Y = [0, 0, 0, 0], s, sumX = 0, sumY = 0, L = 0;
    for (s = 0; s < 4; s++) {
      X[s] = (s === col[a] ? sa : da) * (s === col[b] ? sb : db); sumX += X[s];
      Y[s] = (s === col[d] ? sd : dd) * (s === col[e] ? se : de); sumY += Y[s];
    }
    for (s = 0; s < 4; s++) {
      L += (dx * sumX + (sx - dx) * X[s]) * (dy * sumY + (sy - dy) * Y[s]) * (s === col[c] ? sc : dc);
    }
    return L / 4;
  }
  function logLik(P, pw, T, bl) {
    var s = 0, i;
    for (i = 0; i < P.pats.length; i++) if (pw[i]) s += pw[i] * Math.log(siteLik(P.pats[i], T, bl));
    return s;
  }
  // Felsenstein's pruning on a drawn tree, keeping the four numbers at every node.
  function pruneNode(n, col, out) {
    var v = [0, 0, 0, 0], s, u;
    if (!n.kids) { v[col[n.tips[0]]] = 1; if (out) out.set(n, v); return v; }
    var parts = n.kids.map(function (k) { return { k: k, v: pruneNode(k, col, out) }; });
    for (s = 0; s < 4; s++) {
      var prod = 1;
      parts.forEach(function (p) {
        var sum = 0, same = pSame(p.k.len), dif = pDiff(p.k.len);
        for (u = 0; u < 4; u++) sum += (u === s ? same : dif) * p.v[u];
        prod *= sum;
      });
      v[s] = prod;
    }
    if (out) out.set(n, v);
    return v;
  }
  // With every other branch fixed, the likelihood of a column is a straight line in
  // E = exp(-4t/3): L = alpha + beta*E. So one branch is solved exactly from two evaluations.
  function optBranch(P, pw, T, bl, i) {
    var keep = bl[i], np = P.pats.length, al = new Array(np), be = new Array(np), q;
    bl[i] = 1e9;
    for (q = 0; q < np; q++) al[q] = siteLik(P.pats[q], T, bl);
    bl[i] = 0;
    for (q = 0; q < np; q++) be[q] = siteLik(P.pats[q], T, bl) - al[q];
    bl[i] = keep;
    function g(E) { var s = 0, k; for (k = 0; k < np; k++) if (pw[k]) s += pw[k] * be[k] / (al[k] + be[k] * E); return s; }
    var lo = Math.exp(-4 * MAXB / 3), up = Math.exp(-4 * MINB / 3), E;
    if (g(up) >= 0) E = up;
    else if (g(lo) <= 0) E = lo;
    else {
      for (var it = 0; it < 60; it++) { E = (lo + up) / 2; if (g(E) > 0) lo = E; else up = E; }
    }
    bl[i] = -0.75 * Math.log(E);
  }
  function optimise(P, pw, T, start, rounds, which) {
    var bl = start ? start.slice() : [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
    var list = which || [0, 1, 2, 3, 4, 5, 6], last = -Infinity, r, i, v;
    for (r = 0; r < rounds; r++) {
      for (i = 0; i < list.length; i++) optBranch(P, pw, T, bl, list[i]);
      v = logLik(P, pw, T, bl);
      if (v - last < 1e-7) break;
      last = v;
    }
    return { bl: bl, lnL: logLik(P, pw, T, bl) };
  }
  function siteLogs(P, T, bl) {
    var perPat = P.pats.map(function (c) { return Math.log(siteLik(c, T, bl)); });
    return P.idx.map(function (p) { return perPat[p]; });
  }
  var STARTS = [[.1, .1, .1, .1, .1, .1, .1], [.5, .5, .5, .5, .5, .01, .01], [.02, .02, .02, .02, .02, .3, .3], [1, .05, 1, .05, .3, .05, .5], [.05, 1, .05, 1, .3, .5, .05]];
  // Best branch lengths on all 15 trees, with the log-likelihood of each column kept.
  function mlAll(P) {
    var pw = patWeights(P, null);
    return TREES.map(function (T, ti) {
      // Several starting points, because a branch at zero can trap a climb on a local peak.
      var o = null;
      STARTS.forEach(function (s) {
        var c = optimise(P, pw, T, s, 200);
        if (!o || c.lnL > o.lnL) o = c;
      });
      return { ti: ti, T: T, bl: o.bl, lnL: o.lnL, site: siteLogs(P, T, o.bl) };
    });
  }
  function bestSet(score, better) {
    var best = null, list = [], i, tol = 1e-6;
    for (i = 0; i < score.length; i++) {
      if (best === null || better(score[i], best, tol)) { best = score[i]; list = [i]; }
      else if (Math.abs(score[i] - best) <= tol) list.push(i);
    }
    return list;
  }
  function higher(a, b, t) { return a > b + t; }
  function lower(a, b, t) { return a < b - t; }

  // ---- Resampling. One draw of n columns with replacement.
  function resample(n, rnd) {
    var w = new Array(n).fill(0), i;
    for (i = 0; i < n; i++) w[Math.floor(rnd() * n)]++;
    return w;
  }
  // Returns the indices of the winning trees for one set of column weights.
  // Several indices mean a tie: each tied tree then gets an equal share of the credit.
  function replicate(method, ctx, w, rnd) {
    if (method === 'upgma' || method === 'nj') {
      var D = distances(ctx.cols, ctx.dist, w).D;
      var r = nodeToTree((method === 'upgma' ? upgma : nj)(D, rnd).root);
      return [TREE_INDEX[treeKey(r.T)]];
    }
    if (method === 'pars') {
      var pw = patWeights(ctx.P, w);
      return bestSet(ctx.steps.map(function (row) { return dot(row, pw); }), lower);
    }
    if (method === 'ml') {
      var pw2 = patWeights(ctx.P, w);
      // Start from the fitted lengths and from two starts with long branches: the first alone can stay on a local peak.
      return bestSet(ctx.ml.map(function (m) {
        return Math.max(optimise(ctx.P, pw2, m.T, m.bl, 25).lnL, optimise(ctx.P, pw2, m.T, STARTS[3], 25).lnL, optimise(ctx.P, pw2, m.T, STARTS[4], 25).lnL);
      }), higher).map(function (i) { return ctx.ml[i].ti; });
    }
    // RELL: no new branch lengths and no search, only the stored column values added up again.
    return bestSet(ctx.ml.map(function (m) { return dot(m.site, w); }), higher).map(function (i) { return ctx.ml[i].ti; });
  }

  // ---- Nearest-neighbour rearrangements: the centre tip swaps with one member of a pair.
  // Tip branches stay with their tips; each inner branch stays with its pair.
  function nniOf(T, bl, side) {
    var kept = T.p[1 - side];
    return T.p[side].map(function (m) {
      var other = T.p[side][0] === m ? T.p[side][1] : T.p[side][0];
      var T2 = mkTree(m, T.c, other, kept[0], kept[1]);
      var keptAt = T2.p[0][0] === kept[0] && T2.p[0][1] === kept[1] ? 0 : 1;
      var b2 = bl.slice();
      b2[5 + keptAt] = bl[5 + (1 - side)];
      b2[5 + (1 - keptAt)] = bl[5 + side];
      return { T: T2, bl: b2, movedSide: 1 - keptAt };
    });
  }
  // The inner branch and its four neighbours: what IQ-TREE re-fits for each rearrangement.
  function fiveBranches(T, side) { return [T.p[side][0], T.p[side][1], T.c, 5, 6]; }

  // ---- SH-aLRT, as written in IQ-TREE's PhyloTree::testOneBranch.
  function shSetup(P, best, side) {
    var pw = patWeights(P, null);
    var alts = nniOf(best.T, best.bl, side).map(function (a) {
      var o = optimise(P, pw, a.T, a.bl, 30, fiveBranches(a.T, a.movedSide));
      return { T: a.T, bl: o.bl, lnL: o.lnL, site: siteLogs(P, a.T, o.bl) };
    });
    alts.sort(function (x, y) { return y.lnL - x.lnL; });
    return {
      side: side, split: pairName(best.T.p[side]),
      lh: [best.lnL, alts[0].lnL, alts[1].lnL], site: [best.site, alts[0].site, alts[1].site],
      alts: alts, aLRT: best.lnL - alts[0].lnL
    };
  }
  function shReplicate(S, w) {
    var nw = [dot(S.site[0], w), dot(S.site[1], w), dot(S.site[2], w)];
    var cs = [nw[0] - S.lh[0], nw[1] - S.lh[1], nw[2] - S.lh[2]];
    var sorted = cs.slice().sort(function (a, b) { return b - a; });
    var gap = sorted[0] - sorted[1];
    return { nw: nw, cs: cs, gap: gap, pass: S.aLRT > gap + 0.05 };
  }

  // ---- MCMC over trees and branch lengths. Prior: all 15 trees equal; each branch exponential, mean PRIOR_MEAN.
  var PRIOR_MEAN = 0.1;
  function mcmcInit(P, ti, rnd) {
    var T = TREES[ti], bl = [], i;
    for (i = 0; i < 7; i++) bl.push(0.05 + 0.1 * rnd());
    var pw = patWeights(P, null);
    return { T: T, bl: bl, pw: pw, lnL: logLik(P, pw, T, bl), gen: 0, acc: 0 };
  }
  function lnPrior(bl) { var s = 0; bl.forEach(function (b) { s -= b / PRIOR_MEAN; }); return s; }
  function mcmcStep(P, S, rnd) {
    var T2 = S.T, bl2 = S.bl.slice(), lnH = 0, kind, what;
    if (rnd() < 0.5) {
      var i = Math.floor(rnd() * 7), m = Math.exp(rnd() - 0.5);
      bl2[i] = S.bl[i] * m; lnH = Math.log(m); kind = 'branch';
      what = { i: i, m: m };
    } else {
      var side = rnd() < 0.5 ? 0 : 1, pick = rnd() < 0.5 ? 0 : 1;
      var alt = nniOf(S.T, S.bl, side)[pick];
      T2 = alt.T; bl2 = alt.bl; kind = 'tree';
    }
    var ln2 = logLik(P, S.pw, T2, bl2);
    var dL = ln2 - S.lnL, dP = lnPrior(bl2) - lnPrior(S.bl);
    var lnR = dL + dP + lnH, u = rnd(), ok = Math.log(u) < lnR;
    var info = { kind: kind, what: what, from: S.T, to: T2, lnOld: S.lnL, lnNew: ln2, dL: dL, dP: dP, lnH: lnH, lnR: lnR, u: u, ok: ok };
    S.gen++;
    if (ok) { S.T = T2; S.bl = bl2; S.lnL = ln2; S.acc++; }
    return info;
  }
  // ---- Comparing whole trees. KH and SH follow evaluateTrees in IQ-TREE's treetesting.cpp, AU follows performAUTest,
  // with its search for the threshold, but without the final maximum likelihood refit (mlecoef).
  function normCdf(x) {                    // Abramowitz and Stegun 7.1.26
    var z = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.3275911 * z);
    var e = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
    return x >= 0 ? 0.5 * (1 + e) : 0.5 * (1 - e);
  }
  function normInv(p) {                    // bisection is plenty here
    var a = -9, b = 9, i, m;
    for (i = 0; i < 60; i++) { m = (a + b) / 2; if (normCdf(m) < p) a = m; else b = m; }
    return (a + b) / 2;
  }
  var AU_SCALES = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4];
  function resampleN(n, m, rnd) {          // m draws from n columns
    var w = new Array(n).fill(0), i;
    for (i = 0; i < m; i++) w[Math.floor(rnd() * n)]++;
    return w;
  }
  // sites[t] = ln L of each column on tree t; lnL[t] = their sum. Returns bp, kh, sh, au for every tree.
  function treeTests(sites, R, rnd) {
    var T = sites.length, n = sites[0].length, b = [], avg = new Array(T).fill(0), best = new Array(T).fill(0), r, t, k;
    var L = sites.map(function (s) { return s.reduce(function (x, y) { return x + y; }, 0); });
    for (r = 0; r < R; r++) {
      var w = resample(n, rnd), v = sites.map(function (s) { return dot(s, w); }), mx = Math.max.apply(null, v);
      var top = []; v.forEach(function (x, i) { if (x > mx - 1e-9) top.push(i); });
      top.forEach(function (i) { best[i] += 1 / top.length; });
      b.push(v);
      for (t = 0; t < T; t++) avg[t] += v[t] / R;
    }
    var ord = L.map(function (_, i) { return i; }).sort(function (x, y) { return L[y] - L[x]; }), out = [];
    for (t = 0; t < T; t++) {
      var m = t === ord[0] ? ord[1] : ord[0], diff = L[m] - L[t], kh = 0, sh = 0;
      for (r = 0; r < R; r++) {
        var c = b[r][t] - avg[t], mxc = -Infinity;
        for (k = 0; k < T; k++) mxc = Math.max(mxc, b[r][k] - avg[k]);
        if (mxc - c > diff) sh++;
        if (b[r][m] - avg[m] - c > diff) kh++;
      }
      out.push({ bp: best[t] / R, kh: kh / R, sh: sh / R, delta: L[ord[0]] - L[t] });
    }
    // AU: at each size of resample, how far each tree falls behind the leader (performAUTest in IQ-TREE).
    var stats = [], tt2;
    for (tt2 = 0; tt2 < T; tt2++) stats.push(AU_SCALES.map(function () { return []; }));
    AU_SCALES.forEach(function (sc, kk) {
      var m2 = Math.round(n * sc), q;
      for (q = 0; q < R; q++) {
        var w2 = resampleN(n, m2, rnd), v2 = sites.map(function (s) { return dot(s, w2) / sc; }), mx2 = -Infinity, sec = -Infinity, top2 = 0;
        v2.forEach(function (x, i) { if (x > mx2) { sec = mx2; mx2 = x; top2 = i; } else if (x > sec) sec = x; });
        v2.forEach(function (x, i) { stats[i][kk].push(i === top2 ? sec - mx2 : mx2 - x); });
      }
    });
    for (t = 0; t < T; t++) {
      stats[t].forEach(function (a) { a.sort(function (x, y) { return x - y; }); });
      out[t].au = auTest(stats[t], R);
    }
    return out;
  }
  function shareBelow(v, t) {              // cntdist3: the smoothed count of values at or below t in a sorted list
    var n = v.length, lo = 0, hi = n, m, i, p;
    while (lo < hi) { m = (lo + hi) >> 1; if (v[m] <= t) lo = m + 1; else hi = m; }
    i = lo - 1;
    if (i < 0) p = v[1] > v[0] ? 0.5 + (t - v[0]) / (v[1] - v[0]) : 0;
    else if (i < n - 1) p = v[i + 1] > v[i] ? 0.5 + i + (t - v[i]) / (v[i + 1] - v[i]) : 0.5 + i;
    else p = v[n - 1] - v[n - 2] > 0 ? n - 0.5 + (t - v[n - 1]) / (v[n - 1] - v[n - 2]) : n;
    return Math.min(n, Math.max(0, p)) / n;
  }
  function auFit(bp, R) {                  // z = d sqrt(r) + c / sqrt(r), weighted least squares; p = 1 - Phi(d - c)
    var AB = 0, BC = 0, AC = 0, A2 = 0, B2 = 0, used = 0;
    bp.forEach(function (p, k) {
      if (p <= 0 || p >= 1) return;
      var z = -normInv(p), f = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI), w = f * f * R / (p * (1 - p));
      var a = Math.sqrt(AU_SCALES[k]), b = 1 / a;
      AB += w * a * b; BC += w * b * z; AC += w * a * z; A2 += w * a * a; B2 += w * b * b; used++;
    });
    if (used < 2) return { p: bp.filter(function (x) { return x <= 0; }).length > AU_SCALES.length / 2 ? 0 : 1, se: 0, df: used - 2 };
    var den = 1 / (AB * AB - A2 * B2), d = (BC * AB - AC * B2) * den, c = (AC * AB - BC * A2) * den;
    var e = d - c, se = Math.exp(-e * e / 2) / Math.sqrt(2 * Math.PI) * Math.sqrt(Math.max(0, -den * (B2 + A2 + 2 * AB)));
    return { p: 1 - normCdf(e), se: se, df: used - 2 };
  }
  function auTest(stat, R) {               // the search for the threshold in performAUTest
    var xn = stat[5][R >> 1], th = 0, thp = 0, z0 = 0, ze0 = 0, idf0 = -2, res = null, step, x, f, z;
    for (step = 0; step < 30; step++) {
      x = xn;
      f = auFit(stat.map(function (v) { return shareBelow(v, x); }), R);
      z = -f.p;
      if (f.df < 0 && idf0 < 0) break;
      if (f.df < 0 || (idf0 >= 0 && (z - z0) * (x - thp) > 0 && Math.abs(z - z0) > 0.1 * ze0)) { th = x; xn = 0.5 * x + 0.5 * thp; continue; }
      if (idf0 >= 0 && Math.abs(z - z0) < 0.01 * ze0) { if (Math.abs(th) < 1e-10) xn = th; else th = x; }
      else xn = 0.5 * th + 0.5 * x;
      res = f.p; thp = x; z0 = z; ze0 = f.se; idf0 = f.df;
      if (Math.abs(x - th) < 1e-10) break;
    }
    return res === null ? f.p : res;
  }
  // ENGINE-END
  // ---- Everything below is the page: drawing and buttons. All numbers come from the engine above.
  var PRESETS = [
    { id: 'clean', name: 'Clean signal', aln: ['GTAATATTGTCATGGAGTCG', 'GCAATATTCTAAAAGAGTCG', 'CCACTATACCGCCGTTGTAG', 'CCATTATACCGACGTCTTAG', 'CCATTATACTGAAGGTTTCC'],
      note: 'All tips changed at about the same speed, and the two inner branches are long enough to leave a mark.' },
    { id: 'unequal', name: 'One fast lineage', aln: ['GATCTAACGTTGTGCCGGCA', 'ATGCTAACATCGTACCGCCC', 'TGGTTAAGATAGAGGTCCCC', 'TTGTTCGGACAGGGGTCCCC', 'CAGCTAAGATTGGGCTGCCC'],
      note: 'Tip A changed about ten times faster than its sister B. UPGMA assumes equal speed, so watch where it puts A and B.' },
    { id: 'long', name: 'Two long branches', aln: ['TAGGCCGCCCAAATGTAGAT', 'TCGGCATCACAATAATCAGT', 'CGGGCTCGGGCGTAGTCGTA', 'CCGGGTTCACAATAATCTGA', 'TCGGGTGCCCATTAATCTGA'],
      note: 'A and C sit on long branches, B and D on short ones. Chance matches between A and C look like shared history to parsimony.' },
    { id: 'weak', name: 'Weak signal', aln: ['AATAATCAATTATCAGCTGA', 'AATATTGAATTATCACCTGA', 'ATCATTGAATTAACTTCAGC', 'CTCATTGAATAAACTGCAGA', 'CCTATTGATTACTCGGCAGA'],
      note: 'The inner branches are short, so few columns record them. The methods are free to disagree, and the support should say so.' }
  ];
  var TRUE_KEY = 'AB|E|CD', NC = 20, UNIT = [1, 1, 1, 1, 1, 1, 1];
  var METHODS = { upgma: 'UPGMA', nj: 'NJ', pars: 'Parsimony', ml: 'ML', rell: 'ML, stored columns (RELL)' };
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function (id) { return document.getElementById(id); };
  var st = { chainNo: 0, tt: null, dist: 'jc', tab: 'upgma', stab: 'boot', bm: 'nj', col: 0, upStep: 0, njStep: 0, side: 0, run: 0, busy: false };

  function f(x, d) { var v = x.toFixed(d === undefined ? 3 : d); return /^-0\.?0*$/.test(v) ? v.slice(1) : v; }
  function sci(x) { return x === 0 ? '0' : (x >= 0.001 ? x.toFixed(4) : x.toExponential(2)); }
  function tip(t, title) { return '<span class="tip" title="' + title + '">' + t + '</span>'; }
  function pct(a, b) { return b ? (100 * a / b).toFixed(1) + ' %' : '–'; }
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag), k;
    for (k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function nodeSplit(n) {
    if (n.tips.length === 2) return TIPS[n.tips[0]] + TIPS[n.tips[1]];
    if (n.tips.length === 3) return TIPS.filter(function (t, i) { return n.tips.indexOf(i) < 0; }).join('');
    return null;
  }
  function eachNode(n, fn) { fn(n); if (n.kids) n.kids.forEach(function (k) { eachNode(k, fn); }); }
  function ordered(n) { return n.kids.slice().sort(function (a, b) { return a.tips[0] - b.tips[0]; }); }

  // One drawing routine for every tree. o.forest: 'root' is a list of separate trees.
  function drawTree(box, root, o) {
    o = o || {};
    box.textContent = '';
    var W = o.w || 320, row = o.row || 24, padL = o.padL || 10, padR = o.padR || 22, tops = o.forest ? root : [root];
    var pos = new Map(), y = 0, maxX = 0, levels = 0;
    function height(n) { return n.kids ? 1 + Math.max.apply(null, n.kids.map(height)) : 0; }
    function lay(n, x, lev) {
      var p = { x: x, lev: lev }; pos.set(n, p);
      if (x > maxX) maxX = x;
      if (lev > levels) levels = lev;
      if (!n.kids) { p.y = y++; return p; }
      var ys = ordered(n).map(function (k) { return lay(k, x + Math.max(0, k.len), lev + 1).y; });
      p.y = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
      return p;
    }
    var hs = tops.map(function (n) { return n.h === undefined ? 0 : n.h; }), hMax = Math.max.apply(null, hs);
    tops.forEach(function (n, i) { lay(n, o.align ? hMax - hs[i] : 0, 0); });
    var sx = o.clado ? (W - padL - padR) / Math.max(1, levels) : (W - padL - padR) / Math.max(maxX, 1e-9);
    function X(n) { var p = pos.get(n); return padL + (o.clado ? (n.kids ? p.lev : levels) * sx : p.x * sx); }
    function Y(n) { return 14 + pos.get(n).y * row; }
    var H = 14 + (y - 1) * row + 12 + (o.bar ? 18 : 0);
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': o.label || 'tree', style: 'max-width:' + W + 'px;display:block' }, box);
    var line = 'stroke:var(--fg);stroke-width:1.5;fill:none';
    tops.forEach(function (top) {
      eachNode(top, function (n) {
        if (!n.kids) {
          el('text', { x: X(n) + 4, y: Y(n) + 4, class: 'lab' }, svg, n.name);
          return;
        }
        var ks = ordered(n);
        el('line', { x1: X(n), x2: X(n), y1: Y(ks[0]), y2: Y(ks[ks.length - 1]), style: line }, svg);
        ks.forEach(function (k) {
          el('line', { x1: X(n), x2: X(k), y1: Y(k), y2: Y(k), style: line }, svg);
          if (o.branch && X(k) - X(n) >= 26) { var t = o.branch(k); if (t) el('text', { x: (X(n) + X(k)) / 2, y: Y(k) - 3, 'text-anchor': 'middle', style: 'font-size:9.5px' }, svg, t); }
        });
      });
      eachNode(top, function (n) {
        if (!o.node) return;
        var t = o.node(n);
        if (t) {
          el('circle', { cx: X(n), cy: Y(n), r: 3, style: 'fill:' + (t.bad ? 'var(--bad)' : 'var(--accent)') }, svg);
          el('text', { x: X(n) + (t.right ? 5 : -4), y: Y(n) - 5, 'text-anchor': t.right ? 'start' : 'end', style: 'font-size:10.5px;fill:' + (t.bad ? 'var(--bad)' : 'var(--accent)') }, svg, t.text);
        }
      });
    });
    if (o.bar && maxX > 0) {
      var u = maxX > 1 ? 0.5 : (maxX > 0.2 ? 0.1 : 0.02);
      el('line', { x1: padL, x2: padL + u * sx, y1: H - 6, y2: H - 6, style: line }, svg);
      el('text', { x: padL + u * sx + 5, y: H - 3, style: 'font-size:9.5px' }, svg, String(u));
    }
  }

  function mat(labels, M, o) {
    o = o || {};
    var h = '<div class="s12-mx"><table class="s12-m"><tr><th></th>', i, j;
    labels.forEach(function (l) { h += '<th>' + l + '</th>'; });
    if (o.r) h += '<th class="s12-r">row sum</th>';
    h += '</tr>';
    for (i = 0; i < labels.length; i++) {
      h += '<tr><th>' + labels[i] + '</th>';
      for (j = 0; j < labels.length; j++) {
        var on = o.hi && ((o.hi[0] === i && o.hi[1] === j) || (o.hi[0] === j && o.hi[1] === i));
        h += '<td' + (on ? ' class="s12-on"' : '') + '>' + (i === j ? '·' : (o.int ? M[i][j] : f(M[i][j], o.d))) + '</td>';
      }
      if (o.r) h += '<td class="s12-r">' + f(o.r[i]) + '</td>';
      h += '</tr>';
    }
    return h + '</table></div>';
  }
  function bars(rows) {
    return rows.map(function (r) {
      return '<div class="s12-row"><span class="s12-name">' + r.name + '</span><span class="s12-bar"><i style="width:' + (100 * r.v).toFixed(1) + '%"' + (r.on ? ' class="s12-ref"' : '') + '></i></span><span class="s12-val">' + r.text + '</span></div>';
    }).join('');
  }

  // ---- State
  function ctx() { return { cols: st.cols, P: st.P, steps: st.steps, ml: st.ml, dist: st.dist }; }
  function njTree() { return nodeToTree(st.nj.root); }
  function refTree(m) {
    if (m === 'upgma') return { root: st.up.root, keys: splitsOf(nodeToTree(st.up.root).T), bar: true };
    if (m === 'nj') { var t = njTree(); return { root: rootOnE(t.T, t.bl), keys: splitsOf(t.T), bar: true }; }
    if (m === 'pars') return { root: rootOnE(TREES[st.pBest[0]], UNIT), keys: splitsOf(TREES[st.pBest[0]]), clado: true };
    return { root: rootOnE(st.best.T, st.best.bl), keys: splitsOf(st.best.T), bar: true };
  }
  function refresh() {
    st.run++; st.busy = false;
    st.cols = columns(st.aln); st.P = patterns(st.cols);
    st.dd = distances(st.cols, st.dist);
    st.up = upgma(st.dd.D); st.nj = nj(st.dd.D);
    st.upStep = Math.min(st.upStep, st.up.steps.length); st.njStep = Math.min(st.njStep, st.nj.steps.length);
    st.steps = parsimonyTable(st.P); st.pw = patWeights(st.P, null);
    st.pscore = st.steps.map(function (r) { return dot(r, st.pw); });
    st.pBest = bestSet(st.pscore, lower);
    st.ml = mlAll(st.P);
    st.mlOrder = st.ml.slice().sort(function (a, b) { return b.lnL - a.lnL; });
    st.tt = null;
    st.best = st.mlOrder[0];
    st.mlTies = st.ml.filter(function (m) { return st.best.lnL - m.lnL < 1e-6; }).length;
    st.pSel = st.pBest[0]; st.mSel = st.best.ti;
    st.rnd = rng(2026); st.boot = {}; st.sh = {}; st.chain = null;
    var r = rng(77), S = mcmcInit(st.P, 0, r), c = new Array(15).fill(0), g;
    for (g = 0; g < 20000; g++) { mcmcStep(st.P, S, r); if (g >= 2000) c[TREE_INDEX[treeKey(S.T)]]++; }
    st.autoMap = c.indexOf(Math.max.apply(null, c)); st.autoShare = c[st.autoMap] / 18000;
    renderAln(); renderAnswers(); renderTab(); renderSupport();
  }
  function load(p) {
    st.aln = p.aln.slice(); st.preset = p; st.edited = false; st.upStep = 0; st.njStep = 0;
    $('s12-note').textContent = p.note;
    Array.prototype.forEach.call($('s12-presets').children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.p === p.id)); });
    refresh();
  }

  // ---- The alignment
  function renderAln() {
    var box = $('s12-aln'), h = '<span></span>', i, j;
    for (j = 0; j < NC; j++) h += '<button type="button" class="s12-cn' + (j === st.col ? ' s12-sel' : '') + '" data-col="' + j + '" aria-label="Select column ' + (j + 1) + '">' + (j + 1) + '</button>';
    for (i = 0; i < NT; i++) {
      h += '<span class="s12-tn">' + TIPS[i] + '</span>';
      for (j = 0; j < NC; j++) {
        var b = st.aln[i].charAt(j);
        h += '<button type="button" class="s12-b s12-' + b + (j === st.col ? ' s12-sel' : '') + '" data-i="' + i + '" data-j="' + j + '" aria-label="' + TIPS[i] + ' column ' + (j + 1) + ': ' + b + '. Click to change.">' + b + '</button>';
      }
    }
    h += '<span></span>';
    for (j = 0; j < NC; j++) {
      var k = colKind(st.cols[j]);
      h += '<span class="s12-k" title="' + (k === 'constant' ? 'constant: all five the same' : k === 'single' ? 'varies, but fewer than two bases appear twice or more: no use to parsimony' : 'informative: at least two bases each appear twice or more') + '">' + (k === 'constant' ? '·' : k === 'single' ? '○' : '●') + '</span>';
    }
    box.innerHTML = h;
  }
  function pickCol(j) { st.col = j; renderAln(); renderTab(); }

  // ---- Result strip
  function renderAnswers() {
    var u = nodeToTree(st.up.root), n = njTree();
    var list = [
      { name: 'UPGMA', key: treeKey(u.T), root: st.up.root, extra: 'rooted by the method itself' },
      { name: 'Neighbour joining', key: treeKey(n.T), root: rootOnE(n.T, n.bl), extra: 'rooted on E' },
      { name: 'Parsimony', key: treeKey(TREES[st.pBest[0]]), root: rootOnE(TREES[st.pBest[0]], UNIT), clado: true, extra: st.pscore[st.pBest[0]] + ' steps' + (st.pBest.length > 1 ? ', ' + st.pBest.length + ' trees tied, first shown' : ''), tied: st.pBest.length > 1 ? st.pBest.map(function (i) { return treeKey(TREES[i]); }) : null },
      { name: 'Maximum likelihood', key: treeKey(st.best.T), root: rootOnE(st.best.T, st.best.bl), extra: 'ln L ' + f(st.best.lnL, 2) + (st.mlTies > 1 ? ', ' + st.mlTies + ' trees tied' : ''), tied: st.mlTies > 1 ? st.ml.filter(function (m) { return st.best.lnL - m.lnL < 1e-6; }).map(function (m) { return treeKey(m.T); }) : null },
      { name: 'Bayesian', key: treeKey(TREES[st.autoMap]), root: rootOnE(TREES[st.autoMap], UNIT), clado: true, extra: 'most visited, ' + (100 * st.autoShare).toFixed(0) + ' % of the 18,000 steps kept after burn-in' }
    ];
    var box = $('s12-answers');
    box.textContent = '';
    list.forEach(function (a) {
      var d = document.createElement('div'), t = document.createElement('div');
      d.className = 's12-ans';
      var mark = st.edited ? '' : (a.key === TRUE_KEY ? ' <span class="s12-yes">true tree' + (a.tied ? ', tied' : '') + '</span>' : a.tied && a.tied.indexOf(TRUE_KEY) >= 0 ? ' <span class="s12-yes">true tree is among the tied</span>' : ' <span class="s12-no">not the true tree</span>');
      d.innerHTML = '<b>' + a.name + '</b>' + mark;
      d.appendChild(t);
      drawTree(t, a.root, { w: 170, row: 17, clado: a.clado, padR: 16, label: a.name + ' tree' });
      var s = document.createElement('small'); s.textContent = a.extra; d.appendChild(s);
      box.appendChild(d);
    });
    $('s12-truth').innerHTML = st.edited ? 'You have edited this alignment, so the true tree is no longer known. That is the real situation.' : 'True tree of this simulation: <code>((A,B),(C,D),E)</code>.';
  }

  // ---- Tabs
  function renderTab() {
    Array.prototype.forEach.call($('s12-tabs').children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.t === st.tab)); });
    ({ upgma: renderUp, nj: renderNj, pars: renderPars, ml: renderMl, bayes: renderBayes })[st.tab]();
  }
  function stepBar(i, n) {
    return '<div class="s12-btns"><button type="button" class="btn" data-step="-1"' + (i <= 0 ? ' disabled' : '') + '>Back</button><button type="button" class="btn" data-step="1"' + (i >= n ? ' disabled' : '') + '>Next step</button><button type="button" class="btn" data-step="99">Show the end</button><span class="s12-tag">step ' + i + ' of ' + n + '</span></div>';
  }
  function distIntro() {
    var d = st.dd, a = 0, b = 1, p = d.diff[a][b] / d.n;
    var h = '<p><b>Start: count differences.</b> For each pair of tips, count the columns where the two differ. A and B differ at ' + d.diff[a][b] + ' of ' + d.n + ' columns, so the ' + tip('p-distance', 'The share of columns that differ.') + ' is ' + d.diff[a][b] + '/' + d.n + ' = ' + f(p) + '.';
    if (st.dist === 'jc') h += ' Some changes hide others, so the ' + tip('Jukes-Cantor correction', 'A formula that estimates how many changes really happened from how many can be seen.') + ' raises it: ' + (p >= 0.75 ? 'the formula d = −¾ ln(1 − 4p/3) has no answer at this p, so this toy uses d = ' + f(d.D[a][b]) : 'd = −¾ ln(1 − 4p/3) = ' + f(d.D[a][b])) + '.';
    h += '</p>' + (d.sat ? '<p class="s12-warn">At least one pair differs at 75 % of columns or more. The correction has no answer there (the sequences look unrelated), so this toy uses d = 3.</p>' : '');
    return h + '<h4>Differences (out of ' + d.n + ')</h4>' + mat(TIPS, d.diff, { int: true }) + '<h4>Distances used</h4>' + mat(TIPS, d.D);
  }
  function renderUp() {
    var box = $('s12-panel'), i = st.upStep, n = st.up.steps.length, tree;
    var seg = '<div class="seg" id="s12-dseg"><button type="button" data-d="jc" aria-pressed="' + (st.dist === 'jc') + '">Corrected (JC)</button><button type="button" data-d="p" aria-pressed="' + (st.dist === 'p') + '">Plain p-distance</button></div>';
    var h = stepBar(i, n) + seg + '<div class="s12-two"><div>';
    if (i === 0) h += distIntro();
    else {
      var s = st.up.steps[i - 1], A = s.labels[s.i], B = s.labels[s.j];
      h += mat(s.labels, s.D, { hi: [s.i, s.j] });
      h += '<p><b>Smallest distance:</b> ' + A + ' to ' + B + ' = ' + f(s.d) + (s.ties > 1 ? ' (tied with ' + (s.ties - 1) + ' other cell' + (s.ties > 2 ? 's' : '') + '; the first in reading order is taken, and a different choice can give a different tree)' : '') + '. Join them. UPGMA puts the new node at half the distance: height ' + f(s.h) + ', so all tips below it are equally far from it.</p>';
      if (s.calc.length) h += '<p><b>New row:</b> the distance from the new group to anything else is the average over its members.</p><ul class="s12-calc">' + s.calc.map(function (c) { return '<li>' + A + B + ' to ' + c.k + ' = (' + s.na + ' × ' + f(c.di) + ' + ' + s.nb + ' × ' + f(c.dj) + ') / ' + (s.na + s.nb) + ' = <b>' + f(c.v) + '</b></li>'; }).join('') + '</ul>';
      else h += '<p>Only one group is left: the tree is done, and its root is where the last two groups met.</p>';
    }
    h += '</div><div><h4>The tree so far</h4><div id="s12-tree"></div></div></div>';
    box.innerHTML = h;
    var nodes = i === 0 ? TIPS.map(function (t, q) { var l = nLeaf(q, 0); l.h = 0; return l; }) : st.up.steps[i - 1].after;
    tree = $('s12-tree');
    drawTree(tree, nodes, { forest: true, align: true, w: 300, label: 'UPGMA tree after step ' + i, branch: function (k) { return k.len > 0 ? f(k.len, 2) : ''; } });
  }
  function renderNj() {
    var box = $('s12-panel'), i = st.njStep, n = st.nj.steps.length;
    var seg = '<div class="seg" id="s12-dseg"><button type="button" data-d="jc" aria-pressed="' + (st.dist === 'jc') + '">Corrected (JC)</button><button type="button" data-d="p" aria-pressed="' + (st.dist === 'p') + '">Plain p-distance</button></div>';
    var h = stepBar(i, n) + seg + '<div class="s12-two"><div>';
    if (i === 0) h += distIntro();
    else {
      var s = st.nj.steps[i - 1];
      if (s.last) {
        h += mat(s.labels, s.D);
        h += '<p><b>Three left.</b> They meet at one central node, and three equations give the three branches: ' + s.labels.map(function (l, q) { return l + ' ' + f(s.l[q]); }).join(', ') + '.</p><p>Neighbour joining gives an unrooted tree. It is drawn here rooted on E only so that it can be read like the others.</p>';
      } else {
        var A = s.labels[s.i], B = s.labels[s.j], q = s.Q[s.i][s.j];
        h += '<h4>Distances, with row sums r</h4>' + mat(s.labels, s.D, { r: s.r, hi: [s.i, s.j] });
        h += '<h4>Q table (smallest wins)</h4>' + mat(s.labels, s.Q, { hi: [s.i, s.j] });
        h += '<p><b>Why not just the smallest distance?</b> Q subtracts how far each tip is from everything else, so a fast tip is not punished for its long branch. Q(' + A + ',' + B + ') = (' + s.n + ' − 2) × ' + f(s.d) + ' − ' + f(s.r[s.i]) + ' − ' + f(s.r[s.j]) + ' = <b>' + f(q) + '</b>.';
        if (s.ties > 1) h += s.n === 4 && s.ties === 2 ? ' With four nodes left Q always ties in pairs: joining ' + A + ' with ' + B + ' or the other two gives the same tree, so this tie is harmless.' : ' This is tied with ' + (s.ties - 1) + ' other cell' + (s.ties > 2 ? 's' : '') + '; the first in reading order is taken.';
        h += '</p><p><b>Branches:</b> ' + A + ' gets ' + f(s.d) + '/2 + (' + f(s.r[s.i]) + ' − ' + f(s.r[s.j]) + ') / (2 × ' + (s.n - 2) + ') = ' + f(s.li) + ', and ' + B + ' gets the rest, ' + f(s.lj) + '. Unlike UPGMA, the two may differ.' + (s.li < 0 || s.lj < 0 ? ' A negative length has no meaning; it is drawn as zero.' : '') + '</p>';
        h += '<p><b>New row:</b> add the two old distances, take away the distance between the joined pair, and halve.</p><ul class="s12-calc">' + s.calc.map(function (c) { return '<li>' + A + B + ' to ' + c.k + ' = (' + f(c.di) + ' + ' + f(c.dj) + ' − ' + f(s.d) + ') / 2 = <b>' + f(c.v) + '</b></li>'; }).join('') + '</ul>';
      }
    }
    h += '</div><div><h4>The tree so far</h4><div id="s12-tree"></div></div></div>';
    box.innerHTML = h;
    var tree = $('s12-tree');
    if (i === n) { var t = njTree(); drawTree(tree, rootOnE(t.T, t.bl), { w: 300, bar: true, label: 'Neighbour joining tree', branch: function (k) { return f(k.len, 2); } }); }
    else {
      var nodes = i === 0 ? TIPS.map(function (x, q) { return nLeaf(q, 0); }) : st.nj.steps[i - 1].after;
      drawTree(tree, nodes, { forest: true, w: 300, label: 'Neighbour joining groups after step ' + i, branch: function (k) { return f(k.len, 2); } });
    }
  }
  function colBar() {
    return '<div class="s12-btns"><button type="button" class="btn" data-colstep="-1">◀ column</button><button type="button" class="btn" data-colstep="1">column ▶</button><span class="s12-tag">column ' + (st.col + 1) + ' of ' + NC + ': ' + st.cols[st.col].map(function (b, i) { return TIPS[i] + '=' + BASES[b]; }).join(' ') + '</span></div>';
  }
  function setName(s) { var o = [], i; for (i = 0; i < 4; i++) if (s & (1 << i)) o.push(BASES[i]); return '{' + o.join(',') + '}'; }
  function perCol(vals, d) {
    var h = '<div class="s12-strip">';
    vals.forEach(function (v, j) { h += '<button type="button" data-col="' + j + '" class="' + (j === st.col ? 's12-sel' : '') + '" aria-label="Select column ' + (j + 1) + '">' + (d ? f(v, d) : v) + '</button>'; });
    return h + '</div>';
  }
  function renderPars() {
    var box = $('s12-panel'), ti = st.pSel, T = TREES[ti], root = rootOnE(T, UNIT), trace = new Map();
    var r = fitchNode(root, st.cols[st.col], trace);
    var order = TREES.map(function (t, i) { return i; }).sort(function (a, b) { return st.pscore[a] - st.pscore[b]; });
    var min = st.pscore[order[0]], max = st.pscore[order[14]];
    var h = '<p>' + tip('Fitch counting', 'Work from the tips towards the root. At each node, if the two sets below share a base, keep only the shared bases. If not, keep all of them and add one step.') + ' for one column on one tree. Choose a tree from the list and a column with the buttons; red nodes are where a step is added.</p>' + colBar() + '<div class="s12-two"><div><div id="s12-tree"></div>';
    var lines = [], num = 0;
    eachNode(root, function (n) { var t = trace.get(n); if (n.kids) lines.unshift('<li>' + (n.tips.length === 5 ? 'root' : n.tips.map(function (q) { return TIPS[q]; }).join('')) + ': ' + setName(t.l) + ' and ' + setName(t.r) + (t.step ? ' share nothing, so union ' + setName(t.set) + ', <b>+1 step</b>' : ' share ' + setName(t.set)) + '</li>'); });
    h += '<ul class="s12-calc">' + lines.join('') + '</ul><p><b>This column needs ' + r.steps + ' step' + (r.steps === 1 ? '' : 's') + ' on this tree.</b></p>';
    var cs = st.P.idx.map(function (p) { return st.steps[ti][p]; });
    h += '<h4>Steps in each column (total ' + st.pscore[ti] + ')</h4>' + perCol(cs) + '</div><div><h4>All 15 trees, fewest steps first</h4>' + order.map(function (i) {
      return '<button type="button" class="s12-trow' + (i === ti ? ' s12-pick' : '') + '" data-tree="' + i + '"><span>' + newick(TREES[i]) + '</span><span class="s12-bar"><i style="width:' + (max > min ? 100 * (max - st.pscore[i]) / (max - min) * 0.8 + 20 : 100).toFixed(0) + '%"' + (st.pscore[i] === min ? ' class="s12-ref"' : '') + '></i></span><b>' + st.pscore[i] + '</b></button>';
    }).join('') + '</div></div>';
    box.innerHTML = h;
    drawTree($('s12-tree'), root, { clado: true, w: 340, row: 30, padR: 24, label: 'Fitch sets on the chosen tree', node: function (n) { if (!n.kids) return null; var t = trace.get(n); return { text: setName(t.set), bad: !!t.step, right: true }; } });
  }
  function renderMl() {
    var box = $('s12-panel'), m = st.ml[st.mSel], root = rootOnE(m.T, m.bl), parts = new Map(), col = st.cols[st.col];
    var v = pruneNode(root, col, parts), L = (v[0] + v[1] + v[2] + v[3]) / 4, names = new Map(), c = 0;
    eachNode(root, function (n) { if (n.kids) names.set(n, n.tips.length === 5 ? 'root' : 'n' + (++c)); });
    var h = '<p>' + tip('Felsenstein pruning', 'For each node, compute the probability of everything seen below it, for each of the four bases the node might have had. Work from the tips to the root, so nothing is computed twice.') + ' for one column on one tree. Branch lengths were first fitted to give this tree its highest likelihood. Each row of the table is one node: if this node had been A, C, G or T, how probable is what we see below it?</p>' + colBar() + '<div class="s12-two"><div><div id="s12-tree"></div>';
    h += '<div class="s12-mx"><table class="s12-m"><tr><th>node</th><th>below</th><th>A</th><th>C</th><th>G</th><th>T</th></tr>';
    var rows = [];
    eachNode(root, function (n) { if (n.kids) { var p = parts.get(n); rows.unshift('<tr><th>' + names.get(n) + '</th><td>' + n.tips.map(function (q) { return TIPS[q]; }).join('') + '</td>' + p.map(function (x) { return '<td>' + sci(x) + '</td>'; }).join('') + '</tr>'); } });
    h += rows.join('') + '</table></div>';
    h += '<p>Over one branch of length t, a base stays the same with probability ¼ + ¾e<sup>−4t/3</sup> and turns into each other base with ¼ − ¼e<sup>−4t/3</sup>. A node multiplies what comes up its two branches.</p>';
    h += '<p><b>Column ' + (st.col + 1) + ':</b> each base is ¼ likely at the root, so L = ¼ × (' + v.map(sci).join(' + ') + ') = ' + sci(L) + ', and ln L = <b>' + f(Math.log(L)) + '</b>.</p>';
    h += '<h4>ln L of each column (they add up to ' + f(m.lnL, 2) + ')</h4>' + perCol(m.site, 1) + '</div><div><h4>All 15 trees, best first</h4>' + st.mlOrder.map(function (o) {
      var d = st.best.lnL - o.lnL, w = Math.max(4, 100 - 12 * d);
      return '<button type="button" class="s12-trow' + (o.ti === st.mSel ? ' s12-pick' : '') + '" data-tree="' + o.ti + '"><span>' + newick(o.T) + '</span><span class="s12-bar"><i style="width:' + w.toFixed(0) + '%"' + (d < 1e-6 ? ' class="s12-ref"' : '') + '></i></span><b>' + f(o.lnL, 2) + '</b></button>';
    }).join('') + '</div></div>';
    box.innerHTML = h;
    drawTree($('s12-tree'), root, { w: 340, row: 32, padL: 34, bar: true, label: 'Chosen tree with fitted branch lengths', branch: function (k) { return f(k.len, 2); }, node: function (n) { return n.kids ? { text: names.get(n) } : null; } });
  }

  // ---- Bayesian
  function chain() {
    if (!st.chain) { var r = rng(4242 + 1009 * st.chainNo); st.chain = { r: r, S: mcmcInit(st.P, Math.floor(r() * 15), r), visits: [], trace: [], last: null }; }
    return st.chain;
  }
  function chainRun(n) {
    var c = chain(), i;
    for (i = 0; i < n; i++) {
      c.last = mcmcStep(st.P, c.S, c.r);
      c.visits.push(TREE_INDEX[treeKey(c.S.T)]); c.trace.push(c.S.lnL);
    }
  }
  function chainCounts() {
    var c = st.chain, cnt = new Array(15).fill(0), b = c ? Math.floor(c.visits.length / 10) : 0, i;
    if (c) for (i = b; i < c.visits.length; i++) cnt[c.visits[i]]++;
    return { cnt: cnt, n: c ? c.visits.length - b : 0, burn: b };
  }
  function splitPosterior() {
    var cc = chainCounts(), o = {};
    allSplits().forEach(function (s) { o[s] = 0; });
    cc.cnt.forEach(function (v, i) { splitsOf(TREES[i]).forEach(function (s) { o[s] += v; }); });
    return { split: o, n: cc.n };
  }
  function renderBayes() {
    var box = $('s12-panel'), c = st.chain, cc = chainCounts();
    var h = '<p>The ' + tip('MCMC chain', 'A random walk through trees and branch lengths, built so that the time spent at each tree equals its posterior probability.') + ' starts at a random place. Each step proposes a small change: stretch one branch, or swap two neighbours on the tree. It always accepts a better place and sometimes a worse one. Prior: all 15 trees equally likely, each branch length exponential with mean 0.1.</p>';
    h += '<div class="s12-btns"><button type="button" class="btn" data-mc="1">1 step</button><button type="button" class="btn" data-mc="100">100 steps</button><button type="button" class="btn" data-mc="10000">10,000 steps</button><button type="button" class="btn" data-mc="0">Start over</button><span class="s12-tag">' + (c ? c.visits.length.toLocaleString('en-US') + ' steps, ' + (100 * c.S.acc / c.S.gen).toFixed(0) + ' % accepted' : 'not started') + '</span></div>';
    if (c && c.last) {
      var l = c.last;
      h += '<div class="s12-step"><b>Last step.</b> ' + (l.kind === 'tree' ? 'Proposed swap: ' + newick(l.from) + ' to ' + newick(l.to) : 'Proposed stretching one branch by × ' + f(l.what.m, 2)) + '.<br>Log of the acceptance ratio = change in ln L (' + f(l.dL, 2) + ') + change in ln prior (' + f(l.dP, 2) + ') + ' + tip('proposal correction', 'Stretching and shrinking a length are not equally likely to be proposed, so the ratio is corrected by the log of the stretch factor. Tree swaps need no correction.') + ' (' + f(l.lnH, 2) + ') = <b>' + f(l.lnR, 2) + '</b>.<br>Random number u = ' + f(l.u) + ', ln u = ' + f(Math.log(l.u), 2) + (l.ok ? '. ln u is smaller, so the move is <b>accepted</b>.' : '. ln u is larger, so the move is <b>rejected</b> and the chain stays put; this tree is counted again.') + '</div>';
    }
    h += '<div class="s12-two"><div><h4>ln L along the chain</h4><div class="svgbox" id="s12-trace"></div></div><div><h4>Share of steps at each tree</h4><div id="s12-post"></div><p class="s12-tag">' + (cc.n ? 'First 10 % of steps thrown away as ' + tip('burn-in', 'The early part of the run, before the chain has reached good trees.') + '. Share of a tree = its estimated posterior probability.' : 'Run the chain to see the bars.') + '</p></div></div>';
    box.innerHTML = h;
    var ord = cc.cnt.map(function (v, i) { return i; }).sort(function (a, b) { return cc.cnt[b] - cc.cnt[a]; }).slice(0, 6).filter(function (i) { return cc.cnt[i] > 0; });
    $('s12-post').innerHTML = bars(ord.map(function (i) { return { name: newick(TREES[i]), v: cc.cnt[i] / cc.n, text: pct(cc.cnt[i], cc.n), on: i === ord[0] }; }));
    var tb = $('s12-trace'), W = 340, H = 120, svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'ln L through the run', style: 'max-width:440px;display:block' }, tb);
    if (c && c.trace.length > 1) {
      var t = c.trace, stp = Math.max(1, Math.floor(t.length / 340)), pts = [], i, lo = Infinity, up = -Infinity;
      for (i = 0; i < t.length; i++) { if (t[i] < lo) lo = t[i]; if (t[i] > up) up = t[i]; }
      for (i = 0; i < t.length; i += stp) pts.push((6 + (W - 12) * i / (t.length - 1)).toFixed(1) + ',' + (8 + (H - 26) * (up - t[i]) / Math.max(up - lo, 1e-9)).toFixed(1));
      el('polyline', { points: pts.join(' '), style: 'fill:none;stroke:var(--accent);stroke-width:1' }, svg);
      var bx = 6 + (W - 12) * 0.1;
      el('line', { x1: bx, x2: bx, y1: 4, y2: H - 16, style: 'stroke:var(--het);stroke-dasharray:3 3' }, svg);
      el('text', { x: 6, y: H - 4 }, svg, 'ln L from ' + f(lo, 1) + ' to ' + f(up, 1));
    } else el('text', { x: 6, y: 20 }, svg, 'no steps yet');
  }

  // ---- Support
  function batch(total, chunk, one, draw, done) {
    if (st.busy) return;
    st.busy = true;
    var left = total, id = st.run;
    (function go() {
      if (id !== st.run) return;
      var n = Math.min(chunk, left), i;
      for (i = 0; i < n; i++) one();
      left -= n;
      draw(total - left, total);
      if (left > 0) setTimeout(go, 0);
      else { st.busy = false; draw(total, total); if (done) done(); }
    })();
  }
  function bootRec(m) { return st.boot[m] || (st.boot[m] = { n: 0, cr: {}, last: null }); }
  function bootOne(m) {
    var b = bootRec(m), w = resample(NC, st.rnd), win = replicate(m, ctx(), w, st.rnd);
    b.n++;
    win.forEach(function (ti) { splitsOf(TREES[ti]).forEach(function (s) { b.cr[s] = (b.cr[s] || 0) + 1 / win.length; }); });
    b.last = { w: w, win: win };
  }
  function bootDraw(m, n, done) {
    batch(n, m === 'ml' ? 10 : 100, function () { bootOne(m); }, function () { if (st.stab === 'boot' && st.bm === m) renderSupport(); else if (st.stab === 'all') renderSupport(); }, done);
  }
  function supportTabs() {
    Array.prototype.forEach.call($('s12-stabs').children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.s === st.stab)); });
  }
  function renderSupport() {
    supportTabs();
    ({ boot: renderBoot, sh: renderSh, pp: renderPp, tt: renderTests, all: renderAll })[st.stab]();
  }
  function renderBoot() {
    var box = $('s12-spanel'), m = st.bm, b = bootRec(m), ref = refTree(m), h, i, j;
    h = '<div class="seg" id="s12-mseg">' + Object.keys(METHODS).map(function (k) { return '<button type="button" data-m="' + k + '" aria-pressed="' + (k === m) + '">' + METHODS[k] + '</button>'; }).join('') + '</div>';
    h += '<p class="s12-tag">' + (m === 'rell' ? 'No new tree is built. The column ln L values of all 15 trees were stored; each draw only adds them up again with the new counts, and the highest total wins. This is the shortcut inside UFBoot, which also keeps its candidate trees from the search; here the candidates are simply all 15.' : m === 'ml' ? 'Every draw refits the branch lengths of all 15 trees, the honest and slow way: 1000 draws take about half a minute.' : 'Every draw rebuilds the tree from scratch with this method. Ties are split equally, or broken at random for UPGMA and NJ.') + '</p>';
    h += '<div class="s12-btns"><button type="button" class="btn" data-bt="1">Draw 1</button><button type="button" class="btn" data-bt="100">Draw 100</button><button type="button" class="btn" data-bt="1000">Draw 1000</button><button type="button" class="btn" data-bt="0">Start over</button><span class="s12-tag">' + b.n.toLocaleString('en-US') + ' draws' + (st.busy ? ', working…' : '') + '</span></div>';
    if (b.last) {
      var w = b.last.w, res = TIPS.map(function () { return ''; }), absent = w.filter(function (x) { return x === 0; }).length;
      for (j = 0; j < NC; j++) for (var k = 0; k < w[j]; k++) for (i = 0; i < NT; i++) res[i] += st.aln[i].charAt(j);
      h += '<h4>The last draw: times each column was picked</h4>' + perCol(w) + '<p class="s12-tag">' + NC + ' picks with replacement; ' + absent + ' columns were never picked.</p><div class="toy">' + res.map(function (r, q) { return TIPS[q] + '  ' + r; }).join('\n') + '</div>';
    }
    h += '<div class="s12-two"><div>' + (b.last ? '<h4>Its tree</h4><div id="s12-rep"></div>' : '') + '<h4>Tree from the real alignment, with support</h4><div id="s12-ref"></div></div><div><h4>Share of draws containing each split</h4><div id="s12-tally"></div></div></div>';
    box.innerHTML = h;
    if (b.last) drawTree($('s12-rep'), rootOnE(TREES[b.last.win[0]], UNIT), { clado: true, w: 240, row: 20, label: 'tree of the last draw' });
    var seen = {};
    drawTree($('s12-ref'), ref.root, {
      w: 300, clado: ref.clado, bar: ref.bar, label: 'reference tree with support',
      node: function (n) {
        if (!n.kids || !b.n) return null;
        var s = nodeSplit(n);
        if (!s || seen[s]) return null;
        seen[s] = 1;
        return { text: (100 * (b.cr[s] || 0) / b.n).toFixed(0) };
      }
    });
    var list = allSplits().sort(function (x, y) { return (b.cr[y] || 0) - (b.cr[x] || 0); }).slice(0, 6);
    $('s12-tally').innerHTML = b.n ? bars(list.map(function (s) { return { name: splitLabel(s), v: (b.cr[s] || 0) / b.n, text: (100 * (b.cr[s] || 0) / b.n).toFixed(1) + ' %', on: ref.keys.indexOf(s) >= 0 }; })) : '<p class="s12-tag">No draws yet.</p>';
  }
  function shRec(side) {
    if (!st.sh[side]) st.sh[side] = { S: shSetup(st.P, st.best, side), n: 0, c: 0, gaps: [], last: null };
    return st.sh[side];
  }
  function shOne(side) {
    var R = shRec(side), w = resample(NC, st.rnd), o = shReplicate(R.S, w);
    R.n++; if (o.pass) R.c++; R.gaps.push(o.gap); R.last = o; R.w = w;
  }
  function renderSh() {
    var box = $('s12-spanel'), R = shRec(st.side), S = R.S, h, a = S.alts;
    var names = [newick(st.best.T), newick(a[0].T), newick(a[1].T)];
    h = '<p>SH-aLRT tests one inner branch of the ML tree. It compares that tree with the two ' + tip('nearest-neighbour rearrangements', 'The two other ways of joining the four groups that meet around this branch.') + ' of the branch, with the branch and its four neighbours fitted again.</p>';
    h += '<div class="seg" id="s12-sseg">' + [0, 1].map(function (s) { return '<button type="button" data-side="' + s + '" aria-pressed="' + (s === st.side) + '">' + splitLabel(pn(s)) + '</button>'; }).join('') + '</div>';
    h += '<div class="s12-mx"><table class="s12-m"><tr><th></th><th>tree</th><th>ln L</th><th>behind best</th></tr>' + names.map(function (n, i) { return '<tr><th>' + (i === 0 ? 'best' : 'rival ' + i) + '</th><td>' + n + '</td><td>' + f(S.lh[i], 2) + '</td><td>' + f(S.lh[0] - S.lh[i], 2) + '</td></tr>'; }).join('') + '</table></div>';
    h += '<p><b>The observed lead</b> is ' + f(S.aLRT) + ' ln L units: best minus the better rival. (The test statistic aLRT is twice this.) The bars show which columns give that lead: up favours the best tree, down favours the rival.</p><div class="svgbox" id="s12-votes"></div>';
    h += '<p><b>The question:</b> how big a lead could arise by chance if the three trees were really equal? So resample the columns, add up each tree\'s stored column values, and subtract each tree\'s real total. That ' + tip('centring', 'Subtracting the real totals puts all three trees on an equal start, so what remains is only the wobble caused by resampling.') + ' removes any real lead. Then take the gap between the top two. The draw counts for the branch when the real lead beats that chance gap by more than 0.05.</p>';
    h += '<div class="s12-btns"><button type="button" class="btn" data-sh="1">Draw 1</button><button type="button" class="btn" data-sh="1000">Draw 1000</button><span class="s12-tag">' + R.n.toLocaleString('en-US') + ' draws</span></div>';
    if (R.last) {
      var l = R.last;
      h += '<div class="s12-step"><b>Last draw.</b> Change from the real total: best ' + f(l.cs[0], 2) + ', rival 1 ' + f(l.cs[1], 2) + ', rival 2 ' + f(l.cs[2], 2) + '. Gap between the top two = ' + f(l.gap, 2) + '. Is ' + f(S.aLRT, 2) + ' more than ' + f(l.gap, 2) + ' + 0.05? <b>' + (l.pass ? 'Yes, it counts.' : 'No.') + '</b></div>';
    }
    h += '<div class="readout"><div>SH-aLRT support<b>' + pct(R.c, R.n) + '</b></div><div>Draws that counted<b>' + R.c + ' of ' + R.n + '</b></div></div><div class="svgbox" id="s12-hist"></div>';
    box.innerHTML = h;
    var W = 340, H = 90, svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'ln L difference between best tree and rival for each column', style: 'max-width:520px;display:block' }, $('s12-votes'));
    var d = S.site[0].map(function (v, j) { return v - S.site[1][j]; }), mx = Math.max.apply(null, d.map(Math.abs).concat([1e-9])), bw = W / NC;
    el('line', { x1: 0, x2: W, y1: 42, y2: 42, class: 'ax' }, svg);
    d.forEach(function (v, j) {
      var hh = 36 * Math.abs(v) / mx;
      el('rect', { x: j * bw + 2, width: bw - 4, y: v >= 0 ? 42 - hh : 42, height: Math.max(hh, 0.5), style: 'fill:' + (v >= 0 ? 'var(--good)' : 'var(--bad)') }, svg);
      el('text', { x: j * bw + bw / 2, y: 88, 'text-anchor': 'middle', style: 'font-size:8.5px' }, svg, String(j + 1));
    });
    if (R.gaps.length) {
      var hs = el('svg', { viewBox: '0 0 ' + W + ' 80', width: '100%', role: 'img', 'aria-label': 'chance gaps compared with the observed lead', style: 'max-width:520px;display:block' }, $('s12-hist'));
      var top = Math.max(Math.max.apply(null, R.gaps), S.aLRT, 0.5) * 1.05, nb = 24, cnt = new Array(nb).fill(0);
      R.gaps.forEach(function (g) { cnt[Math.min(nb - 1, Math.floor(nb * g / top))]++; });
      var cm = Math.max.apply(null, cnt), w2 = (W - 12) / nb;
      cnt.forEach(function (c, i) { var hh = 54 * c / cm; el('rect', { x: 6 + i * w2 + 1, width: w2 - 2, y: 60 - hh, height: hh, style: 'fill:var(--accent);opacity:.55' }, hs); });
      var x = 6 + (W - 12) * S.aLRT / top;
      el('line', { x1: x, x2: x, y1: 2, y2: 62, style: 'stroke:var(--bad);stroke-width:2' }, hs);
      el('text', { x: 6, y: 76, style: 'font-size:9.5px' }, hs, 'bars: gaps from chance alone; red line: the real lead');
    }
  }
  function pn(s) { var p = st.best.T.p[s]; return TIPS[p[0]] + TIPS[p[1]]; }
  function renderPp() {
    var box = $('s12-spanel'), sp = splitPosterior(), h;
    h = '<p>A posterior probability needs no resampling. It is a count from the chain in the Bayesian tab: the share of kept steps whose tree contains the split, which is the same as adding up the shares of all trees that contain it. Unlike the bootstrap, it is a statement about belief: the probability that the split is true, given these data, this model and this prior.</p>';
    h += '<div class="s12-btns"><button type="button" class="btn" data-pp="10000">Run 10,000 more steps</button><span class="s12-tag">' + (st.chain ? st.chain.visits.length.toLocaleString('en-US') : 0) + ' steps in the chain</span></div><div id="s12-pbars"></div>';
    box.innerHTML = h;
    var list = allSplits().sort(function (a, b) { return sp.split[b] - sp.split[a]; }).slice(0, 6), ml = splitsOf(st.best.T);
    $('s12-pbars').innerHTML = sp.n ? bars(list.map(function (s) { return { name: splitLabel(s), v: sp.split[s] / sp.n, text: pct(sp.split[s], sp.n), on: ml.indexOf(s) >= 0 }; })) : '<p class="s12-tag">No steps yet.</p>';
  }
  function renderTests() {
    var box = $('s12-spanel'), R = 2000, res, order = st.mlOrder, h;
    h = '<p>The numbers so far judge one branch. These tests judge a whole tree: is another tree significantly worse than the best one? Each draws columns again from the stored per-column ln L of all 15 trees, as with RELL.</p>';
    h += '<ul><li><b>KH</b> compares a tree with the best tree (the best tree itself with the second best). Each tree\'s resampled total is first shifted so that its mean is 0, which gives the spread expected if the two trees fitted equally well. The p-value is the share of draws in which the gap is larger than the gap seen in the real data.</li>';
    h += '<li><b>SH</b> does the same, but compares with the largest of all the trees in each draw, so that testing many trees at once is allowed for.</li>';
    h += '<li><b>AU</b> counts how often each tree is best when the draws have 50 to 140 % as many columns as the data, and fits a line through these counts to reduce the bias of the plain count. This toy leaves out IQ-TREE\'s final refit, so its p-AU can differ a little, and more for the best tree, which is never rejected anyway.</li></ul>';
    h += '<div class="s12-btns"><button type="button" class="btn" data-tt="1">Run the tests (' + R.toLocaleString('en-US') + ' draws for KH and SH, and for each of the 10 sizes in AU)</button></div>';
    if (st.tt) {
      res = st.tt;
      function cell(p) { return p.toFixed(3) + (p < 0.05 ? ' −' : ''); }
      h += '<div class="s12-mx"><table class="s12-m s12-wide"><tr><th>tree</th><th>ln L behind best</th><th>best in draws</th><th>p-KH</th><th>p-SH</th><th>p-AU</th></tr>' + order.map(function (m) {
        var r = res[m.ti]; return '<tr><td>' + treeKey(TREES[m.ti]) + '</td><td>' + f(r.delta, 2) + '</td><td>' + f(r.bp, 3) + '</td><td>' + cell(r.kh) + '</td><td>' + cell(r.sh) + '</td><td>' + cell(r.au) + '</td></tr>';
      }).join('') + '</table></div>';
      var nk = 0, ns = 0, na = 0; res.forEach(function (r) { if (r.kh < 0.05) nk++; if (r.sh < 0.05) ns++; if (r.au < 0.05) na++; });
      h += '<p class="tool-note">A minus sign marks p below 0.05: that tree is rejected. Rejected here: KH ' + nk + ', SH ' + ns + ', AU ' + na + ' of 15. KH has no correction for testing 15 trees at once, and the best tree was chosen from the same data, so its p-values are too small here. With 20 columns all three are rough.</p>';
    }
    box.innerHTML = h;
  }
  function renderAll() {
    var box = $('s12-spanel'), ks = [pn(0), pn(1)], sp = splitPosterior(), h;
    var cols = Object.keys(METHODS).map(function (m) { var b = st.boot[m]; return { name: 'Bootstrap, ' + METHODS[m], v: function (s) { return b && b.n ? (100 * (b.cr[s] || 0) / b.n).toFixed(0) + ' %' : '–'; }, n: b ? b.n : 0 }; });
    cols.push({ name: 'SH-aLRT', v: function (s) { var q = ks.indexOf(s), R = st.sh[q]; return R && R.n ? (100 * R.c / R.n).toFixed(0) + ' %' : '–'; }, n: st.sh[0] ? st.sh[0].n : 0, n2: st.sh[1] ? st.sh[1].n : 0 });
    cols.push({ name: 'Posterior probability', v: function (s) { return sp.n ? (100 * sp.split[s] / sp.n).toFixed(0) + ' %' : '–'; }, n: sp.n });
    h = '<p>The two inner branches of the ML tree, with every kind of support. They are not the same kind of number, so do not expect them to agree: a bootstrap value says how often the answer came back, SH-aLRT whether the lead beats chance, and a posterior probability how much to believe the split under the model and prior.</p>';
    h += '<div class="s12-btns"><button type="button" class="btn" data-fill="1">Fill the table</button><span class="s12-tag" id="s12-fillmsg">' + (st.busy ? 'working…' : '1,000 draws per method, 50,000 chain steps; takes about a minute') + '</span></div>';
    h += '<div class="s12-mx"><table class="s12-m s12-wide"><tr><th>kind of support</th>' + ks.map(function (s) { return '<th>' + splitLabel(s) + '</th>'; }).join('') + '<th>based on</th></tr>' + cols.map(function (c) { return '<tr><td>' + c.name + '</td>' + ks.map(function (s) { return '<td>' + c.v(s) + '</td>'; }).join('') + '<td>' + c.n.toLocaleString('en-US') + (c.n2 !== undefined && c.n2 !== c.n ? ' and ' + c.n2.toLocaleString('en-US') : '') + '</td></tr>'; }).join('') + '</table></div>';
    box.innerHTML = h;
  }
  function fillAll() {
    var todo = Object.keys(METHODS).filter(function (m) { return bootRec(m).n < 1000; });
    (function next() {
      if (todo.length) {
        var m = todo.shift();
        bootDraw(m, 1000 - st.boot[m].n, next);
        return;
      }
      var sides = [0, 1].filter(function (s) { return shRec(s).n < 1000; });
      (function nextS() {
        if (sides.length) {
          var s = sides.shift();
          batch(1000 - st.sh[s].n, 200, function () { shOne(s); }, renderSupport, nextS);
          return;
        }
        var need = 50000 - (st.chain ? st.chain.visits.length : 0);
        if (need > 0) batch(need, 5000, function () { chainRun(1); }, renderSupport, function () { if (st.tab === 'bayes') renderBayes(); });
      })();
    })();
  }

  // ---- Wiring
  function click(id, fn) { $(id).addEventListener('click', function (e) { var t = e.target.closest('button'); if (t) fn(t, e); }); }
  function init() {
    var pb = $('s12-presets');
    PRESETS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button'; b.dataset.p = p.id; b.textContent = p.name;
      pb.appendChild(b);
    });
    click('s12-presets', function (t) { load(PRESETS.filter(function (p) { return p.id === t.dataset.p; })[0]); });
    click('s12-aln', function (t) {
      if (t.dataset.col !== undefined) { pickCol(+t.dataset.col); return; }
      var i = +t.dataset.i, j = +t.dataset.j, s = st.aln[i], nb = BASES.charAt((BASES.indexOf(s.charAt(j)) + 1) % 4);
      st.aln[i] = s.slice(0, j) + nb + s.slice(j + 1);
      st.col = j; st.edited = true;
      Array.prototype.forEach.call(pb.children, function (b) { b.setAttribute('aria-pressed', 'false'); });
      $('s12-note').textContent = 'Edited alignment.';
      refresh();
    });
    click('s12-tabs', function (t) { st.tab = t.dataset.t; renderTab(); });
    click('s12-panel', function (t) {
      var d = t.dataset;
      if (d.step !== undefined) {
        var key = st.tab === 'upgma' ? 'upStep' : 'njStep', n = (st.tab === 'upgma' ? st.up : st.nj).steps.length;
        st[key] = Math.max(0, Math.min(n, st[key] + (+d.step)));
        renderTab();
      } else if (d.d) { st.dist = d.d; refresh(); }
      else if (d.colstep !== undefined) pickCol((st.col + (+d.colstep) + NC) % NC);
      else if (d.col !== undefined) pickCol(+d.col);
      else if (d.tree !== undefined) { if (st.tab === 'pars') st.pSel = +d.tree; else st.mSel = +d.tree; renderTab(); }
      else if (d.mc !== undefined) {
        if (+d.mc === 0) { st.chain = null; st.chainNo++; } else chainRun(+d.mc);
        renderBayes();
      }
    });
    click('s12-stabs', function (t) { st.stab = t.dataset.s; renderSupport(); });
    click('s12-spanel', function (t) {
      var d = t.dataset;
      if (d.m) { st.bm = d.m; renderSupport(); }
      else if (d.bt !== undefined) {
        if (+d.bt === 0) { st.boot[st.bm] = null; renderSupport(); } else bootDraw(st.bm, +d.bt);
      } else if (d.side !== undefined) { st.side = +d.side; renderSupport(); }
      else if (d.sh !== undefined) { var s = st.side; batch(+d.sh, 200, function () { shOne(s); }, renderSupport); }
      else if (d.pp !== undefined) { chainRun(+d.pp); renderSupport(); }
      else if (d.fill !== undefined) fillAll();
      else if (d.tt !== undefined) { st.tt = treeTests(st.ml.map(function (m) { return m.site; }), 2000, rng(31)); renderSupport(); }
      else if (d.col !== undefined) pickCol(+d.col);
    });
    load(PRESETS[0]);
  }
  init();
})();
