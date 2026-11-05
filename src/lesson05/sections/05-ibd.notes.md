# s05 Recent history from IBD segments: sources and checks

All sources opened in full text unless stated. Quotes are exact.

## Sources
1. Browning SR, Browning BL (2015) Accurate non-parametric estimation of recent effective population size from segments of identity by descent. Am J Hum Genet 97(3):404-418. doi:10.1016/j.ajhg.2015.07.012 (open-access full text read).
   - "In the former instance, if we assume Haldane's model for crossovers at each meiosis and assume that crossovers occur independently at each meiosis with rate 1/100 per cM, the distribution of l on a chromosome of infinite length is exponential with rate 2g/100 = g/50 per cM." (former = segment picked at random from a list of detected segments) -> mean 100/(2g) cM.
   - "Random longer segments are more likely than random shorter segments to cover the specified position; thus, the expected value of l is higher." and "the length, l, of the segment is Erlang with rate g/50 and shape 2." (Erlang shape 2, rate g/50: mean 2/(g/50) = 100/g; this mean is our arithmetic, checked by simulation in the page).
   - "the probability of a TMRCA of g generations is P(TMRCA = g | N) = 1/(2N[g]) x prod_{g'=1}^{g-1} (1 - 1/(2N[g']))".
   - "The effective size of a population is defined with reference to an idealized random mating population ..."
   - "The sampled individuals are assumed to be a random sample from the population of interest. Our method appears to be robust to small deviations from this assumption."
   - "Although we focused on human populations, our method is also applicable to random samples from non-human diploid populations."
   - "IBDseq assumes population homogeneity so that population-average allele frequencies are applicable to all pairs of individuals. Thus, we do not recommend the use of IBDseq in samples with multiple continental ancestries, including admixed populations." / "We have found that haplotype-based methods such as Refined IBD are robust to admixture and other population heterogeneity (data not shown)."
   - "We first applied a length filter that excluded IBD segments that were shorter than a threshold (typically 2 cM for sequence data and 4 cM for SNP array data)."
   - "The excess IBD might be due to extended linkage disequilibrium in these regions."
   - Bootstrap: "We bootstrapped over chromosomes"; "We performed 80 bootstrap replicates".
   - "Second, in some cases, the estimated effective size oscillates somewhat around the true value." and "... inferring changes in growth rates could be dangerous because such changes could reflect artifactual oscillation."
2. IBDNe program page, https://faculty.washington.edu/browning/ibdne.html (version ibdne.23Apr20.ae9, last updated 23 April 2020): defaults mincm=2, trimcm=0.2, gmin=2, gmax=600/mincm, nboots=80, nits=1000, filtersamples=true; output files .log .pair.excl .region.excl .ne .boot; "The IBDNe program will automatically exclude IBD segments ... and IBD segments in genomic regions having an extreme number of IBD segments."; merge-ibd-gaps utility; example command. The source zip and release notes were not downloadable; source code was NOT read. The page defines no goodness-of-fit statistic; none is claimed.
3. hap-ibd README, https://github.com/browning-lab/hap-ibd (read at commit a3fdd2d, README "Last updated: June 14, 2023"): required gt/map/out, defaults min-seed 2.0, min-extend min(1.0,min-seed), max-gap 1000, min-output 2.0, min-markers 100, min-mac 2, output file fields. Java source files exist; the README was the source used.
4. Zhou Y, Browning SR, Browning BL (2020) A fast and simple method for detecting identity by descent segments in large-scale data. Am J Hum Genet 106(4):426-437. doi:10.1016/j.ajhg.2020.02.010 (full text read).
   - "haplotype-based methods can break up a long-IBD segment into a sequence of shorter IBD segments if there are haplotype phasing errors in the long-IBD segment." (wording as extracted: "can break up a long-IBD segment into a sequence of shorter IBD segments if there are haplotype phasing errors")
5. Lesson 3 section 9 of this course for the 100/(2g) rule in ROH (linked).

## Not verified / our inference
- Imputed haplotypes inflating IBD (section 5): stated as our inference. A literature search (abstract level only) returned no paper stating it for IBD; none of the abstracts read supports it. Do not cite one.
- That a fall of orders of magnitude in ten generations is implausible: our judgement.
- Segments-per-pair and log-histogram comparison as a "fit check": ours, not an IBDNe output.
- Suitability of hap-ibd/IBDNe defaults for non-human species: open question.

## Toy and controls (all computed on page load; shown on the page)
- Toy A: explicit crossover simulation (Poisson breaks, 2g meioses, 1/100 per cM). Control: mean segment = 100/(2g) within 3 % and covering-position mean = 100/g within 5 %, g = 2,5,10,20,50,100. Result: 6 of 6, largest deviation 1.4 %.
- Toy B: expected counts L * sum_g P(g) r_g (exp(-r_g a) - exp(-r_g b)), r_g = g/50. Controls: sum of P(g) equals 1-(1-1/2Ne)^400 (0.1813 both for Ne=1,000); explicit crossover counts of segments >= 2 cM match the per-generation term, 3 of 3 (g = 5, 20, 50, 5 % tolerance); numerical integration 18.5 vs closed form 18.3 (Ne = 1,000, left Riemann sum, step 0.02 cM). Weights per generation (segment starts at rate g/50 per cM per pair) are our derivation from the exponential statement above; the page says the toy is arithmetic, not validation against real data.
- Toy C: constant-Ne fit by grid search, Pearson chi-square per bar. Control: steady truth with Ne = 1,000 recovered within 10 % and chi2/bar < 2.5 in 19 of 20 noise draws; growth, bottleneck and mixed-groups histories (one draw each) rejected (chi2/bar > 5), 3 of 3. Scenario definitions (growth: x10 for g <= 20; bottleneck: N/10 for 10 < g <= 30; mixed: half the pairs between groups with no ancestor within 50 generations) are our toy choices.
- Toy genome 3,000 cM is a scale value, not a species claim.

## Public-safety
Human data appear only as "an Asian human cohort", no counts or numbers. No unpublished taxa.
