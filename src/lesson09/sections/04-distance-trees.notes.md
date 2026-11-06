# s04 Distance trees: UPGMA and neighbour joining - notes

Written 2026-11-06. Toy data only; no lab data, no unpublished taxa.

## Sources actually opened
1. Saitou N, Nei M (1987) Mol Biol Evol 4(4):406-425, https://doi.org/10.1093/oxfordjournals.molbev.a040454 (PubMed 3447015). **Abstract only was read; the full text is paywalled and was not opened.** Quoted on the page: "The principle of this method is to find pairs of operational taxonomic units (OTUs [= neighbors]) that minimize the total branch length at each stage of clustering of OTUs starting with a starlike tree." The abstract also says the method was compared by simulation with UPGMA, Farris's, Sattath and Tversky's, Li's and Tateno et al.'s methods and "The new, neighbor-joining method and Sattath and Tversky's method are shown to be generally better than the other methods."
2. scikit-bio, `skbio/tree/_nj.py`, repository main branch, last commit touching the file 9494b7d (2026-09-19); released version 0.7.4 used for the cross-check below. The formulas on the page are taken from the code comments:
   - "Q(i, j) = (n - 2) d(i, j) - \sum d(i) - \sum d(j)"
   - "d({i, j}, k) = (d(i, k) + d(j, k) - d(i, j)) / 2"
   - "\delta = (\sum d(i) - \sum d(j)) / (2(n - 2)); L(i) = d(i, j) / 2 + \delta; L(j) = d(i, j) / 2 - \delta" (the page writes L(j) = d(i,j) - L(i), which is the same number)
   - last three taxa: "L_0 = (dm[0, 1] + dm[0, 2] - dm[1, 2]) / 2" (and symmetric)
   - docstring: "NJ generates an **unrooted** tree with varying tip heights. This contrasts UPGMA, which always produces ultrametric trees." / "NJ is most accurate when distances are **additive** -- the distance between two taxa in the matrix equals to the sum of branch lengths connecting them in the tree. When this assumption is violated, which is common in real studies, negative branch lengths may be produced" / "The algorithm is O(n^3) in time and O(n^2) in space."
   - it cites Saitou and Nei 1987 and Gascuel and Steel 2006 (not opened; not used on the page).
3. scikit-bio, `skbio/tree/_upgma.py`, same repository. "UPGMA (unweighted pair group method with arithmetic mean) is a simple hierarchical clustering method ... both variants are due to Sokal and Michener" / "UPGMA creates a rooted and ultrametric tree -- all tips will have the same height (distance from the root node)." Sokal and Michener 1958 (Univ Kansas Sci Bull 38:1409-1438) is **named only through this docstring and was not opened**.
4. SciPy 1.18.0 documentation, `scipy.cluster.hierarchy.linkage`, `method='average'`: d(u,v) = 1/(|u||v|) sum d(u[i], v[j]); "This is also called the UPGMA algorithm."

## Not verified / our own work
- "UPGMA gives the correct tree only if the clock holds": our statement of the standard assumption, supported here by the ultrametric property (sources 3, 4) and by our control, not by a quoted sentence.
- "NJ returns the exact tree from an additive table" is shown by our control (200 random tables), not proved here and not quoted from the 1987 paper (full text not read). The page says so.
- The step "height = d/2" and the size-weighted average are the standard UPGMA update; the average is the SciPy formula (source 4); the size-weighted form is algebraically identical (our derivation, checked against SciPy below).

## Controls (run on page load, same functions as the toy; seeded)
- NJ on 200 random additive tables of 4 to 9 tips: true splits recovered 200/200, largest distance error 3.6e-15.
- UPGMA on 200 random ultrametric tables: recovered 200/200, largest error ~9e-16.
- Toy sweep, speeds 1 to 8 step 0.5 (3 skipped, a tie: d(1,2) = d(2,3) = 4): UPGMA right at the 4 speeds below 3, wrong at the 10 above 3; NJ right at all 14. Hand derivation: d(1,2) = speed + 1, d(2,3) = 4.
- Speed 6: UPGMA groups {2,3}, not {1,2}; NJ equals the true tree.
- UPGMA on 200 random additive (non-clock) tables: wrong tree in 94 of 200.
- Outside cross-check (not on the page): 3 noisy 7-tip tables written by the page (open the built page with `#s04-xcheck`), compared in Python: UPGMA tip-to-tip distances vs SciPy `linkage(..., 'average')` cophenetic distances, max difference about 1e-6; NJ tip-to-tip distances vs scikit-bio 0.7.4 `nj`, max difference about 2e-6. The 1e-6 is only the six-digit rounding of branch lengths in the Newick text, so topology and lengths agree.

## Doubts
- Split key for ties: at speed 3, UPGMA's first-found rule decides; page says so.
- NJ is drawn from its central node (rooted display of an unrooted tree); stated on the page.
- Page links to s01, s03, s05, s06, s07, s09 of this lesson by their planned content; check numbering once all sections exist.
