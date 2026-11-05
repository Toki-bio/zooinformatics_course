(function(){
  var SEQ="ACGTTGCAAGGCTTAACCGATTACAGGGATCCTAGGCATTTACGCGAATTCTTGAGCTCCCTGTAATCGAGTTCCTAGCATGCAAGTAATCGGTTAAGCCTTAGGCATCGATTCGATAACC";
  var $=function(i){return document.getElementById(i);};
  var pat=$('s02-pat'),wsel=$('s02-w'),view=$('s02-view'),out=$('s02-out'),msg=$('s02-msg'),rcb=$('s02-rc');
  if(!pat)return;
  var COMP={A:'T',C:'G',G:'C',T:'A',N:'N'};
  function rc(p){var o='';for(var i=p.length-1;i>=0;i--)o+=COMP[p[i]];return o;}
  // non-overlapping scan, like grep -o
  function scan(s,p){var r=[],i=0;if(!p)return r;while((i=s.indexOf(p,i))>=0){r.push(i);i+=p.length;}return r;}
  // N in the pattern matches any letter; handled by regex
  function scanN(s,p){if(p.indexOf('N')<0)return scan(s,p);var re=new RegExp(p.replace(/N/g,'[ACGT]'),'g'),r=[],m;while((m=re.exec(s))){r.push(m.index);re.lastIndex=m.index+p.length;}return r;}
  function compute(seq,p,w){
    var fwd=scanN(seq,p),rev=(rc(p)===p)?[]:scanN(seq,rc(p));
    // line search: matches wholly inside one line, found on the wrapped text
    var lines=[];for(var i=0;i<seq.length;i+=w)lines.push(seq.slice(i,i+w));
    var inLine=0,split=[],lineHit={};
    lines.forEach(function(L,k){scanN(L,p).forEach(function(){inLine++;lineHit[k]=1;});});
    var lineCount=Object.keys(lineHit).length;
    fwd.forEach(function(s){if(Math.floor(s/w)!==Math.floor((s+p.length-1)/w))split.push(s);});
    return {fwd:fwd,rev:rev,lines:lines,inLine:inLine,lineCount:lineCount,split:split};
  }
  function render(){
    var p=pat.value.toUpperCase().replace(/[^ACGTN]/g,''),w=+wsel.value;
    if(!p){view.textContent='';out.innerHTML='';msg.textContent='Type a pattern of A, C, G, T or N.';return;}
    var c=compute(SEQ,p,w),cls=new Array(SEQ.length);
    var sp={};c.split.forEach(function(s){sp[s]=1;});
    c.fwd.forEach(function(s){for(var i=0;i<p.length;i++)cls[s+i]=sp[s]?'rep':'good';});
    c.rev.forEach(function(s){for(var i=0;i<p.length;i++)cls[s+i]='bad';});
    var h='';
    c.lines.forEach(function(L,k){
      var s='';for(var i=0;i<L.length;i++){var g=k*w+i,cl=cls[g];s+=cl?'<span style="background:var(--'+cl+');color:var(--bg);border-radius:2px">'+L[i]+'</span>':L[i];}
      h+=s+'\n';
    });
    view.innerHTML=h.replace(/\n$/,'');
    var b1=c.inLine,b2=c.fwd.length,b3=c.fwd.length+c.rev.length;
    out.innerHTML='<div>Line search (<code>grep -o</code>)<b>'+b1+' match'+(b1==1?'':'es')+' in '+c.lineCount+' line'+(c.lineCount==1?'':'s')+'</b></div>'+
      '<div>Unwrapped, one strand<b>'+b2+' match'+(b2==1?'':'es')+'</b></div>'+
      '<div>Unwrapped, both strands<b>'+b3+' match'+(b3==1?'':'es')+'</b></div>';
    var t=[];
    if(c.split.length)t.push(c.split.length+' match'+(c.split.length==1?' is':'es are')+' cut by a line break, so the line search misses '+(c.split.length==1?'it':'them')+'. Widen the lines to see it come back.');
    if(c.rev.length)t.push(c.rev.length+' match'+(c.rev.length==1?' sits':'es sit')+' on the other strand: only a search for the reverse complement ('+rc(p)+') finds '+(c.rev.length==1?'it':'them')+'.');
    if(!t.length)t.push(b3?'Nothing is missed at this line width.':'No match on either strand. With a zero, check that the pattern is right before concluding the sequence lacks it.');
    msg.textContent=t.join(' ');
  }
  pat.addEventListener('input',render);wsel.addEventListener('change',render);
  rcb.addEventListener('click',function(){var p=pat.value.toUpperCase().replace(/[^ACGTN]/g,'');pat.value=rc(p);render();});
  render();
})();
