(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag), k;
    for (k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgIn(box, w, h, label) {
    return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'img', 'aria-label': label, style: 'display:block' }, box);
  }
  function div(cls, parent) { var d = document.createElement('div'); if (cls) d.className = cls; parent.appendChild(d); return d; }
  function para(cls, parent, html) { var p = document.createElement('p'); p.className = cls; p.innerHTML = html; parent.appendChild(p); return p; }
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
  function randDNA(r, n) { var s = '', i; for (i = 0; i < n; i++) s += 'ACGT'.charAt(Math.floor(r() * 4)); return s; }
  function isStop(c) { return c === 'TAA' || c === 'TAG' || c === 'TGA'; }
  function codons(r, n) { // n codons, none of them a stop
    var s = '', c, i;
    for (i = 0; i < n; i++) { do { c = randDNA(r, 3); } while (isStop(c)); s += c; }
    return s;
  }
  // Reading frames: ATG ... stop, at least minc codons (counting ATG, not the stop). Bases N break a frame.
  function orfs(seq, minc) {
    var out = [], f, i, j, c, ok, n = seq.length;
    for (f = 0; f < 3; f++) {
      i = f;
      while (i + 3 <= n) {
        if (seq.substr(i, 3) === 'ATG') {
          j = i; ok = false;
          while (j + 3 <= n) {
            c = seq.substr(j, 3);
            if (isStop(c)) { ok = true; break; }
            if (c.indexOf('N') >= 0) break;
            j += 3;
          }
          if (ok && (j - i) / 3 >= minc) out.push({ s: i, e: j + 3, c: (j - i) / 3 });
          i = ok ? j + 3 : i + 3;
        } else i += 3;
      }
    }
    return out;
  }
  function overlaps(a, list) { return list.some(function (b) { return a.s < b.e && b.s < a.e; }); }

  // ---------- 1. Interspersed and tandem repeats ----------
  var K = 10;
  function markRepeats(seq) {
    var cnt = {}, i, mark = [];
    for (i = 0; i + K <= seq.length; i++) cnt[seq.substr(i, K)] = (cnt[seq.substr(i, K)] || 0) + 1;
    for (i = 0; i < seq.length; i++) mark.push(false);
    for (i = 0; i + K <= seq.length; i++) if (cnt[seq.substr(i, K)] > 1) for (var j = i; j < i + K; j++) mark[j] = true;
    return mark;
  }
  function blocks(mark) {
    var b = [], i, cur = null;
    for (i = 0; i < mark.length; i++) {
      if (mark[i]) { if (cur) cur.e = i + 1; else { cur = { s: i, e: i + 1 }; b.push(cur); } } else cur = null;
    }
    return b;
  }
  function drawRepeats() {
    var r = rng(31), U = randDNA(r, 16);
    var inter = randDNA(r, 14) + U + randDNA(r, 22) + U + randDNA(r, 20) + U + randDNA(r, 16);
    var T = 'CAGTTA', tan = randDNA(r, 30), i;
    for (i = 0; i < 10; i++) tan += T;
    tan += randDNA(r, 30);
    var box = $('b-rp'), msgs = [];
    box.textContent = '';
    [['Interspersed: one sequence in three places', inter], ['Tandem: one short unit repeated side by side', tan]].forEach(function (q, qi) {
      var seq = q[1], mark = markRepeats(seq), bl = blocks(mark), n = 0, k, cs = '';
      mark.forEach(function (m) { if (m) n++; });
      para('b-lab', box, '<b>' + q[0] + '</b>');
      var d = div('b-ch', box);
      for (k = 0; k < seq.length; k++) cs += '<span class="b-' + seq.charAt(k) + (mark[k] ? ' b-on' : '') + '">' + seq.charAt(k) + '</span>';
      d.innerHTML = cs;
      var gaps = [];
      for (k = 1; k < bl.length; k++) gaps.push(bl[k].s - bl[k - 1].e);
      para('b-sm', box, 'Marked: <b>' + n + '</b> of ' + seq.length + ' bases, in <b>' + bl.length + '</b> blocks' + (gaps.length ? ', unmarked bases between them: <b>' + gaps.join(', ') + '</b>' : ''));
      msgs.push({ bl: bl.length, gaps: gaps });
    });
    var a = msgs[0], b = msgs[1];
    $('b-rpmsg').textContent = 'Purple letters are marked: ' + a.bl + ' separate blocks in the interspersed sequence, ' + b.bl + (b.bl === 1 ? ' block' : ' blocks') + ' in the tandem one.';
  }
  drawRepeats();

  // ---------- 2. Masked or not ----------
  var MINC = 60;
  function mutate(r, s, d) {
    var o = '', i, c;
    for (i = 0; i < s.length; i++) {
      if (r() < d) { do { c = 'ACGT'.charAt(Math.floor(r() * 4)); } while (c === s.charAt(i)); o += c; } else o += s.charAt(i);
    }
    return o;
  }
  var DIV = [0.01, 0.05, 0.09, 0.03, 0.13, 0.07, 0.02, 0.11, 0.04, 0.15, 0.06, 0.08, 0.10, 0.12, 0.14];
  function makeGenome(ncopies, seed) {
    var r = rng(seed), E = 'ATG' + codons(r, 100) + 'TAA' + randDNA(r, 30);
    var gene = 'ATG' + codons(r, 90) + 'TAA', items = [], i, seq = '', copies = [], g = null, pos;
    var gi = Math.floor(ncopies / 2);
    for (i = 0; i < ncopies; i++) items.push({ t: 'c', d: DIV[i % DIV.length] });
    items.splice(gi, 0, { t: 'g' });
    items.forEach(function (it) {
      seq += randDNA(r, 150 + Math.floor(r() * 200));
      pos = seq.length;
      if (it.t === 'g') { seq += gene; g = { s: pos, e: seq.length }; } else { seq += mutate(r, E, it.d); copies.push({ s: pos, e: seq.length }); }
    });
    seq += randDNA(r, 200);
    // the finder must not find reading frames in plain random sequence: break those with a stop codon
    var guard = 0, bad, gs = g.s, mk;
    do {
      mk = seq.split('');
      copies.forEach(function (c) { for (var p = c.s; p < c.e; p++) mk[p] = 'N'; });
      bad = orfs(mk.join(''), MINC).filter(function (o) { return !overlaps(o, [g]) || (o.s < gs && o.s + 3 < gs - 3); });
      bad.forEach(function (o) { seq = seq.slice(0, o.s + 3) + 'TAA' + seq.slice(o.s + 6); });
      guard++;
    } while (bad.length && guard < 30);
    return { seq: seq, copies: copies, gene: g };
  }
  function drawOrf() {
    var box = $('b-orf');
    box.textContent = '';
    [2, 6, 15].forEach(function (nc, q) {
      var G = makeGenome(nc, 100 + q), L = G.seq.length, X = 620 / L;
      var masked = G.seq.split(''), c, p;
      G.copies.forEach(function (c) { for (p = c.s; p < c.e; p++) masked[p] = 'N'; });
      var maskedSeq = masked.join('');
      var un = orfs(G.seq, MINC), ma = orfs(maskedSeq, MINC);
      un.forEach(function (o) { o.kind = overlaps(o, [G.gene]) ? 'g' : 'c'; });
      ma.forEach(function (o) { o.kind = overlaps(o, [G.gene]) ? 'g' : 'c'; });
      var uc = un.filter(function (o) { return o.kind === 'c'; }).length, mc = ma.filter(function (o) { return o.kind === 'c'; }).length;
      var ug = Math.min(1, un.length - uc), mg = Math.min(1, ma.length - mc);
      para('b-lab', box, '<b>' + nc + ' copies of the repeat</b> in ' + (L / 1000).toFixed(1) + ' kb: ' + uc + ' look like a gene');
      var rows = [['Genome', 0], ['Genes found, repeats not marked', 1], ['Genes found, repeats marked', 2]];
      rows.forEach(function (rw) {
        para('b-rl', box, rw[0]);
        var d = div('svgbox', box), svg = svgIn(d, 640, 16, rw[0]);
        el('rect', { x: 10, y: 6, width: 620, height: 4, style: 'fill:var(--err);opacity:.45' }, svg);
        if (rw[1] === 0) {
          G.copies.forEach(function (c) { el('rect', { x: 10 + c.s * X, y: 1, width: Math.max(1.5, (c.e - c.s) * X), height: 14, style: 'fill:var(--rep)' }, svg); });
          el('rect', { x: 10 + G.gene.s * X, y: 1, width: Math.max(1.5, (G.gene.e - G.gene.s) * X), height: 14, style: 'fill:var(--good)' }, svg);
        } else {
          if (rw[1] === 2) G.copies.forEach(function (c) { el('rect', { x: 10 + c.s * X, y: 1, width: Math.max(1.5, (c.e - c.s) * X), height: 14, style: 'fill:var(--rep);opacity:.25' }, svg); });
          (rw[1] === 1 ? un : ma).forEach(function (o) { el('rect', { x: 10 + o.s * X, y: 1, width: Math.max(1.5, (o.e - o.s) * X), height: 14, style: 'fill:' + (o.kind === 'g' ? 'var(--good)' : 'var(--bad)') }, svg); });
        }
      });
      para('b-sm', box, 'Not marked: <b>' + (ug + uc) + '</b> candidates (' + uc + ' repeat copies). Marked first: <b>' + (mg + mc) + '</b> (' + mc + ' repeat copies).');
    });
  }
  drawOrf();

  // ---------- 3. Gene structure ----------
  var gseed = 5;
  function makeGene(seed) {
    var r = rng(seed), ex = [], intr = [], i;
    ex.push(randDNA(r, 20) + 'ATG' + codons(r, 12));
    ex.push(codons(r, 20));
    ex.push(codons(r, 16));
    ex.push(codons(r, 14) + 'TAA' + randDNA(r, 25));
    for (i = 0; i < 3; i++) intr.push('GT' + randDNA(r, 140 + Math.floor(r() * 100)) + 'AG');
    var dna = randDNA(r, 40), exons = [], introns = [];
    for (i = 0; i < 4; i++) {
      exons.push({ s: dna.length, e: dna.length + ex[i].length });
      dna += ex[i];
      if (i < 3) { introns.push({ s: dna.length, e: dna.length + intr[i].length }); dna += intr[i]; }
    }
    dna += randDNA(r, 40);
    return { dna: dna, exons: exons, introns: introns };
  }
  function splice(G, skip) {
    var m = '', map = [], i, p;
    G.exons.forEach(function (e, k) {
      if (k === skip) return;
      for (p = e.s; p < e.e; p++) { m += G.dna.charAt(p); map.push(p); }
    });
    return { seq: m, map: map };
  }
  function longestOrf(seq) {
    var o = orfs(seq, 1), best = null;
    o.forEach(function (x) { if (!best || x.c > best.c) best = x; });
    return best;
  }
  function drawGene() {
    var G = makeGene(gseed), box = $('b-gene'), L = G.dna.length, X = 620 / L;
    box.textContent = '';
    var rowsDef = [{ n: 'DNA of the gene region', skip: -2 }, { n: 'mRNA, all four exons', skip: -1 }, { n: 'mRNA, exon 3 skipped (another isoform)', skip: 2 }];
    var out = [];
    rowsDef.forEach(function (rd) {
      para('b-rl', box, rd.n);
      var d = div('svgbox', box), svg = svgIn(d, 640, 26, rd.n), best, x0;
      if (rd.skip === -2) {
        el('rect', { x: 10, y: 11, width: 620, height: 4, style: 'fill:var(--err);opacity:.45' }, svg);
        G.exons.forEach(function (e) { el('rect', { x: 10 + e.s * X, y: 4, width: (e.e - e.s) * X, height: 18, style: 'fill:var(--err);opacity:.8' }, svg); });
        best = longestOrf(G.dna);
        if (best) el('rect', { x: 10 + best.s * X, y: 24, width: Math.max(1.5, (best.e - best.s) * X), height: 2, style: 'fill:var(--bad)' }, svg);
        out.push({ best: best, kind: 'dna' });
      } else {
        var sp = splice(G, rd.skip), pos = 0;
        best = longestOrf(sp.seq);
        var cs = best ? best.s : -1, ce = best ? best.e : -1, ex = 0;
        G.exons.forEach(function (e, k) {
          if (k === rd.skip) return;
          var len = e.e - e.s, a = Math.max(pos, cs), b = Math.min(pos + len, ce);
          el('rect', { x: 10 + pos * X, y: 9, width: len * X, height: 8, style: 'fill:var(--err);opacity:.8' }, svg);
          if (best && b > a) el('rect', { x: 10 + a * X, y: 4, width: (b - a) * X, height: 18, style: 'fill:var(--accent)' }, svg);
          pos += len;
        });
        out.push({ best: best, kind: 'rna', len: sp.seq.length });
      }
    });
    var si = G.introns.map(function (n) { return G.dna.substr(n.s, 2) + '…' + G.dna.substr(n.e - 2, 2); });
    var a = out[0].best, b = out[1].best, c = out[2].best;
    var st = G.exons[0].s + 20, k = 0;
    while (st + 3 * k + 3 <= L && !isStop(G.dna.substr(st + 3 * k, 3))) k++;
    para('b-sm', box, 'Protein length from unspliced DNA: <b>' + k + '</b>. From the spliced mRNA: <b>' + (b ? b.c : 0) + '</b>' + (c ? ', without exon 3: <b>' + c.c + '</b>' : '') + '.');
    $('b-gene').setAttribute('data-ok', '1');
  }
  $('b-gnew').addEventListener('click', function () { gseed++; drawGene(); });
  drawGene();

  // ---------- 4. RNA reads ----------
  var RLEN = 40, MINS = 2, rseed = 11;
  function makeGenes() {
    var r = rng(77), seq = '', genes = [], lens = [[70, 60, 80], [65, 75, 70]];
    lens.forEach(function (L, gi) {
      var ex = [], intr = [], k, g = { exons: [], introns: [] };
      seq += randDNA(r, 100);
      for (k = 0; k < 3; k++) {
        g.exons.push({ s: seq.length, e: seq.length + L[k] });
        seq += randDNA(r, L[k]);
        if (k < 2) { var n = 'GT' + randDNA(r, 130 + Math.floor(r() * 70)) + 'AG'; g.introns.push({ s: seq.length, e: seq.length + n.length }); seq += n; }
      }
      g.mrna = g.exons.map(function (e) { return seq.slice(e.s, e.e); }).join('');
      genes.push(g);
    });
    seq += randDNA(r, 100);
    return { seq: seq, genes: genes };
  }
  var GN = makeGenes();
  function uniqueIdx(G, s, from) { var p = G.indexOf(s, from || 0); return p; }
  function alignRead(G, read) {
    var n = read.length, p = G.indexOf(read), i, c = [], q, pre, suf, best;
    if (p >= 0) return { parts: [[p, p + n]], split: false };
    for (i = 10; i <= n - 10; i++) {
      pre = read.slice(0, i); suf = read.slice(i);
      p = G.indexOf(pre);
      if (p < 0 || G.indexOf(pre, p + 1) >= 0) continue;
      q = G.indexOf(suf, p + i);
      if (q >= 0) c.push({ i: i, p: p, q: q });
    }
    if (c.length) {
      best = c[0];
      c.forEach(function (x) { if (G.substr(x.p + x.i, 2) === 'GT' && G.substr(x.q - 2, 2) === 'AG') best = x; });
      return { parts: [[best.p, best.p + best.i], [best.q, best.q + n - best.i]], split: true, junc: [best.p + best.i, best.q] };
    }
    for (i = n - 1; i >= 10; i--) { pre = read.slice(0, i); p = G.indexOf(pre); if (p >= 0 && G.indexOf(pre, p + 1) < 0) return { parts: [[p, p + i]], split: false }; }
    for (i = 1; i <= n - 10; i++) { suf = read.slice(i); p = G.indexOf(suf); if (p >= 0 && G.indexOf(suf, p + 1) < 0) return { parts: [[p, p + n - i]], split: false }; }
    return null;
  }
  function simulateReads(n, seed) {
    var r = rng(seed), reads = [], k, gi, g, st;
    for (k = 0; k < n; k++) {
      gi = r() < 0.9 ? 0 : 1; g = GN.genes[gi];
      st = Math.floor(r() * (g.mrna.length - RLEN + 1));
      reads.push({ gene: gi, seq: g.mrna.substr(st, RLEN) });
    }
    return reads;
  }
  function drawRna() {
    var box = $('b-rna'), G = GN.seq, L = G.length, X = 620 / L, depths = [8, 40, 200], panels = [], maxd = 0;
    box.textContent = '';
    depths.forEach(function (n, q) {
      var reads = simulateReads(n, rseed * 10 + q), dep = [], junc = {}, p, nsp = 0, own = [0, 0];
      for (p = 0; p < L; p++) dep.push(0);
      reads.forEach(function (rd) {
        var a = alignRead(G, rd.seq);
        if (!a) return;
        own[rd.gene]++;
        a.parts.forEach(function (pt) { for (p = pt[0]; p < pt[1]; p++) dep[p]++; });
        if (a.split) { nsp++; var key = a.junc[0] + '-' + a.junc[1]; junc[key] = (junc[key] || 0) + 1; }
      });
      dep.forEach(function (d) { if (d > maxd) maxd = d; });
      panels.push({ n: n, dep: dep, junc: junc, nsp: nsp, own: own });
    });
    panels.forEach(function (P) {
      var sup = [0, 0], any = [0, 0], d, svg, H = 24 + 44 + 14;
      GN.genes.forEach(function (g, gi) {
        g.introns.forEach(function (it) {
          var c = P.junc[it.s + '-' + it.e] || 0;
          if (c >= MINS) sup[gi]++;
          if (c >= 1) any[gi]++;
        });
      });
      para('b-lab', box, '<b>' + P.n + ' reads</b> · gene 1: ' + P.own[0] + ' reads, introns shown ' + sup[0] + ' of 2 · gene 2: ' + P.own[1] + ', shown ' + sup[1] + ' of 2');
      d = div('svgbox', box);
      svg = svgIn(d, 640, H, P.n + ' reads: coverage, split reads and the exons of two genes');
      var base = 24 + 44, X1 = X, p, pts = '';
      for (p = 0; p < L; p++) {
        if (P.dep[p]) el('rect', { x: 10 + p * X1, y: base - P.dep[p] / maxd * 44, width: Math.max(0.6, X1), height: P.dep[p] / maxd * 44, style: 'fill:var(--accent)' }, svg);
      }
      el('line', { x1: 10, x2: 630, y1: base + 0.5, y2: base + 0.5, style: 'stroke:var(--line)' }, svg);
      GN.genes.forEach(function (g) {
        g.exons.forEach(function (e) { el('rect', { x: 10 + e.s * X, y: base + 4, width: (e.e - e.s) * X, height: 9, style: 'fill:var(--err)' }, svg); });
      });
      Object.keys(P.junc).forEach(function (k) {
        var a = k.split('-'), x1 = 10 + (+a[0]) * X, x2 = 10 + (+a[1]) * X, c = P.junc[k];
        el('path', { d: 'M' + x1 + ' 24 Q' + (x1 + x2) / 2 + ' ' + (-8) + ' ' + x2 + ' 24', style: 'fill:none;stroke-width:' + Math.min(4, 1 + c / 6) + ';stroke:' + (c >= MINS ? 'var(--good)' : 'var(--het)') }, svg);
      });
    });
  }
  $('b-rnew').addEventListener('click', function () { rseed++; drawRna(); });
  drawRna();

  // ---------- 5 and 6. Runs of homozygosity ----------
  var NW = 100 / 0.05, WKB = 50, THR = 0.3, MINRUN = 1000 / WKB, HET = 2.0, FALSE_HET = 0.05;
  function gauss(r) { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); }
  function poisson(r, lam) {
    if (lam >= 30) return Math.max(0, Math.round(lam + Math.sqrt(lam) * gauss(r)));
    var Lm = Math.exp(-lam), k = 0, p = 1;
    do { k++; p *= r(); } while (p > Lm);
    return k - 1;
  }
  function expo(r, mean) { return -mean * Math.log(1 - r()); }
  function segments(r, g, nseg, nold) {
    var s = [], i, len, st;
    for (i = 0; i < nseg; i++) { len = Math.min(expo(r, 100 / (2 * g)), 99); st = r() * (100 - len); s.push({ s: st, e: st + len }); }
    for (i = 0; i < nold; i++) { len = expo(r, 100 / (2 * 500)); st = r() * (100 - len); s.push({ s: st, e: st + len }); }
    return s;
  }
  function hetWindows(r, segs) {
    var cov = [], i, het = [], w = WKB / 1000;
    for (i = 0; i < NW; i++) cov.push(0);
    segs.forEach(function (sg) {
      var a = Math.floor(sg.s / w), b = Math.min(NW - 1, Math.floor(sg.e / w)), k, o;
      for (k = a; k <= b; k++) { o = Math.min(sg.e, (k + 1) * w) - Math.max(sg.s, k * w); if (o > 0) cov[k] += o / w; }
    });
    for (i = 0; i < NW; i++) { var f = Math.min(1, cov[i]); het.push(poisson(r, (HET * (1 - f) + FALSE_HET * f) * WKB)); }
    return het;
  }
  // mode 'callable': het per callable kb, windows with under half callable are unknown; 'length': het per window length
  function callRuns(het, callable, mode) {
    var runs = [], cur = null, i, isR, kb, total = 0, callN = 0;
    for (i = 0; i < NW; i++) {
      if (mode === 'callable' && callable[i] < WKB / 2) { cur = null; continue; }
      callN++;
      kb = mode === 'callable' ? callable[i] : WKB;
      isR = het[i] / kb * 1 < THR;
      if (isR) { if (cur) cur.e = i + 1; else { cur = { s: i, e: i + 1 }; runs.push(cur); } } else cur = null;
    }
    runs = runs.filter(function (x) { return x.e - x.s >= MINRUN; });
    runs.forEach(function (x) { total += x.e - x.s; });
    return { runs: runs, f: total / callN, longest: runs.reduce(function (m, x) { return Math.max(m, (x.e - x.s) * WKB / 1000); }, 0) };
  }
  function strip(parent, caption, het, segs, res, gaps, maxHet) {
    para('b-rl', parent, caption);
    var d = div('svgbox', parent), svg = svgIn(d, 640, 62, caption), X = 620 / NW, i;
    el('line', { x1: 10, x2: 630, y1: 40.5, y2: 40.5, style: 'stroke:var(--line)' }, svg);
    for (i = 0; i < NW; i++) {
      if (het[i] > 0) { var h = Math.min(1, het[i] / maxHet) * 38; el('rect', { x: 10 + i * X, y: 40 - h, width: X + 0.15, height: h, style: 'fill:var(--het)' }, svg); }
    }
    (gaps || []).forEach(function (g) { el('rect', { x: 10 + g.s * X, y: 0, width: (g.e - g.s) * X, height: 40, style: 'fill:var(--err);opacity:.45' }, svg); });
    res.runs.forEach(function (x) { el('rect', { x: 10 + x.s * X, y: 44, width: (x.e - x.s) * X, height: 8, style: 'fill:var(--accent)' }, svg); });
    if (segs) segs.forEach(function (sg) { el('rect', { x: 10 + sg.s / 0.05 * X, y: 56, width: Math.max(0.8, (sg.e - sg.s) / 0.05 * X), height: 3, style: 'fill:var(--muted)' }, svg); });
  }
  function summ(res) {
    var n = res.runs.length;
    return 'runs of at least 1 Mb: <b>' + n + '</b> · longest: <b>' + (n ? res.longest.toFixed(1) + ' Mb' : 'none') + '</b> · F ROH: <b>' + (100 * res.f).toFixed(1) + ' %</b>';
  }
  var hseed = 3;
  function drawRoh() {
    var box = $('b-roh'), defs = [['Animal 1: no recent shared ancestor', 0], ['Animal 2: ancestor shared 25 generations back', 25], ['Animal 3: ancestor shared 5 generations back', 5]];
    box.textContent = '';
    defs.forEach(function (df, q) {
      var r = rng(hseed * 100 + q), segs = segments(r, df[1] || 1, df[1] ? 3 : 0, 40), het = hetWindows(r, segs), cal = [], i;
      for (i = 0; i < NW; i++) cal.push(WKB);
      var res = callRuns(het, cal, 'callable'), tr = segs.filter(function (s) { return s.e - s.s >= 1; });
      para('b-lab', box, '<b>' + df[0] + '</b>');
      strip(box, '', het, segs, res, null, 160);
      para('b-sm', box, summ(res));
    });
  }
  $('b-hnew').addEventListener('click', function () { hseed++; drawRoh(); });
  drawRoh();

  function drawGap() {
    var Lg = +$('b-gl').value, box = $('b-gap'), r = rng(909), segs = [{ s: 40, e: 48 }], k;
    for (k = 0; k < 40; k++) { var len = expo(r, 0.1), st = r() * (100 - len); segs.push({ s: st, e: st + len }); }
    var het = hetWindows(r, segs), cal = [], gaps = [], i, w = WKB / 1000;
    for (i = 0; i < NW; i++) cal.push(WKB);
    [15, 70].forEach(function (st) {
      var a = Math.round(st / w), b = Math.min(NW, a + Math.round(Lg / w));
      for (i = a; i < b; i++) { cal[i] = 0; het[i] = 0; }
      gaps.push({ s: a, e: b });
    });
    box.textContent = '';
    var A = callRuns(het, cal, 'length'), B = callRuns(het, cal, 'callable');
    strip(box, 'Gaps count as homozygous', het, segs, A, gaps, 160);
    para('b-sm', box, summ(A));
    strip(box, 'Gaps are unknown', het, segs, B, gaps, 160);
    para('b-sm', box, summ(B));
    $('b-gl-o').textContent = Lg.toFixed(2) + ' Mb';
  }
  $('b-gl').addEventListener('input', drawGap);
  drawGap();
})();
