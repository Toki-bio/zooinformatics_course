# s08 A complete SINE study, step by step: sources and checks

Written 2026-10-31. All lab tools below are public repositories under github.com/Toki-bio (visibility checked with
`gh repo view` on 2026-10-31).

## Tool sources (version = commit read)

| tool | source | version read | used for |
|---|---|---|---|
| SINEderella | https://github.com/Toki-bio/SINEderella (README.md, MANUAL.md, docs/AIM.md, docs/VERDICTS.md, PUBLISH_WORKFLOW.md, step1_search_extract.sh, step2_asSINEment.sh, step7_boundary_refine.sh, tools/trna_heads.sh, report_trna.py, publish_run.sh, SINEderella) | main `f19fcf1` (2026-10-30) | aim and outputs; step order; `sear -k <query> genome 0.8 65 50` (step1 line 136); 10 voting cycles, `MIN_REL_BITSCORE=0.45`; step 3 LEAK (runner >= 90 % of winner), CONFLICT (overlapping subfamily hits), soft assignment (best sear query score, `unassigned.tsv`); step 7: flank window widened in 50 bp steps to 1000 bp, background from random 70 bp genome windows with `random.seed(42)`, threshold background + 5 %; verdicts SINE / grey / not_SINE in `loci_verdict.tsv`; plates top 100 + random 100 from SINE loci; `--add`, `--publish`, env vars SPECIES_CODE, RAW_ALN_BASE; `TRNA_REF` required for trna_heads.sh (else skipped), 20 dinucleotide shuffles, SINEBase 60 %/60 nt, optional cmscan (Rfam) and tRNAscan-SE; trna_heads.sh is called from publish_run.sh; `mafft --threadit 0` (PUBLISH_WORKFLOW.md "Reproducible alignments"); export to SINEdb (MANUAL §13). |
| sear (sear2k) | https://github.com/Toki-bio/sear2k README | `923ffb6` (2026-10-12) | 2500 bp windows, 2000 bp step; usage `sear [options] query bank Slf Homology Flank` |
| SINE-de-novo-genome-scan | https://github.com/Toki-bio/SINE-de-novo-genome-scan README + 01_sanitize_shred.sh | `2c9ca50` (2026-10-24) | shred, low-complexity filter + vsearch nr85, `sine_scan.sh genome.fa queries.fa`, hits merged within 500 bp, `candidates.fa`; the three commands are copied from the README |
| SubFam | https://github.com/Toki-bio/SubFam README, SubFam.sh | 1.5.1, `8f5cef3` (2026-10-31) | k-mer guide-tree order, chunks of N = 50 (round(total/N) chunks), plurality 0.36, options -n -t -o -x, `PREFIX.aln.fasta`, log with version and command line; "SubFam orders, chunks, and averages; it does not define groups" |
| SINE_consensus | https://github.com/Toki-bio/SINE_consensus README | `29719f5` (2026-03-13) | named as a consensus builder only |
| SINE_orth_loc | https://github.com/Toki-bio/SINE_orth_loc README, SINE_orth_loc.bash header, sinederella_bed.py | v2.0 branch `f40fbf2` (2026-10-30) | bank mode commands (copied from README); genomes named `xxx.bnk`; sinederella_bed.py keeps verdict SINE + partial copies; PM/MP/SINE classes; sine_loci_browser.html |
| ViewAlign (MSA-viewer) | https://github.com/Toki-bio/MSA-viewer README; live app https://toki-bio.github.io/MSA-viewer/ | README fetched 2026-10-31 | alignment viewer, named only |
| SINEdb | https://toki-bio.github.io/SINEdb/ (HTTP 200 on 2026-10-31) | - | link only |

The `seqkit shuffle -s 42 ... | seqkit head -n 30000` line is our own illustration of "30,000 random copies (seed 42)"; the
exact sampling command of the species A runs is not in the lab log.

## Papers (PubMed, 2026-10-31)

- Vassetzky NS, Kramerov DA 2013. SINEBase: a database and tool for SINE analysis. Nucleic Acids Res 41(Database issue):D83-9.
  doi:10.1093/nar/gks1263 (abstract: formal definitions of SINEs; families classified by modular structure). Site https://sines.eimb.ru/ (HTTP 200).
- Storer J, Hubley R, Rosen J, Wheeler TJ, Smit AF 2021. The Dfam community resource of transposable element families,
  sequence models, and genome annotations. Mobile DNA 12:2. doi:10.1186/s13100-020-00230-y (curated and uncurated datasets).
- Kosushkin et al. 2023, Genes 14:2089, doi:10.3390/genes14112089 (orthologous loci by flanks): cited in s05, the method behind SINE_orth_loc v1.0.

## Lab record ("In our projects")

Internal lab project log (species A and a close relative, unpublished; exact values withheld until publication):
- first bank = the 58 SINEbase consensuses classed Mammalia.
- family runs: bank = SINEBase consensus + four literature subfamily consensuses; more than a million loci per genome;
  about five in six firmly assigned, most to one subfamily.
- minus bank: whole-genome scan of the depleted genome about a tenth of the projected full-genome time;
  tens of thousands of candidates; 30,000 random copies (seed 42) -> SubFam -> 600 rows each; "preliminary, pending manual review".
- orthology: several hundred thousand pairs, most SINE, PM and MP about equal; direction not determined;
  a more distant genome intended as outgroup; inputs were the firmly assigned loci (the per-copy verdicts and bank mode came later:
  docs/VERDICTS.md and SINE_orth_loc README bank mode).
- Tal SINE described as tRNA-derived, talpids: Tal repository README.

## Inference / not verified (worded as such on the page)

- The "What if I skip it?" texts are our reasoning from how each tool works, not measured results.
- The "Two genomes" skip example (shared-flank copies blur orthology calls) is inference, worded with "can".
- That the default thresholds suit other SINE families is not tested; the page says so.

## Open doubts

- The step table in SINEderella's README says ">= 0.9 length"; step1 code and MANUAL use 0.8. The page uses 0.8 (code).
- Whether the species A reports carry per-copy verdicts was not checked; the page does not claim it.

## Final review 2026-10-31
- Tooltips/links added at first use of terms in the lesson; see the lesson review record. Claims re-checked against source/papers listed above.
