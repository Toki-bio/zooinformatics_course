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
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function n2(x) { var r = Math.round(x * 100) / 100; if (Object.is(r, -0)) r = 0; return String(r); }

  // =====================================================================
  // Trees. A node is {name, kids (null for a tip), len (branch above it),
  // tips (names below it), label}. The toy and the check use these same
  // functions.
  // =====================================================================
  function leaf(name) { return { name: name, kids: null, len: 0, tips: [name], label: name }; }
  function join(kids, lens) {
    var tips = [], i;
    for (i = 0; i < kids.length; i++) { if (lens) kids[i].len = lens[i]; tips = tips.concat(kids[i].tips); }
    tips.sort();
    return { name: '', kids: kids, len: 0, tips: tips, label: tips.join('') };
  }
  var idc = 0;
  function link(node, parent, depth) {
    node._p = parent; node._d = depth; node._id = ++idc;
    if (node.kids) for (var i = 0; i < node.kids.length; i++) link(node.kids[i], node, depth + node.kids[i].len);
  }
  function leaves(node, out) {
    out = out || [];
    if (!node.kids) out.push(node); else for (var i = 0; i < node.kids.length; i++) leaves(node.kids[i], out);
    return out;
  }
  function maxDepth(node, d) {
    d = d || 0;
    if (!node.kids) return d;
    var m = d;
    for (var i = 0; i < node.kids.length; i++) m = Math.max(m, maxDepth(node.kids[i], d + node.kids[i].len));
    return m;
  }
  // Distances between tips along the tree (the "patristic" distances).
  function treeDist(root, names) {
    link(root, null, 0);
    var by = {}; leaves(root).forEach(function (l) { by[l.name] = l; });
    var n = names.length, M = [], i, j;
    for (i = 0; i < n; i++) { M.push([]); for (j = 0; j < n; j++) {
      var a = by[names[i]], b = by[names[j]], anc = {}, x = a;
      while (x) { anc[x._id] = x; x = x._p; }
      x = b; while (x && !anc[x._id]) x = x._p;
      M[i].push(a._d + b._d - 2 * x._d);
    } }
    return M;
  }
  // The groupings of an unrooted tree: each branch cuts the tips into two sets;
  // the set without the first tip, as text. Branches that cut off one tip are skipped.
  function splitKey(node, all) {
    var side = node.tips;
    if (side.length === 1 || side.length === all.length - 1 || side.length === all.length) return null;
    if (side.indexOf(all[0]) >= 0) side = all.filter(function (t) { return side.indexOf(t) < 0; });
    return side.slice().sort().join(',');
  }
  function splitSet(root, all) {
    var s = {};
    (function w(n) { if (n !== root) { var k = splitKey(n, all); if (k) s[k] = 1; } if (n.kids) n.kids.forEach(w); })(root);
    return s;
  }
  function sameSplits(a, b) {
    var ka = Object.keys(a).sort().join('|'), kb = Object.keys(b).sort().join('|');
    return ka === kb;
  }
  function newick(node, top) {
    var s = node.kids ? '(' + node.kids.map(function (k) { return newick(k, false); }).join(',') + ')' : node.name;
    return top ? s + ';' : s + ':' + node.len.toFixed(6);
  }

  // =====================================================================
  // UPGMA: join the smallest distance, node height = d/2, new distance =
  // average over all tip pairs (size-weighted mean of the two old rows).
  // =====================================================================
  function copyM(M) { return M.map(function (r) { return r.slice(); }); }
  function upgma(D, names) {
    var items = names.map(function (n) { return { node: leaf(n), h: 0, size: 1 }; });
    var d = copyM(D), recs = [], start = items.map(function (it) { return it.node; });
    while (items.length > 1) {
      var n = items.length, bi = 0, bj = 1, i, j, k;
      for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) if (d[i][j] < d[bi][bj]) { bi = i; bj = j; }
      var dm = d[bi][bj], h = dm / 2;
      var rec = { labels: items.map(function (it) { return it.node.label; }), D: copyM(d), pair: [bi, bj], dmin: dm, h: h };
      var a = items[bi], b = items[bj];
      var node = join([a.node, b.node], [h - a.h, h - b.h]);
      var row = [];
      for (k = 0; k < n; k++) row.push((a.size * d[bi][k] + b.size * d[bj][k]) / (a.size + b.size));
      var ni = { node: node, h: h, size: a.size + b.size };
      // rebuild: new item takes position bi, position bj is removed
      var nd = [], nitems = [], idx = [];
      for (k = 0; k < n; k++) if (k !== bj) idx.push(k);
      idx.forEach(function (p) { nitems.push(p === bi ? ni : items[p]); });
      idx.forEach(function (p) { nd.push(idx.map(function (q) {
        if (p === bi && q === bi) return 0;
        if (p === bi) return row[q];
        if (q === bi) return row[p];
        return d[p][q];
      })); });
      items = nitems; d = nd;
      rec.forest = items.map(function (it) { return it.node; });
      recs.push(rec);
    }
    return { recs: recs, start: start, tree: items[0].node };
  }

  // =====================================================================
  // Neighbour joining, written from the formulas in the scikit-bio code
  // (Q = (n-2)d - r_i - r_j; L_i = d/2 + (r_i - r_j)/(2(n-2));
  // d(new,k) = (d_ik + d_jk - d_ij)/2; at n = 3 the last three branches
  // are (d_ab + d_ac - d_bc)/2 and so on).
  // =====================================================================
  function nj(D, names) {
    var items = names.map(function (n) { return leaf(n); });
    var d = copyM(D), recs = [], start = items.slice();
    while (items.length > 3) {
      var n = items.length, i, j, k, r = [], Q = [];
      for (i = 0; i < n; i++) { var s = 0; for (j = 0; j < n; j++) s += d[i][j]; r.push(s); }
      var bi = 0, bj = 1;
      for (i = 0; i < n; i++) { Q.push([]); for (j = 0; j < n; j++) Q[i].push(i === j ? 0 : (n - 2) * d[i][j] - r[i] - r[j]); }
      for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) if (Q[i][j] < Q[bi][bj]) { bi = i; bj = j; }
      var Li = d[bi][bj] / 2 + (r[bi] - r[bj]) / (2 * (n - 2)), Lj = d[bi][bj] - Li;
      var rec = { labels: items.map(function (it) { return it.label; }), D: copyM(d), R: r, Q: Q, pair: [bi, bj], Li: Li, Lj: Lj, n: n };
      var node = join([items[bi], items[bj]], [Li, Lj]);
      var row = [];
      for (k = 0; k < n; k++) row.push((d[bi][k] + d[bj][k] - d[bi][bj]) / 2);
      var idx = [];
      for (k = 0; k < n; k++) if (k !== bj) idx.push(k);
      var nitems = idx.map(function (p) { return p === bi ? node : items[p]; });
      var nd = idx.map(function (p) { return idx.map(function (q) {
        if (p === bi && q === bi) return 0;
        if (p === bi) return row[q];
        if (q === bi) return row[p];
        return d[p][q];
      }); });
      items = nitems; d = nd;
      rec.forest = items.slice();
      recs.push(rec);
    }
    var L0 = (d[0][1] + d[0][2] - d[1][2]) / 2, L1 = (d[0][1] + d[1][2] - d[0][2]) / 2, L2 = (d[0][2] + d[1][2] - d[0][1]) / 2;
    var centre = join([items[0], items[1], items[2]], [L0, L1, L2]);
    recs.push({ labels: items.map(function (it) { return it.label; }), D: copyM(d), final: true, L: [L0, L1, L2], forest: [centre] });
    return { recs: recs, start: start, tree: centre };
  }

  // =====================================================================
  // Random tables for the check (seeded, so the check is repeatable).
  // =====================================================================
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function mkNames(n) { var a = []; for (var i = 1; i <= n; i++) a.push('t' + i); return a; }
  function splitList(list, R) {
    var a = list.slice(), i, t;
    for (i = a.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    var cut = 1 + Math.floor(R() * (a.length - 1));
    return [a.slice(0, cut), a.slice(cut)];
  }
  function randAdditive(list, R) {
    if (list.length === 1) { var l = leaf(list[0]); l.len = 0.2 + 1.8 * R(); return l; }
    var s = splitList(list, R), kids = [randAdditive(s[0], R), randAdditive(s[1], R)];
    var nd = join(kids); nd.len = 0.2 + 1.8 * R(); return nd;
  }
  function randUltra(list, R, h) {
    if (list.length === 1) { var l = leaf(list[0]); return l; }
    var s = splitList(list, R), kids = s.map(function (p) { return p.length === 1 ? 0 : h * (0.25 + 0.6 * R()); });
    var k0 = randUltra(s[0], R, kids[0]), k1 = randUltra(s[1], R, kids[1]);
    return join([k0, k1], [h - kids[0], h - kids[1]]);
  }
  function maxDiff(A, B) { var m = 0; for (var i = 0; i < A.length; i++) for (var j = 0; j < A.length; j++) m = Math.max(m, Math.abs(A[i][j] - B[i][j])); return m; }

  // =====================================================================
  // The toy: five tips. Rooted true tree ((1,2),3),(4,5). All tips are at
  // height 4 from the root when lineage 1 has speed 1.
  // =====================================================================
  var NAMES = ['1', '2', '3', '4', '5'];
  function trueTree(f) {
    var l1 = leaf('1'), l2 = leaf('2'), l3 = leaf('3'), l4 = leaf('4'), l5 = leaf('5');
    var n12 = join([l1, l2], [f, 1]);
    var n123 = join([n12, l3], [1, 2]);
    var n45 = join([l4, l5], [1, 1]);
    return join([n123, n45], [2, 3]);
  }

  var S = { f: 1, v: 0, U: null, N: null, T: null, D: null, truth: null, scale: 1 };
  function compute() {
    S.T = trueTree(S.f);
    S.D = treeDist(S.T, NAMES);
    S.truth = splitSet(S.T, NAMES);
    S.U = upgma(S.D, NAMES);
    S.N = nj(S.D, NAMES);
    var m = maxDepth(S.T);
    [S.U, S.N].forEach(function (R) {
      m = Math.max(m, maxDepth(R.tree));
      R.recs.forEach(function (rc) { rc.forest.forEach(function (nd) { m = Math.max(m, maxDepth(nd)); }); });
    });
    S.scale = 584 / (m || 1);
  }

  // ---- drawing ----
  var W = 640, X0 = 16, ROWH = 22, GAP = 8;
  function drawForest(svg, items, color) {
    clear(svg);
    var cur = 12;
    function place(n, depth) {
      n._x = X0 + depth * S.scale;
      if (!n.kids) { n._y = cur; cur += ROWH; return; }
      var ys = n.kids.map(function (k) { place(k, depth + k.len); return k._y; });
      n._y = (ys[0] + ys[ys.length - 1]) / 2;
    }
    items.forEach(function (it) { place(it, 0); cur += GAP; });
    function col(n) {
      if (!color) return 'var(--fg)';
      var k = splitKey(n, NAMES);
      if (!k) return 'var(--fg)';
      return S.truth[k] ? 'var(--good)' : 'var(--bad)';
    }
    function draw(n, par) {
      if (par) {
        el('line', { x1: par._x, y1: n._y, x2: n._x, y2: n._y, 'stroke-width': 2.2, style: 'stroke:' + col(n) }, svg);
        if (n._x - par._x >= 30) el('text', { x: (n._x + par._x) / 2, y: n._y - 4, 'text-anchor': 'middle', 'font-size': 10, style: 'fill:var(--muted)', 'font-family': 'monospace' }, svg, n2(n.len));
      }
      if (n.kids) {
        el('line', { x1: n._x, y1: n.kids[0]._y, x2: n._x, y2: n.kids[n.kids.length - 1]._y, 'stroke-width': 2.2, style: 'stroke:var(--muted)' }, svg);
        n.kids.forEach(function (k) { draw(k, n); });
      } else {
        el('circle', { cx: n._x, cy: n._y, r: 3.2, style: 'fill:var(--fg)' }, svg);
        el('text', { x: n._x + 8, y: n._y + 4, 'font-size': 12.5, 'font-family': 'monospace', style: 'fill:var(--fg)' }, svg, n.name);
      }
    }
    items.forEach(function (it) { draw(it, null); });
    var by = cur + 4;
    el('line', { x1: X0, y1: by, x2: X0 + S.scale, y2: by, 'stroke-width': 2, style: 'stroke:var(--muted)' }, svg);
    el('text', { x: X0 + S.scale + 6, y: by + 4, 'font-size': 11, 'font-family': 'monospace', style: 'fill:var(--muted)' }, svg, '= 1 unit of change');
    var H = by + 14;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('height', H);
  }

  // ---- tables ----
  function drawTable(tbl, labels, M, hit, plain) {
    clear(tbl);
    var n = labels.length, i, j, tr = el0('tr', tbl), th;
    th = el0('th', tr); th.textContent = '';
    for (j = 0; j < n - 1; j++) { th = el0('th', tr); th.textContent = labels[j]; }
    for (i = 1; i < n; i++) {
      tr = el0('tr', tbl); th = el0('th', tr); th.textContent = labels[i];
      for (j = 0; j < n - 1; j++) {
        var td = el0('td', tr);
        if (j < i) { td.textContent = n2(M[i][j]); if (hit && hit[0] === j && hit[1] === i) td.className = 's04-hit'; }
        else td.className = 's04-na';
      }
    }
  }
  function el0(tag, parent) { var e = document.createElement(tag); parent.appendChild(e); return e; }

  function render() {
    var uR = S.U.recs, nR = S.N.recs, v = S.v;
    // UPGMA
    var ui = Math.min(Math.max(v, 1), uR.length) - 1, ur = uR[ui];
    drawTable($('s04-tabU'), ur.labels, ur.D, v >= 1 ? ur.pair : null);
    drawForest($('s04-svgU'), v === 0 ? S.U.start : ur.forest, true);
    var uDone = v >= uR.length;
    $('s04-txtU').textContent = v === 0
      ? 'Start: five tips. The table shows the distance between every pair. Press Step.'
      : 'Step ' + Math.min(v, uR.length) + '. The smallest distance in this table is ' + n2(ur.dmin) + ', between ' + ur.labels[ur.pair[0]] + ' and ' + ur.labels[ur.pair[1]] + '. They are joined. The new node has height ' + n2(ur.h) + ' (half of ' + n2(ur.dmin) + ').' + (uDone ? ' One cluster is left: this is the root, and the tree is finished.' : '');
    // NJ
    var ni = Math.min(Math.max(v, 1), nR.length) - 1, nr = nR[ni], nDone = v >= nR.length;
    drawTable($('s04-tabN'), nr.labels, nr.D, v >= 1 && !nr.final ? nr.pair : null);
    if (nr.final) { clear($('s04-tabQ')); var tr = el0('tr', $('s04-tabQ')), td = el0('td', tr); td.style.whiteSpace = 'normal'; td.style.textAlign = 'left'; td.textContent = 'Q is not needed with three clusters left.'; }
    else drawTable($('s04-tabQ'), nr.labels, nr.Q, v >= 1 ? nr.pair : null);
    drawForest($('s04-svgN'), v === 0 ? S.N.start : nr.forest, true);
    var t;
    if (v === 0) t = 'Start: the same five tips and the same table. Press Step.';
    else if (nr.final) t = 'Step ' + Math.min(v, nR.length) + '. Three clusters are left. Their three branch lengths follow from the three distances (' + n2(nr.L[0]) + ', ' + n2(nr.L[1]) + ', ' + n2(nr.L[2]) + '). The tree is finished. It is drawn from its central node because an unrooted tree has no root.';
    else t = 'Step ' + Math.min(v, nR.length) + ', ' + nr.n + ' clusters left. The smallest Q is ' + n2(nr.Q[nr.pair[0]][nr.pair[1]]) + ', for ' + nr.labels[nr.pair[0]] + ' and ' + nr.labels[nr.pair[1]] + ' (their distance is ' + n2(nr.D[nr.pair[0]][nr.pair[1]]) + '). The two branches are ' + n2(nr.Li) + ' and ' + n2(nr.Lj) + '.';
    $('s04-txtN').textContent = t;
    // true tree
    drawForest($('s04-svgT'), [S.T], true);
    // verdicts
    var uOK = sameSplits(splitSet(S.U.tree, NAMES), S.truth), nOK = sameSplits(splitSet(S.N.tree, NAMES), S.truth);
    $('s04-rU').textContent = uDone ? (uOK ? 'yes' : 'NO') : 'not finished';
    $('s04-rN').textContent = nDone ? (nOK ? 'yes' : 'NO') : 'not finished';
    var out = '';
    if (uDone && nDone) {
      if (S.f === 1) out = 'All five lineages change at the same speed, so the table is ultrametric. Both methods find the true tree. Now move the slider up and run again.';
      else if (uOK) out = 'Lineage 1 is faster, but not fast enough to change which pair has the smallest distance, so UPGMA is still right here. Both methods find the true tree. Raise the speed above 3.';
      else out = 'UPGMA gave a wrong tree: it made the group of tips ' + Object.keys(splitSet(S.U.tree, NAMES)).filter(function (k) { return !S.truth[k]; }).join(' and ') + ' (a group the true tree does not contain). Lineage 1 changed faster, so the clock assumption failed and tip 1 looked far from tip 2. Neighbour joining still found the true tree, because this table is additive.';
    }
    $('s04-out').textContent = out;
    $('s04-fo').textContent = S.f;
  }

  function setF() { S.f = +$('s04-f').value; compute(); render(); }
  $('s04-f').addEventListener('input', setF);
  $('s04-step').addEventListener('click', function () { if (S.v < Math.max(S.U.recs.length, S.N.recs.length)) S.v++; render(); });
  $('s04-end').addEventListener('click', function () { S.v = Math.max(S.U.recs.length, S.N.recs.length); render(); });
  $('s04-reset').addEventListener('click', function () { S.v = 0; render(); });
  compute(); render();

  // =====================================================================
  // The check. Same functions as above.
  // =====================================================================
  function runChecks() {
    var out = [], R = rng(20261106), t, i;
    function add(ok, text) { out.push('<li><span class="' + (ok ? 'ok' : 'no') + '">' + (ok ? 'pass' : 'FAIL') + '</span> ' + text + '</li>'); }
    // 1 NJ on additive tables
    var okN = 0, worstN = 0, trials = 200;
    for (i = 0; i < trials; i++) {
      var nn = 4 + Math.floor(R() * 6), names = mkNames(nn), tr = randAdditive(names, R);
      var D = treeDist(tr, names), res = nj(D, names), back = treeDist(res.tree, names), e = maxDiff(D, back);
      worstN = Math.max(worstN, e);
      if (sameSplits(splitSet(tr, names), splitSet(res.tree, names)) && e < 1e-9) okN++;
    }
    add(okN === trials, 'Neighbour joining on ' + trials + ' random additive tables (4 to 9 tips): true tree recovered in ' + okN + ' of ' + trials + '; largest difference between the result\'s distances and the table ' + worstN.toExponential(1) + '.');
    // 2 UPGMA on ultrametric tables
    var okU = 0, worstU = 0;
    for (i = 0; i < trials; i++) {
      var mm = 4 + Math.floor(R() * 6), nm = mkNames(mm), tu = randUltra(nm, R, 1 + 3 * R());
      var Du = treeDist(tu, nm), ru = upgma(Du, nm), bu = treeDist(ru.tree, nm), eu = maxDiff(Du, bu);
      worstU = Math.max(worstU, eu);
      if (sameSplits(splitSet(tu, nm), splitSet(ru.tree, nm)) && eu < 1e-9) okU++;
    }
    add(okU === trials, 'UPGMA on ' + trials + ' random ultrametric tables: true tree recovered in ' + okU + ' of ' + trials + '; largest distance difference ' + worstU.toExponential(1) + '.');
    // 3 the toy sweep
    var sw = [], bad = 0, f, nOKall = true, uRight = [], uWrong = [];
    for (f = 1; f <= 8; f += 0.5) {
      if (f === 3) continue;
      var T = trueTree(f), D3 = treeDist(T, NAMES), tru = splitSet(T, NAMES);
      var u3 = sameSplits(splitSet(upgma(D3, NAMES).tree, NAMES), tru), n3 = sameSplits(splitSet(nj(D3, NAMES).tree, NAMES), tru);
      if (!n3) nOKall = false;
      (u3 ? uRight : uWrong).push(f);
      if (u3 !== (f < 3)) bad++;
    }
    add(nOKall && bad === 0, 'Toy table, speeds 1 to 8 (speed 3 skipped: a tie): UPGMA right at ' + uRight.length + ' speeds (all below 3) and wrong at ' + uWrong.length + ' (all above 3); neighbour joining right at all ' + (uRight.length + uWrong.length) + '. By hand: d(1,2) = speed + 1 and d(2,3) = 4, so UPGMA goes wrong exactly when speed + 1 is above 4.');
    // 4 the known wrong tree at speed 6
    var T6 = trueTree(6), D6 = treeDist(T6, NAMES), s6 = splitSet(upgma(D6, NAMES).tree, NAMES), tr6 = splitSet(T6, NAMES);
    add(s6['2,3'] === 1 && !s6['3,4,5'] && tr6['3,4,5'] === 1 && sameSplits(splitSet(nj(D6, NAMES).tree, NAMES), tr6), 'Speed 6: UPGMA groups tips 2 and 3 and not 1 and 2 (the wrong tree worked out by hand); the true tree and the neighbour joining tree group 1 and 2.');
    // 5 UPGMA on additive but not ultrametric tables fails sometimes
    var wrong = 0;
    for (i = 0; i < trials; i++) {
      var k5 = 5 + Math.floor(R() * 4), n5 = mkNames(k5), t5 = randAdditive(n5, R), D5 = treeDist(t5, n5);
      if (!sameSplits(splitSet(t5, n5), splitSet(upgma(D5, n5).tree, n5))) wrong++;
    }
    add(wrong > 0, 'UPGMA on ' + trials + ' random additive tables with unequal rates: wrong tree in ' + wrong + ' of ' + trials + '. Neighbour joining on the same kind of table: see the first line.');
    $('s04-check').innerHTML = out.join('');
    // cross-check dump for an outside comparison (only when the page address ends in #s04-xcheck)
    if (location.hash === '#s04-xcheck') {
      var dump = [], R2 = rng(77);
      for (var q = 0; q < 3; q++) {
        var nm2 = mkNames(7), t2 = randAdditive(nm2, R2), D2 = treeDist(t2, nm2);
        for (var a = 0; a < 7; a++) for (var b = a + 1; b < 7; b++) { var z = D2[a][b] * (1 + 0.15 * (R2() - 0.5)); D2[a][b] = z; D2[b][a] = z; }
        var ru2 = upgma(D2, nm2), rn2 = nj(D2, nm2);
        dump.push({ names: nm2, D: D2, upgma: newick(ru2.tree, true), nj: newick(rn2.tree, true) });
      }
      $('s04-check').setAttribute('data-xcheck', JSON.stringify(dump));
    }
  }
  runChecks();
})();
