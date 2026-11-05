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
  function clear(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function rng(seed) { // mulberry32: repeatable random numbers
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randSeq(n, r, alpha) {
    var s = '', A = alpha || 'ACGT';
    for (var i = 0; i < n; i++) s += A[Math.floor(r() * A.length)];
    return s;
  }

  // === core: BWT and FM search (also run by the Node control) ===
  // text t ends with '$'; suffixes are sorted with '$' first.
  function suffixArray(t) {
    var sa = [];
    for (var i = 0; i < t.length; i++) sa.push(i);
    sa.sort(function (a, b) {
      var x = t.slice(a), y = t.slice(b);
      return x < y ? -1 : (x > y ? 1 : 0);
    });
    return sa;
  }
  function bwtOf(t, sa) {
    var L = '';
    for (var i = 0; i < sa.length; i++) L += t[(sa[i] + t.length - 1) % t.length];
    return L;
  }
  function cTable(L) { // C[a] = number of letters in L that sort before a
    var C = {}, letters = L.split('').sort(), i;
    for (i = letters.length - 1; i >= 0; i--) C[letters[i]] = i;
    return C;
  }
  function occ(L, a, i) { // how many a in the first i rows of L
    var n = 0;
    for (var j = 0; j < i; j++) if (L[j] === a) n++;
    return n;
  }
  function invert(L) { // rebuild the text from the last column alone
    var C = cTable(L), row = 0, out = '';
    for (var i = 0; i < L.length - 1; i++) {
      var a = L[row];
      out = a + out;
      row = C[a] + occ(L, a, row);
    }
    return out + '$';
  }
  function backward(L, p) { // list of states; rows are start <= row < end
    var C = cTable(L), s = 0, e = L.length, steps = [{ s: s, e: e, a: null }];
    for (var i = p.length - 1; i >= 0 && s < e; i--) {
      var a = p[i];
      if (C[a] === undefined) { steps.push({ s: 0, e: 0, a: a, ps: s, pe: e, c: null, os: 0, oe: 0 }); s = e = 0; break; }
      var os = occ(L, a, s), oe = occ(L, a, e), ps = s, pe = e;
      s = C[a] + os; e = C[a] + oe;
      steps.push({ s: s, e: e, a: a, ps: ps, pe: pe, c: C[a], os: os, oe: oe });
    }
    return steps;
  }
  function brute(t, p) { // plain scan
    var hits = [];
    for (var i = 0; i + p.length <= t.length; i++) if (t.substr(i, p.length) === p) hits.push(i);
    return hits;
  }
  function fmSearch(t, p) { // positions found through the FM steps and the suffix array
    var sa = suffixArray(t), L = bwtOf(t, sa), st = backward(L, p), last = st[st.length - 1];
    if (st.length !== p.length + 1 && last.s >= last.e) return [];
    return sa.slice(last.s, last.e).sort(function (x, y) { return x - y; });
  }
  // === core: minimizers, after minimap2 sketch.c ===
  var NT = { A: 0, C: 1, G: 2, T: 3 };
  function hash64(key, mask) { // sketch.c hash64; BigInt so that the shifts match 64-bit C
    key = (~key + (key << 21n)) & mask;
    key = key ^ (key >> 24n);
    key = ((key + (key << 3n)) + (key << 8n)) & mask;
    key = key ^ (key >> 14n);
    key = ((key + (key << 2n)) + (key << 4n)) & mask;
    key = key ^ (key >> 28n);
    key = (key + (key << 31n)) & mask;
    return key;
  }
  function kmers(s, k) { // canonical k-mers; symmetric ones skipped as in mm_sketch
    var mask = (1n << BigInt(2 * k)) - 1n, shift = BigInt(2 * (k - 1));
    var f = 0n, r = 0n, out = [];
    for (var i = 0; i < s.length; i++) {
      var c = BigInt(NT[s[i]]);
      f = ((f << 2n) | c) & mask;
      r = (r >> 2n) | ((3n ^ c) << shift);
      if (i < k - 1) continue;
      if (f === r) continue;
      out.push({ pos: i - k + 1, h: hash64(f < r ? f : r, mask) });
    }
    return out;
  }
  function minimizers(km, w) { // indices into km: smallest hash of each window, ties kept
    var keep = {}, i, j;
    var last = Math.max(0, km.length - w);
    for (i = 0; i <= last && km.length; i++) {
      var end = Math.min(i + w, km.length), m = km[i].h;
      for (j = i + 1; j < end; j++) if (km[j].h < m) m = km[j].h;
      for (j = i; j < end; j++) if (km[j].h === m) keep[j] = 1;
    }
    return Object.keys(keep).map(Number).sort(function (a, b) { return a - b; });
  }
  // === end core ===

  // =====================================================================
  // (a) BWT table and backward-search stepper
  // =====================================================================
  (function () {
    var svg = $('s08-bwt-svg'), inT = $('s08-text'), inP = $('s08-pat');
    if (!svg || !inT || !inP) return;
    var read = $('s08-bwt-read'), out = $('s08-bwt-out'), inv = $('s08-bwt-inv');
    var prev = $('s08-prev'), next = $('s08-next');
    var st = null, cur = 0;

    function clean(s) { return s.toUpperCase().replace(/[^ACGT]/g, ''); }

    function build() {
      var t = clean(inT.value).slice(0, 20), p = clean(inP.value).slice(0, 10);
      if (!t) t = 'A';
      if (!p) p = 'A';
      var T = t + '$', sa = suffixArray(T), L = bwtOf(T, sa);
      st = { t: t, p: p, T: T, sa: sa, L: L, steps: backward(L, p) };
      cur = 0;
      var back = invert(L);
      inv.innerHTML = 'Last column <code>' + L + '</code>. Rebuilt from that column alone with the last-first rule: <code>' + back + '</code>. ' +
        (back === T ? 'This is the sequence you typed.' : 'This differs from your sequence: the code has a bug.');
      draw();
    }

    function draw() {
      var T = st.T, n = T.length, sa = st.sa, L = st.L, S = st.steps[cur];
      var done = cur === st.steps.length - 1;
      var found = done && st.steps.length === st.p.length + 1 && S.e > S.s;
      var CW = 18, RH = 20, X0 = 74, Y0 = 62, XG = X0 + n * CW, XF = XG + 118;
      var W = Math.max(XF + 40, 560), H = Y0 + n * RH + 8;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      clear(svg);
      var hits = found ? sa.slice(S.s, S.e) : [];
      function hitAt(i) { return hits.some(function (h) { return i >= h && i < h + st.p.length; }); }
      // the sequence on top
      el('text', { x: 6, y: 20, 'class': 'lab' }, svg, 'sequence');
      for (var i = 0; i < n; i++) {
        var x = X0 + i * CW;
        if (hitAt(i)) el('rect', { x: x, y: 6, width: CW, height: 19, style: 'fill:var(--good);fill-opacity:.3' }, svg);
        el('text', { x: x + CW / 2, y: 20, 'text-anchor': 'middle', 'class': 'lab' }, svg, T[i]);
      }
      // column heads
      var hy = Y0 - 8;
      el('text', { x: 6, y: hy }, svg, 'row');
      el('text', { x: 36, y: hy }, svg, 'SA');
      el('text', { x: X0 + CW / 2, y: hy, 'text-anchor': 'middle', 'class': 'lab' }, svg, 'F');
      el('text', { x: XG - CW / 2, y: hy, 'text-anchor': 'middle', 'class': 'lab' }, svg, 'L');
      el('text', { x: XF + CW / 2, y: hy, 'text-anchor': 'middle', 'class': 'lab' }, svg, 'F');
      var letters = T.split('').sort();
      for (var r = 0; r < n; r++) {
        var y = Y0 + r * RH, inside = r >= S.s && r < S.e;
        if (inside) el('rect', { x: 0, y: y, width: XG, height: RH - 1, style: 'fill:var(--accent);fill-opacity:.18' }, svg);
        el('text', { x: 6, y: y + 14 }, svg, String(r));
        el('text', { x: 36, y: y + 14, 'class': inside ? 'lab' : '' }, svg, String(sa[r]));
        for (var c = 0; c < n; c++) {
          var ch = T[(sa[r] + c) % n];
          var edge = c === 0 || c === n - 1;
          var isHit = S.a !== null && S.a !== undefined && c === n - 1 && r >= S.ps && r < S.pe && ch === S.a;
          if (isHit) el('rect', { x: X0 + c * CW + 1, y: y + 1, width: CW - 2, height: RH - 3, rx: 2, style: 'fill:var(--het);fill-opacity:.45' }, svg);
          el('text', { x: X0 + c * CW + CW / 2, y: y + 14, 'text-anchor': 'middle', 'class': edge ? 'lab' : '', style: edge ? 'font-weight:600' : 'opacity:.55' }, svg, ch);
        }
        if (inside) el('rect', { x: XF, y: y, width: CW, height: RH - 1, style: 'fill:var(--accent);fill-opacity:.18' }, svg);
        el('text', { x: XF + CW / 2, y: y + 14, 'text-anchor': 'middle', 'class': 'lab', style: 'font-weight:600' }, svg, letters[r]);
      }
      // lines: L letters of this step -> their rows in F
      if (S.a && S.c !== null) {
        var rank = S.os, q;
        for (q = S.ps; q < S.pe; q++) {
          if (L[q] !== S.a) continue;
          var to = S.c + rank; rank++;
          var y1 = Y0 + q * RH + 9, y2 = Y0 + to * RH + 9;
          el('path', { d: 'M' + (XG + 2) + ' ' + y1 + ' C' + (XG + 56) + ' ' + y1 + ' ' + (XF - 56) + ' ' + y2 + ' ' + (XF - 2) + ' ' + y2, style: 'fill:none;stroke:var(--het);stroke-width:1.6' }, svg);
        }
      }
      prev.disabled = cur === 0;
      next.disabled = done;
      // readouts
      var readSoFar = st.p.slice(st.p.length - cur);
      var count = Math.max(0, S.e - S.s);
      read.innerHTML = '<div><b>' + (cur ? readSoFar : '(none yet)') + '</b>part of ' + st.p + ' read so far</div>' +
        '<div><b>' + (count ? S.s + ' to ' + (S.e - 1) : 'empty') + '</b>rows of the interval</div>' +
        '<div><b>' + count + '</b>' + (count === 1 ? 'row, so 1 place' : 'rows, so that many places') + ' (counted without looking anything up in the sequence)</div>';
      var msg;
      if (cur === 0) {
        msg = 'Start: nothing read yet, so the interval is the whole table, rows 0 to ' + (n - 1) + '. The word is read from its last letter, <code>' + st.p[st.p.length - 1] + '</code>.';
      } else if (S.c === null) {
        msg = 'There is no <code>' + S.a + '</code> anywhere in the sequence, so <code>C(' + S.a + ')</code> has no block to point to. The word does not occur.';
      } else {
        msg = 'Letter <code>' + S.a + '</code>. <code>C(' + S.a + ') = ' + S.c + '</code>: that many letters sort before it. ' +
          '<code>Occ(' + S.a + ', ' + S.ps + ') = ' + S.os + '</code> and <code>Occ(' + S.a + ', ' + S.pe + ') = ' + S.oe + '</code>: the number of ' + S.a + ' in column L above row ' + S.ps + ' and above row ' + S.pe + '. ' +
          'New start ' + S.c + ' + ' + S.os + ' = ' + S.s + '; new end ' + S.c + ' + ' + S.oe + ' = ' + S.e + '.';
        if (S.e <= S.s) msg += ' <b>Empty interval:</b> <code>' + S.a + readSoFar.slice(1) + '</code> does not occur, so the search stops here. No letter after this one needs reading.';
      }
      if (found) {
        var pos = sa.slice(S.s, S.e).sort(function (a, b) { return a - b; });
        var chk = brute(st.T, st.p).join(',') === pos.join(',');
        msg += ' <b>Done.</b> The suffix array values of these rows give the positions (counted from 0): ' + pos.join(', ') + '. ' +
          (chk ? 'A plain scan of the sequence finds the same places.' : 'A plain scan disagrees: the code has a bug.');
      }
      out.innerHTML = msg;
    }

    next.addEventListener('click', function () { if (cur < st.steps.length - 1) { cur++; draw(); } });
    prev.addEventListener('click', function () { if (cur > 0) { cur--; draw(); } });
    $('s08-reset').addEventListener('click', function () { cur = 0; draw(); });
    inT.addEventListener('input', build);
    inP.addEventListener('input', build);
    build();

    // the control named in the lesson plan, run on request
    $('s08-ctl').addEventListener('click', function () {
      var r = rng(20261105), nT = 3000, nP = 0, badInv = 0, badFM = 0, withHits = 0;
      for (var i = 0; i < nT; i++) {
        var alpha = i % 3 === 0 ? 'AC' : 'ACGT';
        var t = randSeq(1 + Math.floor(r() * 60), r, alpha) + '$';
        var L = bwtOf(t, suffixArray(t));
        if (invert(L) !== t) badInv++;
        for (var j = 0; j < 4; j++) {
          var p, len = 1 + Math.floor(r() * 6);
          if (j % 2 && t.length - 1 >= len) { var at = Math.floor(r() * (t.length - len)); p = t.substr(at, len); }
          else p = randSeq(len, r, 'ACGT');
          nP++;
          var a = fmSearch(t, p), b = brute(t, p);
          if (b.length) withHits++;
          if (a.join(',') !== b.join(',')) badFM++;
        }
      }
      $('s08-ctl-out').textContent = fmt(nT) + ' random sequences rebuilt from their BWT: ' + badInv + ' wrong. ' +
        fmt(nP) + ' word searches (' + fmt(withHits) + ' with at least one hit) compared with a plain scan: ' + badFM + ' differences.';
    });
  })();

  // =====================================================================
  // (b) minimizer picker
  // =====================================================================
  (function () {
    var svg = $('s08-min-svg'), kI = $('s08-k'), wI = $('s08-w'), pI = $('s08-p');
    if (!svg || !kI || !wI || !pI) return;
    var read = $('s08-min-read'), out = $('s08-min-out');
    var LEN = 120, BIG = 40000, seed = 7, seq = '', big = '';
    var X0 = 30, CW = 7, bigCache = {}, timer = null;

    function newSeq() {
      var r = rng(seed);
      seq = randSeq(LEN, r);
      big = randSeq(BIG, rng(seed + 1000));
      bigCache = {};
    }
    function bigDensity(k, w) {
      var key = k + ',' + w;
      if (bigCache[key] === undefined) {
        var km = kmers(big, k);
        bigCache[key] = minimizers(km, w).length / km.length;
      }
      return bigCache[key];
    }
    function pct(x) { return (100 * x).toFixed(1) + ' %'; }

    function draw() {
      var k = +kI.value, w = +wI.value;
      $('s08-kv').textContent = k;
      $('s08-wv').textContent = w;
      var km = kmers(seq, k), keep = minimizers(km, w);
      var nWin = Math.max(1, km.length - w + 1);
      pI.max = nWin - 1;
      if (+pI.value > nWin - 1) pI.value = nWin - 1;
      var p = +pI.value;
      $('s08-pv').textContent = (p + 1) + ' of ' + nWin;
      clear(svg);
      var sx = function (i) { return X0 + i * CW; };
      var win = km.slice(p, p + w);
      var a = win[0].pos, b = win[win.length - 1].pos + k;
      var mh = win[0].h, i;
      win.forEach(function (x) { if (x.h < mh) mh = x.h; });
      // window band
      el('rect', { x: sx(a), y: 22, width: (b - a) * CW, height: 96, style: 'fill:var(--accent);fill-opacity:.12;stroke:var(--accent);stroke-width:1' }, svg);
      // ruler and letters
      for (i = 0; i <= LEN; i += 20) el('text', { x: sx(i), y: 14, 'text-anchor': 'middle' }, svg, String(i));
      win.forEach(function (x) {
        if (x.h === mh) el('rect', { x: sx(x.pos), y: 24, width: k * CW, height: 14, style: 'fill:var(--het);fill-opacity:.45' }, svg);
      });
      for (i = 0; i < LEN; i++) el('text', { x: sx(i) + CW / 2, y: 35, 'text-anchor': 'middle', 'class': 'lab', style: 'font-size:9.5px' }, svg, seq[i]);
      // hash bars at each k-mer's start
      var top = 44, base = 114, maxH = Number((1n << BigInt(2 * k)) - 1n);
      win.forEach(function (x) {
        var h = Math.max(1.5, (base - top) * Number(x.h) / maxH);
        el('rect', { x: sx(x.pos) + 0.5, y: base - h, width: CW - 1, height: h, style: 'fill:' + (x.h === mh ? 'var(--het)' : 'var(--accent)') + ';fill-opacity:' + (x.h === mh ? 1 : 0.55) }, svg);
      });
      el('line', { x1: X0, x2: sx(LEN), y1: base, y2: base, 'class': 'ax' }, svg);
      // kept marks
      el('text', { x: X0, y: 140, 'class': 'lab' }, svg, 'start of every kept minimizer (' + keep.length + ')');
      el('line', { x1: X0, x2: sx(LEN), y1: 160, y2: 160, 'class': 'ax' }, svg);
      keep.forEach(function (j) {
        var x = km[j];
        el('line', { x1: sx(x.pos) + CW / 2, x2: sx(x.pos) + CW / 2, y1: 150, y2: 170, style: 'stroke:var(--rep);stroke-width:2' }, svg);
      });
      win.forEach(function (x) {
        if (x.h === mh) el('rect', { x: sx(x.pos), y: 176, width: k * CW, height: 6, style: 'fill:var(--het)' }, svg);
      });
      el('text', { x: sx(LEN), y: 194, 'text-anchor': 'end' }, svg, 'orange bar: the k-mer this window keeps');

      var dens = keep.length / km.length, th = 2 / (w + 1);
      function render(dbig) {
        read.innerHTML = '<div><b>' + keep.length + ' of ' + km.length + '</b>k-mers kept in these 120 bases</div>' +
          '<div><b>' + pct(dens) + '</b>density in these 120 bases</div>' +
          '<div><b>' + (dbig === null ? '…' : pct(dbig)) + '</b>density in 40,000 random bases</div>' +
          '<div><b>' + pct(th) + '</b>the expected 2/(w+1)</div>' +
          '<div><b>' + (w + k - 1) + ' bases</b>exact match that is sure to share a minimizer (w + k − 1)</div>';
      }
      var key = k + ',' + w;
      render(bigCache[key] === undefined ? null : bigCache[key]);
      if (bigCache[key] === undefined) {
        clearTimeout(timer);
        timer = setTimeout(function () { render(bigDensity(k, w)); }, 80);
      }
      var kept = win.filter(function (x) { return x.h === mh; });
      out.innerHTML = 'This window holds ' + win.length + ' k-mer' + (win.length === 1 ? '' : 's') + ' on bases ' + (a + 1) + ' to ' + b + '. Smallest hash: the k-mer starting at base ' + kept.map(function (x) { return x.pos + 1; }).join(' and ') + ', <code>' + seq.substr(kept[0].pos, k) + '</code>' +
        (kept.length > 1 ? ' (a tie, so both are kept)' : '') + '. ' +
        (w === 1 ? 'With w = 1 every window is a single k-mer, so every k-mer is kept and nothing is saved.' :
          'Move the window one step: it usually keeps the same k-mer, until that k-mer drops out at the left.') +
        ' A genome of 3 billion bases at this density would give about ' + fmt(Math.round(3e9 * th / 1e6)) + ' million index entries (our arithmetic).';
    }
    [kI, wI, pI].forEach(function (c) { c.addEventListener('input', draw); });
    $('s08-new').addEventListener('click', function () { seed++; newSeq(); draw(); });
    newSeq();
    draw();
  })();

  // =====================================================================
  // (c) chaining figure (static, invented anchors)
  // =====================================================================
  (function () {
    var svg = $('s08-chain-svg');
    if (!svg) return;
    var X0 = 56, Y0 = 244, SX = 0.52, SY = 0.42;
    var px = function (x) { return X0 + x * SX; }, py = function (y) { return Y0 - y * SY; };
    el('line', { x1: X0, x2: 610, y1: Y0, y2: Y0, 'class': 'ax' }, svg);
    el('line', { x1: X0, x2: X0, y1: 10, y2: Y0, 'class': 'ax' }, svg);
    el('text', { x: 333, y: 270, 'text-anchor': 'middle', 'class': 'lab' }, svg, 'position on the reference');
    el('text', { x: 18, y: 127, 'text-anchor': 'middle', 'class': 'lab', transform: 'rotate(-90 18 127)' }, svg, 'position on the read');
    function anchor(x, y, col, wd) {
      el('line', { x1: px(x), y1: py(y), x2: px(x + 24), y2: py(y + 24), style: 'stroke:' + col + ';stroke-width:' + wd + ';stroke-linecap:round' }, svg);
    }
    var chain = [[150, 20], [190, 60], [225, 95], [270, 140], [300, 170], [395, 225], [430, 260], [470, 300], [505, 335], [545, 375], [590, 420]];
    var stray = [[60, 300], [640, 130], [840, 380], [420, 30], [760, 60], [130, 450]];
    chain.slice(0, -1).forEach(function (c, i) {
      var d = chain[i + 1];
      el('line', { x1: px(c[0] + 24), y1: py(c[1] + 24), x2: px(d[0]), y2: py(d[1]), style: 'stroke:var(--accent);stroke-width:1;stroke-dasharray:3 3' }, svg);
    });
    chain.forEach(function (c) { anchor(c[0], c[1], 'var(--accent)', 3.5); });
    stray.forEach(function (c) { anchor(c[0], c[1], 'var(--err)', 3); });
    el('text', { x: px(345), y: py(135), 'class': 'lab' }, svg, 'deletion in the read:');
    el('text', { x: px(345), y: py(135) + 14, 'class': 'lab' }, svg, 'the chain steps sideways');
    el('text', { x: px(490), y: py(395), 'class': 'lab', 'text-anchor': 'end' }, svg, 'chain');
    el('text', { x: px(740), y: py(245), 'class': 'lab' }, svg, 'stray anchors');
  })();
})();
