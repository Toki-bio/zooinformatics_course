(function(){
  var fig = document.getElementById('s04-fig');
  if (!fig) return;
  var NS = 'http://www.w3.org/2000/svg';
  var el = function(id){ return document.getElementById(id); };
  var MU0 = 5.4e-9, G0 = 1, THETA0 = 0.08, BIN = 100;    // reference scaling and a round toy theta0 per 100-bp bin
  // Invented toy step history in the reference scaling: [start of interval in years ago, Ne]. Round values, not a real run.
  var STEPS = [[8e3,15e3],[12e3,25e3],[18e3,50e3],[25e3,70e3],[40e3,60e3],[55e3,40e3],[80e3,55e3],
               [130e3,75e3],[250e3,100e3],[6e5,95e3],[1.5e6,105e3]];
  var TEND = 3e6;
  var DIP = [65e3, 40e3];                                  // marked point (inside the trough interval)
  var N0REF = THETA0 / (4 * MU0 * BIN);                    // reference N0 of the toy run
  var MU_LO = Math.log10(1e-10), MU_HI = Math.log10(1e-7);
  var G_LO = Math.log10(0.5), G_HI = Math.log10(30);
  var unit = 'gen';

  // plot geometry
  var W = 720, H = 400, L = 66, R = 14, T = 14, B = 46;
  var XL = 3, XH = 8, YL = 3, YH = 6;                      // log10 ranges: years 1e3..1e8, Ne 1e3..1e6
  function sx(v){ return L + (Math.log10(v) - XL) / (XH - XL) * (W - L - R); }
  function sy(v){ return T + (YH - Math.log10(v)) / (YH - YL) * (H - T - B); }

  function mk(tag, attrs, parent){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function sup(n){ var m = {'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
    return String(n).split('').map(function(c){ return m[c] || c; }).join(''); }
  function sci(v, d){ var e = Math.floor(Math.log10(v)); var m = v / Math.pow(10, e);
    if (+m.toFixed(d) >= 10){ m /= 10; e += 1; } return m.toFixed(d) + ' × 10' + sup(e); }
  function yrs(v){ if (v >= 1e6) return (v / 1e6).toPrecision(3) + ' million years';
    if (v >= 1e3) return Math.round(v / 1e3).toLocaleString('en-US') + ' thousand years'; return Math.round(v) + ' years'; }
  function num(v){ return Math.round(v).toLocaleString('en-US'); }

  // factors relative to the reference scaling; mu is per generation in 'gen' mode, per year in 'yr' mode
  function factors(mu, g, mode){
    if (mode === 'yr') return { t: (MU0 / G0) / mu, n: (MU0 / G0) / (mu * g), muGen: mu * g, muYr: mu };
    return { t: (MU0 / mu) * (g / G0), n: MU0 / mu, muGen: mu, muYr: mu / g };
  }
  function pathFor(f){
    var d = '', i, x0, x1, y;
    for (i = 0; i < STEPS.length; i++){
      x0 = STEPS[i][0] * f.t; x1 = (i + 1 < STEPS.length ? STEPS[i + 1][0] : TEND) * f.t; y = STEPS[i][1] * f.n;
      d += (i ? 'L' : 'M') + sx(x0).toFixed(1) + ',' + sy(y).toFixed(1) + 'L' + sx(x1).toFixed(1) + ',' + sy(y).toFixed(1);
    }
    return d;
  }

  var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img',
    'aria-label': 'Population size against years ago on log axes: reference curve and rescaled curve' });
  svg.style.minWidth = '520px';
  fig.appendChild(svg);
  var defs = mk('defs', {}, svg);
  var cp = mk('clipPath', { id: 's04-clip' }, defs);
  mk('rect', { x: L, y: T, width: W - L - R, height: H - T - B }, cp);

  // grid and ticks
  var xt = [[1e3,'1 ky'],[1e4,'10 ky'],[1e5,'100 ky'],[1e6,'1 My'],[1e7,'10 My'],[1e8,'100 My']];
  var yt = [[1e3,'1k'],[1e4,'10k'],[1e5,'100k'],[1e6,'1M']];
  xt.forEach(function(t){ mk('line', { x1: sx(t[0]), x2: sx(t[0]), y1: T, y2: H - B, 'class': 'grid' }, svg);
    var tx = mk('text', { x: sx(t[0]), y: H - B + 16, 'text-anchor': t[0] === 1e8 ? 'end' : 'middle' }, svg); tx.textContent = t[1]; });
  yt.forEach(function(t){ mk('line', { x1: L, x2: W - R, y1: sy(t[0]), y2: sy(t[0]), 'class': 'grid' }, svg);
    var tx = mk('text', { x: L - 6, y: sy(t[0]) + 4, 'text-anchor': 'end' }, svg); tx.textContent = t[1]; });
  mk('rect', { x: L, y: T, width: W - L - R, height: H - T - B, 'class': 'ax' }, svg);
  var xl = mk('text', { x: (L + W - R) / 2, y: H - 8, 'text-anchor': 'middle', 'class': 'lab' }, svg); xl.textContent = 'years ago (log scale)';
  var yl = mk('text', { x: 14, y: (T + H - B) / 2, 'text-anchor': 'middle', 'class': 'lab',
    transform: 'rotate(-90 14 ' + ((T + H - B) / 2) + ')' }, svg); yl.textContent = 'effective population size (log)';

  var plot = mk('g', { 'clip-path': 'url(#s04-clip)' }, svg);
  var envG = mk('g', {}, plot);
  var guide = mk('line', { stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-dasharray': '1 3' }, plot);
  var refP = mk('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-dasharray': '5 4' }, plot);
  var curP = mk('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.5 }, plot);
  var arrow = mk('line', { stroke: 'var(--accent)', 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }, plot);
  var refDot = mk('circle', { r: 5, fill: 'var(--panel)', stroke: 'var(--muted)', 'stroke-width': 2 }, plot);
  var curDot = mk('circle', { r: 5, fill: 'var(--accent)', stroke: 'var(--panel)', 'stroke-width': 1.5 }, plot);
  var offNote = mk('text', { x: W - R - 8, y: T + 16, 'text-anchor': 'end', 'class': 'lab' }, svg);

  // static parts of the reference
  var f0 = factors(MU0, G0, 'gen');
  refP.setAttribute('d', pathFor(f0));
  refDot.setAttribute('cx', sx(DIP[0])); refDot.setAttribute('cy', sy(DIP[1]));
  // guide: all (DIP[0]*k, DIP[1]*k)
  guide.setAttribute('x1', sx(DIP[0] * 1e-3)); guide.setAttribute('y1', sy(DIP[1] * 1e-3));
  guide.setAttribute('x2', sx(DIP[0] * 1e3)); guide.setAttribute('y2', sy(DIP[1] * 1e3));

  el('s04-legend').innerHTML =
    '<span><i style="background:var(--muted)"></i>reference: μ 5.4 × 10⁻⁹ per generation, g 1 yr</span>' +
    '<span><i style="background:var(--accent);height:4px"></i>your scaling</span>' +
    '<span><i style="background:var(--het)"></i>μ/g grid (when shown)</span>' +
    '<span><i style="background:var(--muted);height:1px"></i>path of the dot when only μ changes</span>';

  var muIn = el('s04-mu'), gIn = el('s04-g');
  function sliderToMu(){ return Math.pow(10, MU_LO + (MU_HI - MU_LO) * (+muIn.value) / 1000); }
  function sliderToG(){ return Math.pow(10, G_LO + (G_HI - G_LO) * (+gIn.value) / 1000); }
  function setMu(v){ muIn.value = Math.round((Math.log10(v) - MU_LO) / (MU_HI - MU_LO) * 1000); }
  function setG(v){ gIn.value = Math.round((Math.log10(v) - G_LO) / (G_HI - G_LO) * 1000); }
  var exact = { mu: MU0, g: G0 };                         // exact values from presets (slider positions are rounded)

  function draw(){
    var mu = exact.mu, g = exact.g;
    var f = factors(mu, g, unit);
    curP.setAttribute('d', pathFor(f));
    var cx = DIP[0] * f.t, cy = DIP[1] * f.n;
    curDot.setAttribute('cx', sx(cx)); curDot.setAttribute('cy', sy(cy));
    arrow.setAttribute('x1', sx(DIP[0])); arrow.setAttribute('y1', sy(DIP[1]));
    arrow.setAttribute('x2', sx(cx)); arrow.setAttribute('y2', sy(cy));
    var off = cx < 1e3 || cx > 1e8 || cy < 1e3 || cy > 1e6;
    offNote.textContent = off ? 'marked trough is off the chart' : '';

    while (envG.firstChild) envG.removeChild(envG.firstChild);
    if (el('s04-env').checked){
      [[4.6e-9,1],[4.6e-9,2],[7.9e-9,1],[7.9e-9,2]].forEach(function(c){
        mk('path', { d: pathFor(factors(c[0], c[1], 'gen')), fill: 'none', stroke: 'var(--het)', 'stroke-width': 1.3, opacity: 0.75 }, envG);
      });
    }

    el('s04-mu-o').textContent = sci(mu, 2);
    el('s04-g-o').textContent = g < 10 ? g.toFixed(1) : g.toFixed(0);
    el('s04-mu-unit').textContent = unit === 'yr' ? 'per site per year' : 'per site per generation';
    var N0 = THETA0 / (4 * f.muGen * BIN);
    var plateau = 100e3, trough = 40e3;
    el('s04-out').innerHTML =
      '<div><span class="tip" title="Rate per generation = rate per year × generation time. PSMC formulas need the per-generation rate.">μ per generation</span> / per year<b>' + sci(f.muGen, 2) + ' / ' + sci(f.muYr, 2) + '</b></div>' +
      '<div><span class="tip" title="Reference effective size N0 = θ0 / (4 μ s), with θ0 = 0.08 per 100-base bin, a round toy value.">N<sub>0</sub> = θ<sub>0</sub>/(4μs)</span><b>' + num(N0) + '</b></div>' +
      '<div>All times multiplied by<b>' + f.t.toFixed(2) + '×</b></div>' +
      '<div>All population sizes multiplied by<b>' + f.n.toFixed(2) + '×</b></div>' +
      '<div>Trough now at<b>' + yrs(cx) + ', N<sub>e</sub> ' + num(cy) + '</b></div>' +
      '<div><span class="tip" title="Model units: t in units of 2N0 generations and λ = size relative to N0. They come from the genome alone and do not change with μ or g.">In model units</span> (never changes)<b>t ≈ ' + (DIP[0] / (2 * N0REF)).toFixed(2) + ', λ ≈ ' + (DIP[1] / N0REF).toFixed(2) + '</b></div>' +
      '<div>Old plateau ÷ trough (shape)<b>' + (plateau * f.n / (trough * f.n)).toFixed(2) + ', unchanged</b></div>';
  }

  muIn.addEventListener('input', function(){ exact.mu = sliderToMu(); clearPre(); draw(); });
  gIn.addEventListener('input', function(){ exact.g = sliderToG(); clearPre(); draw(); });
  el('s04-env').addEventListener('change', draw);

  var pre = el('s04-pre');
  function clearPre(){ Array.prototype.forEach.call(pre.querySelectorAll('button'), function(x){ x.setAttribute('aria-pressed', 'false'); }); }
  pre.addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    Array.prototype.forEach.call(pre.querySelectorAll('button'), function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    setUnit('gen');
    exact.mu = +b.getAttribute('data-mu'); exact.g = +b.getAttribute('data-g');
    setMu(exact.mu); setG(exact.g); draw();
  });

  var unitSeg = el('s04-unit');
  function setUnit(u){
    unit = u;
    Array.prototype.forEach.call(unitSeg.querySelectorAll('button'), function(x){ x.setAttribute('aria-pressed', x.getAttribute('data-v') === u ? 'true' : 'false'); });
  }
  unitSeg.addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    var u = b.getAttribute('data-v'); if (u === unit) return;
    // keep the same biology: convert the number so the curve does not jump
    exact.mu = u === 'yr' ? exact.mu / exact.g : exact.mu * exact.g;
    exact.mu = Math.min(1e-7, Math.max(1e-10, exact.mu));
    setUnit(u); clearPre(); setMu(exact.mu); draw();
  });

  setMu(MU0); setG(G0); draw();
})();
