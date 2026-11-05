(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, text, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function fmt(x) {
    if (x >= 100) return Math.round(x).toLocaleString('en-US');
    if (x >= 10) return x.toFixed(1);
    return x.toFixed(2);
  }
  function seg2(onId, offId, cb) {
    var a = $(onId), b = $(offId);
    if (!a || !b) return;
    function set(v) { a.setAttribute('aria-pressed', v ? 'true' : 'false'); b.setAttribute('aria-pressed', v ? 'false' : 'true'); cb(v); }
    a.addEventListener('click', function () { set(true); });
    b.addEventListener('click', function () { set(false); });
  }

  /* ================= 1. pedigree ================= */
  (function pedigree() {
    var fig = $('s07-ped-fig'), out = $('s07-ped-out');
    if (!fig || !out) return;
    var P = [
      { id: 'a1', s: 'M', g: 0, x: 335, mo: null, fa: null, nm: 'founding man' },
      { id: 'a2', s: 'F', g: 0, x: 385, mo: null, fa: null, nm: 'founding woman' },
      { id: 'b1', s: 'F', g: 1, x: 90, mo: 'a2', fa: 'a1', nm: 'daughter 1' },
      { id: 'b2', s: 'M', g: 1, x: 250, mo: 'a2', fa: 'a1', nm: 'son 1' },
      { id: 'b3', s: 'F', g: 1, x: 410, mo: 'a2', fa: 'a1', nm: 'daughter 2' },
      { id: 'b4', s: 'M', g: 1, x: 570, mo: 'a2', fa: 'a1', nm: 'son 2' },
      { id: 'p1', s: 'M', g: 1, x: 140, mo: null, fa: null, nm: 'partner of daughter 1' },
      { id: 'p2', s: 'F', g: 1, x: 300, mo: null, fa: null, nm: 'partner of son 1' },
      { id: 'p3', s: 'M', g: 1, x: 460, mo: null, fa: null, nm: 'partner of daughter 2' },
      { id: 'p4', s: 'F', g: 1, x: 620, mo: null, fa: null, nm: 'partner of son 2' },
      { id: 'c1', s: 'F', g: 2, x: 90, mo: 'b1', fa: 'p1', nm: 'granddaughter (daughter 1)' },
      { id: 'c2', s: 'M', g: 2, x: 140, mo: 'b1', fa: 'p1', nm: 'grandson (daughter 1)' },
      { id: 'c3', s: 'F', g: 2, x: 250, mo: 'p2', fa: 'b2', nm: 'granddaughter A (son 1)' },
      { id: 'c4', s: 'F', g: 2, x: 300, mo: 'p2', fa: 'b2', nm: 'granddaughter B (son 1)' },
      { id: 'c5', s: 'M', g: 2, x: 410, mo: 'b3', fa: 'p3', nm: 'grandson A (daughter 2)' },
      { id: 'c6', s: 'M', g: 2, x: 460, mo: 'b3', fa: 'p3', nm: 'grandson B (daughter 2)' },
      { id: 'c7', s: 'M', g: 2, x: 570, mo: 'p4', fa: 'b4', nm: 'grandson (son 2)' },
      { id: 'c8', s: 'F', g: 2, x: 620, mo: 'p4', fa: 'b4', nm: 'granddaughter (son 2)' }
    ];
    var byId = {}; P.forEach(function (p) { byId[p.id] = p; p.y = 52 + p.g * 100; });
    var couples = [['a1', 'a2'], ['b1', 'p1'], ['b2', 'p2'], ['b3', 'p3'], ['b4', 'p4']];
    var marker = 'mt', founder = 'a2';

    /* method 1: forward rule, generation by generation */
    function forward(m, f) {
      var c = {}; var order = P.slice().sort(function (a, b) { return a.g - b.g; });
      order.forEach(function (p) {
        if (p.id === f) { c[p.id] = (m === 'mt') || p.s === 'M'; return; }
        if (m === 'mt') c[p.id] = !!(p.mo && c[p.mo]);
        else c[p.id] = !!(p.s === 'M' && p.fa && c[p.fa]);
      });
      return c;
    }
    /* method 2 (independent check): walk upward along the all-mother / all-father chain */
    function upward(m, f, id) {
      var x = byId[id], guard = 0;
      if (m === 'y' && byId[f].s !== 'M') return false;
      while (guard++ < 10) {
        if (x.id === f) return true;
        var up = (m === 'mt') ? x.mo : (x.s === 'M' ? x.fa : null);
        if (!up) return false;
        x = byId[up];
      }
      return false;
    }

    function draw() {
      var c = forward(marker, founder), bad = 0;
      P.forEach(function (p) { if (c[p.id] !== upward(marker, founder, p.id)) bad++; });
      fig.setAttribute('data-mismatch', bad);
      fig.innerHTML = '';
      var svg = el('svg', { viewBox: '0 0 720 320', width: '100%', style: 'min-width:600px', role: 'group', 'aria-label': 'Family tree over three generations; click a person to make that person the first carrier' });
      ['founders', 'children', 'grandchildren'].forEach(function (t, i) {
        el('text', { x: 4, y: 20 + i * 100 + 12, 'class': 'lab' }, t, svg);
      });
      couples.forEach(function (cp) {
        var a = byId[cp[0]], b = byId[cp[1]], mid = (a.x + b.x) / 2;
        el('line', { x1: a.x + 12, x2: b.x - 12, y1: a.y, y2: b.y, stroke: 'var(--no, var(--muted))', 'stroke-width': 1.5 }, null, svg);
        var kids = P.filter(function (p) { return p.mo === cp[1] && p.fa === cp[0] || p.mo === cp[0] && p.fa === cp[1] || (p.mo === (a.s === 'F' ? a.id : b.id) && p.fa === (a.s === 'M' ? a.id : b.id)); });
        kids.slice().sort(function (u, v) { return (c[u.id] ? 1 : 0) - (c[v.id] ? 1 : 0); }).forEach(function (k) {
          var by = a.y + 50, on = c[k.id];
          el('path', { d: 'M' + mid + ' ' + a.y + ' V' + by + ' H' + k.x + ' V' + (k.y - 12), fill: 'none', stroke: on ? 'var(--accent)' : 'var(--line)', 'stroke-width': on ? 3 : 1.5 }, null, svg);
        });
      });
      P.forEach(function (p) {
        var on = c[p.id], g = el('g', { tabindex: 0, role: 'button', 'aria-label': p.nm + (on ? ', carrier' : ', not a carrier') + '. Activate to make this person the first carrier.', style: 'cursor:pointer', 'data-id': p.id, 'data-carrier': on ? '1' : '0' }, null, svg);
        var f = on ? 'var(--accent)' : 'var(--panel)', st = (p.id === founder) ? 'var(--het)' : (on ? 'var(--accent)' : 'var(--muted)');
        var sw = (p.id === founder) ? 3.5 : 2;
        if (p.s === 'F') el('circle', { cx: p.x, cy: p.y, r: 12, fill: f, stroke: st, 'stroke-width': sw }, null, g);
        else el('rect', { x: p.x - 11, y: p.y - 11, width: 22, height: 22, fill: f, stroke: st, 'stroke-width': sw }, null, g);
        var t = el('title', {}, p.nm + (on ? ' (carrier)' : ''), g);
        function pick() { founder = p.id; draw(); }
        g.addEventListener('click', pick);
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      });
      fig.appendChild(svg);

      var total = 0, g2 = 0, g2tx = 0;
      P.forEach(function (p) { if (c[p.id]) { total++; if (p.g === 2) { g2++; if ((marker === 'mt' && p.s === 'F') || (marker === 'y' && p.s === 'M')) g2tx++; } } });
      var who = byId[founder], noY = (marker === 'y' && who.s !== 'M');
      var msg;
      if (noY) msg = 'A woman has no Y chromosome, so there is nothing to follow. Click a man.';
      else if (g2 === 0) msg = 'The line stops: ' + (marker === 'mt' ? 'no daughter of a carrier mother has been reached in the grandchildren' : 'no son of a carrier father has been reached in the grandchildren') + '. The marker is lost from this family although everyone has children.';
      else if (g2tx === 0) msg = 'The marker reaches ' + g2 + ' grandchild' + (g2 > 1 ? 'ren' : '') + ' but none of them can pass it on: ' + (marker === 'mt' ? 'only daughters transmit mtDNA' : 'only sons transmit the Y') + '. This line ends with the next generation.';
      else msg = g2tx + ' of the ' + g2 + ' carrier grandchild' + (g2 > 1 ? 'ren' : '') + ' can pass it on.';
      out.innerHTML = '<div>first carrier<b>' + who.nm + '</b></div><div>carriers in the three generations<b>' + (noY ? 0 : total) + ' of ' + P.length + '</b></div><div style="grid-column:1/-1">' + msg + (bad ? ' <span class="warn-text">Check failed on ' + bad + ' people.</span>' : '') + '</div>';
    }
    seg2('s07-ped-mt', 's07-ped-y', function (v) { marker = v ? 'mt' : 'y'; draw(); });
    $('s07-ped-reset').addEventListener('click', function () { founder = marker === 'mt' ? 'a2' : 'a1'; draw(); });
    draw();
  })();

  /* ================= 2. relative Ne calculator ================= */
  (function nec() {
    var fig = $('s07-ne-fig'), out = $('s07-ne-out');
    if (!fig || !out) return;
    var sm = $('s07-ne-m'), sf = $('s07-ne-f');
    var presets = { 's07-ne-p1': [50, 50], 's07-ne-p2': [50, 150], 's07-ne-p3': [20, 200], 's07-ne-p4': [200, 20] };
    function calc(nm, nf) {
      var ne = 4 * nm * nf / (nm + nf);
      return { ne: ne, auto: 2 * ne, mt: nf, y: nm, ry: nm / (2 * ne), rmt: nf / (2 * ne) };
    }
    function draw() {
      var nm = +sm.value, nf = +sf.value, r = calc(nm, nf);
      $('s07-ne-mo').textContent = nm; $('s07-ne-fo').textContent = nf;
      Object.keys(presets).forEach(function (id) { var p = presets[id]; $(id).setAttribute('aria-pressed', (p[0] === nm && p[1] === nf) ? 'true' : 'false'); });
      var W = 620, H = 190, L = 90, R = 44, lo = Math.log10(0.1), hi = Math.log10(100);
      function x(v) { return L + (Math.log10(Math.max(v, 0.1)) - lo) / (hi - lo) * (W - L - R); }
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: 'min-width:520px', role: 'img', 'aria-label': 'Y and mtDNA diversity relative to the autosomes, on a logarithmic axis' });
      [0.1, 1, 10, 100].forEach(function (v) {
        el('line', { x1: x(v), x2: x(v), y1: 20, y2: 140, 'class': 'grid' }, null, svg);
        el('text', { x: x(v), y: 158, 'text-anchor': 'middle' }, String(v), svg);
      });
      el('text', { x: (L + W - R) / 2, y: 180, 'text-anchor': 'middle' }, 'diversity relative to the autosomes (log scale)', svg);
      el('line', { x1: x(0.25), x2: x(0.25), y1: 14, y2: 146, stroke: 'var(--muted)', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, null, svg);
      el('text', { x: x(0.25) + 4, y: 12, 'text-anchor': 'start' }, '1/4 (equal sexes)', svg);
      [['Y', r.ry, 'var(--het)', 40], ['mtDNA', r.rmt, 'var(--accent)', 92]].forEach(function (b) {
        el('text', { x: L - 8, y: b[3] + 18, 'text-anchor': 'end', 'class': 'lab' }, b[0], svg);
        el('rect', { x: x(0.1), y: b[3], width: Math.max(1, x(b[1]) - x(0.1)), height: 26, fill: b[2], opacity: 0.85 }, null, svg);
        var inside = x(b[1]) > W - 90;
        el('text', { x: inside ? x(b[1]) - 6 : x(b[1]) + 6, y: b[3] + 18, 'text-anchor': inside ? 'end' : 'start', 'class': 'lab', style: inside ? 'fill:var(--bg)' : '' }, fmt(b[1]), svg);
      });
      fig.innerHTML = ''; fig.appendChild(svg);
      fig.setAttribute('data-ry', r.ry); fig.setAttribute('data-rmt', r.rmt);
     
      var verdict = (nm === nf) ? 'Equal numbers: both markers sit at the textbook one-quarter.'
        : (nm < nf ? 'Fewer breeding males: the Y is lost faster (lower diversity than one-quarter) and mtDNA keeps more than one-quarter.'
          : 'Fewer breeding females: mtDNA is lost faster (lower than one-quarter) and the Y keeps more than one-quarter.');
      out.innerHTML =
        '<div><span class="tip" title="Effective size of the autosomes: the size of an ideal population that loses diversity at the same rate">autosomal N<sub>e</sub></span><b>' + fmt(r.ne) + '</b></div>' +
        '<div>N<sub>e</sub> as a share of N<sub>m</sub>+N<sub>f</sub><b>' + fmt(r.ne / (nm + nf)) + '</b></div>' +
        '<div>Y relative to autosomes<b>' + fmt(r.ry) + '</b></div>' +
        '<div>mtDNA relative to autosomes<b>' + fmt(r.rmt) + '</b></div>' +
        '<div style="grid-column:1/-1">' + verdict + '</div>';
    }
    sm.addEventListener('input', draw); sf.addEventListener('input', draw);
    Object.keys(presets).forEach(function (id) {
      $(id).addEventListener('click', function () { sm.value = presets[id][0]; sf.value = presets[id][1]; draw(); });
    });
    draw();
  })();
})();
