// Code control for section 13. Run: node 13-dnds.control.js
// Runs the page's own engine (text between ENGINE-BEGIN and ENGINE-END) against numbers counted by hand
// (lecture examples, single codon sites) and exact Fisher P values written as fractions.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '13-dnds.js'), 'utf8');
const eng = src.slice(src.indexOf('// ENGINE-BEGIN'), src.indexOf('// ENGINE-END'));
const E = new Function(eng + '\nreturn {F,feq,fstr,aa,sitesOf,codonDiffs,countCodons,mkClassify,fisher,mkStats,CC_PRESETS,MK_PRESETS};')();
let fail = 0, n = 0;
function ok(cond, msg) { n++; if (!cond) { fail++; console.log('FAIL', msg); } else console.log('ok  ', msg); }
const fr = (x, a, b) => E.feq(x, E.F(a, b === undefined ? 1 : b));
const near = (x, y) => Math.abs(x - y) < 1e-12;

// 1 Example 1, human vs chimp
const e1 = E.countCodons(E.CC_PRESETS.ex1.s1, E.CC_PRESETS.ex1.s2);
ok(fr(e1.S, 4) && fr(e1.N, 8), 'example 1 sites: S ' + E.fstr(e1.S) + ', N ' + E.fstr(e1.N));
ok(fr(e1.Sd, 2) && fr(e1.Nd, 1), 'example 1 differences: Sd ' + E.fstr(e1.Sd) + ', Nd ' + E.fstr(e1.Nd));
ok(e1.dNv === 0.125 && e1.dSv === 0.5 && e1.omegaV === 0.25, 'example 1 dN ' + e1.dNv + ', dS ' + e1.dSv + ', omega ' + e1.omegaV);
ok(e1.rows.every(r => fr(r.S, 1)) && e1.rows.every(r => r.s1.map(E.fstr).join() === '0,0,1' && r.s2.map(E.fstr).join() === '0,0,1'),
  'example 1: every codon N N S in both sequences');
// 2 ASPM quiz
const e2 = E.countCodons(E.CC_PRESETS.aspm.s1, E.CC_PRESETS.aspm.s2);
ok(fr(e2.S, 5) && fr(e2.N, 10), 'ASPM sites: S ' + E.fstr(e2.S) + ', N ' + E.fstr(e2.N));
ok(fr(e2.Sd, 1) && fr(e2.Nd, 2), 'ASPM differences: Sd ' + E.fstr(e2.Sd) + ', Nd ' + E.fstr(e2.Nd));
ok(e2.omegaV === 1, 'ASPM omega ' + e2.omegaV + ' (dN ' + e2.dNv + ', dS ' + e2.dSv + ')');
const g = E.codonDiffs('GGC', 'CGT');
ok(fr(g.s, 1) && fr(g.n, 1) && g.paths.length === 2, 'ASPM codon 2 GGC->CGT: both paths 1 S + 1 N');
// 3 single codon sites
ok(fr(E.sitesOf('TTT')[2], 1, 3), 'TTT position 3 S = ' + E.fstr(E.sitesOf('TTT')[2]));
ok(fr(E.sitesOf('TTG')[0], 1, 3) && fr(E.sitesOf('TTG')[2], 1, 3), 'TTG position 1 S = ' + E.fstr(E.sitesOf('TTG')[0]) + ', position 3 S = ' + E.fstr(E.sitesOf('TTG')[2]));
ok(fr(E.sitesOf('CTT')[0], 0), 'CTT position 1 S = ' + E.fstr(E.sitesOf('CTT')[0]));
ok(fr(E.sitesOf('CTA')[0], 1, 3), 'CTA position 1 S = ' + E.fstr(E.sitesOf('CTA')[0]));
// 4 McDonald-Kreitman counting
const m1 = E.mkClassify(E.MK_PRESETS.lec.sp1, E.MK_PRESETS.lec.sp2);
ok(m1.A === 1 && m1.B === 1 && m1.C === 1 && m1.D === 2, `lecture MK alignment: A${m1.A} B${m1.B} C${m1.C} D${m1.D}`);
const m2 = E.mkClassify(E.MK_PRESETS.arsd.sp1, E.MK_PRESETS.arsd.sp2);
ok(m2.A === 1 && m2.B === 2 && m2.C === 2 && m2.D === 1, `arsD: A${m2.A} B${m2.B} C${m2.C} D${m2.D}`);
const pa = E.fisher(m2.A, m2.B, m2.C, m2.D);
ok(near(pa, 1), 'arsD Fisher P = ' + pa);
// 5 Fisher and alpha for the lecture genes
const T = E.MK_PRESETS;
const ps = E.fisher(T.senp1.A, T.senp1.B, T.senp1.C, T.senp1.D);
ok(near(ps, 37 / 462), 'SENP1 P = ' + ps + ' (37/462 = ' + 37 / 462 + ')');
const pc = E.fisher(T.cias1.A, T.cias1.B, T.cias1.C, T.cias1.D);
ok(near(pc, 1), 'CIAS1 P = ' + pc);
const pg = E.fisher(T.agt.A, T.agt.B, T.agt.C, T.agt.D);
ok(near(pg, 57 / 3060), 'AGT P = ' + pg + ' (57/3060 = ' + 57 / 3060 + ')');
const as = E.mkStats(T.senp1.A, T.senp1.B, T.senp1.C, T.senp1.D).alpha;
ok(near(as, 0.95), 'SENP1 alpha = ' + as);
const ag = E.mkStats(T.agt.A, T.agt.B, T.agt.C, T.agt.D).alpha;
ok(near(ag, -38), 'AGT alpha = ' + ag);
ok(E.mkStats(1, 2, 0, 3).alpha === null && E.mkStats(0, 2, 1, 3).ni === null, 'alpha undefined when A or C is 0');
console.log(fail ? `${fail} of ${n} checks FAILED` : `all ${n} checks passed`);
process.exitCode = fail ? 1 : 0;
