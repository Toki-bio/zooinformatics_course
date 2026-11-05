# s03 How exact search works - notes

Written 2026-11-05. Quotes below are the exact sentences or code lines behind the page.

## Source code and manuals (opened and read)

1. **GNU grep**, https://git.savannah.gnu.org/git/grep.git, commit `e187ca5` (2026-09-06), after release 3.12 (the top NEWS entry is still "?.?").
   - `doc/grep.texi`, Performance chapter: "When feasible, the Boyer--Moore fast string searching algorithm is used to match a single fixed pattern, and the Aho--Corasick algorithm is used to match multiple fixed patterns." / "Although the algorithm used by grep is an implementation detail that can change from release to release" / "Setting LC_ALL='C' can be particularly efficient, as grep is tuned for that locale."
   - `src/grep.c`, in `main`: "In a single-byte locale, switch from -F to -G if it is a single pattern that matches words, where -G is typically faster. In a multibyte locale, switch if the patterns have an encoding error (where -F does not work) or if -i and the patterns will not work for -iF." / "With two or more patterns, if -F works then switch from either -E or -G, as -F is probably faster then."
   - `src/dfasearch.c`, `kwsmusts`: "filtering with this substring should help reduce the search space, but we'll still have to use the regexp matcher."
   - `NEWS`, release 2.26 (2016-10-02): "grep -F is now typically much faster when many patterns are given, as it now uses the Aho-Corasick algorithm instead of the Commentz-Walter algorithm in that case."
2. **gnulib `lib/kwset.c`** (module `kwset`, pulled in by grep's `bootstrap.conf`), mirror https://github.com/coreutils/gnulib, last commit on the file `a8482ce` (2026-01-01).
   - `kwsprep`: "Use Boyer-Moore if just one pattern, Aho-Corasick otherwise."
   - `bmexec_trans`: ten unrolled `d = d1[U(tp[-1])], tp += d;` steps, then "As a heuristic, prefer memchr to seeking by delta1 when the latter doesn't advance much." with `int advance_heuristic = 16 * sizeof (long);` (128 bytes where long is 8 bytes; our arithmetic). `bm_delta2_search` is called when delta1 gives 0, that is, on a last-byte match.
3. **Wu-Manber agrep**, https://github.com/Wikinaut/agrep, commit `6394ed8` (2025-01-28), version 3.41.5. README: "This project is unmaintained since many years."
   - `agrep.algorithms`: "Except for exact matching of simple patterns, for which we use a simple variation of the Boyer-Moore algorithm, all the algorithms (listed below) were designed by Sun Wu and Udi Manber." / "bitap: The most general algorithm inside agrep."
   - `sgrep.c`: `#define LONG_EXAC 20`, `#define LONG_APPX 24`; dispatch `if(D==0) { if(m > LONG_EXAC) monkey else bm } else { if(DNA) monkey4 else if(m >= LONG_APPX) a_monkey else agrep }`; "monkey uses two characters for delta_1 shifting"; `#define LOG_DNA 3`; "preprocessing for partitioning_bm".
   - `checksg.c`: `if (m >= 16) DNA = ON;` then `if(c == 'a' || c == 'c' || c == 't' || c == 'g' ) ; else DNA = OFF;`; early `return 0` for `LINENUM`, `JUMP`, `WORDBOUND && D>0`, `WHOLELINE && D>0`.
   - `agrep.h`: `#define WORD 32`, `#define MaxError 8`, `#define MAXREG 30`. `maskgen.c`: "pattern too long (has > %d chars)" with WORD. `agrep.c`: "the maximum number of errors is %d".
   - `asearch.c` lines 99-115: the recurrence in code, for example `A1 = ((B1 >>1 ) & CMask) | r2 | r1`.
   - The program was **not compiled or run**; the routing table is a reading of the source.
4. **TRE**, https://github.com/laurikari/tre, commit `71bfcaf` (2026-05-23). README: "Unlike other agrep implementations (like the one by Sun Wu and Udi Manber from University of Arizona) TRE agrep allows full regexps of any length, any number of errors, and non-uniform costs for insertion, deletion and substitution." `lib/tre-match-approx.c`: `tre_tnfa_run_approx`, a `reach` table with costs per state; no bit masks in that file. Not run.
5. **Debian**, https://packages.debian.org/stable/agrep ("Virtual Package: agrep", provided by glimpse) and https://packages.debian.org/stable/tre-agrep (0.9.0-1), read 2026-11-05.

## Papers

- **Boyer RS, Moore JS (1977)** A fast string searching algorithm. CACM 20(10):762-772. Full text read, copy on the author's page https://www.cs.utexas.edu/~moore/publications/fstrpos.pdf. "in the worst case, the number of comparisons is on the order of i * patlen" / "inspects each of the first i + patlen - 1 characters of string precisely once" (both about prior work) / "For a random English pattern of length 5, the algorithm will typically inspect i/4 characters of string before finding a match at i." / "usually sublinear". The AT-THAT example, delta1 and delta2 ("plausible reoccurrence").
- **Aho AV, Corasick MJ (1975)** Efficient string matching: an aid to bibliographic search. CACM 18(6):333-340. Full text read, copy at https://cr.yp.to/bib/1975/aho.pdf. "Construction of the pattern matching machine takes time proportional to the sum of the lengths of the keywords. The number of state transitions made by the pattern matching machine in processing the text string is independent of the number of keywords." / "Our approach combines the ideas in the Knuth-Morris-Pratt algorithm [13] with those of finite state machines." The keywords he, she, his, hers, the text "ushers" and the state numbering are the paper's.
- **Wu S, Manber U (1991)** Fast text searching with errors. TR 91-11, University of Arizona. Full text read, copy in the agrep repository, folder `docs/`. "a shift and an AND"; "the pattern's size is no more than the word size"; "it depends only on the size of the text (assuming again that the pattern fits into a word) and not on the actual text or the alphabet"; "(Baeza-Yates and Gonnet [BG89] used 0 to indicate a match and an OR operation instead of an AND"; "showed how to handle only mismatches ... but they did not handle insertions or deletions"; recurrence (2.1) and its four cases.
- **Wu S, Manber U (1992)** Agrep, a fast approximate pattern-matching tool. Read in the same `docs/` folder (searched for the relevant passages, not read end to end): "For simple patterns with errors, we use a partition scheme"; multi-pattern search "uses a hashing technique combined with a different Boyer-Moore technique".
- **NOT opened:** Knuth DE, Morris JH, Pratt VR (1977) SIAM J Comput 6:323-350, and Baeza-Yates R, Gonnet GH (1992) CACM 35(10):74-82. The publisher pages refused access, so not even the abstracts were read. Everything the page says about them comes from the descriptions by Boyer-Moore, Aho-Corasick and Wu-Manber quoted above. The ATATC example is ours.

## Controls (run in Chrome, 2026-11-05)

- Page button "Run the check", same functions as the figures, seeded: 3,000 random texts of up to 300 letters, alphabets of 2, 4 and 26 letters; 10,394 patterns; 76,454 occurrences. Disagreements with indexOf: naive 0, Boyer-Moore 0, Aho-Corasick 0 of 3,000 sets.
- The control can fail: deliberate bugs gave 1,680 (Boyer-Moore shift + 1), 207 (no overlapping hits) and 1,014 (Aho-Corasick loses hidden outputs) disagreements.
- Measured on random text of 100,000 letters (our numbers, not from a paper). DNA: naive about 133,500 comparisons; Boyer-Moore looked at 27, 35, 25 % of the letters for pattern lengths 8, 16, 32. 26 letters: naive about 104,000; 15, 9, 6 %. One random pattern per row, so the DNA figures do not fall steadily with length.
- Bitap worked example and recurrence (2.1): a separate Node script compared it with a plain edit-distance calculation (Sellers) on 20,000 random DNA pairs, k from 0 to 3: 563,632 end positions, 139,712 of them true, 0 disagreements.
- GNU grep 3.0 accepted both commands of the code box on a two-line test file.

## Open doubts

- The Boyer-Moore toy uses the 1977 tables computed from their definitions, with a shift by the pattern's period after a whole match, because the paper stops at the first occurrence. Real grep differs in detail.
- The `-n` row of the agrep table rests on `if (LINENUM) return 0;` in `checksg.c`, not on a run.
