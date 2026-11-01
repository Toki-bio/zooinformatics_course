# s06 Pitfalls and checks: notes and sources (2026-10-31)

## Sources (URL, version, what was taken)
- PSMC, https://github.com/lh3/psmc, commit 82fa2ad (2025-11-16). Read from the repository files:
  - README: example command `-N25 -t15 -r5 -p "4+25*2+4+6"`; pattern explanation (first parameter spans 4 atomic intervals, last spans 6); rule "at least ~10 recombinations ... in the intervals each parameter spans" after 20 iterations, "Impropriate settings may lead to overfitting"; consensus depth advice `-d` a third of mean, `-D` twice the mean; `psmc2history.pl | history2ms.pl` to get "the ms command line"; bootstrap example with `splitfa` and 100 rounds; Appendix II: missed hets "has the same effect as smaller mutation rate", correction `psmc_plot.pl -M "sample1=0.1,..."`, or theta0/(1-FNR); "Probably a better solution is to downsample a high-coverage sample ... and measure FNR"; "Not correcting for low coverage is the most common pitfall".
  - utils/psmc_plot.pl (v0.2.0): option `-N FLOAT false negative rate [0]`, `-M` multiline mode with `name=FNR`; defaults `-u 2.5e-8`, `-g 25`.
  - utils/history2ms.pl: options `-n 2`, `-L 30000000`, `-s 100`, `-r 1` replicates, `-M` MaCS command; the command written is `msHOT-lite ... -l` (the mutation rate cancels out, comment "u is useless actually").
  - utils/psmc2history.pl: `-n 20` = which EM round is used (RD line); main.c prints RD 0..N, so round 25 exists for -N25.
  - utils/ms2psmcfa.pl: reads `@begin`/`@end` blocks, `-s 100`, writes K/T bins.
  - utils/splitfa.c: default piece 500,000 bins.
  - aux.c psmc_print_data: RS line fifth field = n_recomb x a0[k] with n_recomb = sum_L / C_sigma (our reading: inferred recombinations per atomic interval; the CC header labels the column pi_k).
- Hilgers L et al. 2025, Avoidable false PSMC population size peaks occur across numerous studies. Curr Biol 35:927-930.e3, doi 10.1016/j.cub.2024.09.028 (PubMed abstract). Full text read in the bioRxiv version, doi 10.1101/2024.06.17.599025 (posted 2024-09-18, CC-BY-NC): default pattern fixes the first four atomic intervals into one window; decline inside it -> exaggerated Ne in the previous window; patterns `2+2+25*2+4+6` and `1+1+1+1+25*2+4+6`; >70 studies with >200 inferences (preprint wording; published abstract says "numerous studies"); structure simulation (three subpopulations, M 0.01-10) after which a collapse produced similar peaks; quote "if a peak is only observed with the default parameter setting, it is likely an artifact"; bootstrapping vs parameter robustness; MSMC2 and Beta-PSMC partly affected.
- Nadachowska-Brzyska K et al. 2016 Mol Ecol 25:1058-72, doi 10.1111/mec.13540, PMC4793928 (full text read): >=18x mean coverage, per-site >=10 reads, <=25 % missing; <=10x with filter of a third of mean coverage "nearly flat lines"; maximum Ne correlated with coverage; ROH/IBD regions >10 kb removed "had essentially no effect on the PSMC curves"; four species converge 1-2 Ma; structure leads to overestimated Ne (citing Li & Durbin); quote "cannot accurately resolve demography in times relatively recent compared to the average TMRCA"; 100 bootstraps on 5-Mb segments; depth mask at twice the average.
- Chikhi L et al. 2018 Heredity 120:13-24, doi 10.1038/s41437-017-0005-6 (abstract): IICR equals Ne only in panmictic models; PSMC estimates the IICR. Mazet et al. 2016 is cited in s01/s03; the page links there.
- samtools view manual, samtools 1.25 (2026-10-27), https://www.htslib.org/doc/samtools-view.html: `-s INT.FRAC` = `--subsample-seed INT --subsample 0.FRAC`, pairs kept together.
- bcftools isec: manual https://samtools.github.io/bcftools/bcftools.html (page git 1.22-8) for `-p`, `-n`, example; output names from source vcfisec.c (develop branch, fetched 2026-10-31): README.txt, 0000 private to first, 0001 private to second, 0002/0003 shared records from first/second.
- bedtools shuffle docs (v2.31.0), https://bedtools.readthedocs.io/en/latest/content/tools/shuffle.html: `-i -g -incl -excl -seed -noOverlapping -chrom`. `bedtools subtract -a -b` standard usage.
- msprime docs 1.4.5, https://tskit.dev/msprime/docs/stable/demography.html and api.html: `Demography()`, `add_population(name, initial_size)`, `add_population_parameters_change(time, initial_size, population)`, times in generations ago; `sim_ancestry(samples=int)` = individuals, ploidy default 2; `sim_mutations(rate)` default 0, JC69 model. tskit `ts.variants()`, `v.genotypes`, `v.site.position` (standard tskit API; script not executed here).
- Lesson 2 s06 (homopolymers) and lesson 3 s09 (ROH, haplotigs, X control) linked, not repeated.

## Project results (lab project log; shown on the page only as ratios and directions because the species A data are unpublished)
- Read halves (half depth each) on a test subset: nearly identical in the old part; the full call set agrees only further back. Six-call-set figure: coincide in the old part, diverge in the youngest intervals (the lab log notes it is assumed, not proven, that this figure is the same test).
- PASS vs AF 0.3-0.7 agree in the old part (species A); relative PASS-only ~2x higher in the middle part.
- X control ~1 % after AF filter; Ts/Tv clearly below the 2.0-2.2 expected. Dense bins (>= 21 hets/100 bp): well under 1 % of hets in both genomes, tandem-repeat alleles.
- Pattern reruns: species A identical except the youngest intervals; youngest interval runs away to millions. Relative default vs split agree beyond the youngest intervals (peak height differs ~15 %), disagree in the youngest.
- ROH masks (re-scaled from result files on 2026-10-31): PSMC barely moves in either genome; MSMC2 "similar"; SMC++ species A recent value ~5-6x higher, relative peak ~1/3 lower. Earlier "peak disappears" test: superseded, cause not recorded (stated as such on the page).
- Repeat masks: TRF/simple/depth/dense-bin <= 5 %; all interspersed (roughly half the genome) cut the relative's peak by ~half; random same-size mask by ~a quarter.
- cobraa null result: s05. 20 bootstraps per curve.
- Placeholder scaling mu 5.4e-9/gen, g 1 yr.

## Toy model (our construction, not from a paper)
- 20,000 blocks of 100 kb; one TMRCA per block drawn by inverse cumulative hazard with rate 1/(2Ne) from a step history (30k <8k gen; 130k 8k-25k; 70k 25k-80k; 170k older; invented round values, illustrative only); true hets ~ Poisson(2 mu L T), mu 5.4e-9.
- Estimator: T_hat = observed hets / (2 mu L); log-spaced intervals 1,000 to ~2.8 M generations plus [0,1000) and a tail; piecewise-constant hazard MLE (events / exposure), intervals merged until >= 8 events; Ne = 1/(2h). Not PSMC (no HMM, blocks far longer than real segments); the page says so and shows the clean-data estimate.
- Spoilers: false hets Poisson(fp x 100) per block; missed hets binomial thinning; ROH blocks set to 0 true hets in runs of 5-50 blocks; collapsed duplication blocks +Poisson(600) (6/kb, an arbitrary illustrative divergence between copies); ROH caller = >= 3 consecutive blocks with < 20 hets.
- Behaviour claims in "What to notice" were checked by running the page (readouts at 3k/15k/50k/300k generations): fp 0.05 -> 3k-gen Ne 32k -> 55k, 15k-gen 102k -> 56k; FNR 30 % -> 300k-gen 167k -> 121k; ROH 20 % alone moves the readouts by 6 % or less; ROH 20 % + fp 0.05 -> 3k-gen 10k, masked -> 60k; caller finds 100 % of true ROH at fp <= 0.1, 85 % at 0.15, 22 % at 0.2, 0 % at 0.3; dups 10 % -> 300k-gen 167k -> 231k.
- The statement that evenly spread false hets raise the recent part of a real PSMC curve is our reasoning plus the toy; no paper was checked for a measurement of it, and the page labels it so.

## Not verified / open
- msHOT-lite availability and its output format were not tested; the route is presented as the README describes it, and the page says we did not use it.
- The msprime script was not run here (no msprime install checked); API calls match the 1.4.5 docs.
- "Mapping reference" row is reasoning (bias toward conserved regions), labelled as such; no paper cited.
- bedtools shuffle with -chrom -noOverlapping may fail to place very long ROH on short contigs; not tested.
- Whether a wide first PSMC window lets ROH coalescences spill into older windows was not tested; the page states only the observed flycatcher results and our own.
