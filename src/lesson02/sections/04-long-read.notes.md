# s04 "Assembling long reads" (slug 04-long-read): notes

Files: 04-long-read.html, 04-long-read.js (no extra CSS). Tested with preview.js at 1100 and 420 px: no page errors, no horizontal page overflow. The SVGs scroll inside .svgbox on phones (min-width 560 / 520 px).
Copy buttons rely on the page-level `.code button` handler from lesson 1; this section does not bind them itself.

## Sources (cloned or fetched 2026-10-31 into lesson2/src/s04_*)
| tool | version / commit | source | what I took from it |
|---|---|---|---|
| hifiasm | 0.25.0-r726 (latest release, 2025-03-18), commit ec9a8b2 | github.com/chhylp123/hifiasm README.md; docs/source/{parameter-reference,interpreting-output,faq}.rst; CommandLines.cpp (Print_H, defaults, `--ont` handling L989-990, L1043-1045); Overlaps.cpp L10921 (name format `%s%.6d%c`, "lc"[circ]); htab.cpp L549-764 (sc_cut = mean-quality filter); release notes via `gh api repos/chhylp123/hifiasm/releases` | commands; `--ont` is "ONT simplex assembly (beta)" in -h; requires FASTQ; `--rl-cut` 1000 and `--sc-cut` 10 are ONT-only defaults; `-f` Bloom filter takes 2^(f-3) bytes, 37 = human, 38/39 for much larger genomes, -f0 for small genomes; `-l` 0/1/2/3, default 3 (0 for trio); `--primary` or `-l0` gives p_ctg + a_ctg; output file list; `--telo-m` "CCCTAA for human"; `--hg-size`, `--hom-cov` and the log line; `-r 3`; `*.bin` reuse and `-i`; FAQ ">=13x HiFi per haplotype"; FAQ awk GFA->FASTA; README resource table (mouse 2.6 Gb 25x: 4.8 h, 76 GB, v0.12; human 6.9-8.2 h, 114-137 GB); README limitation "purging may introduce misassemblies"; 0.21.0 introduced `--ont` (beta); 0.25.0 note: rerun ONT assemblies from scratch rather than reusing old bins |
| hifiasm ONT paper | Cheng, Qu et al., Nature 2026, doi 10.1038/s41586-026-10105-6 | nanoporetech.com resource page + web search summary | ligation-kit reads, no UL needed, uses phasing + base qualities. The page does NOT name a Q threshold, so I did not write "designed for Q20+" as a hifiasm fact. |
| Flye | 2.9.6 (NEWS 2 May 2025), commit 886b8c1 | github.com/fenderglass/Flye docs/USAGE.md, docs/FAQ.md, docs/NEWS.md | read-type modes and error rates (`--nano-hq` "Guppy5+ SUP or Q20 (<5%)", R10 <3% is the default since 2.9.6; `--nano-raw` 10-15%, <20%); genome size optional since 2.8, needed with `--asm-coverage`; min overlap auto from reads N90 (3-10k, down to 1k); coverage >10x, N90 >1 kb (5 kb+ recommended), reads <1 kb not used; "below 10x not recommended"; collapsed haploid assembly, alt contigs, `--no-alt-contigs`, `--keep-haplotypes`; no scaffolding by default since 2.9; output files and assembly_info columns; repeat graph and disjointigs algorithm; RAM ~450 GB ONT / ~140 GB HiFi for human; NA12878 ONT 35x 3100 CPU h, 394 GB; `--resume` |
| Verkko | commit da4cce1 (2026-10-27); latest tag seen v2.3.2 | github.com/marbl/verkko README.md | accurate reads = HiFi, ONT duplex, HERRO- or hifiasm-corrected simplex (`--hifi`); UL reads via `--nano`; MBG + GraphAligner; trio / Hi-C / Pore-C phasing; "vertebrates (CCCTAA)" telomere motif; outputs |
| Dorado correct / HERRO | Dorado docs page (no version shown, (c) 2020-2025); HERRO README | software-docs.nanoporetech.com/dorado/latest/secondary/correct/ ; raw.githubusercontent.com/nanoporetech/dorado/master/README.md ; github.com/lbcb-sci/herro README | herro-v1 model for r10.4; average read length >=10 kb; >=30x preferred; >64 cores, >256 GB RAM, GPU >32 GB VRAM recommended; FASTA output; bgzip, not gzip; `--to-paf` / `--from-paf` split; HERRO = R10.4.1 Kit 14, >=10 kb recommended |
| NextDenovo | 2.5.2 (VERSION file), commit 0e5fa5d | github.com/Nextomics/NextDenovo README.md, doc/QSTART.rst, doc/OPTION.rst, doc/run.cfg | correct-then-assemble, string graph; read_type clr/ont/hifi, genome_size; output 01_rundir/03.ctg_graph/nd.asm.fasta; limitation: optimised for seed_cutoff >= 10 kb |
| Shasta | 0.14.0 (QuickStart) | github.com/paoloshasta/shasta docs/QuickStart.html, Configurations.html, ComputationalMethods.html, Running.html, conf/ | run-length encoding + marker k-mers; `--config` mandatory; R10.4.1 Raw/Herro configs (Jan2025); no compressed input; "most 30-mers contain errors" at 3 % error |
| Raven | commit 2c3d337 (2023-11-15) | github.com/lbcb-sci/raven README.md | uncorrected long reads, racon polishing (-p 2) |
| wtdbg2 | commit b77c565 (2020-12-11) | github.com/ruanjue/wtdbg2 README.md | fuzzy Bruijn graph, 1024-bp segments; human ONT 36x 31 h, 221.8 GB; ONT assemblies may be smaller than the true genome |
| Canu | commit f96a4a2; latest tag v2.3 | github.com/marbl/canu README.md | END OF LIFE notice; use Flye, hifiasm or Verkko |
| gfatools | 0.5-r296, commit 39c54d5 | github.com/lh3/gfatools README.md, main.c | `gfatools gfa2fa [-l INT]` |

General background (not from tool docs, standard textbook material): OLC, string graph with transitive reduction (Myers 2005, Bioinformatics 21 Suppl 2:ii79), minimizers (Roberts et al. 2004; minimap2). The Q-value formula is the Phred definition. The HiFi "about 15 kb" figure comes from lesson 1's own tooltip, not a PacBio spec sheet.

## Project facts used (all from the internal project-facts sheet)
Species A-D are unpublished (owner request 2026-11-01): the page uses codes and only rounded or relative values; exact numbers are in the internal facts sheet only.
- Species A: hifiasm 0.25.0 `--ont --telo-m CCCTAA -f38` (-t 64); long reads only, roughly 40x, read N50 above 10 kb, about a fifth of reads >Q20; moderate heterozygosity; glob bug (bp.hap1 sorts before bp.p_ctg; the numbers first sent were hap1; h1tg headers); table given as relative values (primary vs Flye+Medaka vs hap1 vs a published relative); hap1 losses = Missing; probably CycloneSEQ (UNVERIFIED, worded as "probably"); mt contig = several tandem copies of the mitogenome.
- Species B/C: CycloneSEQ; Flye 2.9.5 `--nano-raw --genome-size 2g`, 16 threads, about a day for B; read N50 under 3 kb / about twice that; coverage roughly 25x / about 10x; contig N50 a few hundred kb / less than half; BUSCO C above 90 % / about 10 points lower; final assemblies about a fifth larger than 2g. The unsourced early coverage values are mentioned only as an error that was corrected.
- Interactive presets: rounded toy values, medians 1.5 / 2.0 / 5 kb, coverage 25 / 10 / 35, labelled "B-like", "C-like", "A-like". The log-normal sigma 0.89 makes simulated N50 ≈ 2.2 x median, close to our read sets.

## Judgements stated as such on the page (not tool facts)
- "Which assembler for which reads" table: labelled "our reading of each tool's documentation, not a benchmark".
- Species B/C: "reads with ≈2-3 % errors belong in `--nano-hq`" follows from Flye's own table (about Q16-17 ≈ 2-2.5 %); the page says we did not test whether it changes the result.
- Haplotype toy: one read pair, normal approximation to binomial counts; the page says real assemblers use many reads.

## Could not verify / left out
- "hifiasm --ont is designed for Q20+ reads" (the facts sheet teaching point 10, from the lab log): neither the hifiasm docs nor the ONT summary of the Nature paper names a Q threshold. The page says "ONT simplex R10 reads" (docs wording) and gives the real filters (`--sc-cut 10`, `--rl-cut 1000`).
- Duplex accuracy number, HiFi length range, CycloneSEQ manufacturer and accuracy specs: left out.
- Verkko version: the newest tag I saw is v2.3.2; not checked against the releases page (GitHub API rate limit). The version is not stated on the page.
- Raven and wtdbg2 "status": only the last-commit dates are stated, not "abandoned".
- Species A platform: kept as "probably CycloneSEQ".

## Cross-links used
#s02 (threads, RAM), #s03 (k − 1 rule, Bloom filter), #s05 (Hi-C), #s06 (polishing, purge_dups, ONT models on CycloneSEQ), #s07 (primary / alternate / hap1 / hap2), #s08, #s10 (BUSCO), #s11 (mtDNA multimer), ../01-pre-assembly/#qc (ultra-long definition).
Suggest that s07 reuses the header check (`ptg` / `h1tg` / `h2tg`, l/c suffix) and does not repeat the whole glob story; s06 should own Medaka/NextPolish details.
