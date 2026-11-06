(function () {
  // ---- CORE-START (no page access here: the code control loads this block on its own) ----
  function rng(seed) { // mulberry32: small seeded generator, so a run can be repeated
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // One distance under JC69. A site differs with probability p(d); k of n sites differ.
  function pDiff(d) { return 0.75 * (1 - Math.exp(-4 * d / 3)); }
  function lnLikeD(d, data) {
    if (data.n === 0) return 0;
    var p = pDiff(d);
    return data.k * Math.log(p) + (data.n - data.k) * Math.log(1 - p);
  }
  // Priors on d, up to a constant (the constant cancels; plotted curves are scaled on the grid).
  function lnPriorD(d, prior) {
    if (d <= 0) return -Infinity;
    if (prior.flat) return d <= prior.flat ? 0 : -Infinity;
    return (prior.a - 1) * Math.log(d) - prior.b * d;
  }
  function lnPostD(d, data, prior) { return lnPriorD(d, prior) + lnLikeD(d, data); }

  var GRID_MAX = 5, GRID_N = 10000;
  // Grid answer: value of (prior x likelihood) at evenly spaced d, scaled so that the area is 1.
  function gridD(data, prior) {
    var h = GRID_MAX / GRID_N, x = new Float64Array(GRID_N), post = new Float64Array(GRID_N), pri = new Float64Array(GRID_N);
    var i, m = -Infinity, mp = -Infinity;
    for (i = 0; i < GRID_N; i++) {
      x[i] = (i + 0.5) * h;
      post[i] = lnPostD(x[i], data, prior);
      pri[i] = lnPriorD(x[i], prior);
      if (post[i] > m) m = post[i];
      if (pri[i] > mp) mp = pri[i];
    }
    var s = 0, sp = 0;
    for (i = 0; i < GRID_N; i++) { post[i] = Math.exp(post[i] - m); pri[i] = Math.exp(pri[i] - mp); s += post[i]; sp += pri[i]; }
    var mean = 0, v = 0;
    for (i = 0; i < GRID_N; i++) { post[i] /= s * h; pri[i] /= sp * h; mean += x[i] * post[i] * h; }
    for (i = 0; i < GRID_N; i++) v += (x[i] - mean) * (x[i] - mean) * post[i] * h;
    function q(f) { var c = 0; for (var j = 0; j < GRID_N; j++) { c += post[j] * h; if (c >= f) return x[j]; } return x[GRID_N - 1]; }
    return { x: x, post: post, prior: pri, h: h, mean: mean, sd: Math.sqrt(v), lo: q(0.025), hi: q(0.975), top: q(0.9995) };
  }

  // Sliding window of full width w around the current value; below 0 it reflects, so it stays symmetric.
  function stepD(st, w, data, prior, r) {
    var prop = st.d + (r() - 0.5) * w;
    if (prop < 0) prop = -prop;
    var lnR = lnPostD(prop, data, prior) - st.lp;
    var u = r(), acc = Math.log(u) < lnR;
    var move = { from: st.d, to: prop, R: Math.exp(Math.min(lnR, 50)), u: u, acc: acc };
    if (acc) { st.d = prop; st.lp += lnR; }
    return move;
  }

  function fft(re, im, inverse) { // in-place radix-2
    var n = re.length, i, j = 0, len, k, tr, ti;
    for (i = 1; i < n; i++) {
      var bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { tr = re[i]; re[i] = re[j]; re[j] = tr; tr = im[i]; im[i] = im[j]; im[j] = tr; }
    }
    for (len = 2; len <= n; len <<= 1) {
      var ang = 2 * Math.PI / len * (inverse ? -1 : 1), wr = Math.cos(ang), wi = Math.sin(ang);
      for (i = 0; i < n; i += len) {
        var cr = 1, ci = 0;
        for (k = 0; k < len / 2; k++) {
          var a = i + k, b = a + len / 2;
          tr = re[b] * cr - im[b] * ci; ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
          var nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
  }
  // Effective sample size: n / (1 + 2 x sum of autocorrelations), summed in adjacent pairs and
  // stopped at the first pair that is not positive (Geyer's initial positive sequence).
  function ess(x) {
    var n = x.length, i;
    if (n < 4) return n;
    var mean = 0;
    for (i = 0; i < n; i++) mean += x[i];
    mean /= n;
    var size = 1;
    while (size < 2 * n) size <<= 1;
    var re = new Float64Array(size), im = new Float64Array(size);
    for (i = 0; i < n; i++) re[i] = x[i] - mean;
    fft(re, im, false);
    for (i = 0; i < size; i++) { re[i] = re[i] * re[i] + im[i] * im[i]; im[i] = 0; }
    fft(re, im, true);
    var c0 = re[0];
    if (!(c0 > 1e-12 * n)) return 1;
    var tau = -1;
    for (var m = 0; 2 * m + 1 < n; m++) {
      var g = (re[2 * m] + re[2 * m + 1]) / c0;
      if (g <= 0) break;
      tau += 2 * g;
    }
    return Math.max(1, Math.min(n, n / tau));
  }

  // Four taxa, three unrooted trees. The four outer branches are fixed at EXT; only the inner
  // branch t is unknown. Tips 0-3 are A, B, C, D.
  var EXT = 0.1, T_MEAN = 0.05, NSITES = 300, NSINGLE = 20;
  var TREES = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]]; // AB|CD, AC|BD, AD|BC
  var PATTERNS = [[0, 0, 0, 0], [0, 0, 0, 1], [0, 0, 1, 1], [0, 1, 0, 1], [0, 1, 1, 0]]; // constant, single, then one per tree
  function jc(b) { var e = Math.exp(-4 * b / 3); return [0.25 + 0.75 * e, 0.25 - 0.25 * e]; }
  var EP = jc(EXT);
  function pr(P, x, y) { return x === y ? P[0] : P[1]; }
  function siteP(tree, pat, t) { // sum over the two inner nodes
    var T = TREES[tree], P = jc(t), s = 0, x, y;
    for (x = 0; x < 4; x++) {
      var left = pr(EP, x, pat[T[0]]) * pr(EP, x, pat[T[1]]);
      for (y = 0; y < 4; y++) s += left * pr(P, x, y) * pr(EP, y, pat[T[2]]) * pr(EP, y, pat[T[3]]);
    }
    return 0.25 * s;
  }
  function counts(a, b, c) { return [NSITES - NSINGLE - a - b - c, NSINGLE, a, b, c]; }
  function lnLikeT(tree, t, cnt) {
    var s = 0;
    for (var i = 0; i < 5; i++) if (cnt[i]) s += cnt[i] * Math.log(siteP(tree, PATTERNS[i], t));
    return s;
  }
  function lnPostT(tree, t, cnt) { return t > 0 ? lnLikeT(tree, t, cnt) - t / T_MEAN : -Infinity; }

  // Grid answer for the trees: for each tree, add up prior x likelihood over a fine grid of t.
  var TN = 3000, TMAX = 3, TAB = null;
  function table() {
    if (TAB) return TAB;
    TAB = [];
    for (var tr = 0; tr < 3; tr++) {
      TAB.push([]);
      for (var i = 0; i < TN; i++) {
        var t = (i + 0.5) * TMAX / TN, row = [];
        for (var p = 0; p < 5; p++) row.push(Math.log(siteP(tr, PATTERNS[p], t)));
        TAB[tr].push(row);
      }
    }
    return TAB;
  }
  function gridT(cnt) {
    var tab = table(), ln = [[], [], []], m = -Infinity, tr, i, p;
    for (tr = 0; tr < 3; tr++) for (i = 0; i < TN; i++) {
      var s = -((i + 0.5) * TMAX / TN) / T_MEAN;
      for (p = 0; p < 5; p++) s += cnt[p] * tab[tr][i][p];
      ln[tr].push(s);
      if (s > m) m = s;
    }
    var tot = [0, 0, 0];
    for (tr = 0; tr < 3; tr++) for (i = 0; i < TN; i++) tot[tr] += Math.exp(ln[tr][i] - m);
    var all = tot[0] + tot[1] + tot[2];
    return tot.map(function (v) { return v / all; });
  }
  // Bootstrap for the same toy: resample sites, keep the tree with the best maximum likelihood.
  function bootT(cnt, B, r) {
    var tab = table(), wins = [0, 0, 0], step = 25, b, tr, i, p;
    for (b = 0; b < B; b++) {
      var c = [0, 0, 0, 0, 0];
      for (i = 0; i < NSITES; i++) {
        var u = r() * NSITES, acc = 0;
        for (p = 0; p < 5; p++) { acc += cnt[p]; if (u < acc) { c[p]++; break; } }
      }
      var best = [-Infinity, -Infinity, -Infinity];
      for (tr = 0; tr < 3; tr++) for (i = 0; i < TN; i += step) {
        var row = tab[tr][i], s = 0;
        for (p = 0; p < 5; p++) s += c[p] * row[p];
        if (s > best[tr]) best[tr] = s;
      }
      var top = Math.max(best[0], best[1], best[2]), tied = [];
      for (tr = 0; tr < 3; tr++) if (top - best[tr] < 1e-9) tied.push(tr);
      tied.forEach(function (x) { wins[x] += 1 / tied.length; });
    }
    return wins.map(function (v) { return v / B; });
  }
  // One step: half the time try a new inner branch length, half the time try one of the two other trees.
  function stepT(st, cnt, r) {
    var lnR, isTree = r() < 0.5;
    if (isTree) {
      var other = (st.tree + 1 + Math.floor(r() * 2)) % 3;
      var lp = lnPostT(other, st.t, cnt);
      lnR = lp - st.lp;
      st.tries++;
      if (Math.log(r()) < lnR) { st.tree = other; st.lp = lp; st.moves++; }
    } else {
      var prop = st.t + (r() - 0.5) * 0.1;
      if (prop < 0) prop = -prop;
      var lp2 = lnPostT(st.tree, prop, cnt);
      if (Math.log(r()) < lp2 - st.lp) { st.t = prop; st.lp = lp2; }
    }
  }
  function newChainT(tree, cnt) {
    return { tree: tree, t: 0.2, lp: lnPostT(tree, 0.2, cnt), tries: 0, moves: 0, trees: [] };
  }
  // Same sum as MrBayes: sample standard deviation between runs, for every split that reaches
  // 0.10 in at least one run, then the average.
  function asdsf(f1, f2) {
    var s = 0, n = 0;
    for (var i = 0; i < 3; i++) {
      if (f1[i] < 0.1 && f2[i] < 0.1) continue;
      var m = (f1[i] + f2[i]) / 2;
      s += Math.sqrt((f1[i] - m) * (f1[i] - m) + (f2[i] - m) * (f2[i] - m));
      n++;
    }
    return n ? s / n : 0;
  }
  // ---- CORE-END ----

  var $ = function (id) { return document.getElementById(id); };
  if (!$('s08-trace')) return;
  function fix(v, n) { return Number(v).toFixed(n); }
  function pct(v) { return (100 * v).toFixed(1) + ' %'; }
  function big(n) { return Math.round(n).toLocaleString('en-US'); }
  function svgOpen(h, label) { return '<svg viewBox="0 0 640 ' + h + '" width="100%" style="min-width:560px" role="img" aria-label="' + label + '">'; }

  // ------------------------------- distance walker -------------------------------
  var DATA = { a: { k: 3, n: 20 }, b: { k: 10, n: 100 }, c: { k: 100, n: 1000 }, none: { k: 0, n: 0 } };
  var PRIORS = { flat: { flat: 3 }, gentle: { a: 2, b: 20 }, strong: { a: 100, b: 200 } };
  var S = { data: 'b', prior: 'gentle', w: 0.3, start: 1.5, burn: 0.25, seed: 1, n0: 5000, tr: [], ok: [], last: null };

  function stepFromSlider() { return 0.002 * Math.pow(1000, +$('s08-step').value / 100); }
  function restart(n) {
    S.grid = gridD(DATA[S.data], PRIORS[S.prior]);
    S.r = rng(S.seed * 7919 + 13);
    S.st = { d: S.start, lp: lnPostD(S.start, DATA[S.data], PRIORS[S.prior]) };
    S.tr = [S.start]; S.ok = [0]; S.last = null;
    walk(n);
  }
  function walk(n) {
    for (var i = 0; i < n && S.tr.length <= 200000; i++) {
      S.last = stepD(S.st, S.w, DATA[S.data], PRIORS[S.prior], S.r);
      S.tr.push(S.st.d); S.ok.push(S.last.acc ? 1 : 0);
    }
    drawD();
  }
  function lastText() {
    var m = S.last;
    if (!m) return 'The walker has not moved yet.';
    var txt = 'Last step: the walker stood at d = ' + fix(m.from, 4) + ' and tried d = ' + fix(m.to, 4) + '. The ratio R (new height over old height) was ' + (m.R > 1000 ? 'above 1,000' : fix(m.R, 3)) + '. ';
    if (m.R >= 1) return txt + 'R is at least 1, so the move is always taken.';
    return txt + 'The random number was ' + fix(m.u, 3) + (m.acc ? ', below R, so the walker moved.' : ', not below R, so the walker stayed and d = ' + fix(m.from, 4) + ' was counted again.');
  }
  function drawD() {
    var n = S.tr.length, cut = Math.floor(n * S.burn), g = S.grid;
    var post = S.tr.slice(cut), N = post.length, i;
    var mean = 0; for (i = 0; i < N; i++) mean += post[i]; mean /= N;
    var sorted = post.slice().sort(function (a, b) { return a - b; });
    var lo = sorted[Math.floor(0.025 * (N - 1))], hi = sorted[Math.floor(0.975 * (N - 1))];
    var accN = 0; for (i = cut; i < n; i++) accN += S.ok[i];
    var acc = accN / Math.max(1, n - cut), E = ess(post);
    // trace
    var W = 640, H = 190, L = 46, R = 10, T = 10, B = 30, pw = W - L - R, ph = H - T - B;
    var ymax = 0; for (i = 0; i < n; i++) if (S.tr[i] > ymax) ymax = S.tr[i];
    ymax = Math.max(ymax, g.hi) * 1.08;
    var fx = function (v) { return L + v / Math.max(1, n - 1) * pw; }, fy = function (v) { return T + ph - v / ymax * ph; };
    var s = svgOpen(H, 'Trace plot: the value of d at each step of the chain');
    s += '<rect x="' + L + '" y="' + T + '" width="' + fix(fx(cut) - L, 1) + '" height="' + ph + '" style="fill:var(--err);opacity:.22"/>';
    s += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + fix(fy(g.lo), 1) + '" y2="' + fix(fy(g.lo), 1) + '"/><line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + fix(fy(g.hi), 1) + '" y2="' + fix(fy(g.hi), 1) + '"/>';
    var pts = [], every = Math.max(1, Math.floor(n / 1500));
    for (i = 0; i < n; i += every) pts.push(fix(fx(i), 1) + ',' + fix(fy(S.tr[i]), 1));
    s += '<polyline points="' + pts.join(' ') + '" style="fill:none;stroke:var(--accent);stroke-width:1"/>';
    s += '<line class="ax" x1="' + L + '" y1="' + (T + ph) + '" x2="' + (W - R) + '" y2="' + (T + ph) + '"/><line class="ax" x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (T + ph) + '"/>';
    [0, 0.5, 1].forEach(function (f) { s += '<text x="' + (L - 6) + '" y="' + fix(fy(ymax * f) + 4, 1) + '" text-anchor="end">' + fix(ymax * f, 2) + '</text>'; });
    s += '<text x="' + L + '" y="' + (H - 8) + '">step 0</text><text x="' + (W - R) + '" y="' + (H - 8) + '" text-anchor="end">step ' + big(n - 1) + '</text>';
    if (cut > 0) s += '<text x="' + fix(L + 4, 1) + '" y="' + (T + 12) + '">burn-in</text>';
    s += '<text x="' + (L + pw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" class="lab">trace of d</text></svg>';
    $('s08-trace').innerHTML = s;
    // histogram against the grid curve
    var xmax = Math.max(g.top * 1.1, sorted[N - 1] * 1.02), bins = 40, bw = xmax / bins, hist = new Array(bins).fill(0);
    for (i = 0; i < N; i++) hist[Math.min(bins - 1, Math.floor(post[i] / bw))]++;
    var dens = hist.map(function (c) { return c / N / bw; });
    var gmax = 0, tv = 0, j;
    var gmass = new Array(bins).fill(0);
    for (i = 0; i < g.x.length; i++) {
      if (g.post[i] > gmax) gmax = g.post[i];
      if (g.x[i] < xmax) gmass[Math.floor(g.x[i] / bw)] += g.post[i] * g.h;
    }
    for (j = 0; j < bins; j++) tv += Math.abs(hist[j] / N - gmass[j]) / 2;
    var y2 = Math.max(gmax, Math.max.apply(null, dens)) * 1.12;
    var hx = function (v) { return L + v / xmax * pw; }, hy = function (v) { return T + ph - Math.min(v, y2) / y2 * ph; };
    s = svgOpen(H, 'Histogram of the chain with the grid posterior and the prior drawn over it');
    for (j = 0; j < bins; j++) if (dens[j] > 0) s += '<rect x="' + fix(hx(j * bw), 1) + '" y="' + fix(hy(dens[j]), 1) + '" width="' + fix(bw / xmax * pw - 0.5, 1) + '" height="' + fix(T + ph - hy(dens[j]), 1) + '" style="fill:var(--accent);opacity:.45"/>';
    var cg = [], cp = [], st2 = Math.max(1, Math.floor(xmax / g.h / 400));
    for (i = 0; i < g.x.length && g.x[i] <= xmax; i += st2) { cg.push(fix(hx(g.x[i]), 1) + ',' + fix(hy(g.post[i]), 1)); cp.push(fix(hx(g.x[i]), 1) + ',' + fix(hy(g.prior[i]), 1)); }
    s += '<polyline points="' + cp.join(' ') + '" style="fill:none;stroke:var(--muted);stroke-width:1.3;stroke-dasharray:4 3"/>';
    s += '<polyline points="' + cg.join(' ') + '" style="fill:none;stroke:var(--het);stroke-width:2"/>';
    s += '<line class="ax" x1="' + L + '" y1="' + (T + ph) + '" x2="' + (W - R) + '" y2="' + (T + ph) + '"/>';
    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) { s += '<text x="' + fix(hx(xmax * f), 1) + '" y="' + (T + ph + 15) + '" text-anchor="' + (f === 1 ? 'end' : 'middle') + '">' + fix(xmax * f, xmax < 1 ? 3 : 2) + '</text>'; });
    s += '<text x="' + (L + pw / 2) + '" y="' + (H - 2) + '" text-anchor="middle" class="lab">distance d</text></svg>';
    $('s08-hist').innerHTML = s;
    // numbers
    var sd = 0; for (i = 0; i < N; i++) sd += (post[i] - mean) * (post[i] - mean); sd = Math.sqrt(sd / Math.max(1, N - 1));
    var z = Math.abs(mean - g.mean) / Math.max(1e-12, sd / Math.sqrt(E));
    $('s08-r-n').textContent = big(N) + ' of ' + big(n);
    $('s08-r-acc').textContent = pct(acc);
    $('s08-r-ess').textContent = big(E);
    $('s08-r-mean').textContent = fix(mean, 4) + ' / ' + fix(g.mean, 4);
    $('s08-r-ci').textContent = fix(lo, 3) + '-' + fix(hi, 3) + ' / ' + fix(g.lo, 3) + '-' + fix(g.hi, 3);
    $('s08-r-tv').textContent = pct(tv);
    var msg, good = E >= 200 && tv < 0.1 && z < 3;
    if (good) msg = '<b>Control passed:</b> the chain agrees with the grid (ESS of at least 200, histogram within 10 % of the grid, means within 3 standard errors).';
    else if (E < 200) msg = '<b>Not trustworthy yet:</b> the ESS is below 200, so these samples are worth too few independent draws. Walk longer or change the step size.';
    else msg = '<b>Chain and grid disagree:</b> the part kept after burn-in does not match the grid. Part of the walk toward the hill may still be in the sample, or the chain needs more steps.';
    if (acc < 0.1) msg += ' Few moves are accepted: the steps are too big.';
    else if (acc > 0.8) msg += ' Almost every move is accepted: the steps are too small.';
    $('s08-verdict').innerHTML = msg;
    $('s08-last').textContent = lastText();
    $('s08-more1').disabled = n > 200000; $('s08-more2').disabled = n > 200000; $('s08-more3').disabled = n > 200000;
  }
  function seg(id, set) {
    var box = $(id);
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      box.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      set(b.getAttribute('data-v'));
    });
  }
  seg('s08-data', function (v) { S.data = v; restart(S.n0); });
  seg('s08-prior', function (v) { S.prior = v; restart(S.n0); });
  $('s08-step').addEventListener('input', function () { S.w = stepFromSlider(); $('s08-step-o').textContent = fix(S.w, S.w < 0.1 ? 3 : 2); restart(S.n0); });
  $('s08-start').addEventListener('input', function (e) { S.start = +e.target.value; $('s08-start-o').textContent = fix(S.start, 2); restart(S.n0); });
  $('s08-burn').addEventListener('input', function (e) { S.burn = +e.target.value / 100; $('s08-burn-o').textContent = e.target.value + ' %'; drawD(); });
  $('s08-more1').addEventListener('click', function () { walk(1); });
  $('s08-more2').addEventListener('click', function () { walk(1000); });
  $('s08-more3').addEventListener('click', function () { walk(20000); });
  $('s08-again').addEventListener('click', function () { S.seed++; restart(S.n0); });
  restart(S.n0);

  // ------------------------------- walker over three trees -------------------------------
  var names = ['Tree 1: AB | CD', 'Tree 2: AC | BD', 'Tree 3: AD | BC'];
  var X = { a: 6, b: 4, c: 2, seed: 1, n0: 20000 };
  function restartT(n) {
    X.cnt = counts(X.a, X.b, X.c);
    X.grid = gridT(X.cnt);
    X.boot = bootT(X.cnt, 1000, rng(4242));
    var r = rng(X.seed * 104729 + 5);
    X.r = r;
    X.runs = [newChainT(0, X.cnt), newChainT(1, X.cnt)];
    walkT(n);
  }
  function walkT(n) {
    X.runs.forEach(function (c) {
      for (var i = 0; i < n && c.trees.length < 400000; i++) { stepT(c, X.cnt, X.r); c.trees.push(c.tree); }
    });
    drawT();
  }
  function freqs(c) {
    var cut = Math.floor(c.trees.length * 0.25), f = [0, 0, 0], i;
    for (i = cut; i < c.trees.length; i++) f[c.trees[i]]++;
    return f.map(function (v) { return v / Math.max(1, c.trees.length - cut); });
  }
  function drawT() {
    var f1 = freqs(X.runs[0]), f2 = freqs(X.runs[1]), n = X.runs[0].trees.length, i;
    // bars
    var W = 640, rowH = 58, H = 3 * rowH + 8, L = 118, R = 54, pw = W - L - R;
    var s = svgOpen(H, 'Posterior probability of each tree from the grid and the two runs, with the bootstrap proportion');
    var series = [['grid', X.grid, 'var(--het)'], ['run 1', f1, 'var(--accent)'], ['run 2', f2, 'var(--rep)'], ['boot', X.boot, 'var(--muted)']];
    for (i = 0; i < 3; i++) {
      var y0 = 6 + i * rowH;
      s += '<text class="lab" x="0" y="' + (y0 + 26) + '">' + names[i].slice(0, 6) + '</text><text x="0" y="' + (y0 + 40) + '">' + names[i].slice(8) + '</text>';
      series.forEach(function (q, j) {
        var y = y0 + j * 12, w = q[1][i] * pw;
        s += '<text x="' + (L - 6) + '" y="' + (y + 9) + '" text-anchor="end">' + q[0] + '</text>';
        s += '<rect x="' + L + '" y="' + y + '" width="' + fix(Math.max(w, 0.5), 1) + '" height="9" style="fill:' + q[2] + '"/>';
        s += '<text x="' + fix(L + w + 5, 1) + '" y="' + (y + 9) + '">' + fix(q[1][i], 3) + '</text>';
      });
    }
    $('s08-bars').innerHTML = s + '</svg>';
    // trace over the three trees
    var Ht = 120, Lt = 46, Rt = 10, Tt = 8, pwt = 640 - Lt - Rt, rowY = [28, 62, 96];
    s = svgOpen(Ht, 'Which tree each run was on at each step');
    var cutX = Lt + 0.25 * pwt;
    s += '<rect x="' + Lt + '" y="' + Tt + '" width="' + fix(cutX - Lt, 1) + '" height="' + (Ht - Tt - 8) + '" style="fill:var(--err);opacity:.22"/>';
    ['Tree 1', 'Tree 2', 'Tree 3'].forEach(function (t, k) { s += '<text x="' + (Lt - 6) + '" y="' + (rowY[k] + 4) + '" text-anchor="end">' + t + '</text><line class="grid" x1="' + Lt + '" x2="' + (640 - Rt) + '" y1="' + rowY[k] + '" y2="' + rowY[k] + '"/>'; });
    X.runs.forEach(function (c, k) {
      var pts = [], m = c.trees.length, every = Math.max(1, Math.floor(m / 1200)), off = k ? 4 : -4;
      for (i = 0; i < m; i += every) pts.push(fix(Lt + i / Math.max(1, m - 1) * pwt, 1) + ',' + (rowY[c.trees[i]] + off));
      s += '<polyline points="' + pts.join(' ') + '" style="fill:none;stroke:var(--' + (k ? 'rep' : 'accent') + ');stroke-width:1;stroke-linejoin:bevel"/>';
    });
    $('s08-ttrace').innerHTML = s + '</svg>';
    // numbers
    var pooled = [0, 1, 2].map(function (k) { return (f1[k] + f2[k]) / 2; });
    var maxdiff = Math.max(Math.abs(pooled[0] - X.grid[0]), Math.abs(pooled[1] - X.grid[1]), Math.abs(pooled[2] - X.grid[2]));
    var tries = X.runs[0].tries + X.runs[1].tries, moves = X.runs[0].moves + X.runs[1].moves;
    var bound = Math.min(1, 2 * (1 - Math.max.apply(null, X.grid))), sd = asdsf(f1, f2);
    $('s08-t-n').textContent = big(n) + ' per run';
    $('s08-t-sd').textContent = fix(sd, 4);
    $('s08-t-diff').textContent = fix(maxdiff, 4);
    $('s08-t-acc').textContent = pct(moves / Math.max(1, tries)) + ' (limit ' + pct(bound) + ')';
    var msg;
    if (sd > 0.05) msg = '<b>The runs disagree:</b> the average standard deviation of split frequencies is above 0.05. Neither run can be trusted yet. Add steps.';
    else if (maxdiff > 0.02) msg = '<b>The runs agree, but they are not yet close to the grid.</b> Agreement alone does not prove a good sample. Add steps.';
    else msg = '<b>Control passed:</b> the two runs agree with each other, and their average is within 0.02 of the grid for all three trees.';
    $('s08-t-verdict').innerHTML = msg;
    $('s08-tmore1').disabled = n >= 400000; $('s08-tmore2').disabled = n >= 400000;
  }
  function setSites(a, b, c) {
    X.a = a; X.b = b; X.c = c;
    $('s08-sa').value = a; $('s08-sb').value = b; $('s08-sc').value = c;
    $('s08-sa-o').textContent = a; $('s08-sb-o').textContent = b; $('s08-sc-o').textContent = c;
    restartT(X.n0);
  }
  seg('s08-len', function (v) { X.n0 = +v; restartT(X.n0); });
  seg('s08-presets', function (v) { var p = v.split(',').map(Number); setSites(p[0], p[1], p[2]); });
  ['a', 'b', 'c'].forEach(function (k) {
    $('s08-s' + k).addEventListener('input', function () {
      $('s08-presets').querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      setSites(+$('s08-sa').value, +$('s08-sb').value, +$('s08-sc').value);
    });
  });
  $('s08-tmore1').addEventListener('click', function () { walkT(20000); });
  $('s08-tmore2').addEventListener('click', function () { walkT(100000); });
  $('s08-tagain').addEventListener('click', function () { X.seed++; restartT(X.n0); });
  setSites(X.a, X.b, X.c);
})();
