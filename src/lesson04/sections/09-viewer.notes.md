# s09 A viewer for your own PSMC and MSMC files: notes and sources (2026-11-19)

## Sources (URL, version, what was taken)
- utils/psmc_plot.pl, https://github.com/lh3/psmc (HEAD 82fa2ad, script version 0.2.0), source read 2026-11-19:
  - `skip` = value of `skip:` on the MM line x `-s` (default 100); a new data set starts at every `MM ... is_decoding:` line (this is how a
    concatenated main + bootstrap file is split into runs).
  - `N0 = theta0/skip / (4 * u)` with theta0 = 2nd field of the TR line of the stored round; per RS line
    x = `2 * N0 * (t_k + dt) * g`, y = `lambda_k * N0 / 10000` (the viewer does not divide by 10^4). `dt` comes from a DT line if present, else 0.
  - RS lines with interval index > `max_intv` are skipped unless `-L`; `max_intv` = last interval index whose parameter differs from the
    parameter of the last interval (from `parse_pattern`). For `4+25*2+4+6` this is 57. Reproduced by the "leave out the oldest PSMC group" box.
  - defaults `-n 20`, `-x 10000`, `-u 2.5e-8`, `-g 25`. The viewer deliberately uses the last RD block instead of round 20 and no x cut; both are stated on the page.
  - `-N` / `-M` false-negative-rate scaling is not implemented in the viewer; stated on the page.
- plot_utils.py, https://github.com/stschiff/msmc-tools (HEAD 4d1f05f), source read 2026-11-19: header line skipped, fields 1 and 2 are the left and right
  time boundaries, fields 3+ are lambdas; `popSizeStepPlot`: x = `t * gen / mu` on left boundaries, y = `(1.0 / l) / (2.0 * mu)`;
  `crossCoalPlot`: `2.0 * lambdas[1] / (lambdas[0] + lambdas[2])`.

## Verified
- The parser and both scalings were tested against hand-computed values (theta0 0.05, s 100, mu 2.5e-8, g 25: N0 5,000; t 1 -> 250,000 yr; lambda 2 -> 10,000.
  MSMC: left 1e-5, mu 1.25e-8, g 30 -> 24,000 yr; lambda 2000 -> 20,000; RCCR 2*500/(1000+3000) = 0.25).
- Numbers in the simple box: 0.08/(4*5.4e-9*100) = 37,037; 1e-5/5.4e-9 = 1,852; 1/(2*5.4e-9*2000) = 46,296; 3e-5/5.4e-9 = 5,556.

## Open doubts
- Tested only with synthetic files written in the PSMC and MSMC layouts (the toy files of the page), not yet with real output of each program version.
  MSMC (version 1) final files with more than three lambda columns are drawn column by column; that case is untested.
- The toy files are invented (smooth made-up lambda shapes, theta0 0.08); they are labelled as toys on the page.
