# s10 Gene trees and species trees: notes

Written 2026-11-06. Every source below was opened. "Abstract only" says when only the abstract was read.
No lab data, no "In our projects" box. All numbers are toy simulations or from the cited public papers.

## Sources, with the supporting lines

1. **Degnan JH, Rosenberg NA (2006)** Discordance of species trees with their most likely gene trees. PLoS Genet 2:e68,
   doi 10.1371/journal.pgen.0020068, PMC1464820. Full text read.
   - "Denoting the length of the one internal branch in a three-taxon tree by λ, the probability is 1 − (2/3) e^−λ that a gene tree has the
     same topology as the species tree. This value always exceeds the probability that the gene tree topology matches one of the other two
     topologies, or (1/3) e^−λ."
   - "AGTs do not exist for species trees with three taxa".
   - "In the simplest model for diploids, each species has constant population size N/2 individuals, and λ_i coalescent units equal λ_i N
     generations." So their N counts gene copies; the page counts animals, one unit = 2N generations.
   - Definition 1: a gene tree topology g is anomalous for a species tree if P(G = g) > P(G = ψ); "The anomaly zone for a topology ψ is the set
     of vectors of branch lengths λ for which σ = (ψ, λ) has at least one anomalous gene tree."
   - "all species tree topologies with five or more taxa, as well as asymmetric topologies with four taxa, have anomaly zones".
   - "Species trees with at least one short branch, especially if it is deep in the tree, are particularly susceptible to producing AGTs."
   - "the 'democratic vote' procedure of using the most common gene tree as the estimate of the species tree is statistically inconsistent".
   - Figure 1 caption: "(c) The single sequence of coalescences leading to gene tree topology (((AB)C)D)", against two orders for the symmetric tree.
   - "no AGTs occur if x is greater than or equal to the solution to a(x) = 0, or approximately 0.2655" (x = deeper branch). Not printed on the page; used as a control.
2. **Scally A et al. (2012)** Insights into hominid evolution from the gorilla genome sequence. Nature 483:169-175, doi 10.1038/nature10842,
   PMC3303130. Sections on ILS read.
   - "In 30% of the genome, gorilla is closer to human or chimpanzee than the latter are to each other; this is rarer around coding genes,
     indicating pervasive selection throughout great ape evolution".
   - "Across the genome we find 30% of bases exhibiting ILS, with no significant difference between the number sorting as ((H,G),C) and ((C,G),H)."
   - "the fraction of ILS varies with respect to genomic position".
   - T of about 0.8 on the page is our own calculation: ln((2/3)/0.3) = 0.799. It assumes ILS alone and one T for the genome.
3. **Zhang C, Scornavacca C, Molloy EK, Mirarab S (2020)** ASTRAL-Pro. Mol Biol Evol 37:3292-3307, doi 10.1093/molbev/msaa139, PMC7751180.
   Introduction and abstract read. A corrigendum exists (doi 10.1093/molbev/msab232); its text was not read.
   - "The evolutionary history of a gene can differ from that of the species containing the gene for several reasons (Maddison 1997), including
     incomplete lineage sorting (ILS), duplication and loss (DupLoss for short), gene transfer, and hybridization."
4. **Hibbins MS, Hahn MW (2022)** Phylogenomic approaches to detecting and characterizing introgression. Genetics 220:iyab173,
   doi 10.1093/genetics/iyab173, PMC9208645. Sections on ILS and gene trees read. A corrigendum exists (iyab220); its text was not read.
   - "This means that the two discordant gene tree topologies are expected to be equal in frequency".
   - "When introgression occurs between nonsister lineages ... one discordant tree topology can become more common than the other. This
     asymmetry in discordant tree topologies is one of the clearest signals of introgression."
5. **Sayyari E, Mirarab S (2016)** Fast coalescent-based computation of local branch support from quartet frequencies. Mol Biol Evol 33:1654-1668,
   doi 10.1093/molbev/msw079, PMC4915361. Introduction and assumptions read.
   - "Under the MSC, quartet trees do not have anomaly zones (Allman et al. 2011; Degnan 2013), meaning that the most probable gene tree is
     identical to the species tree for any quartet."
   - "if the total branch length (in coalescent units) between the two internal nodes of the quartet is d, the probability of the dominant
     quartet topology in gene trees is θ = 1 − (2/3) e^−d".
   - "We assume that evolution is tree-like and true gene trees differ from the species tree only due to ILS, as modeled by the MSC."
6. **Kubatko LS, Degnan JH (2007)** Syst Biol 56:17-24, doi 10.1080/10635150601146041. **Abstract only.**
   - "use of the bootstrap to measure support for the inferred phylogeny can result in moderate to strong support for an incorrect tree".
7. **Mendes FK, Hahn MW (2018)** Why concatenation fails near the anomaly zone. Syst Biol 67:158-169, doi 10.1093/sysbio/syx063. **Abstract only.**
   - "maximum-likelihood tree estimation from concatenated data fails both inside and outside the anomaly zone".
8. **Mirarab S (2019)** Species tree estimation using ASTRAL: practical considerations. arXiv 1904.03826 (preprint book chapter, linked from the
   ASTRAL README). Passages on input, accuracy and terms read.
   - "I use terms gene and locus interchangeably to refer to a recombination-free region of the genome (not functional genes)." (the sentence is split by a figure in the PDF text)
   - "The ideal input to coalescent-based methods is a set of perfectly aligned orthologous regions present in all genomes, with each region small
     enough to avoid recombination but large enough to have a strong phylogenetic signal and with regions distributed randomly across the genome
     and placed far enough apart to make them fully unlinked."
   - "Mirarab and Warnow (2015) found ASTRAL to be more accurate than concatenation using ML (CA-ML) when true gene tree discordance (i.e., level of
     ILS) was high or when gene tree error was relatively low. In contrast, CA-ML was more accurate when either the true gene tree discordance was
     low or when the discordance was moderate or high, but the gene tree error was also high."
9. **Zhang C, Rabiee M, Sayyari E, Mirarab S (2018)** ASTRAL-III. BMC Bioinformatics 19(S6):153, doi 10.1186/s12859-018-2129-y, PMC5998893. Abstract and passages read.
   - "all summary methods, including ASTRAL, are sensitive to gene tree estimation error".
   - "removing branches with very low support (e.g., below 10%) improves accuracy while overly aggressive filtering is harmful".
   - "an unrooted quartet species tree always matches the most likely unrooted quartet gene tree".
10. **ASTRAL-III documentation**, github.com/smirarab/ASTRAL, README.md and astral-tutorial.md at commit 068a4b2497 (2024-04-01), version 5.7.8.
    - "ASTRAL is a tool for estimating an unrooted species tree given a set of unrooted gene trees."
    - "ASTRAL finds the species tree that has the maximum number of shared induced quartet trees with the set of gene trees, subject to the
      constraint that the set of bipartitions in the species tree comes from a predefined set of bipartitions."
    - "We encourage using the new code."
    - "The input gene trees are treated as unrooted ... the output of ASTRAL should also be treated as an unrooted tree".
    - "Branch lengths are in coalescent units and are a direct measure of the amount of discordance in the gene trees. As such, they are prone to
      underestimation because of statistical noise in gene tree estimation."
    - "Local posterior (-t 3): is the default".
    - Command form: `java -jar astral.5.7.8.jar -i test_data/song_mammals.424.gene.tre -o test_data/song_mammals.tre 2> song_mammals.log`.
11. **ASTER documentation**, github.com/chaoszhang/ASTER, README.md, tutorial/astral4.md, tutorial/astral-pro3.md at commit ddc3dc6b28 (2026-06-25), latest release tag v1.25.
    - Output: "branch lengths in substitution-per-site units (IQ-TREE like) for all branches".
    - "ASTRAL-IV lacks of some features of ASTRAL-III (e.g. bootstrapping). You can work around by first computing optimal tree with ASTRAL-IV and
      use the ASTRAL-IV output tree as -q option to ASTRAL-III."
    - Commands: `bin/astral4 -t 4 -o OUTPUT_FILE INPUT_FILE 2>LOG_FILE`; `bin/astral4 --root YOUR_OUTGROUP INPUT_FILE`;
      "If you are using Windows, please replace bin/astral4 with .\exe\astral4.exe"; `bin/astral-pro3 INPUT_FILE`.
12. **IQ-TREE documentation**, Concordance factors, iqtree.github.io/doc/Concordance-Factor, read 2026-11-06 (uses `iqtree3`).
    - All four commands on the page are from it. `--prefix concord2` for the sCF run is our change, so that step 3 does not overwrite step 2.
    - "We recommend at least 100 quartets for stable sCF values."
    - `concord.cf.tree`, `concord.cf.branch`, `concord.cf.stat`: "A tab-separated table with gCF and gDF (gene discordance factor) for every internal branch".
    - "For sCF we recommend that you use the more accurate version of sCF based on maximum likelihood (--scfl option instead of --scf) that is available since IQ-TREE v2.2.2."
    - "From version 2.2.2 IQ-TREE provides a new and more accurate sCF based on likelihood via --scfl option, whereas the original sCF is based on parsimony."
13. **Minh BQ, Hahn MW, Lanfear R (2020)** New methods to calculate concordance factors for phylogenomic datasets. Mol Biol Evol 37:2727-2733,
    doi 10.1093/molbev/msaa106, PMC7475031. Definitions read.
    - gCF "defined as the percentage of 'decisive' gene trees containing that branch"; sCF "defined as the percentage of decisive sites supporting a branch in the reference tree".
    - "a gene tree is decisive as long as it contains at least one of the taxa in each of the taxon subsets A, B, C, and D".
    - gDF1, gDF2 from the two nearest-neighbour alternatives; "We define the proportion of decisive input trees that fall into this category as gDF_P,
      where the 'P' stands for 'paraphyly.'"
    - "although all but one bootstrap value on the tree in figure 1 is 100%, the smallest gCF and sCF values are 4.5% and 33.2%".
14. **Lanfear R, Hahn MW (2024)** The meaning and measure of concordance factors in phylogenomics. Mol Biol Evol 41:msae214, doi 10.1093/molbev/msae214,
    PMC11532913. Passages read. Correction doi 10.1093/molbev/msag013 read: it fixes a sign in Equation 3 (sCF), which this section does not use.
    - "CFs are (estimates of) biological parameters, i.e. the proportion of the genome for which a given clade is true, not measures of statistical support".
    - "expected concordance will be highest (approaching 1) with long branch lengths (large T), and will be lowest (approaching 1/3) with very short
      branch lengths (very small T). As an example, after one coalescent unit (T = 1), ~75% of trees will be concordant".
    - "Because qCFs and sCFs define ψ4 to be 0, the lowest possible value of ψ1 should be 33.3 for these measures (under most circumstances). In contrast, gCFs can be arbitrarily low."
    - "The biggest limitation of gCFs is gene tree estimation error."
15. **Solís-Lemus C, Ané C (2016)** Inferring phylogenetic networks with maximum pseudolikelihood under incomplete lineage sorting. PLoS Genet 12:e1005896,
    doi 10.1371/journal.pgen.1005896, PMC4780787. Abstract and passages read.
    - "input for our method is a table of quartet CFs observed from multi-locus data".
    - "Our model accounts for incomplete lineage sorting through the coalescent model, and for horizontal inheritance of genes through reticulation nodes".
    - Of the earlier full-likelihood method: "practical for small scenarios of up to about 10 species and 4 hybridizations in the network".

Not used: Maddison (1997) could not be opened (only its title came back), so it is cited nowhere on the page.

## Code control

`10-species-trees.control.js` loads the engine from the page's own script (between ENGINE-BEGIN and ENGINE-END). Run with `node`. It prints CONTROL PASSED. Limit |z| = 3.5.

- Part 1, page engine, 2,000,000 genes per row, against 1 − (2/3) e^−T. T = 0: 0.33342 / 0.33333. T = 0.05: 0.36615 / 0.36585. T = 0.5: 0.59519 and 0.59550 / 0.59565
  (N = 10,000 and N = 20,000, so only the ratio counts). T = 1: 0.75579 / 0.75475. T = 2: 0.90951 / 0.90978. T = 2.5: 0.94541 / 0.94528. T = 50: 1.00000.
  The two wrong trees stay equal: largest |z| 2.21.
- The T = 1 row had z = 3.44, close to the limit, so it was repeated with five new seeds at 10,000,000 genes each: z = 0.63, 0.51, 0.51, 0.53, −0.53. It was chance, not bias.
- Part 2, no engine: brute-force Wright-Fisher, each line draws a random parent from 2N copies every generation, 400,000 genes per row, N = 100 to 500.
  T = 0.25: 0.48084 / 0.48080. T = 0.5: 0.59623 / 0.59565. T = 1: 0.75621, 0.75593, 0.75425 / 0.75475. Largest |z| 2.16.
- Part 3, four species (((A,B),C),D), 8,000,000 genes per row. x = y = 0.1: species tree 0.1036, ((A,B),(C,D)) 0.1280, the commonest of 15. The numbers on the page come from this row.
  x = 0.2655, y = 0: species tree and symmetric tree both 0.1027, the boundary given by Degnan and Rosenberg. x = y = 1: species tree 0.5560, commonest, no anomaly.
  Unrooted quartets match 1 − (2/3) e^−y: 0.39676 / 0.39678 at y = 0.1, with the others 0.3013 and 0.3019. The unrooted tree has one internal branch of length y, because the root lies off it.
  (A first version of the control used x + y here and failed. The control was wrong, not the simulation.)
- Browser click test, 1100 px, 420 px and dark mode: no script errors, no page overflow. Both sliders, the three buttons, and all three line colours were exercised. At 21,000 genes the simulated share
  stayed within about two standard errors of the formula at all seven settings tried.

## Our inferences and doubts

- T = 0.8 for the apes is our calculation and ignores gene flow, selection, and the variation of ILS along the genome.
- "ILS in one well-mixed ancestral population" is our wording: a structured ancestor might also tilt the two wrong trees, but no paper on that was read, so none is cited.
- The drawings of gene flow and paralogy are schematic, with no computing behind them.
- The ASTRAL commands were read from the documentation, not run.

## Added 2026-11-06: ABBA-BABA and the quartet toy

Sources were opened by a source-reading agent on 2026-11-06. Every quote was machine-checked against the opened text; its file with all quotes is kept in the internal repository (lesson09/sources_s10_add.md).

16. **Green RE et al. (2010)** Science, doi 10.1126/science.1188021, PMC5100745. Main text only; the supplement was not reached.
17. **Durand EY, Patterson N, Reich D, Slatkin M (2011)** Mol Biol Evol 28:2239-2252, doi 10.1093/molbev/msr048, PMC3144383. Full text read, equations from the images. D, the sign rule, the binomial sentence and the jackknife, gene flow between P1 and P2, ancestral subdivision, ghost populations, and Eq. A1.5 used in the control.
18. **Patterson N et al. (2012)** Genetics, doi 10.1534/genetics.112.145037, PMC3522152. Full text read. D with BABA first. Gives no Z threshold or block size for D.
19. **Martin SH, Davey JW, Jiggins CD (2015)** Mol Biol Evol, doi 10.1093/molbev/msu269, PMC4271521. Full text read.
20. **Malinsky M, Matschiner M, Svardal H (2021)** Mol Ecol Resour, doi 10.1111/1755-0998.13265, PMC7116594, and the Dsuite README (master, fetched 2026-11-06), which gives the default of 20 blocks, the command forms and the sets file. The commands were read, not run.
21. **Zheng Y, Janke A (2018)** BMC Bioinformatics 19:10, doi 10.1186/s12859-017-2002-4, PMC5759368. Full text read. Z > 3, population size.
22. **Koppetsch T, Malinsky M, Matschiner M (2024)** Syst Biol, doi 10.1093/sysbio/syae028, PMC11639170. Full text read. Their slow-P2 case has ABBA above BABA, which agrees in sign with our fast-P2 case having BABA above ABBA.
23. **Mirarab S et al. (2014)** Bioinformatics, doi 10.1093/bioinformatics/btu462, PMC4147915. Full text read.
24. Sayyari and Mirarab (2016), source 5 above, now read in full for Theorems 1 and 2: local posterior and branch length. Lambda = 1/2 is the flat prior. The page shows the MAP length, as ASTRAL does.
25. **Degnan JH (2013)** Syst Biol, doi 10.1093/sysbio/syt023. Abstract only. It states anomalous unrooted gene trees for 7 or more taxa and says they are characterized for 5 and 6. The five-species case on the page is from our own simulation, and Degnan is not cited for it.

## Control for the additions

`10-species-trees.control2.js`, run with `node`, prints CONTROL PASSED.
- Quartet scores against a separate four-point count: 4,500 tree scores, none differ. The count uses its own distances and pairings, but takes the list of 15 trees from the engine.
- Local posterior against Sayyari and Mirarab: 0.6612, 0.9297, 0.9970 against their 66.1, 93.0, 99.7 %.
- Simulated shares of the five quartets against 1 - (2/3) exp(-d), three settings, 2,000,000 genes: largest |z| 2.52.
- Anomaly preset, x = y = 0.05, z = 1, 4,000,000 genes, from a separate run of the page engine (not printed by the control): AB|E|CD 0.1209, AD|E|BC 0.1052, AC|E|BD 0.1051, species tree 0.0788. Runs of 1,000, from the control: quartets right 0.184, 0.329, 0.613, 0.942, 0.999 at 30, 100, 300, 1,000, 3,000 genes; vote right 0.092, 0.053, 0.011, 0, 0.
- D against Durand Eq. A1.5 in coalescent units, 3fA / (3fA + 2(1-f)exp(-B) + 2f exp(-A)), A = t123 - tg, B = t123 - t12, 200,000 stretches, mu = 0.002: 0.0452/0.0429, 0.1028/0.1017, 0.1895/0.1871, 0.4262/0.4256. At the page's mu = 0.02 mean D is lower (0.155 at f = 0.1), which we attribute to repeat hits on the long outgroup branch.
- Jackknife: by hand on three blocks, and against scikit-allel 1.3.13 `allel.stats.misc.jackknife` on five genomes: largest difference 7e-18.
- 400 genomes per setting, |Z| above 3, jackknife / binomial: no gene flow 0.003 / 0.110; P3 into P2, 10 %: 0.690 / 0.968; P3 into P1: 0.755 / 0.983; P1 into P2: 0.007 / 0.105; P2 fast, no gene flow: 1.000 / 1.000, mean D -0.123.

## Doubts for the additions

- Compared with ASTRAL-III 5.7.8 (`-t 2`) on a server, 2026-11-06, eight gene tree sets of 30 to 2,000 genes from the page engine: same tree and quartet score in all eight; local posterior within 2e-11 and z values equal on all 16 branches; branch length equal to the MAP estimate (the ML estimate differed by up to 0.098, so the page was changed to MAP). Five tips only, complete trees, no polytomies: this does not test ASTRAL's search.
- "We read it as chance matches with the outgroup" is our inference from the effect shrinking with a close outgroup (D -0.12 at outgroup time 3, -0.02 at 1.2), not a measured count.
- Every stretch is independent in the toy; real genomes have linkage that fades gradually.

## Added 2026-11-06: KKSC test

26. **Kuritzin A, Kischka T, Schmitz J, Churakov G (2016)** Incomplete lineage sorting and hybridization statistics for large-scale retroposon insertion data. PLoS Comput Biol 12:e1004812, doi 10.1371/journal.pcbi.1004812, PMC4788455. Full text read by a source-reading agent; quotes and formulas in the internal repository (lesson09/sources_s10_add2.md). Equations 20 and 22 are used directly. It is one three-lineage model, with a multi-lineage version only announced.

Doubts:
- The source-reading agent's note gave P(Bin(22, 1/3) >= 8) for the paper's 0.293 on 9:8:5. That is wrong: the control shows it is P(Bin(22, 1/3) >= 9) = 0.29300, the same tree as 0.5811 (8 against 5).
- Its example for 25:22:21 prints "30<33"; we reproduce the 30 but cannot explain the 33. The exact test is used here, not the normal approximation, and 33 is not used.
- The verdict rule (asymmetry first, then tree, then polytomy) is our reading of the Methods and of Figure 3, not a sentence from the paper.
- The presets are counts printed in the paper; they are not re-analysed.

## Outside audit of the additions (GLM 5.3, 2026-11-06)
Seven tasks, two re-checks per finding. 6 findings kept, 1 refuted, 5 fixed: a false alarm under sister gene flow read like a detection; the tick box changed more than its label said and "older species" changed no times; the Z chart cuts off at 10 without saying so; the rate label stood by the wrong branch. Of 5 findings dropped because their quotes were not found, one quoted code that is not in the file, one quoted a line of Hibbins and Hahn that is in the notes above, one mistook 0.4256 for 0.4257, and two (provenance of the 4,000,000 run, what "separate" means) are fixed in the notes. The KKSC toy was added after this audit.
