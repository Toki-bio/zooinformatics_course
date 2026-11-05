# s03 PSMC: notes and sources (2026-10-31)

## Sources (URL, version, what was taken)
- lh3/psmc, https://github.com/lh3/psmc, master commit 82fa2ad (2025-11-16). Source read with `git show` (the repo has a file `aux.c`, which Windows cannot check out).
  - README: example commands (`psmc -N25 -t15 -r5 -p "4+25*2+4+6"`), meaning of the pattern ("64 atomic time intervals and 28 (=1+25+1+1) free interval parameters"), the "~10 recombinations after 20 rounds" rule and "impropriate settings may lead to overfitting" / "suitable for modern humans" quotes, bootstrap recipe (splitfa, `-b`, 100 rounds; the example feeds `split.fa` after writing `split.psmcfa`), scaling formulas in Appendix I (N0 = theta0/(4 mu)/s, T = 2 N0 t_k, N = N0 lambda_k), low-coverage FNR correction in Appendix II.
  - cli.c: version string `0.6.5-r74-dirty`; defaults `-p 4+5*3+4`, `-t 15`, `-r 4`, `-N 30`; option list; output line legend (CC, MM, RD, LL, QD, TR, RS, DC); input coding (A/C/G/T and T = homozygous bin, K/M/R/S/W/Y = het bin, other = missing); pattern parser (n = sum - 1, so 64 atomic intervals for 4+25*2+4+6).
  - core.c: interval boundaries t_k = alpha (exp(beta k) - 1), alpha = 0.1, beta = ln(1 + max_t/alpha)/n, t_n = max_t, last interval to infinity; initial theta = -ln(1 - sum_n/sum_L), rho = theta / tr_ratio; max_t is one of the parameters.
  - em.c: all parameters (theta, rho, max_t, lambdas) optimised in the M step (Hooke-Jeeves `kmin_hj`) -> "-t is a starting value, refitted" (printed on MT line, aux.c).
  - aux.c: psmc_resamp (bootstrap = draw sequences with replacement until original total length); psmc_print_data: RS columns k, t_k, lambda_k, n_recomb*a0[k], sigma_k, post_sigma_k; LK, RI, TR, MT lines.
  - main.c: random seed from time and pid (bootstraps differ between runs).
  - utils/splitfa.c: default trunk 500,000 characters (= bins), optional second argument; remainder < 1.5x trunk printed whole.
  - utils/fq2psmcfa.c: bin = N if > 90 % of its bases are N/low quality, K if any het, else T; default -s 100. (s02 covers input building; our own script used a different N rule, see s02.)
  - utils/psmc_plot.pl version 0.2.0: defaults -u 2.5e-8, -g 25, -s 100, -x 10000 (applied to the scaled x axis = years), -n 20 (plots that round), -m 5; -R keeps prefix.N.txt (columns: years, lambda*N0/1e4, RS cols 4-6); -L shows last parameter group (otherwise RS lines beyond the second-to-last group are skipped); -N FNR; -M multi; -p epstopdf; needs gnuplot.
- Li H, Durbin R 2011 Nature 475:493-496, doi 10.1038/nature10231, PMC3154645 (read via PMC): 100-bp bins; hidden states = discretised TMRCA, transitions = recombination; Tmax 15, n 64; "More recently than 20kya or more anciently than 3Mya few recombination events are left in the present sequence", estimate there "is not as accurate and has large variance"; instantaneous reduction 12,000 -> 1,200 at 100 kya "spread over the preceding 50,000 years"; bootstrap with 5-Mbp segments; mu 2.5e-8, g 25; structure as alternative to the 60-250 kya human hump.
- Mazet O, Rodriguez W, Grusea S, Boitard S, Chikhi L 2016 Heredity 116:362-371, doi 10.1038/hdy.2015.104, PMC4806692 (abstract): IICR "is equivalent to a population size only in panmictic models"; structure "can generate spurious signals of population size change".
- Hilgers et al. (preprint bioRxiv 10.1101/2024.06.17.599025; published Current Biology 2025): patterns 2+2+25*2+4+6 and 1+1+1+1+25*2+4+6 as reruns of the first window. Only used as toy options here; details belong to s06.
- Project results: lab project log (demography and QC notes; PSMC result files re-read 2026-10-31). Species A shape description, N0 about half the heterozygosity-based Ne, bootstrap tightness, six-call-set subset test, the relative's peak (about twice species A's old plateau) and low point, PSMC version 0.6.5-r67, mu 5.4e-9 / g 1 yr placeholders. Exact sizes and times are not given on the page because the species A data are unpublished.

## Derived / my own wording
- "First group ~0-3,800 years, oldest group from ~1 My" for a round N0 = 50,000, g = 1: arithmetic from the core.c formula with max_t = 15 (t_4 = 0.0375, t_58 = 10.04 in 2N0 units). Approximate because max_t is refitted.
- Commands: the main psmc line and splitfa/-b are what our project ran; `xargs -P 8 -I{}` (README uses `xargs -i ... | sh`) and the psmc_plot.pl line (-u 5.4e-9 -g 1 -x 1000 -n 25 -R -p) are assembled from the source options. NOT executed here (no compiler/gnuplot on this machine); stated on the page.
- "Rule of thumb: do not interpret the last 10-20 ky in mammals" = scope guidance + our species A result (the youngest intervals did not survive call-set tests); labelled as rule of thumb.
- "RS column 4 = number of recombinations the model expects in that interval": my reading of n_recomb * a0[k] in aux.c, consistent with the README's rule; not documented in words.

## Toy model (interactive) - assumptions, all stated as "not PSMC" on the page
- True history: ancestral N = 100,000, one bottleneck (middle, size, length), recover or stay small; 1 generation = 1 year.
- Exact pairwise coalescence-time distribution for the piecewise-constant history (rate 1/(2N)).
- Segments are counted by number, not by bases: weight t f(t) (segment length ~ 1/(2 r t)). This makes young segments rare.
- Each segment's age is blurred by a multiplicative Gamma(shape 4, mean 1) factor. Reasoning (mine): a segment carries on average 2 mu t / (2 r t) = mu/r mutations whatever its age, so with ~2 mutations the likelihood for t from (k mutations, length l) is Gamma(k+2); shape 4 = theta/rho about 2. Illustrative only.
- N0 = mean coalescence time / 2; PSMC intervals from the core.c formula with max_t 15; groups from the chosen -p.
- Fit: 25 EM rounds from constant size; M step = piecewise-constant hazard MLE (events / exposure) per group; segments independent. Bootstraps: multinomial samples of 3k/30k/300k segments, 20 fits, readout uses the 2nd lowest / 2nd highest (middle 90 %).
- Known toy artefact: an overshoot just after a dip (deconvolution ringing). The page says so and does not equate it with the Hilgers false peak.

## Not verified / left out
- Whether psmc_plot.pl with `-n 25` behaves well when RI is nan in that round (it skips nan/inf RI lines; then nothing is stored for that file). Not tested.
- The "PNG2" six-call-set test: the plot viewed is assumed to be the test described in the QC notes (lab notes flag that their paths differ); the page describes only what the plot shows.
- psmc `-C`, `-d`, `-D`, `-s` (decoding, ROH-like fraction in newest commits) not covered.

## The principle of PSMC block (added 2026-11-05)
Placed after the simple box and before "What PSMC does, step by step", so it comes before the existing toy. The existing text and toy are unchanged.

Sources, with the exact supporting sentences:
- Li H, Durbin R 2011, Nature 475:493-496, doi 10.1038/nature10231, PMC3154645 (full text read through the Europe PMC XML).
  - Figure 1 legend: "The PSMC infers the local time to the most recent common ancestor (TMRCA) based on the local density of heterozygotes, using a Hidden Markov Model, where the observation is a diploid sequence, the hidden states are discretized TMRCA and the transitions represent ancestral recombination events."
  - One locus: "the statistical resolution of inferences from any one locus is poor".
  - Many loci: "a diploid genome sequence harbors hundreds of thousands of independent loci, each with its own TMRCA between the two alleles an individual carries."
  - Limits: "More recently than 20kya or more anciently than 3Mya few recombination events are left in the present sequence, which reduces the power of PSMC".
  - Rate as a parameter: "The free parameters of this model include the scaled mutation and recombination rates, and piecewise constant ancestral population sizes".
  - Bins: "divided into non-overlapping 100bp bins with a bin scored heterozygous if there is a heterozygote in the bin or being homozygous otherwise".
  - Start of EM: "the initial population size parameters were all set as 1, representing a constant-sized history; the scaled mutation rate was calculated to match the observed heterozygosity".
  - Transition q(t|s): Methods formula, used in psChrom and psModel.
- lh3/psmc master commit 82fa2ad: core.c (interval formula; hp->e[0][k] = exp(-theta (avg_t + dt)), the chance of a homozygous bin), em.c (forward-backward, hmm_expect, then Hooke-Jeeves kmin_hj over all parameters; post_sigma = posterior share per interval), psmc.tex (Theorem PSMC, pi(t) proportional to t sigma(t)).

The two key points and how they were checked against the source:
- Size sets timing: rate 1/(2N) at that time. The formula on the page (share meeting / share still separate / interval length) is my own plain form of the hazard; PSMC never computes it. The page says so under "Where the toy differs from PSMC".
- Recombination gives many samples: quotes above.
- Correction to the wording of the brief. The brief said stretches too short to carry het sites are why recent times are poor. The arithmetic and the simulation say otherwise. Hets per stretch = 2 mu T x 1/(2 r T) = mu/r whatever T, and recent stretches are the LONG ones. At constant N 10,000, r 1e-8, mu 2.5e-8, 200 Mb: stretches with T below 2,000 are 0.5 % of stretches but about 9 % of bases, mean length about 45 kb, and 2.5 hets per stretch; stretches with T above 80,000 average about 500 bp and also 2.5 hets per stretch, with about 29 % holding no het at every age. So the page gives two separate limits: every stretch is poorly dated (about mu/r hets), and the recent past is poor because few stretches are that young, which is what Li & Durbin say ("few recombination events are left"). Too few hets per stretch appears on the page as the limit of high r relative to mu.

Toy (03-psmc.js, functions ps*; display core between CORE-BEGIN and CORE-END is identical to the block in 01-coalescent.js):
- 10-Mb pair, mu 2.5e-8 (Li & Durbin's human value, used only as a toy value), 100-bp bins, r from 0 to 1e-7, four periods with boundaries 2,000 / 10,000 / 50,000 generations.
- psChrom walks the SMC: length exponential with rate 2 r T; break height u uniform on 0..T; new time from u at rate 1/(2N). This is q(t|s) of Li & Durbin, so neighbouring stretches are correlated (unlike the s01 toy).
- 12 states from the core.c formula (n = 11, T_max 15, N0 10,000). Each round: forward-backward with that model, shares per interval, sizes by the hazard formula. Five rounds from one flat size matched to the het density. r is given to the reader. Intervals with under 2 % of lines left are not drawn.
- Coalescent picture: rows on a log time scale, width on a log scale, paths steered to meet in the row of the stretch's time. Stated on the page as a schematic.

Controls (Node on the same code; the reader values on the block in the final page file):
- Constant N 10,000, r 1e-8, 200 Mb: length-weighted mean T 20,270 (expected 2N = 20,000); 80,503 stretches (expected 2 r L 2N = 80,000); 2.522 hets per stretch (mu/r = 2.5); 1.015e-3 hets per base (4 N mu = 1.0e-3).
- Share of the genome per period, mean of 30 runs of 200 Mb, against the exact value: constant 0.0967 / 0.2990 / 0.5225 / 0.0818 against 0.0952 / 0.2983 / 0.5244 / 0.0821; with 2,000 in the second period 0.0991 / 0.7798 / 0.1047 / 0.0164 against 0.0952 / 0.7824 / 0.1059 / 0.0166; all |z| below 2. One single run gave 0.0757 against 0.0952: explained as sampling noise, since a few very long recent stretches carry that share.
- r = 0: 1 stretch, one date, no curve (clicked).
- Reader at page settings, 10 animals, truth 10,000 / 3,000 / 3,000 / 3,000 / 10,000 ... by interval, geometric means. r 1e-8: 24,200 / 4,219 / 2,570 / 3,915 / 7,971 / 10,788 / 10,173 / 9,190 / 8,979, spread (sd of ln N) 1.61 in the first interval and 0.05 to 0.15 in the others. The second interval spans the true step at 2,000. r 1e-7 (0.25 hets per stretch): 6,289 / 3,207 / 4,723 / 6,239 / 7,259 / 7,590 / 7,320 / 7,074 / 6,947, spread 0.03 to 0.24: more stretches make it tight, but it stays wrong, so this is bias from too few hets, not noise. r 1e-9 (25 hets per stretch, about 250 stretches): the middle is right but noisy, spread 0.26 to 0.52, first interval useless.
- Browser: every control clicked at 1100 and 420 px, no script errors, no page widening, clicking a stretch changes the linked picture, a full read takes about 0.5 s.

Open doubts:
- The reader is a teaching toy and uses shares only. It is not PSMC, and it is not a true EM for the transition part; the page says the numbers are not PSMC output.
- Li & Durbin's 20 kya to 3 Mya window is for humans; the toy's recent end has its own values.
