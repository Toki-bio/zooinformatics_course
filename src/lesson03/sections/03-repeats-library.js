(function(){
  var box = document.getElementById('s03-aln');
  if (!box) return;
  var NS = 'http://www.w3.org/2000/svg';
  var B = ['A','C','G','T'];
  var NCOPY = 12, TELEN = 70, FL = 45, TOT = FL + TELEN + FL;     // copy layout: flank | TE | flank
  var TES = FL, TEE = FL + TELEN;                                  // TE columns [45,115)
  var SEEDS = TES + 20, SEEDE = TES + 50;                          // seed = TE bases 21-50 -> columns [65,95)
  var MAXEXT = 45, C0 = SEEDS - MAXEXT, C1 = SEEDE + MAXEXT;       // drawable columns [20,140)
  var THR = 0.6, RUN = 3;
  var TRUNC = [1, 4, 7, 10];

  var elL = document.getElementById('s03-L'), elR = document.getElementById('s03-R'),
      elD = document.getElementById('s03-div'), elT = document.getElementById('s03-trunc'),
      elS = document.getElementById('s03-true');
  var oL = document.getElementById('s03-Lo'), oR = document.getElementById('s03-Ro'), oD = document.getElementById('s03-divo');
  var out = document.getElementById('s03-out'), msg = document.getElementById('s03-msg'), leg = document.getElementById('s03-legend');

  var seed = 7, copies = [], found = null;

  function rng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function build(){
    var r = rng(seed), d = (+elD.value) / 100, i, j;
    var te = []; for (i = 0; i < TELEN; i++) te.push(B[Math.floor(r() * 4)]);
    copies = [];
    for (j = 0; j < NCOPY; j++){
      var s = [];
      for (i = 0; i < TOT; i++){
        if (i >= TES && i < TEE){
          var b = te[i - TES];
          if (r() < d){ var nb; do { nb = B[Math.floor(r() * 4)]; } while (nb === b); b = nb; }
          s.push(b);
        } else s.push(B[Math.floor(r() * 4)]);
      }
      // break point for optional 5' truncation (kept outside the seed)
      var br = TES + 3 + Math.floor(r() * 15);
      var alt = []; for (i = TES; i < br; i++) alt.push(B[Math.floor(r() * 4)]);
      copies.push({ s: s, br: br, alt: alt });
    }
  }

  function baseAt(j, c){
    var cp = copies[j];
    if (elT.checked && TRUNC.indexOf(j) >= 0 && c >= TES && c < cp.br) return cp.alt[c - TES];
    return cp.s[c];
  }

  function colStat(c){
    var n = { A:0, C:0, G:0, T:0 }, j;
    for (j = 0; j < NCOPY; j++) n[baseAt(j, c)]++;
    var best = 'A', mx = -1, ties = 0;
    B.forEach(function(b){ if (n[b] > mx){ mx = n[b]; best = b; ties = 1; } else if (n[b] === mx) ties++; });
    return { maj: best, f: mx / NCOPY, tie: ties > 1 };
  }

  function trimFind(stats){
    // walk outwards from the seed; boundary where RUN columns in a row fall below THR
    var L = +elL.value, R = +elR.value, lo = SEEDS - L, hi = SEEDE + R, c, run;
    var left = null, right = null;
    run = 0;
    for (c = SEEDS - 1; c >= lo; c--){ if (stats[c].f < THR){ run++; if (run === RUN){ left = c + RUN; break; } } else run = 0; }
    run = 0;
    for (c = SEEDE; c < hi; c++){ if (stats[c].f < THR){ run++; if (run === RUN){ right = c - RUN + 1; break; } } else run = 0; }
    return { left: left, right: right };   // left = first TE column, right = one past last
  }

  function el(tag, at, txt){ var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; }

  function draw(){
    var L = +elL.value, R = +elR.value;
    oL.textContent = L + ' bp'; oR.textContent = R + ' bp'; oD.textContent = elD.value + ' %';
    var lo = SEEDS - L, hi = SEEDE + R, c, j;
    var stats = {}; for (c = C0; c < C1; c++) stats[c] = colStat(c);

    var cw = 8, lx = 64, top = 22, rh = 13, ncol = C1 - C0;
    var alnH = NCOPY * rh, barTop = top + alnH + 10, barH = 54, conY = barTop + barH + 18, H = conY + 26;
    var W = lx + ncol * cw + 8;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img',
      'aria-label': 'Alignment of 12 toy TE copies with agreement bars' });
    svg.style.minWidth = '760px';
    function X(col){ return lx + (col - C0) * cw; }

    if (elS.checked) svg.appendChild(el('rect', { x: X(TES), y: top - 12, width: TELEN * cw, height: alnH + 14 + barH + 10,
      fill: 'var(--rep)', 'fill-opacity': 0.12 }));
    // revealed window
    svg.appendChild(el('rect', { x: X(lo), y: top - 11, width: (hi - lo) * cw, height: alnH + 2, fill: 'var(--panel)', stroke: 'var(--line)' }));
    // seed frame
    svg.appendChild(el('rect', { x: X(SEEDS), y: top - 11, width: (SEEDE - SEEDS) * cw, height: alnH + 2, fill: 'none',
      stroke: 'var(--accent)', 'stroke-width': 1.5 }));
    svg.appendChild(el('text', { x: X(SEEDS), y: top - 14, class: 'lab' }, 'seed (TE bases 21-50)'));

    for (j = 0; j < NCOPY; j++){
      var y = top + j * rh;
      var trunc = elT.checked && TRUNC.indexOf(j) >= 0;
      svg.appendChild(el('text', { x: 4, y: y }, 'copy ' + (j + 1) + (trunc ? '*' : '')));
      for (c = C0; c < C1; c++){
        if (c < lo || c >= hi){
          if (c % 2 === 0) svg.appendChild(el('circle', { cx: X(c) + cw / 2, cy: y - 4, r: 0.8, fill: 'var(--line)' }));
          continue;
        }
        var b = baseAt(j, c), same = b === stats[c].maj && !stats[c].tie;
        var t = el('text', { x: X(c) + cw / 2, y: y, 'text-anchor': 'middle' }, b);
        t.style.fill = same ? 'var(--fg)' : 'var(--err)';
        t.style.fontSize = '10.5px';
        svg.appendChild(t);
      }
    }
    // agreement bars
    svg.appendChild(el('text', { x: 4, y: barTop + 10 }, 'agree'));
    svg.appendChild(el('line', { x1: lx, x2: X(C1), y1: barTop + barH, y2: barTop + barH, class: 'ax' }));
    var ty = barTop + barH * (1 - THR);
    for (c = lo; c < hi; c++){
      var h = barH * stats[c].f;
      svg.appendChild(el('rect', { x: X(c) + 1, y: barTop + barH - h, width: cw - 2, height: h,
        fill: stats[c].f >= THR ? 'var(--good)' : 'var(--err)' }));
    }
    svg.appendChild(el('line', { x1: lx, x2: X(C1), y1: ty, y2: ty, stroke: 'var(--het)', 'stroke-dasharray': '4 3' }));
    svg.appendChild(el('text', { x: 4, y: ty + 4 }, '60 %'));
    // consensus
    svg.appendChild(el('text', { x: 4, y: conY, class: 'lab' }, 'consensus'));
    for (c = lo; c < hi; c++){
      var s = stats[c], ch = s.tie ? 'n' : (s.f >= THR ? s.maj : s.maj.toLowerCase());
      var tt = el('text', { x: X(c) + cw / 2, y: conY, 'text-anchor': 'middle' }, ch);
      tt.style.fill = s.f >= THR && !s.tie ? 'var(--accent)' : 'var(--err)'; tt.style.fontWeight = '600';
      svg.appendChild(tt);
    }
    // found boundaries
    if (found){
      [['left', found.left, 'found start'], ['right', found.right, 'found end']].forEach(function(a){
        if (a[1] == null) return;
        svg.appendChild(el('line', { x1: X(a[1]), x2: X(a[1]), y1: top - 12, y2: conY + 6, stroke: 'var(--het)', 'stroke-width': 2 }));
        var lab = el('text', { x: X(a[1]) + (a[0] === 'left' ? -3 : 3), y: H - 4, 'text-anchor': a[0] === 'left' ? 'end' : 'start' }, a[2]);
        lab.style.fill = 'var(--het)'; svg.appendChild(lab);
      });
    }
    if (elS.checked){
      var tl = el('text', { x: X(TES) + 2, y: H - 4 }, 'true TE: 70 bp');
      tl.style.fill = 'var(--rep)'; if (!found) svg.appendChild(tl);
    }
    box.innerHTML = ''; box.appendChild(svg);

    // readout
    function edgeMean(from, step){ var s = 0, k; for (k = 0; k < RUN; k++) s += stats[from + k * step].f; return Math.round(100 * s / RUN); }
    var le = edgeMean(lo, 1), re = edgeMean(hi - 1, -1);
    var lTrim = found && found.left === lo, rTrim = found && found.right === hi;
    function edgeTxt(v, tr){ return tr ? 'trimmed here: the next 3 columns outside fall below 60 %' :
      (v >= 60 ? 'copies still agree: extend further' : 'mostly unique sequence: you are past the edge'); }
    out.innerHTML = '';
    [['Consensus length', (hi - lo) + ' bp', 'true element: 70 bp'],
     ['Agreement at left end', le + ' %', edgeTxt(le, lTrim)],
     ['Agreement at right end', re + ' %', edgeTxt(re, rTrim)]
    ].forEach(function(r){ var d = document.createElement('div');
      d.innerHTML = '<span class="tip" title="Mean agreement of the outermost 3 columns of the current window.">' + r[0] + '</span><b>' + r[1] + '</b><span style="color:var(--muted)">' + r[2] + '</span>';
      if (r[0] === 'Consensus length') d.firstChild.title = 'Width of the window you took from every copy.';
      out.appendChild(d); });
  }

  function legend(){
    leg.innerHTML = '<span><i style="background:var(--good);height:10px"></i>column agreement &ge; 60 %</span>' +
      '<span><i style="background:var(--err);height:10px"></i>below 60 % (or base differs from the majority)</span>' +
      '<span><i style="background:var(--het)"></i>60 % line / found boundary</span>' +
      '<span><i style="background:var(--rep);opacity:.4;height:10px"></i>true TE (when shown)</span>' +
      '<span>* = 5&prime;-truncated copy</span>';
  }

  function say(t){ msg.textContent = t; }

  var lastMsg = '';
  function doTrim(){
    if (found){ say(lastMsg); return; }
    var stats = {}; for (var c = C0; c < C1; c++) stats[c] = colStat(c);
    var f = trimFind(stats), parts = [];
    found = { left: f.left, right: f.right };
    if (f.left == null) parts.push('Left: no boundary inside your window yet; the copies still agree at its edge. Extend left and trim again.');
    else { elL.value = SEEDS - f.left; var dl = f.left - TES;
      parts.push('Left end placed ' + (dl === 0 ? 'exactly at the true start' : Math.abs(dl) + ' bp ' + (dl > 0 ? 'inside the element (too short)' : 'outside the element (flank kept)')) + '.'); }
    if (f.right == null) parts.push('Right: no boundary inside your window yet. Extend right and trim again.');
    else { elR.value = f.right - SEEDE; var dr = f.right - TEE;
      parts.push('Right end placed ' + (dr === 0 ? 'exactly at the true end' : Math.abs(dr) + ' bp ' + (dr < 0 ? 'inside the element (too short)' : 'outside the element (flank kept)')) + '.'); }
    if (f.left != null && f.right != null) parts.push('New consensus: ' + (f.right - f.left) + ' bp.');
    lastMsg = parts.join(' '); draw(); say(lastMsg);
  }

  function changed(){ found = null; say(''); draw(); }
  elL.addEventListener('input', changed); elR.addEventListener('input', changed);
  elD.addEventListener('input', function(){ build(); changed(); });
  elT.addEventListener('change', changed); elS.addEventListener('change', draw);
  document.getElementById('s03-trim').addEventListener('click', doTrim);
  document.getElementById('s03-new').addEventListener('click', function(){ seed = (seed * 31 + 17) % 100003; build(); changed(); });
  document.getElementById('s03-reset').addEventListener('click', function(){ elL.value = 0; elR.value = 0; changed(); });

  legend(); build(); draw();
})();
