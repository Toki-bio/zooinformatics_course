# s10 Comparing whole data sets: sources (read 2026-11-05)

Read in full unless noted. Quotes are the supporting sentence or line.

- Ondov et al. 2016, Genome Biol 17:132, https://genomebiology.biomedcentral.com/articles/10.1186/s13059-016-0997-x (full text).
  - "For a given sketch size s, Mash returns the s smallest hashes output by h over all k-mers in the sequence" ; canonical: "only the lexicographically smaller of the forward and reverse complement representations of a k-mer is hashed".
  - Merge: "The merge is terminated after s unique hashes have been processed (or both sketches exhausted), and the Jaccard estimate is computed as j = x/s' for x shared hashes found after processing s' hashes."
  - Eq. 4: D = -(1/k) ln(2j/(1+j)); "Equation 4 carries many assumptions and does not attempt to model more complex evolutionary processes".
  - Poisson model: "the probability that no mutation will occur in a given k-mer is e^-kd".
  - "For the default sketch size of s = 1000 and k = 21, Mash approximates 1-ANI with a root-mean-square error of 0.00274" (500 Escherichia genomes, ANI 90-100 %); "This correlation begins to degrade for more divergent genomes because the variance of the Mash estimate grows with distance."
- Mash docs 2.0, https://mash.readthedocs.io/en/latest/distances.html and /sketches.html: j = |A_s ∩ B_s| / s; D = 1 for j = 0; error bound sqrt(1/s); reads: -r, -m 2 ("removing unique or low-copy k-mers usually improves results for read sets"), -s, -k.
- KMC README (refresh-bio/KMC master): "./kmc -k27 input.fastq 27mers ." counts k-mers "at least twice (configurable with -ci)"; .kmc_pre/.kmc_suf; kmc_tools "set operations, transformations"; max k 256. kmc_tools syntax NOT checked, not shown on page. Canonical default for KMC NOT verified, not claimed.
- Meryl docs 1.3 (meryl.readthedocs.io: reference, usage, quick-start) and README v1.4.2: count action, canonical definition, k up to 64, actions union-sum/intersect/..., meryl-lookup -existence/-include/-exclude. Reference page warns its action table "has not been verified"; page uses only intersect/union-sum (quick-start uses union-sum). `meryl intersect output=... a b` is by analogy with the quick-start's `union-sum output=...` form: command line not run.
- BBDuk help text (bbduk.sh, last modified Jan 26 2021): k=27, outm, minkmerhits=1, maskmiddle=t, default kfilter. BBDuk guide not read.
- Kraken2 MANUAL.markdown (DerrickWood/kraken2 master): LCA table, minimizers, false positives "less than 1%", k=35 / l=31 defaults, 29 GB (as of Jan. 2018), confidence example 562/561 (16/21, 20/21). The master manual also documents a newer k2 front end; the page uses the kraken2 command forms shown in the manual. Kraken 2 paper (Wood et al. 2019) cited by name only, abstract/text not opened.
- sourmash README (latest): FracMinHash, gather, usage lines. Not run. No further sourmash sources read.

## Toy control (browser, headless Chrome)
k = 21, L = 20,000, hash = FNV-1a + murmur3 finaliser (own, not Mash's). Exact Jaccard vs Mash-merge estimate, 3 % divergence, three random pairs: s=10: .38/.40, .33/.30, .36/.50; s=1000: .381/.367, .331/.327, .355/.362; s=5000: .381/.376, .331/.322, .355/.351. At 8 %, s=10: no shared hash in 13 of 30 draws. D from exact J vs real divergence: 2.83 % vs 2.92 %; 10.05 % vs 9.95 %; at 20 % set: 22.3 % vs 19.7 %.

## Open doubts
- Section cross-references (04 hashing, 05 scfish2, 07, 08 minimizers, 09) rely on the lesson plan.
- The ticks drawing uses hash order, not k-mer positions; this is intentional.
