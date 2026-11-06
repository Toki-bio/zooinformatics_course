(function(){
  var NS = 'http://www.w3.org/2000/svg';
  // Invented distances (substitutions per site). A node's depth is half the mean distance between its two groups.
  var D = { PQ: 0.02, PR: 0.06, QR: 0.06, PS: 0.10, QS: 0.10, RS: 0.10 };
  function mean(a){ var s = 0; a.forEach(function(x){ s += x; }); return s / a.length; }
  var depth = {
    n1: D.PQ / 2,
    n2: mean([D.PR, D.QR]) / 2,
    n3: mean([D.PS, D.QS, D.RS]) / 2
  };
  var RANGE = { n1: [2, 24], n2: [6, 72], n3: [10, 120] };
  function el(tag, at, txt){
    var e = document.createElementNS(NS, tag), k;
    for (k in at) e.setAttribute(k, at[k]);
    if (txt !== undefined) e.textContent = txt;
    return e;
  }
  function $(id){ return document.getElementById(id); }
  function clear(n){ while (n.firstChild) n.removeChild(n.firstChild); }
  function fmt(x){ return (Math.round(x * 10) / 10).toFixed(1); }
  function pressed(box, v){
    box.querySelectorAll('button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.v === v ? 'true' : 'false'); });
  }

  // ---- tool 1: one calibration rescales every age
  var cal = 'n2', age = 30;
  function ages(){
    var rate = depth[cal] / age;
    return { rate: rate, n1: depth.n1 / rate, n2: depth.n2 / rate, n3: depth.n3 / rate };
  }
  var X0 = 60, X1 = 690, TMAX = 120, Y = { P: 40, Q: 85, R: 135, S: 215 };
  function tx(a){ return X1 - a / TMAX * (X1 - X0); }
  function drawTree(){
    var a = ages(), s = $('s09-tree'), yAx = 250, t;
    clear(s);
    for (t = 0; t <= TMAX; t += 20) {
      s.appendChild(el('line', { x1: tx(t), x2: tx(t), y1: 20, y2: yAx, stroke: 'var(--line)', 'stroke-width': 1 }));
      s.appendChild(el('text', { x: tx(t), y: yAx + 15, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--muted)' }, String(t)));
    }
    s.appendChild(el('text', { x: (X0 + X1) / 2, y: yAx + 33, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--muted)' }, 'million years before present'));
    var y1 = (Y.P + Y.Q) / 2, y2 = (y1 + Y.R) / 2, y3 = (y2 + Y.S) / 2;
    var x1 = tx(a.n1), x2 = tx(a.n2), x3 = tx(a.n3), xt = tx(0);
    function br(xa, ya, xb, yb){ s.appendChild(el('line', { x1: xa, y1: ya, x2: xb, y2: yb, stroke: 'var(--fg)', 'stroke-width': 2, 'stroke-linecap': 'round' })); }
    br(x1, Y.P, xt, Y.P); br(x1, Y.Q, xt, Y.Q); br(x1, Y.P, x1, Y.Q);
    br(x2, Y.R, xt, Y.R); br(x2, y1, x1, y1); br(x2, y1, x2, Y.R);
    br(x3, Y.S, xt, Y.S); br(x3, y2, x2, y2); br(x3, y2, x3, Y.S);
    ['P', 'Q', 'R', 'S'].forEach(function(k){
      s.appendChild(el('text', { x: xt + 8, y: Y[k] + 5, 'font-size': 14, 'font-style': 'italic', fill: 'var(--fg)' }, k));
    });
    [['n1', x1, y1], ['n2', x2, y2], ['n3', x3, y3]].forEach(function(n){
      var c = n[0] === cal;
      s.appendChild(el('circle', { cx: n[1], cy: n[2], r: c ? 7 : 4.5, fill: c ? 'var(--het)' : 'var(--accent)', stroke: 'var(--bg)', 'stroke-width': 1.5 }));
      s.appendChild(el('text', { x: n[1] - 10, y: n[2] - 9, 'text-anchor': 'end', 'font-size': 12.5, 'font-weight': c ? 700 : 400, fill: c ? 'var(--het)' : 'var(--fg)' }, fmt(a[n[0]]) + ' My'));
    });
    $('s09-r-rate').textContent = a.rate.toFixed(5);
    $('s09-r-n1').textContent = fmt(a.n1) + ' My';
    $('s09-r-n2').textContent = fmt(a.n2) + ' My';
    $('s09-r-n3').textContent = fmt(a.n3) + ' My';
    $('s09-r-bl').textContent = (a.rate * a.n1).toFixed(3);
    $('s09-r-ratio').textContent = (a.n3 / a.n1).toFixed(2);
    $('s09-age-out').textContent = age + ' My';
  }
  $('s09-age').addEventListener('input', function(){ age = +this.value; drawTree(); });
  $('s09-node').addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    var cur = ages(), v = b.dataset.v, r = RANGE[v], sl = $('s09-age');
    cal = v; pressed(this, v);
    sl.min = r[0]; sl.max = r[1];
    age = Math.min(r[1], Math.max(r[0], Math.round(cur[v])));   // the tree stays put when only the node changes
    sl.value = age;
    drawTree();
  });

  // ---- tool 2: a calibration prior on P+Q+R, carried to the other nodes by the fixed depth ratios
  var shape = 'ln', fos = 30, gap = 8, SIG = 0.6, Z = 1.959964;
  // Time from split to fossil at probability p; z is the same point on a standard normal curve.
  function q(p, z){
    if (shape === 'point') return 0;
    if (shape === 'unif') return 2 * gap * p;
    if (shape === 'exp') return -gap * Math.log(1 - p);
    return Math.exp(Math.log(gap) - SIG * SIG / 2 + SIG * z);
  }
  function dens(x){
    if (shape === 'unif') return x >= 0 && x <= 2 * gap ? 1 / (2 * gap) : 0;
    if (shape === 'exp') return x >= 0 ? Math.exp(-x / gap) / gap : 0;
    if (x <= 0) return 0;
    var u = (Math.log(x) - Math.log(gap) + SIG * SIG / 2) / SIG;
    return Math.exp(-u * u / 2) / (x * SIG * Math.sqrt(2 * Math.PI));
  }
  var PX0 = 40, PX1 = 730, PMAX = 225, PY0 = 215, PY1 = 16;
  function px(a){ return PX0 + a / PMAX * (PX1 - PX0); }
  function drawPrior(){
    var s = $('s09-prior'), t, k = depth.n3 / depth.n2;
    clear(s);
    for (t = 0; t <= PMAX; t += 25) {
      s.appendChild(el('line', { x1: px(t), x2: px(t), y1: PY1, y2: PY0, stroke: 'var(--line)', 'stroke-width': 1 }));
      s.appendChild(el('text', { x: px(t), y: PY0 + 15, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--muted)' }, String(t)));
    }
    s.appendChild(el('text', { x: (PX0 + PX1) / 2, y: PY0 + 33, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--muted)' }, 'age, million years before present'));
    s.appendChild(el('line', { x1: PX0, x2: PX1, y1: PY0, y2: PY0, stroke: 'var(--muted)', 'stroke-width': 1 }));
    if (shape === 'point') {
      s.appendChild(el('line', { x1: px(fos), x2: px(fos), y1: PY0, y2: PY1 + 16, stroke: 'var(--het)', 'stroke-width': 3 }));
      s.appendChild(el('line', { x1: px(fos * k), x2: px(fos * k), y1: PY0, y2: PY1 + 16, stroke: 'var(--accent)', 'stroke-width': 3 }));
    } else {
      var i, N = 800, top = 0;
      for (i = 1; i <= N; i++) top = Math.max(top, dens(i / N * 60));
      var sc = (PY0 - PY1 - 16) / top;
      [[1, fos, 'var(--het)'], [k, fos * k, 'var(--accent)']].forEach(function(c){
        var d = 'M' + px(c[1]).toFixed(1) + ' ' + PY0, a;
        for (a = c[1]; a <= PMAX; a += 0.25) {
          d += 'L' + px(a).toFixed(1) + ' ' + (PY0 - dens((a - c[1]) / c[0]) / c[0] * sc).toFixed(1);
        }
        s.appendChild(el('path', { d: d, fill: 'none', stroke: c[2], 'stroke-width': 2.2, 'stroke-linejoin': 'round' }));
      });
    }
    s.appendChild(el('line', { x1: px(fos), x2: px(fos), y1: PY1, y2: PY0, stroke: 'var(--bad)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
    s.appendChild(el('text', { x: px(fos) + 6, y: PY1 + 8, 'font-size': 12, fill: 'var(--bad)' }, 'fossil ' + fos + ' My'));

    var med = fos + q(0.5, 0), lo = fos + q(0.025, -Z), hi = fos + q(0.975, Z), body = $('s09-body');
    clear(body);
    [['P+Q', depth.n1 / depth.n2], ['P+Q+R', 1], ['root', k]].forEach(function(r){
      var tr = document.createElement('tr');
      [r[0], fmt(med * r[1]), shape === 'point' ? 'none given' : fmt(lo * r[1]) + ' to ' + fmt(hi * r[1])].forEach(function(v, i){
        var td = document.createElement('td'); td.textContent = v;
        if (i === 0 && r[1] === 1) td.style.fontWeight = '600';
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    $('s09-verdict').textContent = shape === 'point'
      ? 'The node is put exactly at the fossil age. No uncertainty is shown, and since the fossil is only a minimum, the whole tree comes out too young unless the animal lived at the moment of the split.'
      : 'The median of every node is ' + fmt((med / fos - 1) * 100) + ' % older than if the fossil age had been used as the node age, and the root’s 95 % range is ' + fmt((hi - lo) * k) + ' My wide. The sequences did not change.';
    $('s09-fos-out').textContent = fos + ' My';
    $('s09-gap-out').textContent = gap + ' My';
    $('s09-gap').disabled = shape === 'point';
  }
  $('s09-shape').addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    shape = b.dataset.v; pressed(this, shape); drawPrior();
  });
  $('s09-fos').addEventListener('input', function(){ fos = +this.value; drawPrior(); });
  $('s09-gap').addEventListener('input', function(){ gap = +this.value; drawPrior(); });

  // ---- static sketch: node dating and tip dating
  function sketch(){
    var s = $('s09-nodetip');
    function ln(x1, y1, x2, y2, c, w, dash){
      var at = { x1: x1, y1: y1, x2: x2, y2: y2, stroke: c || 'var(--fg)', 'stroke-width': w || 2, 'stroke-linecap': 'round' };
      if (dash) at['stroke-dasharray'] = dash;
      s.appendChild(el('line', at));
    }
    function tt(x, y, t, c){ s.appendChild(el('text', { x: x, y: y, 'font-size': 13, fill: c || 'var(--fg)' }, t)); }
    function base(o){
      ln(o + 40, 70, o + 40, 150); ln(o + 40, 70, o + 120, 70);
      ln(o + 120, 45, o + 120, 95); ln(o + 120, 45, o + 310, 45); ln(o + 120, 95, o + 310, 95);
      ln(o + 40, 150, o + 310, 150);
    }
    tt(20, 20, 'Node dating: the fossil becomes a prior on a node');
    base(0);
    var i, d = 'M170 182', h;
    for (i = 1; i <= 40; i++) { h = Math.pow(i / 20, 2) * Math.exp(2 * (1 - i / 20)); d += 'L' + (170 - i * 2.4).toFixed(1) + ' ' + (182 - h * 24).toFixed(1); }
    s.appendChild(el('path', { d: d, fill: 'none', stroke: 'var(--het)', 'stroke-width': 2.2 }));
    s.appendChild(el('circle', { cx: 120, cy: 70, r: 6, fill: 'var(--het)' }));
    ln(120, 76, 120, 156, 'var(--het)', 1, '3 3');
    s.appendChild(el('rect', { x: 165, y: 40, width: 10, height: 10, fill: 'var(--bad)' }));
    ln(170, 50, 170, 184, 'var(--bad)', 1.5, '4 3');
    tt(177, 178, 'fossil = minimum age', 'var(--bad)');
    tt(20, 203, 'One oldest fossil per node. Its side branch is not drawn.', 'var(--muted)');
    var o = 400;
    tt(o + 20, 20, 'Tip dating: the fossil is a dated tip');
    base(o);
    ln(o + 80, 150, o + 80, 120); ln(o + 80, 120, o + 170, 120, 'var(--bad)');
    s.appendChild(el('rect', { x: o + 165, y: 115, width: 10, height: 10, fill: 'var(--bad)' }));
    tt(o + 181, 130, 'fossil tip with its age', 'var(--bad)');
    ln(o + 170, 95, o + 170, 70); ln(o + 170, 70, o + 230, 70, 'var(--bad)');
    s.appendChild(el('rect', { x: o + 225, y: 65, width: 10, height: 10, fill: 'var(--bad)' }));
    tt(o + 20, 203, 'Many fossils. The analysis estimates where they attach.', 'var(--muted)');
  }
  drawTree(); drawPrior(); sketch();
})();
