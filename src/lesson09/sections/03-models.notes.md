# s03 Distances and substitution models: notes

Written 2026-11-06. "Abstract only" says when a paper was not read in full.

## Sources, with the supporting lines

1. **IQ-TREE documentation, Substitution Models** (https://iqtree.github.io/doc/Substitution-Models, page as fetched 2026-11-06, no version shown). Read in full via fetch.
   - JC: "Equal substitution rates and equal base frequencies" (0 free parameters). K80/K2P: "Unequal transition/transversion rates and equal base freq." (1). HKY: "Unequal transition/transversion rates and unequal base freq." (4). GTR: "General time reversible model with unequal rates and unequal base freq." (8).
   - +I: "allowing for a proportion of invariable sites." +G: "with default 4 rate categories"; "+G8" changes the number.
   - The page does not mention BIC.
2. **Kalyaanamoorthy S, et al. (2017)** ModelFinder. Nat Methods 14:587-589, doi 10.1038/nmeth.4285, PMC5453245. Full text read.
   - "ModelFinder incorporates 22 and 36 substitution models for DNA and protein, respectively, and 13 models of RHAS".
   - Three RHAS choices: equal rates, some sites invariable (I), or a discrete gamma distribution.
   - Gamma assumptions "may be unrealistic and bias phylogenetic estimates"; the free-rate (PDF) model is the proposed alternative.
   - "when BIC scores differ by more than 10 (deltaBIC > 10) there is strong evidence against the model with the higher BIC score".
   - Example command `iqtree -s data.fst -st AA -m MF`; DNA examples `iqtree -s data.fst -m MF -mtree`. "the I+Gamma model is parameterized using two parameters" (used for the "adds 1" counts for +I and +G: our inference).
   - Warning: search may be trapped in local optima; repeat model selection.
3. **Kimura M (1980)** J Mol Evol 16:111-120, doi 10.1007/BF01731581. Abstract only (PubMed).
   - "the evolutionary distance per site is K = -(1/2) ln [(1-2P-Q) square root of 1-2Q]"; type I (transition) and type II (transversion) definitions.
4. **Hasegawa M, Kishino H, Yano T (1985)** J Mol Evol 22:160-174, doi 10.1007/BF02101694. Abstract only (PubMed). The abstract does not describe the model itself; the HKY description on the page rests on source 1 (IQ-TREE table). Doubt: the sentence "keeps K80's two classes of change and lets the base frequencies differ" is therefore supported by the IQ-TREE line, not by the paper.
5. **Yang Z (1994)** J Mol Evol 39:306-314, doi 10.1007/BF00160154. Abstract only (PubMed).
   - "four such categories appear to be sufficient to produce both an optimum, or near-optimum fit by the model to the data, and also an acceptable approximation to the continuous distribution."
6. **Jukes TH, Cantor CR (1969)** Evolution of protein molecules (book chapter). NOT opened. The JC69 formula on the page is the standard result; it is checked by the page's own simulation (control below), not by the chapter.
7. Tavare (1986, GTR) not opened. The GTR description rests on source 1 plus the standard meaning of "time-reversible" (our wording).

## Formulas derived by us (not quoted)
- JC69: p = 3/4 (1 - exp(-4d/3)); d = -3/4 ln(1 - 4p/3).
- With gamma shape a and invariable share f (variable sites at rate r/(1-f), r ~ Gamma(a, scale 1/a)): p = (1-f) * 3/4 * (1 - (1 + 4d/(3a(1-f)))^(-a)); without gamma, exp form. Verified only by the simulation control.

## Code control (runs at every page load, shown on the page)
Event-by-event simulation (random ancestor, Poisson substitutions per site per lineage, each to one of the 3 other bases), 200,000 sites, fixed seed. Result of the run on 2026-11-06: PASS.
- JC69 simulated vs formula: d=0.1: 0.0937 vs 0.0936; d=0.5: 0.3659 vs 0.3649; d=1: 0.5528 vs 0.5523; d=2: 0.6976 vs 0.6979.
- Gamma shape 0.5 + 20 % invariable, d=1: 0.3134 vs 0.3118.
- Largest gap 0.0016 (limit 0.005). Correction applied to formula p returns d: largest error 1e-15.

## Statements that are our reading, marked as such on the page
- Transitions saturate sooner than transversions, so counting them separately keeps information.
- +I and +G each add one parameter.
- When p is small, JC69 and richer models give nearly the same distance (shown by the formulas; not cited).

## Final review 2026-11-06
- AIC and BIC are now expanded at first use (Akaike / Bayesian information criterion) and linked to the formulas in s06.
