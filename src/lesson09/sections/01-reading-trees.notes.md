# s01 Reading a tree: sources and checks

All pages were opened with a web-fetch tool that returns a short model-made extract of the page, not the raw page. Quotes below are what the extract gave as exact quotes; none was a paper PDF. Retrieved 2026-11-06.

## Sources (opened)
- PHYLIP Newick description, https://phylipweb.github.io/phylip/newicktree.html (old address evolution.genetics.washington.edu/phylip/newicktree.html now only says the pages moved).
  - "Interior nodes are represented by a pair of matched parentheses." "Between them are representations of the nodes that are immediately descended from that node, separated by commas." "The tree ends with a semicolon."
  - Lengths: "putting a real number, with or without decimal point, after a node and preceded by a colon."
  - "the left-right order of descendants of a node affects the representation, even though it is biologically uninteresting."
  - Example `(B:6.0,(A:5.0,C:3.0,E:4.0):5.0,D:11.0);`
- Wikipedia, Newick format, https://en.wikipedia.org/wiki/Newick_format: "When an unrooted tree is represented in Newick notation, an arbitrary node is chosen as its root." Adopted at two meetings in 1986, the second at Newick's restaurant. Example `(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);`
- Wikipedia, Phylogenetic tree, https://en.wikipedia.org/wiki/Phylogenetic_tree: rooted (2n-3)!! = (2n-3)!/(2^(n-2)(n-2)!), n>=2; unrooted (2n-5)!! , n>=3; table for n=10: 2,027,025 unrooted, 34,459,425 rooted binary. Cladogram "its branch lengths do not represent time or relative amount of character change"; phylogram "branch lengths proportional to the amount of character change"; chronogram "explicitly represents time through its branch lengths".
- Wikipedia, Cladogram: clade "a group of organisms with a last common ancestor". The page does not define sister group.
- Wikipedia, Outgroup (cladistics): "a more distantly related group of organisms that serves as a reference group when determining the evolutionary relationships of the ingroup"; "allows for the phylogeny to be rooted".
- Wikipedia, Sister group: "comprises the closest relative(s) of another given unit in an evolutionary tree."
- OEIS A001147, https://oeis.org/A001147: a(n) = (2n-1)!!, terms 1, 1, 3, 15, 105, 945, 10395, 135135; comment: "unordered full binary trees with n+1 labeled leaves" (Stanley, Example 5.2.6).

## Not verified / our own statements
- Cavalli-Sforza and Edwards 1967 and Felsenstein 1978 (The number of evolutionary trees) were NOT opened; the page does not cite them as sources. Only the formulas and values from the pages above are used.
- "Clade = ancestor plus all descendants", "branching point is a hinge", the 3 x 5 x 7 derivation and "rooted n = unrooted n+1" are our own explanation (the derivation is simple counting, also verified by the listing program).
- Sister groups: Wikipedia's definition quoted; our "each is the closest relative of the other within the tree" is a paraphrase.
- The Newick statement that the order of children does not change the tree rests on the PHYLIP sentence above plus the definition of a tree; the Wikipedia pages fetched did not say it.
- Typical unit of phylogram scale bars (changes per site) is announced as explained in s03; nothing is cited here beyond "proportional to the amount of character change".
- The toy tree: real common names, invented lengths, simplified relationships (stated on the page).

## Controls (node script run in the session, all PASS)
- Formula against published values n = 3,4,5,6,7,8,10 (OEIS, Wikipedia): all equal.
- Independent program lists every unrooted tree by adding tips one at a time to every branch (de-duplicated by a canonical string) and rooted trees by rooting each on every branch: counts 1,3,15,105,945,10395 unrooted and 3,15,105,945,10395 rooted (n = 3..8 unrooted; n = 3..7 rooted) equal the formulas. The page repeats this check live for n = 3..8.
- 3000 random rotations and re-rootings: set of splits of the unrooted tree unchanged, Human-Mouse branch distance unchanged, rotation never changed a "root" or "never changes" statement, re-rooting did change root statements, rotation did change drawing statements.
- n = 20 unrooted = 221,643,095,476,699,771,875 (page says about 2 x 10^20).
- Test hook: the JS exports its core with `module.exports` only when `module` exists (not in the browser).

## Final review 2026-11-06
- Added one sentence on midpoint rooting (root halfway between the two most distant tips; assumes equal rates), because s04 refers to it as explained here. Our wording of the standard method; no source opened for it.
Sources changed 2026-11-07: the arbitrary root of an unrooted Newick tree now quotes the PHYLIP page ("Here the convention is simply to arbitrarily root the tree and report the resulting rooted tree."), and the tree counts rest on OEIS A001147 (data line holds 2027025 and 34459425; comment "the number of unordered full binary trees with n+1 labeled leaves (Stanley, ex 5.2.6)"). The definitions of clade, outgroup, cladogram, phylogram and chronogram still quote Wikipedia: the open textbook-level source tried (Gregory 2008, Evo Edu Outreach) could not be opened here.
