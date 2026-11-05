(function () {
  /* s01: three toys. (1) anatomy of a toy SINE copy (hover/focus/tap parts);
     (2) staggered nicks -> target site duplication; (3) twelve copies aging from one master.
     Layout of the toy follows the published description of mammalian T+ SINEs (Vassetzky et al. 2021,
     IJMS 22:9897): tRNA-derived head with boxes A and B (11 bp each, 30-40 bp apart), body, AATAAA motifs,
     TATTT terminator, A tail. Letters are invented. */
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function rng(seed) { // mulberry32
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function randSeq(n, R) { var s = ''; for (var i = 0; i < n; i++) s += 'ACGT'[Math.floor(R() * 4)]; return s; }

  /* ---------- the toy SINE ---------- */
  var R0 = rng(101);
  var TSD = 'AGAAGTCT';                                   // 8 bp, host DNA
  var HEAD = 'GGCCGGAG' + 'TGGCTCAGTGG' + randSeq(32, R0) + 'GGTTCGAATCC' + randSeq(10, R0); // 72
  var BODY = randSeq(40, R0);
  var PAS = 'AATAAACAATAAA';
  var TERM = 'TATTT';
  var TAIL = 'AAAAAAAAAAAAAAAA';                          // 16
  var PARTS = [
    { k: 'tsd', name: 'TSD (left)', seq: TSD, col: '--err',
      d: 'Target site duplication: 8 bp of host DNA. The same 8 bp sit on the other side of the copy. Made when the copy was inserted; part of the locus, not of the SINE family.' },
    { k: 'head', name: 'Head', seq: HEAD, col: '--het',
      d: 'The 5′ part, derived from a tRNA in this toy (other families: 7SL RNA or 5S rRNA). SINEBase test: at least 60 % identity to the source RNA gene over at least 60 nt.' },
    { k: 'body', name: 'Body', seq: BODY, col: '--accent',
      d: 'Middle part: of unknown origin, or taken from the 3′ end of the partner LINE. Some bodies share a "core" domain with distant SINE families.' },
    { k: 'pas', name: 'AATAAA motifs', seq: PAS, col: '--rep',
      d: 'Polyadenylation signals (AATAAA): in T+ SINEs they let the pol III transcript receive a poly(A) tail, which pol III RNAs normally do not get.' },
    { k: 'term', name: 'Terminator', seq: TERM, col: '--bad',
      d: 'Pol III transcription terminator, a short T-rich run where the polymerase stops: TATTT in Dip and Ves, TCTTT in B2. SINEs such as Alu and B1 have none.' },
    { k: 'tail', name: 'A-rich tail', seq: TAIL, col: '--good',
      d: 'The 3′ tail. The L1 enzyme needs an A-rich RNA end to start copying. Long in young copies; shortens over host generations.' },
    { k: 'tsd2', name: 'TSD (right)', seq: TSD, col: '--err',
      d: 'The second copy of the target site. Over time the two TSD copies mutate independently and become hard to recognise.' }
  ];
  var BOXES = [
    { name: 'Box A', off: 8, len: 11, d: 'Box A: the first half of the internal pol III promoter (11 bp). Because it is inside the element, every new copy carries its own promoter.' },
    { name: 'Box B', off: 51, len: 11, d: 'Box B: the second half of the promoter (11 bp), 30-40 bp downstream of box A in tRNA- and 7SL-derived heads. 5S-derived heads have no B box.' }
  ];
  var FULL = PARTS.map(function (p) { return p.seq; }).join('');
  var starts = [], acc = 0;
  PARTS.forEach(function (p) { starts.push(acc); acc += p.seq.length; });

  var svgA = $('s01-anat'), outA = $('s01-anat-out'), seqA = $('s01-anat-seq');
  if (svgA && outA && seqA) {
    var X0 = 20, W = 720, sc = W / FULL.length, BY = 54, BH = 34;
    var shapes = [];
    function show(i, isBox) {
      var p = isBox ? BOXES[i] : PARTS[i];
      var st = isBox ? starts[1] + p.off : starts[i], len = isBox ? p.len : p.seq.length;
      outA.innerHTML = '<div><span class="eyebrow">' + esc(p.name) + ' · positions ' + (st + 1) + '-' + (st + len) +
        ' of ' + FULL.length + '</span><p>' + esc(p.d) + '</p></div>';
      var html = '';
      for (var j = 0; j < FULL.length; j++) {
        if (j && j % 60 === 0) html += '\n';
        var c = FULL[j];
        html += (j >= st && j < st + len) ? '<span class="h">' + c + '</span>' : c;
      }
      seqA.innerHTML = html;
      shapes.forEach(function (s) { s.g.setAttribute('opacity', s.isBox === !!isBox && s.i === i ? '1' : '.55'); });
    }
    PARTS.forEach(function (p, i) {
      var x = X0 + starts[i] * sc, w = p.seq.length * sc;
      var g = el('g', { tabindex: '0', role: 'button', 'aria-label': p.name, style: 'cursor:pointer' }, svgA);
      el('rect', { x: x, y: BY, width: w, height: BH, style: 'fill:var(' + p.col + ');fill-opacity:.35;stroke:var(' + p.col + ')' }, g);
      shapes.push({ g: g, i: i, isBox: false });
      ['mouseenter', 'focus', 'click'].forEach(function (ev) { g.addEventListener(ev, function () { show(i, false); }); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(i, false); } });
    });
    BOXES.forEach(function (b, i) {
      var x = X0 + (starts[1] + b.off) * sc, w = b.len * sc;
      var g = el('g', { tabindex: '0', role: 'button', 'aria-label': b.name, style: 'cursor:pointer' }, svgA);
      el('rect', { x: x, y: BY + 5, width: w, height: BH - 10, style: 'fill:var(--het);stroke:var(--fg);stroke-width:.6' }, g);
      el('text', { x: x + w / 2, y: BY + BH / 2 + 4, 'text-anchor': 'middle', style: 'fill:var(--bg);font-weight:700' }, g, i ? 'B' : 'A');
      shapes.push({ g: g, i: i, isBox: true });
      ['mouseenter', 'focus', 'click'].forEach(function (ev) { g.addEventListener(ev, function (e) { if (e) e.stopPropagation(); show(i, true); }); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(i, true); } });
    });
    // labels: big parts above, small parts below with leaders
    function mid(i) { return X0 + (starts[i] + PARTS[i].seq.length / 2) * sc; }
    el('text', { class: 'lab', x: mid(0), y: BY - 8, 'text-anchor': 'middle' }, svgA, 'TSD');
    el('text', { class: 'lab', x: mid(1), y: BY - 8, 'text-anchor': 'middle' }, svgA, 'head (tRNA-derived)');
    el('text', { class: 'lab', x: mid(2), y: BY - 8, 'text-anchor': 'middle' }, svgA, 'body');
    el('text', { class: 'lab', x: mid(5), y: BY - 8, 'text-anchor': 'middle' }, svgA, 'tail');
    el('text', { class: 'lab', x: mid(6), y: BY - 8, 'text-anchor': 'middle' }, svgA, 'TSD');
    [[3, 'AATAAA', BY + BH + 22, 'end'], [4, 'terminator', BY + BH + 38, 'middle']].forEach(function (a) {
      var x = mid(a[0]);
      el('line', { x1: x, y1: BY + BH, x2: x, y2: a[2] - 11, class: 'ax' }, svgA);
      el('text', { x: a[3] === 'end' ? x + 4 : x, y: a[2], 'text-anchor': a[3] }, svgA, a[1]);
    });
    el('text', { x: X0, y: BY + BH + 22 }, svgA, 'promoter boxes A and B inside the head');
    el('text', { x: X0, y: 20 }, svgA, 'host DNA');
    el('text', { x: X0 + W, y: 20, 'text-anchor': 'end' }, svgA, 'host DNA');
    el('line', { x1: X0, y1: 162, x2: X0 + W, y2: 162, class: 'ax' }, svgA);
    el('text', { x: X0, y: 156 }, svgA, '5′');
    el('text', { x: X0 + W, y: 156, 'text-anchor': 'end' }, svgA, '3′  (162 bp shown; real SINEs: mostly 150-500 bp)');
    show(1, false);
  }

  /* ---------- insertion toy ---------- */
  var svgI = $('s01-ins'), txtI = $('s01-ins-txt'), stag = $('s01-stag'), stagV = $('s01-stag-v');
  var bBack = $('s01-back'), bNext = $('s01-next');
  if (svgI && txtI && stag && bBack && bNext) {
    var TGT = 'GCTAGCCATGGTCAGCTTAAAAGGCTCAGTTCAGTCCGAG';  // 40 bp target region
    var NICK1 = TGT.indexOf('TTAAAA') + 2;               // bottom strand nick between TT and AAAA (Jurka 1997)
    var COMP = { A: 'T', C: 'G', G: 'C', T: 'A' };
    var CW = 11, step = 0;
    var TEXT = [
      'Step 1 of 5. Target DNA, both strands (top 5′→3′, bottom 3′→5′). The highlighted TTAAAA is the kind of site where the L1 endonuclease prefers to cut.',
      'Step 2 of 5. Nick 1: the endonuclease cuts the bottom strand between TT and AAAA. The nicked strand now has a free 3′ end.',
      'Step 3 of 5. Target-primed reverse transcription: the free 3′ end of the host strand primes reverse transcription of the SINE RNA, starting at the RNA’s A-rich 3′ end. New DNA (cDNA) grows along the RNA.',
      'Step 4 of 5. Nick 2: the top strand is cut further along, S bp away from nick 1. The S bp between the two nicks are the stretch that will end up duplicated.',
      'Step 5 of 5. Repair: the gaps are filled and the ends joined. The S bp between the nicks now exist on both sides of the SINE: a target site duplication (TSD). The SINE ends in its A tail next to the right TSD.'
    ];
    function draw() {
      var s = +stag.value;
      stagV.textContent = s + ' bp';
      while (svgI.firstChild) svgI.removeChild(svgI.firstChild);
      var t = TEXT[step].replace(/S bp/g, s + ' bp');
      if (step === 4 && s === 0) t = 'Step 5 of 5. Repair. With no stagger (both nicks at the same point) nothing is duplicated: the copy has no TSD. This is one reason a missing TSD is no proof that something is not a SINE.';
      txtI.textContent = t;
      CW = 11; bBack.disabled = step === 0; bNext.disabled = step === 4;
      var n2 = NICK1 + s;
      if (step < 4) {
        var x0 = (760 - TGT.length * CW) / 2, yT = 70, yB = 92;
        el('text', { x: x0 - 20, y: yT }, svgI, '5′'); el('text', { x: x0 + TGT.length * CW + 6, y: yT }, svgI, '3′');
        el('text', { x: x0 - 20, y: yB }, svgI, '3′'); el('text', { x: x0 + TGT.length * CW + 6, y: yB }, svgI, '5′');
        var site = TGT.indexOf('TTAAAA');
        for (var i = 0; i < TGT.length; i++) {
          var inSite = i >= site && i < site + 6, inT = step >= 3 && i >= NICK1 && i < n2;
          var st = inT ? 'fill:var(--het);font-weight:700' : inSite ? 'fill:var(--accent);font-weight:700' : 'fill:var(--fg)';
          el('text', { x: x0 + i * CW + CW / 2, y: yT, 'text-anchor': 'middle', style: st + ';font-size:12px' }, svgI, TGT[i]);
          el('text', { x: x0 + i * CW + CW / 2, y: yB, 'text-anchor': 'middle', style: st + ';font-size:12px' }, svgI, COMP[TGT[i]]);
        }
        if (step >= 1) {
          var xn = x0 + NICK1 * CW;
          el('line', { x1: xn, y1: yB - 11, x2: xn, y2: yB + 5, style: 'stroke:var(--bad);stroke-width:2.5' }, svgI);
          el('text', { x: xn, y: yB + 20, 'text-anchor': 'middle', style: 'fill:var(--bad)' }, svgI, 'nick 1');
        }
        if (step >= 2) {
          var rx = xn - 300, ry = yB + 52;
          el('rect', { x: rx, y: ry, width: 300, height: 14, style: 'fill:var(--rep);fill-opacity:.3;stroke:var(--rep)' }, svgI);
          el('text', { x: rx + 6, y: ry + 11, style: 'fill:var(--fg)' }, svgI, '5′ SINE RNA (head … body)');
          el('text', { x: xn - 6, y: ry + 11, 'text-anchor': 'end', style: 'fill:var(--fg)' }, svgI, 'AAAA 3′');
          el('rect', { x: xn - 190, y: ry - 20, width: 190, height: 10, style: 'fill:var(--accent);fill-opacity:.6' }, svgI);
          el('text', { x: xn - 196, y: ry - 11, 'text-anchor': 'end', style: 'fill:var(--accent)' }, svgI, '← cDNA made by the LINE’s RT');
          el('line', { x1: xn, y1: yB + 24, x2: xn, y2: ry - 20, style: 'stroke:var(--accent);stroke-dasharray:3 2' }, svgI);
        }
        if (step >= 3) {
          var xm = x0 + n2 * CW;
          el('line', { x1: xm, y1: yT - 13, x2: xm, y2: yT + 4, style: 'stroke:var(--bad);stroke-width:2.5' }, svgI);
          el('text', { x: xm, y: yT - 18, 'text-anchor': 'middle', style: 'fill:var(--bad)' }, svgI, 'nick 2');
          if (s > 0) {
            var xa = x0 + NICK1 * CW;
            el('path', { d: 'M' + xa + ' 30 v6 H' + xm + ' v-6', class: 'ax', style: 'stroke:var(--het)' }, svgI);
            el('text', { x: (xa + xm) / 2, y: 24, 'text-anchor': 'middle', style: 'fill:var(--het)' }, svgI, s + ' bp between the nicks');
          }
        }
      } else {
        // final: top[0..n2) + SINE + top[NICK1..]
        var left = TGT.slice(0, n2), right = TGT.slice(NICK1), BOXW = 120; CW = 10;
        var tot = (left.length + right.length) * CW + BOXW;
        var xs = (760 - tot) / 2, y = 90;
        el('text', { x: xs - 20, y: y }, svgI, '5′');
        var drawRun = function (str, x, tsdFrom, tsdTo) {
          for (var i = 0; i < str.length; i++) {
            var inT = i >= tsdFrom && i < tsdTo;
            el('text', { x: x + i * CW + CW / 2, y: y, 'text-anchor': 'middle', style: (inT ? 'fill:var(--het);font-weight:700' : 'fill:var(--fg)') + ';font-size:12px' }, svgI, str[i]);
          }
          return x + str.length * CW;
        };
        var xe = drawRun(left, xs, NICK1, n2);
        el('rect', { x: xe + 2, y: y - 16, width: BOXW - 4, height: 24, style: 'fill:var(--rep);fill-opacity:.3;stroke:var(--rep)' }, svgI);
        el('text', { x: xe + 8, y: y }, svgI, 'head…body');
        el('text', { x: xe + BOXW - 8, y: y, 'text-anchor': 'end', style: 'fill:var(--good);font-weight:700' }, svgI, 'AAAA');
        el('text', { x: xe + BOXW / 2, y: y + 30, 'text-anchor': 'middle', style: 'fill:var(--rep)' }, svgI, 'new SINE copy');
        var xr = drawRun(right, xe + BOXW, 0, s);
        el('text', { x: xr + 6, y: y }, svgI, '3′');
        if (s > 0) {
          var a1 = xs + NICK1 * CW, b1 = xs + n2 * CW, a2 = xe + BOXW, b2 = a2 + s * CW;
          [[a1, b1], [a2, b2]].forEach(function (p) {
            el('path', { d: 'M' + p[0] + ' ' + (y + 8) + ' v6 H' + p[1] + ' v-6', style: 'stroke:var(--het);fill:none' }, svgI);
            el('text', { x: (p[0] + p[1]) / 2, y: y + 28, 'text-anchor': 'middle', style: 'fill:var(--het)' }, svgI, 'TSD');
          });
        }
        el('text', { x: 380, y: 170, 'text-anchor': 'middle' }, svgI,
          s > 0 ? 'the same ' + s + ' bp now flank the copy on both sides' : 'no stagger: no duplication');
      }
    }
    bNext.addEventListener('click', function () { if (step < 4) { step++; draw(); } });
    bBack.addEventListener('click', function () { if (step > 0) { step--; draw(); } });
    stag.addEventListener('input', draw);
    draw();
  }

  /* ---------- aging toy ---------- */
  var age = $('s01-age'), ageV = $('s01-age-v'), outG = $('s01-age-out'), aln = $('s01-aln');
  if (age && ageV && outG && aln) {
    var RATE = 0.0022;        // substitutions per site per My (2.2e-9 per year)
    var DELR = 0.0002;        // toy: deletion events per site per My
    var TAILR = 0.1;          // toy: tail bases lost per My
    var NC = 12, L = FULL.length, TL = TSD.length;
    var TAIL0 = starts[5], TAIL1 = starts[5] + TAIL.length;
    var TS = { A: 'G', G: 'A', C: 'T', T: 'C' };
    var TV = { A: 'CT', G: 'CT', C: 'AG', T: 'AG' };
    var R = rng(2026), copies = [];
    for (var c = 0; c < NC; c++) {
      var f = 0.8 + 0.4 * R(), mt = [], mb = [], dels = [], tl = [];
      for (var j = 0; j < L; j++) {
        mt.push(-Math.log(1 - R()) / RATE);
        var b = FULL[j];
        mb.push(R() < 2 / 3 ? TS[b] : TV[b][Math.floor(R() * 2)]);
      }
      var tt = 0;
      while (true) { tt += -Math.log(1 - R()) / (DELR * L); if (tt > 400) break; dels.push([tt, Math.floor(R() * (L - 2 * TL)) + TL, 1 + Math.floor(R() * 3)]); }
      tt = 0;
      while (tl.length < TAIL.length) { tt += -Math.log(1 - R()) / TAILR; tl.push(tt); }
      copies.push({ f: f, mt: mt, mb: mb, dels: dels, tl: tl });
    }
    function seqAt(cp, a) {
      var s = [], j;
      for (j = 0; j < L; j++) s.push(cp.mt[j] < a ? cp.mb[j] : FULL[j]);
      cp.dels.forEach(function (d) { if (d[0] < a) for (var k = 0; k < d[2] && d[1] + k < L - TL; k++) s[d[1] + k] = '-'; });
      var lost = 0; cp.tl.forEach(function (x) { if (x < a) lost++; });
      for (j = TAIL1 - 1; j >= TAIL1 - lost; j--) s[j] = '-';     // tail shortens from its 3' end
      return s;
    }
    function upd() {
      var A = +age.value;
      ageV.textContent = A + ' My';
      var rows = copies.map(function (cp) { return seqAt(cp, A * cp.f); });
      var divs = [], tsdOk = 0, tails = [];
      rows.forEach(function (s) {
        var diff = 0, n = 0;
        for (var j = TL; j < TAIL0; j++) { n++; if (s[j] !== FULL[j]) diff++; }
        divs.push(100 * diff / n);
        var mm = 0; for (j = 0; j < TL; j++) if (s[j] !== s[L - TL + j]) mm++;
        if (mm <= 2) tsdOk++;
        var run = 0, best = 0; for (j = TAIL0; j < TAIL1; j++) { if (s[j] === 'A') { run++; if (run > best) best = run; } else if (s[j] !== '-') run = 0; }
        tails.push(best);
      });
      // majority consensus
      var cons = [], cdiff = 0;
      for (var j = 0; j < L; j++) {
        var cnt = {}, top = FULL[j], tn = 0;
        rows.forEach(function (s) { cnt[s[j]] = (cnt[s[j]] || 0) + 1; });
        for (var k in cnt) if (cnt[k] > tn || (cnt[k] === tn && k === FULL[j])) { tn = cnt[k]; top = k; }
        cons.push(top); if (j >= TL && j < TAIL0 && top !== FULL[j]) cdiff++;
      }
      var mean = divs.reduce(function (a, b) { return a + b; }, 0) / NC;
      var mn = Math.min.apply(null, divs), mx = Math.max.apply(null, divs);
      var tmean = tails.reduce(function (a, b) { return a + b; }, 0) / NC;
      outG.innerHTML =
        '<div><span class="tip" title="Share of the copy’s positions from head to terminator (TSDs and A tail excluded) that differ from the master: substitutions plus deleted bases.">Mean divergence from the master</span><b>' + mean.toFixed(1) + ' %</b>range ' + mn.toFixed(1) + '-' + mx.toFixed(1) + ' %; similarity ' + (100 - mean).toFixed(0) + ' %</div>' +
        '<div><span class="tip" title="Toy rule: the two 8-bp flanks still count as a duplication if they differ at no more than 2 positions. Real TSD searches use their own, different rules.">Copies with a recognisable TSD</span><b>' + tsdOk + ' of ' + NC + '</b>two flank copies differ at ≤ 2 of 8 bp</div>' +
        '<div><span class="tip" title="Longest run of pure A in the tail region, averaged over the twelve copies; the master has 16.">Mean pure A run in the tail</span><b>' + tmean.toFixed(1) + ' A</b>master: 16 A</div>' +
        '<div><span class="tip" title="At each column take the base most of the twelve copies show; count columns from head to terminator (TSDs and tail excluded) where that differs from the master.">Majority consensus vs master</span><b>' + cdiff + ' difference' + (cdiff === 1 ? '' : 's') + '</b>out of ' + (TAIL0 - TL) + ' positions (tail excluded)</div>';
      function fmt(s, isMaster) {
        var h = '';
        for (var j = 0; j < L; j++) {
          var ch = isMaster ? FULL[j] : s[j] === FULL[j] ? '.' : s[j];
          var edge = j < TL || j >= L - TL;
          if (j === TL || j === L - TL) h += ' ';
          if (!isMaster && ch !== '.' && ch !== '-') h += '<span class="' + (edge ? 'a' : 'h') + '">' + ch + '</span>';
          else if (edge) h += '<span class="s01-tsd">' + ch + '</span>';
          else h += ch;
        }
        return h;
      }
      var html = 'master         ' + fmt(null, true) + '\n';
      rows.forEach(function (s, i) {
        var lab = ('copy ' + (i + 1) + '        ').slice(0, 8) + (' ' + divs[i].toFixed(0) + '%   ').slice(0, 6) + ' ';
        html += lab + fmt(s, false) + '\n';
      });
      var cs = 'consensus      ';
      for (var j2 = 0; j2 < L; j2++) {
        if (j2 === TL || j2 === L - TL) cs += ' ';
        cs += cons[j2] === FULL[j2] ? '.' : '<span class="x">' + cons[j2] + '</span>';
      }
      html += cs + '\n<span class="s01-c">copy N  xx% = that copy’s divergence; consensus row: dots = same as master, red = differs</span>';
      aln.innerHTML = html;
    }
    age.addEventListener('input', upd);
    upd();
  }
})();
