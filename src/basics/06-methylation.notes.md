# Basics page, lesson 6 (06-methylation): notes

1. Methyl on C, letters unchanged. Rests on section 01 (5mC, CpG, epigenetic; methyl on both strands). The page shows the sequence string and a count of marked CpGs, computed from the click state.
2. Counting reads gives a percentage. Section 03 (methylation level = methylated reads / reads with a call; a long read is one molecule). Reads are drawn at random from true shares 20, 60, 90 %; percentages counted from the drawn reads.
3. More reads, more trust. Section 03 ("How many reads per CpG": 4 reads give only 0, 25, 50, 75, 100 %). Simulation of 40 measurements at 4, 10, 40, 160 reads, true 60 %. Measured at 3 seeds: ranges about 0-100, 20-80, 40-83, 49-68 %; the printed ranges are computed.
4. Unsure calls set aside. Section 03 (pass threshold, confidence = max probability, Nfail not in the percentage) and section 02 (probability, not yes/no). 20 fixed probabilities; at 0.5 / 0.7 / 0.9 the page counts 20 / 13 / 12 reads, levels 60 / 54 / 58 %.
5. 50 % hides two copies. Section 04 (haplotagging by SNP, imprinted region, 50 % average). 20 reads x 13 CpGs, 4 % call error. Measured: pooled 50 %, sorted 95 / 5 % in the differing region; 49 %, 45 / 53 % in the other region.
6. File must keep signal or calls. Section 02 (FASTQ loses everything; keep pod5 or tagged BAM; ask the provider). Four invented reads, levels computed from invented probabilities (3 of 4 = 75 %, 2 of 4 = 25 %).

Checked in Chrome at 1100 and 420: no script errors, scrollWidth equals width, all buttons clicked.

Trim 2026-11-06: cut text to about 570 words. Moved out of the page (full lesson has them): methyl on both strands of a CpG; true shares 20/60/90 % in block 2; 4 reads give only 0/25/50/75/100 % and the simulation uses correct calls (block 3); confidence = max(p, 1-p) (block 4); 13 CpGs, 4 % call error, equal read numbers in both regions (block 5); nanopore current vs PacBio polymerase timing (block 6).
