(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  var wrap = $('s08-wrap');
  if (!wrap) return;

  var KEYS = ['bg', 'bp', 'f', 'd', 'te', 'se', 'ser', 'gc'];
  var PRESETS = [
    { bg: 98, bp: 96, f: 1.5, d: 1.5, te: 1, se: 12, ser: 11, gc: 103 },   // careful annotation
    { bg: 98, bp: 95, f: 2, d: 22, te: 1.5, se: 13, ser: 11, gc: 135 },    // haplotigs kept
    { bg: 98, bp: 94, f: 2.5, d: 2, te: 14, se: 30, ser: 11, gc: 160 },    // repeats not masked
    { bg: 97, bp: 84, f: 9, d: 1.5, te: 1.5, se: 16, ser: 11, gc: 128 },   // frameshift-rich assembly
    { bg: 88, bp: 78, f: 12, d: 1, te: 2, se: 17, ser: 11, gc: 118 }       // short contigs
  ];
  var COL = { g: 'var(--good)', a: 'var(--het)', r: 'var(--bad)' };
  var WORD = { g: 'green', a: 'amber', r: 'red' };
  var RANK = { g: 0, a: 1, r: 2 };

  function val(k) { var el = $('s08-' + k); return el ? parseFloat(el.value) : 0; }
  function fmt(x) { return (Math.round(x * 10) / 10).toString(); }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function lights(p) {
    var rows = [];
    var gap = p.bg - p.bp;
    var L = gap < -1 ? 'a' : gap <= 2 ? 'g' : gap <= 5 ? 'a' : 'r';
    rows.push({ l: L, name: 'Missed by the annotation', v: fmt(gap) + (Math.abs(gap) === 1 ? ' point' : ' points'),
      tip: 'BUSCO complete in genome mode minus complete in protein mode: marker genes present in the DNA that the annotation did not find whole.',
      why: (L === 'g' && gap >= 0) ? 'The annotation finds almost every marker gene the assembly contains.'
        : gap < 0 ? '' : 'These marker genes are in the assembly but the gene models missed or broke them; many other genes will share their fate. Look at them in a genome browser: exons not found, genes split, frameshifts.' });
    if (gap < 0) rows[0].why = 'Protein mode above genome mode is unusual; check that both runs used the same lineage dataset and release.';

    L = p.f <= 3 ? 'g' : p.f <= 6 ? 'a' : 'r';
    rows.push({ l: L, name: 'Fragmented models', v: fmt(p.f) + ' %',
      tip: 'BUSCO fragmented (F) in protein mode: the protein matches a marker gene but is too short.',
      why: L === 'g' ? 'Few marker genes are predicted too short.'
        : 'Broken models: frameshift errors in homopolymers stop the reading frame early, genes are cut at contig ends, or exons were not found. Polish the assembly and check gene models at homopolymers before naming anything.' });

    L = p.d <= 3 ? 'g' : p.d <= 8 ? 'a' : 'r';
    rows.push({ l: L, name: 'Duplicated marker genes', v: fmt(p.d) + ' %',
      tip: 'BUSCO duplicated (D) in protein mode, with one isoform per gene.',
      why: L === 'g' ? 'Marker genes are mostly found once.'
        : 'If isoforms were already removed, the usual cause is both parental copies kept as separate contigs (haplotigs). Purge the assembly (lesson 2, section 06) and annotate again; do not just delete genes.' });

    L = p.te <= 2 ? 'g' : p.te <= 5 ? 'a' : 'r';
    rows.push({ l: L, name: 'Genes with TE domains', v: fmt(p.te) + ' %',
      tip: 'Share of genes whose protein carries a transposable-element domain such as reverse transcriptase or integrase (Pfam PF00078, PF00665).',
      why: L === 'g' ? 'Few predicted genes look like transposable elements.'
        : 'Open reading frames of transposable elements were predicted as genes: the repeat library or the masking was incomplete (sections 03-04). Improve masking and predict again.' });

    var ratio = p.ser > 0 ? p.se / p.ser : 0;
    L = ratio <= 1.3 ? 'g' : ratio <= 1.8 ? 'a' : 'r';
    rows.push({ l: L, name: 'Single-exon genes', v: fmt(p.se) + ' % (' + fmt(ratio) + '× relative)',
      tip: 'Share of genes with one exon, divided by the same share in a well-annotated relative.',
      why: L === 'g' ? 'Close to the relative.'
        : 'Too many one-exon genes. Typical sources: open reading frames of transposable elements, retrocopies (processed pseudogenes) annotated as genes, and short spurious open reading frames. Check which ones have TE domains or no InterPro hit at all.' });

    L = (p.gc >= 85 && p.gc <= 120) ? 'g' : (p.gc >= 70 && p.gc <= 150) ? 'a' : 'r';
    rows.push({ l: L, name: 'Gene count vs relative', v: fmt(p.gc) + ' %',
      tip: 'Number of protein-coding genes as a percentage of the number in a well-annotated relative.',
      why: L === 'g' ? 'In the expected range for a close relative.'
        : p.gc > 100 ? 'Too many genes: split genes, haplotig copies or TE genes inflate the count. The other rows usually show which.'
        : 'Too few genes: neighbouring genes merged, or genes missed (compare with the "missed" row).' });
    return rows;
  }

  function drawBar(p) {
    var box = $('s08-bar');
    if (!box) return;
    var W = 720, H = 92, X0 = 10, X1 = 700, MAX = 250;
    var sx = function (v) { return X0 + (X1 - X0) * v / MAX; };
    var dup = p.d / 100, frag = p.f / 100, te = p.te / 100;
    var tot = dup + frag + te;
    if (tot > 1) { dup /= tot; frag /= tot; te /= tot; }
    var rest = Math.max(0, 1 - dup - frag - te);
    var segs = [
      { k: 'other genes', f: rest, c: 'var(--accent)' },
      { k: 'extra haplotig copies', f: dup, c: 'var(--het)' },
      { k: 'broken models', f: frag, c: 'var(--err)' },
      { k: 'TE-derived genes', f: te, c: 'var(--rep)' }
    ];
    var len = sx(p.gc) - X0, x = X0;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="min-width:560px" role="img" aria-label="Composition of the predicted gene count">';
    s += '<text class="lab" x="' + X0 + '" y="14">What the predicted gene count is made of (toy)</text>';
    for (var i = 0; i < segs.length; i++) {
      var w = len * segs[i].f;
      if (w <= 0) continue;
      s += '<rect x="' + x.toFixed(1) + '" y="24" width="' + w.toFixed(1) + '" height="26" fill="' + segs[i].c + '" opacity="0.85"><title>' + esc(segs[i].k) + ': ' + fmt(segs[i].f * 100) + ' % of predicted genes</title></rect>';
      x += w;
    }
    var r = sx(100);
    s += '<line x1="' + r + '" x2="' + r + '" y1="18" y2="58" stroke="var(--fg)" stroke-width="1.5" stroke-dasharray="4 3"/>';
    s += '<text x="' + (r + 4) + '" y="66">relative = 100 %</text>';
    var ticks = [0, 50, 100, 150, 200, 250];
    s += '<line class="ax" x1="' + X0 + '" x2="' + X1 + '" y1="74" y2="74"/>';
    for (var t = 0; t < ticks.length; t++) {
      var tx = sx(ticks[t]);
      s += '<line class="ax" x1="' + tx + '" x2="' + tx + '" y1="74" y2="78"/>';
      s += '<text x="' + tx + '" y="89" text-anchor="' + (t === 0 ? 'start' : t === ticks.length - 1 ? 'end' : 'middle') + '">' + ticks[t] + ' %</text>';
    }
    s += '</svg>';
    box.innerHTML = s;
    var lg = $('s08-legend');
    if (lg) {
      var h = '';
      for (var j = 0; j < segs.length; j++) h += '<span><i style="background:' + segs[j].c + ';height:10px"></i>' + esc(segs[j].k) + ' ' + fmt(segs[j].f * 100) + ' %</span>';
      lg.innerHTML = h;
    }
  }

  function render() {
    var p = {};
    for (var i = 0; i < KEYS.length; i++) p[KEYS[i]] = val(KEYS[i]);
    var outs = { bg: fmt(p.bg) + ' %', bp: fmt(p.bp) + ' %', f: fmt(p.f) + ' %', d: fmt(p.d) + ' %', te: fmt(p.te) + ' %', se: fmt(p.se) + ' %', ser: fmt(p.ser) + ' %', gc: fmt(p.gc) + ' %' };
    for (var k in outs) { var o = $('s08-' + k + 'o'); if (o) o.textContent = outs[k]; }
    drawBar(p);
    var rows = lights(p), worst = 'g', h = '';
    h += '<div style="display:flex;flex-direction:column;border:1px solid var(--line);border-radius:4px;background:var(--panel)">';
    for (var j = 0; j < rows.length; j++) {
      var r = rows[j];
      if (RANK[r.l] > RANK[worst]) worst = r.l;
      h += '<div style="display:grid;grid-template-columns:22px 1fr;column-gap:10px;padding:8px 12px;' + (j ? 'border-top:1px solid var(--line);' : '') + '">' +
        '<span role="img" aria-label="' + WORD[r.l] + '" title="' + WORD[r.l] + '" style="display:inline-block;width:14px;height:14px;border-radius:50%;background:' + COL[r.l] + ';margin-top:5px"></span>' +
        '<div style="min-width:0"><div style="display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline"><span class="tip" style="font-weight:600" title="' + esc(r.tip).replace(/"/g, '&quot;') + '">' + esc(r.name) + '</span>' +
        '<span class="mono" style="color:var(--muted)">' + esc(r.v) + '</span></div>' +
        '<div style="font-size:14px">' + esc(r.why) + '</div></div></div>';
    }
    h += '</div>';
    $('s08-rows').innerHTML = h;
    var nRed = 0, nAmb = 0;
    for (var q = 0; q < rows.length; q++) { if (rows[q].l === 'r') nRed++; else if (rows[q].l === 'a') nAmb++; }
    var v = $('s08-verdict');
    if (worst === 'g') v.innerHTML = '<b style="color:var(--good)">Verdict: looks healthy.</b> Still compare every number with a relative measured the same way, and look at a sample of genes in a browser.';
    else if (worst === 'a') v.innerHTML = '<b style="color:var(--het)">Verdict: usable with care.</b> ' + nAmb + ' check' + (nAmb > 1 ? 's are' : ' is') + ' amber. Find the cause before you count genes, test gene losses or submit.';
    else v.innerHTML = '<b style="color:var(--bad)">Verdict: fix before use.</b> ' + nRed + ' red' + (nAmb ? ' and ' + nAmb + ' amber' : '') + ' check' + (nRed + nAmb > 1 ? 's' : '') + '. Names and functions added to these genes would be copied into every later analysis; repair the assembly or the gene models first.';
  }

  function setPreset(ix) {
    var pr = PRESETS[ix];
    if (!pr) return;
    for (var i = 0; i < KEYS.length; i++) { var el = $('s08-' + KEYS[i]); if (el) el.value = pr[KEYS[i]]; }
    markPreset(ix);
    render();
  }
  function markPreset(ix) {
    var pb = $('s08-presets');
    if (!pb) return;
    var bs = pb.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', String(+bs[i].getAttribute('data-p') === ix));
  }

  for (var i = 0; i < KEYS.length; i++) {
    var el = $('s08-' + KEYS[i]);
    if (el) el.addEventListener('input', function () { markPreset(-1); render(); });
  }
  var pb = $('s08-presets');
  if (pb) pb.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button') : null;
    if (b && b.hasAttribute('data-p')) setPreset(+b.getAttribute('data-p'));
  });

  // copy buttons inside this section only
  var btns = wrap.querySelectorAll('.code button');
  for (var b = 0; b < btns.length; b++) {
    if (btns[b].dataset.s08) continue;
    btns[b].dataset.s08 = '1';
    btns[b].addEventListener('click', function () {
      var pre = this.parentNode.querySelector('pre');
      var t = pre ? pre.innerText : '';
      var btn = this;
      try {
        navigator.clipboard.writeText(t).then(function () { btn.textContent = 'copied'; setTimeout(function () { btn.textContent = 'copy'; }, 1200); }, function () {});
      } catch (err) { /* clipboard not available */ }
    });
  }

  render();
})();
