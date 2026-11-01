# s02 Finding copies of a known SINE — notes

Written 2026-10-31.

## Sources (URL, version, what was taken)

1. **sear2k** — https://github.com/Toki-bio/sear2k, commit `923ffb6` (2026-10-12), public, MIT.
   - `README.md`: window scanning 2500 bp / 2000 bp step; minimap2 mode for queries >= 1000 bp (query indexed, genome streamed;
     old genome-indexed mode found 4 of 73 full-length L1 on human chr21 because high-occurrence minimizers are dropped);
     options `-b/--best`, `-m/--minus`, `-s/--stop` (default 1000), `-k/--keep`, `--slop L,R`, `--force-ssearch`; usage
     `sear [options] <query> <bank> [Slf=0.8] [Homology=65] [Flank=50] [KeepSplits=0]`; BED7 columns; output names
     `taxname-qname.bed/.bnk` with taxname = first 3 characters of the genome file name; dependencies.
   - `sear` script: `seqkit sliding -g -s 2000 -W 2500` and `seqkit split2 -p 20` (lines ~396-399); exact ssearch36 call
     `ssearch36 -g -3 -T ${THREADS:-nproc} -Q -n -z 11 -E 2 -w 95 -W 70 -m 8C query part 3` (line 422); the same call (with
     `-T 24`) in `sear2k` line 190 and `sear2k_bak` line 117; per-window `bedtools merge -s -c 4,5,6,7,8 -o max,max,distinct,max,max`
     then `awk '$7>=Homology && $4>=flen'` (lines 431-433): column 7 = max identity, column 4 = max of the per-hit genome-side
     length, i.e. the longest single alignment, not the merged span (the README/project notes say "merged span"; I followed the
     code). `flen = int(Slf x querylen)` (line 249). Minus-bank rounds via `bedtools complement | getfasta` (lines ~460-470).
     Window offset parsing from `_sliding:` and second strand-aware merge (lines ~483-524). Flanks by `bedtools slop -s` +
     `getfasta -s` (lines 607-608). Query length computed per record (line 248), so multi-record query files break the rule.
     Underscore handling via `@U@` placeholder. Split reuse via existing `*.2k.part_*.bnk` in cwd.
2. **SINEderella** — https://github.com/Toki-bio/SINEderella, commit `f19fcf1` (2026-10-30), public.
   - `docs/AIM.md` (owner's aim; used only for framing: unique flanks, loci list, reproducible).
   - `step1_search_extract.sh`: calls `sear -k "$query" genome.search.fa 0.8 65 50` (line 136); window bank ~1.25 x genome
     (comment line 126); merges the BEDs of all consensus sequences strand-aware (`tools/merge_hits.py`) into "unique intervals";
     removes merged loci overlapping `satellites/exclude_regions.bed` (SATELLITE_EXCLUDE default on).
3. **FASTA36** — https://github.com/wrpearson/fasta36, commit `6d6718a` (2026-09-15), version string `36.3.8j1 Aug, 2026`.
   - `doc/fasta36.1` (man page): `-z 1` default regression; `-z 11..16` "regression against scores of randomly shuffled copies
     of the library sequences. Twice as many comparisons are performed, but accurate estimates can be generated from databases
     of related sequences"; `-E` default 2.0 for DNA/DNA, second value for additional alignments; `-Z db_size`; `-m 8/8C`
     BLAST-like tabular, no alignments; `-n` force nucleotide; `-q/-Q` quiet; `-T` threads (default all processors on Unix);
     `-w`/`-W` display widths; `-g #` "penalty for additional residues in a gap" (NOT used on the page, see doubts).
   - `doc/fasta_guide.tex` ~line 485-492: "The statistical routines assume that the library contains a large sample of
     unrelated sequences ... If the library contains a large number of related sequences, then the statistical parameters
     should be estimated by using the -z 11-15 options" (quoted on the page). Line 235: usage `ssearch36 [-options] query_file
     library_file [ktup]`; line ~2071: programs with "fast" in their name use ktup.
   - `src/initfa.c` ~1676-1740: DNA defaults gap open -12, extension -4 (gap of k = 12 + 4k), matrix "+5/-4"; DNA e_cut
     divided by 5 (10 -> 2) and e_cut_r = 0.001 when -E is not set.
   - Methods: Smith TF, Waterman MS (1981) J Mol Biol 147:195-197; Pearson WR, Lipman DJ (1988) PNAS 85:2444-2448.
4. **NCBI BLAST+** task presets (word sizes): megablast 28 (default task of `blastn`), blastn 11, dc-megablast word 11 with
   template length 18, blastn-short 7. Source: NCBI C++ toolkit `src/algo/blast/api/blast_nucl_options.cpp`,
   `disc_nucl_options.cpp`, `blastinput/blastn_args.cpp` (BLAST+ 2.17 era, read via a lab source digest, commit ddcf2de);
   consistent with the BLAST+ user manual https://www.ncbi.nlm.nih.gov/books/NBK279684/.
5. **Internal lab project log** (species A and a close relative, unpublished): five consensus sequences of one SINE family
   (one SINEBase + four published subfamilies); more than a million loci per genome, counts within a few percent; about
   five in six firmly assigned, most to one subfamily. Exact values withheld until publication.
6. Vassetzky et al. 2021, IJMS 22:9897, doi 10.3390/ijms22189897 (abstract): young copies have long poly(A) tails that
   shorten over generations.
7. Bioconda versions checked 2026-10-31 via api.anaconda.org: fasta3 36.3.8i, seqkit 2.14.0, bedtools 2.31.1, samtools 1.25.
8. Lesson 3 s04 (this course) for RepeatMasker behaviour and divergence ranges (20-30 % for ancient families).

## Our own arithmetic / reasoning on the page (labelled there)
- 0.8^28 ≈ 0.19 %, 0.8^11 ≈ 8.6 %; ~220 28-mers / ~240 11-mers in a 250-bp copy.
- 500-bp overlap -> any copy <= 500 bp whole in one window; with the per-window 0.8 rule a straddling copy always has one
  piece >= 0.8 L when L <= 833 bp ((L + 500)/2 >= 0.8 L), and a straddling copy can be reported shortened. Derived from the
  code, not tested on real data.
- "-E 2 per part lets through a hit or two on score alone": from E-value definition + no -Z; not measured.
- Minus-bank rationale (second copy in a window may fall under the stricter e_cut_r): our reading of the man page.

## Toy (JS)
- Real affine-gap Smith-Waterman (Gotoh) with +5/-4, gap 12 + 4k, both strands; windows 420/250 bp on a 12-kb random genome;
  3 shuffles per window (mononucleotide shuffle) as the chance distribution. Seed modes: window aligned only if it shares an
  exact 11- or 28-mer with the consensus (either strand) — a simplification of BLAST (no ungapped extension / X-drop).
- Default threshold = first multiple of 5 above the highest shuffled score.

## Open doubts / left out
- `-g -3` in sear's ssearch36 call: the lab manual reads it differently from the FASTA36 man page; not explained on the page.
- Whether ssearch36 ignores the trailing `3` is inferred from the guide, not run-tested.
- Timings of sear on a whole genome: not stated (no documented numbers).
- The -z 11 run-to-run variation size measured in lab notes is not quoted here (left for s04).

## Final review 2026-10-31
- Tooltips/links added at first use of terms in the lesson; see the lesson review record. Claims re-checked against source/papers listed above.
