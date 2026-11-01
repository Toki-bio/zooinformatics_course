(function(){
  var figHost = document.getElementById('s07-fig');
  if (!figHost) return;
  var NS = 'http://www.w3.org/2000/svg';
  var MU = 5.4e-9;                     // per site per generation, placeholder; 1 year per generation
  var TMIN = 1e3, TMAX = 3e7, NG = 2400;
  var WIN0 = 1.2e4, WIN1 = 1.2e7, NWIN = 24;
  var MSTEPS = [0, 0.001, 0.002, 0.003, 0.005, 0.007, 0.01, 0.015, 0.02, 0.03, 0.05, 0.07, 0.1, 0.13, 0.17, 0.2, 0.25, 0.3, 0.4, 0.5,
                0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.5, 1.7, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 10, 12, 15, 20];
  var el = function(id){ return document.getElementById(id); };
  var ctl = { T: el('s07-T'), NA: el('s07-NA'), Nd: el('s07-Nd'), M: el('s07-M'), ref: el('s07-ref') };
  var when = 'all';

  function css(v){ return 'var(' + v + ')'; }
  function mk(tag, attrs, txt){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  function fmtY(y){
    if (y >= 999.5e3){ var s = (y / 1e6).toFixed(y >= 1e7 ? 0 : 2); if (s.indexOf('.') >= 0) s = s.replace(/\.?0+$/, ''); return s + ' My'; }
    if (y >= 1e3) return Math.round(y / 1e3) + ' ky';
    return Math.round(y) + ' y';
  }
  function fmtN(n){
    if (!isFinite(n)) return '∞';
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + ' M';
    if (n >= 1e3) return Math.round(n / 1e3) + 'k';
    return Math.round(n) + '';
  }

  // time grid (generations = years here), with the split and gene-flow boundaries inserted exactly
  function buildGrid(T, gf){
    var g = [], i;
    for (i = 0; i <= NG; i++) g.push(TMIN * Math.pow(TMAX / TMIN, i / NG));
    g.push(T); if (gf) { g.push(gf[0]); g.push(gf[1]); }
    g = g.filter(function(x){ return x >= TMIN && x <= TMAX; }).sort(function(a, b){ return a - b; });
    var out = [0];
    g.forEach(function(x){ if (x - out[out.length - 1] > 1e-6) out.push(x); });
    return out;
  }

  // exp(Q dt) for Q = [[-2m, 2m], [2m, -2m - c]] acting on row vector (D, S)
  function step2(D, S, m, c, dt){
    if (m === 0) return [D, S * Math.exp(-c * dt)];
    var a = -2 * m, b = 2 * m, cc = 2 * m, d = -2 * m - c;
    var s = (a + d) / 2, q = Math.sqrt((a - d) * (a - d) / 4 + b * cc);
    var es = Math.exp(s * dt), ch = Math.cosh(q * dt), sh = Math.sinh(q * dt) / q;
    // E = es * (ch*I + sh*(Q - sI))
    var e11 = es * (ch + sh * (a - s)), e12 = es * sh * b, e21 = es * sh * cc, e22 = es * (ch + sh * (d - s));
    return [D * e11 + S * e21, D * e12 + S * e22];
  }

  function model(T, NA, Nd, Nm, whenMode){
    var m = Nm / Nd, cd = 1 / (2 * Nd), ca = 1 / (2 * NA);
    var gf = null;
    if (Nm > 0){
      if (whenMode === 'all') gf = [0, T];
      else if (whenMode === 'early') gf = [T / 2, T];
      else gf = [0, T * 0.1];
    }
    var t = buildGrid(T, gf), n = t.length;
    var surv = new Float64Array(n), D = 1, S = 0;
    surv[0] = 1;
    for (var i = 1; i < n; i++){
      var dt = t[i] - t[i - 1], mid = (t[i] + t[i - 1]) / 2;
      if (mid >= T){
        var tot = (D + S) * Math.exp(-ca * dt); D = tot; S = 0;
      } else {
        var on = gf && mid >= gf[0] && mid < gf[1];
        var r = step2(D, S, on ? m : 0, cd, dt); D = r[0]; S = r[1];
      }
      surv[i] = D + S;
    }
    // per-interval IICR
    var iicr = new Float64Array(n - 1), dens = new Float64Array(n - 1);
    for (i = 1; i < n; i++){
      var dtt = t[i] - t[i - 1];
      var lam = surv[i] > 0 && surv[i - 1] > 0 ? -Math.log(surv[i] / surv[i - 1]) / dtt : Infinity;
      iicr[i - 1] = lam > 1e-14 ? 1 / (2 * lam) : Infinity;
      dens[i - 1] = (surv[i - 1] - surv[i]) / dtt;      // f(t)
    }
    // mean coalescence time = integral of survival (tail beyond TMAX analytically in ancestral pop)
    var mean = 0;
    for (i = 1; i < n; i++) mean += (surv[i] + surv[i - 1]) / 2 * (t[i] - t[i - 1]);
    mean += surv[n - 1] * 2 * NA;
    // stepped windows
    var wins = [];
    var lo = Math.log(WIN0), hi = Math.log(WIN1);
    for (var w = 0; w < NWIN; w++){
      var a = Math.exp(lo + (hi - lo) * w / NWIN), b = Math.exp(lo + (hi - lo) * (w + 1) / NWIN);
      var Sa = interpS(t, surv, a), Sb = interpS(t, surv, b), integ = integS(t, surv, a, b);
      var lamW = integ > 0 ? (Sa - Sb) / integ : 0;
      wins.push([a, b, lamW > 1e-14 ? 1 / (2 * lamW) : Infinity]);
    }
    var pAfter = 1 - interpS(t, surv, T);
    return { t: t, surv: surv, iicr: iicr, dens: dens, mean: mean, wins: wins, pAfter: pAfter, gf: gf };
  }
  function idx(t, x){ var lo = 0, hi = t.length - 1; while (hi - lo > 1){ var mid = (lo + hi) >> 1; if (t[mid] <= x) lo = mid; else hi = mid; } return lo; }
  function interpS(t, s, x){
    if (x <= t[0]) return 1; if (x >= t[t.length - 1]) return s[s.length - 1];
    var i = idx(t, x), f = (x - t[i]) / (t[i + 1] - t[i]);
    if (s[i] > 0 && s[i + 1] > 0) return s[i] * Math.pow(s[i + 1] / s[i], f);
    return s[i] + (s[i + 1] - s[i]) * f;
  }
  function integS(t, s, a, b){
    var K = 200, sum = 0, la = Math.log(a), lb = Math.log(b), prev = a, ps = interpS(t, s, a);
    for (var k = 1; k <= K; k++){
      var x = Math.exp(la + (lb - la) * k / K), sx = interpS(t, s, x);
      sum += (ps + sx) / 2 * (x - prev); prev = x; ps = sx;
    }
    return sum;
  }

  // ---- plotting helpers
  var W = 960, X0 = 74, PW = 860;
  var XL0 = Math.log10(1e4), XL1 = Math.log10(2e7);
  function xp(y){ return X0 + (Math.log10(Math.max(y, 1)) - XL0) / (XL1 - XL0) * PW; }
  function xAxis(svg, yBase){
    svg.appendChild(mk('line', { x1: X0, y1: yBase, x2: X0 + PW, y2: yBase, 'class': 'ax' }));
    [1e4, 3e4, 1e5, 3e5, 1e6, 3e6, 1e7].forEach(function(v){
      var x = xp(v);
      svg.appendChild(mk('line', { x1: x, y1: yBase, x2: x, y2: yBase + 4, 'class': 'ax' }));
      svg.appendChild(mk('text', { x: x, y: yBase + 16, 'text-anchor': 'middle' }, fmtY(v)));
    });
    svg.appendChild(mk('text', { x: X0 + PW, y: yBase + 30, 'text-anchor': 'end' }, 'years ago (past →), μ = 5.4e-9 per generation, 1 year per generation'));
  }
  function vline(svg, x, y0, y1, color, dash, label, ly, anchor){
    svg.appendChild(mk('line', { x1: x, y1: y0, x2: x, y2: y1, stroke: css(color), 'stroke-width': 1.5, 'stroke-dasharray': dash || '' }));
    if (label) svg.appendChild(mk('text', { x: x + (anchor === 'end' ? -4 : 4), y: ly, 'text-anchor': anchor || 'start', fill: css(color) }, label));
  }
  function gfBand(svg, gf, y0, h){
    if (!gf) return;
    var a = xp(Math.max(gf[0], 1e4)), b = xp(Math.min(gf[1], 2e7));
    if (b > a) svg.appendChild(mk('rect', { x: a, y: y0, width: b - a, height: h, fill: css('--het'), opacity: 0.12 }));
  }

  function drawDens(res, ref, T){
    var H = 200, y0 = 26, h = 128;
    var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Distribution of the time back to the common ancestor of one copy from each species' });
    svg.style.minWidth = '640px';
    svg.appendChild(mk('text', { x: X0, y: 14, 'class': 'lab' }, 'When do the two copies (one per species) meet? Share of the genome per time slice'));
    gfBand(svg, res.gf, y0, h);
    function series(r){
      var pts = [], mx = 0;
      for (var i = 0; i < r.dens.length; i++){
        var tm = (r.t[i] + r.t[i + 1]) / 2; if (tm < 1e4 || tm > 2e7) continue;
        var v = r.dens[i] * tm; pts.push([tm, v]); if (v > mx) mx = v;
      }
      return { pts: pts, mx: mx };
    }
    var a = series(res), b = ref ? series(ref) : null;
    var mx = Math.max(a.mx, b ? b.mx : 0) || 1;
    function yy(v){ return y0 + h - v / mx * h; }
    var d = 'M' + X0 + ' ' + (y0 + h);
    a.pts.forEach(function(p){ d += 'L' + xp(p[0]).toFixed(1) + ' ' + yy(p[1]).toFixed(1); });
    d += 'L' + (X0 + PW) + ' ' + (y0 + h) + 'Z';
    svg.appendChild(mk('path', { d: d, fill: css('--accent'), opacity: 0.35, stroke: css('--accent'), 'stroke-width': 1.5 }));
    if (b){
      var d2 = '';
      b.pts.forEach(function(p, k){ d2 += (k ? 'L' : 'M') + xp(p[0]).toFixed(1) + ' ' + yy(p[1]).toFixed(1); });
      svg.appendChild(mk('path', { d: d2, fill: 'none', stroke: css('--fg'), 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }));
    }
    vline(svg, xp(T), y0, y0 + h, '--bad', '4 3', 'split ' + fmtY(T), y0 + 10, xp(T) > X0 + PW - 120 ? 'end' : 'start');
    svg.appendChild(mk('text', { x: X0 - 8, y: y0 + 10, 'text-anchor': 'end' }, 'more'));
    svg.appendChild(mk('text', { x: X0 - 8, y: y0 + h, 'text-anchor': 'end' }, '0'));
    xAxis(svg, y0 + h + 4);
    el('s07-dens').replaceChildren(svg);
  }

  function drawIICR(res, ref, T, NA){
    var H = 300, y0 = 26, h = 220;
    var YL0 = Math.log10(1e4), YL1 = Math.log10(3e7);
    function yp(n){ if (!isFinite(n)) return y0 - 2; return y0 + h - (Math.log10(Math.max(1e4, Math.min(n, 3e7))) - YL0) / (YL1 - YL0) * h; }
    var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'IICR of the pseudo-diploid: infinite after the split, ancestral size before' });
    svg.style.minWidth = '640px';
    svg.appendChild(mk('text', { x: X0, y: 14, 'class': 'lab' }, 'What hPSMC aims at: IICR of the hybrid (y, log scale; top edge = infinite)'));
    gfBand(svg, res.gf, y0, h);
    svg.appendChild(mk('line', { x1: X0, y1: y0, x2: X0, y2: y0 + h, 'class': 'ax' }));
    [1e4, 1e5, 1e6, 1e7].forEach(function(v){
      var y = yp(v);
      svg.appendChild(mk('line', { x1: X0, y1: y, x2: X0 + PW, y2: y, 'class': 'grid' }));
      svg.appendChild(mk('text', { x: X0 - 6, y: y + 4, 'text-anchor': 'end' }, fmtN(v)));
    });
    svg.appendChild(mk('text', { x: X0 - 6, y: y0 + 2, 'text-anchor': 'end', fill: css('--fg') }, '∞'));
    // thresholds
    [[1, 'ancestral Nₑ'], [1.5, '1.5 ×'], [10, '10 ×']].forEach(function(th){
      var y = yp(NA * th[0]);
      if (y < y0 || y > y0 + h) return;
      svg.appendChild(mk('line', { x1: X0, y1: y, x2: X0 + PW, y2: y, stroke: css('--muted'), 'stroke-width': 1, 'stroke-dasharray': th[0] === 1 ? '' : '2 4' }));
      svg.appendChild(mk('text', { x: X0 + PW - 2, y: y - 3, 'text-anchor': 'end' }, th[1]));
    });
    function exactPath(r){
      var d = '', started = false;
      for (var i = 0; i < r.iicr.length; i++){
        var a = Math.max(r.t[i], 1e4), b = Math.min(r.t[i + 1], 2e7); if (b <= a) continue;
        var y = yp(r.iicr[i]).toFixed(1);
        d += (started ? 'L' : 'M') + xp(a).toFixed(1) + ' ' + y + 'L' + xp(b).toFixed(1) + ' ' + y; started = true;
      }
      return d;
    }
    function stepPath(r){
      var d = '';
      r.wins.forEach(function(wn, k){ var y = yp(wn[2]).toFixed(1); d += (k ? 'L' : 'M') + xp(wn[0]).toFixed(1) + ' ' + y + 'L' + xp(wn[1]).toFixed(1) + ' ' + y; });
      return d;
    }
    if (ref) svg.appendChild(mk('path', { d: stepPath(ref), fill: 'none', stroke: css('--fg'), 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }));
    svg.appendChild(mk('path', { d: exactPath(res), fill: 'none', stroke: css('--accent'), 'stroke-width': 1.2, opacity: 0.8 }));
    svg.appendChild(mk('path', { d: stepPath(res), fill: 'none', stroke: css('--het'), 'stroke-width': 3 }));
    vline(svg, xp(T), y0, y0 + h, '--bad', '4 3', 'true split', y0 + h - 6, xp(T) > X0 + PW - 120 ? 'end' : 'start');
    var c10 = crossing(res, NA * 10), c15 = crossing(res, NA * 1.5);
    [[c10, '10×'], [c15, '1.5×']].forEach(function(c, k){
      if (!c[0]) return;
      var x = xp(c[0][0]), y = yp(c[0][1]);
      svg.appendChild(mk('circle', { cx: x, cy: y, r: 4.5, fill: css('--bg'), stroke: css('--het'), 'stroke-width': 2 }));
    });
    xAxis(svg, y0 + h + 4);
    figHost.replaceChildren(svg);
  }

  // youngest end of the old part where the stepped curve is still below a threshold:
  // scan windows from old to young, first window whose value exceeds thr -> crossing at its older edge
  function crossing(res, thr){
    for (var k = res.wins.length - 1; k >= 0; k--){
      if (res.wins[k][2] > thr) return [res.wins[k][1], thr];
    }
    return null;
  }
  function crossingExact(res, thr){
    for (var i = res.iicr.length - 1; i >= 0; i--){
      if (res.t[i + 1] > 2e7) continue;
      if (res.iicr[i] > thr) return res.t[i + 1];
    }
    return null;
  }

  function legend(){
    var items = [['--accent', 'meeting times / exact IICR', 3], ['--het', 'IICR averaged in 24 windows (PSMC-like steps)', 3], ['--fg', 'same history without gene flow', 2],
      ['--bad', 'true split', 2], ['--het', 'gene flow period (shaded)', 10]];
    var lg = el('s07-legend'); lg.replaceChildren();
    items.forEach(function(it, k){
      var s = document.createElement('span'), i = document.createElement('i');
      i.style.background = css(it[0]); i.style.height = it[2] + 'px';
      if (k === 4) i.style.opacity = 0.25;
      s.appendChild(i); s.appendChild(document.createTextNode(it[1])); lg.appendChild(s);
    });
  }
  function cell(label, val, tip){
    var d = document.createElement('div');
    var s = document.createElement('span'); s.innerHTML = label + ' ';
    if (tip){ s.className = 'tip'; s.title = tip; }
    var b = document.createElement('b'); b.textContent = val;
    d.appendChild(s); d.appendChild(b); return d;
  }

  function outputs(){
    el('s07-T-o').textContent = (+ctl.T.value).toFixed(2).replace(/0$/, '') + ' My';
    el('s07-NA-o').textContent = ctl.NA.value + 'k';
    el('s07-Nd-o').textContent = ctl.Nd.value + 'k';
    var nm = MSTEPS[+ctl.M.value];
    el('s07-M-o').textContent = nm === 0 ? 'none' : nm + ' (m = ' + (nm / (+ctl.Nd.value * 1000)).toExponential(1) + ' per generation)';
  }

  function update(){
    outputs();
    var T = +ctl.T.value * 1e6, NA = +ctl.NA.value * 1000, Nd = +ctl.Nd.value * 1000, Nm = MSTEPS[+ctl.M.value];
    var res = model(T, NA, Nd, Nm, when);
    var ref = (Nm > 0 && ctl.ref.checked) ? model(T, NA, Nd, 0, when) : null;
    drawDens(res, ref, T);
    drawIICR(res, ref, T, NA);
    var c10 = crossing(res, NA * 10), c15 = crossing(res, NA * 1.5);
    var e10 = crossingExact(res, NA * 10), e15 = crossingExact(res, NA * 1.5);
    var d = 2 * MU * res.mean;
    var out = el('s07-out'); out.replaceChildren();
    out.appendChild(cell('True split', fmtY(T)));
    out.appendChild(cell('Exact IICR passes 10× / 1.5× N<sub>e</sub> at', (e10 ? fmtY(e10) : 'never') + ' / ' + (e15 ? fmtY(e15) : 'never'),
      'Going from the past toward the present, the time at which the exact IICR first rises above 10 times (and 1.5 times) the ancestral size. Without gene flow both equal the split time.'));
    out.appendChild(cell('Stepped curve passes 10× / 1.5× at', (c10 ? fmtY(c10[0]) : 'never') + ' / ' + (c15 ? fmtY(c15[0]) : 'never'),
      'The same reading on the 24-window steps (open circles): it can only report a window edge.'));
    out.appendChild(cell('Genome meeting after the split', (res.pAfter * 100).toFixed(1) + ' %',
      'Share of the genome whose two copies found their common ancestor after the split, which is possible only through gene flow.'));
    out.appendChild(cell('Divergence d (expected differences per site)', (d * 100).toFixed(2) + ' %',
      'd = 2 × μ × mean meeting time in generations: both copies collect mutations on their way back to the ancestor.'));
    out.appendChild(cell('Share of K bins at 100 / 20 / 10 bp', [100, 20, 10].map(function(b){ return Math.round((1 - Math.exp(-d * b)) * 100) + ' %'; }).join(' / '),
      'K bin = a bin with at least one difference; share ≈ 1 − e^(−d·b) if differences fall at random. Near 100 % the psmcfa is all K and PSMC can read nothing.'));
  }

  ['T', 'NA', 'Nd', 'M'].forEach(function(k){ ctl[k].addEventListener('input', update); });
  ctl.ref.addEventListener('change', update);
  var g = el('s07-when');
  g.addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    Array.prototype.forEach.call(g.querySelectorAll('button'), function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    when = b.getAttribute('data-v'); update();
  });
  legend();
  try { update(); } catch (e) { figHost.textContent = 'Figure could not be drawn: ' + e.message; }
})();
