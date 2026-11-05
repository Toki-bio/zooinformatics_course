# s01 What a SINE is: notes

Files: 01-sine-biology.html, .js, .css (6 rules, all `#s01-wrap`), .notes.md.
Previewed at 1100 and 420 px: no script errors, no horizontal page scroll. A playwright script hovered/clicked
the anatomy parts and boxes, stepped the insertion toy through all 5 steps (stagger 12, 0, 16) and set the age
slider to 0, 10, 60, 150 My at both widths; screenshots read.

## Sources (read 2026-10-31; abstracts via PubMed, full texts via Europe PMC where noted)
1. Vassetzky NS, Kramerov DA 2013. SINEBase: a database and tool for SINE analysis. Nucleic Acids Res 41:D83-D89.
   doi:10.1093/nar/gks1263, PMC3531059 (full text). Used: SINEs <700 bp, non-autonomous, pol III internal promoter,
   LINE RT; head/body/tail modules, core domain, dimeric/simple SINEs; three criteria (<1 kb non-tandem; >=100 copies
   except repeat-poor genomes such as Arabidopsis thaliana; >=60 % identity to tRNA/5S/7SL over >=60 nt); pol III
   boxes "only an indication (but not a proof)", high false positives/misses even with position frequency matrices;
   family = common origin + same modules (tail may vary); RNA pseudogenes vs SINEs.
2. Vassetzky NS et al. 2021. Analysis of SINE families B2, Dip, and Ves with special reference to polyadenylation
   signals and transcription terminators. Int J Mol Sci 22:9897. doi:10.3390/ijms22189897, PMC8466645 (full text).
   Used: usually 150-300 bp; three RNA ancestors; 7SL SINEs only in rodents/primates/tree shrews + hagfish; 5S SINEs
   in fish, lizards, rodents, bats, butterflies; most from tRNA; L1 needs A-rich RNA end; boxes A and B are two 11-bp
   boxes spaced 30-40 bp (tRNA- and 7SL-derived); only pol III transcripts are templates; copies of old SINEs differ
   by up to 35 % or more; T+ SINEs: AATAAA motifs, then TCTTT/TTTT terminator, then oligo(A) at the 3' end; 12 T+
   families, all tRNA-derived, mammals only; terminators TCTTT (B2), TATTT (Dip, Ves); Alu/B1/ID lack terminators,
   read through poly(A), stop at random Ts downstream; young copies long poly(A), shortening over generations;
   subfamilies "reliably distinguished by relatively long indels"; Dip typical of jerboas and their relatives;
   Table 1 Mus musculus B2a-e: proportion, ~copy numbers 59,013 / 7,203 / 4,987 / 18,655 / 1,478, mean similarity
   83/70/73/62/59 %, TSDs 73/64/62/54/23 %; "conceivably, TSDs degrade and vanish with time".
3. Kosushkin S, Vassetzky N, Borodulina O, Kramerov D 2026. A dimeric SINE discovered in shrew mole is structurally
   similar to primate Alu. BMC Biol 24. doi:10.1186/s12915-026-02550-6, PMC13023118. Used (abstract): ~280,000
   Urop copies in Uropsilus gracilis, absent from five other talpids, subfamilies a-c, 7SL SINEs previously only
   in supraprimates and hagfish, ~183-nt central deletion, identical deletion boundaries to Alu, Urop_c excess of
   long pure poly(A) tails. Full text: ~2000 monomer copies, 70 % with TSDs (not used on the page).
4. Luan DD et al. 1993. Cell 72:595-605. doi:10.1016/0092-8674(93)90078-5 (abstract): R2Bm nick, 3'-OH primes
   reverse transcription, second strand cleaved after; proposed for other non-LTR elements and SINEs.
5. Jurka J 1997. PNAS 94:1872-1877. doi:10.1073/pnas.94.5.1872 (abstract): staggered breaks; first nick in the
   antisense strand at 5'-TTAAAA (between 3'-AA and TTTT); sense strand nicked at variable distance toward the 3' end,
   "preferably within 15-16 base pairs"; L1 endonuclease the candidate.
6. Dewannieux M, Esnault C, Heidmann T 2003. Nat Genet 35:41-48. doi:10.1038/ng1223 (abstract): marked Alu
   retrotransposition in HeLa; TSDs of varying lengths; integration into A-rich consensus sites; poly-A essential;
   LINEs required; rate 100-1,000x higher than control mRNAs.
7. Kajikawa M, Okada N 2002. Cell 111:433-444. doi:10.1016/s0092-8674(02)01041-3 (abstract): eel UnaSINE1 /
   UnaL2 share 3' tails; recognised in trans by UnaL2 RT.
8. Deininger PL et al. 1992. Trends Genet 8:307-311. doi:10.1016/0168-9525(92)90262-3 (abstract): master genes;
   most SINEs/LINEs behave like pseudogenes.
9. Shedlock AM, Okada N 2000. BioEssays 22:148-160. doi:10.1002/(SICI)1521-1878(200002)22:2<148::AID-BIES6>3.0.CO;2-Z
   (abstract): "the irreversible, independent nature of their insertion" allows diagnosing common ancestry.
10. Ray DA, Xing J, Salem AH, Batzer MA 2006. SINEs of a nearly perfect character. Syst Biol 55:928-935.
    doi:10.1080/10635150600865419 (abstract): primate Alu studies; very low levels of lineage sorting, parallel
    insertions, precise excision.
11. Kosushkin S, Korchagin V, Vergun A, Ryskov A 2023. Genes 14:2089. doi:10.3390/genes14112089, PMC10670947
    (full text): polymorphic insertion = shared derived character; "homoplasy, including cases of precise removal
    ... is rare".
12. Internal lab project log (species A, unpublished): lengths of the consensus sequences searched, about 200-270 bp.
    Species and exact values withheld until publication.
13. Lab notes (unpublished, measured 2026-10-18): bat Rhinolophus sinicus SINE units have tRNA-Ile heads, 73-93 %
    over 66-75 nt, bits 39-82 vs shuffled-sequence maximum <=29; Rfam missed 4 heads, tRNAscan-SE 2. Lab methods
    note on tRNA-head testing: 5S-derived heads have no B box (5S promoter = box A + intermediate element + box C);
    default detectors tuned to keep SINEs out of tRNA gene lists; write "not detected at threshold".
14. Neutral rate 2.2e-9 per site per year: same value and source as lesson 3 s02 (Osmanski et al. 2023 Science).

## Toy models (stated on the page as toys)
- Anatomy toy: letters random (seeded); box A/B letters are tRNA-like but invented; lengths chosen by us
  (TSD 8, head 72, body 40, AATAAA x2 13, TATTT 5, tail 16 = 162 bp). Box spacing 32 bp (within 30-40).
- Insertion toy: first nick between TT and AAAA of TTAAAA on the bottom strand; second nick on the top strand
  S bp downstream (0-16). Product = top[0..nick1+S) + SINE + top[nick1..]. Cartoon only.
- Aging toy: 12 copies, ages = slider x U(0.8, 1.2); one substitution at most per site (time ~ Exp(2.2e-3/My),
  2/3 transitions); deletions 1-3 bp at 2e-4 per site per My (toy); tail loses bases from the 3' end at
  0.1 per My (toy); TSD "recognisable" if the two 8-bp copies differ at <=2 positions (toy rule). Divergence
  and consensus comparison exclude TSDs and the A tail.

## Open doubts
- The 5S promoter structure (box A, intermediate element, box C) comes from the lab's methods note, which cites
  a sourced research report; not re-read in a primary paper today.
- The direction of cDNA synthesis and the side on which the tail ends up (next to the TTAAAA-derived TSD) is our
  derivation from Jurka's nick model, drawn as a cartoon.
- The Kramerov & Vassetzky 2011 Heredity review (doi:10.1038/hdy.2011.43) was found but its full text was not
  retrievable; not cited on the page.
- Page says "Most SINEs are 150-300 bp" (Vassetzky et al. 2021); a "~100-600 bp" range seen in planning notes was not
  found in a source and is not used.

## Final review 2026-10-31
- Tooltips/links added at first use of terms in the lesson; see the lesson review record. Claims re-checked against source/papers listed above.
