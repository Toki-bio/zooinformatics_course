# s02 System requirements — notes, sources, verification

Written 2026-10-31. Local copies of every fetched document are in
local copies of the sources (not kept in the repository).

## Sources (URL, version, what was taken)

| Tool | Source | Version | Used for |
|---|---|---|---|
| hifiasm | https://github.com/chhylp123/hifiasm README (master, fetched 2026-10-31); man page `hifiasm.1` in local clone `src\s12_hifiasm` (HA_VERSION 0.25.0-r726, commit ec9a8b2) | README results table = v0.12 | RAM/CPU/wall table (mouse 76 GB, 172.9 CPU-h, 4.8 h; maize 68 GB 203.2 h; CHM13 114 GB 310.7 h 8.2 h; HG00733 135 GB 269.1 h 6.9 h; HG002 137 GB 305.4 h 7.7 h; frog 463 GB 2834.3 h 69 h; all -t48). `-f` Bloom filter = 2^(f-3) bytes (man), default 37 → 16 GiB; README: "-f0 ... bloom filter which takes 16GB"; "-f38 or even -f39" for genomes much larger than human. `*.bin` reuse, `-i` to ignore. `--ont` since 0.21.0, ONT simplex R10, FASTQ input. |
| Flye | https://github.com/mikolmogorov/Flye docs/USAGE.md, docs/FAQ.md, README | 2.9.6 (README "Version: 2.9.6", 2 May 2025) | Benchmark table (CPU time, RAM); FAQ "~450Gb of RAM for ONT and ~140Gb for HiFi", "grows linearly with genome size and reads coverage", "Mammalian assemblies with 40x coverage need ~450Gb of RAM (for ONT) and typically finishes within 3-4 days using 30 threads"; `--asm-coverage` (40x typically enough), `--resume`, `--resume-from` stages; algorithm: solid k-mers. |
| Verkko | https://github.com/marbl/verkko README + src/verkko.sh | tag v2.3.2 | Snakemake, `--grid`, `--<stage>-run CPUS MEM HOURS`, `--snakeopts "--dry-run"`, defaults in script (ovs_mem_gb=128 largest fixed; mbg_mem_gb=0, cns_mem_gb=0 — meaning of 0 not verified, page says "some stages have no fixed value"). |
| NextDenovo | https://nextdenovo.readthedocs.io/en/latest/FAQ.html, README | tag v2.5.2 | 32–64 GB per parallel_jobs subtask; ~TOTAL_INPUT_BASES/4 bytes per pa_correction subtask (config uses ×1.2/4); rerun same command; bottlenecks minimap2 + IO; usetempdir. README: HiFi struck out. |
| Shasta | https://paoloshasta.github.io/shasta/Running.html | 0.14.0 (latest release 2025-01-29) | 4–6 bytes per input base; ~1 TB human 60x; AWS x1.32xlarge "1952 TB [sic, GiB] of memory and 128 virtual processors (64 cores)"; human 60x in about 4 h; `--memoryMode filesystem --memoryBacking disk`; results unchanged. |
| Canu | https://github.com/marbl/canu documentation/source/faq.rst | tag v2.3 | 10,000–25,000 CPU-h mammal raw; 1,000–2,000 HiFi; ≥64 GB node, 16 GB per grid node; 3 TB disk (200 GB HiFi); 1–2 TB peak human 40–50x; rerun exact same command. |
| SPAdes | https://github.com/ablab/spades docs/running.md, docs/datatypes.md | 4.3.0 (2026-06-14) | `-m` default 250 GB hard limit; `-t` default 16; `--tmp-dir`; `--continue`, `--restart-from`, `--checkpoints` (disk); `--isolate` recommended for eukaryotic isolates ≥50x; `--careful` not for large genomes. |
| ABySS 2 | https://github.com/bcgsc/abyss README | 2.3.10 | Bloom filter mode, B=500G spruce / 50G human / 2G C. elegans; FPR ≤5 % with v=-v; `j` default 2; abyss-pe is a Makefile, `-C`, `-n`. |
| MEGAHIT | README; src/megahit (option parser); wiki MEGAHIT-Memory-setting.md | 1.2.9 | `-m` default 0.9 (fraction of total memory); halts if not enough; `-t` default = number of logical processors; `--continue`; `--tmp-dir`. |
| MaSuRCA | https://github.com/alekseyzimin/masurca README | 4.1.4 | Hardware classes (RAM, cores, disk) and run times; long reads +50–100 %; restart procedure. |
| Medaka | https://github.com/nanoporetech/medaka README | 2.2.2 | GPU optional, `-b 100` for 11 GB GPUs; `-t`; three separable steps; `--regions`. |
| dorado | README (master); https://software-docs.nanoporetech.com/dorado/1.4.0/assembly/correct/ and /polish/ | dorado 2.1.x current; docs pages for 1.4.0 (the "latest" URL returned 404 on 2026-10-31) | correct: >64 cores, >256 GB, GPU >32 GB VRAM; index ≤10 GB disk; `--to-paf/--from-paf`, `--resume-from`, `--index-size`, `--batch-size`; only model herro-v1 for r10.4. polish: GPU(s) or CPU, `--batchsize`, BAM @RG model needed, haploid. |
| NextPolish | https://nextpolish.readthedocs.io/en/latest/FAQ.html | 1.4.1 | "simply run the same command again". No resource figures found. |
| purge_dups | https://github.com/dfguan/purge_dups README | tag v1.2.6 | PAF steps; no resource figures. |
| minimap2 | man page minimap2.1 (master) | — | `-I` default 8G target bases per index batch. |
| bwa | man page bwa.1 (master) | 0.7.x | "5GB memory is required for indexing the complete human genome" (bwtsw). |
| samtools sort | https://www.htslib.org/doc/samtools-sort.html | current | `-m` 768 MiB per thread default; `-T` temp prefix. |
| YaHS | https://github.com/c-zhou/yahs README | tag v1.2.2 | <5 min human, 5,483 contigs, ~45X Hi-C; memory high with large genome + many contigs → larger `-r`; `--no-mem-check`; reuse .bin. |
| meryl / Merqury | meryl README + src/meryl/meryl.C (`memory=`, `threads=`); merqury wiki "1.-Prepare-meryl-dbs"; merqury README | meryl 1.4.2, merqury 1.4.1 | default up to 64 CPUs and all memory; batches when full; OMP_NUM_THREADS for merqury; union-sum. |
| BUSCO | https://busco.ezlab.org/busco_userguide.html | 6.1.0 (gitlab release) | `-c` default 1 CPU; `-r`; `--download_path`; `--offline`; `--opt-out-run-stats`; miniprot default eukaryote genome; Metaeuk less memory than miniprot. |
| FCS-GX | https://github.com/ncbi/fcs/wiki FCS-GX-quickstart.md, FCS-GX-troubleshooting.md (cloned wiki) | v0.5.5 | 470 GiB disk; 512 GiB shared memory; up to 48 cores; up to 10,000x slower without RAM; human 6m57s at 48 cores; /dev/shm. |
| nice / ionice / time | man7.org nice.1, ionice.1, time.1 | — | niceness −20..19; ionice idle class 3; GNU time `-v`, `-o`, "Maximum resident set size". |
| conda / pip / Apptainer | conda use-condarc (CONDA_<CONFIG NAME> env vars, pkgs_dirs); pip caching page (respects XDG_CACHE_HOME); apptainer build_env (APPTAINER_CACHEDIR) | current | cache env vars. |

## Numbers derived (arithmetic, shown in the estimator)
- hifiasm RAM per Gb of reads: 76/65=1.17, 68/48.4=1.40, 114/99.2=1.15, 135/102.3=1.32, 137/111.6=1.23, 463/275.5=1.68 → 1.15–1.7. CPU-h per Gb: 2.66, 4.2, 3.13, 2.63, 2.74 (frog 10.3) → 2.6–4.2.
- Flye: HiFi 141/90=1.57 GB/Gb, 780/90=8.7 CPU-h/Gb; Cliveome Q20 257/105=2.45, 2000/105=19; ONT NA12878 394/98=4.0, 3100/98=31.6; FAQ mammal 450/120=3.75, 3–4 days×30 threads/120 Gb = 18–24. Genome size taken as the "Asm.Size" column (assumption).
- Shasta time: 4 h × 64 cores or × 128 vCPUs for 180 Gb, scaled linearly (my scaling).
- Canu CPU-h and disk scaled by G/3.1 (my scaling; the FAQ gives mammal-size figures only, "depending on coverage").
- ABySS B: 50/3.1=16, 2/0.101=20, 500/20=25 GB per Gb genome.
- gzip FASTQ bytes per base: species D = 0.53; species B 0.88; species A 0.86 (file sizes / read bases from the internal facts sheet; not given in the page, unpublished data; the species D four-lanes duplication question does not change bytes per base).
- hifiasm efficiency: HG002 305.4/7.7=39.7 of 48; mouse 172.9/4.8=36 of 48.
- Species B Flye: wall time × 16 threads / read bases ≈ 7 thread-h per Gb (page gives only rounded times).

## Project facts used (all from the internal project-facts sheet)
DRAGEN 64 cores/503 GB; therioserver 128 cores/~499 GiB, half-cores policy 64 threads; species B 16 threads, nice 19, ionice -c3, Flye about a day, Medaka about half a day at ~200 % CPU (contig count), NextPolish more than a day, 3 rounds; species A hifiasm -f38, jellyfish -s 40G (10G too small), p_ctg.gfa about 1 byte per base; species D SPAdes `-t 16 -m 256 --careful` with small k, error 12 in BayesHammer after downsampling; Monsoon requests ABySS 120G / MEGAHIT 240G / SPAdes 470G for Darevskia mixta ~16x; mouse 32x ABySS 5.4 h, MEGAHIT 8 h; RagTag nucmer almost a week vs minimap2 minutes; file sizes for gzip bytes/base.

## Could not verify / open doubts
- hifiasm `--ont` resource needs: README benchmarks are HiFi only (v0.12). Estimator applies HiFi scaling to ONT and says so.
- Flye: no disk figure in docs. Peak RAM of our species B run was not recorded, so it cannot be compared with the FAQ (~450 GB at 40x ONT). Our species B wall time (≈7 thread-h/Gb) is far below the FAQ/benchmark scaling (18–32 CPU-h/Gb); the reason is unknown (shorter reads? lower coverage? newer version?). Shown as a contrast, not explained.
- Verkko `*_mem_gb=0` meaning (auto-sized?) not checked in source; page now says only "some stages have no fixed value".
- Shasta docs typo "1952 TB" (AWS x1.32xlarge has 1952 GiB); I wrote 1952 GB.
- Shasta resume option: not found in the pages read; page says "not described in the pages I read".
- ABySS resume: inferred from it being a Makefile (make skips targets whose files exist); page only states the documented `-C`/`-n`, not resume.
- No doc figures for SPAdes, MEGAHIT, NextPolish, purge_dups, BUSCO memory on large genomes; table says "not stated".
- BAM sizes: no source with a number; page teaches measuring on a 1 % subsample instead.
- dorado docs "latest" URL 404 on 2026-10-31; used 1.4.0 docs while the binary is at 2.1.x. Requirements may have changed.
- FCS-GX on our servers: ~500 GB is a little under 512 GiB; whether it runs at full speed there is untested. DRAGEN "503 GB" may be GiB (unit unrecorded).
- "A full /home stops everyone's conda, pip and login scripts" is stated as general behaviour (it is what happened on DRAGEN per the user's global notes, but that incident is not in the facts sheet, so no project detail is given).

## Interactive elements (02-resources.js)
1. `s02-km-*`: distinct k-mer counts (genome / heterozygous / error / total) from genome size, coverage, error rate, heterozygosity, k; presets Illumina/Q15/HiFi; readout includes 2-bit packing size (8 or 16 bytes per k-mer).
2. `s02-am-*`: Amdahl's-law curve (wall time vs threads on log axis) with perfect-scaling reference and one-thread floor.
3. `s02-es-*`: estimator (genome size, coverage, read type, assembler filtered by read type, threads, free RAM) → table with read bases, gzip/unpacked input, peak RAM with fit flag, CPU-h and lower-bound wall time, intermediate disk, final assembly size; every row tagged docs / our run / arithmetic / not stated with the source text; log-scale SVG of RAM, input and intermediate disk against free RAM.
Tested: no page errors at 1100 and 420 px, no horizontal page overflow, every read type × assembler × genome size (0.3, 2.5, 9 Gb) gives no NaN/undefined.

## Suggested cross-links
- s03 (short-read assembly): SPAdes `-m`, `--isolate`, ABySS `B`, MEGAHIT `-m` — link to this section's estimator.
- s04 (long-read): Flye `--asm-coverage`, hifiasm `-f`, `--resume`.
- s06 (polishing): Medaka `--regions` parallelism, dorado polish GPU, NextPolish more than a day.
- s05 (YaHS): bwa index memory, samtools sort `-m`/`-T`.
- s09 (FCS-GX): 512 GiB / 470 GiB, /dev/shm (page already links `#s09`).
- s10 (BUSCO): `-c` default 1, `--download_path`, `--opt-out-run-stats`.
