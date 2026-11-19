(function(){
  var box = document.getElementById('s09-plot');
  if (!box) return;
  var el = function(id){ return document.getElementById(id); };

  /* ---------- reading the files (same rules as psmc_plot.pl and msmc-tools plot_utils.py) ---------- */
  // psmc_plot.pl parse_pattern: interval index -> index of its free parameter
  function parsePattern(p){
    var stack = [], ret = [];
    p.replace(/\s+/g, '').split('+').forEach(function(part){
      var m = part.match(/^(\d+)\*(\d+)$/), x1 = m ? +m[1] : 1, x2 = m ? +m[2] : +part, i;
      for (i = 0; i < x1; i++) stack.push(x2);
    });
    stack.forEach(function(n, i){ for (var j = 0; j < n; j++) ret.push(i); });
    return ret;
  }
  // last interval whose parameter differs from the parameter of the last interval
  function maxIntvOf(pattern){
    var pat = parsePattern(pattern), i = pat.length - 2;
    for (; i >= 0; i--) if (pat[i] !== pat[pat.length - 1]) break;
    return i;
  }
  function parsePSMC(text){
    var runs = [], run = null, round = null, skip = 1, maxIntv = Infinity, lastRD = -1;
    function newRun(){ run = { rounds: [] }; runs.push(run); lastRD = -1; }
    text.split(/\r?\n/).forEach(function(line){
      var c = line.slice(0, 2), m, f;
      if (c === 'MM'){
        if ((m = line.match(/skip:(\d+)/))) skip = +m[1];
        if ((m = line.match(/pattern:(\S+),/))) maxIntv = maxIntvOf(m[1]);
        if (/is_decoding:/.test(line)) newRun();
      } else if (c === 'RD'){
        var rd = +line.split(/\s+/)[1];
        if (!run || (run.rounds.length && rd <= lastRD)) newRun();
        lastRD = rd;
        round = { rd: rd, theta: NaN, dt: 0, skip: skip, maxIntv: maxIntv, rs: [] };
        run.rounds.push(round);
      } else if (!round){
        return;
      } else if (c === 'TR'){
        round.theta = +line.split(/\s+/)[1];
      } else if (c === 'DT'){
        round.dt = +line.split(/\s+/)[1];
      } else if (c === 'RS'){
        f = line.split(/\s+/);
        round.rs.push({ k: +f[1], t: +f[2], lam: +f[3] });
      }
    });
    runs = runs.map(function(r){ return { rounds: r.rounds.filter(function(x){ return x.rs.length && isFinite(x.theta); }) }; })
               .filter(function(r){ return r.rounds.length; });
    if (!runs.length) throw new Error('no PSMC iterations (RD, TR and RS lines) found');
    return { type: 'psmc', runs: runs };
  }
  function parseMSMC(text){
    var lines = text.split(/\r?\n/).filter(function(l){ return l.trim(); });
    var cols = lines[0].trim().split(/\s+/).slice(3), left = [], lambdas = cols.map(function(){ return []; });
    lines.slice(1).forEach(function(l){
      var f = l.trim().split(/\s+/);
      if (f.length < 4) return;
      left.push(+f[1]);
      cols.forEach(function(_, i){ lambdas[i].push(+f[3 + i]); });
    });
    if (!left.length) throw new Error('no MSMC rows found');
    return { type: 'msmc', cols: cols, left: left, lambdas: lambdas };
  }
  function parse(text){
    var first = (text.match(/^\s*(\S+)/) || [])[1] || '';
    if (first === 'time_index') return parseMSMC(text);
    if (/^(CC|MM|RD)\b/m.test(text)) return parsePSMC(text);
    throw new Error('this is neither a PSMC output file nor an MSMC final.txt table');
  }
  function pickRound(run, n){
    if (n != null && isFinite(n)) for (var i = 0; i < run.rounds.length; i++) if (run.rounds[i].rd === n) return run.rounds[i];
    return run.rounds[run.rounds.length - 1];
  }
  // -> [[years ago, Ne], ...]
  function scalePSMC(round, o){
    var N0 = round.theta / (round.skip * o.s) / (4 * o.mu);
    return round.rs.filter(function(r){ return !o.trim || r.k <= round.maxIntv; })
      .map(function(r){ return [2 * N0 * (r.t + round.dt) * o.g, r.lam * N0]; });
  }
  function scaleMSMC(d, col, o){ return d.left.map(function(t, i){ return [t * o.g / o.mu, 1 / d.lambdas[col][i] / (2 * o.mu)]; }); }
  function rccrMSMC(d, o){
    if (d.lambdas.length < 3) return null;
    return d.left.map(function(t, i){ return [t * o.g / o.mu, 2 * d.lambdas[1][i] / (d.lambdas[0][i] + d.lambdas[2][i])]; });
  }

  /* ---------- invented toy files, written in the real layouts ---------- */
  function toyPSMC(seed, nBoot){
    var s = seed, out = [], n = 63, maxT = 15, pat = parsePattern('4+25*2+4+6');
    function rnd(){ s = (s * 16807) % 2147483647; return s / 2147483647; }
    function one(jit){
      var noise = [], i, k, t, u, shape;
      for (i = 0; i < 28; i++) noise.push(1 + (rnd() - 0.5) * jit);
      out.push('CC\tinvented toy file, not the output of a real run', 'MM\tpattern:4+25*2+4+6, n:63, n_free_lambdas:28',
        'MM\tn_iterations:25, skip:1, max_t:15, theta/rho:5', 'MM\tis_decoding:0');
      out.push('RD\t25', 'RI\t0.001', 'TR\t' + (0.06 + 0.01 * (seed % 5)).toFixed(6) + '\t0.016000');
      for (k = 0; k <= n; k++){
        t = 0.1 * (Math.exp(k / n * Math.log(1 + 10 * maxT)) - 1); u = pat[k] / 27;
        shape = 1 + 2.2 * Math.exp(-Math.pow(u - 0.25 - 0.04 * (seed % 4), 2) / 0.02) + 1.4 * Math.exp(-Math.pow(u - 0.7, 2) / 0.03);
        out.push(['RS', k, t.toFixed(6), (shape * noise[pat[k]]).toFixed(6), '0.01', '0.01', '0.9'].join('\t'));
      }
      out.push('//');
    }
    one(0);
    for (var b = 0; b < nBoot; b++) one(0.5);
    return out.join('\n') + '\n';
  }
  function toyMSMC(){
    var out = ['time_index\tleft_time_boundary\tright_time_boundary\tlambda_00\tlambda_01\tlambda_11'], T = 32, i, u, l00, l11, l01;
    function b(j){ return j === 0 ? 0 : 1e-6 * Math.pow(600, (j - 1) / (T - 1)); }
    for (i = 0; i < T; i++){
      u = i / (T - 1);
      l00 = 2500 / (1 + 2 * Math.exp(-Math.pow(u - 0.45, 2) / 0.03));
      l11 = 4000 / (1 + 3 * Math.exp(-Math.pow(u - 0.6, 2) / 0.02));
      l01 = (l00 + l11) / 2 / (1 + Math.exp(-(u - 0.55) * 18));
      out.push([i, b(i).toExponential(5), i === T - 1 ? 'inf' : b(i + 1).toExponential(5), l00.toFixed(3), l01.toFixed(3), l11.toFixed(3)].join('\t'));
    }
    return out.join('\n') + '\n';
  }

  /* ---------- state ---------- */
  var files = [], nextId = 1, nextSlot = 0, geom = null;
  var COLORS = ['--accent', '--het', '--rep', '--good', '--bad'];
  var DASH = ['', '7 4', '2 3', '10 3 2 3'];            // after five files a colour comes back with another dash
  var state = { view: 'ne', xs: 'log', ys: 'lin' };

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v){ var x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : NaN; }
  function optNum(id){ var v = el(id).value.trim(); return v === '' ? null : num(v); }
  function sup(n){ var m = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    return String(n).split('').map(function(c){ return m[c] || c; }).join(''); }
  function compact(v){
    var a = Math.abs(v), f = function(x){ return String(Number(x.toPrecision(3))); };
    if (a >= 1e9) return f(v / 1e9) + 'G';
    if (a >= 1e6) return f(v / 1e6) + 'M';
    if (a >= 1e3) return f(v / 1e3) + 'k';
    return f(v);
  }
  function whole(v){ return v >= 1000 ? Math.round(Number(v.toPrecision(4))).toLocaleString('en-US') : String(Number(v.toPrecision(3))); }
  var NICE = [1, 1.5, 2, 3, 4, 5, 6, 8, 10];
  function niceCeil(v){ var e = Math.pow(10, Math.floor(Math.log10(v))), i; for (i = 0; i < NICE.length; i++) if (NICE[i] * e >= v * (1 - 1e-9)) return NICE[i] * e; return 10 * e; }
  function niceFloor(v){ var e = Math.pow(10, Math.floor(Math.log10(v))), i; for (i = NICE.length - 1; i >= 0; i--) if (NICE[i] * e <= v * (1 + 1e-9)) return NICE[i] * e; return e; }
  function linTicks(lo, hi){
    var raw = (hi - lo) / 6, e = Math.pow(10, Math.floor(Math.log10(raw))), step = 10 * e, out = [], v;
    [1, 2, 2.5, 5, 10].some(function(n){ if (n * e >= raw){ step = n * e; return true; } return false; });
    for (v = Math.ceil(lo / step - 1e-9) * step; v <= hi * (1 + 1e-9); v += step) out.push({ v: v, label: compact(v) });
    return { labelled: out, minor: [] };
  }
  function logTicks(lo, hi){
    var major = [], minor = [], e, m, v;
    for (e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) for (m = 1; m < 10; m++){
      v = m * Math.pow(10, e);
      if (v < lo * (1 - 1e-9) || v > hi * (1 + 1e-9)) continue;
      (m === 1 ? major : minor).push({ v: v, m: m, label: m === 1 ? '10' + sup(e) : compact(v) });
    }
    return { labelled: major.length >= 3 ? major : major.concat(minor.filter(function(t){ return t.m === 2 || t.m === 5; })), minor: minor };
  }

  /* ---------- curves ---------- */
  function buildSeries(){
    var trim = el('s09-trim').checked, rn = optNum('s09-rd'), boots = el('s09-boot').checked, out = [];
    files.forEach(function(f){
      var mu = num(f.mu), g = num(f.g), s = num(f.s), d = f.data;
      f.err = !(mu > 0) ? 'mu' : !(g > 0) ? 'g' : (d.type === 'psmc' && !(s > 0)) ? 's' : null;
      if (!f.on || f.err) return;
      var color = 'var(' + COLORS[f.slot % COLORS.length] + ')', dash = DASH[Math.floor(f.slot / COLORS.length) % DASH.length];
      function add(label, pts, o){
        var sObj = { file: f, label: label, color: color, dash: dash, width: 2, opacity: 1, main: true,
          pts: pts.filter(function(p){ return isFinite(p[0]) && isFinite(p[1]); }) };
        for (var k in o) sObj[k] = o[k];
        out.push(sObj);
      }
      if (d.type === 'psmc'){
        if (state.view !== 'ne') return;
        d.runs.forEach(function(run, i){
          if (i && !boots) return;
          add(f.label, scalePSMC(pickRound(run, rn), { mu: mu, g: g, s: s, trim: trim }), i ? { main: false, width: 1, opacity: 0.3 } : {});
        });
      } else if (state.view === 'rccr'){
        var r = rccrMSMC(d, { mu: mu, g: g });
        if (r) add(f.label, r, {});
      } else {
        (d.cols.length >= 3 ? [0, 2] : d.cols.map(function(_, i){ return i; })).forEach(function(ci, j){
          add(d.cols.length > 1 ? f.label + ' ' + d.cols[ci] : f.label, scaleMSMC(d, ci, { mu: mu, g: g }), j ? { dash: '6 4' } : {});
        });
      }
    });
    return out;
  }

  /* ---------- figure ---------- */
  var W = 760, H = 430, L = 62, R = 16, T = 14, B = 46, PW = W - L - R, PH = H - T - B;
  var TXT = 'font-family:var(--f-mono);font-size:11px;fill:var(--muted)';
  function txt(x, y, s, a, extra){ return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="' + a + '" style="' + TXT + (extra || '') + '">' + esc(s) + '</text>'; }

  function buildSVG(series, forFile){
    var xlog = state.xs === 'log', ylog = state.ys === 'log' && state.view === 'ne';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + (forFile ? W : '100%') + '"' +
      (forFile ? ' height="' + H + '"' : ' style="min-width:560px;touch-action:pan-y"') + ' role="img" aria-label="Population size through time from the loaded files">';
    if (forFile) svg += '<rect width="' + W + '" height="' + H + '" style="fill:var(--panel)"/>';
    var mains = series.filter(function(s){ return s.main && s.pts.length; });
    if (!mains.length){
      geom = forFile ? geom : null;
      return svg + txt(W / 2, H / 2, !files.length ? 'Choose PSMC or MSMC result files to draw them'
        : state.view === 'rccr' ? 'Cross-coalescence needs an MSMC file with three λ columns'
        : 'Nothing to draw: tick a file and check its μ and g', 'middle', ';font-size:13px') + '</svg>';
    }
    // axis limits come from the thick curves only, so that one wild bootstrap cannot flatten the plot
    var xs = [], ys = [];
    mains.forEach(function(s){ s.pts.forEach(function(p){ xs.push(p[0]); }); });
    var x0 = optNum('s09-xmin'), x1 = optNum('s09-xmax');
    if (x1 == null || !(x1 > 0)) x1 = niceCeil(Math.max.apply(null, xs));
    if (x0 == null || (xlog && !(x0 > 0))) x0 = xlog ? niceFloor(Math.min.apply(null, xs.filter(function(v){ return v > 0; }))) : 0;
    if (!(x1 > x0)) x1 = x0 * 10 || 1;
    mains.forEach(function(s){ s.pts.forEach(function(p, i){
      var nx = i + 1 < s.pts.length ? s.pts[i + 1][0] : p[0];
      if (nx >= x0 && p[0] <= x1) ys.push(p[1]);
    }); });
    if (!ys.length) mains.forEach(function(s){ s.pts.forEach(function(p){ ys.push(p[1]); }); });
    var y0 = optNum('s09-ymin'), y1 = optNum('s09-ymax');
    if (y1 == null || !(y1 > 0)) y1 = state.view === 'rccr' ? Math.max(1.05, niceCeil(Math.max.apply(null, ys))) : niceCeil(Math.max.apply(null, ys) * 1.05);
    if (y0 == null || (ylog && !(y0 > 0))) y0 = ylog ? niceFloor(Math.min.apply(null, ys.filter(function(v){ return v > 0; }))) : 0;
    if (!(y1 > y0)) y1 = y0 * 10 || 1;

    function clamp(v){ return Math.max(-1e4, Math.min(1e4, v)); }
    function frac(v, a, b, lg){ return lg ? (v > 0 ? (Math.log10(v) - Math.log10(a)) / (Math.log10(b) - Math.log10(a)) : -1) : (v - a) / (b - a); }
    function sx(v){ return clamp(L + frac(v, x0, x1, xlog) * PW); }
    function sy(v){ return clamp(T + PH - frac(v, y0, y1, ylog) * PH); }
    function ix(px){ var u = (px - L) / PW; return xlog ? Math.pow(10, Math.log10(x0) + u * (Math.log10(x1) - Math.log10(x0))) : x0 + u * (x1 - x0); }

    var xt = xlog ? logTicks(x0, x1) : linTicks(x0, x1), yt = ylog ? logTicks(y0, y1) : linTicks(y0, y1);
    var GRID = 'stroke:var(--line);stroke-width:1;stroke-dasharray:2 3;fill:none;opacity:.7', AX = 'stroke:var(--line);stroke-width:1;fill:none';
    xt.labelled.forEach(function(t){ var x = sx(t.v).toFixed(1);
      svg += '<line x1="' + x + '" x2="' + x + '" y1="' + T + '" y2="' + (T + PH) + '" style="' + GRID + '"/>' + txt(+x, T + PH + 16, t.label, 'middle'); });
    xt.minor.forEach(function(t){ var x = sx(t.v).toFixed(1); svg += '<line x1="' + x + '" x2="' + x + '" y1="' + (T + PH) + '" y2="' + (T + PH + 4) + '" style="' + AX + '"/>'; });
    yt.labelled.forEach(function(t){ var y = sy(t.v).toFixed(1);
      svg += '<line x1="' + L + '" x2="' + (L + PW) + '" y1="' + y + '" y2="' + y + '" style="' + GRID + '"/>' + txt(L - 7, +y + 4, t.label, 'end'); });
    yt.minor.forEach(function(t){ var y = sy(t.v).toFixed(1); svg += '<line x1="' + (L - 4) + '" x2="' + L + '" y1="' + y + '" y2="' + y + '" style="' + AX + '"/>'; });
    svg += '<path d="M' + L + ' ' + T + 'V' + (T + PH) + 'H' + (L + PW) + '" style="' + AX + '"/>';
    svg += txt(L + PW / 2, H - 8, 'years ago (each file scaled with its own μ and g)', 'middle', ';fill:var(--fg);font-size:11.5px');
    svg += '<text transform="translate(14 ' + (T + PH / 2).toFixed(1) + ') rotate(-90)" text-anchor="middle" style="' + TXT + ';fill:var(--fg);font-size:11.5px">' +
      (state.view === 'rccr' ? 'relative cross-coalescence rate' : 'effective population size Nₑ') + '</text>';

    // steps: level until the start of the next interval, then up or down
    function draw(s){
      if (!s.pts.length) return '';
      var d = 'M' + sx(s.pts[0][0]).toFixed(1) + ' ' + sy(s.pts[0][1]).toFixed(1), i;
      for (i = 1; i < s.pts.length; i++) d += 'H' + sx(s.pts[i][0]).toFixed(1) + 'V' + sy(s.pts[i][1]).toFixed(1);
      return '<path d="' + d + '" style="fill:none;stroke-linejoin:round;stroke:' + s.color + ';stroke-width:' + s.width + ';stroke-opacity:' + s.opacity +
        (s.dash ? ';stroke-dasharray:' + s.dash : '') + '"/>';
    }
    svg += '<clipPath id="s09-clip' + (forFile ? 'f' : '') + '"><rect x="' + L + '" y="' + T + '" width="' + PW + '" height="' + PH + '"/></clipPath><g clip-path="url(#s09-clip' + (forFile ? 'f' : '') + ')">';
    series.forEach(function(s){ if (!s.main) svg += draw(s); });
    mains.forEach(function(s){ svg += draw(s); });
    svg += '</g>';

    if (forFile){        // a saved figure carries its own legend
      var rows = mains.slice(0, 20), lh = 16, w = Math.min(PW - 20, 46 + Math.max.apply(null, rows.map(function(s){ return s.label.length; })) * 6.9), lx = L + PW - w - 8, ly = T + 8;
      svg += '<rect x="' + lx.toFixed(1) + '" y="' + ly + '" width="' + w.toFixed(1) + '" height="' + (rows.length * lh + 10) + '" rx="3" style="fill:var(--panel);fill-opacity:.88;stroke:var(--line)"/>';
      rows.forEach(function(s, i){ var y = ly + 5 + lh * i + lh / 2;
        svg += '<line x1="' + (lx + 8).toFixed(1) + '" x2="' + (lx + 30).toFixed(1) + '" y1="' + y + '" y2="' + y + '" style="stroke:' + s.color + ';stroke-width:2.5' + (s.dash ? ';stroke-dasharray:' + s.dash : '') + '"/>' +
          txt(lx + 36, y + 4, s.label, 'start', ';fill:var(--fg)'); });
    } else {
      svg += '<line id="s09-cross" x1="0" x2="0" y1="' + T + '" y2="' + (T + PH) + '" style="stroke:var(--muted);stroke-dasharray:3 3" visibility="hidden"/>';
      geom = { ix: ix, mains: mains };
    }
    return svg + '</svg>';
  }

  function swatch(s){ return '<i class="s09-sw" style="border-top-color:' + s.color + (s.dash ? ';border-top-style:dashed' : '') + '"></i>'; }
  function idleRead(){
    var m = geom ? geom.mains : [];
    el('s09-read').innerHTML = m.length ? m.map(function(s){ return '<span>' + swatch(s) + esc(s.label) + '</span>'; }).join('') +
      '<br><span style="color:var(--muted)">Move the pointer over the plot (or tap it) to read the values at one time.</span>' : '';
  }
  function render(){
    var series = buildSeries();
    box.innerHTML = buildSVG(series, false);
    idleRead();
    files.forEach(function(f){ ['mu', 'g', 's'].forEach(function(k){
      var inp = document.querySelector('#s09-files [data-id="' + f.id + '"][data-k="' + k + '"]');
      if (inp) inp.classList.toggle('s09-bad', f.err === k);
    }); });
    var nb = 0; files.forEach(function(f){ if (f.data.type === 'psmc') nb += f.data.runs.length - 1; });
    el('s09-cap').innerHTML = !files.length ? 'No files loaded.' :
      '<b>' + files.length + (files.length === 1 ? ' file' : ' files') + '.</b> Thick lines are the main estimates' + (nb ? '; thin lines of the same colour are bootstrap runs' : '') +
      '. With three λ columns an MSMC file gives two size curves, the second one dashed. ' +
      (files.some(function(f){ return f.toy; }) ? 'Files marked "toy" are invented examples, not results.' : '');
  }

  function valueAt(pts, x){
    if (!pts.length || x < pts[0][0] || x > pts[pts.length - 1][0]) return null;
    var lo = 0, hi = pts.length - 1, mid;
    while (lo < hi){ mid = (lo + hi + 1) >> 1; if (pts[mid][0] <= x) lo = mid; else hi = mid - 1; }
    return pts[lo][1];
  }
  function hover(ev){
    var svg = box.querySelector('svg'), cross = el('s09-cross');
    if (!geom || !cross) return;
    var r = svg.getBoundingClientRect(), k = W / r.width, px = (ev.clientX - r.left) * k, py = (ev.clientY - r.top) * k;
    if (px < L || px > L + PW || py < T || py > T + PH){ cross.setAttribute('visibility', 'hidden'); idleRead(); return; }
    var x = geom.ix(px), n = 0, html = '<b>' + whole(x) + ' years ago</b><br>';
    cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('visibility', 'visible');
    geom.mains.forEach(function(s){
      var v = valueAt(s.pts, x); if (v == null) return; n++;
      html += '<span>' + swatch(s) + esc(s.label) + ': <b>' + (state.view === 'rccr' ? v.toFixed(3) : whole(v)) + '</b></span>';
    });
    el('s09-read').innerHTML = html + (n ? '' : '<span style="color:var(--muted)">no curve covers this time</span>');
  }

  /* ---------- file table ---------- */
  function drawList(){
    el('s09-files').innerHTML = files.map(function(f){
      var d = f.data, info = d.type === 'psmc'
        ? 'PSMC, ' + d.runs[0].rounds.length + (d.runs[0].rounds.length === 1 ? ' iteration' : ' iterations') + (d.runs.length > 1 ? ', ' + (d.runs.length - 1) + ' bootstraps' : '')
        : 'MSMC, ' + d.left.length + ' intervals, ' + d.cols.join(' ');
      var a = ' data-id="' + f.id + '" ';
      return '<tr><td><input type="checkbox"' + a + 'data-k="on"' + (f.on ? ' checked' : '') + ' aria-label="show ' + esc(f.label) + '"></td>' +
        '<td style="white-space:nowrap">' + swatch({ color: 'var(' + COLORS[f.slot % COLORS.length] + ')', dash: DASH[Math.floor(f.slot / COLORS.length) % DASH.length] }) +
        '<input class="s09-in s09-name"' + a + 'data-k="label" value="' + esc(f.label) + '" aria-label="name of the curve"></td>' +
        '<td>' + (f.toy ? '<span class="tag l">toy</span> ' : '') + esc(f.name) + '<br><span style="color:var(--muted)">' + esc(info) + '</span></td>' +
        '<td><input class="s09-in"' + a + 'data-k="mu" value="' + esc(f.mu) + '" inputmode="decimal" aria-label="mutation rate"></td>' +
        '<td><input class="s09-in"' + a + 'data-k="g" value="' + esc(f.g) + '" inputmode="decimal" aria-label="generation time"></td>' +
        '<td>' + (d.type === 'psmc' ? '<input class="s09-in"' + a + 'data-k="s" value="' + esc(f.s) + '" inputmode="numeric" aria-label="bin size">' : '') + '</td>' +
        '<td><button type="button" class="s09-x"' + a + 'data-k="rm" aria-label="remove ' + esc(f.label) + '">×</button></td></tr>';
    }).join('');
  }
  function addText(name, text, toy){
    var data = parse(text);
    files.push({ id: nextId++, slot: nextSlot++, on: true, name: name, data: data, toy: !!toy,
      label: name.replace(/\.(psmc|final\.txt|txt)$/i, ''), mu: el('s09-dmu').value.trim(), g: el('s09-dg').value.trim(), s: '100', err: null });
  }
  function dropToys(){ files = files.filter(function(f){ return !f.toy; }); if (!files.length) nextSlot = 0; }
  function addFiles(list){
    var errs = [], left = list.length;
    if (!left) return;
    dropToys();
    list.forEach(function(file){
      var rd = new FileReader();
      rd.onload = function(){ try { addText(file.name, String(rd.result), false); } catch (e){ errs.push(file.name + ': ' + e.message); } done(); };
      rd.onerror = function(){ errs.push(file.name + ': could not be read'); done(); };
      rd.readAsText(file);
    });
    function done(){ if (--left) return; el('s09-msg').textContent = errs.join(' · '); drawList(); render(); }
  }
  function loadToys(){
    files = []; nextSlot = 0;
    addText('toy_species_1.combined.psmc', toyPSMC(7, 10), true);
    addText('toy_species_2.psmc', toyPSMC(13, 0), true);
    addText('toy_two_populations.msmc2.final.txt', toyMSMC(), true);
    files.forEach(function(f){ f.mu = '5.4e-9'; f.g = '1'; });
    el('s09-msg').textContent = ''; drawList(); render();
  }

  /* ---------- saving ---------- */
  function resolved(svg){
    // a saved file cannot use the page's CSS variables: replace them by the light-theme values
    var root = document.documentElement, old = root.getAttribute('data-theme'), cs, out;
    root.setAttribute('data-theme', 'light'); cs = getComputedStyle(root);
    out = svg.replace(/var\((--[\w-]+)\)/g, function(_, v){ return cs.getPropertyValue(v).trim().replace(/"/g, "'") || 'currentColor'; });
    if (old == null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', old);
    return out;
  }
  function fileSVG(){ return resolved(buildSVG(buildSeries(), true)); }
  function save(name, blob){ var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2000); }
  el('s09-svg').addEventListener('click', function(){ save('demography.svg', new Blob([fileSVG()], { type: 'image/svg+xml' })); });
  el('s09-png').addEventListener('click', function(){
    var img = new Image(), sc = 3;
    img.onload = function(){ var c = document.createElement('canvas'); c.width = W * sc; c.height = H * sc; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(function(b){ save('demography.png', b); }); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fileSVG());
  });
  el('s09-tsv').addEventListener('click', function(){
    var rows = ['curve\tkind\tfile\tmu_per_generation\tgeneration_time_years\tyears_ago\t' + (state.view === 'rccr' ? 'rccr' : 'Ne')];
    buildSeries().forEach(function(s){ s.pts.forEach(function(p){
      rows.push([s.label, s.main ? 'main' : 'bootstrap', s.file.name, s.file.mu, s.file.g, p[0], p[1]].join('\t')); }); });
    save('demography.tsv', new Blob([rows.join('\n') + '\n'], { type: 'text/tab-separated-values' }));
  });

  /* ---------- controls ---------- */
  function seg(id, key){
    el(id).addEventListener('click', function(ev){
      var b = ev.target.closest('button'); if (!b) return;
      state[key] = b.getAttribute('data-v');
      [].forEach.call(el(id).querySelectorAll('button'), function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      render();
    });
  }
  seg('s09-view', 'view'); seg('s09-xs', 'xs'); seg('s09-ys', 'ys');
  ['s09-boot', 's09-trim', 's09-xmin', 's09-xmax', 's09-ymin', 's09-ymax', 's09-rd'].forEach(function(id){ el(id).addEventListener('input', render); });
  el('s09-files').addEventListener('input', function(ev){
    var t = ev.target, k = t.getAttribute('data-k'), f = files.filter(function(x){ return x.id === +t.getAttribute('data-id'); })[0];
    if (!f) return;
    f[k] = k === 'on' ? t.checked : t.value;
    render();
  });
  el('s09-files').addEventListener('click', function(ev){
    if (ev.target.getAttribute('data-k') !== 'rm') return;
    files = files.filter(function(x){ return x.id !== +ev.target.getAttribute('data-id'); });
    if (!files.length) nextSlot = 0;
    drawList(); render();
  });
  el('s09-all').addEventListener('click', function(){ files.forEach(function(f){ f.mu = el('s09-dmu').value.trim(); f.g = el('s09-dg').value.trim(); }); drawList(); render(); });
  el('s09-toy').addEventListener('click', loadToys);
  el('s09-clear').addEventListener('click', function(){ files = []; nextSlot = 0; el('s09-msg').textContent = ''; drawList(); render(); });
  el('s09-pick').addEventListener('change', function(ev){ addFiles([].slice.call(ev.target.files)); ev.target.value = ''; });
  var drop = el('s09-drop');
  drop.addEventListener('dragover', function(ev){ ev.preventDefault(); drop.classList.add('s09-over'); });
  drop.addEventListener('dragleave', function(){ drop.classList.remove('s09-over'); });
  drop.addEventListener('drop', function(ev){ ev.preventDefault(); drop.classList.remove('s09-over'); addFiles([].slice.call(ev.dataTransfer.files)); });
  box.addEventListener('pointermove', hover);
  box.addEventListener('pointerdown', hover);
  box.addEventListener('pointerleave', function(){ var c = el('s09-cross'); if (c) c.setAttribute('visibility', 'hidden'); idleRead(); });

  loadToys();
})();
