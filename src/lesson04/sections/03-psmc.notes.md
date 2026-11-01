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
