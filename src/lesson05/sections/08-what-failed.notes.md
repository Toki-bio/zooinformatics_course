# s08 What failed in a real cohort, and why: sources and notes

## Sources opened (supporting sentences)
- ARG-Needle user manual, https://palamaralab.github.io/software/argneedle/manual/ (fetched 2026-11-05, no version shown on the page):
  "The ASMC Hidden Markov model requires at least 300 haploid samples to build the conditional site frequency spectrum (CSFS)." (used verbatim on the page);
  `--normalize_demography`: "or you can provide your own, taking care that the population sizes are haploid."; "its parameters have been optimized for use with SNP data".
  Not verified from the docs: which population the bundled demography describes (page says only "another population").
- Browning SR, Browning BL 2015, Am J Hum Genet 97:404-418, doi 10.1016/j.ajhg.2015.07.012, PMC4564943. Full text read.
  - "The effective size of a population is defined with reference to an idealized random mating population ..."
  - "The sampled individuals are assumed to be a random sample from the population of interest. Our method appears to be robust to small deviations from this assumption."
  - "inferring changes in growth rates could be dangerous because such changes could reflect artifactual oscillation"
  - Abstract: IBD informs Ne "from around 4 generations to around 50 generations ago for SNP array data and to over 200 generations ago for sequence data."
  - 80 bootstrap replicates (paper). The paper does not define a "fit statistic"; the page therefore describes it only as fit to the observed segment lengths compared with bootstrap replicates (lab observation, qualitative).
- IBDNe page, https://faculty.washington.edu/browning/ibdne.html (fetched 2026-11-05): input is a list of ancestry-specific IBD segments, detectable with hap-IBD; `filtersamples`: "If the population sample is not random, setting filtersamples=true can improve the accuracy ..." (default true). It says nothing on imputed input.
- Zhou Y, Browning SR, Browning BL 2020, Am J Hum Genet 106:426-437, doi 10.1016/j.ajhg.2020.02.010 (abstract only read): hap-IBD detects IBD in phased genotype data.
- Byrska-Bishop M et al. 2022, Cell 185:3426-3440, doi 10.1016/j.cell.2022.08.004, PMC9439720 (full text read, abstract and methods): 30x resequencing of the 1000 Genomes samples, "gains in sensitivity and precision of variant calls compared to phase 3"; phase 3 was lifted from GRCh37 to GRCh38 for comparison. The paper does NOT say the lab's candidate regions were artefacts; that is the lab's own finding and is stated on the page as ours, mechanism unknown.

## Not verified (stated on the page as our reading)
- Mechanism of inflated IBD in imputed data (reference-panel mosaics). A web search found no published test of this exact claim; related literature (23andMe, switch-error false positives) is about phasing, not imputation.
- Mechanism of the reference-file artefacts.

## Anonymisation
Page names no population, no counts, no probe, haplogroup, server or file names. Only public numbers used: ARG-Needle 300 haplotypes (manual), 4-50 and 200 generations (IBDNe abstract).

## Control
The checklist verdict was exercised in headless Chrome: blank gives "not finished, 8 not run"; each of the four story presets gives "blocked" (2 failed checks each); all 8 passed gives "may report"; one failed check among eight passed gives "blocked" is shown by the presets (each has failures with others passed or not run); all cleared returns to "not finished". Rule: any fail blocks, otherwise any not-run is open, otherwise ok.

## Doubts
- Story presets are the author's qualitative judgement of the lab log, not computed.
- Links to lesson 4 (`../04-demography/#s06`) and to s02-s06 of this lesson assume those ids.
