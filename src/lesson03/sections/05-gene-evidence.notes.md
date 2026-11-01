# s05 Evidence for genes: transcripts and proteins — notes (2026-10-31)

Local copies of sources: local copies of the sources (not kept in the repository) (miniprot, BRAKER, hisat2, STAR, stringtie, TransDecoder, TD_wiki, IsoSeq, pbmm2, orthodb-clades, mm2doc, s05docs). Docs were only read; no cloned code was executed.

## Sources (URL, version, what was taken)

| Tool / doc | Version / commit | Taken from it |
|---|---|---|
| miniprot https://github.com/lh3/miniprot README.md + miniprot.1 + main.c/options.c | v0.18-r281 (release 2025-07-11), commit 81f9b93 | commands `-t16 -d genome.mpi`, `-Iut16 --gff`; index "slow and memory intensive"; `-I` = min(max(3.6*sqrt(refLen),10000),300000); `-G` default 200k; `-u` print unmapped; `-t` default 4; `-j` 2=vertebrate/insect, default 1 (options.c NS_S_GENERIC); vertebrate model `G|GTR...YYYNYAG|`; GFF3 features mRNA/CDS/stop_codon; attributes ID, Parent, Rank, Identity, Positive, Donor/Acceptor (only if not GT/AG), Frameshift, StopCodon, Target; PAF tags AS ms np fs st da do cg cs; CIGAR M I D F G N U V; `--outn 1000`, `--outs 0.99`, `--outc 0.1`; algorithm (6-frame translation, syncmers); "not optimized for mapping distant homologs" |
| BRAKER https://github.com/Gaius-Augustus/BRAKER README.md, scripts/braker.pl | 3.0.8 (latest release, 2024-02-17), commit 8f6a9b8 | softmasking better than hardmasking; HISAT2 ignores masking; `--bam`, `--rnaseq_sets_ids/dirs`, FASTQ naming ID_1/ID_2, SRA download; STAR needs `--outSAMstrandField intronMotif`; HISAT2 needs `--dta` (XS tag for StringTie in GeneMark-ETP); `--hints` not used by GeneMark-ETP; hint features intron/start/stop/CDSpart; `--prot_seq` OrthoDB, needs many family members; stranded `--stranded=+,-,.` only for `--UTR=on`, experimental; strandedness not very important without UTR ("artificially stranded"); long-read-only container teambraker/braker3:isoseq, minimap2 -ax splice:hq -uf, do not mix short+long, accuracy depends on depth (2022 HiFi similar to short reads); HISAT2 2.2.1 listed as dependency |
| Partitioned OrthoDB https://bioinf.uni-greifswald.de/bioinf/partitioned_odb12/ (fetched 2026-10-31) | OrthoDB v12 | Vertebrata.fa.gz 5.8 GB; v11 Vertebrata 3.1 GB; must gunzip; prepared with tomasbruna/orthodb-clades |
| HISAT2 https://github.com/DaehwanKimLab/hisat2 MANUAL | v2.2.3 (release 2026-07-31), commit 0d24432 | `--dta`; `--rna-strandness` F/R/FR/RF, RF = fr-firststrand; `--max-intronlen` 500000; `--novel-splicesite-outfile`; XS:A tag needed by StringTie; example `90M200N10M`; hisat2-build ~8 GB RAM without --snp/--ss/--exon, ~200 GB with |
| STAR https://github.com/alexdobin/STAR README, doc/STARmanual.pdf, source/parametersDefault | 2.7.11b (2024-01-26) | 16 GB min / 32 GB ideal (README); `--twopassMode Basic` and the quoted sentence on 2-pass (manual sec. 9); multi-sample 2-pass via `--sjdbFileChrStartEnd`; filter mito/non-canonical junctions (9.3); `--outSAMstrandField intronMotif` filters inconsistent/non-canonical; SJ.out.tab columns (manual 17.17 / output section); `--genomeChrBinNbits` formula for >5,000 references; limitGenomeGenerateRAM default 31 GB |
| EGAPx https://github.com/ncbi/egapx README (local clone src/egapx, from another section agent) | not re-versioned here | STAR for short RNA-seq, minimap2 for long; miniprot or ProSplign; long reads alone or with short |
| GALBA README (src/GALBA) | — | uses miniprot (preferred) with proteins of one/few close relatives |
| PacBio Iso-Seq https://isoseq.how (= github.com/PacificBiosciences/IsoSeq docs/) | isoseq 4.3.0 in README; changelog lists 26.2.0; commit 94d5a0c | bulk workflow table lima → isoseq refine → cluster2 → pbmm2 → isoseq collapse → pigeon; lima `--isoseq --peek-guess`; HiFi ≥Q20; refine `--require-polya` (≥20 bp, `--min-polya-length`); cluster2 outputs isoforms with ≥2 FLNC reads, `--singletons`; `isoseq cluster` will be deprecated; `pbmm2 align --preset ISOSEQ --sort`; `isoseq collapse mapped.bam collapsed.gff` |
| pbmm2 https://github.com/PacificBiosciences/pbmm2 README | release v26.2.0 (2026-06-30); README header says 26.1.99, changelog 26.2.99 | minimap2 wrapper for PacBio BAM; presets SUBREAD, CCS/HIFI (default), ISOSEQ, UNROLLED; ISOSEQ overrides -G, -C, --no-splice-flank |
| minimap2 README https://github.com/lh3/minimap2 | 2.31-r1302 (minimap.h on master) | `-ax splice:hq -uf` Iso-Seq; `-ax splice` nanopore cDNA; `-uf` forward strand; default -G 200k |
| pychopper https://github.com/epi2me-labs/pychopper README | v2.7.10 | identifies, orients, trims full-length ONT cDNA reads; `-k` kits {PCS109, PCS110, PCS111, LSK114}, default PCS109; example command |
| StringTie https://github.com/gpertea/stringtie README + stringtie.cpp | 3.0.3 (release 2025-11-13) | `-L`, `--mix` (short BAM first), `--merge`; defaults -m 200, -j 1, -f 0.01, -c 1, -s 4.75, -a 10; `--rf/--fr`; ≥8 GB RAM, 16 GB advised |
| TransDecoder wiki https://github.com/TransDecoder/TransDecoder/wiki (Home.md, commit 8bc5447) + Changelog.txt | v6.0.0 (2026-03-20) | wrapper `TransDecoder -t` and `--genome --gtf`; default min 100 aa, `-m`; false positives rise when lowered; needs hundreds of candidates; outputs .pep/.cds/.gff3/.bed/.genome.gff3; LongOrfs/Predict moved to util/ in v6.0.0 |
| RSeQC https://rseqc.sourceforge.net/ | v5.0.5 | infer_experiment.py guesses strandedness from BAM + gene-model BED12 |
| ERGA Pilot Project Official Guidelines V2 (zenodo 8319754) | V2 | RNAlater sufficient for RNA-seq; centres ask RIN > 8 for Iso-Seq; 300-500 ng minimum (varies by centre) |
| Uhlén et al. 2015 Science 347:1260419 (PubMed 25613900, doi 10.1126/science.1260419) | — | abstract: 32 tissues and organs; detected >90 % of putative protein-coding genes |

## Project facts used (the internal project-facts sheet)
- No RNA-seq for species A (unpublished; qualitative only on the page, owner request 2026-11-01); inputs = long reads, a published close-relative HiFi genome, human annotation via TOGA2 (hooks s01, s05).
- TOGA2 (Hiller lab, human -> species A): counts given on the page only as "most genes found, large majority 1:1".
- STAR genomeChrBinNbits example uses round toy numbers: 2.5 Gb, 25,000 contigs; log2(100,000) = 16.61 -> 16. Arithmetic mine.

## Arithmetic on the page
- miniprot -I for 3 Gb: 3.6 × sqrt(3e9) = 3.6 × 54,772 = 197,180 bp ≈ 197 kb.

## Not verified / left out
- No published, tool-documented recommendation for RNA-seq depth or tissue list for annotation was found; the page says there is no single agreed number. ENCODE "30 M paired reads" seen only second-hand -> left out.
- Which commercial kits are dUTP/RF: page says "dUTP-type library: RF" based on HISAT2 manual's RF = fr-firststrand; the removed from the page (comment now says "ask the provider or measure it").
- miniprot memory/time for a mammal genome: no numbers in current docs -> left out.
- pbmm2 ISOSEQ preset internal minimap2 settings: not read (`--help` not executed) -> page only lists the overridable options.
- isoseq.how refine example naming differs from lima output naming (docs show `movieX.NEB_5p--NEB_Clontech_3p.fl.bam`); page uses lima's documented output name `movieX.fl.NEB_5p--NEB_Clontech_3p.bam`.
- Toy expression levels are invented and labelled so.

## Cross-links
- s04 (masking before mapping/prediction), s06 (BRAKER3/GALBA/EGAPx consume this evidence; homopolymer frameshifts behind miniprot Frameshift counts), s07 (TOGA2 as the evidence we actually had), lesson 2 s10 (BUSCO uses miniprot), lesson 2 s11 (NUMTs attract mitochondrial RNA reads).
