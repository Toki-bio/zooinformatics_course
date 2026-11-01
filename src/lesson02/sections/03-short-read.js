(function(){
  var NS = 'http://www.w3.org/2000/svg';
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  function fmt(x, d){ return Number(x).toFixed(d); }

  /* ================= 1. de Bruijn graph toy ================= */
  (function(){
    var fig = $('s03-dbg-fig'); if(!fig) return;
    var kIn = $('s03-dbg-k'), kOut = $('s03-dbg-ko'), out = $('s03-dbg-out'), modeBox = $('s03-dbg-mode');
    // deterministic pseudo-random sequence
    var seed = 20261031;
    function rnd(){ seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    function rseq(n){ var s=''; for(var i=0;i<n;i++) s += 'ACGT'[Math.floor(rnd()*4)]; return s; }
    var A = rseq(22), R = rseq(12), B = rseq(18), C = rseq(30);
    var G = A + R + B + R + C;               // haplotype 1 = reference
    var rep1 = A.length, rep2 = A.length + R.length + B.length, RL = R.length;
    var snpPos = rep2 + RL + 6;             // heterozygous site in C
    var alt = {A:'G',C:'T',G:'A',T:'C'};
    var H2 = G.slice(0, snpPos) + alt[G[snpPos]] + G.slice(snpPos + 1);
    var errStart = 3, errLen = 16, errOff = 13; // read from A, error 3 bases before its end
    var readSeq = G.substr(errStart, errLen);
    var ERR = readSeq.slice(0, errOff) + alt[readSeq[errOff]] + readSeq.slice(errOff + 1);
    var mode = 'clean';

    function build(k){
      var seqs = [{s:G, off:0, kind:'ref'}];
      if(mode === 'het') seqs.push({s:H2, off:0, kind:'het'});
      if(mode === 'err') seqs.push({s:ERR, off:errStart, kind:'err'});
      var cnt = {}, origin = {};
      seqs.forEach(function(q){
        for(var i=0;i+k<=q.s.length;i++){
          var km = q.s.substr(i,k);
          cnt[km] = (cnt[km]||0) + 1;
          if(!origin[km]) origin[km] = {};
          origin[km][q.kind] = true;
        }
      });
      var kms = Object.keys(cnt);
      function succ(x){ var r=[]; var b=x.slice(1); for(var j=0;j<4;j++){ var y=b+'ACGT'[j]; if(cnt[y]) r.push(y);} return r; }
      function pred(x){ var r=[]; var b=x.slice(0,-1); for(var j=0;j<4;j++){ var y='ACGT'[j]+b; if(cnt[y]) r.push(y);} return r; }
      var S = {}, P = {};
      kms.forEach(function(x){ S[x]=succ(x); P[x]=pred(x); });
      var seen = {}, unitigs = [];
      function isStart(x){ if(P[x].length !== 1) return true; var p = P[x][0]; return S[p].length !== 1 || p === x; }
      function walk(x){
        var path = [x]; seen[x] = true; var cur = x;
        while(S[cur].length === 1){ var nx = S[cur][0]; if(P[nx].length !== 1 || seen[nx]) break; path.push(nx); seen[nx] = true; cur = nx; }
        return path;
      }
      // starts in genome order for stable numbering
      var order = [];
      seqs.forEach(function(q){ for(var i=0;i+k<=q.s.length;i++) order.push(q.s.substr(i,k)); });
      order.forEach(function(x){ if(!seen[x] && isStart(x)) unitigs.push(walk(x)); });
      order.forEach(function(x){ if(!seen[x]) unitigs.push(walk(x)); }); // cycles
      var idx = {};
      var U = unitigs.map(function(p, i){
        var seq = p[0] + p.slice(1).map(function(x){ return x[x.length-1]; }).join('');
        var c = 0, ori = {}; p.forEach(function(x){ c += cnt[x]; for(var o in origin[x]) ori[o] = true; });
        p.forEach(function(x){ idx[x] = i; });
        var kind = (ori.ref ? 'ref' : (ori.het ? 'het' : 'err'));
        // occurrences in the reference (or in the source sequence for branch-only unitigs)
        var occ = [];
        var src = kind === 'ref' ? G : (kind === 'het' ? H2 : ERR), off = kind === 'err' ? errStart : 0;
        var j = src.indexOf(seq); while(j >= 0){ occ.push(j + off); j = src.indexOf(seq, j + 1); }
        return {seq:seq, n:p.length, cov:c / p.length, kind:kind, occ:occ, first:p[0], last:p[p.length-1]};
      });
      U.forEach(function(u){ if(u.kind === 'ref' && u.occ.length > 1) u.kind = 'rep'; });
      var E = [];
      U.forEach(function(u, i){ S[u.last].forEach(function(y){ E.push([i, idx[y]]); }); });
      return {U:U, E:E, nk:kms.length};
    }

    var colorOf = {ref:'var(--accent)', rep:'var(--rep)', err:'var(--bad)', het:'var(--het)'};

    function draw(){
      var k = +kIn.value; kOut.textContent = k;
      var g = build(k), U = g.U;
      var cw = 9, x0 = 14, W = x0*2 + G.length*cw;
      var tooMany = U.length > 16;
      var rowH = 15, top = 42;
      var nRows = tooMany ? 0 : U.length;
      var gTop = top + nRows*rowH + 34;
      var hasLane1 = U.some(function(u){ return u.kind==='het' || u.kind==='err'; });
      var hasBack = !tooMany && g.E.some(function(e){ return U[e[1]].occ[0] < U[e[0]].occ[0]; });
      var H = tooMany ? top + 70 : gTop + 30 + (hasLane1 ? 40 : 0) + (hasBack || hasLane1 ? 44 : 20);
      var s = '<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="min-width:760px" role="img" aria-label="Toy genome with a repeat, its unitigs and the de Bruijn graph at k = '+k+'">';
      s += '<defs><marker id="s03-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/></marker></defs>';
      // genome
      s += '<text x="'+x0+'" y="12" class="lab">genome (haplotype 1)</text>';
      [rep1, rep2].forEach(function(p){ s += '<rect x="'+(x0+p*cw)+'" y="17" width="'+(RL*cw)+'" height="15" fill="var(--rep)" opacity=".18"/>'; });
      for(var i=0;i<G.length;i++){
        var c = G[i], fill = (i>=rep1&&i<rep1+RL)||(i>=rep2&&i<rep2+RL) ? 'var(--rep)' : 'var(--fg)';
        if(mode==='het' && i===snpPos) fill = 'var(--het)';
        if(mode==='err' && i===errStart+errOff) fill = 'var(--bad)';
        s += '<text x="'+(x0+i*cw+cw/2)+'" y="29" text-anchor="middle" style="fill:'+fill+';font-size:10.5px">'+c+'</text>';
      }
      if(mode==='het') s += '<text x="'+(x0+snpPos*cw+cw/2)+'" y="40" text-anchor="middle" style="fill:var(--het);font-size:10px">'+G[snpPos]+'/'+H2[snpPos]+'</text>';
      if(tooMany){
        s += '<text x="'+x0+'" y="'+(top+28)+'" class="lab">'+U.length+' unitigs: at this k many short k-mers occur in several places,</text>';
        s += '<text x="'+x0+'" y="'+(top+46)+'" class="lab">so the graph is a tangle of short pieces (too many to draw).</text>';
      } else {
        U.forEach(function(u, r){
          var y = top + r*rowH;
          u.occ.forEach(function(o){
            s += '<rect x="'+(x0+o*cw)+'" y="'+y+'" width="'+(u.seq.length*cw)+'" height="9" rx="2" fill="'+colorOf[u.kind]+'" opacity="'+(u.kind==='ref'?0.85:0.75)+'"><title>unitig '+(r+1)+': '+u.seq.length+' bases, '+u.n+' k-mers</title></rect>';
          });
          var lastEnd = Math.max.apply(null, u.occ.map(function(o){ return o + u.seq.length; }));
          var lx = x0 + lastEnd*cw + 4;
          if(lx > W - 40) lx = x0 + u.occ[0]*cw - 4;
          s += '<text x="'+lx+'" y="'+(y+8)+'" '+(lx < x0 + u.occ[0]*cw ? 'text-anchor="end"' : '')+' style="font-size:10px">'+(r+1)+'</text>';
        });
        // graph panel
        s += '<text x="'+x0+'" y="'+(gTop-12)+'" class="lab">the graph: unitigs and their connections</text>';
        var pos = U.map(function(u){
          var o = u.occ[0], cx = x0 + (o + u.seq.length/2)*cw;
          var lane = (u.kind==='het' || u.kind==='err') ? 1 : 0;
          return {cx:cx, y: gTop + 30 + lane*40, w: Math.max(26, Math.min(u.seq.length*cw*0.55, 120))};
        });
        // keep boxes in the same lane from overlapping
        [0,1].forEach(function(lane){
          var ids = pos.map(function(p,i){ return i; }).filter(function(i){ return (pos[i].y - gTop - 30)/40 === lane; }).sort(function(a,b){ return pos[a].cx - pos[b].cx; });
          for(var t=1;t<ids.length;t++){ var a=pos[ids[t-1]], b=pos[ids[t]]; var minGap = a.w/2 + b.w/2 + 8; if(b.cx - a.cx < minGap) b.cx = a.cx + minGap; }
        });
        var bh = 18;
        g.E.forEach(function(e){
          var a = pos[e[0]], b = pos[e[1]];
          var x1 = a.cx + a.w/2, x2 = b.cx - b.w/2, y1 = a.y, y2 = b.y;
          var d;
          if(x2 >= x1 - 2){ var mx=(x1+x2)/2; d = 'M'+x1+','+y1+' C'+(mx)+','+y1+' '+(mx)+','+y2+' '+(x2-1)+','+y2; }
          else { var yb = Math.max(y1,y2) + bh/2 + 22; d = 'M'+(a.cx)+','+(y1+bh/2)+' C'+(a.cx)+','+yb+' '+(b.cx)+','+yb+' '+(b.cx)+','+(y2+bh/2+1); }
          s += '<path d="'+d+'" fill="none" stroke="var(--muted)" stroke-width="1.2" marker-end="url(#s03-arr)"/>';
        });
        pos.forEach(function(p, i){
          var u = U[i];
          s += '<rect x="'+(p.cx-p.w/2)+'" y="'+(p.y-bh/2)+'" width="'+p.w+'" height="'+bh+'" rx="4" fill="var(--panel)" stroke="'+colorOf[u.kind]+'" stroke-width="1.8"/>';
          s += '<text x="'+p.cx+'" y="'+(p.y+4)+'" text-anchor="middle" class="lab" style="font-size:10.5px">'+(i+1)+(Math.round(u.cov)>1?' ×'+Math.round(u.cov):'')+'</text>';
        });
      }
      s += '</svg>';
      fig.innerHTML = s;
      // readout
      var repU = U.filter(function(u){ return u.kind==='rep'; });
      var refU = U.filter(function(u){ return u.kind!=='err' && u.kind!=='het'; });
      var longest = Math.max.apply(null, U.map(function(u){ return u.seq.length; }));
      var verdict;
      if(tooMany) verdict = 'k too small: k-mers are not unique even in unique sequence';
      else if(repU.length) verdict = 'no: unitig 1 stops k − 1 = '+(k-1)+' bases into it';
      else if(refU.length===1) verdict = 'yes: the genome is one unitig';
      else verdict = 'yes; the breaks come from the '+(mode==='het'?'bubble':'side branch');
      var extra = '';
      if(mode==='err'){
        var ne = Math.max(0, Math.min(errOff, errLen - k) - Math.max(0, errOff - k + 1) + 1), et;
        if(k > errLen) et = 'read shorter than k: the read gives no k-mers';
        else if(k > errOff + 1) et = ne+' error k-mer(s), not attached to the genome path';
        else et = 'tip: '+ne+' error k-mer(s) branch off and dead-end ('+(errLen-errOff-1)+' bases after the error)';
        extra = '<div>read with an error (16 bases)<b>'+et+'</b></div>';
      }
      if(mode==='het'){ var after = G.length - snpPos - 1, before = snpPos; extra = '<div>heterozygous site<b>'+(k <= after+1 && k <= before+1 ? 'bubble: two branches of '+k+' k-mers each, joined at both ends' : 'k reaches past the sequence end: the branches do not rejoin')+'</b></div>'; }
      out.innerHTML = '<div>distinct k-mers<b>'+g.nk+'</b></div><div>unitigs<b>'+U.length+'</b></div><div>longest unitig<b>'+longest+' bases (genome '+G.length+')</b></div><div>repeat ('+RL+' bases) resolved?<b>'+esc(verdict)+'</b></div>'+extra;
    }
    kIn.addEventListener('input', draw);
    modeBox.querySelectorAll('button').forEach(function(b){
      b.addEventListener('click', function(){
        mode = b.getAttribute('data-m');
        modeBox.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed', x===b ? 'true' : 'false'); });
        draw();
      });
    });
    draw();
  })();

  /* ================= 2. k - 1 rule ================= */
  (function(){
    var fig = $('s03-k1-fig'); if(!fig) return;
    var Lin = $('s03-k1-L'), kin = $('s03-k1-k'), Lo = $('s03-k1-Lo'), ko = $('s03-k1-ko'), out = $('s03-k1-out');
    function draw(){
      var L = +Lin.value, k = +kin.value; Lo.textContent = L; ko.textContent = k;
      var flank = 260, W = 860, x0 = 20, total = flank*2 + L, sc = (W - 2*x0) / total;
      function X(p){ return x0 + p*sc; }
      var rs = flank, re = flank + L;
      var resolved = k >= L + 2;
      var reach = Math.min(k - 1, L);
      var mid = L - 2*(k - 1);
      var s = '<svg viewBox="0 0 '+W+' 150" width="100%" style="min-width:640px" role="img" aria-label="Contigs entering a repeat copy">';
      s += '<line x1="'+X(0)+'" y1="40" x2="'+X(total)+'" y2="40" stroke="var(--fg)" stroke-width="2"/>';
      s += '<rect x="'+X(rs)+'" y="33" width="'+(L*sc)+'" height="14" fill="var(--rep)" opacity=".8"/>';
      s += '<text x="'+X(rs + L/2)+'" y="24" text-anchor="middle" class="lab">repeat copy, '+L+' bases (identical copies elsewhere)</text>';
      s += '<text x="'+X(flank/2)+'" y="24" text-anchor="middle">unique flank</text><text x="'+X(re + flank/2)+'" y="24" text-anchor="middle">unique flank</text>';
      if(resolved){
        s += '<rect x="'+X(0)+'" y="64" width="'+(total*sc)+'" height="10" rx="2" fill="var(--accent)"/>';
        s += '<text x="'+X(total/2)+'" y="92" text-anchor="middle" class="lab">one contig: every k-mer touching the copy also has a unique base on each side</text>';
      } else {
        s += '<rect x="'+X(0)+'" y="62" width="'+((rs+reach)*sc)+'" height="10" rx="2" fill="var(--accent)"/>';
        s += '<rect x="'+X(re-reach)+'" y="80" width="'+((flank+reach)*sc)+'" height="10" rx="2" fill="var(--accent)"/>';
        s += '<text x="'+(X(rs+reach)+4)+'" y="71">contig 1 ends '+(k-1)+' bases in</text>';
        s += '<text x="'+(X(re-reach)-4)+'" y="89" text-anchor="end">contig 2 starts '+(k-1)+' bases before the end</text>';
        if(mid > 0){
          s += '<rect x="'+X(rs+k-1)+'" y="100" width="'+(mid*sc)+'" height="10" fill="none" stroke="var(--bad)" stroke-dasharray="3 2"/>';
          s += '<text x="'+X(rs+k-1+mid/2)+'" y="128" text-anchor="middle" style="fill:var(--bad)">'+mid+' bases in no unique contig</text>';
        } else {
          s += '<text x="'+X(rs+L/2)+'" y="122" text-anchor="middle" style="fill:var(--het)">contigs overlap by '+(-mid)+' bases inside the copy but are not joined</text>';
        }
      }
      s += '</svg>';
      fig.innerHTML = s;
      out.innerHTML = '<div>contig reaches into the copy<b>'+(resolved ? 'whole copy' : (k-1)+' bases (k − 1)')+'</b></div>'+
        '<div>middle in no unique contig<b>'+(resolved ? '0 (resolved)' : (mid > 0 ? mid+' bases' : 'none; overlap '+(-mid)+' bases'))+'</b></div>'+
        '<div>k needed to resolve this copy<b>≥ '+(L+2)+(L+2 > 255 ? ' (longer than short reads)' : '')+'</b></div>';
    }
    Lin.addEventListener('input', draw); kin.addEventListener('input', draw);
    var pre = $('s03-k1-pre');
    if(pre) pre.querySelectorAll('button').forEach(function(b){
      b.addEventListener('click', function(){ Lin.value = b.getAttribute('data-L'); kin.value = b.getAttribute('data-k'); draw(); });
    });
    draw();
  })();

  /* ================= 3. Bloom filter toy ================= */
  (function(){
    var fig = $('s03-bl-fig'); if(!fig) return;
    var mIn = $('s03-bl-m'), hIn = $('s03-bl-h2'), mo = $('s03-bl-mo'), ho = $('s03-bl-ho'), qIn = $('s03-bl-q'), out = $('s03-bl-out');
    var READ = 'ACGTTGCATGCCATGACTGAACGGTA', K = 5;
    var inset = {}, ins = [];
    for(var i=0;i+K<=READ.length;i++){ var x = READ.substr(i,K); if(!inset[x]){ inset[x]=1; ins.push(x); } }
    // 24 absent test k-mers, deterministic
    var seed = 7, tests = [];
    function rnd(){ seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; }
    while(tests.length < 24){ var t=''; for(var j=0;j<K;j++) t += 'ACGT'[Math.floor(rnd()*4)]; if(!inset[t] && tests.indexOf(t) < 0) tests.push(t); }
    function fnv(str, basis){ var h = basis >>> 0; for(var i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
    function hashes(x, m, h){
      var a = fnv(x, 2166136261), b = fnv(x + '#', 84696351) | 1, r = [];
      for(var i=0;i<h;i++) r.push(((a + Math.imul(i, b)) >>> 0) % m);
      return r;
    }
    function draw(){
      var m = +mIn.value, h = +hIn.value; mo.textContent = m; ho.textContent = h;
      var bits = new Array(m).fill(0);
      ins.forEach(function(x){ hashes(x, m, h).forEach(function(p){ bits[p] = 1; }); });
      var q = (qIn.value || '').toUpperCase().replace(/[^ACGT]/g,'');
      var qh = q.length === K ? hashes(q, m, h) : [];
      var per = 32, cell = 24, gx = 16, W = gx*2 + per*cell, rows = Math.ceil(m/per);
      var gridTop = 46, gridH = rows*cell;
      var chipTop = gridTop + gridH + 40, chipW = 84, chipsPer = 8;
      var H = chipTop + 3*28 + 8;
      var s = '<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="min-width:700px" role="img" aria-label="Bloom filter bit array with '+m+' bits">';
      s += '<text x="'+gx+'" y="14" class="lab">read: '+READ+'  → '+ins.length+' distinct 5-mers inserted</text>';
      s += '<text x="'+gx+'" y="34">bit array (m = '+m+'); filled = 1'+(qh.length?'; outlined = bits of the query '+q:'')+'</text>';
      for(var i=0;i<m;i++){
        var cx = gx + (i%per)*cell, cy = gridTop + Math.floor(i/per)*cell;
        var on = bits[i] === 1, isq = qh.indexOf(i) >= 0;
        s += '<rect x="'+(cx+2)+'" y="'+(cy+2)+'" width="'+(cell-4)+'" height="'+(cell-4)+'" rx="2" fill="'+(on?'var(--accent)':'var(--panel)')+'" stroke="'+(isq?'var(--het)':'var(--line)')+'" stroke-width="'+(isq?2.5:1)+'"/>';
        s += '<text x="'+(cx+cell/2)+'" y="'+(cy+cell/2+4)+'" text-anchor="middle" style="font-size:10px;fill:'+(on?'var(--bg)':'var(--muted)')+'">'+bits[i]+'</text>';
      }
      s += '<text x="'+gx+'" y="'+(chipTop-12)+'">24 k-mers that are NOT in the read, looked up:</text>';
      var fp = 0;
      tests.forEach(function(t, n){
        var hit = hashes(t, m, h).every(function(p){ return bits[p] === 1; });
        if(hit) fp++;
        var cx = gx + (n%chipsPer)*(chipW+11), cy = chipTop + Math.floor(n/chipsPer)*28;
        s += '<rect x="'+cx+'" y="'+cy+'" width="'+chipW+'" height="20" rx="3" fill="'+(hit?'var(--bad)':'var(--panel)')+'" stroke="'+(hit?'var(--bad)':'var(--line)')+'"/>';
        s += '<text x="'+(cx+chipW/2)+'" y="'+(cy+14)+'" text-anchor="middle" style="font-size:11px;fill:'+(hit?'var(--bg)':'var(--muted)')+'">'+t+'</text>';
      });
      s += '</svg>';
      fig.innerHTML = s;
      var n = ins.length, ones = bits.reduce(function(a,b){ return a+b; }, 0);
      var theory = Math.pow(1 - Math.exp(-h*n/m), h), abyss = Math.pow(ones/m, h);
      var qtxt = '—';
      if(q.length === K){
        var all = qh.every(function(p){ return bits[p] === 1; });
        var truth = !!inset[q];
        qtxt = all ? (truth ? 'probably present (it is in the read)' : 'probably present: FALSE POSITIVE') : 'definitely absent'+(truth ? ' (impossible)' : '');
      } else if(q.length) qtxt = 'type exactly 5 letters A/C/G/T';
      out.innerHTML = '<div>bits per k-mer (m / n)<b>'+fmt(m/n,1)+'</b></div>'+
        '<div>share of bits set to 1<b>'+Math.round(100*ones/m)+' %</b></div>'+
        '<div>false positives among the 24<b>'+fp+' ('+Math.round(100*fp/24)+' %)</b></div>'+
        '<div>formula (1 − e<sup>−hn/m</sup>)<sup>h</sup><b>'+fmt(100*theory,1)+' %</b></div>'+
        '<div>ABySS-style estimate (share of 1s)<sup>h</sup><b>'+fmt(100*abyss,1)+' %</b></div>'+
        '<div>query '+esc(q || '')+'<b>'+esc(qtxt)+'</b></div>';
    }
    mIn.addEventListener('input', draw); hIn.addEventListener('input', draw); qIn.addEventListener('input', draw);
    draw();
  })();
})();
