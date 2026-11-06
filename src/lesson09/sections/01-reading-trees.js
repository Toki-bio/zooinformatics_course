(function(){
  /* ---------- counting trees (exact, BigInt) ---------- */
  function dfact(m){ // m!! for odd m >= -1; (-1)!! = 1
    var r = 1n; for (var k = BigInt(m); k > 1n; k -= 2n) r *= k; return r;
  }
  function rootedCount(n){ return n < 2 ? 0n : dfact(2 * n - 3); }
  function unrootedCount(n){ return n < 3 ? 0n : dfact(2 * n - 5); }

  /* ---------- listing all trees by stepwise addition (independent of the formula) ---------- */
  function letter(k){ return String.fromCharCode(65 + k); }
  function adjOf(edges){
    var a = {};
    edges.forEach(function(e){ (a[e[0]] = a[e[0]] || []).push(e[1]); (a[e[1]] = a[e[1]] || []).push(e[0]); });
    return a;
  }
  function canon(a, x, p){ // canonical string of the subtree at x, seen from p
    if (x < 100) return letter(x);
    var kids = a[x].filter(function(y){ return y !== p; }).map(function(y){ return canon(a, y, x); });
    kids.sort(); return '(' + kids.join(',') + ')';
  }
  function allUnrooted(n){ // canonical string -> edge list
    var out = {};
    (function grow(edges, k){
      if (k === n) {
        var a = adjOf(edges), nb = a[0][0];
        var kids = a[nb].filter(function(y){ return y !== 0; }).map(function(y){ return canon(a, y, nb); }).sort();
        out['(A,' + kids.join(',') + ');'] = edges; return;
      }
      for (var i = 0; i < edges.length; i++) {
        var u = edges[i][0], v = edges[i][1], w = 100 + k, ne = edges.slice();
        ne[i] = [u, w]; ne.push([w, v]); ne.push([w, k]);
        grow(ne, k + 1);
      }
    })([[100, 0], [100, 1], [100, 2]], 3);
    return out;
  }
  function listCounts(n){ // counts by listing; rooted only for n <= 7
    var U = allUnrooted(n), seen = {}, rr = null, keys = Object.keys(U);
    if (n <= 7) {
      keys.forEach(function(key){
        var e = U[key];
        e.forEach(function(ed){
          var a = adjOf(e.filter(function(x){ return x !== ed; }));
          var s = [canon(a, ed[0], -1), canon(a, ed[1], -1)].sort();
          seen['(' + s.join(',') + ')'] = 1;
        });
      });
      rr = Object.keys(seen).length;
    }
    return { unrooted: keys.length, rooted: rr, list: U };
  }

  /* ---------- the toy tree ---------- */
  var LEN = { 'Y|Chicken': .9, 'A|Y': .2, 'B|Y': .35, 'A|C': .1, 'A|Gorilla': .3, 'C|Human': .15, 'C|Chimp': .15, 'B|Mouse': .3, 'B|Rat': .25 };
  function L(a, b){ return LEN[a + '|' + b] !== undefined ? LEN[a + '|' + b] : LEN[b + '|' + a]; }
  var LEAVES = ['Human', 'Chimp', 'Gorilla', 'Mouse', 'Rat', 'Chicken'];
  function fresh(){
    return {
      adj: { Y: ['A', 'B', 'Chicken'], A: ['Y', 'C', 'Gorilla'], C: ['A', 'Human', 'Chimp'], B: ['Y', 'Mouse', 'Rat'],
             Human: ['C'], Chimp: ['C'], Gorilla: ['A'], Mouse: ['B'], Rat: ['B'], Chicken: ['Y'] },
      root: { u: 'Y', v: 'Chicken', swap: false }, rot: 0, rer: 0
    };
  }
  function build(m, x, p, len){
    var kids = m.adj[x].filter(function(y){ return y !== p; }).map(function(y){ return build(m, y, x, L(x, y)); });
    return { id: x, len: len, kids: kids, leaf: kids.length === 0 };
  }
  function rooted(m){
    var r = m.root, d = L(r.u, r.v) / 2;
    var a = build(m, r.u, r.v, d), b = build(m, r.v, r.u, d);
    return { id: 'root', len: 0, leaf: false, kids: r.swap ? [b, a] : [a, b] };
  }
  function decorate(t){
    if (t.leaf) t.set = [t.id];
    else { t.kids.forEach(decorate); t.set = [].concat.apply([], t.kids.map(function(k){ return k.set; })); }
    return t;
  }
  function nodes(t, out){ out = out || []; out.push(t); t.kids.forEach(function(k){ nodes(k, out); }); return out; }
  function key(s){ return s.slice().sort().join(','); }
  function hasClade(t, set){ var k = key(set); return nodes(t).some(function(n){ return key(n.set) === k; }); }
  function sister(t, a, b){
    var ka = key(a), kb = key(b);
    return nodes(t).some(function(n){
      if (n.kids.length !== 2) return false;
      var x = key(n.kids[0].set), y = key(n.kids[1].set);
      return (x === ka && y === kb) || (x === kb && y === ka);
    });
  }
  function order(t){ var o = []; (function w(n){ if (n.leaf) o.push(n.id); else n.kids.forEach(w); })(t); return o; }
  function pathLen(m, a, b){ // length along the branches between two leaves (does not depend on the root)
    var best = null;
    (function dfs(x, p, acc){ if (x === b) { best = acc; return; } m.adj[x].forEach(function(y){ if (y !== p) dfs(y, x, acc + L(x, y)); }); })(a, null, 0);
    return best;
  }
  function unrootedKey(m){ // the unrooted tree as its set of splits; independent of the root and of the drawing
    var out = [];
    (function w(x, p){
      var kids = m.adj[x].filter(function(y){ return y !== p; });
      if (!kids.length) return [x];
      var set = [];
      kids.forEach(function(y){ set = set.concat(w(y, x)); });
      if (p !== null) {
        var s = set.slice().sort().join(','), comp = LEAVES.filter(function(l){ return set.indexOf(l) < 0; }).sort().join(',');
        out.push(s <= comp ? s : comp);
      }
      return set;
    })('Chicken', null);
    return out.sort().join(' | ');
  }
  var STATEMENTS = [
    { id: 'sis', kind: 'root', text: 'Human and Chimp are sister groups.', f: function(t){ return sister(t, ['Human'], ['Chimp']); } },
    { id: 'cl1', kind: 'root', text: 'Human, Chimp and Gorilla form a clade.', f: function(t){ return hasClade(t, ['Human', 'Chimp', 'Gorilla']); } },
    { id: 'cl2', kind: 'root', text: 'Mouse and Rat form a clade.', f: function(t){ return hasClade(t, ['Mouse', 'Rat']); } },
    { id: 'out', kind: 'root', text: 'Chicken is the sister of the other five animals taken together.', f: function(t){ return hasClade(t, ['Human', 'Chimp', 'Gorilla', 'Mouse', 'Rat']); } },
    { id: 'dst', kind: 'fixed', text: 'Along the branches, Human is closer to Chimp than to Mouse.', f: function(t, m){ return pathLen(m, 'Human', 'Chimp') < pathLen(m, 'Human', 'Mouse'); } },
    { id: 'nxt', kind: 'draw', text: 'Gorilla is drawn on the row directly above Mouse.', f: function(t){ var o = order(t); return o.indexOf('Mouse') - o.indexOf('Gorilla') === 1; } },
    { id: 'bot', kind: 'draw', text: 'Chicken is drawn at the bottom.', f: function(t){ var o = order(t); return o[o.length - 1] === 'Chicken'; } }
  ];
  function evalAll(m){ var t = decorate(rooted(m)); return STATEMENTS.map(function(s){ return !!s.f(t, m); }); }
  function newick(t){
    function num(x){ return String(parseFloat(x.toFixed(3))); }
    function w(n, top){ var s = n.leaf ? n.id : '(' + n.kids.map(function(k){ return w(k); }).join(',') + ')'; return top ? s : s + ':' + num(n.len); }
    return w(t, true) + ';';
  }
  function edgeList(){ return Object.keys(LEN).map(function(k){ return k.split('|'); }); }
  function rotate(m, id){ if (id === 'root') m.root.swap = !m.root.swap; else m.adj[id].reverse(); m.rot++; }
  function reroot(m, x, p){
    var r = m.root;
    if ((r.u === x && r.v === p) || (r.u === p && r.v === x)) return false;
    m.root = { u: x, v: p, swap: false }; m.rer++; return true;
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = { dfact: dfact, rootedCount: rootedCount, unrootedCount: unrootedCount, listCounts: listCounts,
      fresh: fresh, rooted: rooted, decorate: decorate, evalAll: evalAll, STATEMENTS: STATEMENTS, newick: newick, pathLen: pathLen,
      unrootedKey: unrootedKey, rotate: rotate, reroot: reroot, edgeList: edgeList, order: order };
    return;
  }
  var $ = function(i){ return document.getElementById(i); };
  if (!$('s01-tree')) return;

  /* ---------- interactive tree ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  var model = fresh(), start = evalAll(model), startKey = unrootedKey(model), scaled = true;
  var ROWH = 38, X0 = 44, PX = 300, W = 640;
  function el(tag, attrs, txt){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (txt !== undefined) e.textContent = txt;
    return e;
  }
  function activate(e, fn){
    e.setAttribute('tabindex', '0'); e.setAttribute('role', 'button');
    e.addEventListener('click', fn);
    e.addEventListener('keydown', function(ev){ if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); fn(); } });
  }
  function height(n){ n.h = n.leaf ? 0 : 1 + Math.max.apply(null, n.kids.map(height)); return n.h; }
  function drawTree(){
    var t = decorate(rooted(model)), svg = el('svg', { viewBox: '0 0 ' + W + ' ' + (ROWH * 6 + 36), width: '100%', role: 'group',
      'aria-label': 'A rooted tree of six animals. Click a branch to move the root, click a node to rotate it.' });
    svg.style.minWidth = '560px';
    var row = 0, H = height(t), step = 300 / H;
    (function pos(n, depth){
      n.x = X0 + (scaled ? depth * PX : (H - n.h) * step);
      n.kids.forEach(function(k){ pos(k, depth + k.len); });
      if (n.leaf) n.y = 22 + (row++) * ROWH;
      else n.y = (n.kids[0].y + n.kids[n.kids.length - 1].y) / 2;
    })(t, 0);
    nodes(t).forEach(function(n){
      if (n.leaf) return;
      var ys = n.kids.map(function(k){ return k.y; });
      svg.appendChild(el('line', { x1: n.x, x2: n.x, y1: Math.min.apply(null, ys), y2: Math.max.apply(null, ys), stroke: 'var(--fg)', 'stroke-width': 2 }));
      n.kids.forEach(function(k){
        svg.appendChild(el('line', { x1: n.x, x2: k.x, y1: k.y, y2: k.y, stroke: 'var(--fg)', 'stroke-width': 2 }));
        var hit = el('line', { x1: n.x, x2: k.x, y1: k.y, y2: k.y, stroke: 'var(--accent)', 'stroke-opacity': 0.001, 'stroke-width': 16, style: 'cursor:pointer' });
        hit.appendChild(el('title', {}, 'Click: put the root on this branch'));
        hit.setAttribute('aria-label', 'Put the root on the branch leading to ' + k.set.join(', '));
        (function(kid, par){
          activate(hit, function(){
            var other = par.id === 'root' ? (par.kids[0] === kid ? par.kids[1] : par.kids[0]).id : par.id;
            if (reroot(model, kid.id, other)) render();
          });
        })(k, n);
        svg.appendChild(hit);
        if (scaled && k.x - n.x > 30) svg.appendChild(el('text', { x: (n.x + k.x) / 2, y: k.y - 5, 'text-anchor': 'middle', style: 'font-size:10px' }, String(parseFloat(k.len.toFixed(3)))));
      });
    });
    nodes(t).forEach(function(n){
      if (n.leaf) { svg.appendChild(el('text', { x: n.x + 8, y: n.y + 4, class: 'lab' }, n.id)); return; }
      var c = n.id === 'root'
        ? el('rect', { x: n.x - 6, y: n.y - 6, width: 12, height: 12, fill: 'var(--bad)', style: 'cursor:pointer' })
        : el('circle', { cx: n.x, cy: n.y, r: 6, fill: 'var(--panel)', stroke: 'var(--accent)', 'stroke-width': 2, style: 'cursor:pointer' });
      c.appendChild(el('title', {}, n.id === 'root' ? 'The root. Click: swap its two sides' : 'Click: rotate this node (swap its branches)'));
      c.setAttribute('aria-label', (n.id === 'root' ? 'Swap the two sides of the root: ' : 'Rotate the node above ') + n.set.join(', '));
      (function(id){ activate(c, function(){ rotate(model, id); render(); }); })(n.id);
      svg.appendChild(c);
      if (n.id === 'root') svg.appendChild(el('text', { x: n.x + 10, y: n.y + 4 }, 'root'));
    });
    if (scaled) {
      svg.appendChild(el('line', { x1: W - 20 - 0.25 * PX, x2: W - 20, y1: ROWH * 6 + 22, y2: ROWH * 6 + 22, stroke: 'var(--fg)', 'stroke-width': 2 }));
      svg.appendChild(el('text', { x: W - 20 - 0.125 * PX, y: ROWH * 6 + 12, 'text-anchor': 'middle' }, '0.25'));
    }
    var box = $('s01-tree'); box.textContent = ''; box.appendChild(svg);
    return t;
  }
  var UPOS = { Y: [140, 110], Chicken: [30, 110], A: [225, 70], Gorilla: [315, 112], C: [290, 32], Human: [365, 12], Chimp: [370, 58], B: [215, 165], Mouse: [300, 150], Rat: [290, 205] };
  function drawUnrooted(){
    var svg = el('svg', { viewBox: '0 0 440 220', width: '100%', role: 'img', 'aria-label': 'The same tree without a root; a red square marks where the root sits.' });
    svg.style.minWidth = '300px';
    edgeList().forEach(function(e){ svg.appendChild(el('line', { x1: UPOS[e[0]][0], y1: UPOS[e[0]][1], x2: UPOS[e[1]][0], y2: UPOS[e[1]][1], stroke: 'var(--fg)', 'stroke-width': 2 })); });
    LEAVES.forEach(function(l){ svg.appendChild(el('text', { x: UPOS[l][0] + (l === 'Chicken' ? -8 : 6), y: UPOS[l][1] + (l === 'Chicken' ? -8 : 4), class: 'lab' }, l)); });
    var r = model.root, a = UPOS[r.u], b = UPOS[r.v], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    svg.appendChild(el('rect', { x: mx - 6, y: my - 6, width: 12, height: 12, fill: 'var(--bad)' }));
    svg.appendChild(el('text', { x: mx, y: my - 10, 'text-anchor': 'middle' }, 'root'));
    var box = $('s01-unrooted'); box.textContent = ''; box.appendChild(svg);
  }
  var KIND = {
    root: ['depends on the root', 'This statement is about the tree as rooted. It can change when the root moves, but not when nodes rotate.'],
    fixed: ['never changes', 'Neither rotating nor moving the root can change this: it is read from the branch lengths of the unrooted tree.'],
    draw: ['only the drawing', 'This is about where names happen to sit on the page. It can change when nodes rotate, and says nothing about the animals.']
  };
  function render(){
    var t = drawTree(); drawUnrooted();
    var now = evalAll(model), rows = $('s01-stm'); rows.textContent = '';
    STATEMENTS.forEach(function(s, i){
      var changed = now[i] !== start[i], d = document.createElement('div');
      d.className = 's01-row' + (changed ? ' s01-chg' : '');
      d.innerHTML = '<span class="s01-t"></span><b class="' + (now[i] ? 's01-yes' : 's01-no') + '">' + (now[i] ? 'true' : 'false') +
        '</b><span class="s01-k"><span class="tip" title="' + KIND[s.kind][1] + '">' + KIND[s.kind][0] + '</span>' + (changed ? ' &middot; <b>changed</b>' : '') + '</span>';
      d.firstChild.textContent = s.text; rows.appendChild(d);
    });
    $('s01-newick').textContent = newick(t);
    $('s01-dist').textContent = pathLen(model, 'Human', 'Mouse').toFixed(2);
    $('s01-same').textContent = unrootedKey(model) === startKey ? 'yes, identical' : 'NO (a bug)';
    $('s01-moves').textContent = model.rot + ' rotations, ' + model.rer + ' re-rootings';
  }
  $('s01-reset').addEventListener('click', function(){ model = fresh(); render(); });
  $('s01-shuffle').addEventListener('click', function(){
    nodes(decorate(rooted(model))).forEach(function(n){ if (!n.leaf && Math.random() < 0.5) rotate(model, n.id); });
    render();
  });
  $('s01-randroot').addEventListener('click', function(){
    var es = edgeList(), e = es[Math.floor(Math.random() * es.length)];
    if (!reroot(model, e[0], e[1])) reroot(model, e[1], e[0]);
    render();
  });
  $('s01-scale').addEventListener('click', function(){
    scaled = !scaled; this.setAttribute('aria-pressed', String(scaled));
    this.textContent = scaled ? 'Branch lengths: to scale' : 'Branch lengths: ignored'; render();
  });
  render();

  /* ---------- number-of-trees calculator ---------- */
  var PUB = [[3, '3', '1', 'OEIS A001147'], [4, '15', '3', 'OEIS A001147'], [5, '105', '15', 'OEIS A001147'], [6, '945', '105', 'OEIS A001147'],
             [7, '10395', '945', 'OEIS A001147'], [8, '135135', '10395', 'OEIS A001147'], [10, '34459425', '2027025', 'Wikipedia, Phylogenetic tree']];
  function fmt(b){
    var s = b.toString();
    if (s.length <= 12) return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return s[0] + '.' + s.slice(1, 4) + ' &times; 10<sup>' + (s.length - 1) + '</sup>';
  }
  function years(b){
    var x = Number(b) / 1e6 / 31557600;
    if (x < 1) return 'less than a year';
    if (!isFinite(x)) return 'more than 10<sup>300</sup> years';
    var e = Math.floor(Math.log10(x)); return (x / Math.pow(10, e)).toFixed(1) + ' &times; 10<sup>' + e + '</sup> years';
  }
  var nIn = $('s01-n');
  function calc(){
    var n = Math.max(3, Math.min(100, parseInt(nIn.value, 10) || 3));
    var R = rootedCount(n), U = unrootedCount(n);
    $('s01-nr').innerHTML = fmt(R); $('s01-nu').innerHTML = fmt(U); $('s01-ny').innerHTML = years(R);
    var msg;
    if (n <= 7) {
      var c = listCounts(n);
      msg = 'Check: a short program listed every tree by adding the taxa one at a time to every branch, and found ' + c.unrooted + ' unrooted and ' + c.rooted + ' rooted trees. ' +
        (BigInt(c.unrooted) === U && BigInt(c.rooted) === R ? 'Both agree with the formulas.' : 'DISAGREES with the formulas (a bug).');
    } else if (n === 8) {
      var c8 = listCounts(8);
      msg = 'Check: the program listed ' + c8.unrooted + ' unrooted trees. ' + (BigInt(c8.unrooted) === U ? 'Agrees with the formula.' : 'DISAGREES (a bug).');
    } else msg = 'Too many to list here. For 3 to 8 taxa the page lists them all and compares with the formula.';
    $('s01-chk').textContent = msg;
  }
  nIn.addEventListener('input', calc); calc();
  var tb = $('s01-pub');
  PUB.forEach(function(p){
    var ok = rootedCount(p[0]).toString() === p[1] && unrootedCount(p[0]).toString() === p[2];
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>' + p[0] + '</td><td>' + Number(p[1]).toLocaleString('en-US') + '</td><td>' + Number(p[2]).toLocaleString('en-US') + '</td><td>' + p[3] +
      '</td><td><b class="' + (ok ? 's01-yes' : 's01-no') + '">' + (ok ? 'formula agrees' : 'DISAGREES') + '</b></td>';
    tb.appendChild(tr);
  });
  $('s01-listbtn').addEventListener('click', function(){
    var n = Math.min(5, Math.max(3, parseInt(nIn.value, 10) || 4));
    var c = listCounts(n), keys = Object.keys(c.list).sort();
    $('s01-list').textContent = 'All ' + keys.length + ' unrooted trees for ' + n + ' taxa (A to ' + letter(n - 1) + '), each written with three branches at the centre:\n' + keys.join('\n');
  });
})();
