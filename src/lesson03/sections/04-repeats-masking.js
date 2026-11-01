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
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function pad(s, w, left) { s = String(s); while (s.length < w) s = left ? ' ' + s : s + ' '; return s; }

  // =====================================================================
  // (a) .out line explainer
  // =====================================================================
  (function () {
    var pre = $('s04-out-pre'), exp = $('s04-out-exp');
    if (!pre || !exp) return;
    // column widths and alignment (true = right-aligned)
    var W = [6, 5, 5, 5, 10, 7, 7, 10, 2, 11, 15, 6, 6, 6, 4];
    var R = [true, true, true, true, false, true, true, true, false, false, false, true, true, true, true];
    var keys = ['score', 'div', 'del', 'ins', 'qname', 'qbeg', 'qend', 'qleft', 'strand', 'rname', 'rclass', 'r1', 'r2', 'r3', 'id'];
    var lines = [
      ['1872', '12.4', '2.1', '0.8', 'contig_7', '10234', '11420', '(88580)', 'C', 'toyL1_A', 'LINE/L1', '(35)', '6120', '4921', '12'],
      ['845', '8.9', '0.0', '1.3', 'contig_7', '11421', '11655', '(88345)', '+', 'toySINE_B', 'SINE/B2', '1', '232', '(0)', '13'],
      ['412', '4.2', '0.0', '0.0', 'contig_7', '11690', '11741', '(88259)', '+', '(TG)n', 'Simple_repeat', '1', '52', '(0)', '14']
    ];
    function explain(key, li) {
      var L = lines[li], minus = L[8] === 'C';
      switch (key) {
        case 'score': return '<b>SW score ' + L[0] + '.</b> Smith-Waterman alignment score of the match, usually adjusted down for low-complexity sequence. Higher = longer and/or more similar match. Scores are not always comparable between lines: different scoring matrices are used depending on the age of the repeat and the GC level.';
        case 'div': return '<b>% divergence ' + L[1] + '.</b> Mismatches / (matches + mismatches) in the alignment to the consensus, in percent. Raw, not Kimura-corrected (the Kimura value is in the .align file). Gaps are not counted here.';
        case 'del': return '<b>% deleted ' + L[2] + '.</b> Percentage of bases opposite a gap in the genome sequence: the copy has lost these consensus bases.';
        case 'ins': return '<b>% inserted ' + L[3] + '.</b> Percentage of bases opposite a gap in the consensus: the copy has extra bases.';
        case 'qname': return '<b>Query sequence.</b> Name of the contig or chromosome in your FASTA (here the toy name ' + esc(L[4]) + ').';
        case 'qbeg': return '<b>Begin ' + L[5] + '.</b> First base of the match on the contig (1-based: the first base of the contig is 1).';
        case 'qend': return '<b>End ' + L[6] + '.</b> Last base of the match on the contig. Length on the genome = end - begin + 1 = ' + (+L[6] - +L[5] + 1) + ' bp.';
        case 'qleft': return '<b>(left) ' + L[7] + '.</b> Bases of the contig that remain after the end of the match. End + left = contig length (' + (+L[6] + +L[7].replace(/[()]/g, '')) + ' bp here).';
        case 'strand': return minus ? '<b>C.</b> The match is with the reverse complement of the consensus: the copy lies on the other strand.' : '<b>+.</b> The copy lies in the same orientation as the consensus.';
        case 'rname': return '<b>Repeat name ' + esc(L[9]) + '.</b> The family (or subfamily) whose consensus gave the best score here. ' + (L[9].charAt(0) === '(' ? '(TG)n is not a library family: it is a simple repeat found by the internal TRF step.' : 'From the library: a Dfam name or your de novo name.');
        case 'rclass': return '<b>Class/family ' + esc(L[10]) + '.</b> Taken from the library header (name#class/subclass). This is what the .tbl summary counts. With a poorly classified de novo library many lines say Unknown.';
        case 'r1':
          return minus ? '<b>(left in repeat) ' + L[11] + '.</b> On a C line this comes first: consensus bases left beyond the match, counted on the complementary strand. (35) = the copy stops 35 bases short of the consensus end; (0) would mean it reaches the end.'
                       : '<b>Begin in repeat ' + L[11] + '.</b> On a + line: first consensus position covered by the copy. 1 = the copy starts exactly where the consensus starts.';
        case 'r2':
          return minus ? '<b>End in repeat ' + L[12] + '.</b> On a C line the middle number is the consensus position at the end of the match.'
                       : '<b>End in repeat ' + L[12] + '.</b> Last consensus position covered by the copy.';
        case 'r3':
          return minus ? '<b>Begin in repeat ' + L[13] + '.</b> On a C line the third number is the start in the consensus. The copy covers consensus positions ' + L[13] + '-' + L[12] + ' (' + (+L[12] - +L[13] + 1) + ' bp): a 5\'-truncated copy, a common state for L1.'
                       : '<b>(left in repeat) ' + L[13] + '.</b> Consensus bases after the end of the match. (0) = the copy reaches the end of the consensus: with begin 1 this is a full-length copy.';
        case 'id': return '<b>ID ' + L[14] + '.</b> Pieces of one insertion share one ID (ProcessRepeats joins fragments split by later insertions). An asterisk after the ID would mean a higher-scoring match partly overlaps this one.';
      }
      return '';
    }
    var h1 = pad('SW', W[0], true) + ' ' + pad('perc', W[1], true) + ' ' + pad('perc', W[2], true) + ' ' + pad('perc', W[3], true) + ' ' + pad('query', W[4]) + ' ' + pad('position in query', W[5] + W[6] + W[7] + 2) + ' ' + pad('', W[8]) + ' ' + pad('matching', W[9]) + ' ' + pad('repeat', W[10]) + ' ' + pad('position in repeat', W[11] + W[12] + W[13] + 2) + ' ' + pad('ID', W[14], true);
    var h2 = pad('score', W[0], true) + ' ' + pad('div.', W[1], true) + ' ' + pad('del.', W[2], true) + ' ' + pad('ins.', W[3], true) + ' ' + pad('sequence', W[4]) + ' ' + pad('begin', W[5], true) + ' ' + pad('end', W[6], true) + ' ' + pad('(left)', W[7], true) + ' ' + pad('', W[8]) + ' ' + pad('repeat', W[9]) + ' ' + pad('class/family', W[10]) + ' ' + pad('', W[11] + W[12] + W[13] + 2) + ' ' + pad('', W[14]);
    var html = '<span class="pos">' + esc(h1) + '\n' + esc(h2) + '</span>\n';
    lines.forEach(function (L, li) {
      L.forEach(function (v, ci) {
        var txt = pad(v, W[ci], R[ci]);
        var lead = txt.match(/^ */)[0], trail = txt.match(/ *$/)[0], core = txt.trim();
        html += lead + '<span class="s04-tok" tabindex="0" role="button" data-k="' + keys[ci] + '" data-l="' + li + '">' + esc(core) + '</span>' + trail + (ci < L.length - 1 ? ' ' : '');
      });
      html += '\n';
    });
    pre.innerHTML = html;
    var toks = pre.querySelectorAll('.s04-tok');
    function show(t) {
      var k = t.getAttribute('data-k'), li = +t.getAttribute('data-l');
      for (var i = 0; i < toks.length; i++) {
        var on = toks[i].getAttribute('data-k') === k;
        toks[i].classList.toggle('s04-on', on);
        toks[i].classList.toggle('s04-cur', toks[i] === t);
      }
      exp.innerHTML = explain(k, li);
    }
    for (var i = 0; i < toks.length; i++) {
      (function (t) {
        t.addEventListener('mouseenter', function () { show(t); });
        t.addEventListener('focus', function () { show(t); });
        t.addEventListener('click', function () { show(t); });
      })(toks[i]);
    }
  })();

  // =====================================================================
  // (b) toy repeat landscape
  // =====================================================================
  (function () {
    var svg = $('s04-land-svg'), seg = $('s04-land-seg'), cpg = $('s04-land-cpg');
    if (!svg || !seg || !cpg) return;
    var out = $('s04-land-out'), leg = $('s04-land-leg'), cpgv = $('s04-land-cpgv');
    var measure = 'cpg';
    var FAM = [
      { name: 'L1-like (young, CpG-poor)', col: 'var(--accent)', len: 300, cpg: 0.004, mean: 0.05, sd: 0.015, n: 110, seed: 11 },
      { name: 'SINE-like (CpG-rich)', col: 'var(--rep)', len: 200, cpg: 0.07, mean: 0.12, sd: 0.025, n: 170, seed: 22 },
      { name: 'DNA transposon (old)', col: 'var(--het)', len: 300, cpg: 0.02, mean: 0.32, sd: 0.05, n: 70, seed: 33 }
    ];
    var B = 'ACGT';
    var TS = { A: 'G', G: 'A', C: 'T', T: 'C' };
    var TV = { A: 'CT', G: 'CT', C: 'AG', T: 'AG' };
    function isTs(a, b) { return TS[a] === b; }
    function makeCons(f) {
      var r = rng(f.seed), s = [];
      while (s.length < f.len) {
        if (r() < f.cpg * 2 && s.length < f.len - 1) { s.push('C'); s.push('G'); }
        else {
          var b = B.charAt(Math.floor(r() * 4));
          if (b === 'G' && s.length && s[s.length - 1] === 'C' && r() < 0.95) b = 'A'; // keep CpG rare outside the set ones
          s.push(b);
        }
      }
      return s.slice(0, f.len);
    }
    function poisson(lam, r) {
      if (lam <= 0) return 0;
      var L = Math.exp(-lam), k = 0, p = 1;
      do { k++; p *= r(); } while (p > L && k < 50);
      return k - 1;
    }
    function normal(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    // exact port of RepeatMasker SearchResult::calcKimuraDivergence (no gaps in this toy)
    function rmKimura(q, s, cpgMod) {
      var ts = 0, tv = 0, prev = 0, pS = '', n = 0;
      for (var i = 0; i < s.length; i++) {
        n++;
        var mt = q[i] === s[i] ? 0 : (isTs(q[i], s[i]) ? 1 : 2);
        if (cpgMod && pS === 'C' && s[i] === 'G') {
          if (mt === 1) prev++; else if (mt === 2) tv++;
          if (prev === 2) prev = 1; else if (prev === 1) prev = 1 / 10;
        } else {
          ts += prev; prev = 0;
          if (mt === 1) prev = 1; else if (mt === 2) tv++;
        }
        pS = s[i];
      }
      ts += prev;
      var p = ts / n, qq = tv / n, op = (1 - 2 * p - qq) * Math.sqrt(1 - 2 * qq);
      return op > 0 ? Math.abs(-0.5 * Math.log(op)) * 100 : 100;
    }
    var cons = FAM.map(makeCons);
    var data = null, lastM = null;
    function simulate(m) {
      return FAM.map(function (f, fi) {
        var c = cons[fi], r = rng(f.seed * 7919 + 1), copies = [];
        var isCpG = c.map(function (b, i) { return (b === 'C' && c[i + 1] === 'G') || (b === 'G' && c[i - 1] === 'C'); });
        for (var k = 0; k < f.n; k++) {
          var t = Math.max(0.003, f.mean + f.sd * normal(r));
          var q = c.slice();
          for (var i = 0; i < q.length; i++) {
            var lts = t * 2 / 3 * (isCpG[i] ? m : 1), ltv = t / 3;
            var nts = poisson(lts, r), ntv = poisson(ltv, r), tot = nts + ntv;
            while (tot > 0) {
              if (r() * tot < nts) { q[i] = TS[q[i]]; nts--; }
              else { q[i] = TV[q[i]].charAt(r() < 0.5 ? 0 : 1); ntv--; }
              tot--;
            }
          }
          var mis = 0;
          for (var j = 0; j < q.length; j++) if (q[j] !== c[j]) mis++;
          copies.push({ t: t * 100, raw: 100 * mis / q.length, k2p: rmKimura(q, c, false), cpg: rmKimura(q, c, true), len: q.length });
        }
        return copies;
      });
    }
    var X0 = 56, X1 = 740, Y0 = 250, Y1 = 22, NB = 50;
    function draw() {
      var m = +cpg.value;
      if (cpgv) cpgv.textContent = m + '×';
      if (m !== lastM) { data = simulate(m); lastM = m; }
      var bins = FAM.map(function () { var a = []; for (var i = 0; i <= NB; i++) a.push(0); return a; });
      data.forEach(function (copies, fi) {
        copies.forEach(function (c) {
          var b = Math.floor(c[measure]); if (b > NB) b = NB; if (b < 0) b = 0;
          bins[fi][b] += c.len / 1000;
        });
      });
      var maxY = 0;
      for (var b = 0; b <= NB; b++) { var sum = 0; for (var f = 0; f < FAM.length; f++) sum += bins[f][b]; if (sum > maxY) maxY = sum; }
      maxY = Math.max(4, Math.ceil(maxY / 2) * 2);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var bw = (X1 - X0) / (NB + 1);
      var step = maxY > 12 ? 4 : 2;
      for (var y = 0; y <= maxY; y += step) {
        var yy = Y0 - (Y0 - Y1) * y / maxY;
        el('line', { x1: X0, x2: X1, y1: yy, y2: yy, 'class': 'grid' }, svg);
        el('text', { x: X0 - 6, y: yy + 4, 'text-anchor': 'end' }, svg, y);
      }
      for (var b2 = 0; b2 <= NB; b2++) {
        var acc = 0;
        for (var f2 = 0; f2 < FAM.length; f2++) {
          var v = bins[f2][b2]; if (!v) continue;
          var h = (Y0 - Y1) * v / maxY;
          el('rect', { x: X0 + b2 * bw + 0.5, y: Y0 - acc - h, width: Math.max(1, bw - 1), height: h, style: 'fill:' + FAM[f2].col }, svg);
          acc += h;
        }
      }
      el('line', { x1: X0, x2: X1, y1: Y0, y2: Y0, 'class': 'ax' }, svg);
      el('line', { x1: X0, x2: X0, y1: Y0, y2: Y1, 'class': 'ax' }, svg);
      for (var d = 0; d <= NB; d += 10) {
        var xx = X0 + d * bw + bw / 2;
        el('line', { x1: xx, x2: xx, y1: Y0, y2: Y0 + 4, 'class': 'ax' }, svg);
        el('text', { x: xx, y: Y0 + 16, 'text-anchor': 'middle' }, svg, d === NB ? '≥50' : d);
      }
      var lab = { raw: 'raw mismatch %', k2p: 'Kimura divergence %', cpg: 'Kimura divergence %, CpG rule' }[measure];
      el('text', { x: (X0 + X1) / 2, y: Y0 + 34, 'text-anchor': 'middle', 'class': 'lab' }, svg, lab + ' (1-% bins)');
      el('text', { x: 14, y: (Y0 + Y1) / 2, 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + ((Y0 + Y1) / 2) + ')', 'class': 'lab' }, svg, 'kb of toy genome');
      if (leg) leg.innerHTML = FAM.map(function (f) { return '<span><i style="background:' + f.col + ';height:10px"></i>' + esc(f.name) + '</span>'; }).join('');
      if (out) {
        out.innerHTML = FAM.map(function (f, fi) {
          var c = data[fi], sv = 0, st = 0;
          c.forEach(function (x) { sv += x[measure]; st += x.t; });
          return '<div>' + esc(f.name) + '<b>' + (sv / c.length).toFixed(1) + ' %</b>mean of the shown measure; true age ' + (st / c.length).toFixed(1) + ' mutations per 100 normal bases</div>';
        }).join('');
      }
    }
    var btns = seg.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        measure = this.getAttribute('data-m');
        for (var j = 0; j < btns.length; j++) btns[j].setAttribute('aria-pressed', btns[j] === this ? 'true' : 'false');
        draw();
      });
    }
    cpg.addEventListener('input', draw);
    draw();
  })();

  // =====================================================================
  // (c) toy tandem-repeat finder
  // =====================================================================
  (function () {
    var seqBox = $('s04-trf-seq'), svg = $('s04-trf-svg');
    var P = $('s04-trf-p'), C = $('s04-trf-c'), M = $('s04-trf-m'), S = $('s04-trf-s'), MM = $('s04-trf-mm');
    if (!seqBox || !svg || !P || !C || !M || !S || !MM) return;
    var out = $('s04-trf-out');
    var mmPen = 7, FL = 60, MAXD = 60, B = 'ACGT';
    var r0 = rng(4242);
    var flankL = [], flankR = [], motifBase = [], uMut = [], altMut = [];
    for (var i = 0; i < FL; i++) { flankL.push(B.charAt(Math.floor(r0() * 4))); flankR.push(B.charAt(Math.floor(r0() * 4))); }
    for (var j = 0; j < 50; j++) motifBase.push(B.charAt(Math.floor(r0() * 4)));
    for (var k = 0; k < 800; k++) { uMut.push(r0()); altMut.push(1 + Math.floor(r0() * 3)); }
    function build() {
      var p = +P.value, c = +C.value, mr = +M.value / 100;
      var motif = motifBase.slice(0, p);
      if (p >= 2 && motif.every(function (b) { return b === motif[0]; })) motif[1] = motif[0] === 'A' ? 'C' : 'A';
      var arr = [], mut = [];
      for (var n = 0; n < c * p; n++) {
        var b = motif[n % p], mt = false;
        if (uMut[n] < mr) { b = B.charAt((B.indexOf(b) + altMut[n]) % 4); mt = true; }
        arr.push(b); mut.push(mt);
      }
      var seq = flankL.concat(arr, flankR);
      var isArr = [], isMut = [];
      for (var q = 0; q < seq.length; q++) { var inA = q >= FL && q < FL + arr.length; isArr.push(inA); isMut.push(inA && mut[q - FL]); }
      return { seq: seq, isArr: isArr, isMut: isMut, p: p, c: c };
    }
    function scan(seq) {
      var N = seq.length, res = [];
      for (var d = 1; d <= MAXD && d < N / 2; d++) {
        // 1. detection: best stretch where s[i] equals s[i+d] more often than not (+1 / -1)
        var best = 0, bs = -1, be = -1, cur = 0, cs = 0;
        for (var i = 0; i + d < N; i++) {
          var v = seq[i] === seq[i + d] ? 1 : -1;
          if (cur <= 0) { cur = v; cs = i; } else cur += v;
          if (cur > best) { best = cur; bs = cs; be = i; }
        }
        var r = { d: d, score: 0, a: -1, b: -1, pm: 0, cons: '' };
        if (bs >= 0 && be + d - bs + 1 >= 2 * d) {
          var a0 = bs, b0 = be + d;
          // 2. consensus unit by majority at each phase
          var cons = [];
          for (var ph = 0; ph < d; ph++) {
            var cnt = { A: 0, C: 0, G: 0, T: 0 };
            for (var x = a0 + ph; x <= b0; x += d) cnt[seq[x]]++;
            var bb = 'A'; for (var key in cnt) if (cnt[key] > cnt[bb]) bb = key;
            cons.push(bb);
          }
          // 3. score every base against the unit built from the OTHER copies (+2 / -mismatch penalty);
          //    leaving the base itself out stops a 2-copy "unit" from matching itself; keep the best local stretch
          var sb = 0, sa = -1, se = -1, sc = 0, ss = a0;
          for (var y = a0; y <= b0; y++) {
            var c2 = { A: 0, C: 0, G: 0, T: 0 };
            for (var x2 = a0 + ((y - a0) % d); x2 <= b0; x2 += d) if (x2 !== y) c2[seq[x2]]++;
            var mx = Math.max(c2.A, c2.C, c2.G, c2.T);
            var w = (mx > 0 && c2[seq[y]] === mx) ? 2 : -mmPen;
            if (sc <= 0) { sc = w; ss = y; } else sc += w;
            if (sc > sb) { sb = sc; sa = ss; se = y; }
          }
          if (sa >= 0 && se - sa + 1 >= 2 * d) {
            var same = 0, tot = 0;
            for (var z = sa; z + d <= se; z++) { tot++; if (seq[z] === seq[z + d]) same++; }
            var rot = (sa - a0) % d;
            r = { d: d, score: sb, a: sa, b: se, pm: tot ? 100 * same / tot : 0, cons: cons.slice(rot).concat(cons.slice(0, rot)).join('') };
          }
        }
        res.push(r);
      }
      return res;
    }
    var X0 = 52, X1 = 744, Y0 = 180, Y1 = 14;
    function draw() {
      var minS = +S.value;
      $('s04-trf-pv').textContent = P.value + ' bp';
      $('s04-trf-cv').textContent = C.value;
      $('s04-trf-mv').textContent = M.value + ' %';
      $('s04-trf-sv').textContent = minS;
      var g = build(), res = scan(g.seq);
      // toy reporting rule: the shortest period whose score is within 10 % of the best score
      var bestSc = 0, top = res[0];
      res.forEach(function (r) { if (r.score > bestSc) { bestSc = r.score; top = r; } });
      for (var t0 = 0; t0 < res.length; t0++) if (res[t0].score >= 0.9 * bestSc && res[t0].score > 0) { top = res[t0]; break; }
      var found = top.score >= minS && top.a >= 0;
      var others = res.filter(function (r) { return r !== top && r.score >= minS; }).map(function (r) { return r.d; });
      // sequence display
      var html = '', N = g.seq.length;
      for (var i = 0; i < N; i++) {
        if (i && i % 60 === 0) html += '\n';
        var cls = [];
        if (g.isArr[i]) cls.push('a');
        if (g.isMut[i]) cls.push('x');
        if (found && i >= top.a && i <= top.b) cls.push('s04-det');
        html += cls.length ? '<span class="' + cls.join(' ') + '">' + g.seq[i] + '</span>' : g.seq[i];
      }
      seqBox.innerHTML = html;
      // bar chart
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var maxS = minS;
      res.forEach(function (r) { if (r.score > maxS) maxS = r.score; });
      maxS = Math.ceil(maxS * 1.1 / 20) * 20;
      var bw = (X1 - X0) / MAXD;
      var step = maxS > 600 ? 200 : maxS > 300 ? 100 : maxS > 120 ? 50 : 20;
      for (var y = 0; y <= maxS; y += step) {
        var yy = Y0 - (Y0 - Y1) * y / maxS;
        el('line', { x1: X0, x2: X1, y1: yy, y2: yy, 'class': 'grid' }, svg);
        el('text', { x: X0 - 6, y: yy + 4, 'text-anchor': 'end' }, svg, y);
      }
      res.forEach(function (r) {
        if (!r.score) return;
        var h = (Y0 - Y1) * r.score / maxS;
        var isTop = found && r === top, mult = r.d % g.p === 0;
        var col = isTop ? 'var(--het)' : (r.score >= minS ? (mult ? 'var(--accent)' : 'var(--rep)') : 'var(--err)');
        var rect = el('rect', { x: X0 + (r.d - 1) * bw + 1, y: Y0 - h, width: Math.max(1, bw - 2), height: h, style: 'fill:' + col }, svg);
        el('title', {}, rect, 'period ' + r.d + ': score ' + r.score);
      });
      var ym = Y0 - (Y0 - Y1) * minS / maxS;
      el('line', { x1: X0, x2: X1, y1: ym, y2: ym, style: 'stroke:var(--bad);stroke-width:1.5;stroke-dasharray:5 3' }, svg);
      el('text', { x: X1, y: ym - 4, 'text-anchor': 'end', style: 'fill:var(--bad)' }, svg, 'Minscore ' + minS);
      el('line', { x1: X0, x2: X1, y1: Y0, y2: Y0, 'class': 'ax' }, svg);
      for (var d = 1; d <= MAXD; d++) {
        if (d !== 1 && d % 10 !== 0 && d !== g.p) continue;
        var xx = X0 + (d - 0.5) * bw;
        el('text', { x: xx, y: Y0 + 14, 'text-anchor': 'middle', 'class': d === g.p ? 'lab' : '' }, svg, d);
      }
      el('text', { x: (X0 + X1) / 2, y: Y0 + 32, 'text-anchor': 'middle', 'class': 'lab' }, svg, 'period tried (bp); bar = best score at that period');
      // readout
      if (out) {
        var cells = [];
        if (found) {
          var len = top.b - top.a + 1;
          cells.push('<div>Reported array<b>' + (top.a + 1) + '–' + (top.b + 1) + '</b>' + len + ' bp (true array ' + (FL + 1) + '–' + (FL + g.p * g.c) + ')</div>');
          cells.push('<div>Period × copies<b>' + top.d + ' × ' + (len / top.d).toFixed(1) + '</b>' + (top.d === g.p ? 'the true unit' : (top.d % g.p === 0 ? 'a multiple of the true unit (' + g.p + ' bp)' : 'not the true unit (' + g.p + ' bp)')) + '</div>');
          cells.push('<div>Score / % matches<b>' + top.score + ' / ' + top.pm.toFixed(0) + ' %</b>matches between neighbouring copies</div>');
          cells.push('<div>Consensus unit<b style="font-size:13px;word-break:break-all">' + esc(top.cons) + '</b></div>');
          cells.push('<div>Other periods above Minscore<b>' + (others.length ? others.slice(0, 8).join(', ') : 'none') + '</b>' + (others.length ? 'TRF too reports one array at up to three period sizes' : '') + '</div>');
        } else {
          cells.push('<div>Not reported<b>best score ' + top.score + ' &lt; ' + minS + '</b>(best period tried: ' + top.d + ' bp)</div>');
        }
        out.innerHTML = cells.join('');
      }
    }
    [P, C, M, S].forEach(function (x) { x.addEventListener('input', draw); });
    var bt = MM.querySelectorAll('button');
    for (var b = 0; b < bt.length; b++) {
      bt[b].addEventListener('click', function () {
        mmPen = +this.getAttribute('data-v');
        for (var j2 = 0; j2 < bt.length; j2++) bt[j2].setAttribute('aria-pressed', bt[j2] === this ? 'true' : 'false');
        draw();
      });
    }
    draw();
  })();
})();
