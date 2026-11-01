(function(){
  var NS = 'http://www.w3.org/2000/svg';
  var B = ['A','C','G','T'];
  function rng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function el(tag, at, txt){ var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; }
  function rs(r, n){ var s = []; for (var i = 0; i < n; i++) s.push(B[Math.floor(r() * 4)]); return s; }
  function other(r, b){ var nb; do { nb = B[Math.floor(r() * 4)]; } while (nb === b); return nb; }
  function pct(x){ return (Math.round(x * 10) / 10).toFixed(1) + ' %'; }
  function tipSpan(word, title){ return '<span class="tip" title="' + title + '">' + word + '</span>'; }

  /* ===================== Toy 1: head vs shuffles ===================== */
  (function(){
    var fig = document.getElementById('s03-hfig');
    if (!fig) return;
    var sl = document.getElementById('s03-hd'), so = document.getElementById('s03-hdo'),
        b1 = document.getElementById('s03-ref1'), b2 = document.getElementById('s03-ref2'),
        bs = document.getElementById('s03-reshuf'), out = document.getElementById('s03-hout'), msg = document.getElementById('s03-hmsg');
    var r0 = rng(101), TR1 = rs(r0, 72), TR2 = rs(rng(202), 72);
    // fixed per-position random numbers, so the head changes smoothly with the slider
    var rr = rng(303), U = [], V = [], W = [], X = [];
    for (var i = 0; i < 72; i++){ U.push(rr()); V.push(rr()); W.push(other(rr, TR1[i])); X.push(B[Math.floor(rr() * 4)]); }
    var BODY = rs(rng(404), 28);
    var ref = 1, shufSeed = 1;

    function head(d){
      var s = [];
      for (var i = 0; i < 72; i++){
        if (U[i] < d){
          if (V[i] < 0.05){ /* deletion */ }
          else if (V[i] < 0.10){ s.push(TR1[i]); s.push(X[i]); }      // insertion of one base
          else s.push(W[i]);                                            // substitution
        } else s.push(TR1[i]);
      }
      return s.concat(BODY);
    }

    // Smith-Waterman, affine gaps: match +5, mismatch -4, gap of length k costs 12 + 4k
    function sw(a, b, tb){
      var n = a.length, m = b.length, M = m + 1, i, j;
      var H = new Float64Array((n + 1) * M), E = new Float64Array((n + 1) * M), F = new Float64Array((n + 1) * M);
      var NEG = -1e9; for (j = 0; j < M; j++){ E[j] = NEG; F[j] = NEG; }
      var best = 0, bi = 0, bj = 0;
      for (i = 1; i <= n; i++){
        E[i * M] = NEG; F[i * M] = NEG;
        for (j = 1; j <= m; j++){
          var k = i * M + j;
          var e = Math.max(E[k - 1] - 4, H[k - 1] - 16);
          var f = Math.max(F[k - M] - 4, H[k - M] - 16);
          var d = H[k - M - 1] + (a[i - 1] === b[j - 1] ? 5 : -4);
          var h = Math.max(0, d, e, f);
          E[k] = e; F[k] = f; H[k] = h;
          if (h > best){ best = h; bi = i; bj = j; }
        }
      }
      if (!tb) return { score: best };
      var cols = 0, id = 0, st = 'H'; i = bi; j = bj;
      while (i > 0 && j > 0){
        var k2 = i * M + j;
        if (st === 'H'){
          if (H[k2] === 0) break;
          if (H[k2] === H[k2 - M - 1] + (a[i - 1] === b[j - 1] ? 5 : -4)){ cols++; if (a[i - 1] === b[j - 1]) id++; i--; j--; }
          else if (H[k2] === E[k2]) st = 'E';
          else st = 'F';
        } else if (st === 'E'){
          cols++; if (E[k2] === H[k2 - 1] - 16) st = 'H'; j--;
        } else {
          cols++; if (F[k2] === H[k2 - M] - 16) st = 'H'; i--;
        }
      }
      return { score: best, cols: cols, id: id };
    }

    function shuffles(q){
      var r = rng(9000 + shufSeed * 31), res = [];
      for (var t = 0; t < 20; t++){
        var s = q.slice();
        for (var i = s.length - 1; i > 0; i--){ var j = Math.floor(r() * (i + 1)); var x = s[i]; s[i] = s[j]; s[j] = x; }
        res.push(s);
      }
      return res;
    }

    function draw(){
      var d = (+sl.value) / 100; so.textContent = sl.value + ' %';
      b1.setAttribute('aria-pressed', ref === 1); b2.setAttribute('aria-pressed', ref === 2);
      var R = ref === 1 ? TR1 : TR2, q = head(d);
      var real = sw(q, R, true);
      var sh = shuffles(q).map(function(s){ return sw(s, R, false).score; });
      var mx = Math.max.apply(null, sh);
      var W0 = 760, lx = 40, rx = 24, H0 = 120, y0 = 78, xmax = Math.max(380, Math.ceil(Math.max(real.score, mx) / 40) * 40 + 20);
      function X(v){ return lx + v / xmax * (W0 - lx - rx); }
      var svg = el('svg', { viewBox: '0 0 ' + W0 + ' ' + H0, width: '100%', role: 'img',
        'aria-label': 'Alignment score of the toy SINE against the tRNA, compared with 20 shuffled copies' });
      svg.style.minWidth = '560px';
      svg.appendChild(el('line', { x1: X(0), x2: X(xmax), y1: y0, y2: y0, stroke: 'var(--line)' }));
      for (var v = 0; v <= xmax; v += 40){
        svg.appendChild(el('line', { x1: X(v), x2: X(v), y1: y0, y2: y0 + 4, stroke: 'var(--line)' }));
        svg.appendChild(el('text', { x: X(v), y: y0 + 16, 'text-anchor': 'middle' }, String(v)));
      }
      svg.appendChild(el('text', { x: X(xmax), y: y0 + 32, 'text-anchor': 'end', class: 'lab' }, 'alignment score (raw)'));
      // shuffle dots (stacked when close)
      var seen = {};
      sh.forEach(function(s){
        var bin = Math.round(X(s) / 7); seen[bin] = (seen[bin] || 0) + 1;
        svg.appendChild(el('circle', { cx: X(s), cy: y0 - 6 - (seen[bin] - 1) * 8, r: 3.4, fill: 'var(--err)' }));
      });
      svg.appendChild(el('line', { x1: X(mx), x2: X(mx), y1: 18, y2: y0, stroke: 'var(--err)', 'stroke-dasharray': '4 3' }));
      var lblMax = el('text', { x: X(mx) + 4, y: 26, class: 'lab' }, 'best shuffle ' + mx);
      // real score bar
      var good = real.score > mx;
      svg.appendChild(el('rect', { x: X(real.score) - 2.5, y: 30, width: 5, height: y0 - 30, fill: good ? 'var(--good)' : 'var(--bad)' }));
      var lblReal = el('text', { x: X(real.score) + 6, y: 44, class: 'lab', fill: good ? 'var(--good)' : 'var(--bad)' }, 'real ' + real.score);
      // keep labels from overlapping: put the left one right-aligned when they are close
      if (Math.abs(X(real.score) - X(mx)) < 110){
        if (real.score >= mx){ lblMax.setAttribute('x', X(mx) - 4); lblMax.setAttribute('text-anchor', 'end'); }
        else { lblReal.setAttribute('x', X(real.score) - 6); lblReal.setAttribute('text-anchor', 'end'); }
      }
      svg.appendChild(lblMax); svg.appendChild(lblReal);
      fig.innerHTML = ''; fig.appendChild(svg);

      var ident = real.cols ? real.id / real.cols : 0, p6060 = ident >= 0.6 && real.cols >= 60;
      var verdict = good ? (p6060 ? 'tRNA' : 'tRNA?') : 'none detected';
      out.innerHTML =
        '<div>Real score<b>' + real.score + '</b></div>' +
        '<div>Best of 20 shuffles<b>' + mx + '</b></div>' +
        '<div>' + tipSpan('Identity over length', 'Identical bases / alignment columns of the best local alignment, and its length in columns. SINEBase calls a head RNA-derived at 60 % or more over 60 nt or more.') + '<b>' + Math.round(ident * 100) + ' % over ' + real.cols + ' nt</b></div>' +
        '<div>Verdict<b>' + verdict + '</b></div>';
      var t;
      if (ref === 2){
        t = good ? 'Even the unrelated tRNA scores above the shuffles this time: with 20 shuffles a chance win happens now and then. Press "New shuffles"; a real signal stays ahead.'
                 : 'Control: against an unrelated tRNA the real SINE scores like a shuffle. That is what "no signal" looks like.';
      } else if (good && p6060){
        t = 'The head beats every shuffle and passes 60 % over 60 nt: called tRNA-derived.';
      } else if (good){
        t = 'The head still beats every shuffle but no longer reaches 60 % over 60 nt: the signal is real but weak (SINEderella writes "tRNA?").';
      } else {
        t = 'The real score falls among the shuffles: not detected at this threshold. The head may still be tRNA-derived, only too worn to show it.';
      }
      msg.textContent = t;
    }
    sl.addEventListener('input', draw);
    b1.addEventListener('click', function(){ ref = 1; draw(); });
    b2.addEventListener('click', function(){ ref = 2; draw(); });
    bs.addEventListener('click', function(){ shufSeed++; draw(); });
    draw();
  })();

  /* ===================== Toy 2: step outward ===================== */
  (function(){
    var abox = document.getElementById('s03-xaln');
    if (!abox) return;
    var cbox = document.getElementById('s03-xchart');
    var dv = document.getElementById('s03-dv'), dvo = document.getElementById('s03-dvo'),
        bF = document.getElementById('s03-rf'), bM = document.getElementById('s03-rm'),
        cS = document.getElementById('s03-sub'), cT = document.getElementById('s03-tru'),
        bStep = document.getElementById('s03-step'), bRun = document.getElementById('s03-run'),
        bNew = document.getElementById('s03-new'), bBack = document.getElementById('s03-back'),
        out = document.getElementById('s03-xout'), msg = document.getElementById('s03-xmsg'), leg = document.getElementById('s03-xleg');
    var NC = 16, BODY = 40, EXT = 20, SEEDEND = 20, WIN = 10, NWIN = 10, TOT = SEEDEND + NWIN * WIN + 4;
    var SUB = [1, 4, 6, 9, 12, 14], CUT = 0.45;
    var seed = 11, rule = 'f', copies = [], bg = null, tested = [], stopAt = -1;

    function build(){
      var r = rng(seed), d = (+dv.value) / 100, sub = cS.checked;
      var body = rs(r, BODY), ext = rs(r, EXT);
      copies = [];
      for (var c = 0; c < NC; c++){
        var s = [], t = [], tail = 6 + Math.floor(r() * 9), i;
        var src = body.slice(); if (sub && SUB.indexOf(c) >= 0) src = src.concat(ext);
        for (i = 0; i < tail; i++) src.push('A');
        for (i = 0; i < src.length && s.length < TOT; i++){ s.push(r() < d ? other(r, src[i]) : src[i]); t.push(1); }
        while (s.length < TOT){ s.push(B[Math.floor(r() * 4)]); t.push(0); }
        copies.push({ s: s, t: t, end: src.length });
      }
      // background: 300 random 10-bp windows of the toy genome, 2000 random pairs
      var g = rng(seed * 7 + 3), wins = [], k;
      for (k = 0; k < 300; k++) wins.push(rs(g, WIN));
      var sum = 0, el2 = 0;
      for (k = 0; k < 2000; k++){
        var a = Math.floor(g() * 300), b; do { b = Math.floor(g() * 300); } while (b === a);
        var idv = ident(wins[a], wins[b], 0, WIN); sum += idv; if (idv > CUT) el2++;
      }
      bg = { mean: sum / 2000, frac: el2 / 2000 };
      tested = []; stopAt = -1;
    }
    function ident(a, b, s, n){ var m = 0; for (var i = s; i < s + n; i++) if (a[i] === b[i]) m++; return m / n; }

    function testWin(w){
      var s = SEEDEND + w * WIN, sum = 0, ne = 0, np = 0;
      for (var i = 0; i < NC; i++) for (var j = i + 1; j < NC; j++){
        var v = ident(copies[i].s, copies[j].s, s, WIN); sum += v; if (v > CUT) ne++; np++;
      }
      return { frac: ne / np, mean: sum / np };
    }
    function thrF(){ return bg.frac + 0.05; }
    function thrM(){ return bg.mean + 0.10; }
    function isBg(st){ return rule === 'f' ? st.frac <= thrF() : st.mean <= thrM(); }

    function step(){
      if (stopAt >= 0 || tested.length >= NWIN) return false;
      var st = testWin(tested.length); tested.push(st);
      if (isBg(st)) stopAt = tested.length - 1;
      return true;
    }

    function draw(){
      dvo.textContent = dv.value + ' %';
      bF.setAttribute('aria-pressed', rule === 'f'); bM.setAttribute('aria-pressed', rule === 'm');
      var cw = 7, lx = 56, top = 30, rh = 12, W = lx + TOT * cw + 8;
      var rev = SEEDEND + tested.length * WIN;
      function X(c){ return lx + c * cw; }
      // ---------- alignment ----------
      var alnH = NC * rh, H = top + alnH + 22;
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img',
        'aria-label': 'Sixteen toy SINE copies with their 3-prime flanks; tested windows marked below' });
      svg.style.minWidth = '760px';
      // column majority for colouring
      var maj = [];
      for (var c = 0; c < TOT; c++){
        var n = { A: 0, C: 0, G: 0, T: 0 }; copies.forEach(function(cp){ n[cp.s[c]]++; });
        var bb = 'A'; B.forEach(function(x){ if (n[x] > n[bb]) bb = x; }); maj.push(n[bb] >= NC / 2 ? bb : null);
      }
      // ruler: distance from the candidate end
      for (var w = 0; w <= NWIN; w++){
        var cx = X(SEEDEND + w * WIN);
        svg.appendChild(el('line', { x1: cx, x2: cx, y1: top - 14, y2: top - 9, stroke: 'var(--line)' }));
        if (w > 0) svg.appendChild(el('text', { x: cx, y: top - 17, 'text-anchor': 'middle', 'font-size': 10 }, '+' + (w * WIN)));
      }
      svg.appendChild(el('text', { x: X(0), y: top - 17, class: 'lab', 'font-size': 10 }, 'known part'));
      copies.forEach(function(cp, j){
        var y = top + j * rh;
        svg.appendChild(el('text', { x: 4, y: y, 'font-size': 10 }, 'copy ' + (j + 1) + (cS.checked && SUB.indexOf(j) >= 0 ? '*' : '')));
        for (var c = 0; c < TOT; c++){
          if (cT.checked && cp.t[c]) svg.appendChild(el('rect', { x: X(c), y: y - 9, width: cw, height: rh - 1, fill: 'var(--rep)', 'fill-opacity': 0.16 }));
          if (c < rev){
            var ok = maj[c] && cp.s[c] === maj[c];
            svg.appendChild(el('text', { x: X(c) + cw / 2, y: y, 'text-anchor': 'middle', 'font-size': 9.5,
              fill: ok ? 'var(--fg)' : 'var(--muted)', 'fill-opacity': ok ? 1 : 0.75 }, cp.s[c]));
          } else svg.appendChild(el('text', { x: X(c) + cw / 2, y: y, 'text-anchor': 'middle', 'font-size': 9.5, fill: 'var(--line)' }, '·'));
        }
      });
      // tested windows under the rows
      var wy = top + alnH - 4;
      tested.forEach(function(st, w){
        var isStop = w === stopAt;
        svg.appendChild(el('rect', { x: X(SEEDEND + w * WIN) + 1, y: wy, width: WIN * cw - 2, height: 8,
          fill: isStop ? 'var(--err)' : 'var(--rep)', 'fill-opacity': isStop ? 0.7 : 0.55 }));
      });
      svg.appendChild(el('line', { x1: X(SEEDEND), x2: X(SEEDEND), y1: top - 10, y2: top + alnH - 6, stroke: 'var(--accent)', 'stroke-width': 2 }));
      if (stopAt >= 0){
        var bx = X(SEEDEND + stopAt * WIN);
        svg.appendChild(el('line', { x1: bx, x2: bx, y1: top - 10, y2: top + alnH + 6, stroke: 'var(--good)', 'stroke-width': 2.5 }));
        svg.appendChild(el('text', { x: bx + 3, y: top + alnH + 16, class: 'lab', fill: 'var(--good)' }, 'boundary by the rule'));
      }
      if (cT.checked){
        var bodyEnd = X(BODY);
        svg.appendChild(el('line', { x1: bodyEnd, x2: bodyEnd, y1: top - 10, y2: top + alnH - 6, stroke: 'var(--rep)', 'stroke-dasharray': '3 2' }));
      }
      abox.innerHTML = ''; abox.appendChild(svg);

      // ---------- chart ----------
      var ch = 130, ct = 10, cbt = ct + ch, CH = cbt + 26;
      var sv2 = el('svg', { viewBox: '0 0 ' + W + ' ' + CH, width: '100%', role: 'img',
        'aria-label': 'Per window: share of elevated copy pairs (bars) and mean identity (dots), with background thresholds' });
      sv2.style.minWidth = '760px';
      function Y(p){ return cbt - p * ch; }
      [0, 0.5, 1].forEach(function(p){
        sv2.appendChild(el('line', { x1: lx, x2: X(TOT), y1: Y(p), y2: Y(p), stroke: 'var(--line)', 'stroke-width': p === 0 ? 1 : 0.5 }));
        sv2.appendChild(el('text', { x: lx - 4, y: Y(p) + 4, 'text-anchor': 'end', 'font-size': 10 }, Math.round(p * 100) + ' %'));
      });
      tested.forEach(function(st, w){
        var x0 = X(SEEDEND + w * WIN) + 3, isStop = w === stopAt;
        sv2.appendChild(el('rect', { x: x0, y: Y(st.frac), width: WIN * cw - 6, height: Math.max(0.5, st.frac * ch),
          fill: isStop ? 'var(--err)' : 'var(--rep)', 'fill-opacity': 0.75 }));
        sv2.appendChild(el('circle', { cx: x0 + (WIN * cw - 6) / 2, cy: Y(st.mean), r: 4, fill: 'var(--accent)', stroke: 'var(--panel)', 'stroke-width': 1 }));
      });
      var yF = Y(thrF()), yM = Y(thrM());
      sv2.appendChild(el('line', { x1: lx, x2: X(TOT), y1: yF, y2: yF, stroke: 'var(--rep)', 'stroke-dasharray': '5 3', 'stroke-width': rule === 'f' ? 1.6 : 0.8 }));
      sv2.appendChild(el('line', { x1: lx, x2: X(TOT), y1: yM, y2: yM, stroke: 'var(--accent)', 'stroke-dasharray': '2 3', 'stroke-width': rule === 'm' ? 1.6 : 0.8 }));
      sv2.appendChild(el('text', { x: lx + 4, y: yF - 4, 'font-size': 10, fill: 'var(--rep)' }, 'share limit ' + Math.round(thrF() * 100) + ' %'));
      sv2.appendChild(el('text', { x: lx + 4, y: yM - 4, 'font-size': 10, fill: 'var(--accent)' }, 'mean limit ' + Math.round(thrM() * 100) + ' %'));
      sv2.appendChild(el('text', { x: X(TOT), y: CH - 6, 'text-anchor': 'end', class: 'lab' }, 'bp past the candidate end (10-bp windows)'));
      cbox.innerHTML = ''; cbox.appendChild(sv2);

      leg.innerHTML = '<span><i style="background:var(--rep);height:10px"></i>share of elevated pairs (above 45 % identical)</span>' +
        '<span><i style="background:var(--accent);height:8px;width:8px;border-radius:50%"></i>mean pair identity</span>' +
        '<span><i style="background:var(--err);height:10px"></i>first window at background</span>' +
        '<span><i style="background:var(--good)"></i>boundary</span>' +
        (cT.checked ? '<span><i style="background:var(--rep);opacity:.3;height:10px"></i>true SINE bases</span>' : '');

      var last = tested[tested.length - 1];
      out.innerHTML =
        '<div>Windows tested<b>' + tested.length + ' of ' + NWIN + '</b></div>' +
        '<div>' + tipSpan('Last window', 'Share of the 120 copy pairs that are more than 45 % identical in the window, and their mean identity.') + '<b>' + (last ? pct(last.frac * 100) + ' / ' + pct(last.mean * 100) : '–') + '</b></div>' +
        '<div>' + tipSpan('Background', 'Measured on 300 random 10-bp windows of the toy genome, 2,000 random pairs: share of elevated pairs / mean identity.') + '<b>' + pct(bg.frac * 100) + ' / ' + pct(bg.mean * 100) + '</b></div>' +
        '<div>Boundary<b>' + (stopAt >= 0 ? '+' + (stopAt * WIN) + ' bp' : 'not yet') + '</b></div>';
    }

    function say(){
      var ruleName = rule === 'f' ? 'share rule' : 'mean rule';
      if (!tested.length){ msg.textContent = 'Nothing tested yet. The part left of the blue line is what the scan found; press "Step out 10 bp".'; return; }
      var w = tested.length - 1, st = tested[w], from = w * WIN + 1, to = (w + 1) * WIN;
      var head = 'Window +' + from + ' to +' + to + ' bp: ' + Math.round(st.frac * 100) + ' % of copy pairs are elevated (more than 45 % identical), mean identity ' + Math.round(st.mean * 100) + ' %. ';
      var tail;
      if (stopAt >= 0){
        var trueEnd = BODY - SEEDEND;
        tail = 'Background reached by the ' + ruleName + ': the boundary is +' + (stopAt * WIN) + ' bp. The body itself ends at +' + trueEnd + ' bp; with their tails (and the extra piece, if any) the copies end between +' +
          (Math.min.apply(null, copies.map(function(c){ return c.end; })) - SEEDEND) + ' and +' + (Math.max.apply(null, copies.map(function(c){ return c.end; })) - SEEDEND) + ' bp.';
        if (rule === 'm' && cS.checked) tail += ' Did the mean stop while the longer subgroup still agreed? Switch to the share rule and compare.';
      } else if (tested.length >= NWIN){
        tail = 'Still above background after 100 bp: in a real run the walk would go on (SINEderella stops at 1,000 bp and marks the side undetermined).';
      } else tail = 'Above background: still inside the element. Step again.';
      msg.textContent = head + tail;
    }

    function reset(rebuild){ if (rebuild) build(); else { tested = []; stopAt = -1; } draw(); say(); }
    bStep.addEventListener('click', function(){ step(); draw(); say(); });
    bRun.addEventListener('click', function(){ while (step()); draw(); say(); });
    bNew.addEventListener('click', function(){ seed++; reset(true); });
    bBack.addEventListener('click', function(){ reset(false); });
    dv.addEventListener('input', function(){ reset(true); });
    cS.addEventListener('change', function(){ reset(true); });
    cT.addEventListener('change', function(){ draw(); });
    bF.addEventListener('click', function(){ rule = 'f'; reset(false); });
    bM.addEventListener('click', function(){ rule = 'm'; reset(false); });
    build(); draw(); say();
  })();
})();
