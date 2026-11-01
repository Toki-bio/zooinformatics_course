# s09 Contamination screening with NCBI FCS-GX — notes

## Sources (read 2026-10-31)
- ncbi/fcs repo, commit 47584e7 (2025-03-03), cloned to `lesson2/src/s09_fcs/fcs`. README: the two tools and their definitions, the Galaxy news item, the paper. `dist/fcs.py`: DEFAULT_VERSION = "0.5.5", Docker image `ncbi/fcs-gx`, `FCS_DEFAULT_IMAGE`, `--env-file`, `--no-report-analytics`, `screen/db/clean` subcommands.
- ncbi/fcs wiki (git clone fcs.wiki, `src/s09_fcs/wiki`):
  - FCS-GX-quickstart: prerequisites (470 GiB disk, 512 GiB shared-memory host, up to 48 cores, "as much as a 10000x difference"), the six steps, `curl` of fcs.py and fcs-gx.sif, `db get`/`db check`, tmpfs mount, screen and clean commands, the FIX→SPLIT sed, the example output (`Applied 405 actions; 402417 bps dropped; 1922 bps hardmasked.`).
  - FCS-GX-input: SeqID rules (<50 characters, allowed characters, unique), sequences <2 Gbp, N runs ≥10 split, how to look up the tax-id, Metazoa 33208 not supported, test-only vs all database, memory-mapping when there is no tmpfs, env vars GX_NUM_CORES / GX_ALIGN_EXCLUDE_TAXA / GX_EXTRA_CONTAM_DIVS / GX_ACTION_REPORT_PA_SAME_KINGDOM_THRESHOLD (default 1 %).
  - FCS-GX-output: the 8 action-report columns, the action definitions (EXCLUDE/TRIM/FIX/REVIEW/REVIEW_RARE/INFO), the warning about top_tax_name, the taxonomy.rpt columns and result values, `~` and `~~` seq-id notation, what clean does with each action (incl. SPLIT).
  - FCS-GX-troubleshooting: when to run (initial contigs + final; re-screen), not for reads, the run-time table (48 cores, db in RAM), the h-mer method (56-mer, drop every 3rd base, R/Y collapse, minword, 38-bit, stride 20/10 bp, 65–75 % identity, coding-region bias), database composition (euk <10 kb omitted), the 8 kingdoms, Known Issues (false positives/negatives, >50 kb with <20 % coverage → review), download 40 min to hours.
  - FCS-adaptor-quickstart/output: run_fcsadaptor.sh `--euk`, Singularity flags, output files, the 100-bp / 50-bp / 75 % / 200-bp rules, internal ACTION_TRIM = split by fcs.py clean, not removed by cleaned_sequences.
- ncbi/fcs-gx source, commit 07ffe78 (2025-06-09, VERSION v0.5.5-9-gfc836c1), `src/s09_fcs/fcs-gx`:
  - `scripts/action_report.py` `Sequence.calc_actions` + `ExcludeThresholds` (good_pct 30, good_len 50000, good_abs_len 200), `global_low_coverage_threshold` = env GX_ACTION_REPORT_LOW_COVERAGE_THRESHOLD default 10, the same-kingdom effective length <10000 → keep, else REVIEW, TRIM if the span touches start or end, else FIX, MITOCHONDRION/PLASTID rule S04 (>0.8 × seq_len xc_mt coverage, eukaryote, primary), rule codes S01–S04, M01–M05. The interactive implements these, simplified.
  - The MITOCHONDRION action exists in tags v0.5.4 and v0.5.5 (checked raw action_report.py) but not in v0.5.0.
  - `src/fasta.cpp` ApplyActionReport: MITOCHONDRION/PLASTID/EXCLUDE/TRIM erased, FIX masked, SPLIT/ACTION_TRIM split, REVIEW*/INFO no action. `src/main.cpp`: clean `--min-seq-len` default 200.
  - `make_gxdb/blast_names_mapping.tsv`: rodents→anml:rodents, insectivores→anml:mammals, primates→anml:primates, enterobacteria/g-proteobacteria→prok:g-proteobacteria, synthetic→synt:synthetic.
  - README: 32–64 CPUs + 512 GiB is sufficient, vmtouch alternative.
- GX database files (NCBI FTP, fetched 2026-10-31): `all.manifest`: all.gxi 321,216,733,352 B; all.gxs 177,317,125,807 B; total of all files ≈ 498.6e9 B ≈ 464 GiB. `all.meta.jsonl`: build-date 2023-01-24, 3,025,824 seqs, 709.264 Gbp. `all.README.txt`: gx v0.3.0-151 build.
- Astashyn et al. 2024 Genome Biol 25:60 (PMC10898089): "screens most genomes in 0.1–10 min"; NCBI phasing in FCS-GX screening of submissions (reporting from May 2023); 512 GiB server. Used only as background. The page quotes the wiki numbers.
- NCBI Taxonomy (eutils + Datasets API, 2026-10-31): *Desmana moschata* 182682, blast_name "insectivores". Rodent example: *Mus musculus* 10090 (standard NCBI tax-id, blast name "rodents"; replaced the species A example on 2026-11-01, unpublished taxon).
- NCBI WGS submission page (https://www.ncbi.nlm.nih.gov/genbank/wgs.submit/): "Contigs should be >199nt", remove terminal Ns, submissions are screened for foreign contaminants and vectors. The genomesubmit page: `[location=mitochondrion]` FASTA tag.
- Galaxy: tools-iuc `tools/ncbi_fcs_gx/ncbi_fcs_gx.xml` + macros.xml (TOOL_VERSION 0.5.5, galaxy2): modes screen/clean, "Taxonomy entry" = GX Division or NCBI Taxonomic identifier, outputs "Cleaned Fasta" / "Fasta for EXCLUDE entries", "Minimumm sequence length to keep" 200. GTN tutorial https://training.galaxyproject.org/training-material/topics/sequence-analysis/tutorials/ncbi-fcs/tutorial.html: workflow "NCBI Foreign Contamination Screen Workflow", order GX screen → GX clean → adaptor → clean.
- BlobToolKit: GitHub README (blobtoolkit/blobtoolkit; PyPI 4.5.1): `pip install blobtoolkit`, `blobtools view --local`, sanger-tol/blobtoolkit pipeline recommended. Tutorial "getting started with blobtools2": create --fasta --taxid --taxdump, add --cov BAM, add --hits --taxrule bestsumorder --taxdump, add --busco. Laetsch & Blaxter 2017 F1000Research 6:1287: blob plot = GC (x), coverage (y), circle diameter ∝ length, colour = taxonomy; bestsum rule.

## Project facts used (the internal project-facts sheet)
- No FCS-GX run recorded (s09 hook; phrased as "as far as our project notes show").
- Species A mt-like contigs, multimer contig, NUMT count and mito depth: given only as "dozens", "several copies", "thousands" (unpublished data).
- DRAGEN 503 GB RAM, therioserver ~499 GiB.

## Not verified / doubts
- Whether FCS-GX would actually give MITOCHONDRION for the species A multimer contig. This depends on the database having mitochondrial annotations for rodent hits. The page says "should pass that test", based on the rule only.
- The interactive's rules are simplified. It leaves out the merging of grey/low-coverage rows, discard_small_primary_islands, integrant detection, REVIEW_RARE, the "no REVIEW without EXCLUDE in that division" rule (no_review_without_excludes_rule), and the classification thresholds in classify_taxonomy.py. A real report can differ.
- The page says the database (~464 GiB) is "just under" our servers' RAM. Whether FCS-GX runs at full speed on DRAGEN or therioserver was not tested. Note that DRAGEN's "503 GB" unit (GB or GiB) is not recorded.
- The blob plot is simulated (GC and coverage values invented). The mitochondrial GC of 39 % is not a real value of any of our species.
- The h-mer toy skips the minword step. The tooltip describes minword as "one fixed form of word vs reverse complement"; the docs say only "orientation-independent".
- I did not run FCS (no server access). The commands are copied from the wiki, with the user's tax-id and paths substituted. `printf 'GX_NUM_CORES=32\n' > env.txt` is my own line; the format is from the wiki's env.txt example.

## Suggested cross-links
- s11 (mitogenome, NUMTs): organelle removal vs NUMTs.
- s08 (quality metrics): rerun stats after cleaning; s10 BUSCO on clean.fasta.
- s13 (depositing): NCBI screening at submission, >199 nt, no terminal N, `[location=mitochondrion]`.
- s06 (gap closing/polishing): FIX masking adds N runs; SPLIT changes contig counts.
- Lesson 1 #gx (Galaxy), #qc (read-level screens).
