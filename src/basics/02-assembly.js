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
  // Letter drawings never scroll sideways: shrink the letters until the drawing fits its box.
  function fitMaps() {
    Array.prototype.forEach.call(document.querySelectorAll('.b-map'), function (m) {
      m.style.fontSize = '';
      for (var it = 0; it < 4 && m.scrollWidth > m.clientWidth + 1; it++) {
        var f = parseFloat(getComputedStyle(m).fontSize);
        m.style.fontSize = Math.max(6, f * (m.clientWidth - 2) / m.scrollWidth) + 'px';
      }
    });
  }
  var fitT = 0;
  window.addEventListener('resize', function () { clearTimeout(fitT); fitT = setTimeout(fitMaps, 80); });
  new MutationObserver(function () { clearTimeout(fitT); fitT = setTimeout(fitMaps, 0); }).observe(document.body, { childList: true, subtree: true });

  // 1. Reads from a chromosome. Each read: start p, length l, letters s, flow-cell spot x/y.
  var CH = '', placed = [], sel = -1, hov = -1, i;
  function randChrom(n) { var s = ''; for (i = 0; i < n; i++) s += 'ACGT'[Math.floor(rnd() * 4)]; return s; }
  CH = randChrom(48);
  function RLen() { return Math.min(+$('b-rl').value, CH.length); }
  function rc(s) { return s.split('').reverse().map(function (c) { return { A: 'T', C: 'G', G: 'C', T: 'A' }[c]; }).join(''); }
  function count(s) { var n = 0, p = CH.indexOf(s); while (p >= 0) { n++; p = CH.indexOf(s, p + 1); } return n; }
  function nPlaces(s) { var r = rc(s); return count(s) + (r === s ? 0 : count(r)); }   // both strands, as a mapper searches
  function innerRepeat(s) {
    var m = s.match(/([ACGT])\1{3,}/);
    if (m) return 'a run of one letter, ' + m[0];
    m = s.match(/([ACGT]{2,3})\1{2,}/);
    if (m && !/^(.)\1+$/.test(m[1])) return 'a short unit repeated, ' + m[0] + ' (' + m[1] + ' × ' + (m[0].length / m[1].length) + ')';
    return '';
  }
  function readOne() {
    var l = RLen(), r = rnd(), src = placed.length ? placed[Math.floor(rnd() * placed.length)] : null, d;
    if (src && src.l === l && r < 0.08) d = { p: src.p, x: src.x + 15 + Math.floor(rnd() * 60), y: src.y + 15 + Math.floor(rnd() * 60) };  // optical copy: same molecule, next spot
    else if (src && src.l === l && r < 0.16) d = { p: src.p, x: Math.floor(rnd() * 20000), y: Math.floor(rnd() * 20000) };              // PCR copy: same molecule, anywhere
    else d = { p: Math.floor(rnd() * (CH.length - l + 1)), x: Math.floor(rnd() * 20000), y: Math.floor(rnd() * 20000) };
    d.l = l; d.s = CH.slice(d.p, d.p + l); d.n = placed.length + 1;
    placed.push(d); sel = placed.length - 1;
  }
  function card(k) {
    if (k < 0 || !placed[k]) return 'No read yet. Press <b>Read one piece</b>.';
    var d = placed[k], n = nPlaces(d.s), rep = innerRepeat(d.s), dups = [];
    placed.forEach(function (o, q) {
      if (q === k || o.p !== d.p || o.l !== d.l) return;
      dups.push({ n: o.n, dist: Math.round(Math.hypot(o.x - d.x, o.y - d.y)) });
    });
    dups.sort(function (a, b) { return a.dist - b.dist; });
    var t = '<b>Read ' + d.n + '</b> <span class="b-k">· bases ' + (d.p + 1) + '–' + (d.p + d.l) + ' · ' + d.l + ' letters · flow-cell spot ' + d.x + ', ' + d.y + '</span><br>';
    t += '<span class="b-k">Unique?</span> ' + (n === 1 ? 'Yes, it fits one place only: a mapper is sure where it goes (MAPQ 60).' : 'No, it fits ' + n + ' places (both strands counted): a mapper cannot choose (MAPQ 0).') + '<br>';
    t += '<span class="b-k">Duplicate?</span> ' + (dups.length ? 'Same start as ' + dups.map(function (o) {
      return 'read ' + o.n + ' (' + o.dist.toLocaleString('en') + ' px away: <b>' + (o.dist <= 100 ? 'optical' : 'PCR') + '</b>)';
    }).join(', ') + '. Within 100 px on the flow cell = optical (one cluster read twice); farther = PCR (copies of one molecule).' : 'No other read starts here.') + '<br>';
    t += '<span class="b-k">Internal repeat?</span> ' + (rep ? 'Yes: ' + rep + '.' : 'None.');
    return t;
  }
  function drawChrom() {
    var rows = [], html = '', depth = new Array(CH.length).fill(0), show = hov >= 0 ? hov : sel;
    placed.forEach(function (d) { for (var q = d.p; q < d.p + d.l; q++) depth[q]++; });
    html += '<div class="b-cap">Chromosome</div><div class="b-row b-ch"><div class="b-strip">' + CH.split('').map(function (c, p) {
      return '<span class="b-' + c + (placed.length && !depth[p] ? ' b-unc' : '') + '">' + c + '</span>';
    }).join('') + '</div></div><div class="b-gap"></div>';
    placed.map(function (d, q) { return q; }).sort(function (x, y) { return placed[x].p - placed[y].p || x - y; }).forEach(function (q) {
      var d = placed[q], k = 0;
      while (k < rows.length && rows[k].end >= d.p) k++;
      if (k === rows.length) rows.push({ end: -2, cells: [] });
      rows[k].end = d.p + d.l; rows[k].cells.push(q);
    });
    rows.forEach(function (row, ri) {
      var cells = new Array(CH.length).fill('<span></span>');
      row.cells.forEach(function (q) {
        var d = placed[q];
        for (var k = 0; k < d.l; k++) cells[d.p + k] = '<span data-i="' + q + '" class="b-' + d.s[k] + ' b-x' + (k === 0 ? ' b-s' : '') + (k === d.l - 1 ? ' b-e' : '') + (q === show ? ' b-on' : '') + '">' + d.s[k] + '</span>';
      });
      html += (ri === 0 ? '<div class="b-cap">Reads, each under the bases it was copied from</div>' : '') + '<div class="b-row b-rd"><div class="b-strip">' + cells.join('') + '</div></div>';
    });
    $('b-chrom').innerHTML = html;
    $('b-card').innerHTML = card(show);
    var sum = depth.reduce(function (a, v) { return a + v; }, 0), un = depth.filter(function (v) { return !v; }).length;
    $('b-s-n').textContent = placed.length;
    $('b-s-mean').textContent = (sum / CH.length).toFixed(1) + '×';
    $('b-s-max').textContent = Math.max.apply(null, depth) + '×';
    $('b-s-un').textContent = un + ' of ' + CH.length + ' bases (' + Math.round(100 * un / CH.length) + ' %)';
    $('b-rl-o').textContent = RLen() + ' bases';
  }
  function restart() { placed = []; sel = -1; hov = -1; drawChrom(); }
  $('b-read').addEventListener('click', function () { readOne(); hov = -1; drawChrom(); });
  $('b-read10').addEventListener('click', function () { for (var k = 0; k < 10; k++) readOne(); hov = -1; drawChrom(); });
  $('b-readclear').addEventListener('click', restart);
  $('b-rl').addEventListener('input', function () { $('b-rl-o').textContent = RLen() + ' bases'; });
  $('b-chrom').addEventListener('mouseover', function (e) { var t = e.target.closest('[data-i]'); if (t && +t.dataset.i !== hov) { hov = +t.dataset.i; drawChrom(); } });
  $('b-chrom').addEventListener('mouseleave', function () { if (hov >= 0) { hov = -1; drawChrom(); } });
  $('b-chrom').addEventListener('click', function (e) { var t = e.target.closest('[data-i]'); if (t) { sel = +t.dataset.i; hov = -1; drawChrom(); } });
  $('b-rand').addEventListener('click', function () { CH = randChrom(48); $('b-seqmsg').textContent = 'A new random chromosome of 48 bases.'; restart(); });
  $('b-use').addEventListener('click', function () {
    var raw = $('b-seq').value.toUpperCase().replace(/[\s0-9]/g, '');
    if (/[^ACGT]/.test(raw)) { $('b-seqmsg').textContent = 'Only the letters A, C, G and T, please (spaces and numbers are ignored).'; return; }
    if (raw.length < 20 || raw.length > 200) { $('b-seqmsg').textContent = 'Please give 20 to 200 letters; this has ' + raw.length + '.'; return; }
    CH = raw; $('b-seqmsg').textContent = 'Using your sequence of ' + raw.length + ' bases.'; restart();
  });
  $('b-seq').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('b-use').click(); });
  drawChrom();

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
  function pl(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function drawStacks() {
    var box = $('b-stacks'), X = 0.62;
    box.textContent = '';
    [1, 3, 10, 30].forEach(function (cov, q) {
      var r = rng(covSeed * 10 + q), n = cov * G / L, reads = [], k, p, un = 0, depth = new Array(G).fill(0);
      for (k = 0; k < n; k++) { p = Math.floor(r() * (G - L + 1)); reads.push({ s: p, e: p + L }); }
      reads.sort(function (a, b) { return a.s - b.s; });
      reads.forEach(function (d) { for (p = d.s; p < d.e; p++) depth[p]++; });
      depth.forEach(function (d) { if (!d) un++; });
      var rows = pack(reads), C = contigs(reads), RH = 2.6, cy = rows * RH + 8, h = cy + 22;
      // breaks between neighbouring contigs: a hole (no read covers it) or a short overlap (touching, not joined)
      var holes = [], joins = [];
      if (C[0][0] > 0) holes.push([0, C[0][0]]);
      for (k = 0; k + 1 < C.length; k++) {
        if (C[k + 1][0] >= C[k][1]) holes.push([C[k][1], C[k + 1][0]]);
        else joins.push((C[k][1] + C[k + 1][0]) / 2);
      }
      if (C[C.length - 1][1] < G) holes.push([C[C.length - 1][1], G]);
      var panel = document.createElement('div');
      panel.className = 'b-stack';
      var lab = document.createElement('p');
      lab.className = 'b-lab';
      lab.innerHTML = '<b>' + cov + '× coverage</b>, ' + n + ' reads: ' + C.length + (C.length === 1 ? ' contig' : ' contigs') + ', ' + (100 * un / G).toFixed(0) + ' % not covered' +
        (C.length > 1 ? ' (' + pl(holes.filter(function (o) { return o[0] > 0 && o[1] < G; }).length, 'gap', 'gaps') + ' with no read, ' + pl(joins.length, 'short overlap', 'short overlaps') + ' not joined)' : '');
      panel.appendChild(lab);
      var div = document.createElement('div');
      div.className = 'svgbox'; div.id = 'b-st' + q;
      panel.appendChild(div);
      box.appendChild(panel);
      var svg = svgIn(div.id, 640, h, cov + ' times coverage: stack of reads and the contigs they give');
      reads.forEach(function (d) { el('rect', { x: 10 + d.s * X, y: d.row * RH, width: L * X, height: RH - 0.7, style: 'fill:var(--err)' }, svg); });
      var cut = function (p) { return 10 + p * X; };
      C.forEach(function (c, i) {
        var a = cut(c[0]), e = cut(c[1]);
        if (i > 0 && C[i][0] < C[i - 1][1]) a = cut((C[i - 1][1] + C[i][0]) / 2) + 2.5;
        if (i + 1 < C.length && C[i + 1][0] < c[1]) e = cut((c[1] + C[i + 1][0]) / 2) - 2.5;
        el('rect', { x: a, y: cy, width: Math.max(1, e - a), height: 12, style: 'fill:var(--accent)' }, svg);
      });
      holes.forEach(function (o) {
        el('rect', { x: cut(o[0]) + 0.75, y: cy + 0.75, width: Math.max(1.5, (o[1] - o[0]) * X - 1.5), height: 10.5, style: 'fill:none;stroke:var(--bad);stroke-width:1.5;stroke-dasharray:3 2' }, svg);
      });
      joins.forEach(function (p) { el('rect', { x: cut(p) - 1, y: cy - 3, width: 2, height: 18, style: 'fill:var(--fg)' }, svg); });
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
  // 3. How a repeat complicates assembly. A 44-letter chromosome:
  // start (8) | repeat copy 1 (10) | middle (8) | repeat copy 2 (10) | end (8).
  // Reads are 6 letters, one starting at every letter; two reads are joined when they overlap by 5.
  // The repeat is longer than a read, so reads inside it are the same in both copies.
  var S3 = 'GACATCCA' + 'CGAAGCTTCG' + 'CGGTGATC' + 'CGAAGCTTCG' + 'TTCGACGA', G3 = S3.length, R3 = [8, 26], R3L = 10, RL3 = 6, K3 = 5;
  var P1 = [R3[0] + R3L - RL3, R3[1] + R3L - RL3];       // read 1 = last 6 letters of the repeat, in each copy
  var pick3 = '';
  function inRep3(p) { return R3.some(function (s) { return p >= s && p < s + R3L; }); }
  // contigs as a careful program builds them: join reads only where exactly one read fits, looking right and looking left
  function unitigs3(S, L) {
    var set = {}, q, nodes, succ = {}, pred = {}, used = {}, out = [];
    for (q = 0; q + L <= S.length; q++) set[S.substr(q, L)] = 1;
    nodes = Object.keys(set);
    nodes.forEach(function (u) { succ[u] = []; pred[u] = []; });
    nodes.forEach(function (u) { 'ACGT'.split('').forEach(function (c) { var v = u.slice(1) + c; if (set[v]) { succ[u].push(v); pred[v].push(u); } }); });
    nodes.forEach(function (u) {
      if (used[u] || (pred[u].length === 1 && succ[pred[u][0]].length === 1)) return;
      var s = u, w = u; used[u] = 1;
      while (succ[w].length === 1 && pred[succ[w][0]].length === 1 && !used[succ[w][0]]) { w = succ[w][0]; used[w] = 1; s += w.slice(-1); }
      out.push(s);
    });
    return out;
  }
  function where3(s) { var o = [], p = S3.indexOf(s); while (p >= 0) { o.push(p); p = S3.indexOf(s, p + 1); } return o; }
  // one row on the 44-column grid; segs: [{at, s, cls(k, p), lab}]; s = '' with n draws a striped (lost) stretch
  function row3(segs) {
    var cells = new Array(G3).fill(null), out = [], p;
    segs.forEach(function (g) {
      var n = g.s ? g.s.length : g.n, k;
      for (k = 0; k < n; k++) cells[g.at + k] = { c: g.s ? g.s[k] : '', cls: g.s ? g.cls(k, g.at + k) : 'b5-miss', s: k === 0, e: k === n - 1 };
    });
    segs.forEach(function (g) {
      if (!g.lab) return;
      var n = g.s ? g.s.length : g.n, e = g.at + n;
      if (e < G3 && !cells[e]) cells[e] = { tag: '<span class="b-tg"><i>' + g.lab + '</i></span>' };
      else if (g.at > 0 && !cells[g.at - 1]) cells[g.at - 1] = { tag: '<span class="b-tg b-lf"><i>' + g.lab + '</i></span>' };
    });
    for (p = 0; p < G3; p++) {
      var x = cells[p];
      if (!x) out.push('<span></span>');
      else if (x.tag) out.push(x.tag);
      else if (!x.c) out.push('<span class="' + x.cls + '"></span>');
      else out.push('<span class="b-x ' + x.cls + (x.s ? ' b-s' : '') + (x.e ? ' b-e' : '') + '">' + x.c + '</span>');
    }
    return '<div class="b-row b-rd"><div class="b-strip">' + out.join('') + '</div></div>';
  }
  function chromRow() {
    var lab = new Array(G3).fill('<span></span>');
    R3.forEach(function (s, q) { lab[s] = '<span><i>repeat, copy ' + (q + 1) + '</i></span>'; });
    return '<div class="b-row b-rl"><div class="b-strip">' + lab.join('') + '</div></div>' +
      '<div class="b-row b-ch"><div class="b-strip">' + S3.split('').map(function (c, q) {
        return '<span' + (inRep3(q) ? ' class="b-rp"' : '') + '>' + c + '</span>';
      }).join('') + '</div></div>';
  }
  function drawRep3() {
    var r1 = S3.substr(P1[0], RL3), ov = r1.slice(RL3 - K3), r2 = S3.substr(P1[0] + 1, RL3), r3 = S3.substr(P1[1] + 1, RL3);
    var ovEnd = function (k) { return k >= RL3 - K3 ? 'b-ov' : ''; }, ovStart = function (k) { return k < K3 ? 'b-ov' : ''; };
    var green = function () { return 'b-ok'; };
    var html = '<div class="b-cap">Our chromosome (the program never sees it)</div>' + chromRow() + '<div class="b-gap"></div>';
    html += '<div class="b-cap">Read 1 is the last ' + RL3 + ' letters of the repeat. Copy 1 and copy 2 both give this read, letter for letter the same, so the program cannot know which copy it came from:</div>';
    html += row3([{ at: P1[0], s: r1, cls: ovEnd, lab: 'read 1' }, { at: P1[1], s: r1, cls: ovEnd, lab: 'read 1' }]);
    html += '<div class="b-cap">Two reads in the pile start with read 1’s last ' + K3 + ' letters, ' + ov + ' (each drawn under the place it came from):</div>';
    html += row3([{ at: P1[0] + 1, s: r2, cls: ovStart, lab: 'read 2' }, { at: P1[1] + 1, s: r3, cls: ovStart, lab: 'read 3' }]);
    html += '<div class="b-cap">The program sees only the letters: read 1 ' + r1 + ', read 2 ' + r2 + ', read 3 ' + r3 + '. Read 2 and read 3 both fit after read 1, equally well. What happens next?</div>';
    $('b-ov3').innerHTML = html;
    var out = '', msg = '', E1 = R3[0] + R3L, E2 = R3[1] + R3L;
    if (pick3) {
      out += '<div class="b-cap">Our chromosome</div>' + chromRow() + '<div class="b-gap"></div>';
      if (pick3 === '2') {
        out += '<div class="b-cap">The program takes read 2 and goes on. At the end of copy 2 it meets read 1 again, with the same two reads after it, and this time takes read 3:</div>' +
          row3([{ at: 0, s: S3, cls: green }]);
        msg = 'The whole chromosome, but only by luck, twice: nothing in the letters made read 2 better than read 3 the first time, or read 3 better than read 2 the second time. Had it taken read 2 again, it would have gone round the middle a second time.';
      } else if (pick3 === '3') {
        var built = S3.slice(0, E1) + S3.slice(E2);
        out += '<div class="b-cap">The program takes read 3 and goes on. It builds ' + built + ':</div>' +
          row3([{ at: 0, s: S3.slice(0, E1), cls: green }, { at: E1, s: S3.slice(E2), cls: function () { return 'b-bad'; } },
            { at: E1 + G3 - E2, s: '', n: E2 - E1 }]);
        msg = 'Wrong. After copy 1 the program jumped to what follows copy 2. The middle (' + (R3[1] - E1) + ' letters) and one copy of the repeat (' + R3L + ') are lost, and the end is put right after copy 1. Every read matched, yet the result is not in our chromosome: this is a <dfn>misassembly</dfn>.';
      } else {
        var U = unitigs3(S3, RL3).map(function (s) { return { s: s, at: where3(s) }; }).sort(function (a, b) { return a.at[0] - b.at[0]; });
        out += '<div class="b-cap">A careful program joins two reads only where exactly one read fits, looking right and looking left (an overlap has no direction). It gives these contigs, each drawn under the place it fits:</div>';
        U.forEach(function (u, q) {
          out += row3(u.at.map(function (a, j) {
            return { at: a, s: u.s, cls: function () { return 'b-ok' + (j ? ' b-alt' : ''); }, lab: j ? 'or here' : 'contig ' + (q + 1) + (u.at.length > 1 ? ' (the repeat)' : '') };
          }));
        });
        var rep = U.filter(function (u) { return u.at.length > 1; })[0];
        var f = S3.substr(R3[0], RL3), pa = S3.substr(R3[0] - 1, RL3), pb = S3.substr(R3[1] - 1, RL3);
        msg = 'Why the contigs end where they do. The first read inside the repeat, ' + f + ', fits after two reads: ' + pa + ' (from the start) and ' + pb + ' (from the middle). The last read inside the repeat, read 1, has two reads after it: read 2 and read 3. At both places the program cannot choose, so it stops. ' +
          'The reads between these two places are the same in both copies, so they come together as one contig, contig ' + (U.indexOf(rep) + 1) + ': it has twice as many reads as the rest, and the program cannot tell how many copies there are or where they go. The other contigs reach ' + K3 + ' letters into the repeat, as far as reads still lead to one place. ' +
          'Nothing is wrong, but the chromosome comes out in ' + U.length + ' pieces whose order is unknown. Every repeat longer than the reads cuts the chromosome like this; a genome with thousands of repeats comes out in thousands of contigs. Block 4 shows the way across.';
      }
    }
    $('b-out3').innerHTML = out;
    $('b-omsg').innerHTML = msg;
    Array.prototype.forEach.call($('b-pick').children, function (x) { x.setAttribute('aria-pressed', String(x.dataset.p === pick3)); });
  }
  $('b-pick').addEventListener('click', function (e) { var x = e.target.closest('button'); if (x) { pick3 = x.dataset.p; drawRep3(); } });
  drawRep3();

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

  // 5. Two ways with the same reads. Our chromosome T = relative's chromosome R with an extra stretch inserted and 2 letters changed.
  var B5L = 40, B5X = 26, B5XL = 8, B5RL = 8, B5MIN = 5, b5seed = 1;
  var b5r = rng(505), R5 = '', z5;
  for (z5 = 0; z5 < B5L; z5++) R5 += 'ACGT'[Math.floor(b5r() * 4)];
  var EX5 = ''; for (z5 = 0; z5 < B5XL; z5++) EX5 += 'ACGT'[Math.floor(b5r() * 4)];
  var SNP5 = [9, 33], T5 = R5.split('');
  SNP5.forEach(function (p) { T5[p] = 'ACGT'[('ACGT'.indexOf(R5[p]) + 2) % 4]; });
  T5 = T5.slice(0, B5X).join('') + EX5 + T5.slice(B5X).join('');            // display columns = positions in T
  var COLS5 = T5.length;
  function tcol(rp) { return rp < B5X ? rp : rp + B5XL; }                   // relative position -> column
  function isSnpCol(c) { return SNP5.some(function (p) { return tcol(p) === c; }); }
  function strip5(cls, cells, lab) { return (lab ? '<div class="b-cap">' + lab + '</div>' : '') + '<div class="b-row ' + cls + '"><div class="b-strip">' + cells.join('') + '</div></div>'; }
  function letter(c, extra) { return '<span class="b-' + c + (extra ? ' ' + extra : '') + '">' + c + '</span>'; }
  function blank() { return '<span></span>'; }
  function readRow(p, s, cls) { var cells = new Array(COLS5).fill(blank()); for (var k = 0; k < s.length; k++) cells[p + k] = '<span class="b-' + s[k] + ' b-x ' + cls + (k === 0 ? ' b-s' : '') + (k === s.length - 1 ? ' b-e' : '') + '">' + s[k] + '</span>'; return cells; }
  function packRows(items) {                // items: {c: column, s: letters}; returns rows of items
    var rows = [];
    items.slice().sort(function (x, y) { return x.c - y.c; }).forEach(function (it) {
      var k = 0; while (k < rows.length && rows[k].end >= it.c) k++;
      if (k === rows.length) rows.push({ end: -2, items: [] });
      rows[k].end = it.c + it.s.length; rows[k].items.push(it);
    });
    return rows;
  }
  function compareRow(res) {                // res: array over columns of letter or null (missing); returns cells and counts
    var bad = 0, miss = 0, cells = res.map(function (c, q) {
      if (c === null) { miss++; return '<span class="b5-miss b5-gap">·</span>'; }
      if (c !== T5[q]) { bad++; return letter(c, 'b5-bad'); }
      return letter(c, isSnpCol(q) ? 'b5-snp' : '');
    });
    return { cells: cells, bad: bad, miss: miss };
  }
  function drawWay() {
    var n = +$('b5-n').value, r = rng(b5seed * 7919 + n), reads = [], k, p;
    for (k = 0; k < n; k++) { p = Math.floor(r() * (COLS5 - B5RL + 1)); reads.push({ t: p, s: T5.substr(p, B5RL) }); }
    $('b5-n-o').textContent = n + ' reads of ' + B5RL + ' letters';
    // top: truth, relative, reads
    var top = strip5('b-ch', T5.split('').map(function (c, q) { return letter(c, (q >= B5X && q < B5X + B5XL ? 'b5-ex' : '') + (isSnpCol(q) ? ' b5-snp' : '')); }),
      'Our animal\u2019s chromosome (the truth; in real work we never see it). Orange: the stretch only our animal has. Underlined: letters that differ from the relative.');
    var rel = []; for (k = 0; k < COLS5; k++) rel.push(k >= B5X && k < B5X + B5XL ? '<span class="b5-gap">–</span>' : letter(R5[k < B5X ? k : k - B5XL], isSnpCol(k) ? 'b5-snp' : ''));
    top += '<div class="b-gap"></div>' + strip5('b-ch', rel, 'The relative\u2019s chromosome');
    top += '<div class="b-cap">Our reads, in a pile (the same ' + n + ' reads for both ways)</div><div class="b5-chips">' + reads.map(function (d) { return '<code>' + d.s + '</code>'; }).join('') + '</div>';
    $('b5-top').innerHTML = top;
    // 1. against the relative: best place on R with <= 1 mismatch, unique
    var placed = [], aside = [];
    reads.forEach(function (d) {
      var best = 9, where = [];
      for (var q = 0; q + B5RL <= B5L; q++) {
        var mm = 0; for (var x = 0; x < B5RL && mm <= 1; x++) if (d.s[x] !== R5[q + x]) mm++;
        if (mm < best) { best = mm; where = [q]; } else if (mm === best) where.push(q);
      }
      if (best <= 1 && where.length === 1) placed.push({ q: where[0], s: d.s, mm: best }); else aside.push(d.s);
    });
    var votes = []; for (k = 0; k < B5L; k++) votes.push({});
    placed.forEach(function (d) { for (var x = 0; x < B5RL; x++) votes[d.q + x][d.s[x]] = (votes[d.q + x][d.s[x]] || 0) + 1; });
    var res = new Array(COLS5).fill(null);
    for (k = 0; k < B5L; k++) { var v = votes[k], bestL = null; Object.keys(v).forEach(function (L) { if (!bestL || v[L] > v[bestL]) bestL = L; }); res[tcol(k)] = bestL; }
    var html = '<div class="b-cap">Reads placed on the relative, each where it matches</div>';
    packRows(placed.map(function (d) { var c = tcol(d.q); return { c: c, s: d.s }; })).forEach(function (row) {
      var cells = new Array(COLS5).fill(blank());
      row.items.forEach(function (it) { var rc = readRow(it.c, it.s, 'b-ok'); for (var q = 0; q < COLS5; q++) if (rc[q] !== blank()) cells[q] = rc[q]; });
      html += '<div class="b-row b-rd"><div class="b-strip">' + cells.join('') + '</div></div>';
    });
    html += '<div class="b-cap">Set aside, no place on the relative: ' + aside.length + (aside.length === 1 ? ' read' : ' reads') + '</div><div class="b5-chips">' + (aside.length ? aside.map(function (s) { return '<code class="b5-off">' + s + '</code>'; }).join('') : '<span>none</span>') + '</div>';
    var cmp = compareRow(res);
    html += strip5('b-res', cmp.cells, 'Result: at each place, the letter most of the placed reads have (· = nothing placed there)');
    $('b5-ref').innerHTML = html;
    var exMissing = res.slice(B5X, B5X + B5XL).every(function (c) { return c === null; });
    var fixed = SNP5.filter(function (p2) { return res[tcol(p2)] === T5[tcol(p2)]; }).length;
    $('b5-refmsg').textContent = 'Single-letter differences found: ' + fixed + ' of ' + SNP5.length + '. Extra stretch: ' + (exMissing ? 'missing, because its reads have no place on the relative.' : 'partly shown.') + ' Letters missing: ' + cmp.miss + '; wrong letters: ' + cmp.bad + (cmp.bad ? ' (red: usually a read that reaches a little into the extra stretch, yet still matched the relative with one different letter).' : '.');
    // 2. de novo: drop reads contained in others, then join the pair with the longest overlap (>= B5MIN) until none is left
    var seqs = []; reads.forEach(function (d) { if (seqs.indexOf(d.s) < 0) seqs.push(d.s); });
    seqs = seqs.filter(function (s, q) { return !seqs.some(function (o, w) { return w !== q && o.length > s.length && o.indexOf(s) >= 0; }); });
    for (;;) {
      var bi = -1, bj = -1, bo = 0;
      for (var i5 = 0; i5 < seqs.length; i5++) for (var j5 = 0; j5 < seqs.length; j5++) {
        if (i5 === j5) continue;
        for (var o = Math.min(seqs[i5].length, seqs[j5].length) - 1; o >= B5MIN; o--) if (seqs[i5].slice(-o) === seqs[j5].slice(0, o)) { if (o > bo) { bo = o; bi = i5; bj = j5; } break; }
      }
      if (bi < 0) break;
      var merged = seqs[bi] + seqs[bj].slice(bo);
      seqs = seqs.filter(function (s, q) { return q !== bi && q !== bj; });
      seqs.push(merged);
      seqs = seqs.filter(function (s, q) { return !seqs.some(function (o2, w) { return w !== q && o2.length > s.length && o2.indexOf(s) >= 0; }); });
    }
    var placedC = [], lost = [];
    seqs.forEach(function (s) { var c = T5.indexOf(s); if (c >= 0) placedC.push({ c: c, s: s }); else lost.push(s); });
    html = '<div class="b-cap">Contigs: reads joined by overlaps of at least ' + B5MIN + ' letters, drawn under the place they match (the assembler does not know it)</div>';
    packRows(placedC).forEach(function (row) {
      var cells = new Array(COLS5).fill(blank());
      row.items.forEach(function (it) { var rc = readRow(it.c, it.s, 'b-a'); for (var q = 0; q < COLS5; q++) if (rc[q] !== blank()) cells[q] = rc[q]; });
      html += '<div class="b-row b-rd"><div class="b-strip">' + cells.join('') + '</div></div>';
    });
    if (lost.length) html += '<div class="b-cap">Contigs that match nowhere (a wrong join)</div><div class="b5-chips">' + lost.map(function (s) { return '<code class="b5-off">' + s + '</code>'; }).join('') + '</div>';
    var res2 = new Array(COLS5).fill(null);
    placedC.forEach(function (d) { for (var x = 0; x < d.s.length; x++) res2[d.c + x] = d.s[x]; });
    var cmp2 = compareRow(res2);
    html += strip5('b-res', cmp2.cells, 'Result: the contigs together (· = not in any contig)');
    $('b5-dn').innerHTML = html;
    var exFound = res2.slice(B5X, B5X + B5XL).filter(function (c2) { return c2 !== null; }).length;
    $('b5-dnmsg').textContent = seqs.length + (seqs.length === 1 ? ' contig' : ' contigs') + '. Extra stretch: ' + exFound + ' of ' + B5XL + ' letters found. Single-letter differences found: ' +
      SNP5.filter(function (p2) { return res2[tcol(p2)] === T5[tcol(p2)]; }).length + ' of ' + SNP5.length + '. Letters missing: ' + cmp2.miss + '. ' + (seqs.length > 1 ? 'Where no read overlaps the next by ' + B5MIN + ' letters, the contig ends: more reads join more.' : '');
  }
  $('b5-new').addEventListener('click', function () { b5seed++; drawWay(); });
  $('b5-n').addEventListener('input', drawWay);
  drawWay();

  // 6. N50, every number shown on the picture
  var n50seed = 1;
  function drawN50() {
    var k = +$('b-nk').value, r = rng(k * 31 + n50seed * 977), w = [], s = 0, j6;
    for (j6 = 0; j6 < k; j6++) { w.push(-Math.log(1 - r())); s += w[j6]; }
    w = w.map(function (v) { return 100 * v / s; }).sort(function (a, b) { return b - a; });
    w = w.map(function (v) { return Math.round(v * 10) / 10; });
    var tot = w.reduce(function (a, v) { return a + v; }, 0);
    var acc = 0, stop = -1, run = [];
    w.forEach(function (v, q) { if (stop < 0) { acc += v; run.push(v); if (acc >= tot / 2) stop = q; } });
    var W = 640, bw = (W - 20) / k, mx = w[0], H = 150, svg = svgIn('b-n50', W, H + 16, 'Contigs sorted from longest to shortest, each labelled with its length');
    w.forEach(function (v, q) {
      var h = (H - 18) * v / mx, x = 10 + q * bw, blue = q <= stop;
      el('rect', { x: x, y: H - h, width: Math.max(1, bw - 2), height: h, style: 'fill:' + (blue ? 'var(--accent)' : 'var(--err)') + ';opacity:' + (blue ? 1 : 0.6) }, svg);
      if (bw >= 18) el('text', { x: x + (bw - 2) / 2, y: H - h - 4, 'text-anchor': 'middle', style: 'font-size:' + (bw >= 34 ? 11 : 9) + 'px;fill:var(--fg)' }, svg, v.toFixed(1));
      if (bw >= 14) el('text', { x: x + (bw - 2) / 2, y: H + 12, 'text-anchor': 'middle', style: 'font-size:9px;fill:var(--muted)' }, svg, String(q + 1));
    });
    var svg2 = svgIn('b-n50sum', W, 54, 'The contigs laid end to end with a line at half of the assembly'), X = (W - 20) / tot, x0 = 10;
    w.forEach(function (v, q) {
      var blue = q <= stop;
      el('rect', { x: x0, y: 12, width: Math.max(0.5, v * X - 1.5), height: 22, style: 'fill:' + (blue ? 'var(--accent)' : 'var(--err)') + ';opacity:' + (blue ? 1 : 0.6) }, svg2);
      if (v * X > 26) el('text', { x: x0 + v * X / 2, y: 27, 'text-anchor': 'middle', style: 'font-size:10px;fill:var(--bg)' }, svg2, v.toFixed(1));
      x0 += v * X;
    });
    var hx = 10 + (tot / 2) * X;
    el('line', { x1: hx, x2: hx, y1: 4, y2: 42, style: 'stroke:var(--bad);stroke-width:2;stroke-dasharray:4 3' }, svg2);
    el('text', { x: hx, y: 52, 'text-anchor': 'middle', style: 'font-size:10px;fill:var(--bad)' }, svg2, 'half = ' + (tot / 2).toFixed(1) + ' Mb');
    var sums = [], a6 = 0; run.forEach(function (v) { a6 += v; sums.push(a6.toFixed(1)); });
    $('b-n50calc').innerHTML = 'Step 3. Add the longest first: ' + run.map(function (v) { return v.toFixed(1); }).join(' + ') + ' = <b>' + a6.toFixed(1) + ' Mb</b>, the first sum to reach half of ' + tot.toFixed(1) + ' Mb (' + (tot / 2).toFixed(1) + ' Mb). The contig that got us there is ' + w[stop].toFixed(1) + ' Mb long: that is the N50.';
    $('b-n50k').textContent = k;
    $('b-n50tot').textContent = tot.toFixed(1) + ' Mb';
    $('b-n50v').textContent = w[stop].toFixed(1) + ' Mb';
    $('b-n50c').textContent = stop + 1;
  }
  $('b-nk').addEventListener('input', drawN50);
  $('b-n50new').addEventListener('click', function () { n50seed++; drawN50(); });
  drawN50();
})();
