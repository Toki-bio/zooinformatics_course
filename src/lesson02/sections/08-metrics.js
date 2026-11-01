(function () {
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function fmt(x, d) { return x.toLocaleString('en-US', { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d == null ? 0 : d }); }

  /* ---------- QV calculator (formula from Merqury eval/qv.sh) ---------- */
  function qvCalc() {
    var a = +$('s08-qa').value, t = +$('s08-qt').value, k = +$('s08-qk').value, out = $('s08-qout');
    if (!(t > 0) || !(a >= 0) || a > t || !(k >= 1)) { out.innerHTML = '<div><span class="warn-text">Need 0 ≤ asm-only ≤ all k-mers, and k ≥ 1.</span></div>'; return; }
    var pk = 1 - a / t, err = 1 - Math.pow(pk, 1 / k), qv = err > 0 ? -10 * Math.log10(err) : Infinity;
    out.innerHTML =
      '<div>k-mers correct<b>' + fmt(100 * pk, 3) + ' %</b></div>' +
      '<div>error rate per base E<b>' + (err > 0 ? err.toPrecision(4) : '0') + '</b></div>' +
      '<div>QV = −10·log<sub>10</sub>E<b>' + (isFinite(qv) ? fmt(qv, 2) : '∞ (no asm-only k-mers)') + '</b></div>' +
      '<div>about 1 error per<b>' + (err > 0 ? fmt(1 / err) + ' bases' : '—') + '</b></div>';
  }
  ['s08-qa', 's08-qt', 's08-qk'].forEach(function (id) { var e = $(id); if (e) e.addEventListener('input', qvCalc); });
  if ($('s08-qout')) qvCalc();

  /* ---------- toy spectra-cn ---------- */
  var svg = $('s08-svg'); if (!svg) return;
  var C = 13, XMAX = 72, K = 21;
  var COLS = [ // Merqury order: read-only grey, 1 red, 2 blue, 3 green, 4 purple, >4 orange
    { lab: 'read-only (0)', v: '--err' }, { lab: '1 copy', v: '--bad' }, { lab: '2 copies', v: '--accent' },
    { lab: '3', v: '--good' }, { lab: '4', v: '--rep' }, { lab: '>4', v: '--het' }];
  var mode = 'p';
  var S = { het: 45, mh: 0, fd: 0, cr: 0, mr: 0, qv: 45 };
  var ids = ['het', 'mh', 'fd', 'cr', 'mr', 'qv'];

  $('s08-leg').innerHTML = COLS.map(function (c) { return '<span><i style="background:var(' + c.v + ');height:10px;opacity:.75"></i>' + c.lab + '</span>'; }).join('') +
    '<span><i style="background:var(--fg);width:4px;height:10px"></i>asm-only bar (errors)</span>';

  function shape(mu, x) { // overdispersed bell, var = 2*mu
    var v = 2 * mu; return Math.exp(-(x - mu) * (x - mu) / (2 * v)) / Math.sqrt(2 * Math.PI * v);
  }
  function bin(c) { return c >= 5 ? 5 : c; }

  // a "piece" = {mu, n (distinct k-mers, millions), dist: [[copies, weight], ...]}
  function model() {
    var dip = mode === 'd';
    var het = 6 * S.het; // total distinct het k-mers (both alleles), millions
    var mr = S.mr / 100, mh = dip ? S.mh / 100 : 0, fd = S.fd / 100, cr = S.cr / 100;
    // ideal copies in this assembly type
    var pieces = [
      { key: 'hetA', mu: C, n: het / 2, base: 1 },
      { key: 'hetB', mu: C, n: het / 2, base: dip ? 1 : 0 },
      { key: 'hom', mu: 2 * C, n: 700, base: dip ? 2 : 1 },
      { key: 'rep', mu: 4 * C, n: 70, base: dip ? 4 : 2 }
    ];
    pieces.forEach(function (p) {
      var d = [[p.base, 1]];
      function apply(frac, f) {
        if (frac <= 0) return;
        var nd = [];
        d.forEach(function (e) { nd.push([e[0], e[1] * (1 - frac)]); nd.push([f(e[0]), e[1] * frac]); });
        d = nd;
      }
      // whole region missing: both copies gone
      apply(mr, function () { return 0; });
      // one haplotype missing (diploid only): hap-B alleles gone, shared k-mers halved
      apply(mh, function (c) { return p.key === 'hetB' ? 0 : (p.key === 'hetA' ? c : Math.floor(c / 2)); });
      // false duplication: region present twice; in a primary the retained haplotig brings the other allele
      apply(fd, function (c) { if (!dip && p.key === 'hetB') return 1; if (!dip && p.key === 'hetA') return c; return c * 2; });
      // collapsed repeats
      if (p.key === 'rep') apply(cr, function (c) { return Math.max(c > 0 ? 1 : 0, Math.floor(c / 2)); });
      p.dist = d;
    });
    return pieces;
  }

  function compute() {
    var pieces = model();
    var xs = []; for (var x = 1; x <= XMAX; x++) xs.push(x);
    var curves = COLS.map(function () { return xs.map(function () { return 0; }); });
    var errN = 9000; // error k-mers, millions, mostly at 1-3x
    xs.forEach(function (x, i) { curves[0][i] += errN * Math.exp(-(x - 1) / 1.1) * 0.35; });
    var solid = 0, found = 0, asmK = 0, ideal = 0;
    pieces.forEach(function (p) {
      p.dist.forEach(function (e) {
        var b = bin(e[0]), n = p.n * e[1];
        xs.forEach(function (x, i) { curves[b][i] += n * shape(p.mu, x); });
        solid += n; if (e[0] > 0) found += n; asmK += n * e[0];
      });
      var idealCopies = mode === 'd' ? { hetA: 1, hetB: 1, hom: 2, rep: 4 }[p.key] : { hetA: 1, hetB: 0, hom: 1, rep: 2 }[p.key];
      ideal += p.n * idealCopies;
    });
    // asm-only k-mers from QV: fraction of k-mers with an error = 1-(1-E)^k
    var E = Math.pow(10, -S.qv / 10), asmOnly = asmK * (1 - Math.pow(1 - E, K));
    // Merqury false_duplications.sh: cutoff = 1.5 x position of the max of the 1-copy curve
    var mx = 0, mpos = 1;
    curves[1].forEach(function (v, i) { if (xs[i] > 3 && v > mx) { mx = v; mpos = xs[i]; } });
    var cut = Math.round(mpos * 1.5), one = 0, dup = 0;
    xs.forEach(function (x, i) { if (x < cut) { one += curves[1][i]; for (var b = 2; b <= 5; b++) dup += curves[b][i]; } });
    return { xs: xs, curves: curves, completeness: 100 * found / solid, asmOnly: asmOnly, asmK: asmK, E: E,
      dupPct: (one + dup) > 0 ? 100 * dup / (one + dup) : 0, cut: cut, sizeRatio: asmK / ideal, pieces: pieces, onePeak: mpos };
  }

  function el(name, attrs, text) {
    var e = document.createElementNS(NS, name);
    for (var a in attrs) e.setAttribute(a, attrs[a]);
    if (text != null) e.textContent = text; return e;
  }

  function draw() {
    var r = compute();
    var W = 760, H = 330, L = 58, R = 16, T = 18, B = 46, pw = W - L - R, ph = H - T - B;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    // y max: genomic peaks, not the error wall
    var ymax = 0;
    r.curves.forEach(function (c) { c.forEach(function (v, i) { if (r.xs[i] >= 6 && v > ymax) ymax = v; }); });
    ymax *= 1.25; if (ymax <= 0) ymax = 1;
    var sx = function (x) { return L + (x / XMAX) * pw; };
    var sy = function (y) { return T + ph - Math.min(y, ymax) / ymax * ph; };
    // grid + axes
    [0.25, 0.5, 0.75, 1].forEach(function (f) { svg.appendChild(el('line', { x1: L, x2: W - R, y1: sy(ymax * f), y2: sy(ymax * f), class: 'grid' })); });
    svg.appendChild(el('line', { x1: L, x2: W - R, y1: T + ph, y2: T + ph, class: 'ax' }));
    svg.appendChild(el('line', { x1: L, x2: L, y1: T, y2: T + ph, class: 'ax' }));
    for (var t = 0; t <= XMAX; t += 10) {
      svg.appendChild(el('line', { x1: sx(t), x2: sx(t), y1: T + ph, y2: T + ph + 4, class: 'ax' }));
      svg.appendChild(el('text', { x: sx(t), y: T + ph + 16, 'text-anchor': 'middle' }, String(t)));
    }
    svg.appendChild(el('text', { x: L + pw / 2, y: H - 8, 'text-anchor': 'middle', class: 'lab' }, 'k-mer multiplicity: times the k-mer occurs in the reads'));
    var yl = el('text', { x: 14, y: T + ph / 2, 'text-anchor': 'middle', class: 'lab', transform: 'rotate(-90 14 ' + (T + ph / 2) + ')' }, 'number of distinct k-mers');
    svg.appendChild(yl);
    // peak markers
    [[C, 'c  het'], [2 * C, '2c  hom'], [4 * C, '4c  repeat']].forEach(function (m) {
      svg.appendChild(el('line', { x1: sx(m[0]), x2: sx(m[0]), y1: T, y2: T + ph, stroke: 'var(--line)', 'stroke-dasharray': '3 3' }));
      svg.appendChild(el('text', { x: sx(m[0]) + 4, y: T + 11 }, m[1]));
    });
    // filled curves, unstacked (Merqury .fl style)
    r.curves.forEach(function (c, b) {
      var any = c.some(function (v) { return v > ymax * 0.004; });
      if (!any) return;
      var d = 'M' + sx(r.xs[0]) + ',' + sy(0);
      c.forEach(function (v, i) { d += 'L' + sx(r.xs[i]).toFixed(1) + ',' + sy(v).toFixed(1); });
      d += 'L' + sx(r.xs[r.xs.length - 1]) + ',' + sy(0) + 'Z';
      svg.appendChild(el('path', { d: d, fill: 'var(' + COLS[b].v + ')', 'fill-opacity': b === 0 ? 0.28 : 0.32, stroke: 'var(' + COLS[b].v + ')', 'stroke-width': 1.8 }));
    });
    // asm-only bar at x=0: height relative to total asm k-mers (log-ish so it stays visible)
    var frac = r.asmOnly / r.asmK; // 0..1
    var hb = Math.max(2, Math.min(ph, ph * Math.max(0, (Math.log10(frac) + 4.5) / 3.5)));
    svg.appendChild(el('rect', { x: sx(0) - 1, y: T + ph - hb, width: 6, height: hb, fill: 'var(--fg)', opacity: 0.8 }));
    svg.appendChild(el('text', { x: sx(0) + 9, y: Math.max(T + 24, T + ph - hb + 10), class: 'lab' }, 'asm-only'));
    // error wall note
    svg.appendChild(el('text', { x: sx(2.5) + 6, y: T + 46 }, '↑ read errors'));
    // false-dup cutoff
    if (mode === 'p') {
      svg.appendChild(el('line', { x1: sx(r.cut), x2: sx(r.cut), y1: T + ph, y2: T + ph - 18, stroke: 'var(--muted)', 'stroke-width': 1.5 }));
      svg.appendChild(el('text', { x: sx(r.cut), y: T + ph - 22, 'text-anchor': 'middle' }, 'dup cutoff'));
    }

    // readout
    var qvTrue = -10 * Math.log10(1 - Math.pow(1 - r.asmOnly / r.asmK, 1 / K));
    $('s08-sout').innerHTML =
      '<div>k-mer completeness<b>' + fmt(r.completeness, 1) + ' %</b></div>' +
      '<div>QV (from the asm-only bar)<b>' + fmt(qvTrue, 1) + '</b></div>' +
      (mode === 'p' ? '<div>false-duplication k-mers<b>' + fmt(r.dupPct, 1) + ' %</b></div>' : '<div>false-duplication k-mers<b>n/a</b><span style="font-size:12px;color:var(--muted)">the Merqury script is meant for one pseudohaploid file; here hom k-mers should be present twice</span></div>') +
      '<div>assembly size vs a perfect ' + (mode === 'd' ? 'two-haplotype' : 'primary') + ' assembly<b>' + fmt(100 * r.sizeRatio, 0) + ' %</b></div>';
    explain(r);
  }

  function explain(r) {
    var dip = mode === 'd', L = [];
    if (!dip) L.push(S.het > 5 ? 'Grey under the het peak (c): the second allele of each heterozygous site. <b>Expected</b> in a primary assembly, so completeness cannot reach 100 %.' : 'Almost no heterozygosity: a primary assembly can now be nearly 100 % complete.');
    if (dip && S.mh > 0) L.push('<b>One haplotype missing:</b> grey appears under the het peak (alleles of the lost haplotype) and red under the hom peak (shared sequence now present once instead of twice).');
    if (S.fd > 0) L.push(dip ? '<b>False duplication:</b> het k-mers turn blue (twice instead of once) and hom k-mers move to 4 copies (purple).' : '<b>False duplication:</b> blue appears under the hom peak at 2c (sequence present twice), and grey under the het peak shrinks because the extra copy is the other parental allele: a retained haplotig. purge_dups would remove it.');
    if (S.cr > 0) L.push('<b>Collapsed repeats:</b> the peak at 4c turns ' + (dip ? 'from purple to blue' : 'from blue to red') + ': the reads say two copies per haplotype, the assembly holds one. The size shrinks a little.');
    if (S.mr > 0) L.push('<b>Missing region:</b> grey appears under every peak, including the hom peak at 2c, which is never normal. Completeness falls, but QV does not change.');
    if (S.qv < 35) L.push('<b>Low QV:</b> the asm-only bar at x = 0 grows. These are assembly k-mers with an error, absent from the reads. Polishing should shrink it.');
    if (L.length === 1 && !dip && S.mh === 0 && S.fd === 0 && S.cr === 0 && S.mr === 0 && S.qv >= 35) L.push('No faults set: hom peak red (once), repeat peak blue (twice). Move a slider.');
    if (dip && S.mh === 0 && S.fd === 0 && S.cr === 0 && S.mr === 0 && S.qv >= 35) L.push('No faults set: each allele once (red at c), shared sequence twice (blue at 2c), repeats four times (purple at 4c). Move a slider.');
    $('s08-explain').innerHTML = '<ul style="margin:0">' + L.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>';
  }

  function sync() {
    ids.forEach(function (k) { $('s08-' + k).value = S[k]; $('s08-' + k + 'o').textContent = S[k]; });
    var mh = $('s08-mh'); mh.disabled = mode !== 'd';
    mh.parentNode.style.opacity = mode === 'd' ? 1 : 0.45;
    $('s08-mode-p').setAttribute('aria-pressed', mode === 'p');
    $('s08-mode-d').setAttribute('aria-pressed', mode === 'd');
    draw();
  }
  ids.forEach(function (k) { $('s08-' + k).addEventListener('input', function (e) { S[k] = +e.target.value; sync(); }); });
  $('s08-mode-p').addEventListener('click', function () { mode = 'p'; S.mh = 0; sync(); });
  $('s08-mode-d').addEventListener('click', function () { mode = 'd'; sync(); });
  $('s08-reset').addEventListener('click', function () { S.mh = 0; S.fd = 0; S.cr = 0; S.mr = 0; S.qv = 45; sync(); });
  sync();
})();
