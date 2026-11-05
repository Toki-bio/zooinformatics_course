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
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  // =====================================================================
  // The algorithms. The figures below draw these same functions, and the
  // check at the end of the section compares these same functions with
  // JavaScript's own indexOf.
  // =====================================================================

  // Every position of P in T, overlapping ones included, found with indexOf.
  function allIndexOf(T, P) {
    var r = [], i = T.indexOf(P);
    while (i !== -1) { r.push(i); i = T.indexOf(P, i + 1); }
    return r;
  }

  // Naive scan: every alignment, compared from the left.
  function naive(T, P) {
    var ev = [], hits = [], n = T.length, m = P.length;
    for (var a = 0; a + m <= n; a++) {
      var j = 0;
      while (j < m) {
        var ok = T[a + j] === P[j];
        ev.push({ a: a, j: j, t: a + j, ok: ok });
        if (!ok) break;
        j++;
      }
      var e = ev[ev.length - 1];
      if (j === m) { hits.push(a); e.hit = true; e.why = 'whole pattern matched; move on by 1'; }
      else e.why = 'mismatch; move on by 1';
    }
    return { ev: ev, hits: hits };
  }

  // Boyer-Moore tables, built straight from the definitions in the 1977 paper:
  // last[c] gives the bad-letter jump, good[j] the good-suffix jump (the shift to
  // the rightmost plausible reoccurrence of the matched tail), period the shift
  // after a whole match, used here because we want every occurrence.
  function bmTables(P) {
    var m = P.length, last = Object.create(null), good = [], i, j, s, p, ok;
    for (i = 0; i < m; i++) last[P[i]] = i;
    for (j = 0; j < m; j++) {
      for (s = 1; s <= m; s++) {
        ok = true;
        for (p = j + 1; p < m; p++) if (p - s >= 0 && P[p - s] !== P[p]) { ok = false; break; }
        if (ok && j - s >= 0 && P[j - s] === P[j]) ok = false;
        if (ok) { good[j] = s; break; }
      }
    }
    var period = m;
    for (s = 1; s < m; s++) {
      ok = true;
      for (p = s; p < m; p++) if (P[p - s] !== P[p]) { ok = false; break; }
      if (ok) { period = s; break; }
    }
    return { last: last, good: good, period: period };
  }

  function boyerMoore(T, P) {
    var ev = [], hits = [], n = T.length, m = P.length, tb = bmTables(P), a = 0;
    while (a + m <= n) {
      var j = m - 1, e;
      while (j >= 0) {
        var ok = T[a + j] === P[j];
        e = { a: a, j: j, t: a + j, ok: ok };
        ev.push(e);
        if (!ok) break;
        j--;
      }
      var shift;
      if (j < 0) {
        hits.push(a); e.hit = true; shift = tb.period;
        e.why = 'whole pattern matched; jump ' + shift;
      } else {
        var c = T[a + j], l = tb.last[c] === undefined ? -1 : tb.last[c];
        var bad = j - l, g = tb.good[j];
        shift = Math.max(1, bad, g);
        if (bad >= g && bad >= 1) {
          e.why = l < 0 ? 'letter ' + c + ' is not in the pattern at all; jump ' + shift + ' past it'
                        : 'bad-letter rule: line up the nearest ' + c + ' of the pattern; jump ' + shift;
        } else {
          e.why = 'good-suffix rule: the ' + plural(m - 1 - j, 'matched letter') + ' can only line up again ' + shift + ' further on';
        }
      }
      a += shift;
    }
    return { ev: ev, hits: hits };
  }

  // Aho-Corasick: goto = trie edges, fail = failure links, out = words ending in a state.
  // States are numbered in the order they are created, as in the 1975 paper.
  function acBuild(words) {
    var st = [{ next: Object.create(null), fail: 0, out: [], depth: 0, parent: -1, ch: '' }], i, c;
    words.forEach(function (w) {
      var s = 0;
      for (i = 0; i < w.length; i++) {
        c = w[i];
        if (st[s].next[c] === undefined) {
          st.push({ next: Object.create(null), fail: 0, out: [], depth: st[s].depth + 1, parent: s, ch: c });
          st[s].next[c] = st.length - 1;
        }
        s = st[s].next[c];
      }
      if (st[s].out.indexOf(w) < 0) st[s].out.push(w);
    });
    var q = [];
    for (c in st[0].next) q.push(st[0].next[c]);
    while (q.length) {
      var r = q.shift();
      for (c in st[r].next) {
        var u = st[r].next[c], f = st[r].fail;
        q.push(u);
        while (f !== 0 && st[f].next[c] === undefined) f = st[f].fail;
        st[u].fail = st[f].next[c] !== undefined && st[f].next[c] !== u ? st[f].next[c] : 0;
        st[st[u].fail].out.forEach(function (w) { if (st[u].out.indexOf(w) < 0) st[u].out.push(w); });
      }
    }
    return st;
  }

  function acRun(st, T) {
    var s = 0, steps = [];
    for (var i = 0; i < T.length; i++) {
      var c = T[i], from = s, hops = [];
      while (s !== 0 && st[s].next[c] === undefined) { s = st[s].fail; hops.push(s); }
      var moved = st[s].next[c] !== undefined;
      if (moved) s = st[s].next[c];
      steps.push({ i: i, c: c, from: from, hops: hops, moved: moved, to: s, out: st[s].out.slice() });
    }
    return steps;
  }

  // Small seeded random generator, so the check gives the same answer every time.
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randStr(r, alpha, len) {
    var s = '';
    for (var i = 0; i < len; i++) s += alpha[Math.floor(r() * alpha.length)];
    return s;
  }
  function same(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  // =====================================================================
  // (a) naive scan and Boyer-Moore, step by step
  // =====================================================================
  (function () {
    var tool = $('s03-bm-tool');
    if (!tool) return;
    var presets = {
      dna: { t: 'TTGACCTAGGCATTCGAACTGGATCTTAGCCAATGCTTAGGATACCGTTAGCTAAGGCTA', p: 'GGATACCG' },
      eng: { t: 'WHICH-FINALLY-HALTS.--AT-THAT-POINT', p: 'AT-THAT' },
      polya: { t: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', p: 'AAAAAA' }
    };
    var tIn = $('s03-bm-text'), pIn = $('s03-bm-pat'), k = 0, N, B, T, P;
    var CW = 15, X0 = 4;

    function panel(svg, box, tr) {
      clear(svg);
      var n = T.length, m = P.length, W = X0 * 2 + n * CW, H = 62;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.style.minWidth = Math.max(300, Math.round(n * 12.5)) + 'px';
      var done = Math.min(k, tr.ev.length), cur = done ? tr.ev[done - 1] : null;
      var seen = {}, marks = {}, i, hitsNow = [];
      for (i = 0; i < done; i++) {
        var e = tr.ev[i];
        seen[e.t] = e.ok ? 1 : 2;
        if (e.hit) hitsNow.push(e.a);
        if (cur && e.a === cur.a) marks[e.j] = e.ok ? 1 : 2;
      }
      for (i = 0; i < n; i++) {
        var x = X0 + i * CW, s = seen[i];
        el('rect', { x: x, y: 3, width: CW - 1, height: 20, rx: 2,
          style: 'fill:' + (s ? 'var(--code-bg)' : 'var(--panel)') + ';stroke:var(--line)' }, svg);
        el('text', { x: x + (CW - 1) / 2, y: 17, 'text-anchor': 'middle',
          style: 'font-size:11.5px;fill:' + (s ? 'var(--fg)' : 'var(--muted)') + (s ? ';font-weight:600' : '') }, svg, T[i]);
      }
      hitsNow.forEach(function (a) {
        el('rect', { x: X0 + a * CW, y: 24, width: m * CW - 1, height: 3, style: 'fill:var(--good)' }, svg);
      });
      var a0 = cur ? cur.a : 0;
      for (i = 0; i < m; i++) {
        var px = X0 + (a0 + i) * CW, mk = marks[i];
        el('rect', { x: px, y: 31, width: CW - 1, height: 20, rx: 2,
          style: 'fill:' + (mk === 1 ? 'var(--good)' : mk === 2 ? 'var(--bad)' : 'var(--panel)') +
            ';fill-opacity:' + (mk ? 0.3 : 1) + ';stroke:' + (mk === 1 ? 'var(--good)' : mk === 2 ? 'var(--bad)' : 'var(--accent)') }, svg);
        el('text', { x: px + (CW - 1) / 2, y: 45, 'text-anchor': 'middle', style: 'font-size:11.5px;fill:var(--fg)' }, svg, P[i]);
      }
      // keep the pattern in view when the figure scrolls on a phone
      var scale = svg.getBoundingClientRect().width / W;
      if (box.scrollWidth > box.clientWidth) box.scrollLeft = Math.max(0, (X0 + a0 * CW) * scale - box.clientWidth / 3);
    }

    function draw() {
      panel($('s03-bm-svgN'), $('s03-bm-boxN'), N);
      panel($('s03-bm-svgB'), $('s03-bm-boxB'), B);
      var kN = Math.min(k, N.ev.length), kB = Math.min(k, B.ev.length), seen = {}, i;
      for (i = 0; i < kB; i++) seen[B.ev[i].t] = 1;
      var hitsB = 0; for (i = 0; i < kB; i++) if (B.ev[i].hit) hitsB++;
      $('s03-bm-cN').textContent = fmt(kN) + (kN === N.ev.length ? ' (finished)' : '');
      $('s03-bm-cB').textContent = fmt(kB) + (kB === B.ev.length ? ' (finished)' : '');
      $('s03-bm-skip').textContent = fmt(T.length - Object.keys(seen).length) + ' of ' + fmt(T.length);
      $('s03-bm-hits').textContent = hitsB + (N.hits.length !== hitsB ? ' so far' : '');
      function line(name, tr, kk) {
        if (!kk) return '<b>' + name + ':</b> press Step.';
        var e = tr.ev[kk - 1], cmp = 'text ' + esc(T[e.t]) + ' against pattern ' + esc(P[e.j]);
        var txt = '<b>' + name + ':</b> ' + cmp + (e.ok ? ', same' : ', different');
        if (e.why) txt += '. ' + esc(e.why[0].toUpperCase() + e.why.slice(1));
        if (kk === tr.ev.length) txt += '. Nothing left to compare.';
        return txt + '.';
      }
      $('s03-bm-out').innerHTML = (N.ev.length || B.ev.length)
        ? line('Naive scan', N, kN).replace(/\.\.$/, '.') + '<br>' + line('Boyer-Moore', B, kB).replace(/\.\.$/, '.')
        : 'The pattern is longer than the text, so there is nothing to compare.';
    }

    function load() {
      T = tIn.value.replace(/\s/g, '');
      P = pIn.value.replace(/\s/g, '');
      if (!T || !P) { $('s03-bm-out').textContent = 'Type a text and a pattern.'; return; }
      N = naive(T, P); B = boyerMoore(T, P); k = 0;
      draw();
    }
    function press(id) {
      Array.prototype.forEach.call(tool.querySelectorAll('.seg button'), function (b) {
        b.setAttribute('aria-pressed', b.id === id ? 'true' : 'false');
      });
    }
    ['dna', 'eng', 'polya'].forEach(function (name) {
      $('s03-bm-' + name).addEventListener('click', function () {
        tIn.value = presets[name].t; pIn.value = presets[name].p;
        press('s03-bm-' + name); load();
      });
    });
    [tIn, pIn].forEach(function (i) { i.addEventListener('input', function () { press(''); load(); }); });
    $('s03-bm-step').addEventListener('click', function () {
      if (!N) return;
      if (k < Math.max(N.ev.length, B.ev.length)) k++;
      draw();
    });
    $('s03-bm-end').addEventListener('click', function () {
      if (!N) return;
      k = Math.max(N.ev.length, B.ev.length); draw();
    });
    $('s03-bm-reset').addEventListener('click', function () { if (N) { k = 0; draw(); } });
    tIn.value = presets.dna.t; pIn.value = presets.dna.p;
    load();
  })();

  // =====================================================================
  // (b) Aho-Corasick: the machine and a walk through the text
  // =====================================================================
  (function () {
    var tool = $('s03-ac-tool');
    if (!tool) return;
    var presets = {
      dna: { w: 'GATC, ATCG, TCG, CGA', t: 'TGATCGTCGATT' },
      paper: { w: 'he, she, his, hers', t: 'ushers' }
    };
    var wIn = $('s03-ac-words'), tIn = $('s03-ac-text'), svg = $('s03-ac-svg');
    var st, steps, k = 0, T, pos = [], H = 200;

    function layout() {
      var leaf = 0, maxd = 0;
      pos = [];
      function walk(s) {
        var kids = Object.keys(st[s].next).sort().map(function (c) { return st[s].next[c]; });
        maxd = Math.max(maxd, st[s].depth);
        if (!kids.length) { pos[s] = { y: leaf++ }; return; }
        kids.forEach(walk);
        pos[s] = { y: (pos[kids[0]].y + pos[kids[kids.length - 1]].y) / 2 };
      }
      walk(0);
      var colW = Math.min(104, 600 / Math.max(1, maxd)), rowH = 56;
      H = Math.max(120, leaf * rowH + 34);
      st.forEach(function (n, i) {
        pos[i].x = 30 + n.depth * colW;
        pos[i].y = 42 + pos[i].y * rowH;
      });
    }

    function draw() {
      clear(svg);
      var done = k ? steps[k - 1] : null, cur = done ? done.to : 0, hop = {};
      if (done) { hop[done.from] = 1; done.hops.forEach(function (s) { hop[s] = 1; }); }
      var W = 740, R = 13;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var defs = el('defs', {}, svg);
      var mk = el('marker', { id: 's03-ac-arrow', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 8, markerHeight: 8, markerUnits: 'userSpaceOnUse', orient: 'auto' }, defs);
      el('path', { d: 'M0 0 L8 4 L0 8 z', style: 'fill:var(--het)' }, mk);
      // goto edges
      st.forEach(function (n, i) {
        if (n.parent < 0) return;
        var a = pos[n.parent], b = pos[i];
        el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, style: 'stroke:var(--muted);stroke-width:1.3' }, svg);
      });
      // failure links; those that lead to the root are not drawn
      st.forEach(function (n, i) {
        if (i === 0 || n.fail === 0) return;
        var a = pos[i], b = pos[n.fail], dx = b.x - a.x, dy = b.y - a.y, L = Math.sqrt(dx * dx + dy * dy) || 1;
        var ux = dx / L, uy = dy / L, sign = dx <= 0 ? 1 : -1;
        var mx = (a.x + b.x) / 2 - uy * 26 * sign, my = (a.y + b.y) / 2 + ux * 26 * sign;
        var sx = a.x + ux * R, sy = a.y + uy * R, ex = b.x - ux * (R + 3), ey = b.y - uy * (R + 3);
        var used = done && (done.from === i || done.hops.indexOf(i) >= 0) && (done.hops.indexOf(n.fail) >= 0);
        el('path', { d: 'M' + sx + ' ' + sy + ' Q' + mx + ' ' + my + ' ' + ex + ' ' + ey, 'marker-end': 'url(#s03-ac-arrow)',
          style: 'fill:none;stroke:var(--het);stroke-dasharray:4 3;stroke-width:' + (used ? 2.6 : 1.2) }, svg);
      });
      // edge letters, on top of the links
      st.forEach(function (n, i) {
        if (n.parent < 0) return;
        var a = pos[n.parent], b = pos[i], lx = (a.x + b.x) / 2, ly = (a.y + b.y) / 2;
        el('rect', { x: lx - 7, y: ly - 8, width: 14, height: 15, rx: 2, style: 'fill:var(--panel)' }, svg);
        el('text', { x: lx, y: ly + 4, 'text-anchor': 'middle', 'class': 'lab' }, svg, n.ch);
      });
      // states
      st.forEach(function (n, i) {
        var p = pos[i], acc = n.out.length > 0, isCur = i === cur;
        if (acc) el('circle', { cx: p.x, cy: p.y, r: R + 3, style: 'fill:none;stroke:var(--good);stroke-width:1.6' }, svg);
        el('circle', { cx: p.x, cy: p.y, r: R, style: 'fill:' + (isCur ? 'var(--accent)' : hop[i] ? 'var(--code-bg)' : 'var(--panel)') + ';stroke:var(--accent);stroke-width:1.5' }, svg);
        el('text', { x: p.x, y: p.y + 4, 'text-anchor': 'middle', style: 'font-weight:600;fill:' + (isCur ? 'var(--bg)' : 'var(--fg)') }, svg, String(i));
        var leaf = !Object.keys(n.next).length;
        if (acc) el('text', { x: leaf ? p.x + R + 8 : p.x, y: leaf ? p.y + 4 : p.y - R - 7, 'text-anchor': leaf ? 'start' : 'middle', style: 'fill:var(--good);font-size:10.5px' }, svg, n.out.join(' + '));
      });
      // text strip
      var strip = '';
      for (var i = 0; i < T.length; i++) {
        var c = esc(T[i]);
        strip += done && i === done.i ? '<span class="a">[' + c + ']</span>' : (done && i < done.i ? '<span class="h">' + c + '</span>' : c);
      }
      $('s03-ac-strip').innerHTML = strip;
      var gotoN = 0, failN = 0, hits = [];
      for (var q = 0; q < k; q++) {
        if (steps[q].moved) gotoN++;
        failN += steps[q].hops.length;
        steps[q].out.forEach(function (w) { hits.push(w + ' ends at letter ' + (steps[q].i + 1)); });
      }
      $('s03-ac-read').textContent = k + ' of ' + T.length;
      $('s03-ac-goto').textContent = gotoN;
      $('s03-ac-fail').textContent = failN;
      $('s03-ac-hit').textContent = hits.length;
      var msg;
      if (!done) msg = 'The machine stands in state 0. Press Step to read the first letter.';
      else {
        msg = 'Read <b>' + esc(done.c) + '</b> in state ' + done.from + '. ';
        if (done.hops.length) msg += 'No ' + esc(done.c) + ' edge, so follow the failure link to state ' + done.hops.join(', then ') + '. ';
        msg += done.moved ? 'Take the ' + esc(done.c) + ' edge to state ' + done.to + '. ' : 'No ' + esc(done.c) + ' edge from the root: stay in state 0. ';
        if (done.out.length) msg += '<b>Found: ' + esc(done.out.join(', ')) + '.</b>';
      }
      $('s03-ac-out').innerHTML = msg + (hits.length ? '<br>So far: ' + esc(hits.join('; ')) + '.' : '');
    }

    function load() {
      var words = wIn.value.split(/[\s,;]+/).filter(Boolean).slice(0, 6).map(function (w) { return w.slice(0, 8); });
      T = tIn.value.replace(/\s/g, '');
      if (!words.length || !T) { $('s03-ac-out').textContent = 'Type at least one word and a text.'; return; }
      st = acBuild(words); steps = acRun(st, T); k = 0;
      layout(); draw();
    }
    function press(id) {
      Array.prototype.forEach.call(tool.querySelectorAll('.seg button'), function (b) {
        b.setAttribute('aria-pressed', b.id === id ? 'true' : 'false');
      });
    }
    ['dna', 'paper'].forEach(function (name) {
      $('s03-ac-' + name).addEventListener('click', function () {
        wIn.value = presets[name].w; tIn.value = presets[name].t;
        press('s03-ac-' + name); load();
      });
    });
    [wIn, tIn].forEach(function (i) { i.addEventListener('input', function () { press(''); load(); }); });
    $('s03-ac-step').addEventListener('click', function () { if (st && k < steps.length) { k++; draw(); } });
    $('s03-ac-end').addEventListener('click', function () { if (st) { k = steps.length; draw(); } });
    $('s03-ac-reset').addEventListener('click', function () { if (st) { k = 0; draw(); } });
    wIn.value = presets.dna.w; tIn.value = presets.dna.t;
    load();
  })();

  // =====================================================================
  // (c) the control: both toys against indexOf on random strings
  // =====================================================================
  (function () {
    var btn = $('s03-check-run'), out = $('s03-check-out');
    if (!btn) return;
    var ALPHA = ['AB', 'ACGT', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

    function check() {
      var r = rng(20261105), rounds = 3000, badN = 0, badB = 0, badA = 0, sets = 0, words = 0, found = 0;
      for (var q = 0; q < rounds; q++) {
        var alpha = ALPHA[q % 3], T = randStr(r, alpha, Math.floor(r() * 300));
        // about half of the patterns are cut from the text, so that hits really occur
        var mk = function () {
          var m = 1 + Math.floor(r() * 12);
          if (r() < 0.5 && T.length > m) { var s = Math.floor(r() * (T.length - m)); return T.slice(s, s + m); }
          return randStr(r, alpha, m);
        };
        var P = mk(), want = allIndexOf(T, P);
        found += want.length;
        if (!same(naive(T, P).hits, want)) badN++;
        if (!same(boyerMoore(T, P).hits, want)) badB++;
        var ws = [], nw = 1 + Math.floor(r() * 6), i;
        for (i = 0; i < nw; i++) { var w = mk(); if (ws.indexOf(w) < 0) ws.push(w); }
        var steps = acRun(acBuild(ws), T), okSet = true;
        ws.forEach(function (w) {
          var got = [];
          steps.forEach(function (s) { if (s.out.indexOf(w) >= 0) got.push(s.i - w.length + 1); });
          var exp = allIndexOf(T, w);
          found += exp.length; words++;
          if (!same(got, exp)) okSet = false;
        });
        sets++;
        if (!okSet) badA++;
      }
      // how much does skipping save on different alphabets? (one random text each)
      function saving(alpha, m) {
        var r2 = rng(7 + m + alpha.length), T = randStr(r2, alpha, 100000), P = randStr(r2, alpha, m);
        var b = boyerMoore(T, P), n = naive(T, P), seen = {}, i;
        for (i = 0; i < b.ev.length; i++) seen[b.ev[i].t] = 1;
        return { n: n.ev.length, b: b.ev.length, frac: Object.keys(seen).length / T.length };
      }
      var rows = [['ACGT', 8], ['ACGT', 16], ['ACGT', 32], [ALPHA[2], 8], [ALPHA[2], 16], [ALPHA[2], 32]].map(function (c) {
        var s = saving(c[0], c[1]);
        return '<tr><td>' + (c[0].length === 4 ? 'DNA, 4 letters' : '26 letters') + '</td><td>' + c[1] + '</td><td>' + fmt(s.n) +
          '</td><td>' + fmt(s.b) + '</td><td>' + Math.round(s.frac * 100) + ' %</td></tr>';
      }).join('');
      var bad = badN + badB + badA;
      out.innerHTML = '<p id="s03-check-verdict" data-bad="' + bad + '"><b>' + (bad ? 'Disagreement found.' : 'Every result equals indexOf.') + '</b> ' +
        fmt(rounds) + ' random texts of up to 300 letters (alphabets of 2, 4 and 26 letters) and ' + fmt(words) + ' patterns; ' + fmt(found) +
        ' occurrences in all. Disagreements: naive scan ' + badN + ', Boyer-Moore ' + badB + ', Aho-Corasick ' + badA + ' of ' + fmt(sets) + ' pattern sets.</p>' +
        '<div class="tbl"><table><thead><tr><th>Random text of 100,000 letters</th><th>Pattern length</th><th>Naive comparisons</th><th>Boyer-Moore comparisons</th><th>Text letters Boyer-Moore looked at</th></tr></thead><tbody id="s03-check-rows">' + rows + '</tbody></table></div>';
    }
    btn.addEventListener('click', function () {
      out.textContent = 'Running…';
      setTimeout(check, 20);
    });
  })();
})();
