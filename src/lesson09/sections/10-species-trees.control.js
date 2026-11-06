// Code control for section 10. Run: node 10-species-trees.control.js
// Part 1 runs the page's own engine (text between ENGINE-BEGIN and ENGINE-END) against 1-(2/3)exp(-T).
// Part 2 does not use the engine: a brute-force Wright-Fisher run. Every line picks a random parent
//   among the 2N copies of its generation, with no rate formula and no "any pair is equally likely" rule.
// Part 3 simulates four species, (((A,B),C),D), for the numbers quoted in the anomaly-zone text.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '10-species-trees.js'), 'utf8');
const eng = src.slice(src.indexOf('// ENGINE-BEGIN'), src.indexOf('// ENGINE-END'));
const { simGene, expectedMatch } = new Function(eng + '\nreturn { simGene, expectedMatch };')();
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let fail = 0;
function report(name, share, exp, n) {
  const se = Math.sqrt(exp * (1 - exp) / n), z = se > 1e-9 ? (share - exp) / se : 0;
  if (Math.abs(z) > 3.5) fail++;
  console.log(name.padEnd(34), 'simulated', share.toFixed(5), 'expected', exp.toFixed(5), 'z', z.toFixed(2));
}
console.log('Part 1: page engine, 2,000,000 genes per row');
const rnd = rng(11);
for (const [t, N] of [[0, 1000], [1000, 10000], [10000, 10000], [20000, 20000], [10000, 5000], [20000, 5000], [100000, 20000], [100000, 1000]]) {
  const n = 2e6; let m = 0, wa = 0, wb = 0;
  for (let i = 0; i < n; i++) { const g = simGene(t, N, rnd); if (g.topo === 'AB') m++; else if (g.topo === 'AC') wa++; else wb++; }
  const T = t / (2 * N);
  report(`t=${t} N=${N} T=${T}`, m / n, expectedMatch(T), n);
  const wrong = wa + wb;
  if (wrong > 100) { const z = (wa - wrong / 2) / Math.sqrt(wrong / 4); if (Math.abs(z) > 3.5) fail++; console.log('   two wrong trees', wa, wb, 'z', z.toFixed(2)); }
}
console.log('Part 1b: repeat of T = 1 with five new seeds, 10,000,000 genes each');
for (const seed of [101, 202, 303, 404, 505]) {
  const r = rng(seed), n = 1e7; let m = 0;
  for (let i = 0; i < n; i++) if (simGene(10000, 5000, r).topo === 'AB') m++;
  report(`seed ${seed}`, m / n, expectedMatch(1), n);
}
console.log('Part 2: brute-force Wright-Fisher, 400,000 genes per row');
function wf(t, N, r) {
  const M = 2 * N;
  for (let g = 0; g < t; g++) { if (Math.floor(r() * M) === Math.floor(r() * M)) return 'AB'; }
  for (;;) {
    const a = Math.floor(r() * M), b = Math.floor(r() * M), c = Math.floor(r() * M);
    if (a === b && b === c) return 'tie';
    if (a === b) return 'AB';
    if (a === c) return 'AC';
    if (b === c) return 'BC';
  }
}
const r2 = rng(22);
for (const [t, N] of [[100, 100], [50, 100], [200, 100], [400, 200], [1000, 500]]) {
  const n = 4e5; let m = 0, tie = 0;
  for (let i = 0; i < n; i++) { const x = wf(t, N, r2); if (x === 'AB') m++; if (x === 'tie') tie++; }
  report(`WF t=${t} N=${N}`, m / (n - tie), expectedMatch(t / (2 * N)), n - tie);
}
console.log('Part 3: four species (((A,B),C),D), x = deeper branch, y = shallower branch, 8,000,000 genes per row');
function waitExp(r, k) { return -Math.log(1 - r()) / (k * (k - 1) / 2); }
function merge(L, r) {
  const i = Math.floor(r() * L.length); let j = Math.floor(r() * (L.length - 1)); if (j >= i) j++;
  const s = [L[i], L[j]].sort(), rest = L.filter((_, k) => k !== i && k !== j);
  rest.push('(' + s[0] + ',' + s[1] + ')');
  return rest;
}
function phase(L, len, r) { let t = 0; while (L.length > 1) { t += waitExp(r, L.length); if (t > len) break; L = merge(L, r); } return L; }
function sim4(x, y, r) { let L = phase(['A', 'B'], y, r); L = phase(L.concat('C'), x, r); L = phase(L.concat('D'), Infinity, r); return L[0]; }
function canon(s) { // sort the two children at every level so that each rooted tree has one spelling
  if (s.length === 1) return s;
  let depth = 0, cut = -1;
  for (let i = 1; i < s.length - 1; i++) { if (s[i] === '(') depth++; else if (s[i] === ')') depth--; else if (s[i] === ',' && depth === 0) { cut = i; break; } }
  return '(' + [canon(s.slice(1, cut)), canon(s.slice(cut + 1, -1))].sort((a, b) => (a.replace(/[(),]/g, '') < b.replace(/[(),]/g, '') ? -1 : 1)).join(',') + ')';
}
function split(s) { // unrooted split: the first cherry, named by the side that holds A
  const cherry = s.match(/\(([A-D]),([A-D])\)/)[0].replace(/[(),]/g, '');
  return cherry.includes('A') ? cherry : 'ABCD'.split('').filter(c => !cherry.includes(c)).join('');
}
const SP = '(((A,B),C),D)', SYM = '((A,B),(C,D))';
const r3 = rng(33);
for (const [x, y] of [[0.1, 0.1], [0.05, 0.05], [0.2655, 0.0], [1, 1]]) {
  const n = 8e6, c = {}, q = {};
  for (let i = 0; i < n; i++) { const s = canon(sim4(x, y, r3)); c[s] = (c[s] || 0) + 1; const u = split(s); q[u] = (q[u] || 0) + 1; }
  const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
  console.log(`x=${x} y=${y}: species tree ${(c[SP] / n).toFixed(4)}, symmetric ${(c[SYM] / n).toFixed(4)}, commonest ${top[0]} ${(top[1] / n).toFixed(4)}, distinct rooted trees ${Object.keys(c).length}`);
  // Unrooted, the tree has one internal branch, between the A,B node and the A,B,C node: length y. The root lies off it.
  report(`  quartet AB|CD, d=y=${y}`, q.AB / n, 1 - (2 / 3) * Math.exp(-y), n);
  console.log('   other quartets AC|BD', (q.AC / n).toFixed(4), 'AD|BC', (q.AD / n).toFixed(4));
}
console.log(fail ? 'CONTROL FAILED: ' + fail : 'CONTROL PASSED');
process.exit(fail ? 1 : 0);
