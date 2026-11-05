# s01 What DNA methylation is and why zoologists care: sources and checks

Checked 2026-11-01. Abstracts read on PubMed (PMID given); full text read on PubMed Central where marked (PMC).
Every number in the page is listed here with the sentence it comes from.

## Definitions and CpG islands

- UCSC Genome Browser, CpG Islands track (hg38 `cpgIslandExt`), track description page,
  https://genome.ucsc.edu/cgi-bin/hgTrackUi?db=hg38&g=cpgIslandExt (read 2026-11-01).
  - Criteria: "GC content of 50% or greater", "length greater than 200 bp", "ratio greater than 0.6 of observed
    number of CG dinucleotides to the expected number".
  - Formula: "Obs/Exp CpG = Number of CpG * N / (Number of C * Number of G)", N = sequence length, "cited in
    Gardiner-Garden et al. (1987)".
  - Method: scoring "+17 for CG and -1 for others", maximally scoring segments, then the criteria. The page's
    200-bp window scan is our teaching simplification and says so.
- Gardiner-Garden M, Frommer M 1987 J Mol Biol 196:261. PMID 3656447. doi:10.1016/0022-2836(87)90689-9.
  Abstract: islands at "the 5' ends of all housekeeping genes and many tissue-specific genes"; two theories
  (G+C stability, CGX arginine codon) could not account for CpG distribution; maintenance of islands as
  "methylation-free zones" in germline DNA discussed.
- Takai D, Jones PA 2002 PNAS 99:3740. PMID 11891299. doi:10.1073/pnas.052410099. Abstract: islands in promoters
  "can play important roles in gene silencing during processes such as X-chromosome inactivation, imprinting, and
  silencing of intragenomic parasites"; G-G&F definition includes sequences associated with intragenomic parasites;
  stricter ">500 bp, G+C >= 55 %, O/E 0.65" "excluded most Alu-repetitive elements". "Any definition of a CpG
  island is somewhat arbitrary."
- Saxonov S et al. 2006 PNAS 103:1412. PMID 16432200. doi:10.1073/pnas.0510310103. "Seventy-two percent of
  promoters belong to the class with high CpG content"; CpGs "mutate at a lower frequency in the HCG promoters,
  suggesting ... hypomethylated in the germ line".
- Bird AP 1980 Nucleic Acids Res 8:1499. PMID 6253938. doi:10.1093/nar/8.7.1499. Quote used: "the likely cause of
  the CpG deficiency in heavily methylated genomes".
- Zhou W, Liang G, Molloy PL, Jones PA 2020 PNAS 117:19359. PMID 32719115. doi:10.1073/pnas.1921719117 (PMC7431005,
  full text). Same O/E formula in Methods; "human DNA shows a CpG O/E ratio of about 0.25"; 53 organisms, genome
  size correlates positively with TE share and negatively with CpG O/E "in both TEs and the host DNA".
  "Random sequence gives about 1" follows from the formula (expected = composition-only product); Zhou et al.
  do not state a random value explicitly (their Fig. 6 legend puts an early TE-free genome at about 1).

## Enzymes and other marks

- Lyko F 2018 Nat Rev Genet 19:81. PMID 29033456. doi:10.1038/nrg.2017.80. "canonical DNMT enzymes - DNMT1, DNMT3A
  and DNMT3B".
- Bewick AJ et al. 2017 Mol Biol Evol 34:654. PMID 28025279. doi:10.1093/molbev/msw264 (PMC5400375, full text):
  "established de novo by DNA methyltransferase 3 (DNMT3), and maintained by the maintenance methyltransferase
  DNMT1"; "DNA methylation in mammals, which is found throughout the genome except at CpG islands near promoters of
  genes"; WGBS "from 41 species from six orders"; genomic levels "from zero (all Diptera examined) to ~14 %
  (Blattella asahinai)"; ~42 % in coding regions in B. germanica; "The loss of DNA methylation co-occurred with the
  loss of DNMT1 and DNMT3 in Diptera"; "CpGO/E accurately estimates presence/absence of DNA methylation in 18/18
  (100%) species".
- Tahiliani M et al. 2009 Science 324:930. PMID 19372391. doi:10.1126/science.1170116. TET1 converts 5mC to 5hmC.
- Kriaucionis S, Heintz N 2009 Science 324:929. PMID 19372393. doi:10.1126/science.1169786. "hmdC constitutes 0.6% of
  total nucleotides in Purkinje cells".
- Huang Y et al. 2010 PLoS One 5:e8888. PMID 20126651. doi:10.1371/journal.pone.0008888. Bisulfite does not
  distinguish 5mC from 5hmC.
- Greer EL et al. 2015 Cell 161:868. PMID 25936839. doi:10.1016/j.cell.2015.04.005. 6mA in C. elegans; C. elegans
  lacks detectable 5mC and cytosine DNMT homologs.
- Kong Y et al. 2022 Science 375:515. PMID 35113693. doi:10.1126/science.abe7489 (PMC9382770). "commensal or soil
  bacteria explained the vast majority of 6mA in insect and plant samples"; "no evidence of high 6mA in
  Drosophila, Arabidopsis, or human".

## Lineages and genomic contexts

- Keller TE, Han P, Yi SV 2016 Mol Biol Evol 33:1019. PMID 26715626. doi:10.1093/molbev/msv345. Invertebrates
  "sparsely methylated ... mostly targeted to a subset of transcription units (gene bodies)"; vertebrates "globally
  and heavily methylated, punctuated by the limited local hypo-methylation of putative regulatory regions such as
  promoters"; gene-body methylation "associated with expression of invertebrate genes"; "promoter methylation is
  preferentially found in lineage- and tissue-specific vertebrate genes".
- Zemach A et al. 2010 Science 328:916. PMID 20395474. doi:10.1126/science.1186366. "gene body methylation is
  conserved between plants and animals, whereas selective methylation of transposons is not".
- de Mendoza A, Lister R, Bogdanovic O 2020 J Mol Biol 432:1687. PMID 31726061. doi:10.1016/j.jmb.2019.11.003.
  Quote used: view that genome hypermethylation is exclusive to vertebrates "has recently been challenged".
- Jones PA 2012 Nat Rev Genet 13:484. PMID 22641018. doi:10.1038/nrg3230. Abstract only: "the function of DNA
  methylation seems to vary with context". Full text not read; the page cites it only for that quote and for
  treating gene bodies as a separate context.
- Yoder JA, Walsh CP, Bestor TH 1997 Trends Genet 13:335. PMID 9260521. "Most of the 5-methylcytosine in mammalian
  DNA resides in transposons"; "Transposon promoters are inactive when methylated and, over time, C-->T transition
  mutations at methylated sites destroy many transposons."
- Xu GL et al. 1999 Nature 402:187. PMID 10647011. doi:10.1038/46052. Classical satellite DNA "normally heavily
  methylated", "almost completely unmethylated" in ICF; satellites 2 and 3, chromosomes 1, 9, 16; DNMT3B mutations.

## Imprinting and X inactivation

- Renfree MB, Suzuki S, Kaneko-Ishino T 2013 Phil Trans R Soc B 368:20120151. PMID 23166401.
  doi:10.1098/rstb.2012.0151. Marsupials have imprinting "in fewer loci"; "no evidence for genomic imprinting in
  the egg-laying monotreme mammals"; DMR "established in the male or female germline".
- Renfree MB et al. 2008 Reproduction 136:523. PMID 18805821. doi:10.1530/REP-08-0264. No DMRs in marsupial IGF2R,
  INS, MEST ("histone modification appears to be the mechanism"); DMRs in H19, IGF2, PEG10.
- Loebel DA, Johnston PG 1996 Genome Res 6:114. PMID 8919690. doi:10.1101/gr.6.2.114. Island methylation on the
  inactive X "considered to be a stabilizing mechanism" in eutherians; wallaroo G6PD island hypomethylated in male
  and female; "methylation of CpG islands is not required for maintenance of X inactivation in marsupials".

## Epigenetic clocks

- De Paoli-Iseppi R et al. 2017 Front Genet 8:106. PMID 28878806. doi:10.3389/fgene.2017.00106 (review).
- Parrott BB, Bertucci EM 2019 Trends Ecol Evol 34:767. PMID 31296344. doi:10.1016/j.tree.2019.06.008 (review).
- Wilkinson GS et al. 2021 Nat Commun 12:1615. PMID 33712580. doi:10.1038/s41467-021-21900-2. "712 known-age bats,
  representing 26 species".
- Robeck TR et al. 2023 Commun Biol 6:359. PMID 37005462. doi:10.1038/s42003-023-04734-0. Mammalian methylation
  array, "37,492 cytosine-guanine sites", blood and skin, "n = 171", median absolute error 1.7 years (LOOCV).
- Lu AT et al. 2023 Nat Aging 3:1144. PMID 37563227. doi:10.1038/s43587-023-00462-6. "11,754 methylation arrays ...
  59 tissue types across 185 mammalian species".
- Hanski E et al. 2024 Mol Ecol 33:e17330. PMID 38561950. doi:10.1111/mec.17330. Faecal clock from laboratory C57BL/6 mice
  applied to wild mice; "for a given body mass, wild mice had higher methylation ... (and consistently higher
  epigenetic age estimates as a result)".

## Inheritance

- Heard E, Martienssen RA 2014 Cell 157:95. PMID 24679529. doi:10.1016/j.cell.2014.02.045 (PMC full text):
  "These two rounds of epigenetic erasure leave little chance for inheritance of epigenetic marks"; "Imprinted
  loci succumb to germ line reprogramming but resist the post-zygotic phase"; escaping loci "predominately
  repeat-associated"; "proof that transgenerational inheritance has an epigenetic basis is generally lacking in
  mammals"; well documented in plants and nematodes; inter-generational effects such as intrauterine maternal
  caloric restriction.
- Horsthemke B 2018 Nat Commun 9:2973. PMID 30061690. doi:10.1038/s41467-018-05445-5. Confounded "by genetic,
  ecological and cultural inheritance".

## In our projects

- CpG : non-CpG table: lab notes (CpG divergence review, 71 family rows; young = non-CpG substitution density
  < 0.08); code in the public repository https://github.com/Toki-bio/SINE-discriminator (public, checked by the
  lesson coordinator 2026-10-31).
- Species A (a rodent) reads: lab project log. FASTQ without raw signal or modification tags; request to the provider for
  raw signal and run details recorded as pending. No lab methylation calls are recorded.

## Interactive figures (generated in the page, no external data)

- Toy contexts: sequences generated by a seeded random generator; methylation levels per context are illustrative
  values chosen to match the qualitative patterns above (island ~0, gene body and TE high in mammal; insect gene body
  moderate; fly 0); the silenced island uses one copy ~95 % and the other ~2 %. Not measurements; the page says so.
- Calculator: whole-sequence O/E with the UCSC/G-G&F formula; 200-bp sliding window, pass = G+C >= 0.5 and O/E > 0.6.
  N and other letters are not counted, and C-N-G is not a CpG.

## Open doubts

- Jones 2012 full text not read; vertebrate gene-body methylation is stated only via Bewick (genome-wide except
  islands) and Jones's "varies with context".
- The insect toy (gene body ~55 %, others ~0) is a qualitative illustration; levels vary widely among insects
  (Bewick et al. 2017).
- 5mC/5hmC long-read models are referred to s02; not verified in this section.
