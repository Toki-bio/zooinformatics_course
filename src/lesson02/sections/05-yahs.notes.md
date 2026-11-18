# s05 Long-range data and chromosome-level scaffolding: notes

Files: `05-yahs.html`, `05-yahs.js`, `05-yahs.css` (2 rules: `.seg` wrap inside `#s05-wrap`), this file.
Test helpers (mine, can be deleted): `lesson2/s05_test.js`, `lesson2/s05_crop.js`, `sections/s05_*.png`.
Source clones: `lesson2/src/s05/` (yahs, mapping_pipeline, PretextMap, PretextView, rapid-curation, SALSA, 3d-dna,
pin_hic, RagTag, omnic, vgp_tutorial.md).

## Sources (URL, version, what was taken)

- **YaHS** https://github.com/c-zhou/yahs, commit 6c46061 (2024-11-04), `version.h` = 1.2.2.
  - README: inputs (FASTA + .fai; BAM/BED/PA5/BIN), file type from extension or `--file-type`; mark duplicates
    recommended; pipelines listed (Arima, Omni-C, HiC-Pro); NOTE 1 name-sorted vs coordinate-sorted BAM (middle vs start
    positions, `-q` suppressed when not name-sorted); output files (`*_inital_break_NN.agp`, `*_rNN.agp`,
    `*_rNN_break.agp`, `*_scaffolds_final.agp/.fa`); options -o -a -r -R -e -l -q --no-contig-ec --no-scaffold-ec
    --no-mem-check --telo-motif; enzyme strings GATC (DpnII, Dovetail), GATC,GANTC (Arima 2-enzyme),
    GATC,GANTC,CTNAG,TTAA (Arima 4-enzyme); warning that -e may not help / may worsen noisy long-read assemblies;
    juicer pre / juicer_tools pre / JBAT (-a) / juicer post commands; >2 Gb scale factor + Juicebox Assembly > Set Scale;
    limitations (rare telomere-to-telomere false joins, 45,000 contigs, high memory); "<5 minutes ... human ... 5,483
    contigs with ~45X Hi-C".
  - `yahs.c`: help text and defaults (-q 10, -R 1, -l 0, -o default `yahs.out` in code; README says "yash.out", a typo),
    `default_resolutions` 10 kb ... 500 Mb, `default_nr` upper limit by genome size (2-5 Gb -> 50 Mb), MAX_N_SEQ 45000,
    contig EC bin 1000 (`ec_bin`), EC repeated until no breaks, round logic (round only if N50 >= 10 x resolution,
    `max_extra_try` = 3, smaller resolution retried), `trim_graph_simple_filter(g, .1, .7, .1, 0)` (edge kept if
    wt >= 0.1 and >= 0.7 x best at that end), graph trimming sequence, telomeric ends excluded from joins
    (`build_graph_from_links`), final AGP sorted (`write_sorted_agp`), log prints N50/N90/N100 and peak RSS.
  - `link.c`: `#define USE_MEDIAN_NORM` -> expected intra-contig contacts per distance band = median; noise subtracted;
    per-cell ratio capped at 1 (`MIN(1., l / norms[b + 1])`); 4 orientations; `calc_link_directs`.
  - `sdict.c` / `agp-spec.h`: AGP defaults W components, gap type U, 100 bp (`DEFAULT_AGP_U_GAP_SIZE`), gap type
    scaffold, linkage evidence proximity_ligation; scaffolds named `scaffold_N`.
  - `parse_bam_rec`: `flag & 0xF04` skipped (unmapped 0x4, secondary 0x100, QC fail 0x200, duplicate 0x400,
    supplementary 0x800).
- **YaHS paper**: Zhou, McCarthy, Durbin 2023, Bioinformatics 39(1) btac808
  (https://academic.oup.com/bioinformatics/article/39/1/btac808/6917071). Algorithm outline (break at positions
  lacking Hi-C coverage; chunks/intra/inter cells; normalised by median of intra-cells; RE normalisation; 4
  orientations; graph pruning; hierarchical rounds) and benchmark N50/N90 on simulated CHM13 (YaHS 132.6/36.5 Mb,
  SALSA2 43.9/3.3, pin_hic 51.5/8.5). Read via WebFetch summary, not the full PDF.
- **Arima mapping pipeline** https://github.com/ArimaGenomics/mapping_pipeline, script header "07/26/2023":
  per-read `bwa mem`, `filter_five_end.pl`, `two_read_bam_combiner.pl` with MAPQ_FILTER=10, Picard
  AddOrReplaceReadGroups + MarkDuplicates REMOVE_DUPLICATES=TRUE. (Script indexes with `-p $PREFIX` but aligns to
  `$REF`; page uses plain `bwa index contigs.fa`.)
- **Dovetail Omni-C docs** https://github.com/dovetail-genomics/Omni-C (docs/source, last commit 2021-07-20; site now
  redirects to dovetail-analysis.readthedocs.io): `bwa mem -5SP -T0`, flag meanings (tables/alignment.csv), bwa >= 0.7.17
  for -5, pairtools parse options; "sequence-independent endonuclease"; "up to 20% of the genome lacks coverage using
  restriction enzyme based Hi-C approaches" (vendor claim; page attributes it to the kit documentation).
- **VGP Galaxy tutorial** https://github.com/galaxyproject/training-material/.../vgp_genome_assembly/tutorial.md
  (main branch, fetched 2026-10-31): Hi-C protocol description (crosslink, digest, biotin fill, ligate, read pairs),
  map each read separately, BWA-MEM2 + "Filter and merge" (bellerophon), PretextMap/Snapshot, YaHS in WF8, cis contacts
  and distance decay explanation.
- **Lieberman-Aiden et al. 2009** Science 326:289 (PubMed 19815776, doi 10.1126/science.1181369): Hi-C =
  proximity-based ligation + sequencing; chromosome territories. Formaldehyde as the fixative is from the paper's
  methods (well known; not re-read in full here).
- **PretextMap** https://github.com/sanger-tol/PretextMap (meson version 0.2.4, last commit 2026-03-04): stdin SAM/pairs,
  `--sortby`, `--mapq` default 10, `--highRes` 16 GB, `--ultraRes` 40 GB, default 3 GB, 30-50 MB maps.
- **PretextView** https://github.com/sanger-tol/PretextView README: edit mode, tracks (coverage, telomere, gap,
  repeat_density), Generate AGP.
- **sanger-tol/rapid-curation** README + `Interpreting_HiC_Maps_guide.pdf`: map patterns table (joins, orientation from
  corner, imposter, haplotypic duplication with half coverage, tandem repeats, contamination with no signal, sex
  chromosomes half coverage); pretext-to-asm (agp-tpf-utils).
- **SALSA** https://github.com/marbl/SALSA (last commit 2024-05-17): name-sorted BED, GFA, -e incl. DNASE, Python 2.7.
- **3D-DNA** https://github.com/aidenlab/3d-dna (last commit 2023-11-29): iterative misjoin correction, megascaffold
  split into chromosomes; Dudchenko et al. 2017.
- **pin_hic** https://github.com/dfguan/pin_hic (last commit 2021-12-22): `bwa mem -SP -B10`, dual selection, 3
  iterations default.
- **RagTag** https://github.com/malonge/RagTag v2.1.1 (`get_ragtag_version`), `ragtag_scaffold.py`: minimap2 `-x asm5`
  default, `-r` infer gaps else 100 bp, `-g` 100; wiki scaffold page: does not alter query sequence.
- Lesson 1 (`pre_assembly.html`): EBP 6.C.Q40 + 90 % assigned to chromosomes; VGP >= 60x Hi-C; WF8 YaHS.
- the internal project-facts sheet: all "In our projects" facts (species B/C contig level, Pore-C declined, species A contigs vs
  a published chromosome-level relative, Hi-C ~45x recommended, RagTag only for WGA/TOGA2; species A-D unpublished, so rounded/relative only,
  Desmana RagTag 2.1 onto Galemys + thousands of duplicated copies among the N-runs, C. sokolovi N50 267.7 Mb).

## Verified facts used on the page
All commands, defaults and file names above were read from the README or source listed. YaHS speed (<5 min human)
is the README's own statement.

## Not verified / deliberately left out
- chromap: the scope asked to check it; YaHS docs do not mention chromap, so it is not on the page.
- Hi-C power-law exponent (contact ~ s^-1) left out: the abstract I could access does not state it.
- YaHS run time / memory on a 2.5-3 Gb mammal: no source; not given.
- Whether YaHS checks sequence overlap at joins: not verified; page only says it writes a fixed 100 N and suggests
  checking joins.
- "Species A quote requested" (in the task scope) is NOT in the internal project-facts sheet, so the page does not mention a quote.
- Pore-C details beyond "same ligation idea, long reads, needs long DNA" not sourced in depth (PretextMap README notes
  long-read Hi-C support; provider decline from facts).
- Toy contact map and "YaHS-like" join use simplified rules (1/(1+d) decay, 3-bin end windows, score cut-off 0.35,
  break ratio < 0.3); labelled as toy on the page, not YaHS's real thresholds.

## Suggested cross-links
- s06: 100-N placeholders at YaHS/RagTag joins, gap closing, purge_dups for haplotypic duplication seen in maps.
- s07: Hi-C phasing in hifiasm; scaffold hap1/hap2 separately (VGP does this).
- s08: scaffold N50 vs contig N50, telomere checks after scaffolding.
- s09: contigs with no Hi-C signal as contamination candidates.
- s12: half-coverage chromosome squares = X/Z.
- s13: AGP needed for submission.

## Long-range methods part (added 2026-11-18)
Quotes collected by four research agents (Sonnet) from opened sources; checked into this list by hand. "DLS" = "Direct Label and Stain" and enzyme DLE-1: Bionano protocol titles (bionano.com, CG-30553 DLS G2 protocol; Saphyr DLS G2 protocol dated 2025-10). The DLE-1 motif was NOT verified and is not named on the page. Toy reach values are rough orders of magnitude (mate pairs 40 kb, linked reads 300 kb, Chicago 500 kb, optical maps 1 Mb, Hi-C 200 Mb), stated as such on the page.
## Optical maps (agent 1)
- Yuan, Chung, Chan 2020 CSBJ 18:2051 PMC7419273: "optical mapping uses a light microscope-based technique to physically locate specific enzymes or sequence motifs"; "selected enzymes are used to fluorescently label DNA molecules"; Bionano "applies nanochannel-array fluidics technology to produce optical maps"; "The average molecule length of optical maps (~225 kb)"; uses: "facilitate genome scaffolding, genome-assembly completeness validation, and large-scale structural variation detection". Resolution "up to 500 bp" (tool summary, not exact). DLE-1 labels "without damaging it", nicking -> "double strand breaks at 'fragile sites'" (paraphrase risk).
- Zavitan wheat G3 2019 PMC6404602: "The DLS chemistry does not nick DNA, which eliminates the site-specific breaking"; "HMW DNA was labeled with the DLE-1 enzyme"; DLS map "601 contigs with N50 = 56.79 Mb" vs NLRS N50 2.14 Mb; Table 1 molecule minlen 150 kb (DLS) / 180 (NLRS), molecule N50 284 / 341 kb; Bionano Solve v3.2; "The 47 scaffolds with conflicting regions were corrected by breaking the sequences at positions containing Ns."
- GTN VGP tutorial https://training.galaxyproject.org/topics/assembly/tutorials/vgp_genome_assembly/tutorial.html: hybrid scaffolding to "resolve chimeric joins, and estimate the length of gaps between adjacent contigs"; steps "Generate in silico maps...", "Align in silico sequence maps against Bionano genome maps to identify and resolve potential conflicts", "Merge the non-conflicting maps into hybrid scaffolds"; "optical maps can introduce sized gaps"; trajectories "HiFi + BioNano", "HiFi + Hi-C + BioNano"; Bionano optional.
- Bionano Q3 2026 release (SEC, 2026-11-10) https://www.sec.gov/Archives/edgar/data/0001411690/000141169026000058/bngo-ex99_1.htm: "The Company offers OGM solutions for applications across basic, translational and clinical research"; going-concern language; Stratys system, VIA software; Saphyr not mentioned.
- NOT FOUND/unverified: CTTAAG motif (snippet only), DLS year, Saphyr status, DNA amounts.

## History / standards (agent 4)
- Rhie et al. 2021 Nature PMC8081667 (read via PMC tool): contigs "FALCON and FALCON-Unzip ... CLR"; s1 "10X Genomics linked reads were aligned to the primary contigs (p1), and an adjacency matrix was computed from the barcodes using scaff10x"; s2 "Bionano cmaps ... used to further scaffold the s1 assembly"; s3 "Hi-C reads were aligned to the s2 scaffolds using the Arima Genomics mapping pipeline ... scaffolding with Salsa2"; "Scaffolds generated with all three scaffolding technologies ... were approximately 50% to 150% longer than those generated using one or two technologies"; "long-range linking information (40 kb to more than 100 Mb), generated using eight technologies"; curation "a Hi-C suggested join would not be made unless supported by BioNano maps, long-read data, or gene alignments."
- VGP phase-one page https://vertebrategenomesproject.org/phase-one: "Version 1.0 of our pipeline featured PacBio CLR reads and scaffolding with 10X Genomics linked reads, Bionano optical maps, and Arima Hi-C sequencing. With the advent of PacBio Hifi, Version 2.0 of our pipeline now utilizes PacBio HiFi reads for the initial assembly".
- GTN VGP tutorial table: "HiFi | The minimum requirement", "HiFi + BioNano | Better contiguity", "HiFi + HiC | Better haplotype resolution (fewer switch errors)"; "Bionano Solve (optional)"; Bionano then Hi-C (YaHS).
- DToL genome note, Calonectris borealis, Wellcome Open Res 2024 9:678: "sequenced using Pacific Biosciences single-molecule HiFi long reads"; "using the Arima-HiC v2 kit"; "scaffolded using the provided Hi-C data" "in YaHS ... using the --break option".
- EBP Report on Assembly Standards v7 (Jan 2026) https://www.earthbiogenome.org/report-on-assembly-standards: "minimum reference standard of 6.C.Q40"; "Current long read and long-range (Hi-C) methods require input DNA masses of 0.5 to 10 µg."; T2T "based on high quality long reads combined with ultralong reads"; phasing "long range phasing data from Hi-C or (ultra)long reads". No optical maps or linked reads mentioned.
- T2T-CHM13 Nurk 2022 PMC9186530: data incl. "30× PacBio ... HiFi", "120× Oxford Nanopore ultra-long", "70× Illumina / Arima Genomics Hi-C", "BioNano optical maps", "Strand-seq"; "Mapped Strand-seq ... and Hi-C ... data show no signs of misorientations or other large-scale structural errors."
- Ghurye & Pop 2019 PLoS Comput Biol PMC6550390: "to hundreds of thousands of base pairs (linked reads and optical maps) to millions of base pairs (Chicago and Hi-C)"; mate pairs "usually spanning thousands to tens of thousands of base pairs". Table values (tool summary, unverified): mate pairs 1-10 kb, optical maps 10-100 kb(?), 10x 100 kb, Hi-C 30-100 Mb.

## Linked reads (agent 3)
- Weisenfeld et al. 2017 Genome Res PMC5411770: "Template gDNA (1.25 ng) was partitioned across approximately 1 million GEMs"; "supposing that all molecules had size 50 kb, the mean number of molecules per partition would be about 10, in total representing ∼0.5 Mb of the genome per partition"; scaffolding "candidate lines ... sharing many of the same barcodes"; Supernova "contigs longer than 100 kb, phase blocks longer than 2.5 Mb, and scaffolds longer than 15 Mb"; limits: smaller genomes "mean number of Linked-Reads per molecule would be about six, and the distance between Linked-Reads would be about 8 kb".
- ARCS/ARKS README github.com/bcgsc/arcs: ARCS "uses alignments of linked reads to the input contigs"; ARKS "exact k-mer mapping". Scaff10X github.com/wtsi-hpag/Scaff10X: "A relation matrix is built to record the shared barcodes among the contigs which may be linked".
- Discontinued: UGA core (15 Jan 2020) https://dna.uga.edu/10x-genomics: "The 10X Genomics Chromium Genome and Exome kits will be discontinued as of Feb. 18, 2020." Bio-Rad litigation link UNCERTAIN (don't state as cause).
- stLFR Wang 2019 Genome Res PMC6499310: "adding the same barcode sequence to subfragments of the original long DNA molecule (DNA cobarcoding)"; "uses the surface of microbeads"; "20- to 300-kb genomic DNA fragments". TELL-Seq Chen 2020 Genome Res 30:898: "In a PCR tube, millions of clonally barcoded beads ..."; "as little as 0.1 ng input". Haplotagging Meier 2021 PNAS PMC8237668: "a simple, low-cost linked-read sequencing technique that allows sequencing of hundreds of individuals"; "85 million molecular barcodes".
- Rhie 2021 Fig 2a: "generate scaffolds with linked reads using Scaff10x; break mis-joins and further scaffold with optical maps using Solve; generate chromosome-scale scaffolds with Hi-C reads using Salsa2; fill in gaps and polish base-errors with CLR using Arrow; perform two or more rounds of short-read polishing with linked reads using FreeBayes".

## Proximity ligation (agent 2)
- Lieberman-Aiden 2009 Science (PDF aidenlab.org/papers/Science.Genome.Folding.pdf): "cells are crosslinked with formaldehyde; DNA is digested with a restriction enzyme that leaves a 5 overhang; the 5 overhang is filled, including a biotinylated residue; and the resulting blunt-end fragments are ligated under dilute conditions ..."; "Biotinylated junctions are isolated with streptavidin beads and identified by paired-end sequencing"; I(s) "decreases monotonically on every chromosome"; "Interchromosomal interactions are depleted relative to intrachromosomal interactions."
- Burton 2013 LACHESIS abstract: Hi-C data "are a rich source of long-range information for assigning, ordering and orienting genomic sequences to chromosomes". Dudchenko 2017 3D-DNA abstract: "combine Hi-C data with existing draft assemblies to generate chromosome-length scaffolds."
- Putnam 2016 Genome Res PMC4772016 (Chicago): "a simpler approach ("Chicago") based on in vitro reconstituted chromatin"; "combining the DNA with purified histones and chromatin assembly factors ... fixed with formaldehyde"; "useful linking information for separations up to 150 kbp for L1 and L2 and up to 500 kbp for L3, consistent with the expected maximum size of input DNA fragments"; HiRise "can identify poor quality joins and produce accurate, long-range sequence scaffolds"; input "5 μg of high-molecular-weight DNA".
- Omni-C: launch 13 Aug 2019 (biospace) restriction-enzyme Hi-C "generate data only near the restriction enzyme sites", missing "around 20% in human genomes"; product page "moves away from the limitations and bias faced by traditional restriction-enzyme based Hi-C", "uniform sequence coverage"; NGI: "A proximity-ligation protocol using a sequence-independent endonuclease"; NGI intake "20 to 40 mg of non-fatty soft tissue (internal organs)".
- Ownership: cantatabio.com/dovetail-genomics "Dovetail Genomics, Part of Cantata Bio LLC". Arima pages redirect to Active Motif (unverified meaning).
- Pore-C Deshpande 2022 NBT abstract: "combines chromatin conformation capture with nanopore sequencing of concatemers to profile proximal high-order chromatin contacts at the genome scale." Assembly use NOT verified.
- CiFi Nat Commun 2025 doi 10.1038/s41467-025-66918-y: "coupling chromosome conformation capture (3C) with PacBio HiFi long-read sequencing"; "as little as 60,000 cells (sub-microgram DNA)"; "multi-kilobasepair HiFi reads that contain multiple interacting, concatenated segments"; phase "80.3% of CiFi segments compared to 10.9% of Hi-C reads". PacBio PR 8 Jan 2026: "chromosome-scale, haplotype-resolved genome assemblies from a single sequencing run".
- hifiasm README: "Hifiasm can generate a pair of haplotype-resolved assemblies with paired-end Hi-C reads"; "Hifiasm does not perform scaffolding for now." Cheng 2022 NBT abstract: "combines PacBio HiFi reads and Hi-C chromatin interaction data to produce a haplotype-resolved assembly without the sequencing of parents."
