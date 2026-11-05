(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function press(group, btn) {
    var bs = group.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', bs[i] === btn ? 'true' : 'false');
  }
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function sig(x) { return x >= 100 ? fmt(x) : x >= 10 ? x.toFixed(1) : x.toFixed(2); }

  // seconds -> readable duration
  function dur(s) {
    if (s < 1) return (s * 1000 < 10 ? (s * 1000).toFixed(1) : fmt(s * 1000)) + ' ms';
    if (s < 60) return sig(s) + ' s';
    if (s < 3600) return sig(s / 60) + ' min';
    if (s < 86400) return sig(s / 3600) + ' h';
    if (s < 86400 * 365) return sig(s / 86400) + ' days';
    return sig(s / (86400 * 365)) + ' years';
  }
  function size(gb) {
    if (gb < 1) return (gb * 1000 < 10 ? (gb * 1000).toFixed(1) : fmt(gb * 1000)) + ' MB';
    return (gb < 10 ? gb.toFixed(1) : fmt(gb)) + ' GB';
  }
  function speed(mb) { return mb >= 1000 ? (mb / 1000).toFixed(1) + ' GB/s' : fmt(mb) + ' MB/s'; }

  // ------------------------------------------------------------------
  // The toy model (kept as plain functions so it can be checked by hand)
  //   T      = one full scan, seconds  = data_MB / speed_MB_per_s
  //   scan   = Q * T
  //   index  = B * T + Q * l * T        (B = build cost in scans, l = query cost as a fraction of a scan)
  //   break-even Q* = B / (1 - l)       (only if l < 1)
  // ------------------------------------------------------------------
  function model(gb, mbs, Q, B, lfrac) {
    var T = gb * 1000 / mbs;
    return {
      T: T,
      scan: Q * T,
      index: B * T + Q * lfrac * T,
      qstar: lfrac < 1 ? B / (1 - lfrac) : Infinity,
      scanAt: function (q) { return q * T; },
      indexAt: function (q) { return B * T + q * lfrac * T; }
    };
  }

  try {
    var PRESETS = {
      primer: { d: 0.5, v: 2, q: 0, b: 1.3, l: -3 },
      sine: { d: 0.5, v: 0, q: 1, b: 1.3, l: 0.5 },
      reads: { d: 0.5, v: 2, q: 7, b: 1.3, l: -3 },
      big: { d: 2, v: 2, q: 2, b: 1.3, l: -3 }
    };
    var ids = ['d', 'v', 'q', 'b', 'l'];
    function val(k) { return parseFloat($('s01-' + k).value); }
    function params() {
      return {
        gb: Math.pow(10, val('d')), mbs: Math.pow(10, val('v')),
        Q: Math.round(Math.pow(10, val('q'))), B: Math.round(Math.pow(10, val('b')) * 10) / 10,
        lpct: Math.pow(10, val('l'))
      };
    }
    function lfmt(p) { return p >= 1 ? p.toFixed(1) : p >= 0.01 ? p.toFixed(2) : p.toExponential(1); }

    function draw() {
      var p = params(), m = model(p.gb, p.mbs, p.Q, p.B, p.lpct / 100);
      $('s01-do').textContent = size(p.gb);
      $('s01-vo').textContent = speed(p.mbs);
      $('s01-qo').textContent = fmt(p.Q);
      $('s01-bo').textContent = sig(p.B) + ' scans';
      $('s01-lo').textContent = lfmt(p.lpct) + ' % of a scan';

      // chart: x = log10 queries 0..8, y = log10 seconds
      var svg = $('s01-svg'); while (svg.firstChild) svg.removeChild(svg.firstChild);
      var l = 78, r = 740, t = 14, b = 262, w = r - l, h = b - t;
      var lf = p.lpct / 100;
      var ys = [m.scanAt(1), m.indexAt(1), m.scanAt(1e8), m.indexAt(1e8)].map(function (v) { return Math.log10(v); });
      var y0 = Math.floor(Math.min.apply(null, ys)), y1 = Math.ceil(Math.max.apply(null, ys));
      if (y1 - y0 < 2) y1 = y0 + 2;
      function X(q) { return l + w * Math.log10(q) / 8; }
      function Y(s) { return b - h * (Math.log10(s) - y0) / (y1 - y0); }
      var step = (y1 - y0) > 12 ? 2 : 1;
      for (var yy = y0; yy <= y1; yy += step) {
        var py = b - h * (yy - y0) / (y1 - y0);
        svg.appendChild(el('line', { x1: l, x2: r, y1: py, y2: py, 'class': 'grid' }));
        svg.appendChild(el('text', { x: l - 6, y: py + 4, 'text-anchor': 'end' }, dur(Math.pow(10, yy))));
      }
      for (var xx = 0; xx <= 8; xx++) {
        var px = l + w * xx / 8;
        svg.appendChild(el('line', { x1: px, x2: px, y1: t, y2: b, 'class': 'grid' }));
        svg.appendChild(el('text', { x: px, y: b + 15, 'text-anchor': 'middle' }, xx === 0 ? '1' : '10^' + xx));
      }
      svg.appendChild(el('line', { x1: l, x2: r, y1: b, y2: b, 'class': 'ax' }));
      svg.appendChild(el('line', { x1: l, x2: l, y1: t, y2: b, 'class': 'ax' }));
      svg.appendChild(el('text', { x: (l + r) / 2, y: b + 32, 'text-anchor': 'middle' }, 'number of queries (log scale)'));
      function line(fn, color) {
        var pts = [];
        for (var i = 0; i <= 160; i++) {
          var q = Math.pow(10, 8 * i / 160);
          pts.push(X(q).toFixed(1) + ',' + Y(fn(q)).toFixed(1));
        }
        svg.appendChild(el('polyline', { points: pts.join(' '), fill: 'none', stroke: color, 'stroke-width': 2.2 }));
      }
      line(m.scanAt, 'var(--het)');
      line(m.indexAt, 'var(--accent)');
      // user's own query count
      var xq = X(Math.max(1, p.Q));
      svg.appendChild(el('line', { x1: xq, x2: xq, y1: t, y2: b, stroke: 'var(--muted)', 'stroke-dasharray': '4 3' }));
      // break-even
      if (isFinite(m.qstar) && m.qstar >= 1 && m.qstar <= 1e8) {
        var bx = X(m.qstar), by = Y(m.scanAt(m.qstar));
        svg.appendChild(el('circle', { cx: bx, cy: by, r: 5, fill: 'var(--bg)', stroke: 'var(--fg)', 'stroke-width': 2 }));
        var lx = bx > 520 ? bx - 8 : bx + 8, anc = bx > 520 ? 'end' : 'start';
        svg.appendChild(el('text', { x: lx, y: Math.min(b - 8, by + 18), 'text-anchor': anc, 'class': 'lab' }, 'break-even ~' + fmt(Math.ceil(m.qstar)) + ' queries'));
      }

      // readout
      var out = $('s01-out');
      out.innerHTML =
        '<div>One full scan of the data<b>' + dur(m.T) + '</b></div>' +
        '<div>Scan for every query (' + fmt(p.Q) + ')<b>' + dur(m.scan) + '</b></div>' +
        '<div>Index: build + ' + fmt(p.Q) + ' lookups<b>' + dur(m.index) + '</b></div>' +
        '<div><span class="tip" title="The number of queries at which both approaches take the same time. With fewer queries, scanning is quicker; with more, the index is. In the toy it equals build cost divided by (1 minus the lookup share).">Break-even</span><b>' +
        (isFinite(m.qstar) ? 'about ' + fmt(Math.ceil(m.qstar)) + ' queries' : 'never') + '</b></div>';

      var v = $('s01-verdict');
      if (!isFinite(m.qstar)) {
        v.textContent = 'A lookup costs as much as a whole scan, so the index never pays: it only adds the build.';
      } else if (m.index < m.scan) {
        v.textContent = 'With ' + fmt(p.Q) + ' queries the index is quicker by a factor of about ' + sig(m.scan / m.index) +
          ' (this toy ignores the memory the index needs).';
      } else if (m.index > m.scan) {
        v.textContent = 'With ' + fmt(p.Q) + ' queries, scanning is quicker by a factor of about ' + sig(m.index / m.scan) +
          ': the build costs more than the scans it would save. The index would pay from about ' + fmt(Math.ceil(m.qstar)) + ' queries.';
      } else {
        v.textContent = 'Exactly at the break-even: both take the same time.';
      }
    }

    ids.forEach(function (k) { $('s01-' + k).addEventListener('input', function () {
      press($('s01-pre'), null); draw();
    }); });
    $('s01-pre').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-p]'); if (!btn) return;
      var pr = PRESETS[btn.getAttribute('data-p')];
      ids.forEach(function (k) { $('s01-' + k).value = pr[k]; });
      press($('s01-pre'), btn); draw();
    });
    draw();
  } catch (err) {
    var o = document.getElementById('s01-out');
    if (o) o.textContent = 'The calculator could not start: ' + err.message;
  }
})();
