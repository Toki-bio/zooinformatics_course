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
  function svgIn(box, w, h, label) {
    box.textContent = '';
    return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'img', 'aria-label': label, style: 'display:block' }, box);
  }
  function div(parent, cls) {
    var d = document.createElement('div');
    d.className = cls;
    parent.appendChild(d);
    return d;
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
  function expo(r, mean) { return -Math.log(1 - r()) * mean; }
  function poisson(r, lam) {
    var L = Math.exp(-lam), k = 0, p = 1;
    do { k++; p *= r(); } while (p > L);
    return k - 1;
  }
  var TXT = 'font-size:10.5px;fill:var(--muted)';

  // ---------- 1. Two lines in a toy population, traced back
  var wfSeed = 1;
  function drawWF() {
    var box = $('b-wf'), r = rng(wfSeed * 7919), C = 10, G = 36, dx = 11, dy = 7.6, W = C * dx + 8, H = G * dy + 14;
    var meets = [], i, q, g;
    box.textContent = '';
    function X(k) { return 4 + dx / 2 + k * dx; }
    function Y(gg) { return 6 + (G - gg) * dy; }
    for (q = 0; q < 6; q++) {
      // par[g][i] = parent, in the row g+1 generations back, of copy i of the row g generations back
      var par = [];
      for (g = 0; g < G; g++) {
        var ps = [];
        for (i = 0; i < C; i++) ps.push(Math.floor(r() * C));
        ps.sort(function (a, b) { return a - b; });       // copies of a row are interchangeable: sort so that links do not cross
        par.push(ps);
      }
      var a = Math.floor(r() * C), b = Math.floor(r() * (C - 1)); if (b >= a) b++;
      var pa = [a], pb = [b], meet = -1;
      for (g = 0; g < G && meet < 0; g++) {
        a = par[g][a]; b = par[g][b];
        pa.push(a); pb.push(b);
        if (a === b) meet = g + 1;
      }
      var cell = div(box, 'b-cell'), bx = div(cell, 'svgbox');
      var svg = svgIn(bx, W, H, 'Toy population of 10 gene copies per generation with two lines followed back');
      for (g = 0; g < G; g++) for (i = 0; i < C; i++) el('line', { x1: X(i), y1: Y(g), x2: X(par[g][i]), y2: Y(g + 1), style: 'stroke:var(--line);stroke-width:.8' }, svg);
      for (g = 0; g <= G; g++) for (i = 0; i < C; i++) el('circle', { cx: X(i), cy: Y(g), r: 1.4, style: 'fill:var(--muted);opacity:.5' }, svg);
      var last = meet < 0 ? G : meet;
      for (g = 0; g < last; g++) {
        el('line', { x1: X(pa[g]), y1: Y(g), x2: X(pa[g + 1]), y2: Y(g + 1), style: 'stroke:var(--accent);stroke-width:2' }, svg);
        el('line', { x1: X(pb[g]), y1: Y(g), x2: X(pb[g + 1]), y2: Y(g + 1), style: 'stroke:var(--het);stroke-width:2' }, svg);
      }
      el('circle', { cx: X(pa[0]), cy: Y(0), r: 3, style: 'fill:var(--accent)' }, svg);
      el('circle', { cx: X(pb[0]), cy: Y(0), r: 3, style: 'fill:var(--het)' }, svg);
      if (meet > 0) el('circle', { cx: X(pa[meet]), cy: Y(meet), r: 5, style: 'fill:none;stroke:var(--bad);stroke-width:2' }, svg);
      div(cell, 'b-cap').textContent = meet > 0 ? 'Met ' + meet + (meet === 1 ? ' generation' : ' generations') + ' back' : 'Not met within ' + G + ' generations';
      meets.push(meet);
    }
    var met = meets.filter(function (m) { return m > 0; });
    $('b-wfmsg').textContent = 'The copies met ' + (met.length ? 'between ' + Math.min.apply(null, met) + ' and ' + Math.max.apply(null, met) + ' generations back' : 'in none of them') +
      ', and in ' + met.length + ' of 6 populations within ' + G + ' generations.';
  }
  $('b-wfnew').addEventListener('click', function () { wfSeed++; drawWF(); });
  drawWF();

  // ---------- 2. Waiting time for a pair, three population sizes
  var meetSeed = 1;
  function drawMeet() {
    var box = $('b-meet'), r = rng(meetSeed * 104729), sizes = [10, 40, 160], P = 300, XMAX = 400, BW = 20, NB = XMAX / BW, out = [];
    box.textContent = '';
    sizes.forEach(function (n) {
      var tot = 0, mx = 0, bins = [], b, k, w;
      for (b = 0; b <= NB; b++) bins.push(0);
      for (k = 0; k < P; k++) {
        w = 1;
        while (r() >= 1 / n) w++;                    // each generation: same parent with chance 1 in n
        tot += w; if (w > mx) mx = w;
        bins[Math.min(NB, Math.floor((w - 1) / BW))]++;
      }
      var avg = tot / P, top = Math.max.apply(null, bins);
      var cell = div(box, 'b-cell'), cap = div(cell, 'b-cap'), bx = div(cell, 'svgbox');
      cap.innerHTML = '<b>' + (n / 2) + ' animals</b>, ' + n + ' gene copies: chance of meeting 1 in ' + n + ' per generation';
      var W = 330, x0 = 8, pw = 300, base = 120, ph = 100, bwid = pw / (NB + 1);
      var svg = svgIn(bx, W, 150, 'Waiting times of 300 pairs of gene copies in a population of ' + (n / 2) + ' animals');
      bins.forEach(function (c, i) {
        var h = ph * c / top;
        el('rect', { x: x0 + i * bwid + 0.5, y: base - h, width: bwid - 1, height: h, style: 'fill:' + (i === NB ? 'var(--muted)' : 'var(--accent)') }, svg);
      });
      el('line', { x1: x0, y1: base, x2: x0 + pw, y2: base, style: 'stroke:var(--fg)' }, svg);
      [0, 100, 200, 300, 400].forEach(function (t) {
        el('text', { x: x0 + t / XMAX * (NB * bwid), y: base + 13, 'text-anchor': 'middle', style: TXT }, svg, t);
      });
      el('text', { x: x0 + NB * bwid + bwid / 2, y: base + 13, 'text-anchor': 'middle', style: TXT }, svg, '>400');
      el('text', { x: x0 + pw / 2, y: base + 28, 'text-anchor': 'middle', style: TXT }, svg, 'generations until the pair meets');
      if (avg < XMAX) el('line', { x1: x0 + avg / XMAX * (NB * bwid), y1: base - ph - 4, x2: x0 + avg / XMAX * (NB * bwid), y2: base, style: 'stroke:var(--bad);stroke-width:1.6;stroke-dasharray:4 3' }, svg);
      el('text', { x: x0 + 2, y: 11, style: TXT }, svg, 'tallest bar: ' + Math.round(100 * top / P) + ' % of pairs');
      div(cell, 'b-cap').innerHTML = 'Average wait <b>' + avg.toFixed(0) + '</b> generations, longest <b>' + mx + '</b>.';
      out.push(avg);
    });
    $('b-meetmsg').textContent = 'Average waits: ' + out.map(function (a) { return a.toFixed(0); }).join(', ') + ' generations, in populations of 5, 20 and 80 animals. Each is close to the number of gene copies (2N).';
  }
  $('b-meetnew').addEventListener('click', function () { meetSeed++; drawMeet(); });
  drawMeet();

  // ---------- 3. Differences between the two copies, small and large population
  var diffSeed = 1, ML = 40, MU = 5e-6;
  function mutate(r, seq, T) {
    var s = seq.split(''), k = poisson(r, MU * T * ML), p, c;
    while (k--) { p = Math.floor(r() * ML); do { c = 'ACGT'[Math.floor(r() * 4)]; } while (c === s[p]); s[p] = c; }
    return s.join('');
  }
  function stretch(r, copies) {
    var anc = '', i, T = Math.ceil(expo(r, copies));
    for (i = 0; i < ML; i++) anc += 'ACGT'[Math.floor(r() * 4)];
    var m = mutate(r, anc, T), f = mutate(r, anc, T), d = 0;
    for (i = 0; i < ML; i++) if (m[i] !== f[i]) d++;
    return { m: m, f: f, T: T, d: d };
  }
  function pairHTML(s) {
    function row(a, b) { return a.split('').map(function (c, i) { return '<span' + (c !== b[i] ? ' class="b-d"' : '') + '>' + c + '</span>'; }).join(''); }
    return '<div class="b-info">Ancestor ' + fmt(s.T) + ' generations back · <b>' + s.d + (s.d === 1 ? ' difference' : ' differences') + '</b></div>' +
      '<div class="b-pair">mother ' + row(s.m, s.f) + '\nfather ' + row(s.f, s.m) + '</div>';
  }
  function drawDiff() {
    var box = $('b-diff'), r = rng(diffSeed * 31337), avgs = [], times = [];
    box.textContent = '';
    [[1000, 'Small population: 1,000 animals'], [10000, 'Large population: 10,000 animals']].forEach(function (cfg) {
      var cell = div(box, 'b-cell'), h = '', k, tot = 0, tt = 0, s, rr = rng(diffSeed * 99991 + cfg[0]);
      div(cell, 'b-cap').innerHTML = '<b>' + cfg[1] + '</b>';
      for (k = 0; k < 4; k++) h += pairHTML(stretch(r, cfg[0] * 2));
      for (k = 0; k < 1000; k++) { s = stretch(rr, cfg[0] * 2); tot += s.d; tt += s.T; }
      div(cell, 'b-cap').innerHTML = h + '<p class="b-cap">Over 1,000 such stretches: ancestors <b>' + fmt(tt / 1000) + '</b> generations back on average, <b>' + (tot / 1000).toFixed(2) + '</b> differences per 40 bases.</p>';
      avgs.push(tot / 1000); times.push(tt / 1000);
    });
    $('b-diffmsg').textContent = 'The large population has ' + (avgs[1] / avgs[0]).toFixed(1) + ' times more differences, and its ancestors lived ' + (times[1] / times[0]).toFixed(1) + ' times further back.';
  }
  $('b-diffnew').addEventListener('click', function () { diffSeed++; drawDiff(); });
  drawDiff();

  // ---------- 4. A chromosome as a row of stretches
  var skySeed = 1, RREC = 1e-8, CHL = 1e6;
  function chrom(r, copies) {
    var pos = 0, out = [], T, len, cap = 12 * copies;
    while (pos < CHL) {
      T = expo(r, copies);
      if (r() > Math.min(1, T / cap)) continue;      // stretches of a younger ancestor are longer, so they cover more of the chromosome
      len = expo(r, 1 / (2 * RREC * T));
      out.push({ s: pos, l: Math.min(len, CHL - pos), T: T });
      pos += len;
    }
    return out;
  }
  function drawSky() {
    var cfg = [[2000, 'Small population, 1,000 animals', 'b-skyS'], [20000, 'Large population, 10,000 animals', 'b-skyL']], rd = '';
    cfg.forEach(function (c, ci) {
      var r = rng(skySeed * 8191 + ci), P = chrom(r, c[0]), W = 640, x0 = 56, pw = 578, base = 118, ph = 100, tmin = 100, tmax = 200000, tl = 0, ll = 0;
      var svg = svgIn($(c[2]), W, 152, c[1] + ': stretches of one chromosome, each with the time since its common ancestor');
      function yy(t) { return base - ph * Math.log(Math.min(tmax, Math.max(tmin, t)) / tmin) / Math.log(tmax / tmin); }
      el('text', { x: x0, y: 10, style: 'font-size:12px;fill:var(--fg);font-weight:600' }, svg, c[1]);
      [1000, 10000, 100000].forEach(function (t) {
        el('line', { x1: x0, y1: yy(t), x2: x0 + pw, y2: yy(t), style: 'stroke:var(--line);stroke-dasharray:2 3' }, svg);
        el('text', { x: x0 - 4, y: yy(t) + 3.5, 'text-anchor': 'end', style: TXT }, svg, fmt(t));
      });
      P.forEach(function (p, k) {
        var wpx = p.l / CHL * pw;
        el('rect', { x: x0 + p.s / CHL * pw, y: yy(p.T), width: Math.max(0.6, wpx - (wpx > 3 ? 0.8 : 0)), height: base - yy(p.T), style: 'fill:' + (k % 2 ? 'var(--rep)' : 'var(--accent)') }, svg);
        tl += p.T * p.l; ll += p.l;
      });
      el('line', { x1: x0, y1: base, x2: x0 + pw, y2: base, style: 'stroke:var(--fg)' }, svg);
      el('text', { x: x0, y: base + 14, style: TXT }, svg, '0');
      el('text', { x: x0 + pw, y: base + 14, 'text-anchor': 'end', style: TXT }, svg, '1 million bases');
      el('text', { x: x0 + pw / 2, y: 146, 'text-anchor': 'middle', style: TXT }, svg, 'bar height: generations back to the ancestor (log scale)');
      rd += '<div>' + c[1].split(',')[0] + '<b>' + P.length + ' stretches, mean length ' + (ll / P.length / 1000).toFixed(1) + ' kb, ancestors ' + fmt(tl / ll) + ' generations back, averaged along the chromosome</b></div>';
    });
    $('b-skyread').innerHTML = rd;
  }
  $('b-skynew').addEventListener('click', function () { skySeed++; drawSky(); });
  drawSky();

  // ---------- 5 and 6. Reading the size back from many stretches
  var EDGE = [0, 2000, 20000, 200000, Infinity];               // generations before today
  var HIST = [
    ['Constant size', [50000, 50000, 50000, 50000]],
    ['A bottleneck', [50000, 3000, 50000, 50000]],
    ['A growing population', [50000, 50000, 20000, 5000]]
  ];
  var PER = [0, 500, 1000, 2000, 4000, 8000, 20000, 40000, 80000, 200000, 400000, Infinity];
  var TMIN = 100, TMAX = 1e6, NMIN = 1000, NMAX = 200000;
  function drawT(r, ne) {                                       // time to the common ancestor, sizes constant within periods
    var e = -Math.log(1 - r()), k, rate, len;
    for (k = 0; k < 4; k++) {
      rate = 1 / (2 * ne[k]); len = EDGE[k + 1] - EDGE[k];
      if (e < rate * len) return EDGE[k] + e / rate;
      e -= rate * len;
    }
  }
  function truth(ne, a) { var k = 0; while (EDGE[k + 1] <= a) k++; return ne[k]; }
  function estimate(Ts) {                                       // size in a period = (stretch-generations waited) / (2 x meetings)
    return PER.slice(0, -1).map(function (a, k) {
      var b = PER[k + 1], ev = 0, ex = 0, i, T;
      for (i = 0; i < Ts.length; i++) {
        T = Ts[i];
        if (T > a) { ex += Math.min(T, b) - a; if (T < b) ev++; }
      }
      return { a: a, b: b, ev: ev, ne: ev ? ex / (2 * ev) : null };
    });
  }
  function xs(t, x0, pw) { return x0 + pw * Math.log(Math.max(TMIN, Math.min(TMAX, t)) / TMIN) / Math.log(TMAX / TMIN); }
  function ys(n, base, ph) { return base - ph * Math.log(Math.max(NMIN, Math.min(NMAX, n)) / NMIN) / Math.log(NMAX / NMIN); }
  function xaxis(svg, x0, pw, base) {
    el('line', { x1: x0, y1: base, x2: x0 + pw, y2: base, style: 'stroke:var(--fg)' }, svg);
    [100, 1000, 10000, 100000, 1000000].forEach(function (t) {
      el('line', { x1: xs(t, x0, pw), y1: base, x2: xs(t, x0, pw), y2: base + 3, style: 'stroke:var(--fg)' }, svg);
      el('text', { x: xs(t, x0, pw), y: base + 14, 'text-anchor': 'middle', style: 'font-size:10px;fill:var(--muted)' }, svg, t === 1000000 ? '1M' : (t >= 1000 ? fmt(t / 1000) + 'k' : t));
    });
  }
  function curve(svg, x0, pw, base, ph, ne, est) {
    var d = '', k;
    [1000, 10000, 100000].forEach(function (n) {
      el('line', { x1: x0, y1: ys(n, base, ph), x2: x0 + pw, y2: ys(n, base, ph), style: 'stroke:var(--line);stroke-dasharray:2 3' }, svg);
      el('text', { x: x0 - 4, y: ys(n, base, ph) + 3.5, 'text-anchor': 'end', style: 'font-size:10px;fill:var(--muted)' }, svg, fmt(n));
    });
    for (k = 0; k < 4; k++) {
      d += (k ? 'L' : 'M') + xs(Math.max(TMIN, EDGE[k]), x0, pw) + ' ' + ys(ne[k], base, ph) + 'L' + xs(EDGE[k + 1] === Infinity ? TMAX : EDGE[k + 1], x0, pw) + ' ' + ys(ne[k], base, ph);
    }
    el('path', { d: d, style: 'fill:none;stroke:var(--muted);stroke-width:4;opacity:.45' }, svg);
    est.forEach(function (list) {
      var pth = '', open = false;
      list.forEach(function (p) {
        if (p.ne === null) { open = false; return; }
        pth += (open ? 'L' : 'M') + xs(Math.max(TMIN, p.a), x0, pw) + ' ' + ys(p.ne, base, ph) + 'L' + xs(Math.min(TMAX, p.b), x0, pw) + ' ' + ys(p.ne, base, ph);
        open = true;
      });
      el('path', { d: pth, style: 'fill:none;stroke:var(--accent);stroke-width:' + (est.length > 1 ? 1.2 : 2.2) + ';opacity:' + (est.length > 1 ? 0.7 : 1) }, svg);
    });
  }
  var histSeed = 1;
  function drawHist() {
    var box = $('b-hist'), shares = [];
    box.textContent = '';
    HIST.forEach(function (h, hi) {
      var r = rng(histSeed * 6007 + hi * 17), Ts = [], i, inb = 0, T, b, NBIN = 24, bins = [];
      for (i = 0; i < 3000; i++) { T = drawT(r, h[1]); Ts.push(T); if (T >= 2000 && T < 20000) inb++; }
      for (b = 0; b < NBIN; b++) bins.push(0);
      Ts.forEach(function (t) { bins[Math.min(NBIN - 1, Math.floor(NBIN * Math.log(Math.max(TMIN, t) / TMIN) / Math.log(TMAX / TMIN)))]++; });
      var cell = div(box, 'b-cell'), bx = div(cell, 'svgbox'), bx2 = div(cell, 'svgbox');
      div(cell, 'b-cap').innerHTML = '<b>' + h[0] + '</b>: ' + Math.round(100 * inb / 3000) + ' % of the stretches have their ancestor 2,000 to 20,000 generations back.';
      var x0 = 50, pw = 272, top = Math.max.apply(null, bins), bw = pw / NBIN;
      var svg = svgIn(bx, 330, 124, h[0] + ': how many stretches have their common ancestor at each time');
      el('rect', { x: xs(2000, x0, pw), y: 18, width: xs(20000, x0, pw) - xs(2000, x0, pw), height: 72, style: 'fill:var(--muted);opacity:.14' }, svg);
      bins.forEach(function (c, k) { var hh = 72 * c / top; el('rect', { x: x0 + k * bw + 0.5, y: 90 - hh, width: bw - 1, height: hh, style: 'fill:var(--rep)' }, svg); });
      xaxis(svg, x0, pw, 90);
      el('text', { x: 2, y: 12, style: 'font-size:10px;fill:var(--muted)' }, svg, 'stretches per time bin');
      el('text', { x: x0 + pw / 2, y: 120, 'text-anchor': 'middle', style: 'font-size:10px;fill:var(--muted)' }, svg, 'generations before today');
      var svg2 = svgIn(bx2, 330, 100, h[0] + ': true size and size read back from the stretches');
      el('rect', { x: xs(2000, x0, pw), y: 14, width: xs(20000, x0, pw) - xs(2000, x0, pw), height: 76, style: 'fill:var(--muted);opacity:.14' }, svg2);
      curve(svg2, x0, pw, 90, 76, h[1], [estimate(Ts)]);
      el('line', { x1: x0, y1: 90, x2: x0 + pw, y2: 90, style: 'stroke:var(--fg)' }, svg2);
      el('text', { x: 2, y: 8, style: 'font-size:10px;fill:var(--muted)' }, svg2, 'size in animals');
      shares.push(Math.round(100 * inb / 3000));
    });
    $('b-histmsg').textContent = 'Between 2,000 and 20,000 generations back, ' + shares[0] + ' % of the stretches meet with constant size, ' + shares[1] + ' % in the bottleneck and ' + shares[2] + ' % in the growing population.';
  }
  $('b-histnew').addEventListener('click', function () { histSeed++; drawHist(); });
  drawHist();

  var cntSeed = 1;
  function drawCount() {
    var box = $('b-count'), ne = HIST[1][1], N = [100, 1000, 10000], rows = [];
    box.textContent = '';
    N.forEach(function (n, ni) {
      var r = rng(cntSeed * 4243 + ni * 13), est = [], a, i, err = 0, cnt = 0, gaps = 0, tot = 0, rec = 0;
      for (a = 0; a < 6; a++) {
        var Ts = [], e = null;
        for (i = 0; i < n; i++) Ts.push(drawT(r, ne));
        e = estimate(Ts);
        est.push(e);
        rec += e[0].ev + e[1].ev + e[2].ev;                      // periods 0 to 2,000 generations
        e.forEach(function (p) {
          tot++;
          if (p.ne === null) { gaps++; return; }
          err += Math.abs(Math.log(p.ne / truth(ne, p.a))); cnt++;
        });
      }
      var cell = div(box, 'b-cell'), bx = div(cell, 'svgbox'), er = Math.exp(err / cnt);
      var svg = svgIn(bx, 330, 128, fmt(n) + ' stretches per animal: true size and sizes read back for six animals');
      el('text', { x: 2, y: 10, style: 'font-size:12px;fill:var(--fg);font-weight:600' }, svg, fmt(n) + ' stretches per animal');
      curve(svg, 50, 272, 106, 84, ne, est);
      xaxis(svg, 50, 272, 106);
      div(cell, 'b-cap').innerHTML = 'Error <b>×' + er.toFixed(2) + '</b>; ' + gaps + ' of ' + tot + ' period readings empty; stretches meeting in the first 2,000 generations: <b>' + (rec / 6).toFixed(0) + '</b> per animal.';
      rows.push({ er: er, rec: rec / 6 });
    });
    $('b-countmsg').textContent = 'Typical error: ×' + rows[0].er.toFixed(2) + ' with 100 stretches, ×' + rows[1].er.toFixed(2) + ' with 1,000 and ×' + rows[2].er.toFixed(2) + ' with 10,000.';
  }
  $('b-countnew').addEventListener('click', function () { cntSeed++; drawCount(); });
  drawCount();
})();
