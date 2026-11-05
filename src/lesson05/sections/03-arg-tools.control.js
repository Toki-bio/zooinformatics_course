// Control for the toy in 03-arg-tools.js. Not part of the page.
//   node src/lesson_mg/sections/03-arg-tools.control.js [data sets per length]
// Loads the engine text from the shipped .js (between the ENGINE markers) and tests it against
// (1) a closed-form answer, (2) an independent Monte Carlo that shares no grid code,
// (3) calibration on data simulated from the same model.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '03-arg-tools.js'), 'utf8');
const body = src.slice(src.indexOf('/* ENGINE'), src.indexOf('/* END ENGINE */'));
const E = new Function(body + '\nreturn {HIST,AX,G,RATE,RATES,COEF,GENS,rngFrom,posterior,sample,heights,pairAge,quantile,simulate,counts,newick,expo,poisson};')();
const N = +(process.argv[2] || 1500);
let fail = 0;
function check(name, got, want, tol){
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fail++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + ': got ' + (+got).toFixed(4) + ', expected ' + (+want).toFixed(4) + ' (tolerance ' + tol.toFixed(4) + ')');
}
// 0 structure
check('ranked histories of 4 lineages', E.HIST.length, 18, 0);
check('rooted binary topologies', new Set(E.HIST.map(h => h.topo)).size, 15, 0);
{
  let bad = 0;
  E.HIST.forEach(h => { for (let a = 0; a < 3; a++) if (h.branches.reduce((s, b) => s + b.c[a], 0) !== E.COEF[a]) bad++; });
  check('lineages per interval correct in every history (mismatches)', bad, 0, 0);
}

// 1 closed form: no SNP. Posterior of u_k is exponential with rate r_k + k*lambda; histories stay equally likely.
for (const L of [500, 3000, 20000]){
  const lam = E.RATE * L, post = E.posterior(new Int32Array(16), L);
  const n = 40000, s = E.sample(post, n, E.rngFrom(5));
  for (let a = 0; a < 3; a++){
    const want = 1 / (E.RATES[a] + E.COEF[a] * lam), got = s.reduce((x, y) => x + y.u[a], 0) / n;
    check('no SNP, L=' + L + ', mean u' + (4 - a) + ' / closed form', got / want, 1, 0.02);
  }
  const bal = E.HIST.find(h => h.clades.some(c => c.m === 3) && h.clades.some(c => c.m === 12)).topo;
  check('no SNP, L=' + L + ', probability of ((a,b),(c,d))', post.topo[bal], 2 / 18, 0.002);
}

// 2 independent Monte Carlo: draw trees from the prior, weight by the Poisson likelihood. No grid involved.
function mc(k, L, draws, seed){
  const r = E.rngFrom(seed), lam = E.RATE * L, topo = {};
  let W = 0, age = 0;
  const pats = [];
  for (let m = 1; m < 15; m++) if (k[m]) pats.push(m);
  for (let d = 0; d < draws; d++){
    const hi = (r() * 18) | 0, h = E.HIST[hi], u = [E.expo(r, 6), E.expo(r, 3), E.expo(r, 1)];
    let lw = -lam * (4 * u[0] + 3 * u[1] + 2 * u[2]), ok = true;
    for (const m of pats){
      const b = h.branches.find(x => x.mask === m);
      if (!b){ ok = false; break; }
      lw += k[m] * Math.log(b.c[0] * u[0] + b.c[1] * u[1] + b.c[2] * u[2]);
    }
    if (!ok) continue;
    const w = Math.exp(lw), a = E.pairAge(E.heights({ hi, u }), 3);
    W += w; age += w * a;
    topo[h.topo] = (topo[h.topo] || 0) + w;
  }
  for (const t in topo) topo[t] /= W;
  return { topo, age: age / W };
}
const cases = [
  { name: '1 SNP on ab', k: { 3: 1 }, L: 1000 },
  { name: 'ab x3, c x1', k: { 3: 3, 4: 1 }, L: 3000 },
  { name: 'a x2, b x2, c x2, d x1', k: { 1: 2, 2: 2, 4: 2, 8: 1 }, L: 3000 },
  { name: 'ab x2, cd x2', k: { 3: 2, 12: 2 }, L: 5000 }];
for (const c of cases){
  const k = new Int32Array(16);
  for (const m in c.k) k[m] = c.k[m];
  const post = E.posterior(k, c.L), m = mc(k, c.L, 6e6, 11);
  let worst = 0;
  for (const t in m.topo) worst = Math.max(worst, Math.abs(m.topo[t] - (post.topo[t] || 0)));
  check('Monte Carlo vs grid, ' + c.name + ', largest topology difference', worst, 0, 0.012);
  const s = E.sample(post, 30000, E.rngFrom(3));
  const ga = s.reduce((x, y) => x + E.pairAge(E.heights(y), 3), 0) / s.length;
  check('Monte Carlo vs grid, ' + c.name + ', mean age of a-b, ratio', ga / m.age, 1, 0.03);
}

// 3 calibration on simulated data
for (const L of [1000, 3000, 10000]){
  let covFull = 0, covFixed = 0, bestRight = 0, meanSupport = 0, snps = 0, widthF = 0, widthX = 0;
  for (let i = 0; i < N; i++){
    const sim = E.simulate(Math.imul(100000 + i + L, 2654435761) >>> 0), k = E.counts(sim.muts.filter(m => m.mask !== 15), L), post = E.posterior(k, L);
    const best = Object.keys(post.topo).sort((a, b) => post.topo[b] - post.topo[a])[0];
    const r = E.rngFrom(i + 1), pair = 3;
    const truth = E.pairAge(E.heights({ hi: sim.hi, u: sim.u }), pair);
    const full = E.sample(post, 1000, r).map(s => E.pairAge(E.heights(s), pair));
    const fixed = E.sample(post, 1000, r, best).map(s => E.pairAge(E.heights(s), pair));
    const lo = E.quantile(full, .05), hi = E.quantile(full, .95), lo2 = E.quantile(fixed, .05), hi2 = E.quantile(fixed, .95);
    if (truth >= lo && truth <= hi) covFull++;
    if (truth >= lo2 && truth <= hi2) covFixed++;
    if (best === E.HIST[sim.hi].topo) bestRight++;
    meanSupport += post.topo[best];
    widthF += Math.log(hi / lo); widthX += Math.log(hi2 / lo2);
    for (let m = 1; m < 15; m++) snps += k[m];
  }
  const se = Math.sqrt(.9 * .1 / N);
  console.log('--- L=' + L + ', ' + N + ' data sets, mean SNPs ' + (snps / N).toFixed(1));
  check('L=' + L + ' 90 % interval coverage, trees and times sampled', covFull / N, .9, 3.5 * se);
  console.log('INFO L=' + L + ' 90 % interval coverage, best tree fixed: ' + (covFixed / N).toFixed(3) + ' (log width / full: ' + (widthX / widthF).toFixed(2) + ')');
  check('L=' + L + ' best tree right (frequency) vs mean posterior support', bestRight / N, meanSupport / N, 3.5 * Math.sqrt(.25 / N));
  console.log('INFO L=' + L + ' best tree is the true topology in ' + (bestRight / N).toFixed(3) + ' of data sets');
}
console.log(fail ? 'FAILED: ' + fail : 'ALL CONTROLS PASSED');
process.exit(fail ? 1 : 0);
