# s07 "What the assembler gives you" — notes

## Sources (fetched 2026-10-31)
- hifiasm source + docs, git clone https://github.com/chhylp123/hifiasm (master ec9a8b2, 2025-03-18, `HA_VERSION "0.25.0-r726"`), local copy `lesson2/src/s07_hifiasm`.
  - `README.md`: commands (default, `--primary`, `-l0`, `--ont`, `--h1/--h2`, yak + `-1/-2`, `--dual-scaf`, `--telo-m`), the `bp.p_ctg` / `bp.hap?.p_ctg` text ("occasional switch errors", "frequency of switches is determined by the heterozygosity"), `dip.hap1/2` trio names, the GFA->FASTA awk line, `-f38/-f39` advice, the results table (HG002 36x, 48 threads, 7.7 h wall, 137 GB; trio same).
  - `docs/source/interpreting-output.rst`: list of output files per mode (bp, hic, dip, `--primary`/`-l0`), noseq/lowQ.bed, `--hom-cov` log line.
  - `docs/source/pa-assembly.rst`: `-s` default 0.55, one set much larger -> lower `-s` or set `--hom-cov`.
  - `docs/source/hic-assembly.rst`: quotes on haplotigs, chromosomes randomly mixed, no scaffolding.
  - `docs/source/trio-assembly.rst`: yak count commands, "does not purge haplotig duplicates by default", reuse of bins with /dev/null, `yak trioeval` W/H example lines (0.8818 %, 0.8025 %). NOTE: this page writes `NA12878.asm.hap1.p_ctg.gfa` without `.dip`.
  - `docs/source/parameter-reference.rst`: `-l` levels and defaults (3 non-trio, 0 trio), `-s` 0.75 (-l1/-l2) / 0.55 (-l3), `--n-hap`, `--primary`.
  - `docs/source/faq.rst`: which output to prefer (dip > hic > bp), `-l0` for inbred, polyploid advice (use primary + purge_dups rounds, `--n-hap` >2), `yak trioeval -e` for misjoined contigs.
  - Source verification: `Overlaps.cpp get_outfile_name()` (trio -> `.dip`, Hi-C -> `.hic`, `HA_F_PARTITION` -> `.bp`, else none); `CommandLines.cpp` (`HA_F_PARTITION` set by default, removed by `--primary`); `Overlaps.cpp` ~39654 (`bp` output only if partition AND purge level > 0, so `-l0` gives p_ctg + a_ctg); contig prefixes `ptg`, `atg`, `h1tg`/`h2tg` and `"ptg%.6d%c"` with `l`/`c`; `--dual-scaf` sets `self_scaf`, used only in the haplotype-output path (`gen_self_scaf` -> `output_hap_sc_graph`), default max gap 3,000,000.
- yak https://github.com/lh3/yak (master; `yak.h` YAKS_VERSION "0.1-r93-dirty"): README (two identical streams for paired-end), `trioeval.c` usage (`-e` prints error positions; output lines `W #switchErr denominator rate`, `H #hammingErr ...`).
- Heng Li, "Concepts in phased assemblies", https://lh3.github.io/2021/04/17/concepts-in-phased-assemblies : definitions of haplotig, switch error, Hamming error, collapsed (=squashed/consensus), primary, alternate, partially phased, haplotype-resolved.
- Heng Li, "Introducing dual assembly", https://lh3.github.io/2021/10/10/introducing-dual-assembly : dual assembly definition, switches.
- Flye USAGE.md (master, version 2.9.6), https://github.com/mikolmogorov/Flye/blob/flye/docs/USAGE.md : collapsed "single mosaic haplotype", `--keep-haplotypes`, `--no-alt-contigs`.
- WhatsHap guide https://whatshap.readthedocs.io/en/latest/guide.html : phase set = connected component of reads; `whatshap stats` block_n50 is NG50 vs contig length.
- Merqury README https://github.com/marbl/merqury : `merqury.sh read-db.meryl asm1.fasta asm2.fasta out`; spectra-asm plot; with hap-mers: phase_block.sh / switch_error.sh.
- NCBI "Submitting Multiple Haplotype Assemblies" https://www.ncbi.nlm.nih.gov/genbank/diploid_haps/ (updated 2025-03-25): one BioSample, separate BioProjects, umbrella BioProject, labels.
- NCBI Submission Portal https://submit.ncbi.nlm.nih.gov/about/genome/ : "Pseudohaplotypes/Haplotypes" submission type, principal/alternate, maternal/paternal, haplotype 1/2.
- Galaxy Training Network VGP tutorial https://training.galaxyproject.org/training-material/topics/assembly/tutorials/vgp_genome_assembly/tutorial.html : "pseudohaplotype assembly" = primary + alternate; VGP recommends Hi-C phasing when no parents; hap1/hap2 scaffolded separately; purge_dups on the primary (solo route). Only the first 100k characters were read.
- the internal project-facts sheet section 2 (species A) and 1 (species B/C) for "In our projects". Species A-D are unpublished: the page gives only relative or rounded values.

## Verified facts used
- File names/contig prefixes per mode: see table in html; all from docs + source.
- `-l0` also yields primary/alternate (docs + source).
- Trio default purge level 0; non-trio 3.
- `--dual-scaf` affects only hap1/hap2 (source; also matches species A byte-identical bp.p_ctg).

## Not verified / left out or softened
- Doc inconsistency: trio-assembly.rst omits `.dip`; README/output page/source say `dip.hap1`. Page states this.
- hifiasm source has a multi-haplotype Hi-C path (`output_hic_graph_mmhap` when `--n-hap` > 2, files hap1..hapN). Not in docs; left out of the page; FAQ advice used instead.
- Whether VGP purges both Hi-C haplotypes: not confirmed from the part of the GTN page read; page says only "scaffolded separately".
- Hybrid statement limited to hifiasm's own advice (`-s`, `--hom-cov`) and the mechanism of trio binning; no published hybrid example cited.
- Toy model simplification (stated in the tool note): a read links two het sites if longer than their distance; real linking also depends on coverage and repeats.
- Species A whatshap NG50 (given only as "tens of Mb") quoted from the facts sheet; whether it is block NG50 is assumed.

## Suggested cross-links
- s05 (Hi-C/YaHS) from phase block and Hi-C product; s06 (purge_dups) from collapsed/primary; s08 (Merqury QV/completeness, hap1 vs primary); s10 (BUSCO on each haplotype); s13 (deposition: BioSample/BioProject/umbrella); lesson 1 #gp (heterozygosity, hom peak for --hom-cov).
