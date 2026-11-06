// Code control for section 12. Run: node 12-workbench.control.js [iqtree-binary]
// Tests the page's own engine (text between ENGINE-BEGIN and ENGINE-END) against outside answers:
//  1 tree counts and rearrangements  2 Fitch against brute force  3 pruning on the drawn tree against
//  the direct formula; NJ on additive distances  4 ln L on all 15 trees against IQ-TREE on fixed trees
//  5 SH-aLRT against IQ-TREE -alrt  6 MCMC tree probabilities against importance sampling from the prior
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, '12-workbench.js'), 'utf8');
const eng = src.slice(src.indexOf('// ENGINE-BEGIN'), src.indexOf('// ENGINE-END'));
const E = new Function(eng + '\nreturn {TIPS,TREES,TREE_INDEX,treeKey,newick,rng,columns,patterns,patWeights,distances,upgma,nj,nodeToTree,rootOnE,fitchNode,parsimonyTable,siteLik,logLik,pruneNode,mlAll,optimise,resample,replicate,shSetup,shReplicate,mcmcInit,mcmcStep,lnPrior,PRIOR_MEAN,dot,nniOf,splitsOf,STARTS,bestSet,higher};')();
const iq = process.argv[2];
let fail = 0; const bad = m => { fail++; console.log('FAIL', m); };
function randAln(r, n, bias) {
  const root = Array.from({ length: n }, () => Math.floor(r() * 4));
  return E.TIPS.map(() => root.map(b => 'ACGT'[r() < bias ? Math.floor(r() * 4) : b]).join(''));
}
const r = E.rng(7);
// 1
if (E.TREES.length !== 15 || new Set(E.TREES.map(E.treeKey)).size !== 15) bad('15 trees');
console.log('1 trees', E.TREES.length, 'distinct', new Set(E.TREES.map(E.treeKey)).size);
for (const T of E.TREES) {
  const bl = [1, 2, 3, 4, 5, 6, 7]; const ks = new Set();
  for (const side of [0, 1]) for (const a of E.nniOf(T, bl, side)) {
    ks.add(E.treeKey(a.T));
    for (let i = 0; i < 5; i++) if (a.bl[i] !== bl[i]) bad('nni tip branch moved');
    const shared = E.splitsOf(T).filter(s => E.splitsOf(a.T).includes(s));
    if (shared.length !== 1) bad('nni shares ' + shared.length);
    const at = (TT, s) => E.splitsOf(TT).indexOf(s);
    if (bl[5 + at(T, shared[0])] !== a.bl[5 + at(a.T, shared[0])]) bad('kept split lost its length');
    let back = false;
    for (const s2 of [0, 1]) for (const b of E.nniOf(a.T, a.bl, s2)) if (E.treeKey(b.T) === E.treeKey(T) && b.bl.join() === bl.join()) back = true;
    if (!back) bad('nni not reversible');
  }
  if (ks.size !== 4 || ks.has(E.treeKey(T))) bad('nni neighbours ' + ks.size);
}
console.log('1b NNI: four neighbours per tree, reversible, lengths carried');
// 2
let c2 = 0;
function brute(root, col) {
  const inner = []; (function w(n) { if (n.kids) { inner.push(n); n.kids.forEach(w); } })(root);
  let best = 99; const nI = inner.length;
  for (let a = 0; a < 4 ** nI; a++) {
    const st = new Map(); let x = a; inner.forEach(n => { st.set(n, x % 4); x = Math.floor(x / 4); });
    let ch = 0; (function w(n) { if (!n.kids) return; n.kids.forEach(k => { const s = k.kids ? st.get(k) : col[k.tips[0]]; if (s !== st.get(n)) ch++; w(k); }); })(root);
    if (ch < best) best = ch;
  }
  return best;
}
for (const T of E.TREES) { const root = E.rootOnE(T, [1, 1, 1, 1, 1, 1, 1]); for (let i = 0; i < 200; i++) { const col = [0, 0, 0, 0, 0].map(() => Math.floor(r() * 4)); c2++; if (E.fitchNode(root, col).steps !== brute(root, col)) bad('fitch'); } }
console.log('2 Fitch vs brute force', c2, 'cases');
// 3
let worst = 0;
for (const T of E.TREES) for (let i = 0; i < 50; i++) {
  const bl = Array.from({ length: 7 }, () => 0.01 + r()); const col = [0, 0, 0, 0, 0].map(() => Math.floor(r() * 4));
  const root = E.rootOnE(T, bl); const v = E.pruneNode(root, col); const L = v.reduce((a, b) => a + b, 0) / 4;
  worst = Math.max(worst, Math.abs(Math.log(L) - Math.log(E.siteLik(col, T, bl))));
  const back = E.nodeToTree(root); if (E.treeKey(back.T) !== E.treeKey(T)) bad('nodeToTree key');
  back.bl.forEach((x, k) => { if (Math.abs(x - bl[k]) > 1e-9) bad('nodeToTree bl ' + k); });
}
if (worst > 1e-9) bad('pruning'); console.log('3 pruning vs formula, worst ln difference', worst);
let ok3 = 0;
for (const T of E.TREES) for (let i = 0; i < 20; i++) {
  const bl = Array.from({ length: 7 }, () => 0.05 + r()); const D = [];
  const root = E.rootOnE(T, bl), dep = {}, anc = {}, depth = new Map();
  (function w(n, d, p) { depth.set(n, d); if (!n.kids) { dep[n.tips[0]] = d; anc[n.tips[0]] = p; } else n.kids.forEach(k => w(k, d + k.len, p.concat([n]))); })(root, 0, []);
  for (let a = 0; a < 5; a++) { D.push([]); for (let b = 0; b < 5; b++) { let m = 0; for (let q = 0; q < Math.min(anc[a].length, anc[b].length); q++) if (anc[a][q] === anc[b][q]) m = depth.get(anc[a][q]); D[a].push(a === b ? 0 : dep[a] + dep[b] - 2 * m); } }
  const t = E.nodeToTree(E.nj(D).root);
  if (E.treeKey(t.T) !== E.treeKey(T)) bad('NJ additive'); else ok3++;
  t.bl.forEach((x, k) => { if (Math.abs(x - bl[k]) > 1e-9) bad('NJ length'); });
}
console.log('3b NJ recovers tree and all lengths from additive distances:', ok3, 'of 300');
if (!iq) console.log('no iqtree given: parts 4-5 skipped');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wb'));
function phy(aln, p) { fs.writeFileSync(p, ` 5 ${aln[0].length}\n` + aln.map((s, i) => E.TIPS[i] + '  ' + s).join('\n') + '\n'); }
function run(args) { return cp.spawnSync(iq, args, { cwd: tmp, encoding: 'utf8' }); }
if (iq) {
  let w4 = 0, w4b = 0, n4 = 0;
  for (let a = 0; a < 6; a++) {
    const aln = randAln(r, 20, 0.08 + 0.05 * a), P = E.patterns(E.columns(aln)), ml = E.mlAll(P);
    const f = path.join(tmp, `a${a}.phy`); phy(aln, f);
    for (let t = 0; t < 15; t++) {
      const tf = path.join(tmp, `t${a}_${t}.nwk`); fs.writeFileSync(tf, E.newick(E.TREES[t]) + ';\n');
      run(['-s', f, '-m', 'JC', '-te', tf, '-pre', `o${a}_${t}`, '-redo', '-quiet', '-nt', '1', '-eps', '0.000001']);
      const rep = fs.readFileSync(path.join(tmp, `o${a}_${t}.iqtree`), 'utf8');
      const v = +rep.match(/Log-likelihood of the tree: (-[\d.]+)/)[1];
      w4 = Math.max(w4, v - ml[t].lnL); w4b = Math.max(w4b, ml[t].lnL - v); n4++;
    }
  }
  console.log('4 lnL vs IQ-TREE', n4, 'fixed trees: IQ-TREE higher by at most', w4.toFixed(5), ', mine higher by at most', w4b.toFixed(5));
  if (w4 > 0.002 || w4b > 0.02) bad('lnL vs IQ-TREE');
  for (let a = 0; a < 12; a++) {
    const aln = randAln(r, 20, 0.1 + 0.04 * a), P = E.patterns(E.columns(aln)), ml = E.mlAll(P);
    const best = ml.slice().sort((x, y) => y.lnL - x.lnL)[0];
    const f = path.join(tmp, `s${a}.phy`); phy(aln, f);
    const tf = path.join(tmp, `s${a}.nwk`); fs.writeFileSync(tf, E.newick(best.T) + ';\n');
    run(['-s', f, '-m', 'JC', '-te', tf, '-alrt', '10000', '-pre', `sh${a}`, '-redo', '-quiet', '-nt', '1', '-seed', '5', '-eps', '0.000001', '-nni-eval', '30']);
    const nw = fs.readFileSync(path.join(tmp, `sh${a}.treefile`), 'utf8').trim();
    const rs = E.rng(100 + a), mine = {};
    for (const side of [0, 1]) { const S = E.shSetup(P, best, side); let c = 0; for (let i = 0; i < 10000; i++) { if (E.shReplicate(S, E.resample(20, rs)).pass) c++; } mine[S.split] = c / 100; }
    const lnIq = +fs.readFileSync(path.join(tmp, `sh${a}.iqtree`), 'utf8').match(/Log-likelihood of the tree: (-[\d.]+)/)[1];
    if (Math.abs(best.lnL - lnIq) < 0.002) for (const k of Object.keys(mine)) { const m = nw.match(new RegExp('\\(' + k[0] + ':[^,()]*,' + k[1] + ':[^()]*\\)([\\d.]+):')); if (m && Math.abs(+m[1] - mine[k]) > 2.5) bad('SH-aLRT ' + k + ' ' + mine[k] + ' vs ' + m[1]); }
    console.log('5', E.newick(best.T), best.lnL.toFixed(4), lnIq, 'mine', JSON.stringify(mine), 'iqtree', nw.replace(/:[\d.e-]+/g, ''));
  }
}
// 6
{
  const aln = ['ACGTTGCAACGTAGGTCCAA', 'ACGTTGCAACGTAGCTCCAA', 'ACGATGCTACGAAGGTCGAA', 'ACGATGCTACCAAGGTCGTA', 'TCGATCCTGCGAATGTCGTC'];
  const P = E.patterns(E.columns(aln)), pw = E.patWeights(P, null), rs = E.rng(3);
  const N = 300000, sum = new Array(15).fill(0);
  E.TREES.forEach((T, t) => {
    let m = -Infinity; const ls = new Float64Array(N);
    for (let i = 0; i < N; i++) { const bl = Array.from({ length: 7 }, () => -E.PRIOR_MEAN * Math.log(1 - rs())); ls[i] = E.logLik(P, pw, T, bl); if (ls[i] > m) m = ls[i]; }
    let s = 0; for (let i = 0; i < N; i++) s += Math.exp(ls[i] - m); sum[t] = Math.log(s / N) + m;
  });
  const mx = Math.max(...sum), w = sum.map(x => Math.exp(x - mx)), tot = w.reduce((a, b) => a + b), post = w.map(x => x / tot);
  const S = E.mcmcInit(P, 0, rs), cnt = new Array(15).fill(0), G = 3000000, B = 300000;
  for (let g = 0; g < G; g++) { E.mcmcStep(P, S, rs); if (g >= B) cnt[E.TREE_INDEX[E.treeKey(S.T)]]++; }
  let wd = 0; E.TREES.forEach((T, t) => { const q = cnt[t] / (G - B); wd = Math.max(wd, Math.abs(q - post[t])); if (post[t] > 0.005 || q > 0.005) console.log('6', E.treeKey(T).padEnd(10), 'MCMC', q.toFixed(4), 'integral', post[t].toFixed(4)); });
  console.log('6 largest difference', wd.toFixed(4), 'acceptance', (S.acc / S.gen).toFixed(3));
  if (wd > 0.01) bad('MCMC vs integral');
}
// 7 the presets do what their notes claim, and the quick ML bootstrap picks the same trees as a full fit
{
  const presets = {}; for (const m of src.matchAll(/id: '(\w+)', name: '[^']*', aln: (\[[^\]]*\])/g)) presets[m[1]] = JSON.parse(m[2].replace(/'/g, '"'));
  const T = 'AB|E|CD', res = {};
  for (const [id, aln] of Object.entries(presets)) {
    const cols = E.columns(aln), P = E.patterns(cols), D = E.distances(cols, 'jc').D, ml = E.mlAll(P), pw = E.patWeights(P, null);
    const st = E.parsimonyTable(P), sc = st.map(q => E.dot(q, pw)), mn = Math.min(...sc);
    const best = ml.slice().sort((a, b) => b.lnL - a.lnL)[0];
    res[id] = { u: E.treeKey(E.nodeToTree(E.upgma(D).root).T), n: E.treeKey(E.nodeToTree(E.nj(D).root).T), p: sc.map((v, i) => v === mn ? E.treeKey(E.TREES[i]) : 0).filter(Boolean), m: E.treeKey(best.T) };
    console.log('7', id, JSON.stringify(res[id]));
    const ctx = { cols, P, steps: st, ml, dist: 'jc' }, rs = E.rng(9), N = 200; let same = 0;
    for (let b = 0; b < N; b++) {
      const w = E.resample(20, rs), quick = E.replicate('ml', ctx, w, rs), pw2 = E.patWeights(P, w);
      const full = E.bestSet(E.TREES.map(Tt => Math.max(...E.STARTS.map(s => E.optimise(P, pw2, Tt, s, 300).lnL))), E.higher);
      if (quick.some(q => full.includes(q))) same++;
    }
    console.log('7b', id, 'quick ML bootstrap agrees with full refit on', same, 'of', N);
    if (same < N * 0.97) bad('quick ML bootstrap ' + id);
  }
  const c = res.clean, u = res.unequal, l = res.long;
  if (c.u !== T || c.n !== T || c.p.join() !== T || c.m !== T) bad('clean preset');
  if (u.u === T || u.n !== T || u.p.join() !== T || u.m !== T) bad('unequal preset');
  if (l.p.join() === T || !/AC/.test(l.p.join()) || l.m !== T || l.n !== T) bad('long preset');
}
console.log(fail ? 'FAILED ' + fail : 'ALL OK');
process.exit(fail ? 1 : 0);
