# s05 Methylation across repeats, genes and the genome: notes and sources (2026-11-01)

## Tools (URL, version, what was taken)

- **modkit** v0.6.4 (release 2026-06-11), https://github.com/nanoporetech/modkit (source read at commit 5cecc3f, 2026-06-12; `modkit/Cargo.toml` version 0.6.4). Book pages `book/src/`:
  - `intro_pileup.md`: only primary alignments are used; bedMethyl columns 10 Nvalid_cov, 11 percent modified (Nmod / Nvalid_cov x 100), 12 Nmod, 13 Ncanonical, 14 Nother_mod, 15 Ndelete, 16 Nfail, 17 Ndiff, 18 Nnocall.
  - `advanced_usage.md`, `pileup`: `--modified-bases` (long names such as 5mC, with `--combine-mods` the base alone may be passed), `--cpg`, `--combine-strands` (needs correct MN tags), `--combine-mods`, `--ref`, `--log-filepath` (alias `log`), `--bgzf`; `--header` switches columns past 10 to spaces; elsewhere `--only-tabs` is described as deprecated because "The default output has all tab-delimiters". No mapping-quality option in the pileup help; `grep mapq` over the modkit source returned no hits, hence the advice to filter with `samtools view -q` first (our recommendation).
  - `stats`: `modkit stats <bedMethyl.gz> --regions <bed> -o <tsv>`, input must be bgzipped and tabix-indexed, `-m/--min-coverage` default 1, `-c/--mod-codes`; output columns chrom, start, end, name, strand, then count_x, count_valid_x, percent_x per code (`intro_stats.md`, which also gives the example with `tests/resources/lung_00733-m_adjacent-normal_5mc-5hmc_chr20_cpg_pileup.bed.gz` and `tests/resources/cpg_chr20_with_orig_names_selection.bed`; both files present in the repository at that commit).
  - `localize`: `--regions`, `-w/--window` default 2000 (expands from the midpoint of a region), `--min-coverage` default 3, `-s/--stranded same|opposite`, `--stranded-features`, `--genome-sizes`, `--chart`.
  - Source `modkit/src/localise/util.rs`: `let offset = (anchor_point as i64).saturating_sub(pos);` with no strand-dependent sign change in the code read; hence the page's advice to split + and - genes. This is our reading of the code, stated as such ("In the source code we read").
- **methylartist** v1.6.0 (`setup.py` version='1.6.0'; repository https://github.com/adamewing/methylartist, commit 1b85a65, 2026-10-10). `methylartist.py`: `-q/--min_mapq` default 10 for segmeth, segplot, locus, region, composite; segmeth `--excl_ambig` help "do not consider reads that align entirely within segment" (function `exclude_ambiguous_reads` keeps reads whose aligned positions extend beyond the segment on either side and pass MAPQ); `--spanning_only`. README: segmeth "Required before generating strip / violin plots with segplot"; segplot `-v/--violin`, ridge plots `-g/--ridge` (new in 1.0.7); composite "multiple per-element profiles are aligned to and plotted against a reference sequence". Paper: Cheetham SW et al. 2022 Bioinformatics 38:3109, doi 10.1093/bioinformatics/btac292 (PMID 35482479).
- **bedtools** 2.31.1 (latest release tag), map manual https://bedtools.readthedocs.io/en/latest/content/tools/map.html (source docs/content/tools/map.rst): requires sorted inputs; `-c`, `-o` (sum, mean, ...); `-null` default ".". intersect `-wa -wb` writes A then B fields (manual https://bedtools.readthedocs.io/en/latest/content/tools/intersect.html).
- **samtools** 1.25 view manual https://www.htslib.org/doc/samtools-view.html : `-q INT` minimum MAPQ, `-b`, `-o`. bgzip/tabix `-p bed`: htslib manuals.
- **RepeatMasker** 4.2.6 `repeatmasker.help` section 3.1 (as used in lesson 3 section 04): .out has 3 header lines; column 2 perc div. (mismatches), 5 query sequence, 6 begin, 7 end, 9 strand (+ or C), 10 repeat name, 11 class/family. Kimura divergence lives in the .align file (lesson 3 section 04 notes, `calcDivergenceFromAlign.pl`).

## Papers (abstracts via PubMed; full text where stated)

- Gardiner-Garden M, Frommer M 1987 J Mol Biol 196:261, doi 10.1016/0022-2836(87)90689-9: islands at the 5' ends of all housekeeping genes and many tissue-specific genes. The numeric criteria (200 bp, G+C 50 %, O/E 0.6) quoted as cited by Takai & Jones 2002.
- Takai D, Jones PA 2002 PNAS 99:3740, doi 10.1073/pnas.052410099: > 500 bp, G+C >= 55 %, O/E 0.65, excludes most Alu elements.
- Ball MP et al. 2009 Nat Biotechnol 27:361, doi 10.1038/nbt.1533: "low promoter methylation and high gene-body methylation in highly expressed genes".
- Zemach A et al. 2010 Science 328:916, doi 10.1126/science.1186366: 17 eukaryotic genomes; gene-body methylation conserved between plants and animals, selective methylation of transposons is not.
- Deaton AM, Bird A 2011 Genes Dev 25:1010, doi 10.1101/gad.2037511: CGIs "predominantly nonmethylated"; silencing of CGI promoters through dense CpG methylation or polycomb.
- Ziller MJ et al. 2013 Nature 500:477, doi 10.1038/nature12433: 42 WGBS data sets, 30 human cell and tissue types; 70-80 % of all CpGs methylated, except germ cells and pre-implantation embryos.
- Zhou W et al. 2020 PNAS 117:19359, doi 10.1073/pnas.1921719117: 53 organisms; genome size correlates positively with TE percentage and negatively with CpG O/E in TEs and host DNA; methylation needed for long-term TE accommodation.
- Ewing AD et al. 2020 Mol Cell 80:915, doi 10.1016/j.molcel.2020.10.024: nanopore TE methylation in hippocampus, heart, liver, paired liver tumour; demethylation of young L1 in cancer; SVA "near-universally methylated"; "demethylation of aberrantly expressed young LINE-1s in normal tissues".
- Gershman A et al. 2022 Science 376:eabj5089, doi 10.1126/science.abj5089 (full text PMC9170183 read): HG002 "75% median methylation" with "a secondary peak of unmethylated CpGs largely reflecting unmethylated CpG islands"; CHM13 "dramatically hypomethylated (36.8% median"; nanopore "surveyed more CpGs (10%, 3.18 M)" than WGBS; "165Mbp of sequence with a score of 0 (highly unmappable) is enriched in SDs and satellite DNA"; centromere analysis on reads > 50 kb.
- Hoyt SJ et al. 2022 Science 376:eabk3112, doi 10.1126/science.abk3112 (full text PMC9301658): older truncated elements (AluJ, AluS) "low CpG content and higher divergence"; L1Hs: "a methylation peak followed by a hypomethylated TSS".
- Altemose N et al. 2022 Science 376:eabl4178, doi 10.1126/science.abl4178 (full text PMC9233505): "Active αSat arrays also have generally high CpG methylation ... and contain local regions of reduced CpG methylation called centromere dip regions (CDRs)"; strongest CENP-A enrichment near and within CDRs; bSat and γSat "contain dense CpG methylation".
- Xing J et al. 2004 (Alu CpG ratio about 6): cited via the lab note, not re-read.

## Lab facts used (lesson 5 project-facts sheet, sections 0, 2 and 4)

- No lab genome has methylation calls; species A reads were FASTQ without raw signal.
- CpG : non-CpG substitution ratio, young plates (non-CpG density < 0.08): human 5.8, *Rhinolophus sinicus* 5.8 (r9 8.8), *Rousettus leschenaultii* 6.3, zebrafish 2.7, *Timema* 1.5; old bat families 0.9-1.9. Code: public repo Toki-bio/SINE-discriminator (visibility PUBLIC, checked 2026-10-31 per facts sheet).
- Species B/C long reads: short mean length; species A reads several times longer (lesson 2 facts; exact values withheld).

## The toy model (all invented; JS 05-repeats-genes.js)

- 2-Mb chromosome, seed fixed. Background CpG about 1 per 100 bp, true level 80 % ± 7 % (normal noise, clipped).
- 40 genes, 8-50 kb: 20 active with island (island 3 %, body 86 %), 8 silent with unmethylated island (5 %, body 62 %), 4 silenced with methylated island (85 %, body 62 %), 8 without island (body 78 %). Islands span TSS -700 to +500 bp in gene direction, CpG every 6-18 bp. Levels are illustrative, chosen to match the qualitative pattern of Ball 2009 / Deaton & Bird 2011, not measured values.
- TEs: 220 SINE-like (300 bp, 40 CpG/kb in consensus), 90 L1-like (6 kb full-length or 0.9-5.1 kb 5'-truncated; a quarter of CpGs in the 5' 900 bp; 70 % of copies under 4 % divergence are full-length, 8 % of older ones), 60 LTR-like (1.5 kb, 22 CpG/kb). Each consensus CpG is kept with probability exp(-6 d) (the factor 6 is the human Alu / young bat SINE ratio from the lab table, used as a decay multiplier; a simplification that ignores newly created CpGs). TE level 88 % - 0.25 d ± 6 %.
- "Switched on": young (< 3 %) full-length L1-like copies get 22 % methylation in their 5' 900 bp (qualitative after Ewing 2020; the value is invented).
- Satellite: 100 kb, 170-bp monomer with 4 CpGs, 86 %, with a 10-kb dip at 30 % (CDR-like, invented values).
- Mappability: a read over a copy is placed if (read length x distance to the closest other copy) >= 3 differences, or if it reaches >= 100 bp into unique flank. Closest-copy distance = max(0.1 %, 0.3 x divergence from consensus); satellite 0.01 %. The share of placeable reads covering a CpG scales its expected depth; depth Poisson, methylated reads binomial. These are toy rules, not an aligner model; real MAPQ depends on the aligner and the whole genome.
- Copy value: pooled calls >= 20 (same rule as the recipe). Metaplot: 200-bp bins, pooled, CpGs with >= the minimum valid reads.

## Open doubts / not verified

- modkit localize strand handling is from reading one source file; not tested on data.
- The default `modkit pileup` output being sorted was not verified, so the recipe sorts explicitly.
- Whether CycloneSEQ or the *Darevskia* "_met" HiFi run carries modification calls is unknown (facts sheet: UNVERIFIED); the page does not claim either way.
