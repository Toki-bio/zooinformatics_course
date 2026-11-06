# Basics page, lesson 4 (04-demography): notes

All blocks rest on src/lesson04/sections/01-coalescent.html (steps 1-5, "Two copies, one ancestor", "How fast two copies find their ancestor", "Heterozygosity is a clock", "Recombination cuts the genome into many histories", "When the population size changes", "From the mosaic back to the history"). Block 5 also on 03-psmc.html (idea of PSMC). Toy values (population sizes, mutation rate 5e-6 in block 3) are invented; r = 1e-8 and the 2,000/20,000/200,000 periods are the lesson's own toy values.

1. Any two copies have one common ancestor: step 1-2 (10 copies per row, random parent in the row above, rows sorted so lines do not cross). Measured: over 5 seeds the pair met 1 to 28 generations back; 5 or 6 of 6 populations within 36 rows.
2. Small population meets sooner: step 3 (chance 1 in 2N, mean wait 2N). Measured over 5 seeds: averages 9-11, 36-44, 155-182 for 10/40/160 copies.
3. Longer ago, more differences: "Heterozygosity is a clock", two-copy example (1,000 mice). Measured: ratio of differences 7.8-9.2 for a 10-fold size ratio (ancestors 9.5-11.2 times older).
4. Stretches with own ancestor: "Recombination cuts..." (piece mean 1/(2rT)), independent-draw simplification stated in the lesson. Stretches are drawn with probability proportional to T (rejection) so the length-weighted mean ancestor is 2N: measured 1,841-2,918 and 16,238-22,037 (expected 2,000 and 20,000). Mean piece length 16-31 kb and 2.0-3.2 kb (formula 25 and 2.5 kb).
5. Many stretches show size: "When the population size changes" and 03-psmc. Size per period = stretch-generations waited / (2 x meetings), a plain count, not PSMC itself (text says PSMC reads the same signal). Measured share in 2,000-20,000 window: 16-17 %, 92-94 %, 67-69 %.
6. More stretches, steadier: same section, "thin edges". Measured error over 5 seeds: x1.38-1.72, x1.23-1.33, x1.07-1.10; 3 meetings per animal at 100 stretches, about 2 % of stretches in the first 2,000 generations.

Checked at 1100 and 420 px: no script errors, no horizontal overflow, all six buttons clicked.
Doubt: block 1 panels are small at 1100 (six across).

GLM audit 2026-11-06: the panel called a growing population had 5,000 animals recently and 50,000 long ago, so it showed a decline. Fixed to 50,000 recently and 5,000 long ago. The audit had dropped this finding because its quote did not match; it was found on reading the dropped list.
