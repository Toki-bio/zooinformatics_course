# s02 How long reads see methylation: sources and notes

Checked 2026-11-01.

## Tool documentation and source code

- Dorado v2.1.2 (released 26 August 2026), https://github.com/nanoporetech/dorado (commit 8b8fc5d, tag v2.1.2)
  - CHANGELOG.md: 1.0.0 (21 May 2025) "removes support for Fast5 files"; fast5 to be converted to POD5.
  - README.md: modified basecalling example `dorado basecaller hac,5mCG_5hmCG,6mA pod5s/ > calls.bam`.
  - dorado/models/models.cpp: modification models for `dna_r10.4.1_e8.2_400bps_sup@v5.2.0`: `4mC_5mC`, `5mC_5hmC`,
    `5mCG_5hmCG`, `6mA` (versions @v1/@v2).
  - dorado/config/ModBaseModelConfig.cpp: "only one modbase model motif per canonical base is allowed".
  - dorado/cli/cli_lib/basecaller.cpp: help for `--modified-bases-threshold` ("The minimum predicted methylation
    probability for a modified base to be emitted in an all-context model"); error message
    "--emit-fastq cannot be used with modbase models as FASTQ cannot store modbase results."
  - dorado/hts_utils/bam_utils.cpp: @RG header line written with `basecall_model=` and `modbase_models=`.
  - dorado/read_pipeline/nodes/ModBaseChunkCallerNode.cpp: the modification caller works on scaled signal chunks plus
    sequence (basis for "takes chunks of signal, not letters").
  - `--emit-moves`: dorado/cli/cli_lib/basecall_output_args.cpp.
- Dorado online docs, modified bases: https://software-docs.nanoporetech.com/dorado/latest/basecaller/mods/
  (threshold "has no effect on the modification probabilities"; "only one modification model per canonical base
  may be active at once"; `sup,4mC_5mC,5mC_5hmC` "is invalid").
- jasmine README, https://github.com/PacificBiosciences/jasmine (commit 2709eb0, 29 May 2026; version 26.1.3):
  input tags fi/fp, ri/rp; `--min-passes` default 2; 5mC one call per CpG dyad on the forward strand, needs both
  strands' kinetics; 5hmC strand-specific; 6mA for Fiber-seq; `?` for 5mC/5hmC, `.` for 6mA; "present but empty"
  vs "absent" blocks; MethBat recommended, pb-CpG-tools deprecated; bioconda `pbjasmine`; usage
  `jasmine movie.hifi_reads.bam movie.jasmine.bam`; example read AGTCTAGACTCCGTAATTACTCGCCTAG with
  `MM:Z:C+m?,3,1` / `ML:B:C,249,4` (the decoder's first example; README's read and tags end with "...").
- ccs kinetics FAQ, https://ccs.how/faq/kinetics.html: `--hifi-kinetics` "generates averaged kinetic information
  for polished reads, independently for both strands".
- pb-CpG-tools README (v3, https://github.com/PacificBiosciences/pb-CpG-tools): map with a method that does not
  hard-clip supplementary alignments, pbmm2 (recommended) or minimap2 `-Y`.
- SAM tags specification, hts-specs commit 510c107 (12 Aug 2026), https://github.com/samtools/hts-specs SAMtags.tex,
  section on MM/ML/MN: skip counts from the 5' end of the as-sequenced read; `?` = no information, `.`/absent =
  low probability of modification; ML value N = probability N/256 to (N+1)/256; multi-modification form `C+mh`
  interleaves ML values; MN = SEQ length when MM/ML were written. Decoder examples 2 and 3 use the spec's notation
  (example 3 reuses the spec's ML values 204,26,89,130) on our toy read.
- PacBio Revio page, https://www.pacb.com/revio/ (read 2026-11-01): "Every standard run delivers on-instrument 5mC,
  5hmC, and 6mA methylation calling".

## CycloneSEQ

- No vendor documentation describing modified-base calling or MM/ML output was found (web search 2026-11-01).
- Wick R. 2024. A first look at CycloneSEQ data. https://rrwick.github.io/2024/12/17/cycloneseq.html - basecalling
  process unclear; CycloneMaster "doesn't appear to be freely available"; no mention of methylation.
- Liu X. et al. 2026. When CycloneSEQ meets Oxford Nanopore Technologies. bioRxiv 10.64898/2026.01.14.699587
  (not peer-reviewed): WGS vs methylation-free WGA libraries; "WGA controls implicated methylation as a major
  contributor" to shared substitution errors; two research signal-to-reference methods (event alignment; adapted
  Bonito move tables) showed differences at one 5mC motif (CCTGG) in E. coli; not a vendor caller, no MM/ML output.

## Papers (methods)

- Frommer M. et al. 1992 PNAS 89:1827, doi:10.1073/pnas.89.5.1827 (bisulfite sequencing).
- Vaisvila R. et al. 2021 Genome Res 31:1280, doi:10.1101/gr.266551.120 (EM-seq).
- Simpson J.T. et al. 2017 Nat Methods 14:407, doi:10.1038/nmeth.4184 (nanopolish CpG detection).
- Rand A.C. et al. 2017 Nat Methods 14:411, doi:10.1038/nmeth.4189 (signalAlign).
- Flusberg B.A. et al. 2010 Nat Methods 7:461, doi:10.1038/nmeth.1459 (SMRT kinetics detect methylation).
- Tse O.Y.O. et al. 2021 PNAS 118:e2019768118, doi:10.1073/pnas.2019768118 (HiFi CpG methylation by kinetics).

## Lab facts used (from the lab project log and lab notes)

- Species A (a rodent) long reads: one FASTQ; header style not Dorado-like, no
  basecaller-model or RG tags; no pod5 received; server without GPU; plan (never run): re-basecall with sup,
  `--emit-moves`, 5mCG_5hmCG, then `modkit pileup`; provider request with the four points of the checklist;
  pod5 size estimated at roughly ten times the reads (estimate, not measured); no answer about methylation recorded.
- Platform for species A: CycloneSEQ suspected from read-ID style (not confirmed by the provider).
- Species B and C: provider-confirmed CycloneSEQ instrument; "no modification model in the basecall model name"
  is our reading.
- Darevskia armeniaca: HiFi run in a folder labelled "_met", delivered read file is FASTQ; contents of the original
  BAM not checked.

## Toy interactives

All signal levels, shifts, IPD factors, read probabilities and the separation model in the two toy figures are
invented and labelled as such on the page. The decoder implements the SAM spec rules for one-letter codes only.

## Open doubts

- Whether the species A reads are CycloneSEQ is not confirmed by the provider.
- Whether the Darevskia "_met" run had kinetics or MM/ML tags in its BAM is unknown.
- CycloneSEQ vendor software (CycloneMaster) may have features not publicly documented.
