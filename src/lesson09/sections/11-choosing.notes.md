# s11 Choosing and reporting - notes

Written 2026-11-06. Pages opened and the exact supporting sentences. "Abstract only" = full text not read.

1. **Newick standard**, https://phylipweb.github.io/phylip/newicktree.html (no date; "adopted 26 June 1986 by an informal committee").
   "Interior nodes are represented by a pair of matched parentheses." / "separated by commas." / "The tree ends with a semicolon." / branch length "after a node and preceded by a colon." / "A name can be any string of printable characters except blanks, colons, semicolons, parentheses, and square brackets." / "Trees can be multifurcating at any level." / "Here the convention is simply to arbitrarily root the tree and report the resulting rooted tree." Examples used: `(B,(A,C,E),D);`, `(B:6.0,(A:5.0,C:3.0,E:4.0):5.0,D:11.0);`, `((A,B),(C,D));`, `(Alpha,Beta,Gamma,Delta,,Epsilon,,,);` (the code control parses them: 5 tips and length sum 34; 9 tips).
2. **IQ-TREE tutorial**, https://iqtree.github.io/doc/Tutorial. "Starting with version 1.5.4, -m MFP is the default behavior." / "-B specifies the number of bootstrap replicates where 1000 is the minimum number recommended." / same for -alrt / ".treefile: the ML tree in NEWICK format, which can be visualized by any supported tree viewer programs."
3. **IQ-TREE FAQ**, https://iqtree.github.io/doc/Frequently-Asked-Questions. "For UFBoot, you should only start to rely on a branch if its support is >= 95%." / "One would be more confident if a clade has its SH-aLRT >= 80% and UFboot >= 95%." / "These recommendations only apply to single gene trees." / "UFBoot supports and even the more conservative Felsenstein's bootstrap supports will tend to be 100%" / "You are recommended to compute concordance factors for any phylogenomic analysis." / "you should not compare BS% with UFBoot% directly."
4. **IQ-TREE concordance factors**, https://iqtree.github.io/doc/Concordance-Factor. gCF: "the percentage of decisive gene trees containing that branch". sCF: "the percentage of decisive alignment sites supporting a branch in the reference tree." Commands copied from the page: `iqtree3 -t concat.treefile --gcf loci.treefile --prefix concord`; `iqtree2 -t concat.treefile -s ALN_FILE --scf 100 --prefix concord -T 10` (the page says --scf is the older parsimony-based sCF and recommends --scfl with iqtree3 from 2.2.2: not mentioned on the page, open doubt).
5. **IQ-TREE 2 wiki home**, https://github.com/iqtree/iqtree2/wiki: lists UFBoot, ModelFinder, SH-aLRT, "Support for very large datasets".
6. **MrBayes 3.2 manual**, tag v3.2.7a (PDF read in full-text search). "A rough guide is that an average standard deviation below 0.01 is very good indication of convergence, while values between 0.01 and 0.05 may be adequate depending on the purpose of your analysis." / "A small ESS (< 100) would indicate poor mixing behaviour" / PSRF "close to 1.0". The page quotes "very good indication of convergence".
7. **Kapli, Yang, Telford 2020**, Nat Rev Genet 21:428-444, doi 10.1038/s41576-020-0233-0, abstract only: "identification of orthologous genes or proteins, multiple sequence alignment, and choice of substitution models and inference methodologies. Understanding the different sources of errors and the strategies to mitigate them is essential".
8. **Omland, Cook, Crisp 2008**, BioEssays 30:854-867, doi 10.1002/bies.20794, abstract only: "primitive lineage fallacy", "early branching" or "basal".
9. **Maddison, Swofford, Maddison 1997**, Syst Biol 46:590-621, abstract only (via publisher page): "NEXUS is a file format designed to contain systematic data for use by computer programs." Blocks (taxa, characters, trees) as paraphrased by the page summary. The Nexus snippet on the page is our own example.
10. **ASTRAL-III**, Zhang et al. 2018, BMC Bioinformatics 19(Suppl 6):153, abstract only: "can scale up to 10,000 species"; removing branches with very low support (e.g., below 10%) improves accuracy, overly aggressive filtering harmful.
11. **BEAST 2.5**, Bouckaert et al. 2019, PLoS Comput Biol 15:e1006650, abstract only: joint models combining "genome sequences, sampling dates, phenotypic data, radiocarbon dates, fossil occurrences".
12. **FigTree README**, https://github.com/rambaut/figtree: "designed as a graphical viewer of phylogenetic trees and as a program for producing publication-ready figures"; "superseded by PearTree". **iTOL help**, https://itol.embl.de/help.cgi (Newick, Nexus, PhyloXML, Jplace). **ggtree**, Bioconductor 3.23, version 4.2.1.

## Marked as advice (no source)
Methods checklist items for data, dating, root, files; the support-values-on-rerooting caution; branch lengths are not time; SINE presence/absence handling and dating route; use of NJ for a first look; mitochondrion counts as one locus; ASTRAL after IQ-TREE habit.

## Doubts
- Gregory 2008 and Baum 2008 tree-reading articles were not reachable (paywall); Omland 2008 is abstract only.
- No source read for SINE-based phylogenetics; that branch of the helper is labelled advice throughout.
- Applying MrBayes ESS thresholds to BEAST is by analogy, stated on the page.
- The code controls check structure and tags, not the truth of the claims.

## Final review 2026-11-06
- The helper's example commands now call `iqtree3`, as s06 and s10 do. The FigTree README note ("superseded by PearTree") was re-checked on the GitHub README.
