# s06 Maximum likelihood: notes

Written 2026-11-06. "Abstract only" says when a paper was not read in full. Sources were opened on that date.

## Papers, with the supporting lines

1. **Felsenstein J (1981)** Evolutionary trees from DNA sequences: a maximum likelihood approach. J Mol Evol 17:368-376, doi 10.1007/BF01734359.
   **Abstract only (PubMed).** The full text was NOT read. Everything the page says about the paper's content (pruning, pulley principle, branch-by-branch
   optimisation) rests on source 2, a full-text account of it.
   - "A computationally feasible method for finding such maximum likelihood estimates is developed".
2. **Posada D, Crandall KA (2021)** Felsenstein Phylogenetic Likelihood. J Mol Evol 89:134-145, doi 10.1007/s00239-020-09982-w, PMC7803665. Full text read (retrieved through PubMed; exponents are lost in that text).
   - "the tree likelihood is the probability of a sequence alignment (S) given the tree (topology and branch lengths) (T) together with a model of nucleotide substitution (M), that is, P(S | T,M)".
   - "Felsenstein assumed that sites change independently from each other and across different branches, two premises that persist in most phylogenetic methods today, despite being unrealistic."
   - "for only 12 sequences we would need to sum already 4[^11] = 4,194,304 products of 23 terms". The exponent is our reading: 4^11 = 4,194,304.
   - "Felsenstein proposed to conduct this computation in terms of conditional likelihoods, starting from the tips and moving towards the root".
   - "branch lengths are conveniently scaled in expected nucleotide substitutions per site".
   - "the 'Pulley principle' by which the likelihood of a tree is not affected by the position of the root"; "it allows one to optimize the likelihood of each branch iteratively".
   - "Reversible means that this process will look the same backward or forward in time." (tooltip)
3. **Nguyen L-T, Schmidt HA, von Haeseler A, Minh BQ (2015)** IQ-TREE. Mol Biol Evol 32:268-274, doi 10.1093/molbev/msu300, PMC4271533. Full text read (retrieved through PubMed).
   - "finding the optimal tree topology is an NP-hard combinatorial optimization problem"; "one has to rely on search heuristics to find the 'best' tree".
   - "NNI is a local tree rearrangement operation that swaps two subtrees across an internal branch. Each inner branch defines two distinct NNIs. Thus, for an unrooted bifurcating tree with n taxa, there are 2(n-3) NNI-trees".
   - "The problem becomes more severe if the local tree rearrangement method can only generate a small number of trees in neighborhood of the current tree. As a result, SPR algorithms often find trees with higher likelihoods than those that are based on NNI".
   - "The tree search stops, if the current best tree has not changed for [100] random perturbations."
   - "both programs still finish sometimes in local optima and one should rerun the programs as many times as possible".
   - "as IQ-TREE is not always better than the other programs, we recommend using all three programs".
4. **Kozlov AM, Darriba D, Flouri T, Morel B, Stamatakis A (2019)** RAxML-NG. Bioinformatics 35:4453-4455, doi 10.1093/bioinformatics/btz305, PMC6821337. Full text read (retrieved through PubMed; methods supplement not read).
   - "although RAxML-NG is generally faster and returns higher-scoring trees on taxon-rich alignments, IQTree results show much lower variance."
5. **Kalyaanamoorthy S, et al. (2017)** ModelFinder. Nat Methods 14:587-589, doi 10.1038/nmeth.4285, PMC5453245. Full text read (retrieved through PubMed).
   - "when BIC scores differ by more than 10 (deltaBIC > 10) there is strong evidence against the model with the higher BIC score".
   - "the default search option relied on a suboptimal tree. Doing so may lead to the selection of a suboptimal model of SE".
6. **Wong TKF, Ly-Trong N, Ren H, Demotte P, et al. (2026)** IQ-TREE 3. Mol Biol Evol 43, doi 10.1093/molbev/msag117, PMC13191116. Full text read (retrieved through PubMed).
   - "The site likelihood is calculated as the weighted average of the conditional probabilities"; "Models of rate heterogeneity among sites based on a Gamma distribution ... are versions of mixture models."
7. **Togkousidis A, Kozlov OM, Haag J, Hoehler D, Stamatakis A (2023)** Adaptive RAxML-NG. Mol Biol Evol 40, doi 10.1093/molbev/msad227, PMC10584362. Full text fetched; only the passages on the difficulty score and SPR moves were read.
   - "Easy MSAs, with a difficulty score close to 0.0, exhibit a single globally optimal peak on their likelihood surface, while difficult ones, with a score closer to 1.0, exhibit multiple locally optimal peaks."
   - "Standard RAxML-NG exclusively explores the vast tree space via SPR moves".

## Tool documentation and source

8. **IQ-TREE documentation** (pages as fetched 2026-11-06; they show no version): https://iqtree.github.io/doc/Command-Reference , /Tutorial , /Quickstart , /Frequently-Asked-Questions , /Substitution-Models.
   - Tutorial: "Starting with version 1.5.4, -m MFP is the default behavior"; "ModelFinder computes the log-likelihoods of an initial parsimony tree"; "chooses the model that minimizes the BIC score (you can also change to AIC or AICc by adding the option -AIC or -AICc)".
   - Command Reference: `-t` "DEFAULT: 100 parsimony trees + BIONJ tree"; `-te` "no tree search is performed and IQ-TREE computes the log-likelihood of the fixed user tree"; `-mtree` "Only recommended if enough computational resources are available"; "one should repeat analysis with at least 10 IQ-TREE runs"; "data sets with many short sequences should be analyzed with smaller perturbation strength (e.g. -pers 0.2) and larger number of stop iterations (e.g. -nstop 500)".
   - Command Reference examples for version 3 use the name `iqtree3`.
   - FAQ: "Gaps (-) and missing characters (? or N for DNA alignments) are treated in the same way as unknown characters, which represent no information"; "constant/invariant sites ... are important for the correct estimation of the branch lengths".
   - Substitution Models table: HKY 4, GTR 8 free parameters.
9. **IQ-TREE 3.1.4 source** (tag v3.1.4, github.com/iqtree/iqtree3, released 2026-09-10).
   - `utils/tools.cpp` help text: `--ninit` 100, `--ntop` 20, `--nbest` 5, `--nstop` 100, `--perturb` 0.5, `--radius` 6, `--runs` 1, `-T` 1; `-seed`/`--seed`, `-pre`/`--prefix`, `-te` are all accepted. Default `model_test_criterion = MTC_BIC`.
   - `main/phylotesting.cpp`: `AIC = -2 * tree_lh + 2 * df`, `BIC = -2 * tree_lh + df * log(ssize)`, with `ssize` the number of alignment sites.
   - `main/phyloanalysis.cpp`: "Number of free parameters (#branches + #model parameters)".
10. **RAxML-NG 2.0.4 source** (tag 2.0.4, github.com/amkozlov/raxml-ng, released 2026-10-28).
   - `src/CommandLineParser.cpp`: default command search; `use_adaptive_search = true`; start tree default "adaptive"; `--adaptive off` falls back to classic; `--blopt` default nr_fast mapping to the Newton methods; `--spr-radius` default AUTO; `--seed` default current time; threads auto.
   - `src/main.cpp` `autotune_start_trees()`: random = num_start_trees(difficulty, 5.0, 0.5, 0.25), parsimony = num_start_trees(difficulty, 10.0, 0.5, 0.3); fallback 10 + 10 if no difficulty score. `src/adaptive/DifficultyPredictor.cpp`: each count is limited to 1..10.
   - `src/main.cpp`: "Please specify an evolutionary model with --model switch".
11. **RAxML-NG wiki** (fetched 2026-11-06): Tutorial (states it describes v0.8.0 and later), Automatic-model-selection-(MOOSE), Input-data, Output-files-and-settings, Tuning-model-optimization-and-tree-search.
   - Tutorial: "Final LogLikelihood: -5708.923977"; "more than 50% of all failed RAxML runs are due to tree or MSA format errors"; the 20-search log of `fusob.phy` (15 near -9974.67, 5 near -9980.60; 2 topologies); `--tree pars{25},rand{25}`; `--evaluate`; `--parse` recommends a thread count.
   - Tuning: `--opt-topology adaptive` "(default)"; MOOSE: `criterion` default BIC, `ic-delta` default 10.
   - The tutorial's "20 tree searches" default is older than the adaptive default in 2.x. The page follows the 2.0.4 source.

## Code controls (run 2026-11-06 on the final engine)

The engine in `06-likelihood.js` sits between ENGINE-BEGIN and ENGINE-END and was tested outside the page.
- **Pruning = brute force** (requested): 20,000 random sites with gaps, random branch lengths, all three topologies. Worst relative difference 3.1e-15. `brute()` shares only `pij()` with pruning. The page also shows this live for whatever the reader sets.
- **Independent check of `pij` too:** Python with a JC69 rate matrix, `scipy.linalg.expm` and explicit sums over ancestors. All 12 preset x topology ln L values agree to 5 decimals, both at the page's branch lengths and after a separate L-BFGS-B optimisation.
- **JC69 two-taxon ML distance = closed form** (requested): 14,922 (n, k) pairs, n = 10 to 200, 0 < p < 0.75, d <= 9. Worst absolute gap 1.0e-5, which is the search tolerance. `lnL2` equals a likelihood built from `along()` on a 30-site pair.
- Sum of L over all 256 site patterns = 1.000 (it is a probability distribution). Root at u against root at v: worst relative difference 6.2e-16.
- **Anomaly found and fixed:** the first version started branch lengths from 0.1 only. 300 random restarts showed real multiple peaks on a fixed tree (`Conflict` PQ|RS: -67.029 in 193 starts, -68.846 in 107). The default start happened to reach the best value on all presets, but nothing guaranteed that for edited alignments. `bestOf()` now uses five fixed starts. On 120 random alignments, 40 random restarts each never beat it (worst gap 0.0000); about 86 ms per topology.
- Presets: Clear -61.557 / -76.389 / -76.389; Conflict -67.029 / -69.899 / -74.778; No signal all -60.515 (internal branch at the minimum); With gaps -61.234 / -72.905 / -72.905.
- Deleting the constant columns of Clear (24 to 7 sites) raises the internal branch from 0.244 to 2.283, as the page says.
- AIC and BIC table recomputed: JC69 10434.0 / 10517.4, HKY 10282.0 / 10385.1, GTR 10280.0 / 10402.7. Coin: 0.00098 and 0.00222.
- All controls clicked in headless Chrome at 1100 px and checked at 420 px: no script errors, no page overflow.

## Not tested

The IQ-TREE and RAxML-NG commands on the page were NOT run. Their options were checked in the documentation and source only, and the toy ln L values were not compared with either program.

## Our reading, not a statement from a source

- The JC69 correction is a likelihood estimate (shown by the control, not quoted).
- Pruning's work grows in step with the number of nodes.
- A change on a long branch costs less than on a short one (follows from the formula).
- ln L should not be compared between different alignments (marked as our reading on the page).
- The multiple peaks on a fixed tree are our own observation from the control above.
- The toy names P, Q, R, S are used so they do not clash with the bases, or with the species codes A to D used elsewhere in the course.

## Doubts

- Felsenstein's own text was not read (source 1).
- The executable name `iqtree3` comes from the Command Reference examples, not from running a release. Section 03 writes `iqtree`, following the ModelFinder paper.
- RAxML-NG's primary repository has moved to Codeberg. The source was read from the GitHub mirror at tag 2.0.4, and the Codeberg changelog could not be fetched.
- The benchmarks quoted are from the authors' own papers and older versions.
