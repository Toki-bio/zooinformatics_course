(function(){
  var fig = document.getElementById('s04-fig');
  if (!fig) return;
  var NS = 'http://www.w3.org/2000/svg';
  var el = function(id){ return document.getElementById(id); };
  var REG = 3000;                                   // toy region, bp
  var CPG = [];                                     // 13 CpG sites in the DMR
  for (var c = 0; c < 13; c++) CPG.push(1080 + c * 70);
  var SNP = [{ pos: 600, a: ['A', 'G'] }, { pos: 2400, a: ['C', 'T'] }];   // base on copy 0 / copy 1
  var ERR = 0.04;                                   // methylation call error
  var st = { type: 'imp', ph: 'off' };
  var seed = 7;
  var ctl = { n: el('s04-n'), len: el('s04-len'), skew: el('s04-skew') };
  var data;

  function rng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function generate(){
    var r = rng(seed * 977 + 13);
    var n = +ctl.n.value, L = +ctl.len.value, skew = +ctl.skew.value / 100;
    // which copy is the mother's (0 or 1), and whether HP1 is copy 0 (the HP number is arbitrary)
    var mom = r() < 0.5 ? 0 : 1, hp1copy = r() < 0.5 ? 0 : 1;
    var reads = [];
    var guard = 0, seen = [0, 0], inact = [0, 0];
    while (reads.length < n && guard++ < 5000){
      var len = Math.round(L * (0.5 + r()));
      var s = Math.round(-len + 1 + r() * (REG + len - 2));
      var e = s + len;
      s = Math.max(0, s); e = Math.min(REG, e);
      if (e < CPG[0] + 1 || s > CPG[CPG.length - 1] - 1) continue;   // keep reads that touch the DMR
      var copy = reads.length % 2;                  // equal numbers of reads from each copy
      var state;                                    // true state of this copy in this cell
      if (st.type === 'imp') state = copy === mom ? 1 : 0;            // toy: mother's copy methylated
      else if (st.type === 'x'){                    // inactive X methylated; cells drawn in exact proportion
        var want = copy === mom ? skew : 1 - skew;
        state = inact[copy] < want * (seen[copy] + 1) - 0.5 ? 1 : 0;
        seen[copy]++; inact[copy] += state;
      }
      else state = -1;                                                 // no allele effect
      var calls = [];
      for (var i = 0; i < CPG.length; i++){
        if (CPG[i] < s || CPG[i] >= e){ calls.push(null); continue; }
        var m = state === -1 ? (r() < 0.5 ? 1 : 0) : state;
        if (r() < ERR) m = 1 - m;
        calls.push(m);
      }
      var snps = SNP.map(function(p){ return p.pos >= s && p.pos < e ? p.a[copy] : null; });
      var tagged = snps[0] !== null || snps[1] !== null;
      var hp = tagged ? (copy === hp1copy ? 1 : 2) : 0;
      reads.push({ s: s, e: e, copy: copy, calls: calls, snps: snps, hp: hp });
    }
    reads.sort(function(a, b){ return a.s - b.s; });
    data = { reads: reads, mom: mom, hp1copy: hp1copy };
  }

  function pct(list){
    var m = 0, t = 0;
    list.forEach(function(rd){ rd.calls.forEach(function(v){ if (v !== null){ t++; m += v; } }); });
    return t ? { p: 100 * m / t, n: t } : { p: NaN, n: 0 };
  }
  function perSite(list){
    return CPG.map(function(_, i){
      var m = 0, t = 0;
      list.forEach(function(rd){ var v = rd.calls[i]; if (v !== null){ t++; m += v; } });
      return t ? { p: 100 * m / t, n: t } : { p: NaN, n: 0 };
    });
  }
  function f0(x){ return isNaN(x) ? '–' : Math.round(x) + ' %'; }

  function mk(tag, attrs, txt){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (txt !== undefined) e.textContent = txt;
    return e;
  }

  function draw(){
    var W = 900, X0 = 96, X1 = 884, rowH = 13;
    var xs = function(bp){ return X0 + (X1 - X0) * bp / REG; };
    var on = st.ph === 'on';
    var reads = data.reads;
    var groups = on
      ? [{ k: 1, lab: 'HP1', col: 'var(--accent)' }, { k: 2, lab: 'HP2', col: 'var(--het)' }, { k: 0, lab: 'untagged', col: 'var(--err)' }]
      : [{ k: -1, lab: 'all reads', col: 'var(--muted)' }];
    var y = 46, rows = [];
    groups.forEach(function(g){
      var list = reads.filter(function(rd){ return g.k === -1 || rd.hp === g.k; });
      g.y0 = y; g.list = list;
      list.forEach(function(rd){ rows.push({ rd: rd, y: y + rowH / 2, col: g.col }); y += rowH; });
      if (!list.length) y += rowH;
      g.y1 = y; y += 10;
    });
    var barTop = y + 14, barH = 46;
    var barGroups = on ? groups.slice(0, 2) : groups;
    var H = barTop + barGroups.length * (barH + 22) + 6;

    var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img',
      'aria-label': 'Toy reads over a 3-kb region with CpG methylation calls and SNP alleles' });
    svg.style.minWidth = '640px';
    // ruler, DMR shading, SNP marks
    svg.appendChild(mk('rect', { x: xs(CPG[0] - 40), y: 16, width: xs(CPG[12] + 40) - xs(CPG[0] - 40), height: barTop - 24,
      fill: 'var(--rep)', opacity: 0.08 }));
    svg.appendChild(mk('line', { x1: X0, x2: X1, y1: 26, y2: 26, class: 'ax' }));
    [0, 1000, 2000, 3000].forEach(function(b){
      svg.appendChild(mk('line', { x1: xs(b), x2: xs(b), y1: 22, y2: 30, class: 'ax' }));
      svg.appendChild(mk('text', { x: xs(b), y: 14, 'text-anchor': b === 0 ? 'start' : b === 3000 ? 'end' : 'middle' }, (b / 1000) + ' kb'));
    });
    svg.appendChild(mk('text', { x: xs(1500), y: 40, 'text-anchor': 'middle', class: 'lab' }, 'region with 13 CpG sites'));
    SNP.forEach(function(p, i){
      svg.appendChild(mk('line', { x1: xs(p.pos), x2: xs(p.pos), y1: 30, y2: barTop - 10, class: 'grid' }));
      svg.appendChild(mk('text', { x: xs(p.pos), y: 40, 'text-anchor': 'middle', class: 'lab' }, 'SNP ' + (i + 1)));
    });
    // group labels
    groups.forEach(function(g){
      svg.appendChild(mk('text', { x: 4, y: g.y0 + 10, class: 'lab', fill: g.col }, g.lab));
      svg.appendChild(mk('text', { x: 4, y: g.y0 + 23 }, g.list.length + ' reads'));
    });
    // reads
    rows.forEach(function(rw){
      var rd = rw.rd;
      svg.appendChild(mk('line', { x1: xs(rd.s), x2: xs(rd.e), y1: rw.y, y2: rw.y, stroke: rw.col, 'stroke-width': 2 }));
      rd.calls.forEach(function(v, i){
        if (v === null) return;
        svg.appendChild(mk('circle', { cx: xs(CPG[i]), cy: rw.y, r: 4.2, fill: v ? 'var(--fg)' : 'var(--panel)',
          stroke: 'var(--fg)', 'stroke-width': 1.1 }));
      });
      rd.snps.forEach(function(b, i){
        if (b === null) return;
        var x = xs(SNP[i].pos);
        svg.appendChild(mk('rect', { x: x - 6, y: rw.y - 6, width: 12, height: 12, rx: 2, fill: 'var(--panel)', stroke: rw.col, 'stroke-width': 1.3 }));
        var t = mk('text', { x: x, y: rw.y + 4, 'text-anchor': 'middle', class: 'lab' }, b);
        t.style.fontSize = '9.5px';
        svg.appendChild(t);
      });
    });
    // per-site bars
    barGroups.forEach(function(g, gi){
      var top = barTop + gi * (barH + 22);
      var sites = perSite(g.list), tot = pct(g.list);
      svg.appendChild(mk('text', { x: 4, y: top + 12, class: 'lab', fill: g.col }, g.lab));
      svg.appendChild(mk('text', { x: 4, y: top + 26 }, 'mean ' + f0(tot.p)));
      svg.appendChild(mk('line', { x1: xs(CPG[0] - 40), x2: xs(CPG[12] + 40), y1: top + barH, y2: top + barH, class: 'ax' }));
      svg.appendChild(mk('line', { x1: xs(CPG[0] - 40), x2: xs(CPG[12] + 40), y1: top + barH / 2, y2: top + barH / 2, class: 'grid' }));
      svg.appendChild(mk('text', { x: xs(CPG[0] - 46), y: top + 6, 'text-anchor': 'end' }, '100 %'));
      svg.appendChild(mk('text', { x: xs(CPG[0] - 46), y: top + barH / 2 + 4, 'text-anchor': 'end' }, '50 %'));
      svg.appendChild(mk('text', { x: xs(CPG[0] - 46), y: top + barH + 4, 'text-anchor': 'end' }, '0 %'));
      sites.forEach(function(sv, i){
        if (isNaN(sv.p)) return;
        var h = barH * sv.p / 100;
        svg.appendChild(mk('rect', { x: xs(CPG[i]) - 6, y: top + barH - h, width: 12, height: Math.max(h, 0.5), fill: g.col }));
      });
      svg.appendChild(mk('text', { x: xs(CPG[12] + 50), y: top + barH / 2 + 4 }, 'per-CpG % methylated'));
    });
    fig.innerHTML = '';
    fig.appendChild(svg);
    readout();
  }

  function readout(){
    var reads = data.reads, all = pct(reads);
    var h1 = pct(reads.filter(function(r){ return r.hp === 1; })), h2 = pct(reads.filter(function(r){ return r.hp === 2; }));
    var unt = reads.filter(function(r){ return r.hp === 0; }).length;
    // per-read pattern: share of reads that are nearly all methylated or all unmethylated
    var clear = 0, withCalls = 0;
    reads.forEach(function(rd){
      var t = 0, m = 0; rd.calls.forEach(function(v){ if (v !== null){ t++; m += v; } });
      if (t >= 3){ withCalls++; var f = m / t; if (f <= 0.2 || f >= 0.8) clear++; }
    });
    var clearPct = withCalls ? Math.round(100 * clear / withCalls) : 0;
    var on = st.ph === 'on';
    var tip = function(word, t){ return '<span class="tip" title="' + t + '">' + word + '</span>'; };
    var HPt = 'HP tag: the label WhatsHap or LongPhase writes on a read, 1 or 2, for the copy (haplotype) its SNP alleles match. The number itself says nothing about which parent.';
    var o = '<div>All reads pooled<b>' + f0(all.p) + '</b>' + all.n + ' CpG calls on ' + reads.length + ' reads</div>';
    if (on){
      o += '<div>' + tip('HP1', HPt) + ' reads<b>' + f0(h1.p) + '</b>' + h1.n + ' calls</div>';
      o += '<div>' + tip('HP2', HPt) + ' reads<b>' + f0(h2.p) + '</b>' + h2.n + ' calls</div>';
      o += '<div>Untagged reads<b>' + unt + ' of ' + reads.length + '</b>cover no SNP; counted only in the pooled number</div>';
    } else {
      o += '<div>Reads nearly all-or-nothing<b>' + clearPct + ' %</b>reads with ≥ 3 CpG calls and ≤ 20 % or ≥ 80 % of them methylated</div>';
    }
    el('s04-out').innerHTML = o;

    var ASM = tip('allele-specific methylation', 'Allele-specific methylation (ASM): the two copies of the chromosome differ in methylation at this place.');
    var v;
    var parent = 'In this toy we know the truth: HP1 is the ' + (data.hp1copy === data.mom ? 'mother' : 'father') + '’s copy. Real data do not tell you this; press “new sample” and it can flip.';
    if (!on){
      v = 'One number: ' + f0(all.p) + '. From this alone you cannot tell “half of the copies fully methylated” from “every copy half methylated”. ';
      if (clearPct >= 70) v += 'But ' + clearPct + ' % of reads are all-or-nothing: the reads come from two groups, a hint of ' + ASM + ' (or of a mixture of cell types). Turn phasing on.';
      else v += 'Most reads carry a mix of filled and empty circles, so each read is itself partly methylated: no sign of two separate states.';
    } else {
      var d = Math.abs(h1.p - h2.p);
      if (isNaN(d)) v = 'One copy has no tagged reads. Raise the depth or the read length.';
      else if (d >= 60) v = 'The copies differ by ' + Math.round(d) + ' percentage points: ' + ASM + '. ' + (st.type === 'x' ? 'On the X this means strongly skewed inactivation: most cells silenced the same X. ' : '') + parent;
      else if (d >= 20) v = 'The copies differ by ' + Math.round(d) + ' points: partial ' + ASM + '. On the X this is what ' + tip('skewed', 'Skewed X inactivation: most cells of the tissue silenced the same X (the mother’s or the father’s) instead of about half and half.') + ' inactivation looks like. ' + parent;
      else v = 'Both copies are close to the pooled value (difference ' + Math.round(d) + ' points): no allele effect visible' + (st.type === 'x' ? '. On the X of a female this is expected: each cell silenced one X at random, so each copy is methylated in about half of the cells.' : '.');
      if (unt > reads.length / 3) v += ' Note: ' + unt + ' of ' + reads.length + ' reads stayed untagged because they are too short to reach a SNP.';
    }
    el('s04-verdict').innerHTML = v;
  }

  function legend(){
    var on = st.ph === 'on';
    var h = '<span><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.2" fill="var(--fg)" stroke="var(--fg)"/></svg> CpG called methylated</span>' +
            '<span><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.2" fill="var(--panel)" stroke="var(--fg)"/></svg> called unmethylated</span>' +
            '<span><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="1" y="1" width="10" height="10" rx="2" fill="var(--panel)" stroke="var(--muted)"/></svg> SNP base in the read</span>';
    if (on) h += '<span><i style="background:var(--accent)"></i>HP1</span><span><i style="background:var(--het)"></i>HP2</span><span><i style="background:var(--err)"></i>untagged</span>';
    el('s04-legend').innerHTML = h;
  }

  function sync(){
    el('s04-n-o').textContent = ctl.n.value;
    el('s04-len-o').textContent = (+ctl.len.value / 1000).toFixed(1) + ' kb';
    el('s04-skew-o').textContent = ctl.skew.value + ' %';
    el('s04-skew-l').style.display = st.type === 'x' ? '' : 'none';
  }
  function update(regen){ sync(); if (regen) generate(); legend(); draw(); }

  function segWire(id, key){
    var g = el(id);
    g.addEventListener('click', function(ev){
      var b = ev.target.closest('button'); if (!b) return;
      st[key] = b.getAttribute('data-v');
      g.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      update(key === 'type');
    });
  }
  segWire('s04-type', 'type');
  segWire('s04-ph', 'ph');
  ['n', 'len', 'skew'].forEach(function(k){ ctl[k].addEventListener('input', function(){ update(true); }); });
  el('s04-new').addEventListener('click', function(){ seed++; update(true); });
  update(true);
})();
