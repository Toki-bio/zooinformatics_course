# Section 12, One alignment, every method: sources and checks

## Sources opened
- IQ-TREE source, `tree/phylotree.cpp` of the iqtree2 repository (master, fetched 2026-11-06), `PhyloTree::testOneBranch`: three trees (best and two NNI), `aLRT = lh[0] - max(lh[1], lh[2])`, RELL resampling of stored pattern likelihoods, centring `cs[i] = lh_new[i] - lh[i]`, gap between the top two, and the count rule `if (aLRT > (cs_best - cs_2nd_best) + 0.05) SH_aLRT_support++`. The page follows this code. `computeNNIPatternLh` sets `params->nni5 = true`, "always optimize 5 branches for accurate SH-aLRT".
- Same repository, `utils/tools.cpp`: `params.nni5_num_eval = 1` by default, changed with `-nni-eval`. So IQ-TREE re-fits the five branches in one pass. This toy repeats until they settle.
- IQ-TREE 3.1.4 for Windows, run as the outside check (see below).
- The methods themselves are taught and sourced in sections 03 to 08 (Jukes and Cantor 1969; UPGMA; Saitou and Nei 1987; Fitch 1971; Felsenstein 1981, 1985; Metropolis-Hastings). They were not re-opened for this section.
- RELL (Kishino, Miyata and Hasegawa 1990) and UFBoot as in section 07. The original RELL paper was not opened. "The shortcut inside UFBoot" rests on the UFBoot abstract quoted in section 07 and on the use of RELL in `testOneBranch`.

## Our own material
- Five invented tips, 20 columns. The four alignments were simulated under Jukes-Cantor on ((A,B),(C,D),E), and selected by search so that each shows its point: not typical draws. The branch lengths used are in the search script (internal repository, lesson09/wb/presets.js).
- With five tips each tree is one centre tip and two pairs, so all 15 trees are listed. Rearrangement: the centre tip swaps with one member of a pair; tip branches stay with their tips, inner branches with their pairs.
- One branch is fitted exactly: with the others fixed, the likelihood of a column is linear in exp(-4t/3). Five starting points per tree, because a branch at zero can trap the climb on a local peak (seen: -131.92 against -131.79).
- Bayesian: uniform prior on the 15 trees, exponential prior with mean 0.1 on each branch; moves are a branch multiplier exp(u - 0.5) with its log correction, and the rearrangement above. Ties in UPGMA and NJ: first in reading order on the stepper, at random in the bootstrap. Ties in parsimony and ML: credit shared equally. Branch lengths limited to 1e-6 to 10. For p of 0.75 or more, d = 3 (flagged on the page).
- The result strip uses a separate fixed 20,000-step chain, so it can differ slightly from the chain the reader runs.

## Controls (12-workbench.control.js, run 2026-11-06)
1. 15 distinct trees; every tree has four neighbours; rearrangements reversible, lengths carried.
2. Fitch against brute force over all internal states: 3,000 cases, no difference.
3. Pruning on the drawn rooted tree against the direct formula: largest ln difference 1.8e-15. NJ on additive distances: 300 of 300 trees and all branch lengths recovered.
4. ln L on fixed trees against IQ-TREE 3.1.4 (-m JC -te, -eps 0.000001), 90 tree and alignment pairs: IQ-TREE higher by at most 0.00003, this toy higher by at most 0.0086.
5. SH-aLRT against IQ-TREE -alrt 10000 with -nni-eval 30, 12 alignments: where the ln L of the tree matched within 0.002, values agreed within 2.5 points (largest seen 1.6). Two warnings. With IQ-TREE's default single pass, values differed by up to 11 points (67.7 against 56.4), which is why the page says so. In one case IQ-TREE's ln L was 0.009 lower than ours and CE was 32 against our 42.7; that case is outside the test, and we attribute the gap to the different fit without having proved it.
6. MCMC tree probabilities against importance sampling from the prior (300,000 draws per tree): largest difference 0.0011.
7. Presets: clean, all four non-Bayesian methods true; unequal, UPGMA wrong and the others true; long, parsimony joins A and C while ML and NJ are true. Page ML bootstrap against a five-start full refit, 200 draws per preset: 199 to 200 agree. An earlier version (warm start only) reached 191 on the long preset and was replaced.
Browser: all tabs, presets and support views driven at 1100 and 420 px, no script errors, no page overflow.

## Doubts
- The control's parts 4 and 5 need the iqtree binary as an argument.
- UFBoot itself is not implemented: the "stored columns" option shows only its RELL step, with all 15 trees as candidates.
- Bootstrap and SH-aLRT values on the page come from a seeded generator, so a reader who repeats the same clicks sees the same numbers; they are one sample, not exact values.

## Outside audit (GLM 5.3, 2026-11-06)
Eleven tasks over the code, the page text and the control, then two independent re-checks per finding. 11 findings, 2 refuted. The rest were read against the code by us and fixed:
- Neighbour joining at four nodes: only a two-cell tie is harmless; with identical rows all six cells tie and the sentence was wrong.
- A saturated pair printed d = formula = 3.00, which is false; the page now says the formula has no answer there.
- The Bayesian share is of the 18,000 steps kept after burn-in, not of 20,000.
- The side-by-side table showed one SH-aLRT draw count for two branches.
- "Starts at a random place" was false: the chain always started at tree 0 and Start over replayed it. It now starts at a random tree, and each Start over is a new chain.
- Tooltip for uninformative columns reworded.
- "Fill the table": about half a minute was wrong. Measured 49 s in Chrome on the author's laptop.

## Comparing whole trees (added 2026-11-06)
KH and SH follow `evaluateTrees` in `main/treetesting.cpp` of the iqtree2 repository (master, fetched 2026-11-06): centre each tree by its mean over draws; SH compares max over trees of the centred value with the tree's own; KH compares the best tree's centred value (the second best for the best tree itself). AU follows `performAUTest` in the same file: scales 0.5 to 1.4, z = -Phi^-1(bp), weights, least squares on sqrt(r) and 1/sqrt(r), p = 1 - Phi(d - c). Differences from IQ-TREE: there the threshold x is searched iteratively and draws at each scale use site patterns; here the region is "this tree is best", and a tree with too few usable scales gets 0 or 1.
The original papers could not be read: Kishino and Hasegawa 1989, Shimodaira 2002 and Goldman et al. 2000 by abstract only; Shimodaira and Hasegawa 1999 not at all. The page therefore rests on the IQ-TREE manual and source. Quotes in the internal repository (lesson09/sources_s10_add2.md).
**Not compared with an IQ-TREE run.** Running a downloaded program was refused by this session's permission check; the control checks properties instead (12-workbench.control2.js). The IQ-TREE command in section 07 was read from the manual, with `iqtree3` for `iqtree`.

Outside audit of this part and of the KKSC toy (GLM 5.3, 2026-11-06): 7 findings kept. Fixed: the AU column is now labelled simplified and the page says why; KH wording for the best tree; the button says how many draws; KKSC p below 1e-300 no longer prints 0, and large counts no longer freeze the tab; the control counts its data sets and no longer promises an equal-trees check. Dropped: "AU can print NaN": with fewer than two usable scales auFit returns 0 or 1.
