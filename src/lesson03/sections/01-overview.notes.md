# s01 notes: From assembly to annotation (01-overview)

Written 2026-10-31. Local copies of all fetched docs: `lesson3/src/s01docs/` (and `lesson3/src/s04_RepeatMasker/` for RepeatMasker, cloned by the s04 agent; read only).

## Sources (URL, version, what was taken)

| Source | Version / date | Used for |
|---|---|---|
| BRAKER README, https://github.com/Gaius-Augustus/BRAKER/blob/master/README.md | braker.pl `$version = "3.0.8"`; latest GitHub release v3.0.8 (2024-02-17) | "Keys to successful gene prediction" (simple scaffold names; masking avoids false positives; softmasking better than hardmasking for GeneMark/AUGUSTUS; HISAT2 ignores masking); "BRAKER should only be applied to genomes that have been softmasked"; OrthoDB partitions URL (partitioned_odb11/odb12); "many representatives of each protein family"; ETP mode (HISAT2 `--dta` / STAR `--outSAMstrandField intronMotif`); long-read variant `teambraker/braker3:isoseq`, `minimap2 -ax splice:hq -uf`, "Do NOT mix short read and long read data", accuracy "heavily depends on the depth of your isoseq data"; each intron "covered by many alignments"; protein-mode call `braker.pl --genome=genome.fa --prot_seq=proteins.fa`; "Common problems": long headers with whitespace truncated in BAM |
| braker.pl, https://raw.githubusercontent.com/Gaius-Augustus/BRAKER/master/scripts/braker.pl | 3.0.8 | `--softmasking_off` "Turn off softmasking option (enables by default, discouraged to disable!)"; `--gff3` "Output in GFF3 format (default is gtf" |
| AUGUSTUS docs/RUNNING-AUGUSTUS.md, https://github.com/Gaius-Augustus/Augustus | master, fetched 2026-10-31 | `--softmasking=1`: lowercase = nonexonpart hints, bonus 1.15; "slightly more accurate than hard masking (with N's), which looses information"; "On human augustus is also more than twice as fast with softmasking=1" |
| GALBA README, https://github.com/Gaius-Augustus/GALBA | latest release v1.0.11 (2023-12-22) | "GALBA always treats genomes as softmasked"; "if you have no RNA-Seq data and the genome is large, use GALBA! Otherwise use BRAKER, first"; large = Mus musculus, Gallus gallus examples; uses proteins of "several (few) or one closely related species", miniprot; Common problems: unmasked TEs -> AUGUSTUS "tends to predict those elements as protein coding genes. This can lead to a huge number genes" |
| EGAPx README, https://github.com/ncbi/egapx | latest release v1.0.1 (2026-09-28) | required input genome + taxid; RNA-seq "highly recommended"; "does not need to be repeat-masked ... performs masking steps"; screen contamination (FCS) first; supported taxa list; fungi/protists/nematodes out of scope; FAQ: unsupported taxid -> pipeline fails; r6a.4xlarge (32 CPU, 256 GB); chicken 1.1 Gb + 10 short + 10 long RNA runs = 425 CPU h, 5.5 h wall; ProSplign "may be particularly useful ... little to no RNAseq"; long reads alone or with short; ncRNA: rRNA by default, tRNAscan and cmsearch optional; output GFF3 + submission tooling |
| Helixer README, https://github.com/weberlab-hhu/Helixer | changelog "Version 0.3.7"; no GitHub "latest release" returned by API | four lineage models (vertebrate_v0.3_m_0080.h5 etc.); "ab initio"; outputs "primary gene models in a gff3 file"; GPU "will be necessary" for realistic datasets; web tool max file 1 GB, min record 25 kbp; `Helixer.py --lineage ... --fasta-path ... --gff-output-path` . README does not mention masking (grep "mask" only hits reproducibility notes). |
| TOGA2 README + wiki "Input-files.md", https://github.com/hillerlab/TOGA2 and TOGA2.wiki (commit 3e23732, 2026-09-30) | latest release v2.0.10 (2026-09-10) | genomes as .2bit via faToTwoBit; chains from make_lastz_chains recommended; transcript names: only letters, digits, `.`, `-`, `#`, others discarded |
| make_lastz_chains README, https://github.com/hillerlab/make_lastz_chains | main, fetched 2026-10-31 | "Softmask both genomes (lowercase, do NOT hardmask)"; WindowMasker "if you see runaway LASTZ runtimes"; scaffold names: no spaces, avoid dots |
| LASTZ README.lastz.html, https://github.com/lastz/lastz | master (latest release 1.04.60) | lowercase "excluded from the seeding stage of the alignment process but not from later stages" |
| UCSC kent faToTwoBit.c, https://github.com/ucscGenomeBrowser/kent/blob/master/src/utils/faToTwoBit/faToTwoBit.c | master | `-noMask` "Ignore lower-case masking in fa file" => default keeps it; `-long` |
| minimap2 man page (minimap2.1) + sketch.c, https://github.com/lh3/minimap2 | 2.31 (r1302), 19 May 2026 | no soft-mask option in the manual; `seq_nt4_table` maps a/A, c/C, g/G, t/T to the same codes 0-3, everything else (incl. N) to 4, which breaks the k-mer (minimizer) |
| RepeatMasker (`src/s04_RepeatMasker`, RepeatMaskerConfig.pm VERSION 4.2.6, commit 74d2b41) | 4.2.6 | `-xsmall` "Returns repetitive regions in lowercase (rest capitals) rather than masked"; `-x` masks with X; `-pa`, `-lib` exist. Default = N mask (implied by -xsmall/-x text) |
| GFF3 spec, https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md | v1.26, 18 Aug 2020 | 9 columns; 1-based positive integer coordinates; seqid escape set `[a-zA-Z0-9.:^*$@!+_?-|]`; phase definition (0/1/2 = bases to skip); multi-line CDS share one ID |
| UCSC FAQformat (BED), https://genome.ucsc.edu/FAQ/FAQformat.html#format1 | fetched 2026-10-31 | chromStart 0-based, chromEnd not included; thickStart/thickEnd; blockStarts relative to chromStart; first blockStart 0; last blockStart+size = chromEnd |
| Ensembl GFF/GTF page, https://useast.ensembl.org/info/website/upload/gff.html | fetched 2026-10-31 | GTF = GFF2; start/end 1-based and both included; frame 0/1/2 |
| seqkit usage.md, https://github.com/shenwei356/seqkit | latest release v2.14.0 | `seq -i` (only IDs), `seq -n`; `replace -p -r '{kv}' -k file` (tab-delimited key-value) |
| BRAKER OrthoDB partitions page, https://bioinf.uni-greifswald.de/bioinf/partitioned_odb12/ | fetched 2026-10-31 | `Vertebrata.fa.gz` present |
| the internal project-facts sheet (this lesson) | 2026-10-31 | the species A facts in the "In our projects" box and the simple explanation, shown only qualitatively/rounded (unpublished data; names and exact numbers removed 2026-11-01 by owner request) |
| (none) | 2026-11-01 | the masking toy uses a random 480-base sequence with a soft-mask case pattern; it is not real sequence |

## Verified facts used on the page
- All statements in the "Which tool wants which mask" table: quoted or paraphrased from the sources above.
- Toy gene coordinates were computed, not sourced: exons 101-250, 401-520, 701-900; CDS 151-250 (100 nt), 401-520 (120), 701-780 (80); total 300 nt; phases 0, 2, 2 (100 mod 3 = 1 -> 2 bases complete the codon; 220 mod 3 = 1 -> 2). BED12: `ctg1 100 900 g1.t1 0 + 150 780 0 3 150,120,200 0,300,600` (checked: 600+200 = 900-100).

## Course advice (marked as such on the page, not tool facts)
- Tissue list for RNA (brain, testis, liver, kidney, embryo/juvenile); "plan RNA sampling with DNA sampling".
- "Run one main route and one independent route, and compare."
- Route-chooser mapping is a synthesis of README recommendations; each item cites its README.

## Not verified / left out
- Helixer's handling of lowercase input: not stated in the README; I did not read its source. Shown as "not stated".
- Whether TOGA2 itself reads the soft-mask in .2bit: not found in the wiki; only the chain pipeline's requirement is stated.
- GTF2.2 spec page (mblab.wustl.edu/GTF22.html) did not download; stop-codon conventions between GTF and GFF3 not stated on the page.
- Whether close-relative proteomes exist for species A: not checked; the species A preset leaves that box empty and says so.
- The read technology of species A is not named in s01.
- Runtime/RAM of BRAKER/GALBA/TOGA2/Helixer: left to s06/s07.

## Suggested cross-links
- s03/s04: soft-masked master copy produced by RepeatMasker `-xsmall`; WindowMasker mention (make_lastz_chains).
- s05: HISAT2 `--dta`, STAR `--outSAMstrandField intronMotif`, minimap2 `-ax splice:hq` for Iso-Seq.
- s06: BRAKER3/GALBA/Helixer/EGAPx details; gffread/AGAT conversions (referenced from the formats toy).
- s07: TOGA2 classes and chains; s08: gene-count sanity check, EGAPx submission.
- Lesson 2: #s09 (FCS-GX), #s11 (mito).
