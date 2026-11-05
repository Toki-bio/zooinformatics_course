# Section 02: What an ancestral recombination graph is

## Sources (all opened on 2026-11-05; supporting sentence quoted)

**Wong Y, Ignatieva A, Koskela J, Gorjanc G, Wohns AW, Kelleher J. 2024. A general and efficient representation of ancestral recombination graphs. Genetics 228(1).** https://doi.org/10.1093/genetics/iyae100 (full text, PMC11373519)
- "A fundamental property of genetics is that a given DNA nucleotide is inherited from exactly 1 parent genome"
- "an ARG encodes the entire ensemble of local trees along the genome for a given set of sample nodes"
- "of those events only a small proportion are actually detectable from the data, assuming human-like mutation and recombination rates"
- "Even when a recombination event is detectable, its timing and breakpoint position can only be inferred approximately"
- "stipulating a simple tabular representation of nodes and edges, and also defining a concise representation of sequence variation using the 'site' and 'mutation' tables"

**Lewanski AL, Grundler MC, Bradburd GS. 2024. The era of the ARG. PLoS Genet 20(1).** https://doi.org/10.1371/journal.pgen.1011110 (full text, PMC10796009)
- "the structure of the new tree is identical to its neighbor except for a single edge that is removed and then affixed to a (potentially) new node ... this action is called a subtree-prune-and-regraft operation"
- "if the new edge joins to a different node on the same edge, the topology will remain unchanged, and only the edge lengths (i.e., coalescent times) will be modified"
- "It is also possible for the lineage to coalesce back into the same node, which would result in no change to the tree structure."
- "The offspring chromosome is inherited from one parental chromosome on one side of the breakpoint and the other parental chromosome on the other side."
- "The node table contains an identifier and the timing of each node ... The edge table documents the edges shared between adjoining trees by recording the parent and offspring nodes of each edge and the contiguous extent of the genome that each edge covers"
- "The basic tree sequence technically does not encode the full ARG ... the full ARG 'encodes the events that occurred in the history of a sample' while the set of local trees recorded in the tree sequence 'encodes the outcome of those events.' Nonetheless, the tree sequence can be elaborated with recombination information"

**Nielsen R, Vaughn AH, Deng Y. 2025. Inference and applications of ancestral recombination graphs. Nat Rev Genet 26:47-58.** https://doi.org/10.1038/s41576-024-00772-4 (author manuscript, PMC12036574, read through PubMed)
- "The coalescent process with recombination was first described by Hudson ... Griffiths and Marjoram ... coined the term 'Ancestral Recombination Graph'"
- "ancestral lineages may not only merge by coalescence, but also split due to recombination"
- "the lineage going from node 2 to node 4 only contains ancestral material for the first green segment ... The rest of the DNA sequence on this lineage is not ancestral to any of the three individuals in the sample."
- "Sometimes, ARGs can be represented even more simply, as just a sequence of trees ... It is then a matter of definition if these sequences of trees are truly ARGs."
- "Methods representing ARGs as a series of coalescent trees, without necessarily enforcing that the trees share nodes or branches with each other include Relate"
- "The rate of coalescence at a certain time point is inversely proportional to the effective population size ... one can use the temporal density of coalescence times of an ARG to estimate [Ne] through time."
- "We would then expect a high density of coalescence events of lineages with the selected allele"
- ABO: "If this hypothesis is true, then we would expect to see an unusually ancient TMRCA in the ABO gene."
- "the mutation and recombination rates in humans are fairly similar, meaning that, on average, every time a new mutation occurs that might provide information about the tree structure, a new recombination event will also occur"
- "it does not account for uncertainty in the underlying ARG, inducing false certainty ... the inferred ARG will be biased if the true population genetic parameters differ from the specified prior."

**Speidel L, Forest M, Shi S, Myers SR. 2019. A method for genome-wide genealogy estimation for thousands of samples. Nat Genet 51:1321-1329.** https://doi.org/10.1038/s41588-019-0484-x (author manuscript, PMC7610517, read through PubMed)
- "We estimate population sizes of all 26 populations in the dataset and their split times using cross-coalescence rates."
- "We estimate the effective population size, defined as the inverse of the coalescence rate"

**Kelleher J, Etheridge AM, McVean G. 2016. Efficient coalescent simulation and genealogical analysis for large sample sizes. PLoS Comput Biol 12(5).** https://doi.org/10.1371/journal.pcbi.1004842 (full text, PMC4856371)
- Hudson's algorithm as implemented in the toy: "We choose one of the available breakpoints uniformly, and split the ancestry of the individual at that point into two recombinant ancestors"; "If their segments do not overlap, the set of ancestral segments of the common ancestor is the union of those of a and b."
- "it stores node assignments shared across adjacent trees exactly once"

**Brandt DYC, Huber CD, Chiang CWK, Ortega-Del Vecchyo D. 2024. The promise of inferring the past using the ancestral recombination graph. Genome Biol Evol 16(2).** https://doi.org/10.1093/gbe/evae005 (full text, PMC10834162)
- "both background selection and positive selection can reduce the total branch length and alter the shape of genealogies"
- "The first example of an application to estimate the ARG and the past demographic history is the popular program PSMC"

**Hudson RR, Kaplan NL. 1985. Genetics 111:147-164.** https://doi.org/10.1093/genetics/111.1.147 (ABSTRACT ONLY)
- "It is found that RM is often much less than R, therefore, the number of recombination events may be greatly under-estimated in a parsimonious reconstruction"

**tskit tutorials**, https://tskit.dev/tutorials/what_is.html and https://tskit.dev/tutorials/args.html, read 2026-11-05
- "A branch can be shared by many adjacent trees, but is stored as a single edge in the tree sequence. For large datasets this is a great saving, because typically each tree-change affects only a few branches at a time, regardless of the tree size."

Software run for the controls: msprime 1.4.0, tskit 1.0.1. The Python snippet in the page was run as printed with these versions.

## The toy

Hudson's coalescent with recombination, written in the section's JavaScript, continuous positions, 6 haplotypes, 100 kb. Coalescence rate 1/(2N) per pair per generation, recombination rate r per base per generation over the span of each lineage. Output is a node table and an edge table. Every drawn tree, highlighted row and readout is computed from those tables. All parameter values are toy values chosen for a readable number of trees, not estimates for any species.

"Half the mean pair age" as an estimate of N relies on the expected pair age being 2N in a constant-size population. In "Two populations" the ancestral size equals the group size, so within-group pairs keep that expectation (measured below).

## Controls (run 2026-11-05 on the final simulation code)

1. **Drawn trees against tskit, in a real browser.** 72 histories (3 models x 2 recombination rates x 12 seeds), 982 trees. A script read the node and edge tables from the page, rebuilt them in tskit, walked every tree with the Next button and compared the SVG: 0 mismatches in parent of every branch, tree interval, parent drawn above child, highlighted table rows, and the N and youngest-ancestor readouts. Every tskit breakpoint was among the recombinations recorded by the simulator. Previous button walked back correctly in all 72; no breakpoint lacked a highlighted branch.
2. **Negative controls.** The same check on deliberately wrong drawings (one branch re-parented, one interval shifted by 500 bp, one tree deleted): caught 64 of 64 each.
3. **Simulator tables against tskit.** 3,600 histories, 39,630 trees: 0 failures. tskit accepted all tables. 36,030 visible breakpoints, all in the recorded list; 20,352 recorded recombinations left no trace. In "Two populations" the youngest between-group ancestor over all histories was 1,500.04 generations (true split 1,500).
4. **One breakpoint, one move.** 335,637 breakpoints: each one explained by exactly one prune and regraft, none unexplained (152,354 shape changes, 183,283 age-only).
5. **Simulator against msprime** (`discrete_genome=False`, same parameters, 10,000 replicates at r = 1e-8, 1,500 at r = 3e-8; 3 models). Mean number of trees, sequence-weighted root age, within-group and between-group pair age, youngest between-group age: 30 comparisons, largest |z| = 1.90. Example, one large population, r = 1e-8: trees 7.86 vs 7.89, root age 3,340 vs 3,326, pair age 2,003 vs 1,998 (theory 2N = 2,000). Two populations: between-group pair age 3,513 vs 3,501 (theory T + 2N = 3,500).
6. **Static three-haplotype figure.** Same graph built in tskit gives ((a,c),b) left of x and (a,(c,b)) right of x, as drawn.

The first simulator version lost ancestral material (it joined adjacent segments of the same node that had different sample counts) and did not finish. This was found before publication; all figures above are from the corrected code.

Behaviour behind the wording: N read from one 100 kb history at true N = 1,000 has mean 1,002, standard deviation 472, 90 % of histories between 377 and 1,916 ("swings widely"). Youngest between-group age has median 1,689, about 190 generations above the split ("a few hundred generations").

## Our inference, not quoted from a source

- The vole table in the simple box is an illustration, labelled as such.
- "A dip alone is not a sweep" follows from the toy (neutral histories always have a lowest stretch) plus Brandt et al.
- A breakpoint in non-ancestral material leaving no trace is our reading of Nielsen et al. and of the simulator's behaviour.

## Open doubts

- Links `#s03`, `#s06`, `#s07` assume the section numbers in the lesson plan.
- The lesson's number is not final; links to lesson 4 use `../04-demography/`.
- Histogram figure scrolls sideways on phones; the walking figure stacks instead.
