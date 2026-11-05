(function(){
  var histBox = document.getElementById('s07-hist');
  if (!histBox) return;
  var NS = 'http://www.w3.org/2000/svg';
  var el = function(id){ return document.getElementById(id); };

  // ---------- random numbers (seeded, so the toy is the same on every visit) ----------
  function rng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(r){ var u = r() || 1e-12, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function gamma(r, a){ // Marsaglia & Tsang
    if (a < 1) return gamma(r, a + 1) * Math.pow(r() || 1e-12, 1 / a);
    var d = a - 1 / 3, c = 1 / Math.sqrt(9 * d), x, v, u;
    for (;;){
      do { x = gauss(r); v = 1 + c * x; } while (v <= 0);
      v = v * v * v; u = r();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  function beta(r, a, b){ var x = gamma(r, a), y = gamma(r, b); return x / (x + y); }
  function pois(r, m){
    if (m > 30) return Math.max(0, Math.round(m + Math.sqrt(m) * gauss(r)));
    var L = Math.exp(-m), k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1;
  }
  function svg(tag, attrs, parent){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs){
    var t = svg('text', attrs || {}, parent); t.setAttribute('x', x); t.setAttribute('y', y); t.textContent = s; return t;
  }
  function tip(term, expl){ return '<span class="tip" title="' + expl + '">' + term + '</span>'; }

  // ================= 1. QC dashboard =================
  var ctl = { k: el('s07-k'), n: el('s07-n'), m: el('s07-m'), t: el('s07-t'), s: el('s07-s'), d: el('s07-d'), c: el('s07-c') };
  var out = { k: el('s07-ko'), n: el('s07-no'), m: el('s07-mo'), t: el('s07-to'), s: el('s07-so'), d: el('s07-do'), c: el('s07-co') };
  var NCALL = 6000, NSITE = 3000, NB = 40;
  var presets = [
    { k: 22, n: 4,  m: 70, t: 0.75, s: 50, d: 1.5, c: 25 },
    { k: 3,  n: 25, m: 70, t: 0.75, s: 50, d: 1.5, c: 25 },
    { k: 22, n: 4,  m: 70, t: 0.75, s: 50, d: 1.5, c: 4 },
    { k: 22, n: 4,  m: 70, t: 0.75, s: 79, d: 12, c: 25 },
    { k: 8,  n: 8,  m: 70, t: 0.95, s: 50, d: 1.5, c: 25 }
  ];
  var calls = null, callKey = '';

  function makeCalls(k, noise, m){
    var key = k + '|' + noise + '|' + m;
    if (key === callKey) return calls;
    var r = rng(707), p = new Float64Array(NCALL), truth = new Uint8Array(NCALL);
    for (var i = 0; i < NCALL; i++){
      var meth = r() < m / 100 ? 1 : 0, g = r() < noise / 100;
      truth[i] = meth;
      // confident model: methylated calls pile up near 1, unmethylated near 0; guesswork is uniform
      p[i] = g ? r() : (meth ? beta(r, k, 1.6) : beta(r, 1.6, k));
    }
    calls = { p: p, truth: truth }; callKey = key;
    return calls;
  }
  function quantile(arr, q){
    var a = Array.prototype.slice.call(arr).sort(function(x, y){ return x - y; });
    return a[Math.min(a.length - 1, Math.floor(q * a.length))];
  }

  function light(level){ // 0 good, 1 caution, 2 bad
    var col = ['var(--good)', 'var(--het)', 'var(--bad)'][level], word = ['pass', 'caution', 'fail'][level];
    return '<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:' + col +
      ';vertical-align:-1px;margin-right:6px"></span><b>' + word + '</b>';
  }

  function drawHist(d, t, est){
    histBox.innerHTML = '';
    var W = 760, H = 262, L = 52, R = 14, T = 28, B = 46, pw = W - L - R, ph = H - T - B;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: 'min-width:520px;display:block',
      role: 'img', 'aria-label': 'Histogram of 5mC call probabilities with pass threshold' }, histBox);
    var bins = [];
    for (var b = 0; b < NB; b++) bins.push([0, 0, 0]);
    for (var i = 0; i < d.p.length; i++){
      var p = d.p[i], bi = Math.min(NB - 1, Math.floor(p * NB));
      var cls = p >= t ? 2 : (1 - p >= t ? 0 : 1);
      bins[bi][cls]++;
    }
    var mx = 1;
    bins.forEach(function(x){ mx = Math.max(mx, x[0] + x[1] + x[2]); });
    var sq = function(v){ return Math.sqrt(v / mx) * ph; };
    // axes and grid
    [0, 0.25, 0.5, 0.75, 1].forEach(function(f){
      var y = T + ph - f * ph;
      svg('line', { x1: L, x2: L + pw, y1: y, y2: y, stroke: 'var(--line)', 'stroke-width': 1 }, s);
      txt(s, L - 6, y + 4, String(Math.round(f * f * mx)), { 'text-anchor': 'end', 'font-size': 11, fill: 'var(--muted)' });
    });
    for (var x = 0; x <= 10; x += 2){
      var xx = L + x / 10 * pw;
      txt(s, xx, T + ph + 16, (x / 10).toFixed(1), { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted)' });
    }
    txt(s, L + pw / 2, H - 8, 'probability that the C is 5mC (0 = surely unmethylated, 1 = surely methylated)',
      { 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--fg)' });
    var yl = txt(s, 14, T + ph / 2, 'calls (square-root scale)', { 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--fg)' });
    yl.setAttribute('transform', 'rotate(-90 14 ' + (T + ph / 2) + ')');
    var bw = pw / NB, cols = ['var(--accent)', 'var(--err)', 'var(--bad)'];
    bins.forEach(function(x, bi){
      var tot = x[0] + x[1] + x[2], hTot = sq(tot), y = T + ph, acc = 0;
      for (var c = 0; c < 3; c++){
        if (!x[c]) continue;
        var h = hTot * x[c] / tot;
        var r = svg('rect', { x: L + bi * bw + 0.5, y: y - acc - h, width: Math.max(1, bw - 1), height: h, fill: cols[c] }, s);
        svg('title', {}, r).textContent = (bi / NB).toFixed(3) + '-' + ((bi + 1) / NB).toFixed(3) + ': ' + x[c] + ' calls ' +
          ['pass as unmethylated', 'fail the threshold', 'pass as 5mC'][c];
        acc += h;
      }
    });
    // thresholds: chosen (dashed fg) and modkit estimate (het)
    [[t, 'var(--fg)', '4 3', 'your threshold'], [est, 'var(--het)', '', "modkit's estimate"]].forEach(function(q, qi){
      [q[0], 1 - q[0]].forEach(function(v, vi){
        var xx = L + v * pw;
        svg('line', { x1: xx, x2: xx, y1: T, y2: T + ph, stroke: q[1], 'stroke-width': qi ? 3 : 1.5, 'stroke-dasharray': q[2], opacity: qi ? 0.8 : 1 }, s);
      });
    });
    txt(s, L + t * pw, T - 8, 'your threshold ' + t.toFixed(2), { 'text-anchor': t > 0.85 ? 'end' : 'middle', 'font-size': 11, fill: 'var(--fg)' });
    txt(s, L + (1 - t) * pw, T - 8, 1 - t < 0.15 ? '' : (1 - t).toFixed(2), { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--fg)' });
  }

  function update(){
    var v = {};
    for (var k in ctl) v[k] = +ctl[k].value;
    out.k.textContent = v.k.toFixed(1);
    out.n.textContent = v.n + ' %';
    out.m.textContent = v.m + ' %';
    out.t.textContent = v.t.toFixed(2);
    out.s.textContent = v.s + ' %';
    out.d.textContent = v.d.toFixed(1) + ' points';
    out.c.textContent = v.c + '×';
    var d = makeCalls(v.k, v.n, v.m);
    // confidence of the most likely class, as modkit uses it
    var conf = new Float64Array(NCALL), nPass = 0, nM = 0, nWrong = 0;
    for (var i = 0; i < NCALL; i++){
      var p = d.p[i]; conf[i] = Math.max(p, 1 - p);
      if (conf[i] >= v.t){ nPass++; var cm = p >= 0.5 ? 1 : 0; nM += cm; if (cm !== d.truth[i]) nWrong++; }
    }
    var est = quantile(conf, 0.1);
    drawHist(d, v.t, est);
    var failFrac = 1 - nPass / NCALL;
    var estMeth = nPass ? 100 * nM / nPass : NaN;
    // the truth among the sampled calls (close to the slider value)
    var tm = 0; for (i = 0; i < NCALL; i++) tm += d.truth[i]; tm = 100 * tm / NCALL;
    var err = isNaN(estMeth) ? 100 : Math.abs(estMeth - tm);
    // coverage: Poisson reads per CpG, each call passes with probability (1 - failFrac)
    var r = rng(4242), ge5 = 0, ge10 = 0;
    for (i = 0; i < NSITE; i++){
      var reads = pois(r, v.c), ok = 0;
      for (var j = 0; j < reads; j++) if (r() >= failFrac) ok++;
      if (ok >= 5) ge5++; if (ok >= 10) ge10++;
    }
    ge5 = 100 * ge5 / NSITE; ge10 = 100 * ge10 / NSITE;

    var rows = [], lv;
    lv = est >= 0.8 ? 0 : (est >= 0.65 ? 1 : 2);
    rows.push([lv, tip('Call confidence', 'How sure the model is about its calls, read from the probability histogram. Measured here as modkit&#39;s estimated pass threshold: the confidence below which the weakest 10 % of calls lie.'),
      'estimated threshold ' + est.toFixed(2),
      ['Most calls sit near 0 or 1: the model recognises this signal.',
       'A visible share of calls sits in the middle: check the model name and the read quality.',
       'Many calls are near 0.5: the model is guessing. Suspect the wrong model or another platform&#39;s signal.'][lv]]);
    lv = failFrac <= 0.15 ? 0 : (failFrac <= 0.35 ? 1 : 2);
    rows.push([lv, tip('Failed calls', 'Calls whose most likely class is below the pass threshold. Modkit counts them in the N_fail column and leaves them out of the percentage.'),
      (100 * failFrac).toFixed(0) + ' % of calls',
      ['Few calls are lost at this threshold (modkit&#39;s default drops about 10 % by design).',
       'More data are thrown away than the default would; the threshold may be stricter than this run supports.',
       'Most calls are thrown away: coverage collapses. Lower the threshold only if the histogram shows the model is reliable.'][lv]]);
    lv = err <= 3 ? 0 : (err <= 8 ? 1 : 2);
    rows.push([lv, tip('Bias against the truth', 'Difference between the measured and the true percentage of methylated calls. In real data you know the truth only in controls: amplified DNA (0 %), CpG islands of housekeeping genes (near 0 %), imprinting regions (50 % unphased).'),
      'measured ' + (isNaN(estMeth) ? '-' : estMeth.toFixed(1)) + ' % vs true ' + tm.toFixed(1) + ' %',
      ['The passing calls reproduce the truth.',
       'A few points off: guesswork calls pull the estimate towards 50 %.',
       'Far off: these percentages would mislead. A control sample would reveal it.'][lv]]);
    lv = ge10 >= 80 ? 0 : (ge5 >= 50 ? 1 : 2);
    rows.push([lv, tip('Coverage per CpG', 'Valid calls per CpG site (N_valid_cov in the bedMethyl), after failed calls are removed. A site with 3 valid calls can only show 0, 33, 67 or 100 %.'),
      Math.round(ge10) + ' % of CpGs ≥10×, ' + Math.round(ge5) + ' % ≥5×',
      ['Enough valid calls at most sites for per-site percentages.',
       'Many sites are thin: use a minimum of 5× or average over regions (section 05).',
       'Most sites have fewer than 5 valid calls: per-site values are noise. Average over regions or sequence more.'][lv]]);
    var off = Math.abs(v.s - 50);
    lv = off <= 10 ? 0 : (off <= 20 ? 1 : 2);
    rows.push([lv, tip('Strand balance (reads)', 'Share of reads at a CpG that come from the + strand. Nanopore reads come from either strand about equally often.'),
      v.s + ' % +, ' + (100 - v.s) + ' % −',
      ['Both strands are about equally represented.',
       'One strand is over-represented: look at the library and the mapping in this region.',
       'Strongly one-sided: a library, mapping or reference problem; the two strand rows are not comparable.'][lv]]);
    lv = v.d <= 3 ? 0 : (v.d <= 8 ? 1 : 2);
    rows.push([lv, tip('Strand agreement', 'Average difference in percent methylated between the + and the − row of the same CpG. CpG methylation is usually symmetric in vertebrates, so a systematic difference is a technical problem.'),
      v.d.toFixed(1) + ' points',
      ['The strands agree: sum them with --combine-strands.',
       'A small systematic difference: report strands separately before combining.',
       'The strands disagree systematically: suspect the model, not hemi-methylation.'][lv]]);

    var html = '<ul style="list-style:none;padding:0;margin:10px 0">';
    rows.forEach(function(x){ html += '<li style="border-top:1px solid var(--line);padding:6px 0">' + light(x[0]) + ' ' + x[1] +
      ': <span class="mono">' + x[2] + '</span><br><span style="color:var(--muted);font-size:13.5px">' + x[3] + '</span></li>'; });
    el('s07-rows').innerHTML = html + '</ul>';

    var worst = 0, bad = [], warn = [];
    rows.forEach(function(x){ worst = Math.max(worst, x[0]); var name = x[1].replace(/<[^>]+>/g, '');
      if (x[0] === 2) bad.push(name); if (x[0] === 1) warn.push(name); });
    var vEl = el('s07-verdict');
    if (worst === 0) vEl.innerHTML = light(0) + ' Verdict: this run passes every check. Interpret the percentages, and write the model name into the legend.';
    else if (worst === 1) vEl.innerHTML = light(1) + ' Verdict: usable with care. Look again at: ' + warn.join(', ') + '.';
    else vEl.innerHTML = light(2) + ' Verdict: do not interpret yet. Failing: ' + bad.join(', ') + (warn.length ? '; also check ' + warn.join(', ') : '') + '.';
  }

  for (var k in ctl) ctl[k].addEventListener('input', function(){ markPreset(-1); update(); });
  var pbtn = el('s07-presets').querySelectorAll('button');
  function markPreset(ix){ for (var i = 0; i < pbtn.length; i++) pbtn[i].setAttribute('aria-pressed', String(i === ix)); }
  for (var i = 0; i < pbtn.length; i++) pbtn[i].addEventListener('click', function(){
    var ix = +this.getAttribute('data-p'), p = presets[ix];
    for (var k in p) ctl[k].value = p[k];
    markPreset(ix); update();
  });
  el('s07-auto').addEventListener('click', function(){
    var d = makeCalls(+ctl.k.value, +ctl.n.value, +ctl.m.value), conf = new Float64Array(NCALL);
    for (var i = 0; i < NCALL; i++) conf[i] = Math.max(d.p[i], 1 - d.p[i]);
    var est = quantile(conf, 0.1);
    ctl.t.value = Math.max(+ctl.t.min, Math.min(+ctl.t.max, Math.round(est * 100) / 100));
    markPreset(-1); update();
  });
  update();

  // ================= 2. IGV mono-colour vs two-colour =================
  var igvBox = el('s07-igv');
  if (!igvBox) return;
  var mode = 1, NCPG = 10, NREAD = 6;
  // probabilities of 5mC per read and CpG: island edge, methylated on the left, unmethylated on the right,
  // with a few undecided calls in the middle
  var r2 = rng(97), probs = [], strands = [];
  for (var a = 0; a < NREAD; a++){
    strands.push(a % 2 === 0 ? '+' : '−');
    var row = [];
    for (var b = 0; b < NCPG; b++){
      var trueMeth = b < 4 ? 0.92 : (b < 6 ? 0.5 : 0.06);
      var pm;
      if (b >= 4 && b < 6 && r2() < 0.6) pm = 0.35 + 0.3 * r2();          // undecided
      else pm = r2() < trueMeth ? 0.8 + 0.19 * r2() : 0.01 + 0.19 * r2();
      row.push(pm);
    }
    probs.push(row);
  }
  function drawIgv(){
    var t = +el('s07-it').value;
    el('s07-ito').textContent = t.toFixed(2);
    igvBox.innerHTML = '';
    var W = 760, L = 70, T = 26, rh = 22, gap = 8, H = T + NREAD * (rh + gap) + 20, pw = W - L - 20;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: 'min-width:480px;display:block',
      role: 'img', 'aria-label': 'Six toy reads with CpGs coloured as in IGV' }, igvBox);
    var step = pw / NCPG;
    for (var b = 0; b < NCPG; b++) txt(s, L + (b + 0.5) * step, 16, 'CpG ' + (b + 1), { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted)' });
    var nRed = 0, nBlue = 0, nNoneLow = 0, nNoneMid = 0;
    for (var a = 0; a < NREAD; a++){
      var y = T + a * (rh + gap);
      txt(s, L - 8, y + rh / 2 + 4, 'read ' + (a + 1) + ' ' + strands[a], { 'text-anchor': 'end', 'font-size': 11, fill: 'var(--fg)' });
      svg('rect', { x: L, y: y, width: pw, height: rh, fill: strands[a] === '+' ? 'var(--err)' : 'var(--good)', opacity: strands[a] === '+' ? 0.45 : 0.3 }, s);
      for (b = 0; b < NCPG; b++){
        var p = probs[a][b], col = null, op = 1, what;
        if (p > t){ col = 'var(--bad)'; op = p; nRed++; what = 'coloured red: 5mC'; }
        else if (mode === 2 && 1 - p > t){ col = 'var(--accent)'; op = 1 - p; nBlue++; what = 'coloured blue: unmodified'; }
        else { if (1 - p > t) nNoneLow++; else nNoneMid++;
          what = 'not coloured'; }
        var cx = L + b * step + step * 0.3, cw = step * 0.4;
        var rr = svg('rect', { x: cx, y: y + 3, width: cw, height: rh - 6, fill: col || 'transparent',
          stroke: col ? 'none' : 'var(--line)', 'stroke-dasharray': col ? '' : '2 2', opacity: col ? Math.max(0.25, op) : 1 }, s);
        svg('title', {}, rr).textContent = 'read ' + (a + 1) + ', CpG ' + (b + 1) + ': P(5mC) = ' + p.toFixed(2) +
          ', P(unmodified) = ' + (1 - p).toFixed(2) + ' -> ' + what;
      }
    }
    var tot = NREAD * NCPG;
    var msg = mode === 1
      ? 'Mono-colour, threshold ' + t.toFixed(2) + ': ' + nRed + ' of ' + tot + ' CpG calls red. The other ' + (tot - nRed) +
        ' stay uncoloured, and you cannot tell which of them the model called unmethylated (' + nNoneLow +
        ') and which it could not decide (' + nNoneMid + ').'
      : 'Two-colour, threshold ' + t.toFixed(2) + ': ' + nRed + ' red, ' + nBlue + ' blue, ' + nNoneMid +
        ' uncoloured. Only the uncoloured ones are undecided calls, so the unmethylated side of the island edge and the uncertain middle look different.';
    if (nNoneMid === 0) msg += ' At 0.50 no call counts as undecided: even near coin-flips (hover CpG 5 and 6) fall on one side or the other. Raise the threshold to set them apart.';
    el('s07-igvsum').textContent = msg;
  }
  var mb = el('s07-mode').querySelectorAll('button');
  for (i = 0; i < mb.length; i++) mb[i].addEventListener('click', function(){
    mode = +this.getAttribute('data-m');
    for (var j = 0; j < mb.length; j++) mb[j].setAttribute('aria-pressed', String(mb[j] === this));
    drawIgv();
  });
  el('s07-it').addEventListener('input', drawIgv);
  drawIgv();
})();
