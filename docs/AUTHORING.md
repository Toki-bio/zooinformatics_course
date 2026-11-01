# Writing and changing lessons

## The rule that matters most

Everything technical (defaults, options, memory needs, algorithms, output files, thresholds) comes
from the tool's own current documentation (README, manual, wiki, paper) and, where the documentation
is vague, from its source code. Record each source (URL and version) in the section's `notes.md`.
If something cannot be verified, leave it out of the page or say plainly in the page that it is
unverified or our inference.

## Audience and style

- Zoologists with no bioinformatics background. Each lesson assumes the earlier ones; link back
  instead of repeating (`../01-pre-assembly/#gp`, `../02-assembly/#s10`).
- Plain English, short sentences. Explain every term at its first use in the lesson, with
  `<dfn>`, an inline explanation, or a hover tooltip:
  `<span class="tip" title="plain explanation">term</span>`. This includes text produced by
  JavaScript (readouts, verdicts).
- Latin binomials in `<i>…</i>`.
- Sequential, vertical structure; no decorative card grids.
- Every section has at least one interactive figure that teaches its core idea with a toy example,
  and at least one collapsed box:
  `<details class="simple"><summary>Simple explanation with examples: …</summary><div class="in">…</div></details>`.
- Commands as `<div class="code"><button type="button">copy</button><pre>…</pre></div>`
  (the copy button is wired up by the build).
- "In our projects" notes (`<div class="note">`) use only facts recorded in the lab's project logs.

## Section file contract

A lesson made of sections lives in `src/lessonNN/`:

- `lesson.json`: `title`, `eyebrow`, `intro` (paragraphs, HTML allowed), `steps`
  (`title`, `what`, `tools` per section, in order) and `footer`.
- `sections/NN-slug.html`: one `<section aria-labelledby="sNN">` whose first child is
  `<h2 id="sNN"><span class="n">NN</span>Title</h2>`. Use only the classes defined in the shared
  style (the `<style>` block of `src/lesson01/lesson01.html`).
- `sections/NN-slug.js`: one self-contained `(function(){ … })();`. No globals, no libraries.
  Every id starts with `sNN-`. Inline SVG with `viewBox`, `width="100%"` and a `min-width`, inside
  `<div class="svgbox">` so it scrolls on phones. Colours only through the CSS variables
  (`--accent --het --rep --err --bad --good --muted --fg --line --panel --code-bg --bg`), so dark
  mode works.
- `sections/NN-slug.css` (optional, small): every selector starts with `#sNN-wrap` or `.sNN-`.
- `sections/NN-slug.notes.md`: sources with versions, verified facts, open doubts.

Sections are joined in file-name order.

## Workflow

1. Edit the section files.
2. `node src/preview.js <lesson> <NN-slug>` and `node src/preview.js <lesson> <NN-slug> 420`; open
   the PNG and fix overlapping labels; click through the controls.
3. `npm run build` and `npm run check` (must print `ok` for every lesson at both widths).
4. Add a line to `CHANGELOG.md`; commit `src/` and the rebuilt `lessons/` together.

## Adding a lesson

1. Create `src/lessonNN/lesson.json` and `src/lessonNN/sections/`.
2. Add the lesson to `LESSONS` in `src/build.py` (this also updates the previous/next links).
3. Add a `<li class="lesson">` card to `index.html` and a row to the table in `README.md`.
4. Build, check, commit.
