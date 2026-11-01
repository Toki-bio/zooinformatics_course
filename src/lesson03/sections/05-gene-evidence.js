(function () {
  var NS = 'http://www.w3.org/2000/svg';
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function svgRoot(w, h, minW, label) {
    var s = el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'img', 'aria-label': label });
    s.style.minWidth = minW + 'px';
    s.style.display = 'block';
    return s;
  }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function tip(term, expl) { return '<span class="tip" title="' + esc(expl) + '">' + term + '</span>'; }

  /* ---------------- figure 1: anatomy of a gene ---------------- */
  function drawAnatomy() {
    var box = $('s05-anat');
    if (!box) return;
    var W = 960, H = 330;
    var s = svgRoot(W, H, 640, 'Toy gene with five exons, introns, UTRs, coding sequence, splice sites and the spliced mRNA');
    var y = 78, thin = 10, thick = 22;
    // exon layout: [x, width, cdsFrom, cdsTo] (cds in x units, null = none)
    var ex = [
      { x: 40, w: 70, c0: null, c1: null },
      { x: 220, w: 90, c0: 250, c1: 310 },
      { x: 400, w: 60, c0: 400, c1: 460 },
      { x: 560, w: 100, c0: 560, c1: 660 },
      { x: 770, w: 150, c0: 770, c1: 830 }
    ];
    // intron line
    s.appendChild(el('line', { x1: 20, y1: y, x2: 940, y2: y, style: 'stroke:var(--muted);stroke-width:1.5' }));
    s.appendChild(el('text', { x: 6, y: y - 16 }, '5′'));
    s.appendChild(el('text', { x: 942, y: y - 16 }, '3′'));
    ex.forEach(function (e, i) {
      s.appendChild(el('rect', { x: e.x, y: y - thin / 2, width: e.w, height: thin, style: 'fill:var(--panel);stroke:var(--accent);stroke-width:1.5' }));
      if (e.c0 != null) s.appendChild(el('rect', { x: e.c0, y: y - thick / 2, width: e.c1 - e.c0, height: thick, style: 'fill:var(--accent)' }));
      s.appendChild(el('text', { x: e.x + e.w / 2, y: y - 20, 'text-anchor': 'middle', 'class': 'lab' }, 'exon ' + (i + 1)));
    });
    // intron labels
    [[110, 220], [310, 400], [460, 560], [660, 770]].forEach(function (p, i) {
      s.appendChild(el('text', { x: (p[0] + p[1]) / 2, y: y + 4 - 14, 'text-anchor': 'middle' }, 'intron ' + (i + 1)));
    });
    // annotations below
    function note(x, txt, anchor, dy) {
      s.appendChild(el('line', { x1: x, y1: y + 13, x2: x, y2: y + 26 + (dy || 0), style: 'stroke:var(--muted);stroke-width:1' }));
      s.appendChild(el('text', { x: x, y: y + 38 + (dy || 0), 'text-anchor': anchor || 'middle' }, txt));
    }
    note(60, '5′ UTR');
    note(250, 'start codon ATG');
    note(520, 'CDS (thick)', 'middle');
    note(830, 'stop codon (TAA/TAG/TGA)');
    note(890, '3′ UTR', 'middle', 16);
    // zoom on intron 1
    var zy = 150, zx0 = 90, zx1 = 870;
    s.appendChild(el('path', { d: 'M110,' + (y + 9) + ' v6 h110 v-6', style: 'fill:none;stroke:var(--het);stroke-width:1.2' }));
    s.appendChild(el('line', { x1: 165, y1: y + 15, x2: 165, y2: zy, style: 'stroke:var(--het);stroke-width:1;stroke-dasharray:3 3' }));
    s.appendChild(el('rect', { x: zx0, y: zy, width: zx1 - zx0, height: 62, rx: 4, style: 'fill:var(--code-bg);stroke:var(--line)' }));
    var t = el('text', { x: (zx0 + zx1) / 2, y: zy + 26, 'text-anchor': 'middle', style: 'font-size:14px' });
    function sp(txt, cls, style) { var a = el('tspan', {}, txt); if (cls) a.setAttribute('class', cls); if (style) a.setAttribute('style', style); t.appendChild(a); }
    sp('exon 1 …CAG', 'lab');
    sp('|', null, 'fill:var(--bad)');
    sp('GT', null, 'fill:var(--het);font-weight:700');
    sp('AAGT ··· intron 1, often thousands of bases ··· TTTTCCTTTC');
    sp('AG', null, 'fill:var(--het);font-weight:700');
    sp('|', null, 'fill:var(--bad)');
    sp('G… exon 2', 'lab');
    s.appendChild(t);
    s.appendChild(el('text', { x: 330, y: zy + 48, 'text-anchor': 'middle' }, 'donor site: intron starts with GT'));
    s.appendChild(el('text', { x: 640, y: zy + 48, 'text-anchor': 'middle' }, 'acceptor site: intron ends with AG'));
    // mRNA
    var my = 268, x = 150;
    s.appendChild(el('text', { x: 40, y: my + 4, 'class': 'lab' }, 'mRNA'));
    s.appendChild(el('text', { x: 108, y: my + 4 }, 'cap'));
    ex.forEach(function (e, i) {
      var w = e.w;
      s.appendChild(el('rect', { x: x, y: my - thin / 2, width: w, height: thin, style: 'fill:var(--panel);stroke:var(--accent);stroke-width:1.5' }));
      if (e.c0 != null) s.appendChild(el('rect', { x: x + (e.c0 - e.x), y: my - thick / 2, width: e.c1 - e.c0, height: thick, style: 'fill:var(--accent)' }));
      if (i > 0) s.appendChild(el('line', { x1: x, y1: my - 16, x2: x, y2: my + 16, style: 'stroke:var(--het);stroke-width:1.5' }));
      x += w;
    });
    s.appendChild(el('text', { x: x + 6, y: my + 4 }, 'AAAA… poly(A) tail'));
    s.appendChild(el('text', { x: 150, y: my + 34 }, 'orange ticks = splice junctions: where exons were joined; a read across one is a split read'));
    box.appendChild(s);
  }

  /* ---------------- figure 2: interactive evidence toy ---------------- */
  // genome coordinates (bp) of the toy gene
  var EX = [
    { n: 1, s: 0, e: 150 },
    { n: 2, s: 1150, e: 1330 },
    { n: 3, s: 3330, e: 3450 },
    { n: 4, s: 4450, e: 4660 },
    { n: 5, s: 6660, e: 6960 },
    { n: 6, s: 7960, e: 8240 }
  ];
  var CDS_START = 1210;
  var ISO = [
    { id: 'A', ex: [0, 1, 2, 3, 4], stop: 6750 },
    { id: 'B', ex: [0, 1, 3, 4], stop: 6750 },
    { id: 'C', ex: [0, 1, 2, 3, 5], stop: 8050 }
  ];
  var TISSUE = ['brain', 'liver', 'testis'];
  // reads on the gene per million reads sequenced, [tissue][isoform]
  var LEVEL = [[2.0, 0, 0], [0.8, 0, 0.25], [0.3, 0.9, 0]];
  var DEPTHS = [1, 2, 5, 10, 20, 30, 50, 75, 100];
  var READ = 100, POOL = 1200;
  var PROT = [[CDS_START, 1330], [3330, 3450], [4450, 4660], [6660, 6750]];
  var PROT_J = { '2-3': 1, '3-4': 1, '4-5': 1 };
  var ALLJ = [[1, 2], [2, 3], [3, 4], [4, 5], [2, 4], [4, 6]];

  // geometry: exons to scale, introns compressed
  var W = 960, L = 46, R = 12, IW = 44;
  var exBp = EX.reduce(function (a, e) { return a + e.e - e.s; }, 0);
  var K = (W - L - R - IW * (EX.length - 1)) / exBp;
  var EXX = [];
  (function () { var x = L; EX.forEach(function (e) { EXX.push(x); x += (e.e - e.s) * K + IW; }); })();
  function gx(pos) { // genome bp -> x (pos inside an exon, or exon boundary)
    for (var i = 0; i < EX.length; i++) {
      if (pos >= EX[i].s && pos <= EX[i].e) return EXX[i] + (pos - EX[i].s) * K;
    }
    // inside an intron: interpolate across the compressed gap
    for (var j = 0; j < EX.length - 1; j++) {
      if (pos > EX[j].e && pos < EX[j + 1].s) {
        var f = (pos - EX[j].e) / (EX[j + 1].s - EX[j].e);
        return EXX[j] + (EX[j].e - EX[j].s) * K + f * IW;
      }
    }
    return L;
  }

  function rng(seed) { // mulberry32
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function txLen(iso) { return iso.ex.reduce(function (a, i) { return a + EX[i].e - EX[i].s; }, 0); }
  // pregenerated read pools: pool[t][i] = list of transcript start offsets
  var pool = [];
  for (var t = 0; t < 3; t++) {
    pool.push([]);
    for (var i = 0; i < 3; i++) {
      var r = rng(1000 + t * 17 + i * 101), len = txLen(ISO[i]), arr = [];
      for (var k = 0; k < POOL; k++) arr.push(Math.floor(r() * (len - READ + 1)));
      pool[t].push(arr);
    }
  }
  // transcript offset -> genome segments, plus junctions crossed
  function place(iso, start) {
    var segs = [], juncs = [], off = 0, need0 = start, need1 = start + READ, prev = -1;
    for (var q = 0; q < iso.ex.length; q++) {
      var e = EX[iso.ex[q]], l = e.e - e.s, a = off, b = off + l;
      var s0 = Math.max(a, need0), s1 = Math.min(b, need1);
      if (s1 > s0) {
        if (prev >= 0) juncs.push(EX[prev].n + '-' + e.n);
        segs.push([e.s + (s0 - a), e.s + (s1 - a), iso.ex[q]]);
        prev = iso.ex[q];
      }
      off = b;
    }
    return { segs: segs, juncs: juncs };
  }

  function state() {
    var d = DEPTHS[+$('s05-depth').value] || 20;
    var m = +$('s05-min').value || 1;
    var ts = [0, 1, 2].filter(function (t) { var c = $('s05-t' + t); return c && c.checked; });
    var prot = !!($('s05-prot') && $('s05-prot').checked);
    return { depth: d, min: m, tissues: ts, prot: prot };
  }

  function simulate(st) {
    var reads = [], jc = {}, exc = [0, 0, 0, 0, 0, 0], perTissueIso = {};
    ALLJ.forEach(function (j) { jc[j[0] + '-' + j[1]] = 0; });
    st.tissues.forEach(function (t) {
      for (var i = 0; i < 3; i++) {
        var n = Math.min(POOL, Math.round(st.depth * LEVEL[t][i]));
        perTissueIso[t + ':' + i] = n;
        for (var k = 0; k < n; k++) {
          var p = place(ISO[i], pool[t][i][k]);
          p.t = t; p.iso = i;
          reads.push(p);
          p.juncs.forEach(function (j) { jc[j] = (jc[j] || 0) + 1; });
          p.segs.forEach(function (sg) { exc[sg[2]]++; });
        }
      }
    });
    return { reads: reads, jc: jc, exc: exc, n: perTissueIso };
  }

  var MAXROWS = 26;
  function render() {
    var box = $('s05-fig');
    if (!box) return;
    var st = state();
    $('s05-deptho').textContent = st.depth + ' M';
    $('s05-mino').textContent = st.min;
    var sim = simulate(st);

    // layout
    var yIso = 18, isoH = 18;
    var yGene = yIso + 3 * isoH + 22;
    var yProt = yGene + 30;
    var yArc = (st.prot ? yProt + 26 : yGene + 22);
    var arcH = 64;
    var yReads = yArc + arcH + 22;
    // pack reads into rows
    sim.reads.sort(function (a, b) { return a.segs[0][0] - b.segs[0][0]; });
    var rowsEnd = [], placed = [], hidden = 0;
    sim.reads.forEach(function (rd) {
      var x0 = gx(rd.segs[0][0]), x1 = gx(rd.segs[rd.segs.length - 1][1]);
      var r = -1;
      for (var q = 0; q < rowsEnd.length; q++) if (rowsEnd[q] < x0 - 2) { r = q; break; }
      if (r < 0) { if (rowsEnd.length < MAXROWS) { rowsEnd.push(-1); r = rowsEnd.length - 1; } }
      if (r < 0) { hidden++; return; }
      rowsEnd[r] = x1;
      placed.push({ rd: rd, row: r });
    });
    var rowH = 7;
    var H = yReads + Math.max(1, rowsEnd.length) * rowH + 30;
    var s = svgRoot(W, H, 660, 'Toy gene with three isoforms, simulated RNA-seq reads, split reads and junction counts');

    // isoform models
    ISO.forEach(function (iso, i) {
      var y = yIso + i * isoH;
      s.appendChild(el('text', { x: 4, y: y + 4, 'class': 'lab' }, 'iso ' + iso.id));
      var first = EX[iso.ex[0]], last = EX[iso.ex[iso.ex.length - 1]];
      s.appendChild(el('line', { x1: gx(first.s), y1: y, x2: gx(last.e), y2: y, style: 'stroke:var(--muted);stroke-width:1' }));
      iso.ex.forEach(function (ei) {
        var e = EX[ei], x0 = gx(e.s), x1 = gx(e.e);
        s.appendChild(el('rect', { x: x0, y: y - 4, width: x1 - x0, height: 8, style: 'fill:var(--panel);stroke:var(--accent);stroke-width:1' }));
        var c0 = Math.max(e.s, CDS_START), c1 = Math.min(e.e, iso.stop);
        if (c1 > c0) s.appendChild(el('rect', { x: gx(c0), y: y - 6, width: gx(c1) - gx(c0), height: 12, style: 'fill:var(--accent);opacity:.85' }));
      });
    });
    // gene/exon track
    s.appendChild(el('line', { x1: L, y1: yGene, x2: W - R, y2: yGene, style: 'stroke:var(--line);stroke-width:1' }));
    EX.forEach(function (e, i) {
      var x0 = gx(e.s), x1 = gx(e.e);
      var cov = sim.exc[i] > 0;
      s.appendChild(el('rect', { x: x0, y: yGene - 9, width: x1 - x0, height: 18, rx: 2, style: cov ? 'fill:var(--good);opacity:.25;stroke:var(--good)' : 'fill:var(--panel);stroke:var(--err);stroke-dasharray:3 2' }));
      s.appendChild(el('text', { x: (x0 + x1) / 2, y: yGene + 4, 'text-anchor': 'middle', 'class': 'lab' }, 'exon ' + e.n));
      if (i < EX.length - 1) {
        var ix = x1 + IW / 2;
        s.appendChild(el('text', { x: ix, y: yGene + 4, 'text-anchor': 'middle' }, '//'));
      }
    });
    s.appendChild(el('text', { x: 4, y: yGene + 4 }, 'gene'));
    // protein track
    if (st.prot) {
      s.appendChild(el('text', { x: 4, y: yProt + 4 }, 'prot'));
      s.appendChild(el('line', { x1: gx(PROT[0][0]), y1: yProt, x2: gx(PROT[PROT.length - 1][1]), y2: yProt, style: 'stroke:var(--rep);stroke-width:1;stroke-dasharray:2 2' }));
      PROT.forEach(function (p) {
        s.appendChild(el('rect', { x: gx(p[0]), y: yProt - 5, width: gx(p[1]) - gx(p[0]), height: 10, style: 'fill:var(--rep)' }));
      });
      s.appendChild(el('text', { x: gx(6750) + 8, y: yProt + 4 }, 'Identity 0.91, Frameshift 0'));
    }
    // junction arcs (sashimi style)
    ALLJ.forEach(function (j) {
      var key = j[0] + '-' + j[1], c = sim.jc[key] || 0;
      var x0 = gx(EX[j[0] - 1].e), x1 = gx(EX[j[1] - 1].s);
      var long = (j[1] - j[0]) > 1;
      var h = long ? arcH - 8 : 26;
      var ok = c >= st.min;
      var sty = c === 0 ? 'stroke:var(--err);stroke-dasharray:2 3;stroke-width:1;fill:none'
        : ok ? 'stroke:var(--good);fill:none;stroke-width:' + Math.min(5, 1.2 + Math.log(1 + c) / 1.2).toFixed(2)
          : 'stroke:var(--bad);stroke-dasharray:5 3;fill:none;stroke-width:1.5';
      s.appendChild(el('path', { d: 'M' + x0 + ',' + yArc + ' C' + x0 + ',' + (yArc + h * 1.3) + ' ' + x1 + ',' + (yArc + h * 1.3) + ' ' + x1 + ',' + yArc, style: sty }));
      var lx = (x0 + x1) / 2, ly = yArc + h + 3;
      s.appendChild(el('rect', { x: lx - 15, y: ly - 10, width: 30, height: 14, rx: 2, style: 'fill:var(--bg);opacity:.9' }));
      var lt = el('text', { x: lx, y: ly + 1, 'text-anchor': 'middle', style: c === 0 ? '' : ok ? 'fill:var(--good)' : 'fill:var(--bad)' }, String(c));
      s.appendChild(lt);
      if (st.prot && PROT_J[key]) s.appendChild(el('text', { x: lx + 17, y: ly + 1, style: 'fill:var(--rep)' }, 'P'));
    });
    s.appendChild(el('text', { x: 4, y: yArc + 26 }, 'junc'));
    // reads
    s.appendChild(el('text', { x: 4, y: yReads + 6 }, 'reads'));
    placed.forEach(function (p) {
      var y = yReads + p.row * rowH;
      var split = p.rd.segs.length > 1;
      var col = split ? 'var(--het)' : 'var(--accent)';
      if (split) {
        for (var q = 0; q < p.rd.segs.length - 1; q++) {
          s.appendChild(el('line', { x1: gx(p.rd.segs[q][1]), y1: y + 2.5, x2: gx(p.rd.segs[q + 1][0]), y2: y + 2.5, style: 'stroke:var(--het);stroke-width:.8' }));
        }
      }
      p.rd.segs.forEach(function (sg) {
        s.appendChild(el('rect', { x: gx(sg[0]), y: y, width: Math.max(1, gx(sg[1]) - gx(sg[0])), height: 5, style: 'fill:' + col }));
      });
    });
    var foot = sim.reads.length === 0 ? 'no reads on this gene: tick at least one tissue' :
      sim.reads.length + ' reads on this gene' + (hidden ? ' (' + hidden + ' not drawn, counts include them)' : '');
    s.appendChild(el('text', { x: L, y: H - 8 }, foot));
    box.innerHTML = '';
    box.appendChild(s);

    // legend
    $('s05-legend').innerHTML =
      '<span><i style="background:var(--accent);height:6px"></i>read inside one exon</span>' +
      '<span><i style="background:var(--het);height:6px"></i>' + tip('split read', 'A read that starts in one exon and continues in the next; the aligner writes the skipped intron as N in the CIGAR string.') + '</span>' +
      '<span><i style="background:var(--good)"></i>junction with ≥ ' + st.min + ' split read' + (st.min > 1 ? 's' : '') + '</span>' +
      '<span><i style="background:var(--bad)"></i>junction with too few reads</span>' +
      '<span><i style="background:var(--err)"></i>expected junction, 0 reads</span>' +
      (st.prot ? '<span><i style="background:var(--rep);height:6px"></i>protein alignment (P = intron confirmed by the protein)</span>' : '');

    // readout per isoform
    var html = '';
    var supported = [];
    ISO.forEach(function (iso, i) {
      var js = [];
      for (var q = 0; q < iso.ex.length - 1; q++) js.push(EX[iso.ex[q]].n + '-' + EX[iso.ex[q + 1]].n);
      var counts = js.map(function (k) { return sim.jc[k] || 0; });
      var okAll = counts.every(function (c) { return c >= st.min; });
      var any = counts.some(function (c) { return c > 0; });
      if (okAll) supported.push(iso.id);
      var src = st.tissues.filter(function (t) { return (sim.n[t + ':' + i] || 0) > 0; }).map(function (t) { return TISSUE[t] + ' ' + sim.n[t + ':' + i]; });
      var zero = js.filter(function (k, q) { return counts[q] === 0; }).map(function (k) { return k.replace('-', '→'); });
      var weak = js.filter(function (k, q) { return counts[q] > 0 && counts[q] < st.min; }).map(function (k) { return k.replace('-', '→'); });
      var status = okAll ? '<span style="color:var(--good)">supported</span>'
        : !any ? '<span style="color:var(--muted)">no evidence</span>'
        : zero.length ? '<span style="color:var(--bad)">not shown</span>'
        : '<span style="color:var(--bad)">weak</span>';
      var why = okAll || !any ? '' : zero.length ? '<br><span style="color:var(--bad)">no split read on ' + zero.join(', ') + '</span>'
        : '<br><span style="color:var(--bad)">fewer than ' + st.min + ' split reads on ' + weak.join(', ') + '</span>';
      var protTxt = st.prot ? (iso.id === 'A' ? '; protein fits its coding exons' : iso.id === 'B' ? '; protein includes exon 3, so it does not fit B' : '; protein ends in exon 5, not exon 6') : '';
      html += '<div><b>Isoform ' + iso.id + ': ' + status + '</b>exons ' + iso.ex.map(function (e) { return EX[e].n; }).join('-') +
        '<br>' + tip('junction', 'The place where two exons are joined in the mRNA; in the genome, an intron.') + ' reads: ' + js.map(function (k, q) { return k.replace('-', '→') + ' ' + counts[q]; }).join(', ') + why +
        '<br>reads sampled from this isoform: ' + (src.length ? src.join(', ') : 'none') + protTxt + '</div>';
    });
    var cov = EX.filter(function (e, i) { return sim.exc[i] > 0; }).map(function (e) { return e.n; });
    html += '<div><b>Exons with reads: ' + (cov.length ? cov.join(', ') : 'none') + '</b>' +
      (st.prot ? 'Protein covers the coding parts of exons 2-5 only; it never shows exon 1 (5′ UTR) or exon 6.' : 'Turn on the protein to compare.') + '</div>';
    $('s05-out').innerHTML = html;

    // sentence
    var say;
    if (!st.tissues.length) say = 'No tissue selected: without RNA there is no transcript evidence at all' + (st.prot ? ', only the protein, which shows the coding exons of isoform A.' : '.');
    else {
      var miss = ISO.filter(function (iso) { return supported.indexOf(iso.id) < 0; }).map(function (iso) { return iso.id; });
      var head = 'With ' + st.tissues.map(function (t) { return TISSUE[t]; }).join(' + ') + ' at ' + st.depth + ' M reads' + (st.tissues.length > 1 ? ' each' : '') + ', ';
      say = supported.length ? head + 'every junction of isoform' + (supported.length === 1 ? ' ' : 's ') + supported.join(', ') + ' has at least ' + st.min + ' split read' + (st.min > 1 ? 's' : '') + '.'
        : head + 'no isoform has all its junctions covered by at least ' + st.min + ' split read' + (st.min > 1 ? 's' : '') + '.';
      if (miss.indexOf('B') >= 0 && st.tissues.indexOf(2) < 0) say += ' Isoform B cannot appear: it is made only in testis, which was not sequenced.';
      else if (miss.indexOf('B') >= 0) say += ' Isoform B is made in testis but has too few reads on its exon-skipping junction 2→4 at this depth.';
      if (miss.indexOf('C') >= 0 && st.tissues.indexOf(1) < 0) say += ' Isoform C needs liver.';
      else if (miss.indexOf('C') >= 0) say += ' Isoform C is rare: raise the depth or lower the minimum to see its 4→6 junction.';
      if (supported.indexOf('A') >= 0 && supported.length === 3) say += ' Note that isoform A has no junction of its own: an assembler infers it from shared junctions and coverage.';
    }
    $('s05-say').textContent = say;
  }

  function init() {
    try { drawAnatomy(); } catch (e) { /* keep page alive */ }
    var ids = ['s05-depth', 's05-min', 's05-t0', 's05-t1', 's05-t2', 's05-prot'];
    ids.forEach(function (id) {
      var c = $(id);
      if (c) { c.addEventListener('input', render); c.addEventListener('change', render); }
    });
    try { render(); } catch (e) { /* keep page alive */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
