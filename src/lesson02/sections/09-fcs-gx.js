(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.getElementById('s09-svg');
  if (!svg) return;

  // ---- toy assembly ------------------------------------------------------
  // kinds: rod = primary division (anml:rodents), bac = bacteria, hum = human, mt = mitochondrial, ad = adaptor
  var KIND = {
    rod: { col: 'var(--accent)', name: 'rodent (your animal: primary division)' },
    bac: { col: 'var(--bad)', name: 'bacterium' },
    hum: { col: 'var(--het)', name: 'human (same kingdom, other division)' },
    mt:  { col: 'var(--good)', name: 'rodent, mitochondrial hits' },
    ad:  { col: 'var(--rep)', name: 'adaptor (FCS-adaptor)' }
  };
  var DIV = { bac: 'prok:g-proteobacteria', hum: 'anml:primates', rod: 'anml:rodents', mt: 'anml:rodents' };
  var TOP = { bac: 'Pseudomonas aeruginosa', hum: 'Homo sapiens' };

  var st = { r7: 15, h8: 6, c2: 85, split: false, sel: 'ctg7' };

  function contigs() {
    var kb = 1000;
    return [
      { id: 'ctg1', segs: [['rod', 120 * kb, 98]] },
      { id: 'ctg2', segs: [['bac', 45 * kb, st.c2]] },
      { id: 'ctg3', segs: [['rod', 292 * kb, 97], ['bac', 8 * kb, 70]] },
      { id: 'ctg4', segs: [['rod', 240 * kb, 97], ['bac', 20 * kb, 80], ['rod', 240 * kb, 97]] },
      { id: 'ctg5', segs: [['ad', 40, 100], ['rod', 210 * kb - 40, 97]] },
      { id: 'ctg6', segs: [['mt', 16600, 100]] },
      { id: 'ctg7', segs: [['bac', 60 * kb, 75], ['rod', st.r7 * kb, 96]] },
      { id: 'ctg8', segs: [['rod', 200 * kb, 97], ['hum', st.h8 * kb, 90], ['rod', 200 * kb, 97]] },
      { id: 'ctg9', segs: [['hum', 60 * kb, 95]] }
    ];
  }

  function fmt(n) { return n.toLocaleString('en-US'); }
  function kbs(n) { return n >= 1000 ? (Math.round(n / 100) / 10) + ' kb' : n + ' bp'; }

  // ---- simplified action_report.py logic (defaults) -----------------------
  var LOWCOV = 10, GOOD_ABS = 200, GOOD_LEN = 50000, GOOD_PCT = 30, SAMEK_EFF = 10000;
  function isPrimary(k) { return k === 'rod' || k === 'mt'; }
  function sameKingdom(k) { return k === 'hum'; } // animal in animal

  function decide(c) {
    var len = 0, pos = 1, spans = [];
    c.segs.forEach(function (s) { spans.push({ k: s[0], start: pos, end: pos + s[1] - 1, len: s[1], cov: s[2] }); pos += s[1]; len += s[1]; });
    c.len = len; c.spans = spans;
    var gx = [], ad = [], why = [];
    // FCS-adaptor (separate tool)
    var gxSpans = spans.filter(function (s) { return s.k !== 'ad'; });
    spans.forEach(function (s) {
      if (s.k === 'ad') {
        var nearEnd = s.start <= 101 || s.end >= len - 100;
        ad.push({ start: nearEnd && s.start <= 101 ? 1 : s.start, end: nearEnd && s.end >= len - 100 ? len : s.end, act: 'ACTION_TRIM' });
        why.push('FCS-adaptor: a ' + s.len + '-bp Illumina-primer-like hit lies within 100 bp of the start, so the range is trimmed to the end: ACTION_TRIM 1..' + s.end + '. Adaptors are FCS-adaptor’s job, not FCS-GX’s.');
      }
    });
    // merge adaptor into the following rodent span for GX purposes
    if (gxSpans.length && gxSpans[0].start > 1) { gxSpans[0] = Object.assign({}, gxSpans[0], { start: 1, len: gxSpans[0].len + gxSpans[0].start - 1 }); }

    if (gxSpans.length === 1) {
      var s = gxSpans[0];
      if (s.k === 'mt') {
        gx.push({ start: 1, end: len, act: 'MITOCHONDRION', div: DIV.mt, cov: s.cov, top: 'Mus sp.' });
        why.push('One span, primary division (rodent), eukaryote, and more than 80 % of its length covered by hits to mitochondrial sequence → MITOCHONDRION (rule S04). clean genome removes it from the nuclear set.');
      } else if (isPrimary(s.k)) {
        why.push('One span, assigned to the primary division (anml:rodents) → ACCEPT. Accepted contigs do not appear in the action report.');
      } else if (s.cov <= LOWCOV) {
        why.push('One span, foreign division, but alignment coverage ' + s.cov + ' % ≤ ' + LOWCOV + ' % → "coverage too low to decide": kept, no row.');
      } else {
        var act = 'EXCLUDE', note = 'The whole contig is foreign (' + DIV[s.k] + ', coverage ' + s.cov + ' %) → EXCLUDE (rule S01).';
        if (sameKingdom(s.k) && s.cov < 20) { act = 'REVIEW'; note = 'Foreign but same kingdom (animal in animal) with coverage < 20 % → REVIEW.'; }
        else if (sameKingdom(s.k)) note += ' It is in the same kingdom as the rodent, but coverage ≥ 20 %, so it stays EXCLUDE.';
        gx.push({ start: 1, end: len, act: act, div: DIV[s.k], cov: s.cov, top: TOP[s.k] });
        why.push(note);
      }
      return { gx: gx, ad: ad, why: why };
    }

    var keep = 0, anyContam = false;
    gxSpans.forEach(function (s) { if (isPrimary(s.k)) keep += s.len; else anyContam = true; });
    var pct = keep / len * 100;
    why.push('Mixed contig: ' + kbs(keep) + ' assigned to the rodent = ' + pct.toFixed(1) + ' % of ' + kbs(len) + '.');
    if (keep < GOOD_ABS || (anyContam && keep < GOOD_LEN && pct < GOOD_PCT)) {
      var cs = gxSpans.filter(function (s) { return !isPrimary(s.k); })[0];
      var a = 'EXCLUDE';
      if (sameKingdom(cs.k) && cs.cov < 20) a = 'REVIEW';
      gx.push({ start: 1, end: len, act: a, div: DIV[cs.k], cov: cs.cov, top: TOP[cs.k] });
      why.push('Rodent part is under 50,000 bp AND under 30 % of the contig (or under 200 bp) → too little of your animal is left to be worth keeping: the whole contig is ' + a + ' (rule M01).');
      return { gx: gx, ad: ad, why: why };
    }
    why.push('Enough rodent sequence (≥ 50 kb or ≥ 30 %), so each foreign span is judged separately.');
    gxSpans.forEach(function (s) {
      if (isPrimary(s.k)) return;
      var range = fmt(s.start) + '..' + fmt(s.end);
      if (s.cov <= LOWCOV) { why.push('Span ' + range + ': coverage ≤ 10 % → kept.'); return; }
      var atEnd = s.start === 1 || s.end === len;
      var act = atEnd ? 'TRIM' : 'FIX';
      var note = 'Span ' + range + ' (' + DIV[s.k] + ') ' + (atEnd ? 'touches an end → TRIM (rule M02).' : 'is inside the contig → FIX = mask with N (rule M03)' + (st.split ? '; you changed FIX to SPLIT, so clean cuts the contig in two here.' : '.'));
      if (sameKingdom(s.k)) {
        var eff = s.len * s.cov / 100;
        if (eff < SAMEK_EFF) {
          why.push('Span ' + range + ' (human-like, same kingdom): effective length ' + kbs(s.len) + ' × ' + s.cov + ' % = ' + kbs(Math.round(eff)) + ' < 10 kb → kept, no row.');
          return;
        }
        act = 'REVIEW';
        note = 'Span ' + range + ' (human-like, same kingdom): effective length ' + kbs(Math.round(eff)) + ' ≥ 10 kb → REVIEW. clean genome does nothing with REVIEW rows; decide yourself (EXCLUDE, TRIM, FIX or keep).';
      }
      if (act === 'FIX' && st.split) act = 'SPLIT';
      gx.push({ start: s.start, end: s.end, act: act, div: DIV[s.k], cov: s.cov, top: TOP[s.k] });
      why.push(note);
    });
    return { gx: gx, ad: ad, why: why };
  }

  // ---- drawing -------------------------------------------------------------
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var a in attrs) e.setAttribute(a, attrs[a]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  var X0 = 118, W = 400, ROW = 38, Y0 = 34;
  var ACTCOL = { EXCLUDE: 'var(--bad)', TRIM: 'var(--bad)', FIX: 'var(--het)', SPLIT: 'var(--het)', REVIEW: 'var(--rep)', MITOCHONDRION: 'var(--good)', ACTION_TRIM: 'var(--rep)' };

  function draw() {
    var cs = contigs();
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    el('text', { x: 10, y: 16 }, svg, 'contig');
    el('text', { x: X0, y: 16 }, svg, 'hits along the contig  ·  thin line = after clean');
    el('text', { x: X0 + W + 16, y: 16 }, svg, 'reported action');
    var res = {};
    cs.forEach(function (c, i) {
      var r = decide(c); res[c.id] = { c: c, r: r };
      var y = Y0 + i * ROW;
      var g = el('g', { tabindex: 0, role: 'button', 'aria-label': c.id + ': show why', style: 'cursor:pointer' }, svg);
      el('rect', { x: 2, y: y - 6, width: 756, height: ROW - 4, rx: 3, fill: st.sel === c.id ? 'var(--code-bg)' : 'transparent', stroke: st.sel === c.id ? 'var(--accent)' : 'none' }, g);
      el('text', { x: 10, y: y + 11, 'class': 'lab' }, g, c.id);
      el('text', { x: 52, y: y + 11 }, g, kbs(c.len));
      // segments
      var x = X0;
      c.spans.forEach(function (s) {
        var w = s.len / c.len * W;
        var minw = s.k === 'ad' ? 4 : 0;
        el('rect', { x: x, y: y, width: Math.max(w, minw), height: 14, fill: KIND[s.k].col, opacity: s.k === 'rod' ? 0.55 : 0.95 }, g);
        x += w;
      });
      // after-clean line
      var acts = r.gx.concat(r.ad.map(function (a) { return { start: a.start, end: a.end, act: 'TRIM' }; }));
      var yl = y + 19;
      var removedAll = acts.some(function (a) { return a.act === 'EXCLUDE' || a.act === 'MITOCHONDRION'; });
      if (!removedAll) {
        // build kept pieces
        var cuts = acts.filter(function (a) { return a.act === 'TRIM' || a.act === 'SPLIT'; });
        var masks = acts.filter(function (a) { return a.act === 'FIX'; });
        var px = function (p) { return X0 + (p - 1) / c.len * W; };
        var start = 1, pieces = [];
        cuts.sort(function (a, b) { return a.start - b.start; }).forEach(function (a) { if (a.start > start) pieces.push([start, a.start - 1]); start = a.end + 1; });
        if (start <= c.len) pieces.push([start, c.len]);
        pieces.forEach(function (p) {
          var x1 = px(p[0]), x2 = px(p[1] + 1);
          el('rect', { x: x1 + 0.5, y: yl, width: Math.max(1, x2 - x1 - 1), height: 4, fill: 'var(--fg)', opacity: 0.55 }, g);
        });
        masks.forEach(function (a) {
          el('rect', { x: px(a.start), y: yl - 1, width: Math.max(2, (a.end - a.start + 1) / c.len * W), height: 6, fill: 'var(--err)' }, g);
          el('text', { x: px(a.start) + 2, y: yl + 14, style: 'font-size:9.5px' }, g, 'NNN');
        });
      } else {
        el('line', { x1: X0, x2: X0 + W, y1: yl + 2, y2: yl + 2, stroke: 'var(--muted)', 'stroke-dasharray': '2 4' }, g);
        el('text', { x: X0 + W + 16, y: yl + 6, style: 'font-size:9.5px' }, g, 'gone from clean.fasta');
      }
      // action labels
      var labels = r.gx.map(function (a) { return a.act; }).concat(r.ad.map(function (a) { return 'ACTION_TRIM (adaptor)'; }));
      if (!labels.length) labels = ['— (kept)'];
      el('text', { x: X0 + W + 16, y: y + 11, 'class': 'lab', style: 'font-weight:600;fill:' + (ACTCOL[labels[0].split(' ')[0]] || 'var(--muted)') }, g, labels.join(' + '));
      g.addEventListener('click', function () { st.sel = c.id; render(); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); st.sel = c.id; render(); var n = svg.querySelectorAll('g[tabindex]')[i]; if (n) n.focus(); } });
    });
    return res;
  }

  function render() {
    var res = draw();
    // why panel
    var why = document.getElementById('s09-why');
    var cur = res[st.sel];
    if (why && cur) {
      why.innerHTML = '';
      var b = document.createElement('b'); b.textContent = cur.c.id + ' (' + kbs(cur.c.len) + '): why'; why.appendChild(b);
      var ul = document.createElement('ul');
      cur.r.why.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      why.appendChild(ul);
    }
    // report table
    var tb = document.querySelector('#s09-rep tbody');
    if (tb) {
      tb.innerHTML = '';
      var rows = 0;
      Object.keys(res).forEach(function (id) {
        var c = res[id].c, r = res[id].r;
        r.gx.forEach(function (a) {
          rows++;
          addRow(tb, ['fcs_gx_report', id, fmt(a.start), fmt(a.end), fmt(c.len), a.act, a.div, String(a.cov)], id === st.sel);
        });
        r.ad.forEach(function (a) {
          rows++;
          addRow(tb, ['fcs_adaptor_report', id, fmt(a.start), fmt(a.end), fmt(c.len), a.act, 'adaptor', '–'], id === st.sel);
        });
      });
    }
    // readout
    var n = { kept: 0, excl: 0, exclB: 0, trimB: 0, masked: 0, review: 0, mito: 0, pieces: 0 };
    Object.keys(res).forEach(function (id) {
      var c = res[id].c, r = res[id].r, all = r.gx.concat(r.ad.map(function (a) { return { start: a.start, end: a.end, act: 'TRIM' }; }));
      var gone = false, cuts = 0;
      all.forEach(function (a) {
        var L = a.end - a.start + 1;
        if (a.act === 'EXCLUDE') { n.excl++; n.exclB += L; gone = true; }
        else if (a.act === 'MITOCHONDRION') { n.mito++; n.exclB += L; gone = true; }
        else if (a.act === 'TRIM') n.trimB += L;
        else if (a.act === 'SPLIT') { n.trimB += L; cuts++; }
        else if (a.act === 'FIX') n.masked += L;
        else if (a.act === 'REVIEW') n.review++;
      });
      if (!gone) { n.pieces += 1 + cuts; if (!all.length) n.kept++; }
    });
    var out = document.getElementById('s09-out');
    if (out) {
      out.innerHTML = '';
      [['sequences in clean.fasta', n.pieces + ' (' + n.kept + ' of 9 contigs untouched)'],
       ['removed whole (EXCLUDE / MITOCHONDRION)', (n.excl + n.mito) + ' contigs, ' + fmt(n.exclB) + ' bp'],
       ['cut off (TRIM / SPLIT range)', fmt(n.trimB) + ' bp'],
       ['masked with N (FIX)', fmt(n.masked) + ' bp'],
       ['left for you to decide (REVIEW)', String(n.review)]].forEach(function (p) {
        var d = document.createElement('div'); d.textContent = p[0]; var bb = document.createElement('b'); bb.textContent = p[1]; d.appendChild(bb); out.appendChild(d);
      });
    }
  }
  function addRow(tb, cells, hi) {
    var tr = document.createElement('tr');
    if (hi) tr.style.background = 'var(--code-bg)';
    cells.forEach(function (t, i) { var td = document.createElement('td'); if (i === 1 || i === 5) { var cd = document.createElement('code'); cd.textContent = t; td.appendChild(cd); } else td.textContent = t; tr.appendChild(td); });
    tb.appendChild(tr);
  }

  // legend
  var lg = document.getElementById('s09-legend');
  if (lg) {
    Object.keys(KIND).forEach(function (k) {
      var s = document.createElement('span'); var i = document.createElement('i'); i.style.background = KIND[k].col; i.style.height = '10px'; s.appendChild(i); s.appendChild(document.createTextNode(KIND[k].name)); lg.appendChild(s);
    });
    var s2 = document.createElement('span'); var i2 = document.createElement('i'); i2.style.background = 'var(--err)'; i2.style.height = '10px'; s2.appendChild(i2); s2.appendChild(document.createTextNode('masked with N after clean')); lg.appendChild(s2);
  }

  function bind(id, key) {
    var inp = document.getElementById(id), o = document.getElementById(id + 'o');
    if (!inp) return;
    inp.addEventListener('input', function () { st[key] = +inp.value; if (o) o.textContent = inp.value; render(); });
  }
  bind('s09-r7', 'r7'); bind('s09-h8', 'h8'); bind('s09-c2', 'c2');
  var bf = document.getElementById('s09-fix'), bs = document.getElementById('s09-split');
  function setSplit(v) { st.split = v; if (bf) bf.setAttribute('aria-pressed', String(!v)); if (bs) bs.setAttribute('aria-pressed', String(v)); render(); }
  if (bf) bf.addEventListener('click', function () { setSplit(false); });
  if (bs) bs.addEventListener('click', function () { st.sel = 'ctg4'; setSplit(true); });
  ['s09-r7', 's09-h8', 's09-c2'].forEach(function (id, j) {
    var inp = document.getElementById(id); if (inp) inp.addEventListener('focus', function () { st.sel = ['ctg7', 'ctg8', 'ctg2'][j]; render(); });
  });
  render();

  // ---- simulated blob plot -------------------------------------------------
  var blob = document.getElementById('s09-blob');
  if (!blob) return;
  var seed = 7;
  function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
  function gauss() { return (rnd() + rnd() + rnd() + rnd() - 2) / 0.58; }
  var L = 60, R = 620, T = 14, B = 270;
  function gx(gc) { return L + (gc - 30) / (70 - 30) * (R - L); }
  function gy(cov) { return B - (Math.log10(cov) - 0) / 4 * (B - T); }
  for (var t = 0; t <= 4; t++) {
    el('line', { x1: L, x2: R, y1: gy(Math.pow(10, t)), y2: gy(Math.pow(10, t)), 'class': 'grid' }, blob);
    el('text', { x: L - 8, y: gy(Math.pow(10, t)) + 4, 'text-anchor': 'end' }, blob, String(Math.pow(10, t)) + '×');
  }
  for (var gcv = 30; gcv <= 70; gcv += 10) {
    el('line', { x1: gx(gcv), x2: gx(gcv), y1: T, y2: B, 'class': 'grid' }, blob);
    el('text', { x: gx(gcv), y: B + 16, 'text-anchor': 'middle' }, blob, gcv + ' %');
  }
  el('line', { x1: L, x2: R, y1: B, y2: B, 'class': 'ax' }, blob);
  el('line', { x1: L, x2: L, y1: T, y2: B, 'class': 'ax' }, blob);
  el('text', { x: (L + R) / 2, y: B + 34, 'text-anchor': 'middle', 'class': 'lab' }, blob, 'GC content');
  el('text', { x: 14, y: (T + B) / 2, 'text-anchor': 'middle', 'class': 'lab', transform: 'rotate(-90 14 ' + (T + B) / 2 + ')' }, blob, 'read coverage (log)');
  function dot(gc, cov, lenKb, col, label) {
    var r = Math.max(2.5, Math.sqrt(lenKb) * 0.9);
    el('circle', { cx: gx(gc), cy: gy(cov), r: r, fill: col, 'fill-opacity': 0.45, stroke: col }, blob);
    if (label) el('text', { x: gx(gc) + r + 4, y: gy(cov) + 4, 'class': 'lab' }, blob, label);
  }
  for (var k = 0; k < 70; k++) dot(42 + gauss() * 1.6, Math.max(8, 30 * Math.pow(10, gauss() * 0.06)), 20 + rnd() * 400, 'var(--accent)');
  dot(62, 4, 45, 'var(--bad)', 'ctg2 bacterium');
  dot(41, 2, 60, 'var(--het)', 'ctg9 human');
  dot(39, 5000, 16.6, 'var(--good)', 'ctg6 mitochondrion');
  el('text', { x: gx(42) + 30, y: gy(30) - 30, 'class': 'lab' }, blob, 'nuclear rodent contigs');
})();
