# s09 Heterozygosity and ROH from one genome: notes and sources (2026-10-31)

Downloaded copies of every doc are in lesson3/src/docs/.

## Sources (URL, version, what was taken)
- bcftools manual https://samtools.github.io/bcftools/bcftools.html (page refers to git 1.22-8; latest release 1.25, 2026-10-27, GitHub API). roh section: HMM with AZ/HW states, `--AF-dflt` ("sites where allele frequency cannot be determined, or is 0, are skipped"), `-G` ("Safe value to use is 30"), `-M`, `-m`, `-O s|r`, RG output columns. mpileup: `-X` profiles (illumina, ont, ont-sup, pacbio-ccs, ...), `-d` default 250, `-q` default 0, `-Q` default 13, `-a AD,DP`. call: `-m`, `-v` = variants only, `-g` gVCF. `.bed` suffix => 0-based for -R/-T. Example pipeline mpileup|call -mv|filter.
- bcftools source vcfroh.c (develop) https://raw.githubusercontent.com/samtools/bcftools/develop/vcfroh.c: defaults `-a` 6.7e-8, `-H` 5e-9, rec_rate 0 (transitions scaled by distance only with -M or a map); usage example `bcftools roh -G30 --AF-dflt 0.4`; `-i/--ignore-homref` option exists.
- PLINK 1.9 https://www.cog-genomics.org/plink/1.9/ibd (stable 1.9.0, 27 Sep 2026): --homozyg defaults (100 SNPs, 1000 kb, 50 kb/SNP, gap 1000 kb, window 50 SNPs, window-het 1, window-missing 5, threshold 0.05). https://www.cog-genomics.org/plink/1.9/input: `--vcf`, `--double-id`, `--allow-extra-chr` ("If none of the additional codes start with a digit").
- ROHan README https://github.com/grenaud/rohan (HEAD 5bc3718, commit 2026-10-27): `rohan --rohmu 2e-5 -o prefix ref bam`, `--tstv`, `--auto` list of chromosomes, `-t`, default 1 Mbp windows (`--size`), 42 min per 1 % on 4 threads for 2.9 Gbp, 1.3 GB RAM at -t 4, output files, Watterson theta outside/including ROH, MCMC random seed. Paper abstract (in README bibtex): 5-6x modern, 7-8x ancient.
- DeepVariant README r1.10 https://github.com/google/deepvariant (release v1.10.0, 2026-03-05): docker command, model types WGS, WES, PACBIO, ONT_R104, HYBRID_PACBIO_ILLUMINA; `--output_gvcf`; `--haploid_contigs`; "only trained on human data".
- Clair3 README https://github.com/HKU-BAL/Clair3 (v2.0.5, 2026-10-28): run_clair3.sh options, `--include_all_ctgs` "required for non-human species", default contigs chr1..22,X,Y, `--gvcf`, `--print_ref_calls`, output merge_output.vcf.gz, v1 TF models not compatible with v2, `--gender` option (v2.0.3, not used on page).
- minimap2 README v2.31: presets map-ont, map-hifi, lr:hq (v2.27+), sr. paftools.js (2.31-r1302) source: `call` defaults -l 10000, -L 50000, -q 5; input sorted by -k6,6 -k8,8n with cs tag.
- bwa-mem2 README (release v2.3, 2025-06-30): `index`, `mem -t`; "Requires 28N GB memory where N is the size of the reference sequence".
- samtools markdup manual https://www.htslib.org/doc/samtools-markdup.html: collate (skippable if name-grouped) -> fixmate -m -> sort -> markdup.
- mosdepth README (v0.3.15): `-n`, `-Q/--mapq` (default 0), `--quantize` half-open bins, MOSDEPTH_Q0.. env vars rename bins.
- bedtools 2.31: coverage output columns (count, bases covered, length, fraction) and `-counts`; makewindows `-g`, `-w` (from windowMakerMain.cpp usage).
- Thompson EA 2013 Genetics 194:301, doi 10.1534/genetics.112.148825, PMC3664843 (full text read): "a separation of m meioses provides segment lengths that are exponentially distributed with mean 100/m cM"; exponential SD = mean. Used for g ≈ 100/(2 L_cM).
- McQuillan R et al. 2008 Am J Hum Genet, doi 10.1016/j.ajhg.2008.08.007, PMC2556426 (abstract/methods read): F_ROH definition; "ROHs measuring up to 4 Mb are common in demonstrably outbred individuals".
- Wilder et al. 2023 Science 380:eabn5856: 50-kb window het/callable + two-component Gaussian mixture. Read by an earlier agent in full (skill roh-visualization references/LIT_roh_tools_verified.md section 8); not re-read today.
- Project facts: the internal project-facts sheet sections 3a-3c (species A and its published close relative). Unpublished: shown on the page only qualitatively/rounded (owner request 2026-11-01); the mosdepth example uses a toy 30x median.

## Derived / my own wording (not from a doc)
- Length-class table: arithmetic from Thompson's formula (g = 50/(L_Mb x r)) at r = 1 and 0.5 cM/Mb. The class "usually read as" column is general interpretation, stated as orders of magnitude with caveats.
- "Ts/Tv ~2 in mammals; random errors pull it toward 0.5": the ~2.0-2.2 expectation is from the facts sheet 3a; 0.5 = 4 of 12 possible substitutions are transitions (arithmetic).
- "PLINK sees only the variant positions you give it, so defaults must be retuned": inference; the example `--homozyg-kb 300 --homozyg-snp 50` is labelled as an example, not a recommendation.
- Depth bounds "roughly half to twice the median": from the project recipe (SK-DEM 0.514x-1.8x), shown as a rule of thumb.
- Toy model: segments exponential with mean 100/(2g) cM at 1 cM/Mb; "number of shared ancestors" = number of segments placed (simplification stated in the tool text); old segments use g = 500; het counts Poisson per 10-kb bin.

## Not verified / left out
- Whether bcftools roh accepts gVCF reference blocks directly: not checked, so the page only recommends an all-sites VCF.
- Whether PLINK --homozyg reports runs on contigs loaded with --allow-extra-chr ("ignored by most analyses which skip unplaced regions"): not tested. Flag for whoever runs it.
- ROHan `--auto` argument form (file of names) inferred from README text ("--auto with a list of your assembled chromosomes"); run `rohan` without arguments to confirm.
- Clair3 gVCF output filename not stated on the page.
- RZooRoH, GARLIC not discussed (need population allele frequencies; see skill references).

## Cross-links
- ../01-pre-assembly/#gp (GenomeScope heterozygosity), ../02-assembly/#s06 (purging haplotigs), ../02-assembly/#s12 (sex chromosomes). Could link s04 of this lesson (TRF/simple repeat masking) from the "Simple repeats" bullet.
