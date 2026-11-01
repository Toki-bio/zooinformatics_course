# s05 Chromosome-level scaffolding with Hi-C and YaHS: notes

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
  Desmana RagTag 2.1 onto Galemys + 19,250 duplicated copies among 66,963 N-runs, C. sokolovi N50 267.7 Mb).

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
