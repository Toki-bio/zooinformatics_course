(function(){
  var fig = document.getElementById('s03-fig');
  if (!fig) return;
  var NS = 'http://www.w3.org/2000/svg';
  var el = function(id){ return document.getElementById(id); };
  var NA = 100000;           // ancestral size (diploid individuals)
  var SHAPE = 4;             // gamma shape of the per-segment age blur (about 2 hets per segment)
  var TMAX = 15, ALPHA = 0.1, NITER = 25, NBOOT = 20;
  var seed = 7;
  var ctl = { t: el('s03-t'), d: el('s03-d'), w: el('s03-w') };
  var segVal = { after: 'rec', pat: '4+25*2+4+6', n: 30000 };

  function rng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---- true history: list of [start, end, N] pieces in generations (g = 1 year in the toy)
  function history(){
    var mid = Math.pow(10, +ctl.t.value), len = Math.pow(10, +ctl.w.value), nb = NA * Math.pow(10, +ctl.d.value);
    var a = Math.max(0, mid - len / 2), b = mid + len / 2;
    if (segVal.after === 'low') return [[0, b, nb], [b, Infinity, NA]];
    var p = [];
    if (a > 0) p.push([0, a, NA]);
    p.push([a, b, nb]); p.push([b, Infinity, NA]);
    return p;
  }
  function cumH(h, t){              // integral of 1/(2N) from 0 to t
    var s = 0;
    for (var i = 0; i < h.length; i++){
      var a = h[i][0], b = Math.min(h[i][1], t);
      if (b > a) s += (b - a) / (2 * h[i][2]);
      if (h[i][1] >= t) break;
    }
    return s;
  }
  function sizeAt(h, t){ for (var i = 0; i < h.length; i++) if (t < h[i][1]) return h[i][2]; return NA; }

  // ---- observation bins (blurred segment ages), log-spaced
  var OB = [0]; (function(){ for (var e = 1; e <= 8.0001; e += 1 / 30) OB.push(Math.pow(10, e)); OB.push(Infinity); })();
  var NOB = OB.length - 1;
  function gcdf(y){                  // Gamma(shape SHAPE, rate SHAPE) CDF, integer shape
    if (y <= 0) return 0; if (!isFinite(y)) return 1;
    var x = SHAPE * y, s = 0, term = 1;
    for (var i = 0; i < SHAPE; i++){ if (i > 0) term *= x / i; s += term; }
    return 1 - Math.exp(-x) * s;
  }
  function obsRow(t, out, w){        // add w * P(observed bin | true age t) into out
    var prev = 0;
    for (var j = 0; j < NOB; j++){
      var c = gcdf(OB[j + 1] / t);
      out[j] += w * (c - prev); prev = c;
      if (c > 1 - 1e-12){ break; }
    }
  }

  // ---- truth: distribution of blurred ages; N0 from mean coalescence time
  function truth(h){
    var pts = [0]; for (var e = -1; e <= 8.6; e += 0.01) pts.push(Math.pow(10, e));
    var S = pts.map(function(t){ return Math.exp(-cumH(h, t)); });
    var obs = new Float64Array(NOB), meanT = 0;
    for (var i = 0; i + 1 < pts.length; i++){
      var m = S[i] - S[i + 1], tm = i === 0 ? pts[1] / 2 : Math.sqrt(pts[i] * pts[i + 1]);
      meanT += (S[i] + S[i + 1]) / 2 * (pts[i + 1] - pts[i]);
      if (m > 1e-15) obsRow(tm, obs, m * tm);   // segments counted, not bases: weight by age
    }
    var tot = 0; for (j = 0; j < NOB; j++) tot += obs[j];
    for (var j = 0; j < NOB; j++) obs[j] /= tot;
    return { obs: obs, N0: meanT / 2 };
  }

  // ---- PSMC time intervals and pattern groups (core.c, cli.c)
  function parsePattern(p){
    var map = [], g = 0;
    p.split('+').forEach(function(part){
      var m = part.split('*'), rep = m.length > 1 ? +m[0] : 1, w = +m[m.length - 1];
      for (var r = 0; r < rep; r++){ for (var k = 0; k < w; k++) map.push(g); g++; }
    });
    return { map: map, nG: g };
  }
  function intervals(nAt, N0){
    var n = nAt - 1, beta = Math.log(1 + TMAX / ALPHA) / n, T = [];
    for (var k = 0; k < n; k++) T.push(2 * N0 * ALPHA * (Math.exp(beta * k) - 1));
    T.push(2 * N0 * TMAX); T.push(Infinity);
    return T;                        // nAt + 1 boundaries
  }
  var SUB = 12;
  function buildP(T){
    var nAt = T.length - 1, P = [];
    for (var k = 0; k < nAt - 1; k++){
      var row = new Float64Array(NOB), a = T[k], b = T[k + 1];
      var ts = [], tw = 0;
      for (var i = 0; i < SUB; i++){ ts.push(a + (i + 0.5) / SUB * (b - a)); tw += ts[i]; }
      for (i = 0; i < SUB; i++) obsRow(ts[i], row, ts[i] / tw);
      P.push(row);
    }
    P.push(null);                     // tail row depends on lambda
    return P;
  }
  function tailRow(a, mean){
    var row = new Float64Array(NOB);
    var ts = [], tw = 0;
    for (var i = 0; i < SUB; i++){ ts.push(a - Math.log(1 - (i + 0.5) / SUB) * mean); tw += ts[i]; }
    for (i = 0; i < SUB; i++) obsRow(ts[i], row, ts[i] / tw);
    return row;
  }

  function fitEM(counts, T, P, pat, N0){
    var nAt = T.length - 1, lam = new Float64Array(pat.nG).fill(1);
    var pi = new Float64Array(nAt), E = new Float64Array(nAt), h = new Float64Array(nAt), tb = new Float64Array(nAt);
    for (var it = 0; it < NITER; it++){
      for (var k = 0; k < nAt; k++) h[k] = 1 / (2 * N0 * lam[pat.map[k]]);
      var S = 1;
      for (k = 0; k < nAt - 1; k++){
        var tau0 = T[k + 1] - T[k], x0 = h[k] * tau0, q = Math.exp(-x0);
        tb[k] = T[k] + (x0 < 1e-6 ? tau0 / 2 : 1 / h[k] - tau0 * q / (1 - q));   // mean age of coalescences in the interval
        pi[k] = S * (1 - q) * tb[k]; S *= q;
      }
      tb[nAt - 1] = T[nAt - 1] + 1 / h[nAt - 1];
      pi[nAt - 1] = S * tb[nAt - 1];
      var ps = 0; for (k = 0; k < nAt; k++) ps += pi[k]; for (k = 0; k < nAt; k++) pi[k] /= ps;
      P[nAt - 1] = tailRow(T[nAt - 1], 1 / h[nAt - 1]);
      E.fill(0);
      for (var j = 0; j < NOB; j++){
        var c = counts[j]; if (!(c > 0)) continue;
        var den = 0; for (k = 0; k < nAt; k++) den += pi[k] * P[k][j];
        if (den <= 0) continue;
        var f = c / den; for (k = 0; k < nAt; k++) E[k] += f * pi[k] * P[k][j];
      }
      for (k = 0; k < nAt; k++) E[k] /= tb[k];      // segment counts -> coalescence mass
      var ev = new Float64Array(pat.nG), ex = new Float64Array(pat.nG), A = 0;
      for (k = nAt - 1; k >= 0; k--){
        A += E[k];
        if (k === nAt - 1) continue;
        var tau = T[k + 1] - T[k], hk = h[k], x = hk * tau;
        var mk = x < 1e-6 ? tau / 2 : 1 / hk - tau * Math.exp(-x) / (1 - Math.exp(-x));
        ev[pat.map[k]] += E[k]; ex[pat.map[k]] += (A - E[k]) * tau + E[k] * mk;
      }
      for (var g = 0; g < pat.nG; g++){
        var l = ev[g] > 1e-9 ? ex[g] / (2 * N0 * ev[g]) : 1e3;
        lam[g] = Math.min(1e3, Math.max(1e-3, l));
      }
    }
    return lam;
  }
  function sample(obs, n, r){
    var cum = new Float64Array(NOB), s = 0, out = new Float64Array(NOB);
    for (var j = 0; j < NOB; j++){ s += obs[j]; cum[j] = s; }
    for (var i = 0; i < n; i++){
      var u = r() * s, lo = 0, hi = NOB - 1;
      while (lo < hi){ var m = (lo + hi) >> 1; if (cum[m] < u) lo = m + 1; else hi = m; }
      out[lo]++;
    }
    return out;
  }

  // ---- drawing
  function css(v){ return 'var(' + v + ')'; }
  function mk(tag, attrs, txt){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  var W = 960, X0 = 74, X1 = 940, Y0 = 18, Y1 = 318, XMIN = 3, XMAX = 7, YMIN = Math.log10(300), YMAX = Math.log10(5e6);
  function xp(t){ var l = Math.log10(Math.max(t, 1)); return X0 + (Math.min(Math.max(l, XMIN), XMAX) - XMIN) / (XMAX - XMIN) * (X1 - X0); }
  function yp(N){ var l = Math.log10(Math.max(N, 1)); return Y1 - (Math.min(Math.max(l, YMIN), YMAX) - YMIN) / (YMAX - YMIN) * (Y1 - Y0); }
  function fmtN(n){ return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + ' M' : n >= 1e4 ? Math.round(n / 1000) + ',000' : Math.round(n).toLocaleString('en-US'); }
  function fmtT(t){ if (t <= 0) return 'now'; return t >= 1e6 ? (t / 1e6).toFixed(t >= 1e7 ? 0 : 2) + ' Mya' : t >= 1e3 ? (t / 1e3).toFixed(t >= 1e4 ? 0 : 1) + ' kya' : Math.round(t) + ' ya'; }
  function fmtY(t){ return t >= 1e6 ? (t / 1e6).toFixed(1) + ' My' : (t / 1e3).toFixed(t >= 1e4 ? 0 : 1) + ' ky'; }

  function groupSteps(lam, T, pat, N0){       // [[start, end, N]] per group
    var out = [], nAt = T.length - 1;
    for (var k = 0; k < nAt; k++){
      var g = pat.map[k];
      if (!out.length || out[out.length - 1].g !== g) out.push({ g: g, a: T[k], b: T[k + 1], N: lam[g] * N0 });
      else out[out.length - 1].b = T[k + 1];
    }
    return out;
  }
  function stepPath(steps){
    var d = '';
    steps.forEach(function(s, i){
      var xa = xp(s.a), xb = xp(Math.min(s.b, 1e9)), y = yp(s.N);
      if (xb <= X0 || xa >= X1) return;
      d += (d ? 'L' : 'M') + xa.toFixed(1) + ' ' + y.toFixed(1) + 'L' + xb.toFixed(1) + ' ' + y.toFixed(1);
    });
    return d;
  }

  function legend(){
    var lg = el('s03-legend'); lg.replaceChildren();
    [['--accent', 'true history (IICR = size here: one panmictic population)'], ['--het', 'PSMC-like fit to all segments'], ['--err', NBOOT + ' bootstrap fits']].forEach(function(x){
      var s = document.createElement('span'), i = document.createElement('i');
      i.style.background = css(x[0]); if (x[0] === '--het') i.style.height = '3px';
      s.appendChild(i); s.appendChild(document.createTextNode(x[1])); lg.appendChild(s);
    });
    var s = document.createElement('span'), i = document.createElement('i');
    i.style.background = css('--accent'); i.style.opacity = '.25'; i.style.height = '10px';
    s.appendChild(i); s.appendChild(document.createTextNode('one block = one free parameter (-p group)')); lg.appendChild(s);
  }

  function update(){
    var h = history(), tr = truth(h), N0 = tr.N0;
    var pat = parsePattern(segVal.pat), T = intervals(pat.map.length, N0), P = buildP(T);
    var counts = new Float64Array(NOB); for (var j = 0; j < NOB; j++) counts[j] = tr.obs[j] * segVal.n;
    var lam = fitEM(counts, T, P, pat, N0), fit = groupSteps(lam, T, pat, N0);
    var r = rng(seed), boots = [];
    for (var b = 0; b < NBOOT; b++) boots.push(groupSteps(fitEM(sample(tr.obs, segVal.n, r), T, P, pat, N0), T, pat, N0));

    var svg = mk('svg', { viewBox: '0 0 ' + W + ' 410', width: '100%', role: 'img', 'aria-label': 'True population size history, PSMC-like fit and bootstrap fits on log-log axes' });
    svg.style.minWidth = '640px';
    // grid + axes
    for (var e = XMIN; e <= XMAX; e++){
      var x = xp(Math.pow(10, e));
      svg.appendChild(mk('line', { x1: x, x2: x, y1: Y0, y2: Y1, class: 'grid', stroke: css('--line') }));
      svg.appendChild(mk('text', { x: x, y: 386, 'text-anchor': 'middle', class: 'lab' }, ['1 ky', '10 ky', '100 ky', '1 My', '10 My'][e - 3]));
    }
    [1e3, 1e4, 1e5, 1e6].forEach(function(N, i){
      var y = yp(N);
      svg.appendChild(mk('line', { x1: X0, x2: X1, y1: y, y2: y, class: 'grid', stroke: css('--line') }));
      svg.appendChild(mk('text', { x: X0 - 6, y: y + 4, 'text-anchor': 'end', class: 'lab' }, ['1,000', '10,000', '100,000', '1 M'][i]));
    });
    svg.appendChild(mk('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, fill: 'none', stroke: css('--muted'), 'stroke-width': 1 }));
    svg.appendChild(mk('text', { x: (X0 + X1) / 2, y: 404, 'text-anchor': 'middle', class: 'lab' }, 'years ago (toy: 1 generation = 1 year)'));
    var yl = mk('text', { x: 14, y: (Y0 + Y1) / 2, 'text-anchor': 'middle', class: 'lab', transform: 'rotate(-90 14 ' + ((Y0 + Y1) / 2) + ')' }, 'effective size (log)');
    svg.appendChild(yl);
    // group strip
    var strip = groupSteps(lam, T, pat, N0);
    strip.forEach(function(s, i){
      var xa = Math.max(X0, xp(s.a === 0 ? 1 : s.a)), xb = Math.min(X1, xp(Math.min(s.b, 1e9)));
      if (s.a === 0) xa = X0;
      if (xb <= xa) return;
      svg.appendChild(mk('rect', { x: xa, y: 334, width: Math.max(0.8, xb - xa - 0.8), height: 12, fill: css('--accent'), opacity: i % 2 ? 0.45 : 0.2 }));
    });
    svg.appendChild(mk('text', { x: X0 - 6, y: 344, 'text-anchor': 'end', class: 'lab' }, '-p groups'));
    var g0 = strip[0];
    if (xp(g0.b) > X0 + 40) svg.appendChild(mk('text', { x: (X0 + xp(g0.b)) / 2, y: 362, 'text-anchor': 'middle', class: 'lab' }, 'group 1'));
    // bootstraps
    boots.forEach(function(st){ svg.appendChild(mk('path', { d: stepPath(st), fill: 'none', stroke: css('--err'), 'stroke-width': 1, opacity: 0.8 })); });
    // truth
    var tst = h.map(function(p){ return { a: p[0], b: p[1], N: p[2] }; });
    svg.appendChild(mk('path', { d: stepPath(tst), fill: 'none', stroke: css('--accent'), 'stroke-width': 2.2 }));
    svg.appendChild(mk('path', { d: stepPath(fit), fill: 'none', stroke: css('--het'), 'stroke-width': 3 }));
    // runaway marker
    var top = boots.reduce(function(n, st){ return n + (st.some(function(s){ return s.N > 4e6 && xp(s.b) > X0 + 2; }) ? 1 : 0); }, 0);
    if (top) svg.appendChild(mk('text', { x: X0 + 6, y: Y0 + 14, class: 'lab', fill: css('--bad') }, top + ' bootstrap(s) run off the top'));
    fig.replaceChildren(svg);

    // ---- readout
    var tmin = h.reduce(function(m, p){ return p[2] < m[2] ? p : m; });
    var fmin = fit.reduce(function(m, s){ return s.N < m.N ? s : m; });
    var spread = fit.map(function(s, i){
      var v = boots.map(function(st){ return st[i].N; }).sort(function(a, b){ return a - b; });
      return v[NBOOT - 2] / v[1];
    });
    var ok = fit.map(function(s, i){ return spread[i] < 2; });
    var first = ok.indexOf(true), last = ok.lastIndexOf(true);
    var out = el('s03-out'); out.replaceChildren();
    function cell(label, tip, val, sub){
      var d = document.createElement('div'), s = document.createElement('span');
      s.className = 'tip'; s.title = tip; s.textContent = label; d.appendChild(s);
      var bb = document.createElement('b'); bb.textContent = val; d.appendChild(bb);
      if (sub){ var sm = document.createElement('span'); sm.textContent = sub; d.appendChild(sm); }
      out.appendChild(d);
    }
    cell('N₀ (the scale)', 'PSMC reports sizes relative to N0, which it gets from the average heterozygosity (theta0 = 4 N0 mu per bin). In the toy N0 = half the mean coalescence time in generations.', fmtN(N0), 'group 1 spans 0 to ' + fmtT(fit[0].b));
    cell('True minimum', 'The smallest size in the history you set, and when it held.', fmtN(tmin[2]), fmtT(tmin[0]) + ' to ' + fmtT(tmin[1]));
    cell('Fitted minimum', 'The lowest step of the orange fit and the time span of that step. Depth = fitted minimum divided by true minimum; 1 would be perfect.', fmtN(fmin.N), (fmin.b === Infinity ? 'before ' + fmtT(fmin.a) : fmtT(fmin.a) + ' to ' + fmtT(fmin.b)) + '; ' + (fmin.N / tmin[2]).toFixed(1) + '× the true minimum');
    cell('Bootstrap spread under 2-fold', 'Time range where the 2nd-highest bootstrap is less than twice the 2nd-lowest, i.e. the middle 90 % of the 20 bootstrap fits agree within a factor of 2. It measures only sampling noise in this toy.', first < 0 ? 'nowhere' : fmtT(fit[first].a) + ' to ' + fmtT(fit[last].b === Infinity ? fit[last].a : fit[last].b), 'first group: ' + spread[0].toFixed(1) + '×, last group: ' + spread[spread.length - 1].toFixed(1) + '×');
  }

  function out(id, txt){ el(id).textContent = txt; }
  function labels(){
    out('s03-t-o', fmtT(Math.pow(10, +ctl.t.value)));
    var dd = Math.pow(10, +ctl.d.value) * 100;
    out('s03-d-o', (dd < 10 ? dd.toFixed(1) : Math.round(dd)) + ' % (' + fmtN(NA * dd / 100) + ')');
    out('s03-w-o', fmtY(Math.pow(10, +ctl.w.value)));
  }
  var timer = 0;
  function schedule(){ labels(); clearTimeout(timer); timer = setTimeout(update, 60); }
  ['t', 'd', 'w'].forEach(function(k){ ctl[k].addEventListener('input', schedule); });
  ['after', 'pat', 'n'].forEach(function(k){
    var grp = el('s03-' + k);
    grp.addEventListener('click', function(ev){
      var bt = ev.target.closest('button'); if (!bt) return;
      grp.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed', x === bt ? 'true' : 'false'); });
      segVal[k] = k === 'n' ? +bt.dataset.v : bt.dataset.v; schedule();
    });
  });
  el('s03-new').addEventListener('click', function(){ seed = (seed * 1103515245 + 12345) & 0x7fffffff; update(); });
  legend(); labels(); update();
})();
