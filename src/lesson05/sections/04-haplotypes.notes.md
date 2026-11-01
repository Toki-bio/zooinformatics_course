# s04 Methylation on each parental copy: notes and sources (2026-10-31)

## Sources (URL, version, what was taken)
- WhatsHap guide, tag v2.8 (commit date 2025-06-08): https://github.com/whatshap/whatshap/blob/v2.8/doc/guide.rst
  - basic command `whatshap phase -o phased.vcf --reference=reference.fasta input.vcf input.bam`; `--reference` "highly recommended, in particular for error-prone reads (PacBio, Nanopore)"; `--ignore-read-groups` for one sample with missing or incorrect read groups.
  - "WhatsHap can use any read that covers at least two heterozygous variant calls".
  - PS = phase set / block; `whatshap stats` and `--tsv`.
  - haplotag: needs `.vcf.gz`/`.bcf` with an index; tags `HP:i:1`/`HP:i:2` and `PS`; reads without a het variant stay untagged; alleles re-detected by local realignment; mismatch cost = variant QUAL, lowest sum wins; HP number taken from the GT order (`1|0` means haplotype 1 has ALT); tagged reads need not be the ones used for phasing; IGV colouring by tag PS/HP; supplementary alignments skipped by default.
- WhatsHap source `whatshap/cli/haplotag.py` at v2.8: options `--output-haplotag-list`, `--tag-supplementary` (default skip), `--output-threads`, `--ignore-read-groups`; tags set with pysam `set_tag("HP"/"PC"/"PS")`, other tags (MM/ML) untouched: our reading of the code.
- modkit book at tag v0.6.4 (release 2026-06-11): https://github.com/nanoporetech/modkit/tree/v0.6.4/book/src
  - intro_pileup.md: `--phased` writes hp1.bedmethyl, hp2.bedmethyl, combined.bedmethyl; example `modkit pileup path/to/reads.bam output/directory/ --cpg --modified-bases 5mC 5hmC --ref <reference.fasta> --phased`; only primary alignments used; bedMethyl column 10 = Nvalid_cov, column 11 = percent modified.
  - advanced_usage.md (pileup help): `--phased` "Currently only supports diploid genomes"; `--cpg` = `--motif CG 0`; `-r/--reference` alias `ref`; `--log-filepath` (alias log); `-t` default 4; IN_BAM "should be sorted and have associated index"; `--combine-strands` needs MN tags; "Modkit is a bioinformatics tool for working with modified bases from Oxford Nanopore".
  - migrating_060.md: "Use `--phased` instead of `--partition-tags`. The `--phased` flag is a more performant version of `--partition-tags HP`." The task brief said `--partition-tag HP`; the page teaches `--phased` and names the old flag.
- LongPhase README at v2.1.2 (release 2026-10-25): https://github.com/twolinin/longphase/blob/v2.1.2/README.md
  - `--ont`/`--pb` required; `modcall -b -r -t -o`; `phase -s --mod-file modcall.vcf -b -r -t -o --ont`; haplotag `-q` default 1 (mapping quality), `-p` 0.6; modcall reads MM/ML; carrying tags: `samtools fastq -T '*'` then `minimap2 -y`.
  - Benchmark text: "methylation lengthens blocks essentially for free — N50 rises from 2.87 to 3.09 Mb at 60× with no change in switch error rate" (authors' own benchmark, human).
  - Citation: Lin J-H et al. 2022 Bioinformatics, doi 10.1093/bioinformatics/btac058.
- pb-CpG-tools README at v3.0.0 (release 2025-01-28): https://github.com/PacificBiosciences/pb-CpG-tools/blob/v3.0.0/README.md : `aligned_bam_to_cpg_scores`; hap1/hap2 bed and bigWig when HP tags are present; `--hap-tag` (values 0/1/2). Its example-data URL https://downloads.pacbcloud.com/public/dataset/HG002-CpG-methylation-202202/ returned 404 (curl, 2026-10-31).
- samtools view manual (1.25, 27 Oct 2026) https://www.htslib.org/doc/samtools-view.html : `-d STR1[:STR2]`, e.g. `-d XX:42` selects `XX:i:42`.
- bgzip/tabix: standard htslib, `tabix -p vcf` (https://www.htslib.org/doc/tabix.html, not re-read today).
- ONT Open Data giab_2023.05: https://epi2me.nanoporetech.com/giab-2023.05/ (HG001-HG004; HG002 "PGP Ashkenazi Son", HG003 father, HG004 mother). S3 listing (https://ont-open-data.s3.amazonaws.com/?list-type=2&prefix=giab_2023.05/ ...) checked 2026-10-31: pod5_pass/ and pod5_fail/ in flowcell folders of hg001-hg004; analysis/variant_calling/<sample>_sup_60x (hg004: _sup_all) contains `<s>.haplotagged.bam`, `<s>.hap1.methyl.cpg.bed.gz`, `<s>.hap2.methyl.cpg.bed.gz`. First 3 MB of hg002.haplotagged.bam: @PG whatshap VN:1.7 haplotag; minimap2 -y; the strings "MMZ" and "MLB" occur in the first records (MM/ML tags). hap1 bed first lines: column 10 coverage, column 11 percent (e.g. 6, 83.33).
- Coriell GM12878 sample page (https://www.coriell.org/0/Sections/Search/Sample_Detail.aspx?Ref=GM12878): female, B-lymphocyte LCL.

## Papers (abstracts via PubMed unless stated)
- Akbari V et al. 2023 Cell Genomics 3:100233, doi 10.1016/j.xgen.2022.100233: imprinted loci "show little variation across tissues, individuals, and populations"; parent of origin of all autosomes from nanopore methylation plus Strand-seq, without parental DNA; five trios.
- Fu Y et al. 2024 Nat Commun 15:5327, doi 10.1038/s41467-024-49588-0 (MethPhaser): extends SNV phasing with ONT methylation; "increase the phase length N50 by 78%-151% at a phasing accuracy of 83.4-98.7%" (R9/R10 cell lines); "can also be extended to non-human diploid genomes".
- Gigante S et al. 2019 Nucleic Acids Res 47:e46, doi 10.1093/nar/gkz107: about 10x nanopore coverage gives both methylation and haplotype per read; known ICRs identified. "Mouse" from the MeSH terms (Mice, Placenta, Embryo); full text not read.
- Loebel DA, Johnston PG 1996 Genome Res 6:114, doi 10.1101/gr.6.2.114: paternal XCI in rodent extraembryonic membranes and all marsupial tissues; CpG island methylation on the eutherian inactive X; common wallaroo G6PD CpG island hypomethylated in male and female; "methylation of CpG islands is not required for maintenance of X inactivation in marsupials".
- Onuchic V et al. 2018 Science 361:eaar3146, doi 10.1126/science.aar3146: sequence-dependent CpG methylation imbalance at thousands of heterozygous loci.
- Peeters SB, Yang C, Brown CJ 2016 Semin Cell Dev Biol 56:71, doi 10.1016/j.semcdb.2016.01.044: XCI randomly silences one X; skewing; mouse Xce.
- Renfree MB et al. 2008 Reproduction 136:523, doi 10.1530/REP-08-0264: no DMRs in marsupial IGF2R, INS, MEST (histone modification instead); DMRs at H19, IGF2, PEG10; no evidence of imprinting in monotremes.
- Renfree MB et al. 2009 Annu Rev Genomics Hum Genet 10:241, doi 10.1146/annurev-genom-082908-150026: imprinting in eutherians and marsupials, no evidence in monotremes.
- Renfree MB, Suzuki S, Kaneko-Ishino T 2013 Phil Trans R Soc B 368:20120151, doi 10.1098/rstb.2012.0151: marsupials imprint "fewer loci"; gDMR established in the male or female germline.

## Lab facts used (lesson 5 project-facts sheet, sections 2 and 5)
- Species A (a rodent): WhatsHap phased nearly all het SNPs; long contigs in one or two blocks; male, half-depth X contigs present; FASTQ without model tags, no raw signal; platform probably CycloneSEQ (unverified, written as "probably").

## Our inference (marked on the page or phrased as expectation)
- modkit `--phased` splits by HP only, so a genome-wide hp1 table mixes parents across phase blocks: inference from WhatsHap's definition of HP (arbitrary per block) plus modkit's description (HP=1 / HP=2 only).
- Using imprinted-region methylation to label hap1/hap2 of a diploid assembly: extension of Akbari et al., stated as untested.
- ICR expected near 100/0 % in a body tissue; hemizygous Z in female birds cannot be phased: logic from the definitions.
- 30x total gives about 15x per copy: arithmetic.
- Toy: 13 CpGs, 2 SNPs, call error 4 %, equal numbers of reads per copy, X cells in exact proportion to the slider, read length uniform 0.5-1.5x the slider value; mother's copy methylated in the imprinted toy (real ICRs differ in which parent is methylated).

## Not verified / left out
- Whether modkit works on PacBio modBAMs: not claimed; the page points HiFi users to pb-CpG-tools.
- LongPhase output file names after `-o`: not stated on the page.
- MethPhaser commands: not shown (repository not read).
- Whether CycloneSEQ offers 5mC calling: not stated (s02 covers the platform).
- Imprinting in birds and reptiles: not discussed (no source read).

## Cross-links
- ../03-annotation/#s09 (SNV calling), ../02-assembly/#s12 (sex chromosomes by depth), ../02-assembly/#s07 (hap1/hap2 products), #s02, #s03, #s06, #s07 of this lesson.

## Re-check 2026-11-01
- Re-fetched modkit v0.6.4 migrating_060.md and intro_pileup.md: `--phased` replaces `--partition-tags HP`; outputs hp1/hp2/combined.bedmethyl; hp1/hp2 count records with HP=1 / HP=2. Confirmed.
- Re-fetched LongPhase v2.1.2 README: `--mod-file modcall.vcf` example; "N50 rises from 2.87 to 3.09 Mb at 60x with no change in switch error rate" (benchmark of v2.1.1, human HG002). Confirmed.
- Toy clicked through at 1100 and 420 px (all three region types, phasing on/off, short reads, X skew 90 %, "new sample" x4): no console errors, no page overflow; imprinted toy pooled 49 % -> HP1 3 % / HP2 98 %.
- Tooltips added for VCF, modBAM, bigWig.
