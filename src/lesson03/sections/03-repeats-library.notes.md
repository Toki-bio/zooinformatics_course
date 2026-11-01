# s03 Repeats II: building a repeat library de novo — notes

Written 2026-10-31. Sources cloned into lesson3/src/<tool> (shared with other section agents; not modified).

## Sources (URL, version, what was taken)

| Tool / source | Version / commit | Taken from it |
|---|---|---|
| RepeatModeler https://github.com/Dfam-consortium/RepeatModeler | tag 2.0.9, commit 14798c7 (2026-06-11) | README: RECON + RepeatScout + LtrHarvest/LTR_retriever; LTR_retriever must be 2.9.0; BuildDatabase/RepeatModeler example; >32 GB RAM, their setup 28 cores/128 GB; mammal ">1-2 days" with 20 threads; outputs -families.fa/.stk/-rmod.log, RM_<PID>.<date>; -recoverDir; BLAST_USAGE_REPORT=false; local disk; do not batch or combine runs ("largely redundant"), use -genomeSampleSizeMax. RepeatModeler POD: -threads, -srand, -LTRStruct, -genomeSampleSizeMax, -numAddlRounds, -quick. Source lines ~410-431: round 1 RepeatScout 40 MB; RECON 10/30/90/270 MB (2.0.4+), -quick 3/9/27/81/243 MB; recommendedFamilySize 15 with comment about segmental duplications. Lines ~2612-2620: "Redundant Families and Large Satellite Filtering". Family IDs rnd-<round>_family-<n>; LTRPipeline ltr-1_family-<n>. CHANGELOG: 2.0.4 threads/larger samples; 2.0.7 RepeatAfterMe extension in Refiner; 2.0.9 FamDB/Dfam 4.0. BuildDatabase POD: IDs replaced, .translation file. |
| RepeatClassifier (same repo) | 2.0.9 | Step 1 RepeatMasker simple masking, <40 bp unmasked => simple; step 2 rmblastx vs RepeatPeps (p cutoff 0.001); step 3 rmblastn vs Dfam consensus (fasta_all from FamDB) min score 250. |
| Flynn et al. 2020 PNAS 117:9451, https://pmc.ncbi.nlm.nih.gov/articles/PMC7196820/ | paper | LTR module = LTRharvest + LTR_retriever, CD-HIT redundancy; "greatest improvement is for LTR"; ~3x more >95% families than RM1; false positives 1 (fly) and 5 (zebrafish) on simulated TE-free genomes; no SINE benchmark. (Read via WebFetch summary.) |
| EDTA https://github.com/oushujun/EDTA | EDTA.pl $version v2.3.3, commit 2ad391d (2026-09-10) | README: rice benchmark, install, inputs (names <=13 chars, --cds, --curatedlib "trusted 100%", SINEs/LINEs under-annotated), outputs (.mod.EDTA.TElib.fa, TEanno.gff3, TEanno.sum), options (--species Rice/Maize/others, --sensitive, --anno, --u 1.3e-8, --threads default 4), Wicker naming. EDTA_raw.pl: AnnoSINE_v2 (--copy_number 3) + TEsorter (rexdb) + tandem cleanup for SINE; RepeatModeler2 for LINE; TIR-Learner; HelitronScanner; LTR_FINDER_parallel/LTR_HARVEST_parallel/LTR_retriever. EDTA.pl: CDS purge step. |
| HiTE https://github.com/CSU-KangHu/HiTE | main.py version 3.3.3, commit f5f2c7f (2025-12-03) | README: full-length TEs, "dynamic boundary adjustment", panHiTE, 40 CPU/128 GB recommended, conda via environment.yml, usage incl. --plant default 1, --annotate, --recover, --domain; outputs confident_TE.cons.fa, low_confident_TE.cons.fa, all_TE.fa, HiTE.out/gff/tbl; out_dir should be empty. judge_Non_LTR_transposons.py: SINE + LINE candidates, LINE candidates checked for complete domain (Chinese comment). Paper Hu et al. 2024 Nat Commun 15:5573 (citation from README). |
| Earl Grey https://github.com/TobyBaril/EarlGrey | 7.3.1, commit a0d07a6 (2026-10-28) | README: Dfam 4.0/FamDB partitions, configure_dfam40.sh; runtime "3Gb genome ~a week", >=3 GB RAM/thread; options -g -s -o -t -r -l -i(10) -f(1000) -n(20) -a(3) -d; conda install line; output tree and summaryFiles; nested=FULLY_NESTED; v7.0.2 -norna no longer default (tRNA SINEs); earlGreyLibConstruct. earlGrey script line 195: RepeatModeler called without -LTRStruct; RepeatMasker -s -a -no_is -lcambig. CITATION.cff authors Baril, Galbraith, Hayward. |
| TEstrainer (EarlGrey/scripts/TEstrainer) | same commit | initial_mafft_setup.py: dc-megablast e 1e-5, pident>=70, qcovs>=50, best n_seq by bitscore, +/- flank, self-blast trimming. TEtrim.py: consensus from columns with >2 non-gap bases, ties -> 'n'; complete if growth <= 0.5*flank, else further round. Shell: TRF 2 7 7 80 10 50 500, sa-ssr, mreps -> satellites separated; RepeatClassifier on non-satellites. |
| Earl Grey paper, Baril et al. 2024 MBE 41(4):msae068, https://academic.oup.com/mbe/article/41/4/msae068/7635926 | paper | BEAT = "BLAST, Extract, Align, Trim" (from BEE, Platt et al. 2016); RepeatCraft loose merge 150 bp; benchmark: consensus counts 57.8/57.6/1,303; 95-105% length 88.50/21.72/4.49 %. (WebFetch summary; first 100k chars.) |
| TE-Aid https://github.com/clemgoub/TE-Aid | main, commit 2e3aee3 (2026-08-23); v2 Python rewrite on separate branch | README: 4 plots, options -q -g -o -t, -f default 0.9; conda TE_AID.yml; Goubert et al. 2022 Mob DNA beginner's guide. |
| ProtExcluder | not verified from own docs | Only via web search: MAKER-P toolkit, Campbell et al. 2014 Plant Physiol 164:513; filters repeat library using blastx vs proteins. MAKER wiki host unreachable, Biostars 403. Page states it only as "a widely used script", no command. |

## Project facts used (all from the internal project-facts sheet)
- Species A (unpublished; on the page only qualitatively/rounded, owner request 2026-11-01): de novo library naming rnd-N_family-M; versions unrecorded; about half soft-masked; Unknown the largest class; 0 SINE families; >100 Unknown SINE-like families covering >10 % of the genome; threshold of SINE-like call unverified (said so on page).
- SINEderella description; locus count given only as "on the order of a million".

## Interactive (03-repeats-library.js)
Toy: 12 copies of a random 70-bp TE with 45-bp random flanks, substitutions only; seed = TE bases 21-50; sliders extend left/right 0-45 bp; divergence 2-45 %; optional 4 copies 5'-truncated (break 3-17 bp into TE, outside seed); show-true-TE shading. Column agreement = majority count / 12; threshold 60 %; consensus lower-case below threshold, 'n' on ties (as TEtrim con_maker). Trim = first run of 3 columns <60 % walking outward from the seed within the window (toy rule, labelled as such).
Tested with playwright (s03click.js, s03click2.js): no page errors; 40 random seeds each with full extension: div 20 % exact 33/40; 30 % exact 7/40 (31 stopped inside); 40-45 % 0/40 exact (all too short). Hence the page text "with old copies the rule usually stops inside the element". At 10 % essentially always exact.

## Not verified / left out
- RepeatModeler2 runtime for a 3 Gb genome in hours: only README ">1-2 days" phrasing used.
- Earl Grey paper says 6 RepeatModeler rounds; current code uses RepeatModeler defaults (2.0.4+ = 1 RepeatScout + 4 RECON). Round count not stated for Earl Grey on the page.
- HiTE internal algorithm (FMEA) not described beyond README wording.
- AnnoSINE_v2 algorithm not read; tooltip only says SINE-specific finder, >=3 copies.
- "Olfactory receptors, immune genes" as multi-copy gene examples = general knowledge, not from a tool doc.
- Why the species A SINEs were Unknown: page says it "fits" the classifier logic; not proven (which Dfam partitions were installed is unknown).

## Cross-links suggested
- s02 for TE classes (SINE/LINE/LTR/DNA, Helitron, satellites).
- s04 for RepeatMasker -lib, Kimura divergence/landscapes, TRF/tandem tools (linked as #s04).
- s06 for why over-masking genes matters (linked as #s06).
- Later SINE lesson (SINEderella) — pointer only.
