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
  // A tree is nested pairs of taxon numbers: [[0,1],[2,[3,4]]]. States are 0..3 (A,C,G,T).
  // Fitch (1971) counting: a set of states at every node, tips to root.
  // Two children whose sets share a state: take the shared states (no change needed).
  // Otherwise take the union of the two sets and add one change.
  function build(t) {
    if (typeof t === 'number') return { leaf: t };
    return { l: build(t[0]), r: build(t[1]) };
  }
  function fitch(node, st) {
    if (node.leaf !== undefined) { node.set = 1 << st[node.leaf]; node.step = 0; return 0; }
    var s = fitch(node.l, st) + fitch(node.r, st), i = node.l.set & node.r.set;
    if (i) { node.set = i; node.step = 0; } else { node.set = node.l.set | node.r.set; node.step = 1; s++; }
    return s;
  }
  function fitchScore(tree, st) { return fitch(build(tree), st); }
  // Brute force: try every assignment of a state to every inside node, count the edges whose
  // two ends differ, keep the smallest count.
  function bruteScore(tree, st) {
    var root = build(tree), inner = [];
    (function walk(n) { if (n.leaf === undefined) { n.id = inner.length; inner.push(n); walk(n.l); walk(n.r); } })(root);
    var k = inner.length, total = Math.pow(4, k), best = 1e9, a, c, v;
    function stateOf(n, asg) { return n.leaf !== undefined ? st[n.leaf] : asg[n.id]; }
    for (a = 0; a < total; a++) {
      var asg = [], x = a;
      for (c = 0; c < k; c++) { asg.push(x & 3); x >>= 2; }
      v = 0;
      for (c = 0; c < k; c++) {
        var n = inner[c];
        if (stateOf(n, asg) !== stateOf(n.l, asg)) v++;
        if (stateOf(n, asg) !== stateOf(n.r, asg)) v++;
      }
      if (v < best) best = v;
    }
    return best;
  }
  // A site is informative if at least two different states each occur in at least two taxa.
  function classify(st) {
    var cnt = [0, 0, 0, 0], i, big = 0, kinds = 0;
    for (i = 0; i < st.length; i++) cnt[st[i]]++;
    for (i = 0; i < 4; i++) { if (cnt[i] > 0) kinds++; if (cnt[i] >= 2) big++; }
    return kinds === 1 ? 'constant' : (big >= 2 ? 'informative' : 'uninformative');
  }
  // Four-taxon trees and a JC69-style simulation. t = expected changes per site on a branch.
  var T4 = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
  function pChange(t) { return 0.75 * (1 - Math.exp(-4 * t / 3)); }
  function mutate(s, t, r) {
    if (r() < pChange(t)) { var o = Math.floor(r() * 3); return o >= s ? o + 1 : o; }
    return s;
  }
  // True tree is ((A,B),(C,D)); branches to A and C are long (a), B and D short (b),
  // the inside branch is c (half on each side of the root).
  function simulate(n, a, b, c, r) {
    var cols = [], i, root, x, y;
    for (i = 0; i < n; i++) {
      root = Math.floor(r() * 4);
      x = mutate(root, c / 2, r); y = mutate(root, c / 2, r);
      cols.push([mutate(x, a, r), mutate(x, b, r), mutate(y, a, r), mutate(y, b, r)]);
    }
    return cols;
  }
  function scoreFour(cols) {
    var s = [0, 0, 0], i, k;
    for (i = 0; i < cols.length; i++) for (k = 0; k < 3; k++) s[k] += fitchScore(T4[k], cols[i]);
    return s;
  }
  // ENGINE-END

  var NAMES = ['A', 'B', 'C', 'D', 'E'], LET = ['A', 'C', 'G', 'T'];
  var COL = ['var(--accent)', 'var(--het)', 'var(--rep)', 'var(--good)'];

  // ---------------- control: Fitch against brute force ----------------
  var T5 = [[[0, 1], [2, [3, 4]]], [[0, 2], [1, [3, 4]]], [[0, 3], [2, [1, 4]]]];
  var T5name = ['Tree 1: (A,B) (C,(D,E))', 'Tree 2: (A,C) (B,(D,E))', 'Tree 3: (A,D) (C,(B,E))'];
  function runControl() {
    var checked = 0, bad = 0, p, t, st;
    for (p = 0; p < 1024; p++) {
      st = [p & 3, (p >> 2) & 3, (p >> 4) & 3, (p >> 6) & 3, (p >> 8) & 3];
      for (t = 0; t < 3; t++) { checked++; if (fitchScore(T5[t], st) !== bruteScore(T5[t], st)) bad++; }
    }
    // the same unrooted four-taxon tree drawn with different roots must give the same score
    var rootBad = 0, a;
    for (p = 0; p < 256; p++) {
      st = [p & 3, (p >> 2) & 3, (p >> 4) & 3, (p >> 6) & 3];
      a = fitchScore([[0, 1], [2, 3]], st);
      if (a !== fitchScore([0, [1, [2, 3]]], st) || a !== fitchScore([[[0, 1], 2], 3], st)) rootBad++;
    }
    return { checked: checked, bad: bad, rootBad: rootBad };
  }

  // ---------------- tool 1: Fitch counter ----------------
  var M0 = [ // 8 sites, taxa A..E (0=A 1=C 2=G 3=T)
    [0, 0, 2, 2, 2], [1, 1, 3, 3, 3], [0, 0, 0, 2, 2], [3, 3, 1, 1, 1],
    [2, 2, 2, 2, 2], [0, 0, 0, 0, 3], [0, 1, 0, 1, 1], [0, 0, 2, 2, 0]
  ];
  var M = M0.map(function (r) { return r.slice(); });
  var cur = { tree: 0, site: 0 };
  function cycle(site, taxon) { M[site][taxon] = (M[site][taxon] + 1) % 4; renderAll(); }
  function setLabel(set) {
    var o = [], i; for (i = 0; i < 4; i++) if (set & (1 << i)) o.push(LET[i]);
    return '{' + o.join(',') + '}';
  }
  function drawTree() {
    var host = $('s05-tree'); host.innerHTML = '';
    var root = build(T5[cur.tree]), st = M[cur.site], W = 560, H = 270;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img',
      'aria-label': 'Tree with Fitch sets at every node', style: 'min-width:520px' }, host);
    var steps = fitch(root, st), tipY = 212, slot = 0;
    (function order(n) { if (n.leaf !== undefined) { n.slot = slot++; } else { order(n.l); order(n.r); } })(root);
    (function lay(n) {
      if (n.leaf !== undefined) { n.x = 60 + n.slot * 110; n.y = tipY; n.h = 0; return; }
      lay(n.l); lay(n.r); n.h = Math.max(n.l.h, n.r.h) + 1; n.x = (n.l.x + n.r.x) / 2; n.y = tipY - 8 - n.h * 40;
    })(root);
    (function draw(n) {
      if (n.leaf !== undefined) return;
      [n.l, n.r].forEach(function (c) {
        el('path', { d: 'M' + n.x + ' ' + n.y + 'H' + c.x + 'V' + (c.leaf !== undefined ? c.y - 15 : c.y), fill: 'none', style: 'stroke:var(--muted);stroke-width:1.6' }, svg);
      });
      draw(n.l); draw(n.r);
    })(root);
    (function nodes(n) {
      if (n.leaf !== undefined) {
        var g = el('g', { tabindex: 0, role: 'button', style: 'cursor:pointer',
          'aria-label': 'Taxon ' + NAMES[n.leaf] + ' state ' + LET[st[n.leaf]] + ', click to change' }, svg);
        el('rect', { x: n.x - 15, y: n.y - 15, width: 30, height: 30, rx: 4, fill: 'var(--panel)', stroke: COL[st[n.leaf]], 'stroke-width': 2 }, g);
        el('text', { x: n.x, y: n.y + 5, 'text-anchor': 'middle', style: 'font-size:15px;font-weight:700;fill:' + COL[st[n.leaf]] }, g, LET[st[n.leaf]]);
        el('text', { x: n.x, y: n.y + 32, 'text-anchor': 'middle', class: 'lab' }, svg, 'taxon ' + NAMES[n.leaf]);
        (function (leaf) {
          g.addEventListener('click', function () { cycle(cur.site, leaf); });
          g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycle(cur.site, leaf); } });
        })(n.leaf);
        return;
      }
      nodes(n.l); nodes(n.r);
      el('circle', { cx: n.x, cy: n.y, r: n.step ? 6 : 4, fill: n.step ? 'var(--bad)' : 'var(--muted)' }, svg);
      el('text', { x: n.x + 10, y: n.y - 7, class: 'lab', style: 'font-weight:700' + (n.step ? ';fill:var(--bad)' : '') }, svg, setLabel(n.set));
    })(root);
    $('s05-steps').textContent = steps;
  }
  function siteScores(site) { return T5.map(function (t) { return fitchScore(t, M[site]); }); }
  function drawTable() {
    var host = $('s05-mat'); host.innerHTML = '';
    var tbl = document.createElement('table'); tbl.style.minWidth = '560px';
    var h = '<thead><tr><th>site</th>', i, j, t;
    for (j = 0; j < 5; j++) h += '<th>' + NAMES[j] + '</th>';
    h += '<th>kind of site</th><th>Tree 1</th><th>Tree 2</th><th>Tree 3</th></tr></thead><tbody>';
    var tot = [0, 0, 0];
    for (i = 0; i < M.length; i++) {
      var sc = siteScores(i), kind = classify(M[i]);
      h += '<tr' + (i === cur.site ? ' style="background:var(--code-bg)"' : '') + '><td><button type="button" class="s05-sel" data-site="' + i + '" aria-label="Show site ' + (i + 1) + ' on the tree">' + (i + 1) + '</button></td>';
      for (j = 0; j < 5; j++) h += '<td><button type="button" class="s05-cell" data-site="' + i + '" data-tax="' + j + '" style="color:' + COL[M[i][j]] + '" aria-label="Site ' + (i + 1) + ' taxon ' + NAMES[j] + ' is ' + LET[M[i][j]] + ', click to change">' + LET[M[i][j]] + '</button></td>';
      h += '<td>' + kind + '</td>';
      for (t = 0; t < 3; t++) { h += '<td>' + sc[t] + '</td>'; tot[t] += sc[t]; }
      h += '</tr>';
    }
    var mn = Math.min(tot[0], tot[1], tot[2]);
    h += '</tbody><tfoot><tr><td colspan="6"><b>Total changes</b></td><td></td>';
    for (t = 0; t < 3; t++) h += '<td><b' + (tot[t] === mn ? ' style="color:var(--good)"' : '') + '>' + tot[t] + (tot[t] === mn ? ' (fewest)' : '') + '</b></td>';
    h += '</tr></tfoot>';
    tbl.innerHTML = h; host.appendChild(tbl);
    Array.prototype.forEach.call(tbl.querySelectorAll('.s05-cell'), function (b) {
      b.addEventListener('click', function () { cur.site = +b.dataset.site; cycle(cur.site, +b.dataset.tax); });
    });
    Array.prototype.forEach.call(tbl.querySelectorAll('.s05-sel'), function (b) {
      b.addEventListener('click', function () { cur.site = +b.dataset.site; renderAll(); });
    });
    var info = M.reduce(function (a, s) { a[classify(s)]++; return a; }, { constant: 0, uninformative: 0, informative: 0 });
    $('s05-r-inf').textContent = info.informative + ' informative, ' + info.uninformative + ' uninformative, ' + info.constant + ' constant';
    var ws = []; for (t = 0; t < 3; t++) if (tot[t] === mn) ws.push(t + 1);
    $('s05-r-best').textContent = ws.length === 1 ? 'Tree ' + ws[0] + ' (' + mn + ' changes)' : 'tie: trees ' + ws.join(', ') + ' (' + mn + ' changes)';
    var diff = 0, q;
    for (i = 0; i < M.length; i++) { if (classify(M[i]) !== 'informative') { q = siteScores(i); if (q[0] !== q[1] || q[1] !== q[2]) diff++; } }
    $('s05-r-unin').textContent = diff === 0 ? 'no: they cost the same on all three trees' : 'ERROR ' + diff;
  }
  function renderAll() {
    $('s05-site-n').textContent = cur.site + 1;
    var segs = document.querySelectorAll('#s05-trees button');
    Array.prototype.forEach.call(segs, function (b, i) { b.setAttribute('aria-pressed', i === cur.tree ? 'true' : 'false'); });
    drawTree(); drawTable();
  }
  (function () {
    var host = $('s05-trees'); if (!host) return;
    T5name.forEach(function (nm, i) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = nm; b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () { cur.tree = i; renderAll(); }); host.appendChild(b);
    });
    $('s05-reset').addEventListener('click', function () {
      cur.site = 0; cur.tree = 0; M = M0.map(function (r) { return r.slice(); }); renderAll();
    });
    var c = runControl();
    $('s05-ctl').textContent = 'Check run when this page loaded: all 1,024 possible patterns of states for 5 taxa on each of the 3 trees (' + c.checked + ' cases). Fitch counting and the brute-force count (every assignment of states to the 4 inside nodes) disagreed in ' + c.bad + ' cases. The same 4-taxon tree drawn with three different roots gave different scores in ' + c.rootBad + ' of 256 patterns.';
    renderAll();
  })();

  // ---------------- tool 2: long-branch simulator ----------------
  function bars(host, res, reps) {
    host.innerHTML = '';
    var rows = [['Right tree (A,B | C,D)', res.t, 'var(--good)'], ['Wrong tree (A,C | B,D): joins the two long branches', res.w, 'var(--bad)'], ['Other wrong tree (A,D | B,C)', res.o, 'var(--err)'], ['Tie: no single best tree', res.tie, 'var(--muted)']];
    rows.forEach(function (r) {
      var d = document.createElement('div'); d.style.cssText = 'display:grid;grid-template-columns:minmax(150px,300px) 1fr 48px;gap:8px;align-items:center;font-size:13px';
      var pc = Math.round(100 * r[1] / reps);
      d.innerHTML = '<span>' + r[0] + '</span><span style="background:var(--code-bg);border-radius:2px;height:12px;display:block"><i style="display:block;height:12px;border-radius:2px;background:' + r[2] + ';width:' + pc + '%"></i></span><b style="font-family:var(--f-mono)">' + pc + '%</b>';
      host.appendChild(d);
    });
  }
  function drawLbaTree(a, b, c) {
    var host = $('s05-lbatree'); host.innerHTML = '';
    var svg = el('svg', { viewBox: '0 0 300 150', width: '100%', role: 'img', 'aria-label': 'The true tree with long branches to A and C', style: 'min-width:260px;max-width:340px' }, host);
    var xl = 95, xr = 205;
    function line(x1, y1, x2, y2, w, col) { el('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: col, 'stroke-width': w, 'stroke-linecap': 'round' }, svg); }
    var wa = 2 + Math.min(a, 1.5) * 4, wb = 2 + Math.min(b, 1.5) * 4, wc = 2 + Math.min(c, 1.5) * 4;
    line(xl, 75, xr, 75, wc, 'var(--muted)');
    line(xl, 75, xl, 35, wa, 'var(--bad)'); line(xl, 75, xl, 115, wb, 'var(--accent)');
    line(xr, 75, xr, 35, wa, 'var(--bad)'); line(xr, 75, xr, 115, wb, 'var(--accent)');
    el('text', { x: xl, y: 24, 'text-anchor': 'middle', class: 'lab' }, svg, 'A');
    el('text', { x: xl, y: 134, 'text-anchor': 'middle', class: 'lab' }, svg, 'B');
    el('text', { x: xr, y: 24, 'text-anchor': 'middle', class: 'lab' }, svg, 'C');
    el('text', { x: xr, y: 134, 'text-anchor': 'middle', class: 'lab' }, svg, 'D');
    el('text', { x: 150, y: 66, 'text-anchor': 'middle' }, svg, 'inside ' + c.toFixed(2));
    el('text', { x: xl - 8, y: 58, 'text-anchor': 'end' }, svg, a.toFixed(2));
    el('text', { x: xl - 8, y: 98, 'text-anchor': 'end' }, svg, b.toFixed(2));
  }
  function runSim() {
    var n = +$('s05-n').value, a = +$('s05-long').value, b = +$('s05-short').value, c = +$('s05-in').value;
    var reps = 100, r = rng(5000 + n + Math.round(a * 1000) + Math.round(b * 100000) + Math.round(c * 1000000));
    var res = { t: 0, w: 0, o: 0, tie: 0 }, i, k, first = null;
    for (i = 0; i < reps; i++) {
      var s = scoreFour(simulate(n, a, b, c, r)), mn = Math.min(s[0], s[1], s[2]), who = [];
      for (k = 0; k < 3; k++) if (s[k] === mn) who.push(k);
      if (who.length > 1) res.tie++; else if (who[0] === 0) res.t++; else if (who[0] === 1) res.w++; else res.o++;
      if (i === 0) first = s;
    }
    bars($('s05-bars'), res, reps);
    $('s05-one').textContent = 'First of the 100 data sets: changes needed on (A,B | C,D) = ' + first[0] + ', on (A,C | B,D) = ' + first[1] + ', on (A,D | B,C) = ' + first[2] + '.';
    drawLbaTree(a, b, c);
  }
  (function () {
    if (!$('s05-run')) return;
    function sync() {
      $('s05-n-o').textContent = $('s05-n').value; $('s05-long-o').textContent = (+$('s05-long').value).toFixed(2);
      $('s05-short-o').textContent = (+$('s05-short').value).toFixed(2); $('s05-in-o').textContent = (+$('s05-in').value).toFixed(2);
    }
    function set(n, a, b, c) { $('s05-n').value = n; $('s05-long').value = a; $('s05-short').value = b; $('s05-in').value = c; sync(); runSim(); }
    ['n', 'long', 'short', 'in'].forEach(function (k) {
      $('s05-' + k).addEventListener('input', function () { sync(); drawLbaTree(+$('s05-long').value, +$('s05-short').value, +$('s05-in').value); });
    });
    $('s05-run').addEventListener('click', runSim);
    $('s05-p-fels').addEventListener('click', function () { set(2000, 0.75, 0.05, 0.05); });
    $('s05-p-even').addEventListener('click', function () { set(2000, 0.2, 0.2, 0.2); });
    $('s05-p-few').addEventListener('click', function () { set(100, 0.75, 0.05, 0.05); });
    set(2000, 0.75, 0.05, 0.05);
  })();

  // ---------------- SINE presence/absence toy ----------------
  (function () {
    var host = $('s05-sine'); if (!host) return;
    // 1 = copy present, 0 = empty site. Species order A..E.
    var L = [[1, 1, 0, 0, 0], [0, 0, 1, 1, 1], [0, 0, 0, 1, 1], [0, 0, 0, 1, 1], [0, 0, 1, 0, 0], [1, 0, 1, 0, 0]];
    function clusters(t, out) {
      if (typeof t === 'number') return [t];
      var a = clusters(t[0], out).concat(clusters(t[1], out)); out.push(a.slice().sort().join('')); return a;
    }
    var cl = T5.map(function (t) { var o = []; clusters(t, o); return o; });
    var h = '<table style="min-width:600px"><thead><tr><th>locus</th>', i, j, t;
    for (j = 0; j < 5; j++) h += '<th>' + NAMES[j] + '</th>';
    h += '<th>species sharing the copy</th><th>Tree 1</th><th>Tree 2</th><th>Tree 3</th></tr></thead><tbody>';
    var fit = [0, 0, 0];
    for (i = 0; i < L.length; i++) {
      var grp = [], names = [];
      for (j = 0; j < 5; j++) if (L[i][j]) { grp.push(j); names.push(NAMES[j]); }
      var key = grp.join('');
      h += '<tr><td>' + (i + 1) + '</td>';
      for (j = 0; j < 5; j++) h += '<td>' + L[i][j] + '</td>';
      h += '<td>' + (grp.length < 2 ? names.join('') + ' alone: says nothing about the tree' : names.join(' + ')) + '</td>';
      for (t = 0; t < 3; t++) {
        var ok = grp.length < 2 ? null : cl[t].indexOf(key) >= 0;
        if (ok) fit[t]++;
        h += '<td>' + (ok === null ? '-' : (ok ? '<span style="color:var(--good)">fits</span>' : '<span style="color:var(--bad)">does not fit</span>')) + '</td>';
      }
      h += '</tr>';
    }
    h += '</tbody><tfoot><tr><td colspan="7"><b>Informative loci that fit the tree</b></td>';
    for (t = 0; t < 3; t++) h += '<td><b>' + fit[t] + '</b></td>';
    h += '</tr></tfoot></table>';
    host.innerHTML = h;
  })();
})();
