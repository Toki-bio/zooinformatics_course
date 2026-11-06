(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  // ENGINE-BEGIN
  // JC69 likelihood on an unrooted 4-taxon tree. Tips are numbered 0-3 (P, Q, R, S).
  // top = [[a, b], [c, d]]: tips a, b hang on internal node u; tips c, d hang on internal node v.
  // t[i] = length of the branch to tip i, m = length of the internal branch.
  var BASES = 'ACGT';
  var TOPS = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
  var BLMIN = 1e-6, BLMAX = 10;
  function pSame(t) { return 0.25 + 0.75 * Math.exp(-4 * t / 3); }
  function pDiff(t) { return 0.25 - 0.25 * Math.exp(-4 * t / 3); }
  function pij(i, j, t) { return i === j ? pSame(t) : pDiff(t); }
  // A tip's vector: 1 for the observed base. A gap or N is unknown: 1 for every base.
  function tipVec(c) {
    var i = BASES.indexOf(c);
    return i < 0 ? [1, 1, 1, 1] : [0, 1, 2, 3].map(function (s) { return s === i ? 1 : 0; });
  }
  // Carry a vector along a branch of length t: out[s] = sum over b of P(s -> b | t) * v[b].
  // Under JC69 every change has the same chance, so the sum needs only two numbers.
  function along(v, t) {
    var a = pSame(t), b = pDiff(t), w = b * (v[0] + v[1] + v[2] + v[3]), c = a - b;
    return [w + c * v[0], w + c * v[1], w + c * v[2], w + c * v[3]];
  }
  function times(a, b) { return a.map(function (x, i) { return x * b[i]; }); }
  // Felsenstein pruning. site = 4 letters. Returns every intermediate vector.
  function prune(site, top, t, m) {
    var a = top[0][0], b = top[0][1], c = top[1][0], d = top[1][1];
    var tips = [0, 1, 2, 3].map(function (i) { return tipVec(site[i]); });
    var fa = along(tips[a], t[a]), fb = along(tips[b], t[b]);
    var u = times(fa, fb);
    var fc = along(tips[c], t[c]), fd = along(tips[d], t[d]), fu = along(u, m);
    var v = times(times(fc, fd), fu);
    var L = 0.25 * (v[0] + v[1] + v[2] + v[3]);
    return { tips: tips, fa: fa, fb: fb, u: u, fc: fc, fd: fd, fu: fu, v: v, L: L };
  }
  // Brute force: write out every assignment of bases to the two internal nodes (and to any
  // unknown tip) and add up the products. Shares only pij with prune().
  function brute(site, top, t, m) {
    var a = top[0][0], b = top[0][1], c = top[1][0], d = top[1][1];
    function opts(ch) { var i = BASES.indexOf(ch); return i < 0 ? [0, 1, 2, 3] : [i]; }
    var terms = [], L = 0, x, y, i, j, k, l;
    for (y = 0; y < 4; y++) for (x = 0; x < 4; x++) {
      var sum = 0;
      var oa = opts(site[a]), ob = opts(site[b]), oc = opts(site[c]), od = opts(site[d]);
      for (i = 0; i < oa.length; i++) for (j = 0; j < ob.length; j++)
        for (k = 0; k < oc.length; k++) for (l = 0; l < od.length; l++)
          sum += 0.25 * pij(y, x, m) * pij(x, oa[i], t[a]) * pij(x, ob[j], t[b]) * pij(y, oc[k], t[c]) * pij(y, od[l], t[d]);
      terms.push({ u: x, v: y, val: sum });
      L += sum;
    }
    return { terms: terms, L: L };
  }
  // Identical columns have identical likelihoods, so each distinct column is computed once.
  function patterns(seqs) {
    var map = {}, list = [], n = seqs[0].length;
    for (var i = 0; i < n; i++) {
      var col = seqs[0][i] + seqs[1][i] + seqs[2][i] + seqs[3][i];
      if (!(col in map)) { map[col] = list.length; list.push({ col: col, n: 0 }); }
      list[map[col]].n++;
    }
    return list;
  }
  function lnLik(pats, top, t, m) {
    var s = 0;
    for (var i = 0; i < pats.length; i++) s += pats[i].n * Math.log(prune(pats[i].col, top, t, m).L);
    return s;
  }
  // Golden-section search for the largest f(x) on [lo, hi].
  function golden(f, lo, hi, tol) {
    var g = (Math.sqrt(5) - 1) / 2, a = lo, b = hi;
    var c = b - g * (b - a), d = a + g * (b - a), fc = f(c), fd = f(d);
    while (b - a > tol) {
      if (fc > fd) { b = d; d = c; fd = fc; c = b - g * (b - a); fc = f(c); }
      else { a = c; c = d; fc = fd; d = a + g * (b - a); fd = f(d); }
    }
    return (a + b) / 2;
  }
  // Branch lengths by ML: improve one branch at a time, the others held still, and go round
  // until a full round gains almost nothing. Searched on a log scale between BLMIN and BLMAX.
  function optimise(pats, top, start) {
    var t = start ? start.t.slice() : [0.1, 0.1, 0.1, 0.1], m = start ? start.m : 0.1;
    var lo = Math.log(BLMIN), hi = Math.log(BLMAX), last = lnLik(pats, top, t, m), rounds = 0;
    function one(set) {
      // keep the old value if the search did not beat it
      var keep = set(), x = golden(function (z) { set(Math.exp(z)); return lnLik(pats, top, t, m); }, lo, hi, 1e-5);
      set(keep); var before = lnLik(pats, top, t, m);
      set(Math.exp(x)); if (lnLik(pats, top, t, m) < before) set(keep);
    }
    for (rounds = 1; rounds <= 60; rounds++) {
      [0, 1, 2, 3].forEach(function (i) { one(function (v) { if (v !== undefined) t[i] = v; return t[i]; }); });
      one(function (v) { if (v !== undefined) m = v; return m; });
      var now = lnLik(pats, top, t, m);
      if (now - last < 1e-7) { last = now; break; }
      last = now;
    }
    return { t: t, m: m, lnL: last, rounds: rounds };
  }
  // Even on one fixed tree a short alignment can have more than one peak: a change shared by
  // nothing can sit on either of two sister tips. So start from five fixed points and keep the best.
  function bestOf(pats, top) {
    var a = top[0][0], b = top[0][1], c = top[1][0], d = top[1][1], best = optimise(pats, top);
    [[a, c], [a, d], [b, c], [b, d]].forEach(function (pair) {
      var t = [0.1, 0.1, 0.1, 0.1];
      t[pair[0]] = 0.001; t[pair[1]] = 0.001;
      var r = optimise(pats, top, { t: t, m: 0.1 });
      if (r.lnL > best.lnL) best = r;
    });
    return best;
  }
  // Two sequences, n sites, k differences, JC69. The root sits on one sequence, so one branch of length d.
  function lnL2(n, k, d) { return n * Math.log(0.25) + (n - k) * Math.log(pSame(d)) + k * Math.log(pDiff(d)); }
  function closedForm(n, k) { return -0.75 * Math.log(1 - 4 * k / (3 * n)); }
  function numericD(n, k) {
    return Math.exp(golden(function (z) { return lnL2(n, k, Math.exp(z)); }, Math.log(BLMIN), Math.log(BLMAX), 1e-9));
  }
  // ENGINE-END

  var TIPN = ['P', 'Q', 'R', 'S'];
  var TOPN = ['PQ | RS', 'PR | QS', 'PS | QR'];
  function sig(x) {
    if (x === 0) return '0';
    if (Math.abs(x) >= 0.001) return x.toFixed(4);
    return x.toExponential(2);
  }

  /* ---------- figure 1: pruning step by step ---------- */
  var st = { top: 0, site: ['A', 'A', 'G', 'G'], t: [0.1, 0.1, 0.1, 0.1], m: 0.1, step: 0 };
  var STEPS = 4;
  function box(svg, x, y, title, vec, show, hot) {
    el('rect', { x: x, y: y, width: 104, height: 78, rx: 3, fill: 'var(--panel)', stroke: hot ? 'var(--het)' : 'var(--line)', 'stroke-width': hot ? 2 : 1 }, svg);
    el('text', { x: x + 6, y: y + 13, class: 'lab' }, svg, title);
    for (var i = 0; i < 4; i++) {
      el('text', { x: x + 6, y: y + 28 + i * 13 }, svg, BASES[i]);
      var txt = show ? sig(vec[i]) : '?';
      var nz = show && vec[i] > 0;
      el('text', { x: x + 98, y: y + 28 + i * 13, 'text-anchor': 'end', class: nz ? 'lab' : '' }, svg, txt);
    }
  }
  function drawTree(R) {
    var host = $('s06-tree'); host.textContent = '';
    var svg = el('svg', { viewBox: '0 0 720 300', width: '100%', style: 'min-width:600px', role: 'img', 'aria-label': 'Four-taxon tree with the vector of conditional likelihoods at each tip and internal node' }, host);
    var top = TOPS[st.top], a = top[0][0], b = top[0][1], c = top[1][0], d = top[1][1];
    var U = [255, 150], V = [465, 150];
    var ends = [[a, 112, 62, U], [b, 112, 238, U], [c, 608, 62, V], [d, 608, 238, V]];
    ends.forEach(function (e) {
      el('line', { x1: e[1], y1: e[2], x2: e[3][0], y2: e[3][1], stroke: 'var(--fg)', 'stroke-width': 1.6 }, svg);
      var left = e[1] < 360, up = e[2] < 150;
      el('text', { x: (e[1] + e[3][0]) / 2 + (left ? -12 : 12), y: (e[2] + e[3][1]) / 2 + (up ? 20 : -12), 'text-anchor': left ? 'end' : 'start' }, svg, 't = ' + st.t[e[0]].toFixed(2));
    });
    el('line', { x1: U[0], y1: U[1], x2: V[0], y2: V[1], stroke: 'var(--fg)', 'stroke-width': 1.6 }, svg);
    el('text', { x: 360, y: 142, 'text-anchor': 'middle' }, svg, 'm = ' + st.m.toFixed(2));
    [[U, 'u'], [V, 'v']].forEach(function (n) {
      el('circle', { cx: n[0][0], cy: n[0][1], r: 5, fill: 'var(--accent)' }, svg);
      el('text', { x: n[0][0], y: n[0][1] + 20, 'text-anchor': 'middle', class: 'lab' }, svg, n[1]);
    });
    box(svg, 8, 23, 'tip ' + TIPN[a] + ' = ' + st.site[a], R.tips[a], true, false);
    box(svg, 8, 199, 'tip ' + TIPN[b] + ' = ' + st.site[b], R.tips[b], true, false);
    box(svg, 608, 23, 'tip ' + TIPN[c] + ' = ' + st.site[c], R.tips[c], true, false);
    box(svg, 608, 199, 'tip ' + TIPN[d] + ' = ' + st.site[d], R.tips[d], true, false);
    box(svg, 203, 8, 'node u', R.u, st.step >= 1, st.step === 1);
    box(svg, 413, 8, 'node v', R.v, st.step >= 2, st.step === 2);
    if (st.step >= 3) {
      el('text', { x: 360, y: 282, 'text-anchor': 'middle', class: 'lab' }, svg, 'L = \u00bc \u00d7 (sum of node v) = ' + sig(R.L));
    }
  }
  function work(R) {
    var top = TOPS[st.top], a = TIPN[top[0][0]], b = TIPN[top[0][1]], c = TIPN[top[1][0]], d = TIPN[top[1][1]];
    var out = '';
    if (st.step === 0) {
      out = 'Start. Each tip knows its own base: 1 for the base we see, 0 for the others.\nA gap or N would be 1 for all four bases: "could be anything".\nThe internal nodes are unknown.';
    } else if (st.step === 1) {
      out = 'Node u, for each base it might have had:\n(chance of ' + a + "'s data, coming from that base) x (chance of " + b + "'s data, coming from that base)\n";
      for (var i = 0; i < 4; i++) out += '  u = ' + BASES[i] + ':  ' + sig(R.fa[i]) + ' x ' + sig(R.fb[i]) + ' = ' + sig(R.u[i]) + '\n';
    } else if (st.step === 2) {
      out = "Node v, the same way. It has three neighbours: " + c + ', ' + d + ', and all of node u carried along branch m:\n';
      for (var j = 0; j < 4; j++) out += '  v = ' + BASES[j] + ':  ' + sig(R.fc[j]) + ' x ' + sig(R.fd[j]) + ' x ' + sig(R.fu[j]) + ' = ' + sig(R.v[j]) + '\n';
    } else {
      out = 'Finish. Each base has chance 1/4 of being at v, under JC69. Weight and add:\n  L = 0.25 x (' + R.v.map(sig).join(' + ') + ')\n    = ' + sig(R.L) + '\n  ln L = ' + Math.log(R.L).toFixed(4);
    }
    $('s06-work').textContent = out.replace(/\n$/, '');
  }
  function render1() {
    var top = TOPS[st.top];
    var R = prune(st.site, top, st.t, st.m), B = brute(st.site, top, st.t, st.m);
    drawTree(R); work(R);
    $('s06-r-L').textContent = sig(R.L);
    $('s06-r-ln').textContent = Math.log(R.L).toFixed(4);
    $('s06-r-b').textContent = sig(B.L);
    var rel = Math.abs(R.L - B.L) / B.L;
    $('s06-r-d').textContent = rel < 1e-12 ? 'agree (' + rel.toExponential(1) + ')' : 'DISAGREE ' + rel.toExponential(1);
    $('s06-steplab').textContent = 'Step ' + (st.step + 1) + ' of ' + STEPS;
    $('s06-prev').disabled = st.step === 0;
    $('s06-next').disabled = st.step === STEPS - 1;
    var rows = B.terms.slice().sort(function (p, q) { return q.val - p.val; });
    var txt = 'u  v   product        share of L\n';
    rows.forEach(function (r) {
      txt += BASES[r.u] + '  ' + BASES[r.v] + '   ' + (sig(r.val) + '          ').slice(0, 13) + '  ' + (100 * r.val / B.L).toFixed(1) + ' %\n';
    });
    $('s06-terms').textContent = txt + 'sum of all 16 = ' + sig(B.L);
  }
  function setStep(s) { st.step = Math.max(0, Math.min(STEPS - 1, s)); render1(); }
  function pressed(ids, on) { ids.forEach(function (id, i) { $(id).setAttribute('aria-pressed', i === on ? 'true' : 'false'); }); }
  var topIds = ['s06-top0', 's06-top1', 's06-top2'];
  topIds.forEach(function (id, i) {
    $(id).addEventListener('click', function () { st.top = i; pressed(topIds, i); render1(); });
  });
  [0, 1, 2, 3].forEach(function (i) {
    var s = $('s06-tip' + i), tt = $('s06-t' + i), o = $('s06-t' + i + '-o');
    s.value = st.site[i]; tt.value = st.t[i]; o.textContent = st.t[i].toFixed(2);
    s.addEventListener('change', function () { st.site[i] = s.value; render1(); });
    tt.addEventListener('input', function () { st.t[i] = +tt.value; o.textContent = st.t[i].toFixed(2); render1(); });
  });
  $('s06-m').value = st.m; $('s06-m-o').textContent = st.m.toFixed(2);
  $('s06-m').addEventListener('input', function () { st.m = +$('s06-m').value; $('s06-m-o').textContent = st.m.toFixed(2); render1(); });
  $('s06-prev').addEventListener('click', function () { setStep(st.step - 1); });
  $('s06-next').addEventListener('click', function () { setStep(st.step + 1); });
  $('s06-all').addEventListener('click', function () { setStep(STEPS - 1); });
  $('s06-reset').addEventListener('click', function () { setStep(0); });
  render1();

  /* ---------- figure 2: JC69 distance by likelihood ---------- */
  function render2() {
    var nI = $('s06-n'), kI = $('s06-k');
    var n = +nI.value;
    kI.max = n;
    if (+kI.value > n) kI.value = n;
    var k = +kI.value, p = k / n;
    $('s06-n-o').textContent = n; $('s06-k-o').textContent = k;
    var host = $('s06-curve'); host.textContent = '';
    var W = 640, H = 270, x0 = 62, x1 = W - 16, y0 = 16, y1 = H - 40, DM = 3;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: 'min-width:520px', role: 'img', 'aria-label': 'Log-likelihood of the distance between two sequences, with its peak marked' }, host);
    var xs = [], ys = [], i, d, lo = Infinity, hi = -Infinity;
    for (i = 0; i <= 300; i++) {
      d = 0.002 + (DM - 0.002) * i / 300;
      var y = lnL2(n, k, d); xs.push(d); ys.push(y);
      if (y > hi) hi = y;
      if (y < lo) lo = y;
    }
    var floor = hi - Math.max(20, n * 0.4);
    if (lo < floor) lo = floor;
    if (hi - lo < 1) lo = hi - 1;
    var X = function (v) { return x0 + (x1 - x0) * v / DM; };
    var Y = function (v) { return y1 - (y1 - y0) * (v - lo) / (hi - lo); };
    el('path', { d: 'M' + x0 + ' ' + y0 + 'V' + y1 + 'H' + x1, class: 'ax' }, svg);
    for (i = 0; i <= 6; i++) {
      el('text', { x: X(i * 0.5), y: y1 + 15, 'text-anchor': 'middle' }, svg, (i * 0.5).toFixed(1));
    }
    el('text', { x: (x0 + x1) / 2, y: H - 6, 'text-anchor': 'middle', class: 'lab' }, svg, 'd, the branch length (substitutions per site)');
    el('text', { x: 14, y: (y0 + y1) / 2, 'text-anchor': 'middle', class: 'lab', transform: 'rotate(-90 14 ' + (y0 + y1) / 2 + ')' }, svg, 'ln L');
    el('text', { x: x0 - 6, y: y0 + 9, 'text-anchor': 'end' }, svg, hi.toFixed(1));
    el('text', { x: x0 - 6, y: y1, 'text-anchor': 'end' }, svg, lo.toFixed(1));
    var path = '', pen = false;
    for (i = 0; i < xs.length; i++) {
      if (ys[i] < lo) { pen = false; continue; }
      path += (pen ? 'L' : 'M') + X(xs[i]).toFixed(1) + ' ' + Y(ys[i]).toFixed(1); pen = true;
    }
    el('path', { d: path, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2 }, svg);
    var msg = '', cf = '-', nu = '-', gap = '-';
    if (k === 0) {
      msg = 'No differences: the likelihood is highest at d = 0, so the branch has no length. Programs stop at a small minimum instead.';
      cf = '0'; nu = numericD(n, k).toExponential(1); gap = 'at the minimum';
    } else if (p >= 0.75) {
      msg = 'p is 0.75 or more: the curve keeps rising and has no peak, and the formula takes the logarithm of zero or less. Two unrelated random sequences differ at about 75 % of sites, so this pair has no measurable distance. A program stops at its maximum branch length.';
      nu = '> ' + DM; cf = 'none';
    } else {
      var c = closedForm(n, k), q = numericD(n, k);
      cf = c.toFixed(5); nu = q.toFixed(5); gap = Math.abs(c - q).toExponential(1);
      if (c <= DM) {
        el('line', { x1: X(c), x2: X(c), y1: y0, y2: y1, stroke: 'var(--het)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, svg);
        var right = X(c) < W / 2;
        el('text', { x: X(c) + (right ? 6 : -6), y: y1 - 8, 'text-anchor': right ? 'start' : 'end', class: 'lab' }, svg, 'peak: d = ' + c.toFixed(3));
      }
      msg = 'The peak of the curve and the formula give the same distance. Note that d is larger than p (' + p.toFixed(3) + '): hidden repeat changes are counted in.';
    }
    $('s06-q-p').textContent = p.toFixed(3);
    $('s06-q-c').textContent = cf;
    $('s06-q-n').textContent = nu;
    $('s06-q-g').textContent = gap;
    $('s06-q-m').textContent = msg;
  }
  $('s06-n').addEventListener('input', render2);
  $('s06-k').addEventListener('input', render2);
  render2();

  /* ---------- figure 3: three topologies on a short alignment ---------- */
  var PRESETS = {
    clear: ['ACGTTGCAAGCTTACGGATCCATG', 'ACGTTGCAAGCTTACGGATCCTTG', 'ACATTGTAAGTTTATGGACCCATG', 'ACATTGTAAGTTTATGGACCCATC'],
    conflict: ['ACGTTGCAAGCTTACGGATCCATG', 'ACGTTGCAAGCTTATGGACCCATG', 'ACATTGTAAGTTTACGGATCCATG', 'ACATTGTAAGTTTATGGACCCATC'],
    nosignal: ['ACGTTGCAAGCTTACGGATCCATG', 'ACGTAGCAAGCTTACGCATCCATG', 'ACGTTGCTAGCTTACGGATCGATG', 'ACGTTGCAAGCATACGGATCCTTG'],
    gaps: ['ACGTTGCAAGCTTACGGATCCATG', 'ACGTTGCAAGC---CGGATCCTTG', 'ACATTGTAAGTTTATGGACCCATG', 'ACATTGTAAGNNNNTGGACCCATC']
  };
  var preIds = { clear: 's06-pre-clear', conflict: 's06-pre-conf', nosignal: 's06-pre-none', gaps: 's06-pre-gap' };
  function readSeqs() {
    return [0, 1, 2, 3].map(function (i) { return $('s06-seq' + i).value.toUpperCase().replace(/[^ACGTN?-]/g, ''); });
  }
  function drawSites(seqs, res, order) {
    var host = $('s06-sites'); host.textContent = '';
    var n = seqs[0].length, W = 640, H = 196, x0 = 40, x1 = W - 10, mid = 86, half = 60;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: 'min-width:520px', role: 'img', 'aria-label': 'Per-site log-likelihood difference between the two best topologies' }, host);
    var A = order[0], B = order[1], diffs = [], mx = 0.5, i;
    for (i = 0; i < n; i++) {
      var col = seqs[0][i] + seqs[1][i] + seqs[2][i] + seqs[3][i];
      var la = Math.log(prune(col, TOPS[A], res[A].t, res[A].m).L);
      var lb = Math.log(prune(col, TOPS[B], res[B].t, res[B].m).L);
      diffs.push(la - lb);
      if (Math.abs(la - lb) > mx) mx = Math.abs(la - lb);
    }
    el('line', { x1: x0, x2: x1, y1: mid, y2: mid, stroke: 'var(--line)' }, svg);
    var bw = (x1 - x0) / n;
    diffs.forEach(function (v, j) {
      var h = half * Math.abs(v) / mx;
      el('rect', { x: x0 + j * bw + 1, y: v >= 0 ? mid - h : mid, width: Math.max(1, bw - 2), height: Math.max(h, 0.5), fill: v >= 0 ? 'var(--accent)' : 'var(--het)' }, svg);
      if ((j + 1) % 5 === 0 || j === 0) el('text', { x: x0 + (j + 0.5) * bw, y: H - 6, 'text-anchor': 'middle' }, svg, j + 1);
    });
    if (mx === 0.5 && diffs.every(function (v) { return Math.abs(v) < 0.001; })) {
      el('text', { x: x0, y: 13, class: 'lab' }, svg, 'no site prefers one tree over another');
    } else {
      el('text', { x: x0, y: 13, class: 'lab' }, svg, 'up: site prefers ' + TOPN[A]);
      el('text', { x: x0, y: mid + half + 17, class: 'lab' }, svg, 'down: site prefers ' + TOPN[B]);
    }
    el('text', { x: 4, y: mid - 2 }, svg, '+' + mx.toFixed(1));
    el('text', { x: 4, y: mid + 11 }, svg, '\u2212' + mx.toFixed(1));
  }
  function render3() {
    var seqs = readSeqs(), n = seqs[0].length;
    var bad = !n || seqs.some(function (s) { return s.length !== n; });
    var msg = $('s06-a-msg');
    if (bad) { msg.textContent = 'The four sequences must have the same length.'; return; }
    if (n > 40) { msg.textContent = 'Please keep the alignment to 40 sites or fewer.'; return; }
    var pats = patterns(seqs);
    var res = TOPS.map(function (top) { return bestOf(pats, top); });
    var order = [0, 1, 2].sort(function (a, b) { return res[b].lnL - res[a].lnL; });
    var best = res[order[0]].lnL, body = $('s06-a-body');
    body.textContent = '';
    [0, 1, 2].forEach(function (i) {
      var r = res[i], tr = document.createElement('tr');
      var cells = [TOPN[i], r.lnL.toFixed(3), (Math.abs(r.lnL - best) < 0.0005 ? 0 : r.lnL - best).toFixed(3), r.m.toFixed(4)].concat(r.t.map(function (x) { return x.toFixed(3); }));
      cells.forEach(function (c, j) {
        var td = document.createElement('td'); td.textContent = c;
        if (j === 0 && i === order[0] && best - res[order[1]].lnL > 0.001) td.style.fontWeight = '700';
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    var gap = best - res[order[1]].lnL;
    $('s06-a-pat').textContent = n + ' sites, ' + pats.length + ' distinct columns';
    $('s06-a-best').textContent = gap < 0.001 ? 'tie' : TOPN[order[0]];
    $('s06-a-gap').textContent = gap.toFixed(3);
    msg.textContent = gap < 0.001
      ? 'All the best trees score the same: these data give no reason to prefer one. Look at the internal branch: it has shrunk to almost nothing.'
      : 'Best tree ' + TOPN[order[0]] + ', ahead of the next by ' + gap.toFixed(2) + ' log units. On these few sites that is a score, not a measure of confidence (section 07).';
    drawSites(seqs, res, order);
  }
  var typing = 0;
  function loadPreset(name) {
    [0, 1, 2, 3].forEach(function (i) { $('s06-seq' + i).value = PRESETS[name][i]; });
    Object.keys(preIds).forEach(function (k) { $(preIds[k]).setAttribute('aria-pressed', k === name ? 'true' : 'false'); });
    render3();
  }
  Object.keys(preIds).forEach(function (k) { $(preIds[k]).addEventListener('click', function () { loadPreset(k); }); });
  [0, 1, 2, 3].forEach(function (i) {
    $('s06-seq' + i).addEventListener('input', function () {
      Object.keys(preIds).forEach(function (k) { $(preIds[k]).setAttribute('aria-pressed', 'false'); });
      clearTimeout(typing);
      typing = setTimeout(render3, 200);
    });
  });
  loadPreset('clear');

  /* ---------- figure 4: NNI and SPR on a six-taxon tree ---------- */
  // Drawn as a ladder: spine nodes left to right, the two ends are cherries.
  // Each state lists the groups hanging from the spine in order.
  var MOVES = {
    start: { g: [['P', 'Q'], ['R'], ['S'], ['T', 'U']], hot: [], cap: 'The starting tree. It is unrooted: the drawing has no root, only a central line with groups hanging from it.' },
    nni: { g: [['P', 'Q'], ['S'], ['R'], ['T', 'U']], hot: ['R', 'S'], cap: 'NNI: pick one inner branch, here the one between R and S, and swap two subtrees across it. Only near neighbours can change places.' },
    spr: { g: [['R'], ['S'], ['T'], ['U', 'P', 'Q']], hot: ['P', 'Q'], cap: 'SPR: cut off a subtree, here P and Q, and attach it to a different branch, here the one leading to U. The subtree can land far away in one move.' }
  };
  var moveIds = { start: 's06-mv-start', nni: 's06-mv-nni', spr: 's06-mv-spr' };
  function drawMove(name) {
    var M = MOVES[name], host = $('s06-move'); host.textContent = '';
    var svg = el('svg', { viewBox: '0 0 520 180', width: '100%', style: 'min-width:420px', role: 'img', 'aria-label': M.cap }, host);
    var y = 90, x0 = 110, step = 100;
    el('line', { x1: x0, x2: x0 + 3 * step, y1: y, y2: y, stroke: 'var(--fg)', 'stroke-width': 1.8 }, svg);
    function leaf(x1, y1, x2, y2, name2) {
      var hot = M.hot.indexOf(name2) >= 0;
      el('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: hot ? 'var(--het)' : 'var(--fg)', 'stroke-width': hot ? 3 : 1.8 }, svg);
      el('text', { x: x2 + (x2 < x1 ? -8 : x2 > x1 ? 8 : 0), y: y2 + (x2 === x1 ? (y2 < y1 ? -6 : 15) : 4), 'text-anchor': x2 < x1 ? 'end' : x2 > x1 ? 'start' : 'middle', class: 'lab', style: 'font-size:14px' }, svg, name2);
    }
    M.g.forEach(function (grp, i) {
      var x = x0 + i * step;
      // a lone tip at the left end leaves no node there: the line simply runs on to the next node
      if (!(i === 0 && grp.length === 1)) el('circle', { cx: x, cy: y, r: 3, fill: 'var(--fg)' }, svg);
      if (i === 0) { // left end
        if (grp.length === 2) { leaf(x, y, x - 60, y - 45, grp[0]); leaf(x, y, x - 60, y + 45, grp[1]); }
        else { leaf(x, y, x - 60, y, grp[0]); }
      } else if (i === 3) { // right end
        if (grp.length === 2) { leaf(x, y, x + 60, y - 45, grp[0]); leaf(x, y, x + 60, y + 45, grp[1]); }
        else { // U on one side, and P and Q on a new node on the other
          leaf(x, y, x + 60, y - 45, grp[0]);
          var hx = x + 42, hy = y + 32;
          el('line', { x1: x, y1: y, x2: hx, y2: hy, stroke: 'var(--het)', 'stroke-width': 3 }, svg);
          leaf(hx, hy, hx + 44, hy - 16, grp[1]); leaf(hx, hy, hx + 44, hy + 22, grp[2]);
        }
      } else { leaf(x, y, x, y - 58, grp[0]); }
    });
    $('s06-move-cap').textContent = M.cap;
    Object.keys(moveIds).forEach(function (k) { $(moveIds[k]).setAttribute('aria-pressed', k === name ? 'true' : 'false'); });
  }
  Object.keys(moveIds).forEach(function (k) { $(moveIds[k]).addEventListener('click', function () { drawMove(k); }); });
  drawMove('start');
})();
