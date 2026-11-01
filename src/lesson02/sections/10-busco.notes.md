# s10 Gene completeness with BUSCO: notes

## Sources (all read 2026-10-31)
1. BUSCO source, https://gitlab.com/ezlab/busco, shallow clone at commit cd071053c38c5060f75d0b370cb66c4edc8e59a1
   (2026-06-05), `_version.py` = **6.1.0**. Local copy: `lesson2/src/busco/`.
   - `src/busco/run_BUSCO.py` lines 250-585: every command-line option and its help text (-i, -o, -m, -l, -c,
     --contig_break default 10, --datasets_version default odb12.2, --download "place this last", --download_path,
     --offline, --opt-out-run-stats, --out_path, --plot, --plot_percentages, -f, -r, --metaeuk, --miniprot, --augustus,
     --auto-lineage-euk).
   - `run_BUSCO.py` lines 140-232: unless opted out, BUSCO calls `requests.get("https://ipinfo.io/<ip>/json")` and
     `requests.post("https://busco-data.ezlab.org/uploaddb", ...)` in the `finally:` block, **with no timeout argument**
     (basis for the "hang" pitfall).
   - `BuscoConfig.py` 46-81 (defaults: datasets_version odb12.2, evalue 1e-3, limit 3, contig_break 10,
     download_base_url https://busco-data.ezlab.org/v5/data/); 248-286 (eukaryote genome mode: augustus if
     --augustus, metaeuk if --metaeuk, else miniprot); 709-735 (`-l mammalia` without suffix gets `_<datasets_version>`
     appended; odb < 10 rejected).
   - `busco_tools/hmmer.py` 435-540: length classification. odb10: zeta=(length-size)/sigma, complete if -2<=zeta<=2,
     "very large" if <-2 (counted as complete), else fragment. odb12.2: lower bound = min(0.9*median, median-min(25,2*sMAD),
     0.8*profile length), upper = 1.5*median. odb12: complete if size >= 0.8*profile length.
   - `hmmer.py` 720-830: duplicates removed by rank (complete > very large > fragment); matches <85 % of best bitscore removed.
   - `hmmer.py` 886-920: in miniprot runs, among several complete copies, copies with internal stops are dropped if
     a stop-free copy exists (1 stop-free copy -> single-copy).
   - `hmmer.py` 1215-1285 and 1383-1440: summary format `C:..%[S:..%,D:..%],F:..%,M:..%,n:..,E:..%`; E = 100 x
     (complete BUSCOs with stop_codon_count > 0) / (S+D count); warning if miniprot average identity < 0.5.
   - `hmmer.py` 1333-1350: full_table.tsv header in genome mode (Busco id, Status, Sequence, Gene Start, Gene End,
     Strand, Score, Length[, OrthoDB url, Description]); statuses Complete/Duplicated/Fragmented/Missing.
   - `busco_tools/miniprot.py` 138-152: miniprot is run as `miniprot --trans -u -I --outs 0.95 -t N --gff index refseq_db`;
     line 348 reads the `st:i:` tag (in-frame stop count) as stop_codon_count.
   - `BuscoPlot.py` 138-147: --plot writes `busco_figure.png` (or `busco_figure_page_N.png`) into the given folder;
     reads files starting `short_summary` and ending `.json`.
   - `CHANGELOG`: 5.6.0 usage statistics introduced; 5.7.0 miniprot default for eukaryote genomes; 6.0.0 gzipped
     input accepted, --plot built in; 6.1.0 odb12.2 support.
2. BUSCO user guide v6.1.0, https://busco.ezlab.org/busco_userguide.html (text copy `lesson2/src/s10_busco_docs/userguide.txt`):
   marker selection 90 %/90 % (tightened for >100 species); dataset folder contents; length cutoff rules per release;
   "odb12.2 datasets can only be correctly parsed by v6.1.0 or later"; clusters rebuilt each release, IDs not kept;
   choose the most specific lineage; compare with relatives "like-for-like"; -c default is one CPU; miniprot default
   since 5.7.0, may underperform on divergent assemblies, many predictions have internal stop codons; MetaEuk uses less
   memory than miniprot; Augustus/MetaEuk predictions have no internal stops; miniprot pipeline writes no nucleotide
   sequences; E definition and the eudicotyledons example (D 48.5 %, E 8.6 %); D can be WGD or chimeric haplotype
   assembly; complete can be a high-identity paralog; SEPP 4.5.6 incompatible, use 4.5.5; --download_path default
   `busco_downloads/`; conda install line `busco=6.1.0`; report dataset with creation date.
3. Dataset list https://busco-data.ezlab.org/v5/data/file_versions.tsv (copy in `src/s10_busco_docs/`): odb10 dated
   2024-01-08, odb12 2026-05-22, odb12.2 2026-05-13; lineage names quoted (rodentia and squamata only odb12/12.2).
   `mammalia_odb10/dataset.cfg` streamed from the tarball: number_of_BUSCOs=9226, number_of_species=24, OrthoDB 10.1.
4. miniprot manpage https://raw.githubusercontent.com/lh3/miniprot/master/miniprot.1 : `st` tag = number of in-frame
   stop codons, `fs` = frameshifts; frameshifts and in-frame stops share one penalty (-F default 23); `--outs` meaning.
5. compleasm README https://github.com/huangnengCSU/compleasm (v0.2.10, 2026-10-07): odb10/odb12/odb12.2 support, default
   `--odb odb12`, `download`/`run` syntax, -L library path, classes S/D/F/I/M, summary.txt.
   Paper: Huang & Li 2023 Bioinformatics 39:btad595, doi:10.1093/bioinformatics/btad595 (PubMed 37758247): 14x faster
   on human, 99.6 % vs BUSCO 95.7 %, CHM13 annotation 99.5 %.
6. Project numbers: the internal project-facts sheet sections 1.3, 1.6, 1.7, 2.2-2.4 only.

## Computed / derived
- 23 of 549 single-base substitutions in the 61 sense codons give a stop codon (checked by enumeration in Python).
- For randomly placed breaks (exponential contig lengths) N50 ~ 1.678 x mean contig length (median of Gamma(2));
  used only for the toy.
- Illustrative counts in the "simple explanation" (9,000 / 150 / 80 / 146 of 9,226) are made up (changed 2026-11-01 so
  they no longer reproduce an unpublished assembly's percentages); labelled illustrative.
- Species C vs B error-rate ratio = 3.4 (page says "more than three-fold"). Species A-D are unpublished: table values rounded.

## Not verified / left out
- Number of genes in `mammalia_odb12.2` (tarball 2.27 GB; the streaming read did not reach dataset.cfg). Not stated.
- BUSCO run time and peak RAM for a mammal genome: not recorded in our projects, not stated in the user guide. Left out.
- Why E is ~9 % even in a chromosome-level reference: cause not established; the page only says it is a baseline
  that does not track base accuracy (supported by species B vs C numbers).
- Whether MetaEuk/Augustus turn frameshifted genes into Fragmented: not checked; the page does not claim it.
- The firewall explanation of the hang is an inference from the missing timeout; the page words it as "can".
- The toy's thresholds (90 % coding on one piece = complete, 20 % = missing floor, >=4 errors = fragmented, 80/20
  indel/substitution mix, 9 % baseline E) are toy choices, stated as such in "Toy rules".
- The section's JS adds its own copy-button handlers (guarded by data-s10); if the merged page also has a global
  handler, the click copies twice (harmless).

## Suggested cross-links
- s06 (purge_dups) and s07 (primary/haplotypes, hap1 glob bug) from the D row and "Reading the numbers".
- s08 (QV, N50) from the lede and the "base errors" bullet.
- s04: species B/C coverage vs contiguity; s11: mitochondrial contigs are irrelevant to BUSCO but must be removed.
