# s02 Preparing the input: one diploid genome - notes and sources (2026-10-31)

## Sources (URL, version, what was taken)
- PSMC, https://github.com/lh3/psmc, HEAD 82fa2ada83ee463fe1251b562ae3d60e82d7ad6a (2025-11-16).
  - README: example `samtools mpileup -C50 -uf ref.fa aln.bam | bcftools view -c - | vcfutils.pl vcf2fq -d 10 -D 100`;
    "It is recommended to set -d to a third of the average depth and -D to twice"; `fq2psmcfa -q20`; bin "[100i, 100i+100)";
    dipcall route `seqtk mutfa ref.fa <(... utils/vcf2snp.pl -) | seqtk seq -cM prefix.dip.bed -l80 | utils/fq2psmcfa -`;
    Appendix II: FNR correction `psmc_plot.pl -M "sample1=0.1,..."`, theta0/(1-FNR), "I haven't found a reliable way to estimate the
    background FNR", downsampling suggested but "I have not done this", "Not correcting for low coverage is the most common pitfall".
  - utils/fq2psmcfa.c (source read): default -q 10, -s 100 (BLOCK_LEN), -g 10000; N_RATIO 0.9 (bin N if nN/100 > 0.9);
    lower-case = missing; quality < -q -> missing (only if a quality line exists); het = IUPAC letter with 2 bases (bitcnt 2);
    sequence printed only if good/len >= 0.2 and good >= -g; 60 letters per line.
  - utils/vcf2snp.pl (source read): keeps FILTER '.' or PASS, SNPs only, first sample GT -> IUPAC code; output chr, pos, ref, code.
  - utils/splitfa.c not used on this page.
- bcftools 1.25 (release 2026-10-27), https://github.com/samtools/bcftools, tag 1.25: doc/bcftools.txt and source.
  - misc/vcfutils.pl (develop branch) `vcf2fq`: defaults d=3, D=100000, Q=10 (min RMS mapQ), l=5 (indel window); reads INFO FQ, AF1, MQ, DP;
    upper case only if MQ >= Q and d <= DP <= D; IUPAC table for hets; lower case 'l' bases around indels; gaps in positions -> 'n'.
    Makefile installs misc/vcfutils.pl with the scripts.
  - ccall.c writes INFO/MQ and INFO/FQ (consensus caller, `call -c`); mcall.c writes MQ but not FQ (grep of source). Conclusion that
    `call -m` output does not fit vcf2fq is from reading the code; NOT executed (no bcftools on the writing machine; running the
    downloaded perl was not permitted). Stated as "our reading" on the page.
  - mpileup: `-d` default 250 (mpileup.c `max_depth = 250`; manual), `--ns/--skip-any-set` default UNMAP,SECONDARY,QCFAIL,DUP,
    `-C` disabled by default and "we do not recommend use of this parameter unless you fully understand the impact of it",
    `-R` regions file; .bed suffix => 0-based half-open. `call -v` = variants only. view `-g het`, `-f PASS`, `-v snps`, `-m2 -M2`, `-T`.
- seqtk v1.5 (2025-06-01), https://github.com/lh3/seqtk seqtk.c (master): `mutfa <in.fa> <in.snp>` (4 columns, changes only listed
  positions, keeps case of others); `seq -M FILE` mask BED, `-c` mask complement, `-n` default 0 = lower case, `-U` upper case, `-l`.
- mosdepth v0.3.15 (2026-10-29) README: `-F` default 1796, `-Q` mapq default 0, `--quantize`, MOSDEPTH_Q* env vars.
  Half-open quantize bins: taken from the lesson 3 s09 notes (README quantize section).
- Li H, Durbin R 2011 Nature 475:493, doi 10.1038/nature10231, PMC3154645 (full text, Methods): depth "over twice above or below half
  of the average", RMS mapping quality below 25, 10 bp around indels, consensus quality below 20 (Illumina), 35-mer mappability
  (quoted verbatim), X with PAR as missing; 100-bp bins "heterozygous if there is a heterozygote in the bin".
- Nadachowska-Brzyska K et al. 2016 Mol Ecol 25:1058, doi 10.1111/mec.13540, PMC4793928 (full text): recommend ">= 18X, a per-site filter
  of >= 10 reads and no more than 25% of missing data"; curves "did not converge until a mean genome coverage of >= 18X"; one-third
  filter at <= 10X "produced nearly flat lines"; masked sites with depth > 2x average; reads mapped to a repeat-masked assembly.
- Lesson 3 s09 notes (same repo): Clair3 `--include_all_ctgs`, DeepVariant/Clair3 commands, samtools markdup chain.
- Project numbers: lab project log and lab notes (assembly QC notes,
  notes on the relative, assembly-vs-read cross-check summary). Each statement is traced to a log entry or a re-read result file;
  the page gives only ratios and rounded values because the data of species A are unpublished.

## Derived / my wording
- "2-copy collapse: allele fraction 0.5; 3 copies 0.33": arithmetic (one differing copy of n).
- Mosdepth example `-Q 20 --quantize 0:10:61:` for a 30x mean: example values following the README rule, not a recommendation.
- "Long reads need the mappability filter less": our inference, labelled on page.
- `seqtk seq -U` before mutfa to undo soft-masking: inference from seqtk mutfa (keeps case) + fq2psmcfa (lower case = missing).
- psmcfa counting awk one-liner: written by me, not tested on a real file (simple gsub counts).
- In "Our projects": depth bounds about 0.5-1.8x of the mean (arithmetic from the logged bounds).

## Toy model (JS)
- 4 contigs (8, 6, 4 kb autosome/autosome/X/1.6 kb mt), mean depth 30x, depth Poisson per 50-bp segment times copy factor
  (X 0.5, mt 40, duplication 2 or 3, low-coverage 0.2). MAPQ 60, repeats 0-13, microsatellite 35, 4 % of segments 25-49.
- Real hets 2.5/kb on autosomes, alt reads Binomial(d, 0.5). False hets: errors 0.6/kb (AF 0.07), duplication 7/kb (AF 1/copies),
  repeat mismaps 6/kb (AF 0.15-0.5), microsatellite 5 sites (AF ~0.5), mt 5 sites, one X site AF 0.4.
- Toy caller: het if >= 2 reads of each allele. Bins follow fq2psmcfa (N if > 90 % missing) or the stricter "< 50 callable" rule.
- All rates are toy values chosen for visibility, not measurements.

## Open doubts / not verified
- vcf2fq + `bcftools call -c` pipeline not run here; the claim that `call -m` breaks vcf2fq is source reading only.
- Whether vcfutils.pl is installed by every bioconda bcftools package: not checked (page says it is in psmc/bcftools sources only implicitly).
- No mappability tool command given (SNPable/GenMap not checked).
- Duplicate marking for long-read libraries: not discussed (no doc checked).
- The "stricter bin rule (<50 callable)" is from lab notes about our own script; the script is not public.
