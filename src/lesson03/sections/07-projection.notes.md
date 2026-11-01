# s07 Annotation by projection (Liftoff, TOGA2) - notes

Local copies of all docs/source: lesson3/src/s07_docs/ (wiki pages extracted to wiki_md/, source files prefixed TOGA2_/T2_).
Fetched 2026-10-31.

## Sources
| Source | Version | Used for |
|---|---|---|
| https://github.com/hillerlab/TOGA2 README | release v2.0.10 (2026-09-10, commit c4e1150) | install (`git clone --recurse-submodules`, `make`, Python >= 3.13, Nextflow/Cargo not installed), commands list, `toga2.py test`, v2.0.10 changelog |
| TOGA2 wiki (git clone of TOGA2.wiki, commit 3e23732, 2026-09-30): Loss-status-classification.md | - | statuses FI/I/PI/UL/L/M/PG/PP/N and their definitions; exon Present/Missing/Deleted; criteria for L (>=2 exons for <=10 exons, 20 % for >10, large exon >=40 %, 65 %, 20 %); precedence FI>I>PI>UL>L>M>(PG,PP)>N; spanning chains (M if Ns in gap else L); BED colour table (RGB); awk selection example; PM removed; FI new; retrogenes do not rescue |
| wiki Inactivating-mutations.md | - | masking rules (N-terminal 10 % only with in-frame alt start inside first 10 % or -m10m; C-terminal 10 % always; exons missing/deleted; compensation definition; always-masked list), inactivating_mutations.tsv columns, plot glyph conventions (deletion red line, insertion inverted triangle, stop black, masked grey, compensation green arc) |
| wiki Input-files.md | - | 2bit via faToTwoBit; chains from make_lastz_chains (developed and tested with it); min_chain_score / min_orthologous_chain_score default 15000, below 1000 not recommended; BED12 name rules; CDS %3 -> N; isoform file, semi-mandatory since v2.0.7 with --no_* flags; SpliceAI 4 BigWigs |
| wiki Top-level-files.md, Glossary.md | - | output files (query_annotation.bed, loss_summary.tsv, inactivating_mutations.tsv, orthology_classification.tsv + orthology classes, protein/nucleotide fa, alignments, rejected_items.tsv, summary.txt); projection naming; definitions |
| TOGA2 source v2.0.10: src/python/modules/processed_segment.py | v2.0.10 | `_to_mask` (C-terminal 10 % always; N-terminal with -m10m unless deletion; alt start ATG); unmasking loop (`if inactivating_found`); `compute_intact_percentage` (codon string I/L/M/D; middle_is_intact uses [first10 if -m10m else 0 : last10]; middle_is_present [first10:last10]); `classify_projection` (FI/I branch with strict > 0.6, L shortcuts 0.35/0.2, PI/M at 50 % missing, UL if total intact < 0.49, L needs strict < 0.6 AND affected exons >= threshold, big exon rule); frame-preserving deletion masking (line ~3558) |
| src/python/modules/cesar_wrapper_constants.py | v2.0.10 | thresholds (STRICT 0.6, INTACT_CODON_LOSS 0.35, NON_DEL_LOSS 0.2, MIN_INTACT_UL 0.49, MAX_MISSING_PM 0.5), NUM_TO_CLASS, SAFE_UNMASKABLE_REASONS, masking reason strings |
| src/python/modules/cesar_wrapper_executables.py `get_affected_exon_threshold` | v2.0.10 | 1 / 2 (<=10 exons) / n/5 |
| src/python/classify_chains.py, models/readme.md, src/rust/src/bin/feature_extraction.rs | v2.0.10 | XGBoost SE/ME models, features (gl_exo, loc_exo, flank_cov, synt_log, intr_perc, exon_perc), threshold 0.5, training data human vs rat, flanks = 10 kb each side, synt = number of reference genes intersected by the chain, processed pseudogene rule (clipped_exon_qlen > 0.3 and clipped_intr_cover < 0.1) |
| toga2.py | v2.0.10 | run options: --ref_2bit --query_2bit --chain_file --ref_annotation --isoform_file/-i --no_isoform_file --u12_file --no_u12_file --spliceai_dir --no_spliceai --min_chain_score (15000) --mask_n_terminal_mutations/-m10m --parallel_strategy (default local) --output |
| bioRxiv 10.64898/2026.06.30.735536 (Malovichko ... Hiller 2026) abstract | preprint | 513-fold less memory, 6.1-fold faster, UTRs, splice-site deep learning models, 2,162 assemblies |
| https://github.com/hillerlab/TOGA README | 1.1.8.dev | TOGA1 no longer maintained; Kirilenko et al. 2023 Science |
| https://github.com/hillerlab/make_lastz_chains README + params.json | v3.1.7 (2026-08-09) | soft-mask both genomes, WindowMasker hint, no dots/spaces in names, Nextflow >= 25.04.6, command, output tree (07_final/*.allfilled.chain.gz), resume points, LASTZ K/L/H/Y, chain min score 1000; citations RepeatFiller, chainCleaner |
| https://genome.ucsc.edu/goldenPath/help/chain.html | - | chain header fields, size dt dq lines, zero-based half-open, - strand coordinates |
| http://genomewiki.ucsc.edu/index.php/Chains_Nets | - | gapless block, single/double-sided gap, chain, net (chainNet), nets used for liftOver |
| https://github.com/lastz/lastz | 1.04.60 | "pairwise DNA sequence aligner" |
| https://github.com/agshumate/Liftoff README | release 1.6.3 (PyPI 1.6.3.2) | all Liftoff text: usage, argument order target reference, defaults -a/-s 0.5, -sc 1.0 > -s, -copies, -chroms, -flank, -polish, -mm2_options, default minimap2 options, outputs and attributes, limits |
| the internal project-facts sheet sections 1a-1e | 2026-10-31 | every "In our projects" number |

## Verified facts used on the page (non-exhaustive)
- BED colours: FI 0,0,100; I 0,0,200; PI 0,200,255; UL 255,160,120; L 255,50,50; M 130,130,130; PG 159,129,112; PP 250,50,200; N none. This settles the UNVERIFIED colour mapping noted in the facts sheet 1a: our BED counts agree with the documented table.
- N-terminal masking: wiki and source agree that an alternative in-frame ATG inside the first 10 % also masks (not only -m10m). the facts sheet 1b says "first 10 % only with mask_terminal_mutations" - incomplete; page follows wiki+source.
- In the code, the "middle" checked for unmasked mutations is codons [0, last10) by default (first 10 % excluded only with -m10m), while the wiki says "middle 80 %". The toy follows the code; the toy rules box says so.
- For multi-exon L the code also requires the longest intact codon run < 60 % of the CDS (STRICT_FACTION_INTACT_THRESHOLD); the wiki does not mention this. The toy follows the code.

## Toy simplifications (stated on the page)
- Compensated frameshift codons treated as intact (real code depends on `ignore_alternative_frame`, default not checked).
- A Missing exon is shown in the table as an event but never counts as a hit (matches code: affecting mutations need present exons).
- No splice sites, SpliceAI, identity, single-exon or large-exon rules, paralogs.
- Compensation check: sizes sum to a multiple of 3 and no toy stop between; greedy grouping left to right (TOGA2's exact grouping algorithm not read).
- Preset results checked in headless Chrome: FI, UL, L, I, L (unmasking), UL (same exon), I (compensated), UL -> I with ATG or -m10m, PI, M, I (in-frame exon deletion), UL (frameshifting exon deletion), L for the "three events" example and still L after erasing the homopolymer event.

## Not verified / left out
- Liftoff runtime and memory: not documented; left out.
- TOGA2 runtime/RAM in general: only our project facts (toy contig 1 min 51 s not used; LASTZ probe used).
- Whether make_lastz_chains uses chainNet internally: not checked; page only says TOGA2 takes chains as input.
- "SSMD/SSMA" splice mutation type names taken from wiki list; stop codon type string in real TSV not checked (toy shows `STOP`).
- the facts sheet 1d: the four flank-test categories do not sum to the L+M total; the page gives them only as rough shares.
- Hiller-lab "intact/missing/inactivating" counts (the facts sheet 1a last bullet): UNVERIFIED meaning, not used. Lost-only counts not shown; page says "about half". Species A and its relative are unpublished: all project counts and gene names on the page were made qualitative 2026-11-01 (owner request); the public gene_ortho_flanks repo is no longer linked because its README names the taxa.

## Cross-links used / suggested
- ../02-assembly/#s10 (ortholog/BUSCO), ../02-assembly/#s06 (polishing).
- #s04 (soft-masking/repeats), #s05 and #s06 (projected genes as evidence; ab initio broken by base errors), #s08 (BUSCO does not reveal base errors).
- s01 is referred to as "section 01" in a code comment only (soft-masking); could be linked by the merger.
