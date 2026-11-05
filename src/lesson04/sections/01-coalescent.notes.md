# s01 What one genome remembers: notes and sources (2026-10-31)

## Sources (URL, version, what was taken)
- Li H, Durbin R 2011. Inference of human population history from individual whole-genome sequences. Nature 475:493-496.
  doi:10.1038/nature10231, PMC3154645 (full text read via PMC). Quotes used on the page: a diploid genome "harbors hundreds of
  thousands of independent loci, each with its own TMRCA between the two alleles"; "by studying how the local density of
  heterozygous sites changes across the genome"; simulated instantaneous reduction 12,000 -> 1,200 at 100 kya "was spread over the
  preceding 50,000 years"; variance small between 20 kya and 3 Mya in their simulation, outside that "few recombination events are
  left" (power reduced).
- PSMC model notes, psmc.tex in https://github.com/lh3/psmc (master, commit 82fa2ad, 2025-11-17), Theorem "PSMC" and corollaries:
  N(t) = N0 lambda(t), t = generations / 2N0; pairwise coalescence density P2(t|u) = (1/lambda(t)) exp(-int_u^t dv/lambda(v)) (the note
  cites Hein et al. 2005 and Griffiths & Tavare 1994 for it); stationary TMRCA density sigma(t) = (1/lambda(t)) exp(-int_0^t dv/lambda);
  TMRCA just after a recombination pi(t) proportional to t sigma(t); segment length after a recombination exponential with rate rho t
  (Remark "Distribution of segment lengths"). PSMC README (same commit): time scaled to 2N0, 100-bp bins (not used on this page).
- Spence JP, Steinruecken M, Terhorst J, Song YS 2018. Inference of population history using coalescent HMMs: review and outlook.
  Curr Opin Genet Dev 53:70-76. doi:10.1016/j.gde.2018.07.002, PMC6296859 (full text read). Quote: all methods infer "effective
  population sizes", defined as "the inverse coalescence rate for a pair of haplotypes"; "a structured population will have a larger
  effective size than a panmictic population of the same census size".
- Mazet O, Rodriguez W, Grusea S, Boitard S, Chikhi L 2016. On the importance of being structured: instantaneous coalescence rates and
  human evolution. Heredity 116:362-371. doi:10.1038/hdy.2015.104 (abstract read): "inverse instantaneous coalescence rate" (IICR)
  equals population size only in panmictic models; structure "can generate spurious signals of population size change".
- Textbook statements (per-generation coalescence probability 1/(2Ne), mean 2Ne generations, exponential/geometric waiting time,
  theta = 4 Ne mu): checked against the Wikipedia article "Coalescent theory" (read 2026-10-31), which cites Hein, Schierup & Wiuf
  2005 "Gene Genealogies, Variation and Evolution" (OUP) and Wakeley "Coalescent Theory: An Introduction" (Roberts & Co; year as listed there 2006, not re-checked). The books themselves
  were not read; the same statements follow from the PSMC model notes above (rate 1/lambda per 2N0 generations = 1/(2N(t)) per generation).
- Project values (lab project log, 2026-10), shown on the page only as ratios because the data are unpublished: heterozygous SNVs per
  callable kb, the relative about 1.7 times species A; share of the genome in ROH (50-kb window mixture), species A about 3 times the relative.
  Placeholder mutation rate 5.4e-9 per site per generation (illustrative, not verified for species A).

## Derived on the page (my arithmetic, not quoted from a source)
- Median TMRCA under constant size = 2Ne ln 2 (13,863 for Ne 10,000, written "about 13,900"); P(T > 60,000) = e^-3 = 0.050.
- Het of a stretch ~ 2 mu T: two lineages, each T generations, mutation rate mu (first-order; psmc.tex Cor. "Rate of pairwise difference").
- Mean piece length 1/(2 r T): from rate rho t in scaled units (rho = 4 N0 r, t = T / 2N0, so rho t = 2 r T). Table: r = 1e-8;
  T = 10 -> 5 Mb, 1,000 -> 50 kb, 100,000 -> 500 bp. "Millions of pieces" = few Gb / ~500 bp.
- Ne from heterozygosity: 0.0015 / (4 x 5.4e-9) = 69,444 (a round example value of 1.5 hets per kb, not a project value). Labelled as a
  long-term average that depends on the placeholder rate.
- Survival formula exp(-sum of generations / 2Ne) for piecewise-constant sizes: integral of the rate 1/(2N(t)).

## Toy (01-coalescent.js)
- 10-Mb chromosome, mu = 5e-9, r = 1e-8 per bp per generation (toy values, stated on the page). Four periods with fixed boundaries
  0 / 2,000 / 20,000 / 200,000 generations; Ne from a list 1,000-500,000.
- Pieces drawn independently: T from pi(T) ~ T sigma(T) (numerical inverse CDF on a log grid 1-1e8 generations), length exponential
  with mean 1/(2 r T), het count Poisson(2 mu T L), positions uniform. Because pieces are length-weighted, the share of the
  chromosome follows sigma(T); the dashed expected curve is the exact F(T) = 1 - exp(-H(T)) per log bin. The independence of
  neighbouring pieces is a simplification (SMC transitions are correlated), stated on the page.
- Checked by clicking: constant Ne 50,000 gives 0.96 het/kb (expected 4 Ne mu = 1.0) and mean TMRCA 97,600 (expected 2Ne = 100,000);
  bottleneck preset gives 95 % of the chromosome coalescing in the bottleneck period (expected survival into it 0.95, then 95 %
  coalesce), 0.11 het/kb, mean piece 4.5 kb.

## Open doubts / left out
- Hibbins & Hahn 2022 (D-statistics need more than one genome per species) is in the project notes but was not re-checked; the page
  only points to s07 without citing it.
- The phrase "pieces of a few hundred to few thousand bases" in the simple box is from the toy arithmetic at r = 1e-8, not a
  measured value for any species.
- Rosenberg & Nordborg 2002 (Nat Rev Genet 3:380) considered as a review citation; only the abstract was read, so not cited on the page.

## Cross-links
- ../03-annotation/#s09 (ROH, heterozygosity), #s03 (PSMC), #s04 (scaling), #s05 (other methods), #s06 (pitfalls/IICR), #s07 (two species).

## Coalescent theory from zero block (added 2026-11-05)
Placed after the opening paragraph, before "Two copies, one ancestor". Existing text kept. Trimmed or changed: the first two sentences of "How fast two copies find their ancestor" now point to step 3; the TMRCA definition says "From here on ... unless a section says otherwise" (the block uses trees of many copies); "Heterozygosity is a clock" got the id s01-clock.

Sources, with the exact supporting sentences:
- Nordborg M 2007. Coalescent theory. Chapter 25 of Handbook of Statistical Genetics, 3rd ed., Balding, Bishop, Cannings (eds), Wiley. doi 10.1002/9780470061619.ch25 (title, author and year checked at Crossref). Full chapter read as a PDF hosted by ICTS, https://www.icts.res.in/sites/default/files/PGE2018-Magnus-Nordborg-Reading-1.pdf
  - Backward: "The coalescent approach is based on the realization that the genealogy is usually easier to model backward in time, and that selectively neutral mutations can then be superimposed".
  - Wright-Fisher: "generations are discrete, and each new generation is formed by randomly sampling N parents with replacement from the current generation".
  - Pair: "the probability that the two lineages pick the same parent and coalesce is 1/N" and "The expected coalescence time is N generations." Here N counts haploid individuals. Diploid: "a diploid population of size N can be thought of as a haploid population of size 2N".
  - k lines: T(k) "is in the limit exponentially distributed with mean 2/[(k(k - 1))]", in units of N generations.
  - Tree: "the trees tend to be dominated by the deep branches, when there are few ancestors left", expected height 2(1 - 1/n), "while E[T(2)] = 1, so the expected time during which there are only two branches is greater than half the expected total tree height."
  - Neutrality: "since selectively neutral variants by definition do not affect reproductive success, it is possible to separate the neutral mutation process from the genealogical process."; "The coalescent depends crucially on the assumption of selective neutrality".
  - Changing size: "lineages are more likely to coalesce in generations when the population is small than in generations when the population is large."
  - Who found it: "The coalescent was described by Kingman (1982a; 1982b; 1982c), but it was also discovered independently by Hudson (1983) and by Tajima (1983)."
- Kingman JFC 1982. The coalescent. Stoch Proc Appl 13:235-248, doi 10.1016/0304-4149(82)90011-4. NOT read: publisher page refused the fetch, and Crossref has no abstract. Cited on the page only for the history, through Nordborg 2007.
- Rosenberg & Nordborg 2002 (Nat Rev Genet 3:380, doi 10.1038/nrg795): could not be opened this time either; not cited on the page.
- Hudson 1990 (Oxford Surveys in Evolutionary Biology 7:1-44): could not find a copy to read; not cited on the page.
- Wakeley, Coalescent Theory: not read. It stays only in the older "textbook" line of the page sources.
- The owner's brief said the last two lines take "about half"; Nordborg says more than half. The page says more than half: 2N / 4N(1 - 1/n) = 60 % for 6 copies, 51 % for 50 copies. This is true of the means.

Derived on the page (my own):
- Mean wait with k lines 2N / [k(k - 1)/2] and height 4N(1 - 1/n): Nordborg's scaled values times 2N generations for diploids.
- The share and mean values in the settings: exact sums over generations in czExact, not formulas from a paper. The two-deme mean uses a two-state chain (same deme, different demes), with m = 0.05 per copy per generation.
- A pair from one deme averages exactly 2N in the chain (10.00, 20.00, 60.00) and a pair from different demes 8.53 generations more. Not stated as a theorem on the page; Strobeck 1987 is cited by Nordborg in this area but was not read.

Toy settings, all scaled to the slider N (2N copies per row, small = max(4, round(2N/5)) copies): bottleneck rows N/2 to N/2 + max(3, 0.6 N); expansion narrow from generation N back; decline narrow from today to max(3, 0.4 N). Rows are sorted by parent position so links do not cross. All are toy values, not taken from any species.

Controls (Node, on the same functions as the page; simulation against expectation):
- Mean pair time, constant size: N 5: 9.96 +- 0.03 (2N 10); N 10: 20.07 +- 0.06 (20); N 30: 60.06 +- 0.19 (60); N 100: 200.4 +- 0.6 (200); N 1,000: 1,985 +- 14 (2,000). 100,000 pairs each, 20,000 for N 1,000.
- Tree height against 4N(1 - 1/n): N 10, n 4: 29.82 +- 0.09 (30.00); N 30, n 4: 90.02 +- 0.28 (90.00); N 30, n 10: 107.23 +- 0.28 (108.00); N 200, n 10: 722.8 +- 4.3 (720.0); N 1,000, n 10: 3,542 +- 38 (3,600). In the smallest toys the simulation is truly lower, because several lines can meet in one generation: N 5, n 10: 17.46 +- 0.05 (18.00, -3.0 %); N 10, n 10: 35.54 +- 0.09 (36.00, -1.3 %). The coalescent formula is the large-population limit; the tooltip on the page says so.
- Time with the last two lines against 2N: N 10, n 4: 19.68 +- 0.09 (20); N 30, n 10: 59.36 +- 0.26 (60); N 200, n 10: 402.9 +- 4.0 (400); N 1,000, n 10: 1,941 +- 35 (2,000). A little below 2N in small toys, since three lines sometimes meet at once and skip the two-line stage.
- Bottleneck, share of pair meetings inside it, simulation against calculation: N 10: 0.6676 and 0.6695; N 30: 0.6270 and 0.6253. Means 9.28 (9.29) and 29.73 +- 0.12 (29.99, z = -2.2, the only |z| above 2 among about 30 comparisons of this run, which is about what chance gives).
- Expansion, decline: means and band shares within sampling error of the calculation at N 5, 10, 30.
- Two demes: pairs from different demes that met with no migration: 0 of 100,000 at each of N 5, 10, 30. Means 18.53, 28.44, 68.34 (exact 18.53, 28.53, 68.53).
- Browser: every control clicked at 1100 and 420 px in all five settings, no script errors, no page widening. "Repeat" readouts agree with the above.

Open doubts:
- Readers may take the toy bottleneck timing as general; the windows are scaled to N only to fit a small grid.
- The grid uses gene copies as one pool (no separate sexes, selfing possible), the usual simplification; Nordborg 2007 section 25.5 shows it only rescales time.
