(function(){
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent, text){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) { if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]); }
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* ---------- static chain figure ---------- */
  (function chainFig(){
    var box = document.getElementById('s07-chainfig');
    if (!box) return;
    var W = 760, H = 150;
    var svg = el('svg', {viewBox:'0 0 '+W+' '+H, width:'100%', role:'img', 'aria-label':'Toy chain: four gapless blocks joining reference and query, with single- and double-sided gaps'});
    svg.style.minWidth = '560px';
    var x0 = 110, sc = 1.25;           // px per base
    var blocks = [120, 90, 150, 60], dt = [40, 30, 0], dq = [0, 25, 15];
    var yR = 34, yQ = 104, h = 14;
    el('text', {x:8, y:yR+11, 'class':'lab'}, svg, 'reference');
    el('text', {x:8, y:yQ+11, 'class':'lab'}, svg, 'query');
    var tx = x0, qx = x0;
    for (var i = 0; i < blocks.length; i++) {
      var w = blocks[i] * sc;
      el('polygon', {points:[tx,yR+h, tx+w,yR+h, qx+w,yQ, qx,yQ].join(' '), style:'fill:var(--accent);opacity:.13'}, svg);
      el('rect', {x:tx, y:yR, width:w, height:h, rx:2, style:'fill:var(--accent)'}, svg);
      el('rect', {x:qx, y:yQ, width:w, height:h, rx:2, style:'fill:var(--accent)'}, svg);
      el('text', {x:tx+w/2, y:yR-6, 'text-anchor':'middle'}, svg, blocks[i]+' bp');
      tx += w; qx += w;
      if (i < dt.length) {
        var gt = dt[i]*sc, gq = dq[i]*sc;
        var lbl = (gt && gq) ? 'gap '+(i+1)+': double-sided' : 'gap '+(i+1)+': single-sided';
        // reference side
        if (gt) {
          if (gq) { el('line',{x1:tx,y1:yR+h/2-2,x2:tx+gt,y2:yR+h/2-2,style:'stroke:var(--muted)'},svg); el('line',{x1:tx,y1:yR+h/2+2,x2:tx+gt,y2:yR+h/2+2,style:'stroke:var(--muted)'},svg); }
          else el('line',{x1:tx,y1:yR+h/2,x2:tx+gt,y2:yR+h/2,style:'stroke:var(--muted)'},svg);
        }
        if (gq) {
          if (gt) { el('line',{x1:qx,y1:yQ+h/2-2,x2:qx+gq,y2:yQ+h/2-2,style:'stroke:var(--muted)'},svg); el('line',{x1:qx,y1:yQ+h/2+2,x2:qx+gq,y2:yQ+h/2+2,style:'stroke:var(--muted)'},svg); }
          else el('line',{x1:qx,y1:yQ+h/2,x2:qx+gq,y2:yQ+h/2,style:'stroke:var(--muted)'},svg);
        }
        var mid = (tx + gt/2 + qx + gq/2) / 2;
        el('text', {x:mid, y:(yR+yQ)/2+12, 'text-anchor':'middle', 'class':'lab'}, svg, lbl);
        el('text', {x:mid, y:(yR+yQ)/2+26, 'text-anchor':'middle'}, svg, 'dt='+dt[i]+', dq='+dq[i]);
        tx += gt; qx += gq;
      }
    }
    el('text', {x:x0, y:yQ+34}, svg, 'reference 1000-1490 (490 bp) | query 5000-5460 (460 bp)');
    box.appendChild(svg);
  })();

  /* ---------- toy TOGA2 classifier ---------- */
  var fig = document.getElementById('s07-fig');
  if (!fig) return;
  var EX = [160, 221, 135, 297, 187, 200];     // exon lengths in bp (sum 1200 = 400 codons)
  var NC = 400, FIRST10 = 40, LAST10 = 360, ATG = 30;
  var exStartBp = [], acc = 0;
  for (var i = 0; i < EX.length; i++) { exStartBp.push(acc); acc += EX[i]; }
  function exonOfCodon(c){ // c 1-based; exon containing first base of codon
    var bp = (c - 1) * 3;
    for (var e = EX.length - 1; e >= 0; e--) if (bp >= exStartBp[e]) return e;
    return 0;
  }
  var exCodons = EX.map(function(){ return []; });
  for (var c = 1; c <= NC; c++) exCodons[exonOfCodon(c)].push(c);

  var state = { muts: [], exon: EX.map(function(){ return 'I'; }), mode: 'fsdel' };

  var PRESETS = [
    {n:'Choose an example…', m:[], ex:{}},
    {n:'Intact ortholog', m:[], ex:{}},
    {n:'One homopolymer error (−1 at codon 150)', m:[['fsdel',150]], ex:{}},
    {n:'Frameshift + stop in two exons', m:[['fsdel',150],['stop',260]], ex:{}},
    {n:'Stop codon in the last 10 % only', m:[['stop',385]], ex:{}},
    {n:'Middle frameshift + C-terminal stop', m:[['fsdel',150],['stop',385]], ex:{}},
    {n:'Two mutations in the same exon', m:[['fsdel',140],['stop',165]], ex:{}},
    {n:'Compensating −1 / +1 pair', m:[['fsdel',200],['fsins',212]], ex:{}},
    {n:'Early frameshift (try the ATG box)', m:[['fsins',20]], ex:{}},
    {n:'Exon 4 in an assembly gap', m:[], ex:{3:'M'}},
    {n:'Exons 2, 4, 5 in gaps', m:[], ex:{1:'M',3:'M',4:'M'}},
    {n:'Exon 3 deleted (135 bp, in frame)', m:[], ex:{2:'D'}},
    {n:'Exon 2 deleted (221 bp, frameshift)', m:[], ex:{1:'D'}},
    {n:'Three events, one in a homopolymer', m:[['fsins',45],['stop',200],['fsdel',300,'homopolymer G5']], ex:{}}
  ];

  var TYPE = {fsdel:{t:'FS_DEL', d:'-1'}, fsins:{t:'FS_INS', d:'1'}, stop:{t:'STOP', d:'TAG'}};
  var STAT = {
    FI:{name:'Fully Intact', rgb:'0,0,100', css:'var(--accent)', op:1},
    I:{name:'Intact', rgb:'0,0,200', css:'var(--accent)', op:.7},
    PI:{name:'Partially Intact', rgb:'0,200,255', css:'var(--accent)', op:.4},
    UL:{name:'Uncertain Loss', rgb:'255,160,120', css:'var(--het)', op:1},
    L:{name:'Lost', rgb:'255,50,50', css:'var(--bad)', op:1},
    M:{name:'Missing', rgb:'130,130,130', css:'var(--muted)', op:1}
  };

  /* ---- core: masking, unmasking, codon string, classification ---- */
  function compute(){
    var atg = document.getElementById('s07-atg').checked;
    var m10m = document.getElementById('s07-m10m').checked;
    var rows = [];
    var muts = state.muts.slice().sort(function(a,b){ return a.codon - b.codon; });
    muts.forEach(function(m){
      rows.push({kind:m.kind, type:TYPE[m.kind].t, desc:TYPE[m.kind].d, codon:m.codon, exon:exonOfCodon(m.codon), masked:false, reason:'-', positional:false, comp:false, note:m.note||''});
    });
    // exon-level events
    state.exon.forEach(function(s, e){
      if (s === 'D') rows.push({kind:'delex', type:'Deleted exon', desc:'-', codon:exCodons[e][0], codonEnd:exCodons[e][exCodons[e].length-1], exon:e, masked:false, reason:'-', positional:false, comp:false});
      if (s === 'M') rows.push({kind:'missex', type:'Missing exon', desc:'-', codon:exCodons[e][0], codonEnd:exCodons[e][exCodons[e].length-1], exon:e, masked:false, reason:'-', positional:false, comp:false});
    });
    rows.sort(function(a,b){ return a.codon - b.codon; });

    // 1. compensation among frameshifts in present exons (no stop between)
    var fs = rows.filter(function(r){ return (r.kind==='fsdel'||r.kind==='fsins') && state.exon[r.exon]==='I'; });
    var stops = rows.filter(function(r){ return r.kind==='stop' && state.exon[r.exon]==='I'; });
    var comps = [];
    var k = 0;
    while (k < fs.length) {
      var sum = 0, found = -1;
      for (var j = k; j < fs.length; j++) {
        sum += (fs[j].kind==='fsdel' ? -1 : 1);
        if (j > k && ((sum % 3) + 3) % 3 === 0) {
          var a = fs[k].codon, b = fs[j].codon;
          var stopBetween = stops.some(function(s){ return s.codon > a && s.codon < b; });
          if (!stopBetween) { found = j; }
          break;
        }
      }
      if (found >= 0) {
        var grp = [];
        for (var q = k; q <= found; q++) { fs[q].masked = true; fs[q].reason = 'Compensated'; fs[q].comp = true; grp.push(fs[q]); }
        comps.push(grp);
        k = found + 1;
      } else k++;
    }

    // 2. exon-based and positional masking
    function toMask(codon, isDeletion){
      var inLast = codon >= LAST10, inFirst = codon <= FIRST10;
      if ((m10m && inFirst && !isDeletion) || inLast) {
        var portion = inFirst ? codon / NC * 100 : 100 - codon / NC * 100;
        return [true, (inFirst ? 'N' : 'C') + '-terminal ' + portion.toFixed(1) + '%'];
      }
      if (atg && ATG > codon) return [true, 'Alternative start found'];
      return [false, '-'];
    }
    rows.forEach(function(r){
      if (r.kind === 'missex') { return; }              // missing sequence, not a hit
      if (r.comp) return;
      if (r.kind === 'delex') {
        if (EX[r.exon] % 3 === 0) { r.masked = true; r.reason = 'Frame-preserving deletion'; r.fp = true; return; }
        var cs = exCodons[r.exon], res = [false,'-'];
        for (var i2 = 0; i2 < cs.length; i2++) { res = toMask(cs[i2], true); if (!res[0]) break; }
        if (res[0]) { r.masked = true; r.reason = res[1]; r.positional = true; r.fp = true; }
        return;
      }
      if (state.exon[r.exon] !== 'I') { r.masked = true; r.reason = state.exon[r.exon]==='D' ? 'Exon is deleted' : 'Exon is missing'; r.safe = true; return; }
      var t = toMask(r.codon, false);
      if (t[0]) { r.masked = true; r.reason = t[1]; r.positional = true; }
    });

    // 3. unmasking
    var affecting = rows.filter(function(r){ return r.kind!=='missex' && !r.safe && !(r.kind==='delex' && r.fp); });
    var inactivatingFound = affecting.some(function(r){ return !r.masked; });
    var unmasked = [];
    if (inactivatingFound) {
      rows.forEach(function(r){
        if (r.positional || r.comp) { if (r.masked) unmasked.push(r); r.masked = false; r.wasReason = r.reason; r.reason = '-'; }
      });
    }

    // 4. codon status string
    var cs = new Array(NC + 1);
    for (var c2 = 1; c2 <= NC; c2++) {
      var e2 = exonOfCodon(c2);
      cs[c2] = state.exon[e2]==='M' ? 'M' : state.exon[e2]==='D' ? (EX[e2]%3===0 ? 'D' : 'L') : 'I';
    }
    rows.forEach(function(r){
      if ((r.kind==='fsdel'||r.kind==='fsins'||r.kind==='stop') && !r.masked && !r.comp && state.exon[r.exon]==='I') cs[r.codon] = 'L';
    });
    var str = cs.slice(1).join('');
    function longest(s){ var best = 0; s.split('L').forEach(function(p){ if (p.length > best) best = p.length; }); return best; }
    var noD = str.replace(/D/g,'');
    var strict = longest(noD.replace(/M/g,'')) / NC;
    var relaxed = longest(noD.replace(/M/g,'I')) / NC;
    var middleIntact = str.slice(m10m ? FIRST10 : 0, LAST10).indexOf('L') < 0;
    var middlePresent = str.slice(FIRST10, LAST10).indexOf('M') < 0;
    var nonMissing = NC - (str.match(/M/g)||[]).length;
    var totalIntact = nonMissing ? (str.match(/I/g)||[]).length / nonMissing : 1;
    var missingBp = 0; state.exon.forEach(function(s,e){ if (s==='M') missingBp += EX[e]; });
    var missingPerc = missingBp / 1200;

    // affected exons
    var critical = rows.filter(function(r){ return (!r.masked && r.kind!=='missex') || r.kind==='missex'; });
    var affExons = {};
    critical.forEach(function(r){
      if (r.kind==='missex') return;
      if (r.kind==='delex') { if (!r.fp) affExons[r.exon] = 1; return; }
      if (state.exon[r.exon]==='I') affExons[r.exon] = 1;
    });
    var nAff = Object.keys(affExons).length;
    var nonMissingExons = state.exon.filter(function(s){ return s!=='M'; }).length;
    var thr = nonMissingExons === 1 ? 1 : nonMissingExons <= 10 ? 2 : nonMissingExons / 5;
    var anyMasked = rows.some(function(r){ return r.masked; });

    // 5. classification (order as in classify_projection)
    var st, why;
    if (critical.length === 0 && strict > 0.6) {
      if (!anyMasked) { st = 'FI'; why = 'No mutation of any kind and every exon present: <b>FI</b>.'; }
      else { st = 'I'; why = 'No unmasked mutation; the only events are masked ('+rows.filter(function(r){return r.masked;}).map(function(r){return esc(r.reason);}).join('; ')+'). A masked event is enough to drop FI to <b>I</b>.'; }
    } else if (state.exon.every(function(s){ return s==='D'; })) {
      st = 'L'; why = 'Every exon deleted: <b>L</b>.';
    } else if (totalIntact < 0.35) {
      st = 'L'; why = 'Fewer than 35 % of the non-missing codons are intact: <b>L</b>.';
    } else if (relaxed < 0.2) {
      st = 'L'; why = 'The longest stretch without lost codons is under 20 % of the gene: <b>L</b>.';
    } else if (state.exon.every(function(s){ return s==='M'; })) {
      st = 'M'; why = 'All exons missing: <b>M</b>.';
    } else if (middleIntact) {
      if (totalIntact < 0.49) { st = 'UL'; why = 'Middle free of mutations, but under 49 % of codons intact: <b>UL</b>.'; }
      else if (!missingBp || middlePresent) { st = 'I'; why = 'No unmasked mutation in the middle'+(missingBp ? ', and the missing exon lies only in the terminal 10 %' : '')+': <b>I</b>.'; }
      else if (missingPerc < 0.5) { st = 'PI'; why = 'No mutation, but missing exons reach into the middle 80 % and make up '+(missingPerc*100).toFixed(1)+' % of the sequence (under 50 %): <b>PI</b>. Close the gap and it may become I.'; }
      else { st = 'M'; why = 'No mutation, but '+(missingPerc*100).toFixed(1)+' % of the coding sequence is missing (50 % or more): <b>M</b>.'; }
    } else {
      if (strict < 0.6) {
        if (nAff >= thr) { st = 'L'; why = 'Unmasked mutations hit '+nAff+' exons (threshold '+thr+' for '+nonMissingExons+' non-missing exons) and the longest intact run is '+(strict*100).toFixed(1)+' % (&lt; 60 %): <b>L</b>.'; }
        else { st = 'UL'; why = 'The longest intact run is '+(strict*100).toFixed(1)+' %, but only '+nAff+' exon'+(nAff===1?' is':'s are')+' hit (L needs '+thr+'): <b>UL</b>.'; }
      } else {
        st = 'UL'; why = 'There is an unmasked mutation outside the masked zones, but the longest intact run is still '+(strict*100).toFixed(1)+' % (60 % or more), so the evidence is weak: <b>UL</b>.';
      }
    }
    if (unmasked.length) why += ' Note: '+unmasked.length+' event'+(unmasked.length>1?'s were':' was')+' masked ('+unmasked.map(function(r){return esc(r.wasReason);}).join('; ')+') but '+(unmasked.length>1?'were':'was')+' <b>unmasked</b> because another unmasked mutation exists.';
    return {rows:rows, str:str, strict:strict, middleIntact:middleIntact, middlePresent:middlePresent, nAff:nAff, thr:thr, missingPerc:missingPerc, st:st, why:why, comps:comps, atg:atg, m10m:m10m};
  }

  /* ---- drawing ---- */
  var W = 900, X0 = 70, GAP = 14, PX = (W - X0 - 20 - GAP * 5) / NC;
  function codonX(c){ var e = exonOfCodon(c); return X0 + e * GAP + (c - 1) * PX; }
  function exX(e){ return X0 + e * GAP + (exCodons[e][0] - 1) * PX; }
  function exW(e){ return exCodons[e].length * PX; }
  var yR = 44, yQ = 132, eh = 18, yS = 214;
  var svgRef;

  function draw(res){
    fig.innerHTML = '';
    var svg = el('svg', {viewBox:'0 0 '+W+' 268', width:'100%', role:'img', 'aria-label':'Toy projection: reference exons, query exons with mutations, and codon status strip'});
    svg.style.minWidth = '640px';
    svgRef = svg;
    var defs = el('defs', {}, svg);
    var pat = el('pattern', {id:'s07-hatch', width:6, height:6, patternUnits:'userSpaceOnUse', patternTransform:'rotate(45)'}, defs);
    el('line', {x1:0, y1:0, x2:0, y2:6, style:'stroke:var(--muted);stroke-width:2'}, pat);

    // terminal zones
    var xF = codonX(FIRST10) + PX, xL = codonX(LAST10);
    el('rect', {x:X0, y:yR-16, width:xF-X0, height:yQ+eh+6-(yR-16), style:'fill:var(--het);opacity:'+(res.m10m||res.atg ? .12 : .06)}, svg);
    el('rect', {x:xL, y:yR-16, width:codonX(NC)+PX-xL, height:yQ+eh+6-(yR-16), style:'fill:var(--het);opacity:.12'}, svg);
    el('text', {x:X0+2, y:yR-20}, svg, 'first 10 %');
    el('text', {x:codonX(NC)+PX, y:yR-20, 'text-anchor':'end'}, svg, 'last 10 % (masked)');
    el('text', {x:(xF+xL)/2, y:yR-20, 'text-anchor':'middle'}, svg, 'middle 80 % of the coding sequence');

    el('text', {x:4, y:yR+13, 'class':'lab'}, svg, 'reference');
    el('text', {x:4, y:yQ+13, 'class':'lab'}, svg, 'query');
    el('text', {x:4, y:yQ+28}, svg, '(click)');
    // intron lines
    el('line', {x1:X0, y1:yR+eh/2, x2:codonX(NC)+PX, y2:yR+eh/2, style:'stroke:var(--line)'}, svg);
    el('line', {x1:X0, y1:yQ+eh/2, x2:codonX(NC)+PX, y2:yQ+eh/2, style:'stroke:var(--line)'}, svg);
    for (var e = 0; e < EX.length; e++) {
      var x = exX(e), w = exW(e), s = state.exon[e];
      el('rect', {x:x, y:yR, width:w, height:eh, rx:2, style:'fill:var(--accent)'}, svg);
      el('text', {x:x+w/2, y:yR+13, 'text-anchor':'middle', style:'fill:var(--bg)'}, svg, (e+1)+' · '+EX[e]+' bp');
      if (s === 'I') {
        el('polygon', {points:[x,yR+eh, x+w,yR+eh, x+w,yQ, x,yQ].join(' '), style:'fill:var(--accent);opacity:.1'}, svg);
        el('rect', {x:x, y:yQ, width:w, height:eh, rx:2, style:'fill:var(--accent);opacity:.85'}, svg);
      } else if (s === 'D') {
        el('rect', {x:x, y:yQ, width:w, height:eh, rx:2, style:'fill:none;stroke:var(--bad);stroke-dasharray:4 3'}, svg);
        el('text', {x:x+w/2, y:yQ+13, 'text-anchor':'middle'}, svg, EX[e]%3===0 ? 'deleted (in frame)' : 'deleted');
      } else {
        el('rect', {x:x, y:yQ, width:w, height:eh, rx:2, style:'fill:url(#s07-hatch);stroke:var(--muted)'}, svg);
        el('text', {x:x+w/2, y:yQ-4, 'text-anchor':'middle'}, svg, 'NNNN gap');
      }
    }
    // ATG marker
    if (res.atg) {
      var ax = codonX(ATG);
      el('line', {x1:ax, y1:yQ-6, x2:ax, y2:yQ+eh+6, style:'stroke:var(--good);stroke-width:2'}, svg);
      el('text', {x:ax+3, y:yQ+eh+16, style:'fill:var(--good)'}, svg, 'ATG');
    }
    // compensation arcs
    res.comps.forEach(function(g){
      var a = codonX(g[0].codon), b = codonX(g[g.length-1].codon), mid = (a+b)/2;
      el('path', {d:'M'+a+' '+(yQ-2)+' Q'+mid+' '+(yQ-34)+' '+b+' '+(yQ-2), style:'fill:none;stroke:var(--good);stroke-width:1.5'}, svg);
    });
    // point mutations
    res.rows.forEach(function(r){
      if (r.kind!=='fsdel' && r.kind!=='fsins' && r.kind!=='stop') return;
      var cx = codonX(r.codon) + PX/2;
      var col = r.masked ? 'var(--muted)' : (r.kind==='stop' ? 'var(--fg)' : 'var(--bad)');
      var op = r.masked ? .55 : 1;
      var g = el('g', {style:'opacity:'+op}, svg);
      el('title', {}, g, r.type+' at codon '+r.codon+' (exon '+(r.exon+1)+'): '+(r.masked ? 'masked, '+r.reason : 'NOT masked'));
      if (r.kind === 'fsdel') {
        el('line', {x1:cx, y1:yQ-10, x2:cx, y2:yQ+eh+4, style:'stroke:'+col+';stroke-width:2.5'}, g);
        el('text', {x:cx, y:yQ-13, 'text-anchor':'middle', style:'fill:'+col}, g, '-1');
      } else if (r.kind === 'fsins') {
        el('polygon', {points:[cx-6,yQ-14, cx+6,yQ-14, cx,yQ-3].join(' '), style:'fill:'+col}, g);
        el('text', {x:cx, y:yQ-17, 'text-anchor':'middle', style:'fill:'+col}, g, '+1');
      } else {
        var pts = [], R1 = 7, R2 = 3;
        for (var p = 0; p < 10; p++) { var ang = -Math.PI/2 + p*Math.PI/5, rr = p%2 ? R2 : R1; pts.push((cx+rr*Math.cos(ang)).toFixed(1)+','+(yQ-9+rr*Math.sin(ang)).toFixed(1)); }
        el('polygon', {points:pts.join(' '), style:'fill:'+col}, g);
        el('line', {x1:cx, y1:yQ-2, x2:cx, y2:yQ+eh+2, style:'stroke:'+col+';stroke-width:1.5'}, g);
      }
      if (r.note) el('text', {x:cx, y:yQ+eh+16, 'text-anchor':'middle', style:'fill:var(--het)'}, g, r.note);
    });
    // codon status strip
    el('text', {x:4, y:yS+11, 'class':'lab'}, svg, 'codons');
    var colors = {I:'var(--accent)', L:'var(--bad)', M:'url(#s07-hatch)', D:'var(--line)'};
    var run = res.str[0], start = 0;
    for (var c = 1; c <= NC; c++) {
      var ch = c < NC ? res.str[c] : null;
      if (ch !== run) {
        var xa = codonX(start+1), xb = codonX(c) + PX;
        el('rect', {x:xa, y:yS, width:Math.max(xb-xa, 2), height:14, style:'fill:'+colors[run]+(run==='I' ? ';opacity:.45' : '')}, svg);
        run = ch; start = c;
      }
    }
    el('text', {x:X0, y:yS+30}, svg, 'I intact · L lost codon · M missing · D deleted in frame   |   longest intact run '+(res.strict*100).toFixed(1)+' % of 400 codons');
    el('text', {x:X0, y:yS+46}, svg, 'scale: codon 1 → 400; exons drawn at their length, introns as gaps');
    // click target
    var hit = el('rect', {x:X0-4, y:yQ-26, width:W-X0, height:eh+42, style:'fill:transparent;cursor:crosshair'}, svg);
    hit.addEventListener('click', onClick);
    fig.appendChild(svg);
  }

  function xToCodon(x){
    var best = 1, bd = 1e9;
    for (var c = 1; c <= NC; c++) { var d = Math.abs(codonX(c) + PX/2 - x); if (d < bd) { bd = d; best = c; } }
    return best;
  }
  function onClick(ev){
    var pt = svgRef.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    var m = svgRef.getScreenCTM(); if (!m) return;
    var p = pt.matrixTransform(m.inverse());
    place(xToCodon(p.x));
  }
  function place(c){
    c = Math.max(1, Math.min(NC, Math.round(c)));
    var e = exonOfCodon(c), mode = state.mode;
    if (mode === 'delex') state.exon[e] = state.exon[e]==='D' ? 'I' : 'D';
    else if (mode === 'missex') state.exon[e] = state.exon[e]==='M' ? 'I' : 'M';
    else if (mode === 'erase') {
      var bi = -1, bd = 1e9;
      state.muts.forEach(function(mm, i){ var d = Math.abs(mm.codon - c); if (d < bd) { bd = d; bi = i; } });
      if (bi >= 0 && bd <= 8) state.muts.splice(bi, 1);
      else if (state.exon[e] !== 'I') state.exon[e] = 'I';
    } else {
      state.muts = state.muts.filter(function(mm){ return mm.codon !== c; });
      state.muts.push({kind:mode, codon:c});
    }
    document.getElementById('s07-codon').value = c;
    update();
  }

  function update(){
    var res = compute();
    draw(res);
    var S = STAT[res.st];
    document.getElementById('s07-out').innerHTML =
      '<div>Projection status<b style="color:'+S.css+';opacity:'+S.op+'">'+res.st+' · '+S.name+'</b>BED itemRgb <code>'+S.rgb+'</code></div>' +
      '<div><span class="tip" title="Codons 1-360 (the first 10 % is excluded only with -m10m): does any unmasked frameshift, stop or frameshifting exon deletion fall here?">Middle free of unmasked mutations?</span><b>'+(res.middleIntact ? 'yes' : 'no')+'</b>missing exons reach the middle 80 %: '+(res.middlePresent ? 'no' : 'yes')+' ('+(res.missingPerc*100).toFixed(1)+' % of sequence missing)</div>' +
      '<div><span class="tip" title="Longest stretch of intact codons (deleted-in-frame and missing codons removed), divided by all 400 reference codons. TOGA2 needs it under 60 % for L in a multi-exon gene.">Longest intact run</span><b>'+(res.strict*100).toFixed(1)+' %</b>exons hit by unmasked events: '+res.nAff+' (L needs '+res.thr+')</div>';
    document.getElementById('s07-why').innerHTML = res.why;
    var t = '<thead><tr><th>exon</th><th>ref_codon</th><th>type</th><th>description</th><th>is_masked</th><th>masking_reason</th></tr></thead><tbody>';
    if (!res.rows.length) t += '<tr><td colspan="6">No events. In the real <code>inactivating_mutations.tsv</code> this projection would have no rows.</td></tr>';
    res.rows.forEach(function(r){
      var cod = r.codonEnd ? r.codon+'_'+r.codonEnd : r.codon;
      var reason = r.reason;
      if (!r.masked && r.wasReason) reason = '- <span style="color:var(--het)">(unmasked; was '+esc(r.wasReason)+')</span>';
      t += '<tr><td>'+(r.exon+1)+'</td><td>'+cod+'</td><td><code>'+esc(r.type)+'</code>'+(r.note ? ' <span class="tag l">'+esc(r.note)+'</span>' : '')+'</td><td>'+esc(r.desc)+'</td><td>'+(r.masked ? 'MASKED' : '<b style="color:var(--bad)">NOT_MASKED</b>')+'</td><td>'+(r.masked ? esc(reason) : reason)+'</td></tr>';
    });
    document.getElementById('s07-tbl').innerHTML = t + '</tbody>';
  }

  // controls
  var modeBox = document.getElementById('s07-mode');
  modeBox.addEventListener('click', function(ev){
    var b = ev.target.closest('button'); if (!b) return;
    state.mode = b.getAttribute('data-m');
    modeBox.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
  });
  document.getElementById('s07-place').addEventListener('click', function(){
    var v = parseInt(document.getElementById('s07-codon').value, 10);
    if (!isNaN(v)) place(v);
  });
  document.getElementById('s07-codon').addEventListener('keydown', function(ev){
    if (ev.key === 'Enter') { ev.preventDefault(); var v = parseInt(this.value, 10); if (!isNaN(v)) place(v); }
  });
  document.getElementById('s07-clear').addEventListener('click', function(){
    state.muts = []; state.exon = EX.map(function(){ return 'I'; });
    document.getElementById('s07-preset').value = '0'; update();
  });
  document.getElementById('s07-atg').addEventListener('change', update);
  document.getElementById('s07-m10m').addEventListener('change', update);
  var sel = document.getElementById('s07-preset');
  PRESETS.forEach(function(p, i){ var o = document.createElement('option'); o.value = i; o.textContent = p.n; sel.appendChild(o); });
  sel.addEventListener('change', function(){
    var p = PRESETS[+sel.value]; if (!p || +sel.value === 0) return;
    state.muts = p.m.map(function(x){ return {kind:x[0], codon:x[1], note:x[2]}; });
    state.exon = EX.map(function(_, i){ return p.ex[i] || 'I'; });
    update();
  });

  document.getElementById('s07-legend').innerHTML =
    '<span><i style="background:var(--bad);height:10px;width:3px"></i>−1 deletion (red line)</span>' +
    '<span><i style="background:var(--bad)"></i>+1 insertion (triangle)</span>' +
    '<span><i style="background:var(--fg)"></i>stop codon (star)</span>' +
    '<span><i style="background:var(--muted)"></i>grey = masked</span>' +
    '<span><i style="background:var(--good)"></i>green arc = compensating frameshifts</span>' +
    '<span><i style="background:var(--het);opacity:.5;height:10px"></i>terminal 10 % zones</span>';

  // start with the teaching example
  sel.value = '5';
  sel.dispatchEvent(new Event('change'));
})();
