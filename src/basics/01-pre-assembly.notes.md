# Basics page, lesson 1: notes

All blocks use invented toy data: random sequences, reads of 50 bases, k = 15, one strand, computed in the page (seeded, "New random reads" changes the seed). Lesson source: src/lesson01/lesson01.html.

1. L - k + 1 k-mers: lesson "Key ideas", figure 2 and "Why does a read give L - k + 1 k-mers" (and Step 3, "what a k-mer histogram is"); "needs no reference genome" from the k-mer glossary entry. Measured: 17, 13, 5 rows for k = 4, 8, 16 of a 20-base read; always equals L - k + 1.
2. Peak at the coverage: "Why does the peak sit at the coverage", k-mer coverage = read coverage x (L - k + 1) / L. Measured over 6 seeds, 20,000-base genome: peak at 2 (formula 2.2), 6-7 (7.2), 21-22 (21.6).
3. Errors: Step 4 intro and "Why is the error spike so tall" (up to k new k-mers, seen 1-2 times, plots clip the spike). Measured at 0 / 0.5 / 2 %: k-mers seen once about 5 / 20,500 / 71,000 against a tallest peak bar of about 2,100-2,600.
4. Genome size: "Genome size by hand" (sum of x*n(x) from the valley divided by the homozygous peak). Peak = top of 3-bar moving average from x = 5; valley = lowest bar left of it. Measured over 6 seeds, 3 sizes, 0.3 % errors: peak 19-21; estimate within -1.9 % to +8.7 % of the true size (mostly about +3 %, from error k-mers right of the valley).
5. Het: Step 4 intro, "where each peak comes from", het sites make half-coverage k-mers; heterozygosity in the glossary. Measured at 1 %: het peak at 0.43-0.52 of the main peak, one-copy k-mers 22-28 % of different k-mers, het peak lower; at 3 %: 51-55 %, het peak taller (lesson: above about 1.5 %).
6. Repeats: "One k-mer, one place in the genome, many reads" table (repeat with n copies at n x coverage); "repeats are the main reason assemblies break" from the glossary. Measured as mean sightings (the mode is too noisy for 2,000 k-mers): ratio piece/rest 0.9-1.1 (1 copy), 1.9-2.1 (2), 3.9-4.2 (4).

Doubts: toy reads are error-free and one-strand (stated on the page); canonical counting is not shown. Real genomes are not random, so the toy peaks are cleaner than real ones.

Trim 2026-11-06: removed from the page (full lesson has them): no reference genome needed; k-mer spectrum synonym; up to k k-mers spoiled per wrong base; coverage x (L - k + 1) / L formula and wrong-base counts; same-coverage remark in block 4; "repeats are the main reason assemblies break"; toy details (random sequence, one strand, wrong base replaced by one of three others, copies identical, het peak ratio).

GLM audit 2026-11-06: the peak lies at about 72 % of read coverage here (reads of 50, k = 15), so the page now says a little less often; the block 5 heading no longer says half-height, since at 3 % the second peak can be the taller one.
