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
  // Dynamic programming with affine gaps. A gap of k letters costs open + k * ext.
  // p = {match, mis, open, ext}; match > 0, mis <= 0, open and ext >= 0 (whole numbers).
  // local = true: Smith-Waterman (floor of 0, free ends). local = false: Needleman-Wunsch rule.
  // H = best score ending in this cell. E = best ending in a gap down the column (a letter of A
  // against nothing), F = best ending in a gap along the row. Ek, Fk = length of that gap.
  var NEG = -1e9;
  function fillMatrix(a, b, p, local) {
    var n = a.length, m = b.length, H = [], E = [], F = [], Ek = [], Fk = [], i, j;
    for (i = 0; i <= n; i++) {
      H.push(new Array(m + 1).fill(0)); E.push(new Array(m + 1).fill(NEG)); F.push(new Array(m + 1).fill(NEG));
      Ek.push(new Array(m + 1).fill(0)); Fk.push(new Array(m + 1).fill(0));
    }
    if (!local) {
      for (i = 1; i <= n; i++) { H[i][0] = E[i][0] = -(p.open + i * p.ext); Ek[i][0] = i; }
      for (j = 1; j <= m; j++) { H[0][j] = F[0][j] = -(p.open + j * p.ext); Fk[0][j] = j; }
    }
    var best = local ? 0 : NEG, bi = 0, bj = 0, ties = 0;
    for (i = 1; i <= n; i++) for (j = 1; j <= m; j++) {
      var open1 = H[i - 1][j] - p.open - p.ext, ext1 = E[i - 1][j] - p.ext;
      if (open1 >= ext1) { E[i][j] = open1; Ek[i][j] = 1; } else { E[i][j] = ext1; Ek[i][j] = Ek[i - 1][j] + 1; }
      open1 = H[i][j - 1] - p.open - p.ext; ext1 = F[i][j - 1] - p.ext;
      if (open1 >= ext1) { F[i][j] = open1; Fk[i][j] = 1; } else { F[i][j] = ext1; Fk[i][j] = Fk[i][j - 1] + 1; }
      var d = H[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? p.match : p.mis);
      var h = Math.max(d, E[i][j], F[i][j]);
      if (local && h < 0) h = 0;
      H[i][j] = h;
      if (local) {
        if (h > best) { best = h; bi = i; bj = j; ties = 1; } else if (h === best && h > 0) ties++;
      }
    }
    if (!local) { best = H[n][m]; bi = n; bj = m; ties = 1; }
    return { H: H, E: E, F: F, Ek: Ek, Fk: Fk, best: best, bi: bi, bj: bj, ties: ties, n: n, m: m };
  }
  // Walk back from the best cell. Ties: diagonal first, then column gap, then row gap.
  function traceback(R, a, b, p, local) {
    var i = R.bi, j = R.bj, st = 'H', A = '', B = '', path = [[i, j]];
    while (true) {
      if (st === 'H') {
        if (local ? R.H[i][j] <= 0 : (i === 0 && j === 0)) break;
        if (i > 0 && j > 0 && R.H[i][j] === R.H[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? p.match : p.mis)) {
          A = a[i - 1] + A; B = b[j - 1] + B; i--; j--; path.push([i, j]);
        } else if (i > 0 && R.H[i][j] === R.E[i][j]) st = 'E';
        else st = 'F';
      } else if (st === 'E') {
        var backH = R.E[i][j] === R.H[i - 1][j] - p.open - p.ext;
        A = a[i - 1] + A; B = '-' + B; i--; path.push([i, j]);
        if (backH) st = 'H';
      } else {
        var backH2 = R.F[i][j] === R.H[i][j - 1] - p.open - p.ext;
        A = '-' + A; B = b[j - 1] + B; j--; path.push([i, j]);
        if (backH2) st = 'H';
      }
    }
    return { A: A, B: B, path: path, startI: i, startJ: j };
  }
  // Lambda of ungapped Karlin-Altschul statistics for equal base frequencies:
  // solves 1/4 e^(match L) + 3/4 e^(mis L) = 1. Returns 0 if the expected score is not negative.
  function lambdaDNA(match, mis) {
    if (match + 3 * mis >= 0) return 0;
    var lo = 1e-9, hi = 20, c, it;
    for (it = 0; it < 200; it++) {
      c = (lo + hi) / 2;
      if (0.25 * Math.exp(match * c) + 0.75 * Math.exp(mis * c) - 1 > 0) hi = c; else lo = c;
    }
    return (lo + hi) / 2;
  }
  // ENGINE-END

  // =====================================================================
  // (a) dot plots: the same two toy sequences, word length 1 and word length 8
  // =====================================================================
  (function () {
    var h1 = $('s06-dot1'), h8 = $('s06-dot8');
    if (!h1 || !h8) return;
    var r = rng(61), A = '', i, L = 'ACGT';
    for (i = 0; i < 110; i++) A += L[Math.floor(r() * 4)];
    function rc(s) {
      var c = { A: 'T', C: 'G', G: 'C', T: 'A' }, o = '';
      for (var q = s.length - 1; q >= 0; q--) o += c[s[q]];
      return o;
    }
    // B = A with a deletion, a tandem duplication and an inverted piece
    var B = A.slice(0, 30) + A.slice(42, 70) + A.slice(56, 70) + rc(A.slice(70, 90)) + A.slice(90);
    var Bm = B.split('');
    [17, 100].forEach(function (q) { Bm[q] = L[(L.indexOf(Bm[q]) + 1) % 4]; });
    B = Bm.join('');
    var Brc = rc(B), n = A.length, m = B.length, S = 3, M = 22;
    function sq(x, y) { return 'M' + (M + x * S) + ' ' + (M + y * S) + 'h' + S + 'v' + S + 'h-' + S + 'z'; }
    function plot(host, k, showRev) {
      var svg = el('svg', { viewBox: '0 0 ' + (m * S + M + 6) + ' ' + (n * S + M + 6), width: '100%', style: 'min-width:260px;max-width:420px', role: 'img', 'aria-label': 'Dot plot of two toy sequences with word length ' + k }, host);
      el('rect', { x: M, y: M, width: m * S, height: n * S, fill: 'none', stroke: 'var(--line)' }, svg);
      el('text', { x: M + m * S / 2, y: 12, 'text-anchor': 'middle' }, svg, 'sequence B');
      el('text', { x: 12, y: M + n * S / 2, 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + (M + n * S / 2) + ')' }, svg, 'sequence A');
      var fwd = '', rev = '', x, y;
      for (y = 0; y + k <= n; y++) {
        var w = A.substr(y, k);
        for (x = 0; x + k <= m; x++) {
          if (B.substr(x, k) === w) fwd += sq(x, y);
          // word of A equals the reverse complement of the word of B starting at x
          if (showRev && Brc.substr(m - k - x, k) === w) rev += sq(x, y);
        }
      }
      el('path', { d: fwd, fill: 'var(--accent)' }, svg);
      if (rev) el('path', { d: rev, fill: 'var(--het)' }, svg);
      return svg;
    }
    plot(h1, 1, false);
    var s8 = plot(h8, 8, true);
    // numbered marks: position (B, A) of each feature
    [[8, 8, '1'], [30, 44, '2'], [50, 62, '3'], [68, 66, '3'], [84, 80, '4']].forEach(function (f) {
      var cx = M + f[0] * S + 12, cy = M + f[1] * S - 10;
      el('circle', { cx: cx, cy: cy, r: 7.5, fill: 'var(--panel)', stroke: 'var(--fg)' }, s8);
      el('text', { x: cx, y: cy + 3.6, 'text-anchor': 'middle', class: 'lab' }, s8, f[2]);
    });
  })();

  // =====================================================================
  // (b) Smith-Waterman matrix
  // =====================================================================
  (function () {
    var host = $('s06-mat'); if (!host) return;
    var P = {
      paper: { a: 'AAUGCCAUUGACGG', b: 'CAGCCUCGCUUAG', match: 3, mis: -1, open: 3, ext: 1 },
      dna: { a: 'ACGTTGCAAGTCCGA', b: 'TTACGTTGCGTCCGATT', match: 5, mis: -4, open: 12, ext: 4 }
    };
    var ctl = { match: $('s06-match'), mis: $('s06-mis'), open: $('s06-open'), ext: $('s06-ext') };
    var inA = $('s06-a'), inB = $('s06-b'), info = $('s06-cell'), aln = $('s06-aln'), glob = $('s06-glob');
    var a, b, p, R, T, filled = 0, showTrace = true, sel = null, CELL = 36, OFF = 46;

    function num(x) { return x < 0 ? '−' + (-x) : String(x); }
    function readParams() {
      p = { match: +ctl.match.value, mis: +ctl.mis.value, open: +ctl.open.value, ext: +ctl.ext.value };
      $('s06-match-o').textContent = '+' + p.match;
      $('s06-mis-o').textContent = num(p.mis);
      $('s06-open-o').textContent = p.open;
      $('s06-ext-o').textContent = p.ext;
    }
    function clean(s) { return s.toUpperCase().replace(/[^ACGTU]/g, '').slice(0, 18); }
    function compute() {
      a = clean(inA.value); b = clean(inB.value);
      if (a.length < 2) a = 'ACGT';
      if (b.length < 2) b = 'ACGT';
      readParams();
      R = fillMatrix(a, b, p, true);
      T = traceback(R, a, b, p, true);
    }
    function total() { return R.n * R.m; }
    function isFilled(i, j) { return (i - 1) * R.m + j <= filled; }

    function draw() {
      host.textContent = '';
      var n = R.n, m = R.m, w = OFF + (m + 1) * CELL + 4, h = OFF + (n + 1) * CELL + 4;
      var svg = el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', style: 'min-width:' + Math.round(w * 0.82) + 'px;max-width:' + Math.round(w * 1.3) + 'px', role: 'img', 'aria-label': 'Smith-Waterman score matrix' }, host);
      var i, j, onPath = {}, top = Math.max(R.best, 1), done = filled === total();
      if (showTrace && done) T.path.forEach(function (c) { onPath[c[0] + ',' + c[1]] = 1; });
      var src = [];
      if (sel && isFilled(sel[0], sel[1])) {
        src.push([sel[0] - 1, sel[1] - 1]);
        src.push([sel[0] - R.Ek[sel[0]][sel[1]], sel[1]]);
        src.push([sel[0], sel[1] - R.Fk[sel[0]][sel[1]]]);
      }
      function X(c) { return OFF + c * CELL; }
      for (j = 1; j <= m; j++) el('text', { x: X(j) + CELL / 2, y: OFF - 12, 'text-anchor': 'middle', class: 'lab', style: 'font-size:14px;font-weight:600' }, svg, b[j - 1]);
      for (i = 1; i <= n; i++) el('text', { x: OFF - 14, y: X(i) + CELL / 2 + 5, 'text-anchor': 'middle', class: 'lab', style: 'font-size:14px;font-weight:600' }, svg, a[i - 1]);
      for (i = 0; i <= n; i++) for (j = 0; j <= m; j++) {
        var known = i === 0 || j === 0 || isFilled(i, j), v = R.H[i][j];
        var g = el('g', { 'data-i': i, 'data-j': j, style: i && j ? 'cursor:pointer' : '' }, svg);
        var isBest = known && done && R.best > 0 && i === R.bi && j === R.bj;
        var rect = el('rect', { x: X(j) + 1, y: X(i) + 1, width: CELL - 2, height: CELL - 2, fill: isBest ? 'var(--het)' : 'var(--accent)', 'fill-opacity': isBest ? 0.55 : (known ? 0.5 * v / top : 0), stroke: 'var(--line)' }, g);
        if (onPath[i + ',' + j]) { rect.setAttribute('stroke', 'var(--het)'); rect.setAttribute('stroke-width', 2.5); }
        if (sel && sel[0] === i && sel[1] === j) { rect.setAttribute('stroke', 'var(--bad)'); rect.setAttribute('stroke-width', 2.5); }
        else if (src.some(function (c) { return c[0] === i && c[1] === j; })) { rect.setAttribute('stroke', 'var(--bad)'); rect.setAttribute('stroke-dasharray', '4 3'); rect.setAttribute('stroke-width', 1.5); }
        if (known) el('text', { x: X(j) + CELL / 2, y: X(i) + CELL / 2 + 4.5, 'text-anchor': 'middle', class: 'lab s06-v', style: 'font-size:13px' + (onPath[i + ',' + j] ? ';font-weight:700' : '') }, g, String(v));
      }
    }

    function cellText(i, j) {
      var H = R.H, s = a[i - 1] === b[j - 1] ? p.match : p.mis, d = H[i - 1][j - 1] + s, ek = R.Ek[i][j], fk = R.Fk[i][j];
      var o = 'Cell: row ' + i + ' (' + a[i - 1] + '), column ' + j + ' (' + b[j - 1] + ')\n';
      o += 'from the diagonal: ' + H[i - 1][j - 1] + (s < 0 ? ' − ' + (-s) : ' + ' + s) + ' = ' + num(d) + (a[i - 1] === b[j - 1] ? '  (match)' : '  (mismatch)') + '\n';
      o += 'gap, from above:   ' + H[i - ek][j] + ' − (' + p.open + ' + ' + ek + '×' + p.ext + ') = ' + num(R.E[i][j]) + '  (gap of ' + ek + ')\n';
      o += 'gap, from left:    ' + H[i][j - fk] + ' − (' + p.open + ' + ' + fk + '×' + p.ext + ') = ' + num(R.F[i][j]) + '  (gap of ' + fk + ')\n';
      o += 'start afresh:      0\n';
      o += 'largest of the four: ' + H[i][j];
      return o;
    }
    function midline(A, B) {
      return A.split('').map(function (c, k) { return c === B[k] ? '|' : (c === '-' || B[k] === '-' ? ' ' : '.'); }).join('');
    }
    function showAlign() {
      var done = filled === total(), ident = 0, gaps = 0, q;
      for (q = 0; q < T.A.length; q++) { if (T.A[q] === T.B[q]) ident++; if (T.A[q] === '-' || T.B[q] === '-') gaps++; }
      $('s06-r-best').textContent = done ? String(R.best) : '…';
      $('s06-r-id').textContent = done ? (T.A.length ? ident + ' of ' + T.A.length + ' columns' + (gaps ? ', ' + gaps + ' in gaps' : '') : 'no alignment') : '…';
      var ex = (p.match + 3 * p.mis) / 4;
      $('s06-r-ex').textContent = num(ex);
      var L = lambdaDNA(p.match, p.mis), warn = $('s06-r-warn');
      if (L > 0) {
        $('s06-r-tgt').textContent = 'about ' + Math.round(25 * Math.exp(p.match * L)) + ' %';
        warn.textContent = '';
      } else {
        $('s06-r-tgt').textContent = 'none';
        warn.textContent = ex > 0 ? 'The expected score of a random pair is above zero: alignments now run towards the sequence ends, and the local alignment statistics below no longer hold.' : 'The expected score of a random pair is exactly zero. That was the choice in 1981; the statistics below need it to be negative.';
      }
      if (done && showTrace && T.A.length) {
        var l1 = String(T.startI + 1), l2 = String(T.startJ + 1), wd = Math.max(l1.length, l2.length), pad = '';
        while (l1.length < wd) l1 = ' ' + l1;
        while (l2.length < wd) l2 = ' ' + l2;
        while (pad.length < wd + 3) pad += ' ';
        aln.textContent = 'A ' + l1 + ' ' + T.A + '\n' + pad + midline(T.A, T.B) + '\nB ' + l2 + ' ' + T.B;
      } else if (done && !T.A.length) aln.textContent = 'No alignment scores above zero.';
      else aln.textContent = 'Press Traceback to see the alignment.';
      var G = fillMatrix(a, b, p, false), GT = traceback(G, a, b, p, false);
      glob.textContent = 'A ' + GT.A + '\n  ' + midline(GT.A, GT.B) + '\nB ' + GT.B;
      $('s06-glob-s').textContent = num(G.best);
    }
    function refresh() {
      draw(); showAlign();
      $('s06-pos').textContent = filled + ' of ' + total() + ' cells filled';
      if (sel && isFilled(sel[0], sel[1])) info.textContent = cellText(sel[0], sel[1]);
      else if (filled === total()) info.textContent = 'Click any cell to see how its value was chosen.';
      else info.textContent = 'Press Next cell. Each new cell needs only the cells above it and to its left.';
    }
    function mark(name) {
      $('s06-pre-paper').setAttribute('aria-pressed', String(name === 'paper'));
      $('s06-pre-dna').setAttribute('aria-pressed', String(name === 'dna'));
      $('s06-scale').hidden = name !== 'paper';
    }
    function setPreset(name) {
      var q = P[name];
      inA.value = q.a; inB.value = q.b;
      ctl.match.value = q.match; ctl.mis.value = q.mis; ctl.open.value = q.open; ctl.ext.value = q.ext;
      compute(); filled = total(); showTrace = true; sel = null; refresh(); mark(name);
    }
    function changed() {
      mark('');
      var full = filled >= total();
      compute();
      filled = full ? total() : Math.min(filled, total());
      sel = null; refresh();
    }
    Object.keys(ctl).forEach(function (k) { ctl[k].addEventListener('input', changed); });
    inA.addEventListener('change', changed); inB.addEventListener('change', changed);
    $('s06-pre-paper').addEventListener('click', function () { setPreset('paper'); });
    $('s06-pre-dna').addEventListener('click', function () { setPreset('dna'); });
    $('s06-clear').addEventListener('click', function () { filled = 0; sel = null; refresh(); });
    $('s06-next').addEventListener('click', function () {
      if (filled >= total()) filled = 0;
      filled++;
      sel = [Math.floor((filled - 1) / R.m) + 1, (filled - 1) % R.m + 1];
      refresh();
    });
    $('s06-all').addEventListener('click', function () { filled = total(); sel = null; showTrace = false; refresh(); });
    $('s06-trace').addEventListener('click', function () { filled = total(); sel = null; showTrace = true; refresh(); });
    host.addEventListener('click', function (e) {
      var g = e.target.closest ? e.target.closest('g[data-i]') : null;
      if (!g) return;
      var i = +g.getAttribute('data-i'), j = +g.getAttribute('data-j');
      if (!i || !j || !isFilled(i, j)) return;
      sel = [i, j]; refresh();
    });
    setPreset('paper');
  })();
})();
