(function () {
  /* s09: two toys.
     (1) a read from locus 1 scored against two near-identical repeat copies (+1 match, -4 mismatch =
         bwa mem defaults A=1, B=4; ungapped local score = best-scoring stretch).
     (2) toy MAPQ (simplified, invented) next to the bwa mem 0.7.19 mem_approx_mapq_se formula
         (single-end, default A=1 B=4, min seed length 19, mapQ_coef_len 50; sub_n and frac_rep left out). */
  var A = 1, B = 4, MINSEED = 19, COEF_LEN = 50, COEF_FAC = Math.log(50);

  /* ---------- pure functions (also exported for Node tests) ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function randSeq(n, R) { var s = ''; for (var i = 0; i < n; i++) s += 'ACGT'[Math.floor(R() * 4)]; return s; }
  var NEXT = { A: 'C', C: 'G', G: 'T', T: 'A' };

  var FL = 40, UL = 80, SITES = [18, 44, 67];               // unit positions that differ between copies
  function build() {
    var R = rng(909);
    var unit1 = randSeq(UL, R), u2 = unit1.split('');
    SITES.forEach(function (p) { u2[p] = NEXT[unit1[p]]; });
    var l1 = randSeq(FL, R) + unit1 + randSeq(FL, R);
    var l2 = randSeq(FL, R) + u2.join('') + randSeq(FL, R);
    return { l1: l1, l2: l2, sites: SITES.map(function (p) { return FL + p; }) };
  }
  var G = build();

  function localScore(read, ref, start) { // best-scoring ungapped stretch, +A match / -B mismatch
    var best = 0, cur = 0;
    for (var i = 0; i < read.length; i++) {
      cur += read[i] === ref[start + i] ? A : -B;
      if (cur < 0) cur = 0;
      if (cur > best) best = cur;
    }
    return best;
  }
  function makeRead(start, len, errs) { // read from locus 1; errs = set of read offsets with an error
    var out = '';
    for (var i = 0; i < len; i++) {
      var c = G.l1[start + i];
      if (errs[i]) {
        // error on a diagnostic site -> the other copy's letter (worst case); elsewhere the next letter
        c = G.l2[start + i] !== c ? G.l2[start + i] : NEXT[c];
      }
      out += c;
    }
    return out;
  }
  function toyQ(gap, m) { // toy: p(wrong) = m*2^-gap / (1 + m*2^-gap); Q = -10 log10 p, capped at 60
    var x = m * Math.pow(2, -gap), p = x / (1 + x);
    if (p <= 1e-6) return 60;
    return Math.min(60, Math.round(-10 * Math.log10(p)));
  }
  function bwaQ(l, score, second) { // mem_approx_mapq_se, sub_n = 0, frac_rep = 0
    var sub = second > 0 ? second : MINSEED * A;
    if (sub >= score) return 0;
    var identity = 1 - (l * A - score) / (A + B) / l;
    var tmp = l < COEF_LEN ? 1 : COEF_FAC / Math.log(l);
    tmp *= identity * identity;
    var q = Math.floor(6.02 * (score - sub) / A * tmp * tmp + 0.499);
    if (q > 60) q = 60;
    if (q < 0) q = 0;
    return q;
  }
  function evaluate(start, len, errs) {
    var read = makeRead(start, len, errs);
    var s1 = localScore(read, G.l1, start), s2 = localScore(read, G.l2, start);
    var gap = s1 - s2, best = s1 >= s2 ? 1 : 2;
    return { read: read, s1: s1, s2: s2, gap: gap, winner: gap === 0 ? 0 : best, q: gap === 0 ? toyQ(0, 1) : toyQ(Math.abs(gap), 1) };
  }
  var API = { build: build, G: G, localScore: localScore, makeRead: makeRead, toyQ: toyQ, bwaQ: bwaQ, evaluate: evaluate, SITES: SITES, FL: FL, UL: UL };
  if (typeof document === 'undefined') { if (typeof module !== 'undefined') module.exports = API; return; }

  /* ---------- page ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  var LAB = 9; // label width in characters
  function pad(s, n) { while (s.length < n) s += ' '; return s; }

  var errs = {};
  var start = $('s09-start'), len = $('s09-len');

  function syncLimits() {
    var L = +len.value;
    start.max = G.l1.length - L;
    if (+start.value > +start.max) start.value = start.max;
    $('s09-start-o').textContent = start.value;
    $('s09-len-o').textContent = L;
  }
  function render() {
    syncLimits();
    var s = +start.value, L = +len.value;
    var ev = evaluate(s, L, errs);
    var view = $('s09-view');
    view.textContent = '';
    function line(label, seq, offset, cls) {
      var d = document.createElement('div');
      d.appendChild(document.createTextNode(pad(label, LAB)));
      if (offset) d.appendChild(document.createTextNode(new Array(offset + 1).join(' ')));
      return d;
    }
    function refLine(label, seq, other) {
      var d = line(label, seq, 0);
      for (var i = 0; i < seq.length; i++) {
        var sp = document.createElement('span');
        sp.textContent = seq[i];
        var inUnit = i >= FL && i < FL + UL;
        var diag = G.sites.indexOf(i) >= 0;
        if (diag) sp.className = 'x';
        else if (inUnit) sp.className = 'a';
        else sp.style.opacity = '.55';
        d.appendChild(sp);
      }
      return d;
    }
    view.appendChild(refLine('locus 1', G.l1));
    var rd = line('read', '', s);
    for (var i = 0; i < L; i++) {
      var b = document.createElement('span');
      b.textContent = ev.read[i];
      b.setAttribute('role', 'button'); b.tabIndex = 0;
      b.setAttribute('aria-label', 'read base ' + (i + 1) + (errs[i] ? ', has an error; press to remove' : '; press to add an error'));
      b.style.cursor = 'pointer';
      if (errs[i]) { b.className = 'x'; b.style.textDecoration = 'underline'; } else b.className = 'h';
      (function (i) {
        b.addEventListener('click', function () { if (errs[i]) delete errs[i]; else errs[i] = 1; render(); });
        b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (errs[i]) delete errs[i]; else errs[i] = 1; render(); $('s09-view').querySelectorAll('[role=button]')[i].focus(); } });
      })(i);
      rd.appendChild(b);
    }
    view.appendChild(rd);
    view.appendChild(refLine('locus 2', G.l2));
    var mk = line('sites', '', 0), marks = '';
    for (var j = 0; j < G.l1.length; j++) marks += G.sites.indexOf(j) >= 0 ? '^' : ' ';
    mk.appendChild(document.createTextNode(marks));
    view.appendChild(mk);

    var ro = $('s09-out');
    var crossed = G.sites.filter(function (p) { return p >= s && p < s + L; }).length;
    var verdict;
    if (ev.gap === 0) verdict = 'tie: the aligner cannot tell the copies apart (Bowtie 2 picks one of tied places at random)';
    else if (ev.winner === 1) verdict = 'best place is locus 1: correct';
    else verdict = 'best place is locus 2: WRONG, and the gap makes it look confident';
    function cell(t, v) { return '<div>' + t + '<b>' + v + '</b></div>'; }
    ro.innerHTML = cell('score on locus 1', ev.s1) + cell('score on locus 2', ev.s2) +
      cell('gap (best minus second)', Math.abs(ev.gap)) +
      cell('<span class="tip" title="Simplified toy confidence from the next figure with two candidate places; not a real program\'s MAPQ.">toy confidence</span>', ev.q) +
      cell('sites crossed by the read', crossed + ' of 3') +
      '<div style="grid-column:1/-1">' + verdict + '</div>';
    $('s09-view').setAttribute('aria-label', 'Read start ' + s + ', length ' + L + '. Score on locus 1 ' + ev.s1 + ', on locus 2 ' + ev.s2 + '. ' + verdict);
  }
  function setRead(s, L, clear, errSite) {
    len.value = L; start.value = s;
    if (clear) errs = {};
    if (errSite) errSite.forEach(function (p) { errs[p - s] = 1; });
    render();
  }
  start.addEventListener('input', render);
  len.addEventListener('input', function () { errs = {}; render(); });
  $('s09-clear').addEventListener('click', function () { errs = {}; render(); });
  /* presets (unit starts at 40; sites at 58, 84, 107) */
  $('s09-p1').addEventListener('click', function () { setRead(60, 22, true); });
  $('s09-p2').addEventListener('click', function () { setRead(50, 30, true); });
  $('s09-p3').addEventListener('click', function () { setRead(20, 60, true); });
  $('s09-p4').addEventListener('click', function () { setRead(60, 60, true, [84, 107]); });

  /* ---------- figure 2 ---------- */
  var rl = $('s09-rl'), bs = $('s09-bs'), ss = $('s09-ss'), mm = $('s09-m');
  function render2() {
    var L = +rl.value;
    bs.max = L; if (+bs.value > L) bs.value = L;
    var best = +bs.value;
    ss.max = best; if (+ss.value > best) ss.value = best;
    var second = +ss.value, m = +mm.value;
    $('s09-rl-o').textContent = L; $('s09-bs-o').textContent = best;
    $('s09-ss-o').textContent = second ? second : 'none'; $('s09-m-o').textContent = m;
    var gap = second ? best - second : best - MINSEED * A;
    var tq = second ? toyQ(Math.max(0, gap), m) : 60, bq = bwaQ(L, best, second);
    function cell(t, v) { return '<div>' + t + '<b>' + v + '</b></div>'; }
    var note = best < 30 ? '<div style="grid-column:1/-1">bwa mem would not output this alignment: its minimum output score is 30 (<code>-T 30</code>).</div>' : '';
    $('s09-out2').innerHTML = cell('gap', second ? gap : 'no second place') +
      cell('toy MAPQ', tq) + cell('bwa mem formula', bq) +
      cell('toy chance of wrong place', second ? (100 * (m * Math.pow(2, -gap)) / (1 + m * Math.pow(2, -gap))).toFixed(2) + ' %' : '0 %') + note;
    /* plot: gap 0..40 on x, MAPQ 0..60 on y */
    var svg = $('s09-svg'); svg.textContent = '';
    var X0 = 44, X1 = 620, Y0 = 215, Y1 = 26, GM = 40;
    var sx = function (g) { return X0 + (X1 - X0) * g / GM; }, sy = function (q) { return Y0 - (Y0 - Y1) * q / 60; };
    [0, 10, 20, 30, 40, 50, 60].forEach(function (q) {
      el('line', { x1: X0, x2: X1, y1: sy(q), y2: sy(q), 'class': 'grid' }, svg);
      el('text', { x: X0 - 6, y: sy(q) + 4, 'text-anchor': 'end' }, svg, q);
    });
    [0, 10, 20, 30, 40].forEach(function (g) {
      el('text', { x: sx(g), y: Y0 + 16, 'text-anchor': 'middle' }, svg, g);
    });
    el('line', { x1: X0, x2: X1, y1: Y0, y2: Y0, 'class': 'ax' }, svg);
    el('line', { x1: X0, x2: X0, y1: Y0, y2: Y1, 'class': 'ax' }, svg);
    el('text', { x: (X0 + X1) / 2, y: 244, 'text-anchor': 'middle' }, svg, 'score gap (best minus second-best)');
    el('text', { x: X0 + 6, y: 12 }, svg, 'MAPQ');
    var p1 = [], p2 = [];
    for (var g = 0; g <= GM; g++) {
      p1.push(sx(g).toFixed(1) + ',' + sy(toyQ(g, m)).toFixed(1));
      var sec = best - g; // second-best score for this gap; below 1 means none
      p2.push(sx(g).toFixed(1) + ',' + sy(bwaQ(L, best, sec > 0 ? sec : 0)).toFixed(1));
    }
    el('polyline', { points: p1.join(' '), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2 }, svg);
    el('polyline', { points: p2.join(' '), fill: 'none', stroke: 'var(--het)', 'stroke-width': 2 }, svg);
    if (second && gap <= GM) {
      el('circle', { cx: sx(gap), cy: sy(tq), r: 5, fill: 'var(--accent)' }, svg);
      el('circle', { cx: sx(gap), cy: sy(bq), r: 5, fill: 'var(--het)' }, svg);
      el('line', { x1: sx(gap), x2: sx(gap), y1: Y0, y2: Y1, 'class': 'grid' }, svg);
    }
  }
  [rl, bs, ss, mm].forEach(function (c) { c.addEventListener('input', render2); });

  render();
  render2();
})();
