(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function clear(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  function tip(word, text) { return '<span class="tip" title="' + text.replace(/"/g, '&quot;') + '">' + word + '</span>'; }

  var div = $('s10-div'), sz = $('s10-sz'), svg = $('s10-svg'), out = $('s10-out'), verdict = $('s10-verdict'), btn = $('s10-new');
  if (!div || !sz || !svg || !out || !verdict || !btn) return;

  var L = 20000, K = 21, SIZES = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  var BASES = 'ACGT', COMP = { A: 'T', C: 'G', G: 'C', T: 'A' };
  var seed = 12345, A, U, SUB, hashA, hashSeed;   // sequence A, per-position random numbers, per-position substitute

  function rng(s) { // mulberry32
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rc(s) { var r = ''; for (var i = s.length - 1; i >= 0; i--) r += COMP[s.charAt(i)]; return r; }
  function hash32(str, sd) { // FNV-1a, then the murmur3 finaliser
    var h = (0x811C9DC5 ^ sd) >>> 0;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    h ^= h >>> 16; h = Math.imul(h, 0x85EBCA6B) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35) >>> 0; h ^= h >>> 16;
    return h >>> 0;
  }
  function kmers(seq) { // canonical k-mers, as a Map string -> hash
    var m = {}, n = 0;
    for (var i = 0; i + K <= seq.length; i++) {
      var f = seq.substr(i, K), r = rc(f), c = f < r ? f : r;
      if (!(c in m)) { m[c] = 1; n++; }
    }
    return m;
  }
  function hashesOf(seq) { // sorted array of distinct hashes of canonical k-mers, plus the k-mer keys
    var m = kmers(seq), keys = Object.keys(m), h = new Array(keys.length);
    for (var i = 0; i < keys.length; i++) h[i] = hash32(keys[i], hashSeed);
    return { keys: keys, hashes: h };
  }
  function bottom(hs, s) { // s smallest distinct hashes, ascending
    var a = hs.slice().sort(function (x, y) { return x - y; }), o = [];
    for (var i = 0; i < a.length && o.length < s; i++) if (i === 0 || a[i] !== a[i - 1]) o.push(a[i]);
    return o;
  }
  // Mash's merge: walk both sorted sketches, stop after s distinct hashes, count those present in both.
  function mashJ(sa, sb, s) {
    var i = 0, j = 0, seen = 0, shared = 0, last = 0;
    while (seen < s && (i < sa.length || j < sb.length)) {
      var a = i < sa.length ? sa[i] : Infinity, b = j < sb.length ? sb[j] : Infinity;
      if (a === b) { shared++; last = a; i++; j++; }
      else if (a < b) { last = a; i++; } else { last = b; j++; }
      seen++;
    }
    return { x: shared, n: seen, j: seen ? shared / seen : 0, last: last };
  }
  function mashD(j) { return j <= 0 ? 1 : (j >= 1 ? 0 : -Math.log(2 * j / (1 + j)) / K); }
  function pct(x, d) { return (100 * x).toFixed(d === undefined ? 2 : d) + ' %'; }

  function build() {
    var r = rng(seed), i;
    A = ''; U = []; SUB = [];
    for (i = 0; i < L; i++) { A += BASES.charAt(Math.floor(r() * 4)); U.push(r()); SUB.push(1 + Math.floor(r() * 3)); }
    hashSeed = Math.floor(r() * 4294967296) >>> 0;
    hashA = hashesOf(A);
  }
  function mutate(d) {
    var b = A.split(''), n = 0;
    for (var i = 0; i < L; i++) if (U[i] < d) { b[i] = BASES.charAt((BASES.indexOf(b[i]) + SUB[i]) % 4); n++; }
    return { seq: b.join(''), n: n };
  }

  function draw() {
    var d = +div.value / 1000, s = SIZES[+sz.value];
    $('s10-divv').textContent = (100 * d).toFixed(1) + ' %';
    $('s10-szv').textContent = s;
    var mu = mutate(d), hb = hashesOf(mu.seq);
    // truth: exact Jaccard on the full canonical k-mer sets
    var setA = {}, ka = hashA.keys, kb = hb.keys, inter = 0, i;
    for (i = 0; i < ka.length; i++) setA[ka[i]] = 1;
    for (i = 0; i < kb.length; i++) if (setA[kb[i]]) inter++;
    var uni = ka.length + kb.length - inter, jTrue = inter / uni;
    // sketches
    var sa = bottom(hashA.hashes, s), sb = bottom(hb.hashes, s), m = mashJ(sa, sb, s);
    var dTrueJ = mashD(jTrue), dEst = mashD(m.j), realised = mu.n / L;

    // picture: ticks on the hash axis 0 .. last hash reached by the merge
    clear(svg);
    var X0 = 20, X1 = 880, max = m.last || 1, inB = {}, inA = {};
    sa.forEach(function (h) { inA[h] = 1; }); sb.forEach(function (h) { inB[h] = 1; });
    el('text', { x: X0, y: 16, 'class': 'lab' }, svg, 'sketch of A');
    el('text', { x: X0, y: 160, 'class': 'lab' }, svg, 'sketch of B');
    el('line', { x1: X0, x2: X1, y1: 80, y2: 80, 'class': 'ax' }, svg);
    el('text', { x: X1, y: 160, 'text-anchor': 'end' }, svg, 'hash value: 0 at left, largest one reached by the merge at right');
    function tick(h, row) {
      if (h > max) return;
      var x = X0 + (X1 - X0) * h / max, both = inA[h] && inB[h];
      var col = both ? 'var(--rep)' : (row === 0 ? 'var(--accent)' : 'var(--het)');
      if (row === 0) el('line', { x1: x, x2: x, y1: 24, y2: 70, style: 'stroke:' + col + ';stroke-width:1.2;opacity:' + (both ? 1 : .85) }, svg);
      else el('line', { x1: x, x2: x, y1: 90, y2: 136, style: 'stroke:' + col + ';stroke-width:1.2;opacity:' + (both ? 1 : .85) }, svg);
      if (both && row === 0) el('line', { x1: x, x2: x, y1: 70, y2: 90, style: 'stroke:var(--rep);stroke-width:1;stroke-dasharray:2 2' }, svg);
    }
    sa.forEach(function (h) { tick(h, 0); });
    sb.forEach(function (h) { tick(h, 1); });

    out.innerHTML =
      '<div>true divergence in this pair<b>' + pct(realised, 2) + '</b></div>' +
      '<div>' + tip('true Jaccard', 'Shared k-mers divided by all different k-mers, counted over the complete sets of both sequences. Section 10, simple explanation above.') + '<b>' + jTrue.toFixed(4) + '</b></div>' +
      '<div>' + tip('estimated Jaccard', 'From the two sketches only: shared hashes divided by the number of different hashes seen in the merge (at most s).') + ' (' + m.x + ' of ' + m.n + ')<b>' + m.j.toFixed(4) + '</b></div>' +
      '<div>' + tip('Mash distance from the true Jaccard', 'The formula D = -(1/k) ln(2j/(1+j)) applied to the exact Jaccard index. This is the best any sketch can approach.') + '<b>' + pct(dTrueJ, 2) + '</b></div>' +
      '<div>' + tip('Mash distance from the sketches', 'The same formula applied to the estimated Jaccard index. D = 1 (100 %) when no shared hash was found.') + '<b>' + pct(dEst, 2) + '</b></div>' +
      '<div>' + tip('error bound, 1/&radic;s', 'The Mash documentation gives the error bound of a distance estimate from a sketch of size s as the square root of 1/s.') + '<b>' + Math.sqrt(1 / s).toFixed(3) + '</b></div>';

    var t;
    if (m.x === 0) t = 'No hash is shared in the merged sample, so the estimated Jaccard index is 0 and the distance is reported as 100 %. The true Jaccard index is ' + jTrue.toFixed(4) + (jTrue > 0 ? ': a larger sketch would have caught some shared k-mers.' : '.');
    else t = 'The sketch estimate is ' + (m.j > jTrue ? 'above' : (m.j < jTrue ? 'below' : 'equal to')) + ' the truth by ' + Math.abs(m.j - jTrue).toFixed(4) + ' in Jaccard, which moves the distance from ' + pct(dTrueJ, 2) + ' to ' + pct(dEst, 2) + '. The exact-Jaccard distance (' + pct(dTrueJ, 2) + ') is close to the divergence you set (' + pct(realised, 2) + ') as long as it is small, as the model behind the formula assumes.';
    verdict.innerHTML = t;
  }

  div.addEventListener('input', draw);
  sz.addEventListener('input', draw);
  btn.addEventListener('click', function () { seed = (seed * 1103515245 + 12345) >>> 0; build(); draw(); });
  build(); draw();
})();
