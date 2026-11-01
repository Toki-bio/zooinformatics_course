(function(){
  var NS = 'http://www.w3.org/2000/svg';
  function $(id){ return document.getElementById(id); }
  function el(tag, attrs, parent, text){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgRoot(box, W, H, minW){
    box.innerHTML = '';
    var s = el('svg', {viewBox:'0 0 '+W+' '+H, width:'100%', role:'img'});
    s.style.minWidth = minW + 'px';
    s.style.display = 'block';
    box.appendChild(s);
    return s;
  }
  function kb(x){ return (x >= 10 ? x.toFixed(0) : x.toFixed(1)) + ' kb'; }
  function fmtInt(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function setPressed(ids, on){ ids.forEach(function(id){ var b=$(id); if (b) b.setAttribute('aria-pressed', id===on ? 'true' : 'false'); }); }
  function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ================= 1. read length vs repeat length ================= */
  var UNIQ = 20, NCOPY = 4, ANCHOR = 1, SIGMA = 0.89; // kb; sigma: N50/median ~ exp(sigma^2) ~ 2.2, as in our read sets
  var rl = $('s04-rl'), rr = $('s04-rr'), rc = $('s04-rc');
  var presets = {'s04-p-b':[1.5,6,25], 's04-p-c':[2.0,6,10], 's04-p-a':[5.0,6,35]}; // rounded toy values, not the real data
  var presetIds = Object.keys(presets);

  function simulate(med, R, cov){
    var G = UNIQ*(NCOPY+1) + R*NCOPY;
    var rnd = mulberry32(12345);
    var meanLen = med*Math.exp(SIGMA*SIGMA/2);
    var n = Math.min(20000, Math.round(cov*G/meanLen));
    var reads = [];
    for (var i=0;i<n;i++){
      var u1 = Math.max(rnd(),1e-12), u2 = rnd();
      var z = Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);
      var len = med*Math.exp(SIGMA*z);
      if (len > G) len = G;
      var st = rnd()*(G+len) - len; // reads may hang over the ends
      var a = Math.max(0, st), b = Math.min(G, st+len);
      if (b - a < 0.05) continue;
      reads.push([a, b, len]);
    }
    var copies = [];
    for (var c=0;c<NCOPY;c++){
      var s0 = UNIQ*(c+1) + R*c;
      copies.push({s:s0, e:s0+R, bridge:[], touch:[]});
    }
    reads.forEach(function(r){
      copies.forEach(function(cp){
        if (r[0] <= cp.s-ANCHOR && r[1] >= cp.e+ANCHOR) cp.bridge.push(r);
        else if (r[1] > cp.s && r[0] < cp.e) cp.touch.push(r);
      });
    });
    // read N50 of the simulated lengths
    var L = reads.map(function(r){return r[2];}).sort(function(a,b){return b-a;});
    var tot = L.reduce(function(a,b){return a+b;},0), acc=0, n50=0;
    for (var j=0;j<L.length;j++){ acc+=L[j]; if (acc>=tot/2){ n50=L[j]; break; } }
    var longEnough = L.filter(function(x){return x >= R+2*ANCHOR;}).reduce(function(a,b){return a+b;},0);
    return {G:G, reads:reads, copies:copies, n50:n50, fracLong: tot? longEnough/tot : 0, n:reads.length};
  }

  function drawRepeat(){
    var med = +rl.value, R = +rr.value, cov = +rc.value;
    $('s04-rlo').textContent = kb(med);
    $('s04-rro').textContent = kb(R);
    $('s04-rco').textContent = cov + '×';
    var sim = simulate(med, R, cov);
    var W = 900, padL = 70, padR = 20, x0 = padL, x1 = W - padR;
    var lanes = 5, laneH = 9;
    var H = 300;
    var svg = svgRoot($('s04-rp-fig'), W, H, 560);
    var sx = function(p){ return x0 + (x1-x0)*p/sim.G; };
    // genome bar
    var gy = 34;
    el('text', {x:8, y:gy+4, 'class':'lab'}, svg, 'genome');
    el('rect', {x:sx(0), y:gy-4, width:sx(sim.G)-sx(0), height:8, fill:'var(--muted)', opacity:.45}, svg);
    sim.copies.forEach(function(cp, i){
      el('rect', {x:sx(cp.s), y:gy-6, width:Math.max(1.5, sx(cp.e)-sx(cp.s)), height:12, fill:'var(--rep)'}, svg);
      el('text', {x:(sx(cp.s)+sx(cp.e))/2, y:gy-11, 'text-anchor':'middle'}, svg, 'copy '+(i+1));
    });
    el('text', {x:sx(0), y:gy+22}, svg, '0');
    el('text', {x:sx(sim.G), y:gy+22, 'text-anchor':'end'}, svg, kb(sim.G));
    // reads around each copy: longest reads touching or bridging it
    var ry0 = 72;
    el('text', {x:8, y:ry0+20, 'class':'lab'}, svg, 'reads');
    el('text', {x:8, y:ry0+34}, svg, '(longest)');
    // pick the longest reads at each copy, then pack them into lanes without overlaps
    var picked = [];
    sim.copies.forEach(function(cp){
      cp.bridge.concat(cp.touch).sort(function(a,b){ return (b[1]-b[0])-(a[1]-a[0]); }).slice(0, lanes)
        .forEach(function(r){ if (picked.indexOf(r) < 0) picked.push(r); });
    });
    picked.sort(function(a,b){ return a[0]-b[0]; });
    var laneEnd = [];
    picked.forEach(function(r){
      var k = 0, gap = sim.G*0.006;
      while (k < laneEnd.length && laneEnd[k] > r[0]-gap) k++;
      if (k >= lanes) return;
      laneEnd[k] = r[1];
      var br = sim.copies.some(function(cp){ return r[0] <= cp.s-ANCHOR && r[1] >= cp.e+ANCHOR; });
      el('rect', {x:sx(r[0]), y:ry0 + k*(laneH+4), width:Math.max(1.5, sx(r[1])-sx(r[0])), height:laneH-2, rx:2,
        fill: br ? 'var(--good)' : 'var(--err)'}, svg);
    });
    sim.copies.forEach(function(cp){
      // dashed copy borders
      el('line', {x1:sx(cp.s), x2:sx(cp.s), y1:gy+8, y2:ry0+lanes*(laneH+4), stroke:'var(--rep)', 'stroke-dasharray':'2 3', 'stroke-width':1}, svg);
      el('line', {x1:sx(cp.e), x2:sx(cp.e), y1:gy+8, y2:ry0+lanes*(laneH+4), stroke:'var(--rep)', 'stroke-dasharray':'2 3', 'stroke-width':1}, svg);
      var ok = cp.bridge.length > 0;
      el('text', {x:(sx(cp.s)+sx(cp.e))/2, y:ry0+lanes*(laneH+4)+14, 'text-anchor':'middle', fill: ok ? 'var(--good)' : 'var(--bad)'}, svg,
        ok ? ('✓ ' + cp.bridge.length + ' bridge' + (cp.bridge.length===1?'':'s')) : '✗ break');
    });
    // contigs
    var cy = 200;
    el('text', {x:8, y:cy+4, 'class':'lab'}, svg, 'contigs');
    var contigs = [], start = 0, anyBreak = false;
    sim.copies.forEach(function(cp){
      if (!cp.bridge.length){ contigs.push([start, cp.s]); start = cp.e; anyBreak = true; }
    });
    contigs.push([start, sim.G]);
    contigs.forEach(function(c, i){
      el('rect', {x:sx(c[0])+1, y:cy-5, width:Math.max(2, sx(c[1])-sx(c[0])-2), height:10, rx:2, fill:'var(--accent)'}, svg);
      el('text', {x:(sx(c[0])+sx(c[1]))/2, y:cy+20, 'text-anchor':'middle'}, svg, kb(c[1]-c[0]));
    });
    if (anyBreak){
      var rx = sx(sim.G) - Math.max(18, sx(R)-sx(0));
      el('rect', {x:rx, y:cy+34, width:Math.max(3, sx(R)-sx(0)), height:10, rx:2, fill:'var(--rep)'}, svg);
      el('text', {x:rx-8, y:cy+43, 'text-anchor':'end'}, svg, 'unbridged copies collapse into one extra repeat contig');
    } else {
      el('text', {x:sx(sim.G), y:cy+43, 'text-anchor':'end', fill:'var(--good)'}, svg, 'all copies bridged: one contig for the whole toy genome');
    }
    el('text', {x:8, y:H-10}, svg, 'Read lengths: log-normal with the chosen median; simulated read N50 = ' + kb(sim.n50) + ' (' + fmtInt(sim.n) + ' reads)');
    var nBridged = sim.copies.filter(function(c){return c.bridge.length;}).length;
    var longest = Math.max.apply(null, contigs.map(function(c){return c[1]-c[0];}));
    $('s04-rp-out').innerHTML =
      '<div>Copies bridged<b>' + nBridged + ' of ' + NCOPY + '</b></div>' +
      '<div>Contigs (plus collapsed repeat)<b>' + contigs.length + (anyBreak ? ' + 1' : '') + '</b></div>' +
      '<div>Longest contig<b>' + kb(longest) + '</b></div>' +
      '<div>Share of read bases in reads ≥ repeat + 2 kb<b>' + (100*sim.fracLong).toFixed(1) + ' %</b></div>';
  }
  function bindPreset(id){
    var b = $(id); if (!b) return;
    b.addEventListener('click', function(){
      var p = presets[id]; rl.value = p[0]; rr.value = p[1]; rc.value = p[2];
      setPressed(presetIds, id); drawRepeat();
    });
  }
  if (rl && rr && rc && $('s04-rp-fig')){
    presetIds.forEach(bindPreset);
    [rl, rr, rc].forEach(function(inp){ inp.addEventListener('input', function(){ setPressed(presetIds, null); drawRepeat(); }); });
    drawRepeat();
  }

  /* ================= 2. haplotype separation ================= */
  var he = $('s04-he'), hh = $('s04-hh'), ho = $('s04-ho');
  var qp = {'s04-q30':0.1, 's04-q20':1, 's04-q17':2, 's04-q10':10};
  var qIds = Object.keys(qp);
  function normPdf(x, m, s){ return Math.exp(-0.5*((x-m)/s)*((x-m)/s)) / (s*Math.sqrt(2*Math.PI)); }
  function normCdf(z){ // Abramowitz-Stegun 7.1.26
    var t = 1/(1+0.3275911*Math.abs(z)/Math.SQRT2);
    var y = 1 - (((((1.061405429*t - 1.453152027)*t) + 1.421413741)*t - 0.284496736)*t + 0.254829592)*t*Math.exp(-z*z/2);
    return z >= 0 ? (1+y)/2 : (1-y)/2;
  }
  function drawHap(){
    var e = +he.value/100, h = +hh.value/100, O = +ho.value*1000;
    $('s04-heo').textContent = (+he.value).toFixed(2).replace(/0$/,'') + ' %';
    $('s04-hho').textContent = (+hh.value).toFixed(2) + ' %';
    $('s04-hoo').textContent = (+ho.value) + ' kb';
    // differences between two reads: each read errs independently (~2e per position);
    // reads from different haplotypes add h per position
    var pSame = 2*e*(1-e), pDiff = pSame + h*(1-2*e);
    var m1 = O*pSame, s1 = Math.sqrt(Math.max(O*pSame*(1-pSame), 0.25));
    var m2 = O*pDiff, s2 = Math.sqrt(Math.max(O*pDiff*(1-pDiff), 0.25));
    var lo = Math.max(0, Math.min(m1-4*s1, m2-4*s2)), hi = Math.max(m1+4*s1, m2+4*s2, lo+5);
    var W = 900, H = 230, pl = 50, pr = 20, pt = 18, pb = 44;
    var svg = svgRoot($('s04-hp-fig'), W, H, 520);
    var sx = function(v){ return pl + (W-pl-pr)*(v-lo)/(hi-lo); };
    var N = 220, ymax = 0, pts1 = [], pts2 = [];
    for (var i=0;i<=N;i++){
      var x = lo + (hi-lo)*i/N, a = normPdf(x,m1,s1), b = normPdf(x,m2,s2);
      pts1.push([x,a]); pts2.push([x,b]); ymax = Math.max(ymax, a, b);
    }
    var sy = function(v){ return H-pb - (H-pb-pt)*v/ymax; };
    function area(pts, col){
      var d = 'M' + sx(pts[0][0]) + ',' + sy(0);
      pts.forEach(function(p){ d += 'L' + sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1); });
      d += 'L' + sx(pts[pts.length-1][0]) + ',' + sy(0) + 'Z';
      el('path', {d:d, fill:col, 'fill-opacity':.28, stroke:col, 'stroke-width':1.6}, svg);
    }
    el('line', {x1:pl, x2:W-pr, y1:H-pb, y2:H-pb, 'class':'ax'}, svg);
    area(pts1, 'var(--accent)'); area(pts2, 'var(--het)');
    // ticks
    var span = hi-lo, step = Math.pow(10, Math.floor(Math.log10(span/5)));
    if (span/step > 12) step *= 2; if (span/step > 12) step *= 2.5;
    for (var t = Math.ceil(lo/step)*step; t <= hi; t += step){
      el('line', {x1:sx(t), x2:sx(t), y1:H-pb, y2:H-pb+4, 'class':'ax'}, svg);
      el('text', {x:sx(t), y:H-pb+16, 'text-anchor':'middle'}, svg, fmtInt(t));
    }
    el('text', {x:(pl+W-pr)/2, y:H-8, 'text-anchor':'middle', 'class':'lab'}, svg, 'differences between the two reads in a ' + (+ho.value) + '-kb overlap');
    el('text', {x:sx(m1), y:sy(normPdf(m1,m1,s1))-5, 'text-anchor':'middle', fill:'var(--accent)'}, svg, 'same copy ≈ ' + fmtInt(m1));
    el('text', {x:sx(m2), y:sy(normPdf(m2,m2,s2))-5, 'text-anchor':'middle', fill:'var(--het)'}, svg, 'different ≈ ' + fmtInt(m2));
    // misclassification with the best single cut-off (normal approximation)
    var best = 1, cut = m1;
    for (var k=0;k<=200;k++){
      var c = m1 + (m2-m1)*k/200;
      var err = 0.5*(1-normCdf((c-m1)/s1)) + 0.5*normCdf((c-m2)/s2);
      if (err < best){ best = err; cut = c; }
    }
    el('line', {x1:sx(cut), x2:sx(cut), y1:pt, y2:H-pb, stroke:'var(--fg)', 'stroke-dasharray':'3 3', 'stroke-width':1}, svg);
    var verdict = best < 0.01 ? 'clearly separable' : best < 0.1 ? 'mostly separable' : best < 0.3 ? 'often confused' : 'cannot be told apart';
    var col = best < 0.01 ? 'var(--good)' : best < 0.1 ? 'var(--accent)' : 'var(--bad)';
    var kfree = Math.pow(1-e, 30);
    $('s04-hp-out').innerHTML =
      '<div>Real (heterozygous) differences in the overlap<b>' + fmtInt(h*O) + '</b></div>' +
      '<div>Error differences expected (two reads)<b>' + fmtInt(m1) + '</b></div>' +
      '<div>Read pairs misjudged at the best cut-off<b style="color:' + col + '">' + (100*best).toFixed(best < 0.01 ? 2 : 1) + ' % · ' + verdict + '</b></div>' +
      '<div>30-mers in a read without any error<b>' + (100*kfree).toFixed(0) + ' %</b></div>';
  }
  if (he && hh && ho && $('s04-hp-fig')){
    qIds.forEach(function(id){
      var b = $(id); if (!b) return;
      b.addEventListener('click', function(){ he.value = qp[id]; setPressed(qIds, id); drawHap(); });
    });
    he.addEventListener('input', function(){ setPressed(qIds, null); drawHap(); });
    hh.addEventListener('input', drawHap); ho.addEventListener('input', drawHap);
    drawHap();
  }
})();
