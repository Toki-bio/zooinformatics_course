# s07 Quality checks and viewing methylation: notes and sources (2026-11-01)

## Tools (URL, version, what was taken)

- modkit 0.6.4 (release 2026-06-11), book at https://github.com/nanoporetech/modkit/tree/v0.6.4/book/src
  - intro_modbam_check_tags.md + advanced_usage.md (`modbam check-tags`): tabulates records whose MM/ML are invalid or
    do not conform to the SAM tags specification; otherwise modkit "will log the error and ignore the record"; exits 1
    when invalid records are found unless `--permissive`; options `-n/--num-reads`, `-o/--out-dir`; tag-header table
    (e.g. `C+m.`).
  - intro_sample_probs.md + advanced_usage.md (`modbam sample-probs`): threshold per base; `--hist --out-dir` gives two
    HTML histograms and a table; quote "in some cases such as exotic organisms or specialized assays, you may want to
    interrogate the base modification probabilities directly and tune the pass thresholds"; `-n/--num-reads`.
  - faq.md: P(canonical) = 1 - sum of modification probabilities; modkit filters out the lowest-confidence calls.
  - filtering.md / advanced_usage.md: `--filter-percentile` (`-p`) in pileup, named `--filter-quantile` in `modbam summary` (corrected in final review), default 0.1 ("The default value is 10%",
    intro_validate.md); `--filter-threshold` overrides it; failed calls go to N_fail.
  - intro_summary.md: output header lines + table columns base, code, pass_count, pass_frac, all_count, all_frac;
    example threshold line `C 10 0.6972656`; `--matched-only`; `--cpg` with `-r`.
  - intro_pileup.md: bedMethyl columns 1-18 (10 N_valid_cov, 11 percent modified = N_mod/N_valid_cov*100, 12 N_mod,
    13 N_canonical, 14 N_other_mod, 15 N_delete, 16 N_fail, 17 N_diff, 18 N_nocall); `--combine-strands`, `--cpg`,
    `--include-bed`; strand column '.' when combined.
  - advanced_usage.md (`bedmethyl tobigwig`): `--mod-codes`, `-g/--sizes`; one modification code (or a combination
    of codes on the same base) per track.
- Dorado 2.1.2 (CHANGELOG, 26 Aug 2026), https://github.com/nanoporetech/dorado
  - `dorado/hts_utils/bam_utils.cpp`: read-group DS field written as `runid=... basecall_model=... modbase_models=...`;
    example @RG line in `dorado/secondary/common/bam_info.cpp`.
  - model list (`dorado/models/*.cpp`): several versions of the CpG model, e.g. `sup@v5.0.0_5mCG_5hmCG@v1`, `@v2.0.1`,
    `@v3`; `sup@v5.2.0_5mCG_5hmCG@v1`, `@v2`. The model-name example on the page is
    `dna_r10.4.1_e8.2_400bps_sup@v5.2.0_5mCG_5hmCG@v2`.
- SAM tags specification (MM/ML): https://samtools.github.io/hts-specs/SAMtags.pdf (hts-specs repo, current master).
- `samtools fastq -T` and `minimap2 -y` to carry tags through FASTQ and alignment: LongPhase README v2.1.2
  (https://github.com/twolinin/longphase/blob/v2.1.2/README.md), as in s04 notes.
- Jasmine (PacBio) README, commit of 2026-05-29, https://github.com/PacificBiosciences/jasmine : CpG methylation
  "typically symmetric" in vertebrate genomes, so one call per CpG on the forward strand; needs forward and reverse
  kinetics (`fi/fp`, `ri/rp`), otherwise no `C+m?` block.
- IGV desktop user guide, "Base modifications": https://igv.org/doc/desktop/#UserGuide/tracks/alignments/base_modifications/
  - MM (and optional ML) enable Color-by options; mono-colour (default) and two-colour; grey forward / sage reverse;
    grouped by strand (guide); threshold 0.5 (guide); highest-likelihood modification wins; alpha = ML likelihood;
    unmodified likelihood = 1 - sum; 2-colour 5mC red / unmodified blue, consistent with bisulfite display.
- IGV release notes 2.17.x: https://igv.org/doc/desktop/ReleaseNotes/2.17.x/ : 2.17.0 (Jan 2024) mono/two-colour for
  all modification types; "MM tags are now validated against the count of the modified base in the read sequence";
  bedMethyl listed as new file format; 2.17.2/2.17.3 fixes for reverse-strand validation.
- IGV source, `src/main/resources/preferences.tab` at tags v2.19.8 and v3.0.0-beta.7 (beta.7 commit 2026-09-24),
  https://github.com/igvteam/igv : `BASEMOD.THRESHOLD` default 0, `BASEMOD.GROUP_BY_STRAND` FALSE,
  `BASEMOD.VALIDATE_BASE_COUNT` TRUE. These defaults contradict the user guide (0.5, grouped); the page states both
  and tells the reader to check the preferences.
- methylartist 1.6.0 (GitHub release 2026-10-06), https://github.com/adamewing/methylartist README: commands locus,
  region, segmeth, segplot, composite, scoredist, wgmeth; `--phased` "Requires haplotypes to be tagged with
  whatshap"; example `locus -b sample.bam -i ... -m m --motif CG --ref ... --gtf ... --phased`.
  Paper: Cheetham SW et al. 2022 Bioinformatics 38:3109, doi 10.1093/bioinformatics/btac292.
- modbamtools: https://github.com/rrazaghi/modbamtools, latest release v0.4.8 (2022-08-02), last commit
  2022-08-02 (GitHub API, checked 2026-11-01); setup.py `python_requires=">=3.8, <=3.10.5"`.
- ONT modified-base validation data, 22 Oct 2024: https://epi2me.nanoporetech.com/mod-validation-data/ (synthetic
  oligos, canonical / 5mC / 5hmC / 6mA; pod5 + BAM; Dorado 0.8.2 and `modkit validate` 0.4.1 in the article).

## Papers

- Liu Y et al. 2021 Genome Biol 22:295, doi 10.1186/s13059-021-02510-z: seven ONT callers; weaker at discordant,
  intergenic, low-CG-density and repetitive regions; 5hmC partly explains nanopore vs bisulfite discrepancy.
- Tiras F, Cole C, Gray A 2026 Sci Justice 66:101489, doi 10.1016/j.scijus.2026.101489: 26 human saliva samples,
  Nanopolish/DeepSignal2/Megalodon/Remora vs EPIC array; 1x unstable, >=5x substantially better, 10x often best
  compromise but loses shared CpGs.
- Kulkarni O et al. 2026 Nat Commun 17, doi 10.1038/s41467-026-75183-6: "older models remain the reliable choice for
  studying CpG methylation"; effects of depth, read quality and basecalling mode.
- Simpson JT et al. 2017 Nat Methods 14:407, doi 10.1038/nmeth.4184 (training on DNA of known methylation; also cited
  in s02).
- Deaton AM, Bird A 2011 Genes Dev 25:1010, doi 10.1101/gad.2037511 (CpG islands mostly unmethylated).
- Tucci V et al. 2019 Cell 176:952, doi 10.1016/j.cell.2019.01.043 (imprinting review; one parental copy methylated
  at imprinting control regions).
- Renfree MB et al. 2008 Reproduction 136:523, doi 10.1530/REP-08-0264 (DMRs at H19, IGF2, PEG10 in marsupials;
  cited in s01/s04 notes).

## Lab facts used (lab project log / lab notes)

- Species A (a rodent) reads: one FASTQ, header style not Dorado-like, no basecaller model or RG
  tags, no pod5; provider request (raw signal, modification model / MM-ML BAM, re-call with 5mCG_5hmCG and
  `--emit-moves`, run details and reports) recorded as pending; pod5 size estimated at roughly ten times the reads
  (estimate, not measured).
- Species B and C: CycloneSEQ instrument, provider's basecaller and model (names withheld); ONT R10.4.1
  Medaka model applied, flagged as questionable. Whether CycloneSEQ offers 5mC calling: unverified (s02 covers the
  search).
- Species A Clair3 one-half-only het SNPs: high Ti/Tv (exact value withheld); 5mC explanation is our interpretation, stated as suspicion.
- *Darevskia armeniaca* HiFi run in a folder ending `_met`, read file FASTQ; meaning unverified, stated as such.

## Interactive figures

- QC dashboard: 6000 toy calls, seed fixed. P(5mC) for methylated calls ~ Beta(k, 1.6), unmethylated ~ Beta(1.6, k),
  guesswork calls ~ Uniform(0,1). Confidence = max(p, 1-p); modkit-like estimate = 10th percentile of confidence
  (mimics `--filter-percentile 0.1`; modkit samples reads and works per base/code, the toy does not). Coverage:
  Poisson reads per CpG (normal approximation above 30), each call passes with probability 1 - failed share.
  Traffic-light limits (estimated threshold 0.8/0.65; failed 15/35 %; bias 3/8 points; >=10x at 80 % of CpGs or
  >=5x at 50 %; strand share within 10/20 points of 50 %; strand difference 3/8 points) are teaching choices, stated
  as such on the page. The >=5x / 10x levels echo Tiras et al. 2026.
- IGV toy: 6 reads x 10 CpGs, probabilities drawn from a seeded generator; colouring follows the user-guide rules
  (colour if probability > threshold, two-colour uses 1 - P(5mC) for unmodified, alpha = probability).
- Clicked through at 1100 and 420 px: all five presets, "use modkit's estimate", both IGV modes, IGV threshold 0.8;
  no console errors, no page overflow (SVGs scroll inside .svgbox).

## Open doubts

- IGV defaults: guide (0.5, grouped by strand) vs source preferences (0, not grouped). Not tested in a running IGV.
- "A lower estimated threshold means a less sure model" and "a hump in the middle means guessing" are our reading,
  marked as such on the page.
- Strand-balance and strand-agreement limits have no published standard that we found.
- Whether CycloneSEQ provides any modified-base output: not verified.
