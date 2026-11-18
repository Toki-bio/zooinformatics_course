# s09 Mappers in practice: sources and verified facts

All sources were opened (cloned or fetched) and read; none is abstract-only.

## Versions read
- bwa 0.7.19 (manual `bwa.1`, `bwamem.c`, `bwamem.h`): https://github.com/lh3/bwa
- bwa-mem2 2.2.1 (README): https://github.com/bwa-mem2/bwa-mem2
- bowtie2 2.5.5 (`MANUAL.markdown`, `unique.h`, `bt2_search.cpp`): https://github.com/BenLangmead/bowtie2
- minimap2 2.31-r1302 (`minimap2.1`, `README.md`, `options.c`, `hit.c`): https://github.com/lh3/minimap2
- SAM/BAM specification v1.6 (`SAMv1.tex`, `SAMtags.tex`): https://github.com/samtools/hts-specs

## Facts and the supporting text
- bwa mem range: manual "Align 70bp-1Mbp query sequences with the BWA-MEM algorithm ... seeding alignments with maximal exact matches (MEMs) and then extending seeds with the affine-gap Smith-Waterman algorithm".
- bwa defaults (`mem_opt_init`): `o->a = 1; o->b = 4;` `o->T = 30;` `o->min_seed_len = 19;` `o->max_occ = 500;` `o->mapQ_coef_len = 50; o->mapQ_coef_fac = log(o->mapQ_coef_len);`
- bwa `-h`: "If a query has not more than INT hits with score higher than 80% of the best hit, output them all in the XA tag ... [5,200]". `-a`: "Output all found alignments ... flagged as secondary". `-Y`: soft clipping for supplementary (default hard). `-M`: "Mark shorter split hits as secondary". `-c`: "Discard a MEM if it has more than INT occurrence in the genome. [500]".
- bwa MAPQ: `mem_approx_mapq_se` in `bwamem.c` (sub = a->sub ? a->sub : min_seed_len*a; identity = 1 - (l*a - score)/(a+b)/l; with mapQ_coef_len>0: tmp = l<coef_len ? 1 : coef_fac/log(l); tmp *= identity^2; mapq = (int)(6.02*(score-sub)/a*tmp*tmp + .499); then `-= (int)(4.343*log(sub_n+1)+.499)`, cap 60, then `*(1-frac_rep)`). The toy omits the sub_n and frac_rep terms and the `csub` term. The toy's formula output was checked against an independent re-implementation over 31,730 parameter combinations (0 differences). No C compiler was available to run the original function itself.
- bwa-mem2 README: "produces alignment identical to bwa and is ~1.3-3.1x faster"; index format changed in Oct 2020, rebuild needed (index is not shared with bwa: our inference from "you will need to rebuild the index" for older bwa-mem2 indexes and from the separate `bwa-mem2 index` step; not stated outright for bwa indexes).
- bowtie2 intro: "ultrafast and memory-efficient tool ... particularly good at aligning reads of about 50 up to 100s of characters to relatively long (e.g. mammalian) genomes ... FM Index". Usage line `bowtie2 [options]* -x <bt2-idx> {-1 <m1> -2 <m2> | -U <r> ...} -S [<sam>]`; `bowtie2-build [options]* <reference_in> <bt2_base>`; `-p/--threads`.
- bowtie2 MAPQ text: "the bigger the gap between the best alignment's score and the second-best alignment's score, the more unique the best alignment"; "A mapping quality of 10 or less indicates that there is at least a 1 in 10 chance that the read truly originated elsewhere". Default `mapqv = 2` in `bt2_search.cpp` selects `BowtieMapq2` in `unique.h`, a ladder of thresholds on the best-vs-second-best difference; it returns 255 for non-primary records.
- bowtie2 defaults: `-D 15 -R 2` (sensitive preset); `-k`: "each reported read or pair alignment beyond the first has the SAM 'secondary' bit (which equals 256)"; "ties: randomly selected from among best". `XS:i`: "Alignment score for the best-scoring alignment found other than the alignment reported".
- bowtie2 BAM: manual example `samtools view -bS eg2.sam > eg2.bam`, `samtools sort eg2.bam -o eg2.sorted.bam`.
- minimap2 presets: expansions copied from `minimap2.1`; `map-ont` is "the default mode" with index defaults k=15, w=10 (`mm_idxopt_init`). Secondary: `-N 5`, `-p 0.8`. Repeat seeds: `-f 0.0002`. `sr` includes `--secondary=no`. PAF 12 columns and "column 10 divided by column 11 gives the BLAST-like alignment identity" from the manual. `-Y`: "In SAM output, use soft clipping for supplementary alignments". minimap2 MAPQ (`mm_set_mapq2` in `hit.c`) uses chain/DP scores of best and second best, the minimizer count and `rep_len` (repeat-seed length), and for non-short reads takes the minimum with a "BWA-MEM like" formula.
- SAM spec: MAPQ = "-10 log10 Pr{mapping position is wrong}, rounded to the nearest integer. A value 255 indicates that the mapping quality is not available"; flag bits 0x100 secondary, 0x800 supplementary; exactly one line per read with `FLAG & 0x900 == 0`; 0x800 = "part of a chimeric alignment".

## Interactive controls (run in Node and in headless Chrome, no script errors at 1100 and 420 px)
- Toy 1 presets (read start, length; toy rule +1/-4 local ungapped): "Misses all 3 sites" 22/22 gap 0; "Crosses 1 site" 30/25 gap 5; "Reaches the flank" 60/35 gap 25; "Errors on 2 sites" locus 1 = 50, locus 2 = 60, gap 10 to the WRONG locus, toy confidence 30. Clicking a read base toggles an error and updates scores; "Clear errors" restores.
- Toy 2: toy MAPQ at m=1 for gaps 0,1,2,5,10,20 = 3,5,7,15,30,60; at m=10 for gaps 0,3,10 = 0,3,20. bwa formula examples: (l=100, S=100, S2=92) = 35; no second hit = 60; tie = 0; (150,140,130) = 35.

## Open doubts
- The toy MAPQ is invented and labelled as such. Real programs give about 0 for a tie; the toy gives 3 for one competitor.
- The bowtie2 supplementary-alignment statement is our reading of the manual (the manual mentions "supplementary" only in passing in the -k and -a sections).
- Index-compatibility between bwa and bwa-mem2 is stated on the page as a fact about needing the bwa-mem2 index; the README states this directly only for its own format change.

## IGV part (added 2026-11-14)
Sources read (not from memory): IGV docs markdown, github.com/igvteam/igv-docs main, `UserGuide/tracks/alignments/viewing_alignments_basics.md`, `paired_end_alignments.md`, `FileFormats/DataTracks.md`; IGV source tag v2.19.8: `src/main/resources/org/broad/igv/prefs/preferences.tab`, `sam/AlignmentRenderer.java`, `sam/BaseRenderer.java`, `sam/BaseAlignmentCounts.java`, `sam/AlignmentUtils.java`.
- Sorted + indexed: DataTracks.md "IGV requires that both SAM and BAM files be sorted by position and indexed"; basics "The index file should have the same filename but with the .bai ... extension".
- Visibility window: basics "RNA: 300 kilobases; 3rd Gen: 1000 kilobases; Other: 30 kilobases"; prefs `SAM.MAX_VISIBLE_RANGE` 30 / 300 / 1000.
- Preferences location: basics "View > Preferences window", "Alignments tab".
- Strand point: basics "horizontal bars with a point on one end to indicate the direction"; AlignmentRenderer draws the point left for negative strand.
- MAPQ 0: basics "transparent or white fill so they appear hollow ... mapping quality equal to zero"; prefs `SAM.FLAG_ZERO_QUALITY` TRUE ("with transparency and solid outline"); `SAM.QUALITY_THRESHOLD` 0.
- Mismatch colours: basics A green, C blue, G yellow, T red; prefs COLOR.G = 209,113,5 (orange). Shading: prefs `SAM.BASE_QUALITY_MIN` 5, `SAM.BASE_QUALITY_MAX` 20; BaseRenderer.getShadedColor: q>=20 opaque; q<5 alpha 0.2; else max(0.2, 0.1+0.9(q-5)/15), rounded to 0.1. The toy uses this formula exactly.
- Coverage colouring: basics "differs from the reference sequence in greater than 20% of quality weighted reads, the bars are colored in proportion to the read count of each base"; prefs `SAM.ALLELE_THRESHOLD` 0.2, `SAM.ALLELE_USE_QUALITY` TRUE; BaseAlignmentCounts.isConsensusMismatch: sum of qualities of all non-reference bases >= threshold x total quality (and threshold > 0). The toy uses this rule exactly (">=", so "at least 20 %" on the page).
- Indels: basics black bar for deletions (length = size), purple I for insertions, indels > 1 base labelled with size.
- Insert size: paired_end "Larger than expected ... red; Smaller ... blue; Pairs aligned to different chromosomes: Each read is colored by the chromosome of its mate"; prefs `SAM.COMPUTE_ISIZES` TRUE, percentiles 0.5 / 99.5.
- Orientation: AlignmentRenderer RL (0,150,0) green, RR (20,50,200) blue, LL (0,150,150) teal; default `SAM.COLOR_BY` UNEXPECTED_PAIR; in AlignmentRenderer, UNEXPECTED_PAIR takes the orientation colour and falls through to the insert-size colour when the orientation is normal. "Inversion or tandem duplication" as examples of odd orientation is standard paired-end reasoning, not quoted from IGV.
- Soft clips: prefs `SAM.SHOW_SOFT_CLIPPED` FALSE; when shown, AlignmentUtils.isMisMatch treats every soft-clipped base as a mismatch (no reference comparison), so all are drawn coloured.
- Downsampling: basics "Sampling window size; default 50 bases", "Maximum number of reads per window; default 100", "marked with a black rectangle just under the coverage track"; coverage counts all reads (basics).
- Toy checks (Node, 2026-11-14): shade(2,5,8,12,19,20) = 0.2,0.2,0.3,0.5,0.9,1. Heterozygous example: position 28, 4 of 8 reads alt, share 0.50, coloured. Error example: errors Q3-12, one per position; position 42 has two reads with the same base at Q10, share 0.087: grey at 0.20, coloured below 0.087. Repeat: 9 of 23 reads MAPQ 0. Deletion: coverage 0 from position 45, 8 reads clipped, 6 forward reads red; with "pair orientation" 0 red. Headless Chrome 1100 and 420 px: no script errors, no page overflow; `node src/check.js` all ok.
- Not tested in a running IGV. Read packing in the toy is a simple greedy rule, not IGV's packer.
