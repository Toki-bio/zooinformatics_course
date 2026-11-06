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
    return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'img', 'aria-label': label, 'class': 'b-svg', style: 'display:block' }, box);
  }
  function txt(svg, x, y, s, anchor, cls) { return el('text', { x: x, y: y, 'text-anchor': anchor || 'start', 'class': cls || '' }, svg, s); }
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
  function randSeq(r, n) { var a = new Uint8Array(n), i; for (i = 0; i < n; i++) a[i] = Math.floor(r() * 4); return a; }
  function comma(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  // change exactly n positions, each to a different base
  function mutateN(r, s, n) {
    var c = new Uint8Array(s), idx = [], i, j, t;
    for (i = 0; i < s.length; i++) idx.push(i);
    for (i = idx.length - 1; i > 0; i--) { j = Math.floor(r() * (i + 1)); t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    for (i = 0; i < n; i++) c[idx[i]] = (c[idx[i]] + 1 + Math.floor(r() * 3)) % 4;
    return c;
  }
  // each base changes independently with probability d
  function mutateP(r, s, d) {
    var c = new Uint8Array(s), i;
    for (i = 0; i < s.length; i++) if (r() < d) c[i] = (c[i] + 1 + Math.floor(r() * 3)) % 4;
    return c;
  }
  // Smith-Waterman, +5 / -4, a gap of k bases costs 12 + 4k (affine)
  function sw(a, b) {
    var n = a.length, m = b.length, H = new Int32Array(m + 1), F = new Int32Array(m + 1), i, j, best = 0, diag, up, e, h, f, hl, ai;
    for (j = 0; j <= m; j++) F[j] = -1000000;
    for (i = 1; i <= n; i++) {
      diag = 0; H[0] = 0; e = -1000000; hl = 0; ai = a[i - 1];
      for (j = 1; j <= m; j++) {
        up = H[j];
        e = Math.max(hl - 16, e - 4);
        f = Math.max(up - 16, F[j] - 4);
        F[j] = f;
        h = diag + (ai === b[j - 1] ? 5 : -4);
        if (e > h) h = e;
        if (f > h) h = f;
        if (h < 0) h = 0;
        diag = up; H[j] = h; hl = h;
        if (h > best) best = h;
      }
    }
    return best;
  }
  function median(v) { v = v.slice().sort(function (x, y) { return x - y; }); return v[Math.floor(v.length / 2)]; }
  function fill(c) { return 'fill:var(--' + c + ')'; }

  // 1. scan or index
  var scanSeed = 1;
  function drawScan() {
    var r = rng(8000 + scanSeed), N = 20000, QL = 24, W = 12, T = randSeq(r, N), i, s, j, Q, ok;
    var counts = [1, 10, 100, 1000], rows = [];
    var idx = {}, key, buildSteps = 0;
    for (i = 0; i + W <= N; i++) {
      key = 0; for (j = 0; j < W; j++) key = key * 4 + T[i + j];
      (idx[key] = idx[key] || []).push(i); buildSteps++;
    }
    counts.forEach(function (q) {
      var scanSteps = 0, idxSteps = buildSteps, hitsS = 0, hitsI = 0, qi;
      for (qi = 0; qi < q; qi++) {
        var p = Math.floor(r() * (N - QL)); Q = T.subarray(p, p + QL);
        for (s = 0; s + QL <= N; s++) {
          scanSteps++; ok = true;
          for (j = 0; j < QL; j++) if (T[s + j] !== Q[j]) { ok = false; break; }
          if (ok) hitsS++;
        }
        key = 0; for (j = 0; j < W; j++) key = key * 4 + Q[j];
        idxSteps++;
        var c = idx[key] || [];
        c.forEach(function (st) {
          idxSteps++; ok = true;
          for (j = W; j < QL; j++) if (T[st + j] !== Q[j]) { ok = false; break; }
          if (ok) hitsI++;
        });
      }
      rows.push({ q: q, scan: scanSteps, index: idxSteps, same: hitsS === hitsI });
    });
    var svg = svgIn('b-scan', 640, 4 * 66 + 12, 'Places examined by a scan and by an index for 1, 10, 100 and 1000 queries');
    var allSame = true, BW = 400;
    rows.forEach(function (d, k) {
      var y = 8 + k * 66, mx = Math.max(d.scan, d.index), wi = Math.max(2, BW * d.index / mx);
      if (!d.same) allSame = false;
      txt(svg, 4, y + 14, d.q + (d.q === 1 ? ' query' : ' queries'));
      el('rect', { x: 120, y: y, width: BW * d.scan / mx, height: 22, style: fill('het') }, svg);
      txt(svg, 126, y + 16, 'scan: ' + comma(d.scan), 'start');
      el('rect', { x: 120, y: y + 26, width: wi, height: 22, style: fill('accent') }, svg);
      if (wi > 200) txt(svg, 126, y + 42, 'index: ' + comma(d.index), 'start'); else txt(svg, 126 + wi + 6, y + 42, 'index: ' + comma(d.index), 'start');
    });
    var a = rows[0], b = rows[3];
    $('b-scanmsg').innerHTML = 'Orange: scan. Blue: index, including its one-time build. For ' + a.q + ' query the cost is similar (' + comma(a.scan) + ' against ' + comma(a.index) + '); for ' + comma(b.q) + ' queries it is ' + comma(b.scan) + ' against ' + comma(b.index) + ', ' + Math.round(b.scan / b.index) + ' times fewer. ' + (allSame ? 'Both found the same matches.' : 'The two methods disagreed on some matches: a defect.');
  }
  $('b-scannew').addEventListener('click', function () { scanSeed++; drawScan(); });
  drawScan();

  // 2. dot plot of words
  var GL = 1200, QS = 500, QN = 60, g2 = rng(77), G2 = randSeq(g2, GL), Q2 = G2.subarray(QS, QS + QN);
  function drawDots() {
    var k = +$('b-k').value, X = 620 / GL, Y = 2, h = QN * Y + 24, svg = svgIn('b-dots', 640, h, 'Dot plot: words of the query found in the target');
    var map = {}, i, j, key, on = 0, off = 0, words = QN - k + 1, dots = [];
    el('rect', { x: 10, y: 4, width: GL * X, height: QN * Y, style: 'fill:var(--panel)' }, svg);
    for (i = 0; i + k <= GL; i++) { key = 0; for (j = 0; j < k; j++) key = key * 4 + G2[i + j]; (map[key] = map[key] || []).push(i); }
    for (i = 0; i < words; i++) {
      key = 0; for (j = 0; j < k; j++) key = key * 4 + Q2[i + j];
      (map[key] || []).forEach(function (g) { var t = g - i === QS; if (t) on++; else off++; dots.push([g, i, t]); });
    }
    dots.forEach(function (d) { el('rect', { x: 10 + d[0] * X, y: 4 + d[1] * Y, width: Math.max(1.6, k * X), height: 2, style: fill(d[2] ? 'good' : 'rep') }, svg); });
    txt(svg, 10, h - 4, 'place in the target, 1 to ' + comma(GL), 'start', 'b-m');
    $('b-k-o').textContent = k + ' bases';
    $('b-d1').textContent = words; $('b-d2').textContent = on; $('b-d3').textContent = off;
    var m;
    if (off > words) m = 'At k = ' + k + ' there are ' + off + ' chance dots for only ' + on + ' on the line. The line is hidden among them.';
    else if (off > 0) m = 'At k = ' + k + ' the line has ' + on + ' dots and ' + off + ' chance ' + (off === 1 ? 'dot remains' : 'dots remain') + '. The line stands out.';
    else m = 'At k = ' + k + ' no chance dots remain.';
    $('b-dmsg').textContent = m;
  }
  $('b-k').addEventListener('input', drawDots);
  drawDots();

  // 3. scores
  var scSeed = 1;
  function drawScores() {
    var r = rng(300 + scSeed), L = 60, Q = randSeq(r, L), i, rows = [];
    [0, 6, 12, 18, 24].forEach(function (n) { var c = mutateN(r, Q, n); rows.push({ lab: Math.round(100 * n / L) + ' % differ', c: c, s: sw(Q, c) }); });
    var un = randSeq(r, L); rows.push({ lab: 'unrelated', c: un, s: sw(Q, un) });
    var rb = 0; for (i = 0; i < 200; i++) rb = Math.max(rb, sw(Q, randSeq(r, L)));
    var RH = 40, h = rows.length * RH + 14, svg = svgIn('b-scores', 640, h, 'Alignment scores of copies with increasing divergence'), CW = 6, X0 = 112;
    rows.forEach(function (d, k) {
      var y = 4 + k * RH, j, w = Math.max(1, 360 * d.s / 300);
      txt(svg, 4, y + 14, d.lab);
      for (j = 0; j < L; j++) el('rect', { x: X0 + j * CW, y: y, width: CW - 0.8, height: 12, style: fill(d.c[j] === Q[j] ? 'good' : 'bad') }, svg);
      el('rect', { x: X0, y: y + 16, width: w, height: 12, style: fill('accent') }, svg);
      txt(svg, X0 + w + 6, y + 27, String(d.s));
    });
    el('line', { x1: X0 + 360 * rb / 300, x2: X0 + 360 * rb / 300, y1: 2, y2: h - 8, style: 'stroke:var(--muted);stroke-dasharray:4 3;stroke-width:1.5' }, svg);
    var above = rows.filter(function (d, k) { return k < 5 && d.s > rb; }).length;
    $('b-scmsg').textContent = 'Best unrelated score: ' + rb + '. ' + above + ' of the 5 copies scored higher; the most changed (' + rows[4].lab + ') scored ' + rows[4].s + '. The unrelated sequence scored ' + rows[5].s + (rows[5].s <= rb ? ', at or below chance.' : ', above it by chance.');
  }
  $('b-scnew').addEventListener('click', function () { scSeed++; drawScores(); });
  drawScores();

  // 4. seeds miss diverged copies
  var sdSeed = 1;
  function longestRun(a, b) { var run = 0, best = 0, i; for (i = 0; i < a.length; i++) { if (a[i] === b[i]) { run++; if (run > best) best = run; } else run = 0; } return best; }
  function drawSeeds() {
    var r = rng(4000 + sdSeed), L = 250, Q = randSeq(r, L), ds = [0.1, 0.2, 0.3, 0.4], ks = [28, 11, 7], NC = 300, res = {}, ex = null, runs = {}, c, x;
    ds.forEach(function (dv) {
      runs[dv] = [];
      for (c = 0; c < NC; c++) { x = mutateP(r, Q, dv); runs[dv].push(longestRun(Q, x)); if (!ex && dv >= 0.3 && runs[dv][c] < 11) ex = { x: x, d: dv, run: runs[dv][c] }; }
    });
    var svg = svgIn('b-seeds', 640, 3 * 118 + 6, 'Share of copies found by seed words of length 28, 11 and 7');
    ks.forEach(function (kk, pi) {
      var y0 = 4 + pi * 118;
      txt(svg, 4, y0 + 15, 'seed word of ' + kk + ' bases');
      ds.forEach(function (dv, ri) {
        var f = runs[dv].filter(function (v) { return v >= kk; }).length / NC, y = y0 + 24 + ri * 22;
        res[kk + '_' + dv] = f;
        txt(svg, 130, y + 14, Math.round(dv * 100) + ' % differ', 'end', 'b-m');
        el('rect', { x: 140, y: y, width: 360, height: 16, style: fill('panel') }, svg);
        el('rect', { x: 140, y: y, width: 360 * f, height: 16, style: fill(f > 0.5 ? 'good' : (f > 0.1 ? 'rep' : 'bad')) }, svg);
        txt(svg, 506, y + 14, Math.round(100 * f) + ' % found');
      });
    });
    var msg = 'At 30 % divergence the word of 28 finds ' + Math.round(100 * res['28_0.3']) + ' % of the copies, the word of 11 finds ' + Math.round(100 * res['11_0.3']) + ' % and the word of 7 finds ' + Math.round(100 * res['7_0.3']) + ' %. ';
    if (ex) {
      var rb = 0, t, s;
      for (t = 0; t < 20; t++) rb = Math.max(rb, sw(Q, randSeq(r, L)));
      s = sw(Q, ex.x);
      msg += 'One copy with ' + Math.round(ex.d * 100) + ' % changed has no identical run longer than ' + ex.run + ' bases, so a word of 11 misses it. Its score is ' + s + ' and the best of 20 unrelated sequences is ' + rb + ': ' + (s > rb ? 'a real match the seed test lost.' : 'the score does not separate it either.');
    }
    $('b-sdmsg').textContent = msg;
  }
  $('b-sdnew').addEventListener('click', function () { sdSeed++; drawSeeds(); });
  drawSeeds();

  // 5. extension
  var exSeed = 1;
  function extendScore(T, p, Q, q, k) {
    var s = 5 * k, best = s, i, cur = s, right, left;
    for (i = 1; p + k - 1 + i < T.length && q + k - 1 + i < Q.length; i++) { cur += T[p + k - 1 + i] === Q[q + k - 1 + i] ? 5 : -4; if (cur > best) best = cur; if (cur < best - 20) break; }
    right = best - s; best = 0; cur = 0;
    for (i = 1; p - i >= 0 && q - i >= 0; i++) { cur += T[p - i] === Q[q - i] ? 5 : -4; if (cur > best) best = cur; if (cur < best - 20) break; }
    left = best;
    return s + right + left;
  }
  function drawExt() {
    var r = rng(5000 + exSeed), N = 20000, QL = 120, T = randSeq(r, N), P = 8000 + Math.floor(r() * 4000), Q = mutateP(r, T.subarray(P, P + QL), 0.15), svg = svgIn('b-ext', 640, 2 * 130 + 10, 'Scores after extension of seeds'), msgs = [];
    [7, 11].forEach(function (k, pi) {
      var map = {}, i, j, key, y0 = 4 + pi * 130, pts = [];
      for (i = 0; i + k <= N; i++) { key = 0; for (j = 0; j < k; j++) key = key * 4 + T[i + j]; (map[key] = map[key] || []).push(i); }
      for (i = 0; i + k <= QL; i++) {
        key = 0; for (j = 0; j < k; j++) key = key * 4 + Q[i + j];
        (map[key] || []).forEach(function (p) { pts.push({ t: p - i === P, s: extendScore(T, p, Q, i, k) }); });
      }
      var X0 = 20, XW = 600, MX = 5 * QL, nT = 0, nC = 0, bT = 0, bC = 0, cc = rng(9);
      txt(svg, 4, y0 + 14, 'seed word of ' + k + ' bases');
      el('rect', { x: X0, y: y0 + 22, width: XW, height: 70, style: fill('panel') }, svg);
      pts.forEach(function (d) {
        if (d.t) { nT++; bT = Math.max(bT, d.s); } else { nC++; bC = Math.max(bC, d.s); }
        el('circle', { cx: X0 + XW * Math.min(d.s, MX) / MX, cy: y0 + 28 + cc() * 58, r: 3, style: fill(d.t ? 'good' : 'rep') + ';opacity:.8' }, svg);
      });
      txt(svg, X0, y0 + 108, 'score after extension: 0', 'start', 'b-m');
      txt(svg, X0 + XW, y0 + 108, String(MX), 'end', 'b-m');
      msgs.push('Word of ' + k + ': ' + (nC + nT) + ' seeds, ' + nC + ' by chance' + (nC ? ' (best ' + bC + ')' : '') + ' and ' + nT + ' at the true place' + (nT ? ' (best ' + bT + ').' : '.') + (nT === 0 ? ' No seed fell on the copy: it is lost.' : (bT > bC ? ' The true place scores highest.' : ' The true place does not stand out.')));
    });
    $('b-extmsg').textContent = msgs.join(' ');
  }
  $('b-extnew').addEventListener('click', function () { exSeed++; drawExt(); });
  drawExt();

  // 6. bigger target
  var bgSeed = 1;
  function drawBig() {
    var r = rng(6000 + bgSeed), L = 40, Q = randSeq(r, L), sizes = [1000, 10000, 100000], best = [], ds = [0.1, 0.2, 0.3, 0.4], dsc = [], t;
    sizes.forEach(function (n) { var v = []; for (t = 0; t < 5; t++) v.push(sw(Q, randSeq(r, n))); best.push(median(v)); });
    ds.forEach(function (d) { var v = []; for (t = 0; t < 5; t++) v.push(sw(Q, mutateN(r, Q, Math.round(d * L)))); dsc.push(median(v)); });
    var MX = 200, svg = svgIn('b-big', 640, 7 * 26 + 10, 'Chance scores in targets of three sizes and scores of diverged copies'), y = 4, BW = 340;
    sizes.forEach(function (n, k) {
      el('rect', { x: 180, y: y, width: BW * best[k] / MX, height: 18, style: fill('muted') }, svg);
      txt(svg, 174, y + 14, 'random, ' + comma(n) + ' bases', 'end'); txt(svg, 186 + BW * best[k] / MX, y + 14, String(best[k])); y += 26;
    });
    ds.forEach(function (d, k) {
      el('rect', { x: 180, y: y, width: BW * dsc[k] / MX, height: 18, style: fill('good') }, svg);
      txt(svg, 174, y + 14, Math.round(d * 100) + ' % differ', 'end'); txt(svg, 186 + BW * dsc[k] / MX, y + 14, String(dsc[k])); y += 26;
    });
    var lines = sizes.map(function (n, k) {
      var lost = ds.filter(function (d, j) { return dsc[j] <= best[k]; }).map(function (d) { return Math.round(d * 100) + ' %'; });
      return 'in ' + comma(n) + ' bases the chance score is ' + best[k] + ' and ' + (lost.length ? 'copies with ' + lost.join(' and ') + ' of bases changed fall at or below it' : 'all four copies stay above it');
    });
    $('b-bigmsg').textContent = lines.join('; ').replace(/^i/, 'I') + '.';
  }
  $('b-bignew').addEventListener('click', function () { bgSeed++; drawBig(); });
  drawBig();
})();
