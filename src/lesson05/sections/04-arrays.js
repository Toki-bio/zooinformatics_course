(function(){
  var fig = document.getElementById('s04-fig');
  if (!fig) return;
  var NS = 'http://www.w3.org/2000/svg';
  var N = 100, H = N / 2, S_ALL = 1000;
  var el = function(id){ return document.getElementById(id); };
  var mafIn = el('s04-maf'), panIn = el('s04-panel');

  // folded neutral SFS (relative weights), classes k = 1..N/2
  var W = [];
  for (var k = 1; k <= H; k++) W[k] = (k < H) ? 1 / k + 1 / (N - k) : 1 / k;
  var Wsum = 0; for (k = 1; k <= H; k++) Wsum += W[k];
  var a1 = 0, a2 = 0; for (var i = 1; i < N; i++){ a1 += 1 / i; a2 += 1 / (i * i); }
  var b1 = (N + 1) / (3 * (N - 1)), b2 = 2 * (N * N + N + 3) / (9 * N * (N - 1));
  var c1 = b1 - 1 / a1, c2 = b2 - (N + 2) / (a1 * N) + a2 / (a1 * a1);
  var e1 = c1 / a1, e2 = c2 / (a1 * a1 + a2);

  function counts(maf, d){          // expected number of array sites per class
    var out = [];
    for (var k = 1; k <= H; k++){
      var n = S_ALL * W[k] / Wsum, p = k / N, keep = (k / N >= maf - 1e-9) ? 1 : 0;
      var found = d > 0 ? 1 - Math.pow(1 - p, d) - Math.pow(p, d) : 1;
      out[k] = n * keep * found;
    }
    return out;
  }
  function stats(c){
    var S = 0, pi = 0;
    for (var k = 1; k <= H; k++){
      S += c[k];
      pi += c[k] * 2 * k * (N - k) / (N * (N - 1));
    }
    var D = null;
    if (S > 1){
      var v = e1 * S + e2 * S * (S - 1);
      D = (pi - S / a1) / Math.sqrt(v);
    }
    return { S: S, pi: pi, D: D };
  }
  function mk(n, a, p){ var e = document.createElementNS(NS, n); for (var q in a) e.setAttribute(q, a[q]); if (p) p.appendChild(e); return e; }

  var all = []; for (k = 1; k <= H; k++) all[k] = S_ALL * W[k] / Wsum;
  var sAll = stats(all);

  function share(c, lo, hi){ var s = 0; for (var k = lo; k <= hi; k++) s += c[k]; return s; }
  function pct(x){ return (100 * x).toFixed(x < 0.1 ? 1 : 0) + ' %'; }

  function draw(c){
    var Wd = 760, Hd = 250, L = 48, R = 10, T = 12, B = 44, pw = Wd - L - R, ph = Hd - T - B;
    fig.textContent = '';
    var svg = mk('svg', { viewBox: '0 0 ' + Wd + ' ' + Hd, width: '100%', role: 'img',
      'aria-label': 'Bar chart of the folded site frequency spectrum: grey bars for all variable sites, coloured bars for the sites kept by the array' }, fig);
    svg.style.minWidth = '560px';
    var ymax = 0.22;
    var bw = pw / H;
    [0, 0.05, 0.1, 0.15, 0.2].forEach(function(v){
      var y = T + ph - v / ymax * ph;
      mk('line', { x1: L, x2: Wd - R, y1: y, y2: y, stroke: 'var(--line)', 'stroke-width': 1 }, svg);
      var t = mk('text', { x: L - 6, y: y + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--muted)' }, svg); t.textContent = Math.round(v * 100) + ' %';
    });
    for (var k = 1; k <= H; k++){
      var x = L + (k - 1) * bw, h1 = all[k] / S_ALL / ymax * ph, h2 = c[k] / S_ALL / ymax * ph;
      mk('rect', { x: x + 1, y: T + ph - h1, width: Math.max(1, bw - 2), height: Math.max(0, h1), fill: 'var(--err)', opacity: 0.55 }, svg);
      if (h2 > 0.3) mk('rect', { x: x + 1, y: T + ph - h2, width: Math.max(1, bw - 2), height: h2, fill: 'var(--accent)' }, svg);
    }
    [1, 2, 5, 10, 20, 30, 40, 50].forEach(function(k){
      var x = L + (k - 0.5) * bw;
      var t = mk('text', { x: x, y: T + ph + 14, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted)' }, svg); t.textContent = k;
    });
    var tl = mk('text', { x: L + pw / 2, y: Hd - 6, 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--muted)' }, svg);
    tl.textContent = 'chromosomes (of 100) carrying the rarer allele';
    var yl = mk('text', { x: 12, y: T + ph / 2, 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--muted)', transform: 'rotate(-90 12 ' + (T + ph / 2) + ')' }, svg);
    yl.textContent = 'share of all variable sites';
  }

  function update(){
    var maf = +mafIn.value / 100, d = +panIn.value;
    el('s04-maf-o').textContent = (+mafIn.value) + ' %';
    el('s04-panel-o').textContent = d ? d + ' chromosomes' : 'none';
    var c = counts(maf, d), st = stats(c);
    draw(c);
    el('s04-legend').innerHTML = '<span><i style="background:var(--err);opacity:.55"></i>all variable sites</span> <span><i style="background:var(--accent)"></i>sites on the array</span>';
    var kept = st.S / S_ALL;
    var rareAll = share(all, 1, 3) / S_ALL, rareArr = share(c, 1, 3) / S_ALL;
    var th = function(s){ return (s / a1).toFixed(0); };
    el('s04-out').innerHTML =
      '<div>Sites kept<b>' + st.S.toFixed(0) + ' of ' + S_ALL + ' (' + pct(kept) + ')</b></div>' +
      '<div>Sites with the rarer allele on 1 to 3 chromosomes<b>' + share(c, 1, 3).toFixed(0) + ' of ' + share(all, 1, 3).toFixed(0) + ' kept</b></div>' +
      '<div><span class="tip" title="Tajima’s D compares two estimates of the same quantity: the average number of differences between two chromosomes, and the number of variable sites. It is 0 for a constant-size neutral population, negative with too many rare variants (growth), positive with too few (a bottleneck or structure).">Tajima’s D</span> from the array<b>' + (st.D === null ? 'n/a' : st.D.toFixed(2)) + '</b></div>' +
      '<div>Tajima’s D from all sites<b>' + sAll.D.toFixed(2) + '</b></div>' +
      '<div>Differences between two chromosomes, array / all<b>' + (st.pi / sAll.pi).toFixed(2) + '</b></div>';
    var v;
    if (kept > 0.999) v = 'No filtering: the array equals the sequence, and the constant-size population gives Tajima’s D = 0, as it should.';
    else if (st.D === null) v = 'Almost nothing is left to compute from.';
    else v = 'The population is exactly the same (constant size, no bottleneck), but the array gives Tajima’s D = ' + st.D.toFixed(2) +
      (st.D > 0.3 ? ', which looks like a bottleneck or population structure. It is not: it is the missing rare variants.' : ' (about 0).') +
      ' The array keeps ' + pct(kept) + ' of the sites, and only ' + pct(rareAll ? share(c,1,3) / share(all,1,3) : 0) + ' of the rarest ones.';
    el('s04-verdict').innerHTML = v;
    Array.prototype.forEach.call(document.querySelectorAll('#s04-preset button'), function(b){
      b.setAttribute('aria-pressed', (+b.dataset.m === +mafIn.value && +b.dataset.p === d) ? 'true' : 'false');
    });
  }
  mafIn.addEventListener('input', update);
  panIn.addEventListener('input', update);
  Array.prototype.forEach.call(document.querySelectorAll('#s04-preset button'), function(b){
    b.addEventListener('click', function(){ mafIn.value = b.dataset.m; panIn.value = b.dataset.p; update(); });
  });

  // code controls, run on load: known answers
  (function(){
    var c0 = counts(0, 0), s0 = stats(c0), ok = [];
    var ident = true; for (var k = 1; k <= H; k++) if (Math.abs(c0[k] - all[k]) > 1e-9) ident = false;
    ok.push(ident ? 'MAF 0 and no panel keeps every site: pass' : 'identity: FAIL');
    ok.push(Math.abs(s0.D) < 1e-9 ? 'Tajima’s D of the neutral spectrum is 0: pass' : 'D=0: FAIL');
    // expected sites = theta * a1 and pi = theta for the unfolded 1/i spectrum
    var theta = S_ALL / a1, pi = 0; for (i = 1; i < N; i++) pi += (theta / i) * 2 * i * (N - i) / (N * (N - 1));
    ok.push(Math.abs(pi - theta) < 1e-9 ? 'pairwise differences equal theta: pass' : 'pi=theta: FAIL');
    el('s04-check').innerHTML = 'Built-in checks (known answers): ' + ok.join('; ') + '.';
  })();
  update();
})();
