(function(){
  var root = document.getElementById('s08-fig');
  if (!root) return;
  var NS = 'http://www.w3.org/2000/svg';
  function tip(term, text){ return '<span class="tip" title="' + text.replace(/"/g, '&quot;') + '">' + term + '</span>'; }
  var T = {
    bed: tip('BED', 'BED: a plain-text table of genome intervals, one per line: sequence name, start, end, and optional name, score and strand.'),
    fasta: tip('FASTA', 'FASTA: the plain-text sequence format: a header line starting with > and the sequence below it.'),
    cons: tip('consensus', 'Consensus: for every position of an alignment of many copies, the most common base. It stands for the family in searches.'),
    flank: tip('flanks', 'Flanks: the genome sequence just outside a copy on either side. Independent insertions have unrelated flanks.'),
    ss: tip('ssearch36', 'ssearch36: exact Smith-Waterman local alignment search from the FASTA36 package; slower than BLAST but finds faint similarity.'),
    chunk: tip('chunk consensuses', 'Chunk consensus: SubFam cuts its ordered copies into blocks of 50 and writes one consensus per block; each row of its alignment is one such consensus, not one copy.'),
    pm: tip('PM / MP', 'PM: present in genome 1, empty site in genome 2. MP: the reverse. SINE: present in both.'),
    verdict: tip('verdict', 'Verdict: SINEderella labels every copy SINE (assigned, flanks unique), grey (flanks could not be tested) or not_SINE.'),
    minus: tip('minus bank', 'Minus bank: the genome with all copies of the families you already know cut out, so a new scan sees only what is left.'),
    vote: tip('10/10 vote', 'Ten separate ssearch36 rounds; a copy is assigned only if the same consensus wins all ten.')
  };
  var S = {
    bank: { short: 'bank', title: 'Collect the known SINEs', tool: 'SINEBase, Dfam, papers', sec: ['s01'],
      inp: 'literature, databases', out: 'bank.fa: one ' + T.cons + ' per known family or subfamily',
      hold: 'a bank of known consensuses',
      skip: 'Without a bank, the de novo scan has nothing to compare with, and a SINE of a known family can be "discovered" again under a new name.' },
    denovo: { short: 'de novo', title: 'Scan the genome for new SINEs', tool: 'SINE-de-novo-genome-scan (' + T.ss + ')', sec: ['s03'],
      inp: 'genome, shredded SINE database', out: 'merged_loci.fa: candidate loci with 50 bp of padding',
      hold: 'candidate SINE loci (not yet verified elements)',
      skip: 'You find only the families someone has already described. A lineage-specific SINE stays invisible, or ends up as "Unknown" in a repeat library.' },
    subfam: { short: 'SubFam', title: 'Compress the candidates and look', tool: 'SubFam + ViewAlign', sec: ['s04'],
      inp: 'a 30,000-copy sample of the candidates', out: 'an alignment of ~600 ' + T.chunk,
      hold: 'a readable alignment of chunk consensuses',
      skip: 'Tens of thousands of copies cannot be read by eye, and an aligner chokes on them. Without compression there is no alignment a person can judge.' },
    bounds: { short: 'boundaries', title: 'Set the boundaries by unique flanks', tool: 'ViewAlign, SINE_consensus', sec: ['s03', 's05'],
      inp: 'copies of one candidate family with ' + T.flank, out: 'new consensus with checked ends',
      hold: 'curated consensuses with checked ends',
      skip: 'A consensus that runs into flank or stops short makes the copy search miss copies (too long: hits fail the length rule) or cut them (too short).' },
    heads: { short: 'heads', title: 'Check the head (tRNA, 5S, 7SL)', tool: 'SINEderella tools/trna_heads.sh', sec: ['s01'],
      inp: 'bank.fa, a tRNA gene set', out: 'head origin of every consensus, with a shuffle control',
      hold: 'the head origin of each consensus',
      skip: 'You cannot say what kind of SINE it is. Worse, a tandem repeat or a piece of a LINE can pass as a "SINE" if nobody checks its 5′ end.' },
    collect: { short: 'sear', title: 'Collect every copy', tool: 'SINEderella step 1 (sear)', sec: ['s02', 's06'],
      inp: 'genome, bank.fa', out: 'merged loci (' + T.bed + ') and copies (' + T.fasta + ')',
      hold: 'every copy of every consensus, merged into loci',
      skip: 'There is nothing to count. Using a fast but less sensitive search instead can lose old, diverged copies and make the family look younger than it is.' },
    assign: { short: 'assign', title: 'Assign copies to subfamilies', tool: 'SINEderella steps 2-3 (asSINEment)', sec: ['s04'],
      inp: 'copies, bank.fa', out: 'assignment table: subfamily, score, leak, conflict per copy',
      hold: 'a subfamily (or "unassigned") for every copy',
      skip: 'Each copy keeps whichever consensus found it first. Copies of close subfamilies are labelled by chance; with the ' + T.vote + ' only stable assignments count.' },
    verdict: { short: 'verdict', title: 'Give every copy a verdict', tool: 'SINEderella step 7 + flank-twin check', sec: ['s05'],
      inp: 'assignment table, genome', out: 'loci_verdict.tsv: a ' + T.verdict + ' per copy',
      hold: 'the list of SINE loci with unique flanks',
      skip: 'Copies duplicated together with their flanks (segmental duplications, array units) are counted as separate insertions, and copy numbers are inflated.' },
    report: { short: 'report', title: 'Make the report and decide on alignments', tool: 'SINEderella steps 4, 8a, 6 + ViewAlign', sec: ['s04'],
      inp: 'the run folder', out: 'report.html: copy numbers, leak, divergence, alignment links',
      hold: 'a report page and alignments to judge',
      skip: 'Decisions rest on numbers alone. A subfamily that is really a mixture, or an end that is wrong, is visible only in the alignment.' },
    minus: { short: 'minus bank', title: 'Scan what your bank does not explain', tool: 'SINE-de-novo-genome-scan on the ' + T.minus, sec: ['s03'],
      inp: 'genome minus all loci found so far', out: 'candidates of other families',
      hold: 'candidates of families outside your bank',
      skip: 'You study one SINE and miss the others in the same genome; their copies may also hide among the "unassigned" ones of your run.' },
    loop: { short: 'add', title: 'Loop back with the new consensus', tool: 'SINEderella --add', sec: ['s04'],
      inp: 'existing run, new consensus', out: 'a new run with re-assigned copies',
      hold: 'an updated run that includes the new family',
      skip: 'The new family stays outside the run, and its copies keep being forced onto the old consensuses or left unassigned.' },
    run1: { short: 'run sp1', title: 'Full run on genome 1 (steps 1-9)', tool: 'SINEderella --publish', sec: ['s02', 's04'],
      inp: 'genome 1, the shared bank', out: 'run folder with loci_verdict.tsv',
      hold: 'SINE loci of species 1',
      skip: 'There is no list of SINE loci to compare.' },
    run2: { short: 'run sp2', title: 'Full run on genome 2, same bank', tool: 'SINEderella --publish', sec: ['s02', 's04'],
      inp: 'genome 2, the same bank', out: 'run folder with loci_verdict.tsv',
      hold: 'SINE loci of both species',
      skip: 'With different banks in the two genomes, a locus can look "absent" only because the other run used another consensus.' },
    bed: { short: 'BED', title: 'Export the SINE loci of each run', tool: 'sinederella_bed.py', sec: ['s05'],
      inp: 'each run folder', out: 'aaa-BANK.bed, bbb-BANK.bed (verdict SINE + partial copies)',
      hold: 'one ' + T.bed + ' of SINE loci per species',
      skip: 'Grey and not_SINE copies enter the comparison; their flanks may map to several places and blur the calls.' },
    orth: { short: 'orth_loc', title: 'Find orthologous loci', tool: 'SINE_orth_loc (bank mode)', sec: ['s05'],
      inp: 'two genomes, two BED files, the bank', out: 'orth_aaa-bbb.tsv: SINE, ' + T.pm + ' per locus pair',
      hold: 'locus pairs classed as shared or species-specific',
      skip: 'You have two lists of copies but no way to tell which insertions the species share.' },
    browse: { short: 'browse', title: 'Read the locus alignments', tool: 'sine_loci_browser.html', sec: ['s05'],
      inp: 'alignment bundles per class and subfamily', out: 'your judgement on doubtful classes',
      hold: 'checked presence/absence calls',
      skip: 'A "species-specific" locus may be a gap in the assembly or a misplaced flank; only the alignment of the two loci shows it.' }
  };
  var ROUTES = {
    genome: { keys: ['bank', 'denovo', 'subfam', 'bounds', 'heads', 'collect', 'assign', 'verdict', 'report', 'loop'],
      start: 'an assembled genome',
      intro: 'You have an assembly and no SINE consensus made for your group. The chain starts from known SINEs of other animals and discovers your own.' },
    known: { keys: ['bank', 'heads', 'collect', 'assign', 'verdict', 'report', 'minus', 'subfam', 'bounds', 'loop'],
      start: 'a genome and a known SINE consensus',
      intro: 'You have a genome and a published consensus (for example from SINEBase). Discovery comes after the main run: the minus-bank scan looks for what your bank leaves out.' },
    two: { keys: ['run1', 'run2', 'bed', 'orth', 'browse'],
      start: 'two genomes and a bank both runs share',
      intro: 'You have two related genomes. Each gets a full run with the same bank; then the loci are compared by their flanks.' }
  };
  var route = 'genome', done = {};
  var svg = document.getElementById('s08-chain'), list = document.getElementById('s08-list');
  var read = document.getElementById('s08-read'), intro = document.getElementById('s08-intro');

  function el(name, attrs, text){
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function secLinks(arr){ return arr.map(function(s){ return '<a href="#' + s + '">' + s + '</a>'; }).join(''); }

  function drawChain(keys, cur){
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var per = 5, bw = 100, gap = 26, step = bw + gap, rowH = 80;
    var rows = Math.ceil(keys.length / per), W = per * step - gap + 20, h = rows * rowH - 6;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + h);
    svg.setAttribute('width', '100%');
    svg.style.minWidth = '520px';
    svg.style.maxWidth = '720px';
    keys.forEach(function(k, i){
      var col = i % per, row = Math.floor(i / per);
      var x = 10 + col * step, y = 22 + row * rowH;
      var isDone = !!done[k], isCur = i === cur;
      if (i > 0 && col === 0) {
        // row break: arrow from the end of the previous row back to the start of this one
        var px = 10 + (per - 1) * step + bw / 2, py = y - rowH + 44;
        svg.appendChild(el('path', { d: 'M' + px + ' ' + py + ' V' + (y - 14) + ' H' + (x + bw / 2) + ' V' + (y - 4), fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.3, 'stroke-dasharray': '3 3' }));
        svg.appendChild(el('path', { d: 'M' + (x + bw / 2 - 4) + ' ' + (y - 6) + ' L' + (x + bw / 2) + ' ' + (y - 1) + ' L' + (x + bw / 2 + 4) + ' ' + (y - 6) + 'Z', fill: 'var(--muted)' }));
      } else if (i > 0) {
        svg.appendChild(el('line', { x1: x - gap + 2, y1: y + 22, x2: x - 5, y2: y + 22, stroke: 'var(--muted)', 'stroke-width': 1.3 }));
        svg.appendChild(el('path', { d: 'M' + (x - 5) + ' ' + (y + 18) + ' L' + (x - 1) + ' ' + (y + 22) + ' L' + (x - 5) + ' ' + (y + 26) + 'Z', fill: 'var(--muted)' }));
      }
      var stroke = isDone ? 'var(--good)' : (isCur ? 'var(--accent)' : 'var(--line)');
      var g = el('g', { style: 'cursor:pointer' });
      g.appendChild(el('rect', { x: x, y: y, width: bw, height: 44, rx: 4, fill: 'var(--panel)', stroke: stroke, 'stroke-width': isCur || isDone ? 2.2 : 1.2 }));
      var t = el('text', { x: x + bw / 2, y: y + 21, 'text-anchor': 'middle', 'class': 'lab' }, S[k].short);
      if (isDone) t.setAttribute('style', 'fill:var(--good)');
      g.appendChild(t);
      g.appendChild(el('text', { x: x + 5, y: y + 12, style: 'font-size:9.5px' }, String(i + 1)));
      g.appendChild(el('text', { x: x + bw / 2, y: y + 37, 'text-anchor': 'middle', style: 'font-size:9.5px' }, isDone ? 'done' : (isCur ? 'next' : '')));
      g.addEventListener('click', function(){ var li = document.getElementById('s08-li-' + k); if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
      svg.appendChild(g);
    });
  }

  function render(){
    var R = ROUTES[route], keys = R.keys;
    intro.textContent = R.intro;
    var cur = -1;
    for (var i = 0; i < keys.length; i++) if (!done[keys[i]]) { cur = i; break; }
    var nDone = keys.filter(function(k){ return done[k]; }).length;
    var last = -1;
    for (var j = keys.length - 1; j >= 0; j--) if (done[keys[j]]) { last = j; break; }
    drawChain(keys, cur);
    read.innerHTML =
      '<div>Progress<b>' + nDone + ' of ' + keys.length + ' steps</b></div>' +
      '<div>You now hold<b style="font-size:14px">' + (last < 0 ? R.start : S[keys[last]].hold) + '</b></div>' +
      '<div>Next<b style="font-size:14px">' + (cur < 0 ? 'all steps done: write up from the report and the alignments' : (cur + 1) + '. ' + S[keys[cur]].title) + '</b></div>';
    list.innerHTML = '';
    keys.forEach(function(k, i){
      var s = S[k];
      var li = document.createElement('li');
      li.id = 's08-li-' + k;
      li.innerHTML =
        '<div><b>' + s.title + '</b>' + secLinks(s.sec) +
        '<div class="d">Tool: ' + s.tool + '</div>' +
        '<div class="t">in: ' + s.inp + '</div>' +
        '<div class="t">out: ' + s.out + '</div>' +
        '<div class="controls s08-row">' +
          '<label class="s08-chk"><span><input type="checkbox" id="s08-cb-' + k + '"' + (done[k] ? ' checked' : '') + '> done</span></label>' +
          '<button type="button" class="s08-skip" aria-expanded="false" aria-controls="s08-sk-' + k + '">What if I skip it?</button>' +
        '</div>' +
        '<div class="d s08-skiptext" id="s08-sk-' + k + '" hidden>' + s.skip + '</div></div>';
      list.appendChild(li);
      li.querySelector('input').addEventListener('change', function(e){ done[k] = e.target.checked; render(); var cb = document.getElementById('s08-cb-' + k); if (cb) cb.focus(); });
      var b = li.querySelector('.s08-skip');
      b.addEventListener('click', function(){
        var p = document.getElementById('s08-sk-' + k), open = p.hidden;
        p.hidden = !open; b.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  var segBtns = document.querySelectorAll('#s08-start button');
  Array.prototype.forEach.call(segBtns, function(b){
    b.addEventListener('click', function(){
      route = b.getAttribute('data-start');
      done = {};
      Array.prototype.forEach.call(segBtns, function(o){ o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      render();
    });
  });
  document.getElementById('s08-reset').addEventListener('click', function(){ done = {}; render(); });
  render();
})();
