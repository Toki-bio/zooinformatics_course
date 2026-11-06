(function () {
  'use strict';
  // ENGINE-BEGIN
  function rng(seed){var a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  // p-distance matrix from a list of column indices (a resample is just such a list)
  function pdist(seqs, cols){var n=seqs.length,D=[],i,j,k;for(i=0;i<n;i++){D.push(new Array(n).fill(0));}
    for(i=0;i<n;i++)for(j=i+1;j<n;j++){var d=0;for(k=0;k<cols.length;k++)if(seqs[i][cols[k]]!==seqs[j][cols[k]])d++;D[i][j]=D[j][i]=d/cols.length;}return D;}
  // Neighbour joining (Saitou & Nei 1987). Returns the splits as strings "ABC|DEF"; the first group is the side that does not contain taxon 0.
  function nj(D0, names){var n=D0.length,D=D0.map(function(r){return r.slice();}),act=[],i,j,sets={},splits=[];
    for(i=0;i<n;i++){act.push(i);sets[i]=[i];}
    var next=n;
    while(act.length>3){var m=act.length,R={};
      act.forEach(function(a){var s=0;act.forEach(function(b){if(a!==b)s+=D[a][b];});R[a]=s;});
      var best=Infinity,bi=-1,bj=-1;
      for(i=0;i<m;i++)for(j=i+1;j<m;j++){var a=act[i],b=act[j],q=(m-2)*D[a][b]-R[a]-R[b];if(q<best-1e-12){best=q;bi=a;bj=b;}}
      var u=next++;D[u]=D[u]||{};
      act.forEach(function(c){if(c!==bi&&c!==bj){var d=(D[bi][c]+D[bj][c]-D[bi][bj])/2;D[u][c]=d;D[c][u]=d;}});
      sets[u]=sets[bi].concat(sets[bj]);
      if(sets[u].length>=2&&sets[u].length<=n-2)splits.push(sets[u].slice());
      act=act.filter(function(c){return c!==bi&&c!==bj;});act.push(u);}
    return splits.map(function(s){var inS={};s.forEach(function(x){inS[x]=1;});
      var side=inS[0]?names.map(function(_,x){return x;}).filter(function(x){return !inS[x];}):s.slice();
      side.sort(function(a,b){return a-b;});return side.map(function(x){return names[x];}).join('')+'|'+names.filter(function(_,x){return side.indexOf(x)<0;}).join('');});}
  function resample(n,r){var c=[],i;for(i=0;i<n;i++)c.push(Math.floor(r()*n));return c;}
  // ENGINE-END

  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  var NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];
  // Toy alignment: simulated (JC-type model) on an invented tree, 30 columns.
  var SEQS = ['CCGCTCGATTCACAACCGCGTTCTGTCAAG', 'CCGCTCGAACCACAATCGCTTTCTGTCAAG', 'CCGCGCGCTGAATAACCTAGCTCTGCCAAG',
              'GCGCACGATGCATAACCTCGCCCTGCCAAG', 'GCGCACGATGCATAGCCTCGCCCTGCCAAG', 'CAGCACGTTGACTATCCGAGCTGTCTCAAA'];
  var N = SEQS[0].length, SEED = 2026;
  var BASECOL = { A: 'var(--accent)', C: 'var(--good)', G: 'var(--het)', T: 'var(--rep)' };
  var origCols = []; for (var q = 0; q < N; q++) origCols.push(q);
  var orig = nj(pdist(SEQS, origCols), NAMES);       // splits of the tree from the original data
  var rand, counts, total, distinctSum, last;
  function reset() { rand = rng(SEED); counts = {}; total = 0; distinctSum = 0; last = null; }
  function once() {
    var cols = resample(N, rand), seen = {}, d = 0, i;
    for (i = 0; i < cols.length; i++) if (!seen[cols[i]]) { seen[cols[i]] = 1; d++; }
    var sp = nj(pdist(SEQS, cols), NAMES);
    sp.forEach(function (s) { counts[s] = (counts[s] || 0) + 1; });
    total++; distinctSum += d / N;
    last = { cols: cols, distinct: d, splits: sp };
  }
  var CW = 17, CH = 17, LX = 26;
  function drawAln() {
    var box = $('s07-aln'); box.innerHTML = '';
    var W = LX + N * CW + 8, H = 20 + 6 * CH + 26 + 28 + 6 * CH + 10;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: 'min-width:' + W + 'px' }, box);
    var drawn = {}; if (last) last.cols.forEach(function (c) { drawn[c] = (drawn[c] || 0) + 1; });
    el('text', { x: 2, y: 11, fill: 'var(--muted)', 'font-size': 11 }, svg, 'Original alignment (column numbers above)');
    var y0 = 16, r, c;
    for (c = 0; c < N; c++) if ((c + 1) % 5 === 0 || c === 0) el('text', { x: LX + c * CW + CW / 2, y: y0 + 6, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 9 }, svg, String(c + 1));
    y0 += 8;
    for (r = 0; r < 6; r++) {
      el('text', { x: 4, y: y0 + r * CH + 13, fill: 'var(--fg)', 'font-size': 12, 'font-weight': 'bold' }, svg, NAMES[r]);
      for (c = 0; c < N; c++) {
        var miss = last && !drawn[c];
        el('rect', { x: LX + c * CW, y: y0 + r * CH, width: CW - 1, height: CH - 1, fill: BASECOL[SEQS[r][c]], 'fill-opacity': miss ? 0.1 : 0.4 }, svg);
        el('text', { x: LX + c * CW + CW / 2 - 0.5, y: y0 + r * CH + 12, 'text-anchor': 'middle', fill: 'var(--fg)', 'font-size': 11, opacity: miss ? 0.35 : 1 }, svg, SEQS[r][c]);
      }
    }
    var yd = y0 + 6 * CH + 12;
    el('text', { x: 2, y: yd, fill: 'var(--muted)', 'font-size': 10 }, svg, last ? 'times each column was drawn (0 = left out, shown in red)' : 'press a button to draw a resample');
    if (last) for (c = 0; c < N; c++) el('text', { x: LX + c * CW + CW / 2 - 0.5, y: yd + 12, 'text-anchor': 'middle', fill: drawn[c] ? 'var(--fg)' : 'var(--err)', 'font-size': 11, 'font-weight': drawn[c] ? 'normal' : 'bold' }, svg, String(drawn[c] || 0));
    if (!last) { svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (yd + 8)); return; }
    var y1 = yd + 26;
    el('text', { x: 2, y: y1, fill: 'var(--muted)', 'font-size': 11 }, svg, 'Latest resample: ' + N + ' draws in the order drawn (original column number above)');
    y1 += 4;
    for (c = 0; c < N; c++) el('text', { x: LX + c * CW + CW / 2, y: y1 + 8, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 8 }, svg, String(last.cols[c] + 1));
    y1 += 11;
    for (r = 0; r < 6; r++) {
      el('text', { x: 4, y: y1 + r * CH + 13, fill: 'var(--fg)', 'font-size': 12, 'font-weight': 'bold' }, svg, NAMES[r]);
      for (c = 0; c < N; c++) {
        var b = SEQS[r][last.cols[c]];
        el('rect', { x: LX + c * CW, y: y1 + r * CH, width: CW - 1, height: CH - 1, fill: BASECOL[b], 'fill-opacity': 0.4 }, svg);
        el('text', { x: LX + c * CW + CW / 2 - 0.5, y: y1 + r * CH + 12, 'text-anchor': 'middle', fill: 'var(--fg)', 'font-size': 11 }, svg, b);
      }
    }
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (y1 + 6 * CH + 6));
  }
  function pretty(s) { return s.replace('|', ' | '); }
  function drawSplits() {
    var box = $('s07-splits'); box.innerHTML = '';
    var keys = Object.keys(counts); orig.forEach(function (s) { if (keys.indexOf(s) < 0) keys.push(s); });
    keys.sort(function (a, b) { var ra = orig.indexOf(a) >= 0, rb = orig.indexOf(b) >= 0; if (ra !== rb) return ra ? -1 : 1; return (counts[b] || 0) - (counts[a] || 0) || (a < b ? -1 : 1); });
    keys.slice(0, 10).forEach(function (s) {
      var isRef = orig.indexOf(s) >= 0, pct = total ? 100 * (counts[s] || 0) / total : 0;
      var row = document.createElement('div'); row.className = 's07-row';
      var nm = document.createElement('span'); nm.className = 's07-name'; nm.textContent = pretty(s); row.appendChild(nm);
      var bar = document.createElement('div'); bar.className = 's07-bar';
      var fill = document.createElement('i'); if (isRef) fill.className = 's07-ref'; fill.style.width = pct + '%'; bar.appendChild(fill);
      var mark = document.createElement('b'); mark.style.left = '95%'; bar.appendChild(mark); row.appendChild(bar);
      var v = document.createElement('span'); v.textContent = total ? pct.toFixed(1) + ' %' : '-'; row.appendChild(v);
      var tag = document.createElement('div'); tag.className = 's07-tag'; tag.style.margin = '-.15em 0 .3em';
      tag.textContent = isRef ? 'in the tree from the original data: this percentage is its bootstrap support' : 'not in the original tree: a rival grouping that some resamples prefer';
      box.appendChild(row); box.appendChild(tag);
    });
    var lg = document.createElement('div'); lg.className = 's07-tag'; lg.textContent = 'Dashed red line: 95 %, the level Felsenstein suggested (see below). Dark bars are branches of the original tree.';
    box.appendChild(lg);
  }
  function readouts() {
    var exact = 1 - Math.pow(1 - 1 / N, N);
    if (!last) { $('s07-read1').textContent = 'No resample drawn yet. Press "Draw 1 resample".'; }
    else {
      $('s07-read1').innerHTML = '<span>Latest resample: <strong>' + last.distinct + ' of ' + N + '</strong> original columns present (' + (100 * last.distinct / N).toFixed(0) + ' %); the other ' + (N - last.distinct) + ' draws are repeats. The tree from this resample has the splits: <strong>' + last.splits.map(pretty).join(', ') + '</strong>.</span>';
    }
    $('s07-read2').innerHTML = total ? ('<span>Resamples so far: <strong>' + total + '</strong>. Average share of original columns present: <strong>' + (100 * distinctSum / total).toFixed(1) + ' %</strong>. Exact expectation for ' + N + ' columns, 1 &minus; (1 &minus; 1/' + N + ')<sup>' + N + '</sup>: <strong>' + (100 * exact).toFixed(2) + ' %</strong>; limit for many columns, 1 &minus; 1/<i>e</i>: <strong>63.21 %</strong>.</span>') : '';
  }
  function show() { drawAln(); drawSplits(); readouts(); }
  function run(k) { for (var i = 0; i < k; i++) once(); show(); }
  $('s07-b1').addEventListener('click', function () { run(1); });
  $('s07-b100').addEventListener('click', function () { run(100); });
  $('s07-b1000').addEventListener('click', function () { run(1000); });
  $('s07-reset').addEventListener('click', function () { reset(); show(); });
  reset(); show();
})();
