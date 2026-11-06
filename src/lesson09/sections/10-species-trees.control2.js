// Control for the quartet and ABBA-BABA toys of section 10. Run: node 10-species-trees.control2.js [out.json]
// The optional file receives simulated block counts, for the outside check with scikit-allel.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '10-species-trees.js'), 'utf8');
const eng = src.slice(src.indexOf('// ENGINE-BEGIN'), src.indexOf('// ENGINE-END'));
const E = new Function(eng + '\nreturn { Q_TREES, qKey, qCounts, qScore, qSimGene, qBranch, localPP, qLength, dGenome, dGenealogy, dColumns, dStat, dJackknife, kkscRow, kkscVerdict, binomTail };')();
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let fail = 0;
function check(name, ok, info) { if (!ok) fail++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); }

// 1. Quartets, independently: path-length four-point test on each tree, no use of the page's arrangement tables.
function dist(T) {
  // tips on a caterpillar a-b / c / d-e: count edges between tips
  const d = {}, [[a, b], [e, f]] = T.p, c = T.c;
  const pos = {}; pos[a] = [0, 1]; pos[b] = [0, 1]; pos[c] = [1, 1]; pos[e] = [2, 1]; pos[f] = [2, 1];
  for (const u of [a, b, c, e, f]) for (const v of [a, b, c, e, f]) {
    if (u === v) continue;
    d[u + ',' + v] = pos[u][1] + pos[v][1] + Math.abs(pos[u][0] - pos[v][0]);
  }
  return d;
}
function fourPoint(T, w, x, y, z) {   // returns the pairing with the smallest sum of two distances
  const d = dist(T), s = [[d[w + ',' + x] + d[y + ',' + z], [w, x]], [d[w + ',' + y] + d[x + ',' + z], [w, y]], [d[w + ',' + z] + d[x + ',' + y], [w, z]]];
  s.sort((p, q) => p[0] - q[0]);
  if (s[0][0] === s[1][0]) throw new Error('unresolved');
  return s[0][1];
}
let mism = 0, tries = 0;
const r1 = rng(1);
for (let rep = 0; rep < 300; rep++) {
  const n = new Array(15).fill(0); for (let t = 0; t < 15; t++) n[t] = Math.floor(r1() * 6);
  const Q = E.qCounts(n);
  for (let t = 0; t < 15; t++) {
    // score of t by brute force: for each gene tree and each quartet, do the two trees agree?
    let s = 0;
    for (let g = 0; g < 15; g++) for (let x = 0; x < 5; x++) {
      const r = [0, 1, 2, 3, 4].filter(y => y !== x);
      const a = fourPoint(E.Q_TREES[t], ...r), b = fourPoint(E.Q_TREES[g], ...r);
      if (a[1] === b[1]) s += n[g];
    }
    tries++; if (s !== E.qScore(Q, t)) mism++;
  }
}
check('quartet score against brute-force four-point test', mism === 0, `${tries} tree scores, ${mism} differ`);

// 2. The numbers printed in Sayyari and Mirarab 2016: 40 % of genes, alternatives equal: 66.1, 93.0, 99.7 % at 50, 200, 500 genes.
for (const [n, want] of [[50, 0.661], [200, 0.930], [500, 0.997]]) {
  const pp = E.localPP([0.4 * n, 0.3 * n, 0.3 * n], 0.5)[0];
  check(`local PP, ${n} genes`, Math.abs(pp - want) < 0.0006, `${pp.toFixed(4)} against ${want}`);
}
const p3 = E.localPP([20, 20, 20], 0.5);
check('local PP with equal counts', Math.abs(p3[0] - 1 / 3) < 1e-9 && Math.abs(p3[0] + p3[1] + p3[2] - 1) < 1e-9, p3.map(v => v.toFixed(4)).join(' '));
check('branch length formula', Math.abs(E.qLength(42, 50) - 1.32914) < 1e-4 && Math.abs(E.qLength(712, 2000) - 0.03432) < 1e-5 && E.qLength(30, 100) === 0, 'two values printed by ASTRAL 5.7.8');

// 3. Gene tree shares: simulated quartet share against 1 - 2/3 exp(-d) for each quartet of the species tree.
const TRUTH = E.Q_TREES.findIndex(T => E.qKey(T) === 'AB|C|DE');
for (const br of [[0.05, 0.05, 1], [1, 1, 1], [0.3, 0.1, 0.5]]) {
  const r = rng(3), N = 2e6, n = new Array(15).fill(0);
  for (let i = 0; i < N; i++) n[E.qSimGene(br, r)]++;
  const Q = E.qCounts(n);
  // leaving out E or D: AB|C. with d = x; leaving out C: AB|DE with d = x + y; leaving out A or B: .C|DE with d = y
  const [x, y] = br, want = { 4: x, 3: x, 2: x + y, 1: y, 0: y };
  let worst = 0;
  for (const q in want) {
    const arr = [0, 1, 2].map(i => Q[q][i]), truth = Math.max(...arr) / N, exp = 1 - 2 / 3 * Math.exp(-want[q]);
    worst = Math.max(worst, Math.abs(truth - exp) / Math.sqrt(exp * (1 - exp) / N));
  }
  const top = n.indexOf(Math.max(...n));
  check(`quartet shares ${br}`, worst < 4, `largest |z| ${worst.toFixed(2)}; true tree ${(n[TRUTH] / N).toFixed(4)}, commonest ${E.qKey(E.Q_TREES[top])} ${(n[top] / N).toFixed(4)}`);
}
for (const genes of [30, 100, 300, 1000, 3000]) {
  const r = rng(4); let vote = 0, quart = 0, R = 1000;
  for (let rep = 0; rep < R; rep++) {
    const n = new Array(15).fill(0); for (let i = 0; i < genes; i++) n[E.qSimGene([0.05, 0.05, 1], r)]++;
    const Q = E.qCounts(n), sc = n.map((_, t) => E.qScore(Q, t));
    if (n.indexOf(Math.max(...n)) === TRUTH) vote++;
    if (sc.indexOf(Math.max(...sc)) === TRUTH) quart++;
  }
  console.log(`     anomaly preset, ${genes} genes: vote right ${(vote / R).toFixed(3)}, quartets right ${(quart / R).toFixed(3)}`);
}

// 4. D against the formula of Durand et al. 2011, in coalescent units, with few mutations so that repeat hits do not matter.
function durand(f, tg, t2, t3) { const dg = t3 - tg, d2 = t3 - t2; return 3 * f * dg / (3 * f * dg + 2 * (1 - f) * Math.exp(-d2) + 2 * f * Math.exp(-dg)); }
const base = { t12: 0.5, t123: 1, tO: 3, tg: 0.1, mu: 0.02, rate: 1, blocks: 20, per: 100, sites: 100, f: 0, moved: null };
for (const f of [0.02, 0.05, 0.1, 0.3]) {
  const M = Object.assign({}, base, { f, moved: { from: 2, to: 1 }, mu: 0.002, sites: 100, per: 200000, blocks: 1 });
  const r = rng(5), B = E.dGenome(M, r), D = E.dStat(B[0][0], B[0][1]), want = durand(f, 0.1, 0.5, 1), n = B[0][0] + B[0][1], se = Math.sqrt((1 - D * D) / n);
  check(`D formula f=${f}`, Math.abs(D - want) < Math.max(4 * se, 0.01), `simulated ${D.toFixed(4)}, Durand ${want.toFixed(4)}, ABBA+BABA ${n}`);
}

// 5. False alarms with no gene flow, and what each preset does, 400 genomes each.
const sets = { none: {}, 'P3 into P2': { f: 0.1, moved: { from: 2, to: 1 } }, 'P3 into P1': { f: 0.1, moved: { from: 2, to: 0 } }, 'P1 into P2': { f: 0.1, moved: { from: 0, to: 1 } }, 'P2 fast, no flow': { rate: 3, mu: 0.1 } };
const dump = {};
for (const k in sets) {
  const M = Object.assign({}, base, sets[k]), r = rng(6), R = 400; let j3 = 0, n3 = 0, sD = 0, sZ = 0;
  for (let g = 0; g < R; g++) { const B = E.dGenome(M, r), j = E.dJackknife(B); if (Math.abs(j.z) > 3) j3++; if (Math.abs(j.naive) > 3) n3++; sD += j.D; sZ += j.z; if (g === 0) dump[k] = B; }
  console.log(`     ${k.padEnd(18)} mean D ${(sD / R).toFixed(4)}, mean Z ${(sZ / R).toFixed(2)}, |Z| above 3: jackknife ${(j3 / R).toFixed(3)}, binomial ${(n3 / R).toFixed(3)}`);
  if (k === 'none') check('no gene flow: jackknife false alarms below 3 %', j3 / R < 0.03, (j3 / R).toFixed(3));
}
// 6. Fixed example of the jackknife by hand.
const jh = E.dJackknife([[10, 5, 0], [6, 7, 0], [8, 2, 0]]);
const loo = [(14 - 9) / 23, (18 - 7) / 25, (16 - 12) / 28], m = (loo[0] + loo[1] + loo[2]) / 3;
const se = Math.sqrt(2 / 3 * loo.reduce((s, v) => s + (v - m) * (v - m), 0));
check('jackknife by hand', Math.abs(jh.se - se) < 1e-12 && jh.ABBA === 24 && jh.BABA === 14 && Math.abs(jh.D - 10 / 38) < 1e-12, `se ${jh.se.toFixed(5)}`);
// 7. KKSC against the numbers printed in Kuritzin et al. 2016.
const near = (x, w, d) => Math.abs(x - w) < d;
check('KKSC 8:2:0 tree 0.0034', near(E.kkscRow([8, 2, 0], 0).tree, 0.0034, 0.00005), String(E.kkscRow([8, 2, 0], 0).tree));
check('KKSC 9:8:5, tree of the 9: 0.293', near(E.kkscRow([9, 8, 5], 0).tree, 0.293, 0.0005), String(E.kkscRow([9, 8, 5], 0).tree));
check('KKSC 9:8:5, 8 against 5: 0.5811', near(E.kkscRow([9, 8, 5], 0).sym, 0.5811, 0.00005), String(E.kkscRow([9, 8, 5], 0).sym));
check('KKSC 3:1:0 0.111', near(E.kkscRow([3, 1, 0], 0).tree, 0.111, 0.0005), String(E.kkscRow([3, 1, 0], 0).tree));
check('KKSC 3:0:0 below 0.05, 2:0:0 above', E.kkscRow([3, 0, 0], 0).tree < 0.05 && E.kkscRow([2, 0, 0], 0).tree > 0.05, String(E.kkscRow([3, 0, 0], 0).tree));
const car = E.kkscRow([192, 74, 60], 0);
check('KKSC 192:74:60 below 3.3e-21, 74:60 above 0.2', car.tree < 3.3e-21 && car.sym > 0.2, `${car.tree} ${car.sym}`);
check('KKSC 101:11:0 hybrid below 0.001', E.kkscRow([101, 11, 0], 0).sym < 0.001 && E.kkscVerdict([101, 11, 0]).kind === 'hybrid');
for (const y of [[8, 2, 0], [9, 8, 5], [25, 22, 21], [192, 74, 60], [101, 11, 0], [80, 20, 0], [3, 0, 0], [2, 0, 0], [5, 5, 0], [0, 0, 0]]) console.log('     ', y.join(':'), E.kkscVerdict(y).kind, JSON.stringify(E.kkscVerdict(y).r));
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(Object.keys(dump).map(k => ({ k, B: dump[k], ...E.dJackknife(dump[k]) }))));
console.log(fail ? 'CONTROL FAILED: ' + fail : 'CONTROL PASSED');
process.exit(fail ? 1 : 0);
