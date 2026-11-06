# s08 Bayesian inference: notes

Written 2026-11-06. Every source below was opened. "Abstract only" says when only the abstract was read. No lab data set and no
"In our projects" box: all data are invented toys.

## Sources, with the supporting lines

1. **Nascimento FF, dos Reis M, Yang Z (2017)** A biologist's guide to Bayesian phylogenetic analysis. Nat Ecol Evol 1:1446-1454,
   doi 10.1038/s41559-017-0280-x, PMC5624502. Full text read (retrieved through PubMed Central). Figures not seen; equations are lost in the
   text version.
   - "Its main feature is the use of probability distributions to describe the uncertainty of all unknowns including the model parameter(s)."
   - "involves multidimensional integrals and may be too expensive to compute"
   - "The sliding window (even with reflection) is a symmetrical proposal"; "If the proposal is asymmetrical, a correction term, called the Hastings ratio"
   - "it requires the calculation of the ratio of posterior densities, but not the posterior density itself"; "it visits the parameter values exactly in proportion to their posterior"
   - "If the window is too large, most of the proposals will fall in the tails of the posterior and be rejected."; "If the window is too small, the chain takes tiny baby steps, almost all of which are accepted"; "a near optimal acceptance proportion, at about 30-40%"
   - "Most current MCMC phylogenetic programs have automatic fine-tuning algorithms"
   - "If the maximum (MAP) model ... has the posterior" P, "then the acceptance proportion cannot exceed 2(1 - P)" (symbols lost in the text version, rebuilt from the worked sentence "if the MAP tree has posterior 99%, the highest acceptance proportion for cross-tree moves is 2%"); "an acceptance proportion of near 0 ... may and may not indicate a mixing problem in cross-model moves"
   - "cross-tree moves are typically constructed using tree-perturbation (branch-swapping) algorithms such as nearest-neighbour interchange (NNI), subtree pruning and re-grafting (SPR) and tree bisection and reconnection (TBR)"
   - Convergence, burn-in and mixing: "Parameter values sampled before reaching this stationary phase are usually discarded as the" burn-in; mixing "refers to how efficiently the chain traverses the posterior after it has reached the stationary distribution"
   - "using R or Tracer"; "the consistency among multiple runs could be because all runs got stuck in a region of the parameter space, giving the false impression that convergence was reached"; "it is important to initiate the runs from widely dispersed starting points"
   - "currently reliable automatic stopping rules do not exist"; "MCMC iterations from different programs are not comparable"
   - "Default priors in many Bayesian software packages may not be appropriate"; "Specification of the prior is the biologist's responsibility"; "this i.i.d. prior can cause very long trees in analysis of highly similar sequence data"
   - Running without data, comparing prior with posterior; "it is incorrect to specify the prior by trying to match the posterior"
   - "The posterior probability of a model ... is the probability that the model is correct, given the data."
   - Gamma(2, 20) prior on the distance is the prior of their K80 example; we reuse it for a JC69 toy.
2. **MrBayes 3.2 manual** (Ronquist, Huelsenbeck, Teslenko, Zhang), PDF at https://github.com/NBISweden/MrBayes/blob/develop/doc/manual/Manual_MrBayes_v3.2.pdf. Read: preface, chapter 1, quick and thorough tutorial of chapter 2, section 5.3.8.
   - Quick start: `execute primates.nex`, `lset nst=6 rates=invgamma`, `mcmc ngen=20000 samplefreq=100 printfreq=100 diagnfreq=1000`, `sump`, `sumt`.
   - "If the standard deviation of split frequencies is below 0.01 after 20,000 generations, stop the run"; "a standard deviation below 0.05 may be adequate"
   - "A rough guide is that an average standard deviation below 0.01 is very good indication of convergence, while values between 0.01 and 0.05 may be adequate depending on the purpose of your analysis."
   - "A small ESS (< 100) would indicate poor mixing behaviour"; PSRF "is based on comparing the estimated between-chain variance with the within-chain variance"; "A reasonable goal might be to aim for values between 1.0 and 1.2"
   - "Trends in likelihood values can be deceiving though"
   - "By default, MrBayes will discard the first 25 % samples from the cold chain"; "Nchains is set to 4, meaning that MrBayes will use 3 heated chains and one \"cold\" chain"; "heating is essential for some data sets but it is not needed for others"; "The time complexity of the analysis is directly proportional to the number of chains used"
   - "Every Swapfreq generation, two chains are picked at random and an attempt is made to swap their states."; chain i is heated by raising its posterior probability to a power below 1 (the page's "flattened copy" is our wording for this).
   - Default `Topologypr` Uniform; `Brlenspr` Unconstrained:GammaDir(1.0,0.100,1.0,1.0): "essentially puts a prior on the total length on the tree, and then assigns prior lengths on individual branches by dividing the tree length using a Dirichlet prior"
   - Output files: `.p`, `.t`, `.mcmc`, `.parts`, `.tstat`, `.vstat`, `.con.tre`, `.trprobs`.
   - RevBayes: "allows users to build complex phylogenetic models interactively, from small building blocks. However, such flexibility requires more of the user"
3. **MrBayes source**, tag v3.2.9 (latest release at the time of writing), https://github.com/NBISweden/MrBayes, file src/bayes.c: numGen 1000000, sampleFreq 500, swapFreq 1, diagnFreq 5000, minPartFreq 0.10, relativeBurnin YES, burninFraction 0.25, numRuns 2, numChains 4. These agree with the manual. Branch develop, src/mcmc.c, CalcPartFreqStats: a split is included if its count reaches minPartFreq in at least one run; stdev uses (sumsq - sum*sum/n)/(n-1), then sum/numPartitions. The toy's ASDSF copies this.
4. **Ronquist F et al. (2012)** MrBayes 3.2. Syst Biol 61:539-542, doi 10.1093/sysbio/sys029. Reference only (manual used for content).
5. **RevBayes tutorials**, https://revbayes.github.io/tutorials/ . Opened 2026-11-06, no version on the page.
   - convergence/: "Since we lack a theoretical convergence assessment"; "we need to make a decision of when we have sampled enough"; "it's recommended to run at least two or better four replicates"; "We suggest to use a SEM smaller of 1% of the 95% probability interval of the distribution"; "An ESS of 625 is therefore the default value for the convenience package."; "The ASDSF is problematic for two reasons: (1) for large trees with many splits that have posterior probabilities close to 0.0 or 1.0 will overwhelm the ASDSF and hence even a single split that is present in all samples in run 1 ... and is never present in any sample in run 2 ... might not be detected"
   - mcmc_troubleshooting/: "common recommendations for desirable acceptance proportions range from around 0.2 to 0.4"; "An MCMC can get stuck on a local optimum"
   - mcmc/binomial: coin example opened; used only as a pointer for further reading.
6. **BEAST documentation.** https://www.beast2.org/what-is-ess/ : "The Effective Sample Size (ESS) of a parameter sampled from an MCMC" "is the number of effectively independent draws from the posterior distribution"; "Tracer flags up ESSs < 100 but this may be liberal and > 200 would be better." https://beast.community/ess_tutorial : same definition and thresholds.
7. **Erixon P et al. (2003)** Syst Biol 52:665-673, doi 10.1080/10635150390235485. Abstract only (PubMed). "Bayesian posterior probabilities are significantly higher than corresponding nonparametric bootstrap frequencies for true clades, but also that erroneous conclusions will be made more often. These errors are strongly accentuated when the models used for analyses are underparameterized."
8. **Alfaro ME et al. (2003)** Mol Biol Evol 20:255-266, doi 10.1093/molbev/msg028. Abstract only (PubMed). "BMCMC-PP and ML-BP were often strongly correlated with one another but could provide substantially different estimates of support on short internodes."; "BMCMC-PP provided high support values for correct topological bipartitions with fewer characters than was needed for nonparametric bootstrap."
9. **Douady CJ et al. (2003)** Mol Biol Evol 20:248-254, doi 10.1093/molbev/msg042. Abstract only (PubMed). "they are surely not interchangeable and cannot be directly compared"
10. **Yang Z (2007)** Mol Biol Evol 24:1639-1655, doi 10.1093/molbev/msm081. Abstract only (PubMed). "the posterior tree probabilities do not converge to 1/3 each, but they vary among data sets according to a statistical distribution"; "high and presumably spurious posterior probabilities for trees or clades"; "The posterior tree probabilities are found to be very sensitive to the prior."

## Controls of the toys (run 2026-11-06)

Distance walker. The section's core code was loaded on its own in Node, and the page was clicked in headless Chrome.
- Chain against grid, all 12 combinations of data and prior, 800,000 steps with a window of 2.5 posterior standard deviations: all posterior means within 2 Monte Carlo standard errors of the grid (largest z 1.96), standard deviations and 95 % limits agree to the third decimal or better.
- Grid against an independent Python calculation (adaptive quadrature, different code): largest difference in the posterior mean 4e-7.
- "No data": the chain returned the prior (gamma mean 0.1: grid 0.1000, chain 0.1008; gamma mean 0.5: 0.5000, 0.5002; flat: 1.5000, 1.5004).
- ESS function on simulated AR(1) series with known answer, n = 200,000: rho 0 gave 198,526 (expected 200,000), 0.5 gave 65,074 (66,667), 0.9 gave 10,495 (10,526), 0.99 gave 1,135 (1,005).
- Page, 45,001 steps at the default step size: control passes for 11 of 12 settings. The twelfth (no data, flat prior) reports ESS 95 and "not trustworthy yet", correctly: a window of 0.3 mixes slowly over a range of 3.
- Page, default settings, one seed: step 0.3 acceptance 34 %, ESS 577, mean 0.1052 against 0.1063. Step 0.002: acceptance 98.7 %, ESS 3, mean 1.41; after 25,000 steps mean 1.32. Step 2: acceptance 10 %, ESS 281. Burn-in 0: mean 0.1109.

Three-tree walker.
- Grid against an independent Python calculation (matrix-exponential pruning, adaptive quadrature): largest difference 2.9e-5 over five data sets.
- 400,000 steps per run: data 6,4,2 grid 0.842, 0.125, 0.033, runs 0.842 and 0.843, 0.124, 0.033 and 0.034. 8,5,2 grid 0.968, 0.029, 0.003, runs 0.968, 0.029, 0.003. Tie: about 1/3 each. Acceptance of tree moves stayed below 2(1 - P) in every case: 0.190 against 0.316 for 6,4,2 and 0.035 against 0.064 for 8,5,2.
- Page, 20,000 steps: passes. 300 steps: the ASDSF ranged from 0.019 to 0.083 in three starts, and the gap to the grid from 0.02 to 0.07.
- Bootstrap 6,4,2: 0.696, 0.264, 0.040 (1,000 replicates). Ties in a replicate are shared equally.

Limit of the toy found in the control: with equal support for two trees (for example 30, 30, 0), the two trees have the same posterior at every t, so tree moves between them are always accepted. This toy therefore cannot show a chain stuck between two peaks. A "two peaks" preset was planned and removed. The page teaches sticking in words only.

## Doubts

- The ESS in the toy uses Geyer's initial positive sequence. Tracer and MrBayes may calculate ESS differently; we did not read their code. The page gives no formula.
- The toy keeps the outer branches fixed, so its posterior and bootstrap values illustrate the direction of the difference only, not its size in real data.
- The four simulation papers on posterior probability against bootstrap were read as abstracts only.
- The fixed "control passed" limits on the page (ESS 200, 10 % histogram difference, 3 standard errors; 0.02 for trees) are our own choices for the toy, not published rules. ESS 200 follows the BEAST page.
- Heated-chain "flattened copy" and "can carry the cold chain to another peak" are our plain wording of the manual's description.
- MrBayes `.con.tre` and the rest were read in the manual, not checked by running the program.

## Final review 2026-11-06
- Added a tooltip for "Dirichlet distribution" in the Brlenspr row (our wording).
