(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function tip(term, expl) { return '<span class="tip" title="' + expl.replace(/"/g, '&quot;') + '">' + term + '</span>'; }
  function press(group, btn) {
    var bs = group.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', bs[i] === btn ? 'true' : 'false');
  }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* ------------------------------------------------------------------ *
   * 1. Soft / hard masking on a toy excerpt                             *
   * ------------------------------------------------------------------ */
  try {
    // toy 480-base excerpt: random letters, soft-mask pattern (lowercase = repeat) laid out like a real genome file
    var SEQ = 'AATAAACGGCCTTACAGATTATACAGCCGGACCTGGCTtaattcgtcttatcttaacctcttccacgttgaacgggagggttcatgctctaacatcagggatccatgcattgttttccaaatcataatactggaatcacgtaccacattgcatgttagaggaccgattaacagcttttggtttttcacggttggacaacgcatggggagaccgcagCGTGTTAGTACTCGGTCTCATGGcacacggagttcgagtctatgacgagtcaagagctgtgtttttcagttccttccggcttcttttgccgcaatcagcgatataacactgctatccgctaaataccattatACCATTGGTTTGTGGAGAGGTTGCGCTGAGCTCTGCGCTCGTCAGACACAGACAGCcctggatcgctaaggccatcttcgcagcaaccgatctgtagccgtccggcagtcggaggttggcccagccgctatc';
    var OFF = 1, WRAP = 60;
    var view = 'soft', tool = 'aug';
    var nLow = 0;
    for (var i = 0; i < SEQ.length; i++) if (SEQ[i] >= 'a' && SEQ[i] <= 'z') nLow++;
    // runs of lowercase / uppercase
    var runs = [];
    (function () {
      var start = 0;
      for (var j = 1; j <= SEQ.length; j++) {
        var a = SEQ[j - 1] >= 'a', b = j < SEQ.length ? SEQ[j] >= 'a' : !a;
        if (a !== b) { runs.push({ s: start, e: j, low: a }); start = j; }
      }
    })();

    var MAPMODE = 'MAPQ (mapping quality): a number from the aligner saying how sure it is that a read belongs at this place and not at another copy; reads from repeats get low MAPQ.';
    var TXT = {
      aug: {
        soft: 'AUGUSTUS with <code>--softmasking=1</code> (on by default inside BRAKER) reads the ' + '{L}' + ' lowercase bases as weak evidence against exons. It can still put an exon there when RNA or protein ' + tip('hints', 'Hints: pieces of external evidence (an intron from RNA reads, an exon part from a protein alignment) that AUGUSTUS adds to its score.') + ' support it.',
        hard: 'The repeat letters are gone, so the gene finder cannot use them at all, not even where evidence would support an exon. The AUGUSTUS manual says hard masking "looses information", is slightly less accurate than soft-masking, and on human runs at less than half the speed of <code>--softmasking=1</code>.',
        none: 'No repeat information. The transposable-element sequence looks like any other DNA, and TE reading frames can turn into false genes (GALBA and BRAKER READMEs).'
      },
      lastz: {
        soft: 'LASTZ does not start alignments (' + tip('seeds', 'Seed: a short match between the two genomes from which an alignment is started and then extended.') + ') inside lowercase bases, but it lets alignments that started in unique sequence extend through them. The many copies of each repeat therefore do not flood the genome alignment that TOGA2 reads.',
        hard: 'make_lastz_chains README: "Softmask both genomes (lowercase, do NOT hardmask)." With N in place of the {L} repeat bases, there is nothing to align there.',
        none: 'Every repeat copy can start seeds against every other copy of its family. The make_lastz_chains README suggests adding WindowMasker even to masked genomes "if you see runaway LASTZ runtimes".'
      },
      mm2: {
        soft: 'minimap2 gives lowercase and capital letters the same code (source file <code>sketch.c</code>), so the mask has no effect. Reads from repeats are placed as on an unmasked genome; their ' + tip('MAPQ', MAPMODE) + ' tells you whether the placement is unique.',
        hard: 'N breaks ' + tip('minimizers', 'Minimizers: the short k-mers minimap2 uses as seeds. A k-mer that contains N is never used.') + ', so the {L} masked bases give no seeds. Reads that come from these repeat copies cannot be placed here; they can end up on an unmasked copy elsewhere or stay unmapped.',
        none: 'Same as soft-masked for minimap2: it ignores letter case.'
      }
    };

    function shown() {
      if (view === 'soft') return SEQ;
      if (view === 'none') return SEQ.toUpperCase();
      return SEQ.replace(/[a-z]/g, 'N');
    }
    function drawSeq() {
      var s = shown(), out = [];
      for (var p = 0; p < s.length; p += WRAP) {
        var chunk = s.slice(p, p + WRAP), html = '';
        for (var q = 0; q < chunk.length; q++) {
          var c = chunk[q];
          if (c >= 'a' && c <= 'z') html += '<span class="s01-lc">' + c + '</span>';
          else if (c === 'N') html += '<span class="s01-n">N</span>';
          else html += c;
        }
        out.push('<span class="s01-pos">' + String(OFF + p).padStart(4, ' ') + '  </span>' + html);
      }
      $('s01-mseq').innerHTML = out.join('\n');
    }
    function drawMap() {
      var svg = $('s01-msvg'); while (svg.firstChild) svg.removeChild(svg.firstChild);
      var x0 = 40, w = 700, L = SEQ.length;
      function X(i) { return x0 + w * i / L; }
      runs.forEach(function (r) {
        var col, op = 0.85;
        if (view === 'none') { col = 'var(--accent)'; op = 0.45; }
        else if (r.low) col = view === 'hard' ? 'var(--err)' : 'var(--rep)';
        else col = 'var(--accent)';
        svg.appendChild(el('rect', { x: X(r.s), y: 14, width: Math.max(1, X(r.e) - X(r.s)), height: 16, fill: col, opacity: op }));
      });
      [0, 100, 200, 300, 400, 480].forEach(function (t) {
        svg.appendChild(el('line', { x1: X(t), x2: X(t), y1: 31, y2: 36, class: 'ax' }));
        svg.appendChild(el('text', { x: X(t), y: 48, 'text-anchor': 'middle' }, String(OFF + t)));
      });
      var lab = view === 'soft' ? 'purple = lowercase (repeat), blue = capitals' : view === 'hard' ? 'grey = N (repeat sequence removed), blue = capitals' : 'all capitals: the file no longer says where repeats are';
      svg.appendChild(el('text', { x: x0, y: 9, class: 'lab' }, lab));
      svg.appendChild(el('text', { x: x0 + w, y: 62, 'text-anchor': 'end' }, 'position on the toy contig'));
    }
    function drawRead() {
      var n = SEQ.length;
      var low = view === 'soft' ? nLow : 0, nn = view === 'hard' ? nLow : 0, up = n - low - nn;
      $('s01-mread').innerHTML =
        '<div>lowercase bases<b>' + low + '</b></div>' +
        '<div>N bases<b>' + nn + '</b></div>' +
        '<div>capital A/C/G/T<b>' + up + '</b></div>' +
        '<div>marked as repeat<b>' + (view === 'none' ? 'unknown' : (100 * nLow / n).toFixed(1) + ' %') + '</b></div>';
      $('s01-mtxt').innerHTML = TXT[tool][view].replace(/\{L\}/g, String(nLow));
    }
    function drawAll() { drawSeq(); drawMap(); drawRead(); }
    $('s01-mview').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      view = b.getAttribute('data-v'); press(this, b); drawAll();
    });
    $('s01-mtool').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      tool = b.getAttribute('data-t'); press(this, b); drawRead();
    });
    drawAll();
  } catch (err) { if (window.console) console.warn('s01 mask', err); }

  /* ------------------------------------------------------------------ *
   * 2. Route chooser                                                    *
   * ------------------------------------------------------------------ */
  try {
    var IDS = ['rs', 'iso', 'cp', 'ref', 'big', 'gpu', 'sub', 'tax'];
    var PRE = {
      spA: { rs: 0, iso: 0, cp: 0, ref: 1, big: 1, gpu: 0, sub: 0, tax: 1 },
      rich: { rs: 1, iso: 1, cp: 1, ref: 1, big: 1, gpu: 1, sub: 1, tax: 1 },
      dna: { rs: 0, iso: 0, cp: 0, ref: 0, big: 1, gpu: 0, sub: 0, tax: 1 }
    };
    var PNOTE = {
      spA: 'Our species A (a rodent, not yet published): no RNA of any kind; the human annotation was projected with TOGA2 by the Hiller lab. Whether proteomes of close relatives exist was not checked for this page, so that box is left empty.',
      rich: 'Everything available. Even then, run a second, independent route as a check.',
      dna: 'Only the genome (plus the public OrthoDB file). Typical for a museum specimen.'
    };
    var T = {
      orthodb: tip('OrthoDB', 'OrthoDB: a database of orthologous gene groups across many species; the BRAKER team offers one protein file per clade (for example Vertebrata.fa.gz).'),
      ab: tip('ab initio', 'Ab initio prediction: finding genes from the DNA sequence alone, using a statistical or neural-network model of what genes look like, without RNA or protein evidence.'),
      chains: tip('alignment chains', 'Chains: a whole-genome alignment between two species stored as ordered blocks (UCSC chain format). TOGA2 reads genes through them.'),
      gb: tip('GenBank', 'GenBank: NCBI\'s public sequence database, where genome assemblies and their annotations are deposited.'),
      taxid: tip('taxid', 'NCBI Taxonomy identifier: the number NCBI gives each species, e.g. 9606 for human.'),
      etp: tip('ETP mode', 'BRAKER3 mode that uses RNA-seq and a protein database together (GeneMark-ETP plus AUGUSTUS, combined by TSEBRA).')
    };
    function get() { var o = {}; IDS.forEach(function (k) { o[k] = $('s01-c-' + k).checked; }); return o; }
    function item(name, tag, cls, why, src, link) {
      return '<li><div><b>' + name + '</b><span class="tag ' + cls + '">' + tag + '</span>' +
        '<p class="d">' + why + '</p><p class="t">' + src + (link ? ' · <a href="#' + link + '">section ' + link.slice(1) + '</a>' : '') + '</p></div></li>';
    }
    function route() {
      var h = get(), out = [], main = false;
      // main route
      if (h.rs) {
        out.push(item('BRAKER3 (RNA-seq + proteins)', 'main route', 's01-main',
          'RNA-seq plus the ' + T.orthodb + ' protein file is BRAKER\'s "native" ' + T.etp + ': it trains its gene finders on genes with strong evidence and keeps only well-supported genes. Align reads with HISAT2 <code>--dta</code> (or STAR <code>--outSAMstrandField intronMotif</code>), or give BRAKER the FASTQ files.' +
          (h.iso ? ' Your long-read RNA cannot go into the same BRAKER run: its long-read variant must not be mixed with short reads. Use it in EGAPx, or as evidence for checking.' : ''),
          'BRAKER README, "BRAKER with RNA-Seq and protein data"', 's06'));
        main = true;
      } else if (h.iso) {
        out.push(item('BRAKER3, long-read variant (Iso-Seq + proteins)', 'main route', 's01-main',
          'A separate BRAKER container (<code>teambraker/braker3:isoseq</code>) takes long-read RNA aligned with <code>minimap2 -ax splice:hq</code> plus the protein file. BRAKER warns that accuracy "heavily depends on the depth of your isoseq data".',
          'BRAKER README, "BRAKER with long read RNA-Seq (only) and protein data"', 's06'));
        main = true;
      } else if (h.big && h.cp) {
        out.push(item('GALBA (proteins of close relatives)', 'main route', 's01-main',
          'No RNA and a large genome: GALBA\'s README answers its own question "GALBA or BRAKER?" with "if you have no RNA-Seq data and the genome is large, use GALBA!" It aligns the close relatives\' proteins with miniprot, trains AUGUSTUS on them and predicts.',
          'GALBA README, "What is GALBA?"', 's06'));
        main = true;
      } else {
        out.push(item('BRAKER2 protein mode (OrthoDB only)', 'main route', 's01-main',
          'With no RNA and no close proteomes, BRAKER uses the ' + T.orthodb + ' clade file alone (<code>braker.pl --genome=genome.fa --prot_seq=Vertebrata.fa</code>). Its README: works with proteins "of any evolutionary distance", but needs "many representatives of each protein family".' +
          (h.big ? '' : ' For a small or medium genome BRAKER is also GALBA\'s own recommendation.'),
          'BRAKER README, "BRAKER with protein data"', 's06'));
        main = true;
      }
      // EGAPx
      if (h.sub && h.tax) {
        out.push(item('EGAPx (NCBI)', 'add', '',
          'NCBI\'s own pipeline, run on your machine. It needs the genome and the ' + T.taxid + '; it picks protein sets itself, does its own repeat masking, and writes files for ' + T.gb + ' submission. RNA-seq is "highly recommended"' + (h.rs || h.iso ? '.' : '; without it, its README suggests the slower ProSplign aligner may help.') + ' Sizing: a 32-CPU, 256-GB machine; a 1.1-Gb chicken genome with 20 RNA runs took 425 CPU hours.',
          'EGAPx README (v1.0.1): Prerequisites, Input, FAQ', 's08'));
      } else if (h.sub && !h.tax) {
        out.push(item('EGAPx', 'not for your taxon', 's01-no',
          'EGAPx "will fail when providing an unsupported tax-id" (fungi, protists and nematodes are out of scope). Submit a GFF3 from your main route instead.',
          'EGAPx README, FAQ', 's08'));
      }
      // TOGA2
      if (h.ref) {
        out.push(item('TOGA2 projection from the annotated relative', 'add', '',
          'Gives each reference gene an ortholog and a status (intact, lost, missing) that no predictor gives. It needs ' + T.chains + ' between the two genomes; the recommended chain pipeline (make_lastz_chains) wants both genomes soft-masked. It cannot find genes the reference does not have, so pair it with a predictor.',
          'TOGA2 wiki "Input files" · make_lastz_chains README', 's07'));
      }
      // Helixer
      if (h.gpu) {
        out.push(item('Helixer (independent check)', 'check', '',
          'A deep-learning ' + T.ab + ' predictor: genome FASTA plus the <code>vertebrate</code> (or <code>invertebrate</code>) model, no evidence. It writes "primary gene models" in GFF3. Because it uses no RNA or proteins, agreement with your main route is independent support.',
          'Helixer README (0.3.7)', 's06'));
      } else {
        out.push(item('Helixer', 'needs a GPU', 's01-no',
          'Its README: "For realistically sized datasets, an Nvidia GPU ... will be necessary." The web tool accepts files up to 1 GB.',
          'Helixer README, "GPU requirements", "Web tool"', 's06'));
      }
      out.push(item('Then: function and quality', 'always', '',
        'Names and domains, completeness in protein mode, a sanity check of the gene count against relatives.', 'BUSCO protein mode, OMArk, InterProScan', 's08'));
      $('s01-rout').innerHTML = out.join('');
      var gaps = [];
      if (!h.rs && !h.iso) gaps.push('no RNA: UTRs and alternative transcripts will have little or no direct support, whichever route you take');
      if (!h.ref) gaps.push('no annotated relative: you get no gene-loss calls');
      $('s01-rnote').innerHTML = gaps.length ? 'What this situation will not give you: ' + gaps.join('; ') + '.' : '';
    }
    $('s01-rbox').addEventListener('change', function () {
      var bs = $('s01-rpre').querySelectorAll('button');
      for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', 'false');
      route();
    });
    $('s01-rpre').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var p = PRE[b.getAttribute('data-p')]; if (!p) return;
      IDS.forEach(function (k) { $('s01-c-' + k).checked = !!p[k]; });
      press(this, b); route();
      var n = $('s01-rnote'); n.innerHTML = PNOTE[b.getAttribute('data-p')] + (n.innerHTML ? ' ' + n.innerHTML : '');
    });
    route();
  } catch (err) { if (window.console) console.warn('s01 route', err); }

  /* ------------------------------------------------------------------ *
   * 3. One gene, three formats                                          *
   * ------------------------------------------------------------------ */
  try {
    var EX = [[101, 250], [401, 520], [701, 900]];
    var CDS = [[151, 250], [401, 520], [701, 780]];
    // phase: bases to skip at the start of each CDS piece before the next full codon
    var PH = [], done = 0;
    CDS.forEach(function (c) { PH.push((3 - done % 3) % 3); done += c[1] - c[0] + 1; });
    var fmtSel = 'gff', sel = 1;
    function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
    function row(cols, w) { return cols.map(function (c, i) { return i < cols.length - 1 ? pad(c, w[i]) : c; }).join(' '); }
    var W9 = [5, 4, 11, 4, 4, 2, 2, 2];
    function lines() {
      var L = [];
      if (fmtSel === 'gff') {
        L.push({ t: '##gff-version 3', e: -1 });
        L.push({ t: row(['ctg1', 'toy', 'gene', 101, 900, '.', '+', '.', 'ID=g1'], W9), e: -1 });
        L.push({ t: row(['ctg1', 'toy', 'mRNA', 101, 900, '.', '+', '.', 'ID=g1.t1;Parent=g1'], W9), e: -1 });
        EX.forEach(function (x, i) { L.push({ t: row(['ctg1', 'toy', 'exon', x[0], x[1], '.', '+', '.', 'Parent=g1.t1'], W9), e: i }); });
        CDS.forEach(function (x, i) { L.push({ t: row(['ctg1', 'toy', 'CDS', x[0], x[1], '.', '+', PH[i], 'ID=g1.t1.cds;Parent=g1.t1'], W9), e: i }); });
      } else if (fmtSel === 'gtf') {
        var a = 'gene_id "g1"; transcript_id "g1.t1";';
        L.push({ t: row(['ctg1', 'toy', 'transcript', 101, 900, '.', '+', '.', a], W9), e: -1 });
        EX.forEach(function (x, i) { L.push({ t: row(['ctg1', 'toy', 'exon', x[0], x[1], '.', '+', '.', a], W9), e: i }); });
        CDS.forEach(function (x, i) { L.push({ t: row(['ctg1', 'toy', 'CDS', x[0], x[1], '.', '+', PH[i], a], W9), e: i }); });
      } else {
        var s0 = EX[0][0] - 1;
        L.push({ t: ['ctg1', s0, EX[2][1], 'g1.t1', 0, '+', CDS[0][0] - 1, CDS[2][1], 0, 3,
          EX.map(function (x) { return x[1] - x[0] + 1; }).join(','),
          EX.map(function (x) { return x[0] - 1 - s0; }).join(',')].join(' '), e: -2 });
      }
      return L;
    }
    function drawTxt() {
      var L = lines();
      $('s01-ftxt').innerHTML = L.map(function (l) {
        var on = l.e === sel || l.e === -2;
        return '<span class="s01-ln' + (on ? ' s01-on' : '') + '" data-e="' + l.e + '">' + l.t.replace(/</g, '&lt;') + '</span>';
      }).join('\n');
    }
    function drawSvg() {
      var svg = $('s01-fsvg'); while (svg.firstChild) svg.removeChild(svg.firstChild);
      var x0 = 30, w = 700;
      function X(p) { return x0 + w * (p - 1) / 1000; } // left edge of 1-based base p
      svg.appendChild(el('line', { x1: X(1), x2: X(1001), y1: 78, y2: 78, class: 'ax' }));
      [1, 101, 401, 701, 1001].forEach(function (t) {
        svg.appendChild(el('line', { x1: X(t), x2: X(t), y1: 75, y2: 81, class: 'ax' }));
        svg.appendChild(el('text', { x: X(t), y: 94, 'text-anchor': 'middle' }, fmtSel === 'bed' ? String(t - 1) : String(t)));
      });
      svg.appendChild(el('text', { x: x0, y: 107 }, fmtSel === 'bed' ? 'BED counts from 0: the first base of ctg1 is 0' : 'GFF3/GTF count from 1: the first base of ctg1 is 1'));
      svg.appendChild(el('line', { x1: X(EX[0][0]), x2: X(EX[2][1] + 1), y1: 40, y2: 40, stroke: 'var(--muted)', 'stroke-width': 1.5 }));
      EX.forEach(function (x, i) {
        var g = el('g', { class: 's01-ex', 'data-e': i, tabindex: 0, role: 'button', 'aria-label': 'exon ' + (i + 1) });
        var on = i === sel;
        g.appendChild(el('rect', { x: X(x[0]), y: 32, width: X(x[1] + 1) - X(x[0]), height: 16, fill: 'var(--panel)' }));
        g.appendChild(el('rect', { x: X(x[0]), y: 32, width: X(x[1] + 1) - X(x[0]), height: 16, fill: 'var(--accent)', opacity: on ? 0.55 : 0.25, stroke: on ? 'var(--accent)' : 'none', 'stroke-width': 1.5 }));
        var c = CDS[i];
        g.appendChild(el('rect', { x: X(c[0]), y: 26, width: X(c[1] + 1) - X(c[0]), height: 28, fill: 'var(--accent)', opacity: on ? 1 : 0.7 }));
        g.appendChild(el('text', { x: (X(x[0]) + X(x[1] + 1)) / 2, y: 18, 'text-anchor': 'middle', class: 'lab' }, 'exon ' + (i + 1)));
        svg.appendChild(g);
      });
      svg.appendChild(el('text', { x: X(EX[2][1] + 1) + 4, y: 44 }, '→ +'));
    }
    function note() {
      var x = EX[sel], c = CDS[sel], len = x[1] - x[0] + 1, s0 = EX[0][0] - 1;
      var t = '<b>Exon ' + (sel + 1) + '</b>, ' + len + ' bases. GFF3/GTF: start ' + x[0] + ', end ' + x[1] + ' (both counted, so length = end − start + 1). ' +
        'BED12: block start ' + (x[0] - 1 - s0) + ' + chromStart ' + s0 + ' = ' + (x[0] - 1) + ', plus block size ' + len + ' gives end ' + x[1] + ', which is not included; so the last base is the same one GFF calls ' + x[1] + '.';
      t += ' Coding part: ' + c[0] + '–' + c[1] + ', ' + tip('phase', 'Phase (GFF3) / frame (GTF): bases to skip at the start of this CDS piece before the next whole codon begins.') + ' ' + PH[sel] + '.';
      if (sel === 0) t += ' The coding part starts at 1-based base 151, which BED writes as thickStart 150.';
      if (sel > 0) t += ' The CDS before it ended part-way through a codon, so ' + PH[sel] + ' bases here finish that codon.';
      $('s01-fnote').innerHTML = t;
    }
    function drawF() { drawTxt(); drawSvg(); note(); }
    $('s01-fseg').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      fmtSel = b.getAttribute('data-f'); press(this, b); drawF();
    });
    function pick(e) {
      var t = e.target.closest('[data-e]'); if (!t) return;
      var v = +t.getAttribute('data-e'); if (v >= 0) { sel = v; drawF(); }
    }
    $('s01-fsvg').addEventListener('click', pick);
    $('s01-fsvg').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e); } });
    $('s01-ftxt').addEventListener('click', pick);
    drawF();
  } catch (err) { if (window.console) console.warn('s01 formats', err); }
})();
