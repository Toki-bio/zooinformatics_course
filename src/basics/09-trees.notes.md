# Basics page, lesson 9 (09-trees): sources and measurements

1. Order of names means nothing: lesson section 01 ("Rotating a node changes nothing", closeness read from nodes). Page computes same-tree test (canonical form), sister and page neighbour from the drawn tree.
2. Root: section 01 (outgroup, clade, sister need a root; unrooted tree has 2n-3 branches = rooted versions). Page reroots a 5-tip tree on all 7 branches; computes 7 distinct rooted trees, 1 with the outgroup alone.
3. Shared changes: section 05 (Fitch steps, informative sites, uninformative sites cost the same). Jukes-Cantor simulation, 30 columns, tip branches 0.1, inside 0.3 (our toy values). Measured over 500 seeds: true tree strictly fewest steps in 494 of 500, 5 ties, 1 wrong; the page text is computed per run and says "wrong" or "tie" when so.
4. Long branches: section 05 (long-branch attraction, toy lengths 0.75/0.05/0.05, 2000 sites). Measured over 100 seeds at 2000 columns: AC|BD columns exceeded AB|CD in 100 of 100; with all branches 0.1 the true pairing had most votes in 100 of 100. Ten times more data keeps the bias (section 05: more data does not rescue).
5. Support: section 07 (resample columns with replacement, share of replicates containing the branch, repeatability not probability, same bias in every replicate, about 63 % of columns appear). 1000 resamples per set; the strip shows one resample; the 63 % is computed. Trees per replicate are by parsimony with random tie break (the lesson toy uses NJ; this is a simplification stated on the page). Data sets 1 and 2 are built from stated column counts, set 3 is simulated.
6. Gene trees: section 10 (species vs gene tree, ILS, coalescent units of 2N generations, share matching = 1 - 2/3 e^-T; simulated here without the formula: meeting time exponential, else each of three pairs equally likely). T = 0, 0.5, 1.5, 3; 3000 genes each. Gene flow and duplication mentioned in one sentence as in the lesson.

Doubts: bar and tree sizes are toy values. The "wrong/tie" wording depends on seed and is computed.

Trimmed 2026-11-06: removed from page text: toy simulation parameters (branch lengths 0.75/0.05), bootstrap tie-breaking rule, gene flow/duplication caveat, simplified-animals note, Bootstrap data-set descriptions; the full lesson has them.
