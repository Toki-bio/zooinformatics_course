# Section 06: Satellite DNA: monomers, arrays and higher-order repeats (notes)

Written 2026-10-31. Sources read for this section; every number on the page traces to one of them.

## Lab tool: CLsat workflow / satpipe
- https://github.com/Toki-bio/CLsat_workflow (public), commit d47e5c9 (2026-10-26). Read: README.md, PIPELINE.md,
  satpipe/schema.py (anchor block, discovery.monomerize), docs/config.md, stage scripts
  01_discovery_clustering/Step3.sh, Step3b_monomerize.py, Step4.sh, Step5.sh, Step6.sh, Step7.sh;
  02_seed_expansion_scan/clisat_expand_then_scan_merged.sh (header); 05_subfamily_terminal_boundary/assign_subfamily.sh,
  boundary_phase.sh (doubled consensuses).
  - TRF `2 5 7 80 10 50 2000 -h` (PIPELINE.md Inputs; Step4.sh default TRF_PARAMS).
  - Step3: period 80-300, copies >= 10 (PERIOD_MIN/MAX, MIN_COPIES defaults).
  - Step3b: on by default (`discovery.monomerize` default True, "Added 2026-10-18; the published run had no such step");
    example 292 for a 146-letter unit is from the script docstring and config.md.
  - Step4: internal TRF coverage > 50 bp -> repeats set (SIMPLE_REPEAT_COV 50).
  - Step5: lexicographically minimal rotation, plus strand by default; L541 story in PIPELINE.md.
  - Step6: `vsearch --cluster_fast --id 0.90 --strand plus`. Step7: MAFFT, rotate to rightmost first non-gap column, realign.
  - Step8: references prepended to win centroid election. Step9: curated cluster->family from MAFFT/UPGMA tree.
  - Expansion: window 3 monomers, step 3 monomers, query = 3 tandem copies (--query-repeat 2 -> N+1 copies),
    --min-bits 50, --min-aln-frac 0.67, coarse probe for long arrays.
  - Arbitration: DELTA=20 (contradiction), DELTA_AMBIG=15 (ambiguity).
  - Flank orthology: 600 bp, overlap guard, ssearch36 -m 8C all-vs-all, >= 200 bp aligned and >= 80 % identity.
  - "21 stages from TRF to anchor phasing"; anchor phasing stage 21; `anchor.independent` option (schema.py).
  - Commands on the page copied from README "Use" block; tool list from README "Install".
  - Manuscript status: under revision (lab notes); no CLsat numbers are shown on the page as results.
- Viewer: https://github.com/Toki-bio/CLsat-viewer, live https://toki-bio.github.io/CLsat-viewer/ (public).

## Literature (PubMed records, checked 2026-10-31; full text read where noted)
- Fry K, Salser W 1977. Cell 12:1069-84. doi:10.1016/0092-8674(77)90170-2 (no abstract in PubMed). Library model
  attributed to them as quoted in Ugarković & Plohl 2002 full text (PMC137204): "related species share a collection, or a
  library of satellite sequences"; "explains the occurrence of species-specific satellite profiles".
- Ugarković D, Plohl M 2002. EMBO J 21:5955-9. doi:10.1093/emboj/cdf612. Satellite library, independent evolutionary units,
  copy number + sequence, concerted evolution; "in some taxa ... satellite profiles change significantly in a relatively
  short evolutionary time" (full text).
- Melters DP et al. 2013. Genome Biol 14:R10. doi:10.1186/gb-2013-14-1-r10. 282 species; most abundant tandem repeat assumed
  centromeric; monomers up to 1,419 bp with PacBio; little conservation beyond ~50 My (abstract).
- Altemose N et al. 2022. Science 376:eabl4178. doi:10.1126/science.abl4178. 6.2 % / 189.9 Mb (abstract); ~171 bp alpha
  satellite monomers, HOR abc-abc, HOR arrays large and homogeneous with thousands of nearly identical HOR units, one active
  HOR array per chromosome, centromere = CENP-A-bound subregion, pericentromere contents, HSat2/HSat3 (full text PMC9233505).
- Vassetzky NS, Kosushkin SA, Ryskov AP 2023. Mobile DNA 14:21. doi:10.1186/s13100-023-00309-2 (full text PMC10702118):
  56 squamate genomes; sSat = "more than four such tandems within 100 bp from each other"; units ~70-290 nt, always shorter
  than the SINE; snake sSat3 67 nt; sSat3 covers 3' head incl. box B + part of body in snakes; agamids lack sSats;
  likely subtelomeric; origin via duplication (unequal recombination) + amplification; quoted phrase from abstract.
- Novák P et al. 2017. Nucleic Acids Res 45:e111. doi:10.1093/nar/gkx257 (TAREAN: graph clustering, circular graphs,
  k-mer consensus; abstract).
- Novák P, Neumann P, Macas J 2020. Nat Protoc 15:3745-76. doi:10.1038/s41596-020-0400-y (RepeatExplorer2: graph-based
  clustering of reads, small quantities of reads, annotation + quantification, comparative analysis, FISH probes,
  server repeatexplorer-elixir.cerit-sc.cz; abstract).
- RepeatExplorer2 code: https://github.com/kavonrtep/repex_tarean (README read 2026-10-31: `seqclust`, Docker tag 2.3.8,
  no release date shown).
- TRF / TRASH / TideCluster: not re-researched; the page links to lesson 03 section 04, which documents them.

## Lab project facts used (lab notes, unpublished; labelled as such on the page)
- Bat (*Rhinolophus sinicus*): MEG-RS array unit 2,155 bp, GC 67.6 % (unit FASTA in the public Tal repository,
  rsi_final/MEG-RS_array_unit_2155bp.fa); only 107 bp MEG-like (lab notes). 140-bp monomer x 58 copies derived from a
  tRNA-derived SINE family of the same bat (lab notes).
- Long-monomer survey (lab notes, unpublished, first pass): species A, a close relative and a more distant relative;
  several hundred clean motifs each; a short (<100 bp) family in all three; a several-hundred-bp family only in the
  more distant genome. Exact values withheld until publication.
- Lab rules on frames: rotate similar families into one common frame, re-cut monomers with the framed consensus; no common
  frame for unrelated families (owner's statement, lab notes); matches satpipe `anchor.independent`.

## Interactives
- Dot plot toy: random 90-bp flanks, array of n = max(2, round(600/(L*K))) HOR copies; K variants each mutated from one
  base monomer at the "variant divergence" rate; each copy mutated at "mutations per copy". Dots = runs of >= word-length
  identical bases on each diagonal (exact word matches). Offset profile = fraction of array positions p with s[p] = s[p+d].
  Toy only; not any published tool's algorithm.
- Rotation toy: fixed 24-bp monomer, four copies cut at 0/7/15/20 with 0-2 mutations; canonical rotation = lexicographically
  minimal rotation (as CLsat Step5); doubled placement = best ungapped offset against the consensus (toy simplification of
  an ssearch36 alignment against a doubled consensus).

## Open doubts
- Size boundaries between micro-/mini-/satellite are given only as "roughly"; no single source was used.
- "k-mer counting" paragraph is the general idea, no specific k-mer tool besides TAREAN/TRASH is named.
- CLsat manuscript title is in the public README but the paper is not published; the page says "under revision".

## Final review 2026-10-31
- Tooltips/links added at first use of terms in the lesson; see the lesson review record. Claims re-checked against source/papers listed above.
