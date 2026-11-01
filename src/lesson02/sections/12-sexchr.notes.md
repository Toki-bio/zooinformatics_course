# s12 Sex chromosomes in an assembly: notes

Files: `12-sexchr.html`, `12-sexchr.js` (no extra CSS). Tested with `node preview.js 12-sexchr` at 1100 and 420 px:
no page errors, scrollWidth = viewport. Interactive figures were also screenshotted after clicks (reveal, female,
Hi-C, primary/alternate + ZW) and checked by eye.

## Sources (URL, version, what was taken)

Papers (full text read via PubMed Central):
- Bachtrog et al. 2014, "Sex determination: why so many ways of doing it?", PLoS Biol 12:e1001899,
  https://doi.org/10.1371/journal.pbio.1001899 (PMC4077654). XY / ZW (birds, snakes, butterflies) definitions;
  homomorphic vs heteromorphic; pufferfish single-locus; X0/Z0 = complete Y/W loss; X0 in voles, Japanese spiny rats,
  mole voles; grasshopper karyotype variation with Y loss; python snakes ~140 My and ratites ~120 My homomorphic.
- Rhie et al. 2023, "The complete sequence of a human Y chromosome", Nature, https://doi.org/10.1038/s41586-023-06457-y
  (PMC10752217). T2T-Y 62,460,029 bp; GRCh38-Y 57.2 Mb with 30.8 Mb gaps; ~30 Mb q-arm heterochromatin; PAR1 2.77 Mb,
  PAR2 329.5 kb; ampliconic 10.08 Mb, X-degenerate 8.67 Mb; palindrome arm identity 99.84-99.96 %; Strand-seq found an
  inversion error in P5; X and Y graph components connected only through PARs; PAR1 GA-microsatellites lower HiFi
  coverage; HSat1B/HSat3; XTR; HiFi 60x + ONT UL; ampliconic genes expressed in testis.
- Rhie et al. 2021, "Towards complete and error-free genome assemblies of all vertebrate species", Nature 592:737,
  https://doi.org/10.1038/s41586-021-03451-0 (PMC8081667). Female Anna's hummingbird chosen partly because
  heterogametic; Z+W in three birds, X and/or Y in lynx and two bats, X in thorny skate, 5X+5Y platypus; sex chromosomes
  "more fragmented ... lower sequencing depth and high repeat content"; trio: "heterogametic sex chromosome from the
  unchosen haplotype was added"; trio mis-assignment in low-divergence X/Z regions -> duplicate low-coverage X/Z to remove;
  zebra finch Z in paternal, W in maternal; identification "based on half coverage, homology alignments ... and the
  presence of sex chromosome-specific genes".
- Carvalho & Clark 2013, "Efficient identification of Y chromosome sequences in the human and Drosophila genomes",
  Genome Res 23:1894, https://doi.org/10.1101/gr.156034.113 (PMC3814889). YGS: 15-mers, single-copy in assembly,
  % unmatched by female reads; bimodal (Y ~95-100 %, others ~0-5 %); intermediate 25-80 %; 25 % cutoff for small
  scaffolds; male reads as control against contaminants/errors; Jellyfish for filtering; YGS.pl in Supplemental File S2;
  quote "virtually all mammalian genome projects ... sequenced only the homogametic sex ...".
- Sigeman, Sinclair & Hansson 2022, "findZX: an automated pipeline ...", BMC Genomics 23:328,
  https://doi.org/10.1186/s12864-022-08432-9.
- Nursyifa et al. 2021, SATC, Mol Ecol Resour, https://doi.org/10.1111/1755-0998.13491 (citation from SATC README).

Tools (cloned into `lesson2/src/s12_*`):
- findZX https://github.com/hsigeman/findZX, commit e926637 (2022-06-08): README (snakemake command, units.tsv groups
  homogametic/heterogametic, 100 kb/1 Mb windows, PDF + HTML report); workflow rules: BWA-MEM wrapper (mapping.smk),
  Platypus (variant_calling_platypus.smk), LAST (synteny_lastal.smk).
- SATC https://github.com/popgenDK/SATC, commit 7577917 (2025-05-23): README (idxstats input, steps, defaults
  minLength 1e5, M 5, K 2, gaussian; output file names; Rscript command).
- DifCover https://github.com/timnat/DifCover, commit 22f7b23 (2025-09-03): README (stretched windows, a/A/b/B/v/l/AC/p,
  DNAcopy, p=2 ~ 4-fold, output *.DNAcopyout.up{p}, citations).
- hifiasm https://github.com/chhylp123/hifiasm, commit ec9a8b2, HA_VERSION 0.25.0-r726: README + docs/source/
  (hic-assembly.rst "cleanly separated chrX and chrY", "randomly mixed"; faq.rst "for some samples like human male, the
  paternal haplotype should be larger"; interpreting-output.rst file names; trio `-1 pat.yak -2 mat.yak`; `--ont` since
  0.21.0).
- mosdepth https://github.com/brentp/mosdepth README (0.3.11 usage block) and source mosdepth.nim (nimble 0.3.15):
  `-n`, `-x`, `-b`, `-t`, `-Q`; summary header `chrom length bases mean min max`; regions.bed.gz with --by.
- minimap2 man page https://lh3.github.io/minimap2/minimap2.html (2.28): asm5 ~0.1 %, asm10 ~1 %, asm20 "several
  percent"; README v2.31 map-ont/map-hifi.
- purge_dups README https://github.com/dfguan/purge_dups: `minimap2 -xasm5 -DP` self-alignment; contigs below mid
  coverage "are tested for haplotypic duplications".
- bcftools manual https://samtools.github.io/bcftools/bcftools.html (1.22): view `-g het`, `-v snps`, query `-f`.

Project facts: the internal project-facts sheet §2 and the species A assembly QC lab record, sections A and C;
internal lab notes. Species A is unpublished (owner request 2026-11-01): the page gives only rounded/relative values
(median depth, window share, half-depth amount, contig counts, synteny share and enrichment, X control het rates as shares
of the autosomal rate, AF medians, GenomeScope vs assembly as a percentage); no accessions or chromosome names.
Caveat that reads may be CycloneSEQ (the facts sheet, UNVERIFIED but flagged).

## Derived, not cited (my own reasoning; flag for review)
- The GenomeScope consequences (hemizygous k-mers in the het peak, inflated heterozygosity, size ~ autosomes +
  (X+Y)/2) follow from the lesson-1 arithmetic, not from a paper. The toy's "apparent heterozygosity" inverts
  het/hom distinct-k-mer ratio = 2p/(1-p), p = 1-(1-h)^21; GenomeScope's real model also fits errors, repeats and
  dispersion.
- "less than a third of the gap" for species A = (half-depth Mb / 2) / (assembly - GenomeScope size), arithmetic on recorded numbers.
- Primary/alternate placement: X and Y non-PAR kept in primary (supported by the species A primary holding >100 Mb of
  half-depth X(+Y)); PAR copy to alternate and young gametologs/XTR possibly purged as "alleles" is inference from how
  hifiasm/purge_dups treat near-identical sequence. No hifiasm doc states it explicitly.
- Toy examples in "Simple explanation" boxes use invented numbers (labelled as toy).
- Example species table: house mouse XY, zebra finch ZW (VGP), silkworm ZW (Carvalho & Clark mention silkworm
  sequencing the homogametic sex for Z), grasshoppers X0 (Bachtrog), platypus 5X5Y (VGP).

## Could not verify / left out
- An explicit EBP / VGP written recommendation on which sex to sequence: not found; the page states only what VGP did
  and Carvalho & Clark's remark.
- Run times / RAM for the commands: left out.
- Whether the species A X sits in hap1 or hap2 of the `--dual-scaf` run (hap1 larger than hap2): not recorded,
  not mentioned.
- Lesson-1 copy buttons rely on the page-level script; the section's `.code` block uses the same markup.

## Cross-links
- `../01-pre-assembly/#gp` (used). Suggest: s06 (purge_dups: check half-depth Mb before/after purge), s07 (products,
  hap1/hap2 vs primary), s08 (depth-based QC, half-depth contigs), s04 (hifiasm --ont), s05 (Hi-C: sex chromosomes
  as separate scaffolds; W/Y fragmented).
