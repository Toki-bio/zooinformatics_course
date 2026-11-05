# s03 ARG tools: notes and sources (2026-11-05)

Papers were read through PubMed / PubMed Central full text unless marked otherwise. Every entry gives the sentence the page
rests on. Supplements were not read.

## Tool documentation and source (URL, version)
- Relate: https://myersgroup.github.io/relate/ (getting_started, input_data, modules pages; binaries v1.2.4; repo
  https://github.com/MyersGroup/relate HEAD b54ede2, 2026-05-19).
  "The data needs to be phased." / "make sure that, for every SNP, the ancestral allele is denoted by 0 and the derived allele is
  denoted by 1." / `-N`: "Effective population size of haplotypes. (NOT of individuals!" / "Output files are example.anc and
  example.mut." / is_not_mapping: "1 means SNP could not be mapped to a unique branch" / PrepareInputFiles: "flip haplotypes according
  to the ancestral genome such that the ancestral allele is always denoted by 0" / EstimatePopulationSize: "estimates population
  sizes, re-estimates branch lengths using the estimated population sizes" ; `--years_per_gen` "Default: 28.0" / SampleBranchLengths
  options and example / ConvertToTreeSequence: "leading to no compression. In addition, information about how long branches persist,
  and how many mutations map to a branch are lost by this conversion."
- tsinfer stable docs https://tskit.dev/tsinfer/docs/stable/usage.html (PyPI 0.5.1; repo https://github.com/tskit-dev/tsinfer HEAD
  321cfe0, 2026-11-02, which is 0.5.2 in development). Stable: "takes as input a Zarr file, with phased variant data encoded in the
  VCF Zarr (.vcz) format"; `VariantData` "requires an ancestral state to be provided for each site used in inference";
  `tsinfer.VariantData("file.vcz", ancestral_state="variant_AA")`, `tsinfer.infer`, `inferred_ts.dump`; run of 10,000 haploid genomes
  "took about eighteen minutes", "the maximum memory usage was about 600MiB". Repo docs/quickstart.md (development): "Internal node
  times are allele frequencies, not years or generations."; non-inference sites list (fixed, singletons, unknown ancestral state,
  multiallelic); `tsinfer run config.toml`.
- tsdate https://github.com/tskit-dev/tsdate (HEAD fad87bd, 2026-11-03; PyPI 0.2.7), docs/usage.md, introduction.md, real-data.md:
  `tsdate.date(ts, mutation_rate=...)`; default variational_gamma "does not need any user input" for the prior; "For real datasets,
  you are advised to run preprocess_ts on your inferred tree sequence before dating"; node metadata `mn`, `vr`.
- ARG-Needle manual https://palamaralab.github.io/software/argneedle/manual/ ; repo https://github.com/PalamaraLab/arg-needle v1.1.0
  (fa112f6, 2025-12-18); https://github.com/PalamaraLab/arg-needle-lib (15d7f01, 2025-11-21).
  "ARG-Needle can analyze either SNP array (default) or sequencing data, although its parameters have been optimized for use with SNP
  data, so it may be slow when applied to sequencing data." / "The ASMC Hidden Markov model requires at least 300 haploid samples to
  build the conditional site frequency spectrum (CSFS). This corresponds to at least 150 diploids." / ".decodingQuantities.gz file
  storing information about the input data, such as the demographic model, the mutation rate, and the allele frequency spectrum of
  the array data" / defaults CEU.demo and 30-100-2000_CEU.decodingQuantities.gz / "It represents a European demographic model with
  haploid population sizes." / `arg2tskit --arg_path --ts_path`, "arg2tskit does convert mutations." Flags checked in
  src/arg_needle/scripts/infer_args.py. The manual does not discuss ancestral alleles.
- ASMC docs https://github.com/PalamaraLab/ASMC docs/asmc.md (HEAD 7ea7109, 2026-10-23; PyPI asmc 1.4.0): "Phased haplotypes in Oxford
  haps/sample format"; `--useAncestral` "will cause the CSFS to be used without folding. This is mostly not needed." (basis for "folds
  by default"; applying this to ARG-Needle is our inference); demographic history "population size is *haploid*", "You can obtain this
  model using e.g. PSMC/MSMC/SMC++."; decoding quantities built with the PrepareDecoding tool https://github.com/PalamaraLab/PrepareDecoding.
- SINGER README https://github.com/popgenmethods/SINGER (HEAD eb8e39b, 2026-08-21; latest tag v0.1.8-beta, releases folder holds 0.1.9
  beta). All flags and defaults quoted from the README tables. "only using one single sample is NOT ideal"; "we only support phased,
  high-quality genomes, and polymorphic sites with missingness will be excluded"; "ARGweaver has better support in these regards";
  most frequent and second most frequent bugs; merge_ARG.py, compute_traces.py, convert_to_tskit.
  README wording "outputs a .trees file" conflicts with its own text files + convert_to_tskit; the page follows the detailed part.
- ARGweaver https://github.com/CshlSiepelLab/argweaver (HEAD 50bbd3c, 2023-05-01), README example commands; manual doc/argweaver-manual.html
  ("Updated: September, 2013"; the hosted copy at compgen.cshl.edu refused the connection, so the repo copy was read): defaults -N
  10,000 ("assumes the population is diploid"), -m 2.5e-8, -r 1.5e-8, -n 1000, `--sample-step` 10, "Currently only the Jukes-Cantor
  model is implemented", FASTA "assumes sequences are phased". src/arg-sample.cpp help: `--vcf` "Assumes samples are diploid and
  unphased"; `--unphased` "data is unphased (will integrate over phasings)". The manual has no requirement for ancestral alleles
  ("not asked for" on the page is an absence in the manual, not a statement by the authors).
  ARGweaver-D manual doc/argweaver-d-manual.html.

## Papers
- Speidel et al. 2019 Nat Genet 51:1321, https://doi.org/10.1038/s41588-019-0484-x (PMC7610517). Abstract "scaling to > 10,000 sequences";
  "scales linearly in sequence length and quadratically in sample size"; "applying Relate to 4,956 haplotypes"; "86% of all SNPs ...
  map uniquely to trees"; "computational phasing leading to overestimation"; "If a mutation maps to the tree only after reinterpreting
  the derived allele as the ancestral allele (and vice versa), we 'flip' ancestral and derived alleles"; "Relate should work equally
  well in other recombining species".
- Kelleher et al. 2019 Nat Genet 51:1330, https://doi.org/10.1038/s41588-019-0483-y (PMC6726478). "we analysed the ~500K individuals
  within UK Biobank"; "its performance is degraded (typically characterised by an excess of edges) by genotyping and, in particular,
  haplotype phasing error"; "tsinfer's innate strategy of using polytomies to indicate uncertainty in a principled and systematic way".
- Wohns et al. 2022 Science 375, https://doi.org/10.1126/science.abi8264 (PMC10027547). "tsdate can be used to date any valid tree
  sequence, not only those inferred by tsinfer."
- Zhang et al. 2023 Nat Genet 55:768, https://doi.org/10.1038/s41588-023-01379-x (PMC10181934). Three steps: "(1) detecting a set of closest
  genetic relatives via hashing, (2) running ASMC and (3) 'threading' the new sample into the ARG"; "ASMC-clust runs ASMC on all pairs of
  samples and performs hierarchical clustering"; "ARG normalization applies a monotonically increasing mapping ... further utilizing
  the demographic prior"; "Relate and ASMC-clust, which both scale quadratically"; "337,464 individuals"; tsinfer-sparse: "a variant of
  tsinfer designed for sparse datasets", "subsets of the analyzed individuals are added as potential ancestors".
- Palamara et al. 2018 Nat Genet 50:1311, https://doi.org/10.1038/s41588-018-0177-x (PMC6145075). "by modeling non-random ascertainment of
  genotyped variants, ASMC enables accurate processing of SNP array data"; "pairs of phased chromosomes across individuals ... requires
  haplotypes phased with extremely high accuracy".
- Deng, Nielsen & Song 2025 Nat Genet, https://doi.org/10.1038/s41588-025-02317-9 (PMC12425808). "The 90% CI covered the ground truth in only
  44% of instances for Relate and 54% for ARGweaver. By contrast, the coverage was substantially better for SINGER, at 85%"; "probably
  because Relate samples only coalescence times under a fixed topology"; "scales to at least hundreds of whole-genome sequences"; "200
  whole-genome sequences from five African indigenous populations"; "assumes an infinite-sites model, which may not be applicable to
  cross-species data"; "high-quality phasing is often challenging, especially for ancient DNA and non-model organisms"; "ARG-Needle does
  not map mutations to branches"; allele polarization "is difficult for the HLA locus with high levels of trans-species polymorphisms";
  ARG re-scaling section. ARGweaver version benchmarked: Jan 2017.
- Rasmussen et al. 2014 PLoS Genet, https://doi.org/10.1371/journal.pgen.1004342 (PMC4022496). "efficient enough to sample full ARGs on a
  genome-wide scale for dozens of diploid individuals"; "500 burn-in iterations, followed by 1000 sampling iterations, with every
  tenth sample retained"; "54 unrelated individuals"; "For each ~2-Mb block, we collected samples for 2,000 iterations".
- Hubisz et al. 2020 PLoS Genet, https://doi.org/10.1371/journal.pgen.1008895 (PMC7410169). "samples ancestral recombination graphs ...
  conditional on a generic demographic model"; "compute posterior probabilities of introgression across the genome".
- Nielsen, Vaughn & Deng 2025 Nat Rev Genet 26:47, https://doi.org/10.1038/s41576-024-00772-4 (PMC12036574, author manuscript). Scale sentence
  and mutation/recombination sentence quoted on the page; "inducing false certainty in the results of any analysis that uses a single
  ARG as the true ARG"; Table 1 (samples branch lengths / topologies, scaling, ancient DNA).

## Toy and its control
Exact posterior for 4 haplotypes on one local tree: 18 ranked histories x log-spaced grid of the three coalescent intervals, Poisson
mutations, polarised infinite sites. Model and code are ours, not any tool's algorithm. N = 10,000 and mu = 1.25e-8 are illustrative.
Control: `node src/lesson_mg/sections/03-arg-tools.control.js 1500` (loads the engine text from the shipped .js).
Result, 2026-11-05 (29 checks passed, 0 failed): 18 histories, 15 topologies; no-SNP means within 2 % of the closed form 1/(r_k + k*lambda)
at 0.5, 3, 20 kb; grid vs independent prior-weighted Monte Carlo (6 million draws, 4 data sets): largest topology difference 0.0015, mean
age ratio within 1.3 %. Calibration, 1,500 data sets per length, pair a-b:
| Stretch | mean SNPs | 90 % coverage, trees+times | 90 % coverage, best tree fixed | best tree true | mean posterior of best tree |
|---|---|---|---|---|---|
| 1 kb | 0.9 | 0.906 | 0.715 | 0.293 | 0.292 |
| 3 kb | 2.8 | 0.895 | 0.784 | 0.477 | 0.459 |
| 10 kb | 9.1 | 0.908 | 0.875 | 0.704 | 0.684 |
A first run gave coverage 0.880 at 1 kb. It used consecutive seeds, the same data sets at each length, and 200 draws per interval.
With hashed seeds and 1,000 draws this went away (also 0.898 on 2,500 data sets at 1 kb), so it was seed and sampling noise, not model error.

## Lead page claims that did NOT hold or were changed
- "Table 1 of the review lists tsinfer-sparse and ARG-Needle with array support": the PMC author manuscript's Table 1 has no array
  column, and its text says "ARG-Needle is the only method which explicitly supports sparse genotype-array data". tsinfer-sparse is a
  variant used in the ARG-Needle paper; no such mode found in the tsinfer docs. The published journal table was not seen.
- "ARG-Needle to ~32,000": that is the simulation ceiling; the paper ran 337,464 individuals. "Relate to about 4,000 diploid": 8,000 haploid
  (array) / 4,000 haploid (sequence) was the limit of the ARG-Needle paper's comparison, not a Relate limit.
- "ASMC phasing not checked": now checked; the input format is phased haplotypes.
- SINGER "validated 40-300": the page gives 200 genomes (paper) and "at least hundreds" instead.

## Open doubts
- Whether the 200 SINGER "whole-genome sequences" means 200 individuals or haplotypes is not spelled out in the main text; the page says "200 genomes".
- Time units of tsdate and ARG-Needle output: our reading (stated on the page).
- A flat genetic map as a stand-in: our suggestion (stated on the page). None of the tools was run; commands come from docs, with
  file names changed. All scale figures come from human data.
