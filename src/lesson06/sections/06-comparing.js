(function(){
  var fig = document.getElementById('s06-fig');
  if (!fig) return;
  var NS = 'http://www.w3.org/2000/svg';
  var el = function(id){ return document.getElementById(id); };
  var NR = 200, NC = 10, NCPG = NR * NC, MAXREP = 10, Q = 0.05, EFF = 0.10;
  var ctl = { cov: el('s06-cov'), rep: el('s06-rep'), delta: el('s06-delta'), bio: el('s06-bio'), eff: el('s06-eff') };
  var seg = { test: 'anim', unit: 'reg' };
  var seed = 6061;

  // ---------- random numbers ----------
  function rng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(r){ var u = r() || 1e-12, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function pois(r, m){ var L = Math.exp(-m), k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }
  function clip(x, a, b){ return x < a ? a : (x > b ? b : x); }

  // ---------- statistics ----------
  function erfc(x){ // Numerical Recipes erfcc, fractional error < 1.2e-7
    var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
      t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  function pNorm2(z){ return erfc(Math.abs(z) / Math.SQRT2); }       // two-sided
  function lgamma(x){
    var c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); var s = 1.000000000190015;
    for (var j = 0; j < 6; j++) s += c[j] / ++y;
    return -t + Math.log(2.5066282746310005 * s / x);
  }
  function betacf(a, b, x){
    var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-300) d = 1e-300; d = 1 / d; var h = d;
    for (var m = 1; m <= 200; m++){
      var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; var del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break;
    }
    return h;
  }
  function ibeta(a, b, x){
    if (x <= 0) return 0; if (x >= 1) return 1;
    var bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  function pT2(t, df){ return ibeta(df / 2, 0.5, df / (df + t * t)); } // two-sided p of Student's t
  function zTest(xa, na, xb, nb){
    var pa = xa / na, pb = xb / nb, p = (xa + xb) / (na + nb);
    var se = Math.sqrt(p * (1 - p) * (1 / na + 1 / nb));
    if (!(se > 0)) return pa === pb ? 1 : 1e-300;
    return Math.max(pNorm2((pb - pa) / se), 1e-300);
  }

  // ---------- the toy genome ----------
  var base, isDmr, z1, z2;     // fixed per "new animals"
  function makeGenome(){
    var r = rng(seed);
    base = new Float32Array(NCPG); isDmr = new Uint8Array(NR);
    for (var g = 0; g < NR; g++){
      isDmr[g] = (g % 10 === 3) ? 1 : 0;
      var low = r() < 0.2, b = low ? 0.03 + r() * 0.17 : 0.65 + r() * 0.27;
      for (var c = 0; c < NC; c++) base[g * NC + c] = clip(b + (r() - 0.5) * 0.1, 0.01, 0.99);
    }
    // standard-normal animal deviations: per animal x region (shared) and per animal x CpG
    z1 = []; z2 = [];
    for (var a = 0; a < 2 * MAXREP; a++){
      var zr = new Float32Array(NR), zc = new Float32Array(NCPG);
      for (g = 0; g < NR; g++) zr[g] = gauss(r);
      for (var i = 0; i < NCPG; i++) zc[i] = gauss(r);
      z1.push(zr); z2.push(zc);
    }
  }

  function simulate(){
    var cov = +ctl.cov.value, nrep = +ctl.rep.value, delta = +ctl.delta.value, sd = +ctl.bio.value;
    var rr = rng(seed + 101 + Math.round(cov * 7));
    var X = [], N = [];
    for (var grp = 0; grp < 2; grp++){
      for (var k = 0; k < nrep; k++){
        var aIdx = grp * MAXREP + k, xs = new Uint16Array(NCPG), ns = new Uint16Array(NCPG);
        for (var i = 0; i < NCPG; i++){
          var g = (i / NC) | 0, lev = base[i];
          if (grp === 1 && isDmr[g]) lev = lev > 0.5 ? lev - delta : lev + delta;
          var p = clip(lev + sd * z1[aIdx][g] + 0.5 * sd * z2[aIdx][i], 0.005, 0.995);
          var n = pois(rr, cov), x = 0;
          for (var j = 0; j < n; j++) if (rr() < p) x++;
          xs[i] = x; ns[i] = n;
        }
        X.push(xs); N.push(ns);
      }
    }
    return { X: X, N: N, nrep: nrep };
  }

  // per-animal test: a moderated t-test. The within-group variance of each unit is shrunk towards the
  // median variance of all units (prior weight D0 degrees of freedom), so a unit whose few animals happen
  // to agree closely does not get an absurdly small variance. This borrows strength across units, as
  // DSS does for its dispersions, but it is a simple stand-in, not DSS's model.
  var D0 = 4;
  function groupStats(v){
    var n = v.length, m = 0, ss = 0, i;
    for (i = 0; i < n; i++) m += v[i]; m /= n;
    for (i = 0; i < n; i++) ss += (v[i] - m) * (v[i] - m);
    return { n: n, m: m, ss: ss };
  }
  function analyse(sim){
    var nrep = sim.nrep, units = seg.unit === 'reg' ? NR : NCPG, res = [];
    if (seg.test === 'anim' && nrep < 2) return { blocked: true, res: [] };
    for (var u = 0; u < units; u++){
      var lo = seg.unit === 'reg' ? u * NC : u, hi = seg.unit === 'reg' ? lo + NC : u + 1;
      var truth = isDmr[seg.unit === 'reg' ? u : (u / NC) | 0];
      var fr = [[], []], sx = [0, 0], sn = [0, 0];
      for (var grp = 0; grp < 2; grp++){
        for (var k = 0; k < nrep; k++){
          var A = grp * nrep + k, x = 0, n = 0;
          for (var i = lo; i < hi; i++){ x += sim.X[A][i]; n += sim.N[A][i]; }
          sx[grp] += x; sn[grp] += n;
          if (n > 0) fr[grp].push(x / n);
        }
      }
      var o = { truth: truth, p: null, d: null, call: false };
      if (seg.test === 'pool'){
        if (sn[0] > 0 && sn[1] > 0){ o.p = zTest(sx[0], sn[0], sx[1], sn[1]); o.d = sx[1] / sn[1] - sx[0] / sn[0]; }
      } else if (fr[0].length >= 2 && fr[1].length >= 2){
        var a = groupStats(fr[0]), b = groupStats(fr[1]);
        o.d = b.m - a.m; o.df = a.n + b.n - 2; o.s2 = (a.ss + b.ss) / o.df; o.f = 1 / a.n + 1 / b.n;
      }
      res.push(o);
    }
    if (seg.test === 'anim'){
      var vs = res.filter(function(o){ return o.s2 != null; }).map(function(o){ return o.s2; }).sort(function(a, b){ return a - b; });
      var s0 = vs.length ? vs[(vs.length / 2) | 0] : 0;
      res.forEach(function(o){
        if (o.s2 == null) return;
        var s2m = (D0 * s0 + o.df * o.s2) / (D0 + o.df), se = Math.sqrt(s2m * o.f);
        o.p = se > 0 ? Math.max(pT2(o.d / se, D0 + o.df), 1e-300) : (o.d === 0 ? 1 : 1e-300);
      });
    }
    // Benjamini-Hochberg over the testable units
    var tested = res.filter(function(o){ return o.p !== null; });
    var sorted = tested.slice().sort(function(a, b){ return a.p - b.p; }), m = sorted.length, kmax = 0;
    for (var k2 = 0; k2 < m; k2++) if (sorted[k2].p <= (k2 + 1) / m * Q) kmax = k2 + 1;
    var cut = kmax ? sorted[kmax - 1].p : 0;
    for (k2 = 0; k2 < kmax; k2++) sorted[k2].call = true;
    if (ctl.eff.checked) tested.forEach(function(o){ if (Math.abs(o.d) < EFF) o.call = false; });
    return { blocked: false, res: res, cut: cut, untested: res.length - m };
  }

  // ---------- drawing ----------
  function mk(tag, attrs, txt){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  var W = 760, H = 330, X0 = 62, X1 = 740, Y0 = 18, Y1 = 280, XMAX = 0.7, YMAX = 12;
  function xp(d){ return X0 + (clip(d, -XMAX, XMAX) + XMAX) / (2 * XMAX) * (X1 - X0); }
  function yp(l){ return Y1 - Math.min(l, YMAX) / YMAX * (Y1 - Y0); }

  function draw(an){
    var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img',
      'aria-label': 'Volcano plot: observed difference against strength of evidence for each tested unit' });
    svg.style.minWidth = '560px';
    svg.appendChild(mk('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, fill: 'none', stroke: 'var(--line)' }));
    [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6].forEach(function(t){
      svg.appendChild(mk('line', { x1: xp(t), x2: xp(t), y1: Y1, y2: Y1 + 4, stroke: 'var(--muted)' }));
      svg.appendChild(mk('text', { x: xp(t), y: Y1 + 16, 'text-anchor': 'middle' }, (t > 0 ? '+' : '') + t.toFixed(1)));
    });
    for (var l = 0; l <= YMAX; l += 2){
      svg.appendChild(mk('line', { x1: X0 - 4, x2: X0, y1: yp(l), y2: yp(l), stroke: 'var(--muted)' }));
      svg.appendChild(mk('text', { x: X0 - 7, y: yp(l) + 4, 'text-anchor': 'end' }, l === YMAX ? '≥' + l : String(l)));
    }
    svg.appendChild(mk('text', { x: (X0 + X1) / 2, y: H - 8, 'text-anchor': 'middle', 'class': 'lab' }, 'observed difference, group B − group A (level)'));
    var yl = mk('text', { x: 14, y: (Y0 + Y1) / 2, 'text-anchor': 'middle', 'class': 'lab', transform: 'rotate(-90 14 ' + ((Y0 + Y1) / 2) + ')' }, '−log10 p   (higher = stronger evidence)');
    svg.appendChild(yl);
    if (an.blocked){
      svg.appendChild(mk('text', { x: (X0 + X1) / 2, y: (Y0 + Y1) / 2, 'text-anchor': 'middle', 'class': 'lab' }, 'No test possible: one animal per group gives no within-group spread.'));
      fig.replaceChildren(svg); return;
    }
    if (an.cut > 0){
      var yc = yp(-Math.log10(an.cut));
      svg.appendChild(mk('line', { x1: X0, x2: X1, y1: yc, y2: yc, stroke: 'var(--accent)', 'stroke-dasharray': '5 4' }));
      svg.appendChild(mk('text', { x: X1 - 4, y: yc - 5, 'text-anchor': 'end', fill: 'var(--accent)' }, 'FDR 5 % cut-off'));
    }
    if (ctl.eff.checked){
      [-EFF, EFF].forEach(function(t){ svg.appendChild(mk('line', { x1: xp(t), x2: xp(t), y1: Y0, y2: Y1, stroke: 'var(--accent)', 'stroke-dasharray': '2 3' })); });
    }
    // null units first, true ones on top
    var r = seg.unit === 'reg' ? 3.4 : 2.2;
    [0, 1].forEach(function(tr){
      var dHollow = '', dFill = '';
      an.res.forEach(function(o){
        if (o.truth !== tr || o.p === null) return;
        var cx = xp(o.d), cy = yp(-Math.log10(o.p));
        var s = 'M' + (cx - r).toFixed(1) + ' ' + cy.toFixed(1) + 'a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0z';
        if (o.call) dFill += s; else dHollow += s;
      });
      var col = tr ? 'var(--het)' : 'var(--err)';
      if (dHollow) svg.appendChild(mk('path', { d: dHollow, fill: 'none', stroke: col, 'stroke-width': 1, opacity: tr ? 0.95 : 0.6 }));
      if (dFill) svg.appendChild(mk('path', { d: dFill, fill: tr ? col : 'var(--bad)', stroke: tr ? col : 'var(--bad)', 'stroke-width': 0.8 }));
    });
    fig.replaceChildren(svg);
  }

  function legend(){
    el('s06-legend').innerHTML =
      '<span><i style="background:var(--het);height:10px;width:10px;border-radius:50%"></i>truly different (in a true DMR), called</span>' +
      '<span><i style="border:1.5px solid var(--het);height:8px;width:8px;border-radius:50%;background:none"></i>truly different, missed</span>' +
      '<span><i style="background:var(--bad);height:10px;width:10px;border-radius:50%"></i>not different, but called: <b>false positive</b></span>' +
      '<span><i style="border:1.5px solid var(--err);height:8px;width:8px;border-radius:50%;background:none"></i>not different, not called</span>';
  }

  function readout(an){
    var unitName = seg.unit === 'reg' ? 'regions' : 'CpGs';
    var nTrue = seg.unit === 'reg' ? 20 : 200, nNull = seg.unit === 'reg' ? 180 : 1800;
    var out = el('s06-out');
    if (an.blocked){
      out.innerHTML = '<div>Tested<b>nothing</b>The per-animal test needs at least 2 animals per group: with one, nothing measures how much animals of the same group differ.</div>' +
        '<div>Try<b>pooled reads</b>It gives an answer with one animal, but the answer is about these two animals, not about the groups.</div>';
      return;
    }
    var tp = 0, fp = 0;
    an.res.forEach(function(o){ if (o.call){ if (o.truth) tp++; else fp++; } });
    var calls = tp + fp, fdr = calls ? fp / calls : 0;
    out.innerHTML =
      '<div>True DMRs found<b>' + tp + ' of ' + nTrue + ' ' + unitName + '</b><span class="tip" title="Power: the share of truly different units that the test calls different.">power</span> ' + (tp / nTrue * 100).toFixed(0) + ' %</div>' +
      '<div>False positives<b style="color:' + (fp ? 'var(--bad)' : 'inherit') + '">' + fp + ' of ' + nNull + ' ' + unitName + '</b>called different although the groups do not differ there</div>' +
      '<div>Share of calls that are false<b>' + (calls ? (fdr * 100).toFixed(0) + ' %' : '–') + '</b>the <span class="tip" title="False discovery rate: false positives divided by all calls. Benjamini-Hochberg aims to keep it at 5 % on average, but only if the test\'s p-values are correct.">observed FDR</span>; target 5 %</div>' +
      '<div>Not testable<b>' + an.untested + ' ' + unitName + '</b>' + (seg.test === 'pool' ? 'no reads in one group' : 'fewer than 2 animals with reads in a group') + '</div>';
  }

  var sim = null;
  function rerun(resim){
    el('s06-cov-o').textContent = ctl.cov.value + '×';
    el('s06-rep-o').textContent = ctl.rep.value;
    el('s06-delta-o').textContent = (+ctl.delta.value).toFixed(2);
    el('s06-bio-o').textContent = (+ctl.bio.value).toFixed(2);
    if (resim || !sim) sim = simulate();
    var an = analyse(sim);
    draw(an); readout(an);
  }
  function wireSeg(id, key){
    var box = el(id);
    box.addEventListener('click', function(e){
      var b = e.target.closest('button'); if (!b) return;
      seg[key] = b.getAttribute('data-v');
      box.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      rerun(false);
    });
  }
  ['cov', 'rep', 'delta', 'bio'].forEach(function(k){ ctl[k].addEventListener('input', function(){ rerun(true); }); });
  ctl.eff.addEventListener('change', function(){ rerun(false); });
  wireSeg('s06-test', 'test'); wireSeg('s06-unit', 'unit');
  el('s06-new').addEventListener('click', function(){ seed = (seed * 1103515245 + 12345) >>> 0; makeGenome(); rerun(true); });
  makeGenome(); legend(); rerun(true);

  // ---------- calculator ----------
  var ci = { ca: el('s06-ca'), na: el('s06-na'), cb: el('s06-cb'), nb: el('s06-nb') };
  function fmtP(p){ return p < 1e-300 ? '< 1e-300' : (p < 0.001 ? p.toExponential(1) : p.toFixed(3)); }
  function calc(){
    var ca = Math.max(0, Math.round(+ci.ca.value)), na = Math.max(1, Math.round(+ci.na.value));
    var cb = Math.max(0, Math.round(+ci.cb.value)), nb = Math.max(1, Math.round(+ci.nb.value));
    var out = el('s06-calc-out');
    if (ca > na || cb > nb){ out.innerHTML = '<div>Check the input<b>–</b>methylated calls cannot exceed all calls</div>'; return; }
    var pa = ca / na, pb = cb / nb, p = zTest(ca, na, cb, nb);
    var h = 2 * Math.asin(Math.sqrt(pa)) - 2 * Math.asin(Math.sqrt(pb)), half = 1.96 * Math.sqrt(1 / na + 1 / nb);
    var size = Math.abs(h) < 0.2 ? 'negligible (below 0.2)' : Math.abs(h) < 0.5 ? 'small' : Math.abs(h) < 0.8 ? 'medium' : 'large';
    out.innerHTML =
      '<div>Levels A / B<b>' + pa.toFixed(3) + ' / ' + pb.toFixed(3) + '</b>effect size (A − B) ' + (pa - pb >= 0 ? '+' : '') + (pa - pb).toFixed(3) + '</div>' +
      '<div>Cohen\'s h<b>' + h.toFixed(3) + '</b>95 % interval ' + (h - half).toFixed(3) + ' to ' + (h + half).toFixed(3) + '; size: ' + size + '</div>' +
      '<div>p, <span class="tip" title="Compares two proportions using the normal approximation; every read counts as an independent observation.">two-proportion z-test</span><b>' + fmtP(p) + '</b>' + (p < 0.05 ? '"significant" at 0.05' : 'not significant at 0.05') + ' (pooled reads, one comparison)</div>';
  }
  Object.keys(ci).forEach(function(k){ ci[k].addEventListener('input', calc); });
  el('s06-x100').addEventListener('click', function(){ Object.keys(ci).forEach(function(k){ ci[k].value = Math.round(+ci[k].value * 10); }); calc(); });
  el('s06-reset').addEventListener('click', function(){ ci.ca.value = 82; ci.na.value = 100; ci.cb.value = 80; ci.nb.value = 100; calc(); });
  calc();
})();
