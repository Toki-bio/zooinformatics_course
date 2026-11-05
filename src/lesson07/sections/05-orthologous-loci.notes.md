# s05 Orthologous loci: presence and absence of SINEs - notes

Written 2026-10-31.

## Sources
| Source | Version | Used for |
|---|---|---|
| https://github.com/Toki-bio/SINE_orth_loc README.md | commit f40fbf2 (2026-10-30) | versions (v1.0-genes2023 = Kosushkin et al. 2023 workflow, same ComPair thresholds in v2.0); usage of `SINE_orth_loc_flexible.sh`; required tools; bank mode (`sinederella_bed.py`, verdict SINE + partial copies, reference row per copy, `CP_SINE_FRAC` 50 -> 52 nt for 105 bp); `FLANK` 300, `MAPPER` minimap2 default, `MM2_OPTS` `-x sr -k 11 -w 3 -p 0.5 -N 50`, bwa within 0.2 %; `BOTHFLANKS=1` (-30 to SINElength+100 bp); `ADAPT` "600 1000", `ADAPT_MAPQ` 20, stop at neighbouring copies; multi-copy rescue (one partner per site, ties ambiguous); output bundles and `##FILE` format; `sine_loci_browser.html` Thresholds panel and default env line; `sine_registry.py` states P/A/U/X/M, NEXUS 0/1 matrix; `sine_genotype.py` prototype; `sine_nest.py` (TinT reconstruction, not original code); read-genotype check 0.22 / 0.77 / 0.45 % contradicted vs 0.37 % genotyper error (unpublished, stated as such on the page) |
| SINE_orth_loc `SINE_orth_loc.bash` | f40fbf2 | `bedtools cluster -d $FLANK` and `uniq` -> only copies > FLANK apart get flanks; left/right flanks via `bedtools flank`; window = hit slopped right by SINElength+FLANK; clusters split by number of loci: <=2 double, <11 multi (3-10), else poly; `mafft --op 5`; batches of 100 |
| SINE_orth_loc `ComPair.sh` | f40fbf2 | all classification rules and default thresholds (CP_FLANK_LEN 150, CP_FLANK_NID 65, CP_FLANK_PID 65, CP_SINE_PID 65, CP_SINE_NID 100, CP_CUT_PID 70, CP_CUT_NID 120, CP_INDEL_MIN 50); order of tests (lfSINE/rfSINE, left flank, SINE in both + right flank, else trimmed right flank, PM if SO > ST else MP); contig_end; stat line fields |
| SINE_orth_loc `docs/pan-sineome.md` | f40fbf2 (format v0.1) | state table P/A/U/X/M, NEXUS of variable groups (>=1 P and >=1 A; U, X = ?), no reference genome |
| https://github.com/EddyRivasLab/easel `esl_distance.c` (`esl_dst_CPairId`) | develop branch, read 2026-10-31 | identity = identical residues / MIN(len1, len2), gaps not counted; 0 if length 0. esl-alipid uses the digital twin `esl_dst_XPairId`; assumed same denominator |
| MAFFT manual https://mafft.cbrc.jp/alignment/software/manual/manual.html | read 2026-10-31 | `--op` gap opening penalty, default 1.53. "one long gap preferred" is our plain-language explanation |
| https://github.com/Toki-bio/SINE-loci-viewer README | commit 4079b89 (2026-06-19) | two modes (alignment files / coords TSV), flank expansion with MAFFT `--op 5` in the browser, live demo URL |
| https://github.com/Toki-bio/SINEtribes README + script `SINEtribes` | commit 20ec337 (2025-10-27) | vsearch `--cluster_fast --id 0.99`, clusters with >=5 sequences, mafft localpair, `cons -plurality` 35 %, BED per tribe. "young, possibly polymorphic" is labelled on the page as our reading |
| Internal lab project log (species A and a close relative, unpublished) | 2026-10 | orthology run: several hundred thousand pairs, about four in five SINE, PM and MP about equal; subfamily split about four fifths / most of the rest; direction not determined, a more distant genome intended as outgroup. Exact values withheld until publication |
| Lab facts sheet for lesson 6 (s05) | 2026-10-31 | PM/MP/SINE meaning, C<N>R not stable, unique-flanks rule, flank background 25 % / ~50 % after alignment (FROM-NOTES, labelled "lab notes" on the page) |

## Papers (PubMed, abstracts read 2026-10-31)
- Shedlock & Okada 2000 BioEssays 22:148-160, doi:10.1002/(SICI)1521-1878(200002)22:2<148::AID-BIES6>3.0.CO;2-Z - irreversible, independent; "extreme confidence".
- Shedlock, Takahashi & Okada 2004 Trends Ecol Evol 19:545-553, doi:10.1016/j.tree.2004.08.002 - neutral, not precisely excised, known ancestral condition; discordant loci = lineage sorting, not noise; human Alu polymorphisms for diversity and demography.
- Nikaido, Rooney & Okada 1999 PNAS 96:10261-6, doi:10.1073/pnas.96.18.10261 - hippos closest relatives of whales (SINE + LINE insertions).
- Lum et al. 2000 Mol Biol Evol 17:1417-24, doi:10.1093/oxfordjournals.molbev.a026242 - seven loci, five taxa, insertion topology consistent with flanking-sequence tree.
- Okada, Shedlock & Nikaido 2004 Methods Mol Biol 260:189-226, doi:10.1385/1-59259-755-6:189 - lab protocol.
- Ray, Xing, Salem & Batzer 2006 Syst Biol 55:928-35, doi:10.1080/10635150600865419 - very low lineage sorting, parallel insertion, precise excision in primate Alu data.
- Churakov et al. 2009 Genome Res 19:868-75, doi:10.1101/gr.090647.108 - ~2 million loci; 5 / 9 / 8 insertions for three root hypotheses; soft polytomy; ILS and/or hybridisation.
- Suh, Smeds & Ellegren 2015 PLoS Biol 13:e1002224, doi:10.1371/journal.pbio.1002224 - 2,118 markers, ILS conflicts 35 % (autosomes), 34 % (Z).
- Kuritzin, Kischka, Schmitz & Churakov 2016 PLoS Comput Biol 12:e1004812, doi:10.1371/journal.pcbi.1004812 - KKSC: 3 unopposed markers (all species screened equally) / 5 (one species screened) for p < 0.05; symmetry separates ILS from hybridisation.
- Kosushkin, Korchagin, Vergun & Ryskov 2023 Genes 14:2089, doi:10.3390/genes14112089 - SINE_orth_loc workflow, lacertids, polymorphic insertion = shared derived character.

## Toy simplifications (stated on the page)
- Tree toy: presence = insertion on the path root->tip, cancelled by a deletion / sorting-loss mark on a later branch of the path; marks on the same branch: insertion first. "Lost by lineage sorting" is a modelling device (mechanically identical to a deletion), with a warning when placed with no insertion above. KKSC message only for the no-conflict case.
- ComPair toy: 250 bp consensus, 300 bp flank, windows of 300 + 550 bp; partial copies are 3' parts; copy-copy identity = left-flank identity; identities computed analytically (no real alignment); pid denominators as in Easel (shorter sequence); integer truncation of % as in ComPair (`awk -F.`). Not modelled: short-left-flank repair, indel masking of the right flank, contig_end, bank-mode CP_SINE_FRAC. Preset outcomes checked in headless Chrome: shared SINE, PM, MP, trunc PM, short PM, nolf badLF, badrf badRF, both empty "not built".

## Open doubts / not verified
- The SINE_orth_loc README describes v2.0 as current branch but also v2.1/v2.2 features; the page cites the commit instead of a version number.
- `sine_loci_browser.html` is in the SINE_orth_loc repository; I did not check whether it is served on GitHub Pages, so no URL is given.
- The numbers on the page are qualitative and scoped to one family, one species pair, one run.
- Darevskia read-check numbers come from the tool README (unpublished); kept in a clearly labelled note. Remove if the coordinator prefers no Darevskia numbers at all.

## Final review 2026-10-31
- Tooltips/links added at first use of terms in the lesson; see the lesson review record. Claims re-checked against source/papers listed above.
