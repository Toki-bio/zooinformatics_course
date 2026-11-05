# Lesson 7, s07 Seed and extend: FASTA and BLAST (notes)

## Sources and the supporting text

**BLAST+ source**, https://github.com/ncbi/ncbi-cxx-toolkit-public, master at d0d7af116084, fetched 2026-11-05.
Version constants in `src/algo/blast/core/blast_engine.c`: kBlastMajorVersion = 2, kBlastMinorVersion = 17, kBlastPatchVersion = 0.
- Default task: `blastinput/blastn_args.cpp`: `static const char kDefaultTask[] = "megablast";`. Also the NCBI docs README (https://github.com/ncbi/blast_plus_docs): "running the `blastn` binary without specifying its `-task` parameter invokes the MegaBLAST algorithm."
- Word sizes: `core/blast_options.h`: `BLAST_WORDSIZE_NUCL 11`, `BLAST_WORDSIZE_MEGABLAST 28`. `api/disc_nucl_options.cpp`: `SetTemplateType(0); SetTemplateLength(18); SetWordSize(BLAST_WORDSIZE_NUCL);`.
- blastn-short: `api/blast_options_handle.cpp`: `SetMatchReward(1); SetMismatchPenalty(-3); SetEvalueThreshold(1000); SetWordSize(7); ClearFilterOptions();`.
- Scoring: `api/blast_nucl_options.cpp`: blastn `SetMatchReward(2); SetMismatchPenalty(-3);`, megablast `SetMatchReward(1); SetMismatchPenalty(-2);`. `blast_options.h`: `BLAST_GAP_OPEN_NUCL 5`, `BLAST_GAP_EXTN_NUCL 2`, `BLAST_GAP_OPEN_MEGABLAST 0`, `BLAST_GAP_EXTN_MEGABLAST 0`. dc-megablast uses the blastn scoring (`CBlastNucleotideOptionsHandle::SetScoringOptionsDefaults()`).
- Two-hit: `blast_options.h`: `BLAST_WINDOW_SIZE_NUCL 0`, `BLAST_WINDOW_SIZE_MEGABLAST 0`, `BLAST_WINDOW_SIZE_DISC 40`. `core/na_ungapped.c`: `Boolean two_hits = (window_size > 0);`.
- X-drop and trigger: `blast_options.h`: `BLAST_UNGAPPED_X_DROPOFF_NUCL 20`, `BLAST_GAP_X_DROPOFF_NUCL 30`, `BLAST_GAP_X_DROPOFF_GREEDY 25`, `BLAST_GAP_X_DROPOFF_FINAL_NUCL 100`, `BLAST_GAP_TRIGGER_NUCL 27.0`. Raw conversion, `core/blast_parameters.c`: `ceil(word_options->x_dropoff * NCBIMATH_LN2 / kbp->Lambda)`.
- Karlin-Altschul values in the toy (ungapped row { 0, 0, ... }), `core/blast_stat.c`: 1/-3: 1.374, 0.711; 1/-2: 1.28, 0.46; 2/-3: 0.55, 0.21.
- Greedy for megablast: `SetGapExtnAlgorithm(eGreedyScoreOnly);` in `SetMBGappedExtensionDefaults`.
- DUST and masking at the word stage: `SetDustFiltering(true); SetMaskAtHash(true);`.
- Templates: comment in `core/blast_nalookup.h`: `111,010,010,110,010,111 - 11 of 18` (optimal), `10,110,110,010,110,110,1 - 11 of 18` (coding). Other lengths 16 and 21 are listed there.
- `-max_target_seqs`: `blastinput/cmdline_flags.cpp`: `kDfltArgMaxTargetSequences = 100`.
- Word-frequency removal: `blastinput/blast_args.cpp`: `kArgLimitLookup` is added only in `CMappingArgs::SetArgumentDescriptions`, "Remove word seeds with ..."; `blastn_args.cpp` has no such option. That the option belongs to magicblast: from the reference digest of this code and the class name; magicblast's own arguments file was not opened.

**NCBI option tables**, BLAST+ manual as Tables S1, S2 of Camacho et al. 2009, additional file 1 (BLAST+ 2.2.23 era), https://doi.org/10.1186/1471-2105-10-421.
Quotes: "megablast", for very similar sequences (e.g, sequencing errors); "dc-megablast", typically used for inter-species comparisons; "blastn", the traditional program used for inter-species comparisons; "blastn-short", optimized for sequences less than 30 nucleotides. window_size: "Multiple hits window size, use 0 to specify 1-hit algorithm". Word sizes 28, 11, 11, 7 agree with the current source.
NCBI BLAST guide (https://ftp.ncbi.nlm.nih.gov/pub/factsheets/HowTo_BLASTGuide.pdf): "Short queries" optimises "for queries 30 bases/residues or shorter"; megablast gap cost "linear".

**FASTA**, https://github.com/wrpearson/fasta36 commit 6d6718a, version string 36.3.8j1.
- Guide `doc/fasta_guide.tex`: "For DNA comparisons, ktup=6 by default; ktup=3 or ktup=4 provides higher sensitivity."; "The init1 score is the highest scoring alignment without gaps; initn is a score that combines consistent (non-overlapping) runs without gaps, and opt is the score of a banded Smith-Waterman"; "the opt score is the most reliable and sensitive score for inferring homology; the others can be ignored."
- `src/dropnfa.c`: `#define MAXSAV 10` (best diagonal regions). `src/initfa.c`: `ppst->gdelval = -12; ... ppst->ggapval = -4;`, DNA matrix `+5/-4`, table row `fasta dna ... +5/-4 -12 -4 - 2.0 6`.

**Papers**
- Altschul et al. 1990, https://doi.org/10.1016/S0022-2836(05)80360-2. Full text read (a scanned copy): "For DNA, we use a simpler word list, i.e. the list of all contiguous w-mers in the query sequence, often with w = 12." (OCR errors corrected.)
- Altschul et al. 1997, https://doi.org/10.1093/nar/25.17.3389. Full text read through the journal page: "invoke an extension only when two non-overlapping hits are found within distance A of one another on the same diagonal"; "until the running alignment's score has dropped more than X below the maximum score yet attained". The abstract ties these refinements to protein comparisons.
- Zhang et al. 2000, https://doi.org/10.1089/10665270050081478. ABSTRACT ONLY: "For aligning DNA sequences that differ only by sequencing errors ... while executing over 10 times faster on appropriate data."
- Lipman and Pearson 1985, https://doi.org/10.1126/science.2983426. ABSTRACT ONLY.
- Pearson and Lipman 1988, https://doi.org/10.1073/pnas.85.8.2444. ABSTRACT ONLY; the FASTA steps on the page come from the guide and source above.
- Ma, Tromp and Li 2002, https://doi.org/10.1093/bioinformatics/18.3.440. ABSTRACT ONLY (full text is behind a subscription). Pattern and numbers from the inventors' patent US9652586 (https://patents.google.com/patent/US9652586): "the optimal binary mask string is 111010010100110111"; "has a 0.30 probability of having at least one hit"; "a non-consecutive model of the same weight ... has a 0.466 probability of getting a hit"; "the expected number of hits in that region by the Blast consecutive model is 1.07, while the non-consecutive model expects 0.93 hits".

## Our own arithmetic (labelled as such on the page, or a direct calculation)
- Break-even identity = penalty / (reward + penalty).
- Shared positions of the PatternHunter pattern with itself: 5 of 11 at shifts 1, 2 and 3.
- The clumping explanation of spaced seeds is the usual reasoning; the patent speaks only of dependent models.
- Toy threshold: E = K m n exp(-lambda S), with n = 10^9, no length adjustment, ungapped lambda and K. Real BLAST uses gapped values for gapped searches.
- The bias towards young and long copies follows from the formulas; not measured.

## Control results (run in Node and in headless Chrome, 2026-11-05)
- Seed counts, lookup table against brute force: 3000 random pairs (L 30 to 400, divergence 0 to 45 %, contiguous words 4 to 28 and the spaced seed), 135,404 seeds, 0 disagreements. Same check in the page: 64 slider settings, 0 disagreements.
- Probability formulas against enumeration of all column strings (n up to 20): largest difference 4.5e-13.
- L = 64, 70 % identity: contiguous 0.300196, PatternHunter 0.467122. Patent: 0.30 and 0.466. Expected hits 1.068 and 0.929.
- For comparison, the same case with NCBI's 11-of-18 templates: optimal 0.4625, coding 0.4231.
- Simulation against formula, 5000 pairs: 250 bp, 20 %, W 28: 0.092 (0.085); W 11: 0.996 (0.995); 250 bp, 30 %, W 11: 0.788 (0.787); 60 bp, 20 %, W 11: 0.685 (0.687).

## Open doubts
- The current NCBI Bookshelf manual could not be opened (a bot check blocks automated reading). Defaults are from current source plus the 2.2.23 tables. The length that blastn-short is "optimized for" differs between documents: the BLAST+ source (`api/blast_options_handle.cpp`, task description) says "sequences shorter than 50 bases", the 2009 option tables and the BLAST guide say 30. The page now quotes the source and mentions the older figure (final review, 2026-11-05), so that sections 07 and 11 agree.
- The page's commands were not executed: blastn and fasta36 are not installed on the machine used.
- The gap trigger is given as "about 27 bits": a source comment says the ungapped statistics block "may not be set for gapped blastn", so no raw value is quoted.
