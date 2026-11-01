(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function fmt(x) {
    if (x >= 100) return Math.round(x).toLocaleString('en-US');
    if (x >= 10) return x.toFixed(0);
    return x.toFixed(1);
  }
  function seg(onId, offId, cb) {
    var a = $(onId), b = $(offId);
    if (!a || !b) return;
    function set(v) { a.setAttribute('aria-pressed', v ? 'true' : 'false'); b.setAttribute('aria-pressed', v ? 'false' : 'true'); cb(v); }
    a.addEventListener('click', function () { set(true); });
    b.addEventListener('click', function () { set(false); });
  }

  /* ================= 1. depth toy ================= */
  (function covToy() {
    var fig = $('s11-cov-fig'); if (!fig) return;
    var sc = $('s11-cov-c'), sm = $('s11-cov-m'), sn = $('s11-cov-n'), si = $('s11-cov-i');
    var mtInRef = true;
    var W = 760, H = 330, L = 70, R = 20, T = 20, B = 86;
    var ymin = 1, ymax = 1e6;
    function y(v) { var t = (Math.log10(Math.max(v, ymin)) - Math.log10(ymin)) / (Math.log10(ymax) - Math.log10(ymin)); return T + (1 - t) * (H - T - B); }
    function x(p) { return L + p / 100 * (W - L - R); }
    function draw() {
      var C = +sc.value, M = +sm.value, n = +sn.value, id = +si.value;
      $('s11-cov-co').textContent = C + '×';
      $('s11-cov-mo').textContent = M;
      $('s11-cov-no').textContent = n;
      $('s11-cov-io').textContent = id + ' %';
      var mt = C * M / 2;
      var numt = C * n;
      var stolen = (!mtInRef && id >= 90) ? mt : 0;
      var numtTot = numt + stolen;
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: 'min-width:560px', role: 'img', 'aria-label': 'Read depth along a nuclear contig with a NUMT' });
      // grid
      for (var e = 0; e <= 6; e++) {
        var v = Math.pow(10, e), yy = y(v);
        svg.appendChild(el('line', { x1: L, x2: W - R, y1: yy, y2: yy, 'class': 'grid' }));
        svg.appendChild(el('text', { x: L - 8, y: yy + 4, 'text-anchor': 'end' }, v >= 1000 ? (v / 1000).toLocaleString('en-US') + 'k×' : v + '×'));
      }
      svg.appendChild(el('text', { x: 14, y: T + (H - T - B) / 2, transform: 'rotate(-90 14 ' + (T + (H - T - B) / 2) + ')', 'text-anchor': 'middle' }, 'read depth (log)'));
      // contig track
      var ty = H - B + 30;
      svg.appendChild(el('rect', { x: x(0), y: ty, width: x(100) - x(0), height: 10, fill: 'var(--accent)', opacity: 0.35 }));
      svg.appendChild(el('rect', { x: x(35), y: ty, width: x(65) - x(35), height: 10, fill: 'var(--rep)' }));
      svg.appendChild(el('text', { x: x(17.5), y: ty + 26, 'text-anchor': 'middle', 'class': 'lab' }, 'nuclear flank'));
      svg.appendChild(el('text', { x: x(50), y: ty + 26, 'text-anchor': 'middle', 'class': 'lab' }, 'NUMT'));
      svg.appendChild(el('text', { x: x(82.5), y: ty + 26, 'text-anchor': 'middle', 'class': 'lab' }, 'nuclear flank'));
      // mt depth dashed
      svg.appendChild(el('line', { x1: L, x2: W - R, y1: y(mt), y2: y(mt), stroke: 'var(--het)', 'stroke-width': 2, 'stroke-dasharray': '6 4' }));
      svg.appendChild(el('text', { x: W - R - 4, y: y(mt) - 6, 'text-anchor': 'end', fill: 'var(--het)' }, 'real mtDNA ' + fmt(mt) + '×' + (mtInRef ? '' : ' (not in reference)')));
      // depth profile
      var d = 'M' + x(0) + ',' + y(C) + ' L' + x(35) + ',' + y(C) + ' L' + x(35) + ',' + y(numt) + ' L' + x(65) + ',' + y(numt) + ' L' + x(65) + ',' + y(C) + ' L' + x(100) + ',' + y(C);
      svg.appendChild(el('path', { d: d, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2 }));
      if (n > 1) svg.appendChild(el('rect', { x: x(35), y: y(numt), width: x(65) - x(35), height: Math.max(0, y(C) - y(numt)), fill: 'var(--rep)', opacity: 0.25 }));
      if (stolen > 0) {
        svg.appendChild(el('rect', { x: x(35), y: y(numtTot), width: x(65) - x(35), height: Math.max(1, y(numt) - y(numtTot)), fill: 'var(--bad)', opacity: 0.35 }));
        svg.appendChild(el('path', { d: 'M' + x(35) + ',' + y(numt) + ' L' + x(35) + ',' + y(numtTot) + ' L' + x(65) + ',' + y(numtTot) + ' L' + x(65) + ',' + y(numt), fill: 'none', stroke: 'var(--bad)', 'stroke-width': 2.2 }));
      }
      svg.appendChild(el('text', { x: x(50), y: y(numtTot) - 6, 'text-anchor': 'middle', 'class': 'lab' }, fmt(numtTot) + '×'));
      svg.appendChild(el('text', { x: x(17.5), y: y(C) - 6, 'text-anchor': 'middle', 'class': 'lab' }, C + '×'));
      // junction-spanning reads (evidence of nuclear position)
      var jy = H - B + 21;
      [[27, 43], [57, 73]].forEach(function (r) {
        svg.appendChild(el('line', { x1: x(r[0]), x2: x(r[1]), y1: jy, y2: jy, stroke: 'var(--fg)', 'stroke-width': 2.5 }));
      });
      svg.appendChild(el('text', { x: x(50), y: jy - 6, 'text-anchor': 'middle' }, 'reads crossing the junctions'));
      fig.innerHTML = ''; fig.appendChild(svg);

      var p = id / 100;
      var d150 = 150 * (1 - p), d10k = 10000 * (1 - p);
      var zero150 = Math.pow(p, 150) * 100;
      var mtShare = 16600 * mt / (2.7e9 * C + 16600 * mt) * 100;
      var out = $('s11-cov-out');
      out.innerHTML =
        '<div>mtDNA ÷ nuclear depth<b>' + fmt(M / 2) + ' ×</b></div>' +
        '<div>mtDNA share of all bases (2.7 Gb genome)<b>' + (mtShare < 0.1 ? mtShare.toFixed(3) : mtShare.toFixed(2)) + ' %</b></div>' +
        '<div>Depth over the NUMT<b>' + fmt(numtTot) + ' ×' + (stolen > 0 ? ' (mostly mtDNA reads!)' : '') + '</b></div>' +
        '<div>Differences NUMT vs mtDNA in a 150-bp read<b>' + d150.toFixed(1) + ' (' + zero150.toFixed(zero150 < 1 ? 2 : 0) + ' % of reads have none)</b></div>' +
        '<div>… in a 10-kb read<b>' + fmt(d10k) + '</b></div>';
    }
    [sc, sm, sn, si].forEach(function (s) { s.addEventListener('input', draw); });
    seg('s11-cov-ref1', 's11-cov-ref0', function (v) { mtInRef = v; draw(); });
    draw();
  })();

  /* ================= 2. ReadExtend toy ================= */
  (function rxToy() {
    var fig = $('s11-rx-fig'); if (!fig) return;
    var CIRC = 120, RL = 24, SEEDLEN = 12, NUMT_A = 40, NUMT_B = 100, FL = 30;
    function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    var r0 = rng(20251018);
    function rseq(n, r) { var s = ''; for (var i = 0; i < n; i++) s += 'ACGT'[Math.floor(r() * 4)]; return s; }
    var MT = rseq(CIRC, r0);
    var subs = [52, 71, 88];
    var numtCore = MT.slice(NUMT_A, NUMT_B).split('');
    subs.forEach(function (pos) { var i = pos - NUMT_A, b = numtCore[i], nb = 'ACGT'.replace(b, '')[Math.floor(r0() * 3)]; numtCore[i] = nb; });
    var LOCUS = rseq(FL, r0) + numtCore.join('') + rseq(FL, r0); // nuclear flank + NUMT + flank (120 bp)
    var mtReads = [], numtReads = [];
    for (var s = 0; s < CIRC; s += 2) mtReads.push({ seq: (MT + MT).slice(s, s + RL), src: 'mt', start: s });
    for (var t = 0; t + RL <= LOCUS.length; t += 6) numtReads.push({ seq: LOCUS.slice(t, t + RL), src: 'numt', start: t });

    var st = { order: [], ext: '', srcs: [], query: '', round: 0, done: false, msg: '', log: [], seedShuffle: 1 };
    var useNumt = true;
    var sF = $('s11-rx-f'), sH = $('s11-rx-h2'), sM = $('s11-rx-m'), sR = $('s11-rx-r');

    function shuffledReads() {
      var all = mtReads.concat(useNumt ? numtReads : []);
      var r = rng(st.seedShuffle * 7919 + 13), a = all.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var tmp = a[i]; a[i] = a[j]; a[j] = tmp; }
      return a;
    }
    function reset() {
      st.order = shuffledReads();
      st.ext = ''; st.srcs = []; st.query = MT.slice(0, SEEDLEN); st.round = 0; st.done = false; st.msg = 'Ready: the query of round 1 is the whole seed.'; st.log = [];
      render();
    }
    function findIn(read, q, mm) {
      // last occurrence wins? use first occurrence with <= mm mismatches (like a grep match)
      for (var i = 0; i + q.length <= read.length; i++) {
        var m = 0;
        for (var k = 0; k < q.length; k++) { if (read[i + k] !== q[k]) { m++; if (m > mm) break; } }
        if (m <= mm) return i;
      }
      return -1;
    }
    function step() {
      if (st.done) return;
      var maxR = +sR.value, flank = +sF.value, maxHits = +sH.value, mm = +sM.value;
      if (st.round >= maxR) { st.done = true; st.msg = 'Stopped: the round limit (--rounds ' + maxR + ') is reached.'; render(); return; }
      st.round++;
      var q = st.query, hits = [];
      for (var i = 0; i < st.order.length && hits.length < maxHits; i++) {
        var p = findIn(st.order[i].seq, q, mm);
        if (p >= 0) hits.push({ r: st.order[i], end: p + q.length });
      }
      var nMt = hits.filter(function (h) { return h.r.src === 'mt'; }).length;
      if (!hits.length) { st.done = true; st.msg = 'Stopped in round ' + st.round + ': no read contains the query.'; st.log.push([st.round, q, '0', '–', '–']); render(); return; }
      // pieces: next `flank` bases after the query in each read; keep pieces >= 5; longest wins, ties -> last
      var best = null;
      hits.forEach(function (h) {
        var piece = h.r.seq.slice(h.end, h.end + flank);
        if (piece.length < 5) return;
        if (!best || piece.length >= best.piece.length) best = { piece: piece, r: h.r };
      });
      if (!best) { st.done = true; st.msg = 'Stopped in round ' + st.round + ': every hit read ends within 5 bases after the query, so no piece could be cut.'; st.log.push([st.round, q, nMt + ' / ' + (hits.length - nMt), '–', '–']); render(); return; }
      st.ext += best.piece;
      for (var j = 0; j < best.piece.length; j++) st.srcs.push(best.r.src);
      st.query = best.piece;
      st.log.push([st.round, q, nMt + ' / ' + (hits.length - nMt), best.piece, best.r.src === 'mt' ? 'mtDNA read' : 'NUMT-locus read']);
      st.msg = 'Round ' + st.round + ': ' + hits.length + ' hit read(s); the longest piece (' + best.piece.length + ' bp) was kept.';
      if (st.round >= maxR) { st.done = true; st.msg += ' Round limit reached.'; }
      render();
    }
    function render() {
      $('s11-rx-fo').textContent = sF.value; $('s11-rx-ho').textContent = sH.value; $('s11-rx-mo').textContent = sM.value; $('s11-rx-ro').textContent = sR.value;
      var full = MT.slice(0, SEEDLEN) + st.ext;
      var ok = [];
      for (var i = 0; i < full.length; i++) ok.push(full[i] === MT[i % CIRC]);
      var firstBad = ok.indexOf(false);
      // ---- svg: circle ----
      var W = 760, H = 280, cx = 150, cy = 140, R0 = 92;
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: 'min-width:560px', role: 'img', 'aria-label': 'Read walk drawn on the circular toy mitogenome' });
      svg.appendChild(el('circle', { cx: cx, cy: cy, r: R0, fill: 'none', stroke: 'var(--line)', 'stroke-width': 10 }));
      function pt(pos, r) { var a = pos / CIRC * 2 * Math.PI - Math.PI / 2; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
      function arc(a, b, r, col, w) {
        var p1 = pt(a, r), p2 = pt(b, r), large = (b - a) > CIRC / 2 ? 1 : 0;
        svg.appendChild(el('path', { d: 'M' + p1[0].toFixed(1) + ',' + p1[1].toFixed(1) + ' A' + r + ',' + r + ' 0 ' + large + ' 1 ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1), fill: 'none', stroke: col, 'stroke-width': w, 'stroke-linecap': 'butt' }));
      }
      arc(NUMT_A, NUMT_B, R0 + 12, 'var(--rep)', 4);
      var lp = pt((NUMT_A + NUMT_B) / 2, R0 + 30);
      svg.appendChild(el('text', { x: lp[0], y: lp[1], 'text-anchor': 'middle', fill: 'var(--rep)' }, 'NUMT copy'));
      // walk: draw base by base, lap k at radius R0 - 14*k
      for (var b = 0; b < full.length; b++) {
        var lap = Math.floor(b / CIRC), rr = R0 - 16 * lap; if (rr < 20) break;
        var a0 = b % CIRC;
        arc(a0, a0 + 1, rr, b < SEEDLEN ? 'var(--fg)' : (ok[b] ? 'var(--good)' : 'var(--bad)'), 9);
      }
      var p0 = pt(0, R0 + 22);
      svg.appendChild(el('text', { x: p0[0], y: p0[1] - 2, 'text-anchor': 'middle', 'class': 'lab' }, 'seed (pos 1)'));
      svg.appendChild(el('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', 'class': 'lab' }, (full.length) + ' bp'));
      svg.appendChild(el('text', { x: cx, y: cy + 12, 'text-anchor': 'middle' }, 'circle = ' + CIRC + ' bp'));
      // right side: linear nuclear locus
      var lx = 330, lw = 400, ly = 70;
      svg.appendChild(el('text', { x: lx, y: ly - 22, 'class': 'lab' }, 'nuclear locus (120 bp): flank | NUMT | flank'));
      svg.appendChild(el('rect', { x: lx, y: ly - 6, width: lw, height: 12, fill: 'var(--accent)', opacity: 0.35 }));
      svg.appendChild(el('rect', { x: lx + lw * FL / LOCUS.length, y: ly - 6, width: lw * (NUMT_B - NUMT_A) / LOCUS.length, height: 12, fill: 'var(--rep)' }));
      subs.forEach(function (sp) { var xx = lx + lw * (FL + sp - NUMT_A) / LOCUS.length; svg.appendChild(el('line', { x1: xx, x2: xx, y1: ly - 10, y2: ly + 10, stroke: 'var(--bad)', 'stroke-width': 2 })); });
      svg.appendChild(el('text', { x: lx, y: ly + 26 }, useNumt ? numtReads.length + ' reads from this locus are in the read set' : 'NUMT reads switched off'));
      svg.appendChild(el('text', { x: lx, y: ly + 42 }, 'red ticks = the 3 positions where the NUMT differs'));
      // status
      var sy = 170;
      var lines = [];
      if (full.length > CIRC && firstBad < 0) {
        lines.push(['var(--het)', 'Passed the start of the circle: the last ' + (full.length - CIRC) + ' bp']);
        lines.push(['var(--het)', 'repeat the beginning. The script does not notice;']);
        lines.push(['var(--het)', 'trim the overlap yourself.']);
      }
      if (firstBad >= 0) {
        lines.push(['var(--bad)', 'First base that differs from the mtDNA: position ' + (firstBad + 1) + '.']);
        if (firstBad >= NUMT_B) lines.push(['var(--bad)', 'Past the NUMT end (pos ' + NUMT_B + '): the walk is in nuclear DNA.']);
      }
      else if (st.ext.length) lines.push(['var(--good)', 'So far every base matches the real mtDNA.']);
      lines.forEach(function (l, i) { svg.appendChild(el('text', { x: lx, y: sy + i * 18, fill: l[0] }, l[1])); });
      fig.innerHTML = ''; fig.appendChild(svg);
      // ---- sequence ----
      var html = '<span class="mono">seed + extension:</span>\n', line = '';
      for (var c = 0; c < full.length; c++) {
        var ch = full[c];
        line += c < SEEDLEN ? ch : (ok[c] ? '<span class="a">' + ch + '</span>' : '<span class="x">' + ch + '</span>');
        if ((c + 1) % 60 === 0) line += '\n';
        else if ((c + 1) % 10 === 0) line += ' ';
      }
      $('s11-rx-seq').innerHTML = html + line;
      var nNumt = st.srcs.filter(function (x) { return x === 'numt'; }).length;
      $('s11-rx-out').innerHTML =
        '<div>Status<b style="font-size:13px;font-family:var(--f-body)">' + st.msg + '</b></div>' +
        '<div>Extended by<b>' + st.ext.length + ' bp in ' + st.round + ' round(s)</b></div>' +
        '<div>Bases taken from NUMT-locus reads<b>' + nNumt + '</b></div>';
      var tb = $('s11-rx-log'), rows = '';
      st.log.forEach(function (r) { rows += '<tr><td>' + r[0] + '</td><td><code>' + r[1] + '</code></td><td>' + r[2] + '</td><td><code>' + r[3] + '</code></td><td>' + r[4] + '</td></tr>'; });
      tb.innerHTML = rows || '<tr><td colspan="5" style="color:var(--muted)">Press "Next round".</td></tr>';
      $('s11-rx-step').disabled = st.done; $('s11-rx-run').disabled = st.done;
    }
    $('s11-rx-step').addEventListener('click', step);
    $('s11-rx-run').addEventListener('click', function () { var guard = 0; while (!st.done && guard++ < 200) step(); });
    $('s11-rx-reset').addEventListener('click', reset);
    $('s11-rx-shuf').addEventListener('click', function () { st.seedShuffle++; reset(); });
    [sF, sH, sM, sR].forEach(function (s) { s.addEventListener('input', reset); });
    seg('s11-rx-n1', 's11-rx-n0', function (v) { useNumt = v; reset(); });
    reset();
  })();
})();
