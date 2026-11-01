(function(){
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent, style){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    if (style) for (var s in style) if (style.hasOwnProperty(s)) e.style[s] = style[s];
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, cls, anchor, extra){
    var t = el('text', {x: x, y: y}, parent);
    if (cls) t.setAttribute('class', cls);
    if (anchor) t.setAttribute('text-anchor', anchor);
    if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) t.setAttribute(k, extra[k]);
    t.textContent = s;
    return t;
  }

  /* ================= 1. Hi-C protocol stepper ================= */
  (function(){
    var box = document.getElementById('s05-proto');
    var seg = document.getElementById('s05-pseg');
    var cap = document.getElementById('s05-pcap');
    if (!box || !seg || !cap) return;
    var STEPS = [
      ['1 Fix', '<b>1 · Fix.</b> Cells are treated with a chemical fixative (formaldehyde in the original protocol) that cross-links DNA to the proteins around it. Two places that happen to touch in the nucleus are now held together (red bar). Here locus a (2.10 Mb) and locus b (7.85 Mb) of chromosome 1 touch because the chromosome folds back on itself. Chromosome 2 sits in its own territory and rarely touches chromosome 1.'],
      ['2 Cut', '<b>2 · Cut.</b> The DNA is cut into pieces, by a restriction enzyme at its short site (Hi-C, Arima) or by a nuclease anywhere (Omni-C). The pieces a and b stay held together by the cross-link.'],
      ['3 Mark', '<b>3 · Mark the ends.</b> The cut ends are filled in with nucleotides that carry <span class="tip" title="A small vitamin molecule that sticks very tightly to streptavidin-coated magnetic beads, so tagged DNA can be fished out.">biotin</span> (orange dots), so the junction made in the next step can be fished out later.'],
      ['4 Ligate', '<b>4 · Ligate.</b> <span class="tip" title="Joining two DNA ends with the enzyme ligase.">Ligation</span> joins ends that are close to each other: a and b become one hybrid molecule with a marked junction. This "proximity ligation" is what records the contact.'],
      ['5 Pull down', '<b>5 · Shear and pull down.</b> Cross-links are reversed, the DNA is broken to sequencing size, and pieces that carry the biotin junction are captured on beads. Pieces without a junction (no contact information) are mostly washed away.'],
      ['6 Sequence', '<b>6 · Sequence.</b> Each captured piece is read from both ends (paired-end short reads). Read 1 comes from a, read 2 from b. Mapped to the genome they land 5.75 Mb apart on chromosome 1: one contact. Millions of such pairs make the contact map.']
    ];
    var cur = 0, btns = [];
    STEPS.forEach(function(s, i){
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = s[0];
      b.addEventListener('click', function(){ cur = i; draw(); });
      seg.appendChild(b); btns.push(b);
    });
    function draw(){
      btns.forEach(function(b, i){ b.setAttribute('aria-pressed', i === cur ? 'true' : 'false'); });
      cap.innerHTML = STEPS[cur][1];
      box.innerHTML = '';
      var svg = el('svg', {viewBox: '0 0 680 230', width: '100%', role: 'img', 'aria-label': 'Hi-C protocol step ' + (cur + 1)}, box, {minWidth: '360px', display: 'block'});
      // nucleus
      el('ellipse', {cx: 190, cy: 115, rx: 180, ry: 100}, svg, {fill: 'none', stroke: 'var(--line)', strokeWidth: '1.5', strokeDasharray: '4 4'});
      txt(svg, 20, 24, 'nucleus', null, 'start');
      // chromosome 1: hairpin
      var cut = cur >= 1;
      var c1 = {stroke: 'var(--accent)', strokeWidth: '4', fill: 'none', strokeLinecap: 'round'};
      if (!cut) {
        el('path', {d: 'M40 85 H260 C320 85 320 145 260 145 H40'}, svg, c1);
      } else {
        el('path', {d: 'M40 85 H172'}, svg, c1);
        el('path', {d: 'M202 85 H260 C320 85 320 145 260 145 H202'}, svg, c1);
        el('path', {d: 'M172 145 H40'}, svg, c1);
      }
      el('path', {d: 'M176 85 H198'}, svg, {stroke: 'var(--accent)', strokeWidth: '6', fill: 'none', opacity: cur >= 3 ? 0.25 : 1});
      el('path', {d: 'M176 145 H198'}, svg, {stroke: 'var(--accent)', strokeWidth: '6', fill: 'none', opacity: cur >= 3 ? 0.25 : 1});
      txt(svg, 187, 74, 'a', 'lab', 'middle');
      txt(svg, 187, 166, 'b', 'lab', 'middle');
      txt(svg, 40, 74, 'chr 1', null, 'start');
      if (cur <= 2) el('line', {x1: 187, y1: 90, x2: 187, y2: 140}, svg, {stroke: 'var(--bad)', strokeWidth: '3'});
      if (cur === 2) [176, 198].forEach(function(x){ [85, 145].forEach(function(y){ el('circle', {cx: x, cy: y, r: 4}, svg, {fill: 'var(--het)'}); }); });
      // chromosome 2
      el('path', {d: 'M60 195 C110 175 170 205 230 188 S320 170 340 160'}, svg, {stroke: 'var(--het)', strokeWidth: '4', fill: 'none', strokeLinecap: 'round'});
      txt(svg, 300, 196, 'chr 2', null, 'start');
      // right panel
      var X = 420;
      el('line', {x1: 395, y1: 20, x2: 395, y2: 215}, svg, {stroke: 'var(--line)', strokeWidth: '1'});
      txt(svg, X, 30, ['held together', 'two pieces, still linked', 'ends tagged with biotin', 'one hybrid molecule', 'short piece on a bead', 'paired reads'][cur], 'lab', 'start');
      var seg2 = {strokeWidth: '6', fill: 'none', strokeLinecap: 'butt'};
      if (cur <= 2) {
        el('path', {d: 'M470 85 H560'}, svg, Object.assign({stroke: 'var(--accent)'}, seg2));
        el('path', {d: 'M470 145 H560'}, svg, Object.assign({stroke: 'var(--accent)'}, seg2));
        txt(svg, 515, 74, 'a', 'lab', 'middle'); txt(svg, 515, 166, 'b', 'lab', 'middle');
        if (cur === 0) { el('path', {d: 'M430 85 H470 M560 85 H600 M430 145 H470 M560 145 H600'}, svg, {stroke: 'var(--accent)', strokeWidth: '2', fill: 'none', opacity: .5}); }
        el('line', {x1: 515, y1: 90, x2: 515, y2: 140}, svg, {stroke: 'var(--bad)', strokeWidth: '3'});
        if (cur === 2) [470, 560].forEach(function(x){ [85, 145].forEach(function(y){ el('circle', {cx: x, cy: y, r: 4}, svg, {fill: 'var(--het)'}); }); });
      } else {
        var y = 115, x0 = cur === 3 ? 440 : 470, x1 = cur === 3 ? 640 : 610, mid = 540;
        el('path', {d: 'M' + x0 + ' ' + y + ' H' + mid}, svg, Object.assign({stroke: 'var(--accent)'}, seg2));
        el('path', {d: 'M' + mid + ' ' + y + ' H' + x1}, svg, Object.assign({stroke: 'var(--accent)', opacity: .65}, seg2));
        el('line', {x1: mid, y1: y - 9, x2: mid, y2: y + 9}, svg, {stroke: 'var(--fg)', strokeWidth: '1.5'});
        el('circle', {cx: mid, cy: y, r: 4}, svg, {fill: 'var(--het)'});
        txt(svg, (x0 + mid) / 2, y - 12, 'from a', null, 'middle');
        txt(svg, (mid + x1) / 2, y - 12, 'from b', null, 'middle');
        txt(svg, mid, y + 24, 'junction', null, 'middle');
        if (cur === 4) { el('circle', {cx: mid, cy: y + 52, r: 14}, svg, {fill: 'var(--panel)', stroke: 'var(--muted)', strokeWidth: '1.5'}); el('line', {x1: mid, y1: y + 4, x2: mid, y2: y + 38}, svg, {stroke: 'var(--het)', strokeWidth: '1.5'}); txt(svg, mid + 20, y + 56, 'bead', null, 'start'); }
        if (cur === 5) {
          el('path', {d: 'M470 ' + (y + 34) + ' H520 l-6 -4 M520 ' + (y + 34) + ' l-6 4'}, svg, {stroke: 'var(--good)', strokeWidth: '2', fill: 'none'});
          el('path', {d: 'M610 ' + (y + 34) + ' H560 l6 -4 M560 ' + (y + 34) + ' l6 4'}, svg, {stroke: 'var(--good)', strokeWidth: '2', fill: 'none'});
          txt(svg, 470, y + 52, 'read 1', 'lab', 'start'); txt(svg, 610, y + 52, 'read 2', 'lab', 'end');
          txt(svg, 420, y + 82, 'read 1 → chr 1 : 2.10 Mb', null, 'start');
          txt(svg, 420, y + 98, 'read 2 → chr 1 : 7.85 Mb', null, 'start');
        }
      }
    }
    draw();
  })();

  /* ================= 2. Toy contact map ================= */
  var mapBox = document.getElementById('s05-map');
  var cseg = document.getElementById('s05-cseg');
  var out = document.getElementById('s05-out');
  var logEl = document.getElementById('s05-log');
  var misBox = document.getElementById('s05-mis');
  if (!mapBox || !cseg || !out) return;

  var CHR_LEN = [28, 24];
  var BINS = []; // true identity of each global bin
  CHR_LEN.forEach(function(L, c){ for (var p = 0; p < L; p++) BINS.push({c: c, p: p}); });
  var NB = BINS.length;
  function gid(c, p){ return c === 0 ? p : CHR_LEN[0] + p; }
  function range(c, a, b){ var r = []; for (var p = a; p <= b; p++) r.push(gid(c, p)); return r; }

  // deterministic symmetric noise
  function noise(u, v){
    var a = Math.min(u, v), b = Math.max(u, v);
    var h = (a * 73856093) ^ (b * 19349663) ^ 0x5bd1e995;
    h = (h ^ (h >>> 13)) * 1274126177; h = h ^ (h >>> 16);
    return 0.72 + ((h >>> 0) % 1000) / 1000 * 0.56;
  }
  var BG = 1.2;
  var C = [];
  for (var u = 0; u < NB; u++) { C.push([]); for (var v = 0; v < NB; v++) {
    var bu = BINS[u], bv = BINS[v], val = BG;
    if (bu.c === bv.c) val += 100 / (1 + Math.abs(bu.p - bv.p));
    C[u][v] = val * noise(u, v);
  } }

  var rng = (function(){ var s = 11; return function(){ s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();
  function makeContigs(mis){
    if (!mis) return [
      {n: 'A', base: range(0, 0, 7)}, {n: 'B', base: range(0, 8, 13)}, {n: 'C', base: range(0, 14, 21)},
      {n: 'D', base: range(0, 22, 27)}, {n: 'E', base: range(1, 0, 9)}, {n: 'F', base: range(1, 10, 15)}, {n: 'G', base: range(1, 16, 23)}];
    return [
      {n: 'A', base: range(0, 0, 7)}, {n: 'B', base: range(0, 8, 13)}, {n: 'C', base: range(0, 14, 21)},
      {n: 'D', base: range(0, 22, 27).concat(range(1, 0, 3))}, {n: 'E', base: range(1, 4, 9)}, {n: 'F', base: range(1, 10, 15)}, {n: 'G', base: range(1, 16, 23)}];
  }
  var state = {order: [], sel: 0, busy: false};
  function bins(ct){ return ct.flip ? ct.base.slice().reverse() : ct.base; }
  function layout(){ var r = []; state.order.forEach(function(ct){ r = r.concat(bins(ct)); }); return r; }
  function label(ct){ return ct.flip ? '←' + ct.n : ct.n + '→'; }

  function shuffle(){
    var cs = makeContigs(misBox && misBox.checked);
    var tries = 0;
    do {
      for (var i = cs.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = cs[i]; cs[i] = cs[j]; cs[j] = t; }
      cs.forEach(function(ct){ ct.flip = rng() < 0.45; });
      state.order = cs;
      tries++;
    } while (goodJoins() >= 2 && tries < 50);
    state.sel = 0;
    say('Shuffled. Select a contig and move or flip it.');
  }

  // correct neighbour count
  function goodJoins(){
    var n = 0;
    for (var i = 0; i + 1 < state.order.length; i++) {
      var L = bins(state.order[i]), R = bins(state.order[i + 1]);
      var a = BINS[L[L.length - 1]], a0 = BINS[L[L.length - 2]], b = BINS[R[0]], b1 = BINS[R[1]];
      if (!a0 || !b1) continue;
      if (a.c !== b.c || a0.c !== a.c || b1.c !== b.c) continue;
      var dL = a.p - a0.p, dJ = b.p - a.p, dR = b1.p - b.p;
      if (Math.abs(dJ) === 1 && dL === dJ && dR === dJ) n++;
    }
    return n;
  }
  function hasChimera(){
    return state.order.some(function(ct){ var b = ct.base; for (var i = 1; i < b.length; i++) if (BINS[b[i]].c !== BINS[b[i - 1]].c) return true; return false; });
  }
  function diagShare(lay){
    var near = 0, tot = 0;
    for (var i = 0; i < NB; i++) for (var j = 0; j < NB; j++) { var c = C[lay[i]][lay[j]]; tot += c; if (Math.abs(i - j) <= 3) near += c; }
    return near / tot;
  }
  var BEST = (function(){ var lay = []; for (var i = 0; i < NB; i++) lay.push(i); return diagShare(lay); })();

  /* ---- drawing ---- */
  var M = {l: 50, t: 40, cs: 9};
  var W = M.l + NB * M.cs + 12, H = M.t + NB * M.cs + 12;
  mapBox.innerHTML = '';
  var svg = el('svg', {viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Toy Hi-C contact map'}, mapBox, {minWidth: '330px', maxWidth: '620px', display: 'block'});
  el('rect', {x: M.l, y: M.t, width: NB * M.cs, height: NB * M.cs}, svg, {fill: 'var(--panel)', stroke: 'var(--line)'});
  var cells = [];
  var gCells = el('g', {}, svg);
  for (var i = 0; i < NB; i++) { cells.push([]); for (var j = 0; j < NB; j++) {
    cells[i].push(el('rect', {x: M.l + j * M.cs, y: M.t + i * M.cs, width: M.cs + 0.4, height: M.cs + 0.4}, gCells, {fill: 'var(--accent)'}));
  } }
  var gOver = el('g', {}, svg);

  function opacity(c){ var o = Math.log(1 + c) / Math.log(1 + 100); return Math.max(0.03, Math.min(1, Math.pow(o, 1.6))); }

  function draw(){
    var lay = layout();
    for (var i = 0; i < NB; i++) for (var j = 0; j < NB; j++) cells[i][j].style.fillOpacity = opacity(C[lay[i]][lay[j]]).toFixed(3);
    gOver.innerHTML = '';
    var pos = 0, spans = [];
    state.order.forEach(function(ct, k){
      var n = ct.base.length, x = M.l + pos * M.cs, y = M.t + pos * M.cs, len = n * M.cs, isSel = k === state.sel;
      spans.push([pos, pos + n]);
      var fill = isSel ? 'var(--het)' : 'var(--accent)';
      var top = el('rect', {x: x + 1, y: M.t - 16, width: len - 2, height: 10, tabindex: -1}, gOver, {fill: fill, opacity: isSel ? 1 : 0.55, cursor: 'pointer'});
      var lef = el('rect', {x: M.l - 16, y: y + 1, width: 10, height: len - 2}, gOver, {fill: fill, opacity: isSel ? 1 : 0.55, cursor: 'pointer'});
      [top, lef].forEach(function(r){ r.addEventListener('click', function(){ if (!state.busy) { state.sel = k; draw(); } }); });
      txt(gOver, x + len / 2, M.t - 22, label(ct), isSel ? 'lab' : null, 'middle');
      txt(gOver, M.l - 20, y + len / 2 + 4, label(ct), isSel ? 'lab' : null, 'end');
      if (pos > 0) {
        el('line', {x1: x, y1: M.t, x2: x, y2: M.t + NB * M.cs}, gOver, {stroke: 'var(--muted)', strokeWidth: '0.8', opacity: .55});
        el('line', {x1: M.l, y1: y, x2: M.l + NB * M.cs, y2: y}, gOver, {stroke: 'var(--muted)', strokeWidth: '0.8', opacity: .55});
      }
      pos += n;
    });
    // strongest off-diagonal contact of the selected contig
    var s = spans[state.sel];
    if (s) {
      var best = -1, bi = 0, bj = 0;
      for (var i2 = s[0]; i2 < s[1]; i2++) for (var j2 = 0; j2 < NB; j2++) {
        if (j2 >= s[0] && j2 < s[1]) continue;
        var c = C[lay[i2]][lay[j2]];
        if (c > best) { best = c; bi = i2; bj = j2; }
      }
      if (best > BG * 2) [[bi, bj], [bj, bi]].forEach(function(p){
        el('rect', {x: M.l + p[1] * M.cs - 2, y: M.t + p[0] * M.cs - 2, width: M.cs + 4, height: M.cs + 4}, gOver, {fill: 'none', stroke: 'var(--bad)', strokeWidth: '2'});
      });
    }
    // buttons
    cseg.innerHTML = '';
    state.order.forEach(function(ct, k){
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = label(ct);
      b.setAttribute('aria-pressed', k === state.sel ? 'true' : 'false');
      b.addEventListener('click', function(){ if (!state.busy) { state.sel = k; draw(); } });
      cseg.appendChild(b);
    });
    // readout
    var g = goodJoins(), mx = state.order.length - CHR_LEN.length, chim = hasChimera();
    var share = diagShare(lay);
    var solved = !chim && g === mx;
    out.innerHTML =
      '<div>Contigs<b>' + state.order.length + '</b></div>' +
      '<div>Correct neighbours<b>' + g + ' of ' + mx + (chim ? ' (misjoin present)' : '') + '</b></div>' +
      '<div>Signal within 3 bins of the diagonal<b>' + (share * 100).toFixed(1) + ' % <span style="font-size:12px;color:var(--muted)">(best ' + (BEST * 100).toFixed(1) + ' %)</span></b></div>' +
      '<div>Status<b style="color:' + (solved ? 'var(--good)' : 'var(--fg)') + '">' + (solved ? 'two clean chromosomes' : (chim ? 'misjoin: break D first' : 'keep going')) + '</b></div>';
  }
  function say(s){ if (logEl) logEl.textContent = s; }

  /* ---- manual edits ---- */
  function move(d){
    if (state.busy) return;
    var k = state.sel, t = k + d;
    if (t < 0 || t >= state.order.length) return;
    var x = state.order[k]; state.order[k] = state.order[t]; state.order[t] = x; state.sel = t; draw();
  }
  function on(id, f){ var b = document.getElementById(id); if (b) b.addEventListener('click', f); }
  on('s05-left', function(){ move(-1); });
  on('s05-right', function(){ move(1); });
  on('s05-flip', function(){ if (state.busy) return; var ct = state.order[state.sel]; if (ct) { ct.flip = !ct.flip; draw(); } });
  on('s05-shuffle', function(){ if (state.busy) return; shuffle(); draw(); });
  if (misBox) misBox.addEventListener('change', function(){ if (state.busy) { misBox.checked = !misBox.checked; return; } shuffle(); draw(); });

  /* ---- YaHS-like steps ---- */
  // expected contact at distance d from intra-contig cells (median), background from inter-contig cells (median)
  function median(a){ if (!a.length) return 0; a = a.slice().sort(function(x, y){ return x - y; }); var m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
  function expected(){
    var byD = [], inter = [];
    state.order.forEach(function(ct){ var b = ct.base; for (var i = 0; i < b.length; i++) for (var j = i + 1; j < b.length; j++) { var d = j - i; (byD[d] = byD[d] || []).push(C[b[i]][b[j]]); } });
    for (var a = 0; a < state.order.length; a++) for (var b2 = a + 1; b2 < state.order.length; b2++) {
      var A = state.order[a].base, B = state.order[b2].base;
      for (var i = 0; i < A.length; i++) for (var j = 0; j < B.length; j++) inter.push(C[A[i]][B[j]]);
    }
    var E = byD.map(function(x){ return x ? median(x) : 0; });
    return {E: E, bg: median(inter)};
  }
  // contig error check: signal across each internal cut point vs expectation
  function findBreak(ct, ex){
    var b = ct.base, w = 3, worst = 1e9, at = -1;
    for (var k = w; k <= b.length - w; k++) {
      var obs = 0, exp = 0;
      for (var i = k - w; i < k; i++) for (var j = k; j < k + w; j++) { obs += Math.max(0, C[b[i]][b[j]] - ex.bg); exp += Math.max(1e-9, (ex.E[j - i] || 0) - ex.bg); }
      var r = obs / exp;
      if (r < worst) { worst = r; at = k; }
    }
    return worst < 0.3 ? {at: at, r: worst} : null;
  }
  function doBreak(idx, br){
    var ct = state.order[idx];
    var p1 = {n: ct.n + '1', base: ct.base.slice(0, br.at), flip: ct.flip}, p2 = {n: ct.n + '2', base: ct.base.slice(br.at), flip: ct.flip};
    var parts = ct.flip ? [p2, p1] : [p1, p2];
    state.order.splice(idx, 1, parts[0], parts[1]);
  }
  // join score between the right end of scaffold-oriented bins L and left end of R
  function joinScore(L, R, ex){
    var w = 3, s = 0, n = 0;
    for (var i = 0; i < w; i++) for (var j = 0; j < w; j++) {
      var d = i + j + 1, e = (ex.E[d] || 0) - ex.bg;
      if (e <= 0) continue;
      s += Math.min(1, Math.max(0, C[L[L.length - 1 - i]][R[j]] - ex.bg) / e); n++;
    }
    return n ? s / n : 0;
  }
  function scafBins(sc){ var r = []; sc.forEach(function(ct){ r = r.concat(bins(ct)); }); return r; }
  function flipScaf(sc){ return sc.slice().reverse().map(function(ct){ ct.flip = !ct.flip; return ct; }); }

  var timer = null;
  function auto(){
    if (state.busy) return;
    state.busy = true;
    var steps = [];
    // 1) error correction
    var ex = expected();
    var broke = false;
    for (var i = 0; i < state.order.length; i++) {
      var br = findBreak(state.order[i], ex);
      if (br) { var nm = state.order[i].n; doBreak(i, br); broke = true; steps.push('Contig check: contacts across one point of ' + nm + ' are only ' + Math.round(br.r * 100) + ' % of the expected level → broken into ' + nm + '1 and ' + nm + '2.'); break; }
    }
    if (!broke) steps.push('Contig check: no contig has a drop in contacts; nothing broken.');
    ex = expected();
    var scafs = state.order.map(function(ct){ return [ct]; });
    var round = 0;
    function stepJoin(){
      var best = null;
      for (var a = 0; a < scafs.length; a++) for (var b = 0; b < scafs.length; b++) {
        if (a === b) continue;
        for (var fa = 0; fa < 2; fa++) for (var fb = 0; fb < 2; fb++) {
          var A = fa ? scafBins(scafs[a]).slice().reverse() : scafBins(scafs[a]);
          var B = fb ? scafBins(scafs[b]).slice().reverse() : scafBins(scafs[b]);
          var s = joinScore(A, B, ex);
          if (!best || s > best.s) best = {s: s, a: a, b: b, fa: fa, fb: fb};
        }
      }
      return best;
    }
    function flat(){ state.order = []; scafs.forEach(function(sc){ state.order = state.order.concat(sc); }); state.sel = Math.min(state.sel, state.order.length - 1); }
    flat(); draw(); say(steps[0]);
    function tick(){
      var best = stepJoin();
      if (!best || best.s < 0.35) {
        state.busy = false;
        say(steps[0] + ' Joins made: ' + round + '. Best remaining join scores ' + (best ? best.s.toFixed(2) : '–') + ', below the 0.35 cut-off, so the two scaffolds stay separate: they are two chromosomes.');
        draw(); timer = null; return;
      }
      round++;
      var A = best.fa ? flipScaf(scafs[best.a]) : scafs[best.a];
      var B = best.fb ? flipScaf(scafs[best.b]) : scafs[best.b];
      var joined = A.concat(B);
      var lo = Math.min(best.a, best.b), hi = Math.max(best.a, best.b);
      scafs.splice(hi, 1); scafs.splice(lo, 1, joined);
      flat();
      var la = A[A.length - 1], lb = B[0];
      say('Join ' + round + ': ' + label(la) + ' then ' + label(lb) + ' (score ' + best.s.toFixed(2) + ', the highest of all end pairs and orientations).');
      draw();
      timer = setTimeout(tick, 900);
    }
    timer = setTimeout(tick, 1100);
  }
  on('s05-auto', auto);
  on('s05-solve', function(){
    if (state.busy) return;
    var ex = expected();
    for (var i = 0; i < state.order.length; i++) { var br = findBreak(state.order[i], ex); if (br) { doBreak(i, br); break; } }
    state.order.forEach(function(ct){ ct.flip = false; });
    state.order.sort(function(x, y){ return x.base[0] - y.base[0]; });
    state.sel = 0;
    say('Answer: chromosome 1 = A B C D, chromosome 2 = E F G' + (misBox && misBox.checked ? ', after breaking the misjoined D into D1 (end of chr 1) and D2 (start of chr 2).' : '.'));
    draw();
  });

  shuffle();
  draw();
})();
