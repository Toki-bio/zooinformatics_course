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
})();
