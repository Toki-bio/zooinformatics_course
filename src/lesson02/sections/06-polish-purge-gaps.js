(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function $(id) { return document.getElementById(id); }
  function rng(seed) { // mulberry32
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(x, d) { return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }
  function readout(box, items) {
    box.innerHTML = items.map(function (it) {
      return '<div><b' + (it.c ? ' style="color:var(--' + it.c + ')"' : '') + '>' + it.v + '</b>' + it.l + '</div>';
    }).join('');
  }

  /* ================= 1. Polishing by majority vote ================= */
  (function () {
    var cov = $('s06-pol-cov'), err = $('s06-pol-err'), u1 = $('s06-pol-u1'), u2 = $('s06-pol-u2');
    var lines = $('s06-pol-lines'), votes = $('s06-pol-votes'), out = $('s06-pol-out'), btn = $('s06-pol-new');
    if (!cov || !lines) return;
    var segBtns = document.querySelectorAll('#s06-wrap .seg [data-p]');
    var LEFT = 'GATTACAGT', RIGHT = 'TAGGATCCA', TRUE_RUN = 6, W = 7; // run column shows up to 7 C
    var DRAFT_LEFT = 'GATAACAGT'; // one substitution (T->A at position 4)
    var seed = 11;
    var presets = {
      lr: { cov: 12, err: 6, u1: 25, u2: 5 },
      nd2: { cov: 30, err: 6, u1: 50, u2: 15 }, // rounded toy values
      ill: { cov: 30, err: 0.5, u1: 1, u2: 0 }
    };
    var BASES = 'ACGT';
    function mutate(s, e, r) {
      var o = '', marks = [];
      for (var i = 0; i < s.length; i++) {
        if (r() < e) {
          var b; do { b = BASES[Math.floor(r() * 4)]; } while (b === s[i]);
          o += b; marks.push(true);
        } else { o += s[i]; marks.push(false); }
      }
      return { s: o, m: marks };
    }
    function runStr(n) { var s = ''; for (var i = 0; i < W; i++) s += i < n ? 'C' : '-'; return s; }
    function majority(cols) {
      var c = {}, best = null, bn = -1;
      cols.forEach(function (x) { c[x] = (c[x] || 0) + 1; });
      Object.keys(c).sort().forEach(function (k) { if (c[k] > bn) { bn = c[k]; best = k; } });
      return best;
    }
    function draw() {
      var n = +cov.value, e = +err.value / 100, p1 = +u1.value / 100, p2 = +u2.value / 100;
      if (p1 + p2 > 1) { var s = p1 + p2; p1 /= s; p2 /= s; }
      $('s06-pol-cov-o').textContent = n; $('s06-pol-err-o').textContent = err.value;
      $('s06-pol-u1-o').textContent = u1.value; $('s06-pol-u2-o').textContent = u2.value;
      var r = rng(seed * 7919 + n);
      var reads = [];
      for (var i = 0; i < n; i++) {
        var x = r(), len = x < p2 ? 4 : (x < p2 + p1 ? 5 : 6);
        reads.push({ l: mutate(LEFT, e, r), run: len, rt: mutate(RIGHT, e, r) });
      }
      // consensus
      var cl = '', cr = '';
      for (var j = 0; j < LEFT.length; j++) cl += majority(reads.map(function (q) { return q.l.s[j]; }));
      for (j = 0; j < RIGHT.length; j++) cr += majority(reads.map(function (q) { return q.rt.s[j]; }));
      var vc = { 4: 0, 5: 0, 6: 0 };
      reads.forEach(function (q) { vc[q.run]++; });
      var crun = 6, cb = -1;
      [4, 5, 6].forEach(function (k) { if (vc[k] > cb) { cb = vc[k]; crun = k; } }); // tie -> shorter run wins
      function colour(str, ref) {
        var o = '';
        for (var t = 0; t < str.length; t++) o += str[t] === ref[t] ? str[t] : '<span class="x">' + str[t] + '</span>';
        return o;
      }
      function runHtml(k) { return '<span class="a">' + runStr(k) + '</span>' + (k !== TRUE_RUN ? '' : ''); }
      var h = [];
      h.push('truth     ' + LEFT + runHtml(TRUE_RUN) + RIGHT);
      h.push('draft     ' + colour(DRAFT_LEFT, LEFT) + runHtml(5) + RIGHT + '  <span class="x">1 wrong letter, run C5</span>');
      h.push('');
      var show = Math.min(n, 14);
      for (i = 0; i < show; i++) {
        var q = reads[i];
        var lab = ('read ' + (i + 1) + '          ').slice(0, 10);
        h.push('' + lab + '' + colour(q.l.s, LEFT) + runHtml(q.run) + colour(q.rt.s, RIGHT) + (q.run !== TRUE_RUN ? '  <span class="x">C' + q.run + '</span>' : ''));
      }
      if (n > show) h.push('… ' + (n - show) + ' more reads (all used in the vote)');
      h.push('');
      var subErr = 0;
      for (j = 0; j < LEFT.length; j++) if (cl[j] !== LEFT[j]) subErr++;
      for (j = 0; j < RIGHT.length; j++) if (cr[j] !== RIGHT[j]) subErr++;
      h.push('consensus ' + colour(cl, LEFT) + runHtml(crun) + colour(cr, RIGHT) +
        (crun === TRUE_RUN ? '  <span class="a">run C6 correct</span>' : '  <span class="x">run C' + crun + ' wrong</span>'));
      lines.innerHTML = h.join('\n');
      var mx = Math.max(vc[4], vc[5], vc[6], 1);
      votes.innerHTML = [4, 5, 6].map(function (k) {
        var col = k === TRUE_RUN ? 'var(--accent)' : 'var(--bad)';
        return '<span>C' + k + (k === TRUE_RUN ? ' (true)' : '') + '</span><i style="width:' + (100 * vc[k] / mx) + '%;background:' + col + '"></i><span>' + vc[k] + ' (' + Math.round(100 * vc[k] / n) + ' %)</span>';
      }).join('');
      var verdict;
      if (crun === TRUE_RUN && subErr === 0) verdict = { v: 'fixed', c: 'good', l: 'Both draft errors corrected: random errors are outvoted, and most reads count the run right.' };
      else if (crun !== TRUE_RUN && subErr === 0) verdict = { v: 'run still wrong', c: 'bad', l: 'Letters fixed, but most reads share the same miscount: a systematic error. More of the same reads will not help; reads from another technology will.' };
      else verdict = { v: 'not enough reads', c: 'bad', l: 'Some columns have no clear majority: add coverage (random errors need several reads to be outvoted).' };
      readout(out, [
        { v: subErr + ' of ' + (LEFT.length + RIGHT.length), c: subErr ? 'bad' : 'good', l: 'wrong letters left outside the run (the draft had 1)' },
        { v: 'C' + crun, c: crun === TRUE_RUN ? 'good' : 'bad', l: 'run length chosen by the vote (true: C6; draft: C5)' },
        verdict
      ]);
    }
    function unpress() { segBtns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); }
    [cov, err, u1, u2].forEach(function (s) { s.addEventListener('input', function () { unpress(); draw(); }); });
    segBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var p = presets[b.getAttribute('data-p')]; if (!p) return;
        cov.value = p.cov; err.value = p.err; u1.value = p.u1; u2.value = p.u2;
        unpress(); b.setAttribute('aria-pressed', 'true'); draw();
      });
    });
    btn.addEventListener('click', function () { seed++; draw(); });
    draw();
  })();

  /* ================= 2. purge_dups depth histogram ================= */
  (function () {
    var svg = $('s06-pd-svg'); if (!svg) return;
    var het = $('s06-pd-het'), cov = $('s06-pd-cov'), lo = $('s06-pd-lo'), mid = $('s06-pd-mid'), hi = $('s06-pd-hi');
    var keep = $('s06-pd-keephi'), msg = $('s06-pd-msg'), out = $('s06-pd-out');
    var WIN = 0.02; // Mb per depth window
    var contigs = [], hist = [];
    var X0 = 52, X1 = 880, Y0 = 18, Y1 = 186;
    var COL = { PRIMARY: 'var(--accent)', HAPLOTIG: 'var(--het)', REPEAT: 'var(--rep)', HIGHCOV: 'var(--bad)', JUNK: 'var(--err)' };

    function build() {
      var h = +het.value, D = +cov.value;
      var r = rng(20261031); // same contig layout every time; only depth noise and splitting change
      var f = Math.min(0.75, h * 0.45); // toy: share of the genome assembled twice
      contigs = [];
      var pos = 0, AUT = 86;
      while (pos < AUT) {
        var L = Math.min(AUT - pos, 0.4 + r() * 2.6), u = r(), v = r();
        if (u < f) {
          var lb = L * (0.55 + 0.4 * v);
          var a = { len: L, depth: D / 2, truth: 'keep', kind: 'one parent (kept copy)', bm: Math.round(100 * lb / L), mm: Math.round(100 * lb / L) };
          var b = { len: lb, depth: D / 2, truth: 'dup', kind: 'other parent (duplicate)', bm: 95, mm: 100 };
          a.partner = b; b.partner = a;
          contigs.push(a, b);
        } else contigs.push({ len: L, depth: D, truth: 'keep', kind: 'both parents merged' });
        pos += L;
      }
      contigs.push({ len: 5, depth: D / 2, truth: 'keep', kind: 'X chromosome (male), no partner' });
      for (var i = 0; i < 2; i++) {
        var s1 = { len: 0.45, depth: D, truth: 'keep', kind: 'segmental duplication (real 2nd copy)', bm: 90, mm: 100 };
        var s2 = { len: 0.4, depth: D, truth: 'keep', kind: 'segmental duplication (real 2nd copy)', bm: 92, mm: 100 };
        s1.partner = s2; s2.partner = s1; contigs.push(s1, s2);
      }
      for (i = 0; i < 2; i++) contigs.push({ len: 0.3, depth: D / 2, truth: 'dup', kind: 'other-parent copy of a repeat-rich region', bm: 85, mm: 260, partner: true });
      for (i = 0; i < 3; i++) contigs.push({ len: 0.25, depth: 3 * D, truth: 'keep', kind: 'collapsed repeat (real sequence)' });
      contigs.push({ len: 0.06, depth: 40 * D, truth: 'mito', kind: 'mitochondrial genome' });
      for (i = 0; i < 6; i++) contigs.push({ len: 0.05 + 0.1 * r(), depth: 2, truth: 'dup', kind: 'junk (almost no read support)' });
      // depth windows
      var rn = rng(Math.round(h * 1000) * 31 + D);
      var MAXD = 500; hist = new Array(MAXD + 1).fill(0);
      contigs.forEach(function (c) {
        var nw = Math.max(1, Math.round(c.len / WIN)); c.win = [];
        for (var w = 0; w < nw; w++) {
          var m = c.depth, sd = 0.75 * Math.sqrt(m) + 0.02 * m;
          var d = Math.max(0, Math.round(m + sd * gauss(rn)));
          if (d > MAXD) d = MAXD;
          c.win.push(d); hist[d] += WIN; // Mb of bases at this depth
        }
      });
    }

    function calcuts() { // simplified from purge_dups src/calcuts.c
      var MAXD = hist.length - 1, cnt = hist.slice();
      var sm = cnt.map(function (x, i) { var s = 0, n = 0; for (var j = i - 2; j <= i + 2; j++) if (j >= 0 && j <= MAXD) { s += cnt[j]; n++; } return s / n; });
      var mx = 0; for (var i = 6; i < MAXD; i++) if (sm[i] > mx) mx = sm[i];
      var peaks = [];
      for (i = 6; i < MAXD - 1; i++) if (sm[i] >= sm[i - 1] && sm[i] > sm[i + 1] && sm[i] >= 0.1 * mx) {
        if (peaks.length && i - peaks[peaks.length - 1] <= 3) continue;
        peaks.push(i);
      }
      peaks.sort(function (a, b) { return sm[b] - sm[a]; });
      var top = peaks.slice(0, 2).sort(function (a, b) { return a - b; });
      if (top.length === 2) {
        var v = top[0], vm = Infinity;
        for (i = top[0]; i <= top[1]; i++) if (sm[i] < vm) { vm = sm[i]; v = i; }
        if (vm < Math.min(sm[top[0]], sm[top[1]]) * 0.9) {
          return { lo: 5, mid: v + 1, hi: 3 * top[1], note: 'Two peaks (' + top[0] + '× and ' + top[1] + '×) with a valley at ' + v + '×: two-peak mode.' };
        }
      }
      var p = 6; mx = -1; for (i = 6; i < MAXD; i++) if (cnt[i] > mx) { mx = cnt[i]; p = i; }
      var sum = 0, tot = 0; for (i = 1; i < MAXD; i++) { sum += i * cnt[i]; tot += cnt[i]; }
      var mean = Math.floor(sum / tot);
      if (mean <= p) {
        var c2 = p - (p >> 2);
        return { lo: 5, mid: c2, hi: 3 * c2, note: 'One peak at ' + p + '×, mean ' + mean + '× is not above it: the peak is taken as full depth (mid = 0.75 × peak).' };
      }
      c2 = p + (p >> 1);
      var D = +cov.value, wrongPeak = p > 0.75 * D;
      return { lo: 5, mid: c2, hi: 3 * c2, note: 'One peak at ' + p + '×, mean ' + mean + '× is above it: calcuts takes the peak as HALF depth (mid = 1.5 × peak). ' + (wrongPeak ? 'Here the peak is really the full depth D, so mid lands above D and every merged contig becomes a candidate: the over-purging trap of low-heterozygosity genomes that the README warns about.' : 'Here the peak really is half depth, so the guess is right.'), warn: wrongPeak };
    }

    function classify() {
      var L = +lo.value, M = +mid.value, H = +hi.value;
      contigs.forEach(function (c) {
        c.removed = false;
        var nl = 0, nh = 0, nd = 0, nH = 0, n = c.win.length;
        c.win.forEach(function (d) { if (d <= L) nl++; else if (d <= M) nh++; else if (d > H) nH++; else nd++; });
        if (nl / n > 0.8) c.lab = 'JUNK';
        else if (nd / n > 0.8) c.lab = 'PRIMARY';
        else if (nH / n > 0.8) c.lab = 'HIGHCOV';
        else c.lab = 'CAND';
      });
      // candidates: alignment to a partner, shortest first
      var cand = contigs.filter(function (c) { return c.lab === 'CAND'; }).sort(function (a, b) { return a.len - b.len; });
      cand.forEach(function (c) {
        if (!c.partner || c.bm < 70) { c.lab = 'PRIMARY'; return; }
        if (c.partner !== true && c.partner.removed) { c.lab = 'PRIMARY'; return; }
        c.lab = c.mm >= 200 ? 'REPEAT' : 'HAPLOTIG';
        c.removed = true;
      });
      contigs.forEach(function (c) {
        c.removed = !(c.lab === 'PRIMARY' || (c.lab === 'HIGHCOV' && keep.checked));
        c.wrong = (c.truth === 'keep' && c.removed) || (c.truth === 'dup' && !c.removed);
      });
    }

    function draw() {
      var D = +cov.value;
      $('s06-pd-het-o').textContent = het.value; $('s06-pd-cov-o').textContent = D;
      $('s06-pd-lo-o').textContent = lo.value; $('s06-pd-mid-o').textContent = mid.value; $('s06-pd-hi-o').textContent = hi.value;
      classify();
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var XMAX = Math.max(4 * D, +hi.value + 10, +mid.value + 10);
      function xs(d) { return X0 + (X1 - X0) * d / XMAX; }
      var ymax = 0; for (var i = 1; i <= XMAX && i < hist.length; i++) if (hist[i] > ymax) ymax = hist[i];
      ymax *= 1.1;
      function ys(v) { return Y1 - (Y1 - Y0) * Math.min(v, ymax) / ymax; }
      el('line', { x1: X0, y1: Y1, x2: X1, y2: Y1, 'class': 'ax' }, svg);
      el('line', { x1: X0, y1: Y0, x2: X0, y2: Y1, 'class': 'ax' }, svg);
      var step = XMAX > 200 ? 50 : (XMAX > 100 ? 20 : 10);
      for (var t = 0; t <= XMAX; t += step) {
        el('line', { x1: xs(t), y1: Y1, x2: xs(t), y2: Y1 + 4, 'class': 'ax' }, svg);
        el('text', { x: xs(t), y: Y1 + 16, 'text-anchor': 'middle' }, svg, t);
      }
      el('text', { x: (X0 + X1) / 2, y: Y1 + 30, 'text-anchor': 'middle' }, svg, 'read depth (×)');
      el('text', { x: 14, y: (Y0 + Y1) / 2, 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + ((Y0 + Y1) / 2) + ')' }, svg, 'Mb of assembly');
      // histogram bars, coloured by depth class
      var L = +lo.value, M = +mid.value, H = +hi.value, bw = Math.max(1, (X1 - X0) / XMAX);
      for (i = 0; i <= XMAX && i < hist.length; i++) {
        if (!hist[i]) continue;
        var col = i <= L ? 'var(--err)' : (i <= M ? 'var(--het)' : (i > H ? 'var(--bad)' : 'var(--accent)'));
        el('rect', { x: xs(i) - bw / 2, y: ys(hist[i]), width: bw * 0.9, height: Y1 - ys(hist[i]), fill: col, opacity: 0.75 }, svg);
      }
      // reference marks
      [[D / 2, 'D/2'], [D, 'D'], [3 * D, '3D']].forEach(function (m) {
        if (m[0] <= XMAX) el('text', { x: xs(m[0]), y: Y0 + 2, 'text-anchor': 'middle' }, svg, m[1]);
      });
      // cutoff lines (draggable)
      [['lo', lo, 'low'], ['mid', mid, 'mid'], ['hi', hi, 'high']].forEach(function (c, k) {
        var x = xs(+c[1].value);
        var g = el('g', { 'data-cut': c[0], style: 'cursor:ew-resize' }, svg);
        el('line', { x1: x, y1: Y0 + 6, x2: x, y2: Y1, stroke: 'var(--fg)', 'stroke-width': 1.5, 'stroke-dasharray': '5 3' }, g);
        el('rect', { x: x - 8, y: Y0 + 6, width: 16, height: Y1 - Y0 - 6, fill: 'transparent' }, g);
        el('text', { x: x + 4, y: Y0 + 20 + 13 * k, 'class': 'lab' }, g, c[2] + ' ' + c[1].value);
      });
      // contig strip
      var total = contigs.reduce(function (s, c) { return s + c.len; }, 0);
      var SX0 = X0, SX1 = X1, gap = 1, minw = 3;
      var avail = (SX1 - SX0) - gap * contigs.length - minw * contigs.length;
      var x = SX0, y = 252;
      el('text', { x: SX0, y: y - 12 }, svg, 'contigs in assembly order (width ∝ length; tiny ones widened)');
      contigs.forEach(function (c) {
        var w = minw + avail * c.len / total;
        var rc = el('rect', { x: x, y: y, width: w, height: 30, fill: COL[c.lab] || 'var(--muted)', opacity: c.removed ? 0.45 : 1, stroke: c.wrong ? 'var(--bad)' : 'none', 'stroke-width': c.wrong ? 2 : 0 }, svg);
        el('title', {}, rc, c.kind + ' · ' + fmt(c.len, 2) + ' Mb · depth ' + fmt(c.depth, 0) + '× → ' + c.lab + (c.removed ? ' (removed)' : ' (kept)') + (c.wrong ? ' ✗ wrong' : ''));
        if (c.wrong) el('text', { x: x + w / 2, y: y + 46, 'text-anchor': 'middle', style: 'fill:var(--bad);font-size:13px;font-weight:700' }, svg, '✗');
        x += w + gap;
      });
      el('text', { x: SX0, y: y + 62 }, svg, 'faded = moved to hap.fa · ✗ = wrong decision (hover a box for details)');
      // numbers
      var before = total, kept = 0, lost = 0, left = 0, truthLen = 0, lostKinds = {};
      contigs.forEach(function (c) {
        if (!c.removed) kept += c.len;
        if (c.truth === 'keep') { truthLen += c.len; if (c.removed) { lost += c.len; lostKinds[c.kind.replace(/ \(.*\)|,.*$/, '')] = 1; } }
        if (c.truth === 'dup' && !c.removed) left += c.len;
      });
      var mito = contigs.filter(function (c) { return c.truth === 'mito'; })[0];
      readout(out, [
        { v: fmt(before, 1) + ' → ' + fmt(kept, 1) + ' Mb', l: 'assembly before → purged.fa (true haploid size ' + fmt(truthLen, 1) + ' Mb)' },
        { v: fmt(lost, 2) + ' Mb', c: lost > 0.01 ? 'bad' : 'good', l: 'real sequence wrongly removed' + (lost > 0.01 ? ': ' + Object.keys(lostKinds).join(', ') : '') },
        { v: fmt(left, 2) + ' Mb', c: left > 0.01 ? 'bad' : 'good', l: 'duplicates and junk left in purged.fa' },
        { v: mito ? mito.lab : '', l: 'label of the mitochondrial contig (handle it separately; section 11)' }
      ]);
    }

    function rebuild(auto) {
      build();
      if (auto) applyAuto(); else draw();
    }
    function applyAuto() {
      var c = calcuts();
      lo.value = c.lo; mid.value = Math.min(+mid.max, c.mid); hi.value = Math.min(+hi.max, c.hi);
      msg.innerHTML = '<b>calcuts:</b> ' + esc(c.note);
      msg.style.color = c.warn ? 'var(--bad)' : '';
      draw();
    }
    het.addEventListener('input', function () { rebuild(true); });
    cov.addEventListener('input', function () { rebuild(true); });
    [lo, mid, hi].forEach(function (s) { s.addEventListener('input', function () { msg.textContent = 'Manual cutoffs (as calcuts -l -m -u).'; msg.style.color = ''; draw(); }); });
    keep.addEventListener('change', draw);
    $('s06-pd-auto').addEventListener('click', applyAuto);
    // dragging the cutoff lines
    var drag = null;
    function depthAt(evt) {
      var pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
      var m = svg.getScreenCTM(); if (!m) return null;
      var p = pt.matrixTransform(m.inverse());
      var D = +cov.value, XMAX = Math.max(4 * D, +hi.value + 10, +mid.value + 10);
      return Math.round((p.x - X0) / (X1 - X0) * XMAX);
    }
    svg.addEventListener('pointerdown', function (e) {
      var g = e.target.closest ? e.target.closest('[data-cut]') : null;
      if (!g) return;
      drag = { lo: lo, mid: mid, hi: hi }[g.getAttribute('data-cut')];
      try { svg.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      e.preventDefault();
    });
    svg.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var d = depthAt(e); if (d == null) return;
      d = Math.max(+drag.min, Math.min(+drag.max, d));
      if (+drag.value !== d) { drag.value = d; msg.textContent = 'Manual cutoffs (as calcuts -l -m -u).'; msg.style.color = ''; draw(); }
    });
    function end() { drag = null; }
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    rebuild(true);
  })();

  /* ================= 3. Gap closing: tied reads ================= */
  (function () {
    var svg = $('s06-gap-svg'); if (!svg) return;
    var Rs = $('s06-gap-R'), covS = $('s06-gap-cov'), Ls = $('s06-gap-L'), out = $('s06-gap-out');
    var segs = document.querySelectorAll('#s06-wrap .seg [data-r]');
    var mode = 'pe', seed = 5, ANCH = 100, K = 99;
    function draw() {
      var R = +Rs.value, C = +covS.value, M = +Ls.value * 1000;
      $('s06-gap-R-o').textContent = R; $('s06-gap-cov-o').textContent = C; $('s06-gap-L-o').textContent = Ls.value;
      Ls.disabled = mode === 'pe';
      var F = mode === 'pe' ? 450 : Math.max(800, Math.min(6000, 0.6 * M));
      var Wd = 2 * F + R, rs = F, re = F + R; // repeat [rs, re)
      var r = rng(seed * 104729 + R * 7 + C * 13 + (mode === 'pe' ? 0 : Math.round(M)));
      var frags = [];
      function uniqOverlap(a, b) { // bases of [a,b) outside the repeat
        var tot = b - a, inR = Math.max(0, Math.min(b, re) - Math.max(a, rs));
        return tot - inR;
      }
      if (mode === 'pe') {
        var span = Wd + 500, n = Math.round(C * span / 300);
        for (var i = 0; i < n; i++) {
          var I = Math.round(Math.max(300, Math.min(420, 350 + 30 * gauss(r)))), s = -500 + r() * span;
          var m1 = [s, s + 150], m2 = [s + I - 150, s + I];
          if (m2[1] < 0 || m1[0] > Wd) continue;
          var tied = uniqOverlap(m1[0], m1[1]) >= ANCH || uniqOverlap(m2[0], m2[1]) >= ANCH;
          frags.push({ segs: [m1, m2], a: m1[0], b: m2[1], tied: tied });
        }
      } else {
        var maxL = 4 * M, span2 = Wd + maxL, n2 = Math.round(C * span2 / M);
        for (i = 0; i < n2; i++) {
          var len = Math.max(300, -M / 2 * (Math.log(1 - r()) + Math.log(1 - r())));
          var s2 = -maxL + r() * span2;
          if (s2 + len < 0 || s2 > Wd) continue;
          frags.push({ segs: [[s2, s2 + len]], a: s2, b: s2 + len, tied: uniqOverlap(s2, s2 + len) >= ANCH, bridge: s2 <= rs - ANCH && s2 + len >= re + ANCH });
        }
      }
      // placed repeat bases
      var cov = new Int32Array(R + 1);
      frags.forEach(function (f) {
        if (!f.tied) return;
        f.segs.forEach(function (sg) {
          var a = Math.max(rs, Math.ceil(sg[0])), b = Math.min(re, Math.ceil(sg[1]));
          if (b > a) { cov[a - rs]++; cov[b - rs]--; }
        });
      });
      var run = 0, placed = 0, longest = 0, cur = 0;
      for (i = 0; i < R; i++) { run += cov[i]; if (run > 0) { placed++; cur = 0; } else { cur++; if (cur > longest) longest = cur; } }
      var bridged = frags.some(function (f) { return f.bridge; });
      // draw
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var X0 = 20, X1 = 880;
      function xs(p) { return X0 + (X1 - X0) * (p - 0) / Wd; }
      var yS = 40;
      el('rect', { x: xs(0), y: yS, width: xs(rs) - xs(0), height: 12, fill: 'var(--accent)', opacity: 0.35 }, svg);
      el('rect', { x: xs(rs), y: yS, width: xs(re) - xs(rs), height: 12, fill: 'var(--rep)', opacity: 0.8 }, svg);
      el('rect', { x: xs(re), y: yS, width: xs(Wd) - xs(re), height: 12, fill: 'var(--accent)', opacity: 0.35 }, svg);
      el('text', { x: xs(rs / 2), y: yS - 6, 'text-anchor': 'middle', 'class': 'lab' }, svg, 'unique flank');
      el('text', { x: xs((rs + re) / 2), y: yS - 6, 'text-anchor': 'middle', 'class': 'lab' }, svg, 'repeat copy, ' + R + ' bp');
      el('text', { x: xs(re + (Wd - re) / 2), y: yS - 6, 'text-anchor': 'middle', 'class': 'lab' }, svg, 'unique flank');
      // de Bruijn contig ends k-1 into the copy
      if (R >= K - 1) {
        [[rs + K - 1, 'start'], [re - K + 1, 'end']].forEach(function (p) {
          el('line', { x1: xs(p[0]), y1: yS - 2, x2: xs(p[0]), y2: yS + 26, stroke: 'var(--fg)', 'stroke-width': 1.2 }, svg);
        });
      }
      // placed bar
      var yB = yS + 18;
      el('rect', { x: xs(rs), y: yB, width: xs(re) - xs(rs), height: 7, fill: 'var(--bad)', opacity: 0.6 }, svg);
      run = 0; var segStart = -1;
      for (i = 0; i <= R; i++) {
        if (i < R) run += cov[i];
        var on = i < R && run > 0;
        if (on && segStart < 0) segStart = i;
        if (!on && segStart >= 0) { el('rect', { x: xs(rs + segStart), y: yB, width: Math.max(0.5, xs(rs + i) - xs(rs + segStart)), height: 7, fill: 'var(--good)' }, svg); segStart = -1; }
      }
      // reads packed in rows
      frags.sort(function (a, b) { return a.a - b.a; });
      var rowsEnd = [], ROWS = 16, y0 = yS + 40, rh = 11, hidden = 0;
      frags.forEach(function (f) {
        var a = Math.max(0, f.a), b = Math.min(Wd, f.b), row = -1;
        for (var k = 0; k < rowsEnd.length; k++) if (xs(a) > rowsEnd[k] + 3) { row = k; break; }
        if (row < 0) { if (rowsEnd.length >= ROWS) { hidden++; return; } row = rowsEnd.length; rowsEnd.push(0); }
        rowsEnd[row] = xs(b);
        var y = y0 + row * rh, col = f.tied ? 'var(--accent)' : 'var(--err)';
        if (f.segs.length === 2) el('line', { x1: xs(Math.max(0, f.segs[0][1])), y1: y + 3, x2: xs(Math.min(Wd, f.segs[1][0])), y2: y + 3, stroke: col, 'stroke-dasharray': '2 2', 'stroke-width': 1 }, svg);
        f.segs.forEach(function (sg) {
          var sa = Math.max(0, sg[0]), sb = Math.min(Wd, sg[1]);
          if (sb > sa) el('rect', { x: xs(sa), y: y, width: Math.max(1, xs(sb) - xs(sa)), height: 6, fill: col, rx: 1, stroke: f.bridge ? 'var(--good)' : 'none', 'stroke-width': f.bridge ? 1.5 : 0 }, svg);
        });
      });
      var yE = y0 + Math.max(rowsEnd.length, 1) * rh + 16;
      el('text', { x: X0, y: yE }, svg, (hidden ? hidden + ' more reads not drawn · ' : '') + 'black ticks: where contigs of a short-read assembler with k = 99 stop (k − 1 bases into the copy)');
      svg.setAttribute('viewBox', '0 0 900 ' + Math.round(yE + 10));
      var verdict;
      if (R < K - 1) verdict = { v: 'no gap', c: 'good', l: 'The repeat is shorter than k − 1 = 98: a de Bruijn assembler with k = 99 already walks through it.' };
      else if (placed === R && (bridged || mode === 'pe')) verdict = { v: 'closable', c: 'good', l: mode === 'pe' ? 'Every repeat base is carried by a tied pair: a pair-based closer such as sineclose can fill it.' : 'At least one read spans the whole copy plus 100 bases of flank on each side (green outline).' };
      else if (placed === R) verdict = { v: 'closable', c: 'good', l: 'Tied reads from both sides overlap inside the copy.' };
      else verdict = { v: 'stays a gap', c: 'bad', l: (longest) + ' bases in the middle are carried only by untied reads, which could come from any copy. ' + (mode === 'pe' ? 'Pairs reach about one insert (350 bases) into the copy from each side; longer repeats need long reads.' : 'Increase read length or coverage.') };
      readout(out, [
        { v: Math.round(100 * placed / R) + ' %', c: placed === R ? 'good' : 'bad', l: 'of the repeat copy carried by tied reads' },
        { v: frags.filter(function (f) { return f.tied; }).length + ' / ' + frags.length, l: (mode === 'pe' ? 'pairs' : 'reads') + ' tied to unique flank / all in view' },
        verdict
      ]);
    }
    segs.forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.getAttribute('data-r');
        segs.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        draw();
      });
    });
    [Rs, covS, Ls].forEach(function (s) { s.addEventListener('input', draw); });
    $('s06-gap-new').addEventListener('click', function () { seed++; draw(); });
    draw();
  })();
})();
