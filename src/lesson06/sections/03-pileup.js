(function(){
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent, text){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------------- toy pileup ---------------- */
  var svg = document.getElementById('s03-svg');
  if (svg) (function(){
    var REF = 'ATTGCACGTTAGCTGATCCGTATTCAGTAGCGATTCAGTA';   // 40 bp, CpGs at 0-based 6, 18, 30
    var CPG = [6, 18, 30];
    // calls per CpG: number = 5mC probability; 'nc' = right base, no call; 'T' = read has T (C>T); 'del' = deletion; null = not covered
    var READS = [
      { id: 'r1',  s: '+', a: 0,  b: 39, c: [0.97, 0.62, 0.04] },
      { id: 'r2',  s: '+', a: 2,  b: 36, c: [0.93, 0.45, 'nc'] },
      { id: 'r3',  s: '+', a: 0,  b: 27, c: [0.88, 0.91, null] },
      { id: 'r4',  s: '+', a: 10, b: 39, c: [null, 0.30, 0.12] },
      { id: 'r5',  s: '+', a: 0,  b: 39, c: ['T', 0.71, 0.55] },
      { id: 'r6',  s: '+', a: 4,  b: 39, c: [0.98, 'del', 0.03] },
      { id: 'r7',  s: '-', a: 0,  b: 39, c: [0.95, 0.58, 0.06] },
      { id: 'r8',  s: '-', a: 3,  b: 33, c: [0.81, 0.12, 0.35] },
      { id: 'r9',  s: '-', a: 12, b: 39, c: [null, 0.86, 0.02] },
      { id: 'r10', s: '-', a: 0,  b: 25, c: [0.66, 0.40, null] },
      { id: 'r11', s: '-', a: 0,  b: 39, c: [0.99, 0.52, 0.10] }
    ];
    var X0 = 100, BW = 16, mode = 'fix';
    var thr = document.getElementById('s03-thr'), thrO = document.getElementById('s03-thr-o');
    var comb = document.getElementById('s03-comb'), out = document.getElementById('s03-out');
    var bed = document.getElementById('s03-bed'), note = document.getElementById('s03-note');
    var btn = { fix: document.getElementById('s03-m-fix'), est: document.getElementById('s03-m-est'), cnt: document.getElementById('s03-m-cnt') };

    function conf(p){ return Math.round(Math.max(p, 1 - p) * 1e6) / 1e6; }
    // modkit-like estimate: the confidence below which the lowest 10 % of calls fall (toy: all calls, no sampling)
    function estThreshold(){
      var q = [];
      READS.forEach(function(r){ r.c.forEach(function(v){ if (typeof v === 'number') q.push(conf(v)); }); });
      q.sort(function(a, b){ return a - b; });
      return q[Math.floor(0.1 * q.length)];
    }
    var EST = estThreshold();

    function threshold(){ return mode === 'est' ? EST : +thr.value; }
    // classify one call: 'mod' | 'can' | 'fail' | 'nc' | 'diff' | 'del' | null
    function classify(v, t){
      if (v === null) return null;
      if (v === 'nc') return mode === 'cnt' ? 'can' : 'nc';
      if (v === 'T') return mode === 'cnt' ? 'can' : 'diff';   // pb-CpG-tools source: any aligned base counts, no probability = unmethylated
      if (v === 'del') return 'del';
      if (mode === 'cnt') return v > 0.5 ? 'mod' : 'can';
      if (conf(v) < t) return 'fail';
      return v >= 0.5 ? 'mod' : 'can';
    }
    function pos(r, i){ return r.s === '+' ? CPG[i] : CPG[i] + 1; }   // reverse read: the C opposite the G

    function tally(t, combine){
      var rows = [];
      CPG.forEach(function(c, i){
        var strands = combine ? ['.'] : ['+', '-'];
        strands.forEach(function(st){
          var n = { mod: 0, can: 0, fail: 0, nc: 0, diff: 0, del: 0 };
          READS.forEach(function(r){
            if (st !== '.' && r.s !== st) return;
            var k = classify(r.c[i], t); if (k) n[k]++;
          });
          rows.push({ i: i, st: st, start: (st === '-') ? c + 1 : c, n: n, valid: n.mod + n.can });
        });
      });
      return rows;
    }
    function pct(r){ return r.valid ? 100 * r.n.mod / r.valid : NaN; }

    function draw(){
      var t = threshold(), combine = comb.checked || mode === 'cnt';
      comb.disabled = (mode === 'cnt');
      thr.disabled = (mode !== 'fix');
      thrO.textContent = mode === 'fix' ? (+thr.value).toFixed(2) : (mode === 'est' ? EST.toFixed(2) + ' (estimated)' : 'none (0.5 split)');
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      // reference
      el('text', { x: 8, y: 52, 'class': 'lab' }, svg, 'reference');
      for (var j = 0; j < REF.length; j++){
        var isC = CPG.indexOf(j) >= 0, isG = CPG.indexOf(j - 1) >= 0;
        if (isC) el('rect', { x: X0 + j * BW, y: 37, width: BW * 2, height: 20, fill: 'var(--rep)', opacity: 0.18, rx: 2 }, svg);
        el('text', { x: X0 + j * BW + BW / 2, y: 52, 'text-anchor': 'middle', 'class': (isC || isG) ? 'lab' : '', 'font-weight': (isC || isG) ? 700 : 400 }, svg, REF[j]);
        if (j % 10 === 0) el('text', { x: X0 + j * BW + BW / 2, y: 30, 'text-anchor': 'middle', 'font-size': 10 }, svg, String(j));
      }
      CPG.forEach(function(c, i){ el('text', { x: X0 + (c + 1) * BW, y: 16, 'text-anchor': 'middle', 'class': 'lab' }, svg, 'CpG ' + (i + 1)); });

      var yF = 82, yR = 284, DY = 32;
      el('text', { x: 8, y: yF - 14, 'font-size': 10.5 }, svg, 'forward reads (+): call at the C of CG');
      el('text', { x: 8, y: yR - 14, 'font-size': 10.5 }, svg, 'reverse reads (−): call at the C opposite the G');
      el('line', { x1: 8, x2: 750, y1: yR - 30, y2: yR - 30, 'class': 'grid' }, svg);
      var fi = 0, ri = 0;
      READS.forEach(function(r){
        var y = r.s === '+' ? yF + DY * (fi++) : yR + DY * (ri++);
        el('text', { x: 8, y: y + 4, 'class': 'lab' }, svg, r.id + ' (' + (r.s === '+' ? '+' : '−') + ')');
        var xa = X0 + r.a * BW + 2, xb = X0 + (r.b + 1) * BW - 2;
        // deletions split the bar
        var gaps = [];
        r.c.forEach(function(v, i){ if (v === 'del') gaps.push(pos(r, i)); });
        var segs = [[xa, xb]];
        gaps.forEach(function(g){
          var gx0 = X0 + g * BW - 1, gx1 = X0 + (g + 2) * BW + 1, ns = [];
          segs.forEach(function(s){ if (gx1 <= s[0] || gx0 >= s[1]) ns.push(s); else { if (gx0 > s[0]) ns.push([s[0], gx0]); if (gx1 < s[1]) ns.push([gx1, s[1]]); } });
          segs = ns;
          el('text', { x: (gx0 + gx1) / 2, y: y + 4, 'text-anchor': 'middle', 'font-size': 10 }, svg, 'del');
        });
        segs.forEach(function(s){ el('line', { x1: s[0], x2: s[1], y1: y, y2: y, stroke: 'var(--muted)', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.55 }, svg); });
        // arrow head
        if (r.s === '+') el('path', { d: 'M' + (xb + 7) + ',' + y + ' l-8,-5 v10 z', fill: 'var(--muted)', opacity: 0.7 }, svg);
        else el('path', { d: 'M' + (xa - 7) + ',' + y + ' l8,-5 v10 z', fill: 'var(--muted)', opacity: 0.7 }, svg);
        r.c.forEach(function(v, i){
          if (v === null || v === 'del') return;
          var cx = X0 + pos(r, i) * BW + BW / 2, k = classify(v, t);
          if (v === 'T'){
            el('rect', { x: cx - 8, y: y - 9, width: 16, height: 18, rx: 2, fill: 'var(--panel)', stroke: 'var(--bad)' }, svg);
            el('text', { x: cx, y: y + 4, 'text-anchor': 'middle', fill: 'var(--bad)', 'font-weight': 700 }, svg, 'T');
            el('text', { x: cx + 13, y: y + 4, 'font-size': 10.5 }, svg, mode === 'cnt' ? 'T: counted unmethylated' : 'C>T: Ndiff');
            return;
          }
          if (v === 'nc'){
            el('circle', { cx: cx, cy: y, r: 8, fill: 'var(--panel)', stroke: 'var(--muted)', 'stroke-dasharray': '1 2' }, svg);
            el('text', { x: cx + 13, y: y + 4, 'font-size': 10.5 }, svg, mode === 'cnt' ? 'no call → unmethylated' : 'no call (Nnocall)');
            return;
          }
          var a = { cx: cx, cy: y, r: 8 };
          if (k === 'mod'){ a.fill = 'var(--bad)'; a.stroke = 'var(--bad)'; }
          else if (k === 'can'){ a.fill = 'var(--panel)'; a.stroke = 'var(--accent)'; a['stroke-width'] = 2.5; }
          else { a.fill = 'var(--panel)'; a.stroke = 'var(--err)'; a['stroke-dasharray'] = '3 2'; a['stroke-width'] = 1.5; }
          var ci = el('circle', a, svg);
          el('title', {}, ci, r.id + ', CpG ' + (i + 1) + ': 5mC probability ' + v.toFixed(2) + ', confidence ' + conf(v).toFixed(2) + ' → ' + (k === 'mod' ? 'methylated' : k === 'can' ? 'unmethylated' : 'failed'));
          el('text', { x: cx + 13, y: y + 4, fill: k === 'fail' ? 'var(--err)' : 'var(--fg)', 'font-size': 11 }, svg, v.toFixed(2));
        });
      });

      // per-site summary
      var rows = tally(t, combine), yS = 452;
      el('line', { x1: 8, x2: 750, y1: yS - 34, y2: yS - 34, 'class': 'grid' }, svg);
      el('text', { x: 8, y: yS - 6, 'class': 'lab' }, svg, 'level');
      CPG.forEach(function(c, i){
        var rr = rows.filter(function(r){ return r.i === i; });
        rr.forEach(function(r, m){
          var x = X0 + c * BW - 20 + m * 86, w = 76, p = pct(r);
          el('rect', { x: x, y: yS - 26, width: w, height: 8, fill: 'var(--line)', rx: 2 }, svg);
          if (!isNaN(p)) el('rect', { x: x, y: yS - 26, width: w * p / 100, height: 8, fill: 'var(--bad)', rx: 2 }, svg);
          var lab = (r.st === '.' ? '' : (r.st === '+' ? '+ ' : '− ')) + (isNaN(p) ? 'no row' : Math.round(p) + ' %') + ' (' + r.n.mod + '/' + r.valid + ')';
          el('text', { x: x, y: yS - 4, 'class': 'lab', 'font-size': 11 }, svg, lab);
        });
      });

      // readout
      var all = tally(t, true), nPass = 0, nFail = 0;
      all.forEach(function(r){ nPass += r.valid; nFail += r.n.fail; });
      var thrTxt = mode === 'cnt' ? 'none: probability &gt; 0.5 = methylated' : t.toFixed(2) + (mode === 'est' ? ' (10th percentile of the 26 call confidences)' : ' (your choice)');
      out.innerHTML =
        '<div>pass threshold<b>' + (mode === 'cnt' ? 'none' : t.toFixed(2)) + '</b>' + thrTxt.replace(/^[0-9.]+ ?/, '') + '</div>' +
        (mode === 'cnt'
          ? '<div>reads counted (cov)<b>' + nPass + '</b>the 26 calls with a probability, plus ' + (nPass - 26) + ' reads without one, counted as unmethylated</div>'
          : '<div>calls counted (<span class="tip" title="Nvalid_cov: calls that passed the threshold, methylated plus unmethylated.">N<sub>valid_cov</sub></span>)<b>' + nPass + ' of 26</b>calls with a probability</div>') +
        '<div>calls failed (<span class="tip" title="Nfail: calls whose confidence, the larger of p and 1 − p, is below the pass threshold. They are not counted as unmethylated; they are left out of the percentage.">N<sub>fail</sub></span>)<b>' + nFail + '</b>' + (mode === 'cnt' ? 'count mode never fails a call' : 'uncertain calls set aside') + '</div>';

      // bedMethyl rows
      if (mode === 'cnt'){
        var L = ['<span class="c"># pb-CpG-tools count mode: one row per CpG (no strand column), no failed class</span>'];
        rows.forEach(function(r){
          var cov = r.n.mod + r.n.can;
          L.push('CpG ' + (r.i + 1) + ' at ' + CPG[r.i] + ':  mod_score ' + (100 * r.n.mod / cov).toFixed(1) + '  cov ' + cov + '  modified ' + r.n.mod + '  unmodified ' + r.n.can);
        });
        bed.innerHTML = L.join('\n');
      } else {
        var H = '<span class="c">#chrom start end name score strand start end color | Nvalid %mod Nmod Ncanon Nother Ndel Nfail Ndiff Nnocall</span>';
        var L2 = [H];
        rows.forEach(function(r){
          if (!r.valid){ L2.push('<span class="c"># CpG ' + (r.i + 1) + ' strand ' + r.st + ': no passing calls, so no row is written</span>'); return; }
          L2.push(['toy', r.start, r.start + 1, 'm', r.valid, r.st, r.start, r.start + 1, '255,0,0', r.valid, pct(r).toFixed(2), r.n.mod, r.n.can, 0, r.n.del, r.n.fail, r.n.diff, r.n.nc].join('\t'));
        });
        bed.innerHTML = L2.join('\n');
      }
      note.innerHTML = mode === 'est'
        ? 'The estimated threshold is ' + EST.toFixed(2) + ' here: in this toy, one call in ten has a confidence below that value. A percentile rule always sets aside about one call in ten, whether the model is good or poor; it adapts to the data, it does not judge them. modkit estimates it from about 10,042 sampled reads, not from every call.'
        : mode === 'cnt'
        ? 'Count mode (pb-CpG-tools <code>--pileup-mode count</code>): every probability above 0.5 is methylated, everything else unmethylated, and a read with no probability at the site counts as unmethylated. In the source code (v3.0.0) every base aligned at the site counts towards coverage, so the read with T at CpG 1 (a C&gt;T SNP) is counted as unmethylated too, where modkit puts it in N<sub>diff</sub>. Its default <code>model</code> mode cannot be shown with a toy: it runs a trained model over the probability histograms of 11 neighbouring CpGs.'
        : 'Each row is what <code>modkit pileup --cpg' + (combine ? ' --combine-strands' : '') + '</code> would write for this toy (columns tab-separated). ' + (combine ? 'Combined rows sit at the C of the top strand, strand ".".' : 'Without combining, the bottom-strand row of each CpG sits one base to the right, at the C opposite the G.');
    }

    function setMode(m){ mode = m; for (var k in btn) btn[k].setAttribute('aria-pressed', k === m ? 'true' : 'false'); draw(); }
    btn.fix.addEventListener('click', function(){ setMode('fix'); });
    btn.est.addEventListener('click', function(){ setMode('est'); });
    btn.cnt.addEventListener('click', function(){ setMode('cnt'); });
    thr.addEventListener('input', draw);
    comb.addEventListener('change', draw);

    var leg = document.getElementById('s03-leg');
    leg.innerHTML =
      '<span><svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="var(--bad)"/></svg> methylated call</span>' +
      '<span><svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="none" stroke="var(--accent)" stroke-width="2.5"/></svg> unmethylated call</span>' +
      '<span><svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="none" stroke="var(--err)" stroke-dasharray="3 2" stroke-width="1.5"/></svg> failed (below the pass threshold)</span>' +
      '<span>number = the read\'s 5mC probability; <span class="tip" title="Confidence: the larger of the two class probabilities, max(p, 1 − p). A call passes when its confidence is at least the pass threshold.">confidence</span> = max(p, 1 − p)</span>';
    draw();
  })();

  /* ---------------- coverage calculator ---------------- */
  var cs = document.getElementById('s03-cov-svg');
  if (cs) (function(){
    var nI = document.getElementById('s03-n'), pI = document.getElementById('s03-p');
    var nO = document.getElementById('s03-n-o'), pO = document.getElementById('s03-p-o'), out = document.getElementById('s03-cov-out');
    function pmf(n, p){
      var r = [], lc = 0;   // log of n choose k, built up step by step
      for (var k = 0; k <= n; k++){
        if (k > 0) lc += Math.log(n - k + 1) - Math.log(k);
        var v;
        if (p === 0) v = (k === 0) ? 1 : 0;
        else if (p === 1) v = (k === n) ? 1 : 0;
        else v = Math.exp(lc + k * Math.log(p) + (n - k) * Math.log(1 - p));
        r.push(v);
      }
      return r;
    }
    function draw(){
      var n = +nI.value, p = +pI.value / 100;
      nO.textContent = n; pO.textContent = Math.round(p * 100) + ' %';
      var f = pmf(n, p), cum = 0, lo = null, hi = null, mx = 0;
      f.forEach(function(v, k){ cum += v; if (lo === null && cum >= 0.025) lo = k; if (hi === null && cum >= 0.975 - 1e-12) hi = k; if (v > mx) mx = v; });
      while (cs.firstChild) cs.removeChild(cs.firstChild);
      var X0 = 50, W = 690, Y0 = 150, H = 120;
      el('line', { x1: X0, x2: X0 + W, y1: Y0, y2: Y0, 'class': 'ax' }, cs);
      for (var g = 0; g <= 100; g += 10){
        var gx = X0 + W * g / 100;
        el('line', { x1: gx, x2: gx, y1: Y0, y2: Y0 + 4, 'class': 'ax' }, cs);
        el('text', { x: gx, y: Y0 + 17, 'text-anchor': 'middle' }, cs, g + ' %');
      }
      el('text', { x: X0 + W / 2, y: Y0 + 34, 'text-anchor': 'middle', 'class': 'lab' }, cs, 'observed methylation level = methylated reads / reads');
      var bw = Math.max(2, Math.min(28, W / (n + 1) * 0.7));
      f.forEach(function(v, k){
        var x = X0 + W * k / n, h = mx ? H * v / mx : 0;
        if (n === 0) return;
        var inside = k >= lo && k <= hi;
        var r = el('rect', { x: x - bw / 2, y: Y0 - h, width: bw, height: h, fill: inside ? 'var(--accent)' : 'var(--err)', opacity: inside ? 0.85 : 0.6 }, cs);
        el('title', {}, r, k + ' of ' + n + ' reads methylated (' + Math.round(100 * k / n) + ' %): chance ' + (100 * v).toFixed(1) + ' %');
      });
      var tx = X0 + W * p;
      el('line', { x1: tx, x2: tx, y1: Y0 - H - 8, y2: Y0, stroke: 'var(--bad)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, cs);
      el('text', { x: Math.min(Math.max(tx, X0 + 40), X0 + W - 40), y: Y0 - H - 12, 'text-anchor': 'middle', fill: 'var(--bad)' }, cs, 'true level');
      var loP = Math.round(100 * lo / n), hiP = Math.round(100 * hi / n);
      out.innerHTML =
        '<div>possible observed values<b>steps of ' + (100 / n).toFixed(n > 30 ? 1 : 0) + ' %</b>' + (n + 1) + ' values from 0 to 100 %</div>' +
        '<div>95 % of the time you would observe<b>' + loP + ' to ' + hiP + ' %</b>central 95 % of the <span class="tip" title="Binomial distribution: the number of methylated reads among n reads, each from a methylated molecule with chance equal to the true level.">binomial</span> distribution (blue bars)</div>' +
        '<div>width of that range<b>' + (hiP - loP) + ' percentage points</b>before any calling error is added</div>';
    }
    nI.addEventListener('input', draw); pI.addEventListener('input', draw);
    draw();
  })();
})();
