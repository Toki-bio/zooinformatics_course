# s06 Polishing, purging duplicates, closing gaps — notes

Files: `06-polish-purge-gaps.html`, `.js` (no css). Researched 2026-10-31. Docs and source downloaded to
`lesson2/src/s06/` (purge_dups clone, pilon.wiki and merfin.wiki clones, GapCloser v1.12 tarball, docs/*.md).

## Sources (URL, version, what was taken)

| tool | source | version | used for |
|---|---|---|---|
| purge_dups | github.com/dfguan/purge_dups (clone, HEAD f14dae1, 2025-10-30); src/version.h = 1.2.5; latest GitHub release v1.2.6 | 1.2.5/1.2.6 | README pipeline commands, `-I` advice, manual cutoffs `calcuts -l -m -u`, hist_plot.py, `-e` warning, low-het limitation. Source: `calcuts.c` (LOWEST_CUT 5; two-peak mode mid = valley+1, high = 3 x upper peak; one-peak mode: mean <= peak -> mid 0.75p, high 2.25p; mean > peak -> mid 1.5p, high 4.5p; warning text), `purge_dups.c` (classify_seq: min_frac 0.8, JUNK/PRIMARY/HIGHCOV/candidate; flt_by_bm_mm: bm = % of contig covered by alignments to best contig, mm = summed aligned length %, defaults -a 70, -b 200 -> HAPLOTIG vs REPEAT; -2 = 2 chaining rounds, -G 50K; purge_dups2: shorter contig of an overlap labelled OVLP), `get_seqs.c` (purged.fa/hap.fa; all dups.bed types go to hap.fa, `-c` keeps HIGHCOV; `-e` skips middle intervals; -l 10k / -m 0.05 minimum remaining; 23 N joining), `pbcstat.c` options. |
| purge_haplotigs | bitbucket.org/mroachawri/purge_haplotigs README (master) | v1.1.x | manual hist/cov/purge steps, -a 70, -m 250 defaults, output file names, artefacts contain organelles. |
| hifiasm | github.com/chhylp123/hifiasm README + docs/source/parameter-reference.rst + faq.rst | 0.25.0 | `-l` levels (default 3 non-trio, 0 to disable, inbred), `-s 0.55`, `--hom-cov`, `--purge-max`, "purging may introduce misassemblies". |
| Medaka | github.com/nanoporetech/medaka README, scripts/medaka_consensus, medaka/options.py; PyPI 2.2.2 | 2.2.2 | model must match basecaller; auto model from headers; WARNING + fallback default `r1041_e82_400bps_sup_v5.2.0` (options.py default_models['consensus']); trained on Flye drafts; `medaka inference` >2 threads scales poorly; resolve_model command. |
| dorado polish | github.com/nanoporetech/dorado-docs docs/assembly/polish.md; dorado release v2.1.2 (2026-08-26) | 2.1.2 | dorado aligner + samtools sort/index; @RG model needed; haploid tool; GPU/CPU; `--add-fastq-rg`. |
| Racon | github.com/lbcb-sci/racon README; release 1.5.0 (2021) | 1.5.0 | usage `racon reads overlaps target`, -w 500 default. |
| NextPolish | github.com/Nextomics/NextPolish README; nextpolish.readthedocs.io TUTORIAL, OPTION, FAQ | 1.4.1 | run.cfg, task=best = [55]1212 (two iterations), rerun = retries of unfinished jobs (default 3), sgs_options -max_depth 100 -bwa, output genome.nextpolish.fasta, modules 1/2 short-read, 5 long-read. |
| Pilon | github.com/broadinstitute/pilon wiki (Requirements-&-Usage.md, cloned); release v1.24 | 1.24 | 1 GB per Mb memory rule, --fix all default, --fix bases, --targets, --frags. |
| POLCA | github.com/alekseyzimin/masurca README section POLCA; release v4.1.4 | MaSuRCA 4.1.4 | command line, bwa + freebayes, FASTQ needed. Output file names not given in README -> not stated. |
| HyPo | github.com/kensung-lab/hypo README; v1.0.3 | 1.0.3 | unique k-mer strong/weak regions, -c coverage, -s size, ~380 GB human. |
| Merfin | github.com/arangrhie/merfin README + wiki Best-practices; v1.1 | 1.1 | -polish/-loose/-strict, bcftools consensus -H 1, drop het calls for pseudohaploid, T2T-HG002XY. |
| DeepVariant | google/deepvariant README r1.10 | 1.10.0 | model types WGS, WES, PACBIO, ONT_R104, HYBRID_PACBIO_ILLUMINA. |
| Clair3 | HKU-BAL/Clair3 README | 2.0.3 | basecaller-specific models (Rerio, r1041_e82_400bps_sup_v520...). |
| TGS-GapCloser | github.com/BGI-Qingdao/TGS-GapCloser README; v1.2.1 | 1.2.1 | options (--ne, --racon, --pilon, --tgstype, --minmap_arg, --thread 16 default), FASTA only, outputs .scaff_seq and .gap_fill_details with S/N/F. |
| LR_Gapcloser | github.com/CAFS-bioinformatics/LR_Gapcloser README | no release tag | 300-bp tags, bwa mem, -r 3, output iteration-3/gapclosed.fasta, corrected reads required. |
| Sealer | github.com/bcgsc/abyss Sealer/README.md; ABySS 2.3.10 | 2.3.10 | Konnector, 2 x 100 bp flanks, Bloom filter, multiple -k, output files. |
| GapCloser (SOAP) | sourceforge soapdenovo2 GapCloser-src-v1.12-r6.tgz (Main.cpp + GapCloser_Manual.pdf) | 1.12 r6 | options -a -b -o -l (<=155, default 100) -p 25 -t; ~200 GB/1 day for 3 Gb YH genome; .fill file; fill quality lower. |

Project facts: only from the internal project-facts sheet (species B/C §1.4-1.6, species A §2.1, §2.3, §2.4 points 7, 1; desmans §4.1-4.4, §4.6). Species A-D are unpublished: the page gives only rounded or relative values (QV table as differences, mtDNA C-run preset rounded, sineclose benchmark on species B as percentages).
The sineclose principle sentence ("recruits only read pairs whose mate carries a genome-unique 20-mer from the gap's own flanks")
is from [lab record: README.md] (sineclose 0.3.1), which the facts sheet cites as [SC-README].

## Verified statements in the page (beyond the table)
- Medaka fallback: `medaka_consensus` prints "WARNING: Failed to detect a model version, will use default" and uses
  `default_models['consensus'] = 'r1041_e82_400bps_sup_v5.2.0'`. That the species B/C run used this model is a project fact;
  that it got it *via the fallback* is NOT verified (log not seen) -> page says "is also Medaka's fallback default", nothing more.
- purge_dups default `get_seqs` sends HIGHCOV contigs (e.g. collapsed repeats, mtDNA) to hap.fa unless `-c` (source).
  README Q2' calls high-depth contigs 'REPEAT'; the source labels them HIGHCOV. Page follows the source.
- calcuts automatic low cutoff is always 5 (LOWEST_CUT).

## Toy simplifications (stated in the page as toy/simplified)
- Polishing toy: majority vote per column + mode of run length; ties go to the shorter run. Real polishers use models.
- purge_dups toy: depth per 20-kb window with normal noise; candidate test uses fixed bm/mm per contig type; peak finding
  is a smoothed local-maximum search, not the derivative-voting code of calcuts; the one-peak/two-peak arithmetic is as in
  calcuts.c. Heterozygosity -> share of genome assembled twice (min(0.75, het% x 0.45)) is an arbitrary toy mapping.
- Gap toy: "tied" = read (or mate) with >= 100 bases in unique flank; insert 350 +/- 30 (300-420); long-read lengths from a
  gamma(2) distribution. Not a model of any specific closer; it illustrates the anchoring rule used by sineclose and the
  bridging requirement of TGS-GapCloser/LR_Gapcloser.

## Not verified / left out / doubts
- the facts sheet [WFD] says NextPolish ran "3 rounds"; the NextPolish docs say `rerun = 3` is a retry count and `task = best`
  is two iterations of modules 1,2. I did not state a number of rounds for species B. Someone should check the species B NextPolish log.
- "CycloneSEQ is nanopore-based" is general knowledge (MGI marketing/papers), not from a tool doc.
- "homopolymer length is hard to read from nanopore signal" is a general explanation, not from a tool doc.
- No POLCA output filenames, no YaHS gap length (left to s05), no dorado/Medaka run-time numbers for mammals.
- Merqury QV meaning is linked to lesson 1 (#gx); s08 should cover it in full.
- purge_dups after a Flye assembly: no before/after purge size for species B/C in the facts sheet, so none given.

## Suggested cross-links
- s03 (k - 1 rule, Bloom filter) is referenced from the gap toy and the Sealer tooltip.
- s05 (YaHS) for the scaffolding step; s07 (hap1/hap2, do not purge haplotype assemblies); s08 (Merqury QV, copy-number
  spectrum, BUSCO D); s10 (BUSCO); s11 (mitochondrial contig labelled HIGHCOV / purge_haplotigs artefacts).
