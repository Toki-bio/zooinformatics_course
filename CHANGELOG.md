# Changelog

## 2026-11-06
- New lesson 05 "Population History from Many Genomes" (8 sections) and lesson 08 "Searching Sequences" (11 sections).
- Lessons renumbered: methylation is now lesson 06 (`lessons/06-methylation/`), SINEs and satellites lesson 07
  (`lessons/07-sines-satellites/`). Old addresses of these two lessons no longer work.
- Lesson 04: coalescent theory from zero with an interactive Wright-Fisher display (s01); the principle of PSMC,
  population size versus timing and the role of recombination (s03); methods table extended, what becomes possible
  as data grows, and one display comparing how PSMC, MSMC, MSMC2 and SMC++ read the same ancestors (s05).

## 2026-11-01
- Lesson 04 "Population History from One Genome" (8 sections), lesson 05 "DNA Methylation from Long Reads" (7 sections)
  and lesson 06 "SINEs and Satellite DNA" (8 sections) published.
- All lessons: long words wrap instead of widening the page.

## 2026-10-31
- Licences: CC BY 4.0 for content, MIT for code; CITATION.cff.
- Lesson 02 "Genome Assembly" (13 sections) and lesson 03 "Repeats, Genes and ROH" (9 sections) published.
- Lesson sources moved into `src/` with one build script (`src/build.py`), a browser checker
  (`src/check.js`) and a section previewer (`src/preview.js`); each section keeps a `notes.md` with
  its sources.
- Previous/next lesson links and full breadcrumb on every lesson page.
- `docs/AUTHORING.md`: writing rules and the section file contract.
- Lesson 01: read coverage vs k-mer coverage (interactive), names analogy for the spectrum axes,
  N50/L50/Nx section with an interactive figure, redrawn k-mer/place/reads diagram.

## 2026-10-30
- Course site created; lesson 01 "Pre-Assembly Read Profiling".
