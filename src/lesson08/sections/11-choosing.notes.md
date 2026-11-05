# s11 Choosing the tool: notes and sources (2026-11-05)

Page content is a rule table (question x target size x frequency). Every tool statement is from the sources below; lines marked "our reasoning" on the page are not from a manual.

## Sources read (URL, version, supporting text)
- NCBI BLAST+ source, ncbi-cxx-toolkit-public master, src/algo/blast/api/blast_options_handle.cpp: task "blastn-short" described as "BLASTN program optimized for sequences shorter than 50 bases"; code sets `SetMatchReward(1); SetMismatchPenalty(-3); SetEvalueThreshold(1000); SetWordSize(7); ClearFilterOptions();`. Task "blastn" described as "requiring an exact match of 11".
- same repo, src/algo/blast/blastinput/blastn_args.cpp: `kDefaultTask[] = "megablast"`.
- same repo, src/algo/blast/blastinput/blast_args.cpp: comment "Default values: blastn=11, megablast=28, others=3" (word size); E-value "Default = 10 (1000 for blastn-short)"; filter "Default = '20 64 1' (... for blastn-short)" (low-complexity filtering on by default).
- include/algo/blast/core/blast_options.h: `BLAST_WORDSIZE_NUCL 11`, `BLAST_WORDSIZE_MEGABLAST 28`.
- bwa README (v0.7.19): "Illumina single-end reads shorter than ~70bp: bwa aln ..."; "BWA-MEM is recommended for query sequences longer than ~70bp".
- minimap2 README (v2.31): `-ax sr` short reads; `-ax map-ont`; `-x ava-pb/ava-ont reads.fa reads.fa` overlaps; `-d ref.mmi` indexing; `-cx asm5` assembly-to-assembly; "For >100bp Illumina short reads, minimap2 is three times as fast as BWA-MEM and Bowtie2" (author's claim, not used on page).
- samtools-view manual (samtools 1.25): "Use of region specifications requires a coordinate-sorted and indexed input file (in BAM or CRAM format)"; overlapping regions can output an alignment more than once.
- GNU grep manual: `-F --fixed-strings` "Interpret patterns as fixed strings, not regular expressions."; `-f FILE`.
- FASTA36 package (fasta36 6d6718a, 2026-09-15) README: ssearch36 = "optimal Smith-Waterman search"; fasta36.1: `-n` DNA, `-m 8` mimics BLAST tabular, `-E e_cut`.
- Kraken2 MANUAL.markdown (v2.x): minimizers in a hash table; database held in RAM; "default database size is 29 GB (as of Jan. 2018)"; `kraken2 --db $DBNAME seqs.fa`.
- Mash docs (mash.readthedocs.io, Mash 2.x): tutorial commands `mash sketch`, `mash dist`, `mash screen -w -p 4`; text "mash screen is not a true classifier"; paper title "Mash: fast genome and metagenome distance estimation using MinHash", Genome Biol 2016 (title only, abstract not read).
- BBDuk help (bbduk.sh, BBMap, Jan 2021 header): "Compares reads to the kmers in a reference dataset, optionally allowing an edit distance. Splits the reads into two outputs"; `k=27` default; `outm=`.

## Lab notes (no paths)
Small-task rule and mistakes (whole-read-set remapping for one locus; mapping near-identical alleles together gives MAPQ 0; check coordinates by mapping the target back to the slice; hits to unrelated organisms; check counts not only the control case). Numbers and taxa removed.

## Open doubts
- The `bbduk.sh` default k=27 note: a short oligo needs smaller k; the exact option to set (k, mink) was not tested.
- agrep not verified from source (section 02 owns that); the page only says "finds a string with up to k errors".
- `blastn -subject` syntax assumed from general BLAST+ usage, not read from source here.
- `makeblastdb -in FILE -dbtype nucl -out NAME` (helper, "longer query, one genome, many times"; added at the final review 2026-11-05 in place of a minimap2 index built with one preset and used with another): the `-in` and `-dbtype` options are from the BLAST+ docs README usage line (`makeblastdb -in ... -dbtype prot`, github.com/ncbi/blast_plus_docs), with `nucl` for DNA; `-out` is the standard output-name option. Not run.
- "Small = a few Mb" is our rule of thumb.
- Links to sections 02 to 10 assume those ids exist in lesson 7.
