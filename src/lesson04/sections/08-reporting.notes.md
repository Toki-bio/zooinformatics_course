# s08 Reporting a demographic analysis: notes and sources (2026-10-31)

## Sources (URL, version, what was taken)
- PSMC, https://github.com/lh3/psmc, HEAD 82fa2ad (2025-11-16), version string in cli.c `0.6.5-r74-dirty`. Read from the repository:
  - README: example commands (`psmc -N25 -t15 -r5 -p "4+25*2+4+6"`), depth filter advice ("set -d to a third of the average depth and -D to twice"), `-p` explanation and "~10 recombinations" rule, bootstrap procedure (splitfa, `-b`, README example uses 100 rounds), appendix I scaling (N0 = θ0/(4μ)/s, T = 2N0 t, N = N0 λ; scaled units d = t θ0/s, θ = λ θ0/s), appendix II false-negative-rate correction with `psmc_plot.pl -M`.
  - cli.c: built-in defaults `DEFAULT_PATTERN "4+5*3+4"`, n_iters 30, max_t 15, theta/rho 4; header lines `MM Version`, `MM pattern:..., n:..., n_free_lambdas:...`, `MM n_iterations:...`.
  - main.c: every EM round is printed (`RD i` + parameters).
  - core.c `psmc_update_intv`: interval boundaries t_k = α(exp(βk) − 1), i.e. log-spaced.
  - utils/splitfa.c: default trunk size 500,000 characters; a remainder shorter than 1.5 × trunk is kept whole (so sequences < 750,000 bins stay one segment). 500,000 bins × 100 bp = 50 Mb is my arithmetic.
  - utils/psmc_plot.pl (script version 0.2.0): defaults `-u 2.5e-08`, `-g 25`, `-x 10000` (minimum generations, 0 = auto), `-n 20` (take n-th iteration), `-M` multiline/FNR, `-T` title, `-R` keeps `prefix.N.txt` and `prefix.gp` (otherwise deleted), log x axis.
- Li H, Durbin R (2011) Nature 475:493-496, doi 10.1038/nature10231 (PubMed abstract): human history "between approximately ten thousand and a million years ago".
- Nadachowska-Brzyska K et al. (2016) Mol Ecol 25:1058-1072, doi 10.1111/mec.13540, PMC4793928 (abstract + full text via PMC): "Individual Ne curves did not converge until a mean genome coverage of ≥18X"; "no more than 25% of missing data"; per-site filter ≥10 reads; 100 bootstraps of 5-Mb segments; "PSMC cannot accurately resolve demography in times relatively recent compared to the average TMRCA". The ~10-recombinations rule is from the PSMC README, not this paper.
- Hilgers L et al. (2025) Curr Biol 35:927-930.e3, doi 10.1016/j.cub.2024.09.028 (PubMed abstract); preprint https://www.biorxiv.org/content/10.1101/2024.06.17.599025v1.full (read): ">70 studies with >200 individual PSMC inferences"; alternative patterns "2+2+25*2+4+6" and "1+1+1+1+25*2+4+6"; quote "If a peak is only observed with the default parameter setting, it is likely an artifact"; report robustness to parameters, not only bootstraps; consider structure.
- Chikhi L et al. (2018) Heredity 120:13-24, doi 10.1038/s41437-017-0005-6 (PubMed abstract): IICR equals population size in panmictic models but not necessarily in structured ones; PSMC estimates the IICR. Mazet O et al. (2016) Heredity 116:362-371 is cited from that abstract.
- Project settings (species A-like preset, "In our projects" note): lab project log (ONT; Clair3 model r1041_e82_400bps_sup_v500; PASS + AF 0.3-0.7; MAPQ >= 10, depth bounds about half to twice the mean; X-class contigs excluded; 100-bp bins; PSMC 0.6.5-r67 with -N25 -t15 -r5 -p "4+25*2+4+6"; 20 bootstraps; A/B pattern reruns; mu 5.4e-9 and g 1 yr placeholders; 1.46x factor for 7.86e-9; old part robust, most recent intervals not interpretable; figure convention species A grey / relative teal). Depth (30x), depth bounds (15-60x) and callable lengths (2,400 of 2,500 Mb) in the preset are rounded toy values, because the species A data are unpublished.

## Derived / my own wording
- The "what not to claim" table and the "write instead" phrasings are our recommendations built on the sources above, not quotes.
- psmcfa size (~25 MB for 2.5 Gb) = 2.5e9 / 100 characters, arithmetic.
- Toy figure: invented history (knots in generations, log-log interpolation), 26 log-spaced intervals from 600 to 4e6 generations, mu0 = 5.4e-9; "bootstraps" are lognormal perturbations whose SD grows toward the present (illustration, not a PSMC run). μ × 0.7 / × 1.4 chosen for display. "Not resolved" = intervals where the toy bootstraps differ > 2-fold.
- Builder thresholds: depth < 18x (Nadachowska-Brzyska); min depth < mean/3 and max > 2 x mean (PSMC README, with 10 % slack); callable < 75 % (analogy to the 25 % missing-data rule; our extension).
- "Thin report" preset is invented (Microtus sp. used only as a generic example).

## Not verified / left out
- Whether newer PSMC commits change outputs relative to 0.6.5-r67 used in our runs: not checked.
- The exact Clair3 version, mapper, plotted iteration, bootstrap segment size and the ONT chemistry (inferred) of the species A run are not in the lab project log; the preset leaves them empty on purpose.
- The lab-notes claim that Nadachowska-Brzyska 2016 recommends testing -t/-r/-p and >= 10 recombinations per interval: the paper text read does not say this (the README does), so it is attributed to the README.
- Course plan after lesson 4 (methylation; SINEs and satellites) taken from the repo README "Planned" line; lesson numbers not stated on the page.
