# s07 Y chromosome and mitochondrial DNA as records: sources and checks

Read date 2026-11-05. "Opened" = full text or the tool's own page read; "abstract only" says so.

## Sources and the supporting sentence

1. Karmin et al. 2015, Genome Research 25:459-466, doi 10.1101/gr.186684.114 (PMC4381518). Opened, full text.
   - "Despite the higher per-base-mutation rate of mtDNA, the much greater length of the Y chromosome (Chr Y) offers the highest genealogical resolution of all non-recombining loci in the human genome."
   - "we estimated the mutation rate of Y chromosome binary SNPs in the filtered regions at 0.74 x 10^-9 (95% CI 0.63-0.95 x 10^-9) per base pair (bp) per yr" and "a very similar mutation rate estimate of 0.76 x 10^-9 per bp per yr was determined independently from a different ancient DNA specimen of much older age". Exponents confirmed on the journal-mirror HTML page (the text tool dropped them).
   - "this estimate is based on only two ancient DNA samples from a relatively recent time horizon and the same Y chromosome haplogroup."
   - "retained 8.8 Mb of sequence per individual"; mtDNA simulations used "16,569 sites of mtDNA".
   - "the estimates based on mtDNA are consistently more than twice as high as those based on the Y chromosome"; "the Y chromosome plot suggested a reduction at around 8-4 kya ... when the female [Ne] is up to 17-fold higher than the male [Ne]".
   - "selection is not a likely explanation" (drop not limited to a few haplotypes); "A change in social structures that increased male variance in offspring number may explain the results".
   - "structure combined with an unbalanced sampling strategy can lead BSP to infer false signals of population decline under a constant population size model".
   - "most existing methods are underpowered to detect [Ne] changes within the past few thousand years ... from recombining genome-wide sequence data".
   - Abstract: 456 Y sequences (299 new); "we infer a second strong bottleneck in Y-chromosome lineages dating to the last 10 ky". BSPs for Y and mtDNA of a subset of 320 individuals; BEAST v1.8.0.
2. Wilson Sayres 2018, Genome Biol Evol 10:1064-1078, doi 10.1093/gbe/evy039 (PMC5892150). Opened, full text.
   - Assumptions: "constant population size, random mating, equal contributions of the sexes (the effective number of males ... is equal to the effective number of females ...), and a Poisson-distribution of the number of offspring".
   - "effectively, each of these regions adds only a single linked marker to the analysis".
   - Neutral expectations 0.75 (X, Z) and 0.25 (Y, W) relative to autosomes (figure legend); expectations for Z and W similar.
   - Sex-biased demography and Y selection summarised; formulas themselves are in boxes/figures not in the text version read.
3. Wilson Sayres, Lohmueller, Nielsen, "Natural selection reduced diversity on human Y chromosomes" (arXiv 1303.5012; published in PLoS Genetics 2014). Opened as the arXiv preprint PDF only; the published version was not opened.
   - "X diversity is expected to be three-quarters autosomal diversity (because there are three X chromosomes for every four autosomes) and both the Y and mtDNA diversity are expected to be one-quarter autosomal diversity".
   - "models of extreme differences in reproductive success between males and females are insufficient as the sole explanation for patterns of genome-wide diversity. Alternatively, then, natural selection appears to be acting to reduce diversity on the Y."
4. Effective size with unequal sexes: S. M. Carr, "Ne with Unequal Sex Ratio", Memorial University of Newfoundland, course page (c) 2025, opened: "Ne = 4NmNf / (Nf + Nm)", derived from the probability that two alleles come from the same parent. The page does not mention Wright. Wright 1931 and the Wikipedia article (formula uncited there) were NOT used as authority. Doubt: no peer-reviewed source opened that states the formula in text; a textbook (Hartl & Clark, Falconer & Mackay) should be added by an editor who has it.
5. Drummond, Rambaut, Shapiro, Pybus 2005, Mol Biol Evol 22:1185-1192 (doi 10.1093/molbev/msi103). Opened (author-hosted PDF, text extracted): "We introduce the Bayesian skyline plot, a new method for estimating past population dynamics through time from a sample of molecular sequences without dependence on a prespecified parametric model of demographic history."
6. Bouckaert et al. 2019, PLoS Comput Biol 15:e1006650 (PMC6472827). First ~100,000 characters opened (of ~176,000): "BEAST samples from the posterior distribution of trees (or networks) and parameters". The Bayesian skyline plot is not described in the part read.
7. Taming the BEAST, "Skyline plots" tutorial (BEAST2). Opened: skylines "assume that the population is well-mixed", "assume that there is no significant population structure", results "will be biased" otherwise; coalescent skyline "divides the time between the present and the root of the tree" into segments; "the clock rate is simply a scaling of the estimated tree branch lengths (in substitutions/site) into calendar time".
8. Fu et al. 2013, Curr Biol 23:553-559 (PMC5036973). Opened: "we estimate a substitution rate of 2.67x10^-8 substitutions per site per year" (95% HPD 2.16-3.16 x 10^-8) for the whole mtDNA genome; coding region 1.57 x 10^-8 (1.17-1.98); linear regression gave 1.92 x 10^-8 (whole) and 1.25 x 10^-8 (coding); calibration "using ancient mtDNA sequences from securely dated archaeological samples".
9. HaploGrep 3: Schonherr et al. 2023, Nucleic Acids Res 51:W263-W268, doi 10.1093/nar/gkad284 (PMC10320078). Opened. Kulczynski metric; "6401 unique haplogroups"; input hsd/FASTA/VCF, auto-detected; partial sequences such as control region; "If the samples come from genotyping arrays" the search range is adjusted to the positions present in the VCF. The tool documentation (haplogrep.readthedocs.io, trees page) opened: "Haplogrep includes 3 trees (Phylotree 17 rCRS and RSRS, Phylotree Forensic Update) by default." The "top 20 shown" detail is from the paper's description of the result list.
10. PhyloTree, phylotree.org, opened: "mtDNA tree Build 17 (18 Feb 2016)", "currently comprising over 5,400 nodes (haplogroups)", revised Cambridge Reference Sequence (rCRS); citation van Oven & Kayser 2009, Hum Mutat 30:E386-E394 (the 2009 paper itself was not opened; only its PubMed record via search).
11. Yhaplo README (github 23andMe/yhaplo), opened: "yhaplo identifies the Y-chromosome haplogroup of each male in a sample of one to millions"; inputs indexed BCF/VCF or sample-major text; "hg19/GRCh37"; SNPs imported "from the ISOGG database" (no release named); "yhaplo does not check for sex status; it assumes all individuals are male"; warns variants-only VCFs and very low-coverage or sparse array data can violate the expectation of a reasonable number of ISOGG SNPs. Citation named there: Poznik 2016, bioRxiv 10.1101/088716 (not opened).
12. SNAPPY documentation (snappy-docs.readthedocs.io, description page), opened: plink binary files or VCF; autosomal, mitochondrial and X positions must be removed; "SNAPPY makes haplogroup assignments to the deepest node with sufficient support"; defaults min_hap_score 0.6, min_deep_score 0.8; reference from ISOGG trees, no version stated; a haplogroup with all informative positions missing scores zero. Software repository: github.com/chrisgene/snappy.
13. Albrechtsen, Nielsen, Nielsen 2010, Mol Biol Evol 27:2534-2547, doi 10.1093/molbev/msq148 (PMC3107607). ABSTRACT ONLY (the full text could not be fetched). "SNP chip data suffer from ascertainment biases caused by the SNP discovery process in which a small number of individuals from selected populations are used as discovery panels"; biases "will distort measures of human diversity"; corrections "are difficult to generalize among studies".

## Our own derivation and the control

- Relative diversity of Y and mtDNA to autosomes = (copies Y or mt) / (autosomal copies 2Ne), with Y copies = Nm, mt copies = Nf and Ne = 4NmNf/(Nm+Nf). For Nm = Nf it gives 1/4, matching source 3. This derivation is ours and is labelled as such in the page.
- Control 1 (algebra, code): explicit backward simulation of two sampled gene copies (autosome: each copy from father or mother with probability 1/2, a random parent, one of its two copies; mtDNA: random mother; Y: random father), 40,000 pairs per case, mean coalescence time compared with 8NmNf/(Nm+Nf), Nf, Nm. Cases (Nm, Nf): (50,50), (10,90), (90,10), (5,100), (300,100). Result: all 15 comparisons within |z| < 1.8 (largest z = -1.79 for autosome at 10/90). PASS. This checks the algebra of the derivation under its own model; it does not test the model against real populations.
- Control 2 (calculator, browser): calculator outputs for the same five cases equal the simulation-validated ratios (Nm/(8NmNf/(Nm+Nf)) and Nf/(...)) to 1e-9. PASS.
- Control 3 (pedigree toy, browser): the forward rule (mother carries, or son of carrier father) was compared with an independent upward walk along the all-mother / all-father chain for every possible first carrier, both markers, 36 clicks at two page widths: 0 mismatches. PASS.
- Arithmetic in the "how often" box: 16,569 x 2.67e-8 = 4.42e-4 per year (1 per 2,260 yr); 8.8e6 x 0.74e-9 = 6.51e-3 per year (1 per 154 yr; the page says about 150); 2.67e-8 / 0.74e-9 = 36; 8.8e6 / 16,569 = 531. Mixing a whole-genome mtDNA rate and a filtered-region Y rate is a simplification flagged only briefly in the page.

## Doubts

- The 2.67e-8 and 0.74e-9 values are human estimates with ranges; each depends on few ancient samples (Y rate: two). The page says they must not be moved to other species.
- Formula 4NmNf/(Nm+Nf) rests on a lecture page; see source 4.
- HaploGrep chip-mode: the paper says the search range is adjusted for arrays; accuracy for arrays was not read.
- PhyloTree build 17 is from 2016; whether a newer build exists was not checked.
- Yhaplo and SNAPPY ISOGG snapshot dates are not stated in the pages read.
- Statement that mutations private to the studied samples are missing from arrays, so branch lengths carry little time information, is our reasoning (labelled so); the Albrechtsen paper was read as an abstract only.
- Mentions of a Z/W analogue rest only on source 2.
- Lesson 4 link targets (#s04 scaling) are from the repo's current lesson 4; same-lesson "#s04" refers to the sibling section "What SNP arrays can and cannot do" by the lesson plan and must be rechecked after the build.
