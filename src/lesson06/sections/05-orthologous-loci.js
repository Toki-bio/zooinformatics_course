(function(){
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent, text){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function svg(w, h, minw){
    return el('svg', {viewBox: '0 0 ' + w + ' ' + h, width: '100%', style: 'min-width:' + minw + 'px;display:block', role: 'img'});
  }
  function $(id){ return document.getElementById(id); }
  function tip(term, expl){ return '<span class="tip" title="' + expl.replace(/"/g, '&quot;') + '">' + term + '</span>'; }

  /* ---------------- 1. tree toy ---------------- */
  var BR = {
    R:  {x0: 30,  x1: 70,  y: 167.5, name: 'before all four split'},
    O:  {x0: 70,  x1: 520, y: 220,   name: 'O lineage'},
    IN: {x0: 70,  x1: 230, y: 115,   name: 'A+B+C stem'},
    C:  {x0: 230, x1: 520, y: 160,   name: 'C lineage'},
    AB: {x0: 230, x1: 380, y: 70,    name: 'A+B stem'},
    A:  {x0: 380, x1: 520, y: 40,    name: 'A lineage'},
    B:  {x0: 380, x1: 520, y: 100,   name: 'B lineage'}
  };
  var PATH = {O: ['R', 'O'], A: ['R', 'IN', 'AB', 'A'], B: ['R', 'IN', 'AB', 'B'], C: ['R', 'IN', 'C']};
  var TIPS = ['O', 'A', 'B', 'C'];
  var NL = 5;
  var marks = [];     // marks[i] = [{b, t}] t: ins | par | del | ils
  var cur = 0, act = 'ins';
  var PRESETS = {
    clean: [[['AB','ins']], [['AB','ins']], [['AB','ins']], [['IN','ins']], [['A','ins']]],
    ils:   [[['AB','ins']], [['AB','ins']], [['AB','ins']], [['IN','ins'], ['B','ils']], [['IN','ins'], ['A','ils']]],
    del:   [[['AB','ins']], [['AB','ins']], [['AB','ins']], [['IN','ins'], ['B','del']], [['A','ins']]],
    par:   [[['AB','ins']], [['AB','ins']], [['AB','ins']], [['A','ins'], ['C','par']], [['B','ins']]],
    old:   [[['R','ins']], [['AB','ins']], [['AB','ins']], [['IN','ins']], [['C','ins']]],
    none:  [[], [], [], [], []]
  };
  function loadPreset(p){
    marks = PRESETS[p].map(function(l){ return l.map(function(m){ return {b: m[0], t: m[1]}; }); });
    var bs = $('s05-pre').querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', bs[i].dataset.p === p ? 'true' : 'false');
  }
  function state(i, tipName){
    var s = 0, path = PATH[tipName];
    for (var k = 0; k < path.length; k++){
      var ms = marks[i].filter(function(m){ return m.b === path[k]; });
      if (ms.some(function(m){ return m.t === 'ins' || m.t === 'par'; })) s = 1;
      if (ms.some(function(m){ return m.t === 'del' || m.t === 'ils'; })) s = 0;
    }
    return s;
  }
  function onPath(anc, desc){ // is branch anc on the path to branch desc (or equal)?
    for (var t in PATH){ var p = PATH[t]; var a = p.indexOf(anc), d = p.indexOf(desc); if (a >= 0 && d >= 0 && a <= d) return true; }
    return false;
  }
  var tsvg, tg;
  function drawTree(){
    var box = $('s05-tree');
    if (!tsvg){ tsvg = svg(650, 250, 520); box.appendChild(tsvg); tsvg.setAttribute('aria-label', 'Tree of species A, B, C and outgroup O with insertion marks'); }
    while (tsvg.firstChild) tsvg.removeChild(tsvg.firstChild);
    // connectors
    [[380, 40, 100], [230, 70, 160], [70, 115, 220]].forEach(function(v){
      el('line', {x1: v[0], x2: v[0], y1: v[1], y2: v[2], stroke: 'var(--fg)', 'stroke-width': 2}, tsvg);
    });
    Object.keys(BR).forEach(function(k){
      var b = BR[k];
      var g = el('g', {'data-b': k, style: 'cursor:pointer', tabindex: 0, role: 'button', 'aria-label': 'branch ' + b.name}, tsvg);
      el('line', {x1: b.x0, x2: b.x1, y1: b.y, y2: b.y, stroke: 'var(--fg)', 'stroke-width': 2}, g);
      el('rect', {x: b.x0, y: b.y - 14, width: b.x1 - b.x0, height: 28, fill: 'transparent'}, g);
      el('text', {x: (b.x0 + b.x1) / 2, y: b.y - 13, 'text-anchor': 'middle', style: 'font-size:10px'}, g, k === 'R' ? '' : b.name);
      g.addEventListener('click', function(){ place(k); });
      g.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); place(k); } });
    });
    TIPS.forEach(function(t){
      var y = BR[t].y;
      el('text', {x: 530, y: y + 4, class: 'lab', style: 'font-size:13px;font-weight:600'}, tsvg, t === 'O' ? 'O (outgroup)' : 'species ' + t);
    });
    // marks
    Object.keys(BR).forEach(function(k){
      var b = BR[k], list = [];
      for (var i = 0; i < NL; i++) marks[i].forEach(function(m){ if (m.b === k) list.push({i: i, t: m.t}); });
      list.forEach(function(m, j){
        var x = b.x0 + (j + 1) * (b.x1 - b.x0) / (list.length + 1), y = b.y;
        var g = el('g', {opacity: m.i === cur ? 1 : 0.5, 'pointer-events': 'none'}, tsvg);
        if (m.t === 'ins' || m.t === 'par'){
          el('circle', {cx: x, cy: y, r: 9, fill: 'var(--accent)', stroke: m.t === 'par' ? 'var(--het)' : 'none', 'stroke-width': 2.5}, g);
        } else if (m.t === 'del'){
          el('rect', {x: x - 9, y: y - 9, width: 18, height: 18, fill: 'var(--bad)'}, g);
        } else {
          el('circle', {cx: x, cy: y, r: 9, fill: 'var(--panel)', stroke: 'var(--het)', 'stroke-width': 2, 'stroke-dasharray': '3 2'}, g);
        }
        el('text', {x: x, y: y + 4, 'text-anchor': 'middle', style: 'font-size:10.5px;font-weight:700;fill:' + (m.t === 'ils' ? 'var(--het)' : 'var(--bg)')}, g, String(m.i + 1));
      });
    });
  }
  function place(k){
    var L = marks[cur];
    if (act === 'erase'){ marks[cur] = L.filter(function(m){ return m.b !== k; }); }
    else if (act === 'ins'){ marks[cur] = L.filter(function(m){ return m.t !== 'ins' && !(m.b === k && m.t === 'par'); }); marks[cur].push({b: k, t: 'ins'}); }
    else { marks[cur] = L.filter(function(m){ return !(m.b === k); }); marks[cur].push({b: k, t: act}); }
    var bs = $('s05-pre').querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', 'false');
    renderTree();
  }
  var GROUP_TIP = 'Two of the three species share the copy and the outgroup lacks it: evidence that these two share a common ancestor not shared with the third.';
  function readsAs(st){
    var o = st.O, ing = ['A', 'B', 'C'].filter(function(t){ return st[t]; });
    if (o) return {key: 'old', txt: 'uninformative: the outgroup has it too (older than all four)'};
    if (ing.length === 0) return {key: 'none', txt: 'no copy anywhere'};
    if (ing.length === 1) return {key: 'single', txt: 'only in ' + ing[0] + ': says nothing about grouping'};
    if (ing.length === 3) return {key: 'all', txt: 'A+B+C vs O: groups the three, not informative for A/B/C'};
    return {key: ing.join('+'), txt: 'supports ' + tip(ing.join('+'), GROUP_TIP)};
  }
  var TNAME = {ins: 'inserted', par: 'second, independent insertion', del: 'precisely deleted', ils: 'lost by lineage sorting'};
  function happened(i){
    var L = marks[i];
    if (!L.length) return '(nothing placed)';
    var ins = L.filter(function(m){ return m.t === 'ins' || m.t === 'par'; });
    return L.map(function(m){
      var s = TNAME[m.t] + ' on ' + BR[m.b].name;
      if ((m.t === 'del' || m.t === 'ils') && !ins.some(function(n){ return onPath(n.b, m.b) && n.b !== m.b || n.b === m.b; }))
        s += ' <span style="color:var(--bad)">(no effect: no copy above it)</span>';
      if (m.t === 'ils' && ins.some(function(n){ return n.b === m.b; })) s += ' <span style="color:var(--bad)">(sorting loss must be below the insertion)</span>';
      return s;
    }).join('; ');
  }
  function renderTree(){
    var lb = $('s05-loc').querySelectorAll('button');
    for (var j = 0; j < lb.length; j++) lb[j].setAttribute('aria-pressed', +lb[j].dataset.l === cur ? 'true' : 'false');
    drawTree();
    var h = '<thead><tr><th>Locus</th><th>O</th><th>A</th><th>B</th><th>C</th><th>Reads as</th><th>What really happened (hidden)</th></tr></thead><tbody>';
    var tally = {'A+B': 0, 'A+C': 0, 'B+C': 0}, other = 0;
    for (var i = 0; i < NL; i++){
      var st = {}; TIPS.forEach(function(t){ st[t] = state(i, t); });
      var r = readsAs(st);
      if (tally[r.key] != null) tally[r.key]++; else other++;
      var col = r.key === 'A+B' ? 'var(--good)' : (tally[r.key] != null ? 'var(--bad)' : 'var(--muted)');
      h += '<tr' + (i === cur ? ' style="background:var(--code-bg)"' : '') + '><td><b>L' + (i + 1) + '</b></td>' +
        TIPS.map(function(t){ return '<td style="font-family:var(--f-mono);font-weight:700;color:' + (st[t] ? 'var(--accent)' : 'var(--muted)') + '">' + st[t] + '</td>'; }).join('') +
        '<td style="white-space:nowrap;color:' + col + '">' + r.txt + '</td><td style="font-size:12.5px">' + happened(i) + '</td></tr>';
    }
    $('s05-mat').innerHTML = h + '</tbody>';
    var conflict = tally['A+C'] + tally['B+C'];
    $('s05-tout').innerHTML =
      '<div>support for A+B (true tree)<b style="color:var(--good)">' + tally['A+B'] + '</b></div>' +
      '<div>support for A+C<b style="color:' + (tally['A+C'] ? 'var(--bad)' : 'var(--fg)') + '">' + tally['A+C'] + '</b></div>' +
      '<div>support for B+C<b style="color:' + (tally['B+C'] ? 'var(--bad)' : 'var(--fg)') + '">' + tally['B+C'] + '</b></div>' +
      '<div>uninformative loci<b>' + other + '</b></div>';
    var why;
    var best = Object.keys(tally).sort(function(a, b){ return tally[b] - tally[a]; })[0];
    if (tally['A+B'] + conflict === 0) why = 'No locus is shared by exactly two of the three species, so the matrix cannot group them. Put an insertion on the A+B stem.';
    else if (conflict === 0) why = 'All informative loci agree on A+B.' + (tally['A+B'] >= 3 ? ' With 3 or more unopposed markers, and all species searched equally, the ' + tip('KKSC test', 'Kuritzin, Kischka, Schmitz and Churakov 2016: statistics for presence/absence markers. Three unopposed markers give p < 0.05 when all three species were screened equally; five when loci came from one species only.') + ' (Kuritzin et al. 2016) calls this significant (p &lt; 0.05).' : ' Fewer than 3 markers: the KKSC test (Kuritzin et al. 2016) would not call this significant yet.');
    else if (tally[best] > tally['A+B'] && best !== 'A+B') why = '<b style="color:var(--bad)">The wrong pair wins.</b> Conflicting loci outnumber the true signal. In real data this happens after very short internal branches (rapid radiations), where ' + tip('lineage sorting', 'Incomplete lineage sorting: an insertion still polymorphic at a split is fixed differently in the daughter species.') + ' is common.';
    else why = 'Majority A+B, but ' + conflict + (conflict > 1 ? ' loci disagree' : ' locus disagrees') + '. From the matrix alone, ' + tip('lineage sorting', 'Incomplete lineage sorting: an insertion still polymorphic at a split is fixed differently in the daughter species.') + ', ' + tip('precise deletion', 'The copy removed so exactly that the empty site is restored.') + ' and ' + tip('parallel insertion', 'Two independent insertions at the same place in two lineages.') + ' look the same. Conflicts spread evenly over A+C and B+C point to lineage sorting; conflicts piling up on one alternative point to hybridisation (Kuritzin et al. 2016).';
    $('s05-twhy').innerHTML = why;
  }
  function initTree(){
    var lh = '';
    for (var i = 0; i < NL; i++) lh += '<button type="button" data-l="' + i + '" aria-pressed="' + (i === 0) + '">L' + (i + 1) + '</button>';
    $('s05-loc').innerHTML = lh;
    $('s05-loc').addEventListener('click', function(e){ var b = e.target.closest('button'); if (!b) return; cur = +b.dataset.l; renderTree(); });
    // add "parallel" action button
    var ab = $('s05-act');
    var pb = document.createElement('button'); pb.type = 'button'; pb.dataset.a = 'par'; pb.setAttribute('aria-pressed', 'false');
    pb.title = 'Add a second, independent insertion of this locus on another branch (homoplasy).'; pb.textContent = 'parallel insertion';
    ab.insertBefore(pb, ab.querySelector('[data-a="erase"]'));
    ab.addEventListener('click', function(e){
      var b = e.target.closest('button'); if (!b) return; act = b.dataset.a;
      var bs = ab.querySelectorAll('button'); for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', bs[i] === b ? 'true' : 'false');
    });
    $('s05-pre').addEventListener('click', function(e){ var b = e.target.closest('button'); if (!b) return; loadPreset(b.dataset.p); renderTree(); });
    $('s05-tleg').innerHTML =
      '<span><i style="background:var(--accent);height:10px;width:10px;border-radius:50%"></i>insertion</span>' +
      '<span><i style="background:var(--accent);height:10px;width:10px;border-radius:50%;outline:2px solid var(--het)"></i>parallel insertion</span>' +
      '<span><i style="background:var(--bad);height:10px;width:10px"></i>precise deletion</span>' +
      '<span><i style="background:transparent;height:10px;width:10px;border-radius:50%;border:2px dashed var(--het)"></i>lost by lineage sorting</span>' +
      '<span>number = locus; the selected locus is drawn darker</span>';
    loadPreset('clean');
    renderTree();
  }

  /* ---------------- 2. flow figure ---------------- */
  function drawFlow(){
    var s = svg(800, 300, 560); s.setAttribute('aria-label', 'Flank mapping and three-row alignment');
    $('s05-flow').appendChild(s);
    function bar(x0, x1, y, col, h){ el('rect', {x: x0, y: y - (h || 12) / 2, width: x1 - x0, height: h || 12, fill: col, rx: 2}, s); }
    function line(x0, x1, y, dash){ el('line', {x1: x0, x2: x1, y1: y, y2: y, stroke: 'var(--line)', 'stroke-width': 2, 'stroke-dasharray': dash || ''}, s); }
    // genome 1
    el('text', {x: 10, y: 44, class: 'lab'}, s, 'genome 1');
    line(100, 780, 40);
    bar(250, 370, 40, 'var(--accent)'); bar(370, 470, 40, 'var(--rep)'); bar(470, 590, 40, 'var(--het)');
    el('text', {x: 310, y: 24, 'text-anchor': 'middle'}, s, 'left flank 300 bp');
    el('text', {x: 420, y: 24, 'text-anchor': 'middle', style: 'fill:var(--rep)'}, s, 'SINE copy');
    el('text', {x: 530, y: 24, 'text-anchor': 'middle'}, s, 'right flank');
    // genome 2
    el('text', {x: 10, y: 134, class: 'lab'}, s, 'genome 2');
    line(100, 780, 130);
    bar(250, 370, 130, 'var(--accent)'); bar(370, 490, 130, 'var(--het)');
    el('line', {x1: 370, x2: 370, y1: 118, y2: 142, stroke: 'var(--fg)', 'stroke-width': 1.5}, s);
    el('text', {x: 370, y: 156, 'text-anchor': 'middle', style: 'font-size:10px'}, s, 'empty site');
    el('rect', {x: 250, y: 112, width: 340, height: 36, fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '4 3'}, s);
    el('text', {x: 598, y: 152}, s, 'window: hit + SINE + 300 bp');
    // arrows
    el('path', {d: 'M310 48 L310 110', stroke: 'var(--accent)', 'stroke-width': 1.5, fill: 'none', 'marker-end': 'url(#s05-ar)'}, s);
    el('path', {d: 'M530 48 Q520 90 440 112', stroke: 'var(--het)', 'stroke-width': 1.5, fill: 'none', 'stroke-dasharray': '4 3', 'marker-end': 'url(#s05-ar2)'}, s);
    var defs = el('defs', {}, s);
    [['s05-ar', 'var(--accent)'], ['s05-ar2', 'var(--het)']].forEach(function(a){
      var m = el('marker', {id: a[0], viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto'}, defs);
      el('path', {d: 'M0 0 L10 5 L0 10 z', fill: a[1]}, m);
    });
    el('text', {x: 120, y: 82}, s, 'minimap2 maps the left flank');
    el('text', {x: 560, y: 82}, s, 'the right flank must land too');
    // alignment
    var y0 = 205;
    el('text', {x: 10, y: 190, class: 'lab', style: 'font-weight:600'}, s, 'MAFFT, three rows');
    var rows = [['genome 1', [[250,370,'var(--accent)'],[370,470,'var(--rep)'],[470,590,'var(--het)']], [[590,690]]],
                ['genome 2', [[250,370,'var(--accent)'],[470,590,'var(--het)'],[590,690,'var(--err)']], [[370,470]]],
                ['consensus', [[370,470,'var(--rep)']], [[250,370],[470,690]]]];
    rows.forEach(function(r, i){
      var y = y0 + i * 26;
      el('text', {x: 10, y: y + 4, class: 'lab'}, s, r[0]);
      r[2].forEach(function(g){ line(g[0], g[1], y, '3 3'); });
      r[1].forEach(function(b){ bar(b[0], b[1], y, b[2], 14); });
    });
    el('text', {x: 640, y: y0 + 26 + 22, 'text-anchor': 'middle', style: 'font-size:10px'}, s, 'overhang');
    el('text', {x: 420, y: 290, 'text-anchor': 'middle', class: 'lab'}, s, 'gap in genome 2 under the SINE: ComPair.sh calls PM');
  }

  /* ---------------- 3. ComPair toy ---------------- */
  var CL = 250, FLK = 300, SLOP = CL + FLK;
  var P = {
    shared: [250, 80, 250, 80, 90, 90],
    pm:     [250, 85, 0, 80, 90, 90],
    mp:     [0, 80, 250, 85, 90, 90],
    trunc:  [250, 85, 120, 70, 90, 90],
    short:  [90, 88, 90, 84, 92, 92],
    nolf:   [250, 80, 250, 80, 40, 90],
    badrf:  [250, 80, 250, 80, 90, 45]
  };
  var ids = ['l1', 's1', 'l2', 's2', 'fl', 'fr'];
  function val(k){ return +$('s05-' + k).value; }
  var STATUS = {
    SINE: ['SINE', 'present in both genomes: an insertion older than the split of the two species', 'var(--good)'],
    PM: ['PM', 'present in genome 1, empty site in genome 2 (plus-minus)', 'var(--accent)'],
    MP: ['MP', 'empty site in genome 1, present in genome 2 (minus-plus)', 'var(--accent)'],
    badLF: ['badLF', 'rejected: the left flanks are not similar enough to call the two places orthologous', 'var(--bad)'],
    badRF: ['badRF', 'rejected: the right flanks do not match, so the junction cannot be trusted', 'var(--bad)'],
    none: ['not built', 'both genomes empty: SINE_orth_loc never builds this window, because it always starts from an annotated copy', 'var(--muted)']
  };
  function classify(v){
    var l1 = v.l1, l2 = v.l2, s1 = v.s1 / 100, s2 = v.s2 / 100, fl = v.fl / 100, fr = v.fr / 100;
    var m = {}, T = [];
    m.LF = FLK; m.LFcp = Math.round(FLK * fl); m.FL = Math.floor(v.fl);
    m.SO = Math.round(l1 * s1); m.ST = Math.round(l2 * s2);
    var ov = Math.min(l1, l2);
    m.SL = Math.round(ov * fl); m.OneTwo = ov > 0 ? Math.floor(100 * m.SL / ov) : 0;
    var r1 = SLOP - l1, r2 = SLOP - l2;
    m.RFlength = Math.max(r1, r2); m.FR = Math.floor(v.fr);
    m.cutRF = Math.min(r1, r2); m.FRcp = Math.round(m.cutRF * fr);
    if (l1 === 0 && l2 === 0) return {st: 'none', m: m, T: T};
    var lfOk = m.LFcp > 65 && m.LF > 150 && m.FL > 65;
    T.push(['left flank', 'columns ' + m.LF + ', identical ' + m.LFcp + ', identity ' + m.FL + ' %', '> 150, > 65, > 65 %', lfOk]);
    if (!lfOk) return {st: 'badLF', m: m, T: T};
    var both = m.OneTwo > 65 && m.SL > 100 && m.SO > 100 && m.ST > 100;
    T.push(['SINE in both?', 'copy 1 vs 2: ' + m.OneTwo + ' %, ' + m.SL + ' identical; copy 1 vs consensus ' + m.SO + ', copy 2 vs consensus ' + m.ST + ' identical', '> 65 %, and each > 100 identical', both]);
    if (both){
      var rfOk = m.RFlength > 150 && m.FR > 65;
      T.push(['right flank', 'columns ' + m.RFlength + ', identity ' + m.FR + ' %', '> 150, > 65 %', rfOk]);
      return {st: rfOk ? 'SINE' : 'badRF', m: m, T: T};
    }
    var cutOk = m.cutRF > 150 && m.FR > 70 && m.FRcp > 120;
    T.push(['trimmed right flank', 'columns ' + m.cutRF + ', identity ' + m.FR + ' %, identical ' + m.FRcp, '> 150, > 70 %, > 120', cutOk]);
    if (!cutOk) return {st: 'badRF', m: m, T: T};
    T.push(['which genome has it?', 'copy 1 vs consensus ' + m.SO + ' identical, copy 2 ' + m.ST, 'PM if copy 1 > copy 2, else MP', null]);
    return {st: m.SO > m.ST ? 'PM' : 'MP', m: m, T: T};
  }
  // deterministic pseudo-random ticks
  function rng(seed){ return function(){ seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; }
  var asvg;
  function drawAln(v, res){
    var box = $('s05-aln');
    if (!asvg){ asvg = svg(800, 150, 560); box.appendChild(asvg); asvg.setAttribute('aria-label', 'Toy three-row alignment'); }
    while (asvg.firstChild) asvg.removeChild(asvg.firstChild);
    var X0 = 90, W = 700, TOT = FLK + CL + SLOP, sc = W / TOT;
    function X(c){ return X0 + c * sc; }
    var rows = [{n: 'genome 1', l: v.l1, s: v.s1, y: 52}, {n: 'genome 2', l: v.l2, s: v.s2, y: 84}];
    var sineStart = FLK, sineEnd = FLK + CL;
    el('text', {x: X(FLK / 2), y: 20, 'text-anchor': 'middle'}, asvg, 'left flank (300)');
    el('text', {x: X(FLK + CL / 2), y: 20, 'text-anchor': 'middle', style: 'fill:var(--rep)'}, asvg, 'SINE (250)');
    el('text', {x: X(FLK + CL + 150), y: 20, 'text-anchor': 'middle'}, asvg, 'right flank');
    var R = rng(7);
    rows.forEach(function(r, i){
      el('text', {x: 6, y: r.y + 4, class: 'lab'}, asvg, r.n);
      el('line', {x1: X(0), x2: X(TOT), y1: r.y, y2: r.y, stroke: 'var(--line)', 'stroke-width': 2, 'stroke-dasharray': '3 3'}, asvg);
      el('rect', {x: X(0), y: r.y - 7, width: FLK * sc, height: 14, fill: 'var(--accent)', rx: 2}, asvg);
      if (r.l > 0) el('rect', {x: X(sineEnd - r.l), y: r.y - 7, width: r.l * sc, height: 14, fill: 'var(--rep)', rx: 2}, asvg);
      var rl = SLOP - r.l, aligned = Math.min(SLOP - v.l1, SLOP - v.l2);
      el('rect', {x: X(sineEnd), y: r.y - 7, width: Math.min(rl, aligned) * sc, height: 14, fill: 'var(--het)', rx: 2}, asvg);
      if (rl > aligned) el('rect', {x: X(sineEnd + aligned), y: r.y - 7, width: (rl - aligned) * sc, height: 14, fill: 'var(--err)', rx: 2}, asvg);
      // mismatch ticks: genome 2 flanks vs genome 1; copies vs consensus
      var ticks = [];
      if (i === 1){
        for (var c = 0; c < FLK; c += 3) if (R() > v.fl / 100) ticks.push(c);
        for (var c2 = 0; c2 < aligned; c2 += 3) if (R() > v.fr / 100) ticks.push(sineEnd + c2);
      }
      for (var c3 = sineEnd - r.l; c3 < sineEnd; c3 += 3) if (R() > r.s / 100) ticks.push(c3);
      ticks.forEach(function(c){ el('line', {x1: X(c), x2: X(c), y1: r.y - 7, y2: r.y + 7, stroke: 'var(--bg)', 'stroke-width': 1, opacity: 0.8}, asvg); });
    });
    var yc = 116;
    el('text', {x: 6, y: yc + 4, class: 'lab'}, asvg, 'consensus');
    el('line', {x1: X(0), x2: X(TOT), y1: yc, y2: yc, stroke: 'var(--line)', 'stroke-width': 2, 'stroke-dasharray': '3 3'}, asvg);
    el('rect', {x: X(sineStart), y: yc - 7, width: CL * sc, height: 14, fill: 'var(--rep)', rx: 2}, asvg);
    var st = STATUS[res.st];
    el('text', {x: X(TOT), y: 144, 'text-anchor': 'end', class: 'lab', style: 'font-weight:700;fill:' + st[2]}, asvg, 'ComPair.sh: ' + st[0]);
  }
  function renderCP(){
    var v = {}; ids.forEach(function(k){ v[k] = val(k); });
    $('s05-l1o').textContent = v.l1 === 0 ? '0 (empty site)' : v.l1 + ' bp';
    $('s05-l2o').textContent = v.l2 === 0 ? '0 (empty site)' : v.l2 + ' bp';
    $('s05-s1o').textContent = v.s1 + ' %'; $('s05-s2o').textContent = v.s2 + ' %';
    $('s05-flo').textContent = v.fl + ' %'; $('s05-fro').textContent = v.fr + ' %';
    var res = classify(v), st = STATUS[res.st];
    drawAln(v, res);
    $('s05-cout').innerHTML =
      '<div>verdict<b style="color:' + st[2] + '">' + st[0] + '</b><span style="color:var(--muted)">' + st[1] + '</span></div>' +
      '<div>' + tip('SO / ST', 'Identical bases between the copy of genome 1 (SO) or genome 2 (ST) and the consensus, in the SINE columns. ComPair.sh names.') + '<b>' + res.m.SO + ' / ' + res.m.ST + '</b></div>' +
      '<div>' + tip('FL / FR', 'Percent identity of the left (FL) and right (FR) flanks between the two genomes, as esl-alipid reports it: identical bases / length of the shorter sequence.') + '<b>' + res.m.FL + ' % / ' + res.m.FR + ' %</b></div>';
    var h = '<thead><tr><th>Test (in order)</th><th>Measured</th><th>Needed</th><th>Result</th></tr></thead><tbody>';
    res.T.forEach(function(t){
      var r = t[3] === null ? '<span style="color:var(--accent)">decides</span>' : (t[3] ? '<span style="color:var(--good)">pass</span>' : '<span style="color:var(--bad)">fail</span>');
      h += '<tr><td><b>' + t[0] + '</b></td><td style="font-family:var(--f-mono);font-size:12.5px">' + t[1] + '</td><td style="font-size:12.5px">' + t[2] + '</td><td>' + r + '</td></tr>';
    });
    if (!res.T.length) h += '<tr><td colspan="4">No test: this window would not exist.</td></tr>';
    $('s05-tests').innerHTML = h + '</tbody>';
    var note = '';
    if ((res.st === 'PM' || res.st === 'MP') && v.l1 > 0 && v.l2 > 0){
      note = '<b style="color:var(--bad)">Both genomes have SINE sequence here.</b> ' +
        (res.m.SO <= 100 && res.m.ST <= 100
          ? 'Neither copy shares more than 100 identical bases with the consensus, so the "both" test fails and the call rests on a difference of ' + Math.abs(res.m.SO - res.m.ST) + ' bases. Bank mode lowers the 100-base threshold for short consensuses for this reason.'
          : 'The weaker copy shares only ' + Math.min(res.m.SO, res.m.ST) + ' identical bases with the consensus (100 needed) or the copies differ too much, so ComPair treats it as absent. Open such alignments before trusting the call.');
    } else if (res.st === 'SINE') note = 'Both copies pass: the insertion happened before the two species split (or, rarely, twice at the same place).';
    else if (res.st === 'badLF') note = 'Below about 65 % the flanks could be unrelated DNA: unrelated sequences reach about 25 % (position by position) to about 50 % (after alignment with gaps), lab notes.';
    $('s05-cnote').innerHTML = note;
  }
  function setCP(p){
    P[p].forEach(function(x, i){ $('s05-' + ids[i]).value = x; });
    var bs = $('s05-cpre').querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', bs[i].dataset.p === p ? 'true' : 'false');
    renderCP();
  }
  function initCP(){
    ids.forEach(function(k){ $('s05-' + k).addEventListener('input', function(){
      var bs = $('s05-cpre').querySelectorAll('button'); for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', 'false');
      renderCP(); }); });
    $('s05-cpre').addEventListener('click', function(e){ var b = e.target.closest('button'); if (b) setCP(b.dataset.p); });
    $('s05-aleg').innerHTML =
      '<span><i style="background:var(--accent);height:10px"></i>left flank</span>' +
      '<span><i style="background:var(--rep);height:10px"></i>SINE</span>' +
      '<span><i style="background:var(--het);height:10px"></i>right flank</span>' +
      '<span><i style="background:var(--err);height:10px"></i>overhang, cut before the test</span>' +
      '<span><i style="background:var(--line);height:2px"></i>gap</span>' +
      '<span>pale ticks: mismatches (toy)</span>';
    setCP('shared');
  }

  initTree();
  drawFlow();
  initCP();
})();
