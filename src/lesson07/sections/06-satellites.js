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
  var B = 'ACGT';
  function randSeq(r, n) { var s = ''; for (var i = 0; i < n; i++) s += B.charAt(Math.floor(r() * 4)); return s; }
  // change each base with probability p to one of the three other bases
  function mutate(r, s, p) {
    var o = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (r() < p) { var j = B.indexOf(c); c = B.charAt((j + 1 + Math.floor(r() * 3)) % 4); }
      o += c;
    }
    return o;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  var VCOL = ['var(--accent)', 'var(--het)', 'var(--rep)', 'var(--good)', 'var(--bad)'];
  var VNAME = ['a', 'b', 'c', 'd', 'e'];

  // =====================================================================
  // (a) dot plot of a toy array
  // =====================================================================
  (function () {
    var svg = $('s06-dot-svg'), psvg = $('s06-prof-svg'), out = $('s06-dot-out');
    if (!svg || !psvg || !out) return;
    var sL = $('s06-dot-l'), sK = $('s06-dot-k'), sD = $('s06-dot-d'), sM = $('s06-dot-m');
    var seg = $('s06-dot-w'), lgv = $('s06-dot-lgv');
    var W = 8, seed = 7;
    var FL = 90; // flank length

    function build() {
      var L = +sL.value, K = +sK.value, dv = +sD.value / 100, mu = +sM.value / 100;
      var r = rng(seed * 7919 + 13);
      var base = randSeq(r, L);
      var vars = [];
      for (var j = 0; j < K; j++) vars.push(K === 1 ? base : mutate(r, base, dv));
      var n = Math.max(2, Math.round(600 / (L * K)));
      var left = randSeq(r, FL), right = randSeq(r, FL);
      var arr = '', lab = [];
      for (var c = 0; c < n; c++) for (j = 0; j < K; j++) { arr += mutate(r, vars[j], mu); lab.push(j); }
      return { L: L, K: K, n: n, s: left + arr + right, a0: FL, a1: FL + arr.length, lab: lab, dv: dv, mu: mu };
    }

    function draw() {
      var d = build(), s = d.s, N = s.length;
      $('s06-dot-lv').textContent = d.L + ' bp';
      $('s06-dot-kv').textContent = d.K === 1 ? '1 (no HOR)' : String(d.K);
      $('s06-dot-dv').textContent = sD.value + ' %' + (d.K === 1 ? ' (unused)' : '');
      $('s06-dot-mv').textContent = sM.value + ' %';
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var X0 = 70, Y0 = 40, S = 450, sc = S / N;
      // schematic bars along top and left
      function bars(horiz) {
        var g = el('g', {}, svg);
        function rect(p0, p1, col, op) {
          if (horiz) el('rect', { x: X0 + p0 * sc, y: Y0 - 16, width: Math.max(0.6, (p1 - p0) * sc), height: 10, fill: col, opacity: op }, g);
          else el('rect', { x: X0 - 16, y: Y0 + p0 * sc, width: 10, height: Math.max(0.6, (p1 - p0) * sc), fill: col, opacity: op }, g);
        }
        rect(0, d.a0, 'var(--muted)', 0.5);
        rect(d.a1, N, 'var(--muted)', 0.5);
        for (var i = 0; i < d.lab.length; i++) {
          var p0 = d.a0 + i * d.L;
          rect(p0, p0 + d.L - 0.4 / sc, VCOL[d.lab[i]], 0.9);
        }
      }
      bars(true); bars(false);
      el('rect', { x: X0, y: Y0, width: S, height: S, fill: 'none', stroke: 'var(--line)' }, svg);
      // array square
      el('rect', { x: X0 + d.a0 * sc, y: Y0 + d.a0 * sc, width: (d.a1 - d.a0) * sc, height: (d.a1 - d.a0) * sc, fill: 'none', stroke: 'var(--line)', 'stroke-dasharray': '3 3' }, svg);
      // word matches: runs of identical bases of length >= W along each diagonal
      var path = '', nseg = 0;
      for (var off = 1; off < N; off++) {
        var run = 0;
        for (var i = 0; i + off <= N; i++) {
          var eq = (i + off < N) && s.charCodeAt(i) === s.charCodeAt(i + off);
          if (eq) run++;
          else {
            if (run >= W) {
              var st = i - run, len = (run * sc).toFixed(1);
              // below the main diagonal (x = i, y = i + off) and its mirror image above it
              path += 'M' + (X0 + st * sc).toFixed(1) + ' ' + (Y0 + (st + off) * sc).toFixed(1) + 'l' + len + ' ' + len;
              path += 'M' + (X0 + (st + off) * sc).toFixed(1) + ' ' + (Y0 + st * sc).toFixed(1) + 'l' + len + ' ' + len;
              nseg++;
            }
            run = 0;
          }
        }
      }
      el('path', { d: path, stroke: 'var(--accent)', 'stroke-width': 1.3, fill: 'none', 'stroke-linecap': 'round' }, svg);
      el('line', { x1: X0, y1: Y0, x2: X0 + S, y2: Y0 + S, stroke: 'var(--accent)', 'stroke-width': 1.6 }, svg);
      // axes labels
      el('text', { x: X0 + S / 2, y: Y0 + S + 22, 'text-anchor': 'middle' }, svg, 'position in the sequence (bp)');
      el('text', { x: X0, y: Y0 + S + 12, 'text-anchor': 'start' }, svg, '1');
      el('text', { x: X0 + S, y: Y0 + S + 12, 'text-anchor': 'end' }, svg, String(N));
      el('text', { x: X0 + S / 2, y: 14, 'text-anchor': 'middle', 'class': 'lab' }, svg, 'the same sequence, compared with itself');
      // right panel: facts
      var tx = X0 + S + 26, ty = Y0 + 10;
      function line(t, cls) { el('text', { x: tx, y: ty, 'class': cls || '' }, svg, t); ty += 18; }
      line('Toy sequence', 'lab');
      line('flanks: 2 x ' + FL + ' bp, random');
      line('array: ' + (d.a1 - d.a0) + ' bp');
      line('monomer: ' + d.L + ' bp');
      if (d.K > 1) {
        line('HOR unit: ' + d.K + ' x ' + d.L + ' = ' + (d.K * d.L) + ' bp');
        line('HOR copies: ' + d.n);
      } else {
        line('no HOR: one variant');
        line('monomer copies: ' + d.n);
      }
      line('word length: ' + W);
      line('match segments: ' + nseg);
      ty += 8;
      line('Expect diagonals at', 'lab');
      line('distance ' + d.L + ', ' + (2 * d.L) + ', ' + (3 * d.L) + ' bp ...');
      if (d.K > 1) line('strongest every ' + (d.K * d.L) + ' bp');
      // legend of variants
      var lg = '';
      for (var j = 0; j < d.K; j++) lg += '<span style="white-space:nowrap"><i style="background:' + VCOL[j] + '"></i>monomer variant ' + VNAME[j] + '</span>';
      lgv.innerHTML = lg;

      // ---------------- offset profile ----------------
      while (psvg.firstChild) psvg.removeChild(psvg.firstChild);
      var aLen = d.a1 - d.a0;
      var Dmax = Math.min(aLen - d.L, Math.max(Math.round(2.5 * d.K * d.L), 3 * d.L), 400);
      var prof = [0];
      for (var o = 1; o <= Dmax; o++) {
        var m = 0, t = 0;
        for (var p = d.a0; p + o < d.a1; p++) { t++; if (s.charCodeAt(p) === s.charCodeAt(p + o)) m++; }
        prof.push(t ? m / t : 0);
      }
      var PX0 = 70, PW = 660, PY0 = 22, PH = 130, bw = PW / Dmax;
      el('line', { x1: PX0, y1: PY0 + PH, x2: PX0 + PW, y2: PY0 + PH, 'class': 'ax' }, psvg);
      el('line', { x1: PX0, y1: PY0, x2: PX0, y2: PY0 + PH, 'class': 'ax' }, psvg);
      [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
        var y = PY0 + PH - v * PH;
        if (v > 0) el('line', { x1: PX0, y1: y, x2: PX0 + PW, y2: y, 'class': 'grid' }, psvg);
        el('text', { x: PX0 - 6, y: y + 4, 'text-anchor': 'end' }, psvg, Math.round(v * 100) + '%');
      });
      var best = 1;
      for (o = 1; o <= Dmax; o++) {
        if (prof[o] > prof[best] + 1e-9) best = o;
        var isL = o % d.L === 0, isH = d.K > 1 && o % (d.K * d.L) === 0;
        var col = isH ? 'var(--het)' : (isL ? 'var(--accent)' : 'var(--err)');
        var h = prof[o] * PH;
        el('rect', { x: PX0 + (o - 1) * bw, y: PY0 + PH - h, width: Math.max(0.8, bw - 0.4), height: h, fill: col }, psvg);
      }
      el('line', { x1: PX0, y1: PY0 + PH * 0.75, x2: PX0 + PW, y2: PY0 + PH * 0.75, stroke: 'var(--fg)', 'stroke-dasharray': '5 4', 'stroke-width': 1, opacity: 0.7 }, psvg);
      // tick labels: multiples of L
      for (o = d.L; o <= Dmax; o += d.L) {
        var x = PX0 + (o - 0.5) * bw;
        el('text', { x: x, y: PY0 + PH + 14, 'text-anchor': 'middle' }, psvg, String(o));
      }
      el('text', { x: PX0 + PW / 2, y: PY0 + PH + 34, 'text-anchor': 'middle' }, psvg, 'offset d (bp): the array compared with itself shifted by d');
      el('text', { x: PX0, y: 12, 'class': 'lab' }, psvg, 'identical bases at offset d');
      var key = el('g', {}, psvg);
      el('line', { x1: PX0 + 560, y1: 8, x2: PX0 + 580, y2: 8, stroke: 'var(--fg)', 'stroke-dasharray': '5 4', opacity: 0.7 }, key);
      el('text', { x: PX0 + 584, y: 12 }, key, 'chance 25 %');
      el('rect', { x: PX0 + 230, y: 4, width: 10, height: 8, fill: 'var(--accent)' }, key);
      el('text', { x: PX0 + 244, y: 12 }, key, 'multiple of the monomer');
      if (d.K > 1) {
        el('rect', { x: PX0 + 420, y: 4, width: 10, height: 8, fill: 'var(--het)' }, key);
        el('text', { x: PX0 + 434, y: 12 }, key, 'multiple of the HOR');
      }

      var iL = prof[d.L], iH = d.K > 1 && d.K * d.L <= Dmax ? prof[d.K * d.L] : null;
      var verdict;
      if (best % (d.K * d.L) === 0 && d.K > 1) verdict = 'The tallest bar is at ' + best + ' bp, a multiple of the HOR unit (' + d.K + ' monomers). A tool that reports one period would most likely give you the HOR here.';
      else if (best % d.L === 0) verdict = 'The tallest bar is at ' + best + ' bp, a multiple of the monomer.' + (d.K > 1 ? ' The variants are too similar (or the copies too mutated) for the HOR level to stand out.' : '');
      else verdict = 'The tallest bar is at ' + best + ' bp, not a multiple of the monomer: the copies are so mutated that chance wins. Lower the mutations.';
      out.innerHTML =
        '<div>Identity at d = monomer (' + d.L + ' bp)<b>' + Math.round(iL * 100) + ' %</b></div>' +
        '<div>Identity at d = HOR (' + (d.K * d.L) + ' bp)<b>' + (iH === null ? (d.K === 1 ? 'no HOR' : 'beyond the plot') : Math.round(iH * 100) + ' %') + '</b></div>' +
        '<div>Tallest bar<b>' + best + ' bp</b></div>' +
        '<div style="grid-column:1/-1">' + esc(verdict) + ' Unrelated DNA gives about 25 % identity, because random bases match one time in four.</div>';
    }

    [sL, sK, sD, sM].forEach(function (x) { x.addEventListener('input', draw); });
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      W = +b.getAttribute('data-v');
      seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      draw();
    });
    $('s06-dot-new').addEventListener('click', function () { seed++; draw(); });
    draw();
  })();

  // =====================================================================
  // (b) rotation: canonical start vs doubled consensus
  // =====================================================================
  (function () {
    var box = $('s06-rot-seq'), out = $('s06-rot-out'), seg = $('s06-rot-mode');
    if (!box || !out || !seg) return;
    var mode = 'raw';
    var CONS = 'GATTCAAGCTGAACCTTAGTCAGA'; // toy 24-bp monomer
    var n = CONS.length;
    var CUTS = [0, 7, 15, 20];
    var MUTS = [[], [4], [11, 19], [2]]; // consensus positions mutated in each copy
    // each copy: list of {b, pos, mut}, starting at consensus position CUTS[c]
    var copies = CUTS.map(function (cut, c) {
      var a = [];
      for (var j = 0; j < n; j++) {
        var pos = (cut + j) % n, b = CONS.charAt(pos), mut = MUTS[c].indexOf(pos) >= 0;
        if (mut) b = B.charAt((B.indexOf(b) + 2) % 4);
        a.push({ b: b, pos: pos, mut: mut });
      }
      return a;
    });
    function str(a) { return a.map(function (x) { return x.b; }).join(''); }
    function rot(a, r) { return a.slice(r).concat(a.slice(0, r)); }
    function minRot(a) {
      var s = str(a), d = s + s, best = s, br = 0;
      for (var i = 1; i < s.length; i++) { var t = d.substr(i, s.length); if (t < best) { best = t; br = i; } }
      return br;
    }
    function cls(x) { return x.mut ? 'x' : (x.pos < 8 ? 'a' : (x.pos < 16 ? 'h' : '')); }
    function paint(a) {
      return a.map(function (x) { var c = cls(x); return c ? '<span class="' + c + '">' + x.b + '</span>' : x.b; }).join('');
    }
    function consRow(start, times) {
      var a = [];
      for (var j = 0; j < n * times; j++) { var pos = (start + j) % n; a.push({ b: CONS.charAt(pos), pos: pos, mut: false }); }
      return a;
    }
    function draw() {
      var rows = [], info = '';
      if (mode === 'raw') {
        rows.push('consensus  ' + paint(consRow(0, 1)));
        copies.forEach(function (a, i) { rows.push('copy ' + (i + 1) + '     ' + paint(a)); });
        info = '<div style="grid-column:1/-1">Each copy starts at a different point of the circle, so the colour blocks do not line up and an end-to-end comparison would call the copies different. Identity of each copy with the consensus, as cut: ' +
          copies.map(function (a) { var m = 0; for (var j = 0; j < n; j++) if (a[j].b === CONS.charAt(j)) m++; return Math.round(100 * m / n) + ' %'; }).join(', ') + '.</div>';
      } else if (mode === 'min') {
        var cr = minRot(consRow(0, 1));
        rows.push('consensus  ' + paint(rot(consRow(0, 1), cr)));
        var starts = [];
        copies.forEach(function (a, i) {
          var r = minRot(a), ra = rot(a, r);
          starts.push(ra[0].pos);
          rows.push('copy ' + (i + 1) + '     ' + paint(ra));
        });
        var same = starts.filter(function (p) { return p === (cr % n); }).length;
        info = '<div>Copies starting where the consensus starts<b>' + same + ' of ' + copies.length + '</b></div>' +
          '<div style="grid-column:1/-1">The canonical rotation is a rule, not an alignment: identical monomers always get the same start, but one mutation can change which rotation is alphabetically smallest (look at the copies whose colours do not line up). That is why CLsat follows this step with clustering and an alignment (MAFFT) that rotates each cluster to a common column, and why it uses the doubled consensus for exact placement.</div>';
      } else {
        rows.push('doubled    ' + paint(consRow(0, 2)));
        var offs = [];
        copies.forEach(function (a, i) {
          var s = str(a), bo = 0, bm = -1;
          for (var o = 0; o < n; o++) {
            var m = 0; for (var j = 0; j < n; j++) if (s.charAt(j) === CONS.charAt((o + j) % n)) m++;
            if (m > bm) { bm = m; bo = o; }
          }
          offs.push({ o: bo, mis: n - bm });
          rows.push('copy ' + (i + 1) + '     ' + new Array(bo + 1).join(' ') + paint(a));
        });
        info = offs.map(function (x, i) { return '<div>Copy ' + (i + 1) + ' placed at<b>position ' + (x.o + 1) + '</b>' + x.mis + ' mismatch' + (x.mis === 1 ? '' : 'es') + '</div>'; }).join('') +
          '<div style="grid-column:1/-1">Two consensus copies end to end contain every possible rotation, so each copy aligns in one piece whatever its start. Its start position in the doubled consensus is its <span class="tip" title="Phase: where in the monomer a copy (or an array end) starts, counted from position 1 of the consensus.">phase</span>; rotating it by that amount puts it in the consensus frame. CLsat aligns array ends to doubled consensuses this way, and grows arrays with a three-copy query for the same reason.</div>';
      }
      box.innerHTML = rows.join('\n');
      out.innerHTML = info;
    }
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      mode = b.getAttribute('data-v');
      seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      draw();
    });
    draw();
  })();
})();
