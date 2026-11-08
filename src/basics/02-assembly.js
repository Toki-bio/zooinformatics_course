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
  function svgIn(id, w, h, label) {
    var box = $(id);
    box.textContent = '';
    return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'img', 'aria-label': label, style: 'display:block' }, box);
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
  var rnd = rng(2026);

  // 1. Reads from a chromosome
  var RL = 12, CH = '', i;
  for (i = 0; i < 48; i++) CH += 'ACGT'[Math.floor(rnd() * 4)];
  var hits = [], reads = [], placed = [];   // reads: shuffled list (what we get); placed: {p, s} in order of reading
  function drawChrom() {
    var last = placed.length ? placed[placed.length - 1] : null, rows = [], html = '';
    html += '<div class="b-row b-ch" aria-label="chromosome">' + CH.split('').map(function (c, p) {
      return '<span class="b-' + c + (hits[p] ? ' b-hit' : '') + '">' + c + '</span>';
    }).join('') + '</div><div class="b-gap"></div>';
    placed.slice().sort(function (x, y) { return x.p - y.p; }).forEach(function (r) {   // stack: a read goes in the first row where it does not touch another
      var k = 0;
      while (k < rows.length && rows[k].end >= r.p) k++;
      if (k === rows.length) rows.push({ end: -2, cells: [] });
      rows[k].end = r.p + RL; rows[k].cells.push(r);
    });
    rows.forEach(function (row) {
      var cells = new Array(CH.length).fill('<span></span>');
      row.cells.forEach(function (r) {
        for (var k = 0; k < RL; k++) {
          var c = r.s[k];
          cells[r.p + k] = '<span class="b-' + c + ' b-x' + (r === last ? ' b-on' : '') + '">' + c + '</span>';
        }
      });
      html += '<div class="b-row b-rd">' + cells.join('') + '</div>';
    });
    $('b-chrom').innerHTML = html;
  }
  function readOne() {
    var p = Math.floor(rnd() * (CH.length - RL + 1)), k, s = CH.slice(p, p + RL);
    for (k = p; k < p + RL; k++) hits[k] = true;
    placed.push({ p: p, s: s });
    reads.splice(Math.floor(rnd() * (reads.length + 1)), 0, s);
    return p;
  }
  function showReads() {
    var last = placed.length ? placed[placed.length - 1].s : null, done = false;
    $('b-reads').innerHTML = reads.length ? reads.map(function (r) {
      var on = !done && r === last; if (on) done = true;
      return '<code' + (on ? ' class="b-on"' : '') + '>' + r + '</code>';
    }).join(' ') : 'No reads yet.';
  }
  $('b-read').addEventListener('click', function () { var p = readOne(); drawChrom(p); showReads(); });
  $('b-read10').addEventListener('click', function () { var p, k; for (k = 0; k < 10; k++) p = readOne(); drawChrom(p); showReads(); });
  $('b-readclear').addEventListener('click', function () { hits = []; reads = []; placed = []; drawChrom(); showReads(); });
  drawChrom(); showReads();

  // Shared: stack reads in rows so that they do not touch.
  function pack(reads) {                   // reads: [{s, e}] sorted by s; sets r.row, returns the number of rows
    var ends = [];
    reads.forEach(function (r) {
      var k = 0;
      while (k < ends.length && ends[k] + 2 > r.s) k++;
      r.row = k; ends[k] = r.e;
    });
    return ends.length;
  }

  // 2. Stacks of reads at four coverages
  var G = 1000, L = 50, MINOV = 10, covSeed = 7;
  function contigs(reads) {
    var out = [], cur = null;
    reads.forEach(function (r) {
      if (cur && r.s <= cur[1] - MINOV) cur[1] = Math.max(cur[1], r.e);
      else if (!cur || r.e > cur[1]) { cur = [r.s, r.e]; out.push(cur); }
    });
    return out;
  }
  function drawStacks() {
    var box = $('b-stacks'), X = 0.62;
    box.textContent = '';
    [1, 3, 10, 30].forEach(function (cov, q) {
      var r = rng(covSeed * 10 + q), n = cov * G / L, reads = [], k, p, un = 0, depth = new Array(G).fill(0);
      for (k = 0; k < n; k++) { p = Math.floor(r() * (G - L + 1)); reads.push({ s: p, e: p + L }); }
      reads.sort(function (a, b) { return a.s - b.s; });
      reads.forEach(function (d) { for (p = d.s; p < d.e; p++) depth[p]++; });
      depth.forEach(function (d) { if (!d) un++; });
      var rows = pack(reads), C = contigs(reads), RH = 2.6, h = rows * RH + 24;
      var lab = document.createElement('p');
      lab.className = 'b-lab';
      lab.innerHTML = '<b>' + cov + '×</b> ' + n + ' reads: ' + C.length + (C.length === 1 ? ' contig' : ' contigs') + ', ' + (100 * un / G).toFixed(0) + ' % not covered';
      box.appendChild(lab);
      var div = document.createElement('div');
      div.className = 'svgbox'; div.id = 'b-st' + q;
      box.appendChild(div);
      var svg = svgIn(div.id, 640, h, cov + ' times coverage: stack of reads and the contigs they give');
      reads.forEach(function (d) { el('rect', { x: 10 + d.s * X, y: d.row * RH, width: L * X, height: RH - 0.7, style: 'fill:var(--err)' }, svg); });
      for (p = 0; p < G; p++) if (!depth[p]) el('rect', { x: 10 + p * X, y: h - 20, width: X + 0.3, height: 5, style: 'fill:var(--bad)' }, svg);
      C.forEach(function (c, i) { el('rect', { x: 10 + c[0] * X, y: h - 12, width: Math.max(1, (c[1] - c[0]) * X - 1.5), height: 10, style: 'fill:' + (i % 2 ? 'var(--rep)' : 'var(--accent)') }, svg); });
    });
  }
  $('b-new').addEventListener('click', function () { covSeed++; drawStacks(); });
  drawStacks();

  // 3 and 4. One real genome of 600 bases with a 60-base repeat in two places.
  var GL = 600, RS = [150, 380], RL2 = 60, GEN = '', gr = rng(55), z;
  for (z = 0; z < GL; z++) GEN += 'ACGT'[Math.floor(gr() * 4)];
  GEN = GEN.slice(0, RS[1]) + GEN.slice(RS[0], RS[0] + RL2) + GEN.slice(RS[1] + RL2);
  function places(seq) {
    var o = [], p = GEN.indexOf(seq);
    while (p >= 0) { o.push(p); p = GEN.indexOf(seq, p + 1); }
    return o;
  }
  function genomeBar(svg, y, X) {
    el('rect', { x: 10, y: y, width: GL * X, height: 12, style: 'fill:var(--err);opacity:.5' }, svg);
    RS.forEach(function (s) { el('rect', { x: 10 + s * X, y: y, width: RL2 * X, height: 12, style: 'fill:var(--bad)' }, svg); });
  }
  var omode = 'uni', OSTART = { uni: 60, rep: 160 };
  function uniqueAt(p) { var k = 1; while (places(GEN.substr(p, k)).length > 1) k++; return k; }
  function drawPlaces() {
    var k = +$('b-ok').value, p0 = OSTART[omode], seq = GEN.substr(p0, k), hits = places(seq), X = 620 / GL;
    var shown = hits.slice(0, 12), H = 24 + shown.length * 9 + 6;
    var svg = svgIn('b-places', 640, Math.max(H, 44), 'Genome with every place where the overlap occurs');
    genomeBar(svg, 4, X);
    hits.forEach(function (h) { el('rect', { x: 10 + h * X - 0.7, y: 1, width: Math.max(1.6, k * X), height: 18, style: 'fill:var(--accent)' }, svg); });
    shown.forEach(function (h, i) {
      var a = Math.max(0, h - 4), w = k + 30;
      el('rect', { x: 10 + a * X, y: 24 + i * 9, width: Math.min(w, GL - a) * X, height: 6, style: 'fill:' + (hits.length === 1 ? 'var(--good)' : 'var(--het)') }, svg);
    });
    $('b-k-out').textContent = k + ' bases';
    $('b-oseq').textContent = seq;
    $('b-ocount').textContent = hits.length;
    Array.prototype.forEach.call($('b-omode').children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.m === omode)); });
    var msg;
    if (hits.length === 1) msg = 'One place only: a read with this overlap can belong here and nowhere else, so the join is safe.';
    else if (omode === 'rep') msg = 'The overlap lies inside the repeat, so it occurs in both copies however long it gets. It becomes unique only when it runs past the end of the repeat and the two copies start to differ: here at ' + uniqueAt(p0) + ' bases.';
    else msg = 'This run of bases occurs in ' + hits.length + ' places by chance' + (hits.length > 12 ? ' (the first 12 are drawn)' : '') + ', so reads from any of them would seem to fit. Make the overlap longer.';
    $('b-omsg').textContent = msg;
  }
  $('b-ok').addEventListener('input', drawPlaces);
  $('b-omode').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { omode = b.dataset.m; drawPlaces(); } });
  drawPlaces();

  var repSeed = 3, MINJ = 12;
  function inRepeat(d) { return RS.some(function (s) { return d.s >= s && d.e <= s + RL2; }); }
  function crosses(d) { return RS.some(function (s) { return d.s < s && d.e > s + RL2; }); }
  function repContigs(reads) {             // reads sorted by start; those wholly inside a repeat have no known place
    var out = [], cur = null;
    reads.forEach(function (d) {
      if (inRepeat(d)) return;
      if (!cur) { cur = [d.s, d.e]; out.push(cur); return; }
      if (d.e <= cur[1]) return;           // adds nothing to the contig
      var ov = cur[1] - d.s;
      if (ov >= MINJ && places(GEN.slice(d.s, cur[1])).length === 1) cur[1] = d.e;
      else { cur = [d.s, d.e]; out.push(cur); }
    });
    return out;
  }
  function drawRep() {
    var l = +$('b-l').value, n = Math.round(20 * GL / l), r = rng(repSeed * 1000 + l), reads = [], k, p, X = 620 / GL;
    for (k = 0; k < n; k++) { p = Math.floor(r() * (GL - l + 1)); reads.push({ s: p, e: p + l }); }
    reads.sort(function (a, b) { return a.s - b.s; });
    var rows = pack(reads), RH = 3, top = 20, C = repContigs(reads), inside = reads.filter(inRepeat).length, cross = reads.filter(crosses).length;
    var H = top + rows * RH + 26;
    var svg = svgIn('b-rep', 640, H, 'Stack of reads over a genome with a repeat in two places, and the contigs they give');
    RS.forEach(function (s) { el('rect', { x: 10 + s * X, y: 0, width: RL2 * X, height: H - 18, style: 'fill:var(--bad);opacity:.14' }, svg); });
    genomeBar(svg, 3, X);
    reads.forEach(function (d) {
      var c = inRepeat(d) ? 'var(--bad)' : (crosses(d) ? 'var(--good)' : 'var(--err)');
      el('rect', { x: 10 + d.s * X, y: top + d.row * RH, width: l * X, height: RH - 0.8, style: 'fill:' + c }, svg);
    });
    C.forEach(function (c, i) { el('rect', { x: 10 + c[0] * X, y: H - 14, width: Math.max(1, (c[1] - c[0]) * X - 2), height: 11, style: 'fill:' + (i % 2 ? 'var(--rep)' : 'var(--accent)') }, svg); });
    $('b-l-o').textContent = l + ' bases';
    $('b-r1').textContent = C.length;
    $('b-r2').textContent = inside;
    $('b-r3').textContent = cross;
    var msg;
    if (l <= RL2) msg = 'These reads are not longer than the repeat, so none can cross it: the assembly stops at the repeats, however many reads we add.';
    else if (C.length > 1) msg = 'Reads can now cross a repeat, but it takes one that starts before it and ends after it. Just above the repeat length few reads manage that. Press New random reads, or make them longer.';
    else msg = 'Reads cross both repeats, and their overlaps reach unique sequence. The whole genome comes out as one contig.';
    $('b-repmsg').textContent = msg;
  }
  $('b-l').addEventListener('input', drawRep);
  $('b-lnew').addEventListener('click', function () { repSeed++; drawRep(); });
  drawRep();

  // 5. Two ways
  var way = 'ref';
  function drawWay() {
    var svg = svgIn('b-ways', 640, 150, 'A new animal has a stretch its relative lacks');
    function bar(x, w, y, c, t) {
      el('rect', { x: x, y: y, width: w, height: 22, style: 'fill:' + c + ';opacity:.8' }, svg);
      if (t) el('text', { x: x + w / 2, y: y + 15, 'text-anchor': 'middle', style: 'font-size:12px;fill:var(--bg)' }, svg, t);
    }
    function label(y, t) { el('text', { x: 10, y: y, style: 'font-size:12px;fill:var(--muted)' }, svg, t); }
    label(14, 'Our animal really has');
    bar(10, 200, 20, 'var(--accent)'); bar(210, 120, 20, 'var(--het)', 'extra stretch'); bar(330, 200, 20, 'var(--accent)');
    if (way === 'ref') {
      label(64, 'Genome of the relative');
      bar(10, 200, 70, 'var(--err)'); bar(210, 200, 70, 'var(--err)');
      label(114, 'What we get');
      bar(10, 200, 120, 'var(--accent)'); bar(210, 200, 120, 'var(--accent)');
      el('text', { x: 424, y: 136, style: 'font-size:12px;fill:var(--bad)' }, svg, 'reads from the extra stretch: no place');
    } else {
      label(64, 'No other genome used');
      label(114, 'What we get');
      bar(10, 200, 120, 'var(--accent)'); bar(210, 120, 120, 'var(--het)', 'found'); bar(330, 200, 120, 'var(--accent)');
    }
    Array.prototype.forEach.call($('b-way').children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.w === way)); });
    $('b-waymsg').textContent = way === 'ref' ? 'Reads are placed where they fit on the relative. Reads from a stretch the relative lacks have nowhere to go, and the result cannot show that stretch.'
      : 'Reads are joined to each other, so a stretch unique to our animal is kept. This needs more reads and longer reads, and much more computing.';
  }
  $('b-way').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { way = b.dataset.w; drawWay(); } });
  drawWay();

  // 6. N50
  function drawN50() {
    var k = +$('b-nk').value, r = rng(k * 31 + 5), w = [], s = 0, j;
    for (j = 0; j < k; j++) { w.push(-Math.log(1 - r())); s += w[j]; }
    w = w.map(function (v) { return 100 * v / s; }).sort(function (a, b) { return b - a; });
    var acc = 0, stop = -1;
    w.forEach(function (v, q) { if (stop < 0) { acc += v; if (acc >= 50) stop = q; } });
    var svg = svgIn('b-n50', 640, 130, 'Contigs sorted from longest to shortest');
    var bw = 620 / k, mx = w[0];
    w.forEach(function (v, q) {
      var h = 104 * v / mx;
      el('rect', { x: 10 + q * bw, y: 112 - h, width: Math.max(1, bw - 2), height: h, style: 'fill:' + (q <= stop ? 'var(--accent)' : 'var(--err)') + ';opacity:' + (q <= stop ? 1 : 0.55) }, svg);
    });
    el('text', { x: 630, y: 126, 'text-anchor': 'end', style: 'font-size:11px;fill:var(--muted)' }, svg, 'contigs, longest first');
    $('b-n50k').textContent = k;
    $('b-n50v').textContent = w[stop].toFixed(1) + ' Mb';
    $('b-n50c').textContent = stop + 1;
  }
  $('b-nk').addEventListener('input', drawN50);
  drawN50();
})();
