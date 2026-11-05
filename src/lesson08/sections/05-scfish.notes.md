# s05 Worked example: scfish2 (notes)

## Sources
- `scfish2.c` (294 lines), `scfish.c`, `scindex.c`: lab source files, read in full. Lab tool, not yet public, so no link.
  Excerpts on the page are verbatim: usage line, rolling lines of `scan()`, `has()`, the OpenMP loop of paired mode, `open_in()`.
- Lab speed notes and the job scripts behind them, read in full. Timings: lab commit 7b293dc, message "whole library 164 s vs 324 s fan-out vs 462 s grep, identical pairs".
- ENA run record, https://www.ebi.ac.uk/ena/portal/api/filereport?accession=SRR13862646&result=read_run&fields=run_accession,study_accession,scientific_name,instrument_model,library_strategy,read_count,base_count,fastq_bytes,first_public
  Returned: PRJNA705855, Galemys pyrenaicus, HiSeq X Ten, WGS, read_count 84051642, base_count 25383595884 (= 151 per read), fastq_bytes 6662575520;7507545954 (= 14.17 GB), first public 2021-06-08. So the published data set may be named.
- pigz manual, https://github.com/madler/pigz/blob/master/pigz.1 (master, read 2026-11-05): "Decompression can't be parallelized, at least not without specially prepared deflate streams for that purpose." and "pigz uses a single thread (the main thread) for decompression, but will create three other threads for reading, writing, and check calculation".
- rapidgzip README, https://github.com/mxmlnkn/rapidgzip (master, read 2026-11-05): "can be used for parallel decompression"; "`rapidgzip` works with all files, especially those produced by the usually installed GNU gzip." Paper: Knespel and Brunst, HPDC '23, doi 10.1145/3588195.3592992. README and quoted abstract only; the paper itself was not opened.
- ISA-L README, https://github.com/intel/isa-l (master, read 2026-11-05): "igzip - A command line application like gzip, accelerated with ISA-L."

## Verified facts and where they come from
- k = 20: anchors picked with a 20-mer count; 4 per gap side in the test (`--per-side 4`). Anchor file lists both strands, so 6,624 lines = 3,312 anchors.
- Table: slots = next power of two >= 2n + 16, 8 bytes each. Filter: words = next power of two >= n/4 + 64. n counts file lines, including both strands. 792,638 lines give 2^21 slots = 16 MB and 2^18 words = 2 MB; speed notes: "16 MB table for 790 k anchors, beyond cache". Source comment: "a lookup touches one word that mostly stays in L2 cache".
- Batch 500,000 pairs (default `B`), `schedule(dynamic, 4096)`, default decompressor `rapidgzip -d -c -P 4`; the timed runs set `-P 8`.
- 22 billion = 84,051,642 x 2 x 132 = 22,189,633,488, ignoring early exit at a hit and N restarts.
- 57 GB: speed notes, "~57 GB of pair lines at ~176 MB/s". 57,000 / 324 = 176.
- Run order in the job script: rapidgzip (6,624 lines), igzip (6,624 lines), rapidgzip (792,638 lines). Notes label the first "first, cold read" and the last "warm page cache"; the igzip run has no label.
- 120 x = 792,638 / 6,624; 94 x = 1,223,178 / 13,029.
- Exclusive node runs vs shared-server runs of the filter: both tables in the speed notes.
- Whole-library comparison: job script compares scfish2 IDs with the scfish fan-out IDs (sorted); notes record scfish = grep at 13,029, identical IDs.
- Desman run: speed notes, "Real genome-wide run".

## Toy controls (run 2026-11-05)
Bloom toy: page hash is simulated. Node control with an exact BigInt port of `bmix`, `bbits`, the sizing rule and the rolling scan.
| lines | page toy, passed | real hash, random 20-mers (300,000) | analytic (Poisson load) |
|---|---|---|---|
| 6,624 | 0.107 % | 0.112 % | 0.111 % |
| 792,638 | 0.092 % | 0.098 % | 0.097 % |

Identity control: 300 anchor lines, 20,000 random 151-base reads with planted anchors and Ns: port of the scan against plain substring search, 988 hits, 0 disagreements, 0 real anchors stopped by the filter. No C compiler on the writing machine, so this tests a port, not the binary.
Page example: GATT 143/13, ATTC 61/131, GAAT 131/61 confirmed.
Pipeline toy: time-stepped simulation with bounded buffers against 57,000 / min(rate), 3 cases + 20 random settings: largest relative difference 0.00063. Page cases show 570, 324, 79 s. Sliders, case buttons, step buttons clicked in headless Chrome: read-outs as expected, no script errors.

## Open doubts
- The stages were never timed separately. "Getting the data in is the limit" is inference from whole runs; the page says so.
- The notes' "line-by-line FASTQ reader (330-725 MB/s)" equals whole-run speed (57 GB / 172 s, / 79 s), so it is not a reader measurement. The page says this too.
- Decompression was not the limit of scfish2 with rapidgzip in these runs: alone it runs at 1,189 MB/s per stream. It was the limit in the desman run with pigz. The page keeps those apart.
- The igzip run (172 s) is unexplained. igzip alone would need about 34 s per stream, and its cache state is not recorded.
- The grep fan-out took 462 s (123 MB/s) though 16 x 38.7 MB/s is 619 MB/s and the hand-out 176 MB/s. Not explained in the notes, so it is not a toy case.
- Toy k-mers are random. Real reads have low-complexity k-mers, so the real skip rate may differ.
- Toy cases: read, write, and many-thread scan speeds are toy values (labelled on the page). Decompress = 2 x one-stream rate is our assumption.
