# s03 From reads to per-site methylation: notes and sources (2026-11-01)

## Sources (URL, version, what was taken)

- modkit v0.6.4 (GitHub release 2026-06-11), book and command help: https://github.com/nanoporetech/modkit/tree/v0.6.4/book/src
  (rendered: https://nanoporetech.github.io/modkit/). Source `modkit/src/commands.rs` at the v0.6.4 commit.
  - intro_pileup.md: bedMethyl from aligned modBAM; "Only **primary alignments** are used ... it is recommended to mark
    duplicate alignments before running as multiple primary alignments can be double counted"; `--modified-bases 5mC 5hmC`
    with a reference = optimised routines (v0.6.0+); `--cpg`; `--combine-strands` "strand field ... marked as '.'
    indicating that the strand information has been lost"; `--combine-mods`; `--motif CG 0` meaning; palindromic motif
    requirement (CHH is not); 18-column table and definitions of Nmod, Ncanonical, Nother_mod, Nvalid_cov, Ndiff,
    Ndelete, Nfail ("usually failing the lowest 10th percentile of calls"), Nnocall (CG->CH example). Also says
    a missing `.fai` "will be created".
  - advanced_usage.md (pileup help): IN_BAM "should be sorted and have associated index"; `-n/--num-reads` default 10042,
    "10-50 thousand reads is sufficient"; `-p/--filter-percentile` default 0.1; `--filter-threshold` (global or C:0.75),
    `--mod-threshold h:0.8`, `--max-filter-threshold`, `--no-filtering`; `--cpg` "short hand for --motif CG 0";
    `-r/--reference` alias `ref`, "requires FAI fasta index to be pre-generated" (conflicts with intro_pileup.md; page
    tells readers to run `samtools faidx`); `--combine-strands` "Requires that the BAM records have correct MN tags";
    `--allow-non-primary`; `--bgzf`; `-t` default 4; `--log-filepath` (alias log); `--region`.
  - filtering.md, filtering_details.md, filtering_numeric_details.md: confidence q = maximum of the class probabilities;
    threshold = q at the lowest n-th percentile (10th default), estimated from sampled reads; examples
    `--filter-threshold C:0.8`; note on the `.` MM flag: Dorado omits low probabilities, which "can affect the
    estimation of the pass threshold".
  - faq.md: probability of canonical = 1 minus the sum of modification probabilities.
  - intro_sample_probs.md: "in some cases such as exotic organisms or specialized assays" look at probabilities directly;
    `modkit modbam sample-probs` options `-p` default 10,50,90, `--hist`, `-o/--out-dir` (required for histograms).
  - intro_summary.md: `modkit modbam summary`, whole modBAM by default in v0.6+, example `pass_threshold_C 0.7089844`.
  - troubleshooting.md: use `--log-filepath`; MN tag and hard clipping; `-Y` in dorado/minimap2 keeps supplementary
    sequence; no-rows causes; downsampled BAM -> use `--region`; CpG rows with zero pass coverage are not written.
  - CHANGELOG: `modbam check-tags` with `--head`; v0.6.2 `--allow-non-primary`.
  - commands.rs: top-level `summary`, `sample-probs` etc. still exist but are hidden (`#[clap(hide = true)]`); the listed
    form is `modkit modbam ...`.
- Dorado v2.1.2 (release 2026-08-26), source at tag v2.1.2: https://github.com/nanoporetech/dorado/tree/v2.1.2
  - `dorado/alignment/include/alignment/Minimap2Options.h`: default preset `lr:hq`; CHANGELOG "Default mapping preset for
    `dorado aligner` updated to `lr:hq`".
  - `dorado/aligner/Minimap2Aligner.cpp`: deletes MM/ML/MN from supplementary/secondary records when soft clipping is off.
  - `dorado/config/ModBaseBatchParams.cpp`: `methylation_threshold{0.05f}`; CLI `--modified-bases-threshold` "minimum
    predicted methylation probability for a modified base to be emitted in an all-context model".
- SAM optional tags spec, hts-specs master 2026-08-12: https://samtools.github.io/hts-specs/SAMtags.pdf - MM positions
  against the original orientation; footnote that tools reverse-complementing sequences need not change MM/ML; MN = SEQ
  length when MM was written, hard clipping invalidates offsets.
- minimap2 2.31 manual (release 2026-05-19): https://github.com/lh3/minimap2/blob/v2.31/minimap2.1 - `-y` "Copy input
  FASTA/Q comments to output"; `-Y` soft clipping for supplementary; `lr:hq` "error rate <1%"; `map-ont`.
- samtools 1.25 (release 2026-10-27), samtools-fasta.1: `-T TAGLIST` copies listed tags to the FASTQ header line.
- pb-CpG-tools v3.0.0 (release 2025-01-28): README https://github.com/PacificBiosciences/pb-CpG-tools - mapping "using a
  method that does not hard-clip supplementary alignments": pbmm2 (recommended) or minimap2 `-Y`; `model` (default) vs
  `count` mode (>0.5 = modified); output columns (no strand column); example header `##min-coverage=4`,
  `##min-mapq=1`. v3.0.0 source files (release archive): `cli.rs` defaults min_coverage 4, min_mapq 1;
  `meth_read_processor.rs`: `MODEL_CPG_WINDOW_COUNT = 11`, `CALLED_CPG_INDEX = 6`, `MODEL_METH_PROB_BIN_COUNT = 20`;
  count mode: `unmeth_cov = cov - meth_probs.len()` ("bases are given a meth prob of 0 if the value is missing"), and
  `cov()` sums all aligned bases (A/C/G/T/other) at the site, so a C>T read counts as unmethylated.
- jasmine README (repo HEAD 2026-05-29; latest release v26.1.3): https://github.com/PacificBiosciences/jasmine - 5mC model
  "integrates signal from both strands into a single prediction", "reports one call per CpG dyad on the forward
  strand"; MethBat "is the recommended tool for methylation pileup"; "pb-CpG-tools is deprecated in favor of MethBat for
  new analyses".
- MethBat v1.1.0 (release 2026-06-02), docs/pileup_guide.md: `methbat pileup --threads --input-bam --output-prefix`;
  one bgzipped BED per modification, Total/hap1/hap2 in the `type` column; defaults `--min-mapq 1`, `--min-coverage 4`,
  `--edge-trimming-size 20`, `--threads 1`; `strand` "." for unstranded 5mC; columns cov, mod_count, unmod_count,
  inferred_unmod_count, diff_base_count; preset `pbcpgtools` "Intended only for legacy compatibility".
- pbmm2 README (latest release 26.2.0, 2026-06-30): https://github.com/PacificBiosciences/pbmm2 - presets, `CCS`/`HIFI`
  default; implicit `-Y`; `--sort` writes `.bai`; changelog 1.11.0 "Strip HiFi kinetics tags".
- Ziller MJ, Hansen KD, Meissner A, Aryee MJ 2015 Nat Methods 12:230-232, doi 10.1038/nmeth.3152 (PMC4344394, full text
  read): "we recommend per sample coverage in the range of 5x to 15x"; deeper sequencing "better spent on an increased
  number of biological replicates"; coverage "defined as the total coverage across both DNA strands".

## Toy and calculators
- Toy pileup: invented reads/probabilities. Rules implemented: modkit confidence = max(p, 1-p) for a two-class (C vs 5mC)
  toy; fail if below threshold; Nvalid = mod + canonical; rows with Nvalid = 0 not written; combined rows at the + C
  position, strand "."; estimated threshold = 10th percentile of all 26 toy confidences (modkit samples reads; toy uses
  all). Count mode = pb-CpG-tools rules above, shown as one row per CpG.
- Coverage calculator: exact binomial, central 95 % interval; no calling error modelled (said on the page).

## Lab facts used (lesson 5 project-facts sheet, sections 1 and 2)
- Species A (a rodent): plan to re-basecall with sup + 5mCG_5hmCG + `--emit-moves` and run `modkit pileup`;
  never run; FASTQ only, no model tags, no raw signal; server without GPU; platform probably CycloneSEQ
  (unverified, written as "probably").

## Our inference / open doubts (marked on the page)
- modkit on PacBio HiFi modBAMs: not tested by us. Unclear how modkit's stranded rows treat jasmine's dyad calls on
  reverse-mapped reads.
- How pb-CpG-tools places calls from reverse-mapped reads (the read-to-reference function is not in the files read); the
  toy just shows one row per CpG, as the README output has no strand column.
- Whether `dorado aligner` output plus modkit default primary-only use loses anything for split reads: not measured.
