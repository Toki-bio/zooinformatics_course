(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('s10-grid')) return;
  var NS = 'http://www.w3.org/2000/svg';
  var NG = 200, COLS = 20;

  // ---------- deterministic random numbers ----------
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
  // smallest n with P(X <= n) >= u for X ~ Poisson(lambda); monotone in lambda for fixed u
  function poisInv(u, lam) {
    if (lam <= 0) return 0;
    var p = Math.exp(-lam), c = p, n = 0;
    while (u > c && n < 60) { n++; p *= lam / n; c += p; }
    return n;
  }

  // ---------- toy genes ----------
  function makeCopy(r) {
    var c = { uBreak: r(), breakPos: [], uErr: r(), errPos: [], errKind: [], errStop: [] };
    for (var i = 0; i < 40; i++) c.breakPos.push(r());
    for (var j = 0; j < 40; j++) {
      c.errPos.push(r());
      var sub = r() < 0.2;               // 20 % substitutions, 80 % 1-base indels
      c.errKind.push(sub ? 'sub' : 'indel');
      c.errStop.push(sub && r() < 23 / 549);
    }
    return c;
  }
  var genes = [];
  (function () {
    var r = rng(20261031);
    for (var g = 0; g < NG; g++) {
      var span = Math.exp(Math.log(5) + r() * (Math.log(60) - Math.log(5))); // kb
      var nEx = 4 + Math.floor(r() * 11);
      var cds = 0.6 + r() * 2.4;                                                // kb
      var ex = [], cuts = [];
      for (var k = 0; k < nEx; k++) cuts.push(r());
      cuts.sort(function (a, b) { return a - b; });
      for (k = 0; k < nEx; k++) {
        var mid = 0.03 + cuts[k] * 0.94;
        ex.push(mid);
      }
      var exLen = [];
      var tot = 0;
      for (k = 0; k < nEx; k++) { var w = 0.5 + r(); exLen.push(w); tot += w; }
      for (k = 0; k < nEx; k++) exLen[k] /= tot;
      genes.push({
        id: g, span: span, cds: cds, ex: ex, exLen: exLen,
        uAbs: r(), uDup: r(), uBase: r(), uBase2: r(), uAbs2: r(),
        a: makeCopy(r), b: makeCopy(r)
      });
    }
    // exactly 9 % of genes (18 of 200) carry a baseline stop codon in each copy, chosen by rank
    ['uBase', 'uBase2'].forEach(function (key) {
      var order = genes.map(function (g, i) { return i; }).sort(function (x, y) { return genes[x][key] - genes[y][key]; });
      order.forEach(function (gi, rank) { genes[gi][key + 'Flag'] = rank < Math.round(0.09 * NG); });
    });
  })();

  // ---------- state ----------
  var el = {
    n50: $('s10-n50'), err: $('s10-err'), dup: $('s10-dup'), abs: $('s10-abs'), base: $('s10-base'),
    n50o: $('s10-n50o'), erro: $('s10-erro'), dupo: $('s10-dupo'), abso: $('s10-abso')
  };
  // N50 slider: 0..100 -> 10 kb .. 100 Mb (log scale)
  function n50kb() { return Math.pow(10, 1 + (+el.n50.value) / 25); }
  function n50ToSlider(kb) { return Math.round((Math.log10(kb) - 1) * 25); }
  function fmtLen(kb) {
    if (kb >= 1000) { var m = kb / 1000; return (m >= 10 ? m.toFixed(0) : m.toFixed(1)) + ' Mb'; }
    return (kb >= 100 ? kb.toFixed(0) : kb.toFixed(0)) + ' kb';
  }
  var selected = 0;

  // ---------- scoring one copy ----------
  function scoreCopy(g, c, p) {
    var res = { breaks: [], errs: [], frac: 1, stop: false, piece: [0, 1], status: 'C', nErr: 0 };
    var meanContig = 0.6 * p.n50;                   // kb
    var nb = poisInv(c.uBreak, g.span / meanContig);
    nb = Math.min(nb, 40);
    var bps = c.breakPos.slice(0, nb).sort(function (a, b) { return a - b; });
    res.breaks = bps;
    // pieces between breaks; find piece holding most coding sequence
    var edges = [0].concat(bps).concat([1]);
    var best = -1, bestI = 0;
    for (var i = 0; i < edges.length - 1; i++) {
      var s = 0;
      for (var k = 0; k < g.ex.length; k++) if (g.ex[k] >= edges[i] && g.ex[k] < edges[i + 1]) s += g.exLen[k];
      if (s > best) { best = s; bestI = i; }
    }
    res.frac = best;
    res.piece = [edges[bestI], edges[bestI + 1]];
    // errors in the coding sequence (count from Poisson, monotone in rate)
    var lam = p.err / 1e5 * g.cds * 1000;
    var ne = Math.min(poisInv(c.uErr, lam), 40);
    // errors only matter if they fall in the scored piece: place them on exons
    var cnt = 0;
    for (var e = 0; e < ne; e++) {
      // position: pick an exon by its share of coding length
      var u = c.errPos[e], acc = 0, pos = g.ex[g.ex.length - 1];
      for (k = 0; k < g.ex.length; k++) { acc += g.exLen[k]; if (u <= acc) { pos = g.ex[k]; break; } }
      var inPiece = pos >= res.piece[0] && pos < res.piece[1];
      res.errs.push({ pos: pos, kind: c.errKind[e], stop: c.errStop[e], inPiece: inPiece });
      if (inPiece) { cnt++; if (c.errStop[e]) res.stop = true; }
    }
    res.nErr = cnt;
    if (res.frac < 0.2) res.status = 'M';
    else if (res.frac < 0.9) res.status = 'F';
    else if (cnt >= 4) res.status = 'F';
    else res.status = 'C';
    return res;
  }

  function classify(g, p) {
    var out = { abs: g.uAbs < p.abs / 100, dup: g.uDup < p.dup / 100, copies: [], cls: 'M', E: false, note: '' };
    var baseStopA = p.base && g.uBaseFlag;
    var baseStopB = p.base && g.uBase2Flag;
    var A = out.abs ? null : scoreCopy(g, g.a, p);
    // haplotig copy: present if the region is doubled; independent chance it is absent too
    var B = (out.dup && !(g.uAbs2 < p.abs / 100)) ? scoreCopy(g, g.b, p) : null;
    if (A && baseStopA) A.stop = A.stop || A.status === 'C';
    if (B && baseStopB) B.stop = B.stop || B.status === 'C';
    if (A) A.baseStop = baseStopA;
    if (B) B.baseStop = baseStopB;
    out.copies = [A, B];
    var comp = [A, B].filter(function (x) { return x && x.status === 'C'; });
    var frag = [A, B].filter(function (x) { return x && x.status === 'F'; });
    if (comp.length >= 2) {
      var noStop = comp.filter(function (x) { return !x.stop; });
      if (noStop.length === 1) { out.cls = 'S'; out.E = false; out.note = 'twoCopiesOneStop'; }
      else { out.cls = 'D'; out.E = comp.some(function (x) { return x.stop; }) && noStop.length === 0; }
    } else if (comp.length === 1) { out.cls = 'S'; out.E = comp[0].stop; }
    else if (frag.length) out.cls = 'F';
    else out.cls = 'M';
    return out;
  }

  // ---------- drawing helpers ----------
  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs) {
    var t = svgEl('text', Object.assign({ x: x, y: y }, attrs || {}), parent);
    t.textContent = s;
    return t;
  }
  var COL = { S: 'var(--accent)', D: 'var(--rep)', F: 'var(--het)', M: 'var(--bad)' };
  var NAME = { S: 'complete, single-copy', D: 'complete, duplicated', F: 'fragmented', M: 'missing' };

  // legend
  (function () {
    var lg = $('s10-legend');
    var items = [['S', 'S single-copy'], ['D', 'D duplicated'], ['F', 'F fragmented'], ['M', 'M missing']];
    var h = '';
    items.forEach(function (it) { h += '<span><i style="background:' + COL[it[0]] + ';height:10px;width:10px"></i>' + it[1] + '</span>'; });
    h += '<span><i style="background:var(--fg);height:6px;width:6px;border-radius:50%"></i>dot = counted in E (internal stop codon)</span>';
    lg.innerHTML = h;
  })();

  // ---------- main render ----------
  var lastRes = [];
  function params() {
    return { n50: n50kb(), err: +el.err.value, dup: +el.dup.value, abs: +el.abs.value, base: el.base.checked };
  }
  function render() {
    var p = params();
    el.n50o.textContent = fmtLen(p.n50);
    var qv = p.err > 0 ? (-10 * Math.log10(p.err / 1e5)).toFixed(0) : '∞';
    el.erro.textContent = p.err + ' (QV ' + qv + ')';
    el.dupo.textContent = p.dup + ' %';
    el.abso.textContent = p.abs + ' %';

    var res = genes.map(function (g) { return classify(g, p); });
    lastRes = res;
    var n = { S: 0, D: 0, F: 0, M: 0 }, nE = 0;
    res.forEach(function (r) { n[r.cls]++; if (r.E && (r.cls === 'S' || r.cls === 'D')) nE++; });
    var C = n.S + n.D;
    var pc = function (x) { return (100 * x / NG).toFixed(1); };
    var Ep = C ? (100 * nE / C).toFixed(1) : '0.0';

    // bar
    var bar = $('s10-bar');
    bar.innerHTML = '';
    var W = Math.max(320, Math.min(980, bar.clientWidth || 640));
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' 58', width: '100%', style: 'min-width:300px;display:block', role: 'img', 'aria-label': 'BUSCO result bar' }, bar);
    var x0 = 10, bw = W - 20, x = x0;
    ['S', 'D', 'F', 'M'].forEach(function (k) {
      var w = bw * n[k] / NG;
      if (w > 0) {
        svgEl('rect', { x: x, y: 8, width: w, height: 24, fill: COL[k] }, svg);
        if (w > 34) txt(svg, x + w / 2, 24, k + ' ' + pc(n[k]) + '%', { 'text-anchor': 'middle', style: 'fill:var(--bg);font-weight:600' });
      }
      x += w;
    });
    svgEl('rect', { x: x0, y: 8, width: bw, height: 24, fill: 'none', stroke: 'var(--line)' }, svg);
    txt(svg, x0, 50, (W < 520 ? '' : 'BUSCO line: ') + 'C:' + pc(C) + '%[S:' + pc(n.S) + '%,D:' + pc(n.D) + '%],F:' + pc(n.F) + '%,M:' + pc(n.M) + '%,n:' + NG + ',E:' + Ep + '%', { class: 'lab' });

    // readout
    $('s10-out').innerHTML =
      '<div>Complete (C = S + D)<b>' + pc(C) + ' %</b></div>' +
      '<div>Duplicated (D)<b>' + pc(n.D) + ' %</b></div>' +
      '<div>Fragmented / Missing<b>' + pc(n.F) + ' / ' + pc(n.M) + ' %</b></div>' +
      '<div>E (share of complete with a stop codon)<b>' + Ep + ' %</b></div>';

    // grid
    var grid = $('s10-grid');
    grid.innerHTML = '';
    var cell = 30, gap = 4, rows = NG / COLS;
    var GW = COLS * (cell + gap) + 4, GH = rows * (cell + gap) + 4;
    var gs = svgEl('svg', { viewBox: '0 0 ' + GW + ' ' + GH, width: '100%', style: 'min-width:340px;max-width:720px;display:block', role: 'group', 'aria-label': 'Toy marker genes, one square each' }, grid);
    res.forEach(function (r, i) {
      var gx = 2 + (i % COLS) * (cell + gap), gy = 2 + Math.floor(i / COLS) * (cell + gap);
      var grp = svgEl('g', { tabindex: '0', role: 'button', 'aria-label': 'Gene ' + (i + 1) + ': ' + NAME[r.cls] + (r.E ? ', internal stop codon' : ''), style: 'cursor:pointer' }, gs);
      svgEl('rect', { x: gx, y: gy, width: cell, height: cell, rx: 3, fill: COL[r.cls], opacity: r.cls === 'S' ? 0.85 : 1 }, grp);
      if (i === selected) svgEl('rect', { x: gx - 2, y: gy - 2, width: cell + 4, height: cell + 4, rx: 4, fill: 'none', stroke: 'var(--fg)', 'stroke-width': 2 }, grp);
      if (r.cls === 'D') { svgEl('rect', { x: gx + 5, y: gy + 5, width: cell - 10, height: cell - 10, rx: 2, fill: 'none', stroke: 'var(--bg)', 'stroke-width': 1.5 }, grp); }
      if (r.E && (r.cls === 'S' || r.cls === 'D')) svgEl('circle', { cx: gx + cell - 7, cy: gy + 7, r: 4, fill: 'var(--fg)', stroke: 'var(--bg)', 'stroke-width': 1 }, grp);
      var pick = function () { selected = i; render(); };
      grp.addEventListener('click', pick);
      grp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(); } });
    });
    drawGene(p);
  }

  function drawCopyRow(svg, g, c, y, label, X0, X1) {
    var L = function (f) { return X0 + f * (X1 - X0); };
    txt(svg, 2, y + 4, label, { class: 'lab' });
    if (!c) {
      svgEl('line', { x1: X0, y1: y, x2: X1, y2: y, stroke: 'var(--err)', 'stroke-dasharray': '4 4' }, svg);
      txt(svg, (X0 + X1) / 2, y - 10, 'not in this assembly', { 'text-anchor': 'middle' });
      return;
    }
    // contig pieces
    var edges = [0].concat(c.breaks).concat([1]);
    for (var i = 0; i < edges.length - 1; i++) {
      var best = edges[i] === c.piece[0];
      svgEl('line', { x1: L(edges[i]) + (i ? 3 : 0), y1: y, x2: L(edges[i + 1]) - (i < edges.length - 2 ? 3 : 0), y2: y, stroke: best ? 'var(--fg)' : 'var(--muted)', 'stroke-width': best ? 2 : 1 }, svg);
    }
    // exons
    for (var k = 0; k < g.ex.length; k++) {
      var w = Math.max(5, g.exLen[k] * 90);
      var inP = g.ex[k] >= c.piece[0] && g.ex[k] < c.piece[1];
      svgEl('rect', { x: L(g.ex[k]) - w / 2, y: y - 7, width: w, height: 14, fill: inP ? 'var(--accent)' : 'var(--err)', opacity: inP ? 0.9 : 0.6 }, svg);
    }
    // breaks
    c.breaks.forEach(function (b) {
      svgEl('line', { x1: L(b), y1: y - 16, x2: L(b), y2: y + 16, stroke: 'var(--bad)', 'stroke-width': 1.5, 'stroke-dasharray': '3 2' }, svg);
    });
    // errors
    c.errs.forEach(function (e, j) {
      var ex = L(e.pos) + ((j % 5) - 2) * 4;
      if (e.stop) {
        svgEl('rect', { x: ex - 4, y: y - 24, width: 8, height: 8, fill: 'var(--bad)' }, svg);
      } else {
        svgEl('path', { d: 'M' + (ex - 4) + ' ' + (y - 24) + 'L' + (ex + 4) + ' ' + (y - 24) + 'L' + ex + ' ' + (y - 17) + 'Z', fill: e.kind === 'indel' ? 'var(--het)' : 'var(--muted)' }, svg);
      }
    });
    if (c.baseStop && c.status === 'C') {
      txt(svg, X1, y + 26, 'baseline stop codon', { 'text-anchor': 'end' });
    }
    var verdict = c.status === 'C' ? (c.stop ? 'complete+stop' : 'complete') : c.status === 'F' ? 'fragment' : 'too little';
    txt(svg, X1 + 8, y + 4, verdict, { class: 'lab' });
  }

  function drawGene(p) {
    var g = genes[selected], r = lastRes[selected];
    var box = $('s10-gene');
    box.innerHTML = '';
    var W = Math.max(320, Math.min(760, box.clientWidth || 640)), H = r.dup ? 150 : 90;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: 'min-width:300px;display:block', role: 'img', 'aria-label': 'Detail of the selected gene' }, box);
    txt(svg, 4, 14, 'Gene ' + (selected + 1) + ' · span ' + g.span.toFixed(0) + ' kb · ' + g.ex.length + ' exons · coding ' + (g.cds * 1000).toFixed(0) + ' bp', { class: 'lab' });
    var narrow = W < 520;
    var X0 = narrow ? 70 : 100, X1 = W - (narrow ? 70 : 110);
    drawCopyRow(svg, g, r.copies[0], 58, 'main copy', X0, X1);
    if (r.dup) drawCopyRow(svg, g, r.copies[1], 118, 'haplotig', X0, X1);

    // explanation
    var A = r.copies[0], B = r.copies[1], s = '';
    function why(c) {
      if (!c) return 'the region is not in the assembly';
      var parts = [];
      if (c.breaks.length) parts.push(c.breaks.length + ' contig end' + (c.breaks.length > 1 ? 's' : '') + ' inside the gene; the best piece holds ' + Math.round(c.frac * 100) + ' % of the coding sequence');
      else parts.push('the whole gene is on one contig');
      if (c.nErr) parts.push(c.nErr + ' base error' + (c.nErr > 1 ? 's' : '') + ' in the scored exons');
      if (c.stop) parts.push(c.baseStop && !c.errs.some(function (e) { return e.stop && e.inPiece; }) ? 'a baseline internal stop codon' : 'an internal stop codon');
      return parts.join('; ');
    }
    s += '<b>Main copy:</b> ' + why(A) + '. ';
    if (r.dup) s += '<b>Haplotig copy:</b> ' + why(B) + '. ';
    if (r.note === 'twoCopiesOneStop') s += 'Both copies are complete but only one has a stop codon, so BUSCO 6.1 keeps the clean copy and calls the gene single-copy. ';
    s += '<b>Result: ' + r.cls + '</b> (' + NAME[r.cls] + (r.E ? ', counted in E' : '') + '). ';
    s += '<span style="color:var(--muted)">Blue boxes: exons on the scored contig piece; grey boxes: exons lost to another piece; red dashed lines: contig ends; triangles: errors (orange = 1-base indel, grey = harmless substitution); red square: substitution that made a stop codon.</span>';
    $('s10-why').innerHTML = s;
  }

  // ---------- presets ----------
  var PRESETS = [
    { n50: 20000, err: 2, dup: 2, abs: 0.5 },
    { n50: 200, err: 70, dup: 1.5, abs: 6 },
    { n50: 30, err: 5, dup: 1, abs: 4 },
    { n50: 10000, err: 2, dup: 0, abs: 8 },
    { n50: 2000, err: 5, dup: 35, abs: 0.5 }
  ];
  var pbtn = $('s10-presets').querySelectorAll('button');
  function setPressed(idx) { for (var i = 0; i < pbtn.length; i++) pbtn[i].setAttribute('aria-pressed', String(i === idx)); }
  for (var i = 0; i < pbtn.length; i++) {
    pbtn[i].addEventListener('click', function () {
      var pr = PRESETS[+this.getAttribute('data-p')];
      el.n50.value = n50ToSlider(pr.n50); el.err.value = pr.err; el.dup.value = pr.dup; el.abs.value = pr.abs;
      setPressed(+this.getAttribute('data-p'));
      render();
    });
  }
  [el.n50, el.err, el.dup, el.abs].forEach(function (s) { s.addEventListener('input', function () { setPressed(-1); render(); }); });
  el.base.addEventListener('change', render);

  // pick an informative first gene: one that is cut by a contig end in the "low coverage" setting
  (function () {
    var p = { n50: 150, err: 72, dup: 0, abs: 0, base: true };
    for (var g = 0; g < NG; g++) { if (classify(genes[g], p).cls === 'F') { selected = g; break; } }
  })();

  // copy buttons inside this section only
  var wrap = $('s10-wrap');
  if (wrap) {
    var btns = wrap.querySelectorAll('.code button');
    for (var b = 0; b < btns.length; b++) {
      if (btns[b].dataset.s10) continue;
      btns[b].dataset.s10 = '1';
      btns[b].addEventListener('click', function () {
        var pre = this.parentNode.querySelector('pre');
        var t = pre ? pre.innerText : '';
        var btn = this;
        try {
          navigator.clipboard.writeText(t).then(function () { btn.textContent = 'copied'; setTimeout(function () { btn.textContent = 'copy'; }, 1200); }, function () {});
        } catch (e) { /* clipboard not available */ }
      });
    }
  }

  var rt = null;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(render, 150); });
  render();
})();
