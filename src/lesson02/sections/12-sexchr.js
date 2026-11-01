(function(){
  var NS = 'http://www.w3.org/2000/svg';
  function $(id){ return document.getElementById(id); }
  function el(tag, attrs, parent, text){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgRoot(box, w, h, minw){
    box.innerHTML = '';
    var s = el('svg', {viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'img'});
    s.style.minWidth = minw + 'px'; s.style.display = 'block';
    box.appendChild(s); return s;
  }
  function press(btns, on){ btns.forEach(function(b){ b.setAttribute('aria-pressed', b === on ? 'true' : 'false'); }); }
  function fmt(x, d){ return x.toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d}); }
  // seeded RNG (mulberry32) so a given "animal" is reproducible
  function rng(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(r){ var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  /* ---------- 1. depth toy ---------- */
  (function(){
    var box = $('s12-dep-fig'); if (!box) return;
    var st = {sys: 'xy', sex: 'm', noise: 10, seed: 7, reveal: false, marked: {}};
    var CAT = {
      A:  {name: 'autosome', col: 'var(--accent)'},
      X:  {name: 'X', col: 'var(--bad)'},
      Y:  {name: 'Y', col: 'var(--rep)'},
      P:  {name: 'PAR', col: 'var(--good)'},
      H:  {name: 'unpurged haplotig', col: 'var(--het)'}
    };
    function names(){ return st.sys === 'xy' ? {X: 'X', Y: 'Y'} : {X: 'Z', Y: 'W'}; }
    function hetero(){ return (st.sys === 'xy' && st.sex === 'm') || (st.sys === 'zw' && st.sex === 'f'); }
    function build(){
      var r = rng(st.seed), list = [], i;
      var het = hetero();
      for (i = 0; i < 27; i++) list.push({c: 'A', len: 0.6 + r() * 4.4});
      for (i = 0; i < 6; i++) list.push({c: 'X', len: 0.6 + r() * 3.0});
      if (het) for (i = 0; i < 3; i++) list.push({c: 'Y', len: 0.2 + r() * 0.8});
      list.push({c: 'P', len: 0.5 + r() * 0.8});
      for (i = 0; i < 2; i++) list.push({c: 'H', len: 0.3 + r() * 0.9});
      while (list.length < 40) list.push({c: 'A', len: 0.6 + r() * 4.4});
      // shuffle
      for (i = list.length - 1; i > 0; i--){ var j = Math.floor(r() * (i + 1)); var t = list[i]; list[i] = list[j]; list[j] = t; }
      list.forEach(function(c, k){
        c.id = 'ctg' + (k + 1);
        var tru = 1;
        if (c.c === 'X') tru = het ? 0.5 : 1;
        if (c.c === 'Y' || c.c === 'H') tru = 0.5;
        c.tru = tru;
        c.z = Math.max(-2.5, Math.min(2.5, gauss(r))); // fixed per animal; scaled by noise slider
      });
      return list;
    }
    var contigs = build();
    function sexLinked(c){ return c.c === 'X' || c.c === 'Y'; }
    function draw(){
      var nm = names(), W = 760, H = 372, L = 54, R = 16, T = 12, PH = 210, HT = 266, HH = 80;
      var s = svgRoot(box, W, H, 500);
      var y = function(v){ return T + PH - Math.min(v, 1.6) / 1.6 * PH; };
      // grid
      [0, 0.5, 1, 1.5].forEach(function(v){
        el('line', {x1: L, x2: W - R, y1: y(v), y2: y(v), 'class': v === 0 ? 'ax' : 'grid'}, s);
        el('text', {x: L - 8, y: y(v) + 4, 'text-anchor': 'end'}, s, v.toFixed(1));
      });
      el('text', {x: 12, y: T + PH / 2, transform: 'rotate(-90 12 ' + (T + PH / 2) + ')', 'text-anchor': 'middle', 'class': 'lab'}, s, 'depth ÷ median');
      var dx = (W - L - R) / contigs.length;
      var hist = new Array(33).fill(0), histC = {};
      contigs.forEach(function(c, k){
        var v = Math.max(0.02, c.tru * (1 + c.z * st.noise / 100 / Math.sqrt(c.len)));
        c.obs = v;
        var cx = L + dx * (k + 0.5), cy = y(v), rad = 3 + Math.sqrt(c.len) * 3;
        var col = st.reveal ? CAT[c.c].col : 'var(--muted)';
        var g = el('g', {tabindex: 0, role: 'button', 'aria-label': c.id + ', depth ratio ' + v.toFixed(2)}, s);
        g.style.cursor = 'pointer';
        el('circle', {cx: cx, cy: cy, r: rad, fill: col, 'fill-opacity': st.reveal ? 0.85 : 0.45, stroke: 'none'}, g);
        if (st.marked[c.id]) el('circle', {cx: cx, cy: cy, r: rad + 3.5, fill: 'none', stroke: 'var(--fg)', 'stroke-width': 2}, g);
        if (st.reveal && st.marked[c.id] !== sexLinked(c) && (st.marked[c.id] || sexLinked(c)))
          el('text', {x: cx, y: cy - rad - 6, 'text-anchor': 'middle', 'class': 'lab'}, g, st.marked[c.id] ? '✗' : '?');
        var title = el('title', {}, g, c.id + ': ' + c.len.toFixed(1) + ' Mb, depth ratio ' + v.toFixed(2) + (st.reveal ? ' (' + (c.c === 'X' ? nm.X : c.c === 'Y' ? nm.Y : CAT[c.c].name) + ')' : ''));
        function tog(){ st.marked[c.id] = !st.marked[c.id]; draw(); }
        g.addEventListener('click', tog);
        g.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); tog(); } });
        var b = Math.min(31, Math.floor(v / 0.05));
        hist[b] += c.len;
        if (st.reveal){ histC[b] = histC[b] || {}; histC[b][c.c] = (histC[b][c.c] || 0) + c.len; }
      });
      el('text', {x: L, y: T + PH + 16}, s, 'contigs (dot size = length) — click to mark as sex-linked');
      // histogram (length-weighted)
      var hx = function(v){ return L + v / 1.6 * (W - L - R); };
      var maxh = Math.max.apply(null, hist) || 1;
      el('line', {x1: L, x2: W - R, y1: HT + HH, y2: HT + HH, 'class': 'ax'}, s);
      for (var b = 0; b < 32; b++){
        if (!hist[b]) continue;
        var x0 = hx(b * 0.05) + 1, bw = hx(0.05) - L - 2, yb = HT + HH;
        if (st.reveal){
          ['A', 'P', 'H', 'X', 'Y'].forEach(function(k){
            var v = (histC[b] || {})[k]; if (!v) return;
            var hgt = v / maxh * HH; yb -= hgt;
            el('rect', {x: x0, y: yb, width: bw, height: hgt, fill: CAT[k].col, 'fill-opacity': 0.85}, s);
          });
        } else {
          var hgt = hist[b] / maxh * HH;
          el('rect', {x: x0, y: yb - hgt, width: bw, height: hgt, fill: 'var(--muted)', 'fill-opacity': 0.6}, s);
        }
      }
      [0, 0.5, 1, 1.5].forEach(function(v){ el('text', {x: hx(v), y: HT + HH + 14, 'text-anchor': 'middle'}, s, v.toFixed(1)); });
      el('text', {x: L, y: HT - 6, 'class': 'lab'}, s, 'Mb of contigs per depth-ratio bin');
      // legend
      var lg = $('s12-dep-legend');
      if (lg){
        lg.innerHTML = '';
        if (st.reveal){
          ['A', 'X', 'Y', 'P', 'H'].forEach(function(k){
            if (k === 'Y' && !hetero()) return;
            var sp = document.createElement('span');
            var lab = k === 'X' ? nm.X : k === 'Y' ? nm.Y : CAT[k].name;
            sp.innerHTML = '<i style="background:' + CAT[k].col + ';height:10px;width:10px;border-radius:50%"></i>' + lab;
            lg.appendChild(sp);
          });
          var sp2 = document.createElement('span'); sp2.textContent = '✗ marked but not sex-linked · ? sex-linked but not marked'; lg.appendChild(sp2);
        } else {
          var sp3 = document.createElement('span'); sp3.textContent = 'grey = not yet revealed; ring = your mark'; lg.appendChild(sp3);
        }
      }
      // readout
      var out = $('s12-dep-out'); if (!out) return;
      var nMark = 0, tp = 0, fp = 0, nSex = 0, fpH = 0, mbHalf = 0;
      contigs.forEach(function(c){
        var m = !!st.marked[c.id], sl = sexLinked(c) && c.tru === 0.5;
        if (sl) nSex++;
        if (m){ nMark++; if (sl) tp++; else { fp++; if (c.c === 'H') fpH++; } }
        if (c.obs < 0.75) mbHalf += c.len;
      });
      var who = hetero() ? 'heterogametic (' + (st.sys === 'xy' ? 'XY male' : 'ZW female') + ')' : 'homogametic (' + (st.sys === 'xy' ? 'XX female' : 'ZZ male') + ')';
      var html = '<div>sequenced animal<b>' + who + '</b></div>' +
        '<div>Mb in contigs below 0.75 × median<b>' + fmt(mbHalf, 1) + ' Mb</b></div>' +
        '<div>your marks<b>' + nMark + '</b></div>';
      if (st.reveal){
        html += '<div>half-depth sex-linked contigs found<b>' + tp + ' of ' + nSex + '</b></div>' +
          '<div>false marks<b>' + fp + (fpH ? ' (' + fpH + ' haplotig' + (fpH > 1 ? 's' : '') + ')' : '') + '</b></div>';
        if (!hetero()) html += '<div>note<b style="font-size:13px;font-family:inherit">' + nm.X + ' is at full depth here: depth cannot find it; use synteny</b></div>';
      }
      out.innerHTML = html;
    }
    var bxy = $('s12-sys-xy'), bzw = $('s12-sys-zw'), bm = $('s12-sex-m'), bf = $('s12-sex-f');
    function reset(){ st.marked = {}; st.reveal = false; var rv = $('s12-reveal'); if (rv) rv.textContent = 'Show the truth'; contigs = build(); draw(); }
    if (bxy) bxy.addEventListener('click', function(){ st.sys = 'xy'; press([bxy, bzw], bxy); reset(); });
    if (bzw) bzw.addEventListener('click', function(){ st.sys = 'zw'; press([bxy, bzw], bzw); reset(); });
    if (bm) bm.addEventListener('click', function(){ st.sex = 'm'; press([bm, bf], bm); reset(); });
    if (bf) bf.addEventListener('click', function(){ st.sex = 'f'; press([bm, bf], bf); reset(); });
    var ns = $('s12-noise'), no = $('s12-noise-o');
    if (ns) ns.addEventListener('input', function(){ st.noise = +ns.value; if (no) no.textContent = ns.value + ' %'; draw(); });
    var nb = $('s12-new'); if (nb) nb.addEventListener('click', function(){ st.seed = Math.floor(Math.random() * 1e9); reset(); });
    var rv = $('s12-reveal'); if (rv) rv.addEventListener('click', function(){ st.reveal = !st.reveal; rv.textContent = st.reveal ? 'Hide the truth' : 'Show the truth'; draw(); });
    draw();
  })();

  /* ---------- 2. spectrum toy ---------- */
  (function(){
    var box = $('s12-sp-fig'); if (!box) return;
    var st = {male: true};
    var K = 21, COV = 30, A = 1000;
    function curve(mean, x){ var sd = Math.sqrt(mean * 1.6); return Math.exp(-0.5 * Math.pow((x - mean) / sd, 2)) / (sd * Math.sqrt(2 * Math.PI)); }
    function draw(){
      var h = +$('s12-sp-het').value / 100, xs = +$('s12-sp-x').value / 100, ys = +$('s12-sp-y').value / 100;
      $('s12-sp-het-o').textContent = fmt(h * 100, 2) + ' %';
      $('s12-sp-x-o').textContent = fmt(xs * 100, 1) + ' % (' + fmt(xs * A, 0) + ' Mb)';
      $('s12-sp-y-o').textContent = st.male ? fmt(ys * 100, 1) + ' % (' + fmt(ys * A, 0) + ' Mb)' : 'absent in a female';
      $('s12-sp-y').disabled = !st.male;
      var X = xs * A, Y = st.male ? ys * A : 0;
      var dip = A + (st.male ? 0 : X);           // diploid-behaving sequence (Mb)
      var p = 1 - Math.pow(1 - h, K);            // share of positions whose k-mer covers >=1 het site
      var het = 2 * dip * p, hom = dip * (1 - p), hemi = st.male ? X + Y : 0; // distinct k-mers (millions)
      // apparent heterozygosity from peak ratio
      var R = (het + hemi) / Math.max(hom, 1e-9), pa = R / (2 + R), ha = 1 - Math.pow(1 - pa, 1 / K);
      var est = (het + hemi) * 0.5 + hom;        // sum(x*n)/hom-peak, in Mb
      var asm = A + X + Y;
      var W = 760, H = 300, L = 56, Rr = 16, T = 14, B = 40, xmax = 60;
      var s = svgRoot(box, W, H, 520);
      var xp = function(x){ return L + x / xmax * (W - L - Rr); };
      var N = 240, pts = [], ymax = 0, i, x;
      for (i = 0; i <= N; i++){
        x = 1 + i * (xmax - 1) / N;
        var a = het * curve(COV / 2, x), b = hemi * curve(COV / 2, x), c = hom * curve(COV, x);
        pts.push([x, a, b, c]); ymax = Math.max(ymax, a + b + c);
      }
      ymax *= 1.1;
      var yp = function(v){ return T + (H - T - B) * (1 - v / ymax); };
      el('line', {x1: L, x2: W - Rr, y1: yp(0), y2: yp(0), 'class': 'ax'}, s);
      el('line', {x1: L, x2: L, y1: T, y2: yp(0), 'class': 'ax'}, s);
      [0, 10, 15, 20, 30, 40, 50, 60].forEach(function(t){ el('text', {x: xp(t), y: H - B + 16, 'text-anchor': 'middle'}, s, t); });
      el('text', {x: (L + W - Rr) / 2, y: H - 6, 'text-anchor': 'middle', 'class': 'lab'}, s, 'k-mer coverage (times seen)');
      el('text', {x: 14, y: (T + H - B) / 2, transform: 'rotate(-90 14 ' + ((T + H - B) / 2) + ')', 'text-anchor': 'middle', 'class': 'lab'}, s, 'distinct k-mers');
      function area(fn, col){
        var d = 'M' + xp(pts[0][0]) + ',' + yp(fn(pts[0], 0));
        pts.forEach(function(q){ d += 'L' + xp(q[0]).toFixed(1) + ',' + yp(fn(q, 1)).toFixed(1); });
        for (var j = pts.length - 1; j >= 0; j--) d += 'L' + xp(pts[j][0]).toFixed(1) + ',' + yp(fn(pts[j], 0)).toFixed(1);
        el('path', {d: d + 'Z', fill: col, 'fill-opacity': 0.55, stroke: 'none'}, s);
      }
      // stacked: het (bottom), hemi on top of het, hom separately from 0
      area(function(q, top){ return top ? q[3] : 0; }, 'var(--accent)');
      area(function(q, top){ return top ? q[1] : 0; }, 'var(--het)');
      area(function(q, top){ return top ? q[1] + q[2] : q[1]; }, 'var(--bad)');
      var d = '';
      pts.forEach(function(q, k){ d += (k ? 'L' : 'M') + xp(q[0]).toFixed(1) + ',' + yp(q[1] + q[2] + q[3]).toFixed(1); });
      el('path', {d: d, fill: 'none', stroke: 'var(--fg)', 'stroke-width': 1.4}, s);
      el('text', {x: xp(COV / 2), y: T + 10, 'text-anchor': 'middle', 'class': 'lab'}, s, 'het peak (15×)');
      el('text', {x: xp(COV), y: T + 10, 'text-anchor': 'middle', 'class': 'lab'}, s, 'hom peak (30×)');
      var out = $('s12-sp-out');
      out.innerHTML =
        '<div>true heterozygosity<b>' + fmt(h * 100, 2) + ' %</b></div>' +
        '<div>apparent heterozygosity from the peaks<b style="color:' + (ha > h * 1.15 + 0.0002 ? 'var(--bad)' : 'var(--fg)') + '">' + fmt(ha * 100, 2) + ' %</b></div>' +
        '<div>k-mer size estimate<b>' + fmt(est, 0) + ' Mb</b></div>' +
        '<div>this animal\'s assembly would hold<b>' + fmt(asm, 0) + ' Mb</b></div>' +
        '<div>share of the het peak that is X/Y<b>' + (het + hemi > 0 ? fmt(100 * hemi / (het + hemi), 0) : '0') + ' %</b></div>';
    }
    var bm = $('s12-sp-m'), bf = $('s12-sp-f');
    if (bm) bm.addEventListener('click', function(){ st.male = true; press([bm, bf], bm); draw(); });
    if (bf) bf.addEventListener('click', function(){ st.male = false; press([bm, bf], bf); draw(); });
    ['s12-sp-het', 's12-sp-x', 's12-sp-y'].forEach(function(id){ var e = $(id); if (e) e.addEventListener('input', draw); });
    draw();
  })();

  /* ---------- 3. haplotype placement toy ---------- */
  (function(){
    var box = $('s12-hp-fig'); if (!box) return;
    var st = {mode: 'trio', sys: 'xy', seed: 3};
    var modeBtns = Array.prototype.slice.call(document.querySelectorAll('[data-s12m]'));
    var sysBtns = Array.prototype.slice.call(document.querySelectorAll('[data-s12s]'));
    var shuf = $('s12-hp-shuffle');
    var PAT = 'var(--accent)', MAT = 'var(--het)', MIX = 'var(--muted)', PARC = 'var(--bad)';
    function draw(){
      var xy = st.sys === 'xy';
      // sex chromosomes of the heterogametic child: [name, parent, length]
      var big = xy ? {n: 'X', from: MAT} : {n: 'Z', from: PAT};
      var small = xy ? {n: 'Y', from: PAT} : {n: 'W', from: MAT};
      var r = rng(st.seed);
      var narrow = (box.clientWidth || 760) < 560;
      var titles, rows = [[], []]; // each item: {lab, len, col, par:'start'|'none', frag}
      var autos = [{n: 'chr1', L: 1}, {n: 'chr2', L: 0.8}, {n: 'chr3', L: 0.6}];
      var note = '';
      if (st.mode === 'trio'){
        titles = ['hap1 = paternal (-1 pat.yak)', 'hap2 = maternal (-2 mat.yak)'];
        autos.forEach(function(a){ rows[0].push({lab: a.n, len: a.L, col: PAT}); rows[1].push({lab: a.n, len: a.L, col: MAT}); });
        var sx = {lab: big.n, len: 0.75, col: big.from, par: true}, sy = {lab: small.n, len: 0.3, col: small.from, par: true};
        rows[big.from === PAT ? 0 : 1].push(sx); rows[small.from === PAT ? 0 : 1].push(sy);
        note = xy ? 'The son\'s Y comes from his father, the X from his mother: Y in hap1, X in hap2. Neither haplotype holds both, so a reference needs the missing one added (the VGP added the heterogametic sex chromosome from the unchosen haplotype). hap1 is larger when the Y is big.'
                  : 'The daughter\'s Z comes from her father, the W from her mother: Z in hap1 (paternal), W in hap2 (maternal), as in the VGP zebra finch trio.';
      } else if (st.mode === 'hic'){
        titles = ['hap1 (Hi-C phased)', 'hap2 (Hi-C phased)'];
        autos.forEach(function(a){ var f = r() < 0.5; rows[0].push({lab: a.n, len: a.L, col: f ? PAT : MAT}); rows[1].push({lab: a.n, len: a.L, col: f ? MAT : PAT}); });
        var flip = r() < 0.5;
        rows[flip ? 1 : 0].push({lab: big.n, len: 0.75, col: big.from, par: true});
        rows[flip ? 0 : 1].push({lab: small.n, len: 0.3, col: small.from, par: true});
        note = 'Each chromosome stays whole within one haplotype, but which parent ends up in hap1 is random per chromosome. Here ' + big.n + ' is in ' + (flip ? 'hap2' : 'hap1') + ' and ' + small.n + ' in ' + (flip ? 'hap1' : 'hap2') + '. Press "re-run Hi-C phasing" to see another equally valid outcome.';
      } else {
        titles = ['primary (p_ctg)', 'alternate (a_ctg)'];
        autos.forEach(function(a){ rows[0].push({lab: a.n, len: a.L, col: MIX}); rows[1].push({lab: a.n + ' pieces', len: a.L * 0.35, col: MIX, frag: true}); });
        rows[0].push({lab: big.n, len: 0.75, col: big.from, par: true});
        rows[0].push({lab: small.n + ' (no PAR)', len: 0.27, col: small.from});
        rows[1].push({lab: 'PAR copy', len: 0.06, col: PARC});
        note = 'Divergent ' + big.n + ' and ' + small.n + ' sequence has no allelic partner, so both stay in the primary at half depth. The PAR copy in the alternate is our inference, not documented by hifiasm: the PAR is a true allelic pair, so we expect one copy in the primary and the other in the alternate (or purged); very similar young gametologs may be treated the same way. Autosomes are one mosaic copy, switching between parents; the alternate holds only pieces of the other allele.';
      }
      var nmax = Math.max(rows[0].length, rows[1].length), colH = 40 + nmax * 30 + 6;
      var W = narrow ? 380 : 760, H = narrow ? 2 * colH + 26 : colH + 16;
      var s = svgRoot(box, W, H, narrow ? 300 : 540);
      var colW = narrow ? 350 : 330;
      var colX = narrow ? [25, 25] : [40, 410], colY = narrow ? [8, colH + 18] : [8, 8];
      [0, 1].forEach(function(c){
        el('rect', {x: colX[c] - 10, y: colY[c], width: colW + 10, height: colH, rx: 4, fill: 'var(--panel)', stroke: 'var(--line)'}, s);
        el('text', {x: colX[c], y: colY[c] + 20, 'class': 'lab'}, s, titles[c]);
        var y = colY[c] + 36;
        rows[c].forEach(function(it){
          var w = it.len * 240;
          el('text', {x: colX[c], y: y + 12}, s, it.lab);
          var x0 = colX[c] + 82;
          if (it.frag){
            for (var k = 0; k < 4; k++) el('rect', {x: x0 + k * (w / 4 + 6), y: y + 2, width: Math.max(4, w / 4 - 2), height: 12, rx: 3, fill: it.col, 'fill-opacity': 0.8}, s);
          } else {
            el('rect', {x: x0, y: y + 2, width: w, height: 12, rx: 4, fill: it.col, 'fill-opacity': 0.85}, s);
            if (it.par) el('rect', {x: x0, y: y + 2, width: Math.max(6, w * 0.06), height: 12, rx: 2, fill: PARC}, s);
          }
          y += 30;
        });
      });
      var nt = $('s12-hp-note'); if (nt) nt.textContent = note;
      if (shuf) shuf.style.display = st.mode === 'hic' ? '' : 'none';
    }
    modeBtns.forEach(function(b){ b.addEventListener('click', function(){ st.mode = b.getAttribute('data-s12m'); press(modeBtns, b); draw(); }); });
    sysBtns.forEach(function(b){ b.addEventListener('click', function(){ st.sys = b.getAttribute('data-s12s'); press(sysBtns, b); draw(); }); });
    if (shuf) shuf.addEventListener('click', function(){ st.seed = Math.floor(Math.random() * 1e9); draw(); });
    var lastNarrow = null;
    window.addEventListener('resize', function(){ var n = (box.clientWidth || 760) < 560; if (n !== lastNarrow){ lastNarrow = n; draw(); } });
    draw();
  })();
})();
