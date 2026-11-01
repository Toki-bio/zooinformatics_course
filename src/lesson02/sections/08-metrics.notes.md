# s08 Measuring assembly quality — notes

## Sources (fetched/cloned 2026-10-31 into lesson2/src/s08/)
- **Merqury** https://github.com/marbl/merqury, commit 88f37c0 (2026-05-21), tag v1.4.1. Read: `eval/qv.sh` (QV formula
  `1-(1-ASM_ONLY/TOTAL)^(1/k)`, QV = -10 log10; TOTAL/ASM_ONLY = meryl "present" i.e. counted with multiplicity),
  `eval/spectra-cn.sh` (copy classes read-only,1,2,3,4,>4; completeness on solid k-mers = `meryl greater-than filt`;
  `.qv`, `.completeness.stats`, `_only.bed/.wig` outputs), `build/filt.sh` (solid cutoff from kmerHistToPloidyDepth.jar),
  `eval/false_duplications.sh` (cutoff = 1.5 x multiplicity of 1-copy max; dup% = copies>1 below cutoff / all;
  help text: "for a pseudo-haplotype or mixed haplotype assembly"), `plot/plot_spectra_cn.R` (colours gray, red, blue,
  green, purple, orange), `best_k.sh` usage, `merqury.sh` usage, README (Meryl 1.4.1; bioconda = v1.3; deps; output list).
- **Merqury wiki** https://github.com/marbl/merqury.wiki.git "2. Overall k-mer evaluation": A. thaliana col line
  `682359 123511626 35.1183 0.000307729` (k = 18) used as calculator default — recomputed in JS, matches; completeness
  83.78/83.64/98.27 %; runtime "at most 8 hours on a 3Gb genome, 24 cores"; `.st/.fl/.ln` plot names.
- **Merqury paper** Rhie et al. 2020 Genome Biol 21:245, PMC7488777: QV under-estimated if read set lacks true k-mers,
  over-estimated if read set holds many false k-mers; recommend Illumina; "reliable k-mer" definition; read-only
  high-frequency k-mers = missing sequence; higher copy than reads predict = artificial duplication; bar at origin =
  asm-only; collapsed repeats visible.
- **gfastats** https://github.com/vgl-hub/gfastats commit 53336a4, version string 1.3.12 (src/main.cpp). README usage
  `gfastats input [expected genome size]`, `--nstar-report`, `--discover-paths` for hifiasm GFA; sample report lines
  from `validateFiles/random1.fasta.3.tst`.
- **QUAST** https://github.com/ablab/quast commit 38373fb, VERSION 5.3.0, manual.html: `--min-contig` default 500;
  `--large` imposes min-contig 3000 (also in options_parser.py); `--est-ref-size`; `--split-scaffolds` splits at >= 10 N;
  auN recommended over N50; "# N's per 100 kbp".
- **Inspector** https://github.com/Maggi-Chen/Inspector (README links ChongLab/Inspector) commit 2d813d9 (2024-08-25),
  `--version` = Inspector_v1.0.1; datatypes clr/hifi/nanopore/mixed; `--min_contig_length` 10000,
  `--min_contig_length_assemblyerror` 1000000; error types; inspector-correct.py.
- **CRAQ** https://github.com/JiaoLaboratory/CRAQ commit 6350938 (2025-12-03): CRE/CSE/CRH/CSH, AQI classes (>90
  reference, 80-90 high, 60-80 draft, <60 low), usage `craq -g -sms -ngs`; NGS-only mode hardly detects CSE.
- **HMM-Flagger** https://github.com/mobinasri/flagger commit 493d205 (2026-10-20): v1.2.0, "dual or diploid assembly",
  labels Err/Dup/Hap/Col, presets hifi / ont-r9 / ont-r10, replaces Flagger v0.4.0, Docker image.
- **samtools coverage** https://www.htslib.org/doc/samtools-coverage.html (samtools 1.25): columns, `-q`.
- **EBP Report on Assembly Standards** https://www.earthbiogenome.org/report-on-assembly-standards — Version 7.0,
  January 2026: 6.C.Q40 minimum; <1/10,000 error; <5 % false duplications; >90 % k-mer completeness; >90 % sequence
  in candidate chromosomes; >90 % BUSCO complete single copy; >90 % transcripts mappable; telomere criterion >50 %;
  Merqury needs Illumina or PacBio CCS, ideally independent of the assembly reads.
- **VGP paper** Rhie et al. 2021 Nature, PMC8081667: x = log10 contig NG50, y = log10 scaffold NG50, Q = QV, C = % to
  chromosomes in the VGP full notation (e.g. 6.7.P5.Q40.C90). EBP uses "C" in the second position = chromosome-scale.

## Project facts used (all from the internal project-facts sheet)
Species A-D are unpublished (owner request 2026-11-01): the page gives only rounded, relative or qualitative values.
Species B/C QUAST table (N50, NG50, N90, auN, L50 as ratios/ranges, 0 N/100 kb); QV gains from Medaka to NextPolish; same
short reads used by NextPolish and meryl (commands §1.4); sizes vs 2g guess; file-labelling mix-up;
species A hap1 glob bug; species A primary contig count, N50, L50 rounded; long-read QV ranking only;
hap1 QV vs BUSCO; Clair3 read-based QV lower bound on error; homopolymer stats (rounded),
mitochondrial C-run; spectra-cn 2-copy share and BUSCO D rounded; completeness rounded; size differences as percent;
depth window share, half-depth amount, one chromosome; telomere counts as shares; GenomeScope and published-relative size
as percent differences.

## Derived / my reasoning (stated as such or as logic in the page)
- "Reads used for polishing make the QV less independent" — from EBP's independence advice + the species B commands.
- Systematic (repeated) read errors invisible to Merqury: follows from the method's assumption (asm k-mer found in
  reads = correct); supported by the species A mitochondrial C-run majority undercall. Not a quoted Merqury statement.
- Scoring species B as "5" etc. uses floor(log10 NG50), my application of the VGP definition.
- Toy model is illustrative (c = 13, bell curves with variance 2*mu), not Merqury output.

## Not verified / left out
- QUAST run flags for species B/C (">= 3 kb" matches `--large` but the actual command is not recorded); not stated.
- Merqury/QUAST versions used in our projects (not recorded).
- No numbers for Inspector/CRAQ/Flagger runtimes on mammal genomes; not given.
- Flagger suitability for pseudohaploid primary: README says dual/diploid only; I did not test.

## Cross-links used
lesson 1 #n50 #km #vgp; #s05 (Hi-C), #s06 (purge_dups), #s07 (file names), #s09 (FCS-GX), #s10 (BUSCO), #s12 (sex chr).
