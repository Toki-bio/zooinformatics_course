# s11 Mitochondrial genomes and NUMTs — notes

Files: 11-mito.html, 11-mito.js (IIFE, ids s11-*), 11-mito.css (selectors under #s11-wrap), this file.
Tested: `node preview.js 11-mito` at 1100 and 420 px: no page errors, no horizontal page overflow (SVGs scroll inside .svgbox at 420).

## Sources (read 2026-10-31)

| Source | Version / commit | What was taken |
|---|---|---|
| MitoHiFi https://github.com/marcelauliano/MitoHiFi (README + src/mitohifi.py, circularizationCheck.py, rotation.py, findFrameShifts.py) | README "v3.2.2", code `__version__ = '3.2.1'`, commit 3048377 (2025-05-11) | -r/-c modes; minimap2 map-hifi read recruitment; read-length filter `--max-read-len` 1.0x as rough NUMT filter; hifiasm; -p default 50, advice 80-90 for vertebrates; **-o default '1'** (must set 2); circularisation = blastn self-hit, `--circular-size` 220, `--circular-offset` 40, iterated until (False,-1,-1); rotation to tRNA-Phe; frameshift flag = regex `[A-Z]\*[A-Z]` in translations; MitoFinder default, `--mitos` option; outputs; findMitoReference.py usage |
| GetOrganelle https://github.com/Kinggerm/GetOrganelle (README, get_organelle_from_reads.py, GetOrganelleLib/versions.py) | 1.8.0.1, commit 2609989 (2025-02-13) | animal_mt recipe `-R 10 -k 21,45,65,85,105 -F animal_mt`; -R default 10 for animal_mt (source help); -k default 21,55,85,115; -w auto; -s own seed; outputs; `*scaffolds*path_sequence.fasta` = incomplete |
| NOVOPlasty https://github.com/ndierckx/NOVOPlasty (README, config.txt) | script NOVOPlasty4.3.5.pl in repo (README says 4.3.3), commit 12ea0cb (2024-02-04) | config fields; Genome Range default mito 12000-20000; K-mer default 33; do not trim reads; heteroplasmy calling |
| MITObim https://github.com/chrishah/MITObim | 1.9.1 (MIRA 4.0.2), last commit 2018-09-05 | description only, no command given on the page |
| MitoZ https://github.com/linzhi2013/MitoZ + wiki Tutorial https://github.com/linzhi2013/MitoZ/wiki/Tutorial | 3.6 (README), commit 06700b1 (2024-11-06) | `mitoz all` example verbatim (species name changed to *Mus musculus*), meaning of --data_size_for_mt_assembly, --requiring_taxa; outputs incl. overlap_information; Nov 2024 news: 0.3 Gb subsample can circularise where 12 Gb did not |
| MITOS2 https://gitlab.com/Bernt/MITOS (README.md on mitos2 branch, README.MITOS, mitos/scripts/runmitos.py at tag 2.1.10) | tag 2.1.10 (2025-12-08); Galaxy tool 2.1.7+galaxy1 | Galaxy recommended; runmitos.py flags -i, -c, -o (required), -r refseqver, -R refdir, --linear; reference data Zenodo 4284483 (files refseq39/63f/63m/63o/89f/89m/89o; "m" taken as metazoa — inferred from the name, not stated) |
| NCBI genetic codes https://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi | — | table 2 differences TGA/AGA/AGG/ATA |
| seqkit usage https://bioinf.shenwei.me/seqkit/usage/ | 2.14.0 | -w default 60; grep -s searches both strands by default, -m max mismatch, -i; subseq -r; seq -g, -m; sort -l (ascending by example); range -r; split -p naming; shuffle deterministic by default; `restart -i` |
| MAFFT source https://gitlab.com/sysimm/mafft (core/mafft.tmpl, core/io.c) | v7.526 (2024/Apr/26) | `linelength=60` default ("Will change to -1 in the future"); `--linelength -1` = no wrap; --reorder = aligned order; --adjustdirection |
| ReadExtend https://github.com/Toki-bio/ReadExtend (private? cloned with gh) | commit 7a2903a (2025-09-18), single file `script`, 282 lines, no README/licence | full algorithm and all limitations (see below) |
| Desman manuscript draft, unpublished manuscript draft (lab) | read 2026-10-31 (whole doc extracted) | Methods "Mitochondrial DNA assembly and annotation" (BWA-MEM to NC_008156.1 + NC_063097.1, IGV, MITOS2 on Galaxy, circularMT); "Detection of NUMTs" (minimap2 default, scaffolds <20 kb excluded, MAFFT, SeqKit, esl-alistat); Results "Mitogenome Assembly and Analysis of NUMTs" (PCR quote); Table SXX (all 6 rows) |
| internal lab notes  | 2026-10-03 | the four method quirks; "Divergence" column = esl-alistat average identity; Talpa europaea mito contig OZ077416.1 removed |
| [lab record: species A mito findings] (read fully) + internal lab notes  | — | species A facts on the page; unpublished, so given only as codes, rounded or qualitative values (no accessions, contig names, counts or gene-level indels) |
| the internal project-facts sheet §2 | — | species A reads probably CycloneSEQ (UNVERIFIED) — page says "labelled ONT ... probably CycloneSEQ (see s01)"; 26 long-read talpid/bat assemblies incl. two Talpa |

## ReadExtend: verified from code (not run)
Running seqkit/MAFFT locally was blocked by the permission classifier, so the script was NOT executed. All behaviour statements come from reading the code plus the seqkit docs / MAFFT source:
- Defaults: --rounds 5, --maxhits 30, --flank 20, --threads 8, workdir ./readwalk_tmp (deleted by trap on exit), direction right.
- Search: `seqkit grep -s -i -m 2 -p "$query"` over 20 shuffled parts until hits >= maxhits.
- Align: seed + hits, `mafft --adjustdirection --reorder`.
- Right: trailing-gap count of the first output record's 2nd line -> cut next FLANK columns, `seqkit seq --min-len 5 -g | seqkit sort -l | seqkit range -r -1:-1` = longest piece. Left: cuts 1..(leading gaps) i.e. whole overhang.
- Limitations listed on the page: 2nd-line-only parsing vs 60-char wrapping (seqkit -w 60, MAFFT linelength 60); NumberHits not reset per round; --reorder can move the seed; FASTQ not handled (grep "^>"); left/right asymmetry; longest piece not consensus; no circle/ambiguity check; paths opened as ../$READS and ../$OUT (absolute paths or nested --workdir break).
- The consequence "each read contributes at most its first 60 bases" is a code-reading inference; should be confirmed by one real run before the page goes public. The author may also have a newer local version.

## Not verified / judgement calls (kept off the page as fact)
- "tRNA-Phe is the usual GenBank start" — removed (human rCRS starts in the CR). Page only says MitoHiFi rotates to tRNA-Phe.
- MITOS2 output formats: page says GFF + protein FASTA because MitoHiFi's source reads those; full output list not checked.
- Whether the published GenBank mitogenomes of species A were short-read assemblies: not stated in sources; not stated on the page.
- Toy rules (90 % mapping threshold, depth = copies × nuclear depth, 2.7 Gb genome for the mtDNA share) are labelled as toy assumptions on the page.
- The blastn command flags (-evalue 1e-5 -dust no -outfmt 6) match the species A record "e<1e-5, no dust"; the exact command line used on therioserver was not re-read.
- "Merge hits split at position 1 of the linear mitogenome" is reasoning, not from a source.

## Interactives
1. Depth toy (#s11-cov-*): nuclear depth, mtDNA copies/cell, NUMT copy number, NUMT identity, mtDNA in/out of the reference. Log-depth profile along flank|NUMT|flank, mtDNA depth line, junction reads; readouts incl. expected NUMT-vs-mt differences per 150-bp and 10-kb read.
2. ReadExtend toy (#s11-rx-*): 120-bp circle, 60 mt reads + 17 NUMT-locus reads, seed 12 bp; flank/maxhits/mismatches/rounds sliders, NUMT reads on/off, step/run/reset/reshuffle; circle drawing (green = matches mtDNA, red = differs), sequence, per-round log. Faithful to: query = whole seed then last piece; hit limit; longest piece kept, ties by order; stop on no hits / no piece / round limit; no circle detection. Simplified: one strand, position instead of MAFFT alignment, hit counter reset per round (intended behaviour), default 1 mismatch.

## Cross-links used / suggested
- Used: ../01-pre-assembly/#gp, ../01-pre-assembly/#ct, #s01 (CycloneSEQ), #s08, #s09.
- Suggested: s04 (hifiasm multimer contigs), s09 (FCS-GX: remove mito contigs from the nuclear set), s06 (polishing does not fix systematic homopolymer errors — species A mitochondrial C-run), s10 (BUSCO E baseline vs real frameshifts).
