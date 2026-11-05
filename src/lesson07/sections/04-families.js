(function(){
  var svg = document.getElementById('s04-aln');
  if (!svg) return;
  var dsvg = document.getElementById('s04-div'), out = document.getElementById('s04-out'), leg = document.getElementById('s04-legend') || document.getElementById('s04-leg');
  var inCols = document.getElementById('s04-cols'), cbTruth = document.getElementById('s04-truth'), cbCpg = document.getElementById('s04-cpg');
  var NS = 'http://www.w3.org/2000/svg';
  var B = ['A','C','G','T'];
  var L = 72, CPG = 40;                         // CpG at 0-based 40-41 = columns 41-42
  var D1 = [11, 56], D2 = [27, 63];             // A vs B+C ; C vs A+B  (columns 12, 57 ; 28, 64)
  var SIZES = { A: 8, B: 7, C: 5 }, DIAG = D1.concat(D2);
  var LCOL = { A: 'var(--accent)', B: 'var(--het)', C: 'var(--rep)' };
  var GCOL = ['var(--accent)', 'var(--het)', 'var(--rep)', 'var(--good)', 'var(--bad)', 'var(--err)', 'var(--fg)'];
  var DTIP = '<span class="tip" title="Diagnostic column: one base fills at least 90 % of the group and at most 2 % of the other copies (one exception allowed each side in this toy).">diagnostic column</span>';
  var seed = 11, copies = [], sel = [], mode = 'cols', groups = [], famCons = '';

  function rng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var TS = { A: 'G', G: 'A', C: 'T', T: 'C' };
  function tv(b, r){ var o = (b === 'A' || b === 'G') ? ['C','T'] : ['A','G']; return o[Math.floor(r() * 2)]; }

  function build(){
    var r = rng(seed), i, j;
    var m = []; for (i = 0; i < L; i++) m.push(B[Math.floor(r() * 4)]);
    m[CPG] = 'C'; m[CPG + 1] = 'G';
    for (i = 1; i < L; i++) if (i !== CPG + 1 && m[i - 1] === 'C' && m[i] === 'G') m[i] = 'A';   // only one CpG
    function alt(seq, p){ var b = TS[seq[p]];
      if ((b === 'G' && seq[p - 1] === 'C') || (b === 'C' && seq[p + 1] === 'G')) b = (seq[p] === 'A' || seq[p] === 'G') ? 'T' : 'A';
      if ((b === 'G' && seq[p - 1] === 'C') || (b === 'C' && seq[p + 1] === 'G')) b = (seq[p] === 'A' || seq[p] === 'G') ? 'C' : 'G';
      return b; }
    var src = { A: m.slice() };
    src.B = m.slice(); D1.forEach(function(p){ src.B[p] = alt(src.B, p); });
    src.C = src.B.slice(); D2.forEach(function(p){ src.C[p] = alt(src.C, p); });
    copies = [];
    ['A','B','C'].forEach(function(lin){
      for (j = 0; j < SIZES[lin]; j++){
        var d = 0.03 + 0.13 * r(), s = src[lin].slice();
        for (i = 0; i < L; i++){
          if (i === CPG || i === CPG + 1 || DIAG.indexOf(i) >= 0) continue;   // toy: diagnostic columns stay clean
          if (r() < d) s[i] = r() < 2 / 3 ? TS[s[i]] : tv(s[i], r);
        }
        var q = Math.min(0.9, 6 * d);                        // C of the CpG -> T, G -> A (the C on the other strand), independently
        if (r() < q) s[CPG] = 'T';
        if (r() < q) s[CPG + 1] = 'A';
        copies.push({ lin: lin, s: s, rate: d });
      }
    });
    for (i = copies.length - 1; i > 0; i--){ j = Math.floor(r() * (i + 1)); var t = copies[i]; copies[i] = copies[j]; copies[j] = t; }
    copies.forEach(function(c, k){ c.name = 'copy ' + (k + 1); c.idx = k; });
  }

  // consensus of a set of copy indices
  function consensus(ids){
    var n = ids.length, c = [], i;
    for (i = 0; i < L; i++){
      var cnt = { A:0, C:0, G:0, T:0 };
      ids.forEach(function(k){ cnt[copies[k].s[i]]++; });
      var best = 'A', mx = -1, tie = false;
      B.forEach(function(b){ if (cnt[b] > mx){ mx = cnt[b]; best = b; tie = false; } else if (cnt[b] === mx) tie = true; });
      c.push(tie ? 'n' : (2 * mx > n ? best : best.toLowerCase()));
    }
    if (cbCpg.checked){
      for (i = 0; i < L - 1; i++){
        var cg = 0, tg = 0, ca = 0;
        ids.forEach(function(k){ var d = copies[k].s[i] + copies[k].s[i + 1];
          if (d === 'CG') cg++; else if (d === 'TG') tg++; else if (d === 'CA') ca++; });
        // a decayed CpG leaves both products (TG and CA) and some intact CG; a true TG or CA site rarely does
        if (cg >= 2 && tg >= 0.1 * n && ca >= 0.1 * n && (c[i] + c[i + 1]).toUpperCase() !== 'CG'){ c[i] = 'C'; c[i + 1] = 'G'; }
      }
    }
    return c.join('');
  }
  function diverg(k, cons){
    var mm = 0, tot = 0;
    for (var i = 0; i < L; i++){ var b = cons[i]; if (b === 'n') continue; tot++; if (b.toUpperCase() !== copies[k].s[i]) mm++; }
    return 100 * mm / tot;
  }

  // columns backing a group (toy version of ViewAlign's peel definition: >=90 % inside, <=2 % outside, 1 exception each side)
  function backing(g, all){
    var inside = {}; g.ids.forEach(function(k){ inside[k] = 1; });
    var outIds = all.filter(function(k){ return !inside[k]; }), res = [];
    var m = g.ids.length, no = outIds.length;
    if (m < 3 || no < 3) return null;
    for (var i = 0; i < L; i++){
      var cnt = { A:0, C:0, G:0, T:0 };
      g.ids.forEach(function(k){ cnt[copies[k].s[i]]++; });
      var best = 'A'; B.forEach(function(b){ if (cnt[b] > cnt[best]) best = b; });
      var miss = m - cnt[best], has = 0;
      outIds.forEach(function(k){ if (copies[k].s[i] === best) has++; });
      if (miss <= Math.max(0.1 * m, 1) && has <= Math.max(0.02 * no, 1)) res.push(i);
    }
    return res;
  }

  function parseCols(){
    var v = inCols.value.split(/[^0-9]+/).filter(Boolean).map(Number).filter(function(x){ return x >= 1 && x <= L; });
    var u = []; v.forEach(function(x){ if (u.indexOf(x - 1) < 0 && u.length < 4) u.push(x - 1); });
    return u;
  }

  function groupByCols(){
    var map = {}, order = [];
    copies.forEach(function(c, k){
      var key = sel.map(function(i){ return c.s[i]; }).join('');
      if (!map[key]){ map[key] = { key: key, ids: [] }; order.push(key); }
      map[key].ids.push(k);
    });
    return order.map(function(k){ return map[k]; }).sort(function(a, b){ return b.ids.length - a.ids.length; });
  }

  function groupByIdentity(K){
    var n = copies.length, D = [], i, j;
    for (i = 0; i < n; i++){ D.push([]); for (j = 0; j < n; j++){
      var d = 0; for (var p = 0; p < L; p++) if (copies[i].s[p] !== copies[j].s[p]) d++; D[i].push(d / L); } }
    var cl = []; for (i = 0; i < n; i++) cl.push([i]);
    function avg(a, b){ var s = 0; a.forEach(function(x){ b.forEach(function(y){ s += D[x][y]; }); }); return s / (a.length * b.length); }
    while (cl.length > K){
      var bi = 0, bj = 1, bd = Infinity;
      for (i = 0; i < cl.length; i++) for (j = i + 1; j < cl.length; j++){ var d2 = avg(cl[i], cl[j]); if (d2 < bd){ bd = d2; bi = i; bj = j; } }
      cl[bi] = cl[bi].concat(cl[bj]); cl.splice(bj, 1);
    }
    return cl.map(function(a){ return { key: '', ids: a.sort(function(x, y){ return x - y; }) }; })
      .sort(function(a, b){ return b.ids.length - a.ids.length; });
  }

  function el(tag, at, txt){ var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; }

  function compute(){
    var all = copies.map(function(c, k){ return k; });
    famCons = consensus(all);
    if (mode === 'ident') groups = groupByIdentity(3);
    else if (sel.length) groups = groupByCols();
    else groups = [{ key: '', ids: all }];
    groups.forEach(function(g, gi){
      g.col = GCOL[gi % GCOL.length]; g.label = 'G' + (gi + 1);
      g.cons = consensus(g.ids);
      g.back = groups.length > 1 ? backing(g, all) : null;
      g.extra = g.back ? g.back.filter(function(i){ return sel.indexOf(i) < 0; }) : [];
      g.div = g.ids.map(function(k){ return { k: k, own: diverg(k, g.cons), fam: diverg(k, famCons) }; });
      var comp = { A:0, B:0, C:0 }; g.ids.forEach(function(k){ comp[copies[k].lin]++; }); g.comp = comp;
    });
  }

  function drawAln(){
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var lx = 78, cw = 9, rh = 13, top = 66, gap = 7;
    var nG = groups.length, H = top + copies.length * rh + nG * gap + 26 + (nG + 1) * rh + 10;
    var W = lx + L * cw + 12;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    function X(i){ return lx + i * cw; }
    // variability bars + clickable column strip
    var maxv = copies.length;
    for (var i = 0; i < L; i++){
      var v = 0; copies.forEach(function(c){ if (c.s[i] !== famCons[i].toUpperCase()) v++; });
      var h = 22 * v / maxv;
      var isSel = sel.indexOf(i) >= 0 && mode === 'cols';
      svg.appendChild(el('rect', { x: X(i) + 1, y: 36 - h, width: cw - 2, height: Math.max(h, 0.5), fill: isSel ? 'var(--accent)' : 'var(--err)' }));
      var hit = el('rect', { x: X(i), y: 2, width: cw, height: H - 4, fill: isSel ? 'var(--accent)' : 'transparent', 'fill-opacity': isSel ? 0.16 : 0, style: 'cursor:pointer' });
      hit.setAttribute('data-c', i);
      var t = el('title', {}, 'column ' + (i + 1) + ': ' + v + ' of ' + maxv + ' copies differ from the family consensus. Click to split by it.');
      hit.appendChild(t);
      svg.appendChild(hit);
      if ((i + 1) % 10 === 0 || i === 0) svg.appendChild(el('text', { x: X(i) + cw / 2, y: 50, 'text-anchor': 'middle', 'font-size': 9, 'pointer-events': 'none' }, String(i + 1)));
    }
    svg.appendChild(el('text', { x: 4, y: 26, 'font-size': 9.5 }, 'copies that'));
    svg.appendChild(el('text', { x: 4, y: 37, 'font-size': 9.5 }, 'differ'));
    svg.appendChild(el('text', { x: 4, y: 50, 'font-size': 9.5 }, 'column'));
    // CpG marker
    svg.appendChild(el('text', { x: X(CPG) + cw, y: 9, 'text-anchor': 'middle', 'font-size': 9, fill: 'var(--het)', 'pointer-events': 'none' }, 'CpG'));
    svg.appendChild(el('line', { x1: X(CPG) + 1, x2: X(CPG + 2) - 1, y1: 11, y2: 11, stroke: 'var(--het)', 'pointer-events': 'none' }));
    var y = top;
    groups.forEach(function(g){
      var gy0 = y - 10;
      g.ids.forEach(function(k){
        var c = copies[k];
        if (cbTruth.checked) svg.appendChild(el('rect', { x: 0, y: y - 9, width: 5, height: 11, fill: LCOL[c.lin] }));
        svg.appendChild(el('text', { x: 8, y: y, 'font-size': 10, 'pointer-events': 'none' }, c.name + (cbTruth.checked ? ' ' + c.lin : '')));
        for (var i = 0; i < L; i++){
          var b = c.s[i], f = famCons[i].toUpperCase(), same = b === f;
          svg.appendChild(el('text', { x: X(i) + cw / 2, y: y, 'text-anchor': 'middle', 'font-size': 10, 'pointer-events': 'none',
            fill: same ? 'var(--muted)' : 'var(--fg)', 'font-weight': same ? 400 : 700 }, same ? '.' : b));
        }
        y += rh;
      });
      if (groups.length > 1) svg.appendChild(el('rect', { x: lx - 6, y: gy0, width: 3, height: y - gy0 - 2, fill: g.col }));
      y += gap;
    });
    // consensus rows
    y += 8;
    svg.appendChild(el('text', { x: 4, y: y - 2, 'font-size': 9.5, fill: 'var(--fg)' }, 'consensus sequences (full letters)'));
    y += 12;
    function consRow(lab, cons, col){
      svg.appendChild(el('rect', { x: lx - 6, y: y - 9, width: 3, height: 11, fill: col }));
      svg.appendChild(el('text', { x: 8, y: y, 'font-size': 10, fill: 'var(--fg)', 'pointer-events': 'none' }, lab));
      for (var i = 0; i < L; i++){
        var b = cons[i], diff = b.toUpperCase() !== famCons[i].toUpperCase();
        svg.appendChild(el('text', { x: X(i) + cw / 2, y: y, 'text-anchor': 'middle', 'font-size': 10, 'pointer-events': 'none',
          fill: diff ? 'var(--bad)' : 'var(--fg)', 'font-weight': diff ? 700 : 400 }, b));
      }
      y += rh;
    }
    consRow('all 20', famCons, 'var(--line)');
    if (groups.length > 1) groups.forEach(function(g){ consRow(g.label + ' (' + g.ids.length + ')', g.cons, g.col); });
  }

  function drawDiv(){
    while (dsvg.firstChild) dsvg.removeChild(dsvg.firstChild);
    var lx = 96, W = 740, x1 = W - 20, rowH = 26, top = 14, MAX = 25;
    var H = top + groups.length * rowH + 34;
    dsvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    function X(v){ return lx + (x1 - lx) * Math.min(v, MAX) / MAX; }
    for (var t = 0; t <= MAX; t += 5){
      dsvg.appendChild(el('line', { x1: X(t), x2: X(t), y1: top - 6, y2: top + groups.length * rowH, class: 'grid' }));
      dsvg.appendChild(el('text', { x: X(t), y: top + groups.length * rowH + 14, 'text-anchor': 'middle' }, t + ' %'));
    }
    dsvg.appendChild(el('text', { x: (lx + x1) / 2, y: H - 4, 'text-anchor': 'middle', class: 'lab' }, 'divergence of each copy (share of positions that differ)'));
    groups.forEach(function(g, gi){
      var y = top + gi * rowH + rowH / 2;
      dsvg.appendChild(el('text', { x: 4, y: y + 4, class: 'lab' }, (groups.length > 1 ? g.label : 'all') + ' (' + g.ids.length + ')'));
      dsvg.appendChild(el('line', { x1: lx, x2: x1, y1: y, y2: y, class: 'ax' }));
      g.div.forEach(function(d, i){
        var jit = ((i % 5) - 2) * 2;
        if (groups.length > 1){
          dsvg.appendChild(el('line', { x1: X(d.fam), x2: X(d.own), y1: y + jit, y2: y + jit, stroke: g.col, 'stroke-opacity': 0.5 }));
          dsvg.appendChild(el('circle', { cx: X(d.fam), cy: y + jit, r: 3.2, fill: 'none', stroke: g.col, 'stroke-width': 1.2 }));
        }
        dsvg.appendChild(el('circle', { cx: X(d.own), cy: y + jit, r: 3.2, fill: g.col }));
      });
      var med = median(g.div.map(function(d){ return d.own; }));
      dsvg.appendChild(el('line', { x1: X(med), x2: X(med), y1: y - 10, y2: y + 10, stroke: 'var(--fg)', 'stroke-width': 1.5 }));
    });
    leg.innerHTML = '<span><i style="background:var(--fg);width:3px;height:10px"></i>median, own consensus</span>' +
      '<span>● filled: divergence from the copy\'s own group consensus</span>' +
      (groups.length > 1 ? '<span>○ ring: from the consensus of all 20 copies</span>' : '');
  }
  function median(a){ a = a.slice().sort(function(x, y){ return x - y; }); var n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : 0; }

  // does another column split the copies the same way as column x? (toy rule: the bases at y follow the bases at x
  // one-to-one in every class of >= 3 copies, with at most one exception)
  function concordant(x){
    var cls = {};
    copies.forEach(function(c, k){ (cls[c.s[x]] = cls[c.s[x]] || []).push(k); });
    var big = Object.keys(cls).filter(function(b){ return cls[b].length >= 3; });
    if (big.length < 2) return null;
    var res = [];
    for (var y = 0; y < L; y++){
      if (y === x) continue;
      var used = {}, miss = 0, ok = true;
      big.forEach(function(b){
        var cnt = {}; cls[b].forEach(function(k){ var v = copies[k].s[y]; cnt[v] = (cnt[v] || 0) + 1; });
        var best = null; Object.keys(cnt).forEach(function(v){ if (best === null || cnt[v] > cnt[best]) best = v; });
        if (used[best]) ok = false; used[best] = 1; miss += cls[b].length - cnt[best];
      });
      if (ok && miss <= 1) res.push(y);
    }
    return res;
  }
  var PTIP = '<span class="tip" title="Private mutation: a change that happened in one copy after it was inserted. It is not inherited by other copies.">private mutation</span>';

  function readout(){
    var html = [];
    if (groups.length === 1){
      html.push('<div><b>no split yet</b>Pick a column: tall grey bars are columns where many copies differ from the family consensus.</div>');
      out.innerHTML = html.join(''); return;
    }
    var colOk = {};
    if (mode === 'cols'){
      var lines = sel.map(function(x){
        var r = concordant(x);
        colOk[x] = r && r.length > 0;
        if (r === null) return 'column ' + (x + 1) + ' sets apart only a few copies: a ' + PTIP + ', not a split';
        if (!r.length) return 'column ' + (x + 1) + ' is backed by no other column' + (x === CPG || x === CPG + 1 ? ' (it is the CpG: its copies differ by age, not by descent)' : '');
        return 'column ' + (x + 1) + ' is backed by column' + (r.length > 1 ? 's ' : ' ') + r.map(function(i){ return i + 1; }).join(', ') + ': they split the copies the same way';
      });
      html.push('<div style="grid-column:1/-1"><b>the columns you picked</b>' + lines.join('<br>') + '</div>');
    }
    groups.forEach(function(g){
      var n = g.ids.length, verdict;
      var rest = copies.length - n, restTxt = rest + ' cop' + (rest > 1 ? 'ies' : 'y');
      if (n < 3) verdict = 'too few copies (' + n + ') to call: most likely a ' + PTIP + ' or decay, not a subfamily';
      else if (mode === 'ident'){
        if (!g.back) verdict = 'the rest: grouping by identity only split off ' + restTxt + ', the most decayed ones';
        else if (g.back.length >= 2) verdict = g.back.length + ' ' + DTIP + 's (' + g.back.map(function(i){ return i + 1; }).join(', ') + ')';
        else verdict = (g.back.length ? 'only 1 ' + DTIP : 'no ' + DTIP) + ': grouped by overall resemblance, not by a shared pattern';
      } else {
        var bad = sel.filter(function(x){ return !colOk[x]; });
        verdict = bad.length ? 'defined partly by column ' + bad.map(function(i){ return i + 1; }).join(', ') + ', which no other column backs: not a reliable group'
                             : 'every column that defines it is backed: a shared pattern, a subfamily candidate';
      }
      var key = mode === 'cols' ? '<br>reads ' + g.key.split('').map(function(b, j){ return b + ' at ' + (sel[j] + 1); }).join(', ') : '';
      var comp = cbTruth.checked ? '<br>true lineages: A ' + g.comp.A + ', B ' + g.comp.B + ', C ' + g.comp.C : '';
      var med = median(g.div.map(function(d){ return d.own; })).toFixed(1);
      html.push('<div style="border-top-color:' + g.col + '"><b>' + g.label + ': ' + n + (n === 1 ? ' copy' : ' copies') + '</b>' + verdict + key +
        '<br>median divergence from own consensus ' + med + ' %' + comp + '</div>');
    });
    out.innerHTML = html.join('');
  }

  function render(){ compute(); drawAln(); drawDiv(); readout(); }

  svg.addEventListener('click', function(e){
    var c = e.target.getAttribute && e.target.getAttribute('data-c');
    if (c == null) return;
    c = +c;
    if (mode !== 'cols'){ mode = 'cols'; sel = []; }
    var at = sel.indexOf(c);
    if (at >= 0) sel.splice(at, 1); else { if (sel.length >= 4) sel.shift(); sel.push(c); }
    inCols.value = sel.map(function(i){ return i + 1; }).join(', ');
    render();
  });
  document.getElementById('s04-apply').addEventListener('click', function(){ mode = 'cols'; sel = parseCols(); inCols.value = sel.map(function(i){ return i + 1; }).join(', '); render(); });
  inCols.addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); document.getElementById('s04-apply').click(); } });
  document.getElementById('s04-clear').addEventListener('click', function(){ mode = 'cols'; sel = []; inCols.value = ''; render(); });
  document.getElementById('s04-ident').addEventListener('click', function(){ mode = 'ident'; sel = []; inCols.value = ''; render(); });
  document.getElementById('s04-new').addEventListener('click', function(){ seed = (seed * 7 + 13) % 100003; build(); render(); });
  cbTruth.addEventListener('change', render);
  cbCpg.addEventListener('change', render);

  build(); render();
})();
