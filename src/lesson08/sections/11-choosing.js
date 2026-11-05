(function(){
  var qSel = document.getElementById('s11-q'), tSel = document.getElementById('s11-t'), mSel = document.getElementById('s11-m');
  var out = document.getElementById('s11-out'), tbody = document.querySelector('#s11-all tbody');
  if (!qSel || !tSel || !mSel || !out) return;

  var QN = { exact: 'Exact string', short: 'Short oligo, mismatches', query: 'Longer query, diverged copies',
             map: 'Map all reads', region: 'Reads of one locus', comp: 'Composition or similarity' };
  var TN = { small: 'Small target', genome: 'One genome', reads: 'Read library' };

  // section links: [label, href]
  var L = {
    s02: ['section 02: line tools', '#s02'], s04: ['section 04: hashing', '#s04'], s05: ['section 05: worked example', '#s05'],
    s06: ['section 06: alignment as scoring', '#s06'], s07: ['section 07: seed and extend', '#s07'],
    s08: ['section 08: indexing', '#s08'], s09: ['section 09: mappers', '#s09'], s10: ['section 10: whole data sets', '#s10'],
    l6: ['lesson 7, section 02: finding copies', '../07-sines-satellites/#s02'], l1: ['lesson 1: k-mers', '../01-pre-assembly/#km']
  };
  function R(tool, why, cmd, watch, links){ return { tool: tool, why: why, cmd: cmd, watch: watch, links: links.map(function(k){ return L[k]; }) }; }

  function pick(q, t, m){
    var many = m === 'many';
    if (q === 'exact'){
      if (t === 'small') return R('grep -F',
        'The target is small, so a scan is instant and there is nothing to build. <code>-F</code> means the pattern is a fixed string, not a regular expression.' + (many ? ' For many different strings put them in a file and use <code>-f</code>; for thousands, a hash set (section 04) is the better structure.' : ''),
        'grep -n -F -e ACGTTGCATC -e GATGCAACGT contigs.unwrapped.txt', 'Give both the string and its reverse complement. Join wrapped FASTA lines first.', many ? ['s02', 's04'] : ['s02']);
      if (t === 'genome') return many
        ? R('Index the genome once, then ask many times',
            'A scan reads the whole genome for every question. When you ask again and again, an index (FM-index or hash, section 08) answers each question without rereading it. For strings under about 70 bases the <code>bwa aln</code> route is the one its README gives for short reads.',
            'bwa index genome.fa\nbwa aln genome.fa oligos.fq > oligos.sai', 'The index costs time and memory once. It pays only if you really will ask many times (our reasoning).', ['s08', 's09'])
        : R('grep -F',
            'One string, one pass over one genome: a scan is as fast as anything you could build for a single question.',
            'grep -c -F -e ACGTTGCATCGA -e TCGATGCAACGT genome.unwrapped.txt', 'Wrapped lines hide matches that cross a line break: join the sequence lines of each record first. Both strands.', ['s02']);
      return many
        ? R('A k-mer hash set, read in one pass',
            'Thousands of strings against millions of reads: running <code>grep</code> once per string rereads the library each time. A hash set of the strings is checked once per read position (section 04). Section 05 measures the gain on a real library.',
            '# one pass over the reads, all strings in one hash set (design in section 05)', 'Reading and decompressing the data, not matching, becomes the limit (section 05).', ['s04', 's05'])
        : R('grep -F on the decompressed stream',
            'A handful of strings against a library: <code>grep -F</code> is enough. Do not build a mapper index for it.',
            'zcat reads.fq.gz | grep -c -F ACGTTGCATCGA', 'Count lines, not reads, if a string can occur twice in a read. The reverse complement is a separate search.', ['s02', 's05']);
    }
    if (q === 'short'){
      if (t === 'small') return R('Approximate matching (agrep) or ssearch36',
        'A tiny target allows an exhaustive search. <code>agrep</code> finds a string with up to k errors; <code>ssearch36</code> is full Smith-Waterman and cannot miss a match that scores above its cutoff.',
        'ssearch36 -n -m 8 -E 10 oligos.fa bank.fa > hits.m8', 'Look at the cutoff: a 20-mer has few positions that can score high, so an E-value threshold that suits long queries hides short ones.', ['s02', 's06']);
      if (t === 'genome') return many
        ? R('bwa aln with an index built once',
            'The bwa README recommends <code>bwa aln</code> for Illumina reads shorter than about 70 bp, and <code>bwa mem</code> above that. The same logic holds for oligos. Building the index once makes each further search quick.',
            'bwa index genome.fa\nbwa aln genome.fa oligos.fq > oligos.sai', 'Short queries often match many places; read the mapping quality (section 09).', ['s08', 's09'])
        : R('blastn -task blastn-short',
            'The default <code>megablast</code> task has word size 28: a 25 nt oligo cannot seed. The <code>blastn-short</code> task, made for sequences shorter than 50 bases, uses word size 7, E-value threshold 1000 and no low-complexity filtering.',
            'blastn -task blastn-short -query oligos.fa -subject genome.fa -outfmt 6', 'Check the E-value and the number of mismatches yourself: a threshold of 1000 lets weak hits in.', ['s07']);
      return R('BBDuk (k-mer matching against the reads)',
        'BBDuk compares reads with the k-mers of a reference list, "optionally allowing an edit distance", and writes matching and non-matching reads to separate files. It is made for adapters, barcodes and known contaminants.',
        'bbduk.sh in=reads.fq out=clean.fq outm=hits.fq ref=oligos.fa', 'Its default k-mer length is 27, longer than a short oligo: set k to fit the oligo (see the BBDuk help).', ['s10', 's04']);
    }
    if (q === 'query'){
      if (t === 'small') return R('ssearch36 (full Smith-Waterman)',
        'The target is small, so the exhaustive method is quick, and it is the most sensitive. No index, no heuristic to tune.',
        'ssearch36 -n -m 8 -E 1e-5 query.fa bank.fa > hits.m8', 'Parse the table, then look at the alignments you rely on.', ['s06']);
      if (t === 'genome') return many
        ? R('Index the genome once (a BLAST database, or a saved minimap2 index)',
            'Many queries against one genome: build the index once and reuse it. BLAST builds a database with <code>makeblastdb</code>; minimap2 can save its index with <code>-d</code>, built with the same <code>-x</code> preset you will map with (section 09).',
            'makeblastdb -in genome.fa -dbtype nucl -out genome_db\nblastn -task blastn -query queries.fa -db genome_db -outfmt 6', 'Heuristics miss short, diverged, high-copy sequences. For repeats, compare with an exhaustive search on a sample (lesson 7).', ['s08', 's07', 'l6'])
        : R('blastn (task blastn) or minimap2; ssearch36 on windows for old repeats',
            'For a gene or exon in a related genome, seed-and-extend is fast and good. For old, diverged repeats it misses copies, and the exhaustive method on windows of the genome is the reference (lesson 7, section 02). The <code>asm5</code> preset of minimap2 is meant for assembly-to-reference alignment.',
            'blastn -task blastn -query query.fa -subject genome.fa -outfmt 6', 'Do not leave megablast defaults for a diverged query: its word size is 28.', ['s07', 's06', 'l6']);
      return R('Make the small query the reference and map the reads to it',
        'A library is large, the query is small. Index the query (a tiny, instant index) and stream the reads past it, instead of indexing the library.',
        'minimap2 -ax sr query.fa reads_1.fq reads_2.fq > aln.sam\n# long reads: -ax map-ont or -ax map-hifi', 'Reads of a repeated sequence will also come from copies elsewhere. Say that in the result.', ['s09']);
    }
    if (q === 'map'){
      if (t === 'small') return R('minimap2 or bwa mem, no separate index step',
        'A small reference is indexed in a moment. minimap2 builds the index while it runs; with a small reference there is nothing to save.',
        'minimap2 -ax sr ref.fa reads_1.fq reads_2.fq > aln.sam', 'Choose the preset for the read type: sr, map-ont, map-hifi.', ['s09']);
      if (t === 'genome') return R('minimap2 (short or long reads) or bwa mem (reads over about 70 bp)',
        'Millions of reads are millions of queries, so an index of the genome always pays. The minimap2 README gives <code>-ax sr</code> for short reads and <code>map-ont</code> or <code>map-hifi</code> for long reads; the bwa README recommends <code>bwa mem</code> for reads over about 70 bp.' + (many ? ' Build the index once and keep it.' : ''),
        many ? 'minimap2 -d genome.mmi genome.fa\nminimap2 -ax map-hifi genome.mmi reads.fq.gz | samtools sort -o reads.bam\nsamtools index reads.bam'
             : 'minimap2 -ax map-hifi genome.fa reads.fq.gz | samtools sort -o reads.bam\nsamtools index reads.bam',
        'Sort and index the BAM: every later question about a region then takes seconds (see "reads of one locus").', ['s08', 's09']);
      return R('Not mapping: overlap the reads with each other',
        'Mapping needs a reference. When the "target" is a read library itself, the question is overlap, which minimap2 has presets for (<code>ava-pb</code>, <code>ava-ont</code>).',
        'minimap2 -x ava-ont reads.fa reads.fa > overlaps.paf', 'Quadratic work: the library is searched against itself. Ask whether a small piece of it would answer your question.', ['s09']);
    }
    if (q === 'region') return R('samtools view on the sorted, indexed BAM',
      'Asking an indexed BAM for a region needs no mapping at all; the index jumps straight to the right place. Regions need a coordinate-sorted, indexed BAM, or a CRAM, its more compressed cousin (samtools manual).' + (many ? ' Keep the BAM and its index so every next region is as quick.' : ' If no BAM exists yet, map once (see "map all reads"), index it, and keep it.'),
      'samtools view -b -F 0x900 reads.bam contig12:1000-9000 | samtools fastq - > locus.fq', 'Windows from a table need checking first. Several regions that overlap output a read more than once.', ['s09', 's08']);
    // comp
    if (t === 'small') return R('Mash: sketch, then distance',
      'Two small sequence sets are compared through a MinHash sketch of their k-mers, a short summary that is quick to compare. A sketch can be saved and reused (Mash tutorial).',
      'mash sketch a.fa\nmash sketch b.fa\nmash dist a.fa.msh b.fa.msh', 'It estimates distance from k-mers; it does not align.', ['s10', 'l1']);
    if (t === 'genome') return R('Mash distance between genomes',
      'Mash is built for fast distance estimation from MinHash sketches of the k-mers, not for alignment (section 10). Sketch each genome once and compare the sketch files' + (many ? ', which is what makes many comparisons cheap.' : '.'),
      'mash dist genome1.fna genome2.fna', 'A distance is not a map: it will not tell you where two genomes differ.', ['s10', 'l1']);
    return R('Kraken2, Mash screen or BBDuk, by the question',
      'Kraken2 assigns each read to a taxon with a k-mer database, but needs a database held in memory (its default one was 29 GB in 2018). <code>mash screen</code> asks how well known genomes are contained in the reads and is, in the Mash manual\'s words, not a true classifier. BBDuk removes reads that match a short list of known sequences, such as adapters.',
      'kraken2 --db DBNAME reads.fq\nmash screen -w -p 4 refseq.msh reads.fq > screen.tab', 'Hits to unrelated organisms are not classifications. Look at what matched and how much.', ['s10', 's04']);
  }

  function esc(s){ return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function render(){
    var r = pick(qSel.value, tSel.value, mSel.value);
    var links = r.links.map(function(l){ return '<a href="' + l[1] + '">' + l[0] + '</a>'; }).join(' · ');
    out.innerHTML =
      '<div class="readout">' +
      '<div><span class="tool-note">Use</span><b style="font-size:15px">' + esc(r.tool) + '</b></div>' +
      '<div><span class="tool-note">Watch out</span>' + esc(r.watch) + '</div></div>' +
      '<p style="margin-top:10px">' + r.why + '</p>' +
      '<div class="toy" style="margin-top:10px">' + esc(r.cmd) + '</div>' +
      '<p class="tool-note" style="margin-top:8px"><b>Read:</b> ' + links + '</p>';
  }
  [qSel, tSel, mSel].forEach(function(s){ s.addEventListener('change', render); });
  render();

  if (tbody){
    Object.keys(QN).forEach(function(q){
      Object.keys(TN).forEach(function(t){
        var a = pick(q, t, 'once'), b = pick(q, t, 'many');
        var tr = document.createElement('tr');
        tr.innerHTML = '<td><b>' + esc(QN[q]) + '</b></td><td>' + esc(TN[t]) + '</td><td>' + esc(a.tool) + '</td><td>' + (a.tool === b.tool ? '<span class="tool-note">same</span>' : esc(b.tool)) + '</td>';
        tbody.appendChild(tr);
      });
    });
  }
})();
