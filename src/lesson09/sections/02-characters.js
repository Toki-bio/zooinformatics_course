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

  // ---------- Part 1: orthologs and paralogs ----------
  // ENGINE-O-BEGIN
  // Gene tree: a duplication (D) at the root, then one species split (S) inside each copy.
  var TREE = { id: 'D', type: 'dup', kids: [
    { id: 'S1', type: 'spec', kids: [{ id: 'X1', leaf: 1 }, { id: 'Y1', leaf: 1 }] },
    { id: 'S2', type: 'spec', kids: [{ id: 'X2', leaf: 1 }, { id: 'Y2', leaf: 1 }] }
  ] };
  function leavesOf(n) { return n.leaf ? [n.id] : n.kids.reduce(function (a, k) { return a.concat(leavesOf(k)); }, []); }
  // The oldest event that joins two leaves = the lowest node that has both below it.
  function joinNode(n, a, b) {
    if (!n.leaf) for (var i = 0; i < n.kids.length; i++) {
      var l = leavesOf(n.kids[i]);
      if (l.indexOf(a) >= 0 && l.indexOf(b) >= 0) return joinNode(n.kids[i], a, b);
    }
    return n;
  }
  function relation(a, b) { return joinNode(TREE, a, b).type === 'spec' ? 'orthologs' : 'paralogs'; }
  // ENGINE-O-END

  var POS = { X1: [470, 45], Y1: [470, 85], X2: [470, 165], Y2: [470, 205], S1: [320, 65], S2: [320, 185], D: [120, 125] };
  var svg = $('s02-orth'), picked = [], leafG = {}, nodeG = {};
  function line(x1, y1, x2, y2, st) { el('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: st || 'var(--muted)', 'stroke-width': 2 }, svg); }
  function elbow(p, c) { line(p[0], p[1], p[0], c[1]); line(p[0], c[1], c[0], c[1]); }
  (function drawTree() {
    el('rect', { x: 0, y: 0, width: 560, height: 250, fill: 'none' }, svg);
    [['S1', 'X1'], ['S1', 'Y1'], ['S2', 'X2'], ['S2', 'Y2'], ['D', 'S1'], ['D', 'S2']].forEach(function (e) { elbow(POS[e[0]], POS[e[1]]); });
    ['D', 'S1', 'S2'].forEach(function (id) {
      var p = POS[id], g = el('g', {}, svg), isDup = id === 'D';
      nodeG[id] = isDup ? el('rect', { x: p[0] - 9, y: p[1] - 9, width: 18, height: 18, fill: 'var(--het)', stroke: 'var(--bg)', 'stroke-width': 2 }, g)
        : el('circle', { cx: p[0], cy: p[1], r: 10, fill: 'var(--accent)', stroke: 'var(--bg)', 'stroke-width': 2 }, g);
      el('text', { x: p[0] + 16, y: p[1] + 4, 'font-size': 12, fill: 'var(--muted)' }, g, isDup ? 'duplication' : 'species split');
    });
    var names = { X1: 'gene X1 (species X)', Y1: 'gene Y1 (species Y)', X2: 'gene X2 (species X)', Y2: 'gene Y2 (species Y)' };
    ['X1', 'Y1', 'X2', 'Y2'].forEach(function (id) {
      var p = POS[id];
      var g = el('g', { tabindex: 0, role: 'button', 'aria-pressed': 'false', 'aria-label': names[id], style: 'cursor:pointer' }, svg);
      el('rect', { x: p[0] - 4, y: p[1] - 17, width: 86, height: 34, fill: 'transparent' }, g);
      leafG[id] = el('circle', { cx: p[0], cy: p[1], r: 8, fill: 'var(--panel)', stroke: 'var(--fg)', 'stroke-width': 2 }, g);
      el('text', { x: p[0] + 16, y: p[1] + 5, 'font-size': 14, 'font-weight': 700, fill: 'var(--fg)' }, g, id);
      g.addEventListener('click', function () { pick(id); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(id); } });
      leafG[id].parentNode.setAttribute('data-id', id);
    });
    el('text', { x: 120, y: 240, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--muted)' }, svg, 'older');
    el('text', { x: 470, y: 240, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--muted)' }, svg, 'present day');
  })();
  function paintO() {
    Object.keys(leafG).forEach(function (id) {
      var on = picked.indexOf(id) >= 0;
      leafG[id].setAttribute('fill', on ? 'var(--bad)' : 'var(--panel)');
      leafG[id].parentNode.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    Object.keys(nodeG).forEach(function (id) { nodeG[id].setAttribute('stroke', 'var(--bg)'); nodeG[id].setAttribute('stroke-width', 2); });
    if (picked.length === 2) {
      var j = joinNode(TREE, picked[0], picked[1]), rel = relation(picked[0], picked[1]);
      nodeG[j.id].setAttribute('stroke', 'var(--bad)'); nodeG[j.id].setAttribute('stroke-width', 4);
      $('s02-o-pair').textContent = picked[0] + ' and ' + picked[1];
      $('s02-o-kind').textContent = rel;
      var sameSp = picked[0][0] === picked[1][0];
      $('s02-o-why').textContent = 'They meet at a ' + (j.type === 'spec' ? 'species split' : 'duplication') + '. ' +
        (rel === 'orthologs' ? 'The two copies separated because the species separated, so they are orthologs.'
          : 'The two copies separated because the gene was copied, so they are paralogs' + (sameSp ? ', and both live in species ' + picked[0][0] + '.' : ', even though they live in different species.'));
    } else {
      $('s02-o-pair').textContent = picked.length ? picked[0] + ' and ...' : 'none yet';
      $('s02-o-kind').textContent = 'click two genes';
    }
  }
  function pick(id) {
    if (picked.length === 2) picked = [];
    if (picked.indexOf(id) < 0) picked.push(id);
    paintO();
  }
  $('s02-o-ctl').addEventListener('click', function () {
    // Written by hand, not by the join rule: genes with the same number are the two copies of one lineage.
    var expect = { 'X1,Y1': 'orthologs', 'X2,Y2': 'orthologs', 'X1,X2': 'paralogs', 'X1,Y2': 'paralogs', 'Y1,X2': 'paralogs', 'Y1,Y2': 'paralogs' };
    var ids = ['X1', 'Y1', 'X2', 'Y2'], ok = 0, n = 0;
    for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) {
      n++;
      var got = relation(ids[i], ids[j]), got2 = relation(ids[j], ids[i]);
      if (got === expect[ids[i] + ',' + ids[j]] && got2 === got) ok++;
    }
    $('s02-o-ctlout').textContent = 'Control: ' + ok + ' of ' + n + ' pairs agree with the hand-written list (both orders)' + (ok === n ? '. Passed.' : '. FAILED.');
  });

  // ---------- Part 2: the alignment toy ----------
  var START = ['ATGCCCTAAGATCAGTTACAAA', 'ATGCCCTAAGATC--TCACGAA', 'ACGCCCTAGGGTCAGTTACGAA', 'ACGC-CTAGGATCAGTTATGAG'];
  var L = START[0].length, N = START.length;
  // Hand-counted at the start (columns compared, differences), pairs in the order 1-2, 1-3, 1-4, 2-3, 2-4, 3-4.
  var HAND = [[20, 2], [22, 4], [21, 5], [20, 4], [19, 5], [21, 3]];
  var PAIRS = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];

  // ENGINE-BEGIN
  // rows: array of N arrays of single characters ('-' = gap). trim: array of L booleans (true = removed).
  // A pair is compared in the columns that are not trimmed and where neither sequence has a dash.
  function pairStats(rows, trim) {
    var out = [];
    PAIRS.forEach(function (p) {
      var cmp = 0, diff = 0;
      for (var c = 0; c < L; c++) {
        if (trim[c]) continue;
        var x = rows[p[0]][c], y = rows[p[1]][c];
        if (x === '-' || y === '-') continue;
        cmp++; if (x !== y) diff++;
      }
      out.push([cmp, diff]);
    });
    return out;
  }
  function colState(rows, c) {
    var cnt = {}, gap = false, k;
    for (var r = 0; r < N; r++) { var ch = rows[r][c]; if (ch === '-') gap = true; else cnt[ch] = (cnt[ch] || 0) + 1; }
    var states = Object.keys(cnt), twoPlus = 0;
    for (k = 0; k < states.length; k++) if (cnt[states[k]] >= 2) twoPlus++;
    return { gap: gap, constant: !gap && states.length === 1, informative: twoPlus >= 2 };
  }
  // Slide the gap run of row r by one step (dir = -1 left, +1 right). The letters of the row keep their order.
  function slide(row, dir) {
    var s = row.indexOf('-'), e = row.lastIndexOf('-');
    if (s < 0) return false;
    if (dir < 0) { if (s === 0) return false; row[e] = row[s - 1]; row[s - 1] = '-'; return true; }
    if (e === row.length - 1) return false; row[s] = row[e + 1]; row[e + 1] = '-'; return true;
  }
  // ENGINE-END

  // Control: a second routine written differently (strings, zip, filter, reduce) for the same numbers.
  function pairStatsAlt(rows, trim) {
    var strs = rows.map(function (r) { return r.filter(function (_, c) { return !trim[c]; }).join(''); });
    return PAIRS.map(function (p) {
      var zipped = Array.from(strs[p[0]]).map(function (ch, i) { return [ch, strs[p[1]][i]]; })
        .filter(function (z) { return z[0] !== '-' && z[1] !== '-'; });
      return [zipped.length, zipped.reduce(function (a, z) { return a + (z[0] === z[1] ? 0 : 1); }, 0)];
    });
  }
  function rngMake(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  var rows, trim, sel = 1, moved = [0, 0];     // sel: row index of the gap being moved (1 or 3)
  var startStats = pairStats(START.map(function (s) { return s.split(''); }), new Array(L).fill(false));
  function reset() { rows = START.map(function (s) { return s.split(''); }); trim = new Array(L).fill(false); moved = [0, 0]; }
  reset();

  function render() {
    var box = $('s02-aln'); box.textContent = '';
    var wrap = document.createElement('div'); wrap.className = 's02-grid';
    var head = document.createElement('div'); head.className = 's02-row';
    var lab = document.createElement('span'); lab.className = 's02-name'; lab.textContent = 'column'; head.appendChild(lab);
    for (var c = 0; c < L; c++) (function (c) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 's02-h' + (trim[c] ? ' s02-tr' : '');
      b.textContent = c + 1; b.setAttribute('aria-pressed', trim[c] ? 'true' : 'false');
      b.setAttribute('aria-label', 'Column ' + (c + 1) + (trim[c] ? ', trimmed. Click to restore' : '. Click to trim'));
      b.addEventListener('click', function () { trim[c] = !trim[c]; render(); });
      head.appendChild(b);
    })(c);
    wrap.appendChild(head);
    var states = [];
    for (c = 0; c < L; c++) states.push(colState(rows, c));
    for (var r = 0; r < N; r++) {
      var rw = document.createElement('div'); rw.className = 's02-row';
      var nm = document.createElement('span'); nm.className = 's02-name'; nm.textContent = 'seq ' + (r + 1); rw.appendChild(nm);
      for (c = 0; c < L; c++) {
        var s = document.createElement('span'), st = states[c];
        s.className = 's02-c' + (trim[c] ? ' s02-tr' : st.gap ? ' s02-gap' : st.constant ? '' : ' s02-var') + (r === sel && rows[r][c] === '-' ? ' s02-sel' : '');
        s.textContent = rows[r][c]; rw.appendChild(s);
      }
      wrap.appendChild(rw);
    }
    var inf = document.createElement('div'); inf.className = 's02-row';
    var il = document.createElement('span'); il.className = 's02-name'; il.textContent = 'informative'; inf.appendChild(il);
    for (c = 0; c < L; c++) { var m = document.createElement('span'); m.className = 's02-c s02-i' + (trim[c] ? ' s02-tr' : ''); m.textContent = states[c].informative ? 'i' : ''; inf.appendChild(m); }
    wrap.appendChild(inf);
    box.appendChild(wrap);

    var ps = pairStats(rows, trim), kept = 0, ik = 0;
    for (c = 0; c < L; c++) if (!trim[c]) { kept++; if (states[c].informative) ik++; }
    $('s02-r-kept').textContent = kept + ' of ' + L;
    $('s02-r-inf').textContent = ik;
    $('s02-r-moved').textContent = 'seq 2: ' + signed(moved[0]) + '; seq 4: ' + signed(moved[1]);
    var tb = $('s02-tbody'); tb.textContent = '';
    PAIRS.forEach(function (p, i) {
      var tr = document.createElement('tr'), d = ps[i][1] - startStats[i][1];
      var pd = ps[i][0] ? (100 * ps[i][1] / ps[i][0]).toFixed(1) + ' %' : 'no columns';
      [ 'seq ' + (p[0] + 1) + ' and ' + (p[1] + 1), ps[i][0], ps[i][1], pd,
        startStats[i][1] + (d ? ' (now ' + (d > 0 ? '+' : '') + d + ')' : ' (same)') ].forEach(function (t) {
        var td = document.createElement('td'); td.textContent = t; tr.appendChild(td); });
      tb.appendChild(tr);
    });
  }
  function signed(n) { return n > 0 ? '+' + n : String(n); }

  function setSel(r) { sel = r; $('s02-g2').setAttribute('aria-pressed', r === 1 ? 'true' : 'false'); $('s02-g4').setAttribute('aria-pressed', r === 3 ? 'true' : 'false'); render(); }
  $('s02-g2').addEventListener('click', function () { setSel(1); });
  $('s02-g4').addEventListener('click', function () { setSel(3); });
  function doSlide(dir) { if (slide(rows[sel], dir)) moved[sel === 1 ? 0 : 1] += dir; render(); }
  $('s02-left').addEventListener('click', function () { doSlide(-1); });
  $('s02-right').addEventListener('click', function () { doSlide(1); });
  $('s02-trgap').addEventListener('click', function () { for (var c = 0; c < L; c++) if (colState(rows, c).gap) trim[c] = true; render(); });
  $('s02-trconst').addEventListener('click', function () { for (var c = 0; c < L; c++) if (colState(rows, c).constant) trim[c] = true; render(); });
  $('s02-reset').addEventListener('click', function () { reset(); render(); });

  $('s02-ctl').addEventListener('click', function () {
    var rnd = rngMake(2), bad = 0, trials = 300, letters = 0, i, c, r;
    for (i = 0; i < trials; i++) {
      var rr = START.map(function (s) { return s.split(''); }), tt = new Array(L).fill(false);
      var steps = Math.floor(rnd() * 8);
      for (var k = 0; k < steps; k++) slide(rr[rnd() < 0.5 ? 1 : 3], rnd() < 0.5 ? -1 : 1);
      for (c = 0; c < L; c++) tt[c] = rnd() < 0.3;
      if (JSON.stringify(pairStats(rr, tt)) !== JSON.stringify(pairStatsAlt(rr, tt))) bad++;
      for (r = 0; r < N; r++) if (rr[r].join('').replace(/-/g, '') !== START[r].replace(/-/g, '')) letters++;
    }
    var startOk = JSON.stringify(startStats) === JSON.stringify(HAND);
    var allOk = bad === 0 && letters === 0 && startOk;
    $('s02-ctlout').textContent = 'Control: ' + (trials - bad) + ' of ' + trials + ' random cases agree between the two routines; ' +
      'letters changed by sliding: ' + letters + '; start table equals hand count: ' + (startOk ? 'yes' : 'NO') + (allOk ? '. Passed.' : '. FAILED.');
  });
  render();
})();
