(function(){
  /* CORE-START: simulator. Pure functions, no page access; the control script runs this same text. */
  var CH = { nPop: 3, nLeaf: 12, N: 5000, Na: 10000, Ts: 4000, rho: 1e-8, nWin: 400, winBp: 5000, nBack: 20000 };
  function mkRng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function caught(d, s, N){ return Math.exp(-CH.rho * d * Math.log(2 * N) / s); }   // Theorem 1.1, Schweinsberg & Durrett 2005
  function lowSize(d){ return 1 - 0.85 * Math.exp(-(d / 150000) * (d / 150000)); } // toy size multiplier, 1 far away
  // One local tree. sweep = {p: chance a lineage is caught, tau: generations ago} acts on population 0 only.
  // b multiplies every population size at this window.
  function simTree(rng, sweep, b){
    var K = CH.nPop, n = CH.nLeaf, r = { w: new Float64Array(K), all: 0, root: null };
    function join(x, y, t){
      var c = [], i;
      for (i = 0; i < K; i++){ r.w[i] += x.c[i] * y.c[i] * t; c.push(x.c[i] + y.c[i]); }
      r.all += x.n * y.n * t;
      return { t: t, a: x, b: y, c: c, n: x.n + y.n };
    }
    function coal(list, t0, t1, N){
      var t = t0;
      while (list.length > 1){
        var k = list.length;
        t += -Math.log(1 - rng()) * 2 * N / (k * (k - 1) / 2);
        if (t >= t1) break;
        var i = Math.floor(rng() * k), j = Math.floor(rng() * (k - 1)); if (j >= i) j++;
        var m = join(list[i], list[j], t), hi = Math.max(i, j), lo = Math.min(i, j);
        list[lo] = m; list[hi] = list[k - 1]; list.pop();
      }
    }
    var pops = [], p, i, N = CH.N * b, Na = CH.Na * b;
    for (p = 0; p < K; p++){
      var l = [];
      for (i = 0; i < n; i++){ var c = []; for (var q = 0; q < K; q++) c.push(q === p ? 1 : 0); l.push({ t: 0, c: c, n: 1, pop: p }); }
      pops.push(l);
    }
    if (sweep){
      coal(pops[0], 0, sweep.tau, N);
      var hit = null, out = [];
      pops[0].forEach(function(x){
        if (rng() < sweep.p) hit = hit ? join(hit, x, sweep.tau) : x; else out.push(x);
      });
      if (hit) out.push(hit);
      pops[0] = out;
      coal(pops[0], sweep.tau, CH.Ts, N);
    } else coal(pops[0], 0, CH.Ts, N);
    for (p = 1; p < K; p++) coal(pops[p], 0, CH.Ts, N);
    var all = [].concat.apply([], pops);
    coal(all, CH.Ts, Infinity, Na);
    r.root = all[0];
    var pw = n * (n - 1) / 2, tot = K * n * (K * n - 1) / 2;
    r.within = Array.prototype.map.call(r.w, function(v){ return v / pw; });
    r.pooled = r.all / tot;
    r.ratio = r.within.map(function(v){ return r.pooled / v; });
    return r;
  }
  function winSeed(seed, w){ return (Math.imul(seed, 2654435761) ^ Math.imul(w + 1, 40503)) | 0; }
  // scenario: 'sweep' | 'none' | 'low'. The target sits in the middle of the chromosome.
  function simWindow(seed, w, sc, s, tau){
    var d = Math.abs((w + 0.5) * CH.winBp - CH.nWin * CH.winBp / 2), rng = mkRng(winSeed(seed, w));
    if (sc === 'sweep') return simTree(rng, { p: caught(d, s, CH.N), tau: tau }, 1);
    return simTree(rng, null, sc === 'low' ? lowSize(d) : 1);
  }
  function simChrom(seed, sc, s, tau){
    var o = [];
    for (var w = 0; w < CH.nWin; w++) o.push(simWindow(seed, w, sc, s, tau));
    return o;
  }
  // Neutral "rest of the genome": sorted ratios of all populations, for the quantile threshold.
  function simBack(seed, nBack){
    var rng = mkRng(seed), o = new Float64Array(nBack * CH.nPop);
    for (var i = 0; i < nBack; i++){
      var r = simTree(rng, null, 1);
      for (var p = 0; p < CH.nPop; p++) o[i * CH.nPop + p] = r.ratio[p];
    }
    return o.sort();
  }
  function median(a){ var b = a.slice().sort(function(x, y){ return x - y; }); return b[b.length >> 1]; }
  // median ratio per population in the middle 200 kb and in the rest of the chromosome
  function midFar(ch){
    var o = [], c = CH.nWin / 2, h = 100000 / CH.winBp;
    for (var p = 0; p < CH.nPop; p++){
      var m = [], f = [];
      ch.forEach(function(r, w){ (Math.abs(w + 0.5 - c) <= h ? m : f).push(r.ratio[p]); });
      o.push([median(m), median(f)]);
    }
    return o;
  }
  function quant(sorted, q){ return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]; }
  /* CORE-END */

  var host = document.getElementById('s06-tracks');
  if (!host) return;
  var NS = 'http://www.w3.org/2000/svg';
  var el = function(id){ return document.getElementById(id); };
  function S(tag, at, txt){ var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; }
  var COL = ['var(--accent)', 'var(--het)', 'var(--rep)'];
  var SV = [0.005, 0.01, 0.02, 0.05, 0.1];
  var state = { seed: 20261105, sc: 'sweep', chrom: null, back: null, win: 200 };
  var sS = el('s06-s'), sT = el('s06-tau'), sQ = el('s06-q'), sW = el('s06-win');
  var fmt = function(v){ return Math.round(v).toLocaleString('en-US'); };
  var f2 = function(v){ return v < 10 ? v.toFixed(2) : v.toFixed(1); };
  function qVal(){ return +sQ.value / 100; }
  function posMb(w){ return ((w + 0.5) * CH.winBp / 1e6).toFixed(2); }

  // layout of the tracks figure
  var W = 940, L = 62, R = 14, X0 = L, X1 = W - R;
  var D = { top: 22, h: 150 }, RH = 74, RGAP = 16, R0 = D.top + D.h + 40;
  var H = R0 + 3 * RH + 2 * RGAP + 34;
  var xOf = function(w){ return X0 + (w + 0.5) / CH.nWin * (X1 - X0); };
  var dY = function(t){ var a = Math.log10(100), b = Math.log10(100000); var v = (Math.log10(Math.max(100, Math.min(100000, t))) - a) / (b - a); return D.top + D.h - v * D.h; };
  var rLo = 0.7, rHi = 200;
  var rY = function(i, v){ var a = Math.log10(rLo), b = Math.log10(rHi); var y0 = R0 + i * (RH + RGAP);
    var u = (Math.log10(Math.max(rLo, Math.min(rHi, v))) - a) / (b - a); return y0 + RH - u * RH; };

  function drawTracks(){
    while (host.firstChild) host.removeChild(host.firstChild);
    var svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: 'min-width:640px;display:block;cursor:crosshair', role: 'img',
      'aria-label': 'Average pairwise coalescence time along a toy chromosome for three populations and the pooled sample, and below it the ratio pooled over within for each population, with the threshold line' });
    var ch = state.chrom, q = qVal();
    svg.appendChild(S('text', { x: X0, y: 13, 'class': 'lab' }, 'Tree depth: average pairwise coalescence time per window (generations, log scale)'));
    [100, 1000, 10000, 100000].forEach(function(t){
      svg.appendChild(S('line', { x1: X0, x2: X1, y1: dY(t), y2: dY(t), 'class': 'grid' }));
      svg.appendChild(S('text', { x: X0 - 6, y: dY(t) + 4, 'text-anchor': 'end' }, t >= 1000 ? (t / 1000) + 'k' : t));
    });
    function line(fn, col, wd){
      var d = '';
      for (var w = 0; w < ch.length; w++) d += (w ? 'L' : 'M') + xOf(w).toFixed(1) + ' ' + fn(ch[w]).toFixed(1);
      svg.appendChild(S('path', { d: d, fill: 'none', stroke: col, 'stroke-width': wd }));
    }
    line(function(r){ return dY(r.within[2]); }, COL[2], 0.8);
    line(function(r){ return dY(r.within[1]); }, COL[1], 0.8);
    line(function(r){ return dY(r.pooled); }, 'var(--fg)', 0.8);
    line(function(r){ return dY(r.within[0]); }, COL[0], 1.5);
    svg.appendChild(S('text', { x: X0, y: R0 - 12, 'class': 'lab' }, 'Scan: Tpooled / Twithin per window (log scale); red bars are above the threshold'));
    state.flag = [0, 0, 0];
    var thr = quant(state.back, q);
    state.thr = thr;
    for (var p = 0; p < CH.nPop; p++){
      var y0 = R0 + p * (RH + RGAP);
      [1, 10, 100].forEach(function(v){
        svg.appendChild(S('line', { x1: X0, x2: X1, y1: rY(p, v), y2: rY(p, v), 'class': 'grid' }));
        svg.appendChild(S('text', { x: X0 - 6, y: rY(p, v) + 4, 'text-anchor': 'end' }, v));
      });
      for (var w = 0; w < ch.length; w++){
        var v = ch[w].ratio[p];
        if (v >= thr){
          state.flag[p]++;
          svg.appendChild(S('rect', { x: xOf(w) - 1.2, width: 2.4, y: rY(p, v), height: Math.max(1, rY(p, 1) - rY(p, v)), fill: 'var(--bad)' }));
        }
      }
      var d = '';
      for (var w2 = 0; w2 < ch.length; w2++) d += (w2 ? 'L' : 'M') + xOf(w2).toFixed(1) + ' ' + rY(p, ch[w2].ratio[p]).toFixed(1);
      svg.appendChild(S('path', { d: d, fill: 'none', stroke: COL[p], 'stroke-width': 1 }));
      svg.appendChild(S('line', { x1: X0, x2: X1, y1: rY(p, thr), y2: rY(p, thr), stroke: 'var(--bad)', 'stroke-width': 1, 'stroke-dasharray': '5 3' }));
      svg.appendChild(S('text', { x: X1 - 4, y: y0 + 11, 'text-anchor': 'end', 'class': 'lab' }, 'population ' + (p + 1)));
    }
    var yb = R0 + 3 * RH + 2 * RGAP;
    [0, 0.5, 1, 1.5, 2].forEach(function(m){
      var x = X0 + m / 2 * (X1 - X0);
      svg.appendChild(S('line', { x1: x, x2: x, y1: yb, y2: yb + 4, 'class': 'ax' }));
      svg.appendChild(S('text', { x: x, y: yb + 16, 'text-anchor': m === 0 ? 'start' : m === 2 ? 'end' : 'middle' }, m + ' Mb'));
    });
    var xc = xOf(state.win);
    svg.appendChild(S('line', { x1: xc, x2: xc, y1: D.top, y2: yb, stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-dasharray': '2 2' }));
    svg.addEventListener('click', function(e){
      var b = svg.getBoundingClientRect(), x = (e.clientX - b.left) / b.width * W;
      var w = Math.floor((x - X0) / (X1 - X0) * CH.nWin);
      state.win = Math.max(0, Math.min(CH.nWin - 1, w)); sW.value = state.win; update();
    });
    host.appendChild(svg);
  }

  // dendrogram of one local tree: leaves in tree order, height on a log scale
  function drawTree(hostId, r, title){
    var h = el(hostId); while (h.firstChild) h.removeChild(h.firstChild);
    var TW = 440, TH = 230, l = 44, rr = 8, top = 22, bot = TH - 16, n = CH.nPop * CH.nLeaf, i = 0;
    var svg = S('svg', { viewBox: '0 0 ' + TW + ' ' + TH, width: '100%', style: 'min-width:300px;display:block', role: 'img', 'aria-label': title });
    svg.appendChild(S('text', { x: l, y: 12, 'class': 'lab' }, title));
    var a = Math.log10(30), b = Math.log10(300000);
    var y = function(t){ if (t <= 0) return bot; var v = (Math.log10(Math.max(30, Math.min(300000, t))) - a) / (b - a); return bot - v * (bot - top); };
    [100, 1000, 10000, 100000].forEach(function(t){
      svg.appendChild(S('line', { x1: l, x2: TW - rr, y1: y(t), y2: y(t), 'class': 'grid' }));
      svg.appendChild(S('text', { x: l - 5, y: y(t) + 4, 'text-anchor': 'end' }, t >= 1000 ? (t / 1000) + 'k' : t));
    });
    var step = (TW - l - rr) / (n - 1);
    (function walk(nd){
      if (!nd.a){
        nd.x = l + step * i++;
        svg.appendChild(S('circle', { cx: nd.x, cy: bot + 5, r: 2.6, fill: COL[nd.pop] }));
        return;
      }
      walk(nd.a); walk(nd.b);
      nd.x = (nd.a.x + nd.b.x) / 2;
      var yy = y(nd.t);
      svg.appendChild(S('path', { d: 'M' + nd.a.x.toFixed(1) + ' ' + y(nd.a.t).toFixed(1) + 'V' + yy.toFixed(1) + 'H' + nd.b.x.toFixed(1) + 'V' + y(nd.b.t).toFixed(1), fill: 'none', stroke: 'var(--fg)', 'stroke-width': 0.9 }));
    })(r.root);
    h.appendChild(svg);
  }

  function verdict(){
    var f = state.flag, ex = (1 - qVal()) * CH.nWin, txt;
    if (state.sc === 'sweep'){
      txt = f[0] >= 3 && f[0] > f[1] + f[2] ? 'Population 1 stands out and the other two stay flat. That is the population-specific drop the scan looks for. It is a candidate for follow-up, not proof of selection.'
        : 'Population 1 does not stand out at this line. An old sweep leaves the trees less shallow, and the scan can miss it; one window above the line could also be chance.';
    } else if (state.sc === 'none'){
      txt = f[0] + f[1] + f[2] > 0 ? 'There is no selection anywhere in this run, and windows still pass: a quantile line always cuts off the top share of windows, selected or not.'
        : 'No window passes in this run. There is no selection here, and at this line about ' + ex.toFixed(2) + ' windows per population would pass by chance. Lower the threshold to see them appear.';
    } else {
      txt = 'No population had a sweep, yet the ratio rises in the middle in all three, because all three are shallow there. Windows above the line now: ' + f.join(' / ') + '. Lower the threshold and they appear at the same place in every population. The scan alone would call them candidates; the depth track shows every population shallow together.';
    }
    el('s06-verdict').textContent = txt;
  }

  function update(){
    drawTracks();
    var r = state.chrom[state.win], s = SV[+sS.value], tau = +sT.value;
    el('s06-s-o').textContent = s;
    el('s06-tau-o').textContent = fmt(tau) + ' generations ago';
    el('s06-q-o').textContent = (+sQ.value).toFixed(2) + ' %';
    el('s06-win-o').textContent = posMb(state.win) + ' Mb';
    var half = Math.LN2 * s / (CH.rho * Math.log(2 * CH.N)) / 1000;
    el('s06-r-half').textContent = state.sc === 'sweep' ? fmt(half) + ' kb' : 'no sweep';
    el('s06-r-flag').textContent = state.flag.join(' / ');
    el('s06-r-exp').textContent = ((1 - qVal()) * CH.nWin).toFixed(2);
    el('s06-r-thr').textContent = f2(state.thr);
    var mf = midFar(state.chrom);
    el('s06-r-mid').textContent = mf.map(function(x){ return x[0].toFixed(1); }).join(' / ');
    el('s06-r-far').textContent = mf.map(function(x){ return x[1].toFixed(1); }).join(' / ');
    el('s06-r-win').textContent = r.ratio.map(f2).join(' / ');
    el('s06-r-t').textContent = fmt(r.within[0]) + ' / ' + fmt(r.pooled);
    drawTree('s06-tree-a', simWindow(state.seed, state.win, state.sc, s, tau), 'Local tree at ' + posMb(state.win) + ' Mb');
    drawTree('s06-tree-b', simWindow(state.seed, 10, state.sc, s, tau), 'Local tree at ' + posMb(10) + ' Mb, far from the middle');
    verdict();
  }
  function run(){
    state.chrom = simChrom(state.seed, state.sc, SV[+sS.value], +sT.value);
    update();
  }
  function dis(){ var off = state.sc !== 'sweep'; sS.disabled = off; sT.disabled = off; }
  el('s06-sc').addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    state.sc = b.getAttribute('data-v');
    Array.prototype.forEach.call(el('s06-sc').querySelectorAll('button'), function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    dis(); run();
  });
  sS.addEventListener('input', run);
  sT.addEventListener('input', run);
  sQ.addEventListener('input', update);
  sW.addEventListener('input', function(){ state.win = +sW.value; update(); });
  el('s06-new').addEventListener('click', function(){ state.seed = (state.seed * 1103515245 + 12345) & 0x7fffffff; run(); });
  state.back = simBack(977, CH.nBack);
  dis(); run();
})();
