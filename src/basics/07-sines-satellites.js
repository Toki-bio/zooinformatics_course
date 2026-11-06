(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag), k;
    for (k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgIn(box, w, h, label) {
    box.textContent = '';
    return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'img', 'aria-label': label, style: 'display:block' }, box);
  }
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
  function randSeq(r, n) { var s = '', i; for (i = 0; i < n; i++) s += 'ACGT'[Math.floor(r() * 4)]; return s; }
  function rep(s, n) { var o = '', i; for (i = 0; i < n; i++) o += s; return o; }
  function mutate(s, rate, r, skip) {          // substitutions only; skip = columns left unchanged
    var o = '', i, c;
    for (i = 0; i < s.length; i++) {
      c = s[i];
      if (!(skip && skip.indexOf(i) >= 0) && r() < rate) { do { c = 'ACGT'[Math.floor(r() * 4)]; } while (c === s[i]); }
      o += c;
    }
    return o;
  }
  function mism(a, b) { var n = 0, i; for (i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; }
  function approx(g, w, mx) { var o = [], p; for (p = 0; p + w.length <= g.length; p++) if (mism(w, g.substr(p, w.length)) <= mx) o.push(p); return o; }
  function col(c) { return '<span class="b-' + c + '">' + c + '</span>'; }
  function cls(ch, c) { return '<span' + (c ? ' class="' + c + '"' : '') + '>' + ch + '</span>'; }
  function div(html, cl) { var d = document.createElement('div'); if (cl) d.className = cl; d.innerHTML = html; return d; }

  var HEAD = 'GCCTGGTGGCTCAAGT', BODY = 'CGAATTCAGGCATCGTAC', TAIL = 'AAAAAAAA', SINE = HEAD + BODY + TAIL;

  // 1. Insertion and target site duplication
  (function () {
    var T = randSeq(rng(11), 30), p = 12, html = '';
    [4, 8, 12].forEach(function (s) {
      var tsd = T.slice(p, p + s), res = T.slice(0, p) + tsd + SINE + tsd + T.slice(p + s);
      var at = res.indexOf(SINE), k = 0, out = '', i, q, c;
      for (q = 1; q <= 20 && at - q >= 0; q++) if (res.substr(at - q, q) === res.substr(at + SINE.length, q)) k = q;   // found from the result, not assumed
      for (i = 0; i < res.length; i++) {
        c = '';
        if (i >= at && i < at + SINE.length) { q = i - at; c = q < HEAD.length ? 'b-head' : (q < HEAD.length + BODY.length ? 'b-body' : 'b-tail'); }
        else if ((i >= at - k && i < at) || (i >= at + SINE.length && i < at + SINE.length + k)) c = 'b-tsd';
        out += cls(res[i], c);
      }
      html += '<p class="b-lab">Cuts <b>' + s + '</b> bases apart: the duplicated stretch is <b>' + k + '</b> bases long (<code>' + res.substr(at - k, k) + '</code>)</p><div class="b-aln">' + out + '</div>';
    });
    $('b-tsd').innerHTML = html;
  })();

  // 2. Flanks are unique, the SINE is not
  var igSeed = 5;
  function drawIg() {
    var r = rng(igSeed * 77), g = '', copies = [], i, c;
    for (i = 0; i < 6; i++) {
      g += randSeq(r, 60 + Math.floor(r() * 30));
      c = mutate(HEAD + BODY, 0.03, r) + rep('A', 4 + Math.floor(r() * 5));
      copies.push({ s: g.length, e: g.length + c.length }); g += c;
    }
    g += randSeq(r, 60 + Math.floor(r() * 30));
    var W = 16, X = 620 / g.length, svg = svgIn($('b-ig'), 640, 36, 'Toy genome with six SINE copies');
    el('rect', { x: 10, y: 9, width: g.length * X, height: 12, style: 'fill:var(--line)' }, svg);
    copies.forEach(function (c, k) {
      el('rect', { x: 10 + c.s * X, y: 5, width: Math.max(3, (c.e - c.s) * X), height: 20, style: 'fill:var(--accent)' }, svg);
      el('text', { x: 10 + (c.s + c.e) / 2 * X, y: 34, 'text-anchor': 'middle', 'font-size': 10, style: 'fill:var(--fg)' }, svg, String(k + 1));
    });
    var sineW = approx(g, HEAD, 3), once = 0;
    var rows = '<table><tr><th>copy</th><th>left flank</th><th>places</th><th>right flank</th><th>places</th></tr>';
    copies.forEach(function (c, k) {
      var lw = g.slice(c.s - W, c.s), rw = g.slice(c.e, c.e + W), ln = approx(g, lw, 3).length, rn = approx(g, rw, 3).length;
      if (ln === 1) once++;
      if (rn === 1) once++;
      rows += '<tr><td>' + (k + 1) + '</td><td>' + lw + '</td><td><b>' + ln + '</b></td><td>' + rw + '</td><td><b>' + rn + '</b></td></tr>';
    });
    rows += '<tr><td>SINE</td><td>' + HEAD + '</td><td><b>' + sineW.length + '</b></td><td colspan="2">the first 16 bases of the SINE</td></tr></table>';
    $('b-flk').innerHTML = rows;
    $('b-igmsg').textContent = 'The SINE word occurs in ' + sineW.length + ' places' + (sineW.length === 6 ? ', one in each copy. ' : '. ') +
      (once === 12 ? 'Each of the 12 flank words occurs in exactly 1 place' : once + ' of the 12 flank words occur in exactly 1 place') +
      ', so the flanks identify the place of a copy.';
  }
  $('b-ignew').addEventListener('click', function () { igSeed++; drawIg(); });
  drawIg();

  // 3. Consensus
  var cSeed = 3, CL = 60;
  function consensus(rows, n, len) {
    var out = '', j, i, cnt, best, bc, tie;
    for (j = 0; j < len; j++) {
      cnt = { A: 0, C: 0, G: 0, T: 0 };
      for (i = 0; i < n; i++) cnt[rows[i][j]]++;
      best = 0; bc = 'n'; tie = false;
      'ACGT'.split('').forEach(function (b) { if (cnt[b] > best) { best = cnt[b]; bc = b; tie = false; } else if (cnt[b] === best) tie = true; });
      out += tie ? 'n' : bc;
    }
    return out;
  }
  function drawCons() {
    var r = rng(cSeed * 31), master = randSeq(r, CL), rows = [], i, j;
    for (i = 0; i < 31; i++) rows.push(mutate(master, 0.10 + 0.15 * r(), r));
    var show = 11, cons = consensus(rows, show, CL), h = '';
    function line(label, s, ref) {
      var o = '';
      for (j = 0; j < s.length; j++) o += (ref && s[j] !== ref[j]) ? cls(s[j], 'b-bad') : (s[j] === 'n' ? cls('n') : col(s[j]));
      return '<span class="b-w">' + label + '</span>' + o + '\n';
    }
    for (i = 0; i < show; i++) h += line(('copy ' + (i + 1) + '       ').slice(0, 10), rows[i]);
    h += line('consensus ', cons, master);
    h += line('source    ', master);
    $('b-cons').innerHTML = h;
    var box = $('b-consn'), wr = [], two = div('', 'b-two');
    box.textContent = '';
    box.appendChild(two);
    [1, 3, 11, 31].forEach(function (n) {
      var c = consensus(rows, n, CL), wrong = mism(c, master), d = div('<p class="b-lab"><b>' + n + '</b> ' + (n === 1 ? 'copy' : 'copies') + ': <b>' + wrong + '</b> of ' + CL + ' positions differ from the source</p><div class="svgbox"></div>');
      wr.push(wrong);
      two.appendChild(d);
      var svg = svgIn(d.lastChild, 610, 16, n + ' copies: positions where the consensus differs from the source');
      for (j = 0; j < CL; j++) el('rect', { x: 1 + j * 10, y: 1, width: 8.6, height: 12, style: 'fill:' + (c[j] === master[j] ? 'var(--line)' : 'var(--bad)') }, svg);
    });
    $('b-consmsg').textContent = 'Red: differs from the source (n: tied vote). With 31 copies ' +
      (wr[3] === 0 ? 'every position is right' : 'only ' + wr[3] + ' of ' + CL + ' positions are wrong') +
      '.';
  }
  $('b-cnew').addEventListener('click', function () { cSeed++; drawCons(); });
  drawCons();

  // 4. Subfamilies
  var sSeed = 4, SL = 40, NA = 8, NB = 7;
  function splitKey(rows, j) {
    var cnt = { A: 0, C: 0, G: 0, T: 0 }, i, bs, k = [];
    rows.forEach(function (s) { cnt[s[j]]++; });
    bs = 'ACGT'.split('').sort(function (a, b) { return cnt[b] - cnt[a]; });
    if (cnt[bs[1]] < 3) return null;
    for (i = 0; i < rows.length; i++) if (rows[i][j] === bs[1]) k.push(i);
    return { key: k.join(','), major: bs[0] };
  }
  function drawSub() {
    var r = rng(sSeed * 53), srcA = randSeq(r, SL), diag = [], i, j, b = srcA, t;
    while (diag.length < 3) { j = 6 + Math.floor(r() * (SL - 12)); if (diag.indexOf(j) < 0) diag.push(j); }
    diag.sort(function (x, y) { return x - y; });
    diag.forEach(function (d) { var c; do { c = 'ACGT'[Math.floor(r() * 4)]; } while (c === srcA[d]); b = b.slice(0, d) + c + b.slice(d + 1); });
    var cps = [];
    for (i = 0; i < NA + NB; i++) cps.push({ lin: i < NA ? 0 : 1, s: mutate(i < NA ? srcA : b, 0.03 + 0.13 * r(), r, diag) });
    for (i = cps.length - 1; i > 0; i--) { j = Math.floor(r() * (i + 1)); t = cps[i]; cps[i] = cps[j]; cps[j] = t; }
    var rows = cps.map(function (c) { return c.s; }), cons = consensus(rows, rows.length, SL);
    var keys = [], found = [], j2;
    for (j = 0; j < SL; j++) keys.push(splitKey(rows, j));
    for (j = 0; j < SL; j++) {
      if (!keys[j]) continue;
      for (j2 = 0; j2 < SL; j2++) if (j2 !== j && keys[j2] && keys[j2].key === keys[j].key) { found.push(j); break; }
    }
    cps.forEach(function (c) {
      c.n = mism(c.s, cons);
      c.g = found.length && c.s[found[0]] !== keys[found[0]].major ? 1 : 0;
    });
    var byN = cps.slice().sort(function (x, y) { return x.n - y.n; });
    var byG = cps.slice().sort(function (x, y) { return x.g - y.g || x.n - y.n; });
    function changes(list) { var n = 0, q; for (q = 1; q < list.length; q++) if (list[q].lin !== list[q - 1].lin) n++; return n; }
    function panel(title, list) {
      var h = '<p class="b-lab"><b>' + title + '</b></p><div class="b-aln">', o;
      o = '<span class="b-w">   </span>';
      for (j = 0; j < SL; j++) o += found.indexOf(j) >= 0 ? cls('▼', 'b-dia') : cls(' ');
      h += o + '\n';
      list.forEach(function (c) {
        o = '<span class="b-w" style="color:' + (c.lin ? 'var(--rep)' : 'var(--accent)') + '">■  </span>';
        for (j = 0; j < SL; j++) o += c.s[j] === cons[j] ? cls('·', found.indexOf(j) >= 0 ? 'b-dia' : '') : cls(c.s[j], 'b-' + c.s[j] + (found.indexOf(j) >= 0 ? ' b-dia' : ''));
        h += o + '\n';
      });
      return h + '</div>';
    }
    var box = $('b-sub');
    box.innerHTML = '';
    box.appendChild(div(panel('Ordered by number of differences from the consensus', byN)));
    box.appendChild(div(panel('Grouped by the repeated positions', byG)));
    var c1 = changes(byN), c2 = changes(byG);
    $('b-s1').textContent = found.length ? found.map(function (x) { return x + 1; }).join(', ') : 'none';
    $('b-s2').textContent = c1;
    $('b-s3').textContent = c2;
    var exact = found.length === 3 && found.every(function (x, k) { return x === diag[k]; });
    $('b-submsg').textContent = 'Squares: the true lineage of each copy. Marked columns: positions the computer found. ' +
      (exact && c2 === 1 ? 'They are the 3 positions where the lineages differ, and grouping by them separates the lineages. ' : 'They are not exactly the 3 true positions in this set: press New random copies. ') +
      (c1 >= 2 ? 'Ordering by number of differences mixes the lineages, because it counts mostly private changes.' : 'Here the order by differences happens to keep the lineages together; press New random copies.');
  }
  $('b-snew').addEventListener('click', function () { sSeed++; drawSub(); });
  drawSub();

  // 5. Presence and absence
  var SP = ['A', 'B', 'C', 'O'], YS = [20, 50, 90, 125];
  // e: the branch on which the insertion happened (AB: the branch to the ancestor of A and B; ABC: to the ancestor of A, B and C)
  var EVT = [{ e: 'AB' }, { e: 'AB' }, { e: 'AB' }, { e: 'ABC' }, { e: 'A' }];
  var UNDER = { AB: ['A', 'B'], ABC: ['A', 'B', 'C'], A: ['A'] };
  var ils = [false, false, false, false, false], none = [false, false, false, false, false];
  // sorted: the copy was present in only some individuals when the ancestor of A, B, C split, and B kept the version without it
  function states(ev, sorted) {
    var under = sorted ? UNDER.ABC : UNDER[ev.e];
    return SP.map(function (s) { return under.indexOf(s) >= 0 && !(sorted && s === 'B') ? 1 : 0; });
  }
  var EDGE = { ABC: [[10, 75], [50, 60]], AB: [[50, 60], [90, 35]], A: [[90, 35], [140, 20]], B: [[90, 35], [140, 50]], C: [[50, 60], [140, 90]], O: [[10, 75], [140, 125]] };
  function drawTree(box, sorted, label) {
    var svg = svgIn(box, 330, 150, label), cnt = {};
    Object.keys(EDGE).forEach(function (k) { var a = EDGE[k]; el('line', { x1: a[0][0], y1: a[0][1], x2: a[1][0], y2: a[1][1], style: 'stroke:var(--muted);stroke-width:1.6' }, svg); });
    EVT.forEach(function (ev, i) {
      var edge = sorted[i] ? 'ABC' : ev.e, a = EDGE[edge], n = cnt[edge] = (cnt[edge] || 0), f = edge === 'A' ? 0.5 : 0.3 + 0.2 * n, x, y;
      cnt[edge]++;
      x = a[0][0] + (a[1][0] - a[0][0]) * f; y = a[0][1] + (a[1][1] - a[0][1]) * f;
      el('circle', { cx: x, cy: y, r: 7, style: 'fill:' + (sorted[i] ? 'var(--bad)' : 'var(--accent)') }, svg);
      el('text', { x: x, y: y + 3.5, 'text-anchor': 'middle', 'font-size': 10, style: 'fill:var(--bg);font-weight:700' }, svg, String(i + 1));
    });
    SP.forEach(function (s, si) {
      el('text', { x: 146, y: YS[si] + 4, 'font-size': 13, 'font-style': 'italic', style: 'fill:var(--fg)' }, svg, s);
      EVT.forEach(function (ev, i) {
        var on = states(ev, sorted[i])[si], x = 176 + i * 29;
        el('rect', { x: x, y: YS[si] - 9, width: 18, height: 18, rx: 2, style: on ? 'fill:var(--accent)' : 'fill:none;stroke:var(--muted);stroke-width:1.4' }, svg);
        if (on) el('text', { x: x + 9, y: YS[si] + 4, 'text-anchor': 'middle', 'font-size': 11, style: 'fill:var(--bg);font-weight:700' }, svg, '1');
      });
    });
    EVT.forEach(function (ev, i) { el('text', { x: 185 + i * 29, y: 6, 'text-anchor': 'middle', 'font-size': 10, style: 'fill:var(--muted)' }, svg, String(i + 1)); });
  }
  function groupsOf(sorted) {
    var g = { 'A+B': 0, 'A+C': 0, 'B+C': 0 };
    EVT.forEach(function (ev, i) {
      var st = states(ev, sorted[i]), pres = SP.slice(0, 3).filter(function (s, k) { return st[k]; });
      if (pres.length === 2) g[pres.join('+')]++;
    });
    return g;
  }
  var FL = (function () { var r = rng(909); return [randSeq(r, 8), randSeq(r, 8)]; })();
  function drawPa() {
    var box = $('b-pa');
    box.innerHTML = '';
    box.appendChild(div('<p class="b-lab"><b>Every insertion is clean</b></p><div class="svgbox"></div>'));
    box.appendChild(div('<p class="b-lab"><b>Switch loci with the buttons below</b></p><div class="svgbox"></div>'));
    drawTree(box.children[0].lastChild, none, 'Toy tree with five clean insertions and the table of presence and absence');
    drawTree(box.children[1].lastChild, ils, 'Toy tree with the same insertions, switched loci marked red, and the table');
    var g1 = groupsOf(none), g2 = groupsOf(ils), any = ils.some(function (x) { return x; });
    Array.prototype.forEach.call($('b-pactl').children, function (b, i) { b.setAttribute('aria-pressed', String(ils[i])); });
    $('b-pamsg').textContent = 'Columns: loci; rows: species; filled: copy present. Left: ' + g1['A+B'] +
      ' loci have the copy in A and B only, so they support A and B as sisters; copies in A, B and C, or in A alone, say nothing about who is closest. ' +
      (any ? 'Right: ' + g2['A+B'] + ' loci support A+B and ' + g2['A+C'] + ' support A+C. A switched locus (red) is incomplete lineage sorting: the copy was present in only some individuals when the species split, and was kept in A and C but not in B.' : 'Switch a locus on the right to see what a conflicting locus looks like.');
    var st = states(EVT[0], false), h = '';
    SP.forEach(function (s, k) { h += '<span class="b-w"><i>' + s + '</i>  </span>' + FL[0] + (st[k] ? '<span class="b-w" style="border-bottom:3px solid var(--accent)">[SINE]</span>' : '') + FL[1] + '\n'; });
    $('b-flank').innerHTML = '<p class="b-lab"><b>Locus 1 as the genomes show it</b>: the flanks are the same in all four species; ' + st.filter(function (x) { return x; }).length + ' have the copy between them, ' + st.filter(function (x) { return !x; }).length + ' have the flanks joined.</p>' + h;
  }
  (function () {
    var c = $('b-pactl');
    EVT.forEach(function (ev, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'btn'; b.textContent = 'Locus ' + (i + 1);
      b.addEventListener('click', function () { ils[i] = !ils[i]; drawPa(); });
      c.appendChild(b);
    });
  })();
  drawPa();

  // 6. Dot plots: scattered copies and an array
  var dSeed = 6, U = 'GCCTGGTGGCTCAAGTCGAATTCA', WD = 8;
  function findUnits(g) {
    var hits = [], p = 0;
    while (p + U.length <= g.length) { if (mism(U, g.substr(p, U.length)) <= 4) { hits.push(p); p += U.length; } else p++; }
    return hits;
  }
  function dotplot(box, g, hits, label) {
    var n = g.length - WD + 1, m = {}, i, svg = svgIn(box, n + 8, n + 8, label);
    el('rect', { x: 4, y: 4, width: n, height: n, style: 'fill:none;stroke:var(--line);stroke-width:.6' }, svg);
    for (i = 0; i < n; i++) { var w = g.substr(i, WD); (m[w] = m[w] || []).push(i); }
    for (i = 0; i < n; i++) m[g.substr(i, WD)].forEach(function (jj) { el('rect', { x: 4 + i, y: 4 + jj, width: 1.1, height: 1.1, style: 'fill:' + (i === jj ? 'var(--muted)' : 'var(--accent)') }, svg); });
    hits.forEach(function (h) { el('rect', { x: 4 + h, y: 0, width: U.length, height: 3, style: 'fill:var(--good)' }, svg); });
  }
  function neighbours(h) { return h.filter(function (p) { return h.indexOf(p + U.length) >= 0 || h.indexOf(p - U.length) >= 0; }).length; }
  function drawDp() {
    var r = rng(dSeed * 19), a = randSeq(r, 20), b, i;
    for (i = 0; i < 4; i++) a += mutate(U, 0.03, r) + randSeq(r, 24 + Math.floor(r() * 10));
    a += randSeq(r, 10);
    b = randSeq(r, 38);
    for (i = 0; i < 6; i++) b += mutate(U, 0.03, r);
    b += randSeq(r, 38);
    var ha = findUnits(a), hb = findUnits(b), box = $('b-dp');
    box.innerHTML = '';
    box.appendChild(div('<p class="b-lab"><b>Scattered copies</b>: ' + a.length + ' bases</p><div class="svgbox" style="max-width:420px"></div>'));
    box.appendChild(div('<p class="b-lab"><b>An array</b>: ' + b.length + ' bases</p><div class="svgbox" style="max-width:420px"></div>'));
    dotplot(box.children[0].lastChild, a, ha, 'Dot plot of a sequence with scattered copies');
    dotplot(box.children[1].lastChild, b, hb, 'Dot plot of a sequence with an array of copies');
    $('b-d1').textContent = ha.length; $('b-d2').textContent = neighbours(ha);
    $('b-d3').textContent = hb.length; $('b-d4').textContent = neighbours(hb);
    $('b-dmsg').textContent = 'Green bars: where the unit was found (up to 4 differences allowed). Blue dots: the same word at two places. The array gives lines parallel to the middle one, each a unit further away.';
  }
  $('b-dnew').addEventListener('click', function () { dSeed++; drawDp(); });
  drawDp();
})();
