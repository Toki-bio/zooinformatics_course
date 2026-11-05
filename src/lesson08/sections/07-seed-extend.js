(function(){
/*CORE-BEGIN*/
var PH = '111010010100110111';           // PatternHunter weight-11 seed, span 18
var GENOME = 1e9, LN2 = Math.LN2;
var SCORING = {
  megablast: {label:'megablast', r:1, q:2, lam:1.28,  K:0.46,  E:10,   W:28},
  blastn:    {label:'blastn',    r:2, q:3, lam:0.55,  K:0.21,  E:10,   W:11},
  short:     {label:'blastn-short', r:1, q:3, lam:1.374, K:0.711, E:1000, W:7}
};
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function randSeq(n,rnd){var s='';for(var i=0;i<n;i++)s+='ACGT'[Math.floor(rnd()*4)];return s;}
function mutate(q,d,rnd){var s='';for(var i=0;i<q.length;i++){if(rnd()<d){var o='ACGT'.replace(q[i],'');s+=o[Math.floor(rnd()*3)];}else s+=q[i];}return s;}
function ones(pattern){var o=[];for(var i=0;i<pattern.length;i++)if(pattern[i]==='1')o.push(i);return o;}
function key(s,i,o){var k='';for(var x=0;x<o.length;x++)k+=s[i+o[x]];return k;}
// The way a search tool does it: index the query's words once, then scan the subject once.
function seedHits(q,s,pattern){
  var o=ones(pattern),span=pattern.length,table=new Map(),hits=[],i,j;
  for(i=0;i+span<=q.length;i++){var k=key(q,i,o);if(!table.has(k))table.set(k,[]);table.get(k).push(i);}
  for(j=0;j+span<=s.length;j++){var l=table.get(key(s,j,o));if(l)for(i=0;i<l.length;i++)hits.push({i:l[i],j:j});}
  return hits;
}
// The control: every query position against every subject position, base by base.
function seedHitsBrute(q,s,pattern,flank){
  var span=pattern.length,total=0,diag=0;
  for(var i=0;i+span<=q.length;i++)for(var j=0;j+span<=s.length;j++){
    var ok=true;
    for(var x=0;x<span;x++)if(pattern[x]==='1'&&q[i+x]!==s[j+x]){ok=false;break;}
    if(ok){total++;if(j-i===flank)diag++;}
  }
  return {total:total,diag:diag};
}
// Exact P(at least one run of W matches in L columns); each column matches with probability p.
function pContig(L,W,p){
  if(L<W)return 0;
  var a=new Float64Array(L+1),pw=Math.pow(p,W);
  for(var n=0;n<=L;n++){
    if(n<W)a[n]=1; else if(n===W)a[n]=1-pw; else a[n]=a[n-1]-(1-p)*pw*a[n-W-1];
  }
  return 1-a[L];
}
// Exact P for any seed pattern: an automaton over match(1)/mismatch(0) columns that recognises all
// column strings fitting the pattern, stepped along the alignment.
function automaton(pattern){
  var free=[],i,c;for(i=0;i<pattern.length;i++)if(pattern[i]==='0')free.push(i);
  var next=[[-1,-1]],out=[false];
  for(c=0;c<(1<<free.length);c++){
    var str=pattern.split('');for(i=0;i<free.length;i++)str[free[i]]=(c>>i&1)?'1':'0';
    var st=0;
    for(i=0;i<str.length;i++){var b=+str[i];if(next[st][b]<0){next[st][b]=next.length;next.push([-1,-1]);out.push(false);}st=next[st][b];}
    out[st]=true;
  }
  var fail=new Int32Array(next.length),queue=[];
  for(c=0;c<2;c++){if(next[0][c]<0)next[0][c]=0;else{fail[next[0][c]]=0;queue.push(next[0][c]);}}
  for(var h=0;h<queue.length;h++){var u=queue[h];out[u]=out[u]||out[fail[u]];
    for(c=0;c<2;c++){var v=next[u][c];if(v<0)next[u][c]=next[fail[u]][c];else{fail[v]=next[fail[u]][c];queue.push(v);}}}
  return {next:next,out:out};
}
function pAuto(L,p,aut){
  var n=aut.next.length,cur=new Float64Array(n),nx=new Float64Array(n),hit=0;cur[0]=1;
  for(var t=0;t<L;t++){nx.fill(0);
    for(var i=0;i<n;i++){var m=cur[i];if(m===0)continue;
      var a=aut.next[i][1],b=aut.next[i][0];
      if(aut.out[a])hit+=m*p;else nx[a]+=m*p;
      if(aut.out[b])hit+=m*(1-p);else nx[b]+=m*(1-p);}
    var tmp=cur;cur=nx;nx=tmp;}
  return hit;
}
var autCache={};
function pSeed(L,p,pattern){
  if(pattern.indexOf('0')<0)return pContig(L,pattern.length,p);
  if(!autCache[pattern])autCache[pattern]=automaton(pattern);
  return pAuto(L,p,autCache[pattern]);
}
function matchVector(a,b){var v=new Uint8Array(a.length);for(var i=0;i<a.length;i++)v[i]=a[i]===b[i]?1:0;return v;}
// Best ungapped segment on the diagonal, found with no seed at all: the exhaustive answer.
function bestSegment(v,sc){var best=0,cur=0,st=0,bs=0,be=0;
  for(var i=0;i<v.length;i++){cur+=v[i]?sc.r:-sc.q;if(cur<=0){cur=0;st=i+1;}else if(cur>best){best=cur;bs=st;be=i+1;}}
  return {score:best,start:bs,end:be};}
// Ungapped X-drop extension from a seed at column i: walk out each way, stop when the running score
// has fallen more than X below the best score so far, keep the best end.
function xdrop(v,i,span,sc,X){
  var base=0,x;for(x=i;x<i+span;x++)base+=v[x]?sc.r:-sc.q;
  var run=0,best=0,end=i+span;
  for(x=i+span;x<v.length;x++){run+=v[x]?sc.r:-sc.q;if(run>best){best=run;end=x+1;}if(best-run>X)break;}
  var runL=0,bestL=0,start=i;
  for(x=i-1;x>=0;x--){runL+=v[x]?sc.r:-sc.q;if(runL>bestL){bestL=runL;start=x;}if(bestL-runL>X)break;}
  return {score:base+best+bestL,start:start,end:end};
}
function xdropRaw(sc){return Math.ceil(20*LN2/sc.lam);}
function bitsNeeded(L,sc){return Math.log2(L*GENOME/sc.E);}
function rawNeeded(L,sc){return Math.ceil((bitsNeeded(L,sc)*LN2+Math.log(sc.K))/sc.lam);}
function diagSeeds(v,pattern){var o=ones(pattern),span=pattern.length,r=[];
  for(var i=0;i+span<=v.length;i++){var ok=true;for(var x=0;x<o.length;x++)if(!v[i+o[x]]){ok=false;break;}if(ok)r.push(i);}return r;}
function bestExtension(v,hits,span,sc,X){var b=null;
  for(var h=0;h<hits.length;h++){var e=xdrop(v,hits[h],span,sc,X);if(!b||e.score>b.score)b=e;}return b;}
/*CORE-END*/
if(typeof document==='undefined')return;
var $=function(id){return document.getElementById(id);};
if(!$('s07-wrap'))return;
var FLANK=80,state={L:250,d:20,W:11,seed:'contig',sc:'blastn',pairSeed:7},pair=null;
function ones1(n){return new Array(n+1).join('1');}
function pattern(){return state.seed==='spaced'?PH:ones1(state.W);}
function fmt(x){if(x===0)return '0';if(x>=1e6)return x.toExponential(1).replace('e+',' × 10^');if(x>=100)return Math.round(x).toLocaleString('en-US');if(x>=1)return x.toFixed(2);if(x>=0.001)return x.toFixed(3);return x.toExponential(1).replace('e-',' × 10^-');}
function pct(x){if(x>0.9995)return '> 99.9 %';if(x<0.0005)return x===0?'0 %':'< 0.1 %';return (100*x).toFixed(1)+' %';}
function newPair(){var rnd=rng(state.pairSeed*7919+state.L*31+state.d);
  var q=randSeq(state.L,rnd),m=mutate(q,state.d/100,rnd);
  pair={q:q,s:randSeq(FLANK,rnd)+m+randSeq(FLANK,rnd),v:matchVector(q,m)};}
function strip(v,hits,span,ext,best,L){
  var W=720,x0=8,w=W-16,sx=w/L,o='',i;
  o+='<svg viewBox="0 0 '+W+' 132" width="100%" style="min-width:520px" role="img" aria-label="Alignment columns with seeds, the extension and the best possible segment">';
  o+='<text class="lab" x="'+x0+'" y="12">columns of the true alignment: grey = match, red = mismatch</text>';
  o+='<rect x="'+x0+'" y="18" width="'+w+'" height="14" fill="var(--line)"/>';
  for(i=0;i<L;i++)if(!v[i])o+='<rect x="'+(x0+i*sx).toFixed(1)+'" y="18" width="'+Math.max(1,sx).toFixed(1)+'" height="14" fill="var(--bad)"/>';
  o+='<text class="lab" x="'+x0+'" y="50">seeds on this diagonal: '+hits.length+'</text>';
  for(i=0;i<hits.length;i++)o+='<rect x="'+(x0+hits[i]*sx).toFixed(1)+'" y="55" width="'+Math.max(2,span*sx).toFixed(1)+'" height="8" fill="var(--accent)" opacity=".75"/>';
  o+='<text class="lab" x="'+x0+'" y="81">best X-drop extension from a seed'+(ext?': score '+ext.score:': none, no seed')+'</text>';
  if(ext)o+='<rect x="'+(x0+ext.start*sx).toFixed(1)+'" y="86" width="'+Math.max(2,(ext.end-ext.start)*sx).toFixed(1)+'" height="8" fill="var(--good)"/>';
  o+='<text class="lab" x="'+x0+'" y="112">best segment with no seed needed (exhaustive): score '+best.score+'</text>';
  if(best.score>0)o+='<rect x="'+(x0+best.start*sx).toFixed(1)+'" y="117" width="'+Math.max(2,(best.end-best.start)*sx).toFixed(1)+'" height="8" fill="var(--het)"/>';
  return o+'</svg>';
}
var curveCache={};
function curves(L){
  if(curveCache[L])return curveCache[L];
  var defs=[{k:'28',p:ones1(28)},{k:'11',p:ones1(11)},{k:'7',p:ones1(7)},{k:'ph',p:PH}],out={};
  defs.forEach(function(c){var a=[];for(var d=0;d<=50;d+=2)a.push(pSeed(L,1-d/100,c.p));out[c.k]=a;});
  curveCache={};curveCache[L]=out;return out;
}
function chart(L,d,pNow){
  var W=720,H=280,l=52,r=16,t=14,b=44,c=curves(L);
  var X=function(v){return l+(W-l-r)*v/50;},Y=function(v){return t+(H-t-b)*(1-v);};
  var o='<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="min-width:520px" role="img" aria-label="Chance of at least one seed against divergence">';
  [0,.25,.5,.75,1].forEach(function(v){o+='<line class="grid" x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/><text x="'+(l-8)+'" y="'+(Y(v)+4)+'" text-anchor="end">'+(v*100)+' %</text>';});
  for(var x=0;x<=50;x+=10)o+='<text x="'+X(x)+'" y="'+(H-b+18)+'" text-anchor="middle">'+x+' %</text>';
  o+='<text class="lab" x="'+((l+W-r)/2)+'" y="'+(H-6)+'" text-anchor="middle">divergence (share of positions changed)</text>';
  o+='<line class="ax" x1="'+l+'" x2="'+l+'" y1="'+t+'" y2="'+(H-b)+'"/><line class="ax" x1="'+l+'" x2="'+(W-r)+'" y1="'+(H-b)+'" y2="'+(H-b)+'"/>';
  [['28','var(--muted)',''],['11','var(--accent)',''],['7','var(--good)',''],['ph','var(--rep)','6 4']].forEach(function(s){
    var pts=c[s[0]].map(function(v,i){return X(i*2).toFixed(1)+','+Y(v).toFixed(1);}).join(' ');
    o+='<polyline points="'+pts+'" fill="none" stroke="'+s[1]+'" stroke-width="2"'+(s[2]?' stroke-dasharray="'+s[2]+'"':'')+'/>';});
  o+='<line x1="'+X(d)+'" x2="'+X(d)+'" y1="'+t+'" y2="'+(H-b)+'" stroke="var(--het)" stroke-width="1" stroke-dasharray="3 3"/>';
  o+='<circle cx="'+X(d)+'" cy="'+Y(pNow)+'" r="6" fill="var(--het)" stroke="var(--panel)" stroke-width="2"/>';
  return o+'</svg>';
}
function render(){
  var pat=pattern(),span=pat.length,wt=ones(pat).length,L=state.L,p=1-state.d/100,sc=SCORING[state.sc];
  var fast=seedHits(pair.q,pair.s,pat),brute=seedHitsBrute(pair.q,pair.s,pat,FLANK);
  var onDiag=fast.filter(function(h){return h.j-h.i===FLANK;}).map(function(h){return h.i;}).sort(function(a,b){return a-b;});
  var X=xdropRaw(sc),S=rawNeeded(L,sc),ext=bestExtension(pair.v,onDiag,span,sc,X),best=bestSegment(pair.v,sc);
  var expSeeds=Math.max(0,L-span+1)*Math.pow(p,wt),P=pSeed(L,p,pat),chance=Math.max(0,L-span+1)*GENOME*Math.pow(.25,wt);
  var agree=fast.length===brute.total&&onDiag.length===brute.diag;
  $('s07-Lo').textContent=L+' bp';$('s07-do').textContent=state.d+' %';
  $('s07-wo').textContent=state.seed==='spaced'?'11 of 18 (fixed)':state.W+' bases';
  $('s07-w').disabled=state.seed==='spaced';
  $('s07-strip').innerHTML=strip(pair.v,onDiag,span,ext,best,L);
  $('s07-chart').innerHTML=chart(L,state.d,P);
  $('s07-r-seeds').textContent=onDiag.length+' (expected '+fmt(expSeeds)+')';
  $('s07-r-chance').textContent=String(fast.length-onDiag.length);
  $('s07-r-p').textContent=pct(P);
  $('s07-r-need').textContent=S+' (best possible '+best.score+')';
  $('s07-r-g').textContent=fmt(chance);
  var c=$('s07-r-check');c.textContent=fast.length+' = '+brute.total+(agree?', agree':', DISAGREE');c.style.color=agree?'var(--good)':'var(--bad)';
  var v,col;
  if(best.score<S){v='Not reportable by any method: even the best ungapped segment scores '+best.score+', below the '+S+' needed.';col='var(--muted)';}
  else if(!ext){v='MISSED: a segment scoring '+best.score+' is there, but it holds no seed, so the program never looks at it.';col='var(--bad)';}
  else if(ext.score<S){v='MISSED: seeds exist, but the X-drop extension stopped at score '+ext.score+'; the best segment scores '+best.score+'.';col='var(--bad)';}
  else {v='Found: the extension reaches score '+ext.score+' (needed '+S+').';col='var(--good)';}
  var e=$('s07-verdict');e.textContent=v;e.style.color=col;
  $('s07-f1').textContent='expected seeds = (L − span + 1) × (1 − d)^weight = ('+L+' − '+span+' + 1) × '+p.toFixed(2)+'^'+wt+' = '+fmt(expSeeds);
  $('s07-f2').textContent=state.seed==='spaced'?'P(at least one seed) = '+P.toFixed(4)+'   [no short formula: exact stepwise calculation along the columns]':'N(n) = N(n−1) − (1−p) p^W N(n−W−1),  N(n<W) = 1,  N(W) = 1 − p^W;   P(at least one seed) = 1 − N('+L+') = '+P.toFixed(4);
  $('s07-f3').textContent='score needed = ⌈(log2(L × G / E) × ln 2 + ln K) / λ⌉ = '+S+'  ('+bitsNeeded(L,sc).toFixed(1)+' bits; G = 10^9, E = '+sc.E+', λ = '+sc.lam+', K = '+sc.K+');  X-drop = ⌈20 × ln 2 / λ⌉ = '+X;
  $('s07-sim').textContent='';
}
function simulate(){
  var pat=pattern(),span=pat.length,sc=SCORING[state.sc],X=xdropRaw(sc),S=rawNeeded(state.L,sc),P=pSeed(state.L,1-state.d/100,pat);
  var rnd=rng(state.pairSeed*104729+state.L+state.d),N=1000,seeded=0,found=0,possible=0,v=new Uint8Array(state.L),pm=1-state.d/100;
  for(var n=0;n<N;n++){
    for(var i=0;i<state.L;i++)v[i]=rnd()<pm?1:0;
    var h=diagSeeds(v,pat),ext=bestExtension(v,h,span,sc,X);
    if(h.length)seeded++; if(ext&&ext.score>=S)found++; if(bestSegment(v,sc).score>=S)possible++;
  }
  $('s07-sim').textContent='1000 fresh pairs: a seed in '+seeded+' (formula predicts '+Math.round(P*N)+'); reportable by exhaustive search '+possible+'; found through a seed '+found+'.';
}
function presses(){['megablast','blastn','short'].forEach(function(k){$('s07-sc-'+k).setAttribute('aria-pressed',String(state.sc===k));});
  ['contig','spaced'].forEach(function(k){$('s07-sd-'+k).setAttribute('aria-pressed',String(state.seed===k));});}
function all(){newPair();presses();render();}
$('s07-L').addEventListener('input',function(){state.L=+this.value;all();});
$('s07-d').addEventListener('input',function(){state.d=+this.value;all();});
$('s07-w').addEventListener('input',function(){state.W=+this.value;all();});
['megablast','blastn','short'].forEach(function(k){$('s07-sc-'+k).addEventListener('click',function(){state.sc=k;state.seed='contig';state.W=SCORING[k].W;$('s07-w').value=state.W;all();});});
['contig','spaced'].forEach(function(k){$('s07-sd-'+k).addEventListener('click',function(){state.seed=k;all();});});
$('s07-new').addEventListener('click',function(){state.pairSeed++;all();});
$('s07-run').addEventListener('click',simulate);
// Numbers quoted in the text come from the same functions as the toy.
var pats=[ones1(28),ones1(11),ones1(7),PH],rows='';
[10,20,30].forEach(function(d){rows+='<tr><td>'+d+' %</td>'+pats.map(function(pt){return '<td>'+pct(pSeed(250,1-d/100,pt))+'</td>';}).join('')+'</tr>';});
$('s07-tb').innerHTML=rows;
$('s07-ph1').textContent=pSeed(64,.7,ones1(11)).toFixed(3);
$('s07-ph2').textContent=pSeed(64,.7,PH).toFixed(3);
$('s07-c11').textContent=pct(pSeed(250,.8,ones1(11)));
$('s07-c28').textContent=pct(pSeed(250,.8,ones1(28)));
all();
})();
