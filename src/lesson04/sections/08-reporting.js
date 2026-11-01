(function(){
  var NS = 'http://www.w3.org/2000/svg';
  function el(id){ return document.getElementById(id); }
  function mk(tag, attrs, txt){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  function esc(s){ return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ---------------- 1. figure: bad vs reportable ---------------- */
  var fig = el('s08-fig');
  if (fig){
    var MU0 = 5.4e-9;
    // toy history: knots (generations ago, Ne at MU0); log-log interpolation
    var KN = [[1e3, 60e3], [5e3, 30e3], [1.2e4, 12e3], [2.5e4, 18e3], [4e4, 120e3], [6e4, 70e3], [1.5e5, 160e3], [5e5, 190e3], [3e6, 170e3]];
    function fN(t){
      if (t <= KN[0][0]) return KN[0][1];
      for (var i = 1; i < KN.length; i++) if (t <= KN[i][0]){
        var a = KN[i - 1], b = KN[i], w = (Math.log(t) - Math.log(a[0])) / (Math.log(b[0]) - Math.log(a[0]));
        return Math.exp(Math.log(a[1]) + w * (Math.log(b[1]) - Math.log(a[1])));
      }
      return KN[KN.length - 1][1];
    }
    var NI = 26, T0 = 600, T1 = 4e6, edges = [];
    for (var i = 0; i <= NI; i++) edges.push(T0 * Math.pow(T1 / T0, i / NI));
    // scaled units: d = 2*mu*T (per bp), theta = 4*mu*N (per bp)
    var dEdge = edges.map(function(t){ return 2 * MU0 * t; });
    var main = [];
    for (i = 0; i < NI; i++) main.push(4 * MU0 * fN(Math.sqrt(edges[i] * edges[i + 1])));
    function rng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    var r = rng(8008), boots = [];
    function gauss(){ var u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    for (var b = 0; b < 10; b++){
      var arr = [], shared = gauss();
      for (i = 0; i < NI; i++){
        var sd = 0.05 + 1.0 * Math.exp(-i / 2.6);
        arr.push(main[i] * Math.exp(sd * (0.6 * gauss() + 0.4 * shared)));
      }
      boots.push(arr);
    }
    // first interval (from the oldest side) where bootstraps spread more than 2-fold
    var unres = -1;
    for (i = 0; i < NI; i++){
      var mn = Infinity, mx = 0;
      boots.forEach(function(a){ mn = Math.min(mn, a[i]); mx = Math.max(mx, a[i]); });
      if (mx / mn > 2) unres = i;
    }

    var F = { log: el('s08-f-log'), boot: el('s08-f-boot'), mu: el('s08-f-mu'), shade: el('s08-f-shade'), lab: el('s08-f-lab'), sc: el('s08-f-scaled'), g: el('s08-f-g') };
    var W = 960, H = 380, L = 84, R = 24, T = 44, B = 56, PW = W - L - R, PH = H - T - B;

    function fmtN(v){
      if (v >= 1e6) return +(v / 1e6).toPrecision(2) + 'M';
      if (v >= 1e3) return +(v / 1e3).toPrecision(3) + 'k';
      return +v.toPrecision(2) + '';
    }
    function fmtE(v){ var e = Math.floor(Math.log10(v) + 1e-9), m = v / Math.pow(10, e); return (Math.abs(m - 1) < 1e-6 ? '' : (+m.toPrecision(2)) + '×') + '1e' + e; }

    function drawFig(){
      var g = +F.g.value, sc = F.sc.checked, lg = F.log.checked, lab = F.lab.checked;
      el('s08-f-gv').textContent = g + ' yr';
      // conversion from scaled units to plotted units for a given mu
      function X(d, mu){ return sc ? d : d / (2 * mu) * g; }
      function Y(th, mu){ return sc ? th : th / (4 * mu); }
      var mus = [MU0];
      var showMu = F.mu.checked && !sc;
      if (showMu) mus = [MU0, MU0 * 0.7, MU0 * 1.4];
      // ranges
      var xs = [], ys = [];
      mus.forEach(function(mu){ xs.push(X(dEdge[0], mu), X(dEdge[NI], mu)); main.forEach(function(v){ ys.push(Y(v, mu)); }); });
      if (F.boot.checked) boots.forEach(function(a){ a.forEach(function(v){ ys.push(Y(v, MU0)); }); });
      var xmin = Math.min.apply(null, xs), xmax = Math.max.apply(null, xs);
      var ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
      if (!lg){ xmin = 0; ymin = 0; ymax = Math.min(ymax, 3 * Math.max.apply(null, main.map(function(v){ return Y(v, MU0); }))); }
      else { xmin = Math.pow(10, Math.floor(Math.log10(xmin))); xmax = Math.pow(10, Math.ceil(Math.log10(xmax))); ymin = Math.pow(10, Math.floor(Math.log10(ymin))); ymax = Math.pow(10, Math.ceil(Math.log10(ymax))); }
      function px(x){ return lg ? L + (Math.log10(x) - Math.log10(xmin)) / (Math.log10(xmax) - Math.log10(xmin)) * PW : L + (x - xmin) / (xmax - xmin) * PW; }
      function py(y){ y = Math.min(Math.max(y, lg ? ymin : 0), ymax); return lg ? T + PH - (Math.log10(y) - Math.log10(ymin)) / (Math.log10(ymax) - Math.log10(ymin)) * PH : T + PH - (y - ymin) / (ymax - ymin) * PH; }

      var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Toy PSMC curve drawn with the chosen figure elements' });
      svg.style.minWidth = '620px';
      var clipId = 's08-clip';
      var defs = mk('defs', {}); var cp = mk('clipPath', { id: clipId }); cp.appendChild(mk('rect', { x: L, y: T, width: PW, height: PH })); defs.appendChild(cp); svg.appendChild(defs);

      // shading of the unresolved recent part
      if (F.shade.checked && unres >= 0){
        var xe = X(dEdge[unres + 1], MU0);
        svg.appendChild(mk('rect', { x: L, y: T, width: Math.max(0, px(xe) - L), height: PH, fill: 'var(--line)', opacity: '0.55' }));
        svg.appendChild(mk('text', { x: L + 6, y: T + 14, 'class': 'lab' }, 'not resolved'));
        svg.appendChild(mk('text', { x: L + 6, y: T + 28 }, 'bootstraps > 2-fold apart'));
      }
      // ticks and grid
      var gx = mk('g', {}), ticksX = [], ticksY = [];
      if (lg){
        for (var e = Math.round(Math.log10(xmin)); e <= Math.round(Math.log10(xmax)); e++) ticksX.push(Math.pow(10, e));
        for (e = Math.round(Math.log10(ymin)); e <= Math.round(Math.log10(ymax)); e++) ticksY.push(Math.pow(10, e));
      } else {
        var sx = Math.pow(10, Math.floor(Math.log10(xmax / 4))); if (xmax / sx > 8) sx *= 2; if (xmax / sx > 8) sx *= 2.5;
        for (var v = 0; v <= xmax + 1e-12; v += sx) ticksX.push(v);
        var sy = Math.pow(10, Math.floor(Math.log10(ymax / 4))); if (ymax / sy > 8) sy *= 2; if (ymax / sy > 8) sy *= 2.5;
        for (v = 0; v <= ymax + 1e-12; v += sy) ticksY.push(v);
      }
      ticksX.forEach(function(t){
        var x = px(t);
        gx.appendChild(mk('line', { x1: x, x2: x, y1: T, y2: T + PH, 'class': 'grid' }));
        gx.appendChild(mk('text', { x: x, y: T + PH + 16, 'text-anchor': 'middle' }, sc ? fmtE(t) : fmtN(t)));
      });
      ticksY.forEach(function(t){
        var y = py(t);
        gx.appendChild(mk('line', { x1: L, x2: L + PW, y1: y, y2: y, 'class': 'grid' }));
        gx.appendChild(mk('text', { x: L - 8, y: y + 4, 'text-anchor': 'end' }, sc ? fmtE(t) : fmtN(t)));
      });
      svg.appendChild(gx);
      svg.appendChild(mk('rect', { x: L, y: T, width: PW, height: PH, 'class': 'ax' }));

      function step(arr, mu){
        var d = '';
        for (var k = 0; k < NI; k++){
          var x0 = px(Math.max(X(dEdge[k], mu), lg ? xmin : 0)), x1 = px(X(dEdge[k + 1], mu)), y = py(Y(arr[k], mu));
          d += (k ? 'L' : 'M') + x0.toFixed(1) + ' ' + y.toFixed(1) + 'L' + x1.toFixed(1) + ' ' + y.toFixed(1);
        }
        return d;
      }
      var gp = mk('g', { 'clip-path': 'url(#' + clipId + ')' });
      if (F.boot.checked) boots.forEach(function(a){ gp.appendChild(mk('path', { d: step(a, MU0), fill: 'none', stroke: 'var(--err)', 'stroke-width': 1 })); });
      if (showMu){
        gp.appendChild(mk('path', { d: step(main, MU0 * 0.7), fill: 'none', stroke: 'var(--het)', 'stroke-width': 1.6, 'stroke-dasharray': '6 4' }));
        gp.appendChild(mk('path', { d: step(main, MU0 * 1.4), fill: 'none', stroke: 'var(--rep)', 'stroke-width': 1.6, 'stroke-dasharray': '2 3' }));
      }
      gp.appendChild(mk('path', { d: step(main, MU0), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }));
      svg.appendChild(gp);

      // labels
      if (lab){
        var ttl = sc ? 'Toy PSMC curve in scaled units (no μ or g needed)' : 'Toy PSMC curve · μ = 5.4×10⁻⁹ per site per generation, g = ' + g + ' yr';
        svg.appendChild(mk('text', { x: L, y: 22, 'class': 'lab' }, ttl));
        svg.appendChild(mk('text', { x: L + PW / 2, y: H - 12, 'text-anchor': 'middle', 'class': 'lab' }, sc ? 'pairwise divergence d = 2μT per bp (time)' : 'years ago' + (lg ? ' (log scale)' : '')));
        var yl = mk('text', { x: 16, y: T + PH / 2, 'text-anchor': 'middle', 'class': 'lab', transform: 'rotate(-90 16 ' + (T + PH / 2) + ')' }, sc ? 'θ = 4·Ne·μ per bp' : 'effective population size Ne' + (lg ? ' (log)' : ''));
        svg.appendChild(yl);
      } else {
        svg.appendChild(mk('text', { x: L + PW / 2, y: H - 12, 'text-anchor': 'middle', 'class': 'lab' }, 'time'));
        svg.appendChild(mk('text', { x: 16, y: T + PH / 2, 'text-anchor': 'middle', 'class': 'lab', transform: 'rotate(-90 16 ' + (T + PH / 2) + ')' }, 'Ne'));
      }
      fig.innerHTML = '';
      fig.appendChild(svg);

      // legend above the plot
      var leg = el('s08-fleg'), h = '';
      if (lab){
        h += '<span><i class="s08-sw" style="background:var(--accent);height:3px"></i>main run</span>';
        if (F.boot.checked) h += '<span><i class="s08-sw" style="background:var(--err)"></i>10 bootstraps</span>';
        if (showMu) h += '<span><i class="s08-sw" style="background:var(--het)"></i>μ × 0.7 (3.8×10⁻⁹)</span><span><i class="s08-sw" style="background:var(--rep)"></i>μ × 1.4 (7.6×10⁻⁹)</span>';
        if (F.shade.checked && unres >= 0) h += '<span><i class="s08-box" style="background:var(--line);opacity:1"></i>not interpreted</span>';
      }
      leg.innerHTML = h;
      leg.style.display = h ? '' : 'none';

      // readout
      var miss = [];
      if (!lg) miss.push('linear time axis: all windows younger than about a tenth of the oldest are squeezed into the left edge');
      if (!lab) miss.push('no units, μ or g: the reader cannot tell what "time" means or rescale it');
      if (!F.boot.checked) miss.push('no bootstraps: nothing shows that the recent windows are noisy');
      if (!F.shade.checked) miss.push('nothing marks the recent part as unresolved');
      if (!showMu && !sc) miss.push('one μ only: the reader cannot see how far the curve moves if μ is wrong');
      var note = sc ? ' In scaled units μ and g do not enter, so the μ curves would lie exactly on the main one; a reader converts with their own μ.' : '';
      if (sc && !F.mu.checked) note = ' In scaled units μ and g do not enter; a reader converts with their own μ.';
      el('s08-fread').textContent = (miss.length ? 'What this figure hides: ' + miss.join('; ') + '.' : 'Everything a reader needs to judge and rescale the curve is in the image.') + note +
        (showMu ? ' Note how the μ curves are the same shape moved along a diagonal: a 1.4× higher μ makes every time and every size 1.4× smaller.' : '');
      // presets highlighting
      var isGood = lg && lab && F.boot.checked && F.shade.checked && (F.mu.checked || sc);
      var isBad = !lg && !lab && !F.boot.checked && !F.shade.checked && !F.mu.checked && !sc;
      Array.prototype.forEach.call(el('s08-fpre').querySelectorAll('button'), function(bt){
        bt.setAttribute('aria-pressed', (bt.dataset.p === 'good' && isGood) || (bt.dataset.p === 'bad' && isBad) ? 'true' : 'false');
      });
    }
    ['log', 'boot', 'mu', 'shade', 'lab', 'sc'].forEach(function(k){ F[k].addEventListener('change', drawFig); });
    F.g.addEventListener('input', drawFig);
    el('s08-fpre').addEventListener('click', function(ev){
      var bt = ev.target.closest('button'); if (!bt) return;
      var good = bt.dataset.p === 'good';
      F.log.checked = good; F.boot.checked = good; F.mu.checked = good; F.shade.checked = good; F.lab.checked = good; F.sc.checked = false;
      drawFig();
    });
    drawFig();
  }

  /* ---------------- 2. methods paragraph builder ---------------- */
  var par = el('s08-par');
  if (!par) return;
  var TXT = ['sp', 'id', 'sex', 'tech', 'chem', 'dep', 'ref', 'map', 'cal', 'cver', 'cmod', 'filt', 'mq', 'dmin', 'dmax', 'cmb', 'amb', 'sx',
    'bin', 'pv', 'N', 't', 'r', 'p', 'b', 'seg', 'it', 'mu', 'mus', 'g', 'gs', 'rng'];
  var CHK = ['q-xc', 'q-tt', 'pa', 'pb', 'grid', 'sc', 's-cs', 's-rh', 's-roh', 's-rnd', 's-m2', 'd-reads', 'd-fa', 'd-bed', 'd-vcf', 'd-out', 'd-cmd'];
  var PRE = {
    spA: { sp: 'species A', id: 'A1', sex: 'male', tech: 'Oxford Nanopore', chem: 'R10.4.1, inferred, not confirmed by the provider', dep: '30', ref: 'own', map: '',
      cal: 'Clair3', cver: '', cmod: 'r1041_e82_400bps_sup_v500', filt: 'af', mq: '10', dmin: '15', dmax: '60', cmb: '2400', amb: '2500', sx: 'ex',
      bin: '100', pv: '0.6.5-r67', N: '25', t: '15', r: '5', p: '4+25*2+4+6', b: '20', seg: '', it: '',
      mu: '5.4e-9', mus: 'placeholder, not verified for this species', g: '1', gs: 'placeholder', rng: 'the old part only; the most recent intervals are not interpretable',
      'q-xc': 1, 'q-tt': 1, pa: 1, pb: 1, grid: 0, sc: 0, 's-cs': 1, 's-rh': 1, 's-roh': 1, 's-rnd': 0, 's-m2': 1 },
    thin: { sp: 'Microtus sp.', tech: 'Illumina paired-end', dep: '12', ref: 'rel', cal: 'bcftools', filt: 'pass', p: '', N: '', mu: '2.5e-8', g: '25', b: '0', rng: '' },
    clear: {}
  };
  function v(k){ var e = el('s08-' + k); return e ? e.value.trim() : ''; }
  function c(k){ var e = el('s08-' + k); return !!(e && e.checked); }
  function M(what){ return '<span class="s08-miss">[' + esc(what) + ']</span>'; }
  function f(k, what, wrap){ var x = v(k); return x ? (wrap ? wrap(esc(x)) : esc(x)) : M(what); }
  function ital(x){ var m = /^([A-Z][a-z]+)( (sp|spp)\.)$/.exec(x); if (m) return '<i>' + m[1] + '</i>' + m[2]; return /^[A-Z][a-z]+ [a-z]+$/.test(x) ? '<i>' + x + '</i>' : x; }
  function code(x){ return '<code>' + x + '</code>'; }

  function build(){
    var flags = [];
    function bad(t){ flags.push(['bad', t]); }
    function warn(t){ flags.push(['warn', t]); }
    function ok(t){ flags.push(['ok', t]); }
    var dep = parseFloat(v('dep')), dmin = parseFloat(v('dmin')), dmax = parseFloat(v('dmax'));
    var cmb = parseFloat(v('cmb')), amb = parseFloat(v('amb'));
    var p = v('p'), filt = v('filt'), sex = v('sex'), sx = v('sx'), ref = v('ref');

    // --- paragraph
    var s = [];
    s.push('We inferred the history of effective population size from one diploid genome of ' + f('sp', 'species', ital) +
      ' (sample ' + f('id', 'sample ID') + ', ' + (sex ? esc(sex === 'unknown' ? 'sex not known' : sex) : M('sex')) + ') with PSMC (Li & Durbin 2011).');
    s.push((v('tech') ? esc(v('tech')) : M('read technology')) + ' reads (' + f('chem', 'chemistry / basecaller') + ') were sequenced to a mean autosomal depth of ' +
      (v('dep') ? esc(v('dep')) + '×' : M('depth')) + ' and mapped to ' + (ref === 'own' ? 'the assembly of the same individual' : ref === 'rel' ? 'the assembly of a related species' : M('reference')) +
      ' with ' + f('map', 'mapper and version') + '.');
    var fl = filt === 'af' ? 'biallelic heterozygous SNVs that passed the caller\'s filter (PASS) and had an allele fraction of 0.3–0.7' :
      filt === 'pass' ? 'biallelic heterozygous SNVs that passed the caller\'s filter (PASS)' : filt === 'hard' ? 'heterozygous SNVs passing hard quality and depth thresholds ' + M('thresholds') : M('which calls were kept');
    s.push('Variants were called with ' + f('cal', 'caller') + ' ' + f('cver', 'version') + (v('cmod') ? ' (model ' + code(esc(v('cmod'))) + ')' : (v('tech') === 'Illumina paired-end' && !v('cmod') ? '' : ' (model ' + M('model') + ')')) + '; we kept ' + fl + '.');
    var pct = (cmb > 0 && amb > 0) ? ' (' + (100 * cmb / amb).toFixed(1) + ' %)' : '';
    s.push('Callable positions had mapping quality ≥ ' + f('mq', 'MAPQ') + ' and depth between ' + (v('dmin') ? esc(v('dmin')) + '×' : M('min')) + ' and ' + (v('dmax') ? esc(v('dmax')) + '×' : M('max')) +
      '; ' + (v('cmb') ? esc(v('cmb')) + ' Mb' : M('callable Mb')) + ' of ' + (v('amb') ? esc(v('amb')) + ' Mb' : M('Mb analysed')) + ' of autosomal contigs were callable' + pct + '.');
    s.push(sx === 'ex' ? 'Sex-chromosome contigs were excluded' + (sex === 'male' || sex === 'female' ? ' ' + M('how they were identified') : '') + '.' :
      sx === 'in' ? 'Sex-chromosome contigs were kept.' : sx === 'na' ? 'Sex-chromosome contigs were not identified.' : 'Sex chromosomes: ' + M('excluded or not') + '.');
    var qc = [];
    if (c('q-xc')) qc.push('the rate of heterozygous calls on the single-copy X ' + M('result'));
    if (c('q-tt')) qc.push('the transition/transversion ratio of heterozygous SNVs ' + M('value'));
    if (qc.length) s.push('As checks on the calls we report ' + qc.join(' and ') + '.');
    s.push('The diploid sequence was converted to PSMC input in ' + (v('bin') ? esc(v('bin')) : M('bin size')) + '-bp bins, and PSMC ' + f('pv', 'version') + ' was run as ' +
      code('psmc -N' + (v('N') ? esc(v('N')) : '?') + ' -t' + (v('t') ? esc(v('t')) : '?') + ' -r' + (v('r') ? esc(v('r')) : '?') + ' -p "' + (p ? esc(p) : '?') + '"') +
      ((v('N') && v('t') && v('r') && p) ? '' : ' ' + M('full command')) + '.');
    var nb = v('b');
    s.push((nb && +nb > 0 ? esc(nb) + ' bootstrap replicates' : M('number of bootstraps')) + ' resampled segments of ' + f('seg', 'segment size') + '. The plotted curve is iteration ' + f('it', 'iteration') + '.');
    var alt = [];
    if (c('pa')) alt.push(code('-p "2+2+25*2+4+6"'));
    if (c('pb')) alt.push(code('-p "1+1+1+1+25*2+4+6"'));
    if (alt.length) s.push('To test for false recent peaks (Hilgers et al. 2025) we re-ran PSMC with ' + alt.join(' and ') + ' ' + M('result: same / different, from when') + '.');
    s.push('Times and sizes were scaled with a mutation rate of ' + (v('mu') ? esc(v('mu')) : M('μ')) + ' per site per generation (' + f('mus', 'source of μ') + ') and a generation time of ' +
      (v('g') ? esc(v('g')) + (+v('g') === 1 ? ' year (' : ' years (') : M('g') + ' years (') + f('gs', 'source of g') + ')' + (c('grid') ? '; the figure also shows ' + M('the μ and g range') : '') + (c('sc') ? '; a second axis gives time as pairwise divergence and size as θ' : '') + '.');
    var sens = [];
    if (c('s-cs')) sens.push('a second call set');
    if (c('s-rh')) sens.push('two independent halves of the reads');
    if (c('s-roh')) sens.push('runs of homozygosity masked');
    if (c('s-rnd')) sens.push('a random mask of the same size');
    if (c('s-m2')) sens.push('a second method ' + M('which'));
    if (sens.length) s.push('Sensitivity was tested with ' + sens.join(', ') + '.');
    s.push('We interpret the curve only for times ' + f('rng', 'trusted time range') + '.');
    var sh = [];
    if (c('d-reads')) sh.push('the raw reads (' + M('accession') + ')');
    if (c('d-fa')) sh.push('the PSMC input');
    if (c('d-bed')) sh.push('the callable mask');
    if (c('d-vcf')) sh.push('the filtered calls');
    if (c('d-out')) sh.push('all PSMC outputs including bootstraps');
    if (c('d-cmd')) sh.push('the commands, scripts and plotted tables');
    s.push(sh.length ? sh[0].charAt(0).toUpperCase() + sh.join(', ').slice(1) + ' are available at ' + M('repository, DOI') + '.' : M('data availability') + '.');
    par.innerHTML = s.join(' ');

    // --- flags
    var need = [['sp', 'species'], ['id', 'sample ID'], ['sex', 'sex'], ['tech', 'read technology'], ['dep', 'mean depth'], ['ref', 'reference'], ['map', 'mapper and version'],
      ['cal', 'caller'], ['cver', 'caller version'], ['filt', 'which calls were kept'], ['mq', 'MAPQ cut-off'], ['dmin', 'minimum depth'], ['dmax', 'maximum depth'],
      ['cmb', 'callable Mb'], ['sx', 'sex chromosomes'], ['bin', 'bin size'], ['pv', 'PSMC version'], ['N', '-N'], ['t', '-t'], ['r', '-r'], ['p', '-p pattern'],
      ['mu', 'μ'], ['g', 'generation time'], ['rng', 'trusted time range']];
    var miss = need.filter(function(n){ return !v(n[0]); }).map(function(n){ return n[1]; });
    if (miss.length) bad('Missing: ' + miss.join(', ') + '. A reader cannot rerun or judge the analysis without these.');
    if (v('tech') === 'Oxford Nanopore' && !v('chem')) bad('ONT: give the pore chemistry and basecaller model; error profiles differ between them.');
    if (!isNaN(dep) && dep < 18) warn('Mean depth ' + dep + '×: Nadachowska-Brzyska et al. (2016) found curves of the same birds agreed only from about 18×. Lower depth loses heterozygous sites and lowers Ne; the PSMC README (appendix II) gives a correction for the share of missed heterozygotes (psmc_plot.pl -M).');
    if (!isNaN(dep) && !isNaN(dmin) && dmin < dep / 3 * 0.9) warn('Minimum depth ' + dmin + '× is below a third of the mean (' + (dep / 3).toFixed(1) + '×), the PSMC README\'s suggestion.');
    if (!isNaN(dep) && !isNaN(dmax) && dmax > dep * 2 * 1.1) warn('Maximum depth ' + dmax + '× is above twice the mean (' + (dep * 2).toFixed(0) + '×), the PSMC README\'s suggestion; collapsed repeats add false heterozygotes.');
    if (cmb > 0 && amb > 0){
      if (cmb / amb < 0.75) warn('Only ' + (100 * cmb / amb).toFixed(0) + ' % of the analysed autosomes are callable; Nadachowska-Brzyska et al. (2016) saw unstable curves above 25 % missing data.');
    } else if (v('cmb') && !v('amb')) warn('Give the total analysed as well, so the callable share can be judged.');
    if (sex === 'male' && sx !== 'ex') bad('A male: the X (or a female bird\'s Z) must be excluded, or it reads as a long homozygous stretch.');
    if (sex === 'female' && !sx) warn('Female: say whether the species is ZW (then the Z is single-copy) and what was excluded.');
    if (filt === 'pass') warn('PASS only, no allele-fraction window: in one of our genomes the PASS-only set gave about twice the Ne of the allele-fraction set 30–100 thousand years ago (s06). Report a second call set.');
    if (!c('q-xc') && !c('q-tt')) warn('No check on false heterozygotes. A male X is a free control (it should carry none); the transition/transversion ratio (Ts/Tv) of the heterozygous SNVs is another.');
    if (p === '4+25*2+4+6' && !(c('pa') || c('pb'))) bad('README pattern without reruns: Hilgers et al. (2025) found false recent peaks with exactly this pattern; rerun with "2+2+25*2+4+6" and "1+1+1+1+25*2+4+6".');
    if (!p) bad('No -p pattern: psmc\'s built-in default (4+5*3+4 in the current source) differs from the README pattern, so "default" does not say which was used.');
    if (nb === '0' || nb === '') bad('No bootstraps: the reader cannot see which parts of the curve are noisy.');
    else if (!v('seg')) warn('Bootstrap segment size not given: splitfa cuts 500,000 bins (50 Mb at 100-bp bins) by default and keeps shorter contigs whole.');
    if (!v('it')) warn('Plotted iteration not stated: psmc_plot.pl plots iteration 20 by default (-n 20), not the last one.');
    if (v('mu') === '2.5e-8' && v('g') === '25') bad('μ 2.5e-8 and g 25 years are psmc_plot.pl\'s built-in defaults (human values). Give values for your species, each with a source.');
    if (v('mu') && !v('mus')) bad('μ without a source.');
    if (v('g') && !v('gs')) bad('Generation time without a source.');
    if (/placeholder/i.test(v('mus') + v('gs'))) warn('A placeholder μ or g is honest only if the legend says so and the figure shows a range (or scaled units).');
    if (!c('grid') && !c('sc')) warn('One μ and one g only: show a range or a scaled-units axis so readers can rescale.');
    var nsens = ['s-cs', 's-rh', 's-roh', 's-rnd', 's-m2'].filter(c).length;
    if (!nsens) warn('No sensitivity tests listed. Bootstraps alone do not test calls, masks or the pattern (s06).');
    if (c('s-roh') && !c('s-rnd')) warn('Runs of homozygosity (ROH) masked without a random mask of the same size: part of any change may be just less data (s06).');
    var nd = ['d-reads', 'd-fa', 'd-bed', 'd-vcf', 'd-out', 'd-cmd'].filter(c).length;
    if (nd < 6) warn('Shared: ' + nd + ' of 6 file types. The .psmcfa, mask and .psmc outputs are small and let anyone redo the scaling or rerun PSMC.');
    if (!flags.some(function(x){ return x[0] !== 'ok'; })) ok('Nothing missing that this checklist knows about. Fill the red [brackets] in the paragraph with your results.');

    var nbad = flags.filter(function(x){ return x[0] === 'bad'; }).length, nw = flags.filter(function(x){ return x[0] === 'warn'; }).length;
    var filled = need.length - miss.length;
    el('s08-score').innerHTML = '<div>required items filled<b>' + filled + ' / ' + need.length + '</b></div><div>problems a reviewer would raise<b>' + nbad + '</b></div><div>cautions<b>' + nw + '</b></div>';
    var TAG = { bad: ['s08-tb', 'missing / wrong'], warn: ['s08-tw', 'caution'], ok: ['s08-tg', 'ok'] };
    el('s08-flags').innerHTML = flags.map(function(x){ return '<li class="s08-' + x[0] + '"><span class="tag ' + TAG[x[0]][0] + '">' + TAG[x[0]][1] + '</span>' + esc(x[1]) + '</li>'; }).join('');
  }

  function load(name){
    var P = PRE[name] || {};
    TXT.forEach(function(k){ var e = el('s08-' + k); if (e) e.value = P[k] != null ? P[k] : ''; });
    CHK.forEach(function(k){ var e = el('s08-' + k); if (e) e.checked = !!P[k]; });
    Array.prototype.forEach.call(el('s08-pre').querySelectorAll('button'), function(b){ b.setAttribute('aria-pressed', b.dataset.p === name ? 'true' : 'false'); });
    build();
  }
  var wrap = el('s08-wrap');
  wrap.addEventListener('input', function(ev){ if (ev.target.id && /^s08-/.test(ev.target.id) && !/^s08-f-/.test(ev.target.id)) build(); });
  wrap.addEventListener('change', function(ev){ if (ev.target.id && /^s08-/.test(ev.target.id) && !/^s08-f-/.test(ev.target.id)) build(); });
  el('s08-pre').addEventListener('click', function(ev){ var b = ev.target.closest('button'); if (b) load(b.dataset.p); });
  el('s08-copy').addEventListener('click', function(){
    var t = par.textContent;
    var done = function(){ el('s08-copy').textContent = 'copied'; setTimeout(function(){ el('s08-copy').textContent = 'copy text'; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function(){});
  });
  load('spA');
})();
