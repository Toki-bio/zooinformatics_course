# s09 Dating trees: notes

Written 2026-11-06. Every source below was opened. "Abstract only" says when the full text was not read. Papers marked PMC were retrieved from
PubMed Central; DOIs are given for all.

## Sources, with the supporting lines

1. **Drummond AJ, Ho SYW, Phillips MJ, Rambaut A (2006)** Relaxed phylogenetics and dating with confidence. PLoS Biol 4:e88,
   doi 10.1371/journal.pbio.0040088, PMC1395354. Full text read.
   - "the individual contributions of rate and time to molecular evolution cannot be separated"
   - "even under a molecular clock assumption, the divergence times and the overall substitution rate can only be separately estimated if
     there is a source of external calibration information". Three sources follow: prior on internal node ages; known ages of the sequences;
     a strong prior on the substitution rate. "If there is no prior information about the mean substitution rate, then it can be fixed to 1,
     resulting in time being in units of substitutions per site."
   - "we specify the age, or the prior distribution of age, for the most recent common ancestor of a set of taxa"
   - "local molecular clock models estimate a separate molecular rate for each user-circumscribed group of branches"
   - Autocorrelated: "the rate in each branch being drawn (a priori) from a parametric distribution whose mean is a function of the rate on the parent branch"
   - Uncorrelated: "the rate on each branch of the tree is drawn independently and identically from an underlying rate distribution"
   - "CLOC did extremely poorly, with the true rates included in the 95% HPDs between only 3% and 11% of the time"
   - "the uncorrelated relaxed-clock models also perform well when the data are clocklike"
   - "For all of the datasets that were analyzed, the phylogenetic estimates made using a strict molecular clock were the most precise."
   - "point calibrations that utilize the oldest fossils that mark divergences of one group from another are likely to be substantial underestimates"
2. **Heath TA, Huelsenbeck JP, Stadler T (2014)** The fossilized birth-death process for coherent calibration of divergence-time estimates.
   PNAS, doi 10.1073/pnas.1319091111, PMC4115571. **Abstract and significance statement only** (the full-text request returned no body).
   - "Because molecular sequence data are not informative on absolute time, external data ... are required"
   - "absolute node age estimates are calibrated by a single diversification model and arbitrary calibration densities are not necessary"
   - "our model accommodates all the reliable fossils for a given phylogenetic dataset"
3. **Ronquist F et al. (2012)** A total-evidence approach to dating with fossils, applied to the early radiation of the Hymenoptera.
   Syst Biol 61:973-999, doi 10.1093/sysbio/sys058, PMC3478566. Abstract and introduction read closely, the rest searched.
   - "Originally, phylogenies were dated by assuming a constant molecular clock, the rate of which could be estimated by reference to the fossil record (Zuckerkandl and Pauling 1962)."
   - "it is now standard practice to accommodate such rate variation using relaxed-clock models"
   - "the calibration data must be associated with fixed nodes in the tree, despite the fact that we do not know any of the nodes with absolute certainty"
   - "For node dating, one thus often ends up discarding most of the information preserved in the fossil record"
   - "it is likely to sit on a side branch of some unknown length rather than directly on the calibration node itself"
   - Abstract: "the posterior distributions on divergence times are less sensitive to prior assumptions and tend to be more precise than in node dating"
   - The Yule process: "a model assuming complete sampling and no extinction"
4. **Ronquist F et al. (2016)** Closing the gap between rocks and clocks using total-evidence dating. Phil Trans R Soc B,
   doi 10.1098/rstb.2015.0136, PMC4920337. Introduction and the deep-root-attraction section read.
   - "there is a tendency for TED divergence time estimates, under certain conditions, to be pushed back to very old strata and to be very imprecise"
   - "DRA occurs when there are model errors or conflicts in the data that are difficult to reconcile, and ghost lineages carry little cost"
5. **Parham JF et al. (2012)** Best practices for justifying fossil calibrations. Syst Biol 61:346-359, doi 10.1093/sysbio/syr107, PMC3280042.
   Checklist and age sections read.
   - The five numbered checklist points.
   - "For a minimum age constraint, the youngest age interpretation of the fossil should be used ... rather than the common practice of adopting a midpoint in the possible range."
   - "there is presently no practical way to estimate curve parameters"
6. **Heled J, Drummond AJ (2012)** Calibrated tree priors for relaxed phylogenetics and divergence time estimation. Syst Biol 61:138-149,
   doi 10.1093/sysbio/syr087, PMC3243734. Abstract and examples read.
   - "calibration densities, such as those defined in BEAST 1.5, do not represent the marginal prior distribution of the calibration node"
7. **Barba-Montoya J, dos Reis M, Yang Z (2017)** Comparison of different strategies for using fossil calibrations to generate the time prior in
   Bayesian molecular clock dating. Mol Phylogenet Evol 114:386-400, doi 10.1016/j.ympev.2017.07.005, PMC5546266. Abstract and methods read.
   - "expected to have a major impact on divergence time estimates even if a huge amount of molecular data is available"
   - "the effective priors on the calibration node ages after the truncation can be very different from the user-specified calibration densities"
   - "Bounds are hard (with zero probability for any ages outside the interval) in BEAST2 and MrBayes, and soft in MCMCTree"
   - "Both BEAST2 and MrBayes use the so-called multiplicative construction"
8. **Rannala B (2016)** Conceptual issues in Bayesian divergence time estimation. Phil Trans R Soc B 371, doi 10.1098/rstb.2015.0134.
   **Abstract only.** "estimates of divergence times that are grossly incorrect, yet have a narrow posterior distribution"
9. **Bouckaert R et al. (2019)** BEAST 2.5. PLoS Comput Biol 15:e1006650, doi 10.1371/journal.pcbi.1006650, PMC6472827. Introduction and the
   section on extended structures read. "BEAST is a package for conducting Bayesian phylogenetic inference using MCMC."
10. **To T-H, Jung M, Lycett S, Gascuel O (2016)** Fast dating using least-squares criteria and algorithms. Syst Biol 65:82-97,
    doi 10.1093/sysbio/syv068, PMC4678253. Abstract, introduction and model read.
    - "current sophisticated probabilistic approaches struggle to handle data sets of this size"
    - "Our algorithms take as input a binary phylogenetic tree with branch lengths ... and sampling dates associated with the taxa"
    - "this model is robust to uncorrelated violations of the molecular clock"
    - "their estimation accuracy is similar to that of the most sophisticated methods, while their computing time is much faster"
11. **Sanderson MJ (2002)** Estimating absolute rates of molecular evolution and divergence times: a penalized likelihood approach.
    Mol Biol Evol 19:101-109, doi 10.1093/oxfordjournals.molbev.a003974. **Abstract only**, and the page says so.
    "A saturated model in which every lineage has a separate rate is combined with a roughness penalty that discourages rates from varying too much across a phylogeny."
    "This criterion is based on an estimate of the average prediction error associated with pruning lineages from the tree."
12. **Heath TA, FBD tutorial, Taming the BEAST**, https://taming-the-beast.org/tutorials/FBD-tutorial/ (web version, for BEAST v2.7.x) and its PDF.
    Background and BEAUti steps read.
    - "it provides a reliable minimum age bound on the ancestral node time. However, maximum bounds are far more difficult to come by."
    - "because the rate and time are confounded in the branch-length parameter, the prior describing the branching times can have a strong effect on divergence time estimation"
    - "Without external information to calibrate the tree, divergence time estimation methods can only reliably provide estimates of relative divergence times"
    - Figure 1: estimating time needs "a model of among-lineage substitution rate variation to tease apart rate and time".
    - Exponential: "useful for calibration if the fossil age is very close to the age of its ancestral node". Lognormal: "places the highest probability on ages somewhat older than the fossil". Normal: "not always appropriate".
    - "this approach is not suitable for dating trees using biogeographical information or secondary calibration dates"
    - "Optimized Relaxed Clock option (provided by the ORC package)"; the default is "Strict Clock"; "Fossilized Birth Death Model"; SA package.
    - "Check the box labeled Sample From Prior at the bottom of the MCMC panel"; BEAST ignores "the likelihood coming from the sequence data" while the MCMC still accounts for fossil occurrence times.
    - "The Maximum clade credibility tree is the topology with the highest product of clade posterior probabilities across all nodes." "Median heights".
13. **Drummond, Rambaut, Bouckaert, Xie, Divergence Dating Tutorial with BEAST 2.2.x**,
    https://beast2-dev.github.io/beast-docs/beast2/DivergenceDating/DivergenceDatingTutorial.html. Read.
    - "M=1.78 and S=0.085 which will specify a distribution centred at about 6 million years ... a central 95% probability range covering 5-7 Mya"
    - "As this is a calibrated node to be used in conjunction with the Calibrated Yule prior, monophyly must be enforced"
    - "The 95% HPD ... the most compact interval on the selected parameter that contains 95% of the posterior probability"
    - "It is a good idea to rerun the analysis while sampling from the prior"
14. **BEAST2 source and releases**, https://github.com/CompEvol/beast2. Latest release tag read on 2026-11-06: v2.7.8. MCMC.java has the input
    `sampleFromPrior`, "whether to ignore the likelihood when sampling (default false)".

Ho and Phillips (2009, Syst Biol 58:367) was not opened and is not cited on the page.

## Toys and controls

Both tools use invented distances for invented species P, Q, R, S (no lab data). Tool 1: a strict clock, node depth = half the mean distance between
the two groups. Tool 2: the same tree with branch lengths taken as exact, so each age is the calibrated age times a fixed ratio (1/3, 1, 5/3). The
lognormal sigma = 0.6 and the "same mean gap" setting are our choices, stated on the page.

Control run 2026-11-06 (headless Chrome, through the real page), 25 checks, 25 passed:
- Hand tree: calibration 30 My on P+Q+R gives rate 0.001 and ages 10, 30, 50.
- All 201 slider settings on all three nodes: age = node depth x calibration / depth of the calibrated node. Worst difference 0.033 My, which is display rounding to 0.1.
- Branch to P stayed 0.010 and root / P+Q stayed 5.00 at every setting. Doubling the calibration doubled all ages and halved the rate.
- Changing the calibrated node without moving the slider keeps the same tree.
- Medians and central 95 % ranges of the three priors, at three fossil and gap settings each, agree with independent numeric integration of the density; the mean gap equals the set gap.
- The tutorial's lognormal M = 1.78, S = 0.085 gives 5.93 and 5.02 to 7.00, matching its "about 6" and "5-7".
- The 15 My example in the clock text recomputed. No script errors. No page overflow at 420 px.

## Doubts

- Tool 2 is deliberately simple: with exact branch lengths and one calibration there is no real inference, only rescaling. The page says so.
- The node-dating tutorial is for BEAST 2.2; its BEAUti steps were not tried in current BEAUti. The page says menus may differ.
