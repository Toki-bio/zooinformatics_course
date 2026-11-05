(function(){
  var $ = function(id){ return document.getElementById(id); };
  if(!$('s04-tt-fig')) return;

  /*core-start*/
  var K = 5, M = 64, CAP = M - 1, SHIFT = 26, B = 'ACGT';
  function enc(s){ var x = 0; for(var i = 0; i < s.length; i++) x = x * 4 + B.indexOf(s[i]); return x; }
  function dec(x){ var s = ''; for(var i = 0; i < K; i++){ s = B[x & 3] + s; x >>= 2; } return s; }
  function rcStr(s){ var r = ''; for(var i = s.length - 1; i >= 0; i--) r += B[3 - B.indexOf(s[i])]; return r; }
  function canon(s){ return Math.min(enc(s), enc(rcStr(s))); }
  /* toy mixer: multiply and shift so every bit of the key reaches the top bits; the top 6 bits give the slot */
  function hash(x){ var h = Math.imul(x + 1, 0x9E3779B1); h ^= h >>> 15; h = Math.imul(h, 0x85EBCA6B); h ^= h >>> 13; return (h >>> 0) >>> SHIFT; }
  function newTable(){ var t = []; for(var i = 0; i < M; i++) t.push(-1); return t; }
  /* walk from the home slot until the key or an empty slot; returns every slot looked at */
  function walk(t, key){
    var i = hash(key), path = [];
    for(;;){
      path.push(i);
      if(t[i] === key) return { found: true, slot: i, path: path };
      if(t[i] === -1) return { found: false, slot: i, path: path };
      i = (i + 1) % M;
    }
  }
  /* Knuth 1963, Theorem 2: expected probes for the k-th item, M(N,k) = (1 + E1(N,k)) / 2 */
  function exactProbes(N, k){
    var e = 1, term = 1;
    for(var j = 1; j < k; j++){ term *= (k - j) / N; e += (j + 1) * term; }
    return (1 + e) / 2;
  }
  function largeProbes(a){ return 0.5 * (1 + 1 / ((1 - a) * (1 - a))); }
  /* the control: every possible 5-mer, hash table against a plain list of raw k-mers, letters only */
  function control(t, list, finder){
    var res = { total: 0, agree: 0, present: 0, absent: 0, probes: 0, comps: 0 };
    var n = Math.pow(4, K);
    for(var x = 0; x < n; x++){
      var q = dec(x), w = finder(t, canon(q)), inList = false;
      for(var i = 0; i < list.length; i++){
        res.comps++;
        if(list[i] === q || rcStr(list[i]) === q){ inList = true; break; }
      }
      res.total++; res.probes += w.path.length;
      if(w.found === inList) res.agree++;
      if(inList) res.present++; else res.absent++;
    }
    return res;
  }
  /*core-end*/

  var seed = 4;
  function rng(s){ return function(){ s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function makeRead(sd){
    var r = rng(sd), s = '', seen = {}, n = 0;
    while(n < CAP + 6){
      s += B[Math.floor(r() * 4)];
      if(s.length >= K){ var c = canon(s.slice(-K)); if(!seen[c]){ seen[c] = 1; n++; } }
    }
    return s;
  }

  var read, pos, tab, list, log, mark, dup, last;
  function start(){ pos = 0; tab = newTable(); list = []; log = []; mark = null; dup = 0; last = null; $('s04-ctl-out').textContent = ''; }
  function stored(){ return log.length; }
  function pl(n){ return n + ' probe' + (n > 1 ? 's' : ''); }

  function describe(s, w, verb){
    var c = canon(s), cs = dec(c), bits = '';
    for(var i = 0; i < K; i++){ var v = B.indexOf(cs[i]); bits += (v >> 1) + '' + (v & 1) + ' '; }
    var steps = w.path.map(function(p, i){
      var end = i === w.path.length - 1;
      return p + (end ? (w.found ? ' holds it' : ' empty') : ' taken');
    });
    if(steps.length > 6) steps = steps.slice(0, 2).concat(['… ' + (steps.length - 4) + ' more …']).concat(steps.slice(-2));
    return '5-mer      <span class="a">' + s + '</span>   other strand ' + rcStr(s) + '\n' +
      '<span class="tip" title="Of the two strands, the one that comes first alphabetically; it is also the smaller 2-bit number">canonical</span>  ' + cs + '\n' +
      '2-bit      ' + bits + '= ' + c + '\n' +
      '<span class="tip" title="The slot the hash function chooses for this k-mer">home slot</span>  ' + w.path[0] + '\n' +
      '<span class="tip" title="Each slot looked at is one probe">probes</span>     ' + steps.join(', ') + '\n' + verb;
  }

  function insertNext(){
    if(stored() >= CAP) return;
    var s = read.substr(pos, K); pos++;
    if(list.indexOf(s) < 0) list.push(s);
    var key = canon(s), w = walk(tab, key), a = stored() / M;
    if(w.found){
      dup++;
      last = describe(s, w, '<span class="h">already stored: found after ' + pl(w.path.length) + ', nothing added</span>');
    } else {
      tab[w.slot] = key;
      log.push({ a: a, p: w.path.length });
      last = describe(s, w, '<span class="a">stored in slot ' + w.slot + ' after ' + pl(w.path.length) + '</span>');
    }
    mark = { path: w.path, miss: false };
  }

  function drawRead(){
    var p = pos - 1;
    $('s04-read').innerHTML = p < 0 ? read : read.slice(0, p) + '<span class="a">' + read.substr(p, K) + '</span>' + read.slice(p + K);
  }

  function drawTable(){
    var CW = 68, CH = 36, W = CW * 8, H = CH * 8, s = '<svg viewBox="0 0 ' + (W + 2) + ' ' + (H + 2) + '" width="100%" style="min-width:480px" role="img" aria-label="Hash table of 64 slots, ' + stored() + ' filled">';
    var order = {};
    if(mark) mark.path.forEach(function(p, i){ order[p] = i + 1; });
    var endSlot = mark ? mark.path[mark.path.length - 1] : -1;
    for(var i = 0; i < M; i++){
      var x = 1 + (i % 8) * CW, y = 1 + Math.floor(i / 8) * CH, key = tab[i];
      var fill = 'fill:var(--panel)';
      if(key >= 0) fill = hash(key) === i ? 'fill:var(--accent);fill-opacity:.2' : 'fill:var(--het);fill-opacity:.3';
      s += '<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="' + (CW - 2) + '" height="' + (CH - 2) + '" rx="2" style="' + fill + ';stroke:var(--line);stroke-width:1"></rect>';
      s += '<text x="' + (x + 5) + '" y="' + (y + 12) + '" style="font-size:9px">' + i + '</text>';
      if(key >= 0) s += '<text class="lab" x="' + (x + CW / 2) + '" y="' + (y + 26) + '" text-anchor="middle" style="font-size:13px">' + dec(key) + '</text>';
    }
    if(mark) mark.path.forEach(function(p){
      var x = 1 + (p % 8) * CW, y = 1 + Math.floor(p / 8) * CH;
      var col = (p === endSlot) ? (mark.miss ? 'var(--bad)' : 'var(--good)') : 'var(--accent)';
      s += '<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="' + (CW - 2) + '" height="' + (CH - 2) + '" rx="2" style="fill:none;stroke:' + col + ';stroke-width:2.2"></rect>';
      s += '<text class="lab" x="' + (x + CW - 6) + '" y="' + (y + 12) + '" text-anchor="end" style="font-size:9.5px;font-weight:600">' + order[p] + '</text>';
    });
    $('s04-tt-fig').innerHTML = s + '</svg>';
  }

  function drawPlot(){
    var W = 560, H = 250, L = 46, R = 14, T = 12, Bt = 40, YM = 64;
    var X = function(a){ return L + a * (W - L - R); }, Y = function(p){ return H - Bt - p / YM * (H - T - Bt); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="min-width:380px" role="img" aria-label="Probes per insertion against load factor">';
    [0, 16, 32, 48, 64].forEach(function(p){
      s += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(p) + '" y2="' + Y(p) + '"></line><text x="' + (L - 6) + '" y="' + (Y(p) + 4) + '" text-anchor="end">' + p + '</text>';
    });
    [0, .25, .5, .75, 1].forEach(function(a){ s += '<text x="' + X(a) + '" y="' + (H - Bt + 15) + '" text-anchor="middle">' + a + '</text>'; });
    s += '<line class="ax" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(0) + '" y2="' + Y(0) + '"></line><line class="ax" x1="' + L + '" x2="' + L + '" y1="' + T + '" y2="' + Y(0) + '"></line>';
    s += '<text class="lab" x="' + X(.5) + '" y="' + (H - 6) + '" text-anchor="middle">load factor α before the insertion</text>';
    s += '<text class="lab" transform="translate(13 ' + (T + (H - T - Bt) / 2) + ') rotate(-90)" text-anchor="middle">probes for this k-mer</text>';
    var d = '', a, k;
    for(a = 0; a < .9112; a += .01) d += (d ? 'L' : 'M') + X(a).toFixed(1) + ' ' + Y(largeProbes(a)).toFixed(1);
    s += '<path d="' + d + '" style="fill:none;stroke:var(--muted);stroke-width:1.5;stroke-dasharray:5 4"></path>';
    d = '';
    for(k = 1; k <= CAP; k++) d += (d ? 'L' : 'M') + X((k - 1) / M).toFixed(1) + ' ' + Y(exactProbes(M, k)).toFixed(1);
    s += '<path d="' + d + '" style="fill:none;stroke:var(--het);stroke-width:2"></path>';
    log.forEach(function(e, i){
      s += '<circle cx="' + X(e.a).toFixed(1) + '" cy="' + Y(e.p).toFixed(1) + '" r="' + (i === log.length - 1 ? 5 : 3) + '" style="fill:var(--accent)"></circle>';
    });
    $('s04-tt-plot').innerHTML = s + '</svg>';
  }

  function drawOut(){
    var n = stored(), sum = 0, miss = 0, run = 0, best = 0, i, j, p;
    log.forEach(function(e){ sum += e.p; });
    for(i = 0; i < M; i++){ j = i; p = 1; while(tab[j] !== -1){ j = (j + 1) % M; p++; } miss += p; }
    for(i = 0; i < 2 * M; i++){ if(tab[i % M] !== -1){ run++; if(run > best) best = run; } else run = 0; }
    $('s04-out').innerHTML =
      '<div>stored k-mers / slots<b>' + n + ' / ' + M + '</b></div>' +
      '<div><span class="tip" title="Stored k-mers divided by slots">load factor α</span><b>' + (n / M).toFixed(2) + '</b></div>' +
      '<div>mean probes to find a stored k-mer<b>' + (n ? (sum / n).toFixed(2) : '–') + '</b></div>' +
      '<div>mean probes to reject an absent k-mer, over all 64 home slots<b>' + (miss / M).toFixed(2) + '</b></div>' +
      '<div><span class="tip" title="The longest unbroken row of full slots. Rows join up as the table fills: primary clustering">longest run of full slots</span><b>' + best + '</b></div>' +
      '<div>repeats met (already stored)<b>' + dup + '</b></div>';
  }

  function draw(){
    drawRead(); drawTable(); drawPlot(); drawOut();
    var full = stored() >= CAP;
    $('s04-step').innerHTML = (last || 'Press <span class="a">Insert next k-mer</span> to begin.') +
      (full ? '\n<span class="x">63 of 64 slots used: the toy stops here.</span>' : '');
    ['s04-one', 's04-ten', 's04-fill'].forEach(function(id){ $(id).disabled = full; });
  }

  function clearCtl(){ $('s04-ctl-out').textContent = ''; }
  $('s04-one').addEventListener('click', function(){ insertNext(); clearCtl(); draw(); });
  $('s04-ten').addEventListener('click', function(){ for(var i = 0; i < 10; i++) insertNext(); clearCtl(); draw(); });
  $('s04-fill').addEventListener('click', function(){ while(stored() < CAP) insertNext(); clearCtl(); draw(); });
  $('s04-reset').addEventListener('click', function(){ start(); draw(); });
  $('s04-new').addEventListener('click', function(){ seed++; read = makeRead(seed); start(); draw(); });

  function look(){
    var q = $('s04-q').value.toUpperCase().trim();
    if(!/^[ACGT]{5}$/.test(q)){ last = '<span class="x">Type five letters from A, C, G and T.</span>'; mark = null; draw(); return; }
    var w = walk(tab, canon(q));
    last = describe(q, w, w.found
      ? '<span class="a">present in slot ' + w.slot + ', found after ' + pl(w.path.length) + '</span>'
      : '<span class="x">absent: an empty slot ended the search after ' + pl(w.path.length) + '</span>');
    mark = { path: w.path, miss: !w.found };
    draw();
  }
  $('s04-look').addEventListener('click', look);
  $('s04-q').addEventListener('keydown', function(e){ if(e.key === 'Enter') look(); });

  $('s04-ctl').addEventListener('click', function(){
    var r = control(tab, list, walk);
    var f = function(v){ return v.toLocaleString('en-US'); };
    $('s04-ctl-out').innerHTML = '<b>Control: ' + f(r.agree) + ' of ' + f(r.total) + ' answers agree</b> (' + f(r.present) + ' present, ' + f(r.absent) + ' absent). Hash table: ' + (r.probes / r.total).toFixed(2) + ' probes per question. Plain list: ' + (r.comps / r.total).toFixed(1) + ' comparisons per question.';
  });

  read = makeRead(seed); start(); draw();
})();
