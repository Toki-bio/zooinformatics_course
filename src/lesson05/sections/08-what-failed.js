(function(){
  var list = document.getElementById('s08-list');
  if (!list) return;
  var out = document.getElementById('s08-out');
  var pre = document.getElementById('s08-pre');
  // state: 0 not run, 1 passed, 2 failed
  var C = [
    ['Input is the kind the tool was built for','Array tools take array genotypes; sequence-level tools need dense sequence data; imputed genotypes are a special case (s04).'],
    ['Sample size reaches the documented minimum','Read it in the manual. Count haplotypes (two per person), not people.'],
    ['Settings and demography fit this population','A history supplied with the tool describes another population.'],
    ['Raw summary count is plausible','For example the number of IBD segments per pair. Far above expectation means something other than relatedness is being counted.'],
    ['Sample matches the model’s assumption','Size-curve methods assume one randomly mating population sampled at random. Admixed, multi-region or clinical samples break this.'],
    ['Fit and bootstrap are healthy, curve is plausible','The model should fit the data about as well as it fits its own bootstrap replicates; no sudden collapse or oscillation.'],
    ['Candidates replicate in an independent call set','A different sample, caller or reference build gives the same regions.'],
    ['Signal is not tied to a reference or mapping problem','Candidates should not line up with regions where the reference or the mapping is known to be poor.']
  ];
  var P = {
    clear:[0,0,0,0,0,0,0,0],
    a:[1,2,2,0,0,0,0,0],
    b1:[2,0,0,2,0,0,0,0],
    b2:[1,1,1,1,2,2,0,0],
    c:[1,1,0,0,0,0,2,2]
  };
  var NAMES = ['not run','passed','failed'];
  var st = P.clear.slice();
  function verdict(s){
    var f = 0, n = 0;
    for (var i = 0; i < s.length; i++){ if (s[i] === 2) f++; else if (s[i] === 0) n++; }
    if (f) return {k:'blocked', t:'Blocked: ' + f + ' failed check' + (f > 1 ? 's' : '') + '. No statement about population history.'};
    if (n) return {k:'open', t:'Not finished: ' + n + ' check' + (n > 1 ? 's' : '') + ' not run. Do not state a result yet.'};
    return {k:'ok', t:'All checks passed. You may report the result, with the checks listed beside it.'};
  }
  function render(){
    list.innerHTML = '';
    C.forEach(function(c, i){
      var li = document.createElement('li');
      li.style.cssText = 'border-bottom:1px solid var(--line);padding:6px 0';
      var b = document.createElement('button');
      b.type = 'button'; b.id = 's08-c' + i;
      b.setAttribute('aria-label', (i + 1) + '. ' + c[0] + ': ' + NAMES[st[i]] + '. Click to change.');
      var col = st[i] === 1 ? 'var(--good)' : st[i] === 2 ? 'var(--bad)' : 'var(--muted)';
      b.style.cssText = 'font:inherit;background:transparent;border:1px solid ' + col + ';border-radius:4px;padding:3px 8px;margin-right:8px;cursor:pointer;min-width:74px;color:' + col;
      b.textContent = NAMES[st[i]];
      b.onclick = function(){ st[i] = (st[i] + 1) % 3; render(); };
      var t = document.createElement('b'); t.textContent = (i + 1) + '. ' + c[0];
      var d = document.createElement('div'); d.style.cssText = 'font-size:12.5px;color:var(--muted);margin-top:2px'; d.textContent = c[1];
      li.appendChild(b); li.appendChild(t); li.appendChild(d); list.appendChild(li);
    });
    var v = verdict(st);
    var cnt = [0,0,0]; st.forEach(function(x){ cnt[x]++; });
    out.innerHTML = '';
    var p = document.createElement('div'); p.id = 's08-verdict'; p.setAttribute('data-k', v.k);
    var bb = document.createElement('b'); bb.textContent = v.t;
    bb.style.color = v.k === 'ok' ? 'var(--good)' : v.k === 'blocked' ? 'var(--bad)' : 'var(--fg)';
    p.appendChild(bb);
    var q = document.createElement('div'); q.textContent = 'passed ' + cnt[1] + ' · failed ' + cnt[2] + ' · not run ' + cnt[0];
    out.appendChild(p); out.appendChild(q);
  }
  pre.querySelectorAll('button').forEach(function(b){
    b.onclick = function(){
      st = P[b.getAttribute('data-v')].slice();
      pre.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      render();
    };
  });
  document.getElementById('s08-allok').onclick = function(){
    st = st.map(function(){ return 1; });
    pre.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed', 'false'); });
    render();
  };
  render();
})();
