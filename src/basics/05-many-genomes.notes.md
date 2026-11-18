# Basics page, lesson 5: sources and measurements
1. Pairs: s01 "why a second genome changes the question" (n(n-1)/2). Page counts the drawn lines: 1, 6, 28, 66.
2. Trees differ along a chromosome: s02 (local tree, breakpoint, subtree prune and regraft). Toy: random 6-tip tree, 3 random prune-and-regraft steps. Run over 18 seeds, no errors; each breakpoint changed shape or age, so the heading holds at every draw. "Closest to h1" is computed from the trees.
3. Recombination and number of trees; Y/mt one tree: s02 (raise rate gives more trees) and s07 (one block, one tree). 0/4/16 recombinations, same seed. This toy never produces a recombination that leaves no trace (lesson s02 says real ones do); the page says so.
4. IBD: s05 part 1 (2g meioses, 1/100 per cM, expected piece 50/g). Averages vary around the formula in single draws; the page says so.
5. Ne: s05 part 2 (P(g) formula, 3,000 cM toy genome, 400 generations). Measured: Ne 100/1,000/10,000 give 149/18/1.9 segments of 2 cM or more per pair.
6. Arrays: s04 (SFS proportional to 1/k + 1/(100-k), 1,000 sites). Measured: MAF 5 % keeps 590 of 1,000 (lesson: about six in ten); 20 % keeps 274.
Checked at widths 1100 and 420: no script errors, no horizontal overflow, all buttons clicked.

Trimmed 2026-11-06: formulas (n(n-1)/2, 50/g cM, 1/k+1/(100-k)), 3,000 cM toy genome, 400 generations, invisible recombinations and the idealised-Ne definition moved out of the page; toys unchanged.

GLM audit 2026-11-06: Y chromosome wording and the definition of Ne corrected against the lesson.

7. Tajima's D (added 2026-11-18): s06 "Diversity from a sample". Formula (a1, a2, b1, b2, c1, c2, e1, e2) copied from s06; sources and their limits (Tajima 1989 only as abstract, formulas from Wikipedia, checked by two computations) are in lesson05/sections/06-tajima.notes.md. Signs and causes as stated there: growth and sweep negative, bottleneck and balancing selection positive; the sweep and balancing-selection directions are standard interpretations, not quoted from an opened source.
   Toy: 6 sequences, 24 bp. Checked in Node against s06 tajimaD: many rare S 6, pi 2.000, D -1.367; neutral mix (minor counts 1,1,1,2,2,3) S 6, pi 2.667, D +0.085; middle frequency (five sites carried by 3) S 5, pi 3.000, D +2.071. Control D(4,3,1.5) = -0.7545, D(10,10,3) = -0.6707, same as s06. Headless Chrome 1100/420 px: all three buttons clicked, no script errors, no overflow; check.js all ok.
