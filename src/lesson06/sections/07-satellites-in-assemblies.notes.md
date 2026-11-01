# s07 Satellites and young SINEs in assemblies: notes and sources

All sources read 2026-10-31.

## Sources (URL, version, what was taken)

| Topic | Source | Version | Used for |
|---|---|---|---|
| k − 1 rule, de Bruijn graphs, desman N-runs | lesson 2 section 03 of this course (its own notes list the sources) | - | linked, not repeated; "26 long-read assemblies, no N at young SINEs" and "reads present" taken from the same lab facts that section uses |
| Long-read types and lengths (HiFi ~15 kb, ONT ultra-long > 100 kb) | lesson 2 section 04 of this course | - | read-length presets in the toy |
| Merqury copy-number spectrum | lesson 2 section 08 | - | linked for k-mer checks |
| SINEderella `assembly_qc.sh` | https://github.com/Toki-bio/SINEderella (main, commit f19fcf1, 2026-10-30), script header and code; MANUAL.md table of environment variables | f19fcf1 | EDGE = 500 (first/last 500 bases of each scaffold); metrics gap_pct, N50, short_scaffolds_pct, edge_N_pct; flags ok/caution/warn; verdict SOLID/CAUTION/WARN; header: "Detects assemblies likely to produce false SINE hits due to N-rich scaffold edges (padding artifacts)"; `SKIP_ASSEMBLY_QC=1` skips it |
| SINEderella satellite stage | same repo, README.md tools table, MANUAL.md §16.9 revision note, docs/SATELLITES.md §1–4 | f19fcf1 | arrays taken out of the hit set as loci, recorded in `results/satellites/`, "never deleted" |
| CLsat_workflow (satpipe) | https://github.com/Toki-bio/CLsat_workflow (commit d47e5c9, 2026-10-26): README.md, PIPELINE.md §04, docs/config.md, docs/files.md, `satpipe/stages/02_seed_expansion_scan/clisat_expand_then_scan_merged.sh` header | d47e5c9 | expansion until signal lost; `--to-scaffold-ends` off by default = "stop at scaffold boundary and record reason"; stop reasons `past_scaffold_start`, `past_scaffold_end`; flanks 600 bp (`orthology.flank_bp`), classed unique / telomeric / low-complexity / scaffold-truncated, unique ones compared (ssearch36, ≥ 200 bp, ≥ 80 %) |
| samtools | https://github.com/samtools/samtools doc/samtools.1, samtools-view.1, samtools-depth.1 (develop branch); latest release | 1.25 | filter expression variables `pos`, `endpos` (1-based); `view -e`, `-c`, `-F`; flags 0x4/0x100/0x800 = 0x904; `depth -a`, `-r`, `-Q` (minimum mapping quality) |
| minimap2 | https://github.com/lh3/minimap2 minimap2.1 | 2.31 (latest release tag v2.31) | `-x map-hifi` (HiFi), `lr:hq` (accurate Nanopore, "recommended by ONT developers for ... chemistry v14") |
| Jellyfish | https://github.com/gmarcais/Jellyfish doc/Readme.md | v2.3.1 | `count -m -s -C -t -o`; `--if` counts only the k-mers of a given file; `<(zcat ...)` input; `dump -c` column format |
| HMM-Flagger | https://github.com/mobinasri/flagger README | v1.2.0 (repo pushed 2026-10-21) | HMM on read coverage; classes erroneous, falsely duplicated, haploid, collapsed; 3-step quick start (bam2cov, hmm_flagger, Docker image) with HiFi example |
| NucFreq | https://github.com/mrvollger/NucFreq README | v0.1 | plots first and second most common base; het-detection rule "second most common base present in at least 10% of reads in at least 5 positions within a 500 bp region" |
| Vollger et al. 2019 | Nat Methods 16:88–94, doi 10.1038/s41592-018-0236-3 (PubMed abstract) | - | collapsed segmental duplications resolved using paralogous sequence variants in long reads |
| VerityMap | https://github.com/ablab/VerityMap README (last push 2023-02-22, no release) | - | maps HiFi/ONT reads to assemblies of extra-long tandem repeats such as centromeres; reports possible errors from rare k-mers |
| Vassetzky, Kosushkin & Ryskov 2023 | Mobile DNA 14:21, doi 10.1186/s13100-023-00309-2 (PubMed abstract) | - | 56 squamate genomes; sSats likely subtelomeric; geckos highly diverse, Darevskia rare |

## Lab facts used (lab project log; all at a general level, unpublished work without numbers)
- Desman short-read assemblies: N-runs / contig ends k − 1 bases into young Tal copies; same SINE on both sides of an N join (*Desmana*); restored middles covered at ~flank depth; 26 long-read assemblies have no N at young SINEs. Numbers are in lesson 2 s03 (not repeated here).
- *Darevskia* CLsat (unpublished): CLsat measured from raw reads vs assemblies; in one draft most CLsat was in small contigs removed by a size cut-off; one assembly held almost none of one CLsat family although reads hold it; "read-first" prototype: most CLsat reads lie inside arrays, spanning reads limited by coverage. Numbers deliberately not shown.

## The toy (JS)
- Fixed read length; starts uniform; read count Poisson (normal approximation above λ = 40). Spanning = covers array + 100 bp each side (toy rule, stated on page).
- Depth estimate = read bases on array × (1 + bias) ÷ (coverage × monomer length); unbiased without bias. 95 % range from up to 400 resamples (fewer for very large read counts, minimum 60).
- Expected spanning reads = c × max(0, R − L − 200) ÷ R (exact for fixed-length uniform reads); P(≥ 1) = 1 − e^−λ.
- "Collapsed = one monomer + gap" is a simplification; the page text lists the real outcomes (collapsed, broken, set aside).

## Our inferences / open doubts
- The size cut-off point ("small contigs are where satellites collect") is stated generally from the lab observation; not measured across many assemblies.
- The bias slider is a what-if; no measured value of library bias over satellites is given.
- k-mer copy number via the median monomer k-mer count is a standard reasoning step (lesson 1), not taken from a specific tool's documentation.
- The samtools depth `-Q` default (no MQ filter unless given) is inferred from the option text; the man page states "default minimum quality value is 0 for depth" without saying whether base or mapping quality.

## Final review 2026-10-31
- Tooltips/links added at first use of terms in the lesson; see the lesson review record. Claims re-checked against source/papers listed above.
