(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var svg = $('s06-svg');
  if (!svg) return;
  var NS = 'http://www.w3.org/2000/svg';

  // ---------- the toy region (positions in bp, 0..1000) ----------
  // type: first = begins with ATG, internal, last = ends with a stop codon, single = ATG ... stop
  var CAND = [
    { id: 'E0', s: 30, e: 70, type: 'first', sc: 0.5, row: 0 },
    { id: 'E1', s: 100, e: 180, type: 'first', sc: 3.0, row: 0 },
    { id: 'E2', s: 300, e: 390, type: 'internal', sc: 2.0, row: 0 },
    { id: 'E2x', s: 330, e: 420, type: 'internal', sc: 2.8, row: 1 },
    { id: 'E3', s: 520, e: 575, type: 'internal', sc: -0.5, row: 0 },
    { id: 'E4', s: 680, e: 760, type: 'last', sc: 2.5, row: 0 },
    { id: 'T1', s: 840, e: 960, type: 'single', sc: 4.5, row: 0 }
  ];
  var TRUE = ['E1', 'E2', 'E3', 'E4'];
  var RNA = [[180, 300], [390, 520], [575, 680]];               // spliced-read introns
  var PROT = [[110, 170], [305, 385], [525, 570], [690, 750], [850, 950]]; // protein CDSpart hits
  var REP = [800, 990];                                          // soft-masked transposon
  var INTRON_COST = 1, GENE_COST = 2, MASK_PEN = 4, MIN_INTRON = 60;

  var st = { w: 1, rna: false, prot: false, mask: false };

  function byId(id) { for (var i = 0; i < CAND.length; i++) if (CAND[i].id === id) return CAND[i]; return null; }
  function maskedFrac(c) {
    var o = Math.min(c.e, REP[1]) - Math.max(c.s, REP[0]);
    return o > 0 ? o / (c.e - c.s) : 0;
  }
  function exonParts(c) {
    var ev = 0, mk = 0;
    if (st.prot) PROT.forEach(function (h) { if (c.s <= h[0] && c.e >= h[1]) ev += st.w; });
    if (st.mask) mk = -MASK_PEN * maskedFrac(c);
    return { seq: c.sc, ev: ev, mk: mk };
  }
  function intronEv(a, b) {
    if (!st.rna) return 0;
    for (var i = 0; i < RNA.length; i++) if (RNA[i][0] === a.e && RNA[i][1] === b.s) return st.w;
    return 0;
  }

  // ---------- enumerate every allowed gene chain ----------
  function chains() {
    var out = [];
    function grow(path) {
      var last = path[path.length - 1];
      if (last.type === 'last' || last.type === 'single') { out.push(path.slice()); return; }
      CAND.forEach(function (c) {
        if ((c.type === 'internal' || c.type === 'last') && c.s - last.e >= MIN_INTRON) {
          path.push(c); grow(path); path.pop();
        }
      });
    }
    CAND.forEach(function (c) { if (c.type === 'first' || c.type === 'single') grow([c]); });
    return out.map(function (p) {
      var seq = 0, ev = 0, mk = 0, intr = 0;
      p.forEach(function (c, k) {
        var x = exonParts(c); seq += x.seq; ev += x.ev; mk += x.mk;
        if (k > 0) { intr -= INTRON_COST; ev += intronEv(p[k - 1], c); }
      });
      var tot = seq + intr + ev + mk - GENE_COST;
      return { path: p, s: p[0].s, e: p[p.length - 1].e, seq: seq, intr: intr - GENE_COST, ev: ev, mk: mk, tot: tot };
    });
  }

  // ---------- best set of non-overlapping genes (weighted interval scheduling = dynamic programming) ----------
  function bestParse(all) {
    var g = all.filter(function (c) { return c.tot > 0; }).sort(function (a, b) { return a.e - b.e; });
    var best = [0], pick = [null];
    for (var i = 0; i < g.length; i++) {
      var j = i; while (j > 0 && g[j - 1].e >= g[i].s) j--;      // last gene ending before g[i] starts
      var take = best[j] + g[i].tot, skip = best[i];
      if (take > skip) { best.push(take); pick.push({ gene: g[i], prev: j }); }
      else { best.push(skip); pick.push({ gene: null, prev: i }); }
    }
    var res = [], k = g.length;
    while (k > 0) { var p = pick[k]; if (p.gene) { res.unshift(p.gene); k = p.prev; } else k = p.prev; }
    return res;
  }

  // ---------- drawing ----------
  var X0 = 140, X1 = 868;
  function X(bp) { return X0 + (X1 - X0) * bp / 1000; }
  function el(name, attrs, parent, text) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    (parent || svg).appendChild(n);
    return n;
  }
  function fmt(v) { var r = Math.round(v * 10) / 10; return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(1); }
  function label(y, t) { el('text', { x: 8, y: y + 4, 'class': 'lab' }, null, t); }
  function geneDraw(path, y, colorFn, h) {
    for (var k = 1; k < path.length; k++) {
      var a = path[k - 1], b = path[k], mid = (X(a.e) + X(b.s)) / 2;
      el('polyline', { points: X(a.e) + ',' + y + ' ' + mid + ',' + (y - 9) + ' ' + X(b.s) + ',' + y, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.2 });
    }
    path.forEach(function (c) {
      el('rect', { x: X(c.s), y: y - h / 2, width: X(c.e) - X(c.s), height: h, rx: 2, fill: colorFn(c) });
    });
  }

  function draw(parse, all) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    // axis
    el('line', { x1: X(0), y1: 16, x2: X(1000), y2: 16, 'class': 'ax' });
    for (var t = 0; t <= 1000; t += 100) {
      el('line', { x1: X(t), y1: 13, x2: X(t), y2: 19, 'class': 'ax' });
      el('text', { x: X(t), y: 30, 'text-anchor': 'middle' }, null, t + ' bp');
    }
    // repeat
    label(52, 'Repeat (TE)');
    el('rect', { x: X(REP[0]), y: 45, width: X(REP[1]) - X(REP[0]), height: 12, fill: 'var(--rep)', opacity: st.mask ? 0.9 : 0.35 });
    el('text', { x: (X(REP[0]) + X(REP[1])) / 2, y: 54, 'text-anchor': 'middle', fill: 'var(--bg)', style: 'fill:var(--bg)' }, null, st.mask ? 'lower-case: masked' : 'not masked');
    // truth
    label(82, 'Real gene (toy)');
    geneDraw(TRUE.map(byId), 82, function () { return 'var(--accent)'; }, 12);
    // candidates
    label(118, 'Candidate exons');
    CAND.forEach(function (c) {
      var y = 112 + c.row * 38;
      el('rect', { x: X(c.s), y: y, width: X(c.e) - X(c.s), height: 10, rx: 2, fill: 'none', stroke: 'var(--fg)', 'stroke-width': 1 });
      var sig = c.type === 'first' ? 'ATG' : c.type === 'last' ? 'stop' : c.type === 'single' ? 'ATG…stop' : 'AG…GT';
      el('text', { x: (X(c.s) + X(c.e)) / 2, y: y + 22, 'text-anchor': 'middle' }, null, c.id + ' ' + fmt(c.sc));
      el('text', { x: (X(c.s) + X(c.e)) / 2, y: y - 3, 'text-anchor': 'middle', style: 'font-size:9.5px' }, null, sig);
    });
    // RNA-seq
    label(205, 'RNA-seq introns');
    if (st.rna) {
      RNA.forEach(function (r) {
        var a = X(r[0]), b = X(r[1]);
        el('path', { d: 'M' + a + ',211 Q' + (a + b) / 2 + ',185 ' + b + ',211', fill: 'none', stroke: 'var(--het)', 'stroke-width': 2 });
        el('line', { x1: a - 14, y1: 211, x2: a, y2: 211, stroke: 'var(--het)', 'stroke-width': 4 });
        el('line', { x1: b, y1: 211, x2: b + 14, y2: 211, stroke: 'var(--het)', 'stroke-width': 4 });
      });
    } else el('text', { x: X0, y: 209 }, null, 'off');
    // proteins
    label(240, 'Protein hits');
    if (st.prot) {
      PROT.forEach(function (h) { el('rect', { x: X(h[0]), y: 235, width: X(h[1]) - X(h[0]), height: 8, fill: 'var(--het)', opacity: 0.8 }); });
      el('text', { x: X(900), y: 255, 'text-anchor': 'middle', style: 'font-size:9.5px' }, null, 'transposase-like hit');
    } else el('text', { x: X0, y: 244 }, null, 'off');
    // prediction
    label(290, 'Predicted model');
    el('line', { x1: X(0), y1: 305, x2: X(1000), y2: 305, 'class': 'grid' });
    parse.forEach(function (g) {
      geneDraw(g.path, 290, function (c) { return TRUE.indexOf(c.id) >= 0 ? 'var(--good)' : 'var(--bad)'; }, 14);
      g.path.forEach(function (c) {
        el('text', { x: (X(c.s) + X(c.e)) / 2, y: 313, 'text-anchor': 'middle', 'class': 'lab' }, null, c.id);
      });
    });
    if (!parse.length) el('text', { x: X0, y: 294 }, null, 'no gene predicted');
    el('text', { x: X0, y: 336 }, null, 'green = real exon, red = wrong exon or false gene; hump between exons = intron');
  }

  // ---------- readout and table ----------
  function update() {
    var all = chains(), parse = bestParse(all);
    draw(parse, all);
    var predEx = [];
    parse.forEach(function (g) { g.path.forEach(function (c) { predEx.push(c.id); }); });
    var correct = TRUE.filter(function (id) { return predEx.indexOf(id) >= 0; }).length;
    var wrong = predEx.filter(function (id) { return TRUE.indexOf(id) < 0; });
    var teGene = predEx.indexOf('T1') >= 0;
    $('s06-read').innerHTML =
      '<div>Real exons found<b>' + correct + ' of 4</b></div>' +
      '<div>Wrong exons in the main gene<b>' + wrong.filter(function (x) { return x !== 'T1'; }).length + '</b></div>' +
      '<div>False gene from the transposon<b>' + (teGene ? 'yes (T1)' : 'no') + '</b></div>';

    var andJoin = function (a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; };
    var msg, issues = [];
    if (predEx.indexOf('E2x') >= 0) issues.push('uses the wrong exon E2x instead of E2');
    if (predEx.indexOf('E0') >= 0) issues.push('starts at the decoy ATG exon E0');
    if (predEx.indexOf('E3') < 0) issues.push('misses the weak real exon E3');
    if (teGene) issues.push('calls the transposon ORF T1 a gene');
    if (!st.rna && !st.prot && !st.mask) msg = 'Sequence signals alone: the model ' + andJoin(issues) + '. This is the typical ab initio picture.';
    else if (!issues.length) msg = 'The evidence now outweighs the sequence scores: the chain E1-E2-E3-E4 matches the real gene and the transposon is not called.';
    else if (issues.length === 1 && teGene && st.prot && st.mask) msg = 'The real gene is right, but the protein database contains a transposase-like protein, and at this hint weight its bonus beats the masking penalty: T1 comes back as a gene. This is how TE-derived genes enter annotations.';
    else {
      msg = 'At weight ' + st.w.toFixed(1) + ' the model still ' + andJoin(issues) + '.';
      if (teGene && !st.mask) msg += ' Soft-masking is what removes T1.';
      if (issues.length > (teGene ? 1 : 0)) msg += ' More weight, or the other evidence type, changes the ranking in the table.';
    }
    $('s06-cap').innerHTML = '<b>Toy result.</b> ' + msg;

    // table of the competing models
    var rows = all.slice().sort(function (a, b) { return b.tot - a.tot; }).slice(0, 7);
    var inParse = function (g) { return parse.indexOf(g) >= 0; };
    var tb = $('s06-tab').querySelector('tbody');
    tb.innerHTML = rows.map(function (g, i) {
      var name = g.path.map(function (c) { return c.id; }).join('-');
      var b = inParse(g) ? ' style="font-weight:700;color:var(--good)"' : (g.tot <= 0 ? ' style="color:var(--muted)"' : '');
      return '<tr' + b + '><td>' + (i + 1) + '</td><td><code>' + name + '</code>' + (inParse(g) ? ' (predicted)' : g.tot <= 0 ? ' (below 0, never called)' : '') +
        '</td><td>' + fmt(g.seq) + '</td><td>' + fmt(g.intr) + '</td><td>' + fmt(g.ev) + '</td><td>' + fmt(g.mk) + '</td><td><b>' + fmt(g.tot) + '</b></td></tr>';
    }).join('');
  }

  // ---------- controls ----------
  var w = $('s06-w');
  w.addEventListener('input', function () { st.w = +w.value; $('s06-wo').textContent = st.w.toFixed(1); update(); });
  [['s06-rna', 'rna'], ['s06-prot', 'prot'], ['s06-mask', 'mask']].forEach(function (p) {
    var b = $(p[0]);
    b.addEventListener('click', function () {
      st[p[1]] = !st[p[1]];
      b.setAttribute('aria-pressed', st[p[1]] ? 'true' : 'false');
      update();
    });
  });
  $('s06-reset').addEventListener('click', function () {
    st = { w: 1, rna: false, prot: false, mask: false };
    w.value = 1; $('s06-wo').textContent = '1.0';
    ['s06-rna', 's06-prot', 's06-mask'].forEach(function (id) { $(id).setAttribute('aria-pressed', 'false'); });
    update();
  });
  update();

  // ---------- copy buttons inside this section only ----------
  var wrap = $('s06-wrap');
  if (wrap) {
    var btns = wrap.querySelectorAll('.code button');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].dataset.s06) continue;
      btns[i].dataset.s06 = '1';
      btns[i].addEventListener('click', function () {
        var pre = this.parentNode.querySelector('pre'), btn = this;
        var t = pre ? pre.innerText : '';
        try {
          navigator.clipboard.writeText(t).then(function () {
            btn.textContent = 'copied'; setTimeout(function () { btn.textContent = 'copy'; }, 1400);
          }, function () {});
        } catch (e) { /* clipboard not available */ }
      });
    }
  }
})();
