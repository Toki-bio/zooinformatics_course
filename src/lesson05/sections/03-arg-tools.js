(function(){
  /* ENGINE: exact toy posterior; 03-arg-tools.control.js loads this same text and checks it */
  // Four haplotypes a,b,c,d, one local tree, constant population, each mutation hits once (infinite sites).
  // Time unit = 2N generations. u4,u3,u2 = waiting times while 4, 3, 2 lineages remain (coalescent prior).
  var GENS = 20000;            // 2N, with N = 10,000 diploids
  var RATE = 2.5e-4;           // 2N * mu per base, with mu = 1.25e-8 per base per generation
  var RATES = [6, 3, 1];       // prior rates of u4, u3, u2
  var COEF = [4, 3, 2];        // lineages present during each interval
  var G = 56;                  // grid cells per axis (log spaced)
  var RANGE = [[1e-4, 3], [1e-4, 4], [1e-3, 12]];
  var NAMES = 'abcd';

  function rngFrom(seed){      // mulberry32
    var s = seed >>> 0;
    return function(){
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function expo(r, rate){ return -Math.log(1 - r()) / rate; }
  function poisson(r, m){
    if (m > 30){ var n = 0, t = expo(r, 1); while (t < m){ n++; t += expo(r, 1); } return n; }
    var L = Math.exp(-m), k = 0, p = 1;
    do { k++; p *= r(); } while (p > L);
    return k - 1;
  }

  // All 18 ranked histories of 4 lineages. Each branch = clade mask + which intervals it spans.
  function makeHistories(){
    var out = [];
    function branch(mask, from, to){ var c = [0, 0, 0]; for (var i = from; i < to; i++) c[i] = 1; return { mask: mask, c: c }; }
    for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++){
      var rest = [0, 1, 2, 3].filter(function(x){ return x !== i && x !== j; });
      var m1 = (1 << i) | (1 << j);
      var l3 = [{ m: m1, b: 1 }, { m: 1 << rest[0], b: 0 }, { m: 1 << rest[1], b: 0 }];
      for (var p = 0; p < 3; p++) for (var q = p + 1; q < 3; q++){
        var br = [branch(1 << i, 0, 1), branch(1 << j, 0, 1)];
        var m2 = l3[p].m | l3[q].m;
        br.push(branch(l3[p].m, l3[p].b, 2), branch(l3[q].m, l3[q].b, 2));
        var o = l3[3 - p - q];
        br.push(branch(o.m, o.b, 3), branch(m2, 2, 3));
        out.push({ branches: br, clades: [{ m: m1, lvl: 1 }, { m: m2, lvl: 2 }, { m: 15, lvl: 3 }] });
      }
    }
    out.forEach(function(h){
      h.topo = h.clades.map(function(c){ return c.m; }).sort(function(a, b){ return a - b; }).join(',');
    });
    return out;
  }
  var HIST = makeHistories();

  function grid(){
    var ax = [];
    for (var a = 0; a < 3; a++){
      var lo = Math.log(RANGE[a][0]), h = (Math.log(RANGE[a][1]) - lo) / G, u = new Float64Array(G), lw = new Float64Array(G);
      for (var i = 0; i < G; i++){
        u[i] = Math.exp(lo + (i + 0.5) * h);
        lw[i] = Math.log(RATES[a] * u[i] * h) - RATES[a] * u[i];   // prior density x cell width
      }
      ax.push({ u: u, lw: lw, h: h });
    }
    return ax;
  }
  var AX = grid();

  // Posterior over (history, u4, u3, u2) given pattern counts k[1..14] and stretch length L (bases).
  function posterior(k, L){
    var lam = RATE * L, list = [], maxl = -Infinity, total = 0;
    for (var m = 1; m < 15; m++) total += k[m];
    var pre = AX.map(function(a, ai){ return a.lw.map(function(lw, i){ return lw - lam * COEF[ai] * a.u[i]; }); });
    HIST.forEach(function(h, hi){
      var seen = 0, used = [];
      h.branches.forEach(function(b){ if (k[b.mask] > 0){ seen += k[b.mask]; used.push(b); } });
      if (seen !== total) return;                       // a pattern this tree cannot produce: likelihood 0
      var lg = new Float32Array(G * G * G), n = 0, nu = used.length;
      for (var i = 0; i < G; i++) for (var j = 0; j < G; j++){
        var base = pre[0][i] + pre[1][j];
        for (var l = 0; l < G; l++){
          var v = base + pre[2][l];
          for (var b = 0; b < nu; b++){
            var c = used[b].c;
            v += k[used[b].mask] * Math.log(c[0] * AX[0].u[i] + c[1] * AX[1].u[j] + c[2] * AX[2].u[l]);
          }
          lg[n++] = v;
          if (v > maxl) maxl = v;
        }
      }
      list.push({ hi: hi, lg: lg, Z: 0 });
    });
    var tot = 0;
    list.forEach(function(e){
      var z = 0, lg = e.lg;
      for (var n = 0; n < lg.length; n++) z += Math.exp(lg[n] - maxl);
      e.Z = z; tot += z;
    });
    var topo = {};
    list.forEach(function(e){ var t = HIST[e.hi].topo; topo[t] = (topo[t] || 0) + e.Z / tot; });
    return { list: list, maxl: maxl, tot: tot, topo: topo };
  }

  function jit(a, i, r){ return AX[a].u[i] * Math.exp((r() - 0.5) * AX[a].h); }

  // Draw n (history, u) pairs; if onlyTopo is given, draw from the posterior given that topology.
  function sample(post, n, r, onlyTopo){
    var use = post.list.filter(function(e){ return !onlyTopo || HIST[e.hi].topo === onlyTopo; });
    var tot = use.reduce(function(s, e){ return s + e.Z; }, 0), t = [];
    for (var i = 0; i < n; i++) t.push(r() * tot);
    t.sort(function(a, b){ return a - b; });
    var out = [], cum = 0, p = 0;
    use.forEach(function(e){
      if (p >= n) return;
      if (cum + e.Z < t[p]){ cum += e.Z; return; }
      var lg = e.lg, m = post.maxl, c0 = cum;
      for (var c = 0; c < lg.length && p < n; c++){
        cum += Math.exp(lg[c] - m);
        while (p < n && cum >= t[p]){
          var a = (c / (G * G)) | 0, b = ((c / G) | 0) % G, l = c % G;
          out.push({ hi: e.hi, u: [jit(0, a, r), jit(1, b, r), jit(2, l, r)] });
          p++;
        }
      }
      cum = c0 + e.Z;
    });
    while (out.length < n && out.length) out.push(out[out.length - 1]);  // rounding guard
    for (var x = out.length - 1; x > 0; x--){ var y = (r() * (x + 1)) | 0, s = out[x]; out[x] = out[y]; out[y] = s; }
    return out;
  }

  // Age (in generations) of each internal clade of a drawn tree.
  function heights(s){
    var t = [s.u[0], s.u[0] + s.u[1], s.u[0] + s.u[1] + s.u[2]], o = {};
    HIST[s.hi].clades.forEach(function(c){ o[c.m] = t[c.lvl - 1] * GENS; });
    return o;
  }
  function pairAge(hs, pair){
    var best = Infinity;
    for (var m in hs) if ((+m & pair) === pair && hs[m] < best) best = hs[m];
    return best;
  }
  function quantile(v, q){
    var s = v.slice().sort(function(a, b){ return a - b; }), x = q * (s.length - 1), i = Math.floor(x);
    return i + 1 < s.length ? s[i] + (x - i) * (s[i + 1] - s[i]) : s[i];
  }

  // A true tree, and every mutation it carries on a 30-kb stretch; shorter stretches keep the first ones.
  var LMAX = 30000;
  function simulate(seed){
    var r = rngFrom(seed), hi = (r() * HIST.length) | 0;
    var u = [expo(r, RATES[0]), expo(r, RATES[1]), expo(r, RATES[2])], muts = [];
    HIST[hi].branches.forEach(function(b){
      var len = b.c[0] * u[0] + b.c[1] * u[1] + b.c[2] * u[2], n = poisson(r, RATE * LMAX * len);
      for (var i = 0; i < n; i++) muts.push({ pos: r() * LMAX, mask: b.mask });
    });
    muts.sort(function(a, b){ return a.pos - b.pos; });
    return { hi: hi, u: u, muts: muts };
  }
  function counts(muts, L){
    var k = new Int32Array(16);
    muts.forEach(function(m){ if (m.pos < L) k[m.mask]++; });
    return k;
  }
  function newick(topo){
    var cl = topo.split(',').map(Number);
    function pop(x){ var n = 0; while (x){ n += x & 1; x >>= 1; } return n; }
    function kids(m){
      var inside = cl.filter(function(c){ return c !== m && (c & m) === c; }), out = [], left = m;
      inside.sort(function(a, b){ return pop(b) - pop(a); }).forEach(function(c){ if ((left & c) === c){ out.push(c); left ^= c; } });
      for (var i = 0; i < 4; i++) if (left & (1 << i)) out.push(1 << i);
      return out;
    }
    function str(m){
      if (pop(m) === 1) return NAMES[Math.log2(m)];
      var s = kids(m).map(str).sort(function(a, b){ return a.length - b.length || (a < b ? -1 : 1); });
      return '(' + s.join(',') + ')';
    }
    return str(15);
  }
  /* END ENGINE */

  var root = document.getElementById('s03-fig');
  if (!root) return;
  var NS = 'http://www.w3.org/2000/svg';
  var el = function(id){ return document.getElementById(id); };
  function mk(tag, attrs, txt){
    var e = document.createElementNS(NS, tag);
    for (var a in attrs) e.setAttribute(a, attrs[a]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  function fmt(x){
    var d = x >= 10000 ? 1000 : x >= 1000 ? 100 : 10;
    return (Math.round(x / d) * d).toLocaleString('en-US');
  }
  var NSAMP = 100, DEFAULT_SEED = 2;
  var st = { seed: DEFAULT_SEED, L: 3000, mode: 'full', pair: 10 };
  var cur = null, pending = false;

  var W = 960, H = 340, Y0 = 38, Y1 = 292, TMIN = 100, TMAX = 300000;
  function yOf(t){
    var v = Math.max(TMIN, Math.min(TMAX, t));
    return Y1 - (Math.log(v / TMIN) / Math.log(TMAX / TMIN)) * (Y1 - Y0);
  }
  var PANELS = [{ x: 96, w: 220 }, { x: 376, w: 220 }, { x: 656, w: 270 }];
  function leafX(p, i){ return p.x + (i + 0.5) * p.w / 4; }

  // Path of one tree in a panel. Haplotypes stay in the order a b c d, so conflicting trees visibly cross.
  function treePath(p, hs){
    var ms = Object.keys(hs).map(Number).sort(function(a, b){ return hs[a] - hs[b]; });
    var nodes = {}, d = '';
    for (var i = 0; i < 4; i++) nodes[1 << i] = { x: leafX(p, i), y: Y1 + 10 };
    var free = [1, 2, 4, 8];
    ms.forEach(function(m){
      var ch = free.filter(function(c){ return (c & m) === c; });
      var x = ch.reduce(function(s, c){ return s + nodes[c].x; }, 0) / ch.length, y = yOf(hs[m]);
      ch.forEach(function(c){ d += 'M' + nodes[c].x.toFixed(1) + ' ' + nodes[c].y.toFixed(1) + 'V' + y.toFixed(1) + 'H' + x.toFixed(1); });
      free = free.filter(function(c){ return ch.indexOf(c) < 0; }).concat([m]);
      nodes[m] = { x: x, y: y };
    });
    return d;
  }
  var COL = ['--accent', '--het', '--rep', '--bad'];

  function compute(){
    var k = counts(cur.muts, st.L), post = posterior(k, st.L);
    var order = Object.keys(post.topo).sort(function(a, b){ return post.topo[b] - post.topo[a]; });
    var r = rngFrom(st.seed * 7919 + 13);
    var best = order[0];
    var cond = sample(post, 400, r, best), mean = {};
    cond.forEach(function(s){ var h = heights(s); for (var m in h) mean[m] = (mean[m] || 0) + h[m] / cond.length; });
    var set = st.mode === 'full' ? sample(post, NSAMP, r) : sample(post, NSAMP, r, best);
    return { k: k, post: post, order: order, best: best, mean: mean, set: set };
  }

  function draw(res){
    var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img',
      'aria-label': 'Three panels of trees for four haplotypes on the same time axis: the true tree, the one best tree, and ' + NSAMP + ' sampled trees.' });
    svg.style.minWidth = '640px';
    [100, 1000, 10000, 100000].forEach(function(t){
      svg.appendChild(mk('line', { x1: 70, x2: W - 20, y1: yOf(t), y2: yOf(t), 'class': 'grid' }));
      svg.appendChild(mk('text', { x: 64, y: yOf(t) + 4, 'text-anchor': 'end' }, t.toLocaleString('en-US')));
    });
    svg.appendChild(mk('text', { x: 14, y: (Y0 + Y1) / 2, 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (Y0 + Y1) / 2 + ')' }, 'generations ago (log scale)'));
    var titles = ['True tree (only a toy knows it)', 'One best tree', st.mode === 'full' ? NSAMP + ' sampled trees and times' : NSAMP + ' sampled times, best tree fixed'];
    PANELS.forEach(function(p, i){
      svg.appendChild(mk('text', { x: p.x + p.w / 2, y: 20, 'text-anchor': 'middle', 'class': 'lab' }, titles[i]));
      for (var q = 0; q < 4; q++) svg.appendChild(mk('text', { x: leafX(p, q), y: Y1 + 26, 'text-anchor': 'middle', 'class': 'lab' }, NAMES[q]));
    });
    svg.appendChild(mk('path', { d: treePath(PANELS[0], heights({ hi: cur.hi, u: cur.u })), fill: 'none', stroke: 'var(--good)', 'stroke-width': 2.2 }));
    svg.appendChild(mk('path', { d: treePath(PANELS[1], res.mean), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2 }));
    res.set.forEach(function(s){
      var rank = res.order.indexOf(HIST[s.hi].topo);
      svg.appendChild(mk('path', { d: treePath(PANELS[2], heights(s)), fill: 'none', stroke: 'var(' + COL[Math.min(rank, 3)] + ')', 'stroke-width': 1.1, 'stroke-opacity': 0.3 }));
    });
    root.replaceChildren(svg);

    var lg = el('s03-legend'); lg.replaceChildren();
    function item(col, txt){
      var s = document.createElement('span'), i = document.createElement('i');
      i.style.background = 'var(' + col + ')';
      s.appendChild(i); s.appendChild(document.createTextNode(txt)); lg.appendChild(s);
    }
    var seen = {}, other = 0;
    res.set.forEach(function(s){ var t = HIST[s.hi].topo; seen[t] = (seen[t] || 0) + 1; });
    res.order.forEach(function(t, rank){
      if (!seen[t]) return;
      if (rank > 2) other += seen[t];
      else item(COL[rank], newick(t) + ': ' + seen[t] + ' of ' + NSAMP);
    });
    if (other) item(COL[3], 'other trees: ' + other + ' of ' + NSAMP);

    // SNP table: 1 = derived allele
    var box = el('s03-snps'); box.replaceChildren();
    var used = cur.muts.filter(function(m){ return m.pos < st.L && m.mask !== 15; });
    for (var q = 0; q < 4; q++){
      box.appendChild(document.createTextNode(NAMES[q] + '  '));
      used.forEach(function(m){
        if ((m.mask >> q) & 1){ var b = document.createElement('span'); b.className = 'h'; b.textContent = '1 '; box.appendChild(b); }
        else box.appendChild(document.createTextNode('0 '));
      });
      if (!used.length) box.appendChild(document.createTextNode('(no SNP in this stretch)'));
      if (q < 3) box.appendChild(document.createTextNode('\n'));
    }

    // readout
    var ages = res.set.map(function(s){ return pairAge(heights(s), st.pair); });
    var lo = quantile(ages, 0.05), hi = quantile(ages, 0.95);
    var pt = pairAge(res.mean, st.pair), truth = pairAge(heights({ hi: cur.hi, u: cur.u }), st.pair);
    var low = st.pair & -st.pair, name = NAMES[Math.log2(low)] + ' and ' + NAMES[Math.log2(st.pair - low)];
    var right = res.best === HIST[cur.hi].topo, inside = truth >= lo && truth <= hi;
    var out = el('s03-out'); out.replaceChildren();
    [['SNPs in this stretch', String(used.length)],
     ['Best tree', newick(res.best) + (right ? ' (right)' : ' (wrong)')],
     ['Share of the probability on the best tree', Math.round(100 * res.post.topo[res.best]) + ' %'],
     ['Common ancestor of ' + name + ', best tree', fmt(pt) + ' generations'],
     ['90 % interval from the set', fmt(lo) + ' to ' + fmt(hi)],
     ['True age', fmt(truth) + (inside ? ' (inside)' : ' (outside)')]
    ].forEach(function(p){
      var d = document.createElement('div'), b = document.createElement('b');
      b.textContent = p[1]; d.appendChild(document.createTextNode(p[0])); d.appendChild(b); out.appendChild(d);
    });
  }

  function refresh(){
    if (pending) return;
    pending = true;
    requestAnimationFrame(function(){ pending = false; draw(compute()); });
  }
  function newData(seed){
    st.seed = seed;
    cur = simulate(seed);
    refresh();
  }
  var sl = el('s03-L');
  sl.addEventListener('input', function(){
    st.L = Math.round(Math.pow(10, +sl.value));
    el('s03-L-o').textContent = (st.L / 1000).toFixed(st.L < 10000 ? 1 : 0) + ' kb';
    refresh();
  });
  function seg(id, cb){
    var g = el(id);
    g.addEventListener('click', function(e){
      var b = e.target.closest('button'); if (!b) return;
      Array.prototype.forEach.call(g.querySelectorAll('button'), function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      cb(b.getAttribute('data-v')); refresh();
    });
  }
  seg('s03-mode', function(v){ st.mode = v; });
  seg('s03-pair', function(v){ st.pair = +v; });
  el('s03-new').addEventListener('click', function(){ newData(st.seed + 1); });
  newData(DEFAULT_SEED);
})();
