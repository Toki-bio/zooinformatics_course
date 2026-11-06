(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag), k;
    for (k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgBox(parent, w, h, label) {
    return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'img', 'aria-label': label, style: 'display:block' }, parent);
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
  function panel(parent, title, cls) {
    var d = document.createElement('div');
    d.className = 'b-panel' + (cls ? ' ' + cls : '');
    var h = document.createElement('h4');
    h.innerHTML = title;
    d.appendChild(h);
    parent.appendChild(d);
    return d;
  }
  function para(parent, html) {
    var p = document.createElement('p');
    p.innerHTML = html;
    parent.appendChild(p);
    return p;
  }
  function pct(a, b) { return (100 * a / b).toFixed(0) + ' %'; }
  function text(svg, x, y, s, anchor, size, fill) {
    return el('text', { x: x, y: y, 'text-anchor': anchor || 'start', 'font-size': size || 12, style: 'fill:' + (fill || 'var(--fg)') }, svg, s);
  }
  function line(svg, x1, y1, x2, y2) {
    return el('line', { x1: x1, y1: y1, x2: x2, y2: y2, style: 'stroke:var(--fg);stroke-width:2' }, svg);
  }

  // ---- trees: a leaf is {n: name}, an inner node is {c: [children]} ----
  function L(n) { return { n: n }; }
  function N() { return { c: Array.prototype.slice.call(arguments) }; }
  function clone(t) { return t.c ? { c: t.c.map(clone) } : { n: t.n }; }
  function tips(t) { return t.c ? [].concat.apply([], t.c.map(tips)) : [t.n]; }
  function canon(t) { return t.c ? '(' + t.c.map(canon).sort().join(',') + ')' : t.n; }
  function height(t) { return t.c ? 1 + Math.max.apply(null, t.c.map(height)) : 0; }
  function sisters(t, name) {
    var r = null;
    (function walk(n) {
      if (!n.c || r) return;
      var hit = n.c.some(function (k) { return k.n === name; });
      if (hit) r = [].concat.apply([], n.c.filter(function (k) { return k.n !== name; }).map(tips));
      else n.c.forEach(walk);
    })(t);
    return r;
  }
  function clades(t, isRoot) {                     // tip sets of all inner nodes except the root
    if (!t.c) return [];
    var out = isRoot ? [] : [tips(t).sort().join(' ')];
    t.c.forEach(function (k) { out = out.concat(clades(k, false)); });
    return out;
  }
  // Draw a tree left to right; tips end at X+W. o.onClick(node) makes inner nodes clickable.
  function drawTree(svg, root, X, Y, W, H, o) {
    o = o || {};
    var late = [], nt = tips(root).length, step = nt > 1 ? H / (nt - 1) : 0, hMax = height(root), next = 0;
    function xOf(n) { return X + (hMax - height(n)) / hMax * W; }
    function go(n) {
      var x = xOf(n), y, ys;
      if (!n.c) {
        y = Y + next++ * step;
        text(svg, X + W + 5, y + 4, n.n);
        return y;
      }
      ys = n.c.map(go);
      y = (ys[0] + ys[ys.length - 1]) / 2;
      line(svg, x, Math.min.apply(null, ys), x, Math.max.apply(null, ys));
      n.c.forEach(function (k, i) { line(svg, x, ys[i], xOf(k), ys[i]); });
      if (n === root && o.rootMark) el('rect', { x: x - 4, y: y - 4, width: 8, height: 8, style: 'fill:var(--bad)' }, svg);
      else if (o.onClick) {
        late.push([x, y, n]);
      }
      return y;
    }
    go(root);
    late.forEach(function (q) {                   // circles last, so that no line lies over them
      var c = el('circle', { cx: q[0], cy: q[1], r: 6, 'class': 'b-node', style: 'fill:var(--bg);stroke:var(--accent);stroke-width:2' }, svg);
      c.addEventListener('click', function () { o.onClick(q[2]); });
      el('title', {}, c, 'Turn this node');
    });
  }

  // ---- 1. rotation ----
  var BASE = N(N(N(L('cat'), L('lion')), N(L('dog'), L('wolf'))), L('frog'));
  var BASEC = canon(BASE), t1 = clone(BASE);
  var fixed = [
    N(L('frog'), N(N(L('lion'), L('cat')), N(L('wolf'), L('dog')))),
    N(N(N(L('dog'), L('wolf')), N(L('lion'), L('cat'))), L('frog')),
    N(N(N(L('lion'), L('dog')), N(L('cat'), L('wolf'))), L('frog'))
  ];
  function describe(d, t) {
    var order = tips(t), i = order.indexOf('cat'), beside = [];
    if (i > 0) beside.push(order[i - 1]);
    if (i < order.length - 1) beside.push(order[i + 1]);
    var same = canon(t) === BASEC;
    para(d, 'Same as at the start: <span class="' + (same ? 'b-yes">yes' : 'b-no">no') + '</span>');
    para(d, 'Closest relative of cat: <b>' + sisters(t, 'cat').join(' and ') + '</b>');
    para(d, 'Beside cat: <b>' + beside.join(' and ') + '</b>');
  }
  function drawRot() {
    var box = $('b-rot');
    box.textContent = '';
    [t1].concat(fixed).forEach(function (t, k) {
      var d = panel(box, 'Drawing ' + (k + 1) + (k === 0 ? ' (click the circles)' : '')), svg = svgBox(d, 190, 104, 'Drawing ' + (k + 1) + ' of a tree of five animals');
      drawTree(svg, t, 8, 10, 110, 84, { onClick: k === 0 ? function (n) { n.c.reverse(); drawRot(); } : null });
      describe(d, t);
    });
  }
  $('b-rot-reset').addEventListener('click', function () { t1 = clone(BASE); drawRot(); });
  drawRot();

  // ---- 2. rooting ----
  var EDGES = [['cat', 'x'], ['lion', 'x'], ['x', 'z'], ['dog', 'y'], ['wolf', 'y'], ['y', 'z'], ['frog', 'z']];
  var POS = { cat: [30, 14], lion: [30, 84], x: [80, 49], z: [140, 49], y: [200, 49], dog: [250, 14], wolf: [250, 84], frog: [140, 112] };
  var ADJ = {};
  EDGES.forEach(function (e) { (ADJ[e[0]] = ADJ[e[0]] || []).push(e[1]); (ADJ[e[1]] = ADJ[e[1]] || []).push(e[0]); });
  function sub(u, from) {
    var nb = ADJ[u].filter(function (v) { return v !== from; });
    return nb.length ? { c: nb.map(function (v) { return sub(v, u); }) } : { n: u };
  }
  var SVGU = svgBox($('b-unr'), 300, 130, 'Unrooted tree of five animals with seven numbered branches');
  EDGES.forEach(function (e) { line(SVGU, POS[e[0]][0], POS[e[0]][1], POS[e[1]][0], POS[e[1]][1]); });
  EDGES.forEach(function (e, k) {
    var a = POS[e[0]], b = POS[e[1]], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    el('circle', { cx: mx, cy: my, r: 8, style: 'fill:var(--bg);stroke:var(--accent);stroke-width:1.5' }, SVGU);
    text(SVGU, mx, my + 4, String(k + 1), 'middle', 11);
  });
  ['cat', 'lion', 'dog', 'wolf', 'frog'].forEach(function (n) {
    var p = POS[n], left = p[0] < 100, down = n === 'frog';
    text(SVGU, down ? p[0] : (left ? p[0] - 5 : p[0] + 5), down ? p[1] + 13 : p[1] + 4, n, down ? 'middle' : (left ? 'end' : 'start'));
  });
  (function () {
    var box = $('b-roots'), seen = {}, nd = 0, frogOut = 0;
    EDGES.forEach(function (e, k) {
      var r = { c: [sub(e[0], e[1]), sub(e[1], e[0])] };
      var cl = clades(r, true).filter(function (s) { return s.indexOf(' ') > 0; });
      var out = r.c.some(function (c) { return c.n === 'frog'; });
      if (!seen[canon(r)]) { seen[canon(r)] = 1; nd++; }
      if (out) frogOut++;
      var d = panel(box, 'Root on branch ' + (k + 1) + (e[0] === 'frog' ? ' (frog)' : ''), e[0] === 'frog' ? 'b-win' : '');
      var svg = svgBox(d, 190, 104, 'Tree rooted on branch ' + (k + 1));
      drawTree(svg, r, 8, 10, 110, 84, { rootMark: true });
      para(d, 'Frog outgroup: <span class="' + (out ? 'b-yes">yes' : 'b-no">no') + '</span>');
      para(d, 'Clades: <b>' + cl.map(function (s) { return '(' + s + ')'; }).join(' ') + '</b>');
    });
    $('b-rootmsg').innerHTML = '' + EDGES.length + ' branches give ' + nd + ' rooted trees; only ' + frogOut + ' has frog as the outgroup (green frame). Red square: the root.';
  })();

  // ---- four-taxon simulation, shared by blocks 3 to 5 ----
  function mut(r, b, d) {
    var p = 0.75 * (1 - Math.exp(-4 * d / 3));
    return r() < p ? (b + 1 + Math.floor(r() * 3)) % 4 : b;
  }
  function sim(r, n, bl) {                         // bl = [A, B, C, D, inside]; true tree (A,B),(C,D)
    var cols = [], i, u, v;
    for (i = 0; i < n; i++) {
      u = Math.floor(r() * 4); v = mut(r, u, bl[4]);
      cols.push([mut(r, u, bl[0]), mut(r, u, bl[1]), mut(r, v, bl[2]), mut(r, v, bl[3])]);
    }
    return cols;
  }
  function cls(c) {                                // 1: AB|CD, 2: AC|BD, 3: AD|BC, 0: does not vote
    if (c[0] === c[1] && c[2] === c[3] && c[0] !== c[2]) return 1;
    if (c[0] === c[2] && c[1] === c[3] && c[0] !== c[1]) return 2;
    if (c[0] === c[3] && c[1] === c[2] && c[0] !== c[1]) return 3;
    return 0;
  }
  function count(cols) { var k = [0, 0, 0, 0]; cols.forEach(function (c) { k[cls(c)]++; }); return k; }
  var PAIRS = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]];
  var NAMES = ['AB|CD', 'AC|BD', 'AD|BC'];
  var WORDS = ['A with B, and C with D', 'A with C, and B with D', 'A with D, and B with C'];
  var TREES = [N(N(L('A'), L('B')), N(L('C'), L('D'))), N(N(L('A'), L('C')), N(L('B'), L('D'))), N(N(L('A'), L('D')), N(L('B'), L('C')))];
  var COL = ['var(--accent)', 'var(--het)', 'var(--rep)'];
  function fitch(c, p) {                           // steps for one column on the tree ((p0,p1),(p2,p3))
    var st = 0;
    function join(a, b) {
      var x = a.filter(function (z) { return b.indexOf(z) >= 0; });
      if (x.length) return x;
      st++;
      return a.concat(b.filter(function (z) { return a.indexOf(z) < 0; }));
    }
    join(join([c[p[0]]], [c[p[1]]]), join([c[p[2]]], [c[p[3]]]));
    return st;
  }
  function steps(cols) { return PAIRS.map(function (p) { return cols.reduce(function (s, c) { return s + fitch(c, p); }, 0); }); }
  function best(a) {                               // index of the unique minimum or maximum-free tie: -1 on a tie
    var m = Math.min.apply(null, a), idx = [];
    a.forEach(function (v, i) { if (v === m) idx.push(i); });
    return idx.length === 1 ? idx[0] : -1;
  }
  function bestMax(a) { return best(a.map(function (v) { return -v; })); }

  // ---- 3. shared changes ----
  var aSeed = 3, NC = 30;
  function drawAln() {
    var cols = sim(rng(aSeed), NC, [0.1, 0.1, 0.1, 0.1, 0.3]), k = count(cols), st = steps(cols), w = best(st), CW = 12, i;
    var box = $('b-aln');
    box.textContent = '';
    var svg = svgBox(box, 40 + NC * CW, 80, 'Alignment of four sequences with 30 columns');
    ['A', 'B', 'C', 'D'].forEach(function (n, r) { text(svg, 20, 22 + r * 16, n, 'end', 13); });
    cols.forEach(function (c, j) {
      var q = cls(c);
      if (q) el('rect', { x: 26 + j * CW, y: 6, width: CW - 1, height: 66, style: 'fill:' + COL[q - 1] + ';opacity:.28' }, svg);
      c.forEach(function (b, r) { text(svg, 26 + j * CW + CW / 2 - 0.5, 22 + r * 16, 'ACGT'[b], 'middle', 12); });
    });
    var tb = $('b-three');
    tb.textContent = '';
    for (i = 0; i < 3; i++) {
      var d = panel(tb, '<span style="display:inline-block;width:10px;height:10px;background:' + COL[i] + ';opacity:.6;margin-right:6px"></span>Joins ' + WORDS[i], i === w ? 'b-win' : '');
      var s2 = svgBox(d, 150, 70, 'Tree ' + NAMES[i]);
      drawTree(s2, TREES[i], 8, 8, 90, 52, {});
      para(d, 'Voting columns: <b>' + k[i + 1] + '</b>');
      para(d, 'Changes needed: <b>' + st[i] + '</b>');
    }
    $('b-alnmsg').innerHTML = 'Coloured columns: two species share a base the others lack. Of ' + NC + ' columns, ' + (k[1] + k[2] + k[3]) + ' vote. ' +
      (w < 0 ? 'Two trees tie, so these data cannot choose.' :
        'Joining ' + WORDS[w] + ' needs the fewest changes (' + st[w] + '). The true tree joins A with B, so this ' + (w === 0 ? 'is right.' : 'is wrong.'));
  }
  $('b-aln-new').addEventListener('click', function () { aSeed++; drawAln(); });
  drawAln();

  // ---- 4. long branches ----
  var SET4 = [
    { t: 'All branches 0.1, 2000 columns', bl: [0.1, 0.1, 0.1, 0.1, 0.1], n: 2000 },
    { t: 'A and C long, 2000 columns', bl: [0.75, 0.05, 0.75, 0.05, 0.05], n: 2000 },
    { t: 'Same, ten times more data: 20000 columns', bl: [0.75, 0.05, 0.75, 0.05, 0.05], n: 20000 }
  ];
  var lSeed = 11;
  function drawLba() {
    var box = $('b-lba'), verdict = [];
    box.textContent = '';
    SET4.forEach(function (s, q) {
      var cols = sim(rng(lSeed * 10 + q), s.n, s.bl), k = count(cols), v = k.slice(1), mx = Math.max.apply(null, v), w = bestMax(v);
      var d = panel(box, s.t, w === 0 ? 'b-win' : (w > 0 ? 'b-wrong' : ''));
      var svg = svgBox(d, 230, 140, s.t), S = 100, ux = 112, vx = ux + Math.max(s.bl[4] * S, 6);
      line(svg, ux, 22, ux, 38); line(svg, vx, 22, vx, 38); line(svg, ux, 30, vx, 30);
      line(svg, ux, 22, ux - s.bl[0] * S, 22); line(svg, ux, 38, ux - s.bl[1] * S, 38);
      line(svg, vx, 22, vx + s.bl[2] * S, 22); line(svg, vx, 38, vx + s.bl[3] * S, 38);
      text(svg, ux - s.bl[0] * S - 4, 26, 'A', 'end'); text(svg, ux - s.bl[1] * S - 4, 42, 'B', 'end');
      text(svg, vx + s.bl[2] * S + 4, 26, 'C'); text(svg, vx + s.bl[3] * S + 4, 42, 'D');
      NAMES.forEach(function (nm, i) {
        var y = 58 + i * 24, bw = 100 * v[i] / Math.max(1, mx);
        text(svg, 4, y + 11, nm + (i === 0 ? ' (true)' : ''));
        el('rect', { x: 100, y: y, width: Math.max(1, bw), height: 14, style: 'fill:' + (i === 0 ? 'var(--good)' : 'var(--bad)') }, svg);
        text(svg, 100 + bw + 4, y + 11, String(v[i]));
      });
      para(d, 'Picks: <b>' + (w < 0 ? 'a tie' : NAMES[w]) + '</b> <span class="' + (w === 0 ? 'b-yes">(right)' : 'b-no">(' + (w < 0 ? 'no choice' : 'wrong') + ')') + '</span>');
      verdict.push({ w: w, v: v });
    });
    var a = verdict[1], b = verdict[2];
    $('b-lbamsg').innerHTML = 'Short branches: the true pairing ' + (verdict[0].w === 0 ? 'wins' : 'does not win') + ' (' + verdict[0].v[0] + ' against ' + Math.max(verdict[0].v[1], verdict[0].v[2]) + '). A and C long: A with C has ' + a.v[1] + ', the true pairing ' + a.v[0] + '. Ten times more data: ' + b.v[1] + ' and ' + b.v[0] + (b.w > 0 ? '. More data keeps the wrong answer.' : '.');
  }
  $('b-lba-new').addEventListener('click', function () { lSeed++; drawLba(); });
  drawLba();

  // ---- 5. bootstrap ----
  function build(n1, n2, n3, total, seed) {        // an alignment of four sequences made from column counts
    var r = rng(seed), cols = [], i, p, j, t;
    function pick() { var x = Math.floor(r() * 4); return [x, (x + 1 + Math.floor(r() * 3)) % 4]; }
    [n1, n2, n3].forEach(function (n, q) {
      for (i = 0; i < n; i++) { p = pick(); cols.push(q === 0 ? [p[0], p[0], p[1], p[1]] : q === 1 ? [p[0], p[1], p[0], p[1]] : [p[0], p[1], p[1], p[0]]); }
    });
    while (cols.length < total) { p = pick(); cols.push(r() < 0.5 ? [p[0], p[0], p[0], p[1]] : [p[0], p[0], p[0], p[0]]); }
    for (i = cols.length - 1; i > 0; i--) { j = Math.floor(r() * (i + 1)); t = cols[i]; cols[i] = cols[j]; cols[j] = t; }
    return cols;
  }
  var DATA = [
    { t: 'Data set 1: a clear case, 30 columns', cols: build(8, 1, 0, 30, 5) },
    { t: 'Data set 2: a weak case, 30 columns', cols: build(3, 2, 1, 30, 6) },
    { t: 'Data set 3: long-branch data, 2000 columns', cols: sim(rng(111), 2000, SET4[1].bl) }
  ];
  function bootstrap(cols, B, seed) {
    var r = rng(seed), c = cols.map(cls), n = c.length, win = [0, 0, 0], present = 0, b, i, k, m, tie, j, seen;
    for (b = 0; b < B; b++) {
      k = [0, 0, 0, 0]; seen = new Uint8Array(n);
      for (i = 0; i < n; i++) { j = Math.floor(r() * n); k[c[j]]++; seen[j] = 1; }
      for (i = 0; i < n; i++) present += seen[i];
      m = Math.max(k[1], k[2], k[3]); tie = [];
      for (j = 1; j < 4; j++) if (k[j] === m) tie.push(j - 1);
      win[tie[Math.floor(r() * tie.length)]]++;
    }
    return { win: win, present: present / (B * n) };
  }
  var BN = 1000, bootRes = DATA.map(function (d, q) { return bootstrap(d.cols, BN, 40 + q); });
  (function () {
    var box = $('b-boot'), top3;
    DATA.forEach(function (d, q) {
      var k = count(d.cols), res = bootRes[q];
      var p = panel(box, d.t, q === 2 ? 'b-wrong' : ''), svg = svgBox(p, 230, 80, d.t);
      NAMES.forEach(function (nm, i) {
        var y = 4 + i * 24, bw = 80 * res.win[i] / BN;
        text(svg, 4, y + 11, nm + (i === 0 ? ' (true)' : ''));
        el('rect', { x: 100, y: y, width: Math.max(1, bw), height: 14, style: 'fill:' + (i === 0 ? 'var(--good)' : 'var(--bad)') }, svg);
        text(svg, 100 + bw + 4, y + 11, pct(res.win[i], BN));
      });
      para(p, 'Votes: ' + k[1] + ' AB|CD, ' + k[2] + ' AC|BD, ' + k[3] + ' AD|BC. Bars: share of ' + BN + ' resamples with that branch.');
      if (q === 2) top3 = { i: res.win.indexOf(Math.max.apply(null, res.win)), s: Math.max.apply(null, res.win) / BN };
    });
    $('b-bootmsg').innerHTML = 'A resample of data set 1 contains on average ' + (100 * bootRes[0].present).toFixed(0) + ' % of the original columns. Data set 3 gives ' + NAMES[top3.i] + ' ' + (100 * top3.s).toFixed(0) + ' % support, though the true tree has ' + NAMES[0] + '. High support is not proof.';
  })();
  var rr = rng(77);
  $('b-draw1').addEventListener('click', function () {
    var cols = DATA[0].cols, n = cols.length, hit = [], i, present = 0, CW = 20, k = [0, 0, 0, 0];
    for (i = 0; i < n; i++) hit.push(0);
    for (i = 0; i < n; i++) hit[Math.floor(rr() * n)]++;
    var box = $('b-strip');
    box.textContent = '';
    var svg = svgBox(box, n * CW + 8, 46, 'How many times each of the 30 original columns was drawn');
    hit.forEach(function (h, j) {
      var q = cls(cols[j]);
      if (h) present++;
      k[q] += h;
      el('rect', { x: 4 + j * CW, y: 4, width: CW - 2, height: 22, style: 'fill:' + (q ? COL[q - 1] : 'var(--line)') + ';opacity:' + (h ? 0.9 : 0.25) }, svg);
      text(svg, 4 + j * CW + CW / 2 - 1, 20, String(h), 'middle');
      text(svg, 4 + j * CW + CW / 2 - 1, 40, String(j + 1), 'middle', 9, 'var(--muted)');
    });
    var m = Math.max(k[1], k[2], k[3]), w = [1, 2, 3].filter(function (j) { return k[j] === m; });
    $('b-stripinfo').innerHTML = 'Each cell is one column; the number is how often it was drawn (0 = left out). This resample contains ' + present + ' of the ' + n + ' original columns (' + pct(present, n) + '). Votes: ' + k[1] + ' for AB|CD, ' + k[2] + ' for AC|BD, ' + k[3] + ' for AD|BC, so ' + (w.length === 1 ? 'the tree has ' + NAMES[w[0] - 1] + '.' : 'it is a tie.');
  });

  // ---- 6. gene trees ----
  var GT = [0, 0.5, 1.5, 3], iSeed = 1, G = 3000;
  var GTN = ['((A,B),C)', '((A,C),B)', '((B,C),A)'];
  function drawIls() {
    var box = $('b-ils'), shares = [];
    box.textContent = '';
    GT.forEach(function (T, q) {
      var r = rng(iSeed * 100 + q), cnt = [0, 0, 0], g, t;
      for (g = 0; g < G; g++) {
        t = T > 0 ? -Math.log(1 - r()) : Infinity;
        cnt[t < T ? 0 : Math.floor(r() * 3)]++;
      }
      shares.push(cnt);
      var d = panel(box, 'Internal branch T = ' + T + (T === 0 ? ' (no time)' : ' coalescent units'));
      var svg = svgBox(d, 230, 130, 'Species tree and the shares of three gene trees');
      var tx = 120, ux = tx - 30, rx = ux - T * 20;
      line(svg, rx, 15, rx, 40); line(svg, rx, 15, ux, 15); line(svg, rx, 40, tx, 40);
      line(svg, ux, 8, ux, 22); line(svg, ux, 8, tx, 8); line(svg, ux, 22, tx, 22);
      text(svg, tx + 5, 12, 'A'); text(svg, tx + 5, 26, 'B'); text(svg, tx + 5, 44, 'C');
      GTN.forEach(function (nm, i) {
        var y = 54 + i * 22, bw = 90 * cnt[i] / G;
        text(svg, 4, y + 11, nm);
        el('rect', { x: 70, y: y, width: Math.max(1, bw), height: 14, style: 'fill:' + (i === 0 ? 'var(--good)' : 'var(--bad)') }, svg);
        text(svg, 70 + bw + 4, y + 11, pct(cnt[i], G));
      });
      para(d, 'Match: <b>' + pct(cnt[0], G) + '</b>');
    });
    $('b-ilsmsg').innerHTML = '' + G + ' simulated genes on the species tree ((A,B),C); green: the matching gene tree. At T = 0 the three gene trees get ' + pct(shares[0][0], G) + ', ' + pct(shares[0][1], G) + ' and ' + pct(shares[0][2], G) + '. At T = 3 the matching share is ' + pct(shares[3][0], G) + '. The genes really have these histories.';
  }
  $('b-ils-new').addEventListener('click', function () { iSeed++; drawIls(); });
  drawIls();
})();
