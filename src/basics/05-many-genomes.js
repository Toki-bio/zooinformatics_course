(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag), k;
    for (k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pois(r, m) {
    var L = Math.exp(-m), k = 0, p = 1;
    if (m > 30) { var z = Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r()); return Math.max(0, Math.round(m + Math.sqrt(m) * z)); }
    do { k++; p *= r(); } while (p > L);
    return k - 1;
  }
  function panel(box, labelHtml, w, h, aria, scroll) {
    var cell = document.createElement('div'), lab = document.createElement('p'), sb = document.createElement('div');
    cell.className = 'b-cell'; lab.className = 'b-lab'; lab.innerHTML = labelHtml; sb.className = 'svgbox';
    cell.appendChild(lab); cell.appendChild(sb); box.appendChild(cell);
    return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'img', 'aria-label': aria, style: 'display:block' + (scroll ? ';min-width:' + scroll + 'px' : '') }, sb);
  }
  var TIPCOL = ['var(--accent)', 'var(--het)', 'var(--rep)', 'var(--good)', 'var(--err)', 'var(--bad)'];

  // 1. Copies and pairs
  (function () {
    var box = $('b-pairs');
    [2, 4, 8, 12].forEach(function (n) {
      var pairs = 0, i, j, R = 52, cx = 70, cy = 66, pts = [];
      for (i = 0; i < n; i++) pts.push([cx + R * Math.sin(2 * Math.PI * i / n), cy - R * Math.cos(2 * Math.PI * i / n)]);
      var svg = panel(box, '', 140, 132, n + ' chromosome copies and the pairs between them');
      for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
        el('line', { x1: pts[i][0], y1: pts[i][1], x2: pts[j][0], y2: pts[j][1], style: 'stroke:var(--accent);stroke-width:1;opacity:.55' }, svg); pairs++;
      }
      pts.forEach(function (p, k) { el('circle', { cx: p[0], cy: p[1], r: 5, style: 'fill:' + TIPCOL[Math.floor(k / 2) % 6] }, svg); });
      box.lastChild.querySelector('.b-lab').innerHTML = '<b>' + n / 2 + (n === 2 ? ' animal' : ' animals') + '</b>, ' + n + ' copies: <b>' + pairs + (pairs === 1 ? ' pair' : ' pairs') + '</b>';
    });
  })();

  // Trees. Nodes 0..5 are tips; internal nodes have a time and two children.
  var NT = 6;
  function newTree(r) {
    var t = { par: [], time: [], kids: [], root: 0 }, live = [], i, k, a, b, now = 0, id;
    for (i = 0; i < NT; i++) { t.par[i] = -1; t.time[i] = 0; t.kids[i] = []; live.push(i); }
    while (live.length > 1) {
      k = live.length; now += -Math.log(r() || 1e-12) / (k * (k - 1) / 2);
      a = live.splice(Math.floor(r() * live.length), 1)[0]; b = live.splice(Math.floor(r() * live.length), 1)[0];
      id = t.par.length; t.par[id] = -1; t.time[id] = now; t.kids[id] = [a, b]; t.par[a] = id; t.par[b] = id; live.push(id);
    }
    t.root = live[0];
    return t;
  }
  function copy(t) { return { par: t.par.slice(), time: t.time.slice(), kids: t.kids.map(function (k) { return k.slice(); }), root: t.root }; }
  function replaceKid(t, parent, oldK, newK) { var k = t.kids[parent]; k[k.indexOf(oldK)] = newK; }
  // Subtree prune and regraft: cut the branch above v and attach it elsewhere, higher than v.
  function spr(t0, r) {
    var t = copy(t0), n = t.par.length, v, p, s, g, u, tt, cand = [];
    do { v = Math.floor(r() * n); } while (v === t.root);
    p = t.par[v]; s = t.kids[p][0] === v ? t.kids[p][1] : t.kids[p][0]; g = t.par[p];
    if (g < 0) { t.root = s; t.par[s] = -1; } else { replaceKid(t, g, p, s); t.par[s] = g; }
    tt = t.time[v] + 0.5 * -Math.log(r() || 1e-12);
    for (u = 0; u < n; u++) {
      if (u === v || u === p) continue;
      if (t.time[u] < tt && (t.par[u] < 0 || t.time[t.par[u]] > tt)) cand.push(u);
    }
    u = cand[Math.floor(r() * cand.length)];
    t.par[p] = t.par[u]; t.time[p] = tt; t.kids[p] = [v, u];
    if (t.par[u] < 0) t.root = p; else replaceKid(t, t.par[u], u, p);
    t.par[u] = p; t.par[v] = p;
    t.moved = v;
    return t;
  }
  function mask(t, u) { if (u < NT) return 1 << u; return mask(t, t.kids[u][0]) | mask(t, t.kids[u][1]); }
  function keys(t) {
    var top = [], full = [], u, m;
    for (u = NT; u < t.par.length; u++) { m = mask(t, u); top.push(m); full.push(m + '@' + t.time[u].toFixed(6)); }
    return { top: top.sort().join(','), full: full.sort().join(',') };
  }
  function effect(a, b) { var ka = keys(a), kb = keys(b); return ka.top !== kb.top ? 'shape' : ka.full !== kb.full ? 'age' : 'none'; }
  function history(seed, nEv) {
    var r = rng(seed), t = newTree(r), pos = [], i, out = { trees: [t], pos: [0], eff: [] };
    for (i = 0; i < nEv; i++) pos.push(1 + 98 * r());
    pos.sort(function (a, b) { return a - b; });
    pos.forEach(function (x) {
      var prev = out.trees[out.trees.length - 1], nt = spr(prev, r);
      out.eff.push(effect(prev, nt));
      out.trees.push(nt); out.pos.push(x);
    });
    out.pos.push(100);
    return out;
  }
  function minTip(t, u) { return u < NT ? u : Math.min(minTip(t, t.kids[u][0]), minTip(t, t.kids[u][1])); }
  function order(t, u, acc) {
    if (u < NT) { acc.push(u); return; }
    var k = t.kids[u].slice().sort(function (a, b) { return minTip(t, a) - minTip(t, b); });
    order(t, k[0], acc); order(t, k[1], acc);
  }
  function lca(t, a, b) {
    var anc = {}, u = a;
    while (u >= 0) { anc[u] = 1; u = t.par[u]; }
    u = b; while (!anc[u]) u = t.par[u];
    return u;
  }
  function closest(t, a) {
    var best = 1e9, out = [], b, d;
    for (b = 0; b < NT; b++) if (b !== a) {
      d = t.time[lca(t, a, b)];
      if (d < best - 1e-9) { best = d; out = [b]; } else if (Math.abs(d - best) < 1e-9) out.push(b);
    }
    return out.map(function (x) { return 'h' + (x + 1); }).join(', ');
  }
  function drawTree(svg, t, tmax, moved) {
    var W = 160, x0 = 14, x1 = W - 14, y0 = 126, y1 = 8, ord = [], X = {}, u, i, a, b;
    order(t, t.root, ord);
    ord.forEach(function (tip, k) { X[tip] = x0 + (x1 - x0) * k / (NT - 1); });
    var Y = function (tm) { return y0 - (y0 - y1) * tm / tmax; };
    function xOf(q) { if (X[q] === undefined) X[q] = (xOf(t.kids[q][0]) + xOf(t.kids[q][1])) / 2; return X[q]; }
    for (u = 0; u < t.par.length; u++) xOf(u);
    for (u = NT; u < t.par.length; u++) {
      a = t.kids[u][0]; b = t.kids[u][1];
      el('line', { x1: X[a], x2: X[b], y1: Y(t.time[u]), y2: Y(t.time[u]), style: 'stroke:var(--muted);stroke-width:1.4' }, svg);
    }
    for (u = 0; u < t.par.length; u++) {
      if (t.par[u] < 0) continue;
      el('line', { x1: X[u], x2: X[u], y1: Y(t.time[u]), y2: Y(t.time[t.par[u]]), style: u === moved ? 'stroke:var(--het);stroke-width:3.4' : 'stroke:var(--muted);stroke-width:1.4' }, svg);
    }
    for (i = 0; i < NT; i++) {
      el('circle', { cx: X[i], cy: y0 + 4, r: 6, style: 'fill:' + TIPCOL[i] }, svg);
      el('text', { x: X[i], y: y0 + 21, 'text-anchor': 'middle', style: 'font-size:10.5px;fill:var(--fg)' }, svg, 'h' + (i + 1));
    }
  }

  // 2. Four stretches, four trees
  var treeSeed = 11;
  function drawTrees() {
    var H = history(treeSeed, 3), tmax = 0, box = $('b-trees'), bar = $('b-chrbar'), k, shapeCh = 0, ageCh = 0, none = 0, same = 0;
    H.trees.forEach(function (t) { tmax = Math.max(tmax, t.time[t.root]); });
    box.textContent = ''; bar.textContent = '';
    var sv = el('svg', { viewBox: '0 0 640 40', width: '100%', role: 'img', 'aria-label': 'A 100 kb stretch of chromosome cut into four parts at three recombinations', style: 'display:block;min-width:420px' }, bar);
    for (k = 0; k < H.trees.length; k++) {
      var l = 10 + H.pos[k] * 6.2, r = 10 + H.pos[k + 1] * 6.2, t = H.trees[k];
      el('rect', { x: l, y: 6, width: r - l - 1, height: 16, style: 'fill:' + (k % 2 ? 'var(--het)' : 'var(--accent)') + ';opacity:.85' }, sv);
      el('text', { x: (l + r) / 2, y: 36, 'text-anchor': 'middle', style: 'font-size:11px;fill:var(--fg)' }, sv, String(k + 1));
      var svg = panel(box, '<b>Stretch ' + (k + 1) + '</b>: ' + Math.round(H.pos[k]) + ' to ' + Math.round(H.pos[k + 1]) + ' kb', 160, 150, 'Tree of stretch ' + (k + 1));
      drawTree(svg, t, tmax, k ? t.moved : -1);
      var p = document.createElement('p'); p.className = 'b-lab';
      p.innerHTML = 'Closest to h1: <b>' + closest(t, 0) + '</b>';
      box.lastChild.appendChild(p);
      if (k) {
        if (H.eff[k - 1] === 'shape') shapeCh++; else if (H.eff[k - 1] === 'age') ageCh++; else none++;
        if (closest(t, 0) === closest(H.trees[0], 0)) same++;
      }
    }
    $('b-tmsg').innerHTML = 'Height is time back. Thick orange: the branch that moved. h1 to h6 are six copies. ' +
      'In this draw, of the 3 recombinations ' + shapeCh + ' changed the grouping of the copies, ' + ageCh + ' changed only an age. ' +
      'The closest relative of h1 is the same as in stretch 1 in ' + (same + 1) + ' of the 4 stretches.';
  }
  $('b-tnew').addEventListener('click', function () { treeSeed += 7; drawTrees(); });
  drawTrees();

  // 3. Recombination count and number of trees
  var recSeed = 5;
  function drawRec() {
    var box = $('b-rec'), nEvs = [0, 4, 16], names = ['Y chromosome or mitochondrial DNA', 'An autosome, few recombinations', 'An autosome, many recombinations'];
    box.textContent = '';
    nEvs.forEach(function (n, q) {
      var H = history(recSeed * 100 + 1, n), shape = 0, age = 0, none = 0, trees = 1, colour = 0, k, a, b;
      var svg = panel(box, '', 640, 28, names[q] + ': stretches with one tree each', 420);
      for (k = 0; k <= n; k++) {
        if (k > 0) { if (H.eff[k - 1] === 'none') none++; else { trees++; colour++; if (H.eff[k - 1] === 'shape') shape++; else age++; } }
        a = 10 + H.pos[k] * 6.2; b = 10 + H.pos[k + 1] * 6.2;
        el('rect', { x: a, y: 4, width: Math.max(1, b - a - 0.8), height: 18, style: 'fill:' + (colour % 2 ? 'var(--het)' : 'var(--accent)') + ';opacity:.85' }, svg);
      }
      box.lastChild.querySelector('.b-lab').innerHTML = '<b>' + names[q] + '</b>: ' + n + ' recombinations, <b>' + trees + (trees === 1 ? ' tree' : ' trees') + '</b>' +
        (n ? ' (' + shape + ' changed the grouping, ' + age + ' only an age)' : '');
    });
  }
  $('b-rnew').addEventListener('click', function () { recSeed++; drawRec(); });
  drawRec();

  // 4. IBD segments after g generations
  var ibdSeed = 3;
  function drawIbd() {
    var box = $('b-ibd');
    box.textContent = '';
    [3, 10, 30, 100].forEach(function (g) {
      var r = rng(ibdSeed * 977 + g), n = pois(r, 2 * g), pts = [], i, segs = [], prev = 0, longest = 0;
      for (i = 0; i < n; i++) pts.push(100 * r());
      pts.sort(function (a, b) { return a - b; });
      pts.forEach(function (x) { segs.push([prev, x]); prev = x; });
      segs.push([prev, 100]);
      var svg = panel(box, '', 640, 28, 'A 100 cM chromosome cut into ' + segs.length + ' pieces after ' + g + ' generations', 420);
      segs.forEach(function (s, k) {
        longest = Math.max(longest, s[1] - s[0]);
        el('rect', { x: 10 + s[0] * 6.2, y: 4, width: Math.max(0.8, (s[1] - s[0]) * 6.2 - 0.8), height: 20, style: 'fill:' + (k % 2 ? 'var(--het)' : 'var(--accent)') + ';opacity:.85' }, svg);
      });
      box.lastChild.querySelector('.b-lab').innerHTML = '<b>Common ancestor ' + g + ' generations back</b>: ' + segs.length + ' pieces, longest ' + longest.toFixed(1) + ' cM, average ' + (100 / segs.length).toFixed(1) + ' cM (formula 50/g = ' + (50 / g).toFixed(1) + ' cM)';
    });
  }
  $('b-inew').addEventListener('click', function () { ibdSeed++; drawIbd(); });
  drawIbd();

  function fm(x) { return x >= 10 ? String(Math.round(x)) : x.toPrecision(2); }
  // 5. Expected segment counts for three Ne
  (function () {
    var box = $('b-ne'), G = 400, GENOME = 3000, BINS = [[2, 4], [4, 8], [8, 16], [16, 1e9]], BL = ['2-4', '4-8', '8-16', '16+'];
    function counts(N) {
      var b = [0, 0, 0, 0], surv = 1, g, q, p, s, k;
      for (g = 1; g <= G; g++) {
        q = 1 / (2 * N); p = surv * q; surv *= 1 - q; s = g / 50;
        for (k = 0; k < 4; k++) b[k] += GENOME * p * s * (Math.exp(-s * BINS[k][0]) - (BINS[k][1] > 1e8 ? 0 : Math.exp(-s * BINS[k][1])));
      }
      return b;
    }
    var lo = -3, hi = 3;
    [100, 1000, 10000].forEach(function (N) {
      var c = counts(N), svg = panel(box, '', 160, 150, 'Expected segments per pair for Ne ' + N), k, oy = 8, h = 100, tot = c[0] + c[1] + c[2] + c[3], l8 = c[2] + c[3];
      var Y = function (v) { return oy + h - (Math.log10(Math.max(v, 0.001)) - lo) / (hi - lo) * h; };
      for (k = lo; k <= hi; k += 2) {
        el('line', { x1: 34, x2: 156, y1: Y(Math.pow(10, k)), y2: Y(Math.pow(10, k)), style: 'stroke:var(--line)' }, svg);
        el('text', { x: 30, y: Y(Math.pow(10, k)) + 3.5, 'text-anchor': 'end', style: 'font-size:8px;font-family:var(--f-body);fill:var(--muted)' }, svg, String(Math.pow(10, k)));
      }
      c.forEach(function (v, i) {
        el('rect', { x: 38 + i * 30, y: Y(v), width: 24, height: Math.max(0, oy + h - Y(v)), style: 'fill:var(--accent)' }, svg);
        el('text', { x: 50 + i * 30, y: oy + h + 13, 'text-anchor': 'middle', style: 'font-size:8px;font-family:var(--f-body);fill:var(--fg)' }, svg, BL[i]);
      });
      el('text', { x: 97, y: oy + h + 27, 'text-anchor': 'middle', style: 'font-size:8px;font-family:var(--f-body);fill:var(--muted)' }, svg, 'length, cM');
      box.lastChild.querySelector('.b-lab').innerHTML = '<b>Ne = ' + N.toLocaleString('en-US') + '</b>: ' + fm(tot) + ' segments of 2 cM or more per pair, ' + fm(l8) + ' of 8 cM or more';
    });
  })();

  // 6. Array versus sequencing
  (function () {
    var box = $('b-arr'), N = 100, H = N / 2, W = [], k, tot = 0, CL = [[1, 1], [2, 3], [4, 10], [11, 25], [26, 50]], CN = ['1', '2-3', '4-10', '11-25', '26-50'];
    for (k = 1; k <= H; k++) { W[k] = k < H ? 1 / k + 1 / (N - k) : 1 / k; tot += W[k]; }
    function share(cl, minK) { var s = 0, j; for (j = cl[0]; j <= cl[1]; j++) if (j >= minK) s += W[j]; return s / tot; }
    [['Sequencing, all sites', 1], ['Array, minimum MAF 5 %', 5], ['Array, minimum MAF 20 %', 20]].forEach(function (a) {
      var svg = panel(box, '', 160, 150, a[0]), kept = 0, oy = 8, h = 100;
      CL.forEach(function (cl, i) {
        var all = share(cl, 1), v = share(cl, a[1]), x = 12 + i * 29;
        kept += v;
        el('rect', { x: x, y: oy + h - all * 220, width: 24, height: all * 220, style: 'fill:var(--line)' }, svg);
        el('rect', { x: x, y: oy + h - v * 220, width: 24, height: v * 220, style: 'fill:var(--accent)' }, svg);
        el('text', { x: x + 12, y: oy + h + 13, 'text-anchor': 'middle', style: 'font-size:7px;font-family:var(--f-body);fill:var(--fg)' }, svg, CN[i]);
      });
      el('text', { x: 80, y: oy + h + 27, 'text-anchor': 'middle', style: 'font-size:7.5px;font-family:var(--f-body);fill:var(--muted)' }, svg, 'copies of rarer allele, of 100');
      box.lastChild.querySelector('.b-lab').innerHTML = '<b>' + a[0] + '</b>: ' + Math.round(kept * 1000) + ' of 1,000 sites kept';
    });
  })();
})();
