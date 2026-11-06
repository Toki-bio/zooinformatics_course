# Notes: basics page, lesson 7

All data are invented toy sequences made in the page (seeded random generator). No numbers from the lesson are stated except those listed.

1. Insertion and target site duplication. Rests on section 01 (definition; head-body-tail; copy and paste through RNA with a partner LINE; TPRT, staggered nicks, TSD). Measured: the duplicated length is found from the built sequence (longest equal stretch left and right of the copy); gives 4, 8, 12 for the three panels.
2. Unique flanks. Rests on section 05 ("Words used": locus, flanks; isolated copies, unique flanks) and 04 definitions. Measured over 40 random genomes: SINE word found in 6 places each time; all 12 flank words occur once in 39 of 40 (the text prints the real count otherwise).
3. Consensus. Rests on section 04 (Family, subfamily, consensus; building a consensus: vote per column) and 01 (consensus equals master). Measured over 40 seeds: 31-copy consensus had 0 wrong positions every time; the text prints the real number anyway. Toy rule: plurality vote, ties give n.
4. Subfamilies. Rests on section 04 (definitions; identity is the wrong measure; backing columns; toy of 20 copies). Positions found = columns whose two-way split is repeated by another column (own simplification of the lesson's backing check). Measured over 40 seeds: found exactly the 3 true positions and grouped with 1 lineage change every time; ordering by differences gave 3 or more lineage changes in all but one seed, and the text is conditional on that.
5. Presence and absence. Rests on section 05 (character, outgroup, ILS, many loci and conflicts). Matrix is computed from the branch each insertion sits on; a switched locus is computed as ILS (lost in B). Left panel: 3 loci for A+B.
6. Satellite. Rests on section 06 (tandem repeat, monomer, array, dot plot, SINE search counting array units). Measured over 40 seeds: scattered case 4 copies found, 0 with a neighbour; array 6 found, 6 with a neighbour.

Trim 2026-11-06: removed from the page text (kept in lesson): TPRT detail; tie rule explanation; that real work does not know the source; why ordering by differences fails in detail; ILS caveat that the table cannot tell it from a true pair; remark that a SINE search ignoring arrays counts each unit as an insertion; grey dot meaning in block 6; "each numbered mark is one insertion".

GLM audit 2026-11-06: "one in each copy" is printed only when the word is found in all six; the mixed-order message now fires at two or more lineage changes.
