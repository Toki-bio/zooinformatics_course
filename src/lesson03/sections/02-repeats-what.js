(function () {
  /* s02: toy genome where TE copies insert over time and diverge from their consensus.
     Divergence counting follows RepeatMasker 4.2.6 SearchResult.pm::calcKimuraDivergence:
     K2P on well-characterised aligned bases; with divCpGMod, at a CpG of the consensus two transitions
     count as one and a single transition as 1/10; transversions count normally. */
  var $ = function (id) { return document.getElementById(id); };
  var svgA = $('s02-act'), svgG = $('s02-genome'), svgL = $('s02-land');
  if (!svgA || !svgG || !svgL) return;

  var RATE = 0.0022;          // substitutions per site per My (2.2e-9 per year, Zoonomia mammal-wide rate)
  var CPG_X = 10;             // toy: CpG transitions 10x faster
  var TMAX = 100;             // My of history
  var GENOME = 2e6;           // toy genome size, bp
  var BASES = 'ACGT';
  var TS = { 0: 2, 2: 0, 1: 3, 3: 1 }; // transition partner: A<->G, C<->T

  var FAM = [
    { name: 'SINE-like', len: 300, col: '--het' },
    { name: 'LINE-like', len: 900, col: '--accent' },
    { name: 'DNA transposon', len: 400, col: '--good' }
  ];
  // activity profiles (copies per My) as functions of time "My ago"
  function gauss(t, mu, sd) { return Math.exp(-(t - mu) * (t - mu) / (2 * sd * sd)); }
  var PRESETS = {
    burst: { n: [380, 170, 130], f: [
      function (t) { return gauss(t, 14, 3.5) + 0.02; },
      function (t) { return gauss(t, 50, 6) + 0.08; },
      function (t) { return t > 70 ? gauss(t, 80, 4) : 0; } ] },
    steady: { n: [380, 170, 130], f: [
      function () { return 1; }, function () { return 1; }, function () { return 1; } ] },
    old: { n: [0, 300, 0], f: [
      function () { return 0; }, function (t) { return gauss(t, 60, 4); }, function () { return 0; } ] }
  };

  function rng(seed) { // mulberry32
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // consensus sequences (GC ~ 42 %), fixed
  var r0 = rng(7);
  FAM.forEach(function (f) {
    var s = new Uint8Array(f.len);
    for (var i = 0; i < f.len; i++) { var u = r0(); s[i] = u < 0.29 ? 0 : u < 0.5 ? 1 : u < 0.71 ? 2 : 3; }
    f.cons = s;
    var cpg = 0; for (i = 1; i < f.len; i++) if (s[i - 1] === 1 && s[i] === 2) cpg++;
    f.ncpg = cpg;
  });

  function sampleTimes(fn, n, R) {
    var step = 0.25, grid = [], cum = [], tot = 0;
    for (var t = step / 2; t < TMAX; t += step) { grid.push(t); tot += fn(t); cum.push(tot); }
    var out = [];
    if (tot <= 0) return out;
    for (var k = 0; k < n; k++) {
      var u = R() * tot, lo = 0, hi = cum.length - 1;
      while (lo < hi) { var m = (lo + hi) >> 1; if (cum[m] < u) lo = m + 1; else hi = m; }
      out.push(grid[lo] + (R() - 0.5) * step);
    }
    return out;
  }

  // simulate one copy forward from insertion (age 0) to "today" (age = tIns); record accepted events
  function simulateCopy(f, tIns, R) {
    var L = f.len, seq = f.cons.slice(), ev = [];
    var base = RATE;                    // per site per My, all mutation types
    var maxRate = base + RATE * (2 / 3) * (CPG_X - 1); // CpG C/G sites: extra transitions
    var lambda = L * maxRate, age = 0;
    while (true) {
      age += -Math.log(1 - R()) / lambda;
      if (age > tIns) break;
      var i = Math.floor(R() * L), b = seq[i];
      var inCpG = (b === 1 && i + 1 < L && seq[i + 1] === 2) || (b === 2 && i > 0 && seq[i - 1] === 1);
      var rate = inCpG ? maxRate : base;
      if (R() * maxRate > rate) continue;   // thinning
      var nb;
      var pTs = inCpG ? (RATE * (2 / 3) * CPG_X) / rate : 2 / 3;
      if (R() < pTs) nb = TS[b];
      else { nb = (TS[b] + 1 + Math.floor(R() * 2) * 2) % 4; if (nb === b || nb === TS[b]) nb = (b + 1) % 4; }
      seq[i] = nb; ev.push(age, i, nb);
    }
    return ev;
  }

  var copies = [], built = {};
  function build(p) {
    if (built[p]) return built[p];
    var R = rng(p === 'burst' ? 11 : p === 'steady' ? 23 : 37), list = [], P = PRESETS[p];
    FAM.forEach(function (f, fi) {
      sampleTimes(P.f[fi], P.n[fi], R).forEach(function (t) {
        list.push({ fam: fi, tIns: t, pos: Math.floor(R() * (GENOME - f.len)), ev: simulateCopy(f, t, R) });
      });
    });
    built[p] = list;
    return list;
  }

  // divergence of one copy at age a (My) with the RepeatMasker counting rules
  var work = new Uint8Array(1000);
  function diverge(c, a) {
    var f = FAM[c.fam], L = f.len, s = f.cons, i;
    for (i = 0; i < L; i++) work[i] = s[i];
    var ev = c.ev;
    for (var k = 0; k < ev.length; k += 3) { if (ev[k] > a) break; work[ev[k + 1]] = ev[k + 2]; }
    var ti = 0, tv = 0, tiC = 0, prevTrans = 0, pS = -1;
    for (i = 0; i < L; i++) {
      var sb = s[i], qb = work[i], mt = qb === sb ? 0 : (TS[sb] === qb ? 1 : 2);
      if (mt === 1) ti++; else if (mt === 2) tv++;
      if (pS === 1 && sb === 2) {           // CpG site in the consensus
        if (mt === 1) prevTrans++; else if (mt === 2) { /* transversion counted below */ }
        if (prevTrans === 2) prevTrans = 1; else if (prevTrans === 1) prevTrans = 1 / 10;
      } else {
        tiC += prevTrans; prevTrans = 0;
        if (mt === 1) prevTrans = 1;
      }
      pS = sb;
    }
    tiC += prevTrans;
    function k2p(t, v) {
      var p = t / L, q = v / L, op = (1 - 2 * p - q) * Math.sqrt(1 - 2 * q);
      return op > 0 ? Math.abs(-0.5 * Math.log(op)) * 100 : 100;
    }
    return { raw: 100 * (ti + tv) / L, k2p: k2p(ti, tv), cpg: k2p(tiC, tv) };
  }

  var state = { p: 'burst', m: 'cpg', t: TMAX, fam: 0 };
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, at, txt) {
    var e = document.createElementNS(NS, tag);
    for (var k in at) e.setAttribute(k, at[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  function clear(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  function fmt(x, d) { return x.toLocaleString('en-US', { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 }); }
  var MLAB = { cpg: 'K2P + CpG rule', k2p: 'K2P, no CpG rule', raw: 'raw mismatches' };

  $('s02-leg').innerHTML = FAM.map(function (f) {
    return '<span><i style="background:var(' + f.col + ');height:10px;opacity:.85"></i>' + f.name + ' (' + f.len + ' bp)</span>';
  }).join('');

  function drawActivity(now) {
    clear(svgA);
    var x0 = 74, x1 = 740, y0 = 12, y1 = 92, P = PRESETS[state.p];
    var X = function (t) { return x0 + (TMAX - t) / TMAX * (x1 - x0); };
    svgA.appendChild(el('line', { x1: x0, y1: y1, x2: x1, y2: y1, 'class': 'ax' }));
    for (var t = 100; t >= 0; t -= 20) {
      if (Math.abs(t - now) < 5) continue;
      svgA.appendChild(el('text', { x: X(t), y: y1 + 14, 'text-anchor': 'middle' }, t === 0 ? 'today' : t));
    }
    svgA.appendChild(el('text', { x: x0, y: y0 - 2, 'class': 'lab' }, 'insertion activity (relative); x axis: million years ago'));
    FAM.forEach(function (f, fi) {
      if (!P.n[fi]) return;
      var mx = 0, pts = [];
      for (t = 0; t <= TMAX; t += 0.5) mx = Math.max(mx, P.f[fi](t));
      for (t = TMAX; t >= 0; t -= 0.5) pts.push(X(t).toFixed(1) + ',' + (y1 - (y1 - y0 - 6) * P.f[fi](t) / mx * (0.55 + 0.45 * P.n[fi] / 380)).toFixed(1));
      svgA.appendChild(el('polyline', { points: pts.join(' '), style: 'fill:none;stroke:var(' + f.col + ');stroke-width:2' }));
    });
    // future = greyed
    svgA.appendChild(el('rect', { x: X(now), y: y0, width: Math.max(0, x1 - X(now)), height: y1 - y0, style: 'fill:var(--panel);opacity:.75' }));
    svgA.appendChild(el('line', { x1: X(now), y1: y0 + 2, x2: X(now), y2: y1 + 17, style: 'stroke:var(--fg);stroke-width:1.5' }));
    svgA.appendChild(el('text', { x: X(now), y: y1 + 27, 'text-anchor': 'middle', 'class': 'lab' }, 'now'));
  }

  function render() {
    var now = TMAX - state.t;                 // My ago
    var list = build(state.p);
    var vis = [], perFam = FAM.map(function () { return { divs: [], ages: [], bp: 0 }; });
    list.forEach(function (c) {
      if (c.tIns < now) return;
      var a = c.tIns - now, d = diverge(c, a);
      var v = d[state.m];
      vis.push({ c: c, d: v, a: a });
      perFam[c.fam].divs.push(v); perFam[c.fam].ages.push(a); perFam[c.fam].bp += FAM[c.fam].len;
    });
    $('s02-tval').textContent = now < 0.5 ? 'today' : fmt(now) + ' My ago';
    drawActivity(now);

    // genome strip
    clear(svgG);
    var gx0 = 20, gx1 = 740, gy = 14, gh = 26;
    svgG.appendChild(el('rect', { x: gx0, y: gy, width: gx1 - gx0, height: gh, style: 'fill:var(--code-bg);stroke:var(--line)' }));
    vis.forEach(function (v) {
      var f = FAM[v.c.fam];
      var x = gx0 + v.c.pos / GENOME * (gx1 - gx0), w = Math.max(1.2, f.len / GENOME * (gx1 - gx0));
      var op = 1 - 0.78 * Math.min(1, v.d / 25);
      svgG.appendChild(el('rect', { x: x.toFixed(1), y: gy + 2, width: w.toFixed(2), height: gh - 4, style: 'fill:var(' + f.col + ');opacity:' + op.toFixed(2) }));
    });
    svgG.appendChild(el('text', { x: gx0, y: gy + gh + 14 }, '0'));
    svgG.appendChild(el('text', { x: gx1, y: gy + gh + 14, 'text-anchor': 'end' }, '2 Mb'));
    svgG.appendChild(el('text', { x: (gx0 + gx1) / 2, y: gy + gh + 14, 'text-anchor': 'middle' }, 'toy genome; faded = more diverged copy'));

    // landscape: stacked bars, 1 % bins, % of toy genome
    clear(svgL);
    var lx0 = 56, lx1 = 740, ly0 = 14, ly1 = 222, NB = 30;
    var bins = []; for (var b = 0; b < NB; b++) bins.push([0, 0, 0]);
    vis.forEach(function (v) { var k = Math.min(NB - 1, Math.floor(v.d)); bins[k][v.c.fam] += FAM[v.c.fam].len; });
    var ymax = 0; bins.forEach(function (bb) { ymax = Math.max(ymax, (bb[0] + bb[1] + bb[2]) / GENOME * 100); });
    var nice = [0.5, 1, 2, 3, 4, 5, 6, 8, 10], top = 0.5;
    for (var ni = 0; ni < nice.length; ni++) { if (ymax <= nice[ni]) { top = nice[ni]; break; } top = nice[ni]; }
    var X = function (d) { return lx0 + d / NB * (lx1 - lx0); }, Y = function (pc) { return ly1 - pc / top * (ly1 - ly0); };
    for (var g = 0; g <= 4; g++) {
      var val = top * g / 4;
      svgL.appendChild(el('line', { x1: lx0, y1: Y(val), x2: lx1, y2: Y(val), 'class': g ? 'grid' : 'ax' }));
      svgL.appendChild(el('text', { x: lx0 - 6, y: Y(val) + 4, 'text-anchor': 'end' }, fmt(val, top < 2 ? 2 : 1)));
    }
    svgL.appendChild(el('text', { x: 14, y: (ly0 + ly1) / 2, transform: 'rotate(-90 14 ' + (ly0 + ly1) / 2 + ')', 'text-anchor': 'middle' }, '% of toy genome'));
    for (var d = 0; d <= NB; d += 5) svgL.appendChild(el('text', { x: X(d), y: ly1 + 15, 'text-anchor': 'middle' }, d));
    svgL.appendChild(el('text', { x: (lx0 + lx1) / 2, y: ly1 + 32, 'text-anchor': 'middle', 'class': 'lab' }, 'divergence from consensus, % (' + MLAB[state.m] + ')'));
    var bw = (lx1 - lx0) / NB;
    bins.forEach(function (bb, k) {
      var acc = 0;
      [2, 1, 0].forEach(function (fi) {
        if (!bb[fi]) return;
        var pc = bb[fi] / GENOME * 100;
        svgL.appendChild(el('rect', { x: (X(k) + 1).toFixed(1), y: Y(acc + pc).toFixed(1), width: (bw - 2).toFixed(1), height: Math.max(0.5, Y(acc) - Y(acc + pc)).toFixed(1), style: 'fill:var(' + FAM[fi].col + ');opacity:.85' }));
        acc += pc;
      });
    });
    if (!vis.length) svgL.appendChild(el('text', { x: (lx0 + lx1) / 2, y: (ly0 + ly1) / 2, 'text-anchor': 'middle', 'class': 'lab' }, 'no copies yet: move the time slider to the right'));

    // readout
    function med(a) { if (!a.length) return NaN; var s = a.slice().sort(function (x, y) { return x - y; }); var m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
    var totBp = perFam.reduce(function (s, p) { return s + p.bp; }, 0);
    var html = '<div>now<b>' + (now < 0.5 ? 'today' : fmt(now) + ' My ago') + '</b></div>' +
      '<div>copies inserted so far<b>' + fmt(vis.length) + '</b></div>' +
      '<div>toy genome covered by TEs<b>' + fmt(100 * totBp / GENOME, 1) + ' %</b></div>';
    FAM.forEach(function (f, fi) {
      var p = perFam[fi];
      if (!p.divs.length) { html += '<div>' + f.name + '<b>no copies</b></div>'; return; }
      var md = med(p.divs), ma = med(p.ages);
      html += '<div><span class="tip" title="Median over this family\'s copies. Divergence uses the measure chosen above; the age estimate divides it by the toy rate (0.22 % per My); the true age is known in the toy.">' + f.name + '</span>: ' + fmt(p.divs.length) + ' copies' +
        '<b>median div. ' + fmt(md, 1) + ' %</b>age estimate ' + fmt(md / (RATE * 100)) + ' My · true median age ' + fmt(ma) + ' My</div>';
    });
    $('s02-out').innerHTML = html;

    drawAln(vis);
  }

  function drawAln(vis) {
    var fi = state.fam, f = FAM[fi], W = 60;
    var mine = vis.filter(function (v) { return v.c.fam === fi; }).sort(function (a, b) { return a.a - b.a; });
    var box = $('s02-aln');
    var cons = f.cons, line = 'consensus      ';
    for (var i = 0; i < W; i++) {
      var isC = (cons[i] === 1 && i + 1 < f.len && cons[i + 1] === 2) || (cons[i] === 2 && i > 0 && cons[i - 1] === 1);
      line += isC ? '<span class="a">' + BASES[cons[i]] + '</span>' : BASES[cons[i]];
    }
    var out = [line + '   <span class="c">first ' + W + ' of ' + f.len + ' bp; CpG underlined</span>'];
    if (!mine.length) { out.push('<span class="c">(no ' + f.name + ' copies at this time)</span>'); box.innerHTML = out.join('\n'); return; }
    var pick = [], n = Math.min(5, mine.length);
    for (var k = 0; k < n; k++) pick.push(mine[Math.round(k * (mine.length - 1) / Math.max(1, n - 1))]);
    pick.forEach(function (v) {
      var c = v.c, seq = cons.slice(0, f.len), ev = c.ev;
      for (var e = 0; e < ev.length; e += 3) { if (ev[e] > v.a) break; seq[ev[e + 1]] = ev[e + 2]; }
      var lbl = ('age ' + fmt(v.a, 1) + ' My').padEnd(15, ' '), s = '';
      for (var j = 0; j < W; j++) {
        if (seq[j] === cons[j]) s += '.';
        else s += '<span class="' + (TS[cons[j]] === seq[j] ? 'h' : 'x') + '">' + BASES[seq[j]] + '</span>';
      }
      out.push(lbl + s + '   <span class="c">' + fmt(v.d, 1) + ' %</span>');
    });
    out.push('<span class="c">dot = same as consensus; </span><span class="h">orange</span><span class="c"> = transition; </span><span class="x">red</span><span class="c"> = transversion; youngest to oldest copy</span>');
    box.innerHTML = out.join('\n');
  }

  function seg(id, key, attr) {
    var g = $(id); if (!g) return;
    g.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      Array.prototype.forEach.call(g.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var v = b.getAttribute(attr); state[key] = key === 'fam' ? +v : v;
      render();
    });
  }
  seg('s02-preset', 'p', 'data-p');
  seg('s02-metric', 'm', 'data-m');
  seg('s02-fam', 'fam', 'data-f');

  var slider = $('s02-t');
  slider.addEventListener('input', function () { stop(); state.t = +slider.value; render(); });

  var playing = null, playBtn = $('s02-play');
  function stop() { if (playing) { clearInterval(playing); playing = null; playBtn.textContent = 'Play'; } }
  playBtn.addEventListener('click', function () {
    if (playing) { stop(); return; }
    if (state.t >= TMAX) state.t = 0;
    playBtn.textContent = 'Pause';
    playing = setInterval(function () {
      state.t = Math.min(TMAX, state.t + 1); slider.value = state.t; render();
      if (state.t >= TMAX) stop();
    }, 70);
  });

  render();
})();
