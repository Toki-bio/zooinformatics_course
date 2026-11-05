(function(){
  var NS = 'http://www.w3.org/2000/svg';
  var el = function(id){ return document.getElementById(id); };
  function css(v){ return 'var(' + v + ')'; }
  function mk(tag, attrs, txt){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  function fmtInt(x){ return Math.round(x).toLocaleString('en-US'); }
  function fmtYears(y){
    if (y >= 1e6) return (y / 1e6).toFixed(y >= 1e7 ? 0 : 1) + ' My';
    if (y >= 1e3) return (y / 1e3).toFixed(y >= 1e4 ? 0 : 1) + ' ky';
    return Math.round(y) + ' y';
  }
  function segGroup(id, cb){
    var g = el(id); if (!g) return;
    g.addEventListener('click', function(e){
      var b = e.target.closest('button'); if (!b) return;
      Array.prototype.forEach.call(g.querySelectorAll('button'), function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      cb(b.getAttribute('data-v'));
    });
  }

  /* ---------- Toy 1: structured n-island model vs panmictic size change ---------- */
  // Two lineages; states S (same island) and D (different islands). Time in units of 2N generations.
  // From S: coalesce at rate 1, one of the two lineages migrates at total rate M. From D: rate M/(n-1) back to S.
  // IICR(t) = P(T > t) / f(t) = (pS + pD) / pS   (Mazet et al. 2016 define the IICR this way; chain: our implementation)
  function iicr(t, n, M, start){
    var a11 = -(1 + M), a12 = M, a21 = M / (n - 1), a22 = -M / (n - 1);
    var half = (a11 + a22) / 2, det = a11 * a22 - a12 * a21;
    var d = Math.sqrt(half * half - det);
    var e = Math.exp(-2 * d * t), s = (1 - e) / d;      // common factor exp((half+d)t)/2 cancels in the ratio
    var pS, pD;
    if (start === 's'){ pS = (1 + e) + s * (a11 - half); pD = s * a12; }
    else { pS = s * a21; pD = (1 + e) + s * (a22 - half); }
    if (pS <= 0) return Infinity;
    return (pS + pD) / pS;
  }

  var fig = el('s05-fig');
  if (fig){
    var st = { samp: 's' };
    var ctl = { n: el('s05-n'), m: el('s05-m'), N: el('s05-N') };
    var T0 = 0.003, T1 = 300;
    var X0 = 70, PW = 860, W = 960, Y0 = 26, PH = 250;
    function xp(t){ return X0 + (Math.log10(t) - Math.log10(T0)) / (Math.log10(T1) - Math.log10(T0)) * PW; }

    function legend(){
      var items = [['--accent', 'World A: islands of constant size (true IICR)', false], ['--het', 'World B: one population whose size followed this curve', true],
        ['--rep', 'what a perfect PSMC run returns (piecewise)', false], ['--muted', 'one island (N) and all islands (nN)', true]];
      var lg = el('s05-legend'); lg.replaceChildren();
      items.forEach(function(it){
        var s = document.createElement('span'), i = document.createElement('i');
        i.style.background = it[2] ? 'repeating-linear-gradient(90deg,' + css(it[0]) + ' 0 5px,transparent 5px 8px)' : css(it[0]);
        s.appendChild(i); s.appendChild(document.createTextNode(it[1])); lg.appendChild(s);
      });
    }

    function sketch(n, M, samp, yMin, yMax){
      var svg = mk('svg', { viewBox: '0 0 960 150', width: '100%', role: 'img', 'aria-label': 'Sketch of the two worlds: islands of constant size, or one population changing size' });
      svg.style.minWidth = '600px';
      svg.appendChild(mk('text', { x: 10, y: 15, 'class': 'lab' }, 'World A: ' + n + ' islands, sizes never change'));
      var shown = Math.min(n, 24), cx = 235, cy = 74, R = 50;
      var lineOp = Math.max(0.15, Math.min(1, 0.25 + 0.3 * Math.log10(M * 10)));
      for (var i = 0; i < shown; i++){
        var a = 2 * Math.PI * i / shown - Math.PI / 2, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a) * 0.9;
        svg.appendChild(mk('line', { x1: cx, y1: cy, x2: x, y2: y, stroke: css('--accent'), 'stroke-width': 1, opacity: lineOp.toFixed(2) }));
      }
      for (i = 0; i < shown; i++){
        a = 2 * Math.PI * i / shown - Math.PI / 2; x = cx + R * Math.cos(a); y = cy + R * Math.sin(a) * 0.9;
        var c = mk('circle', { cx: x, cy: y, r: shown > 12 ? 6 : 9, fill: css('--panel'), stroke: css('--accent'), 'stroke-width': 2 });
        if (i === 0 || (samp === 'd' && i === Math.floor(shown / 2))) c.setAttribute('fill', css('--accent'));
        svg.appendChild(c);
      }
      svg.appendChild(mk('text', { x: cx, y: 146, 'text-anchor': 'middle', fill: css('--muted') }, (n > shown ? '24 of ' + n + ' islands drawn; ' : '') + (samp === 'd' ? 'filled = the two sampled islands' : 'filled = sampled island') + '; lines = migrants'));
      // World B: one population, width ~ log size, time runs upward
      var bx = 740, top = 26, bot = 132;
      svg.appendChild(mk('text', { x: 500, y: 15, 'class': 'lab' }, 'World B: one population, size changed'));
      var pts = [], pts2 = [], K = 40, la = Math.log10(yMin), lb = Math.log10(yMax);
      for (var k = 0; k <= K; k++){
        var tt = Math.pow(10, Math.log10(T0) + k / K * (Math.log10(T1) - Math.log10(T0)));
        var v = iicr(tt, n, M, 's'), w = 6 + 130 * (Math.log10(v) - la) / (lb - la);
        var yy = bot - k / K * (bot - top);
        pts.push((bx - w).toFixed(1) + ',' + yy.toFixed(1)); pts2.unshift((bx + w).toFixed(1) + ',' + yy.toFixed(1));
      }
      svg.appendChild(mk('polygon', { points: pts.concat(pts2).join(' '), fill: css('--het'), 'fill-opacity': 0.28, stroke: css('--het'), 'stroke-width': 1.5 }));
      svg.appendChild(mk('text', { x: 500, y: top + 10, fill: css('--muted') }, 'past ↑'));
      svg.appendChild(mk('text', { x: 500, y: bot, fill: css('--muted') }, 'present'));
      svg.appendChild(mk('text', { x: 955, y: bot, 'text-anchor': 'end', fill: css('--muted') }, 'width = size,'));
      svg.appendChild(mk('text', { x: 955, y: bot + 14, 'text-anchor': 'end', fill: css('--muted') }, 'log scale'));
      el('s05-sketch').replaceChildren(svg);
    }

    function draw(){
      var n = +ctl.n.value, M = Math.pow(10, +ctl.m.value), Nd = Math.round(Math.pow(10, +ctl.N.value));
      var samp = st.samp, K = 260, curveS = [], curveA = [];
      for (var k = 0; k <= K; k++){
        var t = Math.pow(10, Math.log10(T0) + k / K * (Math.log10(T1) - Math.log10(T0)));
        curveS.push([t, iicr(t, n, M, 's')]);
        curveA.push([t, samp === 's' ? curveS[k][1] : iicr(t, n, M, 'd')]);
      }
      var anc = curveS[K][1];
      var yMin = 0.5, yMax = Math.pow(10, Math.ceil(Math.log10(Math.max(anc, n) * 2.5)));
      if (yMax < 10) yMax = 10;
      var yMaxS = Math.min(yMax, 1e5);
      if (samp === 'd') yMax *= 10;
      if (yMax > 1e5) yMax = 1e5;
      var yp = function(v){ v = Math.min(Math.max(v, yMin), yMax * 1.02); return Y0 + PH - (Math.log10(v) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin)) * PH; };
      var svg = mk('svg', { viewBox: '0 0 ' + W + ' 336', width: '100%', role: 'img', 'aria-label': 'Inverse instantaneous coalescence rate over time for the island model and the equivalent panmictic history' });
      svg.style.minWidth = '600px';
      svg.appendChild(mk('text', { x: X0, y: 14, 'class': 'lab' }, 'IICR of two genome copies: the curve PSMC estimates (log-log)'));
      // grid + axes
      for (var e = Math.ceil(Math.log10(yMin)); e <= Math.log10(yMax); e++){
        var y = yp(Math.pow(10, e));
        svg.appendChild(mk('line', { x1: X0, x2: X0 + PW, y1: y, y2: y, 'class': 'grid' }));
        svg.appendChild(mk('text', { x: X0 - 6, y: y + 4, 'text-anchor': 'end' }, e >= 0 ? fmtInt(Math.pow(10, e)) : Math.pow(10, e).toString()));
      }
      for (e = Math.ceil(Math.log10(T0)); e <= Math.log10(T1); e++){
        var x = xp(Math.pow(10, e));
        svg.appendChild(mk('line', { x1: x, x2: x, y1: Y0, y2: Y0 + PH, 'class': 'grid' }));
        svg.appendChild(mk('text', { x: x, y: Y0 + PH + 15, 'text-anchor': 'middle' }, String(Math.pow(10, e) >= 1 ? Math.pow(10, e) : +Math.pow(10, e).toFixed(3))));
        svg.appendChild(mk('text', { x: x, y: Y0 + PH + 31, 'text-anchor': 'middle', fill: css('--muted') }, fmtYears(Math.pow(10, e) * 2 * Nd)));
      }
      svg.appendChild(mk('rect', { x: X0, y: Y0, width: PW, height: PH, 'class': 'ax' }));
      svg.appendChild(mk('text', { x: X0 - 8, y: Y0 + PH + 15, 'text-anchor': 'end', fill: css('--muted') }, '2N gen.'));
      svg.appendChild(mk('text', { x: X0 - 8, y: Y0 + PH + 31, 'text-anchor': 'end', fill: css('--muted') }, 'years'));
      svg.appendChild(mk('text', { x: X0 + PW / 2, y: Y0 + PH + 50, 'text-anchor': 'middle', 'class': 'lab' }, 'time before present (upper row: units of 2N generations; lower row: years for the island size set above, g = 1 yr) →'));
      var yl = mk('text', { x: 16, y: Y0 + PH / 2, 'text-anchor': 'middle', transform: 'rotate(-90 16 ' + (Y0 + PH / 2) + ')', 'class': 'lab' }, 'apparent size (units of one island, N)');
      svg.appendChild(yl);
      // reference lines
      [[1, 'one island (N)'], [n, 'all islands (nN = ' + n + 'N)']].forEach(function(r){
        var yy = yp(r[0]);
        svg.appendChild(mk('line', { x1: X0, x2: X0 + PW, y1: yy, y2: yy, stroke: css('--muted'), 'stroke-dasharray': '2 4', 'stroke-width': 1.2 }));
        svg.appendChild(mk('text', { x: X0 + PW - 6, y: yy + 14, 'text-anchor': 'end', fill: css('--muted') }, r[1]));
      });
      // perfect PSMC: piecewise constant over 24 log-spaced intervals, value at the geometric midpoint
      var P = 24, d = '', lo = Math.log10(0.01), hi = Math.log10(100);
      for (var i = 0; i < P; i++){
        var ta = Math.pow(10, lo + i / P * (hi - lo)), tb = Math.pow(10, lo + (i + 1) / P * (hi - lo));
        var v = samp === 's' ? iicr(Math.sqrt(ta * tb), n, M, 's') : iicr(Math.sqrt(ta * tb), n, M, 'd');
        if (v > yMax){ continue; }
        d += (d ? 'L' : 'M') + xp(ta).toFixed(1) + ' ' + yp(v).toFixed(1) + 'L' + xp(tb).toFixed(1) + ' ' + yp(v).toFixed(1);
      }
      svg.appendChild(mk('path', { d: d, fill: 'none', stroke: css('--rep'), 'stroke-width': 1.6 }));
      function line(c, color, width, dash){
        var p = '';
        c.forEach(function(q, j){ if (!isFinite(q[1]) || q[1] > yMax) return; p += (p ? 'L' : 'M') + xp(q[0]).toFixed(1) + ' ' + yp(q[1]).toFixed(1); });
        var a = { d: p, fill: 'none', stroke: css(color), 'stroke-width': width };
        if (dash) a['stroke-dasharray'] = dash;
        svg.appendChild(mk('path', a));
      }
      line(curveA, '--accent', 3);
      line(curveS, '--het', 2.2, '7 5');
      fig.replaceChildren(svg);
      sketch(n, M, samp, yMin, yMaxS);

      // readouts: where does the apparent change happen (10 % and 90 % of the log-rise, same-island curve)
      var l0 = Math.log10(curveS[0][1]), l1 = Math.log10(anc), tLo = null, tHi = null;
      curveS.forEach(function(q){
        var f = (Math.log10(q[1]) - l0) / (l1 - l0);
        if (tLo === null && f >= 0.1) tLo = q[0];
        if (tHi === null && f >= 0.9) tHi = q[0];
      });
      var out = el('s05-out'); out.replaceChildren();
      function cell(label, val, tip){
        var dv = document.createElement('div'), s = document.createElement('span');
        s.innerHTML = label; if (tip){ s.className = 'tip'; s.title = tip; }
        var b = document.createElement('b'); b.textContent = val;
        dv.appendChild(s); dv.appendChild(b); out.appendChild(dv);
      }
      cell('True size change in World A', 'none', 'Every island keeps N diploid animals for ever; only migration links them.');
      cell('Apparent ancient size', anc.toFixed(1) + ' × N = ' + fmtInt(anc * Nd), 'IICR far back in time. It is larger than the total census of all islands (n × N = ' + fmtInt(n * Nd) + '): restricted migration keeps lineages apart for longer.');
      if (samp === 's'){
        cell('Apparent recent size', '≈ ' + curveS[0][1].toFixed(2) + ' × N = ' + fmtInt(curveS[0][1] * Nd), 'IICR near the present: two copies from one island first see only that island.');
        cell('Apparent "decline"', tLo && tHi ? fmtYears(tHi * 2 * Nd) + ' → ' + fmtYears(tLo * 2 * Nd) + ' ago' : 'n/a', 'Times where the curve has fallen 90 % and 10 % of the way (on a log scale) from its ancient to its recent value. Years = time × 2N generations × 1 year.');
      } else {
        cell('Apparent recent size', 'very large, falling', 'Two copies from different islands cannot coalesce until a migrant brings them together, so the coalescence rate near the present is close to 0 and its inverse is huge.');
        cell('World B with this sampling', 'unchanged', 'World B has one population, so where the animals were sampled makes no difference to its curve: the dashed line stays where it was.');
      }
    }

    function outputs(){
      el('s05-n-o').textContent = ctl.n.value;
      var M = Math.pow(10, +ctl.m.value);
      el('s05-m-o').textContent = M < 1 ? M.toFixed(2) : M.toFixed(1);
      el('s05-N-o').textContent = fmtInt(Math.pow(10, +ctl.N.value));
    }
    ['n', 'm', 'N'].forEach(function(k){ ctl[k].addEventListener('input', function(){ outputs(); draw(); }); });
    segGroup('s05-samp', function(v){ st.samp = v; draw(); });
    legend(); outputs();
    try { draw(); } catch (err){ fig.textContent = 'Figure could not be drawn: ' + err.message; }
  }

  /* ---------- Toy 2: decision helper ---------- */
  var dout = el('s05-dec-out');
  if (dout){
    var ds = { n: 1, ph: 'no', k: 1, q: 'size' };
    var TIP = {
      sfs: '<span class="tip" title="Site frequency spectrum: how many SNPs are carried by 1, 2, 3, ... of the sampled chromosomes.">SFS</span>',
      dist: '<span class="tip" title="SMC++ follows one animal along the genome like PSMC (the distinguished pair of haplotypes) and adds allele counts from the other animals.">distinguished</span>',
      comp: '<span class="tip" title="A likelihood that multiplies pieces that are not independent (here: the same chromosomes with different animals as the focus). Fine for estimates, overstates the evidence.">composite likelihood</span>',
      rccr: '<span class="tip" title="Relative cross-coalescence rate: 2 x rate across populations / (rate within A + rate within B). About 1 = one population, 0 = fully separated.">relative cross-coalescence rate</span>',
      dl: '<span class="tip" title="Delta L: log-likelihood of the best structured fit minus that of the best panmictic (PSMC-like) fit.">ΔL</span>',
      iicr: '<span class="tip" title="Inverse instantaneous coalescence rate: what a PSMC curve really is. It equals the population size only if the population was one random-mating unit.">IICR</span>'
    };
    var M = {
      psmc: ['PSMC (s03)', 'One diploid, unphased consensus. With several animals, run each one separately and compare the curves.'],
      msmc1: ['MSMC2 on one animal', 'Two haplotypes: the PSMC-like case. A second implementation with its own time intervals, but the same two haplotypes.'],
      msmcU: ['MSMC2, pairs within animals', 'Unphased animals: <code>-I 0-1,2-3,…</code> pairs only the two haplotypes inside each animal. One combined fit; no gain in recent resolution.'],
      msmcP: ['MSMC2, all haplotype pairs', 'Phased haplotypes: every pair is used, and the first coalescence among many haplotypes reaches closer to the present. The author does not think it feasible to go beyond 16 haplotypes (8 diploids): use a subset.'],
      msmcX: ['MSMC2 cross-coalescence', 'Phased haplotypes from both populations: three runs (within A, within B, across with <code>-s</code>), then <code>combineCrossCoal.py</code> and the relative rate. The guide\'s example uses one phased diploid per population.'],
      msmcIM: ['MSMC-IM', 'Fits an isolation-with-migration model to the three MSMC2 rates and gives gene flow through time (Wang et al. 2020). Needs the phased MSMC2 cross-population runs.'],
      smc1: ['SMC++ with one animal', 'Unphased VCF + mask of uncalled regions; one ' + 'X' + ' animal. Another single-genome model, with its own regularisation (piecewise default, or pchip/cubic spline).'],
      smcN: ['SMC++', 'Unphased VCF + mask; "results independent of phasing". Make each of 2–10 animals the ' + 'X' + ' one in turn (<code>vcf2smc -d</code>); <code>estimate</code> combines them as a ' + 'Y' + '.'],
      smcS: ['SMC++ split', 'Marginal fit per population, joint data sets in both orders, then <code>split</code>. Fits a clean split: no gene flow after it (README).'],
      cob: ['cobraa', 'One diploid: a structured model (split, then an admixture pulse) against the panmictic one. Read ' + 'D' + ' only against your own null simulations with the observed variation of heterozygosity along the genome.'],
      stair: ['Stairway Plot 2', 'Folded or unfolded ' + 'S' + ' of the sample + number of all callable sites (L). No phasing, no predefined model.'],
      fsc: ['fastsimcoal2', 'Write competing models (<code>.tpl</code> + <code>.est</code>), fit each to the (joint) ' + 'S' + ' many times (the manual\'s script does 50 runs per data set) and compare the best likelihoods.'],
      s07: ['s07 methods', 'Designed for one or few genomes per population or species: pseudo-diploid PSMC (hPSMC), BPP, gIMble. See <a href="#s07">s07</a>.'],
      roh: ['Runs of homozygosity', 'Long ROH speak about the last few dozen generations (inbreeding, very small recent size): <a href="../03-annotation/#s09">lesson 3, s09</a>.'],
      loc: ['Sample several places', 'In a structured population the curve depends on where the animals come from; in one panmictic population it does not (toy above). Compare animals from different localities.']
    };
    function txt(key){
      var m = M[key];
      var t = m[1].replace(/ X /g, ' ' + TIP.dist + ' ').replace(' Y.', ' ' + TIP.comp + '.').replace(' D ', ' ' + TIP.dl + ' ').replace(/ S /g, ' ' + TIP.sfs + ' ');
      if (key === 'msmcX') t = t.replace('the relative rate', 'the ' + TIP.rccr);
      return [m[0], t];
    }
    function decide(){
      var n = ds.n, ph = ds.ph === 'yes', k = ds.k, q = ds.q, rec = [], no = [], warn = [];
      var sfsNo = ['Stairway Plot 2 / fastsimcoal2', n === 1 ? 'One diploid gives a folded ' + TIP.sfs + ' with a single class (heterozygous sites): it has no information about time.' : 'With ' + (n === 2 ? '2 to 4' : '5 to 19') + ' animals the folded ' + TIP.sfs + ' has only as many classes as animals; possible, but weak.'];
      if (q === 'size'){
        if (n === 1){ rec.push('psmc', 'smc1', 'msmc1', 'cob'); no.push(sfsNo);
          warn.push('All of these read the same two haplotypes. Agreement between them shows the result is not an artefact of one program, not that it is true.'); }
        else if (n === 2){ rec.push('psmc', 'smcN', ph ? 'msmcP' : 'msmcU'); no.push(sfsNo); }
        else { rec.push('smcN', 'stair'); if (ph) rec.push('msmcP'); if (n === 20) rec.push('fsc'); rec.push('psmc');
          if (n === 5) warn.push('With 5 to 19 animals the frequency spectrum has only 5 to 19 classes (folded): Stairway Plot 2 runs, but coarsely. Its example blueprint uses 30 sequences (15 diploids).'); }
        if (k === 2) warn.push('Two populations: fit each separately here; for their joint history choose "when did they split?".');
      } else if (q === 'recent'){
        if (n === 1){ rec.push('roh', 'psmc');
          warn.push('One genome holds little information about the last few thousand generations: the youngest PSMC intervals are the least reliable (<a href="#s06">s06</a>). Do not interpret them without the pattern and call-set checks.'); no.push(sfsNo); }
        else { if (ph) rec.push('msmcP'); rec.push('smcN'); if (n >= 5) rec.push('stair'); rec.push('roh');
          if (!ph) warn.push('Without phasing MSMC2 gains no recent resolution from more animals; SMC++ was built for exactly this case (unphased, many genomes).'); }
      } else if (q === 'split' || q === 'flow'){
        if (k === 1){
          if (q === 'flow'){ rec.push('cob'); if (n >= 5) rec.push('fsc');
            warn.push('With one population, gene flow can only come from an unsampled ("ghost") population: cobraa\'s admixture pulse, or a ghost population written into a fastsimcoal2 model. Choose "two" populations if you have them.'); }
          else warn.push('A split time needs two populations (or species). Choose "two".');
        } else if (n === 1){
          if (ph){ rec.push('msmcX'); if (q === 'flow') rec.push('msmcIM'); }
          rec.push('s07');
          if (!ph) no.push(['MSMC2 cross-coalescence', 'Needs phased haplotypes; with <code>-s</code> every heterozygous site of an unphased animal is ambiguous and skipped.']);
          if (q === 'flow') no.push(['<span class="tip" title="Tests that count ABBA versus BABA site patterns in four genomes (two sister lineages, a third lineage, an outgroup). An excess of one pattern points to gene flow between the third lineage and one sister, not between the two sisters themselves.">D-statistics (ABBA-BABA)</span>', 'Cannot test gene flow between sister species with one genome each (<a href="#s07">s07</a>).']);
          no.push(['SMC++ split / SFS methods', 'With one animal per population there is almost no frequency information to fit (our inference).']);
        } else {
          if (q === 'split') rec.push('smcS');
          if (ph){ rec.push('msmcX'); if (q === 'flow') rec.push('msmcIM'); }
          if (n >= 5) rec.push('fsc');
          if (q === 'flow') no.push(['SMC++ split', 'Assumes a clean split with no gene flow afterwards (README), so it cannot measure gene flow.']);
          if (!ph) no.push(['MSMC2 cross-coalescence', 'Needs phased haplotypes (trio, long reads or statistical phasing).']);
          if (q === 'flow' && !ph && n < 5){ rec.push('s07'); }
          if (q === 'flow' && !ph && n < 5) warn.push('With few unphased animals per population, the multispecies-coalescent approach of s07 (BPP with migration) is the main option here; fastsimcoal2 needs more animals for a useful joint spectrum.');
        }
      } else { // struct
        if (n === 1){ rec.push('cob');
          warn.push('The ' + TIP.iicr + ' of one genome cannot separate structure from size change (toy above; Mazet et al. 2016). cobraa uses extra information along the genome, but on our genomes its gain was matched by structureless simulations. Simulate a null first.'); }
        else { rec.push('loc', 'cob'); if (ph && k === 2) rec.push('msmcX'); if (n >= 5) rec.push('fsc'); }
      }
      // render
      dout.replaceChildren();
      function block(title, color){
        var h = document.createElement('p'); h.className = 's05-dh'; h.style.borderLeftColor = css(color); h.innerHTML = title; dout.appendChild(h);
        var ul = document.createElement('ul'); ul.className = 's05-dl'; dout.appendChild(ul); return ul;
      }
      if (rec.length){
        var ul = block('<b>Use</b>', '--good');
        rec.forEach(function(key){ var t = txt(key), li = document.createElement('li'); li.innerHTML = '<b>' + t[0] + '.</b> ' + t[1]; ul.appendChild(li); });
      }
      if (no.length){
        var ul2 = block('<b>Not suitable here</b>', '--bad');
        no.forEach(function(x){ var li = document.createElement('li'); li.innerHTML = '<b>' + x[0] + '.</b> ' + x[1]; ul2.appendChild(li); });
      }
      if (warn.length){
        var ul3 = block('<b>Keep in mind</b>', '--het');
        warn.forEach(function(x){ var li = document.createElement('li'); li.innerHTML = x; ul3.appendChild(li); });
      }
    }
    segGroup('s05-dn', function(v){ ds.n = +v; decide(); });
    segGroup('s05-dp', function(v){ ds.ph = v; decide(); });
    segGroup('s05-dk', function(v){ ds.k = +v; decide(); });
    segGroup('s05-dq', function(v){ ds.q = v; decide(); });
    try { decide(); } catch (err){ dout.textContent = 'Helper could not run: ' + err.message; }
  }
})();

(function(){
  var host = document.getElementById('s05-wf');
  if (!host) return;
  var NS = 'http://www.w3.org/2000/svg';
  var el = function(id){ return document.getElementById(id); };
  function css(v){ return 'var(' + v + ')'; }
  function mk(tag, attrs, txt){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  function rng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // CORE-BEGIN: Wright-Fisher display. The same block is copied in 01-coalescent.js, 03-psmc.js and 05-beyond-psmc.js
  // (sections are separate scripts with no shared globals). It needs mk() and css() of its section.
  // spec = { size: g -> gene copies in generation g (0 = today, larger = older), demes: 1 or 2,
  // m: chance per generation that a copy's parent sits in the other deme }.
  function wfDeme(i, c){ return i < (c >> 1) ? 0 : 1; }
  function wfPick(spec, g, i, r){
    var c1 = spec.size(g + 1);
    if (spec.demes !== 2) return Math.floor(r() * c1);
    var d = wfDeme(i, spec.size(g)), h = c1 >> 1;
    if (r() < spec.m) d = 1 - d;
    return d === 0 ? Math.floor(r() * h) : h + Math.floor(r() * (c1 - h));
  }
  function wfPop(spec, r){                 // a population, grown backward on demand
    var par = [];
    return { spec: spec, par: par, grow: function(G){
      while (par.length < G){
        var g = par.length, c = spec.size(g), a = new Int32Array(c);
        for (var i = 0; i < c; i++) a[i] = wfPick(spec, g, i, r);
        par.push(a);
      }
    } };
  }
  function wfTrace(pop, sample){           // follow the sampled copies back until one line is left
    var cur = sample.slice(), rows = [cur.slice()], meets = [], g = 0;
    while (cur.length > 1 && g < 200000){
      pop.grow(g + 1);
      var seen = {}, next = [];
      cur.forEach(function(c){ var p = pop.par[g][c]; if (seen[p]) seen[p]++; else { seen[p] = 1; next.push(p); } });
      g++;
      next.forEach(function(p){ if (seen[p] > 1) meets.push({ g: g, i: p, k: seen[p] }); });
      cur = next; rows.push(cur.slice());
    }
    return { T: g, rows: rows, meets: meets };
  }
  function wfMax(spec, G){ var m = 2; for (var g = 0; g <= G; g++) m = Math.max(m, spec.size(g)); return m; }
  // x position (0..1) of every copy. Each row is sorted by the position of the parents, so links do
  // not cross; the place of a copy in its row therefore means nothing. Row width follows row size.
  function wfLayout(pop, G){
    var spec = pop.spec, two = spec.demes === 2, cmax = wfMax(spec, G), g, i, X = [];
    var step = (two ? 0.46 : 1) / ((two ? cmax / 2 : cmax) - 1 || 1);
    function place(c, order, out){
      for (var d = 0; d < (two ? 2 : 1); d++){
        var mine = two ? order.filter(function(k){ return wfDeme(k, c) === d; }) : order;
        var mid = two ? (d === 0 ? 0.23 : 0.77) : 0.5;
        mine.forEach(function(k, rank){ out[k] = mid + (rank - (mine.length - 1) / 2) * step; });
      }
    }
    pop.grow(G);
    var c0 = spec.size(G), top = new Float64Array(c0), ord = [];
    for (i = 0; i < c0; i++) ord.push(i);
    place(c0, ord, top); X[G] = top;
    for (g = G - 1; g >= 0; g--){
      (function(g){
        var c = spec.size(g), row = new Float64Array(c), o = [], up = X[g + 1], pr = pop.par[g];
        for (var k = 0; k < c; k++) o.push(k);
        o.sort(function(a, b){ return up[pr[a]] - up[pr[b]] || a - b; });
        place(c, o, row); X[g] = row;
      })(g);
    }
    return X;
  }
  // Static part of the picture: every copy as a faint dot, every parent link as a faint line.
  // o = { W, G, x0 (left margin), pitch, maxH, label(g) -> axis text or '', title, shade: [from, to], aria }
  function wfBase(host, pop, o){
    var G = o.G, W = o.W, x0 = o.x0 || 46, x1 = W - 12, y0 = o.title ? 34 : 14;
    var pitch = Math.max(3, Math.min(o.pitch || 16, (o.maxH || 620) / G)), H = y0 + G * pitch + 22;
    var X = wfLayout(pop, G), spec = pop.spec;
    function px(g, i){ return x0 + X[g][i] * (x1 - x0); }
    function py(g){ return y0 + (G - g) * pitch; }
    var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': o.aria || 'Rows of gene copies, one row per generation, with the link from each copy to its parent' });
    svg.style.minWidth = '300px';
    if (o.shade){
      var a = Math.min(o.shade[1], G + 1), b = Math.max(o.shade[0], 0);
      if (a > b) svg.appendChild(mk('rect', { x: x0 - 6, y: py(a - 1) - pitch / 2, width: x1 - x0 + 12, height: (a - b) * pitch, fill: css('--code-bg') }));
    }
    if (o.title) svg.appendChild(mk('text', { x: x0 - 6, y: 14, 'class': 'lab' }, o.title));
    var dl = '', dm = '', dd = '', g, i, c;
    for (g = 0; g < G; g++){
      c = spec.size(g);
      for (i = 0; i < c; i++){
        var p = pop.par[g][i], seg = 'M' + px(g, i).toFixed(1) + ' ' + py(g).toFixed(1) + 'L' + px(g + 1, p).toFixed(1) + ' ' + py(g + 1).toFixed(1);
        if (spec.demes === 2 && wfDeme(i, c) !== wfDeme(p, spec.size(g + 1))) dm += seg; else dl += seg;
      }
    }
    var r = Math.max(1.2, Math.min(3.2, pitch * 0.3, (x1 - x0) / Math.max(1, wfMax(spec, G)) * 0.34));
    for (g = 0; g <= G; g++){ c = spec.size(g); for (i = 0; i < c; i++) dd += 'M' + px(g, i).toFixed(1) + ' ' + py(g).toFixed(1) + 'h0'; }
    svg.appendChild(mk('path', { d: dl, fill: 'none', stroke: css('--err'), 'stroke-width': 0.8, opacity: '0.55' }));
    if (dm) svg.appendChild(mk('path', { d: dm, fill: 'none', stroke: css('--het'), 'stroke-width': 1.2, opacity: '0.8' }));
    if (pitch >= 5) svg.appendChild(mk('path', { d: dd, fill: 'none', stroke: css('--err'), 'stroke-width': 2 * r, 'stroke-linecap': 'round' }));
    for (g = 0; g <= G; g++){
      var t = o.label ? o.label(g) : '';
      if (t !== '') svg.appendChild(mk('text', { x: x0 - 12, y: py(g) + 4, 'text-anchor': 'end' }, t));
    }
    var over = mk('g', {}); svg.appendChild(over);
    host.replaceChildren(svg);
    return { pop: pop, px: px, py: py, over: over, pitch: pitch, r: r, x0: x0, x1: x1, G: G, svg: svg };
  }
  // Moving part: the sampled lines from today back to generation cur, and where they met.
  function wfOver(b, tr, cur, o){
    o = o || {};
    var over = b.over, pop = b.pop, col = css(o.colour || '--accent'); over.replaceChildren();
    var last = Math.min(cur, tr.T, b.G), d = '', dots = '', g;
    if (cur > 0 && !o.noBand) over.appendChild(mk('rect', { x: b.x0 - 6, y: b.py(last) - b.pitch / 2, width: b.x1 - b.x0 + 12, height: b.pitch, fill: css('--accent'), opacity: '0.14' }));
    function link(c){
      var p = pop.par[g][c];
      d += 'M' + b.px(g, c).toFixed(1) + ' ' + b.py(g).toFixed(1) + 'L' + b.px(g + 1, p).toFixed(1) + ' ' + b.py(g + 1).toFixed(1);
    }
    function dot(c){ dots += 'M' + b.px(g, c).toFixed(1) + ' ' + b.py(g).toFixed(1) + 'h0'; }
    for (g = 0; g < last; g++) tr.rows[g].forEach(link);
    for (g = 0; g <= last; g++) if (g === 0 || g === last || b.pitch >= 7) tr.rows[g].forEach(dot);
    if (d) over.appendChild(mk('path', { d: d, fill: 'none', stroke: col, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }));
    over.appendChild(mk('path', { d: dots, fill: 'none', stroke: col, 'stroke-width': 2 * b.r + 1.6, 'stroke-linecap': 'round' }));
    tr.meets.forEach(function(m){
      if (m.g > last) return;
      var end = m.g === tr.T;
      over.appendChild(mk('circle', { cx: b.px(m.g, m.i), cy: b.py(m.g), r: end ? 7 : 5.5, fill: 'none', stroke: css(end ? '--bad' : '--het'), 'stroke-width': 2 }));
      if (end && o.endLabel){
        var x = b.px(m.g, m.i), right = x < (b.x0 + b.x1) / 2;
        over.appendChild(mk('text', { x: x + (right ? 12 : -12), y: b.py(m.g) - 9, 'text-anchor': right ? 'start' : 'end', 'class': 'lab', stroke: css('--bg'), 'stroke-width': 3, 'paint-order': 'stroke' }, o.endLabel));
      }
    });
  }
  // CORE-END
  // Four readers of one Wright-Fisher population. Same seed = same ancestors and same sampled copies.
  var C = 30, ROWS = 40, MAXN = 8, st = { reader: 'psmc', n: 8, seed: 11 };
  var spec = { size: function(){ return C; }, demes: 1 };
  var NAME = { psmc: 'PSMC', msmc: 'MSMC (2014)', msmc2: 'MSMC2', smcpp: 'SMC++' };
  function cell(label, val){
    var d = document.createElement('div'), s = document.createElement('span'), b = document.createElement('b');
    s.textContent = label; b.textContent = val; d.appendChild(s); d.appendChild(b); return d;
  }
  function seen(g){ return g > ROWS ? g + ' (above the picture)' : String(g); }
  function draw(){
    var W = Math.max(320, Math.min(host.clientWidth || 760, 820));
    var r = rng(st.seed), pop = wfPop(spec, r); pop.grow(ROWS);
    var all = [], i;
    for (i = 0; i < C; i++) all.push(i);
    for (i = 0; i < MAXN; i++){ var j = i + Math.floor(r() * (C - i)), t = all[i]; all[i] = all[j]; all[j] = t; }
    var pair = all.slice(0, 2), use = all.slice(0, st.n);
    var b = wfBase(host, pop, { W: W, G: ROWS, x0: 58, pitch: 10, maxH: 430,
      title: NAME[st.reader] + ' (generations back at left)',
      label: function(g){ return g % 10 === 0 ? String(g) : ''; },
      aria: 'Thirty gene copies over forty generations, with the lines followed by ' + NAME[st.reader] + ' in colour' });
    var out = el('s05-wf-out'), say = el('s05-wf-say'), cells = [], text;
    var trP = wfTrace(pop, pair), trS = wfTrace(pop, use);
    if (st.reader === 'psmc'){
      wfOver(b, trP, trP.T, { noBand: true, colour: '--accent', endLabel: 'met ' + trP.T + ' generations ago' });
      cells = [cell('Lines followed', '2'), cell('They met, generations ago', seen(trP.T))];
      text = 'PSMC follows the two copies of one animal back to their meeting. The number of copies sampled does not matter here: it always reads one pair.';
    } else if (st.reader === 'msmc'){
      var f = trS.meets[0].g;
      wfOver(b, trS, f, { colour: '--accent' });
      cells = [cell('Lines followed', String(st.n)), cell('Pairs among them', String(st.n * (st.n - 1) / 2)), cell('First meeting, generations ago', seen(f))];
      text = 'MSMC follows all the sampled copies, but only up to the first meeting between any two of them. It also keeps which two met. Everything further back in this stretch is not read.';
    } else if (st.reader === 'msmc2'){
      var ts = [];
      for (i = 0; i < st.n; i++) for (var k = i + 1; k < st.n; k++) ts.push(wfTrace(pop, [use[i], use[k]]).T);
      ts.sort(function(a, c){ return a - c; });
      wfOver(b, trS, trS.T, { noBand: true, colour: '--accent' });
      cells = [cell('Pairs read one by one', String(ts.length)), cell('Earliest pair met', seen(ts[0])), cell('Latest pair met', seen(ts[ts.length - 1]))];
      text = 'MSMC2 does not stop at the first meeting. It reads each selected pair separately, as PSMC would, and combines them. The pairs share ancestors, so they are not independent: ' + ts.length + ' pairs here do not hold ' + ts.length + ' separate histories.';
    } else {
      wfOver(b, trP, trP.T, { noBand: true, colour: '--accent', endLabel: 'pair met ' + trP.T + ' generations ago' });
      use.slice(2).forEach(function(c){
        b.over.appendChild(mk('circle', { cx: b.px(0, c), cy: b.py(0), r: 6, fill: 'none', stroke: css('--het'), 'stroke-width': 2 }));
      });
      cells = [cell('Distinguished pair met', seen(trP.T)), cell('Other copies, allele counts only', String(st.n - 2))];
      text = 'SMC++ follows one distinguished pair, as PSMC does. The other copies (ringed in the bottom row) are not followed as lines. At each site they give only a count: how many of them carry the allele. That count helps to date the pair, because it is linked to the pair\'s meeting time, and phasing is not needed.';
    }
    out.replaceChildren.apply(out, cells);
    say.textContent = text;
  }
  // Mean wait until any two of n lines share a parent, with the parent rule of the display.
  function firstMeet(n, reps, r){
    var sum = 0, a = new Int32Array(C);
    for (var t = 0; t < reps; t++){
      var g = 0, hit = false;
      while (!hit){
        g++; a.fill(0);
        for (var i = 0; i < n; i++){ var p = Math.floor(r() * C); if (a[p]) hit = true; a[p] = 1; }
      }
      sum += g;
    }
    return sum / reps;
  }
  function exact(n, c){ var q = 1; for (var i = 1; i < n; i++) q *= 1 - i / c; return 1 / (1 - q); }
  function repeat(){
    var r = rng(st.seed * 7 + 3), rows = [2, 4, 8].map(function(n){
      return '<tr><td>' + n + '</td><td>' + n * (n - 1) / 2 + '</td><td>' + firstMeet(n, 10000, r).toFixed(2) + '</td><td>' + exact(n, C).toFixed(2) +
        '</td><td>' + Math.round(exact(n, 3000)).toLocaleString('en-US') + '</td></tr>';
    }).join('');
    el('s05-wf-tab').innerHTML = '<div class="tbl"><table style="min-width:440px"><thead><tr><th>Copies followed</th><th>Pairs</th><th>Mean wait, 10,000 runs (30 copies)</th><th>Exact (30 copies)</th><th>Exact (3,000 copies)</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function seg(id, fn){
    var g = el(id);
    g.addEventListener('click', function(e){
      var t = e.target.closest('button'); if (!t) return;
      Array.prototype.forEach.call(g.querySelectorAll('button'), function(x){ x.setAttribute('aria-pressed', x === t ? 'true' : 'false'); });
      fn(t.getAttribute('data-v')); draw();
    });
  }
  seg('s05-wf-reader', function(v){ st.reader = v; });
  seg('s05-wf-n', function(v){ st.n = +v; });
  el('s05-wf-new').addEventListener('click', function(){ st.seed += 1; draw(); });
  el('s05-wf-rep').addEventListener('click', repeat);
  try { draw(); } catch (err){ host.textContent = 'Display could not run: ' + err.message; }
  var rz = 0, lastW = window.innerWidth;
  window.addEventListener('resize', function(){
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth; clearTimeout(rz); rz = setTimeout(draw, 150);
  });
})();
