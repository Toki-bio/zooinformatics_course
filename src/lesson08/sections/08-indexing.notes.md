# s08 Indexing a genome: notes

Written 2026-11-05. Lesson 7, slug 08-indexing.

## Sources, with the supporting text

Tools (cloned, read directly)

1. **bwa**, https://github.com/lh3/bwa, commit `d82444c` (2026-08-07).
   - `bwa.1`: "With bwtsw algorithm, 5GB memory is required for indexing the complete human genome sequences. For short reads, the aln command uses ~3.2GB memory and the sampe command uses ~5.4GB." "Indexing the human genome sequences takes 3 hours with bwtsw algorithm."
   - `bwt.h`: `OCC_INTERVAL` = 1<<7 = 128 ("please DO NOT change this line because some part of the code assume OCC_INTERVAL=0x80").
   - `bwtindex.c` line 316: `bwt_cal_sa(bwt, 32);`. `bwt.c`, `bwt_sa`: walks `bwt_invPsi` until a stored row, counting the steps.
   - `bntseq.c` line 306: "add the reverse complemented sequence".
   - Size arithmetic (ours, from the writers; N = 2G because both strands are in the BWT): BWT text N/4 bytes plus Occ 32 bytes per 128 rows = N/4, so `.bwt` = G bytes; `.sa` 8 bytes per 32 rows = G/2; `.pac` G/4. Total 1.75 bytes per base, 5.4 GB at G = 3.1e9, the same as the manual's sampe figure. We did not build an index to confirm it.
2. **minimap2**, https://github.com/lh3/minimap2, tag v2.31, commit `3c28777`.
   - `minimap2.1`: "Minimizer k-mer length [15]"; "Minimizer window size [10]. A minimizer is the smallest k-mer in a window of w consecutive k-mers."; "-d FILE ... Minimap2 indexing is fast. It can index the human genome in a couple of minutes."; "-f ... ignore top FLOAT fraction of most frequent minimizers [0.0002]"; map-hifi = lr:hq = -k19 -w19; map-ont is the default mode.
   - README: "For the human reference genome, minimap2 takes a few minutes to generate a minimizer index"; "once you build the index, indexing parameters such as -k, -w, -H and -I can't be changed during mapping. If you are running minimap2 for different data types, you will probably need to keep multiple indexes"; "This makes minimap2 different from BWA which always uses the same index regardless of query data types."; approximate mapping "without base-level alignment (i.e. coordinates are only approximate and no CIGAR in output)".
   - `sketch.c`: `hash64`; `mm_sketch`: "skip symmetric k-mers as we don't know it strand"; `z = kmer[0] < kmer[1]? 0 : 1`; loops that write identical k-mers (ties). The page ports `hash64` and the k-mer handling.
   - `options.c`: `opt->k = 15, opt->w = 10`.
3. **bowtie2**, https://github.com/BenLangmead/bowtie2, commit `1ca3213` (2026-10-28).
   - `MANUAL`: "the memory footprint of the FM Index for the human genome is about 3.2 gigabytes of RAM"; offrate: "the indexer will mark every 2^<int> rows ... The default is 5 (every 32nd row is marked; for human genome, annotations occupy about 340 megabytes)"; multiseed: "extracting substrings ("seeds") from the read and its reverse complement and aligning them in an ungapped fashion with the help of the FM Index"; "at the expense of missing some valid alignments"; at mapping time, -o: "<int> must be greater than the value used to build the index"; six files including `.rev.1.bt2` and `.rev.2.bt2`. The manual gives no build time.
   - `aligner_seed.h`: `ebwtBw_; // backward/mirror index (BWT')`, which ties the `.rev` files to the mirror index.
4. **sear2k**, https://github.com/Toki-bio/sear2k (public, checked with `gh repo view`), README: "the old mode found 4 of 73 full-length L1s, the swapped mode 65 at any length" (L1.3, 6 kb, human chr21).

Papers

5. Li H, Durbin R. 2009. https://doi.org/10.1093/bioinformatics/btp324. Full text read (PMC2705234). "Most algorithms for constructing suffix array require at least n⌈log2 n⌉ bits of working space, which amounts to 12 GB for human genome."; BWT example "lo$oogg", suffix array (6, 3, 0, 5, 2, 4, 1); "the position of each occurrence of W in X will occur in an interval in the suffix array"; "the SA interval of string 'go' is [1, 2]" (both ends included); backward search section with credit to Ferragina and Manzini (2000); "we store in memory O(·, k) for k that is a factor of 128"; "In BWA, we only store in memory S(k) for k that can be divided by 32." Equations 3 and 4 are images in the XML, so they were not read as text; the page's half-open form is checked by the control.
6. Langmead B et al. 2009. https://doi.org/10.1186/gb-2009-10-3-r25. Full text read (PMC2690996). "Although originally developed within the context of data compression"; "The ith occurrence of character X in the last column corresponds to the same text character as the ith occurrence of X in the first column."; forward and "mirror" index, "'double indexing', a strategy to avoid excessive backtracking"; Table 5: 14.4 GB 4 h 36 m; 5.84 GB 5 h 5 m; 3.39 GB 7 h 40 m; 1.39 GB 21 h 30 m (Bowtie v0.9.6, NCBI build 36.3); "Bowtie can reuse a pre-computed index for the reference genome across many alignment runs."
7. Langmead B, Salzberg SL. 2012. https://doi.org/10.1038/nmeth.1923. Full text read (PMC3322381): peak memory 3.24, 3.26 and 3.39 gigabytes.
8. Li H. 2013. https://arxiv.org/abs/1303.3997. Read: "essentially finds at each query position the longest exact match covering the position".
9. Li H. 2016. https://doi.org/10.1093/bioinformatics/btw152. arXiv version 1512.01801 read: BLAT scheme ("hash k-mers at the positions 1, w + 1, 2w + 1, . . . of a target sequence"; every k-mer of the query looked up); "poly-A, which is often highly enriched in genomes, always gets zero".
10. Li H. 2018. https://doi.org/10.1093/bioinformatics/bty191. arXiv 1708.01492v5 read, not the journal page. "indexes them in a hash table, with the key being the hash of a minimizer and the value being a list of locations of the minimizer copies"; chaining equations 1 and 2; "we can afford to skip highly repetitive seeds without affecting the final accuracy"; "exact seeds of arbitrary lengths"; "inferior to variable-length seeds in theory, but can be computed much more efficiently in practice"; "at low sequence identity, it is rare to see long seeds anyway"; "Minimap2 consumed 6.8GB memory at the peak" (section 3.1, simulated human reads).
11. Schleimer S, Wilkerson DS, Aiken A. 2003. SIGMOD. https://theory.stanford.edu/~aiken/publications/papers/sigmod03.pdf. Full text read: "the density is asymptotically 2/(w + 1)", assuming that hashes are independent and uniformly random; "If there is a substring match at least as long as the guarantee threshold"; w = t - k + 1.
12. Roberts M et al. 2004. https://doi.org/10.1093/bioinformatics/bth408. **Abstract only** (publisher page not reachable): "only a small fraction of seeds, called 'minimizers', needs to be stored."

Not opened, named only as credited in the sources above: Burrows and Wheeler 1994; Ferragina and Manzini 2000.

## Controls (Node and browser)

- Published example: `googol$` gives suffix array 6,3,0,5,2,4,1 and BWT `lo$oogg`, as in Li and Durbin. Pass.
- Node, core block of the section JS: 20,000 random texts rebuilt from their BWT, 0 errors. 100,000 word searches (50,239 with hits), FM search against a plain scan: 0 differences.
- Browser button: 3,000 sequences, 0 wrong; 12,000 searches (7,561 with hits), 0 differences.
- Minimizers: the page uses a plain per-window definition. Compared with a literal Node port of the streaming `mm_sketch` (no C compiler was at hand, so the real program was not run): 4,000 cases, 3 differences; a further 20,000 cases, 9 differences, all involving k-mers with a tied hash (k of 5, 6 or 9). In 5 of the 9 the C logic emits an extra tied k-mer inside the first window. Ties are rare at real k, and the toy does not reproduce this.
- Guarantee: an exact shared stretch of w + k - 1 = 24 bases shared a minimizer in 500 of 500 random pairs.
- Density on 200,000 random bases: k15 w10 0.1869 (2/(w+1) 0.1818); k15 w5 0.3409 (0.3333); k19 w19 0.1002 (0.1000); k21 w11 0.1665 (0.1667); k15 w1 1.0000; k15 w30 0.0667 (0.0645).
- Anomaly explained: on 300,000 random bases at w = 10 the excess appears for k up to 15 (0.185 to 0.187) and is gone from about k = 16. Rehashing the same k-mers with SHA-1 gives 0.181 to 0.182 for all k, so the cause is the mixing of `hash64` on short keys, not a bug in the toy. Why it mixes worse there is our guess (the last step, a shift by 31, does nothing to keys of 30 bits or less) and is not stated on the page.

## Open doubts

- The table mixes years, versions and hardware. It says so. Nothing was measured by us.
- bwa's 5.4 GB is the manual's figure for `sampe`; a figure for `bwa mem` was not found in a document.
- minimap2's 6.8 GB comes from an old version and is a whole-run peak, not the index alone.
- "BLAT does this" rests on Li 2016 and a digest of the BLAT source, not on the BLAT paper.
