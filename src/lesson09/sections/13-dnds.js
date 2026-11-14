(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  // ENGINE-BEGIN
  // Exact fractions, so that sites show as 1/3 and 2/3, not as decimals.
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function F(n, d) { if (d === undefined) d = 1; if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); return { n: n / g, d: d / g }; }
  function fadd(x, y) { return F(x.n * y.d + y.n * x.d, x.d * y.d); }
  function fsub(x, y) { return F(x.n * y.d - y.n * x.d, x.d * y.d); }
  function fmul(x, y) { return F(x.n * y.n, x.d * y.d); }
  function fdiv(x, y) { return F(x.n * y.d, x.d * y.n); }
  function fval(x) { return x.n / x.d; }
  function feq(x, y) { return x.n * y.d === y.n * x.d; }
  function fstr(x) { // 4/3 -> "1 1/3"
    if (x.d === 1) return String(x.n);
    var w = Math.floor(x.n / x.d), r = x.n - w * x.d;
    return (w ? w + ' ' : '') + r + '/' + x.d;
  }

  // Standard genetic code. Order TCAG at each position; '*' = stop.
  var BASES = 'TCAG';
  var AAS = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
  var THREE = { F: 'Phe', L: 'Leu', S: 'Ser', Y: 'Tyr', C: 'Cys', W: 'Trp', P: 'Pro', H: 'His', Q: 'Gln', R: 'Arg', I: 'Ile', M: 'Met', T: 'Thr', N: 'Asn', K: 'Lys', V: 'Val', A: 'Ala', D: 'Asp', E: 'Glu', G: 'Gly', '*': 'stop' };
  function aa(codon) {
    return AAS[BASES.indexOf(codon[0]) * 16 + BASES.indexOf(codon[1]) * 4 + BASES.indexOf(codon[2])];
  }
  function isStop(codon) { return aa(codon) === '*'; }

  // Synonymous share of each position of one codon (Nei-Gojobori 1986).
  // Convention of this toy: a change that would make a stop codon is left out,
  // so the share is taken over the non-stop alternatives only.
  function sitesOf(codon) {
    var out = [], p, b, syn, ok, alt, a0 = aa(codon);
    for (p = 0; p < 3; p++) {
      syn = 0; ok = 0;
      for (b = 0; b < 4; b++) {
        if (BASES[b] === codon[p]) continue;
        alt = codon.slice(0, p) + BASES[b] + codon.slice(p + 1);
        if (isStop(alt)) continue;
        ok++; if (aa(alt) === a0) syn++;
      }
      out.push(ok ? F(syn, ok) : F(0));
    }
    return out;
  }
  function sumF(arr) { return arr.reduce(fadd, F(0)); }

  // Differences between two codons. With 2 or 3 differences, every order of change is a path;
  // paths that pass through a stop codon are left out; the rest are averaged.
  function permutations(a) {
    if (a.length <= 1) return [a.slice()];
    var out = [];
    a.forEach(function (x, i) {
      permutations(a.slice(0, i).concat(a.slice(i + 1))).forEach(function (r) { out.push([x].concat(r)); });
    });
    return out;
  }
  function codonDiffs(c1, c2) {
    var pos = [], p;
    for (p = 0; p < 3; p++) if (c1[p] !== c2[p]) pos.push(p);
    if (!pos.length) return { s: F(0), n: F(0), paths: [], k: 0 };
    var paths = [], used = 0, sTot = 0, nTot = 0;
    permutations(pos).forEach(function (order) {
      var cur = c1, s = 0, n = 0, steps = [c1], bad = false;
      order.forEach(function (q, i) {
        var nxt = cur.slice(0, q) + c2[q] + cur.slice(q + 1);
        if (i < order.length - 1 && isStop(nxt)) bad = true;
        if (aa(nxt) === aa(cur)) s++; else n++;
        steps.push(nxt); cur = nxt;
      });
      paths.push({ steps: steps, s: s, n: n, stop: bad });
      if (!bad) { used++; sTot += s; nTot += n; }
    });
    if (!used) { // every path passes a stop: fall back to all paths
      paths.forEach(function (x) { used++; sTot += x.s; nTot += x.n; });
    }
    return { s: F(sTot, used), n: F(nTot, used), paths: paths, k: pos.length };
  }

  function clean(s) { return String(s).toUpperCase().replace(/U/g, 'T').replace(/[\s\-]/g, ''); }
  function checkCoding(s, name) {
    if (!s.length) return name + ' is empty.';
    if (/[^ACGT]/.test(s)) return name + ' has a letter that is not A, C, G or T.';
    if (s.length % 3) return name + ' has ' + s.length + ' bases. That is not a whole number of codons.';
    for (var i = 0; i < s.length; i += 3) if (isStop(s.slice(i, i + 3))) return name + ' has a stop codon (' + s.slice(i, i + 3) + ') at codon ' + (i / 3 + 1) + '. Use coding sequence without stops.';
    return '';
  }

  // Whole comparison: sites averaged over the two sequences, differences per codon.
  function countCodons(a, b) {
    a = clean(a); b = clean(b);
    var e = checkCoding(a, 'Sequence 1') || checkCoding(b, 'Sequence 2');
    if (!e && a.length !== b.length) e = 'The two sequences differ in length (' + a.length + ' and ' + b.length + ' bases). They must be aligned codon by codon.';
    if (e) return { error: e };
    var rows = [], S = F(0), N = F(0), Sd = F(0), Nd = F(0), i, c1, c2, s1, s2, sS, sN, d;
    for (i = 0; i < a.length; i += 3) {
      c1 = a.slice(i, i + 3); c2 = b.slice(i, i + 3);
      s1 = sitesOf(c1); s2 = sitesOf(c2);
      sS = fmul(fadd(sumF(s1), sumF(s2)), F(1, 2));
      sN = fsub(F(3), sS);
      d = codonDiffs(c1, c2);
      rows.push({ c1: c1, c2: c2, a1: aa(c1), a2: aa(c2), s1: s1, s2: s2, S: sS, N: sN, Sd: d.s, Nd: d.n, diff: d });
      S = fadd(S, sS); N = fadd(N, sN); Sd = fadd(Sd, d.s); Nd = fadd(Nd, d.n);
    }
    var dN = N.n ? fdiv(Nd, N) : null, dS = S.n ? fdiv(Sd, S) : null;
    var omega = dN && dS && dS.n ? fdiv(dN, dS) : null;
    return { rows: rows, S: S, N: N, Sd: Sd, Nd: Nd, dN: dN, dS: dS, omega: omega,
      dNv: dN ? fval(dN) : NaN, dSv: dS ? fval(dS) : NaN, omegaV: omega ? fval(omega) : NaN };
  }

  // McDonald-Kreitman counting.
  // Fixed: every species-1 sequence has one base, every species-2 sequence has one base, and they differ.
  // Polymorphic: any other variable column (variable within species 1, species 2, or both).
  // S or N (the rule of this toy): take the most common codon at that place over all sequences as the
  // background (ties: the one that appears first). Put every other base seen in the column into the
  // background codon. If any of them changes the amino acid, the site is N; otherwise S.
  // Each variable column counts once, however many bases it has and however many other columns of the
  // same codon vary.
  function mkClassify(sp1, sp2) {
    sp1 = sp1.map(clean); sp2 = sp2.map(clean);
    var all = sp1.concat(sp2), L = all[0].length, i, e = '';
    for (i = 0; i < all.length; i++) {
      if (all[i].length !== L) { e = 'All sequences must have the same length.'; break; }
      e = checkCoding(all[i], 'Sequence ' + (i + 1)); if (e) break;
    }
    if (e) return { error: e };
    var cols = [], A = 0, B = 0, C = 0, D = 0, j;
    for (j = 0; j < L; j++) {
      var b1 = {}, b2 = {}, k;
      sp1.forEach(function (s) { b1[s[j]] = 1; });
      sp2.forEach(function (s) { b2[s[j]] = 1; });
      var k1 = Object.keys(b1), k2 = Object.keys(b2), bases = Object.keys(Object.assign({}, b1, b2));
      if (bases.length === 1) { cols.push(null); continue; }
      var kind = (k1.length === 1 && k2.length === 1) ? 'F' : 'P';
      var st = j - j % 3, p = j % 3, tally = {}, order = [];
      all.forEach(function (s) { var c = s.slice(st, st + 3); if (!tally[c]) { tally[c] = 0; order.push(c); } tally[c]++; });
      var bg = order[0];
      order.forEach(function (c) { if (tally[c] > tally[bg]) bg = c; });
      var nonsyn = false;
      for (k = 0; k < bases.length; k++) {
        if (bases[k] === bg[p]) continue;
        var alt = bg.slice(0, p) + bases[k] + bg.slice(p + 1);
        if (aa(alt) !== aa(bg)) nonsyn = true;
      }
      var cls = nonsyn ? 'N' : 'S';
      cols.push({ kind: kind, cls: cls, bg: bg });
      if (kind === 'F') { if (nonsyn) A++; else C++; } else { if (nonsyn) B++; else D++; }
    }
    return { cols: cols, A: A, B: B, C: C, D: D, sp1: sp1, sp2: sp2 };
  }

  // Fisher's exact test on [[A, B], [C, D]], two-sided: the sum of the probabilities of all tables
  // with the same margins that are no more probable than the observed one (relative tolerance 1e-7).
  function lfact(n) { var s = 0; for (var i = 2; i <= n; i++) s += Math.log(i); return s; }
  function fisher(A, B, C, D) {
    var r1 = A + B, r2 = C + D, c1 = A + C, n = r1 + r2;
    if (!n) return NaN;
    var base = lfact(r1) + lfact(r2) + lfact(c1) + lfact(n - c1) - lfact(n);
    function pr(a) { return Math.exp(base - lfact(a) - lfact(r1 - a) - lfact(c1 - a) - lfact(r2 - c1 + a)); }
    var lo = Math.max(0, c1 - r2), hi = Math.min(r1, c1), po = pr(A), P = 0, a, q;
    for (a = lo; a <= hi; a++) { q = pr(a); if (q <= po * (1 + 1e-7)) P += q; }
    return Math.min(1, P);
  }
  // NI = (B/D)/(A/C); alpha = 1 - NI. Undefined when A, C or D is 0.
  function mkStats(A, B, C, D) {
    var ni = (A > 0 && C > 0 && D > 0) ? (B * C) / (A * D) : null;
    var dir = A * D > B * C ? 'pos' : A * D < B * C ? 'neg' : 'none';
    return { p: fisher(A, B, C, D), ni: ni, alpha: ni === null ? null : 1 - ni, dir: dir };
  }

  var CC_PRESETS = {
    ex1: { s1: 'ACT CCG GGG CCC', s2: 'ACG CCG GGC CTC', note: 'Human and chimpanzee, four codons, from the lecture.' },
    aspm: { s1: 'CGT GGC GCA CTT GTA', s2: 'CGT CGT CCA CTT GTA', note: 'ASPM quiz from the lecture: human (1) and chimpanzee (2). Codon 2 differs at two places.' },
    frac: { s1: 'TTT CTG CCC GGG ACT', s2: 'TTC TTG CAA GGG ACT', note: 'Invented example. TTT and TTC differ at a third position that is only 1/3 synonymous. CTG and TTG differ at a first position that is 1/3 synonymous. CCC and CAA differ at two places, and the two orders of change do not agree, so each counts half.' }
  };
  var MK_PRESETS = {
    lec: { kind: 'aln', names1: ['sp. 1, seq 1', 'sp. 1, seq 2', 'sp. 1, seq 3', 'sp. 1, seq 4'], names2: ['sp. 2'],
      sp1: ['CTTACTTATACCCGT', 'CTGACTTATACCCGT', 'CTGACTTCTACCCGT', 'CTGACTTCTACACGT'], sp2: ['ATGACCTCTACCCGT'],
      note: 'The alignment from the lecture: four sequences of species 1, one of species 2.' },
    senp1: { kind: 'tbl', A: 4, B: 1, C: 1, D: 5, note: 'SENP1, counts as given in the lecture.' },
    cias1: { kind: 'tbl', A: 5, B: 1, C: 10, D: 2, note: 'CIAS1 (now called NLRP3), counts as given in the lecture.' },
    agt: { kind: 'tbl', A: 1, B: 3, C: 13, D: 1, note: 'AGT, counts as given in the lecture.' },
    arsd: { kind: 'aln', names1: ['human 1', 'human 2', 'human 3', 'human 4', 'human 5', 'human 6'], names2: ['chimp'],
      sp1: ['TCTCCTACAGGGCGTCTAGTT', 'TCTCCTACAGGGCGTCTAGTT', 'TCTCCTACTGGGCGTCTAATT', 'TCTCCTACTGGGCGTCTAGTT', 'TCTCCTACAGGGCGTCTAGTT', 'TCTCATACAGGGCGTCTAGTT'],
      sp2: ['TATCCTACAGGCCGTCTTGTT'], note: 'The arsD quiz from the lecture: six humans, one chimpanzee.' }
  };
  // ENGINE-END

  var NAME = { pos: 'positive selection', neg: 'negative selection', none: 'none' };
  function num(x, k) { return x === null || !isFinite(x) ? 'undefined' : (Math.round(x * Math.pow(10, k)) / Math.pow(10, k)).toString(); }
  function pstr(p) { return p >= 0.1 ? p.toFixed(2) : p >= 0.001 ? p.toFixed(4) : p.toExponential(2); }

  // ---------- Toy 1: codon counter ----------
  var s1El = $('s13-cc-s1'), s2El = $('s13-cc-s2');
  function spaced(s) { return clean(s).replace(/(...)(?=.)/g, '$1 '); }
  function ccRun() {
    var r = countCodons(s1El.value, s2El.value), msg = $('s13-cc-msg');
    if (r.error) {
      msg.textContent = r.error; msg.className = 'tool-note s13-no';
      $('s13-cc-tbl').innerHTML = ''; $('s13-cc-steps').textContent = ''; $('s13-cc-read').textContent = '';
      return;
    }
    msg.textContent = ''; msg.className = 'tool-note';
    var h = '<table><thead><tr><th>Codon</th><th>Sequence 1</th><th>Sequence 2</th><th>Amino acids</th>' +
      '<th><span class="tip" title="Synonymous sites of this codon: for each position, the share of the possible single changes that keep the amino acid. Averaged over the two sequences.">S sites</span></th>' +
      '<th><span class="tip" title="Non-synonymous sites: 3 minus the S sites.">N sites</span></th>' +
      '<th>S differences</th><th>N differences</th></tr></thead><tbody>';
    r.rows.forEach(function (w, i) {
      var cls = w.diff.k ? ' class="s13-dif"' : '';
      var pathNote = '';
      if (w.diff.k > 1) {
        pathNote = '<div class="s13-path">' + w.diff.paths.map(function (p) {
          return p.steps.map(function (c) { return c + ' (' + THREE[aa(c)] + ')'; }).join(' → ') +
            (p.stop ? ': passes a stop, left out' : ': ' + p.s + ' S, ' + p.n + ' N');
        }).join('<br>') + '</div>';
      }
      h += '<tr' + cls + '><td>' + (i + 1) + '</td><td class="s13-m">' + w.c1 + '<br><span class="s13-sub">' + w.s1.map(fstr).join(' + ') + '</span></td>' +
        '<td class="s13-m">' + w.c2 + '<br><span class="s13-sub">' + w.s2.map(fstr).join(' + ') + '</span></td>' +
        '<td>' + THREE[w.a1] + (w.a1 === w.a2 ? '' : ' → ' + THREE[w.a2]) + '</td>' +
        '<td class="s13-m">' + fstr(w.S) + '</td><td class="s13-m">' + fstr(w.N) + '</td>' +
        '<td class="s13-m">' + fstr(w.Sd) + '</td><td class="s13-m">' + fstr(w.Nd) + pathNote + '</td></tr>';
    });
    h += '<tr class="s13-tot"><td colspan="4">Total</td><td class="s13-m">S = ' + fstr(r.S) + '</td><td class="s13-m">N = ' + fstr(r.N) +
      '</td><td class="s13-m">Sd = ' + fstr(r.Sd) + '</td><td class="s13-m">Nd = ' + fstr(r.Nd) + '</td></tr></tbody></table>';
    $('s13-cc-tbl').innerHTML = h;
    var t = 'dN = Nd / N = ' + fstr(r.Nd) + ' / ' + fstr(r.N) + ' = ' + num(r.dNv, 4) + '\n' +
      'dS = Sd / S = ' + fstr(r.Sd) + ' / ' + fstr(r.S) + ' = ' + num(r.dSv, 4) + '\n';
    var read;
    if (!r.omega) {
      t += 'ω = dN / dS: undefined, because dS = 0';
      read = 'There is no synonymous difference, so there is no yardstick. ω cannot be computed.';
    } else {
      t += 'ω = dN / dS = ' + num(r.dNv, 4) + ' / ' + num(r.dSv, 4) + ' = ' + num(r.omegaV, 3);
      var w = r.omegaV;
      read = w < 1 ? 'ω is below 1. Per site, amino-acid changes are rarer than silent ones. This is what negative selection leaves.'
        : w > 1 ? 'ω is above 1. Per site, amino-acid changes are more common than silent ones. This is a sign of positive selection, if the counts are large enough to trust.'
        : 'ω is 1. Amino-acid changes are as common as silent ones. This cannot reject neutrality. It does not prove it.';
      read += ' With this few codons, the number is an exercise, not a result.';
    }
    $('s13-cc-steps').textContent = t;
    $('s13-cc-read').textContent = read;
  }
  function ccPreset(k) {
    s1El.value = CC_PRESETS[k].s1; s2El.value = CC_PRESETS[k].s2;
    $('s13-cc-src').textContent = CC_PRESETS[k].note;
    ccRun();
  }
  s1El.addEventListener('input', function () { $('s13-cc-src').textContent = 'Your own sequences.'; ccRun(); });
  s2El.addEventListener('input', function () { $('s13-cc-src').textContent = 'Your own sequences.'; ccRun(); });
  $('s13-cc-p1').addEventListener('click', function () { ccPreset('ex1'); });
  $('s13-cc-p2').addEventListener('click', function () { ccPreset('aspm'); });
  $('s13-cc-p3').addEventListener('click', function () { ccPreset('frac'); });
  ccPreset('ex1');

  // ---------- Toy 2: McDonald-Kreitman ----------
  var cell = { A: $('s13-mk-a'), B: $('s13-mk-b'), C: $('s13-mk-c'), D: $('s13-mk-d') };
  function showAln(P, m) {
    var names = P.names1.concat(P.names2), seqs = m.sp1.concat(m.sp2), w = 0, h = '', j;
    names.forEach(function (n) { w = Math.max(w, n.length); });
    function pad(s) { while (s.length < w + 2) s += ' '; return s; }
    seqs.forEach(function (s, i) {
      h += pad(names[i]) + s.replace(/(...)(?=.)/g, '$1 ') + '\n';
      if (i === m.sp1.length - 1) h += pad('') + s.replace(/./g, '-').replace(/(...)(?=.)/g, '$1 ') + '\n';
    });
    var l1 = pad('fixed/poly'), l2 = pad('S or N');
    for (j = 0; j < m.cols.length; j++) {
      if (j && j % 3 === 0) { l1 += ' '; l2 += ' '; }
      var c = m.cols[j];
      if (!c) { l1 += '.'; l2 += '.'; continue; }
      l1 += c.kind === 'F' ? '<span class="a">F</span>' : '<span class="h">P</span>';
      l2 += c.cls === 'N' ? '<span class="x">N</span>' : '<span class="s13-s">S</span>';
    }
    $('s13-mk-aln').innerHTML = h.replace(/&/g, '&amp;').replace(/</g, '&lt;') + l1 + '\n' + l2 +
      '\n\nF = fixed difference, P = polymorphic, . = no variation. A = ' + m.A + ', B = ' + m.B + ', C = ' + m.C + ', D = ' + m.D + '.';
    $('s13-mk-aln').hidden = false;
    $('s13-mk-rule').hidden = false;
  }
  function mkRun() {
    var v = {}, k, bad = '';
    for (k in cell) {
      var x = cell[k].value.trim();
      if (!/^\d+$/.test(x)) bad = 'Every cell needs a whole number, 0 or more.';
      v[k] = parseInt(x, 10);
    }
    if (!bad && v.A + v.B + v.C + v.D === 0) bad = 'All four cells are 0. Enter some counts.';
    if (bad) {
      ['ac', 'bd', 'p', 'ni', 'al'].forEach(function (id) { $('s13-mk-r-' + id).textContent = '–'; });
      $('s13-mk-verdict').textContent = bad; return;
    }
    var s = mkStats(v.A, v.B, v.C, v.D);
    function ratio(x, y, nx, ny) { return y ? x + ' / ' + y + ' = ' + num(x / y, 3) : x ? 'undefined (' + ny + ' = 0)' : 'undefined (' + nx + ' and ' + ny + ' are 0)'; }
    $('s13-mk-r-ac').textContent = ratio(v.A, v.C, 'A', 'C');
    $('s13-mk-r-bd').textContent = ratio(v.B, v.D, 'B', 'D');
    $('s13-mk-r-p').textContent = pstr(s.p);
    var zero = ['A', 'C', 'D'].filter(function (q) { return !v[q]; }).join(', ');
    $('s13-mk-r-ni').textContent = s.ni === null ? 'undefined (' + zero + ' = 0)' : num(s.ni, 3);
    $('s13-mk-r-al').textContent = s.alpha === null ? 'undefined (' + zero + ' = 0)' : num(s.alpha, 3);
    var d = s.dir === 'pos' ? 'positive selection: A/C is larger than B/D, so there is more amino-acid change between species than the polymorphism predicts'
      : s.dir === 'neg' ? 'negative selection (or balancing selection): A/C is smaller than B/D, so there is more amino-acid polymorphism within species than between them'
      : 'none: A/C equals B/D';
    $('s13-mk-verdict').innerHTML = 'The direction is ' + d + '. With these counts the test ' +
      (s.p < 0.05 ? '<b class="s13-ok">can reject</b>' : '<b class="s13-no">cannot reject</b>') + ' neutrality at 0.05 (P = ' + pstr(s.p) + ').' +
      (s.p >= 0.05 && s.dir !== 'none' ? ' The direction alone is not evidence.' : '');
  }
  function mkPreset(k) {
    var P = MK_PRESETS[k];
    $('s13-mk-src').textContent = P.note;
    if (P.kind === 'aln') {
      var m = mkClassify(P.sp1, P.sp2);
      cell.A.value = m.A; cell.B.value = m.B; cell.C.value = m.C; cell.D.value = m.D;
      showAln(P, m);
    } else {
      cell.A.value = P.A; cell.B.value = P.B; cell.C.value = P.C; cell.D.value = P.D;
      $('s13-mk-aln').hidden = true; $('s13-mk-rule').hidden = true;
    }
    mkRun();
  }
  Object.keys(cell).forEach(function (k) {
    cell[k].addEventListener('input', function () {
      $('s13-mk-aln').hidden = true; $('s13-mk-rule').hidden = true;
      $('s13-mk-src').textContent = 'Your own counts.';
      mkRun();
    });
  });
  ['lec', 'senp1', 'cias1', 'agt', 'arsd'].forEach(function (k) {
    $('s13-mk-p-' + k).addEventListener('click', function () { mkPreset(k); });
  });
  mkPreset('lec');

  // ---------- Code controls, run at load against numbers counted by hand ----------
  (function () {
    var e1 = countCodons(CC_PRESETS.ex1.s1, CC_PRESETS.ex1.s2), e2 = countCodons(CC_PRESETS.aspm.s1, CC_PRESETS.aspm.s2);
    var ok = feq(e1.S, F(4)) && feq(e1.N, F(8)) && feq(e1.Sd, F(2)) && feq(e1.Nd, F(1)) && feq(e1.omega, F(1, 4)) &&
      feq(e2.S, F(5)) && feq(e2.N, F(10)) && feq(e2.Sd, F(1)) && feq(e2.Nd, F(2)) && feq(e2.omega, F(1)) &&
      feq(sitesOf('TTT')[2], F(1, 3)) && feq(sitesOf('CTT')[0], F(0)) && feq(sitesOf('CTA')[0], F(1, 3));
    $('s13-cc-control').innerHTML = 'Code control (run when this page loaded): lecture example 1 must give S 4, N 8, Sd 2, Nd 1, ω 1/4; the ASPM quiz S 5, N 10, Sd 1, Nd 2, ω 1; TTT third position 1/3 S; CTT first position 0 S; CTA first position 1/3 S. Result: ' +
      (ok ? '<span class="s13-ok">PASS</span>' : '<span class="s13-no">FAIL</span>');
    var m1 = mkClassify(MK_PRESETS.lec.sp1, MK_PRESETS.lec.sp2), m2 = mkClassify(MK_PRESETS.arsd.sp1, MK_PRESETS.arsd.sp2);
    var ok2 = m1.A === 1 && m1.B === 1 && m1.C === 1 && m1.D === 2 && m2.A === 1 && m2.B === 2 && m2.C === 2 && m2.D === 1 &&
      Math.abs(fisher(4, 1, 1, 5) - 37 / 462) < 1e-12 && Math.abs(fisher(1, 3, 13, 1) - 57 / 3060) < 1e-12 &&
      Math.abs(fisher(5, 1, 10, 2) - 1) < 1e-12 && Math.abs(fisher(1, 2, 2, 1) - 1) < 1e-12;
    $('s13-mk-control').innerHTML = 'Code control (run when this page loaded): the lecture alignment must give A 1, B 1, C 1, D 2; arsD A 1, B 2, C 2, D 1; Fisher P must be 37/462 for SENP1, 57/3060 for AGT, 1 for CIAS1 and arsD. Result: ' +
      (ok2 ? '<span class="s13-ok">PASS</span>' : '<span class="s13-no">FAIL</span>');
  })();
})();
