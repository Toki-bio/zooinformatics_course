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
    box.textContent = '';
    return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'img', 'aria-label': label, style: 'display:block' }, box);
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
  function dot(svg, x, y, r, filled, color) {
    return el('circle', { cx: x, cy: y, r: r, style: filled ? 'fill:' + color : 'fill:var(--bg);stroke:var(--muted);stroke-width:1.2' }, svg);
  }
  function txt(svg, x, y, s, cls, anchor) {
    return el('text', { x: x, y: y, 'class': cls || 'b-t', 'text-anchor': anchor || 'start' }, svg, s);
  }
  var MCOL = 'var(--rep)';

  // 1. Sequence with CpG sites that can be marked
  var TOP = 'TTACGTAGCCGATTCGATAC', COMP = { A: 'T', C: 'G', G: 'C', T: 'A' }, SITES = [], on = [], i;
  for (i = 0; i < TOP.length - 1; i++) if (TOP.substr(i, 2) === 'CG') { SITES.push(i); on.push(i === SITES[0]); }
  function drawDna() {
    var CW = 28, X0 = 40, svg = svgIn($('b-dna'), 640, 150, 'Two DNA strands with CpG sites; click to add a methyl group');
    txt(svg, 4, 54, "5′", 'b-ts'); txt(svg, 4, 94, "3′", 'b-ts');
    txt(svg, X0 + TOP.length * CW + 4, 54, "3′", 'b-ts'); txt(svg, X0 + TOP.length * CW + 4, 94, "5′", 'b-ts');
    TOP.split('').forEach(function (c, p) {
      txt(svg, X0 + p * CW + CW / 2, 56, c, 'b-t', 'middle').setAttribute('style', 'font-size:18px;font-weight:600');
    });
    TOP.split('').forEach(function (c, p) {
      txt(svg, X0 + p * CW + CW / 2, 96, COMP[c], 'b-t', 'middle').setAttribute('style', 'font-size:18px;font-weight:600');
    });
    SITES.forEach(function (s, k) {
      var g = el('g', { 'class': 'b-site', tabindex: 0, role: 'button', 'aria-pressed': on[k] ? 'true' : 'false', 'aria-label': 'CpG ' + (k + 1) + (on[k] ? ' methylated' : ' not methylated') }, svg);
      var x1 = X0 + s * CW, x2 = X0 + (s + 1) * CW;
      el('rect', { 'class': 'b-hit', x: x1 + 1, y: 36, width: 2 * CW - 2, height: 72, rx: 6, style: 'fill:var(--code-bg);opacity:.55;stroke:none' }, g);
      txt(g, x1 + CW / 2, 56, 'C', 'b-t', 'middle').setAttribute('style', 'font-size:18px;font-weight:700');
      txt(g, x2 + CW / 2, 56, 'G', 'b-t', 'middle').setAttribute('style', 'font-size:18px;font-weight:700');
      txt(g, x1 + CW / 2, 96, 'G', 'b-t', 'middle').setAttribute('style', 'font-size:18px;font-weight:700');
      txt(g, x2 + CW / 2, 96, 'C', 'b-t', 'middle').setAttribute('style', 'font-size:18px;font-weight:700');
      if (on[k]) {
        el('circle', { cx: x1 + CW / 2, cy: 26, r: 9, style: 'fill:' + MCOL }, g);
        txt(g, x1 + CW / 2, 30, 'm', 'b-t', 'middle').setAttribute('style', 'font-size:12px;font-weight:700;fill:var(--bg)');
        el('circle', { cx: x2 + CW / 2, cy: 124, r: 9, style: 'fill:' + MCOL }, g);
        txt(g, x2 + CW / 2, 128, 'm', 'b-t', 'middle').setAttribute('style', 'font-size:12px;font-weight:700;fill:var(--bg)');
      } else {
        el('circle', { cx: x1 + CW / 2, cy: 26, r: 9, style: 'fill:none;stroke:var(--muted);stroke-dasharray:3 3' }, g);
        el('circle', { cx: x2 + CW / 2, cy: 124, r: 9, style: 'fill:none;stroke:var(--muted);stroke-dasharray:3 3' }, g);
      }
      function toggle() { on[k] = !on[k]; drawDna(); var f = $('b-dna').querySelectorAll('.b-site')[k]; if (f) f.focus(); }
      g.addEventListener('click', toggle);
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
    $('b-letters').textContent = TOP;
    $('b-nm').textContent = on.filter(Boolean).length + ' of ' + SITES.length;
  }
  drawDna();

  // 2. Stack of reads at three CpGs
  var TRUE2 = [0.2, 0.6, 0.9], N2 = 10, seed2 = 11;
  function drawStack() {
    var r = rng(seed2 * 97), RH = 20, X0 = [150, 320, 490], H = 28 + N2 * RH + 62, svg = svgIn($('b-stack'), 640, H, 'Reads stacked over three CpG sites');
    var counts = [0, 0, 0], j, k;
    for (k = 0; k < 3; k++) txt(svg, X0[k], 16, 'CpG ' + (k + 1), 'b-t', 'middle');
    for (j = 0; j < N2; j++) {
      txt(svg, 60, 38 + j * RH + 4, 'read ' + (j + 1), 'b-ts', 'middle');
      for (k = 0; k < 3; k++) {
        var m = r() < TRUE2[k];
        if (m) counts[k]++;
        dot(svg, X0[k], 38 + j * RH, 7, m, MCOL);
      }
    }
    var y = 28 + N2 * RH + 8;
    for (k = 0; k < 3; k++) {
      var pc = 100 * counts[k] / N2;
      el('rect', { x: X0[k] - 60, y: y, width: 120, height: 10, style: 'fill:var(--code-bg)' }, svg);
      el('rect', { x: X0[k] - 60, y: y, width: 1.2 * pc, height: 10, style: 'fill:' + MCOL }, svg);
      txt(svg, X0[k], y + 30, counts[k] + ' of ' + N2 + ' = ' + pc.toFixed(0) + ' %', 'b-t', 'middle');
    }
  }
  $('b-stack-new').addEventListener('click', function () { seed2++; drawStack(); });
  drawStack();

  // 3. Precision against number of reads
  var seed3 = 3, TRUE3 = 0.6, NMEAS = 40;
  function drawPrec() {
    var box = $('b-prec'), r = rng(seed3 * 131);
    box.textContent = '';
    [4, 10, 40, 160].forEach(function (n, q) {
      var vals = [], k, j, c, bins = {}, maxb = 0, lo = 101, hi = -1;
      for (k = 0; k < NMEAS; k++) {
        c = 0;
        for (j = 0; j < n; j++) if (r() < TRUE3) c++;
        var v = 100 * c / n; vals.push(v);
        if (v < lo) lo = v; if (v > hi) hi = v;
        var b = Math.round(v / 2.5); bins[b] = (bins[b] || 0) + 1; if (bins[b] > maxb) maxb = bins[b];
      }
      var lab = document.createElement('p');
      lab.className = 'b-lab';
      lab.innerHTML = '<b>' + n + ' reads</b>: the ' + NMEAS + ' measurements gave levels from ' + lo.toFixed(0) + ' % to ' + hi.toFixed(0) + ' %';
      box.appendChild(lab);
      var div = document.createElement('div'); div.className = 'svgbox'; box.appendChild(div);
      var H = Math.max(40, 14 + maxb * 7 + 22), svg = svgIn(div, 640, H, n + ' reads per measurement: levels found in repeated measurements'), X = function (v) { return 20 + v * 6; };
      el('line', { x1: 20, x2: 620, y1: H - 22, y2: H - 22, style: 'stroke:var(--line)' }, svg);
      [0, 25, 50, 75, 100].forEach(function (t) { txt(svg, X(t), H - 6, t + ' %', 'b-ts', 'middle'); el('line', { x1: X(t), x2: X(t), y1: H - 22, y2: H - 18, style: 'stroke:var(--muted)' }, svg); });
      el('line', { x1: X(60), x2: X(60), y1: 2, y2: H - 22, style: 'stroke:var(--good);stroke-dasharray:4 3;stroke-width:1.5' }, svg);
      var seen = {};
      vals.forEach(function (v) {
        var b = Math.round(v / 2.5); seen[b] = (seen[b] || 0) + 1;
        el('circle', { cx: X(v), cy: H - 22 - 4 - (seen[b] - 1) * 7, r: 3, style: 'fill:var(--accent);opacity:.85' }, svg);
      });
    });
  }
  $('b-prec-new').addEventListener('click', function () { seed3++; drawPrec(); });
  drawPrec();

  // 4. The same 20 reads at three pass thresholds
  var PR = [], rp = rng(404), z;
  for (z = 0; z < 20; z++) {
    var u = rp(), pr;
    if (z < 7) pr = 0.88 + 0.11 * u;
    else if (z < 13) pr = 0.01 + 0.1 * u;
    else pr = 0.3 + 0.4 * u;
    PR.push(Math.round(pr * 100) / 100);
  }
  function drawThr() {
    var box = $('b-thr');
    box.textContent = '';
    [{ t: 0.5, name: 'Count every read (methylated if the probability is above 0.5)' }, { t: 0.7, name: 'Pass threshold 0.7' }, { t: 0.9, name: 'Pass threshold 0.9' }].forEach(function (cfg) {
      var cnt = 0, mod = 0, lab = document.createElement('p'), div = document.createElement('div');
      var X = function (p) { return 20 + p * 600; };
      var order = PR.map(function (p, i2) { return i2; }).sort(function (a, b) { return PR[a] - PR[b]; });
      var svg;
      div.className = 'svgbox';
      svg = svgIn(div, 640, 76, 'Twenty reads placed by probability of methylation, pass threshold ' + cfg.t);
      el('rect', { x: X(1 - cfg.t), y: 4, width: X(cfg.t) - X(1 - cfg.t), height: 44, style: 'fill:var(--code-bg)' }, svg);
      el('line', { x1: 20, x2: 620, y1: 52, y2: 52, style: 'stroke:var(--line)' }, svg);
      [0, 0.5, 1].forEach(function (t) { txt(svg, X(t), 68, t.toFixed(1), 'b-ts', 'middle'); });
      order.forEach(function (idx, rank) {
        var p = PR[idx], conf = Math.max(p, 1 - p), pass = cfg.t === 0.5 ? true : conf >= cfg.t, m = p > 0.5, y = 12 + (rank % 4) * 9;
        if (pass) { cnt++; if (m) mod++; }
        if (pass) dot(svg, X(p), y, 3.6, m, MCOL);
        else el('circle', { cx: X(p), cy: y, r: 3.6, style: 'fill:var(--muted);opacity:.6' }, svg);
      });
      lab.className = 'b-lab';
      lab.innerHTML = '<b>' + cfg.name + '</b>: ' + cnt + ' of 20 reads counted, ' + mod + ' methylated = ' + (cnt ? (100 * mod / cnt).toFixed(0) : '-') + ' %';
      box.appendChild(lab); box.appendChild(div);
    });
  }
  drawThr();

  // 5. Two parental copies
  var seed5 = 5, NC = 13, NR = 20, ERR = 0.04;
  function mkRegion(kind, r) {
    var reads = [], k, c, hp, row, m;
    for (k = 0; k < NR; k++) {
      hp = k % 2; row = [];
      for (c = 0; c < NC; c++) {
        if (kind === 'imp') m = (hp === 0);
        else m = r() < 0.5;
        if (r() < ERR) m = !m;
        row.push(m);
      }
      reads.push({ hp: hp, m: row });
    }
    return reads;
  }
  function shuffle(a, r) { var i2, j, t; for (i2 = a.length - 1; i2 > 0; i2--) { j = Math.floor(r() * (i2 + 1)); t = a[i2]; a[i2] = a[j]; a[j] = t; } return a; }
  function level(reads) { var n = 0, m = 0; reads.forEach(function (rd) { rd.m.forEach(function (x) { n++; if (x) m++; }); }); return n ? 100 * m / n : 0; }
  function drawHap() {
    var box = $('b-hap'), r = rng(seed5 * 211);
    box.textContent = '';
    [{ kind: 'imp', title: 'Region where the copies differ' }, { kind: 'none', title: 'Region where they do not' }].forEach(function (cfg) {
      var reads = mkRegion(cfg.kind, r), pooled = shuffle(reads.slice(), r), c0 = reads.filter(function (d) { return d.hp === 0; }), c1 = reads.filter(function (d) { return d.hp === 1; });
      var wrap = document.createElement('div'), h = document.createElement('h3'), div = document.createElement('div');
      var RH = 9, XS = 14, XD = 40, DX = 21, top = 20, H = top + NR * RH + 22 + 20 + NR * RH + 12;
      h.textContent = cfg.title; wrap.appendChild(h); div.className = 'svgbox'; wrap.appendChild(div); box.appendChild(wrap);
      var svg = svgIn(div, 320, H, cfg.title + ': all reads together, then sorted by copy');
      function draw(list, y0) {
        list.forEach(function (rd, j) {
          var y = y0 + j * RH + RH / 2;
          txt(svg, XS, y + 3.5, rd.hp === 0 ? 'A' : 'G', 'b-ts', 'middle').setAttribute('style', 'font-size:10px;font-weight:700;fill:' + (rd.hp === 0 ? 'var(--accent)' : 'var(--het)'));
          rd.m.forEach(function (m, c) { dot(svg, XD + c * DX, y, 3.4, m, MCOL); });
        });
      }
      txt(svg, 4, 12, 'All reads together: ' + level(reads).toFixed(0) + ' %', 'b-t').setAttribute('style', 'font-size:12px;font-weight:700');
      draw(pooled, top);
      var y1 = top + NR * RH + 20;
      txt(svg, 4, y1 - 6, 'Sorted by SNP base: A ' + level(c0).toFixed(0) + ' %, G ' + level(c1).toFixed(0) + ' %', 'b-t').setAttribute('style', 'font-size:12px;font-weight:700');
      draw(c0.concat(c1), y1);
      el('line', { x1: 4, x2: 316, y1: y1 + c0.length * RH, y2: y1 + c0.length * RH, style: 'stroke:var(--accent);stroke-width:1' }, svg);
    });
  }
  $('b-hap-new').addEventListener('click', function () { seed5++; drawHap(); });
  drawHap();

  // 6. The same reads in three kinds of file
  var SEQS = ['GATCGTTACGAT', 'GATCGTTACGAT', 'GATCGTTACGAT', 'GATCGTTACGAT'], PROB = [[0.94, 0.08], [0.91, 0.12], [0.07, 0.15], [0.89, 0.93]];
  (function () {
    var box = $('b-files'), cpg = [], p;
    for (p = 0; p < SEQS[0].length - 1; p++) if (SEQS[0].substr(p, 2) === 'CG') cpg.push(p);
    function card(title, body, res, cls) {
      var d = document.createElement('div');
      d.className = 'b-card';
      d.innerHTML = '<h3>' + title + '</h3>' + body + '<p class="b-res ' + cls + '">' + res + '</p>';
      box.appendChild(d);
    }
    var fq = SEQS.map(function (s, k) { return 'read' + (k + 1) + '  ' + s; }).join('\n');
    var lev = cpg.map(function (pos, s) {
      var m = 0; PROB.forEach(function (pr) { if (pr[s] > 0.5) m++; });
      return 'CpG ' + (s + 1) + ': ' + m + ' of ' + PROB.length + ' = ' + (100 * m / PROB.length).toFixed(0) + ' %';
    }).join('; ');
    var bam = SEQS.map(function (s, k) { return 'read' + (k + 1) + '  ' + s + '  ' + PROB[k].map(function (x) { return x.toFixed(2); }).join('  '); }).join('\n');
    card('FASTQ: letters only', '<pre>' + fq + '</pre><p>The two CpGs read CG in every read, marked or not.</p>', 'Methylation level: cannot be computed', 'b-no');
    card('BAM with modification tags', '<pre>read    letters       CpG 1 CpG 2\n' + bam + '</pre>', lev, 'b-yes');
    card('Raw signal (pod5)', '<p>The current measured for every base of every read is kept. A program can call the probabilities now or later with a better model.</p>', 'Methylation level: can be computed', 'b-yes');
  })();
})();
