(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function clear(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function tip(word, text) { return '<span class="tip" title="' + text.replace(/"/g, '&quot;') + '">' + word + '</span>'; }

  // =====================================================================
  // (a) windows: 2500 bp every 2000 bp; which window holds the whole copy?
  // =====================================================================
  (function () {
    var svg = $('s02-win-svg'), pos = $('s02-win-pos'), len = $('s02-win-len'), out = $('s02-win-out');
    if (!svg || !pos || !len || !out) return;
    var G = 10000, W = 2500, STEP = 2000, X0 = 30, X1 = 880;
    var sx = function (bp) { return X0 + (X1 - X0) * bp / G; };
    var wins = [];
    for (var s = 0; s < G; s += STEP) { var e = Math.min(s + W, G); wins.push([s, e]); if (e === G) break; }

    function draw() {
      var L = +len.value, P = +pos.value;
      if (P + L > G) { P = G - L; pos.value = P; }
      $('s02-win-posv').textContent = fmt(P);
      $('s02-win-lenv').textContent = fmt(L);
      var need = Math.ceil(0.8 * L);
      clear(svg);
      // axis
      el('line', { x1: X0, x2: X1, y1: 160, y2: 160, 'class': 'ax' }, svg);
      for (var t = 0; t <= G; t += 1000) {
        el('line', { x1: sx(t), x2: sx(t), y1: 160, y2: 165, 'class': 'ax' }, svg);
        el('text', { x: sx(t), y: 180, 'text-anchor': 'middle' }, svg, (t / 1000) + ' kb');
      }
      var pieces = [];
      wins.forEach(function (w, i) {
        var a = Math.max(w[0], P), b = Math.min(w[1], P + L), piece = Math.max(0, b - a);
        var whole = piece === L, pass = piece >= need;
        var col = whole ? 'var(--good)' : (piece > 0 ? (pass ? 'var(--het)' : 'var(--bad)') : 'var(--line)');
        var y = 18 + (i % 2) * 34;
        el('rect', { x: sx(w[0]), y: y, width: sx(w[1]) - sx(w[0]), height: 22, rx: 3,
          style: 'fill:' + (piece > 0 ? col : 'var(--panel)') + ';fill-opacity:' + (piece > 0 ? 0.28 : 1) + ';stroke:' + col + ';stroke-width:' + (piece > 0 ? 2 : 1) }, svg);
        el('text', { x: sx(w[0]) + 6, y: y + 15, 'class': 'lab' }, svg, 'window ' + (i + 1));
        if (piece > 0) pieces.push({ i: i + 1, a: a, b: b, piece: piece, whole: whole, pass: pass });
      });
      // the copy
      el('rect', { x: sx(P), y: 112, width: Math.max(2, sx(P + L) - sx(P)), height: 18, rx: 2, style: 'fill:var(--rep)' }, svg);
      el('text', { x: sx(P) + (sx(P + L) - sx(P)) / 2, y: 106, 'text-anchor': 'middle', 'class': 'lab' }, svg, 'copy, ' + L + ' bp');
      // overlap shading lines
      wins.forEach(function (w) { el('line', { x1: sx(w[0]), x2: sx(w[0]), y1: 92, y2: 160, 'class': 'grid' }, svg); });

      var whole = pieces.filter(function (p) { return p.whole; });
      var txt;
      if (whole.length) {
        txt = '<b>Found whole.</b> Window ' + whole.map(function (p) { return p.i; }).join(' and ') + ' contain' + (whole.length === 1 ? 's' : '') +
          ' the entire ' + L + '-bp copy, so its alignment can cover the full length and passes the length rule (at least ' + need + ' bp = 0.8 × ' + L + ').';
        if (L <= 500) txt += ' Any copy up to 500 bp, the overlap of two windows, is always whole in some window.';
      } else {
        var pass = pieces.filter(function (p) { return p.pass; });
        txt = '<b>No window holds the whole copy.</b> Pieces: ' + pieces.map(function (p) { return p.piece + ' bp in window ' + p.i; }).join(', ') +
          '. A piece must reach ' + need + ' bp (0.8 × ' + L + ') inside its own window. ';
        if (pass.length) {
          var a = Math.min.apply(null, pass.map(function (p) { return p.a; })), b = Math.max.apply(null, pass.map(function (p) { return p.b; }));
          txt += 'The piece' + (pass.length > 1 ? 's' : '') + ' in window ' + pass.map(function (p) { return p.i; }).join(' and ') +
            ' pass' + (pass.length > 1 ? '' : 'es') + ', so the copy is found, but the reported locus spans ' + (b - a) + ' of its ' + L + ' bp.';
        } else {
          txt += 'No piece passes: <b>this copy is lost</b> at this position. Copies longer than 833 bp can fall like this; SINEs are shorter.';
        }
      }
      out.innerHTML = txt;
    }
    pos.addEventListener('input', draw);
    len.addEventListener('input', draw);
    draw();
  })();

  // =====================================================================
  // (b) toy genome search: Smith-Waterman vs seeds, threshold, rules
  // =====================================================================
  (function () {
    var gsvg = $('s02-gen-svg'), ssvg = $('s02-sc-svg'), thr = $('s02-thr'), out = $('s02-out'), tab = $('s02-tab');
    if (!gsvg || !ssvg || !thr || !out || !tab) return;
    var tbody = tab.querySelector('tbody');

    function rng(seed) {
      var a = seed >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        var t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    var B = 'ACGT', COMP = { A: 'T', C: 'G', G: 'C', T: 'A' };
    function rc(s) { var o = ''; for (var i = s.length - 1; i >= 0; i--) o += COMP[s[i]]; return o; }
    function randSeq(r, n) { var s = ''; for (var i = 0; i < n; i++) { var x = r(); s += x < 0.29 ? 'A' : x < 0.5 ? 'C' : x < 0.71 ? 'G' : 'T'; } return s; }

    var G = 12000, CL = 150, WIN = 420, STEP = 250, NSHUF = 3;
    var MATCH = 5, MIS = -4, GOPEN = 16, GEXT = 4; // gap of k bases costs 12 + 4k
    var NEED_LEN = Math.ceil(0.8 * CL);
    // copies: [fraction of positions mutated, fraction kept (5' truncation), strand]
    var SPEC = [[0.02, 1, '+'], [0.38, 1, '-'], [0.10, 0.55, '+'], [0.05, 1, '-'], [0.26, 1, '+'], [0.08, 1, '+'],
      [0.20, 0.4, '-'], [0.45, 1, '+'], [0.12, 1, '-'], [0.06, 0.3, '+'], [0.18, 1, '+'], [0.30, 0.7, '+'], [0.15, 1, '-'], [0.52, 1, '-']];

    // affine-gap Smith-Waterman (Gotoh); returns score and, if trace, window coordinates and identity
    function sw(q, t, trace) {
      var m = q.length, n = t.length, W1 = n + 1, i, j;
      var H = new Int32Array((m + 1) * W1), E = new Int32Array((m + 1) * W1), F = new Int32Array((m + 1) * W1);
      var NEG = -1e8, best = 0, bi = 0, bj = 0;
      for (j = 0; j <= n; j++) { E[j] = NEG; F[j] = NEG; }
      for (i = 1; i <= m; i++) {
        var qi = q.charCodeAt(i - 1), row = i * W1, prow = row - W1;
        E[row] = NEG; F[row] = NEG;
        for (j = 1; j <= n; j++) {
          var e = Math.max(H[row + j - 1] - GOPEN, E[row + j - 1] - GEXT);
          var f = Math.max(H[prow + j] - GOPEN, F[prow + j] - GEXT);
          var d = H[prow + j - 1] + (qi === t.charCodeAt(j - 1) ? MATCH : MIS);
          var h = d; if (e > h) h = e; if (f > h) h = f; if (h < 0) h = 0;
          H[row + j] = h; E[row + j] = e; F[row + j] = f;
          if (h > best) { best = h; bi = i; bj = j; }
        }
      }
      if (!trace || best === 0) return { score: best };
      i = bi; j = bj;
      var st = 'H', cols = 0, mt = 0;
      while (i > 0 && j > 0) {
        var k = i * W1 + j;
        if (st === 'H') {
          if (H[k] === 0) break;
          var dd = H[k - W1 - 1] + (q.charCodeAt(i - 1) === t.charCodeAt(j - 1) ? MATCH : MIS);
          if (H[k] === dd) { cols++; if (q[i - 1] === t[j - 1]) mt++; i--; j--; }
          else if (H[k] === E[k]) st = 'E';
          else st = 'F';
        } else if (st === 'E') {
          cols++; st = (E[k] === H[k - 1] - GOPEN) ? 'H' : 'E'; j--;
        } else {
          cols++; st = (F[k] === H[k - W1] - GOPEN) ? 'H' : 'F'; i--;
        }
      }
      return { score: best, tStart: j, tEnd: bj, ident: cols ? 100 * mt / cols : 0 };
    }
    function shuffle(r, s) { var a = s.split(''); for (var i = a.length - 1; i > 0; i--) { var k = Math.floor(r() * (i + 1)); var x = a[i]; a[i] = a[k]; a[k] = x; } return a.join(''); }
    function kmers(s, k) { var o = {}; for (var i = 0; i + k <= s.length; i++) o[s.substr(i, k)] = 1; return o; }

    // the copy that an interval belongs to: at least half of the interval lies on that copy
    function owner(copies, a, b) {
      var best = null, bo = 0;
      copies.forEach(function (c) { var ov = Math.min(c.end, b) - Math.max(c.start, a); if (ov > bo) { bo = ov; best = c; } });
      return (b > a && bo >= 0.5 * (b - a)) ? best : null;
    }
    var M; // model
    function build(seed) {
      var r = rng(seed);
      var cons = randSeq(r, CL), consRC = rc(cons);
      var g = randSeq(r, G).split('');
      var slot = G / SPEC.length, copies = [];
      SPEC.forEach(function (sp, idx) {
        var muts = 0, s = '';
        for (var i = 0; i < CL; i++) {
          var c = cons[i];
          if (r() < sp[0]) {
            muts++;
            var x = r();
            if (x < 0.85) { var nb; do { nb = B[Math.floor(r() * 4)]; } while (nb === c); s += nb; }
            else if (x < 0.925) { /* deletion */ }
            else { s += c + randSeq(r, 1 + Math.floor(r() * 2)); }
          } else s += c;
        }
        var keep = Math.round(s.length * sp[1]);
        s = s.substr(s.length - keep);
        if (sp[2] === '-') s = rc(s);
        var start = Math.round(idx * slot + 70 + r() * (slot - 140 - s.length));
        for (var p = 0; p < s.length; p++) g[start + p] = s[p];
        copies.push({ n: idx + 1, div: muts / CL, keep: sp[1], strand: sp[2], start: start, end: start + s.length, len: s.length });
      });
      g = g.join('');
      var seeds = { 11: kmers(cons, 11), 28: kmers(cons, 28) };
      var s11rc = kmers(consRC, 11), s28rc = kmers(consRC, 28), k;
      for (k in s11rc) seeds[11][k] = 1;
      for (k in s28rc) seeds[28][k] = 1;
      var wins = [], nulls = [];
      for (var ws = 0; ws < G; ws += STEP) {
        var we = Math.min(ws + WIN, G), t = g.substring(ws, we);
        var a = sw(cons, t, true), b = sw(consRC, t, true), h = a.score >= b.score ? a : b;
        h.strand = a.score >= b.score ? '+' : '-';
        h.gs = ws + (h.tStart || 0); h.ge = ws + (h.tEnd || 0); h.alen = h.ge - h.gs;
        var sd = {};
        [11, 28].forEach(function (kk) {
          var hit = false;
          for (var i = 0; i + kk <= t.length && !hit; i++) if (seeds[kk][t.substr(i, kk)]) hit = true;
          sd[kk] = hit;
        });
        h.seed = sd; h.ws = ws; h.we = we;
        // which copy does this hit belong to?
        h.copy = owner(copies, h.gs, h.ge);
        wins.push(h);
        for (var z = 0; z < NSHUF; z++) {
          var sh = shuffle(r, t);
          nulls.push(Math.max(sw(cons, sh, false).score, sw(consRC, sh, false).score));
        }
        if (we === G) break;
      }
      M = { copies: copies, wins: wins, nulls: nulls, maxNull: Math.max.apply(null, nulls) };
    }

    var state = { idRule: false, lenRule: false, meth: 'sw' };
    var seedNo = 7;

    function sxScore(v) { // square-root axis so that low scores are readable
      var X0 = 150, X1 = 935, MAXS = 800;
      return X0 + (X1 - X0) * Math.sqrt(Math.min(v, MAXS) / MAXS);
    }

    function evaluate() {
      var T = +thr.value, k = state.meth === 'sw' ? 0 : +state.meth;
      $('s02-thr-v').textContent = T;
      var res = M.wins.map(function (h) {
        var why = null;
        if (k && !h.seed[k]) why = 'seed';
        else if (h.score < T) why = 'score';
        else if (state.idRule && h.ident < 65) why = 'id';
        else if (state.lenRule && h.alen < NEED_LEN) why = 'len';
        return { h: h, pass: !why, why: why };
      });
      // merge passing hits (same strand, overlapping) into loci
      var pass = res.filter(function (x) { return x.pass; }).map(function (x) { return x.h; }).sort(function (a, b) { return a.gs - b.gs; });
      var loci = [];
      pass.forEach(function (h) {
        var last = loci[loci.length - 1];
        if (last && last.strand === h.strand && h.gs <= last.ge) { last.ge = Math.max(last.ge, h.ge); last.score = Math.max(last.score, h.score); }
        else loci.push({ gs: h.gs, ge: h.ge, strand: h.strand, score: h.score });
      });
      loci.forEach(function (L) { L.copy = owner(M.copies, L.gs, L.ge); });
      // per copy status
      var order = { seed: 0, score: 1, id: 2, len: 3 };
      M.copies.forEach(function (c) {
        var mine = res.filter(function (x) { return x.h.copy === c; });
        var best = null;
        mine.forEach(function (x) { if (!best || x.h.score > best.h.score) best = x; });
        c.best = best ? best.h : null;
        c.found = loci.some(function (L) { return L.copy === c; });
        if (c.found) c.why = null;
        else if (!mine.length) c.why = 'score';
        else {
          // the "furthest" any window got
          var far = mine.slice().sort(function (a, b) { return order[b.why] - order[a.why] || b.h.score - a.h.score; })[0];
          c.why = far.why;
        }
      });
      var falses = loci.filter(function (L) { return !L.copy; });
      var chance = M.nulls.filter(function (v) { return v >= T; }).length / NSHUF;
      var aligned = k ? M.wins.filter(function (h) { return h.seed[k]; }).length : M.wins.length;
      return { T: T, k: k, res: res, loci: loci, falses: falses, chance: chance, aligned: aligned };
    }

    function drawGenome(E) {
      clear(gsvg);
      var X0 = 20, X1 = 940, sx = function (bp) { return X0 + (X1 - X0) * bp / G; };
      el('line', { x1: X0, x2: X1, y1: 80, y2: 80, style: 'stroke:var(--muted);stroke-width:1.5' }, gsvg);
      for (var t = 0; t <= G; t += 1000) {
        el('line', { x1: sx(t), x2: sx(t), y1: 118, y2: 123, 'class': 'ax' }, gsvg);
        el('text', { x: sx(t), y: 138, 'text-anchor': 'middle' }, gsvg, (t / 1000) + ' kb');
      }
      el('line', { x1: X0, x2: X1, y1: 118, y2: 118, 'class': 'ax' }, gsvg);
      M.copies.forEach(function (c) {
        var col = c.found ? 'var(--good)' : (c.why === 'id' || c.why === 'len') ? 'var(--het)' : 'var(--bad)';
        var filled = c.found || c.why === 'id' || c.why === 'len';
        var x = sx(c.start), w = Math.max(3, sx(c.end) - sx(c.start));
        var r = el('rect', { x: x, y: 71, width: w, height: 18, rx: 2,
          style: 'fill:' + (filled ? col : 'var(--panel)') + ';stroke:' + col + ';stroke-width:2' }, gsvg);
        el('title', {}, r, 'copy ' + c.n + ': ' + Math.round(c.div * 100) + ' % mutated, ' + c.len + ' bp, ' + c.strand + ' strand');
        el('text', { x: x + w / 2, y: 46, 'text-anchor': 'middle', 'class': 'lab' }, gsvg, '#' + c.n);
        el('text', { x: x + w / 2, y: 62, 'text-anchor': 'middle' }, gsvg, Math.round(c.div * 100) + '%');
      });
      E.falses.forEach(function (L) {
        var x = sx((L.gs + L.ge) / 2);
        el('path', { d: 'M' + (x - 6) + ' 108 L' + (x + 6) + ' 108 L' + x + ' 96 Z', style: 'fill:var(--bad)' }, gsvg);
      });
      el('text', { x: X0, y: 16, 'class': 'lab' }, gsvg, 'toy genome, 12 kb: copy number, % of positions mutated; width = copy length');
    }

    function drawScores(E) {
      clear(ssvg);
      var X0 = 150, X1 = 935, base = 200;
      // axis
      el('line', { x1: X0, x2: X1, y1: base, y2: base, 'class': 'ax' }, ssvg);
      [0, 10, 25, 50, 100, 200, 400, 800].forEach(function (v) {
        var x = sxScore(v);
        el('line', { x1: x, x2: x, y1: base, y2: base + 5, 'class': 'ax' }, ssvg);
        el('line', { x1: x, x2: x, y1: 28, y2: base, 'class': 'grid' }, ssvg);
        el('text', { x: x, y: base + 18, 'text-anchor': 'middle' }, ssvg, v);
      });
      el('text', { x: X1, y: base + 30, 'text-anchor': 'end' }, ssvg, 'Smith-Waterman score (square-root scale)');
      // lanes
      el('text', { x: 8, y: 64, 'class': 'lab' }, ssvg, 'real copies');
      el('text', { x: 8, y: 112, 'class': 'lab' }, ssvg, 'windows, no copy');
      el('text', { x: 8, y: 166, 'class': 'lab' }, ssvg, 'shuffled windows');
      el('text', { x: 8, y: 180 }, ssvg, '(chance)');
      // null histogram, bins of 5
      var bins = {}, maxc = 0;
      M.nulls.forEach(function (v) { var b = Math.floor(v / 5) * 5; bins[b] = (bins[b] || 0) + 1; if (bins[b] > maxc) maxc = bins[b]; });
      Object.keys(bins).forEach(function (b) {
        b = +b;
        var x0 = sxScore(b), x1 = sxScore(b + 5), hgt = 52 * bins[b] / maxc;
        el('rect', { x: x0, y: base - hgt, width: Math.max(1, x1 - x0 - 0.5), height: hgt, style: 'fill:var(--err)' }, ssvg);
      });
      // windows without a copy: best score (background)
      E.res.forEach(function (x) {
        if (x.h.copy) return;
        var touched = M.copies.some(function (c) { return Math.min(c.end, x.h.we) - Math.max(c.start, x.h.ws) > 0; });
        if (touched) return; // windows that contain part of a copy are shown via the copy
        var cx = sxScore(x.h.score);
        el('circle', { cx: cx, cy: 108, r: 3.5, style: x.pass ? 'fill:var(--bad)' : 'fill:none;stroke:var(--muted);stroke-width:1' }, ssvg);
      });
      // copies
      var placed = [];
      M.copies.slice().sort(function (a, b) { return (a.best ? a.best.score : 0) - (b.best ? b.best.score : 0); }).forEach(function (c) {
        var v = c.best ? c.best.score : 0, cx = sxScore(v);
        var col = c.found ? 'var(--good)' : (c.why === 'id' || c.why === 'len') ? 'var(--het)' : 'var(--bad)';
        var filled = c.found || c.why === 'id' || c.why === 'len';
        var lane = 0; while (placed.some(function (p) { return p.lane === lane && Math.abs(p.x - cx) < 15; })) lane++;
        placed.push({ x: cx, lane: lane });
        var cy = 70 - lane * 15;
        el('circle', { cx: cx, cy: cy, r: 5, style: 'fill:' + (filled ? col : 'var(--panel)') + ';stroke:' + col + ';stroke-width:2' }, ssvg);
        el('text', { x: cx + 7, y: cy + 4 }, ssvg, c.n);
      });
      // threshold
      var tx = sxScore(E.T);
      el('line', { x1: tx, x2: tx, y1: 14, y2: base, style: 'stroke:var(--accent);stroke-width:2' }, ssvg);
      el('text', { x: tx + (tx > 800 ? -5 : 5), y: 14, 'text-anchor': tx > 800 ? 'end' : 'start', 'class': 'lab' }, ssvg, 'threshold ' + E.T);
    }

    function render() {
      var E = evaluate();
      drawGenome(E);
      drawScores(E);
      var found = M.copies.filter(function (c) { return c.found; });
      var full = found.filter(function (c) { return c.keep >= 0.8; }).length;
      var lost = M.copies.length - found.length;
      var tLoc = tip('loci', 'Locus: one interval of the genome reported as a hit after overlapping hits are merged. This is what a copy count counts.');
      var tFalse = tip('false hits', 'False hit: a reported locus where the toy genome has no SINE copy, only random DNA that happened to score above the threshold.');
      var tCh = tip('expected by chance', 'Counted from the shuffled windows: how many shuffled windows score at or above the threshold, divided by the 3 shuffles per window. This is the idea behind ssearch36 -z 11.');
      var html = '<div><b>' + E.loci.length + '</b>' + tLoc + ' reported (the copy count)</div>' +
        '<div><b>' + found.length + ' of ' + M.copies.length + '</b>real copies found: ' + full + ' full-length, ' + (found.length - full) + ' partial</div>' +
        '<div><b>' + lost + '</b>real copies missed or dropped</div>' +
        '<div><b>' + E.falses.length + '</b>' + tFalse + ' (no copy there); ' + E.chance.toFixed(1) + ' ' + tCh + ' on score alone at this threshold</div>';
      if (E.k) html += '<div><b>' + E.aligned + ' of ' + M.wins.length + '</b>windows aligned at all: only those sharing an exact ' +
        tip('word', 'Word (seed): a run of identical bases shared by the consensus (either strand) and the window. Without one, a seed-based program never aligns the window.') +
        ' of ' + E.k + ' bases with the consensus</div>';
      out.innerHTML = html;
      // table
      var rows = '';
      M.copies.forEach(function (c) {
        var res;
        if (c.found) res = '<span style="color:var(--good)">found</span>' + (c.keep < 0.8 ? ' (partial copy)' : '');
        else if (c.why === 'seed') res = '<span style="color:var(--bad)">missed:</span> no shared word of ' + E.k + ' bases, never aligned';
        else if (c.why === 'score') res = '<span style="color:var(--bad)">missed:</span> score below threshold';
        else if (c.why === 'id') res = '<span style="color:var(--het)">dropped:</span> identity below 65 %';
        else res = '<span style="color:var(--het)">dropped:</span> alignment shorter than ' + NEED_LEN + ' bp (0.8 × ' + CL + ')';
        rows += '<tr><td>#' + c.n + '</td><td>' + Math.round(c.div * 100) + ' %</td><td>' + c.len + ' bp' + (c.keep < 1 ? ' (' + Math.round(c.keep * 100) + ' % kept)' : '') +
          '</td><td>' + c.strand + '</td><td>' + (c.best ? c.best.score : '-') + '</td><td>' + (c.best ? c.best.ident.toFixed(0) + ' %' : '-') + '</td><td>' + res + '</td></tr>';
      });
      tbody.innerHTML = rows;
    }

    function setup(seed) {
      build(seed);
      thr.value = Math.ceil((M.maxNull + 1) / 5) * 5;
      render();
    }

    var leg = $('s02-leg');
    if (leg) leg.innerHTML = '<span><i style="background:var(--good);height:10px"></i>copy found</span>' +
      '<span><i style="background:var(--het);height:10px"></i>copy aligned but dropped by a rule</span>' +
      '<span><i style="border:2px solid var(--bad);height:8px;width:8px;background:transparent"></i>copy missed</span>' +
      '<span><i style="background:var(--bad);height:10px"></i>false hit</span>' +
      '<span><i style="background:var(--err);height:10px"></i>shuffled windows (chance scores)</span>';

    thr.addEventListener('input', render);
    Array.prototype.forEach.call(document.querySelectorAll('#s02-rules button'), function (b) {
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (b.getAttribute('data-r') === 'id') state.idRule = on; else state.lenRule = on;
        render();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('#s02-meth button'), function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(document.querySelectorAll('#s02-meth button'), function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        state.meth = b.getAttribute('data-m');
        render();
      });
    });
    $('s02-new').addEventListener('click', function () { seedNo = (seedNo * 7919 + 13) % 100003; setup(seedNo); });
    setup(seedNo);
  })();
})();
