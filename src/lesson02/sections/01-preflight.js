(function(){
  var $ = function(id){ return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, txt){ var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (txt != null) e.textContent = txt; return e; }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  var COL = { good:'var(--good)', warn:'var(--het)', bad:'var(--bad)', na:'var(--err)' };

  /* ---------- copy buttons (only if not already bound by the page) ---------- */
  var wrap = $('s01-wrap');
  if (wrap) wrap.querySelectorAll('.code button').forEach(function(b){
    if (b.dataset.bound) return; b.dataset.bound = '1';
    b.addEventListener('click', function(){
      var t = b.nextElementSibling ? b.nextElementSibling.innerText : '';
      try { navigator.clipboard.writeText(t).then(function(){ b.textContent = 'copied'; setTimeout(function(){ b.textContent = 'copy'; }, 1400); }, function(){}); } catch(e) {}
    });
  });

  /* ---------- Q -> error-free k-mers ---------- */
  function drawQ(){
    var q = +$('s01-q').value, k = +$('s01-qk').value;
    $('s01-qo').textContent = q; $('s01-qko').textContent = k;
    var e = Math.pow(10, -q/10), ok = Math.pow(1 - e, k);
    var svg = $('s01-qsvg'); if (!svg) return; svg.innerHTML = '';
    var x0 = 20, w = 720, cells = Math.min(k, 51), cw = w / 51;
    svg.appendChild(el('text', {x:x0, y:16, 'class':'lab'}, 'one k-mer of ' + k + ' bases: every base must be right'));
    for (var i = 0; i < cells; i++) {
      var p = 1 - e; // shade by per-base correctness (all equal)
      svg.appendChild(el('rect', {x: x0 + i*cw, y: 24, width: cw - 2, height: 18, rx: 2, fill: 'var(--accent)', opacity: (0.35 + 0.65*p).toFixed(2)}));
    }
    svg.appendChild(el('text', {x:x0, y:66, 'class':'lab'}, 'share of k-mers with no error'));
    svg.appendChild(el('rect', {x:x0, y:74, width:w, height:20, rx:2, fill:'var(--code-bg)', stroke:'var(--line)'}));
    var colr = ok >= 0.75 ? 'var(--good)' : ok >= 0.4 ? 'var(--het)' : 'var(--bad)';
    svg.appendChild(el('rect', {x:x0, y:74, width:Math.max(1, w*ok), height:20, rx:2, fill:colr}));
    var lx = Math.min(x0 + w*ok + 6, x0 + w - 60);
    svg.appendChild(el('text', {x: lx, y: 110, 'class':'lab'}, (100*ok).toFixed(1) + ' %'));
    var per = Math.round(1/e);
    $('s01-qtxt').innerHTML = 'Q' + q + ' = about 1 error in ' + per.toLocaleString('en') + ' bases (' + (100*e).toFixed(e < 0.001 ? 3 : 2) + ' %). With k = ' + k + ', <b>' + (100*ok).toFixed(1) + ' %</b> of k-mers carry no error; the rest are noise that tools must recognise and throw away.';
  }
  ['s01-q','s01-qk'].forEach(function(id){ var x = $(id); if (x) x.addEventListener('input', drawQ); });

  /* ---------- presets ---------- */
  var P = {
    spa: { gk:2.6, gf:2.7, het:0.4, pl:'2', rep:30, sr:0, lt:'cyc', lr:40, n50:10, q:16, hic:0, trio:false, ct:false,
      note:'Toy values like species A (rounded, not the real data): long reads only. Independent size = a published relative\'s assembly. Platform: probably CycloneSEQ (written as ONT R10.4.1; not confirmed by the provider).' },
    spb: { gk:'', gf:'', het:'', pl:'2', rep:'', sr:30, lt:'cyc', lr:25, n50:3, q:17, hic:0, trio:false, ct:false,
      note:'Toy values like species B (rounded, not the real data). No genome-size estimate or heterozygosity was made before assembly (Flye got a round guess).' },
    spc: { gk:'', gf:'', het:'', pl:'2', rep:'', sr:30, lt:'cyc', lr:9, n50:5, q:16, hic:0, trio:false, ct:false,
      note:'Toy values like species C (rounded, not the real data). Same as B, with less than half the long-read output but longer reads.' },
    spd: { gk:'', gf:'', het:'', pl:'2', rep:'', sr:70, lt:'none', lr:0, n50:'', q:'', hic:0, trio:false, ct:false,
      note:'Toy values like species D (rounded, not the real data): short reads only. Coverage is uncertain by a factor of four, in case the four lane files are copies of one another (not yet checked). 70 is filled in; try 280 too: the route does not change.' },
    dmo: { gk:'', gf:'', het:'', pl:'2', rep:'', sr:89, lt:'none', lr:0, n50:'', q:'', hic:0, trio:false, ct:false,
      note:'<i>Desmana moschata</i> R8, the animal of the published assembly: Illumina PCR libraries, ~89× read coverage. Size and heterozygosity are not in our record.' },
    vgp: { gk:1.0, gf:1.05, het:0.8, pl:'2', rep:40, sr:40, lt:'hifi', lr:32, n50:18, q:25, hic:65, trio:false, ct:false,
      note:'A made-up textbook case (not a real sample): a 1 Gb diploid with HiFi and Hi-C at the VGP coverages.' }
  };
  var F = ['gk','gf','het','pl','rep','sr','lt','lr','n50','q2','hic'];
  function setPreset(key){
    var p = P[key]; if (!p) return;
    $('s01-gk').value = p.gk; $('s01-gf').value = p.gf; $('s01-het').value = p.het; $('s01-pl').value = p.pl; $('s01-rep').value = p.rep;
    $('s01-sr').value = p.sr; $('s01-lt').value = p.lt; $('s01-lr').value = p.lr; $('s01-n50').value = p.n50; $('s01-q2').value = p.q;
    $('s01-hic').value = p.hic; $('s01-trio').checked = p.trio; $('s01-ct').checked = p.ct;
    $('s01-pnote').innerHTML = p.note;
    document.querySelectorAll('#s01-presets button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.p === key ? 'true' : 'false'); });
    evaluate();
  }
  var pr = $('s01-presets');
  if (pr) pr.querySelectorAll('button').forEach(function(b){ b.addEventListener('click', function(){ setPreset(b.dataset.p); }); });

  function num(id){ var v = $(id) ? $(id).value : ''; if (v === '' || v == null) return null; var n = parseFloat(v); return isFinite(n) ? n : null; }

  /* ---------- verdicts ---------- */
  var LT = { none:'none', hifi:'PacBio HiFi', r10:'ONT R10', r9:'ONT R9 (Guppy5+)', old:'ONT older', cyc:'CycloneSEQ', clr:'PacBio CLR' };
  function evaluate(){
    var gk = num('s01-gk'), gf = num('s01-gf'), het = num('s01-het'), pl = $('s01-pl').value, rep = num('s01-rep');
    var sr = num('s01-sr') || 0, lt = $('s01-lt').value, lr = num('s01-lr') || 0, n50 = num('s01-n50'), q = num('s01-q2'), hic = num('s01-hic') || 0;
    var trio = $('s01-trio').checked, ct = $('s01-ct').checked;
    var hasLR = lt !== 'none' && lr > 0;
    var rows = [];
    function R(st, item, val, txt){ rows.push({st:st, item:item, val:val, txt:txt}); }

    // genome size
    var G = gf || gk;
    if (gk == null && gf == null) R('warn', 'Genome size', 'not given', 'No size: you cannot check coverage, the expected assembly length or NG50. Run GenomeScope (lesson 1) and look up a C-value or a relative. Two of our projects went in with a round guess and came out about a fifth larger.');
    else if (gk != null && gf != null && gf > 0) {
      var d = (gk - gf) / gf * 100, ds = (d >= 0 ? '+' : '') + d.toFixed(1) + ' %';
      if (Math.abs(d) <= 10) R('good', 'Genome size', gk + ' vs ' + gf + ' Gb (' + ds + ')', 'The two estimates agree within 10 % (course rule of thumb). Use the independent figure as the expected assembly length.');
      else if (d < 0) R('warn', 'Genome size', gk + ' vs ' + gf + ' Gb (' + ds + ')', 'The k-mer estimate is low: high-copy repeats outside the model, too low a <code>-cs</code>/<code>-h</code> count limit, or long-read k-mers. Plan with the independent figure.');
      else R('warn', 'Genome size', gk + ' vs ' + gf + ' Gb (' + ds + ')', 'The k-mer estimate is high: check that GenomeScope did not take the heterozygous peak for the homozygous one (size doubles), and look for contamination.');
    } else R('warn', 'Genome size', (gk != null ? gk : gf) + ' Gb (one source only)', 'Only one estimate. A second, independent figure (flow cytometry, C-value, a relative) catches repeat loss and wrong-peak errors.');

    // heterozygosity
    if (het == null) R('warn', 'Heterozygosity', 'not given', 'Unknown: you cannot tell whether duplicate removal or phasing data are needed. GenomeScope needs ≥15× of low-error reads (README).');
    else if (het < 0.1) R('good', 'Heterozygosity', het + ' %', 'Low. A collapsed assembly is fine (Flye FAQ: ~0.1 % "should not be a problem"). For an inbred animal use hifiasm <code>-l0</code>. purge_dups cutoffs may be too high: check them by eye.');
    else if (het <= 1.5) R('good', 'Heterozygosity', het + ' %', 'Typical diploid. hifiasm removes haplotype duplicates itself; after Flye run purge_dups (s06).');
    else R('warn', 'Heterozygosity', het + ' %', 'High (above ~1.5 %, course rule of thumb). Both haplotypes assemble separately: purge duplicates (s06) and add Hi-C or parental reads for phasing (s07).');

    // ploidy
    if (pl === '') R('warn', 'Ploidy', 'unknown', 'Check with Smudgeplot or a chromosome count before choosing an assembler.');
    else if (pl === '1') R('good', 'Ploidy', 'haploid', 'One copy: nothing to phase; hifiasm <code>-l0</code> (no duplicate removal).');
    else if (pl === '2') R('good', 'Ploidy', 'diploid', 'What hifiasm, Flye, purge_dups and GenomeScope (default p = 2) are built for.');
    else R('bad', 'Ploidy', pl === '3' ? 'triploid' : 'tetraploid or more', 'hifiasm\'s contig modules are designed for diploids (FAQ); Flye collapses all copies. A specialised polyploid route is needed; it is outside this lesson.');

    // short reads
    if (sr <= 0) {
      if (hasLR) R('warn', 'Short reads', 'none', 'No independent accurate reads: no reliable k-mer QV after assembly (EBP asks for high-accuracy short reads or HiFi for Merqury), and no short-read polishing of homopolymer errors.');
      else R('bad', 'Short reads', 'none', 'No reads of any kind entered.');
    } else if (sr < 15) R('bad', 'Short reads', sr + '×', 'Below GenomeScope\'s minimum of 15× (README): profiling unreliable; too thin for a short-read assembly.');
    else if (sr < 30 && !hasLR) R('warn', 'Short reads', sr + '×', 'Enough for profiling, polishing and Merqury; thin for a short-read-only assembly (ABySS\'s k advice assumes 40×).');
    else R('good', 'Short reads', sr + '×', hasLR ? 'Good for profiling, polishing (s06) and Merqury QV (s08).' : 'Enough depth for a short-read assembly (s03). Depth will not fix repeats.');

    // long reads: coverage, length, accuracy
    var lrRoute = null;
    if (lt === 'none' || lr <= 0) {
      R(sr >= 15 ? 'warn' : 'bad', 'Long reads', 'none', 'Short-read-only assembly: in a mammal-size genome expect contig N50 of tens of kb (our desman assemblies: 43–65 kb) and holes at every young repeat family.');
    } else {
      var hifi = lt === 'hifi';
      if (lr < 10) R('bad', 'Long-read coverage', lr + '×', 'Below 10×: Flye FAQ "not recommended". In our projects, species C at about 10× gave less than half the contig N50 and about 10 points less BUSCO than species B at about 2.5 times the coverage.');
      else if (hifi && lr < 26) R('warn', 'Long-read coverage', lr + '×', 'Below hifiasm\'s "≥13x HiFi reads per haplotype" for a diploid (FAQ).');
      else if (lr < 30) R('warn', 'Long-read coverage', lr + '×', hifi ? 'Meets hifiasm\'s minimum; VGP asks for at least 30× HiFi.' : 'Flye: "you might have success with 20-30x"; 30×+ gives "satisfying contiguity".');
      else R('good', 'Long-read coverage', lr + '×', hifi ? 'Meets VGP\'s 30× HiFi (up to 60× helps highly repetitive regions).' : 'Flye: 30×+ gives "satisfying contiguity" if reads are long enough.');

      if (n50 == null) R('warn', 'Read N50', 'not given', 'Measure it (NanoPlot or seqkit stats -a -N 50,90). Flye wants read N90 above 1 kb, 5 kb+ recommended.');
      else if (n50 < 1) R('bad', 'Read N50', n50 + ' kb', 'Most reads are under 1 kb: Flye "will not work with reads shorter than 1kb"; hifiasm --ont drops them by default.');
      else if (n50 < 5) R('warn', 'Read N50', n50 + ' kb', 'Short for long reads: Flye recommends read N90 of 5 kb+. Contigs will break at every repeat longer than the reads (species B: read N50 under 3 kb → contig N50 of a few hundred kb).');
      else R('good', 'Read N50', n50 + ' kb', 'Long enough for Flye\'s recommendation if N90 is also ≥5 kb (check it). Longer reads still mean longer contigs (species A: read N50 above 10 kb → contig N50 above 10 Mb with hifiasm).');

      var qs;
      if (q == null) { R('warn', 'Read accuracy', 'not given', 'Measure mean Q (seqkit AvgQual or NanoPlot); it decides the assembler mode.'); }
      else {
        var err = (100*Math.pow(10, -q/10)).toFixed(q >= 30 ? 3 : 1) + ' % error';
        if (hifi) {
          if (q >= 20) R('good', 'Read accuracy', 'Q' + q + ' (' + err + ')', 'HiFi quality (<1 % error, Flye --pacbio-hifi). hifiasm default mode.');
          else R('warn', 'Read accuracy', 'Q' + q + ' (' + err + ')', 'Below HiFi accuracy (Q20). Check the CCS filtering with the provider.');
        } else if (lt === 'clr') {
          R('warn', 'Read accuracy', 'Q' + q + ' (' + err + ')', 'PacBio CLR: Flye --pacbio-raw (13–15 % error expected). hifiasm does not take CLR reads.');
        } else {
          if (q < 10) R('bad', 'Read accuracy', 'Q' + q + ' (' + err + ')', 'Below Q10: hifiasm --ont removes such reads by default (--sc-cut 10); only Flye <code>--nano-raw</code> (10–15 % error) fits.');
          else if (q < 13) R('warn', 'Read accuracy', 'Q' + q + ' (' + err + ')', 'Noisy (5–10 % error): Flye <code>--nano-raw</code>.');
          else if (q < 15) R('warn', 'Read accuracy', 'Q' + q + ' (' + err + ')', 'Under 5 % error: Flye <code>--nano-hq --read-error 0.05</code> (Flye\'s advice for R9 Guppy5+).');
          else R('good', 'Read accuracy', 'Q' + q + ' (' + err + ')', 'Under ~3 % error: Flye <code>--nano-hq</code>, and worth trying hifiasm <code>--ont</code> (species A: mean quality below Q20, yet its best assembly came from hifiasm --ont).');
        }
      }
      if (lt === 'cyc') R('warn', 'Platform', 'CycloneSEQ', 'Not ONT: no tool document names it. Pick the assembler mode by the measured error rate, and do not use ONT-trained models (Medaka, Clair3) for polishing or variant calling.');
      if (lt === 'old' && q != null && q >= 13) R('warn', 'Platform', 'old ONT', 'Q looks high for old chemistry: check the read type with the provider.');
    }

    // Hi-C / trio
    if (trio) R('good', 'Phasing data', 'parents\' reads', 'Trio binning: hifiasm FAQ "should be always preferred" (needs HiFi or ONT long reads of the offspring).');
    if (hic <= 0) R('warn', 'Hi-C', 'none', 'Contigs only, no chromosomes, so the "C" in 6.C.Q40 is out of reach. Order Hi-C from the same animal (VGP: ~60×).');
    else if (hic < 60) R('warn', 'Hi-C', hic + '×', 'Usable for scaffolding (s05) and phasing (s07); VGP suggests around 60×.');
    else R('good', 'Hi-C', hic + '×', 'Meets the VGP suggestion of ~60×: scaffold with YaHS (s05), phase with hifiasm --h1/--h2 (s07).');

    // contamination / organelles / repeats
    if (ct) R('warn', 'Foreign DNA', 'signs seen', 'Remove reads of a known contaminant (BBSplit, lesson 1) or contigs after assembly (FCS-GX, s09).');
    else R('good', 'Foreign DNA', 'no signs', 'Screen the assembly anyway (FCS-GX, s09).');
    R('na', 'Organelles', 'always', 'Expect mitochondrial contigs (sometimes several copies joined) and NUMTs; assemble the mitogenome separately and remove its contigs (s11).');
    if (rep == null) R('na', 'Repeats', 'not given', 'Optional: (GenomeScope length − unique length) ÷ length.');
    else R(rep > 40 && !hasLR ? 'warn' : 'na', 'Repeats', rep + ' %', hasLR ? 'Long reads span repeats shorter than the reads.' : 'With short reads each repeat copy longer than ~2 × (k − 1) breaks contigs (s03).' + (rep > 40 ? ' At this level, long reads are the real fix.' : ''));

    // overall
    var nb = rows.filter(function(r){ return r.st === 'bad'; }).length, nw = rows.filter(function(r){ return r.st === 'warn'; }).length;
    var ov = $('s01-overall');
    if (nb) { ov.textContent = 'No-go: ' + nb + ' item' + (nb > 1 ? 's' : '') + ' to fix first (and ' + nw + ' caveat' + (nw === 1 ? '' : 's') + ').'; ov.style.color = 'var(--bad)'; }
    else if (nw) { ov.textContent = 'Go, with ' + nw + ' caveat' + (nw > 1 ? 's' : '') + ' to keep in mind.'; ov.style.color = 'var(--het)'; }
    else { ov.textContent = 'Go.'; ov.style.color = 'var(--good)'; }

    var tb = $('s01-rows'); tb.innerHTML = '';
    rows.forEach(function(r){
      var tr = document.createElement('tr');
      tr.innerHTML = '<td><svg viewBox="0 0 14 14" width="14" height="14" aria-label="' + r.st + '"><circle cx="7" cy="7" r="6" fill="' + COL[r.st] + '"/></svg></td><td><b>' + esc(r.item) + '</b></td><td class="mono" style="white-space:nowrap">' + esc(r.val) + '</td><td>' + linkify(r.txt) + '</td>';
      tb.appendChild(tr);
    });

    route({ sr:sr, lt:lt, lr:lr, q:q, n50:n50, hic:hic, trio:trio, het:het, pl:pl, hasLR:hasLR, G:G });
    gbHelper();
  }
  function linkify(s){ return s.replace(/\b(s0[2-9]|s1[0-3])\b/g, '<a href="#$1">$1</a>'); }

  /* ---------- route ---------- */
  function route(o){
    var steps = [], txt = [];
    var lrOK = o.hasLR && o.lr >= 10 && (o.n50 == null || o.n50 >= 1) && (o.q == null || o.q >= 10 || o.lt === 'old' || o.lt === 'clr');
    var asm, asmSt, purge, polish, scaf, prod, link = 's04';
    if (o.pl === '3' || o.pl === '4') {
      asm = 'polyploid route'; asmSt = 'bad'; purge = '—'; polish = '—'; scaf = o.hic > 0 ? 'YaHS' : 'none'; prod = 'see specialist tools';
      txt.push('Polyploid: hifiasm\'s and Flye\'s contig modules assume a diploid. Not covered here.');
    } else if (lrOK && o.lt === 'hifi') {
      asm = 'hifiasm' + (o.trio ? ' -1/-2' : o.hic > 0 ? ' --h1/--h2' : ''); asmSt = 'good';
      purge = o.pl === '1' || (o.het != null && o.het < 0.1) ? 'none (-l0)' : 'built in'; polish = 'not needed';
      txt.push('<b>Assembler:</b> hifiasm on HiFi reads (<a href="#s04">s04</a>). Its README: duplicate removal is built in and it "does not need polishing tools".');
    } else if (lrOK && (o.lt === 'r10' || o.lt === 'cyc') && o.q != null && o.q >= 15) {
      asm = 'hifiasm --ont + Flye'; asmSt = o.lt === 'cyc' ? 'warn' : 'good';
      purge = 'built in / purge_dups'; polish = o.sr >= 15 ? 'short reads' : 'needs short reads';
      txt.push('<b>Assembler:</b> try both hifiasm <code>--ont</code> and Flye <code>--nano-hq</code> and compare (<a href="#s04">s04</a>). Duplicates: built into hifiasm; purge_dups after Flye (<a href="#s06">s06</a>).');
      txt.push('<b>Polishing:</b> ' + (o.sr >= 15 ? 'with the short reads, which also give an independent QV (<a href="#s06">s06</a>, <a href="#s08">s08</a>).' : 'nanopore-type reads leave homopolymer errors that the same reads cannot fix; add short reads of the same animal for gene-level work (<a href="#s06">s06</a>).'));
    } else if (lrOK && o.lt !== 'hifi') {
      var mode = o.lt === 'clr' ? '--pacbio-raw' : (o.q != null && o.q >= 13) ? '--nano-hq' + (o.q < 15 ? ' --read-error 0.05' : '') : '--nano-raw';
      asm = 'Flye ' + mode; asmSt = (o.lr < 30 || (o.n50 != null && o.n50 < 5)) ? 'warn' : 'good';
      purge = 'purge_dups'; polish = o.sr >= 15 ? 'short reads' : 'long reads only';
      txt.push('<b>Assembler:</b> Flye <code>' + mode + '</code> (<a href="#s04">s04</a>), then purge_dups and polishing (<a href="#s06">s06</a>). Flye gives one collapsed copy of each region.');
    } else if (o.sr >= 15) {
      asm = 'short-read assembler'; asmSt = 'warn'; link = 's03';
      purge = 'check after assembly'; polish = 'optional';
      txt.push('<b>Assembler:</b> short reads only (<a href="#s03">s03</a>): ABySS, MEGAHIT or SPAdes (with <code>--isolate</code>; SPAdes\' manual advises against <code>--careful</code> for large eukaryotes). ABySS\'s README: for 2×150 reads at 40×, k is "often around 70 to 90". Memory first (<a href="#s02">s02</a>).');
    } else {
      asm = 'not enough data'; asmSt = 'bad'; purge = '—'; polish = '—'; link = 's02';
      txt.push('<b>No-go:</b> no read set meets the minimum coverage. Sequence more before assembling.');
    }
    if (!scaf) scaf = o.hic > 0 ? 'YaHS + Hi-C' : 'none';
    if (!prod) {
      if (asm.indexOf('hifiasm') === 0 || asm.indexOf('hifiasm') > -1) prod = o.trio ? 'mat + pat haplotypes' : o.hic > 0 ? 'hap1 + hap2 (Hi-C phased)' : 'primary + partial hap1/hap2';
      else if (asmSt === 'bad') prod = '—';
      else prod = 'one collapsed copy';
    }
    txt.push('<b>Scaffolding:</b> ' + (o.hic > 0 ? 'Hi-C with YaHS (<a href="#s05">s05</a>).' : 'none possible without Hi-C or a similar map: the result is contig level. Placing contigs on a relative (RagTag) imposes the relative\'s chromosome order (<a href="#s05">s05</a>).'));
    txt.push('<b>Product:</b> ' + prod + ' (<a href="#s07">s07</a>). <b>Then always:</b> quality metrics (<a href="#s08">s08</a>), FCS-GX (<a href="#s09">s09</a>), BUSCO (<a href="#s10">s10</a>), mitogenome (<a href="#s11">s11</a>).');

    var nodes = [
      { t:'reads', s: o.hasLR ? LT[o.lt] + ' ' + o.lr + '×' : (o.sr > 0 ? 'short ' + o.sr + '×' : 'none'), st: (o.hasLR || o.sr >= 15) ? 'good' : 'bad' },
      { t:'assemble', s: asm, st: asmSt },
      { t:'purge', s: purge, st: purge === '—' ? 'na' : 'good' },
      { t:'polish', s: polish, st: polish === 'needs short reads' || polish === 'long reads only' ? 'warn' : polish === '—' ? 'na' : 'good' },
      { t:'scaffold', s: scaf, st: o.hic > 0 ? 'good' : 'warn' },
      { t:'product', s: prod, st: prod === '—' ? 'na' : 'good' }
    ];
    var svg = $('s01-route'); svg.innerHTML = '';
    var bw = 142, gap = 18, x0 = 8, y = 34, h = 96;
    svg.appendChild(el('text', {x:x0, y:22, 'class':'lab'}, 'suggested route (sections in brackets)'));
    var secs = ['', link, 's06', 's06', 's05', 's07'];
    nodes.forEach(function(n, i){
      var x = x0 + i*(bw + gap);
      svg.appendChild(el('rect', {x:x, y:y, width:bw, height:h, rx:5, fill:'var(--panel)', stroke:COL[n.st], 'stroke-width':2.2}));
      svg.appendChild(el('rect', {x:x, y:y, width:bw, height:6, rx:2, fill:COL[n.st]}));
      svg.appendChild(el('text', {x:x + 8, y:y + 26, 'class':'lab', style:'font-weight:600'}, n.t + (secs[i] ? ' (' + secs[i] + ')' : '')));
      wrapText(n.s, 19).slice(0, 3).forEach(function(line, j){
        svg.appendChild(el('text', {x:x + 8, y:y + 48 + j*16}, line));
      });
      if (i < nodes.length - 1) {
        var ax = x + bw + 2;
        svg.appendChild(el('path', {d:'M' + ax + ' ' + (y + h/2) + ' h' + (gap - 6) + ' m-5 -4 l5 4 l-5 4', fill:'none', stroke:'var(--muted)', 'stroke-width':1.5}));
      }
    });
    $('s01-routetxt').innerHTML = txt.map(function(t){ return '<li>' + t + '</li>'; }).join('');
  }
  function wrapText(s, n){
    var w = String(s).split(' '), out = [], cur = '';
    w.forEach(function(x){ if ((cur + ' ' + x).trim().length > n && cur) { out.push(cur); cur = x; } else cur = (cur + ' ' + x).trim(); });
    if (cur) out.push(cur); return out;
  }

  function gbHelper(){
    var gb = num('s01-gb'), G = num('s01-gf') || num('s01-gk'), o = $('s01-gbout');
    if (!o) return;
    if (!G) { o.textContent = '→ enter a genome size first'; return; }
    if (gb == null) { o.textContent = '→ coverage = Gb of reads ÷ ' + G + ' Gb'; return; }
    o.textContent = '→ ' + (gb / G).toFixed(1) + '× of a ' + G + ' Gb genome';
  }

  ['s01-gk','s01-gf','s01-het','s01-pl','s01-rep','s01-sr','s01-lt','s01-lr','s01-n50','s01-q2','s01-hic','s01-trio','s01-ct','s01-gb'].forEach(function(id){
    var x = $(id); if (!x) return;
    x.addEventListener('input', function(){
      if (id !== 's01-gb') { $('s01-pnote').textContent = ''; document.querySelectorAll('#s01-presets button').forEach(function(b){ b.setAttribute('aria-pressed', 'false'); }); }
      try { evaluate(); } catch(e) {}
    });
    x.addEventListener('change', function(){ try { evaluate(); } catch(e) {} });
  });

  try { drawQ(); setPreset('spa'); } catch(e) { if (window.console) console.error(e); }
})();
