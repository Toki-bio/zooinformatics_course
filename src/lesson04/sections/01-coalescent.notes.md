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
