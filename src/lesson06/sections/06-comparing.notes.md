# s06 Comparing samples: differential methylation - sources and notes

## Tool documentation and source

- modkit v0.6.4 (Oxford Nanopore), documentation book: https://nanoporetech.github.io/modkit/
  - intro_dmr: input = bgzipped + tabix-indexed bedMethyl from `modkit pileup` (pileup to stdout with `-` piped
    into bgzip is the docs' own example); `dmr pair` does regions or single sites, `dmr multi` regions only;
    samples with the same name in `multi` are combined; `--ref-sample`; `-o` required for multi; output schema;
    "Columns 15, 16, and 17 ..." note and the recommendation to use `--header`; replicate columns (balanced
    p-value/effect size; per-replicate-pair columns only with equal numbers of a and b samples); segmentation
    with `--segment`, coarse default vs `--fine-grained`.
  - The regions example table has 18 columns (it includes `effect_size`) while the schema list ends at 17:
    checked in the docs text.
  - dmr_scoring_details: "The aim of `modkit dmr` is to enable exploratory data analysis ... simple and
    interpretable"; likelihood-ratio score with Jeffreys prior, binomial / multinomial; MAP-based p-value after
    Makowski et al. 2019 (implementation uses the empirical effect size); 100-read cap ("becomes unstable");
    2-state HMM, emission p_Same = e^-score; defaults diff-stay 0.9, dmr-prior 0.1, decay-distance 500;
    Cohen's h with 95 % CI, "filtering or sorting on the lower bound"; "small effect sizes will become
    statistically significant".
  - advanced_usage (CLI help): `--delta` default 0.05, `--max-gap-size` default 5000, `--min-valid-coverage`
    default 0 (dmr pair and multi), `--single-code`, `--base`, `--cap-coverages` help text (3 replicates of 30x
    "would normally" give 90).
  - limitations: MAP-based p-value not available for regions; it sums modification types, the LLR score does not.
  - intro_pileup: bedMethyl column 4 = modified base code (+ motif when several motifs), column 10 = N_valid_cov,
    column 11 = percent modified, column 12 = N_mod.
- modkit source v0.6.4 (https://github.com/nanoporetech/modkit, `modkit-core/Cargo.toml` version 0.6.4),
  `modkit-core/src/dmr/single_site.rs`: `collapse_counts(counts, false)` sums the counts of all replicates of a
  condition before the score, MAP p-value and Cohen's h; `collapse_counts(counts, true)` ("balanced") first
  rescales each replicate to the mean coverage, then sums. Basis for the page's statement that replicates are
  pooled reads.
- DSS 2.60.0, Bioconductor 3.23 release: https://bioconductor.org/packages/release/bioc/html/DSS.html, source
  tarball DSS_2.60.0.tar.gz (DESCRIPTION Version 2.60.0):
  - R/DMR.R: `callDMR(DMLresult, delta=0, p.threshold=1e-5, minlen=50, minCG=3, dis.merge=100, pct.sig=0.5)`;
    `dis.merge` set to `minlen` when larger; with delta > 0 a per-site probability from pnorm(diff -/+ delta,
    sd = diff.se) replaces the p-value; delta refused for multifactor results ("'delta' is not supported");
    DMR kept if length > minlen and nCG > minCG.
  - R/DML.R: `DMLtest(BSobj, group1, group2, equal.disp=FALSE, smoothing=FALSE, smoothing.span=500)`; stops with
    one replicate unless smoothing=TRUE or equal.disp=TRUE.
  - R/DML.multiFactor.R: `DMLfit.multiFactor(BSobj, design, formula, smoothing=FALSE, smoothing.span=500)`,
    `DMLtest.multiFactor(DMLfit, coef=2, term, Contrast)`, coef may be a design-matrix column name.
  - vignette: input text file columns chr, pos, N, X; Wald test; shrinkage estimator from a Bayesian hierarchical
    model; neighbouring CpGs as "pseudo-replicates"; arcsine link; "It is very difficulty [sic] to select a
    natural and rigorous threshold for defining DMRs. We recommend users try different thresholds".
- bedMethyl -> DSS conversion (awk, start+1 for 1-based pos, columns 10 and 12, filter column 4 == "m") is our
  own one-liner built from the two documented formats; not from either tool's docs.

## Papers (abstracts read via PubMed; full text where noted)

- Feng H, Conneely KN, Wu H 2014 NAR 42:e69 doi:10.1093/nar/gku154 (lognormal-beta-binomial, Wald test, DSS).
- Wu H et al. 2015 NAR 43:e141 doi:10.1093/nar/gkv715 (DSS-single, neighbouring CpGs, no replicates).
- Park Y, Wu H 2016 Bioinformatics 32:1446 doi:10.1093/bioinformatics/btw026 (beta-binomial regression,
  arcsine link, general designs).
- Korthauer K et al. 2019 Biostatistics 20:367 doi:10.1093/biostatistics/kxy007 (dmrseq; quote "can be
  implemented even when as few as two samples per population are available").
- Akalin A et al. 2012 Genome Biol 13:R87 doi:10.1186/gb-2012-13-10-r87 (methylKit).
- Jühling F et al. 2016 Genome Res 26:256 doi:10.1101/gr.196394.115 (metilene; quotes "dozens of samples per
  group", "without biological replicates").
- Makowski D et al. 2019 Front Psychol 10:2767 doi:10.3389/fpsyg.2019.02767 (cited by modkit).
- Smyth GK 2004 Stat Appl Genet Mol Biol 3:Article3 doi:10.2202/1544-6115.1027 (moderated t, used in the toy).
- Jaffe AE, Irizarry RA 2014 Genome Biol 15:R31 doi:10.1186/gb-2014-15-2-r31 (cell composition in blood, age).
- Horvath S 2013 Genome Biol 14:R115 doi:10.1186/gb-2013-14-10-r115, full text (PMC4015143): 8,000 samples,
  82 datasets, 51 tissues/cell types; glmnet, alpha 0.5, lambda by CV (0.0226); 353 CpGs; test data
  correlation 0.96, median error 3.6 years.
- Horvath S, Raj K 2018 Nat Rev Genet 19:371 doi:10.1038/s41576-018-0004-3 (review; listed, not quoted).
- Lu AT et al. 2023 Nat Aging 3:1144 doi:10.1038/s43587-023-00462-6: 11,754 arrays, 59 tissue types,
  185 species.
- Arneson A et al. 2022 Nat Commun 13:783 doi:10.1038/s41467-022-28355-z: "up to 36k CpGs per species that are
  well conserved across many mammalian species".
- Newediuk L et al. 2025 Mol Ecol Resour 25:e14120 doi:10.1111/1755-0998.14120, full text (PMC12415925): "wildlife
  clocks often rely on datasets with no more than a few dozen samples"; inaccurate training ages bias age
  acceleration; most accurate when training samples resemble test samples ("trained with all classes of
  interest"); polar bear data: no difference in R-squared or MAE between LOO cross-validation and hold-out.
- Le Clercq L-S et al. 2023 Biol Rev 98:1972 doi:10.1111/brv.12992: meta-analysis, "more than 40 species in
  common", methylation outperforms telomere length in predictive power.
- Cohen's h size thresholds 0.2 / 0.5 / 0.8: Cohen J 1988, Statistical Power Analysis for the Behavioral
  Sciences, 2nd ed. (textbook convention; not re-read here).

## Lab facts used

- No methylation calls exist for any lab genome; the species A genome is one male (lab project log).
- More individuals were judged necessary for population questions in the species A project (lab notes). That
  this applies to DMR replicates is stated in the page as our inference.

## Interactive figures

- Toy DMR test: 200 regions x 10 CpGs, 20 true DMRs (every 10th region); baseline ~80 % of regions at 0.65-0.92,
  ~20 % at 0.03-0.20; animal effect = SD x (shared region deviate + 0.5 x CpG deviate); Poisson read depth;
  binomial reads. Pooled = two-proportion z-test on summed reads; per animal = moderated t on per-animal levels
  (prior variance = median unit variance, prior df 4). BH at q = 0.05. Optional |difference| >= 0.10 filter.
  Defaults (10x, 3 animals, delta 0.20, SD 0.05) give about 11/20 true regions and 0 false positives on the
  default seed. Numbers in "What to notice" were checked by sweeping the controls in headless Chrome
  (e.g. pooled reads at SD 0.05: 23 / 64 / 94 false positive regions at 10x / 30x / 60x).
- Calculator: two-proportion z-test p, Cohen's h with normal-approximation 95 % interval +-1.96 sqrt(1/nA+1/nB).
- The toy p-value for 24/30 vs 15/30 in the simple box (p about 0.015) is the two-proportion z-test (z = 2.44).

## Open doubts

- Whether modkit dmr behaves differently for `dmr multi` with same-named samples than for single-site pair was
  not checked in source (docs say "combined").
- The awk conversion assumes column 4 is exactly "m"; with more than one motif the docs say column 4 also carries the motif.
  The page tells the reader to check.
- No long-read-specific benchmark of DSS/dmrseq was read; the page says these tools were built for bisulfite
  data and that calling-quality differences can mimic methylation differences (our inference).
