# s05 Parsimony: notes

Written 2026-11-06. No lab data, no unpublished taxa. All data in the page are invented (toy).

## Sources and what was read

1. **Fitch WM (1971)** Toward defining the course of evolution: minimum change for a specific tree topology. Systematic Zoology 20(4):406-416.
   https://academic.oup.com/sysbio/article/20/4/406/1666059 . **Abstract only** (full text is behind a subscription).
   - "A method is presented that is asserted to provide all hypothetical ancestral character states ... consistent with describing the descent of the present-day character states in a minimum number of changes of state ... using a predetermined phylogenetic relationship among the taxa represented." "The character states used as examples are the four messenger RNA nucleotides ... but the method is general."
   - The two-line rule shown in the page (shared states: intersection, no step; otherwise union, one step) is the standard textbook form of the method and is NOT verified against the paper's text. It is verified by our own control (below).
2. **Felsenstein J (1978)** Cases in which parsimony or compatibility methods will be positively misleading. Systematic Zoology 27(4):401-410.
   https://academic.oup.com/sysbio/article/27/4/401/1626870 . **Abstract only.**
   - "For some simple three- and four-species cases involving a character with two states"; "in all cases the conditions for this failure ... are essentially that parallel changes exceed informative, nonparallel changes"; "it is possible for these methods to be inconsistent even when change is improbable a priori, provided that evolutionary rates in different lineages are sufficiently unequal"; the methods "will fail to converge to the true phylogeny as more and more data are accumulated."
   - The abstract is about a two-state character. Our simulator uses four states (DNA) under a Jukes-Cantor-type model; the page says it is a simulation and does not claim it is Felsenstein's own calculation. The shape of the effect (long branches on non-sister taxa pulled together) is what the simulator shows; the long-branch names and the 0.75 / 0.05 branch lengths are our toy values.
3. **Nikaido M, Rooney AP, Okada N (1999)** Phylogenetic relationships among cetartiodactyls based on insertions of short and long interspersed elements: hippopotamuses are the closest extant relatives of whales. PNAS 96(18):10261-10266, doi 10.1073/pnas.96.18.10261, PMID 10468596.
   Record found through Europe PMC (https://europepmc.org/ , PMC17876). **Abstract only, and only as a summary returned by the fetch tool, not verbatim**; the PNAS page returned 403. The one short quote obtained: "cetaceans evolved from an immediate artiodactyl, not mesonychian, ancestor." The page's sentence (whales deeply nested in even-toed ungulates; whales and hippopotamuses form a group) rests on that summary. Re-check against the abstract before release.

## Checks (code controls, run in Node and on every page load)

- Fitch counting vs brute force (all 4^k assignments of states to the k inside nodes, minimum number of differing edges): all 1,024 state patterns x 3 five-taxon trees = 3,072 cases, 0 disagreements. 4,096 six-taxon patterns on one tree, 0 disagreements.
- Same unrooted 4-taxon tree drawn with three different roots, all 256 patterns: identical Fitch scores, 0 differences. (This is why the four-taxon simulator can use the rooted drawing ((A,B),(C,D)) for the unrooted tree AB|CD.)
- Simulator, zero branch lengths, 50 sites: 100 of 100 data sets tie (as they must).
- Simulator results seen in Node and in the page (100 data sets each; seeds differ between the two): long A and C 0.75, short 0.05, inside 0.05, 2,000 sites: right tree 0 %, (A,C | B,D) 100 %; same with 100 sites: (A,C | B,D) 88 % (Node) / 95 % (page); all branches 0.2: right tree 100 %; short 0.1 / 0.05 / 0.05: right tree 100 %.
- Toy SINE table: the page computes which trees contain the sharing group as a clade; hand check: Tree 1 fits loci 1-4, Tree 2 fits 3, 4, 6, Tree 3 none.
- Page-load check text is shown under the first figure; both previews (1100 and 420 px) ran with no script errors and no sideways page scroll; clicks on tips, site selectors, tree buttons, reset, presets and the run button were exercised in a script.

## Doubts

- The Fitch rule and the definition of informative sites are standard and written from knowledge plus our control, not from the 1971 full text.
- "Parsimony does better with few changes per site" is supported by our simulator only (short branches: right tree wins), the first is not tested here and not sourced. Consider removing the first.
- SINE section: "reversal is rare" and "ancestral state is 0" follow lesson 7 section 05, which cites Shedlock and Okada (2000) and Shedlock, Takahashi and Okada (2004); not re-opened here.
- Links to #s01, #s03, #s06, #s10 point to other sections of lesson 9 and depend on their ids.

## Final review 2026-11-06
- Added a tooltip explaining "compatibility methods" in the Felsenstein 1978 quote (our plain-language description). The four abstract quotes were re-checked against the publisher's abstract page.
