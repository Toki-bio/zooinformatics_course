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
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function tip(word, text) { return '<span class="tip" title="' + esc(text) + '">' + word + '</span>'; }
  // small seeded random generator so a "new" press is reproducible within a session
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function gauss(r) { var u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function segPick(group, attr, val) {
    Array.prototype.forEach.call(group.querySelectorAll('button'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute(attr) === val ? 'true' : 'false');
    });
  }

  // =====================================================================
  // (a) toy signal: nanopore current steps or PacBio polymerase timing
  // =====================================================================
  (function () {
    var svg = $('s02-sig-svg'), out = $('s02-sig-out'), leg = $('s02-sig-leg');
    var plat = $('s02-sig-plat'), molG = $('s02-sig-mol'), noise = $('s02-sig-noise'), btn = $('s02-sig-new');
    if (!svg || !out || !plat || !molG || !noise || !btn) return;
    var SEQ = 'TTAGACGTCATG', CPOS = 5, K = 5;          // the C of the CpG is index 5
    var NSTEP = SEQ.length - K + 1;                      // 8 five-base words
    var SHIFT = [3, -5, 9, -6, 4];                       // invented shift (pA) by the C's place in the word
    var IPDF = { 4: 1.3, 5: 2.1, 6: 1.6, 7: 1.2 };       // invented IPD factors near the C (PacBio)
    var state = { p: 'ont', m: 'b', seed: 7 };
    function level(word) {                               // invented pore level for a 5-mer, 70..120 pA
      var h = 0;
      for (var i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i) * (i + 3)) % 997;
      return 70 + (h % 51);
    }
    function noiseName(v) { return v === 0 ? 'none' : v <= 2 ? 'low' : v <= 5 ? 'medium' : v <= 8 ? 'high' : 'very high'; }
    var cU = 'var(--muted)', cM = 'var(--accent)';

    function drawOnt() {
      var r = rng(state.seed), sd = +noise.value * 0.9;
      var dw = [], i, j;
      for (i = 0; i < NSTEP; i++) dw.push(8 + Math.floor(r() * 9));
      var tot = dw.reduce(function (a, b) { return a + b; }, 0);
      var X0 = 60, X1 = 880, Y0 = 30, Y1 = 200, LO = 50, HI = 140;
      var sx = function (t) { return X0 + (X1 - X0) * t / tot; };
      var sy = function (v) { return Y1 - (Y1 - Y0) * (Math.max(LO, Math.min(HI, v)) - LO) / (HI - LO); };
      // shaded steps whose word holds the C
      var t0 = 0, starts = [];
      for (i = 0; i < NSTEP; i++) { starts.push(t0); t0 += dw[i]; }
      for (i = 0; i < NSTEP; i++) {
        var holds = i <= CPOS && CPOS < i + K;
        if (holds) el('rect', { x: sx(starts[i]), y: Y0 - 8, width: sx(starts[i] + dw[i]) - sx(starts[i]), height: Y1 - Y0 + 8, style: 'fill:var(--het);fill-opacity:0.10' }, svg);
        el('line', { x1: sx(starts[i]), x2: sx(starts[i]), y1: Y0 - 8, y2: Y1, 'class': 'grid' }, svg);
        var w = SEQ.substr(i, K), tx = el('text', { x: (sx(starts[i]) + sx(starts[i] + dw[i])) / 2, y: Y1 + 20, 'text-anchor': 'middle', 'class': 'lab', style: 'font-family:ui-monospace,monospace' }, svg);
        for (j = 0; j < K; j++) {
          var ts = el('tspan', j + i === CPOS ? { style: 'fill:var(--bad);font-weight:700' } : {}, tx, w[j]);
          void ts;
        }
      }
      // axes
      el('line', { x1: X0, x2: X1, y1: Y1, y2: Y1, 'class': 'ax' }, svg);
      el('line', { x1: X0, x2: X0, y1: Y0 - 8, y2: Y1, 'class': 'ax' }, svg);
      [60, 80, 100, 120, 140].forEach(function (v) {
        el('text', { x: X0 - 6, y: sy(v) + 4, 'text-anchor': 'end' }, svg, v);
        el('line', { x1: X0 - 3, x2: X0, y1: sy(v), y2: sy(v), 'class': 'ax' }, svg);
      });
      el('text', { x: 14, y: 118, transform: 'rotate(-90 14 118)', 'text-anchor': 'middle', 'class': 'lab' }, svg, 'current (pA, toy)');
      el('text', { x: (X0 + X1) / 2, y: Y1 + 42, 'text-anchor': 'middle', 'class': 'lab' }, svg, 'time → (each step = one 5-base word in the pore; shaded = word holds the CpG C)');
      // traces
      var mols = state.m === 'b' ? ['u', 'm'] : [state.m], diffs = [], noiseR = rng(state.seed * 13 + 5);
      mols.forEach(function (mol) {
        var d = '', t = 0;
        for (i = 0; i < NSTEP; i++) {
          var holds = i <= CPOS && CPOS < i + K, base = level(SEQ.substr(i, K));
          var lv = base + (mol === 'm' && holds ? SHIFT[CPOS - i] : 0);
          for (j = 0; j < dw[i]; j++) {
            var v = lv + sd * gauss(noiseR);
            d += (d ? 'L' : 'M') + sx(t + j + 0.5).toFixed(1) + ' ' + sy(v).toFixed(1);
          }
          t += dw[i];
          if (mol === 'm' && holds) diffs.push(Math.abs(SHIFT[CPOS - i]));
        }
        el('path', { d: d, style: 'fill:none;stroke:' + (mol === 'm' ? cM : cU) + ';stroke-width:' + (mol === 'm' ? 1.8 : 1.6) + ';stroke-linejoin:round' + (mol === 'u' && mols.length > 1 ? ';stroke-dasharray:4 2' : '') }, svg);
      });
      leg.innerHTML = '<span><i style="background:var(--muted);height:3px"></i>unmethylated molecule</span><span><i style="background:var(--accent);height:3px"></i>methylated molecule</span><span><i style="background:var(--het);opacity:.35;height:10px"></i>steps whose word contains the CpG C</span>';
      var meanShift = [3, 5, 9, 6, 4].reduce(function (a, b) { return a + b; }, 0) / 5;
      var verdict = sd === 0 ? 'With no noise the shift is plain to see.'
        : meanShift > 2 * sd ? 'The shift is still clearly larger than the noise: a model would be confident.'
        : meanShift > 0.8 * sd ? 'The shift is about as large as the noise: one read gives only a moderate probability.'
        : 'The noise is larger than the shift: from one read the model can say little; many reads are needed.';
      out.innerHTML = '<div><b>Nanopore toy.</b> The methyl group moves the current of the <b>5 steps</b> whose 5-base word contains the C of the CpG (shaded), by an invented ' + SHIFT.map(function (s) { return (s > 0 ? '+' : '') + s; }).join(', ') + ' ' + tip('pA', 'Picoampere: a millionth of a millionth of an ampere, the unit of the tiny current through a nanopore.') + '. The other steps do not change. Average shift ' + meanShift.toFixed(1) + ' pA; noise (' + tip('standard deviation', 'Standard deviation: the typical size of the random wobble around the true level.') + ') ' + sd.toFixed(1) + ' pA.</div><div>' + verdict + '</div>';
    }

    function drawPb() {
      var r = rng(state.seed), sd = +noise.value * 0.09;
      var base = [], i;
      for (i = 0; i < SEQ.length; i++) base.push({ ipd: 6 + Math.floor(r() * 10), pw: 3 + Math.floor(r() * 4) });
      var rows = state.m === 'b' ? ['u', 'm'] : [state.m];
      var X0 = 100, X1 = 880, ROWH = 80, Y0 = 50;
      var nr = rng(state.seed * 7 + 3), series = {}, maxT = 0;
      rows.forEach(function (mol) {
        var t = 0, ev = [];
        for (i = 0; i < SEQ.length; i++) {
          var f = mol === 'm' && IPDF[i] ? IPDF[i] : 1;
          var ipd = Math.max(1, base[i].ipd * f * Math.exp(sd * gauss(nr)));
          var pw = Math.max(1, base[i].pw * Math.exp(sd * 0.5 * gauss(nr)));
          t += ipd; ev.push({ s: t, w: pw, ipd: ipd }); t += pw;
        }
        series[mol] = ev; maxT = Math.max(maxT, t);
      });
      var sx = function (t) { return X0 + (X1 - X0) * t / (maxT * 1.02); };
      rows.forEach(function (mol, k) {
        var y = Y0 + k * ROWH + (rows.length === 1 ? 30 : 0), col = mol === 'm' ? cM : cU;
        el('text', { x: X0 - 6, y: y + 18, 'text-anchor': 'end', 'class': 'lab' }, svg, mol === 'm' ? 'methyl' : 'no methyl');
        el('line', { x1: X0, x2: X1, y1: y + 30, y2: y + 30, 'class': 'ax' }, svg);
        series[mol].forEach(function (e, i2) {
          var near = !!IPDF[i2];
          el('rect', { x: sx(e.s), y: y, width: Math.max(2, sx(e.s + e.w) - sx(e.s)), height: 30, rx: 2, style: 'fill:' + (i2 === CPOS ? 'var(--bad)' : col) + ';fill-opacity:' + (near ? 0.95 : 0.7) }, svg);
          el('text', { x: sx(e.s) + (sx(e.s + e.w) - sx(e.s)) / 2, y: y - 5, 'text-anchor': 'middle', 'class': 'lab', style: 'font-family:ui-monospace,monospace' + (i2 === CPOS ? ';fill:var(--bad);font-weight:700' : '') }, svg, SEQ[i2]);
        });
      });
      var yb = Y0 + (rows.length === 1 ? 30 : ROWH) + 50;
      svg.setAttribute('viewBox', '0 0 900 ' + (yb + 24));
      el('text', { x: (X0 + X1) / 2, y: yb + 10, 'text-anchor': 'middle', 'class': 'lab' }, svg, 'time → (bar = flash for the base added opposite this template letter; gap before it = IPD)');
      leg.innerHTML = '<span><i style="background:var(--muted);height:10px"></i>base added, no methyl in template</span><span><i style="background:var(--accent);height:10px"></i>base added, methylated template</span><span><i style="background:var(--bad);height:10px"></i>the base at the CpG C</span>';
      var txt = '<div><b>PacBio toy.</b> Each bar is one base added by the polymerase. The gap before a bar is its ' + tip('IPD', 'Interpulse duration: the pause, in camera frames, before a base is added.') + '. With a methyl group in the template, the pauses at and just after the C get longer (invented factors 1.3 to 2.1). ' + (rows.length > 1 ? 'The letters are the same in both rows: only the timing differs.' : 'Switch to "both overlaid" to compare the two molecules.') + '</div>';
      if (series.u && series.m) {
        var ratio = series.m[CPOS].ipd / series.u[CPOS].ipd;
        txt += '<div>IPD at the C: ' + series.u[CPOS].ipd.toFixed(1) + ' vs ' + series.m[CPOS].ipd.toFixed(1) + ' frames (ratio ' + ratio.toFixed(2) + '). ' + (ratio > 1.5 ? 'Clearly longer in this molecule.' : 'Noise hides much of the difference in this molecule; HiFi helps because each strand is read in several passes and the timing is averaged.') + '</div>';
      }
      out.innerHTML = txt;
    }

    function draw() {
      $('s02-sig-nv').textContent = noiseName(+noise.value);
      clear(svg); svg.setAttribute('viewBox', '0 0 900 270');
      if (state.p === 'ont') drawOnt(); else drawPb();
    }
    plat.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      state.p = b.getAttribute('data-p'); segPick(plat, 'data-p', state.p); draw();
    });
    molG.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      state.m = b.getAttribute('data-m'); segPick(molG, 'data-m', state.m); draw();
    });
    noise.addEventListener('input', draw);
    btn.addEventListener('click', function () { state.seed = (state.seed * 48271 + 11) % 2147483647; draw(); });
    draw();
  })();

  // =====================================================================
  // (b) threshold on per-read probabilities
  // =====================================================================
  (function () {
    var svg = $('s02-thr-svg'), out = $('s02-thr-out'), note = $('s02-thr-note'), fS = $('s02-thr-f'), sS = $('s02-thr-s'), tS = $('s02-thr-t'), btn = $('s02-thr-new');
    if (!svg || !out || !fS || !sS || !tS || !btn) return;
    var N = 40, seed = 3, MU = { 1: 0.35, 2: 0.7, 3: 1.1, 4: 1.7, 5: 2.6 }, SN = { 1: 'very poor', 2: 'poor', 3: 'fair', 4: 'good', 5: 'very good' };
    function draw() {
      var f = +fS.value / 100, s = +sS.value, t = +tS.value;
      $('s02-thr-fv').textContent = Math.round(f * 100) + ' %';
      $('s02-thr-sv').textContent = SN[s];
      $('s02-thr-tv').textContent = t.toFixed(2);
      var r = rng(seed), nM = Math.round(f * N), reads = [], i;
      for (i = 0; i < N; i++) {
        var truth = i < nM, z = (truth ? MU[s] : -MU[s]) + gauss(r);
        reads.push({ m: truth, p: 1 / (1 + Math.exp(-1.6 * z)) });
      }
      clear(svg);
      var X0 = 150, X1 = 880, sx = function (p) { return X0 + (X1 - X0) * p; };
      var lanes = [{ m: true, y: 78, lab: 'truly methylated' }, { m: false, y: 150, lab: 'truly unmethylated' }];
      el('rect', { x: sx(t), y: 8, width: X1 - sx(t), height: 150, style: 'fill:var(--accent);fill-opacity:0.07' }, svg);
      lanes.forEach(function (L) {
        el('line', { x1: X0, x2: X1, y1: L.y + 6, y2: L.y + 6, 'class': 'grid' }, svg);
        el('text', { x: X0 - 10, y: L.y + 2, 'text-anchor': 'end', 'class': 'lab' }, svg, L.lab);
        var bins = {};
        reads.filter(function (x) { return x.m === L.m; }).forEach(function (x) {
          var b = Math.min(59, Math.floor(x.p * 60)), k = bins[b] = (bins[b] || 0) + 1;
          var called = x.p >= t, wrong = called !== x.m;
          el('circle', { cx: sx((b + 0.5) / 60), cy: L.y - (k - 1) * 9, r: 4,
            style: 'fill:' + (x.m ? (wrong ? 'var(--bad)' : 'var(--accent)') : 'var(--panel)') + ';stroke:' + (wrong ? 'var(--bad)' : (x.m ? 'var(--accent)' : 'var(--muted)')) + ';stroke-width:' + (wrong ? 2 : 1.5) }, svg);
        });
      });
      el('line', { x1: X0, x2: X1, y1: 168, y2: 168, 'class': 'ax' }, svg);
      for (i = 0; i <= 10; i += 2) {
        el('line', { x1: sx(i / 10), x2: sx(i / 10), y1: 168, y2: 173, 'class': 'ax' }, svg);
        el('text', { x: sx(i / 10), y: 188, 'text-anchor': 'middle' }, svg, (i / 10).toFixed(1));
      }
      el('text', { x: (X0 + X1) / 2, y: 206, 'text-anchor': 'middle', 'class': 'lab' }, svg, 'model probability that the read is methylated →');
      el('line', { x1: sx(t), x2: sx(t), y1: 6, y2: 168, style: 'stroke:var(--fg);stroke-width:2' }, svg);
      el('text', { x: Math.min(sx(t) + 6, X1 - 120), y: 18, 'class': 'lab' }, svg, 'called methylated →');
      var tp = 0, fp = 0, fn = 0;
      reads.forEach(function (x) { var c = x.p >= t; if (c && x.m) tp++; else if (c) fp++; else if (x.m) fn++; });
      var est = (tp + fp) / N, ml = Math.min(255, Math.floor(t * 256));
      var bias = est - f, verdict = Math.abs(bias) < 0.051 ? 'close to the truth' : bias > 0 ? 'too high: false methylated calls dominate' : 'too low: missed methylated reads dominate';
      out.innerHTML = '<div><b>' + Math.round(est * 100) + ' %</b>estimated methylation (true ' + Math.round(f * 100) + ' %)</div>' +
        '<div><b>' + fp + '</b>' + tip('false methylated calls', 'Unmethylated reads whose probability is at or above the threshold, so they are counted as methylated.') + '</div>' +
        '<div><b>' + fn + '</b>' + tip('missed methylated reads', 'Methylated reads whose probability is below the threshold, so they are counted as unmethylated.') + '</div>' +
        '<div><b>' + ml + '</b>threshold as an ' + tip('ML', 'ML: the SAM tag that stores one probability per called base as an integer 0-255; N means a probability between N/256 and (N+1)/256.') + ' integer (' + t.toFixed(2) + ' × 256, rounded down)</div>';
      if (note) note.innerHTML = (tp + fp) + ' of ' + N + ' reads are called methylated, so the estimate is <b>' + verdict + '</b>.';
    }
    [fS, sS, tS].forEach(function (x) { x.addEventListener('input', draw); });
    btn.addEventListener('click', function () { seed = (seed * 16807 + 7) % 2147483647; draw(); });
    draw();
  })();

  // =====================================================================
  // (c) MM/ML decoder (SAM tags specification, base modifications)
  // =====================================================================
  (function () {
    var seqI = $('s02-mm-seq'), mmI = $('s02-mm-mm'), mlI = $('s02-mm-ml'), readD = $('s02-mm-read'), tb = document.querySelector('#s02-mm-tab tbody'), out = $('s02-mm-out'), exG = $('s02-mm-ex');
    if (!seqI || !mmI || !mlI || !readD || !tb || !out || !exG) return;
    var EX = [
      { seq: 'AGTCTAGACTCCGTAATTACTCGCCTAG', mm: 'C+m?,3,1;', ml: '249,4' },
      { seq: 'ACGTTCAGCGATCCGGA', mm: 'C+m.,0,1,1;', ml: '230,15,200' },
      { seq: 'ACGTTCAGCGATCCGGA', mm: 'C+mh?,0,1;', ml: '204,26,89,130' }
    ];
    var NAMES = { m: '5mC (5-methylcytosine)', h: '5hmC (5-hydroxymethylcytosine)', f: '5fC (5-formylcytosine)', c: '5caC (5-carboxylcytosine)', C: 'any C modification',
      g: '5hmU', e: '5fU', b: '5caU', T: 'any T modification', U: 'any U modification', a: '6mA (N6-methyladenine)', A: 'any A modification', o: '8oxoG', G: 'any G modification', n: 'xanthosine', N: 'any modification' };
    function ord(k) { var s = ['th', 'st', 'nd', 'rd'], v = k % 100; return k + (s[(v - 20) % 10] || s[v] || s[0]); }
    function colourFor(p) { return p >= 0.8 ? 'var(--bad)' : p >= 0.2 ? 'var(--het)' : 'var(--good)'; }

    function decode() {
      var seq = seqI.value.trim().toUpperCase().replace(/\s+/g, ''), mm = mmI.value.trim().replace(/^MM:Z:/i, ''), mlTxt = mlI.value.trim().replace(/^ML:B:C,?/i, '');
      var errs = [], calls = [], blocks = [];
      var ml = mlTxt === '' ? [] : mlTxt.split(',').map(function (x) { return x.trim(); });
      ml.forEach(function (x) { if (!/^\d+$/.test(x) || +x > 255) errs.push('ML value "' + esc(x) + '" is not an integer from 0 to 255.'); });
      ml = ml.map(Number);
      if (!/^[ACGTUN]*$/.test(seq)) errs.push('The read may contain only A, C, G, T, U or N.');
      var mlPos = 0, marks = {};
      mm.split(';').forEach(function (blk) {
        blk = blk.trim(); if (!blk) return;
        var m = /^([ACGTUN])([-+])([A-Za-z]+|[0-9]+)([.?]?)((?:,\d+)*)$/.exec(blk);
        if (!m) { errs.push('Cannot read the MM block "' + esc(blk) + '".'); return; }
        if (/^\d+$/.test(m[3])) { errs.push('Block "' + esc(blk) + '" uses a numeric ChEBI code; this toy decoder only knows the one-letter codes.'); return; }
        var base = m[1], strand = m[2], mods = m[3].split(''), flag = m[4] || '', deltas = m[5] ? m[5].slice(1).split(',').map(Number) : [];
        var idx = []; // positions in seq of the base type
        for (var i = 0; i < seq.length; i++) if (base === 'N' || seq[i] === base) idx.push(i);
        var k = -1, called = {};
        deltas.forEach(function (d) {
          k += d + 1;
          if (k >= idx.length) { errs.push('Block "' + esc(blk) + '" points past the last ' + base + ' of the read (it has ' + idx.length + ').'); return; }
          var probs = [];
          mods.forEach(function (code) {
            var v = ml[mlPos++];
            if (v === undefined) { errs.push('Too few ML values for the MM tag.'); v = NaN; }
            probs.push({ code: code, v: v });
          });
          called[k] = true;
          calls.push({ pos: idx[k], base: base, nth: k + 1, strand: strand, probs: probs });
          marks[idx[k]] = { probs: probs };
        });
        idx.forEach(function (p, j) { if (!called[j] && !marks[p]) marks[p] = { skip: true, flag: flag }; });
        blocks.push({ base: base, strand: strand, mods: mods, flag: flag, n: Object.keys(called).length, total: idx.length });
      });
      if (mlPos < ml.length) errs.push('There are ' + (ml.length - mlPos) + ' more ML values than the MM tag needs.');

      // the read
      var h = '';
      for (var i2 = 0; i2 < seq.length; i2++) {
        var mk = marks[i2];
        if (mk && mk.probs) {
          var pmax = Math.max.apply(null, mk.probs.map(function (q) { return isNaN(q.v) ? 0 : (q.v + 0.5) / 256; }));
          var t = mk.probs.map(function (q) { return q.code + ' ' + (isNaN(q.v) ? '?' : Math.round((q.v + 0.5) / 256 * 100) + ' %'); }).join(', ');
          h += '<span class="s02-b s02-call" style="background:' + colourFor(pmax) + '" title="position ' + (i2 + 1) + ': ' + esc(t) + '">' + seq[i2] + '</span>';
        } else if (mk && mk.skip) {
          h += '<span class="s02-b s02-skip" title="position ' + (i2 + 1) + ': skipped (' + (mk.flag === '?' ? 'no information' : 'assume unmodified') + ')">' + seq[i2] + '</span>';
        } else h += '<span class="s02-b">' + esc(seq[i2]) + '</span>';
      }
      readD.innerHTML = h || '<span class="s02-b">(empty read)</span>';

      // table
      clear(tb);
      calls.forEach(function (c) {
        c.probs.forEach(function (q, j) {
          var tr = document.createElement('tr');
          var lo = q.v / 256, hi = (q.v + 1) / 256;
          tr.innerHTML = (j === 0 ? '<td>' + (c.pos + 1) + '</td><td>' + c.base + '</td><td>' + ord(c.nth) + ' ' + (c.base === 'N' ? 'base' : c.base) + '</td>' : '<td></td><td></td><td></td>') +
            '<td>' + esc(NAMES[q.code] || q.code) + (c.strand === '-' ? ' (opposite strand)' : '') + '</td><td>' + (isNaN(q.v) ? '-' : q.v) + '</td><td>' + (isNaN(q.v) ? '-' : (lo * 100).toFixed(1) + '-' + (hi * 100).toFixed(1) + ' %') + '</td>';
          tb.appendChild(tr);
        });
        if (c.probs.length > 1) {
          var sum = c.probs.reduce(function (a, q) { return a + (isNaN(q.v) ? 0 : (q.v + 0.5) / 256); }, 0);
          var tr2 = document.createElement('tr');
          tr2.innerHTML = '<td></td><td></td><td></td><td>left over: unmodified</td><td></td><td>about ' + Math.max(0, Math.round((1 - sum) * 100)) + ' %</td>';
          tb.appendChild(tr2);
        }
      });

      // readout
      var txt = '';
      blocks.forEach(function (b) {
        var modN = b.mods.map(function (c) { return NAMES[c] || c; }).join(' or ');
        txt += '<div><b>' + b.base + b.strand + b.mods.join('') + b.flag + '</b>: ' + modN + ' on ' + (b.strand === '+' ? 'the same strand as the read' : 'the opposite strand (still counting the ' + b.base + 's of the read)') + '. ' +
          b.n + ' of the read\'s ' + b.total + ' ' + b.base + 's are listed, with ' + (b.mods.length > 1 ? b.mods.length + ' ML values each, in the order ' + b.mods.join(', ') : 'one ML value each') + '. ' +
          (b.flag === '?' ? 'The flag <code>?</code> means the other ' + b.base + 's were not assessed: treat them as missing data.' : 'The flag ' + (b.flag ? '<code>.</code>' : '(absent, same as <code>.</code>)') + ' means the other ' + b.base + 's should be taken as having a low probability of modification.') + '</div>';
      });
      if (errs.length) txt += '<div style="color:var(--bad)"><b>Problems:</b> ' + errs.join(' ') + '</div>';
      out.innerHTML = txt || '<div>No MM blocks to decode.</div>';
    }
    function load(i) { seqI.value = EX[i].seq; mmI.value = 'MM:Z:' + EX[i].mm; mlI.value = 'ML:B:C,' + EX[i].ml; segPick(exG, 'data-e', String(i)); decode(); }
    exG.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) load(+b.getAttribute('data-e')); });
    [seqI, mmI, mlI].forEach(function (x) { x.addEventListener('input', function () { segPick(exG, 'data-e', '-'); decode(); }); });
    load(0);
  })();

  // =====================================================================
  // (d) what can I do with what I received?
  // =====================================================================
  (function () {
    var g = $('s02-have'), out = $('s02-have-out');
    if (!g || !out) return;
    var POD = tip('pod5', 'pod5: Oxford Nanopore file format for the raw electrical signal of every read.');
    var T = {
      fq: ['bad', 'Methylation is lost.', 'A FASTQ holds letters and qualities only. There is no signal to re-call and no field for modification calls. Ask the provider whether the ' + POD + ' files, or a BAM made during basecalling, still exist. The reads remain fine for assembly.'],
      ubam: ['good', 'Ready to use.', 'The calls are in the MM/ML tags. Check the <code>@RG</code> header line for the basecalling and modification model names, align the reads in a way that keeps the tags, and count calls per CpG site (section <a href="#s03">03</a>).'],
      pod5: ['good', 'Best case: you can call (and later re-call) everything.', 'Basecall with a modification model, for example <code>dorado basecaller sup,5mCG_5hmCG pod5s/ &gt; calls.bam</code>. This needs a ' + tip('GPU', 'GPU: a graphics card used for fast neural-network computing; Dorado is built for Nvidia GPUs and Apple M-series chips.') + ' to run in reasonable time. Keep the pod5: newer models can be applied later.'],
      hifi: ['good', 'Ready to use.', 'jasmine (on the instrument or afterwards) has written 5mC CpG calls as <code>C+m?</code>. Align with a tool that keeps the tags and does not ' + tip('hard-clip', 'Hard-clipping: cutting the unaligned ends off the stored read sequence; it breaks the positions in MM/ML.') + ' ' + tip('supplementary alignments', 'Supplementary alignment: an extra record for a part of a read that aligns somewhere else, for example across a rearrangement.') + ' (pb-CpG-tools recommends pbmm2, or minimap2 with <code>-Y</code>), then count per CpG (MethBat or pb-CpG-tools; section <a href="#s03">03</a>).'],
      kin: ['het', 'Calls can still be made.', 'Run <code>jasmine</code> on the BAM to add MM/ML tags. Its 5mC model needs timing from <b>both</b> strands (<code>fi/fp</code> and <code>ri/rp</code>); reads with timing from one strand only get no 5mC calls.'],
      cyc: ['bad', 'No methylation calls possible, as far as we could find.', 'We found no documented modification caller for CycloneSEQ, and Dorado&rsquo;s model list covers only Oxford Nanopore pores and chemistries. Ask the provider whether their software can call modified bases, and if so in what format. If you know of a tool, it can be added here.']
    };
    function show(k) {
      segPick(g, 'data-h', k);
      var t = T[k];
      out.innerHTML = '<div><b style="color:var(--' + t[0] + ')">' + t[1] + '</b> ' + t[2] + '</div>';
    }
    g.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) show(b.getAttribute('data-h')); });
    show('fq');
  })();
})();
