# Zooinformatics

Practical genomics for zoologists: self-paced web lessons that go from raw sequencing reads to an
assembled, annotated and checked genome. Every idea is introduced with a toy example and an
interactive figure, then tied to the real tools, commands and pitfalls, using the lab's own genome
projects (small mammals, including desmans) as worked examples.

**Read the course:** https://toki-bio.github.io/zooinformatics_course/

## Lessons

| # | Lesson | What it covers |
|---|---|---|
| 01 | [Pre-Assembly Read Profiling](lessons/01-pre-assembly/) | Reads and k-mers, read QC and trimming, k-mer spectra and GenomeScope2, Smudgeplot, flow cytometry, contamination, planning the assembly, N50/L50 |
| 02 | [Genome Assembly](lessons/02-assembly/) | Pre-flight check, computing needs, short-read and long-read assemblers, Hi-C scaffolding with YaHS, polishing, purging, gap closing, haplotypes and phasing, quality metrics, FCS-GX, BUSCO, mitogenomes and NUMTs, sex chromosomes, data deposition |
| 03 | [Repeats, Genes and ROH](lessons/03-annotation/) | Repeat classes, de novo repeat libraries, masking and landscapes, tandem repeats, gene evidence, BRAKER/GALBA/Helixer/EGAPx, projection with TOGA2, functional annotation and quality, heterozygosity and runs of homozygosity |
| 04 | [Population History from One Genome](lessons/04-demography/) | The coalescent, preparing a diploid genome, PSMC and its scaling, MSMC2/SMC++/cobraa/SFS methods, pitfalls, two-species divergence and gene flow (hPSMC, BPP, gIMble), reporting |
| 05 | [DNA Methylation from Long Reads](lessons/05-methylation/) | CpG methylation biology, nanopore and PacBio detection, modkit pileup, haplotype-resolved methylation, genes and repeats, differential methylation, QC and IGV |
| 06 | [SINEs and Satellite DNA](lessons/06-sines-satellites/) | SINE biology, finding and discovering SINEs, tRNA heads, families and subfamilies, orthologous loci, satellite monomers and HORs, repeats in assemblies, a complete SINE study |


## How the lessons are made

- **Sources, not memory.** Every default, option, file name and resource figure was checked against
  the tool's own documentation and, where that was vague, its source code. Each section has a
  `*.notes.md` file next to it in `src/` listing the sources (URL and version), what was taken from
  each, and what could not be verified.
- **Toy examples first.** Each section has at least one interactive figure built from a small
  simulated example, and collapsed "Simple explanation" boxes for the harder steps.
- **No unexplained jargon.** Every term is defined where it first appears, or has a hover tooltip.
- **Real projects.** "In our projects" boxes report what happened in the lab's own assemblies,
  including the mistakes.
- **Review.** After writing, each lesson is read as a whole by a separate reviewer for jargon,
  consistency between sections and the riskiest technical claims, and every interactive control is
  clicked through in a real browser.

## Repository layout

```
index.html                       course home page
lessons/NN-name/index.html       built lesson pages (served by GitHub Pages; do not edit by hand)
src/build.py                     builds lessons/ from src/
src/check.js                     checks the built pages in headless Chrome
src/preview.js                   previews one section while writing it
src/lesson01/lesson01.html       lesson 1 (a single hand-written page; also holds the shared style)
src/lessonNN/lesson.json         title, introduction and order of work of lesson NN
src/lessonNN/sections/           one section = NN-slug.html + .js (+ .css) + .notes.md (sources)
docs/AUTHORING.md                how to write or change a section
CHANGELOG.md                     what changed and when
```

## Building and checking

Requirements: Python 3.8+, Node.js 18+, and Chrome or Edge installed (the checker drives the
installed browser; set `CHROME_PATH` if it is in an unusual place).

```bash
npm install            # once: installs playwright-core (no browser download)
npm run build          # python src/build.py  -> lessons/*/index.html
npm run check          # every lesson at 1100 px and 420 px: script errors, overflow, ids, links
node src/preview.js 2 05-yahs        # preview one section, writes build/preview-*.png
```

Commit the rebuilt `lessons/` together with the changed `src/` files.

## Publishing

GitHub Pages: Settings → Pages → Source "Deploy from a branch", branch `main`, folder `/ (root)`.
`.nojekyll` makes Pages serve the files as they are.

## Licence and citation

Lesson text and figures: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (reuse with attribution).
Code (build tools and the scripts that draw the figures): MIT. See [LICENSE](LICENSE).
To cite the course, use [CITATION.cff](CITATION.cff) (GitHub shows a "Cite this repository" button).

## Contributing

Corrections are welcome as issues or pull requests. Please name the tool version and link the
documentation or source line that shows the problem; see [docs/AUTHORING.md](docs/AUTHORING.md).
