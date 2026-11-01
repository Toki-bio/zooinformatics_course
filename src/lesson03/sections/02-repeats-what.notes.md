# s02 Repeats I: what is repeated in a genome: notes

Files: 02-repeats-what.html, .js, .css (3 rules, all `#s02-wrap`), .notes.md. Test helper: lesson3/s02_click.js
(clicks every control at 1100 and 420 px; screenshots sections/s02_*.png). No page errors; no horizontal page scroll at 420.

## Sources (all read 2026-10-31)
1. RepeatMasker source, https://github.com/Dfam-consortium/RepeatMasker, shallow clone commit
   74d2b41c9f2378773e7d42c7f7aac88f7f8df840 (2026-10-13), RepeatMaskerConfig.pm `$VERSION = "4.2.6"`, `$DFAM_VERSION = "4.0"`.
   Local: lesson3/src/RepeatMasker/.
   - SearchResult.pm `calcKimuraDivergence` (lines ~1585-1683): p = transitions/wellCharacterizedBases,
     q = transversions/wellCharacterizedBases, K = abs(-0.5*ln((1-2p-q)*sqrt(1-2q)))*100; subject gaps skipped;
     wellCharacterized = both bases in ACGT (table at line 200). divCpGMod: at consensus CpG, 2 transitions -> 1,
     1 transition -> 1/10, transversions normal. Comment at ~1730: "In human transitions are 15x more likely in CpG sites
     in rodents they are less likely."
   - CrossmatchSearchEngine.pm:510, HMMERSearchEngine.pm:727, NCBIBlastSearchEngine.pm:1245 call
     `calcKimuraDivergence( divCpGMod => 1 )` -> CpG rule on by default for alignment divergence.
   - SearchResult.pm ~2815: .align prints "Kimura (with divCpGMod) = " and "CpG sites = ..., Kimura (unadjusted) = ...".
   - util/calcDivergenceFromAlign.pl POD: usage `-s <summary_file>`, `-noCpGMod`, `-a <new_align_file>`; typical
     `calcDivergenceFromAlign.pl -s mygenome.divsum mygenome.fa.align.gz`; .divsum feeds createRepeatLandscape.pl;
     1 % bins ("Coverage for each repeat class and divergence (Kimura)").
   - repeatmasker.help: .out "perc div" = mismatches/(matches+mismatches); simple repeats: only di- to pentameric and
     some hexameric scanned, runs <20 bp ignored.
   - README.md lines 41-80: FamDB optional but highly recommended; installed separately from github.com/Dfam-consortium/famdb.
2. FamDB, https://github.com/Dfam-consortium/FamDB, clone commit 630f0d7881d021e70d7fcfeaac820eaa79a787fb (2026-06-01),
   CHANGELOG 3.0.0 (2026-05-22). README: components cc/ch/uc/uh, root file required, commands info/names/lineage/check/
   families/family and their options (-a -d -c -u -f fasta_name --include-class-in-name --format totals).
   The famdb.py commands on the page are copied from README syntax; NOT RUN here (running downloaded code was blocked
   by the session's permission classifier). `names <genus>` result unknown (example genus on the page: Microtus).
3. Dfam 4.0 release files, https://www.dfam.org/releases/current/ (RELEASE_DFAM_4_0 dated 27-May-2026):
   - relnotes.txt (saved lesson3/src/s02_docs/relnotes.txt): 7.6 M families, 6,549 taxa; curated (DF) Mammalia
     8864/1744/177, uncurated (DR) Mammalia 200058/40316/64079; 1,704 RepeatModeler libraries from EBI;
     FamDB 3.0 component format; "As RepBase is a closed database"; CC0 1.0 licence (section 11).
   - families/FamDB/ listing: dfam40.0.h5.gz 60,708,386 B; dfam40.curated.consensus.0.h5.gz 28,260,067 B;
     uncurated.hmm partitions 0-109 (110 files, ~1.09-4.08 GB each, gz).
   - infrastructure/TEClasses.tsv (saved): Dfam class tree, RepeatMasker type/subtype and Wicker equivalents
     (SINE description: median ~250 bp +-130 SD, canonical tRNA 5' end, core, LINE 3' end, simple tail; SINE promoter
     subclasses tRNA/7SL/5S/U-RNA; B4 = "tRNA_and_7SL_RNA"; Alu "specific to primates and rodents"; Satellite subclasses
     centromeric/subtelomeric/acromeric/Y/W; Simple "short pattern tandem repeats found in short runs"; Satellite
     "medium to long pattern tandem repeats found in long runs"; Segmental_Duplication; Low_Complexity; DIRS and Crypton
     under tyrosine recombinase; Maverick under DNA polymerase; RM labels used on the page all checked here).
4. GIRI pages (curl, TLS cert not verifiable by WebFetch): https://www.girinst.org/ news: "June 25, 2026 Repbase and
   Dfam: A New Open Foundation ... GIRI will release Repbase under a CC0 public domain license and partner with Dfam";
   https://www.girinst.org/repbase/sub_announcement.html: subscription required from April 12, 2019 (Phoenix Bioinformatics).
5. Osmanski et al. 2023 Science 380:eabn1430, doi:10.1126/science.abn1430, PMC11103246 (full text via PubMed tool):
   248 assemblies, RepeatMasker 4.1.0; TE 27.6 % (star-nosed mole) - 74.5 % (aardvark), mean 45.6 %, mean genome 2.67 Gb;
   hazel dormouse 65.8 %, Brazilian guinea pig 28.1 %; LINE 22.6 (8.2-52.8), SINE 10.5 (0.4-32.1), LTR 7.8 (2.0-17.8),
   DNA 3.5 (0.5-8.4), RC 0.5 (0.01-19.7); SINEs/LTRs more in Euarchontoglires; Helitrons only in Vespertilionidae;
   young = K2P <4 %, ~20 My at 2.2e-9; 240/248 RC and 210/248 DNA <0.1 % recent; ~868,000 L1 in human, few competent;
   solo LTRs; 152 pseudogene and >210 tandem-artefact models removed; LINEs 1-3 ORFs.
   Binomials Condylura cristata / Orycteropus afer are NOT in the extracted text (stripped); added from general knowledge.
6. Vassetzky & Kramerov 2013 NAR 41:D83, SINEBase, doi:10.1093/nar/gks1263, PMC3531059: SINE <700 bp, Pol III internal
   promoter, LINE RT; head/body/tail; core; dimeric/simple SINEs; criteria (<1 kb, >=100 copies, >=60 % identity to
   tRNA/5S/7SL over >=60 nt); boxes A/B indication not proof; RNA pseudogenes vs SINEs.
7. Arkhipova 2017 Mob DNA 8:19, doi:10.1186/s13100-017-0103-2, PMC5718144: 80-80-80 rule; Wicker orders LTR, DIRS,
   PLE, LINE, SINE (class I), TIR, Crypton, Helitron, Maverick/Polinton (class II); class I = RT, class II = transposase.
8. Wicker et al. 2007 Nat Rev Genet 8:973, doi:10.1038/nrg2165 (PubMed abstract only; details via source 7).
9. Vollger et al. 2022 Science 376:eabj6965, doi:10.1126/science.abj6965, PMC8979283: SD = >90 % and >1 kbp;
   7.0 % (218 Mbp) of T2T-CHM13 vs 5.4 % GRCh38; rDNA on acrocentrics, 45-kbp unit, ~10 Mbp / ~200 copies missing in
   v1.0, separately assembled in v1.1.
10. the internal project-facts sheet section 2 [RM] and section 4 (species A class shares, SINE-like Unknown families,
    largest L1 family, SINEderella locus counts, SINE-derived satellites, scope caution). Shown on the page only
    qualitatively/rounded: species A is unpublished (owner request 2026-11-01).

## Interactive (s02-sim)
Toy, not data. 2-Mb genome; SINE-like 300 bp, LINE-like 900 bp, DNA 400 bp; presets: three bursts (DNA ~80 My, LINE ~50 My
+ trickle, SINE ~14 My), steady, one old LINE burst (60 My). Mutation 2.2e-9/site/yr (Osmanski), 2/3 transitions (toy),
CpG transitions x10 while the CpG exists (toy; RM comment says ~15x human). Divergence computed per copy with a JS port
of calcKimuraDivergence (same CpG bookkeeping). Measured check: with K2P+CpG rule the age estimate matches the true median
age (14/14, 48/49, 78/80 My); K2P without rule overestimates (20, 68, 100); raw underestimates relative to K2P.

## Not verified / left out
- Human class percentages (Lander 2001) and mouse (2002): full text not accessible; not used.
- Micro/minisatellite unit-size boundaries: no authoritative source read; page says boundaries differ between authors.
- "Satellite arrays are often collapsed" is stated only by analogy with rDNA/SD evidence from Vollger 2022.
- Project divergence column (mean_div) metric: unverified per the facts sheet; flagged on the page.
- Dfam 4.0 exact release date: directory dates 27-29 May 2026; page says "May 2026".

## Cross-links
s01 (soft-masking), s03 (de novo libraries, why SINEs end up Unknown), s04 (RepeatMasker .out/.align, landscapes,
microsatellite false SNPs, TRF), s07 (segmental duplications / paralogs confuse projection). Lesson 2 s06/s07 for
collapsed repeats if the editor wants a link.
