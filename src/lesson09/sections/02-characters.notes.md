# s02 From sequences to characters: notes

Written 2026-11-06. "Abstract only" says where a paper was not read in full.

## Sources and the supporting sentence

1. **Koonin EV (2005)** Orthologs, paralogs, and evolutionary genomics. Annu Rev Genet 39:309-338, doi 10.1146/annurev.genet.39.073003.114725. ABSTRACT ONLY (PubMed record; the publisher page returned 403).
   - "Orthologs and paralogs are two fundamentally different types of homologous genes that evolved, respectively, by vertical descent from a single ancestral gene and by duplication."
2. **Wong KM, Suchard MA, Huelsenbeck JP (2008)** Alignment uncertainty and genomic analysis. Science 319:473-476, doi 10.1126/science.1151532. ABSTRACT ONLY.
   - "the alignment is treated as an observation, and all of the subsequent inferences depend on the alignment being correct."
   - "uncertainty in the alignment can lead to several problems, including different alignment methods resulting in different conclusions" (seven yeast species).
3. **MAFFT manual** https://mafft.cbrc.jp/alignment/software/manual/manual.html (read on the site; page says "Updated: 2007-06-09" and "This manual does not cover all the features of the latest version"; no version number on the page).
   - Usage: "mafft [options] input [> output]". "Multiple alignment program for amino acid or nucleotide sequences".
   - --auto: "Automatically selects an appropriate strategy from L-INS-i, FFT-NS-i and FFT-NS-2, according to data size. Default: off (always FFT-NS-2)".
   - L-INS-i: "probably most accurate; recommended for <200 sequences". FFT-NS-2: "(fast; progressive method)".
   - --localpair: "All pairwise alignments are computed with the Smith-Waterman algorithm." "A combination with --maxiterate 1000 is recommended (L-INS-i)." --maxiterate: "number cycles of iterative refinement are performed. Default: 0".
   - The page does not mention --adjustdirection; it is not used on the page.
4. **trimAl documentation** https://trimal.readthedocs.io/en/latest/ (intro, algorithms and usage pages, read; no version number on the pages).
   - "trimAl is a tool for automated removal of spurious sequences or poorly aligned regions".
   - -gappyout: "This method relies on the gap distribution within the multiple sequence alignment (MSA)."
   - -automated1: "This heuristic is specifically fine-tuned for trimming alignments intended for maximum likelihood phylogenetic analyses."
   - -gt: "1 - (fraction of gaps in the column). Range: [0 - 1]". Example 3: "trimal -in <inputfile> -out <outputfile> -gappyout".
5. **Capella-Gutierrez S, Silla-Martinez JM, Gabaldon T (2009)** trimAl. Bioinformatics 25:1972-1973, doi 10.1093/bioinformatics/btp348. ABSTRACT ONLY.
   - "These include the proportion of sequences with a gap, the level of amino acid similarity and, if several alignments for the same set of sequences are provided, the level of consistency across different alignments."
6. **Criscuolo A, Gribaldo S (2010)** BMGE. BMC Evol Biol 10:210, doi 10.1186/1471-2148-10-210. ABSTRACT ONLY.
   - "Calculation of these entropy-like scores is weighted with BLOSUM or PAM similarity matrices". "Sets of contiguous characters with a score above a given threshold are considered as not suited for phylogenetic inference and then removed."
7. **Steenwyk JL, Buida TJ, Li Y, Shen X-X, Rokas A (2020)** ClipKIT. PLoS Biol 18:e3001007, doi 10.1371/journal.pbio.3001007. ABSTRACT ONLY. (The ClipKIT website was also fetched; it gave no version and no mode details, so no default mode is stated on the page.)
   - "Highly divergent sites in multiple sequence alignments (MSAs), which can stem from erroneous inference of homology and saturation of substitutions, are thought to negatively impact phylogenetic inference."
   - "ClipKIT ... aims to identify and retain parsimony-informative sites"; "ClipKIT consistently outperformed other trimming methods across diverse datasets".
8. **Tan G, Muffato M, Ledergerber C, Herrero J, Goldman N, Gil M, Dessimoz C (2015)** Current methods for automated filtering of multiple sequence alignments frequently worsen single-gene phylogenetic inference. Syst Biol 64:778-791, doi 10.1093/sysbio/syv033. ABSTRACT ONLY.
   - "the trees obtained from filtered MSAs are on average worse than those obtained from unfiltered MSAs"; "light filtering (up to 20% of alignment positions) has little impact on tree accuracy".

## Our own definitions, not from a source
- Parsimony-informative column (at least two states, each in at least two sequences) is the textbook definition; not quoted from a source here. Section 05 should give it with its own citation.
- Pairwise deletion of gap columns, p-distance = differences / columns compared: the toy's rule, said so on the page. The page says programs differ; this was not checked per program.
- Concatenation (supermatrix) paragraph: general description, no source cited; it points to s10 for the reason it can fail.
- "Orthology = species split, paralogy = duplication" tree rule: follows the definition in item 1; the 4-gene tree is invented.

## Controls
- Ortholog/paralog toy: relation() for all 6 pairs, both orders, against a hand-written list. Result 6 of 6, passed (clicked in headless Chrome).
- Alignment toy: pair counts from the main routine vs a second routine (strings, zip, filter, reduce) on 300 random gap slides and trim sets: 300 of 300 agree; sliding changed no letters (0); start table equals counts made by hand with a separate script (columns compared, differences: 1-2 20/2, 1-3 22/4, 1-4 21/5, 2-3 20/4, 2-4 19/5, 3-4 21/3). Passed.

## Doubts
- Four of the papers were read as abstracts only, as marked. The ClipKIT, BMGE and trimAl quotes on the page are all from abstracts or the documentation pages.
- The MAFFT manual is dated 2007; recommended-strategy text may have changed in current versions. The page says so.
- The ClipKIT "default mode" and the trimAl/BMGE default thresholds were not verified and are not stated on the page.
