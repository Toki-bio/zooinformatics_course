# s01 The search problem - notes

## Sources
This section is conceptual. It makes no claim about a specific tool's defaults, speeds or algorithms, so no tool source was needed.
- sear2k (https://github.com/Toki-bio/sear2k, public): cited only as "accepts an exhaustive alignment (ssearch36) so as not to lose diverged copies". Supporting facts are verified in lesson 7 section 02 notes (README and `sear` script: ssearch36 on 2.5 kb windows).
- Lab tool "not yet public" (exact k-mer anchor matcher reading FASTQ directly): wording taken from the header comment of its source ("threaded exact k-mer anchor matcher reading paired FASTQ directly"). Name, repository and numbers are left to section 05.
- Cross-links checked to exist: lesson 1 `#km`; lesson 2 `#s09`; lesson 4 `#s02` (input, mapped reads, MAPQ filtering); lesson 6 `#s03` (pileup, mapping quality); lesson 7 `#s02`.

## Toy model (calculator), verified by running it in headless Chrome
T = data / speed; scan total = Q*T; index total = B*T + Q*l*T; break-even Q* = B/(1-l).
Presets checked against hand arithmetic: "reads vs genome" 3.16 GB at 100 MB/s -> T = 31.6 s, 10^7 queries: scan 10.0 years, index 1.05 h (hand: 10.03 y, 1.054 h); "100 queries, big data" 100 GB at 100 MB/s -> T = 16.7 min, scan 1.16 days, index 5.56 h (hand: 27.8 h, 5.556 h); break-even 21 queries (20/(1-1e-5)=20.0002, rounded up). Preset numbers are round illustrations, not measurements; the page says so.

## Open doubts
- Primer statement ("may still bind to a site that differs by a letter or two") is general knowledge, stated with "may"; no primer-design source opened.
- "an index can be larger than the sequence itself": true for suffix-array style and k-mer hash indexes in general; section 08 must give the verified sizes (e.g. bwa index file sizes).
