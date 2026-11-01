# s01 Pre-flight check: notes and sources

Local copies of the docs used are in `lesson2/src/s01_docs/` (fetched 2026-10-31).

## Sources (URL, version, what was taken)
- hifiasm README, https://github.com/chhylp123/hifiasm (master; latest release 0.25.0-r726, 2025-03-18; `HA_VERSION "0.25.0-r726"` in CommandLines.h)
  - `-l0` for inbred/homozygous genomes; purging built in; "does not need polishing tools like pilon or racon"; `--ont` since 0.21.0 (r686) for "ONT simplex R10 reads", FASTQ only; Hi-C `--h1/--h2`; trio `-1/-2` with yak; `-f38/-f39` for genomes much larger than human.
- hifiasm docs faq.rst, https://github.com/chhylp123/hifiasm/blob/master/docs/source/faq.rst
  - "Usually >=13x HiFi reads per haplotype"; trio > Hi-C > HiFi-only ("not fully-phased"); contig modules "designed for diploid samples", polyploid only unitig graphs lossless; `--hom-cov`.
- hifiasm CommandLines.cpp (0.25.0): `--rl-cut` default 1000 ("filter out ONT simplex reads shorter than"), `--sc-cut` default 10 ("mean base quality score below"). Release notes 0.21.0 (ONT beta), 0.22.0 (high-coverage known issue, down-sample to 60x), 0.23.0 (fixed), 0.25.0 (rl-cut/sc-cut added).
- Flye docs USAGE.md and FAQ.md, https://github.com/mikolmogorov/Flye/tree/flye/docs (latest release 2.9.6, 2025-05-02)
  - modes and error rates: `--nano-raw` (<20 %, "older ONT ... 10-15%"), `--nano-hq` ("Guppy5+ SUP or Q20 (<5% error)", R10 "<3%"), R9 Guppy5+ `--nano-hq --read-error 0.05`, `--pacbio-hifi` (<1 %), `--pacbio-raw` (CLR 13-15 %).
  - genome size optional since 2.8, needed with `--asm-coverage`; min overlap auto from read N90, typically 3-10 kb.
  - FAQ: 30x+ satisfying; 20-30x may work; below 10x not recommended; reads N90 >1 kb (5 kb+ recommended); does not work with reads <1 kb; diploid: collapsed, ~0.1 % het fine, high het → unphased alternative haplotypes, lower contiguity; mammal 40x ONT ~450 GB RAM (not used in page; for s02).
- purge_dups README, https://github.com/dfguan/purge_dups (master): Limitation "cutoffs can be larger for a low heterozygosity species ... purged assembly size smaller than expected"; short-read support (ngscstat) "not tested" by the author (so the route says "check after assembly" for short-read assemblies, not a recommendation to run it).
- GenomeScope 2.0 README, https://github.com/tbenavi1/genomescope2.0: k = 21 recommended; "at least 15x coverage of the haploid genome"; needs low-error reads (2 % error example); up to hexaploid.
- SPAdes docs, https://github.com/ablab/spades docs/running.md (main): `--careful` "recommended only for assembly of small genomes. We strongly recommend not to use it for large and medium-size eukaryotic genomes"; `--isolate` for high-coverage isolate/multi-cell Illumina; `-m` default 250 GB.
- ABySS README, https://github.com/bcgsc/abyss (master): "for 2x150bp reads and 40x coverage, the right k value is often around 70 to 90".
- VGP Galaxy training tutorial, https://training.galaxyproject.org/training-material/topics/assembly/tutorials/vgp_genome_assembly/tutorial.html (last modified 2026-09-23): "at least 30✕ PacBio HiFi coverage & around 60✕ Hi-C coverage" for diploids; up to 60x HiFi for repetitive regions.
- EBP assembly standards, https://www.earthbiogenome.org/report-on-assembly-standards (v7.0, Jan 2026): 6.C.Q40; <5 % false duplications, >90 % k-mer completeness, >90 % assigned to chromosomes, >90 % BUSCO; Merqury needs high-accuracy short reads or PacBio CCS; no sequencing coverage recommendation.
- seqkit usage, https://bioinf.shenwei.me/seqkit/usage/ (documents 2.14.0): `stats -a -T -N`, columns incl. sum_len, N50, Q20(%), Q30(%), AvgQual; AvgQual averages error probabilities.
- Project facts: the internal project-facts sheet sections 1-4 only (species A-D, Desmana, Galemys). Species A-D are unpublished: the page gives only rounded or qualitative values.

## Verified facts used in the page
All tool thresholds above. Phred arithmetic (computed): (1-e)^21 = 10.9 % at Q10, 50.9 % at Q15, 81.0 % at Q20, 97.9 % at Q30. Desmana 89x read coverage = the facts sheet (OVN: k-mer median 31 at k = 99). Species A values in the page are rounded or qualitative (unpublished data).

## Course rules of thumb (not tool thresholds; marked as such in the page)
- size estimates agree within 10 %;
- heterozygosity "high" above ~1.5 % (from lesson 1's planning table);
- in the form: short-read coverage 15-30x = amber for short-read-only assembly (15 from GenomeScope, 40 from ABySS example); ONT Q bands 10/13/15 map Flye's stated error rates (10-15 %, <5 %, <3 %) to Phred; repeats >40 % amber for short-read-only (arbitrary flag level).

## Not verified / left out
- "hifiasm --ont is designed for Q20+ reads" (in project log): not stated in hifiasm docs; the page says only "ONT simplex R10 reads" and the Q10 / 1 kb default filters.
- CycloneSEQ is not mentioned in any tool doc; page says so. Species A = CycloneSEQ is UNVERIFIED (marked "not confirmed by the provider").
- Species D coverage: two values a factor of four apart, shown as unresolved; the toy preset uses a rounded value with an explicit note.
- PacBio read-name formats: not given (not checked).
- Whether NanoPlot's mean Q averages error probabilities: not checked, so only seqkit is described.

## Interactive elements
1. Q/k slider + SVG: share of error-free k-mers.
2. Go/no-go form with presets (toy A-like, B-like, C-like, D-like values, Desmana R8, made-up textbook case): traffic-light table + route SVG (reads → assemble → purge → polish → scaffold → product) with links to s02-s11; Gb→coverage helper.

## Suggested cross-links
s02 (memory; species D SPAdes OOM), s03 (k − 1 rule, k choice), s04 (Flye modes, hifiasm --ont), s05 (Hi-C/YaHS, RagTag caveat), s06 (purge_dups, polishing, homopolymers), s07 (primary vs hap1/hap2, trio/Hi-C), s08 (NG50 needs genome size, Merqury needs accurate reads), s09 (FCS-GX), s10, s11 (mito multimers, NUMTs).
