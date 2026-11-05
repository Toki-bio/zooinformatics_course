# s06 Selection from genealogies: notes and sources (2026-11-05)

## Sources (URL, version, what was read, supporting sentences)
- Deng Y, Nielsen R, Song YS 2025. Robust and accurate Bayesian inference of genome-wide genealogies for hundreds of genomes.
  Nat Genet 57:2124-2135. doi:10.1038/s41588-025-02317-9, PMC12425808. FULL TEXT read (PMC XML, with figure legends). Supplement NOT read.
  - Scan: "To find population-specific reduction in local diversity, we partitioned the genome into 1 kb windows and computed the ratio of
    the ARG-based diversity estimate for the combined sample to that for each of the five populations; reductions in local diversity
    would show up as peaks when these ratios are plotted along the genome."
  - Fig. 5 legend: "The ratio of the average pairwise coalescence time in the pooled sample, Tpooled (combining all five populations), to
    the average population-specific pairwise coalescence time, Twithin, for every 1 kb window. In each plot, the horizontal black dashed
    line denotes the genome-wide 99.99% quantile, and the gray shaded area corresponds to a 50 kb window surrounding the peak. The
    positions of these peaks are marked by vertical dashed lines, and the genes overlapping with these signals are indicated. b, The
    average Twithin for each population, zoomed into the gray regions highlighted in a."
  - Caution: "These examples illustrate the utility of SINGER for exploratory evolutionary analysis, but additional studies are needed to
    investigate if, and how, selection is acting in these loci."
  - Loci: "the gene MITF has experienced a reduction in diversity in GWD relative to other populations ... related to skin"; "SPCS3 has
    reduced diversity in YRI ... immune-related protein believed to impact virion production of flaviviruses"; "SCN9A, which encodes a
    voltage-gated sodium channel involved in the perception of pain ... has substantially reduced diversity".
  - Sample: "200 whole-genome sequences from five African indigenous populations (GWD, YRI, ESN, LWK and MSL) ... with 40 genomes
    randomly sampled per population".
  - "SNP-based diversity can be noisy at fine scales"; "SINGER produces more accurate estimates of fine-scale diversity than Relate and
    tsinfer + tsdate".
  - "The 90% CI covered the ground truth in only 44% of instances for Relate and 54% for ARGweaver. By contrast, the coverage was
    substantially better for SINGER, at 85%".
  - "the influence of background selection is pervasive"; CLUES "performs better with a sample of local trees".
  - "SINGER also requires WGS data"; "SINGER requires phased, contemporary genomes. Unfortunately, high-quality phasing is often
    challenging, especially for ancient DNA and non-model organisms."
- Schweinsberg J, Durrett R 2005. Random partitions approximating the coalescence of lineages during a selective sweep. Ann Appl Probab
  (arXiv math/0411069v2, https://arxiv.org/abs/math/0411069). Read: abstract, introduction, Theorem 1.1, parts of section 2 (PDF).
  - Abstract: "When a beneficial mutation occurs in a population, the new, favored allele may spread to the entire population. This
    process is known as a selective sweep."; "flip n independent coins with probability p of heads".
  - Theorem 1.1: alpha = r log(2N)/s, p = e^-alpha. r is the recombination probability between the two sites per generation.
  - "the approximation is not very accurate for realistic values of N".
  - "we say that the lineage escapes from the selective sweep"; Maynard Smith & Haigh (1974) "hitchhiking effect" is cited there; the
    1974 paper itself was not opened.
- Hejase HA, Mo Z, Campagna L, Siepel A 2022. A deep-learning approach for inference of selective sweeps from the ancestral recombination
  graph. Mol Biol Evol 39:msab332. PMC8789311. Full text read (selected passages by search).
  - "a burst of recent coalescence among the derived lineages" (1000 Genomes CEU locus); "a burst of coalescence events, corresponding
    to unusually large and young clades" (southern capuchino seedeaters, genus Sporophila).
- Speidel L, Forest M, Shi S, Myers SR 2019. A method for genome-wide genealogy estimation for thousands of samples. Nat Genet 51:1321-1329.
  doi:10.1038/s41588-019-0484-x, PMC7610517. Main text read (author manuscript); supplement NOT read, so the exact null is not described on the page.
  - "based on estimating the speed of spread of a particular lineage (carrying a particular mutation), relative to other "competing"
    lineages, over some chosen time range"; "we condition on the number of lineages present when it first arises, and use as a test
    statistic the number of present-day carriers"; "Assuming no population stratification, the null distribution of this statistic can
    be calculated analytically and is robust in principle to population size changes".
  - "the Relate Selection Test has reduced power to identify selection at rarer markers"; "35 distinct (24 novel) stringent signals
    genome-wide (pR < 5 x 10-8 in each of three or more groups)" across "twenty 1000GP populations"; "the LCT region";
    "Interpretation of our findings regarding natural selection requires some care."
- Relate manual, Modules page, https://myersgroup.github.io/relate/modules.html (read 2026-11-05; repository head b54ede2, 2026-05-19).
  DetectSelection.sh example command copied from there. "We recommend that you first estimate the population size history";
  .sele "Records the log10 p-value for selection evidence at generations genN .. gen1"; "P-values can only be calculated for mutations
  with derived allele frequency of at least 3."; "The "when_mutation_has_freq2" column contains the p-value for selection evidence over
  the lifetime of this mutation."
- Stern AJ, Wilton PR, Nielsen R 2019. An approximate full-likelihood method for inferring selection and allele frequency trajectories
  from DNA sequence data. PLoS Genet 15:e1008384. PMC6760815. Abstract read, plus selected passages. "estimating selection coefficients ...
  inferring the allele frequency trajectory".
- Stephan W 2019. Selective sweeps. Genetics 211:5-13. doi:10.1534/genetics.118.301319, https://academic.oup.com/genetics/article/211/1/5/5931215.
  Could NOT be read directly (no open PMC XML; direct download blocked). Read only through a fetch tool that returns short excerpts,
  first 100,000 of about 138,000 characters: "both of which reduce levels of genetic diversity and are hard to distinguish";
  "selection against the steady input of deleterious mutations". The reviewer should open the paper and confirm these two excerpts and
  what "both" refers to in the first one.

## Direction of the ratio
An internal lead described the statistic as Twithin / Tpooled with unusually LOW values. The paper defines the opposite direction:
Tpooled / Twithin, with PEAKS (quote above). The page follows the paper.

## Derived on the page (my arithmetic, not quoted)
- Half-caught distance d = ln 2 x s / (rho x ln 2N): 150.5 kb at s = 0.02, 753 kb at s = 0.1, with rho = 1e-8, N = 5,000.
- About 3 million 1-kb windows in a human genome, 99.99 % line passes about 300 per population.
- "The ratio is above 1 in ordinary windows because between-population pairs coalesce later": my explanation; true in the toy, not stated in the paper.
- "Small size in all" is my toy scenario (size multiplier 1 - 0.85 exp(-(d/150 kb)^2) on every population and the ancestor). It stands for
  any local reduction shared by all populations. Its magnitude is invented. The page says this reading is ours.

## Toy model
Three populations, 12 chromosomes each; N = 5,000, ancestor 10,000, split 4,000 generations ago; one independent coalescent tree per 5-kb
window, 400 windows; sweep = coin rule of Theorem 1.1 applied in population 1 at the sweep date, instantaneous; true trees used.
Threshold = quantile of 60,000 neutral ratios (20,000 windows x 3 populations).

## Code controls (run on the text between CORE-START and CORE-END of 06-selection.js)
Pair expectations from the model: within = 2N(1-e) + 2Na e with e = exp(-Ts/2N); between = Ts + 2Na.
| Control | Simulated | Expected |
|---|---|---|
| Neutral Twithin, 400,000 trees | 16,720 / 16,703 / 16,701 | 16,703 |
| Neutral Tpooled | 21,708 | 21,707 |
| Sweep, age 300, p = 1, Twithin pop 1 | 296 | 296 |
| Sweep, age 300, p = 0.5 | 12,609 | 12,601 |
| Sweep, age 1,500, p = 1 | 1,393 | 1,393 |
| Other populations under a sweep | 16,700 to 16,707 | 16,703 |
| Local size x 0.15: Twithin, Tpooled | 1,606, 5,310 | 1,604, 5,304 |
| Coin at d = 0; at the half distance | 1; 0.5000 | 1; 0.5 |
| Fast pair sums against a pair-by-pair recount of the tree, 500 trees | 0 mismatches | 0 |
| No sweep, share above the 99 / 99.9 / 99.99 % line | about 0.0100 / 0.0011 / 0.0001 | 0.01 / 0.001 / 0.0001 |
The first run of the first control failed (19,384 expected): the error was in my analytic formula (it counted Ts twice), not in the
simulator. The corrected formula was then confirmed against the other rows.

Table on the page (100 runs, 99.99 % line): s = 0.02 age 300: 100/100, 11.8 / 0.02 / 0.04 windows; age 1,500: 83/100, 1.8 / 0.05 / 0.06;
age 3,500: 7/100, 0.07 / 0.03 / 0.04; small size in all: 5/100, 0.05 / 0.04 / 0.04. At the 99 % line, small size in all: 3.3 / 3.3 / 3.2
windows per run within 150 kb of the middle against 0.6 by chance. Median distance of the top window from the target: 22.5 kb at s = 0.02,
92.5 kb at s = 0.1.

## Open doubts
- The Stephan excerpts (see above).
- Whether "small size in all" produces ratio peaks of this kind in real data was not checked against any source; the page marks it as our reading.
- The coin rule is the less accurate of the two approximations of Schweinsberg & Durrett; the page says so.
- The project note uses only what s08 of this lesson states; no PROJECT_FACTS file for this lesson was given.
