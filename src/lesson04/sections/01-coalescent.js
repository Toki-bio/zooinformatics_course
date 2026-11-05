(function(){
  var host = document.getElementById('s01-hist');
  if (!host) return;
  var NS = 'http://www.w3.org/2000/svg';
  var el = function(id){ return document.getElementById(id); };
  var LEN = 10e6;                    // chromosome length, bp
  var MU = 5e-9, R = 1e-8;           // toy rates per bp per generation
  var BOUND = [0, 2000, 20000, 200000, Infinity];
  var WIN = 50000, NWIN = LEN / WIN;
  var ZLEN = 200000;
  var PRESETS = {
    'const': [50000, 50000, 50000, 50000],
    'bott':  [50000, 3000, 50000, 50000],
    'exp':   [300000, 100000, 20000, 20000],
    'decl':  [5000, 20000, 100000, 200000],
    'old':   [100000, 100000, 5000, 100000]
  };
  var sl = [el('s01-n0'), el('s01-n1'), el('s01-n2'), el('s01-n3')];
  var seed = 20261031;
  var segStart, segLen, segT, nSeg, hets, nHet;

  function rng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pois(r, m){
    if (m <= 0) return 0;
    if (m < 30){ var Lm = Math.exp(-m), k = 0, p = 1; do { k++; p *= r(); } while (p > Lm); return k - 1; }
    var u1 = r() || 1e-12, u2 = r(); var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.round(m + Math.sqrt(m) * z));
  }
  var NV = [1000, 1500, 2000, 3000, 5000, 7000, 10000, 15000, 20000, 30000, 50000, 70000, 100000, 150000, 200000, 300000, 500000];
  function sizes(){ return sl.map(function(s){ return NV[+s.value]; }); }
  // cumulative coalescence hazard H(T) = sum over periods of (generations in period before T) / (2 Ne)
  function H(T, N){
    var h = 0;
    for (var i = 0; i < 4; i++){
      if (T <= BOUND[i]) break;
      h += (Math.min(T, BOUND[i + 1]) - BOUND[i]) / (2 * N[i]);
    }
    return h;
  }
  function rate(T, N){ for (var i = 0; i < 4; i++) if (T < BOUND[i + 1]) return 1 / (2 * N[i]); return 1 / (2 * N[3]); }
  function F(T, N){ return 1 - Math.exp(-H(T, N)); }

  // Distribution of the TMRCA of a piece that starts at a recombination: pi(T) ~ T * sigma(T)
  // (PSMC model notes). Pieces have mean length 1/(2 r T), so the share of the genome is sigma(T).
  var GN = 3000, LG0 = 0, LG1 = 8;
  function buildSampler(N){
    var cdf = new Float64Array(GN + 1), tot = 0;
    for (var i = 0; i <= GN; i++){
      var lt = LG0 + (LG1 - LG0) * i / GN, T = Math.pow(10, lt);
      var w = T * T * rate(T, N) * Math.exp(-H(T, N));      // density per unit of ln T
      if (i > 0) tot += w;
      cdf[i] = tot;
    }
    return function(u){
      var x = u * tot, lo = 0, hi = GN;
      while (hi - lo > 1){ var m = (lo + hi) >> 1; if (cdf[m] < x) lo = m; else hi = m; }
      var f = (x - cdf[lo]) / Math.max(1e-300, cdf[hi] - cdf[lo]);
      return Math.pow(10, LG0 + (LG1 - LG0) * (lo + f) / GN);
    };
  }

  function generate(){
    var N = sizes(), samp = buildSampler(N), r = rng(seed), hr = rng(seed + 11);
    var cap = 1 << 16;
    segStart = new Float64Array(cap); segLen = new Float64Array(cap); segT = new Float64Array(cap);
    var hcap = 1 << 15; hets = new Float64Array(hcap); nHet = 0; nSeg = 0;
    var pos = 0;
    while (pos < LEN){
      var T = samp(r());
      var L = -Math.log(1 - r()) / (2 * R * T);
      if (L < 1) L = 1;
      if (pos + L > LEN) L = LEN - pos;
      if (nSeg === cap){
        cap *= 2;
        var a = new Float64Array(cap); a.set(segStart); segStart = a;
        a = new Float64Array(cap); a.set(segLen); segLen = a;
        a = new Float64Array(cap); a.set(segT); segT = a;
      }
      segStart[nSeg] = pos; segLen[nSeg] = L; segT[nSeg] = T; nSeg++;
      var k = pois(hr, 2 * MU * T * L);
      for (var j = 0; j < k; j++){
        if (nHet === hcap){ hcap *= 2; var b = new Float64Array(hcap); b.set(hets); hets = b; }
        hets[nHet++] = pos + hr() * L;
      }
      pos += L;
    }
  }

  function css(v){ return 'var(' + v + ')'; }
  function mk(tag, attrs, txt){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  function fmtN(n){ return Math.round(n).toLocaleString('en-US'); }
  function fmtT(t){ return t >= 1e6 ? (t / 1e6).toFixed(t >= 1e7 ? 0 : 1) + 'M' : t >= 1000 ? Math.round(t / 1000) + 'k' : String(Math.round(t)); }
  function fmtBp(bp){ return bp >= 1e6 ? (bp / 1e6).toFixed(1) + ' Mb' : bp >= 1000 ? (bp / 1000).toFixed(bp >= 1e4 ? 0 : 1) + ' kb' : Math.round(bp) + ' bp'; }

  // --- figure 1: Ne history (top) and TMRCA histogram (bottom), shared log time axis
  var W = 960, X0 = 92, PW = 830, TX0 = 1, TX1 = 7;   // time axis 10 .. 10^7 generations
  function tx(T){ var l = Math.log10(Math.max(T, Math.pow(10, TX0))); return X0 + (Math.min(l, TX1) - TX0) / (TX1 - TX0) * PW; }
  var BPD = 4, NB = (TX1 - TX0) * BPD;              // histogram bins per decade

  function drawHist(N, shares){
    var svg = mk('svg', { viewBox: '0 0 ' + W + ' 380', width: '100%', role: 'img', 'aria-label': 'Population size history and the distribution of coalescence times along the toy chromosome' });
    svg.style.minWidth = '640px';
    // period bands
    for (var i = 0; i < 4; i++){
      var xa = tx(Math.max(BOUND[i], 10)), xb = tx(Math.min(BOUND[i + 1], 1e7));
      if (i % 2 === 1) svg.appendChild(mk('rect', { x: xa, y: 22, width: xb - xa, height: 312, fill: css('--panel') }));
    }
    // top panel: Ne
    var yA = 30, hA = 120, LN0 = 3, LN1 = 6;
    function ny(n){ return yA + hA - (Math.log10(n) - LN0) / (LN1 - LN0) * hA; }
    svg.appendChild(mk('text', { x: X0, y: 14, 'class': 'lab' }, 'Your history: effective population size Nₑ in each period'));
    [1e3, 1e4, 1e5, 1e6].forEach(function(n){
      svg.appendChild(mk('line', { x1: X0, x2: X0 + PW, y1: ny(n), y2: ny(n), 'class': 'grid' }));
      svg.appendChild(mk('text', { x: X0 - 8, y: ny(n) + 4, 'text-anchor': 'end' }, fmtT(n)));
    });
    svg.appendChild(mk('text', { x: 14, y: yA + hA / 2, transform: 'rotate(-90 14 ' + (yA + hA / 2) + ')', 'text-anchor': 'middle' }, 'Nₑ'));
    var d = '';
    for (i = 0; i < 4; i++){
      var x1 = tx(Math.max(BOUND[i], 10)), x2 = tx(Math.min(BOUND[i + 1], 1e7)), y = ny(N[i]);
      d += (i === 0 ? 'M' : 'L') + x1.toFixed(1) + ' ' + y.toFixed(1) + 'L' + x2.toFixed(1) + ' ' + y.toFixed(1);
    }
    svg.appendChild(mk('path', { d: d, fill: 'none', stroke: css('--accent'), 'stroke-width': 2.5 }));
    // bottom panel: histogram
    var yB = 196, hB = 120;
    svg.appendChild(mk('text', { x: X0, y: yB - 18, 'class': 'lab' }, 'Share of the chromosome whose two copies coalesce at each time (TMRCA)'));
    var obs = new Float64Array(NB), exp = new Float64Array(NB);
    for (var s = 0; s < nSeg; s++){
      var b = Math.floor((Math.log10(segT[s]) - TX0) * BPD);
      if (b < 0) b = 0; if (b >= NB) b = NB - 1;
      obs[b] += segLen[s] / LEN;
    }
    for (b = 0; b < NB; b++){
      var lo = b === 0 ? 0 : Math.pow(10, TX0 + b / BPD), hi = b === NB - 1 ? Infinity : Math.pow(10, TX0 + (b + 1) / BPD);
      exp[b] = (hi === Infinity ? 1 : F(hi, N)) - F(lo, N);
    }
    var mx = 0.05; for (b = 0; b < NB; b++) mx = Math.max(mx, obs[b], exp[b]);
    mx = Math.ceil(mx * 10) / 10;
    function hy(v){ return yB + hB - v / mx * hB; }
    [0, mx / 2, mx].forEach(function(v){
      svg.appendChild(mk('line', { x1: X0, x2: X0 + PW, y1: hy(v), y2: hy(v), 'class': v === 0 ? 'ax' : 'grid' }));
      svg.appendChild(mk('text', { x: X0 - 8, y: hy(v) + 4, 'text-anchor': 'end' }, Math.round(v * 100) + ' %'));
    });
    var dp = '';
    for (b = 0; b < NB; b++){
      var xb0 = X0 + b / NB * PW + 1, bw = PW / NB - 2, hh = obs[b] / mx * hB;
      if (hh > 0.3) dp += 'M' + xb0.toFixed(1) + ' ' + (yB + hB - hh).toFixed(1) + 'h' + bw.toFixed(1) + 'v' + hh.toFixed(1) + 'h' + (-bw).toFixed(1) + 'z';
    }
    if (dp) svg.appendChild(mk('path', { d: dp, fill: css('--het'), opacity: '0.8' }));
    var de = '';
    for (b = 0; b < NB; b++){
      var xc = X0 + (b + 0.5) / NB * PW;
      de += (b === 0 ? 'M' : 'L') + xc.toFixed(1) + ' ' + hy(exp[b]).toFixed(1);
    }
    svg.appendChild(mk('path', { d: de, fill: 'none', stroke: css('--fg'), 'stroke-width': 1.6, 'stroke-dasharray': '5 3' }));
    // time axis
    var yX = yB + hB;
    for (var e = TX0; e <= TX1; e++){
      var xx = tx(Math.pow(10, e));
      svg.appendChild(mk('line', { x1: xx, x2: xx, y1: yX, y2: yX + 5, 'class': 'ax' }));
      svg.appendChild(mk('text', { x: xx, y: yX + 19, 'text-anchor': e === TX0 ? 'start' : (e === TX1 ? 'end' : 'middle') }, fmtT(Math.pow(10, e))));
    }
    svg.appendChild(mk('text', { x: X0 + PW / 2, y: yX + 38, 'text-anchor': 'middle' }, 'generations before today (log scale)'));
    // shares per period
    for (i = 0; i < 4; i++){
      var xa2 = tx(Math.max(BOUND[i], 10)), xb2 = tx(Math.min(BOUND[i + 1], 1e7));
      svg.appendChild(mk('text', { x: (xa2 + xb2) / 2, y: yB - 2, 'text-anchor': 'middle', 'class': 'lab' }, Math.round(shares[i] * 100) + ' %'));
    }
    host.replaceChildren(svg);
  }

  // --- figure 2: whole chromosome (window heterozygosity) and a zoomed stretch (TMRCA + het sites)
  function drawChrom(){
    var zs = +el('s01-zoom').value * 1e6, ze = zs + ZLEN;
    var svg = mk('svg', { viewBox: '0 0 ' + W + ' 372', width: '100%', role: 'img', 'aria-label': 'Heterozygosity along the toy chromosome and the TMRCA mosaic in a zoomed stretch' });
    svg.style.minWidth = '640px';
    // window het per kb
    var cnt = new Float64Array(NWIN);
    for (var i = 0; i < nHet; i++){ var w = Math.floor(hets[i] / WIN); if (w >= 0 && w < NWIN) cnt[w]++; }
    var mx = 0; for (i = 0; i < NWIN; i++){ cnt[i] = cnt[i] / WIN * 1000; mx = Math.max(mx, cnt[i]); }
    mx = mx <= 0 ? 0.1 : (mx < 1 ? Math.ceil(mx * 10) / 10 : Math.ceil(mx));
    var y0 = 26, h0 = 100;
    svg.appendChild(mk('text', { x: X0, y: 14, 'class': 'lab' }, 'Whole 10-Mb chromosome: heterozygous sites per kb in 50-kb windows'));
    svg.appendChild(mk('line', { x1: X0, x2: X0 + PW, y1: y0 + h0, y2: y0 + h0, 'class': 'ax' }));
    svg.appendChild(mk('line', { x1: X0, x2: X0 + PW, y1: y0, y2: y0, 'class': 'grid' }));
    svg.appendChild(mk('text', { x: X0 - 8, y: y0 + 4, 'text-anchor': 'end' }, String(mx)));
    svg.appendChild(mk('text', { x: X0 - 8, y: y0 + h0, 'text-anchor': 'end' }, '0'));
    svg.appendChild(mk('text', { x: X0 - 8, y: y0 + h0 / 2 + 4, 'text-anchor': 'end' }, 'het/kb'));
    var d = '', bw = PW / NWIN;
    for (i = 0; i < NWIN; i++){
      var hh = Math.max(0.8, cnt[i] / mx * h0), x = X0 + i * bw;
      d += 'M' + x.toFixed(1) + ' ' + (y0 + h0 - hh).toFixed(1) + 'h' + (bw - 0.6).toFixed(2) + 'v' + hh.toFixed(1) + 'h' + (-(bw - 0.6)).toFixed(2) + 'z';
    }
    svg.appendChild(mk('path', { d: d, fill: css('--muted'), opacity: '0.7', 'shape-rendering': 'crispEdges' }));
    var zx0 = X0 + zs / LEN * PW, zx1 = X0 + ze / LEN * PW;
    svg.appendChild(mk('rect', { x: zx0, y: y0 - 2, width: Math.max(2, zx1 - zx0), height: h0 + 4, fill: 'none', stroke: css('--bad'), 'stroke-width': 1.5 }));
    var ya = y0 + h0;
    for (var mb = 0; mb <= 10; mb += 1){
      var xm = X0 + mb / 10 * PW;
      svg.appendChild(mk('line', { x1: xm, x2: xm, y1: ya, y2: ya + 4, 'class': 'ax' }));
      svg.appendChild(mk('text', { x: xm, y: ya + 16, 'text-anchor': mb === 0 ? 'start' : (mb === 10 ? 'end' : 'middle') }, mb + (mb === 10 ? ' Mb' : '')));
    }
    // connector
    var yz = 186, hz = 110;
    svg.appendChild(mk('path', { d: 'M' + zx0.toFixed(1) + ' ' + (ya + 20) + 'L' + X0 + ' ' + (yz - 22) + 'M' + zx1.toFixed(1) + ' ' + (ya + 20) + 'L' + (X0 + PW) + ' ' + (yz - 22), stroke: css('--bad'), 'stroke-width': 1, 'stroke-dasharray': '3 3', fill: 'none' }));
    svg.appendChild(mk('text', { x: X0, y: yz - 8, 'class': 'lab' }, 'Zoom, ' + (zs / 1e6).toFixed(1) + '–' + (ze / 1e6).toFixed(1) + ' Mb: TMRCA of each piece (line) and heterozygous sites (ticks)'));
    // log T axis for zoom
    var L0 = 2, L1 = 7;
    function zy(T){ var l = Math.log10(Math.max(T, 100)); return yz + hz - (Math.min(l, L1) - L0) / (L1 - L0) * hz; }
    function zxp(p){ return X0 + (p - zs) / ZLEN * PW; }
    [100, 1e3, 1e4, 1e5, 1e6, 1e7].forEach(function(T){
      svg.appendChild(mk('line', { x1: X0, x2: X0 + PW, y1: zy(T), y2: zy(T), 'class': 'grid' }));
      svg.appendChild(mk('text', { x: X0 - 8, y: zy(T) + 4, 'text-anchor': 'end' }, fmtT(T)));
    });
    svg.appendChild(mk('text', { x: 14, y: yz + hz / 2, transform: 'rotate(-90 14 ' + (yz + hz / 2) + ')', 'text-anchor': 'middle' }, 'TMRCA (gen.)'));
    // find first segment in zoom
    var lo = 0, hi = nSeg - 1;
    while (lo < hi){ var m = (lo + hi + 1) >> 1; if (segStart[m] <= zs) lo = m; else hi = m - 1; }
    var dl = '', first = true, nIn = 0;
    for (var s = lo; s < nSeg && segStart[s] < ze; s++){
      var a = Math.max(zs, segStart[s]), b = Math.min(ze, segStart[s] + segLen[s]), yy = zy(segT[s]);
      dl += (first ? 'M' : 'L') + zxp(a).toFixed(2) + ' ' + yy.toFixed(1) + 'L' + zxp(b).toFixed(2) + ' ' + yy.toFixed(1);
      first = false; nIn++;
    }
    svg.appendChild(mk('path', { d: dl, fill: 'none', stroke: css('--accent'), 'stroke-width': 1.3, 'stroke-linejoin': 'miter' }));
    var yt = yz + hz + 8, dt = '';
    svg.appendChild(mk('rect', { x: X0, y: yt, width: PW, height: 16, fill: 'none', stroke: css('--line') }));
    var nz = 0;
    for (i = 0; i < nHet; i++) if (hets[i] >= zs && hets[i] < ze){ var xh = zxp(hets[i]); dt += 'M' + xh.toFixed(2) + ' ' + yt + 'v16'; nz++; }
    if (dt) svg.appendChild(mk('path', { d: dt, stroke: css('--het'), 'stroke-width': 1 }));
    svg.appendChild(mk('text', { x: X0 - 8, y: yt + 12, 'text-anchor': 'end' }, 'het'));
    var yb = yt + 16;
    for (var k = 0; k <= 4; k++){
      var xk = X0 + k / 4 * PW;
      svg.appendChild(mk('line', { x1: xk, x2: xk, y1: yb, y2: yb + 4, 'class': 'ax' }));
      svg.appendChild(mk('text', { x: xk, y: yb + 17, 'text-anchor': k === 0 ? 'start' : (k === 4 ? 'end' : 'middle') }, ((zs + k * ZLEN / 4) / 1e6).toFixed(2) + (k === 4 ? ' Mb' : '')));
    }
    svg.appendChild(mk('text', { x: X0 + PW, y: yb + 34, 'text-anchor': 'end' }, nIn + ' pieces and ' + nz + ' heterozygous sites in this 200-kb stretch'));
    el('s01-chrom').replaceChildren(svg);
  }

  function cell(label, val, tip){
    var d = document.createElement('div');
    var s = document.createElement('span'); s.innerHTML = label;
    if (tip){ s.className = 'tip'; s.title = tip; }
    var b = document.createElement('b'); b.textContent = val;
    d.appendChild(s); d.appendChild(b); return d;
  }

  function legend(){
    var items = [['--accent', 'Nₑ you set / TMRCA of each piece'], ['--het', 'share of chromosome (this animal) / heterozygous site'],
      ['--fg', 'expected share (many animals)'], ['--muted', 'heterozygous sites per kb, 50-kb windows'], ['--bad', 'zoomed stretch']];
    var lg = el('s01-legend'); lg.replaceChildren();
    items.forEach(function(it){ var s = document.createElement('span'); var i = document.createElement('i');
      i.style.background = css(it[0]); i.style.height = '10px'; s.appendChild(i); s.appendChild(document.createTextNode(it[1])); lg.appendChild(s); });
  }

  function update(regen){
    var N = sizes();
    sl.forEach(function(s, i){ el(s.id + '-o').textContent = fmtN(N[i]); });
    el('s01-zoom-o').textContent = (+el('s01-zoom').value).toFixed(1) + ' Mb';
    if (regen) generate();
    var shares = [], sh = [0, 0, 0, 0], sumT = 0, segMean = 0;
    for (var i = 0; i < 4; i++) shares.push((BOUND[i + 1] === Infinity ? 1 : F(BOUND[i + 1], N)) - F(BOUND[i], N));
    for (var s = 0; s < nSeg; s++){
      sumT += segT[s] * segLen[s] / LEN;
      for (i = 0; i < 4; i++) if (segT[s] < BOUND[i + 1]){ sh[i] += segLen[s] / LEN; break; }
    }
    segMean = LEN / nSeg;
    drawHist(N, sh);
    drawChrom();
    var out = el('s01-out'); out.replaceChildren();
    out.appendChild(cell('Heterozygosity of this animal', (nHet / LEN * 1000).toFixed(2) + ' per kb',
      'Heterozygous sites divided by the chromosome length. Expected value: 2 × μ × (average TMRCA); with constant size 4 Nₑ μ.'));
    out.appendChild(cell('Average TMRCA along the chromosome', fmtN(sumT) + ' generations',
      'Mean time back to the common ancestor of the two copies, weighted by the length of each piece. For a constant population it is 2 Nₑ.'));
    out.appendChild(cell('Pieces with their own ancestor', fmtN(nSeg) + ', mean ' + fmtBp(segMean),
      'Number of stretches between recombination breakpoints in the history of the two copies. Old ancestors make short pieces (mean length 1/(2 r T)).'));
    var names = ['0–2k', '2k–20k', '20k–200k', 'before 200k'];
    var txt = names.map(function(n, i){ return n + ': ' + Math.round(sh[i] * 100) + ' %'; }).join(' · ');
    out.appendChild(cell('Coalesced in each period (this animal)', txt,
      'Share of the chromosome whose two copies found their common ancestor in each period of your history (generations ago). The dashed curve in the histogram is the expectation; this is one animal.'));
    var surv = Math.exp(-H(20000, N));
    out.appendChild(cell('Still separate at 20,000 generations (expected)', Math.round(surv * 100) + ' %',
      'Share of the genome whose two copies have not yet coalesced 20,000 generations back, exp(− sum of generations / 2 Nₑ). Only these pieces carry any information about older times.'));
  }

  var raf = 0;
  function schedule(regen){ if (raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(function(){ raf = 0; update(regen); }); }
  sl.forEach(function(s){ s.addEventListener('input', function(){ setPreset(null); schedule(true); }); });
  el('s01-zoom').addEventListener('input', function(){ schedule(false); });
  el('s01-new').addEventListener('click', function(){ seed += 1; update(true); });
  function setPreset(v){
    el('s01-preset').querySelectorAll('button').forEach(function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-v') === v ? 'true' : 'false'); });
  }
  el('s01-preset').querySelectorAll('button').forEach(function(b){
    b.addEventListener('click', function(){
      var v = b.getAttribute('data-v'), p = PRESETS[v];
      sl.forEach(function(s, i){ s.value = NV.indexOf(p[i]); });
      setPreset(v); update(true);
    });
  });
  legend();
  update(true);

  // CORE-BEGIN: Wright-Fisher display. The same block is copied in 01-coalescent.js, 03-psmc.js and 05-beyond-psmc.js
  // (sections are separate scripts with no shared globals). It needs mk() and css() of its section.
  // spec = { size: g -> gene copies in generation g (0 = today, larger = older), demes: 1 or 2,
  // m: chance per generation that a copy's parent sits in the other deme }.
  function wfDeme(i, c){ return i < (c >> 1) ? 0 : 1; }
  function wfPick(spec, g, i, r){
    var c1 = spec.size(g + 1);
    if (spec.demes !== 2) return Math.floor(r() * c1);
    var d = wfDeme(i, spec.size(g)), h = c1 >> 1;
    if (r() < spec.m) d = 1 - d;
    return d === 0 ? Math.floor(r() * h) : h + Math.floor(r() * (c1 - h));
  }
  function wfPop(spec, r){                 // a population, grown backward on demand
    var par = [];
    return { spec: spec, par: par, grow: function(G){
      while (par.length < G){
        var g = par.length, c = spec.size(g), a = new Int32Array(c);
        for (var i = 0; i < c; i++) a[i] = wfPick(spec, g, i, r);
        par.push(a);
      }
    } };
  }
  function wfTrace(pop, sample){           // follow the sampled copies back until one line is left
    var cur = sample.slice(), rows = [cur.slice()], meets = [], g = 0;
    while (cur.length > 1 && g < 200000){
      pop.grow(g + 1);
      var seen = {}, next = [];
      cur.forEach(function(c){ var p = pop.par[g][c]; if (seen[p]) seen[p]++; else { seen[p] = 1; next.push(p); } });
      g++;
      next.forEach(function(p){ if (seen[p] > 1) meets.push({ g: g, i: p, k: seen[p] }); });
      cur = next; rows.push(cur.slice());
    }
    return { T: g, rows: rows, meets: meets };
  }
  function wfMax(spec, G){ var m = 2; for (var g = 0; g <= G; g++) m = Math.max(m, spec.size(g)); return m; }
  // x position (0..1) of every copy. Each row is sorted by the position of the parents, so links do
  // not cross; the place of a copy in its row therefore means nothing. Row width follows row size.
  function wfLayout(pop, G){
    var spec = pop.spec, two = spec.demes === 2, cmax = wfMax(spec, G), g, i, X = [];
    var step = (two ? 0.46 : 1) / ((two ? cmax / 2 : cmax) - 1 || 1);
    function place(c, order, out){
      for (var d = 0; d < (two ? 2 : 1); d++){
        var mine = two ? order.filter(function(k){ return wfDeme(k, c) === d; }) : order;
        var mid = two ? (d === 0 ? 0.23 : 0.77) : 0.5;
        mine.forEach(function(k, rank){ out[k] = mid + (rank - (mine.length - 1) / 2) * step; });
      }
    }
    pop.grow(G);
    var c0 = spec.size(G), top = new Float64Array(c0), ord = [];
    for (i = 0; i < c0; i++) ord.push(i);
    place(c0, ord, top); X[G] = top;
    for (g = G - 1; g >= 0; g--){
      (function(g){
        var c = spec.size(g), row = new Float64Array(c), o = [], up = X[g + 1], pr = pop.par[g];
        for (var k = 0; k < c; k++) o.push(k);
        o.sort(function(a, b){ return up[pr[a]] - up[pr[b]] || a - b; });
        place(c, o, row); X[g] = row;
      })(g);
    }
    return X;
  }
  // Static part of the picture: every copy as a faint dot, every parent link as a faint line.
  // o = { W, G, x0 (left margin), pitch, maxH, label(g) -> axis text or '', title, shade: [from, to], aria }
  function wfBase(host, pop, o){
    var G = o.G, W = o.W, x0 = o.x0 || 46, x1 = W - 12, y0 = o.title ? 34 : 14;
    var pitch = Math.max(3, Math.min(o.pitch || 16, (o.maxH || 620) / G)), H = y0 + G * pitch + 22;
    var X = wfLayout(pop, G), spec = pop.spec;
    function px(g, i){ return x0 + X[g][i] * (x1 - x0); }
    function py(g){ return y0 + (G - g) * pitch; }
    var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': o.aria || 'Rows of gene copies, one row per generation, with the link from each copy to its parent' });
    svg.style.minWidth = '300px';
    if (o.shade){
      var a = Math.min(o.shade[1], G + 1), b = Math.max(o.shade[0], 0);
      if (a > b) svg.appendChild(mk('rect', { x: x0 - 6, y: py(a - 1) - pitch / 2, width: x1 - x0 + 12, height: (a - b) * pitch, fill: css('--code-bg') }));
    }
    if (o.title) svg.appendChild(mk('text', { x: x0 - 6, y: 14, 'class': 'lab' }, o.title));
    var dl = '', dm = '', dd = '', g, i, c;
    for (g = 0; g < G; g++){
      c = spec.size(g);
      for (i = 0; i < c; i++){
        var p = pop.par[g][i], seg = 'M' + px(g, i).toFixed(1) + ' ' + py(g).toFixed(1) + 'L' + px(g + 1, p).toFixed(1) + ' ' + py(g + 1).toFixed(1);
        if (spec.demes === 2 && wfDeme(i, c) !== wfDeme(p, spec.size(g + 1))) dm += seg; else dl += seg;
      }
    }
    var r = Math.max(1.2, Math.min(3.2, pitch * 0.3, (x1 - x0) / Math.max(1, wfMax(spec, G)) * 0.34));
    for (g = 0; g <= G; g++){ c = spec.size(g); for (i = 0; i < c; i++) dd += 'M' + px(g, i).toFixed(1) + ' ' + py(g).toFixed(1) + 'h0'; }
    svg.appendChild(mk('path', { d: dl, fill: 'none', stroke: css('--err'), 'stroke-width': 0.8, opacity: '0.55' }));
    if (dm) svg.appendChild(mk('path', { d: dm, fill: 'none', stroke: css('--het'), 'stroke-width': 1.2, opacity: '0.8' }));
    if (pitch >= 5) svg.appendChild(mk('path', { d: dd, fill: 'none', stroke: css('--err'), 'stroke-width': 2 * r, 'stroke-linecap': 'round' }));
    for (g = 0; g <= G; g++){
      var t = o.label ? o.label(g) : '';
      if (t !== '') svg.appendChild(mk('text', { x: x0 - 12, y: py(g) + 4, 'text-anchor': 'end' }, t));
    }
    var over = mk('g', {}); svg.appendChild(over);
    host.replaceChildren(svg);
    return { pop: pop, px: px, py: py, over: over, pitch: pitch, r: r, x0: x0, x1: x1, G: G, svg: svg };
  }
  // Moving part: the sampled lines from today back to generation cur, and where they met.
  function wfOver(b, tr, cur, o){
    o = o || {};
    var over = b.over, pop = b.pop, col = css(o.colour || '--accent'); over.replaceChildren();
    var last = Math.min(cur, tr.T, b.G), d = '', dots = '', g;
    if (cur > 0 && !o.noBand) over.appendChild(mk('rect', { x: b.x0 - 6, y: b.py(last) - b.pitch / 2, width: b.x1 - b.x0 + 12, height: b.pitch, fill: css('--accent'), opacity: '0.14' }));
    function link(c){
      var p = pop.par[g][c];
      d += 'M' + b.px(g, c).toFixed(1) + ' ' + b.py(g).toFixed(1) + 'L' + b.px(g + 1, p).toFixed(1) + ' ' + b.py(g + 1).toFixed(1);
    }
    function dot(c){ dots += 'M' + b.px(g, c).toFixed(1) + ' ' + b.py(g).toFixed(1) + 'h0'; }
    for (g = 0; g < last; g++) tr.rows[g].forEach(link);
    for (g = 0; g <= last; g++) if (g === 0 || g === last || b.pitch >= 7) tr.rows[g].forEach(dot);
    if (d) over.appendChild(mk('path', { d: d, fill: 'none', stroke: col, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }));
    over.appendChild(mk('path', { d: dots, fill: 'none', stroke: col, 'stroke-width': 2 * b.r + 1.6, 'stroke-linecap': 'round' }));
    tr.meets.forEach(function(m){
      if (m.g > last) return;
      var end = m.g === tr.T;
      over.appendChild(mk('circle', { cx: b.px(m.g, m.i), cy: b.py(m.g), r: end ? 7 : 5.5, fill: 'none', stroke: css(end ? '--bad' : '--het'), 'stroke-width': 2 }));
      if (end && o.endLabel){
        var x = b.px(m.g, m.i), right = x < (b.x0 + b.x1) / 2;
        over.appendChild(mk('text', { x: x + (right ? 12 : -12), y: b.py(m.g) - 9, 'text-anchor': right ? 'start' : 'end', 'class': 'lab', stroke: css('--bg'), 'stroke-width': 3, 'paint-order': 'stroke' }, o.endLabel));
      }
    });
  }
  // CORE-END
  // SIM-BEGIN: quick simulation with the same parent rule as the grid, and exact expectations.
  function czSpec(kind, N){
    var C = 2 * N, small = Math.max(4, Math.round(2 * N / 5)), s = { kind: kind, demes: 1, m: 0, C: C, small: small };
    if (kind === 'bott'){
      var b0 = Math.round(N / 2), b1 = b0 + Math.max(3, Math.round(0.6 * N));
      s.band = [b0, b1]; s.size = function(g){ return g >= b0 && g < b1 ? small : C; };
    } else if (kind === 'exp'){
      s.band = [N, Infinity]; s.size = function(g){ return g < N ? C : small; };
    } else if (kind === 'decl'){
      var D = Math.max(3, Math.round(0.4 * N));
      s.band = [0, D]; s.size = function(g){ return g < D ? small : C; };
    } else if (kind === 'demes'){
      s.demes = 2; s.m = 0.05; s.size = function(){ return C; };
    } else s.size = function(){ return C; };
    return s;
  }
  // Follow the given copies back. Returns the height of their tree, the generations spent with exactly
  // two lines, and how many deme changes happened before the last meeting.
  function czRun(spec, start, r){
    var cur = start.slice(), g = 0, last2 = 0, moved = 0;
    while (cur.length > 1){
      if (cur.length === 2) last2++;
      var seen = {}, next = [], c0 = spec.size(g), c1 = spec.size(g + 1);
      for (var k = 0; k < cur.length; k++){
        var p = wfPick(spec, g, cur[k], r);
        if (spec.demes === 2 && wfDeme(cur[k], c0) !== wfDeme(p, c1)) moved++;
        if (!seen[p]){ seen[p] = 1; next.push(p); }
      }
      cur = next; g++;
    }
    return { T: g, last2: last2, moved: moved };
  }
  function czSample(spec, n, r){           // n different copies of today's row; two demes: alternate
    var c = spec.size(0), all = [], out = [], i;
    n = Math.min(n, c);
    for (i = 0; i < c; i++) all.push(i);
    for (i = c - 1; i > 0; i--){ var j = Math.floor(r() * (i + 1)), t = all[i]; all[i] = all[j]; all[j] = t; }
    if (spec.demes !== 2) return all.slice(0, n);
    var a = all.filter(function(k){ return wfDeme(k, c) === 0; }), b = all.filter(function(k){ return wfDeme(k, c) === 1; });
    for (i = 0; i < n; i++) out.push((i % 2 ? b : a)[i >> 1]);
    return out;
  }
  function czPairStart(spec, same){        // two different copies; two demes: one in each unless same
    return spec.demes === 2 && !same ? [0, spec.size(0) - 1] : [0, 1];
  }
  // Exact chance that a pair meets in each generation (pmf[g]), its mean, and the share inside the band.
  function czExact(spec, same){
    var pmf = [0], live = 1, g = 0, mean = 0, inBand = 0, m = spec.m, D = same ? 0 : 1, Sm = same ? 1 : 0;
    while ((spec.demes === 2 ? D + Sm : live) > 1e-7 && g < 200000){
      var c = spec.size(g + 1), hit;
      if (spec.demes === 2){
        var stay = (1 - m) * (1 - m) + m * m, sw = 2 * m * (1 - m), s2 = Sm * stay + D * sw, d2 = D * stay + Sm * sw;
        hit = s2 / (c / 2); Sm = s2 - hit; D = d2;
      } else { hit = live / c; live -= hit; }
      g++; pmf[g] = hit; mean += g * hit;
      if (spec.band && g >= spec.band[0] && g < spec.band[1]) inBand += hit;
    }
    return { pmf: pmf, mean: mean, inBand: inBand };
  }
  // SIM-END
  // --- Coalescent theory from zero: step pictures and the Wright-Fisher grid
  function coalZero(){
    var FOUND = ['--accent', '--het', '--rep', '--good'];
    function width(h){ return Math.max(300, Math.min(900, h.clientWidth || 640)); }
    function say(id, html){ var e = el(id); if (e) e.innerHTML = html; }

    // One toy population of 5 animals (10 gene copies) serves steps 1 and 2. The seed search only picks
    // a population in which the picture is easy to read: 2 or 3 founders left, sample meets within view.
    var TG = 8, toySpec = { size: function(){ return 10; }, demes: 1 };
    var toy = (function(){
      for (var s = 1; s < 5000; s++){
        var pop = wfPop(toySpec, rng(s)); pop.grow(TG);
        var fd = [], g, i, row = [];
        for (i = 0; i < 10; i++) row.push(i);
        fd[TG] = row;
        for (g = TG - 1; g >= 0; g--){ fd[g] = []; for (i = 0; i < 10; i++) fd[g].push(fd[g + 1][pop.par[g][i]]); }
        var left = fd[0].filter(function(v, k, a){ return a.indexOf(v) === k; });
        if (left.length < 2 || left.length > 3) continue;
        var sample = czSample(toySpec, 3, rng(s + 1)), tr = wfTrace(pop, sample);
        if (tr.T < 5 || tr.T > TG || tr.meets.length !== 2 || tr.meets[0].g > tr.T - 2) continue;
        return { pop: pop, fd: fd, left: left, tr: tr };
      }
    })();

    function fig1(){
      var host = el('s01-cz-f1'), pop = toy.pop, fd = toy.fd, g, i;
      var b = wfBase(host, pop, { W: width(host), G: TG, x0: 66, pitch: 30, aria: 'Ten gene copies per row and eight generations. Each copy links to one parent in the row above. Most lines end without descendants in the bottom row.',
        label: function(g){ return g === 0 ? 'today' : g === TG ? 'oldest' : ''; } });
      var alive = []; alive[0] = new Uint8Array(10).fill(1);
      for (g = 0; g < TG; g++){ alive[g + 1] = new Uint8Array(10); for (i = 0; i < 10; i++) if (alive[g][i]) alive[g + 1][pop.par[g][i]] = 1; }
      toy.left.forEach(function(f, n){
        var d = '', dots = '', col = css(FOUND[n]);
        for (g = 0; g <= TG; g++) for (i = 0; i < 10; i++) if (alive[g][i] && fd[g][i] === f){
          dots += 'M' + b.px(g, i).toFixed(1) + ' ' + b.py(g).toFixed(1) + 'h0';
          if (g < TG) d += 'M' + b.px(g, i).toFixed(1) + ' ' + b.py(g).toFixed(1) + 'L' + b.px(g + 1, pop.par[g][i]).toFixed(1) + ' ' + b.py(g + 1).toFixed(1);
        }
        b.over.appendChild(mk('path', { d: d, fill: 'none', stroke: col, 'stroke-width': 2 }));
        b.over.appendChild(mk('path', { d: dots, fill: 'none', stroke: col, 'stroke-width': 9, 'stroke-linecap': 'round' }));
      });
      var names = ['one', 'two', 'three'];
      say('s01-cz-f1n', 'Of the 10 copies in the oldest row, only ' + names[toy.left.length - 1] + ' still have descendants today (the coloured families). The other ' + (10 - toy.left.length) + ' lines ended, although no copy was better than any other.');
    }
    function fig2(){
      var host = el('s01-cz-f2');
      var b = wfBase(host, toy.pop, { W: width(host), G: TG, x0: 66, pitch: 30, aria: 'The same population. Three copies in the bottom row are followed upward and join into one ancestor.',
        label: function(g){ return g === 0 ? 'today' : g === TG ? 'oldest' : ''; } });
      wfOver(b, toy.tr, toy.tr.T, { noBand: true, endLabel: 'common ancestor' });
      say('s01-cz-f2n', 'The same 8 rows as in step 1. Three copies picked today are followed upward. Two of them meet ' + toy.tr.meets[0].g + ' generations back (orange ring), and the third joins them ' + toy.tr.T + ' generations back (red ring).');
    }
    function fig3a(){
      var host = el('s01-cz-f3a'), W = width(host), svg = mk('svg', { viewBox: '0 0 ' + W + ' 176', width: '100%', role: 'img', 'aria-label': 'Five animals with two gene copies each. Copy A has picked one parent copy. Copy B can pick any of the ten; only one choice is the same.' });
      svg.style.minWidth = '300px';
      var cw = (W - 24) / 5, yP = 42, yC = 138, hit = 3, i;
      function cx(k){ return 12 + cw * Math.floor(k / 2) + cw / 2 + (k % 2 ? 1 : -1) * Math.min(14, cw * 0.2); }
      svg.appendChild(mk('text', { x: 12, y: 14, 'class': 'lab' }, 'Parents: 5 animals, 10 gene copies'));
      for (i = 0; i < 5; i++) svg.appendChild(mk('rect', { x: 12 + cw * i + cw / 2 - Math.min(26, cw * 0.4), y: yP - 14, width: 2 * Math.min(26, cw * 0.4), height: 28, rx: 13, fill: 'none', stroke: css('--muted') }));
      var xa = W * 0.3, xb = W * 0.7;
      for (i = 0; i < 10; i++) if (i !== hit) svg.appendChild(mk('line', { x1: xb, y1: yC, x2: cx(i), y2: yP + 8, stroke: css('--err'), 'stroke-width': 1 }));
      svg.appendChild(mk('line', { x1: xa, y1: yC, x2: cx(hit), y2: yP + 8, stroke: css('--accent'), 'stroke-width': 2.4 }));
      svg.appendChild(mk('line', { x1: xb, y1: yC, x2: cx(hit), y2: yP + 8, stroke: css('--bad'), 'stroke-width': 2.4 }));
      for (i = 0; i < 10; i++) svg.appendChild(mk('circle', { cx: cx(i), cy: yP, r: 6, fill: css(i === hit ? '--bad' : '--err') }));
      svg.appendChild(mk('circle', { cx: xa, cy: yC, r: 7, fill: css('--accent') }));
      svg.appendChild(mk('circle', { cx: xb, cy: yC, r: 7, fill: css('--accent') }));
      svg.appendChild(mk('text', { x: xa, y: yC + 24, 'text-anchor': 'middle', 'class': 'lab' }, 'copy A has picked'));
      svg.appendChild(mk('text', { x: xb, y: yC + 24, 'text-anchor': 'middle', 'class': 'lab' }, 'copy B: 1 hit in 10'));
      host.replaceChildren(svg);
    }
    // Step 3: 100 pairs counted in two toy populations.
    var count = [5, 20].map(function(N, k){
      var s = czSpec('const', N), r = rng(4100 + k), a = [], first = 0, sum = 0;
      for (var i = 0; i < 100; i++){ var t = czRun(s, [0, 1], r).T; a.push(t); sum += t; if (t === 1) first++; }
      a.sort(function(x, y){ return x - y; });
      return { N: N, a: a, first: first, mean: sum / 100 };
    });
    function fig3b(){
      var host = el('s01-cz-f3b'), W = width(host), stack = W < 560, pw = stack ? W - 56 : (W - 56 - 34) / 2, ph = 130;
      var H = stack ? 2 * (ph + 62) : ph + 62, svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'One hundred pairs in each of two toy populations, sorted by the generations each pair waited. The larger population waits longer.' });
      svg.style.minWidth = '300px';
      var top = 120;                         // a rare very long wait is clipped and labelled
      count.forEach(function(c, k){
        var xo = stack ? 44 : 44 + k * (pw + 34), yo = stack ? k * (ph + 62) + 24 : 24, bw = pw / 100, d = '';
        function y(v){ return yo + ph - Math.min(v, top) / top * ph; }
        svg.appendChild(mk('text', { x: xo, y: yo - 10, 'class': 'lab' }, 'N = ' + c.N + ' animals, ' + 2 * c.N + ' copies'));
        svg.appendChild(mk('line', { x1: xo, x2: xo + pw, y1: yo + ph, y2: yo + ph, 'class': 'ax' }));
        [0, Math.round(top / 2), top].forEach(function(v){ svg.appendChild(mk('text', { x: xo - 6, y: y(v) + 4, 'text-anchor': 'end' }, String(v))); });
        c.a.forEach(function(v, i){ d += 'M' + (xo + i * bw).toFixed(1) + ' ' + (yo + ph).toFixed(1) + 'V' + y(v).toFixed(1); });
        svg.appendChild(mk('path', { d: d, stroke: css('--accent'), 'stroke-width': Math.max(1, bw * 0.75), fill: 'none', opacity: '0.8' }));
        svg.appendChild(mk('line', { x1: xo, x2: xo + pw, y1: y(c.mean), y2: y(c.mean), stroke: css('--bad'), 'stroke-width': 1.6 }));
        svg.appendChild(mk('text', { x: xo + 4, y: y(c.mean) - 5, 'class': 'lab' }, 'average ' + c.mean.toFixed(1)));
        svg.appendChild(mk('text', { x: xo + pw / 2, y: yo + ph + 16, 'text-anchor': 'middle' }, '100 pairs, shortest wait to longest'));
        if (c.a[99] > top) svg.appendChild(mk('text', { x: xo + 4, y: yo + 10 }, 'longest wait ' + c.a[99] + ' (bar cut)'));
      });
      host.replaceChildren(svg);
      say('s01-cz-f3n', 'Each thin bar is one pair of copies, its height the generations that pair waited (axis: generations). With 10 copies, ' + count[0].first + ' of 100 pairs met in the very first generation, close to the 1 in 10 expected, and the 100 waits average ' + count[0].mean.toFixed(1) + ' generations. With 40 copies, ' + count[1].first + ' of 100 met at once and the average is ' + count[1].mean.toFixed(1) + '. The averages sit near 10 and 40; a hundred pairs is a small count, so they are not exact.');
    }
    function fig4(){
      var host = el('s01-cz-f4'), W = width(host), n = 6, lab = W < 470 ? 118 : 188, x0 = 14, x1 = W - lab - 12, H = 372, yB = 340, yT = 16, svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'An average tree of six copies. Meetings come quickly near the present; the last two lines take most of the height.' });
      svg.style.minWidth = '300px';
      var waits = [], tot = 0, k;
      for (k = n; k >= 2; k--){ waits.push({ k: k, w: 2 / (k * (k - 1)) }); tot += 2 / (k * (k - 1)); }
      var sc = (yB - yT) / tot, h = 0, tips = [], lines = [];
      for (k = 0; k < n; k++){ tips.push(x0 + 10 + k * (x1 - x0 - 20) / (n - 1)); lines.push({ x: tips[k], y: yB }); }
      var order = [[1, 2], [3, 4], [0, 1], [1, 2], [0, 1]], d = '';
      waits.forEach(function(q, i){
        var y1 = yB - (h + q.w) * sc, y0 = yB - h * sc;
        if (i % 2 === 0) svg.appendChild(mk('rect', { x: 0, y: y1, width: W, height: y0 - y1, fill: css('--code-bg') }));
        var pairs = q.k * (q.k - 1) / 2;
        svg.appendChild(mk('text', { x: W - 6, y: (y0 + y1) / 2 + 4, 'text-anchor': 'end', 'class': 'lab' }, lab > 150 ? q.k + ' lines, ' + pairs + ' pair' + (pairs > 1 ? 's' : '') + ': 2N' + (pairs > 1 ? '/' + pairs : '') : q.k + ' lines: 2N' + (pairs > 1 ? '/' + pairs : '')));
        var a = order[i][0], b = order[i][1], la = lines[a], lb = lines[b], xm = (la.x + lb.x) / 2;
        d += 'M' + la.x + ' ' + la.y + 'V' + y1 + 'M' + lb.x + ' ' + lb.y + 'V' + y1 + 'M' + la.x + ' ' + y1 + 'H' + lb.x;
        lines.splice(a, 2, { x: xm, y: y1 });
        h += q.w;
      });
      svg.appendChild(mk('path', { d: d, fill: 'none', stroke: css('--accent'), 'stroke-width': 2.4 }));
      tips.forEach(function(x){ svg.appendChild(mk('circle', { cx: x, cy: yB, r: 5, fill: css('--accent') })); });
      svg.appendChild(mk('text', { x: x0, y: yB + 22 }, 'today: 6 sampled copies'));
      host.replaceChildren(svg);
    }
    function fig5(){
      var host = el('s01-cz-f5'), W = width(host), H = 300, yB = 262, yT = 14, sc = (yB - yT) / 5, svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'A tree of four copies with mutations marked as crosses on the branches. A and B share a recent ancestor and differ by few mutations; A and C are joined only at the root and differ by many.' });
      svg.style.minWidth = '300px';
      var x = [0.14, 0.36, 0.62, 0.86].map(function(f){ return f * W; }), tAB = 1.2, tCD = 2.4, tR = 5;
      var xAB = (x[0] + x[1]) / 2, xCD = (x[2] + x[3]) / 2, xR = (xAB + xCD) / 2;
      function y(t){ return yB - t * sc; }
      // branch: x, from time, to time, how many mutations fell on it, colour
      var br = [[x[0], 0, tAB, 1, '--bad'], [x[1], 0, tAB, 1, '--accent'], [x[2], 0, tCD, 2, '--bad'], [x[3], 0, tCD, 3, '--err'], [xAB, tAB, tR, 4, '--bad'], [xCD, tCD, tR, 2, '--bad']];
      var d = 'M' + x[0] + ' ' + y(tAB) + 'H' + x[1] + 'M' + x[2] + ' ' + y(tCD) + 'H' + x[3] + 'M' + xAB + ' ' + y(tR) + 'H' + xCD;
      svg.appendChild(mk('path', { d: d, fill: 'none', stroke: css('--muted'), 'stroke-width': 2 }));
      br.forEach(function(b){
        svg.appendChild(mk('line', { x1: b[0], x2: b[0], y1: y(b[1]), y2: y(b[2]), stroke: css(b[4] === '--err' ? '--muted' : b[4]), 'stroke-width': 2.6 }));
        for (var i = 1; i <= b[3]; i++){
          var yy = y(b[1] + (b[2] - b[1]) * i / (b[3] + 1));
          svg.appendChild(mk('path', { d: 'M' + (b[0] - 6) + ' ' + (yy - 5) + 'l12 10m0 -10l-12 10', stroke: css('--fg'), 'stroke-width': 2, fill: 'none' }));
        }
      });
      ['A', 'B', 'C', 'D'].forEach(function(t, i){ svg.appendChild(mk('text', { x: x[i], y: yB + 20, 'text-anchor': 'middle', 'class': 'lab' }, t)); });
      svg.appendChild(mk('text', { x: x[0] - 8, y: yB + 36 }, 'today'));
      host.replaceChildren(svg);
    }

    // ---- the grid
    var st = { kind: 'const', N: 10, n: 4, seed: 11, timer: 0, playing: false, cur: 0, res: null };
    var SAY = {
      'const': 'Constant size: every row has the same width. This is the plain model of steps 1 to 4.',
      'bott': 'Bottleneck: for a stretch of generations the rows are narrow (grey band). Lines that reach the narrow rows have few parents to choose from, so most pairs meet there.',
      'exp': 'Recent expansion: wide rows near today, narrow rows further back (grey band). Lines rarely meet in the wide recent rows, then meet quickly once they reach the narrow old ones.',
      'decl': 'Recent decline: narrow rows near today (grey band), wide rows further back. Many pairs meet soon; a pair that escapes the narrow rows then waits a long time.',
      'demes': 'Two demes (a deme is a local group that mates within itself): each row is two blocks of N copies. A copy\'s parent is in the other block with a chance of 5 % per generation; those migrant links are orange. Sampled copies alternate between the blocks. A pair sitting in different blocks cannot meet until one line has crossed.'
    };
    var BANDNAME = { bott: 'inside the bottleneck', exp: 'in the narrow old rows', decl: 'in the narrow recent rows' };
    function spec(){ return czSpec(st.kind, st.N); }
    function stop(){ st.playing = false; clearTimeout(st.timer); el('s01-cz-play').textContent = 'play'; }
    function buildGrid(){
      var host = el('s01-cz-grid'), s = st.pop.spec, G = Math.max(st.tr.T + 2, 12);
      var tick = G <= 32 ? 5 : G <= 90 ? 10 : G <= 220 ? 25 : 50;
      st.b = wfBase(host, st.pop, { W: width(host), G: G, x0: 58, maxH: 620,
        title: s.demes === 2 ? 'deme 1 and deme 2, orange = migrant link' : 'gene copies in each generation',
        shade: s.band, label: function(g){ return g === 0 ? 'today' : g % tick === 0 ? String(g) : ''; },
        aria: 'Grid of gene copies, one row per generation, today at the bottom. Faint lines join each copy to its parent. The sampled lines are highlighted going back until they meet.' });
      paint();
    }
    function resample(){
      stop();
      var s = st.pop.spec;
      st.sample = czSample(s, st.n, rng(st.seed * 7 + st.n));
      st.tr = wfTrace(st.pop, st.sample);
      st.cur = 0;
      buildGrid();
    }
    function newPop(){ st.seed += 1; st.pop = wfPop(spec(), rng(st.seed)); resample(); }
    function paint(){
      var tr = st.tr, done = st.cur >= tr.T, k = tr.rows[Math.min(st.cur, tr.T)].length;
      wfOver(st.b, tr, st.cur, { endLabel: 'common ancestor' });
      var out = el('s01-cz-read'), s = st.pop.spec, nn = st.sample.length; out.replaceChildren();
      out.appendChild(cell('Looking back', st.cur + (st.cur === 1 ? ' generation' : ' generations'), 'How many rows the highlighted lines have been followed up from today.'));
      out.appendChild(cell('Lines still separate', k + ' of ' + nn, 'A line is one sampled copy traced back. Each meeting leaves one line fewer.'));
      out.appendChild(cell('Generations to the common ancestor', done ? String(tr.T) : 'not reached yet', 'The row where the last two lines meet: the height of this one tree.'));
      var ex = '';
      if (s.kind === 'const') ex = (4 * st.N * (1 - 1 / nn)).toFixed(1) + ' for ' + nn + ' copies';
      else if (nn === 2) ex = czExact(s).mean.toFixed(1) + ' for this pair';
      else ex = 'use repeat below';
      out.appendChild(cell('Average height to expect', ex, 'Constant size: 4N(1 − 1/n). For two copies in the other settings the page calculates the average exactly, generation by generation. One tree can be far from the average.'));
      el('s01-cz-step').disabled = done;
    }
    function tick(){
      if (!st.playing) return;
      if (st.cur >= st.tr.T){ stop(); paint(); return; }
      st.cur++; paint();
      st.timer = setTimeout(tick, Math.max(40, Math.min(320, 7000 / st.tr.T)));
    }
    function clearHist(){
      st.res = null;
      var host = el('s01-cz-hist'); host.replaceChildren();
      var p = document.createElement('p'); p.className = 'tool-note'; p.textContent = 'Press "repeat 1,000 times" to fill this histogram for the current setting.'; host.appendChild(p);
      el('s01-cz-rout').replaceChildren();
    }
    function repeat(){
      var s = spec(), r = rng(st.seed * 31 + (st.reps = (st.reps || 0) + 1)), R = 1000, T = [], sum = 0, sq = 0, hs = 0, hq = 0, l2 = 0, inB = 0, noMig = 0, same = 0, n = Math.min(st.n, s.size(0));
      for (var i = 0; i < R; i++){
        var q = czRun(s, czPairStart(s), r);
        T.push(q.T); sum += q.T; sq += q.T * q.T;
        if (s.band && q.T >= s.band[0] && q.T < s.band[1]) inB++;
        if (s.demes === 2){ if (q.moved === 0) noMig++; same += czRun(s, czPairStart(s, true), r).T; }
        var t = czRun(s, czSample(s, n, r), r);
        hs += t.T; hq += t.T * t.T; l2 += t.last2;
      }
      var mean = sum / R, se = Math.sqrt((sq / R - mean * mean) / R), hm = hs / R, hse = Math.sqrt((hq / R - hm * hm) / R);
      st.res = { T: T, mean: mean, se: se, hm: hm, hse: hse, l2: l2 / R, inB: inB / R, noMig: noMig, same: same / R, n: n, R: R };
      drawHist2(s);
    }
    function drawHist2(s){
      var res = st.res, host = el('s01-cz-hist'), W = width(host), ex = czExact(s), x0 = 46, x1 = W - 12, yT = 26, yB = 170, H = 214;
      var cum = 0, top = 1;
      for (var g = 1; g < ex.pmf.length; g++){ cum += ex.pmf[g]; top = g; if (cum > 0.985) break; }
      var bw = Math.max(1, Math.ceil(top / 26)), nb = Math.ceil(top / bw) + 1, obs = new Float64Array(nb), exb = new Float64Array(nb);
      res.T.forEach(function(t){ obs[Math.min(nb - 1, Math.floor((t - 1) / bw))]++; });
      for (g = 1; g < ex.pmf.length; g++) exb[Math.min(nb - 1, Math.floor((g - 1) / bw))] += ex.pmf[g] * res.R;
      var mx = 1; for (var i = 0; i < nb; i++) mx = Math.max(mx, obs[i], exb[i]);
      var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Histogram of the generations 1,000 pairs of copies waited to meet, with the calculated expectation as a dashed line.' });
      svg.style.minWidth = '300px';
      function X(t){ return x0 + t / (nb * bw) * (x1 - x0); }
      function Y(v){ return yB - v / mx * (yB - yT); }
      if (s.band){ var a = Math.max(0, s.band[0] - 1), b = Math.min(nb * bw, s.band[1] - 1); if (b > a) svg.appendChild(mk('rect', { x: X(a), y: yT, width: X(b) - X(a), height: yB - yT, fill: css('--code-bg') })); }
      svg.appendChild(mk('text', { x: 4, y: 14, 'class': 'lab' }, (s.demes === 2 ? 'Pairs from different demes' : '1,000 pairs') + ': generations to meet'));
      var d = '';
      for (i = 0; i < nb; i++){ var xa = X(i * bw) + 0.6, xw = (x1 - x0) / nb - 1.2, y = Y(obs[i]); if (obs[i] > 0) d += 'M' + xa.toFixed(1) + ' ' + yB + 'V' + y.toFixed(1) + 'h' + xw.toFixed(1) + 'V' + yB + 'z'; }
      svg.appendChild(mk('path', { d: d, fill: css('--accent'), opacity: '0.8' }));
      var de = '';
      for (i = 0; i < nb; i++) de += (i ? 'L' : 'M') + X((i + 0.5) * bw).toFixed(1) + ' ' + Y(exb[i]).toFixed(1);
      svg.appendChild(mk('path', { d: de, fill: 'none', stroke: css('--fg'), 'stroke-width': 1.6, 'stroke-dasharray': '5 3' }));
      svg.appendChild(mk('line', { x1: x0, x2: x1, y1: yB, y2: yB, 'class': 'ax' }));
      [0, mx].forEach(function(v){ svg.appendChild(mk('text', { x: x0 - 6, y: Y(v) + 4, 'text-anchor': 'end' }, String(Math.round(v)))); });
      var step = Math.max(1, Math.ceil(nb * bw / 6 / 5) * 5);
      for (var t = 0; t <= nb * bw; t += step){ svg.appendChild(mk('line', { x1: X(t), x2: X(t), y1: yB, y2: yB + 4, 'class': 'ax' })); svg.appendChild(mk('text', { x: X(t), y: yB + 17, 'text-anchor': 'middle' }, String(t))); }
      svg.appendChild(mk('line', { x1: X(ex.mean), x2: X(ex.mean), y1: yT, y2: yB, stroke: css('--bad'), 'stroke-width': 1.6 }));
      svg.appendChild(mk('text', { x: (x0 + x1) / 2, y: H - 4, 'text-anchor': 'middle' }, 'generations (last bar: this or longer)'));
      host.replaceChildren(svg);
      var out = el('s01-cz-rout'); out.replaceChildren();
      var isC = s.kind === 'const', C2 = 2 * st.N;
      out.appendChild(cell('Average wait of a pair', res.mean.toFixed(1) + ' ± ' + res.se.toFixed(1), 'Mean of the 1,000 waits, with its standard error: the size of the wobble you expect in such a mean from chance alone. Pressing repeat again gives a new value within about two of these.'));
      out.appendChild(cell(isC ? 'Expected: 2N' : 'Expected, calculated', ex.mean.toFixed(1), isC ? 'Two times the number of animals, the red line.' : 'Worked out exactly from the chance of meeting in each generation of this setting, the red line. It is not 2N, because the rows are not all 2N wide.'));
      if (s.band) out.appendChild(cell('Pairs that met ' + BANDNAME[s.kind], Math.round(res.inB * 100) + ' % (calculated ' + Math.round(ex.inBand * 100) + ' %)', 'Share of the 1,000 pairs whose meeting row lies in the grey band, against the exact calculation.'));
      if (s.demes === 2){
        out.appendChild(cell('Pairs from different demes that met with no migration', res.noMig + ' of ' + res.R, 'It must be zero: two lines in different blocks have no shared parent to pick.'));
        var es = czExact(s, true).mean;
        out.appendChild(cell('Pair from the same deme', (res.same).toFixed(1) + ' (calculated ' + es.toFixed(1) + ')', 'Average wait of 1,000 pairs that start in one block.'));
      }
      out.appendChild(cell('Height of a tree of ' + res.n + ' copies', res.hm.toFixed(1) + ' ± ' + res.hse.toFixed(1) + (isC ? ' (4N(1 − 1/n) = ' + (4 * st.N * (1 - 1 / res.n)).toFixed(1) + ')' : ''), 'Average generations until all sampled lines have met. The formula assumes at most two lines meet in a generation; in a very small toy population several can, which brings the tree height down a little.'));
      out.appendChild(cell('Time with the last two lines', res.l2.toFixed(1) + (isC ? ' (2N = ' + C2 + ')' : ''), 'Average generations with exactly two lines left. If the last three lines meet in one generation, this time is zero for that tree.'));
    }

    function kindSet(v){
      st.kind = v;
      el('s01-cz-kind').querySelectorAll('button').forEach(function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-v') === v ? 'true' : 'false'); });
      say('s01-cz-say', SAY[v]);
      clearHist(); newPop();
    }
    function sliders(){
      st.N = +el('s01-cz-N').value; st.n = +el('s01-cz-n').value;
      var c = spec().size(0);
      el('s01-cz-N-o').textContent = st.N + ' animals = ' + 2 * st.N + ' copies';
      el('s01-cz-n-o').textContent = st.n > c ? c + ' (all copies alive today)' : String(st.n);
    }
    el('s01-cz-kind').querySelectorAll('button').forEach(function(b){ b.addEventListener('click', function(){ st.kind = b.getAttribute('data-v'); sliders(); kindSet(st.kind); }); });
    el('s01-cz-N').addEventListener('input', function(){ sliders(); clearHist(); newPop(); });
    el('s01-cz-n').addEventListener('input', function(){ sliders(); clearHist(); resample(); });
    el('s01-cz-new').addEventListener('click', function(){ newPop(); });
    el('s01-cz-play').addEventListener('click', function(){
      if (st.playing){ stop(); return; }
      if (st.cur >= st.tr.T) st.cur = 0;
      st.playing = true; el('s01-cz-play').textContent = 'pause'; tick();
    });
    el('s01-cz-step').addEventListener('click', function(){ stop(); if (st.cur < st.tr.T){ st.cur++; paint(); } });
    el('s01-cz-back').addEventListener('click', function(){ stop(); st.cur = 0; paint(); });
    el('s01-cz-rep').addEventListener('click', repeat);

    function drawAll(){ fig1(); fig2(); fig3a(); fig3b(); fig4(); fig5(); if (st.pop) buildGrid(); if (st.res) drawHist2(st.pop.spec); }
    sliders(); say('s01-cz-say', SAY[st.kind]); clearHist(); newPop(); drawAll();
    var rz = 0, lastW = window.innerWidth;
    window.addEventListener('resize', function(){
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth; clearTimeout(rz); rz = setTimeout(drawAll, 150);
    });
  }
  coalZero();
})();
