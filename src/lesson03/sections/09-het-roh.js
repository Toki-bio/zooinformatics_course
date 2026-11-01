(function(){
  var fig = document.getElementById('s09-fig');
  if (!fig) return;
  var NS = 'http://www.w3.org/2000/svg';
  var LEN = 100e6, BIN = 10000, NB = LEN / BIN;         // 100 Mb in 10-kb bins
  var OLD_G = 500;                                      // generations for the "old" segments
  var seed = 20261031;
  var el = function(id){ return document.getElementById(id); };
  var ctl = {
    g: el('s09-g'), k: el('s09-k'), old: el('s09-old'), theta: el('s09-theta'), err: el('s09-err'),
    gaps: el('s09-gaps'), thr: el('s09-thr')
  };
  var segVal = { win: 50, min: 0, den: 'call' };
  var aut, call, het, gapList;

  function rng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function expo(r, mean){ return -Math.log(1 - r()) * mean; }
  function pois(r, m){
    if (m <= 0) return 0;
    if (m < 30){ var Lm = Math.exp(-m), k = 0, p = 1; do { k++; p *= r(); } while (p > Lm); return k - 1; }
    var u1 = r() || 1e-12, u2 = r(); var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.round(m + Math.sqrt(m) * z));
  }
  function paint(arr, startBp, lenBp, val, overwrite){
    var a = Math.max(0, Math.floor(startBp / BIN)), b = Math.min(NB, Math.ceil((startBp + lenBp) / BIN));
    for (var i = a; i < b; i++) if (overwrite || arr[i] === 0) arr[i] = val;
  }

  function generate(){
    var r = rng(seed);
    var g = +ctl.g.value, k = +ctl.k.value, nOld = +ctl.old.value;
    var theta = +ctl.theta.value, err = +ctl.err.value;
    aut = new Uint8Array(NB); call = new Float32Array(NB); het = new Int32Array(NB);
    // old short segments first (value 2), recent ones (value 1) painted over them
    for (var i = 0; i < 120; i++){
      var lo = Math.min(LEN, expo(r, 50 / OLD_G * 1e6)), so = r() * (LEN - lo);
      if (i < nOld) paint(aut, so, lo, 2, false);
    }
    for (i = 0; i < 12; i++){
      var lr = Math.min(LEN * 0.6, expo(r, 50 / g * 1e6)), sr = r() * (LEN - lr);
      if (i < k) paint(aut, sr, lr, 1, true);
    }
    for (i = 0; i < NB; i++) call[i] = 1;
    gapList = [];
    var gr = rng(seed + 7);
    for (i = 0; i < 4; i++){
      var gl = (0.3 + gr() * 1.2) * 1e6, gs = gr() * (LEN - gl);
      gapList.push([gs, gl]);
      if (ctl.gaps.checked){
        var a = Math.floor(gs / BIN), b = Math.ceil((gs + gl) / BIN);
        for (var j = a; j < b && j < NB; j++) call[j] = 0;
      }
    }
    var hr = rng(seed + 13);
    for (i = 0; i < NB; i++){
      var rate = aut[i] ? err : theta;                 // per kb
      het[i] = pois(hr, call[i] * rate * BIN / 1000);
    }
  }

  function runsOf(mask){                                // mask: array of 0/1 per bin -> [startBin, endBin)
    var out = [], s = -1;
    for (var i = 0; i <= NB; i++){
      var on = i < NB && mask[i];
      if (on && s < 0) s = i;
      if (!on && s >= 0){ out.push([s, i]); s = -1; }
    }
    return out;
  }

  function callRoh(){
    var wb = segVal.win * 1000 / BIN, thr = +ctl.thr.value, nW = Math.ceil(NB / wb);
    var dens = new Float32Array(nW), skip = new Uint8Array(nW), isR = new Uint8Array(nW);
    for (var w = 0; w < nW; w++){
      var h = 0, cb = 0, a = w * wb, b = Math.min(NB, a + wb);
      for (var i = a; i < b; i++){ h += het[i]; cb += call[i] * BIN; }
      var wl = (b - a) * BIN;
      if (segVal.den === 'call'){
        if (cb < 0.5 * wl){ skip[w] = 1; continue; }
        dens[w] = h / cb * 1000;
      } else dens[w] = h / wl * 1000;
      isR[w] = dens[w] < thr ? 1 : 0;
    }
    var det = new Uint8Array(NB), minB = segVal.min * 1000 / BIN, s = -1;
    for (w = 0; w <= nW; w++){
      var on = w < nW && isR[w];
      if (on && s < 0) s = w;
      if (!on && s >= 0){
        var a2 = s * wb, b2 = Math.min(NB, w * wb);
        if (b2 - a2 >= minB) for (i = a2; i < b2; i++) det[i] = 1;
        s = -1;
      }
    }
    return { wb: wb, nW: nW, dens: dens, skip: skip, isR: isR, det: det };
  }

  function css(v){ return 'var(' + v + ')'; }
  function mk(tag, attrs, txt){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  function fmtPct(x){ return (x * 100).toFixed(1) + ' %'; }
  function fmtMb(bp){ return (bp / 1e6).toFixed(bp < 1e6 ? 2 : 1) + ' Mb'; }

  var X0 = 78, PW = 870, W = 960;
  function xp(bin){ return X0 + bin / NB * PW; }

  function rowRects(svg, runs, y, h, color){
    var d = '';
    runs.forEach(function(r){ var x = xp(r[0]), w = Math.max(0.6, xp(r[1]) - x); d += 'M' + x.toFixed(2) + ' ' + y + 'h' + w.toFixed(2) + 'v' + h + 'h' + (-w).toFixed(2) + 'z'; });
    if (d) svg.appendChild(mk('path', { d: d, fill: css(color), 'shape-rendering': 'crispEdges' }));
  }

  function draw(res){
    var theta = +ctl.theta.value, thr = +ctl.thr.value;
    var svg = mk('svg', { viewBox: '0 0 ' + W + ' 278', width: '100%', role: 'img', 'aria-label': 'Toy chromosome: true autozygous segments, window heterozygosity, called and missed ROH' });
    svg.style.minWidth = '640px';
    svg.appendChild(mk('text', { x: X0, y: 14, 'class': 'lab' }, 'Toy chromosome pair, 100 Mb: truth, window heterozygosity, your ROH calls'));
    // truth row
    var yT = 26, hT = 16;
    svg.appendChild(mk('text', { x: X0 - 8, y: yT + 12, 'text-anchor': 'end' }, 'truth'));
    svg.appendChild(mk('rect', { x: X0, y: yT, width: PW, height: hT, fill: css('--line') }));
    var m1 = new Uint8Array(NB), m2 = new Uint8Array(NB), mg = new Uint8Array(NB);
    for (var i = 0; i < NB; i++){ m1[i] = aut[i] === 1; m2[i] = aut[i] === 2; mg[i] = call[i] === 0; }
    rowRects(svg, runsOf(m2), yT, hT, '--rep');
    rowRects(svg, runsOf(m1), yT, hT, '--accent');
    rowRects(svg, runsOf(mg), yT + hT - 5, 5, '--fg');
    // density panel
    var yD = 56, hD = 118;
    var ymax = Math.max(theta * 2, thr * 1.25);
    svg.appendChild(mk('text', { x: X0 - 8, y: yD + 10, 'text-anchor': 'end' }, ymax.toFixed(1)));
    svg.appendChild(mk('text', { x: X0 - 8, y: yD + hD, 'text-anchor': 'end' }, '0'));
    svg.appendChild(mk('text', { x: X0 - 8, y: yD + hD / 2 + 4, 'text-anchor': 'end' }, 'het/kb'));
    svg.appendChild(mk('line', { x1: X0, x2: X0 + PW, y1: yD + hD, y2: yD + hD, 'class': 'ax' }));
    svg.appendChild(mk('line', { x1: X0, x2: X0, y1: yD, y2: yD + hD, 'class': 'ax' }));
    var dN = '', dR = '', dS = '';
    for (var w = 0; w < res.nW; w++){
      var x = xp(w * res.wb), bw = Math.max(0.5, xp(Math.min(NB, (w + 1) * res.wb)) - x - (res.wb >= 20 ? 0.6 : 0));
      if (res.skip[w]){ dS += 'M' + x.toFixed(2) + ' ' + (yD + hD - 4) + 'h' + bw.toFixed(2) + 'v4h' + (-bw).toFixed(2) + 'z'; continue; }
      var hh = Math.min(res.dens[w], ymax) / ymax * hD;
      if (hh < 0.8) hh = 0.8;
      var seg = 'M' + x.toFixed(2) + ' ' + (yD + hD - hh).toFixed(2) + 'h' + bw.toFixed(2) + 'v' + hh.toFixed(2) + 'h' + (-bw).toFixed(2) + 'z';
      if (res.isR[w]) dR += seg; else dN += seg;
    }
    if (dN) svg.appendChild(mk('path', { d: dN, fill: css('--muted'), opacity: '0.55', 'shape-rendering': 'crispEdges' }));
    if (dR) svg.appendChild(mk('path', { d: dR, fill: css('--het'), 'shape-rendering': 'crispEdges' }));
    if (dS) svg.appendChild(mk('path', { d: dS, fill: css('--err'), 'shape-rendering': 'crispEdges' }));
    var yThr = yD + hD - Math.min(thr, ymax) / ymax * hD;
    svg.appendChild(mk('line', { x1: X0, x2: X0 + PW, y1: yThr, y2: yThr, stroke: css('--bad'), 'stroke-width': 1.5, 'stroke-dasharray': '5 3' }));
    // called / missed rows
    var yC = 186, yM = 210, hR = 16;
    svg.appendChild(mk('text', { x: X0 - 8, y: yC + 12, 'text-anchor': 'end' }, 'called'));
    svg.appendChild(mk('text', { x: X0 - 8, y: yM + 12, 'text-anchor': 'end' }, 'missed'));
    svg.appendChild(mk('rect', { x: X0, y: yC, width: PW, height: hR, fill: 'none', stroke: css('--line') }));
    svg.appendChild(mk('rect', { x: X0, y: yM, width: PW, height: hR, fill: 'none', stroke: css('--line') }));
    var tp = new Uint8Array(NB), fp = new Uint8Array(NB), fn = new Uint8Array(NB);
    for (i = 0; i < NB; i++){ tp[i] = res.det[i] && aut[i] ? 1 : 0; fp[i] = res.det[i] && !aut[i] ? 1 : 0; fn[i] = !res.det[i] && aut[i] ? 1 : 0; }
    rowRects(svg, runsOf(tp), yC, hR, '--good');
    rowRects(svg, runsOf(fp), yC, hR, '--bad');
    rowRects(svg, runsOf(fn), yM, hR, '--muted');
    // axis
    var yA = 240;
    svg.appendChild(mk('line', { x1: X0, x2: X0 + PW, y1: yA, y2: yA, 'class': 'ax' }));
    for (var mb = 0; mb <= 100; mb += 10){
      var tx = X0 + mb / 100 * PW;
      svg.appendChild(mk('line', { x1: tx, x2: tx, y1: yA, y2: yA + 4, 'class': 'ax' }));
      svg.appendChild(mk('text', { x: tx, y: yA + 16, 'text-anchor': mb === 0 ? 'start' : (mb === 100 ? 'end' : 'middle') }, mb + (mb === 100 ? ' Mb' : '')));
    }
    svg.appendChild(mk('text', { x: X0 + PW, y: yA + 32, 'text-anchor': 'end' }, 'window ' + segVal.win + ' kb · 1 cM per Mb assumed'));
    fig.replaceChildren(svg);
    return { tp: tp, fp: fp, fn: fn };
  }

  var CLASSES = [[0, 1e5, '< 100 kb'], [1e5, 5e5, '100-500 kb'], [5e5, 1e6, '0.5-1 Mb'], [1e6, 5e6, '1-5 Mb'], [5e6, Infinity, '≥ 5 Mb']];
  function byClass(runs){
    var out = CLASSES.map(function(){ return 0; });
    runs.forEach(function(r){ var bp = (r[1] - r[0]) * BIN;
      for (var c = 0; c < CLASSES.length; c++) if (bp >= CLASSES[c][0] && bp < CLASSES[c][1]){ out[c] += bp; break; } });
    return out;
  }

  function drawHist(trueRuns, detRuns){
    var host = el('s09-hist');
    var a = byClass(trueRuns), b = byClass(detRuns);
    var mx = Math.max.apply(null, a.concat(b, [1e6]));
    var H = 200, y0 = 160, ph = 120, gx = 120, gw = 160;
    var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Bases in ROH by run length class, truth versus called' });
    svg.style.minWidth = '640px';
    svg.appendChild(mk('text', { x: gx, y: 14, 'class': 'lab' }, 'Bases in ROH by run length class (truth vs called)'));
    svg.appendChild(mk('line', { x1: gx - 10, x2: gx + gw * 5, y1: y0, y2: y0, 'class': 'ax' }));
    svg.appendChild(mk('text', { x: gx - 16, y: y0 - ph + 4, 'text-anchor': 'end' }, (mx / 1e6).toFixed(1) + ' Mb'));
    svg.appendChild(mk('text', { x: gx - 16, y: y0, 'text-anchor': 'end' }, '0'));
    svg.appendChild(mk('line', { x1: gx - 10, x2: gx + gw * 5, y1: y0 - ph, y2: y0 - ph, 'class': 'grid' }));
    for (var c = 0; c < 5; c++){
      var x = gx + c * gw + 30, bw = 40;
      var ha = a[c] / mx * ph, hb = b[c] / mx * ph;
      svg.appendChild(mk('rect', { x: x, y: y0 - ha, width: bw, height: ha, fill: css('--accent') }));
      svg.appendChild(mk('rect', { x: x + bw + 6, y: y0 - hb, width: bw, height: hb, fill: css('--het') }));
      if (a[c] > 0) svg.appendChild(mk('text', { x: x + bw / 2, y: y0 - ha - 4, 'text-anchor': 'middle' }, (a[c] / 1e6).toFixed(1)));
      if (b[c] > 0) svg.appendChild(mk('text', { x: x + bw * 1.5 + 6, y: y0 - hb - 4, 'text-anchor': 'middle' }, (b[c] / 1e6).toFixed(1)));
      svg.appendChild(mk('text', { x: x + bw + 3, y: y0 + 16, 'text-anchor': 'middle', 'class': 'lab' }, CLASSES[c][2]));
      var gmid = CLASSES[c][1] === Infinity ? '≤ 10 gen.' : (c === 0 ? '> 500 gen.' : Math.round(50 / (CLASSES[c][1] / 1e6)) + '-' + Math.round(50 / (CLASSES[c][0] / 1e6)) + ' gen.');
      svg.appendChild(mk('text', { x: x + bw + 3, y: y0 + 32, 'text-anchor': 'middle' }, gmid));
    }
    host.replaceChildren(svg);
  }

  function legend(){
    var items = [['--accent', 'true ROH, recent ancestor'], ['--rep', 'true ROH, old (~500 generations)'], ['--fg', 'uncallable gap'],
      ['--muted', 'window het per kb'], ['--het', 'window called ROH'], ['--bad', 'threshold / false ROH call'], ['--good', 'correct ROH call'], ['--err', 'window skipped (under half callable)']];
    var lg = el('s09-legend'); lg.replaceChildren();
    items.forEach(function(it){ var s = document.createElement('span'); var i = document.createElement('i');
      i.style.background = css(it[0]); i.style.height = '10px'; s.appendChild(i); s.appendChild(document.createTextNode(it[1])); lg.appendChild(s); });
  }

  function cell(label, val, tip){
    var d = document.createElement('div');
    var s = document.createElement('span'); s.innerHTML = label;
    if (tip){ s.className = 'tip'; s.title = tip; }
    var b = document.createElement('b'); b.textContent = val;
    d.appendChild(s); d.appendChild(b); return d;
  }

  function update(){
    var res = callRoh();
    var m = draw(res);
    var trueBins = 0, detBins = 0, tpB = 0, fpB = 0, callB = 0;
    for (var i = 0; i < NB; i++){ if (aut[i]) trueBins++; if (res.det[i]) detBins++; tpB += m.tp[i]; fpB += m.fp[i]; callB += call[i]; }
    var denom = segVal.den === 'call' ? callB : NB;
    var autMask = new Uint8Array(NB); for (i = 0; i < NB; i++) autMask[i] = aut[i] ? 1 : 0;
    var trueRuns = runsOf(autMask), detRuns = runsOf(res.det);
    drawHist(trueRuns, detRuns);
    var long = detRuns.map(function(r){ return (r[1] - r[0]) * BIN; }).filter(function(bp){ return bp >= 1e6; }).sort(function(a, b){ return a - b; });
    var gTxt = 'no called run ≥ 1 Mb';
    if (long.length){ var med = long[Math.floor(long.length / 2)]; gTxt = 'median ' + fmtMb(med) + ' → g ≈ ' + Math.round(50 / (med / 1e6)) + ' (true ' + ctl.g.value + ')'; }
    var out = el('s09-out'); out.replaceChildren();
    out.appendChild(cell('True F<sub>ROH</sub> (all segments)', fmtPct(trueBins / NB), 'Share of the toy chromosome that is really autozygous, whatever the length.'));
    out.appendChild(cell('Called F<sub>ROH</sub>', fmtPct(detBins / denom), segVal.den === 'call' ? 'Called ROH length divided by callable length.' : 'Called ROH length divided by the whole chromosome length.'));
    out.appendChild(cell('True ROH found', trueBins ? fmtPct(tpB / trueBins) : 'none to find', 'Share of truly autozygous bases inside a called run (sensitivity).'));
    out.appendChild(cell('False ROH called', fmtMb(fpB * BIN), 'Bases called ROH that are not autozygous: missed hets, gaps counted as homozygous.'));
    out.appendChild(cell('Runs: true / called', trueRuns.length + ' / ' + detRuns.length));
    out.appendChild(cell('Age from called runs ≥ 1 Mb', gTxt, 'g ≈ 50 / (length in Mb × 1 cM per Mb), from mean IBD length 100/(2g) cM (Thompson 2013). One number from a few runs is very noisy.'));
  }

  function outputs(){
    el('s09-g-o').textContent = ctl.g.value + ' (mean run ' + fmtMb(50 / +ctl.g.value * 1e6) + ')';
    el('s09-k-o').textContent = ctl.k.value;
    el('s09-old-o').textContent = ctl.old.value;
    el('s09-theta-o').textContent = (+ctl.theta.value).toFixed(1) + ' per kb';
    el('s09-err-o').textContent = (+ctl.err.value).toFixed(2) + ' per kb';
    el('s09-thr-o').textContent = (+ctl.thr.value).toFixed(2);
  }

  function regen(){ outputs(); generate(); update(); }
  ['g', 'k', 'old', 'theta', 'err'].forEach(function(k){ ctl[k].addEventListener('input', regen); });
  ctl.gaps.addEventListener('change', regen);
  ctl.thr.addEventListener('input', function(){ outputs(); update(); });
  el('s09-new').addEventListener('click', function(){ seed = (Math.random() * 1e9) | 0; regen(); });
  function segGroup(id, key, num){
    var g = el(id); if (!g) return;
    g.addEventListener('click', function(e){
      var b = e.target.closest('button'); if (!b) return;
      Array.prototype.forEach.call(g.querySelectorAll('button'), function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      segVal[key] = num ? +b.getAttribute('data-v') : b.getAttribute('data-v');
      update();
    });
  }
  segGroup('s09-win', 'win', true); segGroup('s09-min', 'min', true); segGroup('s09-den', 'den', false);
  legend();
  try { regen(); } catch (e) { fig.textContent = 'Figure could not be drawn: ' + e.message; }
})();
