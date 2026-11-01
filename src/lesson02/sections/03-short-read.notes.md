# s03 Assembling short reads: notes and sources

Local copies of fetched docs: `lesson2/src/s03/` (READMEs, release JSON, paper XML/text); ABySS 2.3.10 source clone:
`lesson2/src/abyss/`. All fetched 2026-10-31.

## Sources (URL, version, what was taken)

| Tool / topic | Source | Version | Used for |
|---|---|---|---|
| SPAdes | https://github.com/ablab/spades README; docs/running.md, datatypes.md, output.md, input.md (main branch); releases API | 4.3.0 (2026-06-14), VERSION file = 4.3.0 | modes list; `--isolate` text ("highly recommended for high-coverage isolate and multi-cell Illumina data"; not compatible with `--careful`/`--only-error-correction`); datatypes.md: "standard eukaryotic and bacterial isolated datasets with decent coverage (50x or higher), we strongly recommend to use `--isolate`"; default k by read length (100: 21,33,55; 150: 21,33,55,77; 250: 21..127); "strongly recommend not to change -k"; -k odd, <128; `-m` default 250 GB, terminates at limit; `--careful` "recommended only for assembly of small genomes. We strongly recommend not to use it for large and medium-size eukaryotic genomes"; outputs scaffolds.fasta (recommended), contigs.fasta, assembly_graph_with_scaffolds.gfa; NODE header cov = k-mer coverage at largest k; `--continue -o` only |
| SPAdes 3.15.5 manual | https://raw.githubusercontent.com/ablab/spades/spades_3.15.5/README.md | 3.15.5 | quote "SPAdes is not intended for larger genomes (e.g. mammalian size genomes). For such purposes you can use it at your own risk." (sentence absent from current docs; grep confirmed) |
| BayesHammer | Nikolenko et al. 2013 BMC Genomics 14(Suppl 1):S7, PMC3549815 (Europe PMC full text) | - | Hamming graph clustering, Bayesian subclustering with quality values, solid k-mers = filtered subcluster centres, read correction by majority vote of solid k-mers; designed for nonuniform (single-cell) coverage |
| ABySS | https://github.com/bcgsc/abyss README; releases API; source clone tag 2.3.10 | 2.3.10 (2024-10-18); last commit 2026-04-30 | Bloom filter mode recommended; `B` budget, 8/9 counting BF + 1/9 tracking BF; B guide values (P. glauca 500G, H. sapiens 50G, C. elegans 2G); FPR <=5 % under "Counting Bloom filter stats" with `v=-v`; parameters H [4], kc [2], t [k], s [1000], j; k guidance "2x150bp reads and 40x coverage ... 70 to 90; 2x250 ... 110 to 140"; kc 2-4; default max k 192 (compile-time); mp libs only for scaffolding ("do not contribute towards the consensus sequence"); TMPDIR; `abyss-pe env`; outputs `${name}-unitigs/contigs/scaffolds.fa`; abyss-fac |
| ABySS source | `LogKmerCount/CountingBloomFilter.h` FPR() = (1-(1-1/m)^(n*h))^h; `vendor/btl_bloomfilter/BloomFilter.hpp:343` getFPR() = (popcount/size)^h; `Bloom/HashAgnosticCascadingBloom.h:89` same; `BloomDBG/bloom-dbg.h:741` `const unsigned fpTrim = 5; /* longest branch of Bloom filter false positives */`; `BloomDBG/bloom-dbg.cc` -H default 4 | 2.3.10 | formula and "share of 1s ^ h" estimate; 5-k-mer false-branch length |
| ABySS 2 paper | Jackman et al. 2017 Genome Res 27:768, PMC5411771 | - | Eq. 1 FPR formula; solid reads/solid k-mers (threshold 2-4); look-ahead removes short branches from FP k-mers/recurrent errors; "Most false-positive k-mers result in a tip that is pruned"; tracking Bloom filter; Minia first BF assembler; human <35 GB RAM; DISCOVAR de novo 618 GB / 26 h, best contiguity; SOAPdenovo2 659 GB / 35 h |
| MEGAHIT | https://github.com/voutcn/megahit README; `src/megahit` driver at tag v1.2.9 | 1.2.9 (2019-10-15); last commit 2025-10-28 | README "optimized for metagenomes, but also works well on generic single genome assembly (small or mammalian size)"; default k list 21,29,39,59,79,99,119,141; odd k; keeps k < max read length + 20 (`set_max_k_by_lib`); `-m` bytes or fraction [0.9]; `--min-contig-len` [200]; refuses existing `-o` dir; output final.contigs.fa. Note: help text says k-step default [12] but code sets 10 (not used in page) |
| MaSuRCA | https://github.com/alekseyzimin/masurca README; releases API | v4.1.4 (2025-06-26) | hardware table (mammal up to 3 Gb: 512 GB RAM, 32+ cores, 5 TB; 15-20 days Illumina-only); "Do not do any trimming, cleaning or error correction"; simple mode `masurca -t 32 -i R1,R2 [-r long]`; config mode; super reads, linking mates; outputs CA/{primary,alternative}.scf.fasta (or CA.mr.../) |
| MaSuRCA paper | Zimin et al. 2013 Bioinformatics 29:2669 (academic.oup.com, via WebFetch summary) + Europe PMC abstract | - | super-reads: reads extended base by base while the extension is unique; pairs joined into one super-read when a unique path connects them, else "linking mates" |
| Platanus-allee | https://github.com/rkajitani/Platanus-allee README | v2.4.0 (README); last commit 2026-04-12 | description (haplotype assembler, consensus pseudohaploid output); assemble options -k 32, -K 0.5, -s 20, -t, -m; phase/consensus commands, -IP1, outputs out_allPhasedScaffold.fa, PREFIX_consensusScaffold.fa (synopsis says out_consensusScaffolds.fa: inconsistent in README; page uses the usage-section name) |
| Minia | https://github.com/GATB/minia README; releases | 3.2.6 (2021-05-26) | BF assembler, contigs only; README points to gatb-minia-pipeline for high-quality assemblies |
| SOAPdenovo2 | https://github.com/aquaskyline/SOAPdenovo2 README; releases | r242 (2020-10-23) | k "min 13, max 63/127" |
| w2rap-contigger | https://github.com/bioinfologics/w2rap-contigger README, LICENSE | no release; last commit 2022-11-25 | "can handle large (17Gbp) complex (hexaploid) genomes"; 7 steps, small k = 60 then large K (example K = 260); LICENSE "Copyright (c) 2014 Broad Institute" |
| DISCOVAR de novo | Broad page did not load (WordPress error); requirements from Love et al. 2016 (PMC4779211, via search summary) | - | one PCR-free library, 250-base pairs. Memory from ABySS 2 paper |
| KmerGenie | http://kmergenie.bx.psu.edu/ (site + README) | 1.7051 | picks k maximising predicted distinct genomic k-mers; for single-k assemblers; "There is no need to use Kmergenie for a multi-k assembler, like SPAdes"; input = file list; `-t`; outputs histograms_report.html, last stdout line = best k |
| Lighter | https://github.com/mourisl/Lighter README; Song et al. 2014 Genome Biol abstract | - | sampling into Bloom filters, no counting; `-k k genome_size alpha`; alpha = 7/C rule of thumb |
| Musket | Liu et al. 2013 Bioinformatics abstract (Europe PMC) | - | three-stage k-mer spectrum corrector |
| BFC | https://github.com/lh3/bfc README | - | blocked Bloom filter to drop singletons + hash table; spectrum alignment search; "specifically designed for high-coverage whole-genome human data"; `bfc -s 3g -t16 reads.fq.gz` |

## Project facts used (all from the internal project-facts sheet)
- species D (unpublished; page uses the code only): SPAdes command with generic file names, standard mode, BayesHammer failure "OS return value: 12" = ENOMEM, project report "apparently out of memory"; log suggests `--isolate`.
- *Galemys*: ABySS 2.1.5 k = 100; libraries 350/550 bp + 5/9 kb mate pairs; 62,376 N-runs, 17,284 exactly 50 N; 64 % touch Tal SINE, 8.1x random; middle of element; d4 16 % vs d5 0.2 % gapped; 268 - 2x99 = 70; fills 74-109; 237/238 identical closes; contig N50 64.5 kb.
- *Desmana*: SPAdes 4.0 k = 99 + MaSuRCA 4.1 + RagTag 2.1 onto Galemys; 65,059/66,963 N-runs exactly 100 N; 19,250 duplicated copies; raw SPAdes N50 24.2/21.4 kb; published 43.3 kb; k inferred from 99-bp overlaps at 75.5 % of ends; 50.3/48.0 % of ends in young SINE, median 98 bp; toy SPAdes 3.15.5 k = 77: 75-76 bp, 3 % divergence resolved.
- 26 long-read assemblies without N at young SINEs; Scalopus = DISCOVAR de novo.
- Monsoon benchmarks: mouse 32x ABySS 5.4 h N50 6.7 kb, MEGAHIT 8 h 13.9 kb; Darevskia requested memory ABySS 120G / MEGAHIT 240G / SPAdes 470G.
- species B contig N50 "a few hundred kb" (read N50 under 3 kb), species A hifiasm "above 10 Mb" (rounded; unpublished data).
- *Cricetulus* SPAdes (one-line mention only that SPAdes was run on it).

## Interactive elements (03-short-read.js)
1. `s03-dbg-*`: de Bruijn graph toy. Seeded random 94-base genome A(22)+R(12)+B(18)+R(12)+C(30). Builds the node=k-mer graph, compacts unitigs, draws unitigs on the genome and the unitig graph. k slider 3-20; modes: clean, + one 16-base read with an error 3 bases from its end (tip), + heterozygous SNP 6 bases into C (bubble). >16 unitigs = "tangle" message. Single strand only (stated in the caption).
2. `s03-k1-*`: k - 1 rule calculator (L, k sliders; presets Galemys 268/100, Desmana 250/99, SPAdes 300/77).
3. `s03-bl-*`: Bloom filter toy: 22 distinct 5-mers of a 26-base read, m 8-192 bits, h 1-6, 24 absent test 5-mers, query box; readout shows observed FP, formula, ABySS-style (share of 1s)^h.
Tested with preview.js at 1100 and 420 px: no page errors, no horizontal page scroll (SVGs scroll inside .svgbox).
Copy buttons in `.code` are not wired by this JS (lesson page script wires `.code button` globally).

## Not verified / judgement calls (kept out of the page or worded softly)
- DISCOVAR de novo current status and last version: Broad page unreachable; not stated.
- w2rap-contigger being derived from DISCOVAR: only the LICENSE (Broad 2014 copyright) was seen; page says "reworked from Broad Institute code".
- "What is used now" paragraph is a judgement based on lesson 1's VGP section and the tools' own docs; no usage statistics.
- Paired-end insert 300-600 and mate-pair 2-10 kb ranges are general knowledge (Galemys 350/550 bp and 5/9 kb are from facts).
- Error-correction toy counts (31, 29, ...) are invented illustration values, labelled as a toy.
- The Desmana preset L = 250 uses the "~250-bp copy" of the RagTag duplicate fact; the SPAdes preset L = 300 is arbitrary.
- Why ABySS writes exactly 50 N in Galemys was not traced in source; the page only states the observation.
- Sealer tooltip ("searches read k-mers for a path between gap ends") is from general knowledge of Sealer, not re-read.

## Suggested cross-links
- s02 (memory planning): species D ENOMEM, MaSuRCA hardware table, ABySS B values, SPAdes -m.
- s04 (long reads): "26 long-read assemblies no N at young SINEs"; contig N50 comparison.
- s05 (scaffolding): RagTag doubled copies; reference-guided order.
- s06 (gap closing): k - 1 rule gaps, Sealer, sineclose, placeholder N-runs.
- s07 (products): bubble popping -> pseudohaploid; Platanus-allee phased output; MaSuRCA primary/alternative.
- s08/s10: comparing k runs by N50 + BUSCO.
- Lesson 1: #gp (spectrum, trusted k-mers), #km, #vgp.
