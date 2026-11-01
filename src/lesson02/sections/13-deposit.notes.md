# s13 Depositing data — notes (written 2026-10-31)

Files: 13-deposit.html, 13-deposit.js, 13-deposit.css, this file. Tested with `node preview.js 13-deposit` at 1100 and 420 px: no page errors, no horizontal overflow (scrollWidth = viewport).

## Sources (all fetched 2026-10-31)

| URL | What I took |
|---|---|
| https://www.ncbi.nlm.nih.gov/genbank/genomesubmit/ | file formats (.fsa/.sqn, no zip), SeqID rules (<50 chars, allowed chars), contigs >199 nt, no terminal Ns, gap rules (min run ≤10, unknown-gap N count, linkage evidence), chromosome/organelle defline tags, chromosome name rules (≤33, no chr/Un/0, LG), metadata list, prerequisites, table2asn flags (-M n, -Z, -j, -V b, -c s, -w, -Y), .val/.stats/.dr fixing, rejection reasons, 2-week notice for held genomes |
| https://www.ncbi.nlm.nih.gov/genbank/wgs.submit/ | WGS accession example ABCDEF000000000; GCA_019776245.1 example; no duplicate BioProject/BioSample |
| https://www.ncbi.nlm.nih.gov/genbank/diploid_haps/ | Principal/Alternate, Haplotype 1/2, Maternal/Paternal; one BioSample, one BioProject per haplotype + umbrella (staff create it); option name "Pseudohaplotypes of a diploid/polyploid assembly"; name examples bSteHir1.pri/.alt, mCalJac1.pat/.mat, rPleGil1.0.hap1/.hap2; mito in principal/maternal; isolate required |
| https://submit.ncbi.nlm.nih.gov/about/genome/ | FASTA or .sqn, not mixed; chromosome assignment in forms (single) or headers (batch); FCS "We recommend that you download and run NCBI's new Foreign Contamination Screen (FCS) tool before submitting"; statuses Queued/Processing/Processed, no fixed time; locus-tag checkbox; metadata list |
| https://www.ncbi.nlm.nih.gov/genbank/wgs_gapped/ | -gaps-min, -gaps-unknown, -l values (paired-ends, map, proximity-ligation, align-genus, align-xgenus, align-trnscpt), "100 N's for unknown length", example command |
| https://www.ncbi.nlm.nih.gov/genbank/genome_agp_specification/ | AGP v2.1 9 columns, W/N/U, gap types, linkage yes/no, evidence values (proximity_ligation etc.), U = 100 |
| https://www.ncbi.nlm.nih.gov/genbank/table2asn/ (updated 2024-04-23) | example commands, output files, FTP download location ftp.ncbi.nlm.nih.gov/asn1-converters/by_program/table2asn |
| https://www.ncbi.nlm.nih.gov/genbank/feature_table/ | 5-column format; key only on first interval line (CDS 5522/5572 + 5706/6197 and tRNA-Phe examples, copied into the toy box); >Feature SeqId header |
| https://www.ncbi.nlm.nih.gov/genbank/organelle_submit/ | standalone organelle genomes go via SP-GenBank; Genome portal only with nuclear genome; minus strand larger coordinate first |
| https://www.ncbi.nlm.nih.gov/genbank/genome_validation/ | TerminalNs; InternalNsInSeqRaw |
| https://www.ncbi.nlm.nih.gov/sra/docs/submitportal/ | wizard steps, metadata columns, one row = experiment, preload folder + "wait 10–15 minutes", FASTQ <100 GB, 5 TB, 1,000 samples, gzip/bzip2 not zip, assemblies not accepted, release default |
| https://www.ncbi.nlm.nih.gov/sra/docs/submitfiles/ | FTP host ftp-private.ncbi.nlm.nih.gov, mkdir/cd/mput, subfolder rule; ascp -i key -QT -l100m -k1 -d … subasp@upload.ncbi.nlm.nih.gov:uploads/…; ports TCP 22 / UDP 33001 (from search snippet of this page) |
| https://www.ncbi.nlm.nih.gov/sra/docs/submitformats/ | BAM preferred, CRAM ok, SAM not; FASTQ rules; PacBio bas/bax.h5; ONT fast5 basecalled, tar.gz; no concatenated paired FASTQ |
| https://www.ncbi.nlm.nih.gov/sra/docs/submitbio/ | order BioProject → BioSample → SRA; release date of SRA changes project/sample dates |
| https://www.ncbi.nlm.nih.gov/biosample/docs/packages/Model.organism.animal.1.0/ and …/Invertebrate.1.0/ | mandatory and "at least one" attributes; specimen_voucher format + UAM:Mamm:52179 example; lat_lon format; date formats |
| https://www.ncbi.nlm.nih.gov/genbank/acc_prefix/ | WGS formats (4 letters+2+6+, 6 letters+2+7+); DDBJ prefixes start B, EBI start C |
| https://www.ncbi.nlm.nih.gov/genbank/sequenceids/ | NC_000001.11 example |
| https://www.ncbi.nlm.nih.gov/datasets/docs/v2/troubleshooting/faq/ | GCA vs GCF meaning |
| https://www.ncbi.nlm.nih.gov/datasets/docs/v2/command-line-tools/download-and-install/ | conda install commands |
| https://www.ncbi.nlm.nih.gov/datasets/docs/v2/how-tos/genomes/download-genome/ and …/reference-docs/command-line/datasets/download/genome/datasets_download_genome_accession/ | --include values (genome,rna,protein,cds,gff3,gtf,gbff,seq-report,none), --preview, --dehydrated, examples GCF_000001405.40, GCA_003774525.2, PRJNA289059 |
| …/datasets/summary/genome/datasets_summary_genome_taxon/ | --as-json-lines, --reference, --assembly-level |
| …/dataformat/tsv/dataformat_tsv_genome/ | field names accession, organism-name, assminfo-level, assmstats-contig-n50 |
| datasets rehydrate --directory: reference page synopsis seen via web search (https://www.ncbi.nlm.nih.gov/datasets/docs/v2/reference-docs/command-line/datasets/datasets_rehydrate/) | rehydrate syntax |
| https://github.com/enasequence/webin-xml (SRA.common.xsd, SRA.experiment.xsd; commit 2299b417, 2026-07-03) | platform list (no CycloneSEQ), ONT models MinION/GridION/PromethION/unspecified, PacBio models incl. Revio/Vega, DNBSEQ models, library_strategy/source/selection vocabularies incl. Hi-C, Restriction Digest definition |
| https://ena-docs.readthedocs.io/en/latest/submit/general-guide/accessions.html | accession formats & examples (PRJEB12345, SAMEA123456, ERX/ERR/ERZ123456, GCA_123456789.1, ABCD01123456, AB123456.1) |
| https://ena-docs.readthedocs.io/en/latest/submit/general-guide/webin-cli.html | -userName/-password/-manifest/-validate/-submit/-test/-ascp, Java 17, docker |
| https://ena-docs.readthedocs.io/en/latest/submit/reads/webin-cli.html | reads manifest fields + example |
| https://ena-docs.readthedocs.io/en/latest/submit/assembly/genome.html | genome manifest fields, ≥2 contigs, ≥20 bp, no terminal Ns, name ≤50, ERZ receipt, GCA after processing |
| https://ena-docs.readthedocs.io/en/latest/submit/fileprep/assembly.html | chromosome list + unlocalised list formats, gzip |
| https://ngdc.cncb.ac.cn/gwh/documents | GWH format GWHXXXX00000000, BIG Sub, FTP submit.big.ac.cn, accepted files (FASTA, GFF/TBL, AGP, CSV), download URLs |
| Chen et al. 2021 GPB, GWH paper, https://pmc.ncbi.nlm.nih.gov/articles/PMC9039550/ | GWHAAAA00000000 example, sequence/gene numbering, limited INSDC exchange (62 SARS-CoV-2), plan to share later, ftp://download.cncb.ac.cn/gwh |
| GSA family paper https://pmc.ncbi.nlm.nih.gov/articles/PMC9039563/ | GSA-Human controlled access via DAC; FTP/HTTP download except controlled data |
| https://ngdc.cncb.ac.cn/gsa/support/faq | GSA submission order, FTP submit.big.ac.cn, "binary" before mput, accepted formats |
| https://ngdc.cncb.ac.cn/gsa/support/standardsGsa (via search result) | PRJCA000005, SAMC + 6 digits (SAMC000001), CRA/CRX/CRR + 6 digits |
| GSA submission guide (search result) | ftp://download.big.ac.cn/gsa3/CRA…/CRR…/ download path; Aspera command line recommended |
| https://www.dnazoo.org/methods | Juicer + 3D-DNA + JBAT on draft assemblies |
| Challis et al. 2023 Wellcome Open Res (GoaT), PMC9971660 (via search) | GoaT scope and EBP sequencing status |
| URLs checked live (HTTP 200): ensembl.org, beta.ensembl.org, projects.ensembl.org/darwin-tree-of-life, vertebrategenomesproject.org, earthbiogenome.org, portal.darwintreeoflife.org, goat.genomehubs.org, dnazoo.org/assemblies, genomeark.github.io, submit.ncbi.nlm.nih.gov/subs/genome, ngdc.cncb.ac.cn/gsub |

Project facts: internal lab notes, crayfish_mito_final_resubmission_2026-08-09.md, the species B/C sequencer note and the species A assembly note (unpublished taxa: page uses codes A-C, no isolate IDs, basecaller strings or exact numbers; example organism changed to Mus musculus, example genus search to Talpidae). the internal project-facts sheet did not exist in the lesson2 folder when I wrote this.

## Important finding (for the project owner, not only the page)
The crayfish .tbl "parse bug" diagnosis in crayfish_mito_annotation_qc_2026-08-08 is contradicted by NCBI's feature_table page: continuation interval lines carry NO feature key (CDS and tRNA examples). The original bare `1 180` after `14919 15428 D-loop` was the correct way to write a two-interval feature; the "fix" `1 180 D-loop` (in kessleri_mito_FINAL.tbl per the resubmission memory) creates a second, separate D-loop feature. The page says this. Someone should check the final .tbl before submitting (run table2asn -V vb and look at the flatfile: the D-loop should read join(14919..15428,1..180)).

## Not verified / left out or hedged
- NCBI's own instrument_model list (the SRA metadata spreadsheet URL returned 404). I used the ENA copy of the INSDC SRA schema; the page says "ENA's copy". Whether NCBI accepts CycloneSEQ under another value: unknown, so the page says ask the help desk.
- Whether NCBI runs FCS-GX itself on every submission: not stated on a current NCBI page I could open; the page says "every genome is screened for foreign organisms and vector/adaptor" (genomesubmit) and "NCBI recommends running FCS before submitting" (portal about page).
- Duplicate-sequence rules for genome submissions: not found in current docs; left out.
- Genome/SRA processing times: no figures in current docs; the page says so.
- Maximum hold period for SRA/BioProject: not found; left out.
- Hi-C library_selection: no official recommendation found; the page says "pick from the list (e.g. Restriction Digest)" with the schema's definition.
- GoaT status value names: not verified; the checklist does not quote them.
- NGDC record pages are behind a browser check; no real CRR/HRA example verified, so those decoder examples are marked synthetic. URL patterns ngdc.cncb.ac.cn/biosample/browse/SAMC… and /gsa/browse/CRA… come from search-result URLs.
- "YaHS writes an AGP" is from general knowledge of YaHS output; s05 should confirm (or edit that clause).
- ENA chromosome list "Circular-Chromosome" combination is built from the documented type+modifier rule, not copied from an example.

## Cross-links used / suggested
#s05 (Hi-C, proximity-ligation evidence, AGP from YaHS), #s07 (primary/alternate/haplotypes), #s09 (FCS-adaptor/FCS-GX), #s11 (mitogenome: could link to the mitogenome-alone SP-GenBank route and the .tbl example here), #s12 (sex in BioSample).
