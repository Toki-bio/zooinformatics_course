# s05 Beyond PSMC: MSMC2, SMC++, cobraa and SFS methods: notes and sources (2026-10-31)

## Tool documentation and source (URL, version, what was taken)
- MSMC2 README https://github.com/stschiff/msmc2 (latest release v2.1.4, 2022-12-05; HEAD 5fc12bc). Options and defaults:
  `-i` 20 EM iterations, `-p` default `1*2+25*1+1*2+1*3`, `-r` 0.25, `-t` all CPUs, `-I` two flavours (index list = all pairs;
  pair list `0-1,2-3` = only those pairs, "useful ... on a number of unphased genomes"; cross-population example
  `-I 0-2,0-3,1-2,1-3`), `-s` "skip sites with ambiguous phasing. Recommended for cross population analysis".
  Brief guide: three runs for cross-population, combineCrossCoal.py; "I don't think it's feasible to go beyond 16 haplotypes";
  "With limited phasing you will get problems in very recent times"; "more and more resolution in recent times depending on the
  number of haplotypes".
- msmc-tools README + msmc-tutorial/guide.md https://github.com/stschiff/msmc-tools (HEAD 4d1f05f, 2026-01-23):
  generate_multihetsep.py (one chromosome per run; one VCF + one callable mask per individual; mappability mask; `--trio`;
  `--as_phased` from the script's argparse help: "considered unphased genotypes as phased. Saves resources when only pairs of
  haplotypes within individuals are considered"); multihetsep third column definition (quoted on page); output columns of
  `final.txt`; scaling `left_time_boundary/mu*gen` and `(1/lambda)/(2*mu)`; RCCR = 2*lambda_01/(lambda_00+lambda_11);
  "smear" around the separation time; `-p 1*2+15*1+1*2` for one chromosome "to avoid overfitting"; "PSMC mode" wording
  (decode section: "only corresponds to the number of time intervals if your input file contains only two haplotypes (PSMC mode)").
- SMC++ README.rst + source https://github.com/popgenmethods/smcpp (latest tag v1.15.4; latest GitHub release page v1.15.2;
  HEAD 6779fae 2023-12-19; distributed as Docker image terhorst/smcpp since 1.15.4). vcf2smc arguments (`-d`, `--mask/-m`,
  `--missing-cutoff/-c` "fairly crude approach"), composite likelihood text ("2-10 individuals"), caveats (ancestral = reference,
  FILTER/QUAL ignored, indels ignored, absent sites = homozygous), estimate (first argument = per-generation mutation rate),
  plot (`-g`, `-c` CSV), split procedure (quoted commands), FAQ on recent crash = ROH. Defaults from smcpp/defaults.py:
  `knots = 8`, `spline = "piecewise"`, regularization penalty 6, `-w` 100 (command.py). Abstract of Terhorst et al. 2017:
  "requiring only unphased genomes (its results are independent of phasing)", "jointly infer population size histories and split times".
  Split = "clean split models" (README).
- cobraa README + source https://github.com/trevorcousins/cobraa (HEAD ab85ea7, 2025-06-17). Model description (split at T2,
  admixture at T1, gamma), recommendation to compare with a panmictic fit, input = multihetsep, `-D`, `-b` (default 100),
  `-ts/-te` as time indices, `-gamma_fg` default 0.2, `-spread_1 0.05 -spread_2 50`, output `<prefix>final_parameters.txt`,
  scaling time/mu and (1/lambda)/mu, high-theta advice (bin so that > ~3 hets per bin is rare). From cobraa.py: `-D` default=30
  (const 32) although README says 32; `-in` nargs='+'. From BaumWelch.py: prints "log likelihood for this iteration = ...".
- Stairway Plot 2: https://github.com/xiaoming-liu/stairway-plot-v2 (HEAD 9ac1c1a, 2026-04-08); READMEv2.2.pdf inside
  stairway_plot_v2.2.zip: blueprint fields (nseq = 2n, L incl. monomorphic, whether_folded, pct_training 0.67, nrand, ninput 200,
  mu, year_per_generation), run `java -cp stairway_plot_es Stairbuilder <blueprint>` then `bash <blueprint>.sh`; median +
  75 % / 95 % pseudo-CI. Example blueprint two-epoch_fold.blueprint: nseq 30.
- fastsimcoal2: http://cmpg.unibe.ch/software/fastsimcoal2/ (fsc28, September 2023; page updated 2023-10-16) and manual
  http://cmpg.unibe.ch/software/fastsimcoal2/man/fastsimcoal28.pdf (appendix "Command-line options": `-t`, `-e`, `-n`, `-d`, `-m`,
  `-M`, `-L` default 20, `-0`, `-c`, `-q`; observed file naming `_DAFpop0.obs` / `_MAFpop0.obs` with template prefix; batch script
  `numRuns=50`; example `fsc27 -t ... -n100000 -d -e ... -M -L40 -q --multiSFS -C10 -c8`).

## Papers (methods)
- Mazet O, Rodriguez W, Grusea S, Boitard S, Chikhi L 2016 Heredity 116:362-371, doi 10.1038/hdy.2015.104 (abstract via PubMed;
  key sentences via the PMC page PMC4806692: IICR definition, n-island lambda_s(0)=1, "In all cases, lambda_s(t) identifies a
  population decrease" for same-deme sampling, decrease or increase "depending on the sampling scheme", "there always exists a
  function lambda(t) that explains the coalescence time distribution").
- Cousins T, Scally A, Durbin R 2025 Nat Genet 57:856-864, doi 10.1038/s41588-025-02117-1 (full text via Europe PMC PMC11985351):
  quoted transition-matrix sentence; Delta L = L_S - L_U; panmictic simulations give Delta L around 0; constant mutation and
  recombination rates assumed ("are false") with cited negligible effect; 37 vs 33 parameters; human result split ~1.5 Ma,
  admixture ~300 ka, ~80:20.
- Schiffels S, Durbin R 2014 Nat Genet 46:919-925, doi 10.1038/ng.3015 (abstract: first coalescence between any two individuals,
  recent history).
- Schiffels S, Wang K 2020, Methods Mol Biol 2090:147-166 (cited from the MSMC2 README; not read).
- Wang K, Mathieson I, O'Connell J, Schiffels S 2020 PLoS Genet 16:e1008552, doi 10.1371/journal.pgen.1008552 (abstract: MSMC-IM
  fits a continuous isolation-migration model to MSMC2 within/across rates).
- Terhorst J, Kamm JA, Song YS 2017 Nat Genet 49:303-309, doi 10.1038/ng.3748 (abstract).
- Liu X, Fu YX 2015 Nat Genet 47:555-559; Liu X, Fu YX 2020 Genome Biol 21:280, doi 10.1186/s13059-020-02196-9 (abstract:
  folded SFS, thousands of samples, genotyping-by-sequencing, non-model organisms).
- Excoffier L et al. 2013 PLoS Genet 9:e1003905, doi 10.1371/journal.pgen.1003905 (abstract: SFS composite likelihood, simulation).

## Toy 1 (structure vs size change): derivation, ours
- Two lineages, states S (same island) and D (different islands); time in units of 2N generations (N = diploid island size).
  From S: coalescence rate 1, leave S at rate M (each lineage migrates at rate M/2, i.e. m = M/(4N) per generation, M = 4Nm);
  from D: rate M/(n-1) back to S. IICR(t) = P(T>t)/f(t) = (pS+pD)/pS, closed-form 2x2 matrix exponential. Checked against
  scipy expm (n=10, M=1: 1.00 at t=0.001, 18.5 for large t). Our parameterisation may differ from Mazet et al.'s by constant
  factors; the page says "our implementation of the approach".
- World B = panmictic population with N(t) = same-island IICR (identical pairwise coalescence distribution by construction).
- "Perfect PSMC" = piecewise-constant IICR over 24 log-spaced intervals between 0.01 and 100 units (value at geometric midpoint);
  illustrative only, not a PSMC run.
- Years row = time x 2N x g with g = 1 year.

## Toy 2 (decision helper): rules and their sources
- One diploid: PSMC, SMC++ (one distinguished), MSMC2 (two haplotypes), cobraa: READMEs. SFS one class: arithmetic (folded SFS of
  n diploids has n classes; Stairway README: folded SFS has nseq/2 numbers).
- MSMC2 recent resolution with phased haplotypes, <= 16 haplotypes, unphased within-animal pairs: MSMC2 README.
- MSMC2 cross-population needs phase / -s: README and guide; "every het of an unphased animal is ambiguous" = our reading of
  generate_multihetsep (unphased genotypes produce alternative allele orders) + `-s`.
- SMC++ split = clean split (README); SMC++ unphased (paper abstract); 2-10 distinguished (README).
- MSMC-IM: Wang et al. 2020 abstract. fastsimcoal2 ghost populations / model comparison: Excoffier 2013 abstract ("including
  unsampled populations"; "compare neutral evolutionary models").
- "With one animal per population there is almost no frequency information" for SMC++ split / SFS: our inference, labelled on page.
- Thresholds 2-4 / 5-19 / 20+ are UI bins chosen by us, not from any tool.
- s07 methods (hPSMC, BPP, gIMble) and D-statistics limitation: lab project log / s07 (Hibbins & Hahn 2022 per the lab
  literature notes; not re-checked here).

## Project numbers (lab project log; placeholder mu 5.4e-9/generation, g = 1 yr)
- MSMC2 command/default pattern, species A and relative MSMC2 results, MSMC2 binary not from the conda channel: lab notes.
- SMC++ commands, sample-name trap, species A default and pchip20 results: lab notes (re-read from result files on 2026-10-31).
- PSMC species A results (AF set): lab assembly QC notes.
- cobraa gains (relative several times species A); null simulations without structure with lognormal het-density variation per
  500 kb (sigma 0.4) gained as much as the larger real gain; repeat mask of roughly half the genome vs random mask: lab mask-experiment notes.
- Exact sizes, times and gains are not given on the page because the species A data are unpublished; the table of values was removed.

## Open doubts / not shown
- SMC++ "9 knots" in the lab notes vs 8 in defaults.py: the page uses the source value (8) and does not repeat "9".
- Hilgers et al. 2025 (MSMC2 also produces extreme recent peaks): not re-checked; left to s06.
- PHLASH, Beta-PSMC, SNIF, iSMC, ARG methods: not covered (not verified here).
- Minimum sample size for SFS methods: no rule stated; only the Stairway example (nseq 30) and the class-count arithmetic.
- cobraa numerical edge cases: the page only says to check that log-likelihoods are finite.
- SMC++ split with one individual per population: not tested; stated as our inference.
