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
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function press(ids, on) { ids.forEach(function (id) { var b = $(id); if (b) b.setAttribute('aria-pressed', String(id === on)); }); }

  // =====================================================================
  // (a) Bloom pre-filter: sizing rule of scfish2.c, 3 bits in one 64-bit word
  // =====================================================================
  (function () {
    var slider = $('s05-bl-n'), bar = $('s05-bl-bar'), read = $('s05-bl-read'), word = $('s05-bl-word'), out = $('s05-bl-out');
    if (!slider || !bar || !read || !word || !out) return;
    var TESTS = 1000000, LIB = 84051642 * 2 * 132;   // pairs x 2 reads x (151 - 20 + 1) k-mers
    var lines = 6624, lo, hi, nW, stored, seed, pick = 0;

    function rng(a) {                                // mulberry32
      return function () {
        a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return (t ^ (t >>> 14)) >>> 0;
      };
    }
    function pow2(x) { var p = 1; while (p < x) p *= 2; return p; }
    // one simulated hash: a word and three bit positions, as bmix/bbits give
    function draw(r) { var a = r(), b = r(); return [a % nW, b & 63, (b >>> 6) & 63, (b >>> 12) & 63]; }
    function setBit(w, p) { if (p < 32) lo[w] |= (1 << p); else hi[w] |= (1 << (p - 32)); }
    function getBit(w, p) { return p < 32 ? (lo[w] >>> p) & 1 : (hi[w] >>> (p - 32)) & 1; }
    function passes(h) { return getBit(h[0], h[1]) && getBit(h[0], h[2]) && getBit(h[0], h[3]); }

    function build() {
      var keys = Math.ceil(lines / 2);
      nW = pow2(Math.floor(lines / 4) + 64);
      lo = new Uint32Array(nW); hi = new Uint32Array(nW);
      stored = [];
      var r = rng(12345);
      for (var i = 0; i < keys; i++) {
        var h = draw(r);
        setBit(h[0], h[1]); setBit(h[0], h[2]); setBit(h[0], h[3]);
        if (i < 500) stored.push(h);                 // a few real anchors for the step view
      }
      var q = rng(777), pass = 0;
      for (var t = 0; t < TESTS; t++) if (passes(draw(q))) pass++;
      seed = rng(4242);
      return { keys: keys, pass: pass, slots: pow2(2 * lines + 16) };
    }

    function size(b) { return b >= 1048576 ? (b / 1048576).toFixed(b >= 10485760 ? 0 : 1) + ' MB' : Math.round(b / 1024) + ' KB'; }

    function drawBar(pass) {
      clear(bar);
      var X0 = 10, X1 = 890, W = X1 - X0, pw = Math.max(3, W * pass / TESTS);
      el('rect', { x: X0, y: 6, width: W - pw, height: 28, style: 'fill:var(--good);fill-opacity:.3' }, bar);
      el('rect', { x: X1 - pw, y: 6, width: pw, height: 28, style: 'fill:var(--bad)' }, bar);
      el('text', { x: X0 + 8, y: 25, 'class': 'lab' }, bar, 'stopped by the filter: no hash lookup');
      el('text', { x: X0, y: 52, 'class': 'lab' }, bar, 'passed on to the hash set: ' + (100 * pass / TESTS).toFixed(pass < 10000 ? 3 : 2) + ' %');
    }

    function update() {
      var b = build(), pct = b.pass / TESTS;
      $('s05-bl-nv').textContent = fmt(lines);
      drawBar(b.pass);
      read.innerHTML =
        '<div><b>' + (100 * (1 - pct)).toFixed(pct < 0.01 ? 3 : 2) + ' %</b>of hash lookups skipped (' + fmt(TESTS - b.pass) + ' of ' + fmt(TESTS) + ' k-mers)</div>' +
        '<div><b>' + size(nW * 8) + ' / ' + size(b.slots * 8) + '</b>filter size / hash set size</div>' +
        '<div><b>' + (b.keys / nW).toFixed(2) + '</b>different anchors per 64-bit word (' + fmt(nW) + ' words)</div>' +
        '<div><b>' + (LIB * pct / 1e6).toFixed(LIB * pct < 1e8 ? 1 : 0) + ' million</b>lookups left, of 22 billion k-mers in the whole library</div>';
      showWord(draw(seed), 'plain');
    }

    function showWord(h, kind) {
      clear(word);
      var C = 16, Y = [6, 32], X0 = 14, probe = {}, i;
      probe[h[1]] = 1; probe[h[2]] = 1; probe[h[3]] = 1;
      for (i = 0; i < 64; i++) {
        var x = X0 + (i % 32) * C, y = Y[i < 32 ? 0 : 1], set = getBit(h[0], i), st;
        if (probe[i]) st = 'fill:' + (set ? 'var(--good)' : 'var(--bad)') + ';stroke:var(--fg);stroke-width:1.5';
        else st = 'fill:' + (set ? 'var(--accent)' : 'var(--panel)') + ';stroke:var(--line);stroke-width:1';
        el('rect', { x: x, y: y, width: C - 2, height: 20, rx: 2, style: st }, word);
      }
      el('text', { x: X0, y: 72, 'class': 'lab' }, word, 'filter word ' + fmt(h[0]) + ' of ' + fmt(nW) + ', its 64 bits');
      if (!passes(h)) out.innerHTML = '<b>Stopped.</b> At least one test bit is empty, so this k-mer was never stored. The answer "no" is certain and the hash set is not touched.';
      else if (kind === 'anchor') out.innerHTML = '<b>Passed, and found.</b> All three test bits are set, as they must be for a stored anchor. The hash set confirms it, and this read pair is kept.';
      else out.innerHTML = '<b>False alarm.</b> All three test bits are set, but by other anchors that happen to share this word. The filter says "maybe", the hash set finds no such key, and the answer is still "no". The cost is one wasted lookup.';
    }

    var P = ['s05-bl-p1', 's05-bl-p2'];
    slider.addEventListener('input', function () { lines = Math.round(Math.pow(10, +slider.value)); press(P, ''); update(); });
    $('s05-bl-p1').addEventListener('click', function () { lines = 6624; slider.value = Math.log10(lines); press(P, P[0]); update(); });
    $('s05-bl-p2').addEventListener('click', function () { lines = 792638; slider.value = Math.log10(lines); press(P, P[1]); update(); });
    $('s05-bl-next').addEventListener('click', function () { showWord(draw(seed), 'plain'); });
    $('s05-bl-anchor').addEventListener('click', function () { pick = (pick + 1) % stored.length; showWord(stored[pick], 'anchor'); });
    $('s05-bl-false').addEventListener('click', function () {
      for (var i = 0; i < 20000000; i++) { var h = draw(seed); if (passes(h)) { showWord(h, 'plain'); return; } }
      out.textContent = 'No false alarm in 20 million k-mers.';
    });
    update();
  })();

  // =====================================================================
  // (b) pipeline: all stages at once, the slowest sets the speed
  // =====================================================================
  (function () {
    var svg = $('s05-pp-svg'), ctl = $('s05-pp-ctl'), read = $('s05-pp-read'), out = $('s05-pp-out');
    if (!svg || !ctl || !read || !out) return;
    var MB = 57000, LMIN = 1.5, LMAX = 4;            // MB of unpacked data; log10 slider range
    var names = ['read', 'decompress', 'split into records', 'scan', 'write hits'];
    var CASES = [
      { id: 's05-pp-c0', r: [3000, 652, 176, 100, 10000], why: 'Lab notes: 16 grep processes at about 6 MB/s each with hundreds of thousands of anchors, so about 100 MB/s. Decompress = two pigz streams, 2 × 326. That run used a bigger data set, so the time shown here was not measured.' },
      { id: 's05-pp-c1', r: [3000, 1670, 176, 4000, 10000], why: 'Lab notes: one paste | awk at about 176 MB/s. Decompress = two igzip streams, 2 × 835. This gives the measured 324 s.' },
      { id: 's05-pp-c2', r: [3000, 2378, 725, 8000, 10000], why: 'Lab notes: a whole-run speed of 725 MB/s, which they put down to the line reader. Decompress = two rapidgzip streams, 2 × 1,189. This gives the measured 79 s.' }
    ];
    var ids = CASES.map(function (c) { return c.id; });
    var rate = CASES[1].r.slice(), why = CASES[1].why, sl = [], ov = [];
    names.forEach(function (n, i) {
      var lab = document.createElement('label');
      lab.textContent = n + ' (MB/s)';
      var o = document.createElement('output'), s = document.createElement('input');
      s.type = 'range'; s.min = LMIN; s.max = LMAX; s.step = 0.01; s.id = 's05-pp-s' + i;
      s.setAttribute('aria-label', n + ' speed, logarithmic scale');
      lab.appendChild(o); lab.appendChild(s); ctl.appendChild(lab);
      sl.push(s); ov.push(o);
      s.addEventListener('input', function () {
        rate[i] = Math.round(Math.pow(10, +s.value));
        press(ids, ''); why = ''; draw();
      });
    });
    function time(s) { return s >= 3600 ? (s / 3600).toFixed(1) + ' h' : s >= 120 ? (s / 60).toFixed(1) + ' min (' + fmt(s) + ' s)' : fmt(s) + ' s'; }

    function draw() {
      var flow = Math.min.apply(null, rate), lim = rate.indexOf(flow);
      var next = Math.min.apply(null, rate.filter(function (r, i) { return i !== lim; }));
      rate.forEach(function (r, i) { ov[i].textContent = fmt(r); sl[i].value = Math.log10(r); });
      clear(svg);
      var MID = 100, HMAX = 150, BW = 140, GAP = 32, X0 = 18;
      var hh = function (r) { return 10 + (HMAX - 10) * (Math.log10(r) - LMIN) / (LMAX - LMIN); };
      var fh = hh(flow);
      el('rect', { x: X0, y: MID - fh / 2, width: 5 * BW + 4 * GAP, height: fh, style: 'fill:var(--accent);fill-opacity:.32' }, svg);
      rate.forEach(function (r, i) {
        var x = X0 + i * (BW + GAP), h = hh(r), isLim = i === lim;
        el('rect', { x: x, y: MID - h / 2, width: BW, height: h, rx: 3,
          style: 'fill:none;stroke:' + (isLim ? 'var(--bad)' : 'var(--muted)') + ';stroke-width:' + (isLim ? 2.5 : 1.2) }, svg);
        el('text', { x: x + BW / 2, y: 14, 'text-anchor': 'middle', 'class': 'lab' }, svg, names[i]);
        el('text', { x: x + BW / 2, y: 196, 'text-anchor': 'middle', 'class': 'lab' }, svg, fmt(r) + ' MB/s');
        el('text', { x: x + BW / 2, y: 214, 'text-anchor': 'middle', style: isLim ? 'fill:var(--bad)' : '' }, svg, isLim ? 'always busy: the limit' : 'busy ' + Math.round(100 * flow / r) + ' %');
      });
      el('text', { x: X0, y: 240 }, svg, 'height of a stage = its speed (log scale); blue band = what actually flows');
      read.innerHTML =
        '<div><b>' + fmt(flow) + ' MB/s</b>speed of the whole line</div>' +
        '<div><b>' + time(MB / flow) + '</b>for 57 GB of unpacked reads</div>' +
        '<div><b>' + names[lim] + '</b>the slowest stage</div>';
      out.innerHTML = (why ? why + ' ' : '') + 'Speeding up any other stage changes nothing. Making <b>' + names[lim] + '</b> faster helps only until it reaches ' +
        fmt(next) + ' MB/s (' + time(MB / next) + '); then the next stage is the limit.';
    }
    CASES.forEach(function (c) {
      $(c.id).addEventListener('click', function () {
        rate = c.r.slice(); why = c.why;
        press(ids, c.id); draw();
      });
    });
    draw();
  })();
})();
