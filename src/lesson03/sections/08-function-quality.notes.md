# s08 Naming genes and checking the annotation: notes (2026-10-31)

Local copies of docs: lesson3/src/s08docs/ (READMEs, IPS6 docs at tag 6.0.3.0, emapper USAGE.md, table2asn_readme.txt),
lesson3/src/omark (clone, v0.5.0), lesson3/src/diamond_wiki (clone).

## Sources (URL, version, what was taken)

- InterProScan 6: https://github.com/ebi-pf-team/interproscan6, release 6.0.3.0 (2026-10-15, `gh api releases/latest`).
  docs/{index,usage,options,analyses,licensed_applications,scaling,output,matches_api}.md at ref 6.0.3.0:
  Nextflow >= 25.10.4 + container runtime; `-r`, `-profile docker|apptainer|singularity[,slurm|lsf][,test]`, `--input`,
  `--datadir`, `--interpro` (default latest; pin recommended), `--goterms`/`--pathways` off by default, `--applications`/
  `--skip-applications` mutually exclusive (and with `--run-ml`), `--cpus` default 1, `--formats` gff3,json,jsonl,tsv,xml,
  `--outdir`, `--outprefix`, `--no-matches-api`; analysis catalogue and default selection; licensed apps DeepTMHMM, Phobius,
  SignalP-Euk/Prok; TSV 15 columns; Matches API on by default, InterPro releases "typically every eight weeks";
  datadir and work dir must be on a shared filesystem for slurm/lsf.
- InterProScan 5: https://github.com/ebi-pf-team/interproscan README: 5.78-109.0 (2026-06-11) is the final IPS5 release.
- InterProScan 6 data sizes: https://ftp.ebi.ac.uk/pub/databases/interpro/iprscan/6/6.0/ (listed 2026-10-31): antifam-8.0 2.5M,
  cath-4.3.0 2.5G, cdd-3.21 481M, hamap-2026_01 18M, interpro-110.0 11M, ncbifam-20.0 412M, panther-19.0 1.0G, pfam-38.2 391M,
  pirsf-3.10 95M, pirsr-2025_05 63M, prints-42.0 7.4M, prosite-2026_01 7.5M, sfld-4 8.4M, smart-9.0 30M, superfamily-1.75 947M
  -> sum ~5.97 GB compressed (my arithmetic). versions.json lists InterPro 105.0-110.0. Unpacked size: not measured.
- Pfam accessions checked via InterPro API (https://www.ebi.ac.uk/interpro/api/entry/pfam/<acc>): PF00078 RVT_1 reverse
  transcriptase; PF00665 rve integrase core domain; PF02994 Transposase_22 "L1 transposable element RBD-like domain";
  PF03184 DDE_1 DDE superfamily endonuclease. IPR000719 = "Protein kinase domain" (InterPro API, checked 2026-10-31); MK03_HUMAN = P27361, MAPK3 (UniProt REST, checked).
- eggNOG-mapper: https://github.com/eggnogdb/eggnog-mapper README + USAGE.md at v3.0.0-beta6 (release 2026-08-13; version.py
  `3.0.0-beta6`, DB 7.0.0). eggNOG 7 ~59 M proteins; curated-only donors; `--tax_scope auto` default; DIAMOND default,
  `-m mmseqs` optional, both "produce the same annotations"; core data ~45 GB (annotation DB ~22 GB + DIAMOND ~23 GB),
  MMseqs2 DB ~25 GB; 22-column .annotations incl. annotation_confidence; RAM formula; `--selftest`; `--temp_dir`;
  `download_eggnog_data.py -y --data_dir`; Apptainer image (run-script is emapper.py). Data server listing
  https://data.cgmlab.org/eggnog-mapper/emapper-3.0/ (eggnog.db 21G, eggnog_proteins.dmnd 22G, eggnog-mapper-3.0.0-beta6.sif 198M).
  Version availability checked 2026-10-31: bioconda eggnog-mapper 2.1.15 (api.anaconda.org), PyPI 2.1.13 (`pip index versions`).
- DIAMOND: https://github.com/bbuchfink/diamond release v2.2.8 (2026-09-20); wiki (cloned) Tutorial (makedb, blastp,
  sensitivity modes: default >70 % identity, --sensitive >40 %, very/ultra-sensitive whole range), Command-line options
  (`-k/--max-target-seqs` default 25, `--evalue` default 0.001, `--query-cover`, `--subject-cover`, outfmt 6 default 12 fields,
  `--threads` default all cores).
- UniProt: https://ftp.uniprot.org/pub/databases/uniprot/current_release/knowledgebase/complete/ reldate.txt = Release
  2026_03 (02-Sep-2026); uniprot_sprot.fasta.gz Content-Length 93,801,562 bytes.
- AGAT v1.7.0 (bioconda 1.7.0; GitHub release 2026-04-10): docs/tools agat_sp_statistics.md, agat_sp_keep_longest_isoform.md,
  agat_sp_extract_sequences.md (`-g`, `-f`, `-p`, `--clean_final_stop`, `-o`, default type cds),
  agat_sp_manage_functional_annotation.md (`-f`, `-b` outfmt 6, `--db`, `-i` InterProScan tsv, `--be` default 1e-6, `--pe`
  default 5); source lib/AGAT/OmniscientStat.pm (sentences "Number of single exon gene", "Number gene overlapping").
- BUSCO user guide v6.1.0: https://busco.ezlab.org/busco_userguide.html (protein mode passes FASTA directly to HMMER; protein
  sets not filtered for isoforms -> many duplicates). Dataset names from https://busco-data.ezlab.org/v5/data/file_versions.tsv
  (mammalia_odb10/odb12/odb12.2, glires, rodentia_odb12). `--opt-out-run-stats` from lesson 2 s10 (BUSCO 6.1.0).
- OMArk: https://github.com/DessimozLab/OMArk v0.5.0 (pyproject; bioconda 0.5.0, PyPI 0.5.0). README: commands, outputs,
  LUCA.h5 recommendation, example runtimes (<15 min OMAmer, <10 min OMArk on UP000005640 human), isoform .splice file, web
  server. Source src/omark/files.py filter_partial_matches(overlap_threshold=0.8, fragment_threshold=0.5);
  assets/textual_report.txt (category definitions, conserved HOG = gene in >80 % of extant species; "seemingly at random").
  LUCA.h5 size 9,918,199,250 bytes (HTTP HEAD, last-modified 2026-07-06). OMAmer v2.1.2 (GitHub/bioconda).
  Paper: Nevers et al. 2025 Nat Biotechnol 43:124-133.
- NCBI GFF3 for genomes: https://www.ncbi.nlm.nih.gov/genbank/genomes_gff/ (updated 2024-03-08): product= on CDS, transcript_id/
  protein_id, locus_tag, pseudo=true, pseudogene=<TYPE>, automatic partials, "hypothetical protein" default, same-name
  discrepancy.
- NCBI eukaryotic genome submission: https://www.ncbi.nlm.nih.gov/genbank/eukaryotic_genome_submission/ (2024-04-23): prefix
  3-12 alphanumeric, first not a digit, case-sensitive; underscore + number; "hypothetical protein" or "uncharacterized
  protein"; annotation optional.
- NCBI genome submission guide: https://www.ncbi.nlm.nih.gov/genbank/genomesubmit/ (2025-07-21): prefix assigned per
  BioProject:BioSample pair; annotated genomes must pre-register.
- table2asn readme: https://ftp.ncbi.nlm.nih.gov/asn1-converters/by_program/table2asn/DOCUMENTATION/table2asn_readme.txt
  (2024-12-09; binaries 2025-09-16): eukaryotic GFF3 example command, -M n, -J, -c w, -euk, -Z, -V b, -gaps-min, -l values
  incl. proximity-ligation, -locus-tag-prefix, -j.
- NCBI Eukaryotic Genome Annotation Pipeline: https://www.ncbi.nlm.nih.gov/refseq/annotation_euk/process/ (2024-04-04): names by
  homology to SwissProt; most Gnomon models with indels/frameshifts labelled pseudogenes; "PREDICTED: LOW QUALITY PROTEIN".
- LOC symbols: Maglott et al. 2005 NAR 33:D54, Table 1 ("'LOC'+GeneID designation assigned if none of the above officially
  accepted nomenclature has precedence"), via Europe PMC PMC539985. "Replaced when a real symbol is assigned" comes from NCBI
  Gene help text quoted on Biostars (NCBI help page itself blocked by a captcha) -> secondary source.
- AED: Eilbeck et al. 2009 BMC Bioinformatics 10:67 (definition, 0 = full agreement); maker-devel list, C. Holt 2012
  (https://yandell-lab.org/pipermail/maker-devel_yandell-lab.org/2012-December/007796.html: "0 is best and 1 is worst") and
  M. Campbell 2016-04-20 (.../2016-April/013386.html: modified Jaccard distance; rule of thumb >~95 % of annotations AED < 0.5).
- Olfactory receptor genes mostly intronless coding region: Barnes et al. 2020 BMC Genomics 21:196, doi 10.1186/s12864-020-6583-3.
- Project facts: the internal project-facts sheet sections 0, 1a, 1e, 5. Species A/B are unpublished: shown on the page only
  qualitatively/rounded (owner request 2026-11-01); the human reference count 19,990 is kept (property of the reference).

## Not verified / judgement calls (kept off the page as fact)
- No runtime figure for InterProScan or eggNOG-mapper on a vertebrate proteome found in their docs; the page says so and
  suggests a 1,000-protein timing test.
- eggNOG v3 README says `pip install eggnog-mapper` and legacy `pip install eggnog-mapper==2.1.15`, but PyPI has only up to
  2.1.13 (bioconda has 2.1.15); GitHub release list has v2.1.14 as last v2. Page states what pip/bioconda deliver today.
- "v2 and v3 will name some genes differently" is an inference from different DBs/donor rules, not a measured statement.
- Whether `download_eggnog_data.py` is callable inside the .sif was not checked; the page uses the source install for download.
- AGAT `-b` with DIAMOND sseqid `sp|ACC|NAME` and `--db uniprot_sprot.fasta`: per AGAT docs (Swiss-Prot use case); not run.
- template.sbt via NCBI web form (https://submit.ncbi.nlm.nih.gov/genbank/template/submission/) - not re-fetched today.
- Dashboard thresholds (2/5 points, 3/6 %, 3/8 %, 2/5 %, 1.3x/1.8x, 85-120 % / 70-150 %) are teaching choices, labelled as such.
- DIAMOND `--query-cover 50 --subject-cover 50` are my choice, labelled as such on the page.
- The "common rule" for choosing names (ortholog name if eggNOG and Swiss-Prot agree; domain-based name; else uncharacterized)
  is a practice summary, not an NCBI rule.
- We have no functional annotation (InterProScan/eggNOG/OMArk) results for species A-D in the facts sheet; none shown.

## Cross-links used
#s04 (masking), #s05 (evidence), #s06 (gene prediction, homopolymers), #s07 (TOGA2), ../02-assembly/#s06 (purge, in JS text as
"lesson 2, section 06"), #s09 and #s10 and #s13 of lesson 2. Suggest s06 link here for "checking the gene set", and s07 link here
for naming genes not covered by projection.
