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
  // SIM-BEGIN: a chromosome pair under the model PSMC assumes, and a small reader for it.
  // History h = { b: period starts in generations, N: size per period }.
  function psH(h, t){                      // coalescent time passed by generation t: sum of generations / 2N
    var s = 0;
    for (var i = 0; i < h.N.length; i++){
      var a = h.b[i], e = i + 1 < h.N.length ? h.b[i + 1] : Infinity;
      if (t <= a) break;
      s += (Math.min(t, e) - a) / (2 * h.N[i]);
    }
    return s;
  }
  function psHinv(h, x){                   // the generation at which that much coalescent time has passed
    var s = 0;
    for (var i = 0; i < h.N.length; i++){
      var a = h.b[i], e = i + 1 < h.N.length ? h.b[i + 1] : Infinity, d = (e - a) / (2 * h.N[i]);
      if (s + d >= x) return a + (x - s) * 2 * h.N[i];
      s += d;
    }
    return Infinity;
  }
  function psPois(r, m){
    if (m <= 0) return 0;
    if (m < 30){ var Lm = Math.exp(-m), k = 0, p = 1; do { k++; p *= r(); } while (p > Lm); return k - 1; }
    var z = Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r());
    return Math.max(0, Math.round(m + Math.sqrt(m) * z));
  }
  // Walk along the pair. A stretch of time T ends at a recombination (rate 2 r T per base). The break
  // falls at a height u uniform on 0..T; the cut line floats up from u and meets again at a rate
  // 1/(2N) per generation. This is the transition q(t|s) of Li & Durbin 2011.
  function psChrom(h, rec, mu, len, r){
    var seg = [], het = [], pos = 0, T = psHinv(h, -Math.log(1 - r()));
    while (pos < len){
      var L = rec > 0 ? -Math.log(1 - r()) / (2 * rec * T) : len;
      if (pos + L > len) L = len - pos;
      var k = psPois(r, 2 * mu * T * L), n0 = het.length;
      for (var j = 0; j < k; j++) het.push(pos + r() * L);
      seg.push({ a: pos, L: L, T: T, k: k, h0: n0 });
      pos += L;
      var u = r() * T;
      T = psHinv(h, psH(h, u) - Math.log(1 - r()));
    }
    het.sort(function(a, b){ return a - b; });
    return { seg: seg, het: het, len: len };
  }
  // PSMC's own interval boundaries (core.c): t_k = 0.1 (exp(beta k) - 1) in units of 2 N0, last open.
  function psIntervals(n, tmax, N0){
    var beta = Math.log(1 + tmax / 0.1) / n, t = [];
    for (var k = 0; k <= n; k++) t.push(0.1 * (Math.exp(beta * k) - 1) * 2 * N0);
    return t;                              // n + 1 states: state k runs from t[k] to t[k + 1], the last to infinity
  }
  function psBins(c, size){
    var nb = Math.floor(c.len / size), o = new Uint8Array(nb);
    c.het.forEach(function(x){ var b = Math.floor(x / size); if (b < nb) o[b] = 1; });
    return o;
  }
  // What the model expects when the size in state k is Nk[k]: share of the genome per state,
  // mean time per state, chance of a het bin, and the transition matrix between neighbouring bins.
  function psModel(t, Nk, rec, mu, size){
    var K = t.length, hh = { b: t, N: Nk }, sig = new Float64Array(K), tb = new Float64Array(K), e1 = new Float64Array(K), S = 1, k, l;
    for (k = 0; k < K; k++){
      var hz = 1 / (2 * Nk[k]);
      if (k === K - 1){ sig[k] = S; tb[k] = t[k] + 1 / hz; break; }
      var tau = t[k + 1] - t[k], ex = Math.exp(-hz * tau);
      sig[k] = S * (1 - ex); S *= ex;
      tb[k] = t[k] + 1 / hz - tau * ex / (1 - ex);
    }
    var A = new Float64Array(K * K), Ht = t.map(function(x){ return psH(hh, x); });
    for (k = 0; k < K; k++){
      e1[k] = 1 - Math.exp(-2 * mu * size * tb[k]);
      var pr = 1 - Math.exp(-2 * rec * size * tb[k]), NU = 24;
      for (var q = 0; q < NU; q++){
        var u = (q + 0.5) / NU * tb[k], Hu = psH(hh, u);
        for (l = 0; l < K; l++){
          var hi = l + 1 < K ? Ht[l + 1] : Infinity;
          if (hi <= Hu) continue;
          A[k * K + l] += pr / NU * (Math.exp(-(Math.max(Ht[l], Hu) - Hu)) - (hi === Infinity ? 0 : Math.exp(-(hi - Hu))));
        }
      }
      A[k * K + k] += 1 - pr;
    }
    return { K: K, sig: sig, tb: tb, e1: e1, A: A };
  }
  // Forward-backward over the bins: for each bin, how probable is each time interval?
  function psPosterior(m, bins, keep){
    var K = m.K, n = bins.length, F = new Float64Array(n * K), sc = new Float64Array(n), A = m.A, e1 = m.e1;
    var post = new Float64Array(K), meanT = keep ? new Float32Array(n) : null, b = new Float64Array(K), b2 = new Float64Array(K), i, k, l, s;
    for (i = 0; i < n; i++){
      var o = bins[i], base = i * K, pb = base - K; s = 0;
      for (l = 0; l < K; l++){
        var v = 0;
        if (i === 0) v = m.sig[l];
        else for (k = 0; k < K; k++) v += F[pb + k] * A[k * K + l];
        v *= o ? e1[l] : 1 - e1[l];
        F[base + l] = v; s += v;
      }
      sc[i] = s; s = 1 / s;
      for (l = 0; l < K; l++) F[base + l] *= s;
    }
    for (k = 0; k < K; k++) b[k] = 1;
    for (i = n - 1; i >= 0; i--){
      var tot = 0, w = 0;
      for (k = 0; k < K; k++) tot += F[i * K + k] * b[k];
      for (k = 0; k < K; k++){ var g = F[i * K + k] * b[k] / tot; post[k] += g; w += g * Math.log(m.tb[k]); }
      if (keep) meanT[i] = Math.exp(w);
      if (i === 0) break;
      var ob = bins[i];
      for (l = 0; l < K; l++) b2[l] = b[l] * (ob ? e1[l] : 1 - e1[l]);
      for (k = 0; k < K; k++){
        var v2 = 0;
        for (l = 0; l < K; l++) v2 += A[k * K + l] * b2[l];
        b[k] = v2 / sc[i];
      }
    }
    for (k = 0; k < K; k++) post[k] /= n;
    return { share: post, meanT: meanT };
  }
  // The link between counts and size: of the share still separate on entering an interval, the part
  // that meets inside it gives the rate; size = 1 / (2 x rate). A share of 0 gives no size.
  function psRate(t, share){
    var K = t.length, S = 1, N = new Float64Array(K), left = new Float64Array(K);
    for (var k = 0; k < K; k++){
      left[k] = S;
      if (k === K - 1 || S <= 0){ N[k] = NaN; continue; }
      var f = Math.min(share[k] / S, 1 - 1e-9), tau = t[k + 1] - t[k];
      N[k] = f > 0 ? tau / (2 * -Math.log(1 - f)) : Infinity;
      S -= share[k];
    }
    return { N: N, left: left };
  }
  // Rounds of reading: start from one size that matches the het density, as PSMC does, then alternate
  // "how probable is each interval in each bin" and "which sizes give those shares".
  function psRead(c, t, rec, mu, size, rounds){
    var bins = psBins(c, size), K = t.length, nh = 0, i, k, r0;
    for (i = 0; i < bins.length; i++) nh += bins[i];
    var th = -Math.log(1 - Math.min(nh / bins.length, 0.99)) / size, N0 = Math.max(100, th / (4 * mu));
    var Nk = []; for (k = 0; k < K; k++) Nk.push(N0);
    var res;
    for (r0 = 0; r0 < rounds; r0++){
      var m = psModel(t, Nk, rec, mu, size);
      res = psPosterior(m, bins, r0 === rounds - 1);
      res.tb = m.tb;
      var rt = psRate(t, res.share), nn = [];
      for (k = 0; k < K; k++){
        var v = rt.N[k];
        if (!isFinite(v) || rt.left[k] < 0.02) v = k > 0 ? nn[k - 1] : N0;
        nn.push(Math.min(1e6, Math.max(100, v)));
      }
      Nk = nn; res.left = rt.left;
    }
    res.N = Nk; res.N0 = N0;
    return res;
  }
  // Share of the chromosome whose true time lies in each interval (each stretch counted by its length).
  function psShares(c, t){
    var K = t.length, o = new Float64Array(K);
    c.seg.forEach(function(s){ var k = psState(t, s.T); o[k] += s.L / c.len; });
    return o;
  }
  function psState(t, T){ var k = t.length - 1; while (k > 0 && t[k] > T) k--; return k; }
  // SIM-END
  // --- The principle of PSMC: walk along a chromosome pair, click a stretch, read the sizes back
  function psmcPrinciple(){
    if (!document.getElementById('s03-pr-curve')) return;
    var MU = 2.5e-8, BIN = 100, LEN = 1e7, N0 = 10000, ROUNDS = 5, ZLEN = 100000, TOPT = 1e6, LOWT = 300;
    var B = [0, 2000, 10000, 50000];
    var NV = [1000, 2000, 3000, 5000, 7000, 10000, 15000, 20000, 30000, 50000, 70000, 100000];
    var RV = [0, 1e-10, 1e-9, 3e-9, 1e-8, 3e-8, 1e-7];
    var RT = ['0 (no recombination)', '1 × 10⁻¹⁰', '1 × 10⁻⁹', '3 × 10⁻⁹', '1 × 10⁻⁸', '3 × 10⁻⁸', '1 × 10⁻⁷'];
    var t = psIntervals(11, 15, N0), K = t.length;
    var sl = [0, 1, 2, 3].map(function(i){ return el('s03-pr-n' + i); });
    var st = { seed: 2011, c: null, sel: 0, read: null, job: 0, rounds: 0 };
    function width(h){ return Math.max(300, Math.min(900, h.clientWidth || 640)); }
    function n0(v){ return Math.round(v).toLocaleString('en-US'); }
    function gen(v){ return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1000 ? Math.round(v / 1000) + 'k' : String(Math.round(v)); }
    function hist(){ return { b: B, N: sl.map(function(s){ return NV[+s.value]; }) }; }
    function rec(){ return RV[+el('s03-pr-r').value]; }
    function box(label, val, tip){
      var d = document.createElement('div'), s = document.createElement('span'), b = document.createElement('b');
      s.textContent = label; if (tip){ s.className = 'tip'; s.title = tip; }
      b.textContent = val; d.appendChild(s); d.appendChild(b); return d;
    }
    // share of the genome expected in interval k for the true history
    function expected(h){
      return t.map(function(x, k){ return Math.exp(-psH(h, x)) - (k + 1 < K ? Math.exp(-psH(h, t[k + 1])) : 0); });
    }

    // ---- curve: size through time (top) and share of the chromosome per interval (bottom), one time axis
    function drawCurve(){
      var host = el('s03-pr-curve'), W = width(host), x0 = 58, x1 = W - 14, h = hist(), c = st.c;
      var yA = 24, hA = 130, yB = 196, hB = 110, H = yB + hB + 42;
      var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Top: population size through time, true and estimated. Bottom: share of the chromosome whose two copies met in each time interval.' });
      svg.style.minWidth = '300px';
      function X(v){ return x0 + (Math.log10(Math.min(TOPT, Math.max(v, LOWT))) - Math.log10(LOWT)) / (Math.log10(TOPT) - Math.log10(LOWT)) * (x1 - x0); }
      function Y(n){ return yA + hA - (Math.log10(Math.min(1e6, Math.max(n, 300))) - Math.log10(300)) / (6 - Math.log10(300)) * hA; }
      svg.appendChild(mk('text', { x: x0, y: 12, 'class': 'lab' }, 'Population size through time'));
      [1e3, 1e4, 1e5, 1e6].forEach(function(n){
        svg.appendChild(mk('line', { x1: x0, x2: x1, y1: Y(n), y2: Y(n), 'class': 'grid' }));
        svg.appendChild(mk('text', { x: x0 - 6, y: Y(n) + 4, 'text-anchor': 'end' }, gen(n)));
      });
      var d = '';
      h.N.forEach(function(n, i){ d += (i ? 'L' : 'M') + X(h.b[i]).toFixed(1) + ' ' + Y(n).toFixed(1) + 'L' + X(i + 1 < 4 ? h.b[i + 1] : TOPT).toFixed(1) + ' ' + Y(n).toFixed(1); });
      svg.appendChild(mk('path', { d: d, fill: 'none', stroke: css('--fg'), 'stroke-width': 1.8, 'stroke-dasharray': '6 3' }));
      var many = c.seg.length >= 3;
      function steps(Ns, left, col, w){
        var p = '', on = false;
        for (var k = 0; k + 1 < K; k++){
          if (!(left[k] >= 0.02) || !isFinite(Ns[k])){ on = false; continue; }
          p += (on ? 'L' : 'M') + X(t[k]).toFixed(1) + ' ' + Y(Ns[k]).toFixed(1) + 'L' + X(t[k + 1]).toFixed(1) + ' ' + Y(Ns[k]).toFixed(1); on = true;
        }
        if (p) svg.appendChild(mk('path', { d: p, fill: 'none', stroke: css(col), 'stroke-width': w }));
      }
      var sh = psShares(c, t), cnt = psRate(t, sh);
      if (many) steps(cnt.N, cnt.left, '--accent', 2);
      if (many && st.read) steps(st.read.N, st.read.left, '--het', 2.4);
      if (!many) svg.appendChild(mk('text', { x: (x0 + x1) / 2, y: yA + hA / 2 + 4, 'text-anchor': 'middle', 'class': 'lab' }, 'one date only: no curve can be drawn'));
      // shares
      var ex = expected(h), mx = 0.1, k;
      for (k = 0; k < K; k++) mx = Math.max(mx, sh[k], ex[k], st.read ? st.read.share[k] : 0);
      mx = Math.ceil(mx * 10) / 10;
      function V(v){ return yB + hB - v / mx * hB; }
      svg.appendChild(mk('text', { x: x0, y: yB - 12, 'class': 'lab' }, 'Share of chromosome met per interval'));
      svg.appendChild(mk('line', { x1: x0, x2: x1, y1: yB + hB, y2: yB + hB, 'class': 'ax' }));
      [mx / 2, mx].forEach(function(v){ svg.appendChild(mk('line', { x1: x0, x2: x1, y1: V(v), y2: V(v), 'class': 'grid' })); svg.appendChild(mk('text', { x: x0 - 6, y: V(v) + 4, 'text-anchor': 'end' }, Math.round(v * 100) + ' %')); });
      var selK = psState(t, c.seg[st.sel].T), de = '', dr = '';
      for (k = 0; k < K; k++){
        var xa = X(t[k]), xb = X(k + 1 < K ? t[k + 1] : TOPT);
        svg.appendChild(mk('rect', { x: xa + 1, y: V(sh[k]), width: Math.max(1, xb - xa - 2), height: yB + hB - V(sh[k]), fill: css('--accent'), opacity: '0.75' }));
        if (k === selK) svg.appendChild(mk('rect', { x: xa + 0.5, y: yB, width: Math.max(1, xb - xa - 1), height: hB, fill: 'none', stroke: css('--bad'), 'stroke-width': 1.6 }));
        de += 'M' + xa.toFixed(1) + ' ' + V(ex[k]).toFixed(1) + 'H' + xb.toFixed(1);
        if (st.read) dr += 'M' + xa.toFixed(1) + ' ' + V(st.read.share[k]).toFixed(1) + 'H' + xb.toFixed(1);
      }
      svg.appendChild(mk('path', { d: de, fill: 'none', stroke: css('--fg'), 'stroke-width': 1.6, 'stroke-dasharray': '4 3' }));
      if (dr) svg.appendChild(mk('path', { d: dr, fill: 'none', stroke: css('--het'), 'stroke-width': 3 }));
      var ticks = W < 470 ? [1e3, 1e4, 1e5, 1e6] : [300, 1e3, 3e3, 1e4, 3e4, 1e5, 3e5, 1e6];
      ticks.forEach(function(v){
        svg.appendChild(mk('line', { x1: X(v), x2: X(v), y1: yB + hB, y2: yB + hB + 4, 'class': 'ax' }));
        svg.appendChild(mk('text', { x: X(v), y: yB + hB + 17, 'text-anchor': v === TOPT ? 'end' : 'middle' }, gen(v)));
      });
      svg.appendChild(mk('text', { x: (x0 + x1) / 2, y: H - 6, 'text-anchor': 'middle' }, 'generations before today (log scale)'));
      host.replaceChildren(svg);
    }

    // ---- chromosome: whole length with the window, then the window with its stretches
    function zoomStart(){ return +el('s03-pr-z').value * 1e6; }
    function drawChrom(){
      var host = el('s03-pr-chrom'), W = width(host), x0 = 58, x1 = W - 14, PW = x1 - x0, c = st.c, zs = zoomStart(), ze = zs + ZLEN;
      var yO = 22, hO = 44, yZ = 112, hZ = 120, yH = yZ + hZ + 10, H = yH + 48;
      var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', 'aria-label': 'Top: the time of each stretch along the whole chromosome. Below: a 100-kb window; each stretch can be clicked.' });
      svg.style.minWidth = '300px';
      function ly(T, y, h){ var l = (Math.log10(Math.min(TOPT, Math.max(T, LOWT))) - Math.log10(LOWT)) / (Math.log10(TOPT) - Math.log10(LOWT)); return y + h - l * h; }
      // whole chromosome: mean log time per pixel column
      svg.appendChild(mk('text', { x: x0, y: 12, 'class': 'lab' }, 'Whole chromosome, 10 Mb: time of the stretches'));
      var cols = Math.floor(PW), acc = new Float64Array(cols), wt = new Float64Array(cols), per = LEN / cols, i;
      c.seg.forEach(function(s){
        var a = Math.floor(s.a / per), b = Math.min(cols - 1, Math.floor((s.a + s.L) / per));
        for (var q = a; q <= b; q++){ var ov = Math.min(s.a + s.L, (q + 1) * per) - Math.max(s.a, q * per); acc[q] += ov * Math.log10(s.T); wt[q] += ov; }
      });
      var d = '';
      for (i = 0; i < cols; i++) if (wt[i] > 0) d += 'M' + (x0 + i + 0.5) + ' ' + (yO + hO) + 'V' + ly(Math.pow(10, acc[i] / wt[i]), yO, hO).toFixed(1);
      svg.appendChild(mk('path', { d: d, stroke: css('--accent'), 'stroke-width': 1, fill: 'none', opacity: '0.75', 'shape-rendering': 'crispEdges' }));
      svg.appendChild(mk('rect', { x: x0 + zs / LEN * PW, y: yO - 2, width: Math.max(3, ZLEN / LEN * PW), height: hO + 4, fill: 'none', stroke: css('--bad'), 'stroke-width': 1.5 }));
      var over = mk('rect', { x: x0, y: yO - 2, width: PW, height: hO + 4, fill: 'transparent' }); over.style.cursor = 'pointer';
      over.addEventListener('click', function(ev){
        var bb = svg.getBoundingClientRect(), f = (ev.clientX - bb.left) / bb.width * W;
        var v = Math.max(0, Math.min(9.9, (f - x0) / PW * 10 - 0.05));
        el('s03-pr-z').value = v.toFixed(2); fromWindow();
      });
      svg.appendChild(over);
      svg.appendChild(mk('text', { x: x0, y: yO + hO + 15 }, '0'));
      svg.appendChild(mk('text', { x: x1, y: yO + hO + 15, 'text-anchor': 'end' }, '10 Mb'));
      // window
      function zx(p){ return x0 + (p - zs) / ZLEN * PW; }
      svg.appendChild(mk('text', { x: x0, y: yZ - 12, 'class': 'lab' }, 'Window of 100 kb: click a stretch'));
      [1e3, 1e4, 1e5, 1e6].forEach(function(T){
        svg.appendChild(mk('line', { x1: x0, x2: x1, y1: ly(T, yZ, hZ), y2: ly(T, yZ, hZ), 'class': 'grid' }));
        svg.appendChild(mk('text', { x: x0 - 6, y: ly(T, yZ, hZ) + 4, 'text-anchor': 'end' }, gen(T)));
      });
      var lo = stretchAt(zs), dl = '', first = true, s;
      for (i = lo; i < c.seg.length && c.seg[i].a < ze; i++){
        s = c.seg[i];
        var a = Math.max(zs, s.a), b = Math.min(ze, s.a + s.L), yy = ly(s.T, yZ, hZ);
        if (i === st.sel) svg.appendChild(mk('rect', { x: zx(a), y: yZ, width: Math.max(1.5, zx(b) - zx(a)), height: hZ + 28, fill: css('--bad'), opacity: '0.14' }));
        dl += (first ? 'M' : 'L') + zx(a).toFixed(1) + ' ' + yy.toFixed(1) + 'L' + zx(b).toFixed(1) + ' ' + yy.toFixed(1); first = false;
      }
      svg.appendChild(mk('path', { d: dl, fill: 'none', stroke: css('--accent'), 'stroke-width': 2 }));
      if (st.read && st.read.meanT){
        var dr = '', b0 = Math.floor(zs / BIN), b1 = Math.min(st.read.meanT.length, Math.floor(ze / BIN));
        for (var q = b0; q < b1; q++) dr += (q === b0 ? 'M' : 'L') + zx((q + 0.5) * BIN).toFixed(1) + ' ' + ly(st.read.meanT[q], yZ, hZ).toFixed(1);
        if (dr) svg.appendChild(mk('path', { d: dr, fill: 'none', stroke: css('--het'), 'stroke-width': 1.6 }));
      }
      svg.appendChild(mk('rect', { x: x0, y: yH, width: PW, height: 16, fill: 'none', stroke: css('--line') }));
      var dt = '', nz = 0;
      c.het.forEach(function(p){ if (p >= zs && p < ze){ dt += 'M' + zx(p).toFixed(1) + ' ' + yH + 'v16'; nz++; } });
      if (dt) svg.appendChild(mk('path', { d: dt, stroke: css('--fg'), 'stroke-width': 1 }));
      svg.appendChild(mk('text', { x: x0 - 6, y: yH + 12, 'text-anchor': 'end' }, 'hets'));
      svg.appendChild(mk('text', { x: x0, y: yH + 32 }, (zs / 1e6).toFixed(2) + ' Mb'));
      svg.appendChild(mk('text', { x: x1, y: yH + 32, 'text-anchor': 'end' }, ((zs + ZLEN) / 1e6).toFixed(2) + ' Mb'));
      // click targets last, on top of everything; thin stretches get a little extra width
      for (i = lo; i < c.seg.length && c.seg[i].a < ze; i++){
        s = c.seg[i];
        var ha = zx(Math.max(zs, s.a)), hb = zx(Math.min(ze, s.a + s.L));
        var tgt = mk('rect', { x: ha, y: yZ, width: Math.max(2, hb - ha), height: hZ + 28, fill: 'transparent', 'data-i': i });
        tgt.style.cursor = 'pointer';
        tgt.appendChild(mk('title', {}, 'Stretch of ' + n0(s.L) + ' bases, met ' + n0(s.T) + ' generations ago, ' + s.k + ' hets'));
        svg.appendChild(tgt);
      }
      svg.addEventListener('click', function(ev){
        var v = ev.target.getAttribute && ev.target.getAttribute('data-i');
        if (v !== null && v !== undefined){ st.sel = +v; drawChrom(); drawTree(); drawCurve(); }
      });
      host.replaceChildren(svg);
      el('s03-pr-z-o').textContent = (zs / 1e6).toFixed(2) + ' Mb';
    }
    function stretchAt(p){
      var seg = st.c.seg, lo = 0, hi = seg.length - 1;
      while (lo < hi){ var m = (lo + hi + 1) >> 1; if (seg[m].a <= p) lo = m; else hi = m - 1; }
      return lo;
    }
    function fromWindow(){ st.sel = stretchAt(zoomStart() + ZLEN / 2); drawChrom(); drawTree(); drawCurve(); }
    function moveSel(by){
      var seg = st.c.seg, i = Math.max(0, Math.min(seg.length - 1, st.sel + by)), s = seg[i];
      st.sel = i;
      var zs = zoomStart();
      if (s.a + s.L / 2 < zs || s.a + s.L / 2 > zs + ZLEN) el('s03-pr-z').value = Math.max(0, Math.min(9.9, (s.a + s.L / 2 - ZLEN / 2) / 1e6)).toFixed(2);
      drawChrom(); drawTree(); drawCurve();
    }

    // ---- the coalescent display for the selected stretch. Rows stand for many generations on a log
    // time scale, and row width grows with the log of N: the paths are illustrative, the meeting row is not.
    var ROWS = 24;
    function rowT(g){ return g <= 0 ? 0 : LOWT * Math.pow(TOPT / LOWT, (g - 0.5) / ROWS); }
    function drawTree(){
      var host = el('s03-pr-tree'), W = width(host), s = st.c.seg[st.sel], h = hist();
      function sizeAtT(T){ var i = 3; while (i > 0 && h.b[i] > T) i--; return h.N[i]; }
      var spec = { demes: 1, size: function(g){ return 2 * Math.round(2 + 3.5 * (Math.log10(sizeAtT(rowT(g))) - 3) * 1.6); } };
      var r = rng(st.seed + st.sel * 13 + 1), pop = wfPop(spec, r);
      var M = 1; while (M < ROWS && rowT(M + 1) <= s.T) M++;
      pop.grow(ROWS + 1);
      var a = 0, b = 1, g;
      for (g = 0; g < M; g++){                 // steer the two lines so that they first meet in row M
        var pa = pop.par[g][a], pb = pop.par[g][b];
        if (g === M - 1) pb = pa;
        else while (pb === pa) pb = Math.floor(r() * spec.size(g + 1));
        pop.par[g][b] = pb; a = pa; b = pb;
      }
      var tr = wfTrace(pop, [0, 1]);
      var bse = wfBase(host, pop, { W: W, G: ROWS, x0: 58, pitch: 13, title: 'Coalescent picture of the selected stretch',
        label: function(g){ if (g === 0) return 'today'; var v = rowT(g); return g % 6 === 0 ? gen(v) : ''; },
        aria: 'Rows of gene copies through time, wider where the population was larger. The two copies of the selected stretch meet at the row of its time.' });
      wfOver(bse, tr, tr.T, { noBand: true, colour: '--accent', endLabel: 'met ' + n0(s.T) + ' generations ago' });
      var out = el('s03-pr-sel'); out.replaceChildren();
      out.appendChild(box('This stretch', n0(s.L) + ' bases, ' + s.k + (s.k === 1 ? ' het' : ' hets'), 'Bases between its two breakpoints, and the heterozygous sites on it.'));
      out.appendChild(box('True meeting time', n0(s.T) + ' generations', 'Known here only because the page simulated it.'));
      out.appendChild(box('Time from its own hets alone', s.k > 0 ? n0(s.k / (2 * MU * s.L)) + ' generations' : 'cannot say: no hets', 'Hets ÷ (2 μ × length). A rough estimate that ignores the neighbours: with a few hets it can be far off.'));
      var rd = st.c.seg.length < 3 ? 'nothing to read' : '…';
      if (st.read && st.read.meanT){
        var q0 = Math.floor(s.a / BIN), q1 = Math.max(q0 + 1, Math.min(st.read.meanT.length, Math.ceil((s.a + s.L) / BIN))), sum = 0, step = Math.max(1, Math.floor((q1 - q0) / 2000)), n = 0;
        for (var q = q0; q < q1; q += step){ sum += Math.log(st.read.meanT[q]); n++; }
        rd = n0(Math.exp(sum / n)) + ' generations';
      }
      out.appendChild(box('Time the model read here', rd, 'Average over the bins of this stretch of what the hidden Markov model believes, using all the bins of the chromosome. It sees no breakpoints, only hets.'));
    }

    function readouts(){
      var c = st.c, out = el('s03-pr-out'), h = hist(), r = rec(), z = 0; out.replaceChildren();
      c.seg.forEach(function(s){ if (s.k === 0) z++; });
      var left = Math.exp(-psH(h, 50000)), sh = [0, 0, 0, 0], i;
      c.seg.forEach(function(s){ var p = 3; while (B[p] > s.T) p--; sh[p] += s.L / c.len; });
      out.appendChild(box('Stretches on this chromosome', n0(c.seg.length), 'Number of pieces with their own meeting time: the number of samples of the coalescent in this 10-Mb pair.'));
      out.appendChild(box('Hets per stretch', (c.het.length / c.seg.length).toFixed(2) + (r > 0 ? ' (μ/r = ' + (MU / r).toFixed(2) + ')' : ''), 'Average number of heterozygous sites on a stretch. It is about μ/r whatever the age of the stretch.'));
      out.appendChild(box('Stretches with no het at all', Math.round(z / c.seg.length * 100) + ' %', 'These hold no direct evidence of their own time.'));
      var names = ['0–2k', '2k–10k', '10k–50k', 'older'];
      out.appendChild(box('Met in each period', names.map(function(n, k){ return n + ': ' + Math.round(sh[k] * 100) + ' %'; }).join(' · '), 'Share of this chromosome whose two copies met in each period of generations. A small population in a period raises its share and leaves less for older periods.'));
      out.appendChild(box('Still separate 50,000 generations back', (left * 100).toFixed(left < 0.1 ? 1 : 0) + ' %', 'Expected share of the genome that has not met by then. Only this share carries any information on older times.'));
    }

    // Reading is the slow part, so it runs one round at a time and can be overtaken by a newer job.
    function startRead(){
      var job = ++st.job, c = st.c, r = rec(), status = el('s03-pr-status');
      st.read = null;
      if (c.seg.length < 3){ status.textContent = 'With ' + (c.seg.length === 1 ? 'one stretch there is one date' : 'so few stretches there are too few dates') + ': a single sample of the history, so there is nothing to read a curve from.'; return; }
      var bins = psBins(c, BIN), nh = 0, i, k;
      for (i = 0; i < bins.length; i++) nh += bins[i];
      var th = -Math.log(1 - Math.min(nh / bins.length, 0.99)) / BIN, Ns = Math.max(100, th / (4 * MU)), Nk = [];
      for (k = 0; k < K; k++) Nk.push(Ns);
      var round = 0;
      function step(){
        if (job !== st.job) return;
        var m = psModel(t, Nk, r, MU, BIN), res = psPosterior(m, bins, true), rt = psRate(t, res.share), nn = [];
        for (k = 0; k < K; k++){
          var v = rt.N[k];
          if (!isFinite(v) || rt.left[k] < 0.02) v = k > 0 ? nn[k - 1] : Ns;
          nn.push(Math.min(1e6, Math.max(100, v)));
        }
        Nk = nn; round++;
        st.read = { share: res.share, meanT: res.meanT, N: rt.N, left: rt.left };
        drawCurve(); drawChrom(); drawTree();
        status.textContent = round < ROUNDS ? 'Reading the het bins: round ' + round + ' of ' + ROUNDS + ' …' : 'Read in ' + ROUNDS + ' rounds, from one flat starting size matched to the het density.';
        if (round < ROUNDS) setTimeout(step, 0);
      }
      status.textContent = 'Reading the het bins …';
      setTimeout(step, 30);
    }
    function regenerate(){
      sl.forEach(function(s, i){ el('s03-pr-n' + i + '-o').textContent = n0(NV[+s.value]); });
      el('s03-pr-r-o').textContent = RT[+el('s03-pr-r').value];
      st.c = psChrom(hist(), rec(), MU, LEN, rng(st.seed));
      st.read = null; st.job++;
      st.sel = stretchAt(zoomStart() + ZLEN / 2);
      readouts(); drawCurve(); drawChrom(); drawTree();
      clearTimeout(st.deb);
      st.deb = setTimeout(startRead, 160);
    }
    sl.concat([el('s03-pr-r')]).forEach(function(s){ s.addEventListener('input', regenerate); });
    el('s03-pr-new').addEventListener('click', function(){ st.seed += 1; regenerate(); });
    el('s03-pr-z').addEventListener('input', fromWindow);
    el('s03-pr-prev').addEventListener('click', function(){ moveSel(-1); });
    el('s03-pr-next').addEventListener('click', function(){ moveSel(1); });
    regenerate();
    var rz = 0, lastW = window.innerWidth;
    window.addEventListener('resize', function(){
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth; clearTimeout(rz);
      rz = setTimeout(function(){ drawCurve(); drawChrom(); drawTree(); }, 150);
    });
  }
  psmcPrinciple();
})();
