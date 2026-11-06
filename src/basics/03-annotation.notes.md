# Basics notes, lesson 3

1. Repeats occur again and again. Rests on section 02 (interspersed vs tandem) . Measured: 10-mer marking gives 3 blocks for the interspersed toy, 1 block for the tandem toy (fixed seed).
2. Masked first. Section 01 (why repeats come first, LINE reading frames, soft-masking lowercase). Toy gene finder = ATG plus >=60 codons without stop. Background ORFs are broken with a stop codon at build time so only the gene and repeat copies are found. Measured: 2/6/15 copies give 1/8/14 repeat candidates unmasked and 0 masked; always 1 gene.
3. Gene structure. Section 05 (exon, intron, GT-AG, CDS, UTR, isoform). Measured over 8 seeds: reading straight through DNA from the real ATG stops after 14 to 57 codons; CDS is 63 to 69.
4. Split reads. Section 05 (split reads, depth, weak genes); min 2 split reads is the lesson toy default. Measured over 12 seeds: gene 1 shows 2 of 2 introns at 200 reads in all runs, 0-2 at 8 reads; gene 2 shows 0 at 8 and 40 reads in most runs, 0-2 at 200. Text numbers are computed.
5. ROH strips. Section 09 toy: 100 Mb, 50 kb windows, 0.3 het/kb, 1 Mb minimum, 2.0 het/kb outside, 0.05 inside, segment mean 100/(2g) cM at 1 cM/Mb, 40 old segments (g=500), 3 recent. g=25 and 5 chosen by me. Over 6 seeds: animal 1 finds no run; animal 2 finds 1 to 3 (longest 1.1 to 6.3 Mb); animal 3 longest 5.6 to 67 Mb.
6. Callable denominator. Section 09 (callable genome, window length vs callable bases). Gaps at 15 and 70 Mb. Measured: gap <=0.95 Mb adds no false run, >=1.5 Mb adds two; callable-aware caller finds only the 8 Mb run at all gap sizes.


Trim 2026-11-06: block 2 text no longer mentions reading frames, codons, LINEs or the ATG/60-codon finder rule (toy unchanged: ATG + >=60 codons without stop, LINE-like repeat). Dropped from text: GT/AG intron ends (and the intron-ends line under the gene toy), splicing term, UTR, isoform term, 0.3 het/kb threshold, 40 old segments, read length 40 and split choice rule, Mb definition.
