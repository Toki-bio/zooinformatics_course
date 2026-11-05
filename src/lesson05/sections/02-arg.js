(function(){
  var fig = document.getElementById('s02-fig');
  if (!fig) return;

  //CORE>  simulation and tree reading; the section's control runs exactly this block outside the page
  var NH = 6, LEN = 100000, SPLIT = 1500;
  var MODELS = {
    large: { N: 1000 },
    small: { N: 250 },
    two:   { N: 1000, split: SPLIT }
  };
  function rng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // Hudson's coalescent with recombination, backwards in time, continuous positions.
  // A lineage is a list of segments {l, r, node, c}: stretches of ancestral sequence, c = samples below.
  function simulate(p){
    var R = rng(p.seed), m = MODELS[p.model], r = p.r, nodes = [], edges = [], recomb = [], lin = [], t = 0, i;
    for (i = 0; i < NH; i++){
      nodes.push({ id: i, time: 0 });
      lin.push({ pop: (m.split && i >= NH / 2) ? 1 : 0, segs: [{ l: 0, r: LEN, node: i, c: 1 }] });
    }
    var joined = !m.split;
    function span(a){ return a.segs[a.segs.length - 1].r - a.segs[0].l; }
    function covering(a, u, v){ for (var k = 0; k < a.segs.length; k++){ var s = a.segs[k]; if (s.l <= u && s.r >= v) return s; } return null; }
    function merge(a, b){
      var pts = {}, out = [], id = -1;
      a.segs.concat(b.segs).forEach(function(s){ pts[s.l] = s.l; pts[s.r] = s.r; });
      var xs = Object.keys(pts).map(function(k){ return pts[k]; }).sort(function(x, y){ return x - y; });
      for (var k = 0; k + 1 < xs.length; k++){
        var u = xs[k], v = xs[k + 1], sa = covering(a, u, v), sb = covering(b, u, v);
        if (sa && sb){
          if (id < 0){ id = nodes.length; nodes.push({ id: id, time: t }); }
          edges.push({ left: u, right: v, parent: id, child: sa.node });
          edges.push({ left: u, right: v, parent: id, child: sb.node });
          if (sa.c + sb.c < NH) out.push({ l: u, r: v, node: id, c: sa.c + sb.c });
        } else if (sa || sb){ var s = sa || sb; out.push({ l: u, r: v, node: s.node, c: s.c }); }
      }
      var res = [];
      out.forEach(function(s){ var q = res[res.length - 1];
        if (q && q.node === s.node && q.c === s.c && q.r === s.l) q.r = s.r; else res.push(s); });
      return res;
    }
    while (lin.length){
      var pops = [[], []], rec = 0, co = [0, 0];
      lin.forEach(function(a){ rec += r * span(a); pops[a.pop].push(a); });
      for (i = 0; i < 2; i++) co[i] = pops[i].length * (pops[i].length - 1) / 2 / (2 * m.N);
      var tot = rec + co[0] + co[1], dt = tot > 0 ? -Math.log(1 - R()) / tot : Infinity;
      if (!joined && t + dt >= m.split){
        t = m.split; joined = true; lin.forEach(function(a){ a.pop = 0; }); continue;
      }
      t += dt;
      var e = R() * tot;
      if (e < rec){
        var acc = 0, j = 0;
        for (j = 0; j < lin.length; j++){ acc += r * span(lin[j]); if (e < acc) break; }
        if (j === lin.length) j = lin.length - 1;
        var a = lin[j], x = a.segs[0].l + R() * span(a), L = [], Q = [];
        a.segs.forEach(function(s){
          if (s.r <= x) L.push(s); else if (s.l >= x) Q.push(s);
          else { L.push({ l: s.l, r: x, node: s.node, c: s.c }); Q.push({ l: x, r: s.r, node: s.node, c: s.c }); }
        });
        a.segs = L; lin.push({ pop: a.pop, segs: Q }); recomb.push(x);
      } else {
        var g = pops[(e - rec) < co[0] ? 0 : 1], ia = Math.floor(R() * g.length), ib = Math.floor(R() * (g.length - 1));
        if (ib >= ia) ib++;
        var A = g[ia], B = g[ib], res = merge(A, B);
        lin.splice(lin.indexOf(B), 1);
        if (res.length) A.segs = res; else lin.splice(lin.indexOf(A), 1);
      }
    }
    // squash touching rows of the same branch: one row per branch per stretch
    edges.sort(function(x, y){ return x.parent - y.parent || x.child - y.child || x.left - y.left; });
    var sq = [];
    edges.forEach(function(d){ var q = sq[sq.length - 1];
      if (q && q.parent === d.parent && q.child === d.child && q.right === d.left) q.right = d.right;
      else sq.push({ left: d.left, right: d.right, parent: d.parent, child: d.child }); });
    return { nodes: nodes, edges: sq, recomb: recomb.sort(function(x, y){ return x - y; }), model: p.model };
  }

  // Local trees are read from the edge table only: at each position keep the rows that cover it.
  function treesOf(h){
    var pts = {}; h.edges.forEach(function(d){ pts[d.left] = d.left; pts[d.right] = d.right; });
    var xs = Object.keys(pts).map(function(k){ return pts[k]; }).sort(function(a, b){ return a - b; }), out = [];
    for (var i = 0; i + 1 < xs.length; i++){
      var par = {};
      h.edges.forEach(function(d){ if (d.left <= xs[i] && d.right >= xs[i + 1]) par[d.child] = d.parent; });
      out.push(describe(h, { left: xs[i], right: xs[i + 1], parent: par }));
    }
    return out;
  }
  function describe(h, t){
    var kids = {}, mask = {}, ids = {};
    Object.keys(t.parent).forEach(function(c){ c = +c; var p = t.parent[c]; (kids[p] = kids[p] || []).push(c); ids[c] = 1; ids[p] = 1; });
    var root = -1;
    Object.keys(ids).forEach(function(v){ if (!(v in t.parent)) root = +v; });
    (function fill(v){ var k = kids[v]; if (!k){ mask[v] = 1 << v; return mask[v]; }
      var s = 0; k.forEach(function(c){ s |= fill(c); }); mask[v] = s; return s; })(root);
    t.kids = kids; t.mask = mask; t.root = root; t.height = h.nodes[root].time;
    return t;
  }
  function pairAge(h, t, a, b){
    var seen = {}, v = a;
    while (v !== undefined){ seen[v] = 1; v = t.parent[v]; }
    v = b; while (!seen[v]) v = t.parent[v];
    return h.nodes[v].time;
  }
  function clades(t){ var s = {}; Object.keys(t.kids).forEach(function(v){ s[t.mask[v]] = 1; }); return Object.keys(s).sort().join(','); }
  function bits(m){ var c = 0; while (m){ c += m & 1; m >>>= 1; } return c; }
  // Which branch moved between two neighbouring trees: the smallest clade S, present in both, such that
  // removing S (and the node it hung from) leaves exactly the same tree with the same node ages.
  function reduced(h, t, s, v){
    var p = t.parent[v], items = [];
    Object.keys(t.kids).forEach(function(u){ u = +u; if (u === p) return;
      var m = t.mask[u], inside = (m & ~s) === 0;
      items.push((inside ? 'i' + m : 'o' + (m & ~s)) + ':' + h.nodes[u].time); });
    return items.sort().join('|');
  }
  function nodeOf(t, s){ var r = -1; Object.keys(t.mask).forEach(function(v){ if (t.mask[v] === s) r = +v; }); return r; }
  function moved(h, A, B){
    var full = A.mask[A.root], best = null;
    Object.keys(A.mask).forEach(function(v){ v = +v; var s = A.mask[v]; if (s === full) return;
      var w = nodeOf(B, s); if (w < 0) return;
      if (reduced(h, A, s, v) !== reduced(h, B, s, w)) return;
      if (!best || bits(s) < bits(best.s) || (bits(s) === bits(best.s) && s < best.s))
        best = { s: s, from: h.nodes[A.parent[v]].time, to: h.nodes[B.parent[w]].time };
    });
    if (best) best.kind = clades(A) === clades(B) ? 'age' : 'shape';
    return best;
  }
  function readings(h, T){
    var within = [], between = [], perTree = [], wSum = 0, wLen = 0, young = Infinity;
    T.forEach(function(t){
      var s = 0, n = 0, len = t.right - t.left;
      for (var a = 0; a < NH; a++) for (var b = a + 1; b < NH; b++){
        var age = pairAge(h, t, a, b), same = (a < NH / 2) === (b < NH / 2);
        (same ? within : between).push({ age: age, w: len });
        if (same){ wSum += age * len; wLen += len; } else if (age < young) young = age;
        s += age; n++;
      }
      perTree.push(s / n);
    });
    return { within: within, between: between, perTree: perTree, nHat: wSum / wLen / 2, youngest: young };
  }
  //<CORE

  var START = 54;
  var S = { model: 'large', rr: 1, seed: START, pos: 0, h: null, T: [], mv: [], rd: null, tmax: 1, hidden: [] };
  var el = function(id){ return document.getElementById(id); };
  var narrow = function(){ return fig.clientWidth < 600; };
  var fmt = function(x){ return Math.round(x).toLocaleString('en-US'); };
  var kb = function(x){ return (x / 1000).toFixed(1); };
  var name = function(v){ return v < NH ? 'h' + (v + 1) : 'n' + v; };
  function setNames(m){ var o = []; for (var i = 0; i < NH; i++) if (m & (1 << i)) o.push('h' + (i + 1)); return o; }
  function joinNames(a){ return a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function current(){ for (var i = 0; i < S.T.length; i++) if (S.pos < S.T[i].right) return i; return S.T.length - 1; }

  function rebuild(){
    S.h = simulate({ seed: S.seed, model: S.model, r: S.rr * 1e-8 });
    S.T = treesOf(S.h);
    S.mv = S.T.map(function(t, i){ return i ? moved(S.h, S.T[i - 1], t) : null; });
    S.rd = readings(S.h, S.T);
    var at = {}; S.T.forEach(function(t){ at[t.left] = 1; });
    S.hidden = S.h.recomb.filter(function(x){ return !at[x]; });
    var top = Math.max.apply(null, S.T.map(function(t){ return t.height; }));
    S.tmax = [1000, 2000, 5000, 10000, 20000, 50000, 100000].filter(function(v){ return v >= top; })[0] || top;
    fig.setAttribute('data-seed', S.seed);
    fig.setAttribute('data-model', S.model);
    fig.setAttribute('data-recomb', JSON.stringify(S.h.recomb));
    tables(); hist(); draw();
  }

  // ---- strip along the chromosome
  function strip(i){
    var nar = narrow(), W = nar ? 450 : 900, x0 = 40, x1 = W - 20, X = function(p){ return x0 + (x1 - x0) * p / LEN; }, o = '';
    S.T.forEach(function(t, k){
      o += '<rect x="' + X(t.left).toFixed(1) + '" y="8" width="' + (X(t.right) - X(t.left)).toFixed(1) + '" height="22" style="fill:var(--accent);opacity:' + (k === i ? .55 : k % 2 ? .12 : .24) + '"/>';
    });
    S.T.forEach(function(t, k){ if (!k) return;
      var c = S.mv[k] && S.mv[k].kind === 'age' ? 'var(--accent)' : 'var(--het)';
      o += '<line x1="' + X(t.left).toFixed(1) + '" x2="' + X(t.left).toFixed(1) + '" y1="3" y2="35" style="stroke:' + c + ';stroke-width:2.5"/>';
    });
    S.hidden.forEach(function(x){ o += '<line x1="' + X(x).toFixed(1) + '" x2="' + X(x).toFixed(1) + '" y1="30" y2="38" style="stroke:var(--muted);stroke-width:1.5"/>'; });
    // mean pair age, tree by tree
    var y0 = 128, Hh = 66, top = Math.max.apply(null, S.rd.perTree), Y = function(v){ return y0 - Hh * v / top; }, d = '', lo = 0;
    S.T.forEach(function(t, k){
      d += (k ? 'L' : 'M') + X(t.left).toFixed(1) + ' ' + Y(S.rd.perTree[k]).toFixed(1) + 'L' + X(t.right).toFixed(1) + ' ' + Y(S.rd.perTree[k]).toFixed(1);
      if (S.rd.perTree[k] < S.rd.perTree[lo]) lo = k;
    });
    o += '<line class="ax" x1="' + x0 + '" x2="' + x1 + '" y1="' + y0 + '" y2="' + y0 + '"/>';
    o += '<text x="' + x0 + '" y="53" class="lab">Mean age of the 15 pairs ' + (nar ? '' : 'along the sequence ') + '(top of plot = ' + fmt(top) + (nar ? ' gen' : ' generations') + ')</text>';
    var lt = S.T[lo];
    o += '<rect x="' + X(lt.left).toFixed(1) + '" y="' + (y0 - Hh) + '" width="' + (X(lt.right) - X(lt.left)).toFixed(1) + '" height="' + Hh + '" style="fill:var(--bad);opacity:.13"/>';
    o += '<path d="' + d + '" style="fill:none;stroke:var(--fg);stroke-width:1.6"/>';
    (nar ? [0, 50, 100] : [0, 25, 50, 75, 100]).forEach(function(q){ var x = X(q * 1000);
      o += '<line class="ax" x1="' + x + '" x2="' + x + '" y1="' + y0 + '" y2="' + (y0 + 4) + '"/><text x="' + x + '" y="' + (y0 + 16) + '" text-anchor="middle">' + q + ' kb</text>'; });
    o += '<line x1="' + X(S.pos).toFixed(1) + '" x2="' + X(S.pos).toFixed(1) + '" y1="2" y2="' + y0 + '" style="stroke:var(--bad);stroke-width:1.5"/>';
    var svg = el('s02-strip'); svg.innerHTML = o;
    svg.setAttribute('viewBox', '0 0 ' + W + ' 150'); svg.style.minWidth = nar ? '0' : '640px';
    svg.setAttribute('data-low-left', lt.left); svg.setAttribute('data-low-right', lt.right);
  }

  // ---- one local tree; time runs up on a square-root axis so that young nodes do not pile up
  function low(t, v){ var m = t.mask[v], i = 0; while (!(m & (1 << i))) i++; return i; }
  function panel(t, x0, x1, role, mv, title){
    var yb = 268, yt = 34, Y = function(a){ return yb - (yb - yt) * Math.sqrt(a / S.tmax); }, o = '<g data-role="' + role + '"';
    o += t ? ' data-left="' + t.left + '" data-right="' + t.right + '">' : '>';
    o += '<text x="' + x0 + '" y="14" class="lab">' + title + '</text>';
    [100, 500, 1000, 2000, 5000, 10000, 20000, 50000].filter(function(v){ return v <= S.tmax; }).forEach(function(v){
      if (S.tmax >= 10000 && v === 100) return;
      o += '<line class="grid" x1="' + x0 + '" x2="' + x1 + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/>';
      o += '<text x="' + (x0 - 5) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + fmt(v) + '</text>';
    });
    o += '<line class="ax" x1="' + x0 + '" x2="' + x1 + '" y1="' + yb + '" y2="' + yb + '"/><text x="' + (x0 - 5) + '" y="' + (yb + 4) + '" text-anchor="end">0</text>';
    if (!t) return o + '<text x="' + ((x0 + x1) / 2) + '" y="150" text-anchor="middle">start of the sequence: no tree to the left</text></g>';
    var order = [], px = {};
    (function walk(v){ var k = t.kids[v]; if (!k){ order.push(v); return; }
      k.slice().sort(function(a, b){ return low(t, a) - low(t, b); }).forEach(walk); })(t.root);
    var step = (x1 - x0 - 30) / (NH - 1);
    order.forEach(function(v, i){ px[v] = x0 + 15 + i * step; });
    (function place(v){ var k = t.kids[v]; if (!k) return px[v];
      var s = 0; k.forEach(function(c){ s += place(c); }); px[v] = s / k.length; return px[v]; })(t.root);
    var inS = function(v){ return mv && (t.mask[v] & ~mv.s) === 0; }, marks = '';
    Object.keys(t.parent).forEach(function(c){ c = +c; var p = t.parent[c], cy = Y(S.h.nodes[c].time), py = Y(S.h.nodes[p].time), hot = inS(c);
      o += '<path data-c="' + c + '" data-p="' + p + '" data-cy="' + cy.toFixed(2) + '" data-py="' + py.toFixed(2) + '" d="M' + px[c].toFixed(1) + ' ' + cy.toFixed(1) + 'V' + py.toFixed(1) + 'H' + px[p].toFixed(1) + '" style="fill:none;stroke:' + (hot ? 'var(--het)' : 'var(--fg)') + ';stroke-width:' + (hot ? 3 : 1.6) + '"/>';
    });
    Object.keys(t.kids).forEach(function(v){ v = +v; var a = S.h.nodes[v].time;
      marks += '<circle data-n="' + v + '" data-t="' + a + '" cx="' + px[v].toFixed(1) + '" cy="' + Y(a).toFixed(1) + '" r="3" style="fill:var(--fg)"/>';
      marks += '<text x="' + (px[v] + 5).toFixed(1) + '" y="' + (Y(a) - 4).toFixed(1) + '" style="font-size:9.5px">' + name(v) + '</text>';
    });
    order.forEach(function(v){
      o += '<text x="' + px[v].toFixed(1) + '" y="' + (yb + 16) + '" text-anchor="middle" style="fill:' + (v < NH / 2 ? 'var(--accent)' : 'var(--rep)') + ';font-weight:600">' + name(v) + '</text>';
    });
    return o + marks + '</g>';
  }

  function draw(){
    var i = current(), t = S.T[i], mv = S.mv[i], K = S.T.length;
    fig.setAttribute('data-tree', i);
    strip(i);
    var nar = narrow(), ax = '<text x="12" y="150" transform="rotate(-90 12 150)" text-anchor="middle">age, generations (square-root scale)</text>', tv = el('s02-trees');
    tv.setAttribute('viewBox', nar ? '0 0 450 600' : '0 0 900 292'); tv.style.minWidth = nar ? '0' : '680px';
    tv.innerHTML =
      panel(i ? S.T[i - 1] : null, 62, 432, 'before', mv, i ? 'Tree just left of the breakpoint at ' + kb(t.left) + ' kb' : 'Tree to the left') + ax +
      '<g transform="translate(0,' + (nar ? 306 : 0) + ')">' + panel(t, nar ? 62 : 502, nar ? 432 : 872, 'here', mv, 'Tree at the red line: ' + kb(t.left) + ' to ' + kb(t.right) + ' kb') + (nar ? ax : '') + '</g>';
    el('s02-pos').value = S.pos;
    el('s02-pos-out').textContent = kb(S.pos) + ' kb';
    el('s02-r-tree').textContent = (i + 1) + ' of ' + K;
    el('s02-r-root').textContent = fmt(t.height) + ' gen';
    el('s02-r-vis').textContent = K - 1;
    el('s02-r-hid').textContent = S.hidden.length;
    el('s02-prev').disabled = i === 0; el('s02-next').disabled = i === K - 1;
    var msg;
    if (!i) msg = K > 1 ? 'This is the first local tree. Press <b>Next breakpoint</b> or drag the slider to the right.'
      : 'One tree covers the whole stretch: no recombination changed it. Try a higher recombination rate or a new history.';
    else {
      var who = setNames(mv.s), w = who.length > 1 ? 'the branch above ' + joinNames(who) : 'the branch of ' + who[0];
      msg = 'At ' + kb(t.left) + ' kb, ' + w + ' was cut and re-attached. It joined the rest of the tree ' + fmt(mv.from) + ' generations ago on the left of the breakpoint and ' + fmt(mv.to) + ' generations ago on the right. ' +
        (mv.kind === 'shape' ? '<b>The shape of the tree changed</b>: the groups of relatives are different.' : '<b>The shape stayed the same</b>: only the age of that junction changed.');
    }
    el('s02-verdict').innerHTML = msg;
    var rows = el('s02-edges').querySelectorAll('tr');
    S.h.edges.forEach(function(d, k){ rows[k].className = d.left <= t.left && d.right >= t.right ? 's02-on' : ''; });
    var nr = el('s02-nodes').querySelectorAll('tr');
    S.h.nodes.forEach(function(n, k){ nr[k].className = n.id in t.mask ? 's02-on' : ''; });
  }

  function tables(){
    el('s02-edges').innerHTML = S.h.edges.map(function(d){
      return '<tr data-l="' + d.left + '" data-r="' + d.right + '" data-p="' + d.parent + '" data-c="' + d.child + '"><td>' + kb(d.left) + '</td><td>' + kb(d.right) + '</td><td>' + name(d.parent) + '</td><td>' + name(d.child) + '</td></tr>';
    }).join('');
    el('s02-nodes').innerHTML = S.h.nodes.map(function(n){
      return '<tr data-id="' + n.id + '" data-t="' + n.time + '"><td>' + name(n.id) + '</td><td>' + fmt(n.time) + '</td></tr>';
    }).join('');
    el('s02-c-trees').textContent = S.T.length;
    el('s02-c-sep').textContent = S.T.length * (2 * NH - 2);
    el('s02-c-ts').textContent = S.h.edges.length;
  }

  // ---- reading the whole object: ages of pairs, weighted by the length of sequence
  function hist(){
    var x0 = 50, x1 = 880, yb = 170, yt = 22, nb = 20, X = function(a){ return x0 + (x1 - x0) * Math.sqrt(Math.min(a, S.tmax) / S.tmax); };
    // with a split, shift the bins so that the split time is a bin edge and no bar straddles it
    var off = 0; if (S.model === 'two'){ off = nb * Math.sqrt(SPLIT / S.tmax); off -= Math.floor(off); }
    function bins(list){ var b = new Array(nb + 1).fill(0), tot = 0;
      list.forEach(function(e){ var k = Math.min(nb, Math.floor(nb * Math.sqrt(Math.min(e.age, S.tmax) / S.tmax) - off + 1)); b[k] += e.w; tot += e.w; });
      return b.map(function(v){ return v / tot; }); }
    var A = bins(S.rd.within), B = bins(S.rd.between), top = Math.max.apply(null, A.concat(B)), bw = (x1 - x0) / nb, o = '';
    var Y = function(v){ return (yb - yt) * v / top; };
    for (var k = 0; k <= nb; k++){
      var xa = x0 + (k - 1 + off) * bw;
      if (!A[k] && !B[k]) continue;
      o += '<rect x="' + (xa + 2).toFixed(1) + '" width="' + (bw / 2 - 2).toFixed(1) + '" y="' + (yb - Y(A[k])).toFixed(1) + '" height="' + Y(A[k]).toFixed(1) + '" style="fill:var(--accent)"/>';
      o += '<rect x="' + (xa + bw / 2).toFixed(1) + '" width="' + (bw / 2 - 2).toFixed(1) + '" y="' + (yb - Y(B[k])).toFixed(1) + '" height="' + Y(B[k]).toFixed(1) + '" style="fill:var(--rep)"/>';
    }
    o += '<line class="ax" x1="' + x0 + '" x2="' + x1 + '" y1="' + yb + '" y2="' + yb + '"/>';
    [0, 100, 500, 1000, 2000, 5000, 10000, 20000, 50000].filter(function(v){ return v <= S.tmax; }).forEach(function(v){
      if (S.tmax >= 5000 && v === 100) return;
      o += '<line class="ax" x1="' + X(v).toFixed(1) + '" x2="' + X(v).toFixed(1) + '" y1="' + yb + '" y2="' + (yb + 4) + '"/><text x="' + X(v).toFixed(1) + '" y="' + (yb + 16) + '" text-anchor="middle">' + fmt(v) + '</text>';
    });
    o += '<text x="' + ((x0 + x1) / 2) + '" y="' + (yb + 32) + '" text-anchor="middle">age of the common ancestor of a pair, generations (square-root scale)</text>';
    if (S.model === 'two'){
      o += '<line x1="' + X(SPLIT).toFixed(1) + '" x2="' + X(SPLIT).toFixed(1) + '" y1="' + (yt - 10) + '" y2="' + yb + '" style="stroke:var(--bad);stroke-width:1.5;stroke-dasharray:5 3"/>';
      o += '<text x="' + (X(SPLIT) + 6).toFixed(1) + '" y="' + (yt - 2) + '" style="fill:var(--bad)">true split: ' + fmt(SPLIT) + '</text>';
    }
    el('s02-hist').innerHTML = o;
    el('s02-q-n').textContent = fmt(S.rd.nHat);
    el('s02-q-ntrue').textContent = 'true N: ' + fmt(MODELS[S.model].N);
    el('s02-q-y').textContent = fmt(S.rd.youngest) + ' gen';
    el('s02-q-ytrue').textContent = S.model === 'two' ? 'true split: ' + fmt(SPLIT) : 'no split in this history: the two groups are only labels';
  }

  // ---- controls
  el('s02-pos').addEventListener('input', function(){ S.pos = +this.value; draw(); });
  el('s02-rr').addEventListener('input', function(){ S.rr = +this.value; el('s02-rr-out').textContent = S.rr.toFixed(1) + ' × 10⁻⁸'; S.pos = 0; rebuild(); });
  el('s02-new').addEventListener('click', function(){ S.seed++; S.pos = 0; rebuild(); });
  el('s02-prev').addEventListener('click', function(){ var i = current(); if (i > 0){ S.pos = S.T[i - 1].left; draw(); } });
  el('s02-next').addEventListener('click', function(){ var i = current(); if (i < S.T.length - 1){ S.pos = S.T[i + 1].left; draw(); } });
  var mb = document.querySelectorAll('#s02-model button');
  Array.prototype.forEach.call(mb, function(b){
    b.addEventListener('click', function(){
      S.model = b.getAttribute('data-m'); S.pos = 0;
      Array.prototype.forEach.call(mb, function(q){ q.setAttribute('aria-pressed', q === b ? 'true' : 'false'); });
      rebuild();
    });
  });
  el('s02-strip').addEventListener('click', function(ev){
    var W = narrow() ? 450 : 900, r = this.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * W;
    S.pos = Math.max(0, Math.min(LEN - 1, Math.round((x - 40) / (W - 60) * LEN))); draw();
  });
  var wasNarrow = narrow();
  window.addEventListener('resize', function(){ if (narrow() !== wasNarrow){ wasNarrow = narrow(); draw(); } });
  rebuild();
})();
