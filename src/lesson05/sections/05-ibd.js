(function(){
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function(id){ return document.getElementById(id); };
  if (!$('s05-strip')) return;
  var G = 400, GENOME = 3000;               // generations summed over; toy genome length in cM

  function rng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pois(r, m){
    if (m <= 0) return 0;
    if (m < 30){ var L = Math.exp(-m), k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }
    var u1 = r() || 1e-12, u2 = r(), z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.round(m + Math.sqrt(m) * z));
  }
  function fmt(x){ return x >= 100 ? Math.round(x).toLocaleString('en-US') : x >= 10 ? x.toFixed(1) : x >= 0.1 ? x.toFixed(2) : x.toPrecision(2); }
  function el(tag, attrs, parent){ var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function txt(parent, x, y, s, anchor, size, fill){
    var t = el('text', { x: x, y: y, 'text-anchor': anchor || 'start', 'font-size': size || 11, fill: fill || 'var(--muted)' }, parent);
    t.textContent = s; return t;
  }
  function seg(id, cb){
    var box = $(id), bs = box.querySelectorAll('button');
    bs.forEach(function(b){ b.addEventListener('click', function(){
      bs.forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      cb(b.getAttribute('data-v'));
    }); });
  }

  // ---- theory: probability that two haplotypes have their common ancestor g generations back ----
  // P(g) = 1/(2N_g) * prod_{g'<g} (1 - 1/(2N_g'))   (Browning and Browning 2015)
  function pOfG(Nfun){
    var p = new Float64Array(G + 1), surv = 1;
    for (var g = 1; g <= G; g++){ var q = 1 / (2 * Nfun(g)); p[g] = surv * q; surv *= 1 - q; }
    return p;
  }
  // expected number of segments with length in [a,b) cM per pair: L * sum_g p_g r_g (e^{-r_g a} - e^{-r_g b}), r_g = g/50 per cM
  function binCount(p, a, b){
    var s = 0;
    for (var g = 1; g <= G; g++){ if (!p[g]) continue; var r = g / 50; s += p[g] * r * (Math.exp(-r * a) - (isFinite(b) ? Math.exp(-r * b) : 0)); }
    return GENOME * s;
  }
  function constN(N){ return function(){ return N; }; }
  function scenario(kind, N){
    if (kind === 'grow') return pOfG(function(g){ return g <= 20 ? N * 10 : N; });
    if (kind === 'bott') return pOfG(function(g){ return g > 10 && g <= 30 ? N / 10 : N; });
    if (kind === 'mix'){
      var a = pOfG(constN(N / 2)), b = new Float64Array(G + 1), q = 1 / (2 * N), surv = 1;
      for (var g = 51; g <= G; g++){ b[g] = surv * q; surv *= 1 - q; }   // between-group pairs: no ancestor within 50 generations
      var m = new Float64Array(G + 1);
      for (g = 1; g <= G; g++) m[g] = 0.5 * a[g] + 0.5 * b[g];
      return m;
    }
    return pOfG(constN(N));
  }

  // ---- explicit meiosis simulation (control for section 1) ----
  function breaks(r, g, len){
    var pts = [];
    var n = pois(r, 2 * g * len / 100);
    for (var i = 0; i < n; i++) pts.push(r() * len);
    pts.sort(function(a, b){ return a - b; });
    return pts;
  }
  function segsFrom(pts, len){
    var out = [], prev = 0;
    for (var i = 0; i < pts.length; i++){ out.push([prev, pts[i]]); prev = pts[i]; }
    out.push([prev, len]); return out;
  }
  function bigSim(g, seed){
    var r = rng(seed), len = 5e6 / g, s = segsFrom(breaks(r, g, len), len), sum = 0, sum2 = 0, n = s.length - 2;
    for (var i = 1; i < s.length - 1; i++){ var l = s[i][1] - s[i][0]; sum += l; sum2 += l * l; }
    return { mean: sum / n, cover: sum2 / sum, n: n };
  }

  // ---- A: strip ----
  var gIn = $('s05-g'), seedA = 7;
  function drawA(){
    var g = +gIn.value; $('s05-g-o').textContent = g;
    var r = rng(seedA), s = segsFrom(breaks(r, g, 100), 100);
    var W = 640, H = 96, ox = 20, w = W - 40, box = $('s05-strip'); box.innerHTML = '';
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img',
      'aria-label': 'A 100 cM chromosome cut into ' + s.length + ' IBD segments' }, box);
    svg.style.minWidth = '560px'; svg.style.maxWidth = 'none';
    s.forEach(function(x, i){
      var x0 = ox + x[0] / 100 * w, x1 = ox + x[1] / 100 * w;
      el('rect', { x: x0, y: 14, width: Math.max(0.6, x1 - x0 - 1), height: 30, fill: i % 2 ? 'var(--het)' : 'var(--accent)', opacity: .85 }, svg);
      if (x1 - x0 > 30) txt(svg, (x0 + x1) / 2, 33, (x[1] - x[0]).toFixed(1), 'middle', 10.5, 'var(--fg)');
    });
    for (var t = 0; t <= 100; t += 10){
      el('line', { x1: ox + t / 100 * w, x2: ox + t / 100 * w, y1: 50, y2: 55, stroke: 'var(--muted)' }, svg);
      txt(svg, ox + t / 100 * w, 68, t, 'middle', 10.5);
    }
    txt(svg, W / 2, 88, 'position on the chromosome, cM (numbers in blocks: segment length, cM)', 'middle', 11);
    var lens = s.map(function(x){ return x[1] - x[0]; }), mean = 100 / s.length;
    var big = bigSim(g, 1000 + g);
    $('s05-a-out').innerHTML =
      '<div>Segments in this draw<b>' + s.length + '</b></div>' +
      '<div>Mean in this draw<b>' + mean.toFixed(2) + ' cM</b></div>' +
      '<div>Formula 100/(2g)<b>' + (50 / g).toFixed(2) + ' cM</b></div>' +
      '<div>Simulated mean, about 100,000 segments<b>' + big.mean.toFixed(2) + ' cM</b></div>' +
      '<div>Segment covering a random position, same simulation<b>' + big.cover.toFixed(2) + ' cM (about 100/g = ' + (100 / g).toFixed(2) + ')</b></div>';
  }
  gIn.addEventListener('input', drawA);
  $('s05-again').addEventListener('click', function(){ seedA = seedA * 31 + 11; drawA(); });

  // ---- shared log-y bar/line chart ----
  function logChart(box, bins, obs, model, label, ymin, ymax){
    box.innerHTML = '';
    var W = 640, H = 270, ox = 52, oy = 14, w = W - ox - 14, h = H - oy - 52;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': label }, box);
    svg.style.minWidth = '560px'; svg.style.maxWidth = 'none';
    var lo = Math.log10(ymin), hi = Math.log10(ymax);
    var Y = function(v){ return oy + h - (Math.log10(Math.max(v, ymin)) - lo) / (hi - lo) * h; };
    for (var d = Math.ceil(lo); d <= hi; d++){
      el('line', { x1: ox, x2: ox + w, y1: Y(Math.pow(10, d)), y2: Y(Math.pow(10, d)), stroke: 'var(--line)' }, svg);
      txt(svg, ox - 6, Y(Math.pow(10, d)) + 4, '10^' + d, 'end', 10.5);
    }
    var bw = w / bins.length;
    bins.forEach(function(b, i){
      var x = ox + i * bw;
      if (obs && obs[i] > ymin) el('rect', { x: x + 2, y: Y(obs[i]), width: bw - 4, height: oy + h - Y(obs[i]), fill: 'var(--accent)', opacity: .75 }, svg);
      txt(svg, x + bw / 2, oy + h + 15, b[2], 'middle', 10.5);
    });
    if (model){
      var pts = model.map(function(v, i){ return (ox + (i + .5) * bw) + ',' + Y(v); }).join(' ');
      el('polyline', { points: pts, fill: 'none', stroke: 'var(--bad)', 'stroke-width': 2 }, svg);
      model.forEach(function(v, i){ el('circle', { cx: ox + (i + .5) * bw, cy: Y(v), r: 3, fill: 'var(--bad)' }, svg); });
    }
    txt(svg, ox + w / 2, H - 8, 'segment length, cM', 'middle', 11);
    var t = txt(svg, 12, oy + h / 2, label.split('|')[1] || '', 'middle', 11);
    t.setAttribute('transform', 'rotate(-90 12 ' + (oy + h / 2) + ')');
  }

  // ---- B: histogram for constant Ne ----
  var neIn = $('s05-ne'), thr = 2;
  function bBins(c){ var b = []; for (var a = c; a < 30; a++) b.push([a, a + 1, a]); return b; }
  function drawB(){
    var N = Math.round(Math.pow(10, +neIn.value)); $('s05-ne-o').textContent = N.toLocaleString('en-US');
    var p = pOfG(constN(N)), bins = bBins(thr);
    var vals = bins.map(function(b){ return binCount(p, b[0], b[1]); });
    logChart($('s05-hist'), bins, vals, null, 'Expected segments per pair of haplotypes, 1-cM bins|segments per pair per bin', 1e-6, 100);
    var tot = binCount(p, thr, Infinity), wsum = 0, gsum = 0, ex = 0;
    for (var g = 1; g <= G; g++){ var r = g / 50, w = p[g] * r * Math.exp(-r * thr); wsum += w; gsum += w * g; ex += w * 50 / g; }
    var gm = gsum / wsum;
    $('s05-b-out').innerHTML =
      '<div>Segments ≥ ' + thr + ' cM per haplotype pair<b>' + fmt(tot) + '</b></div>' +
      '<div>Pairs needed to see one such segment<b>' + (tot >= 1 ? 'not applicable (more than one per pair)' : tot > 0 ? fmt(1 / tot) : 'many') + '</b></div>' +
      '<div>Mean length of those segments<b>' + (thr + ex / wsum).toFixed(2) + ' cM</b></div>' +
      '<div>Their mean ancestor age<b>' + Math.round(gm) + ' generations</b></div>';
  }
  neIn.addEventListener('input', drawB);
  seg('s05-thr', function(v){ thr = +v; drawB(); });

  // ---- C: fit constant Ne to another history ----
  var NPAIRS = 20000, CB = []; for (var a = 2; a < 12; a++) CB.push([a, a + 1, a]); CB.push([12, Infinity, '12+']);
  var sc = 'const', seedC = 3, cIn = $('s05-c-ne');
  function expectedC(p){ return CB.map(function(b){ return NPAIRS * binCount(p, b[0], b[1]); }); }
  function observe(p, seed){ var r = rng(seed); return expectedC(p).map(function(e){ return pois(r, e); }); }
  function fitConst(obs){
    var best = null;
    for (var lg = 1; lg <= 5.001; lg += 0.02){
      var e = expectedC(pOfG(constN(Math.pow(10, lg)))), chi = 0;
      for (var i = 0; i < e.length; i++) if (e[i] > 0) chi += Math.pow(obs[i] - e[i], 2) / e[i];
      if (!best || chi < best.chi) best = { N: Math.pow(10, lg), chi: chi, exp: e };
    }
    return best;
  }
  function drawC(){
    var Nt = Math.round(Math.pow(10, +cIn.value)); $('s05-c-ne-o').textContent = Nt.toLocaleString('en-US');
    var obs = observe(scenario(sc, Nt), seedC), f = fitConst(obs), df = CB.length - 1;
    var per = per_(f.chi, df);
    var ob = obs.map(function(v){ return v / NPAIRS; }), md = f.exp.map(function(v){ return v / NPAIRS; });
    logChart($('s05-fit'), CB, ob, md, 'Observed (bars) and best constant-Ne model (red line), segments per pair per bin|segments per pair per bin', 1e-4, 10);
    var sumO = obs.reduce(function(s, v){ return s + v; }, 0) / NPAIRS, sumM = f.exp.reduce(function(s, v){ return s + v; }, 0) / NPAIRS;
    var verdict = per < 2 ? 'acceptable' : per < 5 ? 'doubtful' : 'rejected';
    $('s05-c-out').innerHTML =
      '<div>Best constant Ne<b>' + Math.round(f.N).toLocaleString('en-US') + '</b></div>' +
      '<div>True Ne (older generations)<b>' + Nt.toLocaleString('en-US') + '</b></div>' +
      '<div>Pearson χ² per bar<b>' + per.toFixed(1) + ' (' + verdict + ')</b></div>' +
      '<div>Segments ≥ 2 cM per pair, observed / model<b>' + sumO.toFixed(2) + ' / ' + sumM.toFixed(2) + '</b></div>';
    return { N: f.N, per: per, Nt: Nt };
  }
  function per_(chi, df){ return chi / df; }
  cIn.addEventListener('input', drawC);
  $('s05-c-new').addEventListener('click', function(){ seedC = seedC * 17 + 5; drawC(); });
  seg('s05-sc', function(v){ sc = v; drawC(); });

  // ---- code controls, computed on load ----
  function controls(){
    var gs = [2, 5, 10, 20, 50, 100], ok = 0, worst = 0;
    gs.forEach(function(g){
      var s = bigSim(g, 77 + g), e = Math.abs(s.mean / (50 / g) - 1), e2 = Math.abs(s.cover / (100 / g) - 1);
      worst = Math.max(worst, e, e2); if (e < 0.03 && e2 < 0.05) ok++;
    });
    $('s05-ctl-a').innerHTML = '<b>Code control.</b> Explicit crossover simulation against the formulas, for g = ' + gs.join(', ') +
      ': simulated mean length = 100/(2g) and segment-covering-a-position mean = 100/g. Passed ' + ok + ' of ' + gs.length + ', largest deviation ' + (worst * 100).toFixed(1) + ' %.';
    // B: ingredients of the sum
    var p = pOfG(constN(1000)), s1 = 0; for (var g = 1; g <= G; g++) s1 += p[g];
    var okB = 0, tests = 0, c = 2;
    [5, 20, 50].forEach(function(g2){
      var r = rng(500 + g2), n = 0, T = 400, len = 3000;
      for (var k = 0; k < T; k++){ var ss = segsFrom(breaks(r, g2, len), len); ss.forEach(function(x){ if (x[1] - x[0] >= c) n++; }); }
      var sim = n / T, th = len * (g2 / 50) * Math.exp(-(g2 / 50) * c); tests++; if (Math.abs(sim / th - 1) < 0.05) okB++;
    });
    var d = 0, dx = 0.02; for (var l = 2; l < 200; l += dx){ var dens = 0; for (var g3 = 1; g3 <= G; g3 += 1) dens += p[g3] * Math.pow(g3 / 50, 2) * Math.exp(-g3 / 50 * l); d += GENOME * dens * dx; }
    var closed = binCount(p, 2, Infinity);
    $('s05-ctl-b').innerHTML = '<b>Code control.</b> (1) The probabilities of the ancestor age add to ' + s1.toFixed(4) + ', and 1 - (1 - 1/2Ne)^' + G + ' = ' + (1 - Math.pow(1 - 1 / 2000, G)).toFixed(4) + ' is the chance of a common ancestor within ' + G + ' generations (they should match). (2) Counting segments ≥ 2 cM in explicit crossover simulations (g = 5, 20, 50) matches the per-generation term used above in ' + okB + ' of ' + tests +
      ' cases. (3) Numerical integration of the length density (' + fmt(d) + ') matches the closed-form sum used for the bars (' + fmt(closed) + ') for Ne = 1,000. This tests the arithmetic of the toy, not whether the model describes real animals.';
    // C: recovery
    var good = 0, N = 20, mis = 0, nn = 0;
    for (var i = 0; i < N; i++){
      var o = observe(scenario('const', 1000), 900 + i), f = fitConst(o);
      if (Math.abs(f.N / 1000 - 1) < 0.1 && f.chi / (CB.length - 1) < 2.5) good++;
    }
    ['grow', 'bott', 'mix'].forEach(function(k){
      var o = observe(scenario(k, 1000), 950), f = fitConst(o); nn++; if (f.chi / (CB.length - 1) > 5) mis++;
    });
    $('s05-ctl-c').innerHTML = '<b>Code control.</b> A steady history with Ne = 1,000 was recovered to within 10 % with χ² per bar below 2.5 in ' + good + ' of ' + N +
      ' noise draws. The three non-steady histories (Ne = 1,000, one draw each) were rejected (χ² per bar above 5) in ' + mis + ' of ' + nn + '.';
  }

  drawA(); drawB(); drawC(); setTimeout(controls, 30);
})();
