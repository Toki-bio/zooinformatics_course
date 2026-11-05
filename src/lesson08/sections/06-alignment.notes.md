# s06 Alignment as scoring: notes

Written 2026-11-05. Every source below was opened. "Abstract only" or "reference only" says when it was not read in full.

## Sources, with the supporting lines

1. **Smith TF, Waterman MS (1981)** J Mol Biol 147:195-197, doi 10.1016/0022-2836(81)90087-5. Full text read (reprint on Waterman's USC
   publication page). Figure 1 read from a 300-dpi crop.
   - "to find a pair of segments, one from each of two long sequences, such that there is no other pair of segments with greater similarity"
   - Equation (1): H_ij = max{H_(i-1,j-1) + s(a_i,b_j), max_k {H_(i-k,j) - W_k}, max_l {H_(i,j-l) - W_l}, 0}.
   - "A match, a_i = b_j, produced an s(a_i b_j) value of unity while a mismatch produced a minus one-third. These values have an average for
     long, random sequences over an equally probable four letter set of zero." "The value used here was W_k = 1.0 + 1/3*k."
   - Traceback from the maximum "ending with an element of H equal to zero". Maximal element 3.30. Alignment G-C-C-A-U-U-G over G-C-C-(gap)-U-C-G.
   - "the heuristic homology algorithm of Needleman & Wunsch (1970) which first introduced an iterative matrix method of calculation".
2. **Needleman SB, Wunsch CD (1970)** J Mol Biol 48:443-453, doi 10.1016/0022-2836(70)90057-4. Full text read (scan, OCR text).
   - "The maximum match can be defined as the largest number of amino acids of one protein that can be matched with those of another protein
     while allowing for all possible deletions."
   - "A penalty factor, a number subtracted for every gap made, may be assessed as a barrier to allowing the gap."
3. **Pearson WR (2013)** An introduction to sequence similarity ("homology") searching. Curr Protoc Bioinformatics, doi 10.1002/0471250953.bi0301s42,
   PMC3820096. Full text read (PubMed Central, retrieved through PubMed; XML checked for the exponents lost in plain text).
   - "protein:protein alignments with expectation values < 0.001 can reliably be used to infer homology, DNA:DNA expecation values < 10^-6 often
     occur by chance, and 10^-10 is a more widely accepted threshold for homology based on DNA:DNA searches" (the misspelling is in the original).
   - "Increasing the score by 10 bits increases the significance 2^10=1000-fold".
   - "an alignment score found by searching 10,000,000 entry database will be 100-fold less significant than exactly the same score found in a
     search of a 100,000 entry database".
   - "DNA:DNA alignments have between 5-10-fold shorter evolutionary look-back time"; "rarely detect homology after more than 200-400 million years".
   - "Rigorous pairwise alignment algorithms require time proportional to the product of two sequences".
   - Significant similarity implies homology; "if no statistically significant match is found in a database, we cannot be certain that no homologs are present".
4. **Pearson WR (2013)** Selecting the right similarity-scoring matrix. Curr Protoc Bioinformatics, doi 10.1002/0471250953.bi0305s43, PMC3848038.
   Full text read (retrieved through PubMed).
   - "the BLOSUM62 score for aligning aspartic acid ('D') with itself is +6 and BLOSUM62 is scaled in 1/2-bit units"; D:L "-4".
   - "If the average or expected matrix score is positive, the alignment will extend to the ends of the sequences, and be global, rather than local."
   - "we do not have an analytical model for gap penalties and evolutionary distances".
   - "+2 for a match and -3 for a mismatch, which targets sequences at PAM10, or 90% identity"; "+1/-3 that target sequences that are 99% identical";
     "the FASTA program uses +5/-4 ... which corresponds to about PAM 40, or 70% identity".
   - Overextension: "homologous over-extension".
   - Pearson calls +1/-3 the megablast setting of the NCBI web site. The page does not repeat this, because section 07 owns megablast's current defaults.
5. **Altschul SF, The Statistics of Sequence Similarity Scores** (tutorial), https://www.ncbi.nlm.nih.gov/BLAST/tutorial/Altschul-1.html. Read in full.
   - Local statistics, extreme value distribution, "Doubling the length of either sequence should double the number of HSPs attaining a given score";
     "for an HSP to attain the score 2x it must attain the score x twice in a row"; K and lambda as "natural scales".
   - "citing a distance without specifying feet, meters, or light years". P = 1 - e^-E; three expected hits give P = 0.95.
   - Gapped: "strongly suggest that the same theory applies"; parameters "must be estimated". BLAST relies on "a pre-estimation of the parameters lambda and K".
   - Expected score must be negative. Coding DNA: "almost always better to compare the protein translations".
   - Gaps: "selected over the years by trial and error"; affine scores "have generally proved among the most effective".
   - Low complexity: described for proteins. The page marks the DNA extension as our expectation.
   - The formulas are images on that page. The bit score form (lambda S - ln K)/ln 2 was confirmed in BLAST source (`blast_hits.c`, through a lab source digest);
     E = D m n 2^-b is in the FASTA guide footnote.
6. **Karlin S, Altschul SF (1990)** PNAS 87:2264-2268, doi 10.1073/pnas.87.6.2264. **Abstract only**; the full text could not be opened. The tutorial (source 5,
   its references 10 and 11) is what the page's wording relies on.
7. **Maizel JV, Lenk RP (1981)** PNAS 78:7665-7669, doi 10.1073/pnas.78.12.7665. **Abstract only**: "regions of self-complementarity, direct repeats, and palindromic
   subsequences"; "domains of similarity, regions of divergence, and features explainable by transpositions".
8. **EMBOSS dotmatcher**, release 6.6 manual, https://emboss.sourceforge.net/apps/release/6.6/emboss/apps/dotmatcher.html.
   "The dotplot is an intuitive graphical representation of the regions of similarity between two sequences."; `-windowsize` default 10, `-threshold` default 23.
9. **FASTA36**, https://github.com/wrpearson/fasta36, commit `6d6718a` (2026-09-15), version string `36.3.8j1 Aug, 2026`.
   - `doc/fasta36.1`: "ssearch36 - compare a protein or DNA sequence to a sequence database using the Smith-Waterman algorithm."; ggsearch36 "using a global alignment
     (Needleman-Wunsch)"; "can speed-up Smith-Waterman calculations 10 - 20-fold"; `-f` "penalty for opening a gap"; `-g` "penalty for additional residues in a gap".
   - `doc/fasta_guide.tex`: "`ssearch36` uses SSE2 acceleration, and is only 2 - 5X slower than `fasta36`"; "The statistical routines assume that the library contains a
     large sample of unrelated sequences"; `-z 11-15` for related sequences; footnote E(D) = D m n 2^-b.
   - `src/initfa.c`: DNA defaults gdelval -12, ggapval -4, matrix "+5/-4".
   - `src/smith_waterman_sse2.c`: H, E and F kept per cell (`H = _mm_max_epi16 (H, E); H = _mm_max_epi16 (H, F);`, E and F updated by gap open and gap extend).
10. **Gotoh O (1982)** J Mol Biol 162:705-708. **Reference only**: not opened, no abstract in PubMed. So the page does not name it. The page describes the method from the
    FASTA36 source and our own test. Altschul's tutorial lists it as reference 38 for affine gap scores.
11. Lesson 7 s02 of this course, for the sear2k command and `-z 11`. Lesson 3 s04, for low-complexity DNA.

## Our own calculations (marked as ours on the page)

- Lambda for equal base frequencies, no gaps: solve 1/4 e^(s L) + 3/4 e^(-x L) = 1. Target identity = 1/4 e^(s L).
  +5/-4: L = 0.1915, 65.1 %. +2/-3: L = 0.6337, 88.8 %. +1/-3: L = 1.3741, 98.8 %. Pearson's values are about 70, 90 and 99 %. The first differs by 5 points; his figure
  is a PAM-based approximation, and the page shows both columns.
- +5/-4: a match is 1.382 bits, a mismatch -1.105 bits, 0.884 bits per position at 80 % identity.
- E table: m n = 300 x 6e9 = 1.8e12 = 2^40.7. E = 1 at 40.7 bits, 1e-6 at 60.6, 1e-10 at 73.9. Divided by 1.382 and 0.884 per position. Ignores K, gaps and edge effects.
  ssearch36 fits its own statistics, so this is only a guide.

## Controls for the table (rule 3)

- **Figure 1 of Smith & Waterman 1981.** With match 3, mismatch -1, open 3, extend 1 (their values x 3), all 182 cells equal the printed values after rounding to one decimal,
  checked in Node and again on the numbers the browser displays. Maximum 10 (3.33, printed 3.30), at row 10, column 8. Alignment GCCAUUG / GCC-UCG, as printed. The path passes the seven
  cells underlined in the figure (1.0, 2.0, 3.0, 1.7, 2.7, 2.3, 3.3).
- **Equation (1) written out literally,** trying every gap length, against the page's three-value method: 2,000 random pairs with random scores, 0 cells differ.
- **Biopython 1.85 PairwiseAligner,** independent code: the same 2,000 pairs, local and global scores, 0 differences.
- **Traceback:** in the same 2,000 pairs, every local and global alignment rescored from its own columns equals the matrix value.
- Final review 2026-11-05, gap convention re-checked in the same source: `initfa.c` sets `gdelval = -12`, `ggapval = -4` for DNA (the `-16` in the comment table at the top of the file is for the `OLD_FASTA_GAP` build and the SSEARCH entry of `pgm_def_arr` adds no modifier), `fasta_guide.tex` says "A single residue gap costs f + g", and `dropgsw2.c` passes `-(gdelval + ggapval)` = 16 as the open cost and 4 as the extension cost to the SSE2 routine. So a gap of k bases costs 12 + 4k, as the page says.
- ssearch36 itself was not run: no binary or compiler on the writing machine. +5/-4 and 12 + 4k in the second preset are its defaults, but the page does not claim its output.

## Open doubts

- Pearson's +1/-3 for web megablast may not match current BLAST+ defaults. Left out here.
- "Gapped" lambda and K for +5/-4 are not used on the page; the rough table uses the ungapped lambda.
- Ties: the table's traceback prefers the diagonal, then the gap from above, then the gap from the left, and starts from the first cell holding the maximum. Other equally good alignments may exist.
