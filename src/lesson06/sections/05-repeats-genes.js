(function(){
  var wrap = document.getElementById('s05-wrap');
  if (!wrap) return;
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function(id){ return document.getElementById(id); };

  // ---------- seeded random numbers ----------
  function rng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function poisson(r, lam){ if (lam <= 0) return 0; var L = Math.exp(-lam), k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }
  function binom(r, n, p){ var k = 0; for (var i = 0; i < n; i++) if (r() < p) k++; return k; }
  function clamp(x, a, b){ return x < a ? a : x > b ? b : x; }
  function gauss(r){ return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()); }

  // ---------- the toy genome (built once) ----------
  var G = 2000000;                       // chromosome length, bp
  var ANCHOR = 100;                      // bases of unique flank a read needs to be placed
  var CPG_DECAY = 6;                     // CpG sites change 6x faster than other sites (toy)
  var FAM = {
    sine: { name: 'SINE-like', len: 300, cpgPerKb: 40, col: 'var(--het)' },
    l1:   { name: 'L1-like', len: 6000, cpgPerKb: 16, col: 'var(--rep)' },
    ltr:  { name: 'LTR-like', len: 1500, cpgPerKb: 22, col: 'var(--bad)' }
  };
  var GRP = [
    { key: 'act', name: 'active, with island', col: 'var(--accent)', n: 20, isl: 0.03, body: 0.86 },
    { key: 'sil', name: 'silent, island unmethylated', col: 'var(--het)', n: 8, isl: 0.05, body: 0.62 },
    { key: 'met', name: 'silenced, island methylated', col: 'var(--bad)', n: 4, isl: 0.85, body: 0.62 },
    { key: 'noi', name: 'no island (CpG-poor promoter)', col: 'var(--rep)', n: 8, isl: null, body: 0.78 }
  ];
  var SAT = { s: 1200000, e: 1300000, mono: 170, dclose: 0.0001, dip: [1238000, 1248000] };

  var genes = [], tes = [], cpgs = [], occ = [];
  function free(s, e){ for (var i = 0; i < occ.length; i++) if (s < occ[i][1] && e > occ[i][0]) return false; return true; }

  (function build(){
    var r = rng(20261101);
    occ.push([SAT.s - 2000, SAT.e + 2000]);
    // genes: kinds in a shuffled order, placed without overlap (5 kb clear upstream)
    var kinds = [];
    GRP.forEach(function(g, gi){ for (var i = 0; i < g.n; i++) kinds.push(gi); });
    for (var i = kinds.length - 1; i > 0; i--){ var j = Math.floor(r() * (i + 1)); var t = kinds[i]; kinds[i] = kinds[j]; kinds[j] = t; }
    kinds.forEach(function(gi){
      for (var tries = 0; tries < 500; tries++){
        var len = 8000 + Math.floor(r() * 42000);
        var s = 20000 + Math.floor(r() * (G - 80000));
        var e = s + len;
        if (!free(s - 6000, e + 6000)) continue;
        var strand = r() < 0.5 ? '+' : '-';
        var tss = strand === '+' ? s : e;
        genes.push({ s: s, e: e, strand: strand, tss: tss, g: gi,
          isl: GRP[gi].isl === null ? null : [tss - (strand === '+' ? 700 : 500), tss + (strand === '+' ? 500 : 700)] });
        occ.push([s - 6000, e + 6000]);
        break;
      }
    });
    genes.sort(function(a, b){ return a.s - b.s; });
    var gocc = occ.slice();               // TEs may sit in introns, but not on islands or promoters
    occ = [[SAT.s - 2000, SAT.e + 2000]];
    genes.forEach(function(g){ occ.push([g.tss - 1500, g.tss + 1500]); });
    // transposon copies
    function addTE(fam, d, full){
      var F = FAM[fam], len = F.len;
      if (fam === 'l1' && !full) len = 900 + Math.floor(r() * 4200);       // 5'-truncated copy
      for (var tries = 0; tries < 500; tries++){
        var s = 5000 + Math.floor(r() * (G - 20000)), e = s + len;
        if (!free(s - 200, e + 200)) continue;
        occ.push([s, e]);
        // distance to the closest other copy of the family: much smaller than to the consensus (toy)
        tes.push({ fam: fam, s: s, e: e, d: d, full: fam !== 'l1' || full, dclose: Math.max(0.001, d * 0.3), strand: r() < 0.5 ? '+' : '-' });
        return tes[tes.length - 1];
      }
    }
    addTE('l1', 0.003, true);                                   // the jump target: a young full-length copy
    var i;
    for (i = 0; i < 219; i++) addTE('sine', Math.pow(r(), 1.3) * 0.32);
    for (i = 0; i < 89; i++){ var d = Math.pow(r(), 1.6) * 0.30; addTE('l1', d, d < 0.04 ? r() < 0.7 : r() < 0.08); }
    for (i = 0; i < 60; i++) addTE('ltr', 0.02 + r() * 0.28);
    tes.sort(function(a, b){ return a.s - b.s; });
    tes.forEach(function(t, k){ t.id = k; });

    // CpGs. Background: about 1 per 100 bp, true level ~80 %
    var inTE = function(p){ // binary search
      var lo = 0, hi = tes.length - 1;
      while (lo <= hi){ var m = (lo + hi) >> 1; if (p < tes[m].s) hi = m - 1; else if (p >= tes[m].e) lo = m + 1; else return m; }
      return -1;
    };
    var geneAt = function(p){ for (var k = 0; k < genes.length; k++) if (p >= genes[k].s && p < genes[k].e) return k; return -1; };
    var pos = 0;
    while (true){
      pos += 1 + Math.floor(-Math.log(r() + 1e-12) * 100);
      if (pos >= G) break;
      if (pos >= SAT.s && pos < SAT.e) continue;
      if (inTE(pos) >= 0) continue;
      var gk = geneAt(pos), base = 0.80, kind = 'bg';
      if (gk >= 0){ base = GRP[genes[gk].g].body; kind = 'body'; }
      cpgs.push({ p: pos, t: clamp(base + 0.07 * gauss(r), 0.02, 0.99), kind: kind, te: -1 });
    }
    // islands: dense CpGs (1 per 12 bp) replacing background inside the island
    genes.forEach(function(g, gk){
      if (!g.isl) return;
      cpgs = cpgs.filter(function(c){ return c.p < g.isl[0] || c.p >= g.isl[1]; });
      var lvl = GRP[g.g].isl;
      for (var q = g.isl[0] + Math.floor(r() * 12); q < g.isl[1]; q += 6 + Math.floor(r() * 13))
        cpgs.push({ p: q, t: clamp(lvl + 0.04 * gauss(r), 0.0, 0.99), kind: 'isl', te: -1 });
    });
    // TE CpGs: consensus CpGs, each kept with probability exp(-6 d)
    tes.forEach(function(t){
      var F = FAM[t.fam], len = t.e - t.s, n0 = Math.round(len * F.cpgPerKb / 1000), keep = Math.exp(-CPG_DECAY * t.d);
      var lvl = 0.88 - 0.25 * t.d;                          // older copies a little lower (toy)
      t.ncpg = 0;
      for (var k = 0; k < n0; k++){
        if (r() > keep) continue;
        // L1-like: a quarter of the CpGs of a full copy sit in its 5' 900 bp (a CpG-rich promoter region)
        var o5 = (t.fam === 'l1' && t.full && k < 0.25 * n0) ? Math.floor(r() * 900) : Math.floor(r() * len);
        var off = t.strand === '+' ? o5 : len - 1 - o5;
        var five = t.fam === 'l1' && t.full && o5 < 900;
        cpgs.push({ p: t.s + off, t: clamp(lvl + 0.06 * gauss(r), 0.05, 0.99), kind: 'te', te: t.id, esc: five && t.d < 0.03 });
        t.ncpg++;
      }
    });
    // satellite: 4 CpGs per 170-bp monomer, a few lost; one hypomethylated dip
    for (var m = SAT.s; m < SAT.e; m += SAT.mono){
      [17, 58, 101, 144].forEach(function(o){
        if (r() < 0.06) return;
        var q = m + o, dip = q >= SAT.dip[0] && q < SAT.dip[1];
        cpgs.push({ p: q, t: clamp((dip ? 0.30 : 0.86) + 0.06 * gauss(r), 0.02, 0.99), kind: 'sat', te: -2 });
      });
    }
    cpgs.sort(function(a, b){ return a.p - b.p; });
  })();

  // ---------- mappability: share of reads over a CpG that can be placed ----------
  function mapFrac(c, R){
    var a, b, dclose;
    if (c.te >= 0){ var t = tes[c.te]; a = t.s; b = t.e; dclose = t.dclose; }
    else if (c.te === -2){ a = SAT.s; b = SAT.e; dclose = SAT.dclose; }
    else return 1;
    if (R * dclose >= 3) return 1;                         // enough differences inside one read
    var p = c.p, lo = p - R + 1;
    var c1 = Math.max(0, Math.min(p, a - ANCHOR) - lo + 1);            // read reaches the left flank
    var s2 = Math.max(lo, b + ANCHOR - R);                              // read reaches the right flank
    var c2 = Math.max(0, p - s2 + 1);
    var ov = Math.max(0, Math.min(p, a - ANCHOR) - s2 + 1);
    return clamp((c1 + c2 - ov) / R, 0, 1);
  }

  // ---------- simulated pileup (cached per read length and depth) ----------
  var esc = false, cache = {};
  function trueLevel(c){ return esc && c.esc ? 0.22 : c.t; }
  function simulate(R, dep){
    var key = R + '|' + dep + '|' + esc;
    if (cache[key]) return cache[key];
    var r = rng(R * 31 + dep * 7 + 99), n = new Int32Array(cpgs.length), m = new Int32Array(cpgs.length);
    for (var i = 0; i < cpgs.length; i++){
      var f = mapFrac(cpgs[i], R);
      n[i] = poisson(r, dep * f);
      m[i] = binom(r, n[i], trueLevel(cpgs[i]));
    }
    cache[key] = { n: n, m: m };
    return cache[key];
  }

  // ---------- svg helpers ----------
  function mk(tag, attrs, parent, txt){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (txt !== undefined) e.textContent = txt;
    if (parent) parent.appendChild(e);
    return e;
  }
  function clear(svg){ while (svg.firstChild) svg.removeChild(svg.firstChild); }
  function txt(svg, x, y, s, o){
    o = o || {};
    return mk('text', { x: x, y: y, 'font-size': o.fs || 11, fill: o.fill || 'var(--muted)', 'text-anchor': o.a || 'start', 'font-family': 'var(--f-mono, monospace)' }, svg, s);
  }
  function leg(items){
    return items.map(function(it){
      return '<span>' + (it.dot
        ? '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="' + (it.hollow ? 'none' : it.col) + '" stroke="' + it.col + '"/></svg> '
        : '<i style="background:' + it.col + ';height:' + (it.h || 3) + 'px"></i>') + it.t + '</span>';
    }).join('');
  }
  function f0(x){ return isNaN(x) ? '–' : Math.round(x) + ' %'; }

  // ---------- state and controls ----------
  var st = { rl1: 15000, rl2: 15000, dep: 20, mc: 5, pos: 0, strand: 1 };
  function seg(id, attr, key, cb){
    var g = $(id); if (!g) return;
    g.addEventListener('click', function(ev){
      var b = ev.target.closest('button'); if (!b) return;
      g.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      st[key] = +b.getAttribute(attr);
      cb();
    });
  }
  // jump targets
  var target = {
    hk: genes.filter(function(g){ return g.g === 0; })[0],
    ts: genes.filter(function(g){ return g.g === 2; })[0],
    l1: tes.filter(function(t){ return t.fam === 'l1' && t.full && t.d < 0.01; })[0],
    sat: { s: SAT.dip[0] - 20000, e: SAT.dip[0] - 20000 }
  };
  function jump(k){
    var t = target[k]; if (!t) return;
    var mid = k === 'sat' ? SAT.dip[0] : (k === 'hk' || k === 'ts') ? t.tss : (t.s + t.e) / 2;
    st.pos = clamp(Math.round((mid - 30000) / 1000), 0, 1940);
    $('s05-pos').value = st.pos;
  }

  // ---------- figure 1: genome browser track ----------
  function drawTrack(){
    var svg = $('s05-trk'); clear(svg);
    var sim = simulate(st.rl1, st.dep);
    var W0 = st.pos * 1000, W1 = W0 + 60000, X0 = 70, X1 = 750;
    var xs = function(p){ return X0 + (X1 - X0) * (p - W0) / 60000; };
    var Y0 = 72, Y1 = 182, ys = function(v){ return Y1 - (Y1 - Y0) * v / 100; };
    txt(svg, 6, 30, 'genes'); txt(svg, 6, 56, 'repeats');
    txt(svg, 6, Y0 + 4, '100 %'); txt(svg, 6, (Y0 + Y1) / 2 + 4, '50 %'); txt(svg, 6, Y1 + 4, '0 %'); txt(svg, 6, 202, 'no data');
    [0, 50, 100].forEach(function(v){ mk('line', { x1: X0, x2: X1, y1: ys(v), y2: ys(v), stroke: 'var(--line)', 'stroke-width': 1 }, svg); });
    // genes
    genes.forEach(function(g){
      if (g.e < W0 || g.s > W1) return;
      var a = Math.max(xs(g.s), X0), b = Math.min(xs(g.e), X1);
      mk('rect', { x: a, y: 22, width: Math.max(1, b - a), height: 10, fill: GRP[g.g].col, opacity: 0.85 }, svg);
      for (var x = a + 10; x < b - 6; x += 40)
        mk('path', { d: g.strand === '+' ? 'M' + x + ',24 l4,3 l-4,3' : 'M' + (x + 4) + ',24 l-4,3 l4,3', stroke: 'var(--bg)', fill: 'none', 'stroke-width': 1.2 }, svg);
      if (g.tss >= W0 && g.tss <= W1){
        var xt = xs(g.tss);
        mk('line', { x1: xt, x2: xt, y1: 14, y2: 34, stroke: 'var(--fg)', 'stroke-width': 1.2 }, svg);
        txt(svg, xt + (g.strand === '+' ? 3 : -3), 14, 'TSS', { a: g.strand === '+' ? 'start' : 'end', fs: 10 });
      }
      if (g.isl && g.isl[1] > W0 && g.isl[0] < W1){
        var ia = Math.max(xs(g.isl[0]), X0), ib = Math.min(xs(g.isl[1]), X1);
        mk('rect', { x: ia, y: 35, width: Math.max(2, ib - ia), height: 5, fill: 'var(--good)' }, svg);
      }
    });
    // repeats
    tes.forEach(function(t){
      if (t.e < W0 || t.s > W1) return;
      var a = Math.max(xs(t.s), X0), b = Math.min(xs(t.e), X1);
      mk('rect', { x: a, y: 48, width: Math.max(1.5, b - a), height: 10, fill: FAM[t.fam].col }, svg);
    });
    if (SAT.e > W0 && SAT.s < W1){
      var sa = Math.max(xs(SAT.s), X0), sb = Math.min(xs(SAT.e), X1);
      mk('rect', { x: sa, y: 48, width: sb - sa, height: 10, fill: 'var(--muted)' }, svg);
      for (var hx = sa; hx < sb; hx += 6) mk('line', { x1: hx, x2: hx + 4, y1: 58, y2: 48, stroke: 'var(--bg)', 'stroke-width': 1 }, svg);
    }
    // CpG methylation
    var nIn = 0, nData = 0, sumByKind = {}, cntByKind = {};
    var colOf = function(c){ return c.kind === 'isl' ? 'var(--good)' : c.kind === 'te' ? FAM[tes[c.te].fam].col : c.kind === 'sat' ? 'var(--muted)' : 'var(--fg)'; };
    var lo = 0, hi = cpgs.length;
    while (lo < hi){ var mid = (lo + hi) >> 1; if (cpgs[mid].p < W0) lo = mid + 1; else hi = mid; }
    for (var i = lo; i < cpgs.length && cpgs[i].p < W1; i++){
      var c = cpgs[i], n = sim.n[i], x = xs(c.p);
      nIn++;
      if (n < st.mc){ mk('line', { x1: x, x2: x, y1: 196, y2: 206, stroke: 'var(--err)', 'stroke-width': 1 }, svg); continue; }
      nData++;
      var v = 100 * sim.m[i] / n;
      var k = c.kind === 'body' ? 'gene body' : c.kind === 'bg' ? 'between genes' : c.kind === 'isl' ? 'CpG islands' : c.kind === 'sat' ? 'satellite' : FAM[tes[c.te].fam].name + ' copies';
      sumByKind[k] = (sumByKind[k] || 0) + v; cntByKind[k] = (cntByKind[k] || 0) + 1;
      mk('circle', { cx: x, cy: ys(v), r: 1.9, fill: colOf(c), opacity: 0.8 }, svg);
    }
    // axis
    mk('line', { x1: X0, x2: X1, y1: 212, y2: 212, stroke: 'var(--line)' }, svg);
    for (var tk = 0; tk <= 60; tk += 10){
      var xx = X0 + (X1 - X0) * tk / 60;
      mk('line', { x1: xx, x2: xx, y1: 212, y2: 216, stroke: 'var(--muted)' }, svg);
      txt(svg, xx, 227, ((W0 / 1000 + tk) / 1000).toFixed(2) + ' Mb', { a: tk === 0 ? 'start' : tk === 60 ? 'end' : 'middle', fs: 10 });
    }
    $('s05-posv').textContent = (W0 / 1e6).toFixed(2) + '–' + (W1 / 1e6).toFixed(2) + ' Mb';
    var parts = Object.keys(cntByKind).map(function(k){ return k + ' ' + f0(sumByKind[k] / cntByKind[k]); });
    $('s05-trk-out').innerHTML =
      '<div>CpGs in this window<b>' + nIn + '</b>' + nData + ' with at least ' + st.mc + ' <span class="tip" title="Valid reads (bedMethyl column 10, Nvalid_cov): reads that were placed on the genome here and gave a confident methylated or unmethylated call at this CpG.">valid reads</span></div>' +
      '<div>CpGs with no usable data<b>' + (nIn - nData) + '</b>grey ticks at the bottom: too few reads could be placed there with ' + rlName(st.rl1) + ' reads</div>' +
      '<div>mean methylation by feature<b style="font-size:13px">' + (parts.length ? parts.join(' · ') : '–') + '</b>average of the per-CpG percentages shown as dots</div>';
  }
  function rlName(R){ return R >= 1000 ? (R / 1000) + '-kb' : R + '-bp'; }

  // ---------- figure 2: histogram ----------
  function drawHist(){
    var svg = $('s05-hist'); clear(svg);
    var sim = simulate(st.rl1, st.dep), B = 50, h = new Array(B).fill(0), used = 0, lowC = 0, highC = 0, vals = [];
    for (var i = 0; i < cpgs.length; i++){
      var n = sim.n[i]; if (n < st.mc) continue;
      var v = 100 * sim.m[i] / n; used++; vals.push(v);
      h[Math.min(B - 1, Math.floor(v / (100 / B)))]++;
      if (v <= 20) lowC++; else if (v >= 80) highC++;
    }
    var X0 = 64, X1 = 750, Y0 = 14, Y1 = 170, mx = Math.max.apply(null, h) || 1;
    var bw = (X1 - X0) / B;
    for (var k = 0; k < B; k++){
      var hh = (Y1 - Y0) * h[k] / mx;
      mk('rect', { x: X0 + k * bw + 0.5, y: Y1 - hh, width: bw - 1, height: hh, fill: 'var(--accent)' }, svg);
    }
    mk('line', { x1: X0, x2: X1, y1: Y1, y2: Y1, stroke: 'var(--muted)' }, svg);
    for (var t = 0; t <= 100; t += 20){
      var x = X0 + (X1 - X0) * t / 100;
      mk('line', { x1: x, x2: x, y1: Y1, y2: Y1 + 4, stroke: 'var(--muted)' }, svg);
      txt(svg, x, Y1 + 16, t + ' %', { a: t === 0 ? 'start' : t === 100 ? 'end' : 'middle', fs: 10 });
    }
    txt(svg, (X0 + X1) / 2, 204, 'percent methylated (bedMethyl column 11), 2-% bins', { a: 'middle', fs: 11 });
    mk('text', { x: 14, y: (Y0 + Y1) / 2, transform: 'rotate(-90 14 ' + (Y0 + Y1) / 2 + ')', 'font-size': 11, fill: 'var(--muted)', 'text-anchor': 'middle' }, svg, 'CpGs');
    txt(svg, X0 - 4, Y0 + 8, String(mx), { a: 'end', fs: 10 }); txt(svg, X0 - 4, Y1, '0', { a: 'end', fs: 10 });
    vals.sort(function(a, b){ return a - b; });
    var med = vals.length ? vals[Math.floor(vals.length / 2)] : NaN;
    $('s05-hist-out').innerHTML =
      '<div>CpGs with data<b>' + used + ' of ' + cpgs.length + '</b>at least ' + st.mc + ' valid reads, ' + rlName(st.rl1) + ' reads at ' + st.dep + '×</div>' +
      '<div>median methylation<b>' + f0(med) + '</b>' + (used ? Math.round(100 * highC / used) + ' % of CpGs at 80 % or more, ' + Math.round(100 * lowC / used) + ' % at 20 % or less' : 'no CpG passed') + '</div>' +
      '<div>shape<b>' + (st.dep <= 6 ? 'spiky' : 'bimodal') + '</b>' + (st.dep <= 6 ? 'with few reads only a few fractions are possible (1/3, 1/2, 2/3 …), so values pile up at them' : 'a tall peak near 100 % (most of the genome) and a small one near 0 % (unmethylated islands)') + '</div>';
  }

  // ---------- figure 3: metaplot around the TSS ----------
  function drawMeta(){
    var svg = $('s05-meta'); clear(svg);
    var sim = simulate(st.rl1, st.dep), BIN = 200, NB = 50, FL = 5000;
    var M = GRP.map(function(){ return { m: new Float64Array(NB), v: new Float64Array(NB) }; });
    var idx = 0;
    genes.forEach(function(g){
      var a = g.tss - FL, b = g.tss + FL;
      while (idx > 0 && cpgs[idx - 1].p >= a) idx--;
      while (idx < cpgs.length && cpgs[idx].p < a) idx++;
      for (var i = idx; i < cpgs.length && cpgs[i].p <= b; i++){
        var n = sim.n[i]; if (n < st.mc) continue;
        var d = cpgs[i].p - g.tss;
        if (st.strand && g.strand === '-') d = -d;
        var k = Math.floor((d + FL) / BIN); if (k < 0 || k >= NB) continue;
        M[g.g].m[k] += sim.m[i]; M[g.g].v[k] += n;
      }
    });
    var X0 = 64, X1 = 750, Y0 = 14, Y1 = 200;
    var xs = function(d){ return X0 + (X1 - X0) * (d + FL) / (2 * FL); }, ys = function(v){ return Y1 - (Y1 - Y0) * v / 100; };
    [0, 25, 50, 75, 100].forEach(function(v){
      mk('line', { x1: X0, x2: X1, y1: ys(v), y2: ys(v), stroke: 'var(--line)' }, svg);
      txt(svg, X0 - 4, ys(v) + 4, v + ' %', { a: 'end', fs: 10 });
    });
    mk('line', { x1: xs(0), x2: xs(0), y1: Y0, y2: Y1, stroke: 'var(--fg)', 'stroke-dasharray': '3 3' }, svg);
    txt(svg, xs(0), Y1 + 14, 'TSS', { a: 'middle', fs: 10, fill: 'var(--fg)' });
    [-5000, -2500, 2500, 5000].forEach(function(d){
      txt(svg, xs(d), Y1 + 14, (d > 0 ? '+' : '−') + Math.abs(d / 1000) + ' kb', { a: d === -5000 ? 'start' : d === 5000 ? 'end' : 'middle', fs: 10 });
    });
    txt(svg, X0 + 4, Y1 + 32, st.strand ? '← upstream' : '← lower coordinate', { fs: 11 });
    txt(svg, X1 - 4, Y1 + 32, st.strand ? 'into the gene body →' : 'higher coordinate →', { a: 'end', fs: 11 });
    var tssVal = [], bodyVal = [];
    M.forEach(function(L, gi){
      var dpath = '', pen = false;
      for (var k = 0; k < NB; k++){
        if (!L.v[k]){ pen = false; continue; }
        var x = xs(-FL + (k + 0.5) * BIN), y = ys(100 * L.m[k] / L.v[k]);
        dpath += (pen ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1); pen = true;
      }
      mk('path', { d: dpath, fill: 'none', stroke: GRP[gi].col, 'stroke-width': 2 }, svg);
      var pool = function(k0, k1){ var m = 0, v = 0; for (var k = k0; k < k1; k++){ m += L.m[k]; v += L.v[k]; } return v ? 100 * m / v : NaN; };
      tssVal.push(pool(23, 27)); bodyVal.push(pool(35, 50));
    });
    $('s05-meta-leg').innerHTML = leg(GRP.map(function(g){ return { col: g.col, t: g.name + ' (' + g.n + ' genes)' }; }));
    $('s05-meta-out').innerHTML =
      '<div>active genes, TSS ± 400 bp<b>' + f0(tssVal[0]) + '</b><span class="tip" title="Pooled: all methylated calls divided by all valid calls in the bin, so CpGs with more reads count more.">pooled</span> over all genes of the group</div>' +
      '<div>active genes, +2 to +5 kb<b>' + f0(bodyVal[0]) + '</b>gene body; silent genes: ' + f0(bodyVal[1]) + '</div>' +
      '<div>' + (st.strand ? 'strand-aware' : 'strand ignored') + '<b>' + (st.strand ? 'correct' : 'mixed') + '</b>' + (st.strand
        ? 'minus-strand genes were turned around, so the right side is always the gene body'
        : 'half the genes have their body on the left: both sides show an average of body and upstream DNA') + '</div>';
  }

  // ---------- figure 4: methylation vs divergence ----------
  function drawTE(){
    var sim = simulate(st.rl2, st.dep);
    var agg = tes.map(function(){ return { m: 0, v: 0 }; });
    for (var i = 0; i < cpgs.length; i++){
      var c = cpgs[i]; if (c.te < 0) continue;
      agg[c.te].m += sim.m[i]; agg[c.te].v += sim.n[i];
    }
    var svg = $('s05-te'); clear(svg);
    var X0 = 64, X1 = 750, Y0 = 14, Y1 = 200, DMAX = 33;
    var xs = function(d){ return X0 + (X1 - X0) * d / DMAX; }, ys = function(v){ return Y1 - (Y1 - Y0) * v / 100; };
    [0, 25, 50, 75, 100].forEach(function(v){
      mk('line', { x1: X0, x2: X1, y1: ys(v), y2: ys(v), stroke: 'var(--line)' }, svg);
      txt(svg, X0 - 4, ys(v) + 4, v + ' %', { a: 'end', fs: 10 });
    });
    txt(svg, X0 - 4, Y1 + 22, 'no value', { a: 'end', fs: 10 });
    function xaxis(s, y){
      for (var d = 0; d <= 30; d += 5){
        mk('line', { x1: xs(d), x2: xs(d), y1: y, y2: y + 4, stroke: 'var(--muted)' }, s);
        txt(s, xs(d), y + 15, d + ' %', { a: d === 0 ? 'start' : 'middle', fs: 10 });
      }
    }
    mk('line', { x1: X0, x2: X1, y1: Y1 + 30, y2: Y1 + 30, stroke: 'var(--muted)' }, svg);
    xaxis(svg, Y1 + 30);
    txt(svg, (X0 + X1) / 2, 264, 'divergence of the copy from its family consensus (younger ← → older)', { a: 'middle', fs: 11 });
    var r = rng(5), stats = { y: [0, 0], o: [0, 0], ym: [], om: [] };
    tes.forEach(function(t, k){
      var a = agg[k], x = xs(100 * t.d), young = t.d < 0.05;
      stats[young ? 'y' : 'o'][0]++;
      if (a.v >= 20){
        stats[young ? 'y' : 'o'][1]++;
        var v = 100 * a.m / a.v;
        (young ? stats.ym : stats.om).push(v);
        mk('circle', { cx: x, cy: ys(v), r: t.fam === 'l1' ? 3.2 : 2.5, fill: FAM[t.fam].col, opacity: 0.75 }, svg);
      } else {
        mk('circle', { cx: x, cy: Y1 + 18 + (r() - 0.5) * 8, r: 2.5, fill: 'none', stroke: 'var(--err)' }, svg);
      }
    });
    // CpG density plot
    var s2 = $('s05-cpg'); clear(s2);
    var Z0 = 14, Z1 = 130, CM = 45;
    var zs = function(v){ return Z1 - (Z1 - Z0) * Math.min(v, CM) / CM; };
    [0, 20, 40].forEach(function(v){
      mk('line', { x1: X0, x2: X1, y1: zs(v), y2: zs(v), stroke: 'var(--line)' }, s2);
      txt(s2, X0 - 4, zs(v) + 4, String(v), { a: 'end', fs: 10 });
    });
    mk('text', { x: 14, y: (Z0 + Z1) / 2, transform: 'rotate(-90 14 ' + (Z0 + Z1) / 2 + ')', 'font-size': 11, fill: 'var(--muted)', 'text-anchor': 'middle' }, s2, 'CpGs per kb');
    mk('line', { x1: X0, x2: X1, y1: Z1, y2: Z1, stroke: 'var(--muted)' }, s2);
    xaxis(s2, Z1);
    txt(s2, (X0 + X1) / 2, 164, 'divergence from consensus (same axis as above)', { a: 'middle', fs: 11 });
    tes.forEach(function(t){
      mk('circle', { cx: xs(100 * t.d), cy: zs(1000 * t.ncpg / (t.e - t.s)), r: 2.3, fill: FAM[t.fam].col, opacity: 0.7 }, s2);
    });
    $('s05-te-leg').innerHTML = leg([
      { dot: 1, col: FAM.sine.col, t: 'SINE-like (300 bp)' },
      { dot: 1, col: FAM.l1.col, t: 'L1-like (up to 6 kb, larger dots)' },
      { dot: 1, col: FAM.ltr.col, t: 'LTR-like (1.5 kb)' },
      { dot: 1, hollow: 1, col: 'var(--err)', t: 'copy with fewer than 20 valid calls' }]);
    var med = function(a){ if (!a.length) return NaN; a = a.slice().sort(function(x, y){ return x - y; }); return a[Math.floor(a.length / 2)]; };
    var l1y = tes.filter(function(t){ return t.fam === 'l1' && t.d < 0.03 && t.full; }), l1m = 0, l1v = 0;
    l1y.forEach(function(t){ l1m += agg[t.id].m; l1v += agg[t.id].v; });
    $('s05-te-out').innerHTML =
      '<div>young copies (under 5 %) with a value<b>' + stats.y[1] + ' of ' + stats.y[0] + '</b>median ' + f0(med(stats.ym)) + ' methylated; ' + rlName(st.rl2) + ' reads, ' + st.dep + '× (depth set above)</div>' +
      '<div>older copies (5 % and more) with a value<b>' + stats.o[1] + ' of ' + stats.o[0] + '</b>median ' + f0(med(stats.om)) + ' methylated</div>' +
      '<div>young full-length L1-like copies<b>' + (l1v ? f0(100 * l1m / l1v) : 'no data') + '</b>' + l1y.length + ' copies under 3 %, <span class="tip" title="Pooled: all methylated calls divided by all valid calls over the CpGs of these copies.">pooled</span> from ' + l1v + ' valid calls' + (l1v < 20 * l1y.length ? ' (mostly from CpGs near their ends, where short reads reach unique DNA)' : '') + (esc ? '; their 5\' region is switched on' : '') + '</div>';
  }

  // ---------- wiring ----------
  function legendTrack(){
    $('s05-trk-leg').innerHTML = leg([
      { col: 'var(--accent)', t: 'gene (colour = group, as in the metaplot)', h: 8 },
      { col: 'var(--good)', t: 'CpG island', h: 5 },
      { col: FAM.sine.col, t: 'SINE-like', h: 8 }, { col: FAM.l1.col, t: 'L1-like', h: 8 },
      { col: FAM.ltr.col, t: 'LTR-like', h: 8 }, { col: 'var(--muted)', t: 'satellite array', h: 8 },
      { col: 'var(--err)', t: 'tick = CpG without enough reads', h: 8 }]);
  }
  function syncLabels(){
    $('s05-depv').textContent = st.dep + '×';
    $('s05-mcv').textContent = st.mc;
  }
  function all(){ syncLabels(); drawTrack(); drawHist(); drawMeta(); drawTE(); }
  seg('s05-rl1', 'data-l', 'rl1', function(){ drawTrack(); drawHist(); drawMeta(); });
  seg('s05-rl2', 'data-l', 'rl2', drawTE);
  seg('s05-strand', 'data-s', 'strand', drawMeta);
  var jg = $('s05-jump');
  jg.addEventListener('click', function(ev){
    var b = ev.target.closest('button'); if (!b) return;
    jg.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    jump(b.getAttribute('data-j')); drawTrack();
  });
  $('s05-pos').addEventListener('input', function(){
    st.pos = +this.value;
    jg.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed', 'false'); });
    drawTrack();
  });
  $('s05-dep').addEventListener('input', function(){ st.dep = +this.value; all(); });
  $('s05-mc').addEventListener('input', function(){ st.mc = +this.value; syncLabels(); drawTrack(); drawHist(); drawMeta(); });
  $('s05-esc').addEventListener('change', function(){ esc = this.checked; cache = {}; all(); });
  jump('hk'); legendTrack(); all();
})();
