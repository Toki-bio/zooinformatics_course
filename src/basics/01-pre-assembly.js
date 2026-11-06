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
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function spaces(n) { var s = ''; while (n-- > 0) s += ' '; return s; }

  // Toy settings shared by blocks 2 to 6
  var L = 50, K = 15, M = Math.pow(4, K), PER = L - K + 1;
  var LET = 'ACGT';

  // ---------- simulation: real reads from real toy sequences, real k-mer counting ----------
  function genSeq(n, rnd) {
    var a = new Uint8Array(n), i;
    for (i = 0; i < n; i++) a[i] = Math.floor(rnd() * 4);
    return a;
  }
  function concat(parts) {
    var n = 0, i, out, p = 0;
    parts.forEach(function (a) { n += a.length; });
    out = new Uint8Array(n);
    parts.forEach(function (a) { out.set(a, p); p += a.length; });
    return out;
  }
  function kmerSet(seq) {
    var set = new Set(), v = 0, i;
    for (i = 0; i < seq.length; i++) {
      v = (v * 4 + seq[i]) % M;
      if (i >= K - 1) set.add(v);
    }
    return set;
  }
  // haps: one sequence (haploid) or two (diploid; each read comes from a random one). Returns k-mer counts.
  function simulate(haps, nReads, err, rnd) {
    var cnt = new Map(), wrong = 0, r, h, s, i, v, b, n, rd = new Uint8Array(L);
    for (r = 0; r < nReads; r++) {
      h = haps[haps.length > 1 ? Math.floor(rnd() * haps.length) : 0];
      s = Math.floor(rnd() * (h.length - L + 1));
      for (i = 0; i < L; i++) {
        b = h[s + i];
        if (err > 0 && rnd() < err) { b = (b + 1 + Math.floor(rnd() * 3)) % 4; wrong++; }
        rd[i] = b;
      }
      v = 0;
      for (i = 0; i < L; i++) {
        v = (v * 4 + rd[i]) % M;
        if (i >= K - 1) { n = cnt.get(v); cnt.set(v, n === undefined ? 1 : n + 1); }
      }
    }
    return { counts: cnt, wrong: wrong, bases: nReads * L, reads: nReads };
  }
  // Histograms n[class][x] = number of different k-mers of that class seen x times.
  function histogram(counts, classify, nclass) {
    var H = [], c;
    for (c = 0; c < nclass; c++) H.push([0]);
    counts.forEach(function (x, key) {
      var a = H[classify ? classify(key) : 0];
      while (a.length <= x) a.push(0);
      a[x]++;
    });
    return H;
  }
  function total(H) {                       // all classes added: what a counter would report
    var out = [0];
    H.forEach(function (a) { a.forEach(function (v, x) { while (out.length <= x) out.push(0); out[x] += v; }); });
    return out;
  }
  function smooth(n, x) { return ((n[x - 1] || 0) + (n[x] || 0) + (n[x + 1] || 0)) / 3; }
  function peakOf(n, from) {              // highest point of the 3-bar moving average
    var best = from, bv = -1, x, s;
    for (x = from; x < n.length; x++) { s = smooth(n, x); if (s > bv) { bv = s; best = x; } }
    return best;
  }
  function meanOf(n) {                    // average number of times a k-mer of this class was seen
    var s = 0, c = 0, x;
    for (x = 1; x < n.length; x++) { s += x * n[x]; c += n[x]; }
    return c ? s / c : 0;
  }
  function valleyOf(n, peak) {            // lowest bar between the error spike and the peak
    var best = 1, x;
    for (x = 2; x < peak; x++) if ((n[x] || 0) < (n[best] || 0)) best = x;
    return best;
  }
  function nice(v) {
    var e = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), f = v / e;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
  }

  // ---------- drawing ----------
  // o: {xmax, ymax, series:[{n, color}], marks:[{x, label, color}], cutNote:true}
  function drawHist(box, o, desc) {
    var W = 320, Hh = 200, ml = 46, mr = 8, mt = 30, mb = 38, pw = W - ml - mr, ph = Hh - mt - mb;
    var bw = pw / o.xmax, x, s, y0, h, tot, svg, cut = [];
    box.textContent = '';
    svg = el('svg', { viewBox: '0 0 ' + W + ' ' + Hh, width: '100%', role: 'img', 'aria-label': desc, style: 'display:block' }, box);
    [0, 0.5, 1].forEach(function (f) {
      var yy = mt + ph - f * ph;
      el('line', { x1: ml, x2: W - mr, y1: yy, y2: yy, style: 'stroke:var(--line);stroke-width:1' }, svg);
      el('text', { x: ml - 4, y: yy + 3.5, 'text-anchor': 'end' }, svg, fmt(f * o.ymax));
    });
    for (x = 1; x <= o.xmax; x++) {
      y0 = mt + ph; tot = 0;
      for (s = 0; s < o.series.length; s++) {
        h = o.series[s].n[x] || 0;
        if (!h) continue;
        tot += h;
        var hh = Math.min(h, o.ymax - (tot - h)) / o.ymax * ph;
        if (tot - h >= o.ymax) continue;
        y0 -= hh;
        el('rect', { x: ml + (x - 1) * bw, y: y0, width: Math.max(bw - 0.6, 0.6), height: Math.max(hh, 0.4), style: 'fill:' + o.series[s].color }, svg);
      }
      if (tot > o.ymax) cut.push({ x: x, v: tot });
    }
    el('line', { x1: ml, x2: W - mr, y1: mt + ph, y2: mt + ph, style: 'stroke:var(--muted);stroke-width:1' }, svg);
    for (x = 10; x <= o.xmax; x += 10) {
      el('line', { x1: ml + (x - 0.5) * bw, x2: ml + (x - 0.5) * bw, y1: mt + ph, y2: mt + ph + 3, style: 'stroke:var(--muted)' }, svg);
      el('text', { x: ml + (x - 0.5) * bw, y: mt + ph + 14, 'text-anchor': 'middle' }, svg, x);
    }
    el('text', { x: ml + pw / 2, y: Hh - 5, 'text-anchor': 'middle' }, svg, 'times a k-mer was seen');
    el('text', { x: 11, y: mt + ph / 2, 'text-anchor': 'middle', transform: 'rotate(-90 11 ' + (mt + ph / 2) + ')' }, svg, 'different k-mers');
    cut.forEach(function (c) {
      el('path', { d: 'M' + (ml + (c.x - 0.5) * bw - 4) + ' ' + (mt + 2) + 'l4 -5l4 5', style: 'fill:none;stroke:var(--bad);stroke-width:1.5' }, svg);
      el('text', { x: ml + (c.x - 0.5) * bw + 8, y: mt + 6, style: 'fill:var(--bad);paint-order:stroke;stroke:var(--bg);stroke-width:3px' }, svg, fmt(c.v) + ' (cut off)');
    });
    if (o.marks) {
      var last = -999, row = 0;
      o.marks.forEach(function (m) {
        var px = ml + (m.x - 0.5) * bw;
        el('line', { x1: px, x2: px, y1: mt - 8, y2: mt + ph, style: 'stroke:' + (m.color || 'var(--fg)') + ';stroke-width:1;stroke-dasharray:3 3' }, svg);
        row = (px - last < 66) ? row + 1 : 0;
        el('text', { x: Math.min(Math.max(px, ml + 26), W - mr - 26), y: 8 + (row % 2) * 11, 'text-anchor': 'middle', style: 'fill:' + (m.color || 'var(--fg)') }, svg, m.label);
        last = px;
      });
    }
  }
  function makePanels(id, n) {
    var host = $(id), out = [], i, p, lab, box, st;
    host.textContent = '';
    for (i = 0; i < n; i++) {
      p = document.createElement('div'); p.className = 'b-panel';
      lab = document.createElement('p'); lab.className = 'b-lab';
      box = document.createElement('div'); box.className = 'svgbox';
      st = document.createElement('p'); st.className = 'b-stat'; st.setAttribute('aria-live', 'polite');
      p.appendChild(lab); p.appendChild(box); p.appendChild(st);
      host.appendChild(p);
      out.push({ lab: lab, box: box, st: st });
    }
    return out;
  }
  function params(extra) {
    return 'Reads: ' + L + ' bases, k = ' + K + '. ' + extra;
  }

  // ---------- 1. a read is cut into k-mers ----------
  var r1 = rng(31), RLEN = 20, read1 = '';
  function newRead() { var s = '', i; for (i = 0; i < RLEN; i++) s += LET[Math.floor(r1() * 4)]; read1 = s; }
  function col(s) { return s.split('').map(function (c) { return '<span class="b-' + c + '">' + c + '</span>'; }).join(''); }
  function drawCut() {
    var host = $('b-cut');
    host.textContent = '';
    [4, 8, 16].forEach(function (k) {
      var rows = [], p, d = document.createElement('div'), h = '';
      for (p = 0; p + k <= read1.length; p++) rows.push(spaces(p) + col(read1.substr(p, k)));
      d.className = 'b-panel';
      h += '<p class="b-lab"><b>k = ' + k + '</b>: ' + rows.length + ' k-mers</p>';
      h += '<div class="b-cut"><span class="b-top">' + col(read1) + '</span>' + rows.join('\n') + '</div>';
      h += '<p class="b-stat">' + read1.length + ' − ' + k + ' + 1 = <b>' + (read1.length - k + 1) + '</b></p>';
      d.innerHTML = h;
      host.appendChild(d);
    });
  }
  $('b-newread').addEventListener('click', function () { newRead(); drawCut(); });
  newRead(); drawCut();

  // ---------- 2. peak at the coverage ----------
  var seedCov = 11, G2 = 20000;
  function drawCov() {
    var ps = makePanels('b-cov', 3), sims = [], ymax = 0;
    [3, 10, 30].forEach(function (cov, q) {
      var rnd = rng(seedCov * 100 + q), g = genSeq(G2, rnd), n = cov * G2 / L;
      var sim = simulate([g], n, 0, rnd), H = histogram(sim.counts, null, 1)[0], pk = peakOf(H, 1), m = 0, x;
      for (x = 1; x < H.length; x++) m = Math.max(m, H[x]);
      ymax = Math.max(ymax, m);
      sims.push({ cov: cov, n: n, H: H, pk: pk });
    });
    ymax = nice(ymax * 1.05);
    sims.forEach(function (s, q) {
      ps[q].lab.innerHTML = '<b>' + s.cov + '×</b> coverage: ' + fmt(s.n) + ' reads';
      drawHist(ps[q].box, { xmax: 50, ymax: ymax, series: [{ n: s.H, color: 'var(--accent)' }], marks: [{ x: s.pk, label: 'peak' }] },
        'k-mer histogram at ' + s.cov + ' times coverage');
      ps[q].st.innerHTML = 'Peak at <b>' + s.pk + '</b>.';
    });
    $('b-covnote').textContent = params('Genome: ' + fmt(G2) + ' bases. No errors.');
  }
  $('b-covnew').addEventListener('click', function () { seedCov++; drawCov(); });
  drawCov();

  // ---------- 3. errors ----------
  var seedErr = 21, G3 = 20000, COV3 = 20;
  function drawErr() {
    var ps = makePanels('b-err', 3), sims = [], ymax = 0, n = COV3 * G3 / L;
    [0, 0.005, 0.02].forEach(function (e, q) {
      var rnd = rng(seedErr * 100 + q), g = genSeq(G3, rnd), sim = simulate([g], n, e, rnd), H = histogram(sim.counts, null, 1)[0], x, m = 0;
      for (x = 5; x < H.length; x++) m = Math.max(m, H[x]);
      if (q === 0) ymax = nice(Math.max(m, 1) * 1.2);
      sims.push({ e: e, sim: sim, H: H, top: m });
    });
    sims.forEach(function (s, q) {
      var wrongShare = (100 * s.sim.wrong / s.sim.bases);
      ps[q].lab.innerHTML = '<b>' + (s.e * 100).toString().replace(/\.0+$/, '') + ' %</b> of bases read wrongly';
      drawHist(ps[q].box, { xmax: 40, ymax: ymax, series: [{ n: s.H, color: 'var(--accent)' }] },
        'k-mer histogram when ' + (s.e * 100) + ' percent of bases are read wrongly');
      ps[q].st.innerHTML = 'Seen once: <b>' + fmt(s.H[1] || 0) + '</b> k-mers. Tallest peak bar: <b>' + fmt(s.top) + '</b>.';
    });
    $('b-errnote').textContent = params('Genome: ' + fmt(G3) + ' bases, coverage ' + COV3 + '×. Red: true height of a cut bar.');
  }
  $('b-errnew').addEventListener('click', function () { seedErr++; drawErr(); });
  drawErr();

  // ---------- 4. genome size ----------
  var seedSize = 31, COV4 = 30, ERR4 = 0.003;
  function drawSize() {
    var ps = makePanels('b-size', 3), sims = [], ymax = 0;
    [5000, 10000, 20000].forEach(function (G, q) {
      var rnd = rng(seedSize * 100 + q), g = genSeq(G, rnd), n = COV4 * G / L;
      var sim = simulate([g], n, ERR4, rnd), H = histogram(sim.counts, null, 1)[0], pk = peakOf(H, 5), vl = valleyOf(H, pk), S = 0, x, m = 0;
      for (x = vl; x < H.length; x++) S += x * H[x];
      for (x = 5; x < H.length; x++) m = Math.max(m, H[x]);
      ymax = Math.max(ymax, m);
      sims.push({ G: G, H: H, pk: pk, vl: vl, S: S, E: S / pk });
    });
    ymax = nice(ymax * 1.15);
    sims.forEach(function (s, q) {
      var left = [0], right = [0], x;
      for (x = 1; x < s.H.length; x++) { left[x] = x < s.vl ? s.H[x] : 0; right[x] = x >= s.vl ? s.H[x] : 0; }
      ps[q].lab.innerHTML = '<b>' + fmt(s.G) + '</b> bases';
      drawHist(ps[q].box, { xmax: 50, ymax: ymax, series: [{ n: left, color: 'var(--err)' }, { n: right, color: 'var(--accent)' }],
        marks: [{ x: s.vl, label: 'valley', color: 'var(--muted)' }, { x: s.pk, label: 'peak' }] }, 'k-mer histogram of a genome of ' + s.G + ' bases');
      ps[q].st.innerHTML = 'Valley at <b>' + s.vl + '</b>, peak at <b>' + s.pk + '</b>.<br>Total of x · (bar height) from the valley: <b>' + fmt(s.S) + '</b>.<br>' +
        fmt(s.S) + ' ÷ ' + s.pk + ' = <b>' + fmt(s.E) + '</b> bases (the toy genome has ' + fmt(s.G) + ': ' + (s.E >= s.G ? '+' : '−') + (100 * Math.abs(s.E - s.G) / s.G).toFixed(1) + ' %).';
    });
    $('b-sizenote').textContent = params('Coverage ' + COV4 + '×, ' + (ERR4 * 100) + ' % errors. The true size is shown only for comparison.');
  }
  $('b-sizenew').addEventListener('click', function () { seedSize++; drawSize(); });
  drawSize();

  // ---------- 5. heterozygosity ----------
  var seedHet = 41, G5 = 10000, COV5 = 40;
  function drawHet() {
    var ps = makePanels('b-het', 3), sims = [], ymax = 0, n = COV5 * G5 / L;
    [0, 0.01, 0.03].forEach(function (h, q) {
      var rnd = rng(seedHet * 100 + q), g1 = genSeq(G5, rnd), g2 = new Uint8Array(g1), i, diff = 0;
      for (i = 0; i < G5; i++) if (rnd() < h) { g2[i] = (g1[i] + 1 + Math.floor(rnd() * 3)) % 4; diff++; }
      var s1 = kmerSet(g1), s2 = kmerSet(g2);
      var sim = simulate([g1, g2], n, 0, rnd);
      var H = histogram(sim.counts, function (key) { return (s1.has(key) && s2.has(key)) ? 0 : 1; }, 2);
      var both = H[0], one = H[1], x, m = 0, nOne = 0, nAll = 0, tt = total(H);
      for (x = 1; x < tt.length; x++) { m = Math.max(m, tt[x]); nAll += tt[x]; nOne += one[x] || 0; }
      ymax = Math.max(ymax, m);
      sims.push({ h: h, diff: diff, both: both, one: one, nOne: nOne, nAll: nAll, pb: peakOf(both, 2), po: nOne ? peakOf(one, 2) : 0, hb: 0, ho: 0 });
      sims[q].hb = smooth(both, sims[q].pb); sims[q].ho = nOne ? smooth(one, sims[q].po) : 0;
    });
    ymax = nice(ymax * 1.08);
    sims.forEach(function (s, q) {
      var marks = [{ x: s.pb, label: 'main peak' }];
      if (s.nOne) marks.unshift({ x: s.po, label: 'het peak', color: 'var(--het)' });
      ps[q].lab.innerHTML = '<b>' + (s.h * 100) + ' %</b> of positions differ';
      drawHist(ps[q].box, { xmax: 60, ymax: ymax, series: [{ n: s.both, color: 'var(--accent)' }, { n: s.one, color: 'var(--het)' }], marks: marks },
        'k-mer histogram of a diploid genome, ' + (s.h * 100) + ' percent of positions differ');
      ps[q].st.innerHTML = 'On one copy only: <b>' + (100 * s.nOne / s.nAll).toFixed(0) + ' %</b> of k-mers.<br>' +
        (s.nOne ? 'Main peak at <b>' + s.pb + '</b>, second peak at <b>' + s.po + '</b>, ' + (s.ho > s.hb ? 'taller' : 'lower') + ' than the main one.' : 'Only the main peak, at <b>' + s.pb + '</b>.');
    });
    $('b-hetnote').textContent = params('Each copy: ' + fmt(G5) + ' bases. Coverage ' + COV5 + '×. No errors.');
  }
  $('b-hetnew').addEventListener('click', function () { seedHet++; drawHet(); });
  drawHet();

  // ---------- 6. repeats ----------
  var seedRep = 51, UNIQ = 4800, UNIT = 2000, COV6 = 15;
  function drawRep() {
    var ps = makePanels('b-rep', 3), sims = [], ymax = 0;
    [1, 2, 4].forEach(function (copies, q) {
      var rnd = rng(seedRep * 100 + q), unit = genSeq(UNIT, rnd), parts = [], i, chunk = Math.floor(UNIQ / (copies + 1));
      for (i = 0; i <= copies; i++) { parts.push(genSeq(chunk, rnd)); if (i < copies) parts.push(unit); }
      var g = concat(parts), us = kmerSet(unit), n = COV6 * g.length / L;
      var sim = simulate([g], Math.round(n), 0, rnd);
      var H = histogram(sim.counts, function (key) { return us.has(key) ? 1 : 0; }, 2), tt = total(H), x, m = 0;
      for (x = 1; x < tt.length; x++) m = Math.max(m, tt[x]);
      ymax = Math.max(ymax, m);
      sims.push({ copies: copies, g: g.length, H: H, pu: meanOf(H[0]), pr: meanOf(H[1]) });
    });
    ymax = nice(ymax * 1.08);
    sims.forEach(function (s, q) {
      var marks = [{ x: Math.max(1, Math.round(s.pu)), label: 'rest' }, { x: Math.round(s.pr), label: 'piece', color: 'var(--rep)' }];
      ps[q].lab.innerHTML = '<b>' + s.copies + '</b> ' + (s.copies === 1 ? 'copy' : 'copies') + ' of the piece (genome: ' + fmt(s.g) + ' bases)';
      drawHist(ps[q].box, { xmax: 70, ymax: ymax, series: [{ n: s.H[0], color: 'var(--accent)' }, { n: s.H[1], color: 'var(--rep)' }], marks: marks },
        'k-mer histogram of a genome with ' + s.copies + ' copies of one piece');
      ps[q].st.innerHTML = 'Average sightings: rest <b>' + s.pu.toFixed(1) + '</b>, piece <b>' + s.pr.toFixed(1) + '</b>: <b>' + (s.pr / s.pu).toFixed(1) + '</b> times as often.';
    });
    $('b-repnote').textContent = params('Piece: ' + fmt(UNIT) + ' bases. Rest: ' + fmt(UNIQ) + ' bases. Coverage ' + COV6 + '×. No errors.');
  }
  $('b-repnew').addEventListener('click', function () { seedRep++; drawRep(); });
  drawRep();
})();
