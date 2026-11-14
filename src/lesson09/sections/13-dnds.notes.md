# s13 Selection on protein-coding genes: dN/dS and the McDonald–Kreitman test: notes

Written 2026-11-14. Numbers and quotes were checked 2026-11-14 (see the spec of this section). "Abstract only" says when a paper was not read in full.

## Sources, with the supporting lines

1. **Two lectures**, Coursera / Duke University, "Introduction to Genetics and Evolution", week 8: "Searching for natural selection: dN/dS" and "McDonald-Kreitman test" (re-uploaded: https://youtu.be/vwmuvcDh9ZM). Slides of the dN/dS example say "Slide courtesy of M Rausher". The lecturer is not named on the page (not verified). Basis of: both dN/dS examples, the MK lecture alignment, the three gene tables, the ASPM value, the list of gene classes (immunity, gamete formation, sensory perception). Nothing copied; all redrawn.
   - Example 1: human ACT CCG GGG CCC, chimp ACG CCG GGC CTC: S sites 4, N sites 8, Sd 2, Nd 1, dN 0.125, dS 0.5, omega 0.25.
   - Example 2: human CGT GGC GCA CTT GTA, chimp CGT CGT CCA CTT GTA: S 5, N 10, Nd 2, Sd 1, dN = dS = 0.2, omega 1. Codon 2 by both orders of change: 1 N + 1 S each.
   - MK alignment gives A1 B1 C1 D2.
   - Gene tables as given in the lecture (source not stated there): SENP1 A4 B1 C1 D5, Fisher P = 37/462 = 0.080; CIAS1 (= NLRP3) A5 B1 C10 D2, P = 1; AGT A1 B3 C13 D1, P = 57/3060 = 0.0186. The lecture gives only the counts; the Fisher P values and alpha (SENP1 0.95, CIAS1 0, AGT -38) are our arithmetic.
2. **Chimpanzee Sequencing and Analysis Consortium (2005)** Nature 437:69-87, doi 10.1038/nature04072. Full text read.
   - "The KA/KS ratio for the human–chimpanzee lineage (ωhominid) is 0.23."
   - "A total of 585 of the 13,454 human–chimpanzee orthologues (4.4%) have observed KA/KI > 1"; KI used because "a typical gene has only a few synonymous changes ... and not infrequently is zero"; "estimates of KA/KI > 1 would be expected to occur simply by chance in at least 263 cases".
   - "Under the assumption that synonymous substitutions are neutral, KA/KS > 1 implies, but is not a necessary condition for, adaptive or positive selection."
3. **McDonald JH, Kreitman M (1991)** Nature 351:652-654. The A/B/C/D table and the three readings (A/C = B/D, >, <), including overdominance/balancing selection as another cause of the excess polymorphism, as stated in the spec.
4. **Smith NGC, Eyre-Walker A (2002)** Nature 415:1022. alpha = 1 - NI as the share of amino-acid substitutions fixed by positive selection.
5. **Bustamante CD et al. (2005)** Nature 437:1153-1157, PMID 16237444. Abstract only. 39 humans, >11,000 genes; "304 (9.0%) out of 3,377 potentially informative loci showing evidence of rapid amino acid evolution"; "813 (13.5%) out of 6,033 ... show a paucity of amino acid differences between humans and chimpanzees, indicating weak negative selection and/or balancing selection"; transcription factors excess of rapidly evolving genes; cytoskeletal proteins excess of polymorphism.
6. **Nei M, Gojobori T (1986)** Mol Biol Evol 3:418-426. Named as the origin of the hand count. Not opened for this page.
7. **Yang Z (2007)** PAML 4, Mol Biol Evol 24:1586. Named for codeml. Not opened for this page. Model names only (M0, M1a/M2a, M7/M8, branch-site model A); no control file and no command line is given.
8. **HyPhy** (Kosakovsky Pond et al.). Only the names aBSREL, BUSTED, MEME, FEL are given. The one-line descriptions of what each asks are the standard descriptions; they were not re-read against the HyPhy documentation for this page. The page says commands must be checked against the installed version.

## Our own reasoning (not quoted from a source)
- The argument that raw counts mislead because N sites outnumber S sites; "four times as common" (0.5 / 0.125) is our arithmetic on example 1.
- Fractional sites for TTT, TTG, CTT, CTA/CTG: derived from the standard genetic code.
- "Nearly half of the 585 (263 of 585) are expected by chance": our arithmetic on the paper's two numbers.
- omega = 1 means "cannot reject neutrality"; the average over a gene can sit near 1 while parts are constrained and parts adaptive.
- Jukes-Cantor can be applied to pN and pS, and dS saturates first: our reasoning from section 03; no source opened.
- Alpha for all three genes and the Fisher P values: our arithmetic from the lecture's counts. The remark that SENP1 alpha rests on one polymorphism: our reading.
- Pitfalls: dS near 0, saturation, alignment errors, frameshifts, paralogs, averaging over genes and branches, small MK counts, slightly deleterious polymorphisms biasing alpha down (fix: drop rare variants), population size change. Stated as general practice; no source opened for this page.
- Counts in the toy convention (stop codons excluded; average over orders of change; tools differ) are set in the toy section, not here.

## Not verified
- The ASPM whole-gene omega of about 0.9: "according to the lecture"; the original source was not found.
- The SENP1, CIAS1 and AGT counts and their Fisher P values: "as given in the lecture"; the lecture does not state the source and the counts were not traced to a paper.
- The lecturer's name.
- The YouTube comment that site 10 (C of CTT) in example 2 is partly synonymous is wrong (CTT to TTT is Phe); only the page's statement is kept, the comment is not cited.
- The arsD quiz of the lecture (6 humans, 1 chimp; A1 B2 C2 D1, P = 1.0, direction negative selection) is not in the text; it is a preset of the McDonald-Kreitman toy (button "arsD quiz"), counted by the toy's engine and checked by 13-dnds.control.js.
