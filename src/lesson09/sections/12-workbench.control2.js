// Control for "Comparing whole trees" in section 12. Run: node 12-workbench.control2.js
// No IQ-TREE run: these are properties that the method must have, plus a normal approximation computed separately.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '12-workbench.js'), 'utf8');
const eng = src.slice(src.indexOf('// ENGINE-BEGIN'), src.indexOf('// ENGINE-END'));
const E = new Function(eng + '\nreturn { treeTests, normCdf, normInv, auFit, rng, AU_SCALES };')();
let fail = 0;
function check(n, ok, info) { if (!ok) fail++; console.log((ok ? 'ok   ' : 'FAIL ') + n + (info ? '  ' + info : '')); }
check('normal cdf', Math.abs(E.normCdf(1.96) - 0.975) < 1e-4 && Math.abs(E.normCdf(0) - 0.5) < 1e-8);
check('normal inverse', Math.abs(E.normInv(0.975) - 1.96) < 1e-3);
// Fake per-column ln L of trees, 200 columns.
function sites(T, n, seed, shift) {
  const r = E.rng(seed), base = Array.from({ length: n }, () => -2 - r());
  return Array.from({ length: T }, (_, t) => base.map(v => v + (r() - 0.5) * 0.8 - (t ? shift : 0) / n));
}
// 1. With two trees SH and KH are the same test.
let worst = 0;
for (let s = 1; s <= 20; s++) {
  const o = E.treeTests(sites(2, 200, s, 4), 2000, E.rng(s));
  worst = Math.max(worst, Math.abs(o[1].kh - o[1].sh));
}
check('two trees: p-KH equals p-SH', worst === 0, 'largest difference ' + worst);
// 2. KH against the normal approximation from the per-column differences.
worst = 0; let compared = 0;
for (let s = 1; s <= 20; s++) {
  const S = sites(2, 200, s, 6), n = 200, d = S[0].map((v, i) => v - S[1][i]), m = d.reduce((a, b) => a + b) / n;
  const sd = Math.sqrt(n * d.reduce((a, b) => a + (b - m) * (b - m), 0) / (n - 1)), delta = n * m;
  if (delta <= 0) continue;
  compared++;
  const o = E.treeTests(S, 4000, E.rng(s + 100));
  worst = Math.max(worst, Math.abs(o[1].kh - (1 - E.normCdf(delta / sd))));
}
check('KH near the normal approximation', worst < 0.03 && compared >= 10, `largest difference ${worst.toFixed(4)} over ${compared} data sets`);
// 3. SH is never below KH; bp sums to 1; all p within 0 and 1.
let okp = true, okb = true;
for (let s = 1; s <= 10; s++) {
  const o = E.treeTests(sites(15, 200, s, 5), 1000, E.rng(s));
  o.forEach(x => { if (x.sh < x.kh - 1e-12 || x.au < 0 || x.au > 1 || x.kh < 0 || x.sh > 1) okp = false; });
  if (Math.abs(o.reduce((a, x) => a + x.bp, 0) - 1) > 1e-9) okb = false;
}
check('SH never below KH, p within limits', okp);
check('share of draws sums to 1', okb);
// 4. AU fit recovers a known curve: z = d sqrt(r) + c / sqrt(r).
const d0 = 1.2, c0 = 0.4, bp = E.AU_SCALES.map(r => 1 - E.normCdf(d0 * Math.sqrt(r) + c0 / Math.sqrt(r)));
const au = E.auFit(bp, 10000).p;
check('AU fit on an exact curve', Math.abs(au - (1 - E.normCdf(d0 - c0))) < 1e-3, `${au.toFixed(5)} against ${(1 - E.normCdf(d0 - c0)).toFixed(5)}`);
// 5. Two trees far apart in fit: the worse tree is rejected by all three.
const far = E.treeTests(sites(2, 200, 3, 60), 2000, E.rng(4));
check('clearly worse tree rejected by all three', far[1].kh < 0.05 && far[1].sh < 0.05 && far[1].au < 0.05, JSON.stringify(far[1]));
console.log(fail ? 'CONTROL FAILED: ' + fail : 'CONTROL PASSED');
process.exit(fail ? 1 : 0);
