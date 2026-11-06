# Basics 08-search: notes

1. Reading everything is too slow: lesson 08 section 01 (scan vs index, build cost). Measured: 20,000-base random target, 24-base queries, 12-mer index; places examined 1 query ~19,977 vs 19,991; 1,000 queries ~19.98 M vs ~22 k; identical matches.
2. Short words vs long words: sections 04 and 07 (k-mers, diagonals). Measured: 1,200-base target, 60-base exact query; k=3 gives ~1,047 chance dots, k=14 none.
3. Alignment score tolerates differences: section 06 (+5/-4, gap 12+4k, Smith-Waterman, random-pair max). Measured: 0-40 % changed copies of 60 bases all above best of 200 random pairs (~51).
4. Seeds miss diverged copies: section 07 (seed, 28/11/7 words, substitution-only model). Measured: at 30 % divergence word 28 finds ~1 %, 11 ~77 %, 7 100 % (seed 1); a missed copy still scores far above chance.
5. Extension: section 07 (X-drop). X=20 and +5/-4 are toy choices, not from the lesson. Measured: k=7 gives ~149 chance seeds, best extended 71 vs 438 at true place.
6. Bigger target: section 06 (E-value doubles with search space). Measured: median chance score 44, 57, 66 for 1k, 10k, 100k bases; 40 % changed copy (59) falls below at 100k.
Messages are computed per run; they were checked at several seeds only for the default seed.

Trimmed text, details now only here. Score +5 equal, -4 different, gap 12+4k, full Smith-Waterman. Extension: X-drop 20 below best. Dot plot: 1,200-base target, query an exact 60-base copy. Scores: 60-base query, best of 200 random. Seeds: 250-base query, 300 copies per divergence, substitutions only. Extension: 120-base copy, 15 % changed, 20,000-base target. Bigger target: 40-base query, median of 5 targets.
