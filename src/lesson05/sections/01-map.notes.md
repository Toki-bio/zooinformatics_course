# s01 From one genome to many: notes and sources (2026-11-05)

Rule used: every entry of the helper was checked against the tool's own documentation or the review table. Exact supporting sentences below. "Abstract only" = full paper not read.

## Review (full text PDF read, Table 1 and text)
Nielsen R, Vaughn AH, Deng Y. Inference and applications of ancestral recombination graphs. Nat Rev Genet 26:47-58 (2025), doi:10.1038/s41576-024-00772-4. Author-hosted PDF.
- Table 1 columns: samples branch lengths, samples topologies, scales to 1000 Genomes, scales to UK Biobank, supports ancient DNA, supports genotyping array. Array column: Yes only for tsinfer+tsdate and ARG-Needle; No for ARGweaver, RentPlus, Arbores, Relate, ARGweaver-D, SARGE, KwARG, ARGinfer, SINGER. 1000G: Yes for Relate, tsinfer+tsdate, ARG-Needle. UK Biobank: Yes for tsinfer+tsdate, ARG-Needle.
- "ARGweaver and ARGweaver-D are the only methods that can use unphased data; tsinfer-sparse (a variation of tsinfer) and ARG-Needle are the only methods that support genotype array data."
- "Relate and tsinfer additionally require the polarization of ancestral states".
- "ARGweaver, Arbores, KwARG and ARGinfer can only handle tens of sequences"; "RentPlus, SARGE and SINGER can handle hundreds of whole-genome sequences, and Relate can handle thousands of sequences including the full 1000 Genomes Project data".
- Our reading: "sequences" = chromosome copies (animals x 2) is an assumption, stated on the page. ARGweaver "tens" is used as a ceiling of 49 animals... see doubts.

## Tool documentation
- ARG-Needle manual (palamaralab.github.io/software/argneedle/manual, read 2026-11-05): "enables inferring ARGs from genotyping array (or sequencing) data"; "can analyze either SNP array (default) or sequencing data, although its parameters have been optimized for use with SNP data, so it may be slow when applied to sequencing data"; FAQ: "The ASMC Hidden Markov model requires at least 300 haploid samples to build the conditional site frequency spectrum (CSFS). This corresponds to at least 150 diploids."; input "Phased haplotypes in Oxford haps/sample format". Repo arg-needle-lib HEAD 15d7f01 (2025-11-21).
- tsinfer docs (repo tskit-dev/tsinfer HEAD 321cfe0, 2026-11-02), docs/inference.md: "Data must be phased."; "we must know the ancestral state"; "Only biallelic sites can be used for inference." No mention of a sparse/array mode in docs of this version (searched the md/rst/py files): array claim rests on the review only.
- Relate docs (myersgroup.github.io/relate, input_data page): "The input file format for Relate is the haps/sample file format, which is used as an output file format by SHAPEIT2"; "Please make sure that the ancestral allele is represented by 0". Speidel et al. 2019 Nat Genet, doi:10.1038/s41588-019-0484-x, abstract only: "scaling to >10,000 sequences".
- SINGER README (github.com/YunDeng98/SINGER, main, read 2026-11-05): "Unfortunately for now we only support phased, high-quality genomes, and polymorphic sites with missingness will be excluded."; "-polar ... default at 0.5 for unpolarized data, please use 0.99 for polarized data"; "ARGweaver has better support in these regards."
- ARGweaver README (github.com/mdrasmus/argweaver): used only for the tool's identity; unphased claim comes from the review.
- GONE: Santiago et al. 2020 Mol Biol Evol 37:3642, doi:10.1093/molbev/msaa169, abstract only: "within the past 100 generations"; "samples of fewer than ten individuals using a variety of genotyping and DNA sequencing data: haploid, diploid with phased or unphased genotypes". README (github.com/esrud/GONE): "a maximum of 100,000 SNPs are allowed per chromosome. A maximum number of 200 chromosomes and a maximum number of 1800 individuals are allowed"; "If the population has recent migrants from another population, the estimation of Ne will be biased. A typical artefact ... is a very recent drastic drop".
- ASMC docs (github.com/PalamaraLab/ASMC, docs/asmc.md, HEAD 7ea7109, 2026-10-23): "It can be run using SNP array or whole-genome sequencing (WGS) data."; input section "Phased haplotypes in Oxford haps/sample format". ASMC paper (Palamara et al. 2018 Nat Genet) not opened.
- hap-ibd README: "detects identity-by-descent (IBD) segments ... in phased genotype data"; Zhou et al. 2020 AJHG abstract: evaluated on UK Biobank chromosome 20 data and simulated sequence data.
- IBDNe: Browning & Browning 2015 AJHG, doi:10.1016/j.ajhg.2015.07.012, abstract only: "from around 4 generations to around 50 generations ago for SNP array data and to over 200 generations ago for sequence data". IBDNe's own manual NOT read: its sample-size needs and assumptions are not stated on the page.
- Pairwise-coalescent entries (PSMC, MSMC2, SMC++, cobraa) are taken from the lesson 4 s05 table and its notes, not re-checked here.

## Control (code)
The page was driven in headless Chrome and the helper output compared with the review's Table 1: array column (Relate No, tsinfer Yes, ARG-Needle Yes, SINGER No, ARGweaver No) reproduced; unphased input gives usable only for ARGweaver (n<50) and GONE among the ARG-type tools; ARG-Needle flips from not-usable at 149 diploids to usable at 150; SINGER, MSMC2 and GONE ceilings flip at 501, 9 and 1801. 25 of 25 checks passed.

## Doubts
- "our inference" entries: pairwise tools on arrays (their docs describe sequence input only; not an explicit statement that arrays fail).
- Ceilings 49 (ARGweaver) and 500 (SINGER) are our numeric reading of "tens"/"hundreds" of sequences.
- No "In our projects" note: no project facts file was given.
- Source page claims not carried over because unverified: IBDNe assumption text, ASMC phasing, Y/mtDNA numbers.
