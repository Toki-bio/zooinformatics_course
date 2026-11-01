(function(){
  var svg = document.getElementById('s07-svg');
  var seg = document.getElementById('s07-seg');
  var rl = document.getElementById('s07-rl');
  var rlo = document.getElementById('s07-rlo');
  var roll = document.getElementById('s07-roll');
  var out = document.getElementById('s07-out');
  var desc = document.getElementById('s07-desc');
  if (!svg || !seg || !rl || !out) return;

  var NS = 'http://www.w3.org/2000/svg';
  // toy genome: positions of heterozygous sites in kb
  var CHR = [
    { name: 'A', len: 100, x0: 200, sites: [3, 6, 10, 13, 17, 31, 34, 38, 70, 73, 77, 80, 92, 96] },
    { name: 'B', len: 70, x0: 652, sites: [5, 9, 12, 22, 26, 29, 33, 58, 62, 66] }
  ];
  var SC = 4.2;               // px per kb
  var BAR = 12;               // bar height
  var view = 'col', seed = 7;

  function rng(s) { // mulberry32
    return function () {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      var t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function X(c, kb) { return c.x0 + kb * SC; }
  function el(tag, attrs, txt) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    svg.appendChild(e);
    return e;
  }
  function colOf(o) { return o === 'M' ? 'var(--het)' : o === 'P' ? 'var(--accent)' : 'var(--muted)'; }
  function flip(o) { return o === 'M' ? 'P' : 'M'; }

  // phase blocks: consecutive sites are linked if a read is longer than their distance
  function blocks(c, L) {
    var b = [], cur = [0];
    for (var i = 1; i < c.sites.length; i++) {
      if (c.sites[i] - c.sites[i - 1] > L) { b.push(cur); cur = [i]; } else cur.push(i);
    }
    b.push(cur);
    return b;
  }

  // a contig: {chr, s, e, idx:[site indices], org:{siteIndex:'M'|'P'}}
  function wholeContig(ci, org) {
    var c = CHR[ci], idx = c.sites.map(function (_, i) { return i; });
    return { chr: ci, s: 0, e: c.len, idx: idx, org: org };
  }

  function build(L) {
    var r = rng(seed), files = [];
    var bl = CHR.map(function (c) { return blocks(c, L); });
    var linked = (view === 'hic' || view === 'trio');
    var shown = linked ? CHR.map(function (c) { return [c.sites.map(function (_, i) { return i; })]; }) : bl;
    function perSite(fn) { return CHR.map(function (c, ci) { var o = {}; c.sites.forEach(function (_, i) { o[i] = fn(ci, i); }); return o; }); }
    function perBlock() { // random parent per block, one array per chromosome
      return bl.map(function (bs) { var o = {}; bs.forEach(function (b) { var p = r() < 0.5 ? 'M' : 'P'; b.forEach(function (i) { o[i] = p; }); }); return o; });
    }
    function inv(os) { return os.map(function (o) { var n = {}; for (var k in o) n[k] = flip(o[k]); return n; }); }
    function whole(os) { return os.map(function (o, ci) { return wholeContig(ci, o); }); }

    if (view === 'col') {
      files.push({ file: 'assembly.fasta', pre: 'contig_', ctgs: whole(perSite(function () { return r() < 0.5 ? 'M' : 'P'; })) });
    } else if (view === 'pa' || view === 'bp') {
      var pri = perBlock();
      if (view === 'pa') {
        files.push({ file: 'x.p_ctg.gfa', pre: 'ptg', ctgs: whole(pri) });
        var alt = [];
        bl.forEach(function (bs, ci) {
          var c = CHR[ci];
          bs.forEach(function (b) {
            var o = {}; b.forEach(function (i) { o[i] = flip(pri[ci][i]); });
            alt.push({ chr: ci, s: Math.max(0, c.sites[b[0]] - 1.5), e: Math.min(c.len, c.sites[b[b.length - 1]] + 1.5), idx: b.slice(), org: o });
          });
        });
        files.push({ file: 'x.a_ctg.gfa', pre: 'atg', ctgs: alt });
      } else {
        files.push({ file: 'x.bp.p_ctg.gfa', pre: 'ptg', ctgs: whole(pri) });
        var h1 = perBlock();
        files.push({ file: 'x.bp.hap1.p_ctg.gfa', pre: 'h1tg', ctgs: whole(h1) });
        files.push({ file: 'x.bp.hap2.p_ctg.gfa', pre: 'h2tg', ctgs: whole(inv(h1)) });
      }
    } else if (view === 'hic') {
      var pc = CHR.map(function () { return r() < 0.5 ? 'M' : 'P'; });
      var hh = perSite(function (ci) { return pc[ci]; });
      files.push({ file: 'x.hic.hap1.p_ctg.gfa', pre: 'h1tg', ctgs: whole(hh) });
      files.push({ file: 'x.hic.hap2.p_ctg.gfa', pre: 'h2tg', ctgs: whole(inv(hh)) });
    } else {
      files.push({ file: 'x.dip.hap1.p_ctg.gfa', pre: 'h1tg', ctgs: whole(perSite(function () { return 'P'; })) });
      files.push({ file: 'x.dip.hap2.p_ctg.gfa', pre: 'h2tg', ctgs: whole(perSite(function () { return 'M'; })) });
    }
    return { files: files, bl: shown, linked: linked };
  }

  function stats(f) {
    var sw = 0, ham = 0, n = 0, len = 0;
    f.ctgs.forEach(function (k) {
      var m = 0, p = 0;
      len += k.e - k.s;
      k.idx.forEach(function (i, j) {
        if (k.org[i] === 'M') m++; else p++;
        if (j > 0 && k.org[i] !== k.org[k.idx[j - 1]]) sw++;
      });
      ham += Math.min(m, p); n += k.idx.length;
    });
    return { sw: sw, ham: ham, n: n, len: len, ctg: f.ctgs.length };
  }

  function drawContig(k, y, blk) {
    var c = CHR[k.chr], sites = c.sites, ix = k.idx;
    var blockOf = {}; blk.forEach(function (b, bi) { b.forEach(function (i) { blockOf[i] = bi; }); });
    function rect(a, b, col) { if (b > a) el('rect', { x: X(c, a), y: y, width: Math.max(0.5, (b - a) * SC), height: BAR, fill: col, opacity: col === 'var(--muted)' ? 0.45 : 0.9 }); }
    rect(k.s, sites[ix[0]], 'var(--muted)');
    var marks = [];
    for (var j = 0; j < ix.length - 1; j++) {
      var a = ix[j], b = ix[j + 1], pa = sites[a], pb = sites[b], oa = k.org[a], ob = k.org[b];
      var same = blockOf[a] === blockOf[b];
      if (!same) rect(pa, pb, 'var(--muted)');
      else if (oa === ob) rect(pa, pb, colOf(oa));
      else { var mid = (pa + pb) / 2; rect(pa, mid, colOf(oa)); rect(mid, pb, colOf(ob)); }
      if (oa !== ob) marks.push((pa + pb) / 2);
    }
    rect(sites[ix[ix.length - 1]], k.e, 'var(--muted)');
    ix.forEach(function (i) { el('rect', { x: X(c, sites[i]) - 1.5, y: y - 4, width: 3, height: BAR + 8, fill: colOf(k.org[i]) }); });
    marks.forEach(function (m) {
      el('line', { x1: X(c, m), x2: X(c, m), y1: y - 9, y2: y + BAR + 9, stroke: 'var(--bad)', 'stroke-width': 2.5 });
      el('path', { d: 'M' + (X(c, m) - 4) + ' ' + (y - 13) + 'l8 0l-4 5z', fill: 'var(--bad)' });
    });
    // contig end caps
    el('line', { x1: X(c, k.s), x2: X(c, k.s), y1: y - 2, y2: y + BAR + 2, stroke: 'var(--fg)', 'stroke-width': 1.5 });
    el('line', { x1: X(c, k.e), x2: X(c, k.e), y1: y - 2, y2: y + BAR + 2, stroke: 'var(--fg)', 'stroke-width': 1.5 });
  }

  var DESC = {
    col: 'Collapsed: one contig per chromosome. At every heterozygous site the assembler keeps one letter, so the contig is a mosaic of both parents with switches everywhere. The other parent’s letters are simply absent.',
    pa: 'Primary + alternate: the primary (ptg) is complete and keeps one parent inside each phase block, but may switch where a long homozygous stretch breaks the chain. The alternate (atg) holds only the other copy of each heterozygous block, as short haplotigs; homozygous stretches are not repeated in it. Make the reads longer and the blocks merge.',
    bp: 'Partially phased (hifiasm default without Hi-C or parents): bp.p_ctg is the primary; hap1 and hap2 are two complete sets. Inside a block they are correctly separated; at each block break the assembler cannot know which side goes with which, so either set may switch parent there. Longer reads mean fewer blocks and fewer switches.',
    hic: 'Hi-C phased: Hi-C pairs link sites millions of bases apart, so every block of a chromosome is joined and each contig follows one parent. Between chromosomes Hi-C gives no link: hap1 may hold the mother’s A and the father’s B. The read-length slider does not matter here.',
    trio: 'Trio phased: reads were sorted by k-mers found only in the father or only in the mother, so hap1 (dip.hap1, from -1 pat.yak) is the father’s genome and hap2 the mother’s, on every chromosome. The read-length slider does not matter here.'
  };

  function render() {
    var L = +rl.value;
    if (rlo) rlo.textContent = L + ' kb';
    var b = build(L), files = b.files;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var y0 = 112, step = 40, H = y0 + files.length * step + 4;
    svg.setAttribute('viewBox', '0 0 960 ' + H);

    // chromosome headers + truth rows
    CHR.forEach(function (c, ci) {
      el('text', { x: c.x0, y: 14, 'class': 'lab' }, 'chromosome ' + c.name + ' (' + c.len + ' kb)');
      [['M', 26], ['P', 50]].forEach(function (r) {
        el('rect', { x: c.x0, y: r[1], width: c.len * SC, height: BAR, fill: colOf(r[0]), opacity: 0.9 });
        c.sites.forEach(function (s) { el('rect', { x: X(c, s) - 1, y: r[1] - 3, width: 2, height: BAR + 6, fill: 'var(--fg)' }); });
      });
      // phase blocks
      b.bl[ci].forEach(function (bk) {
        var a = c.sites[bk[0]], e = c.sites[bk[bk.length - 1]];
        var xa = X(c, a) - 2, xe = Math.max(X(c, e) + 2, xa + 4), yy = 80;
        el('path', { d: 'M' + xa + ' ' + (yy - 5) + 'V' + yy + 'H' + xe + 'V' + (yy - 5), fill: 'none', stroke: 'var(--fg)', 'stroke-width': 1.5 });
      });
    });
    el('text', { x: 8, y: 36, 'class': 'lab' }, 'mother');
    el('text', { x: 8, y: 60, 'class': 'lab' }, 'father');
    el('text', { x: 8, y: 82 }, b.linked ? (view === 'hic' ? 'phase blocks, Hi-C links' : 'phase blocks, parents') : 'phase blocks, ' + L + ' kb reads');
    el('line', { x1: 8, x2: 952, y1: 96, y2: 96, 'class': 'grid' });

    var html = '';
    files.forEach(function (f, fi) {
      var y = y0 + fi * step;
      el('text', { x: 8, y: y + 4, 'class': 'lab' }, f.file);
      el('text', { x: 8, y: y + 17 }, 'contigs ' + f.pre + '…');
      f.ctgs.forEach(function (k) { drawContig(k, y, b.bl[k.chr]); });
      var s = stats(f);
      html += '<div>' + f.file + ' <span style="color:var(--muted)">(' + f.pre + '…)</span><b>' + s.sw + ' switch' + (s.sw === 1 ? '' : 'es') + '</b>' +
        'Hamming errors ' + s.ham + ' of ' + s.n + ' sites · ' + s.ctg + ' contig' + (s.ctg === 1 ? '' : 's') + ' · ' +
        (Math.round(s.len * 10) / 10) + ' of 170 kb' + (s.len < 169 ? ' (incomplete)' : '') +
        (b.linked ? '<br>holds ' + f.ctgs.map(function (k) { return CHR[k.chr].name + ' from ' + (k.org[0] === 'M' ? 'mother' : 'father'); }).join(', ') : '') + '</div>';
    });
    out.innerHTML = html;
    if (desc) desc.textContent = DESC[view];
  }

  seg.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('button') : e.target;
    if (!t || !t.getAttribute('data-v')) return;
    view = t.getAttribute('data-v');
    Array.prototype.forEach.call(seg.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x === t ? 'true' : 'false'); });
    render();
  });
  rl.addEventListener('input', render);
  if (roll) roll.addEventListener('click', function () { seed = (seed * 9301 + 49297) % 233280 + 1; render(); });
  render();
})();
