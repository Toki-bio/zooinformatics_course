# s04 From model units to years: notes and sources (2026-10-31)

## Sources (URL, version, what was taken)
- PSMC README, https://github.com/lh3/psmc (HEAD 82fa2ad, 2025-11-16; source reports version 0.6.5-r74).
  "Appendix I: Scaling the PSMC output": N0 = theta0/(4 mu)/s; theta0 = 2nd column of TR lines; T_k = 2 N0 t_k; N_k = N0 lambda_k;
  t_k and lambda_k = 3rd and 4th columns of RS lines; "All these parameters are scaled to 2N0"; mu-free alternative
  d_k = 2 mu T_k = t_k theta0/s and theta_k = lambda_k theta0/s; s defaults to 100 in fq2psmcfa.
  "Appendix II": psmc_plot.pl -M "sample1=0.1,..." false-negative-rate correction; "Not correcting for low coverage is the most common pitfall when using PSMC."
- utils/psmc_plot.pl (same commit, script version 0.2.0), source read: defaults u = 2.5e-8, g = 25, s = 100; options -u, -g, -s, -N (FNR),
  -M, -R (keep temporary files), -p (PDF via epstopdf); output pipes into gnuplot; writes prefix.N.txt per run with columns
  years (2 N0 t g) and Ne/10^4 (lambda N0 / 10000) followed by three more RS fields; prefix.eps.
- Li H, Durbin R 2011 Nature 475:493-496, doi 10.1038/nature10231, PMC3154645 (read online): "25 years per generation and a neutral
  mutation rate of 2.5x10^-8 per generation"; "N0 = theta/4mu"; TMRCA "in units of 2N0 time"; "uncertainty of the per-year mutation
  rate 1.0x10^-9 (=2.5x10^-8/25)"; "Missing heterozygotes uniformly at a probability p is equivalent to reducing the neutral mutation rate."
- Kong A et al. 2012 Nature 488:471-475, doi 10.1038/nature11396 (abstract): 78 trios, father's mean age 29.7, 1.20e-8 per nucleotide per generation.
- Scally A, Durbin R 2012 Nat Rev Genet 13:745-753, doi 10.1038/nrg3295 (abstract): direct rate "approximately half of that previously derived from fossil calibration".
- Uchimura A et al. 2015 Genome Res 25:1125-1134, doi 10.1101/gr.186148.114 (abstract): C57BL/6, >20 generations, 5.4e-9 (95% CI 4.6-6.5e-9) per nucleotide per generation.
- Lindsay SJ et al. 2019 Nat Commun 10:4053, doi 10.1038/s41467-019-12023-w, PMC6731245 (read online): Table 1 "Autosomal SNV germline mutation
  rates per generation, per year and per cell division", mouse 0.39 x 10^-8 [0.37-0.42], human 1.22 x 10^-8; Results: mouse rate "approximately
  one third" of human; mice from C57BL/6 x 129S5 crosses; abstract quotes earlier mouse estimates 3.5-5.4e-9.
- López-Cortegano E et al. 2025 Genome Res 35:43-54, doi 10.1101/gr.279982.124, PMC11789640 (read online): "mu = 7.86 x 10^-9 SNMs per site per generation"; 12 MA lines, PacBio.
- Bergeron LA et al. 2023 Nature 615:285-291, doi 10.1038/s41586-023-05752-y (abstract): 151 trios, 68 species, per-generation rate varies by a factor of 40;
  generation time, age at maturity and fecundity are key traits.
- MSMC tutorial guide https://github.com/stschiff/msmc-tools/blob/master/msmc-tutorial/guide.md (master, read 2026-10-31): columns time_index,
  left/right_time_boundary (scaled), lambda (scaled coalescence rate); years = left_time_boundary/mu*gen, Ne = (1/lambda)/(2*mu).
- SMC++ README https://github.com/popgenmethods/smcpp (master, read 2026-10-31): `smc++ estimate <mutation rate> <data file>...`, "The per-generation
  mutation rate"; `plot -g` "sets the generation time (in years) used to scale the x-axis. If not given, the plot will be in coalescent units."
- Project settings (lab project log / lab notes): placeholder mu 5.4e-9 per generation and g = 1 yr, labelled illustrative; recommended grid
  mu 4.6-7.9e-9, g 1-2 yr; 5.4 -> 7.86e-9 = 1.46x. Species A values (theta0, N0, split times) are not given on the page because the data
  are unpublished; the split-date paragraph is a hypothetical example (1 My vs 2 My).

## Derived / my own wording
- N0 = 0.08/(4 x 5.4e-9 x 100) = 37,037 (toy theta0 0.08, arithmetic).
- Per-year forms: years = theta0 t/(2 mu_yr s), Ne = lambda theta0/(4 mu_yr g s): algebra from the README formulas with mu_gen = mu_yr g.
- Hypothetical example: 1 My vs 2 My -> per-year rate 5.4e-9/2 = 2.7e-9 -> g = 2 yr at 5.4e-9 per generation (arithmetic).
- The interactive curve is an invented step function with round toy values (old plateau ~100k, trough 40k at 55-80 ky, bump ~70k),
  not a real run. The "model units" readout is derived from it with N0 = 0.08/(4 x 5.4e-9 x 100) = 37,037.
- "Plateau / trough 2.5": 100k/40k from the toy curve.
- Generation time defined as the average age of parents at the birth of offspring; "longer than age at first breeding when animals breed more than once"
  follows from that definition (our wording, no citation).
- "Bootstraps do not include mu/g uncertainty": follows from the bootstrap procedure (resampling segments, README) - our framing.
- Phylogenetic rate d = 2 mu T: from README Appendix I relation.

## Not verified / left out
- The lab literature summary attributed 5.7e-9 to Lindsay et al. 2019; the paper's Table 1 gives 0.39e-8 for mouse. The page uses the paper's value.
- No species-specific mutation rate or generation time exists in our notes for species A.
- ROH-length-to-age conversions from the lab notes are not used (unverified derivations).
