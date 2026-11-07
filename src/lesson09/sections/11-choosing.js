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
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // =====================================================================
  // Sources. Every cited reason in the helper points at one of these keys.
  // =====================================================================
  var SRC = {
    NW: ['Newick standard', 'https://phylipweb.github.io/phylip/newicktree.html', 'Felsenstein, "The Newick tree format" (PHYLIP site). Adopted 26 June 1986 by an informal committee.'],
    IQT: ['IQ-TREE tutorial', 'https://iqtree.github.io/doc/Tutorial', 'IQ-TREE documentation. Model selection by default from version 1.5.4; 1000 is the minimum recommended number of replicates for -B and -alrt; the tree is written in Newick.'],
    IQF: ['IQ-TREE FAQ', 'https://iqtree.github.io/doc/Frequently-Asked-Questions', 'IQ-TREE documentation. UFBoot at least 95, SH-aLRT at least 80, single gene trees only; support tends to 100 % in phylogenomics; compute concordance factors.'],
    CF: ['IQ-TREE concordance factors', 'https://iqtree.github.io/doc/Concordance-Factor', 'IQ-TREE documentation. Definitions of the gene and site concordance factors.'],
    IQW: ['IQ-TREE wiki home', 'https://github.com/iqtree/iqtree2/wiki', 'IQ-TREE 2 wiki. Lists UFBoot, ModelFinder, SH-aLRT and support for very large datasets.'],
    MB: ['MrBayes manual', 'https://github.com/NBISweden/MrBayes/blob/v3.2.7a/doc/manual/Manual_MrBayes_v3.2.pdf', 'MrBayes 3.2 manual (tag v3.2.7a). Average standard deviation of split frequencies below 0.01; ESS below 100; PSRF near 1.0; two or more runs.'],
    AST: ['ASTRAL-III', 'https://doi.org/10.1186/s12859-018-2129-y', 'Zhang, Rabiee, Sayyari and Mirarab 2018, BMC Bioinformatics 19(Suppl 6):153. Abstract read only.'],
    BEAST: ['BEAST 2.5', 'https://doi.org/10.1371/journal.pcbi.1006650', 'Bouckaert et al. 2019, PLoS Comput Biol 15:e1006650. Abstract read only.'],
    KAP: ['Kapli 2020', 'https://doi.org/10.1038/s41576-020-0233-0', 'Kapli, Yang and Telford 2020, Nat Rev Genet 21:428-444. Abstract read only.'],
    OM: ['Omland 2008', 'https://doi.org/10.1002/bies.20794', 'Omland, Cook and Crisp 2008, BioEssays 30:854-867. Abstract read only.'],
    NEX: ['Maddison 1997', 'https://academic.oup.com/sysbio/article/46/4/590/1629560', 'Maddison, Swofford and Maddison 1997, Syst Biol 46:590-621. Abstract read only.'],
    FIG: ['FigTree README', 'https://github.com/rambaut/figtree', 'FigTree repository README.'],
    ITOL: ['iTOL help', 'https://itol.embl.de/help.cgi', 'iTOL help page.'],
    GG: ['ggtree on Bioconductor', 'https://bioconductor.org/packages/release/bioc/html/ggtree.html', 'ggtree 4.2.1, Bioconductor release 3.23.']
  };
  (function listSources() {
    var ul = $('s11-src');
    Object.keys(SRC).forEach(function (k) {
      var li = document.createElement('li');
      li.id = 's11-src-' + k;
      li.innerHTML = '<b>' + esc(SRC[k][0]) + '</b>: <a href="' + SRC[k][1] + '">' + esc(SRC[k][1]) + '</a>. ' + esc(SRC[k][2]);
      ul.appendChild(li);
    });
  })();

  // =====================================================================
  // The decision rules. Pure function: the page and the control use it.
  // reason = [text, key]; key is a SRC key or 'advice'.
  // =====================================================================
  var DATA = ['loci', 'genome', 'sine'], GOAL = ['draft', 'final', 'dated', 'conflict'], SIZE = ['small', 'large'];

  function decide(data, goal, size) {
    var o = { title: '', steps: [], reasons: [], watch: [], para: '' };
    var big = size === 'large';
    var R = function (t, k) { o.reasons.push([t, k]); };

    if (data === 'sine') {
      o.title = 'Presence/absence table of insertions, read as characters';
      o.steps.push('Score each insertion site as present (1) or absent (0) in every species, using the orthologous loci of <a href="../07-sines-satellites/#s05">lesson 7, s05</a>.');
      o.steps.push('Find the tree that needs the fewest changes (parsimony, <a href="#s05">s05</a>), or check by eye which species share each insertion.');
      R('An insertion is a rare event with a known direction (absent, then present). That is why it can be a character without a substitution model.', 'advice');
      R('There is no sequence model to choose, so model selection and the likelihood bootstrap of the DNA programs do not apply as they stand.', 'advice');
      if (goal === 'draft') {
        o.steps.push('Group the species that share insertions and look for conflicts.');
        R('A small table can be read by hand, so no program is needed for a first look.', 'advice');
      } else if (goal === 'final') {
        o.steps.push('Report the number of insertions behind each branch, and the number that conflict with it.');
        R('Support for a branch is then the count of shared insertions, which a reader can check in your table.', 'advice');
      } else if (goal === 'dated') {
        o.steps.push('Do not date from insertions alone. Build a sequence alignment of the same species and date it with the methods of <a href="#s09">s09</a>.');
        R('A presence/absence table holds no amount of change per branch, so it carries no length to turn into time.', 'advice');
      } else {
        o.steps.push('List insertions that support different groupings of the same species. Those are the conflicts, and they are what <a href="#s10">s10</a> predicts when the splits were close together in time.');
        R('Disagreement between insertions is the same kind of evidence as disagreement between gene trees.', 'advice');
      }
      if (big) R('With thousands of species the table is large. Count conflicts with a script, not by eye.', 'advice');
      o.watch.push('A table with few insertions per branch gives weak branches. Say how many there are.');
    } else if (goal === 'dated') {
      o.title = data === 'genome' ? 'Dated tree from a chosen set of loci, in a Bayesian program' : 'Dated tree in a Bayesian program';
      o.steps.push('First build an ML tree and check it with the steps for a paper below.');
      o.steps.push('Set up a Bayesian analysis with a clock model and calibrations (BEAST2, <a href="#s09">s09</a>), and run at least two independent runs.');
      o.steps.push('Check the effective sample sizes and compare the runs before reading any age.');
      R('Ages need a clock and calibrations, which a plain ML tree does not have. BEAST 2 is a platform whose joint models combine genome sequences with sampling dates and fossil occurrences, among other data.', 'BEAST');
      R('Convergence checks are the same idea as for MrBayes: ESS below 100 suggests poor mixing, and independent runs should agree. The thresholds come from the MrBayes manual. We apply them to BEAST by analogy.', 'MB');
      R('Starting from a tree you already trust saves time and shows if the dating changes the topology. Our habit, not a rule.', 'advice');
      if (data === 'genome') R('Dating all loci together is slow. Use a limited set of loci that fit a clock reasonably.', 'advice');
      if (big) R('Bayesian dating on thousands of sequences is usually too slow. Date a sample of species that covers the calibrations.', 'advice');
      o.watch.push('Ages are only as good as the calibrations: give their source and the dates.');
    } else if (data === 'loci') {
      if (goal === 'draft') {
        o.title = 'Maximum likelihood with IQ-TREE, default settings';
        o.steps.push('Align (<a href="#s02">s02</a>), then run: <code>iqtree3 -s alignment.fasta</code>');
        o.steps.push('Open the <code>.treefile</code> (Newick) in a viewer and look for groups you expect.');
        R('IQ-TREE selects the model by default since version 1.5.4, so a plain run already chooses one.', 'IQT');
        R('The tree file is written in Newick, and IQ-TREE says it can be visualised by any supported tree viewer program.', 'IQT');
        R('A distance tree (neighbour joining, <a href="#s04">s04</a>) is faster still and good for checking that nothing is mislabelled. Do not publish it as the result.', 'advice');
        if (big) R('IQ-TREE lists support for very large datasets, but for a quick look on thousands of sequences a distance tree or a subsample is the sensible start.', 'IQW');
      } else if (goal === 'final') {
        o.title = 'Maximum likelihood with model selection and two support values';
        o.steps.push('Run: <code>iqtree3 -s alignment.fasta -m MFP -B 1000 -alrt 1000</code>');
        o.steps.push('Show SH-aLRT and UFBoot on each branch. Treat a branch as reliable if UFBoot is at least 95 and SH-aLRT at least 80.');
        o.steps.push('Optionally add a Bayesian run with two or more independent runs and check convergence (<a href="#s08">s08</a>).');
        R('1000 is the minimum recommended number of replicates for both -B and -alrt.', 'IQT');
        R('For UFBoot, rely on a branch from 95 %. More confidence when SH-aLRT is at least 80 % as well.', 'IQF');
        R('These cut-offs are for single gene trees. With one gene or a few genes that is what you have.', 'IQF');
        R('Do not compare the UFBoot value with a standard bootstrap value.', 'IQF');
        R('For a Bayesian check, MrBayes calls an average standard deviation of split frequencies below 0.01 a very good indication of convergence.', 'MB');
        if (big) R('Thousands of sequences make Bayesian runs impractical in most labs. We would skip that step.', 'advice');
      } else {
        o.title = 'One tree per locus, then compare them';
        o.steps.push('Build a tree for each locus separately with the final settings above.');
        o.steps.push('Compare the trees by eye and by the concordance factors, using the two example commands of the IQ-TREE page: <code>iqtree3 -t concat.treefile --gcf loci.treefile --prefix concord</code> and <code>iqtree2 -t concat.treefile -s ALN_FILE --scf 100 --prefix concord</code>');
        o.steps.push('If they disagree, read <a href="#s10">s10</a> before you choose a species tree.');
        R('The gene concordance factor is the percentage of decisive gene trees that contain a branch. The site concordance factor is the percentage of decisive sites that support it.', 'CF');
        R('With only a few loci the percentages are coarse. Show the individual gene trees too.', 'advice');
        R('Mitochondrial genes are inherited together as one unit, so they count as one locus, as <a href="../05-many-genomes/#s07">lesson 5, s07</a> explains.', 'advice');
        if (big) R('Thousands of sequences per locus: look at a sample of species first.', 'advice');
      }
    } else {
      if (goal === 'draft') {
        o.title = 'Concatenated maximum likelihood, default settings';
        o.steps.push('Join the aligned loci into one alignment and run: <code>iqtree3 -s concatenated.fasta</code>');
        o.steps.push('Remember that this is the first look. A single tree from joined loci hides disagreement between them.');
        R('A plain IQ-TREE run selects a model by default since version 1.5.4.', 'IQT');
        R('Support from a concatenated alignment of many loci tends to reach 100 %, so it says little about disagreement between loci.', 'IQF');
        if (big) R('IQ-TREE lists support for very large datasets, including checkpointing and low-memory modes.', 'IQW');
      } else if (goal === 'final') {
        o.title = 'Concatenated tree, gene trees, a species-tree program and concordance factors';
        o.steps.push('Concatenated ML tree: <code>iqtree3 -s concatenated.fasta -m MFP -B 1000</code>');
        o.steps.push('One tree for each locus, then a species tree from them with ASTRAL (<a href="#s10">s10</a>).');
        o.steps.push('Compute the gene and site concordance factors on the branches and report them beside the bootstrap values.');
        R('Support from UFBoot and the standard bootstrap will tend to be 100 % on phylogenomic data, and concordance factors are recommended for any phylogenomic analysis.', 'IQF');
        R('The UFBoot and SH-aLRT cut-offs in the FAQ apply to single gene trees only, so do not carry them over to the concatenated tree.', 'IQF');
        R('ASTRAL builds a species tree from gene trees while accounting for gene tree disagreement.', 'AST');
        R('Reporting the concatenated and the species tree together shows the reader whether they agree. Our habit.', 'advice');
        if (big) R('ASTRAL-III is described as able to scale up to 10,000 species.', 'AST');
      } else {
        o.title = 'Gene trees, concordance factors and a species-tree program';
        o.steps.push('One tree for each locus.');
        o.steps.push('Gene and site concordance factors on a reference tree, with the two example commands of the IQ-TREE page: <code>iqtree3 -t concat.treefile --gcf loci.treefile --prefix concord</code> and <code>iqtree2 -t concat.treefile -s ALN_FILE --scf 100 --prefix concord</code>');
        o.steps.push('Species tree with ASTRAL. Then read <a href="#s10">s10</a> on why gene trees differ.');
        R('The concordance factors show, for each branch, how many genes and sites agree with it.', 'CF');
        R('Evolutionary histories can differ between parts of the genome, and ASTRAL is made to infer a species tree despite that.', 'AST');
        R('Contracting very weakly supported gene-tree branches (for example below 10 % support) improved accuracy in the ASTRAL-III simulations, while very aggressive filtering was harmful.', 'AST');
        if (big) R('ASTRAL-III is described as able to scale up to 10,000 species.', 'AST');
      }
    }
    o.watch.push('Whatever you choose, check that the sequences are orthologous and well aligned first. The tree cannot repair that.');
    R_kap(o);
    o.para = paragraph(data, goal);
    return o;
  }
  function R_kap(o) { o.reasons.push(['The review names orthology, alignment, model choice and the inference method as the major steps, and says that understanding the sources of error in them is essential.', 'KAP']); }

  function paragraph(data, goal) {
    var s = '[N] sequences of [loci] were obtained from [accessions or source]. ';
    if (data === 'sine') {
      return s.replace('sequences of [loci]', 'insertion sites') + 'Presence or absence of each insertion was scored in [N] species at orthologous loci, and the tree needing the fewest changes was found with [program, version]. The number of insertions supporting each branch and the number conflicting with it are given in [table]. The tree is rooted with [outgroup]. The table and the tree file are at [place].';
    }
    s += 'Orthology was assessed by [method]. Sequences were aligned with [program, version, settings] and [trimmed with ... / not trimmed]. ';
    if (goal === 'dated') {
      return s + 'Divergence times were estimated in [BEAST2, version] under a [clock model] and [tree prior], with calibrations [list, with source and distribution]. [N] independent runs of [N] generations were made, with [N] % burn-in. ESS values were above [N] for all parameters and the runs agreed. The tree is rooted with [outgroup]. Files are at [place].';
    }
    s += 'The substitution model was chosen with [ModelFinder] and was [model]. A maximum likelihood tree was inferred with [IQ-TREE, version] ';
    if (goal === 'draft') return s + 'using default settings. The tree is rooted with [outgroup / midpoint, say which] and is a first look, without support values. Files are at [place].';
    s += 'with [1000] ultrafast bootstrap replicates and [1000] SH-aLRT replicates. ';
    if (data === 'genome' || goal === 'conflict') s += 'Gene trees were inferred for each of [N] loci, a species tree was estimated from them with [ASTRAL, version], and gene and site concordance factors were computed in [IQ-TREE, version]. ';
    if (goal === 'final' && data === 'loci') s += 'A Bayesian analysis was run in [MrBayes, version] with [N] runs of [N] generations and [N] % burn-in. The average standard deviation of split frequencies was [value], ESS above [N], PSRF [value]. ';
    return s + 'The tree is rooted with [outgroup]. Branches are described as well supported when [state your rule]. Files are at [place].';
  }

  // ---------- page for the helper ----------
  var state = { d: 'loci', g: 'draft', z: 'small' };
  var ids = { d: { loci: 's11-d-loci', genome: 's11-d-genome', sine: 's11-d-sine' }, g: { draft: 's11-g-draft', final: 's11-g-final', dated: 's11-g-dated', conflict: 's11-g-conflict' }, z: { small: 's11-z-small', large: 's11-z-large' } };
  function tagHtml(k) {
    if (k === 'advice') return '<span class="tag l">advice</span>';
    return '<a href="#s11-src-' + k + '" style="text-decoration:none"><span class="tag s">source: ' + esc(SRC[k][0]) + '</span></a>';
  }
  function render() {
    for (var grp in ids) for (var v in ids[grp]) $(ids[grp][v]).setAttribute('aria-pressed', state[grp] === v ? 'true' : 'false');
    var o = decide(state.d, state.g, state.z);
    var h = '<b>' + o.title + '</b><ol class="qlist" style="margin:8px 0">';
    o.steps.forEach(function (s) { h += '<li>' + s + '</li>'; });
    h += '</ol><b>Why</b><ul class="qlist" style="margin:8px 0">';
    o.reasons.forEach(function (r) { h += '<li>' + r[0] + ' ' + tagHtml(r[1]) + '</li>'; });
    h += '</ul><b>Watch out</b><ul class="qlist" style="margin:8px 0">';
    o.watch.forEach(function (w) { h += '<li>' + w + ' ' + tagHtml('advice') + '</li>'; });
    h += '</ul>';
    $('s11-out').innerHTML = h;
    var box = $('s11-para-box');
    box.innerHTML = '<b>Draft methods paragraph</b><div class="code"><button type="button">copy</button><pre style="white-space:pre-wrap;padding-top:30px">' + esc(o.para) + '</pre></div>';
    var b = box.querySelector('button');
    b.addEventListener('click', function () {
      try { navigator.clipboard.writeText(o.para); b.textContent = 'copied'; } catch (e) { b.textContent = 'select the text'; }
    });
  }
  Object.keys(ids).forEach(function (grp) {
    Object.keys(ids[grp]).forEach(function (v) {
      $(ids[grp][v]).addEventListener('click', function () { state[grp] = v; render(); });
    });
  });

  // ---------- control 1: the rules ----------
  function controlRules() {
    var fails = [], n = 0, titles = {};
    DATA.forEach(function (d) { GOAL.forEach(function (g) { SIZE.forEach(function (z) {
      n++;
      var o = decide(d, g, z), id = d + '/' + g + '/' + z;
      if (!o.title || !o.steps.length || !o.reasons.length || !o.para) fails.push(id + ': empty part');
      o.reasons.forEach(function (r) { if (r[1] !== 'advice' && !SRC[r[1]]) fails.push(id + ': unknown source ' + r[1]); });
      if (!o.reasons.some(function (r) { return r[1] !== 'advice'; }) && d !== 'sine') fails.push(id + ': no cited reason');
      var txt = o.steps.join(' ');
      if (d === 'sine' && /-B 1000|iqtree/.test(txt)) fails.push(id + ': SINE plan uses a sequence-model command');
      if (d === 'genome' && (g === 'final' || g === 'conflict') && !/gcf|concordance/i.test(txt + o.reasons.join(' '))) fails.push(id + ': genome plan lacks concordance factors');
      if (d === 'loci' && g === 'final' && !/-B 1000 -alrt 1000/.test(txt)) fails.push(id + ': missing replicates');
      if (g === 'dated' && d !== 'sine' && !/calibrat/i.test(txt)) fails.push(id + ': dating without calibrations');
      titles[d + '|' + g] = o.title;
    }); }); });
    var distinct = {}; Object.keys(titles).forEach(function (k) { distinct[titles[k]] = 1; });
    // 12 (data, goal) pairs; dated plans share a title for loci and a variant for genome; sine 4 goals share one title
    var nd = Object.keys(distinct).length;
    if (nd < 8) fails.push('too few distinct plans: ' + nd);
    return { n: n, fails: fails, distinct: nd };
  }

  // =====================================================================
  // Newick parser, clades, drawing
  // =====================================================================
  function parseNewick(s) {
    s = s.replace(/\s+/g, '');
    var i = 0;
    function err(m) { throw new Error(m + ' (at character ' + (i + 1) + ')'); }
    function name() { var j = i; while (i < s.length && '(),:;[]'.indexOf(s[i]) < 0) i++; return s.slice(j, i); }
    function num() { var j = i; while (i < s.length && /[0-9eE+.\-]/.test(s[i])) i++; var t = s.slice(j, i); var v = parseFloat(t); if (isNaN(v)) err('a number was expected after the colon'); return v; }
    function node() {
      var n = { kids: [], name: '', len: null };
      if (s[i] === '(') {
        i++;
        for (;;) {
          n.kids.push(node());
          if (s[i] === ',') { i++; continue; }
          if (s[i] === ')') { i++; break; }
          err('a comma or a closing parenthesis was expected');
        }
      }
      n.name = name();
      if (s[i] === ':') { i++; n.len = num(); }
      return n;
    }
    if (!s.length) throw new Error('the box is empty');
    var t = node();
    if (s[i] !== ';') err('the tree must end with a semicolon');
    i++;
    if (i < s.length) err('text after the semicolon');
    return t;
  }
  function leaves(t, out) { out = out || []; if (!t.kids.length) out.push(t.name); else t.kids.forEach(function (k) { leaves(k, out); }); return out; }
  // Set of clades: sorted leaf names of every interior node with 2+ leaves, excluding the root (it holds all tips).
  function clades(t) {
    var all = leaves(t).slice().sort().join('|'), out = [];
    (function rec(n, root) {
      if (!n.kids.length) return;
      var l = leaves(n).slice().sort().join(',');
      if (!root) out.push(l);
      n.kids.forEach(function (k) { rec(k, false); });
    })(t, true);
    return out.sort();
  }
  function sameClades(a, b) { var x = clades(a), y = clades(b); return x.length === y.length && x.every(function (v, i) { return v === y[i]; }); }
  function sumLen(t) { var s = t.len || 0; t.kids.forEach(function (k) { s += sumLen(k); }); return s; }
  function mirror(t) { return { name: t.name, len: t.len, kids: t.kids.map(mirror).reverse() }; }
  function clone(t) { return { name: t.name, len: t.len, kids: t.kids.map(clone) }; }
  // Trade the names of the first pair of tips that are not sisters.
  function swapNonSister(t) {
    var c = clone(t), L = [], par = [];
    (function f(n, p) { if (!n.kids.length) { L.push(n); par.push(p); } else n.kids.forEach(function (k) { f(k, n); }); })(c, null);
    for (var i = 0; i < L.length; i++) for (var j = i + 1; j < L.length; j++) {
      if (par[i] !== par[j] && L[i].name !== L[j].name) { var a = L[i].name; L[i].name = L[j].name; L[j].name = a; return c; }
    }
    return c;
  }

  var EX = {
    e1: '((A,B),(C,D));',
    e2: '(B:6.0,(A:5.0,C:3.0,E:4.0):5.0,D:11.0);',
    e3: '(((Frog1:1,Frog2:1)95:1,Frog3:2)88:1,(Newt1:2,Newt2:2)100:1);'
  };
  var cur = null, start = null;
  function draw(t) {
    var svg = $('s11-nw-svg'); clear(svg);
    var useLen = sumLen(t) > 0 && (function chk(n) { return n === t || n.len !== null ? n.kids.every(chk) : false; })(t);
    var rowH = 26, nTips = leaves(t).length, left = 14, treeW = 300, labW = 120, H = nTips * rowH + 24;
    var W = left + treeW + labW;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('style', 'min-width:' + W + 'px'); svg.setAttribute('height', H);
    var row = 0, maxD = 0;
    function depth(n, d) { n.d = d; if (!n.kids.length) maxD = Math.max(maxD, d); n.kids.forEach(function (k) { depth(k, d + (useLen ? (k.len || 0) : 1)); }); }
    depth(t, 0);
    var sx = maxD > 0 ? treeW / maxD : 1;
    function lay(n) {
      if (!n.kids.length) { n.y = 14 + row * rowH + rowH / 2 - 6; row++; }
      else { n.kids.forEach(lay); n.y = (n.kids[0].y + n.kids[n.kids.length - 1].y) / 2; }
      n.x = left + n.d * sx;
    }
    lay(t);
    function paint(n) {
      if (n.kids.length) {
        var y0 = n.kids[0].y, y1 = n.kids[n.kids.length - 1].y;
        el('line', { x1: n.x, x2: n.x, y1: y0, y2: y1, class: 'ax', style: 'stroke:var(--fg)' }, svg);
        n.kids.forEach(function (k) {
          el('line', { x1: n.x, x2: k.x, y1: k.y, y2: k.y, class: 'ax', style: 'stroke:var(--fg)' }, svg);
          paint(k);
        });
        if (n !== t && n.name) el('text', { x: n.x + 3, y: n.y - 4 }, svg, n.name);
      } else {
        el('text', { x: n.x + 6, y: n.y + 4, class: 'lab' }, svg, n.name || '(no name)');
      }
    }
    paint(t);
    el('line', { x1: left - 8, x2: left, y1: t.y, y2: t.y, class: 'ax', style: 'stroke:var(--fg)' }, svg);
  }
  function show(t) {
    cur = t; draw(t);
    $('s11-nw-tips').textContent = leaves(t).length;
    $('s11-nw-cl').textContent = clades(t).length;
    $('s11-nw-sum').textContent = sumLen(t) > 0 ? (Math.round(sumLen(t) * 1000) / 1000) : 'none given';
    $('s11-nw-same').textContent = start && sameClades(start, t) ? 'yes' : 'no';
    var msg = '';
    var named = (function f(n) { return (n.kids.length && n.name && /^[0-9.]+$/.test(n.name) ? 1 : 0) + n.kids.reduce(function (a, k) { return a + f(k); }, 0); })(t);
    if (named) msg += 'Numbers on interior nodes (' + named + ' here) look like support values. They belong to the branch above the node. <span class="tag l">advice</span> ';
    var multi = (function f(n) { return (n.kids.length > 2 ? 1 : 0) + n.kids.reduce(function (a, k) { return a + f(k); }, 0); })(t);
    if (multi) msg += 'This tree has ' + multi + ' node(s) with more than two children, which Newick allows. ';
    $('s11-nw-msg').innerHTML = msg;
  }
  function load(text) {
    try { var t = parseNewick(text); start = t; show(t); }
    catch (e) { $('s11-nw-msg').innerHTML = '<b style="color:var(--bad)">Cannot read this tree:</b> ' + esc(e.message); }
  }
  function mark(id) { ['e1', 'e2', 'e3'].forEach(function (k) { $('s11-nw-' + k).setAttribute('aria-pressed', k === id ? 'true' : 'false'); }); }
  ['e1', 'e2', 'e3'].forEach(function (k) {
    $('s11-nw-' + k).addEventListener('click', function () { $('s11-nw-in').value = EX[k]; mark(k); load(EX[k]); });
  });
  $('s11-nw-in').addEventListener('input', function () { mark(''); load(this.value); });
  $('s11-nw-rot').addEventListener('click', function () { if (cur) show(mirror(cur)); });
  $('s11-nw-swap').addEventListener('click', function () { if (cur) show(swapNonSister(cur)); });

  // ---------- control 2: the Newick tools ----------
  function controlNewick() {
    var fails = [], r = [];
    // the four example trees on the Newick standard page: leaf counts and branch-length sum
    var t2 = parseNewick('(B:6.0,(A:5.0,C:3.0,E:4.0):5.0,D:11.0);');
    if (leaves(t2).length !== 5) fails.push('example 2 tips');
    if (Math.abs(sumLen(t2) - 34) > 1e-9) fails.push('example 2 length sum ' + sumLen(t2));
    var t4 = parseNewick('(Alpha,Beta,Gamma,Delta,,Epsilon,,,);');
    if (leaves(t4).length !== 9) fails.push('example 4 tips ' + leaves(t4).length);
    var t1 = parseNewick('((A,B),(C,D));');
    if (leaves(t1).length !== 4 || clades(t1).join(' ') !== 'A,B C,D') fails.push('example 3 clades ' + clades(t1).join(' '));
    var t0 = parseNewick('(B,(A,C,E),D);');
    if (leaves(t0).length !== 5 || clades(t0).join(' ') !== 'A,C,E') fails.push('example 1 clades');
    r.push('4 examples from the Newick page parsed');
    // rotation keeps the clades; the two spellings in the text are one tree
    var a = parseNewick('((A,B),(C,D));'), b = parseNewick('((D,C),(B,A));');
    if (!sameClades(a, b)) fails.push('((A,B),(C,D)) and ((D,C),(B,A)) should be the same');
    // rotation of random trees keeps clades (100 trees), swapping two non-sister names changes them
    var seed = 12345; function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    function rtree(names) {
      var pool = names.map(function (nm) { return { name: nm, len: 1, kids: [] }; });
      while (pool.length > 1) { var i = Math.floor(rnd() * pool.length), x = pool.splice(i, 1)[0]; var j = Math.floor(rnd() * pool.length), y = pool.splice(j, 1)[0]; pool.push({ name: '', len: 1, kids: [x, y] }); }
      return pool[0];
    }
    function toNw(t) { return (t.kids.length ? '(' + t.kids.map(toNw).join(',') + ')' : '') + t.name + (t.len !== null ? ':' + t.len : ''); }
    var rotOk = 0, swapChanged = 0, swapTried = 0, roundTrip = 0;
    for (var k = 0; k < 100; k++) {
      var nm = []; for (var q = 0; q < 8; q++) nm.push('T' + q);
      var t = rtree(nm);
      if (sameClades(t, mirror(t)) && sameClades(t, mirror(mirror(t)))) rotOk++;
      var p = parseNewick(toNw(t) + ';');
      if (sameClades(t, p) && leaves(p).join() === leaves(t).join()) roundTrip++;
      var s2 = swapNonSister(t);
      swapTried++; if (!sameClades(t, s2)) swapChanged++;
    }
    if (rotOk !== 100) fails.push('rotation changed clades in ' + (100 - rotOk) + ' of 100 trees');
    if (roundTrip !== 100) fails.push('write and parse round trip failed');
    if (swapChanged < 90) fails.push('swapping two non-sister names changed the clades in only ' + swapChanged + ' of 100');
    r.push('rotation kept the clades in ' + rotOk + '/100 random 8-tip trees, write-and-parse round trip ' + roundTrip + '/100, swapping two non-sister names changed them in ' + swapChanged + '/100');
    // bad input is refused
    ['((A,B),C)', '((A,B,C);', '(A,B));', '(A:x,B);', ''].forEach(function (bad) {
      var threw = false; try { parseNewick(bad); } catch (e) { threw = true; }
      if (!threw) fails.push('accepted bad input ' + JSON.stringify(bad));
    });
    r.push('5 malformed strings refused');
    return { fails: fails, r: r };
  }

  // =====================================================================
  // Robinson-Foulds distance
  // =====================================================================
  // RF-BEGIN
  // A split is a branch of the unrooted tree: it cuts the tips in two groups, each of at least two tips.
  // It is written as the group that does not hold the first tip in alphabetical order.
  function splitsOf(t) {
    var names = leaves(t).slice().sort(), n = names.length, out = {};
    (function rec(nd) {
      if (!nd.kids.length) return;
      var l = leaves(nd);
      if (l.length >= 2 && l.length <= n - 2) {
        var side = l.indexOf(names[0]) >= 0 ? names.filter(function (x) { return l.indexOf(x) < 0; }) : l.slice();
        out[side.sort().join(' ')] = true;
      }
      nd.kids.forEach(rec);
    })(t);
    return Object.keys(out);
  }
  function rfDistance(a, b) {
    var ta = leaves(a).slice().sort().join(' '), tb = leaves(b).slice().sort().join(' ');
    if (ta !== tb) throw new Error('the two trees must have the same tips');
    var A = splitsOf(a), B = splitsOf(b), n = leaves(a).length;
    var only1 = A.filter(function (s) { return B.indexOf(s) < 0; }), only2 = B.filter(function (s) { return A.indexOf(s) < 0; });
    return { only1: only1, only2: only2, shared: A.length - only1.length, rf: only1.length + only2.length, max: A.length + B.length, n: n };
  }
  // RF-END
  var RF_EX = {
    same: ['(((A,B),(C,D)),((E,F),(G,H)));', '(((H,G),(F,E)),((D,C),(B,A)));'],
    near: ['(((A,B),(C,D)),((E,F),(G,H)));', '(((A,C),(B,D)),((E,F),(G,H)));'],
    far: ['(A,(B,(C,(D,(E,(F,(G,H)))))));', '(B,(C,(D,(E,(F,(G,(H,A)))))));'],
    other: ['(((A,B),(C,D)),((E,F),(G,H)));', '(((A,E),(B,F)),((C,G),(D,H)));']
  };
  function rfDraw(id, t, bad, label) {
    var NSs = 'http://www.w3.org/2000/svg', box = $(id), ys = {}, y = 0, W = 300;
    box.textContent = '';
    var names = leaves(t).slice().sort();
    function depth(n) { return n.kids.length ? 1 + Math.max.apply(null, n.kids.map(depth)) : 0; }
    var D = depth(t), H = leaves(t).length * 20 + 6, sx = (W - 40) / D;
    var svg = document.createElementNS(NSs, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', '100%'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label);
    svg.setAttribute('style', 'display:block;max-width:320px');
    box.appendChild(svg);
    function ln(x1, y1, x2, y2, c, w) {
      var e = document.createElementNS(NSs, 'line');
      e.setAttribute('x1', x1); e.setAttribute('y1', y1); e.setAttribute('x2', x2); e.setAttribute('y2', y2);
      e.setAttribute('style', 'stroke:' + c + ';stroke-width:' + w); svg.appendChild(e);
    }
    function key(n) {
      var l = leaves(n);
      if (l.length < 2 || l.length > names.length - 2) return '';
      return (l.indexOf(names[0]) >= 0 ? names.filter(function (x) { return l.indexOf(x) < 0; }) : l.slice()).sort().join(' ');
    }
    function lay(n, lev) {
      var x = 8 + lev * sx, yy;
      if (!n.kids.length) {
        yy = 14 + y * 20; y++;
        var e = document.createElementNS(NSs, 'text');
        e.setAttribute('x', W - 26); e.setAttribute('y', yy + 4); e.setAttribute('style', 'font:13px var(--f-mono);fill:var(--fg)');
        e.textContent = n.name; svg.appendChild(e);
        return { x: W - 32, y: yy };
      }
      var ps = n.kids.map(function (k) {
        var p = lay(k, lev + 1), isBad = bad.indexOf(key(k)) >= 0;
        ln(x, p.y, p.x, p.y, 'var(--fg)', 1.5);
        if (isBad) ln(x, p.y, x + sx, p.y, 'var(--bad)', 4);
        return p;
      });
      yy = (ps[0].y + ps[ps.length - 1].y) / 2;
      ln(x, ps[0].y, x, ps[ps.length - 1].y, 'var(--fg)', 1.5);
      return { x: x, y: yy };
    }
    lay(t, 0);
  }
  function rfLoad() {
    var msg = $('s11-rf-msg');
    try {
      var a = parseNewick($('s11-rf-a').value), b = parseNewick($('s11-rf-b').value), r = rfDistance(a, b);
      rfDraw('s11-rf-d1', a, r.only1, 'First tree, branches missing from the second tree marked');
      rfDraw('s11-rf-d2', b, r.only2, 'Second tree, branches missing from the first tree marked');
      $('s11-rf-sh').textContent = r.shared;
      $('s11-rf-o1').textContent = r.only1.length;
      $('s11-rf-o2').textContent = r.only2.length;
      $('s11-rf-v').textContent = r.rf;
      $('s11-rf-n').textContent = r.max > 0 ? (r.rf / r.max).toFixed(2) : '–';
      msg.textContent = r.rf === 0 ? 'The trees have all the same splits: they are the same unrooted tree, however they are drawn.' : 'Red branches have no match in the other tree. Distance = ' + r.only1.length + ' + ' + r.only2.length + ' = ' + r.rf + ', of a largest possible ' + r.max + ' for ' + r.n + ' tips.';
    } catch (e) {
      msg.textContent = 'Cannot compare these trees: ' + e.message;
      ['s11-rf-sh', 's11-rf-o1', 's11-rf-o2', 's11-rf-v', 's11-rf-n'].forEach(function (id) { $(id).textContent = '–'; });
      $('s11-rf-d1').textContent = ''; $('s11-rf-d2').textContent = '';
    }
  }
  Array.prototype.forEach.call($('s11-rf-ex').children, function (bt) {
    bt.addEventListener('click', function () {
      $('s11-rf-a').value = RF_EX[bt.dataset.e][0]; $('s11-rf-b').value = RF_EX[bt.dataset.e][1];
      Array.prototype.forEach.call($('s11-rf-ex').children, function (x) { x.setAttribute('aria-pressed', String(x === bt)); });
      rfLoad();
    });
  });
  ['s11-rf-a', 's11-rf-b'].forEach(function (id) {
    $(id).addEventListener('input', function () {
      Array.prototype.forEach.call($('s11-rf-ex').children, function (x) { x.setAttribute('aria-pressed', 'false'); });
      rfLoad();
    });
  });
  $('s11-rf-a').value = RF_EX.near[0]; $('s11-rf-b').value = RF_EX.near[1];
  rfLoad();

  // ---------- start ----------
  render();
  $('s11-nw-in').value = EX.e2; load(EX.e2);
  var c1 = controlRules(), c2 = controlNewick();
  $('s11-ctl').innerHTML = '<b>Code control (helper).</b> All ' + c1.n + ' combinations of data, goal and size give a plan with steps, reasons and a paragraph; every reason has a known source or the advice tag; ' + c1.distinct + ' different plan titles. ' + (c1.fails.length ? '<b style="color:var(--bad)">FAILED: ' + esc(c1.fails.join('; ')) + '</b>' : '<b style="color:var(--good)">Passed.</b>') + ' The tags are checked by code, whether the claim behind a tag is true was checked by reading the source (see the sources list).';
  $('s11-nw-ctl').innerHTML = '<b>Code control (Newick).</b> ' + esc(c2.r.join('; ')) + '. ' + (c2.fails.length ? '<b style="color:var(--bad)">FAILED: ' + esc(c2.fails.join('; ')) + '</b>' : '<b style="color:var(--good)">Passed.</b>');
})();
