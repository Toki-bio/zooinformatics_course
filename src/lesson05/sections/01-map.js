(function(){
  var NS = 'http://www.w3.org/2000/svg';
  var el = function(id){ return document.getElementById(id); };
  function mk(tag, attrs, txt, parent){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------- map figure ---------- */
  var FAMS = [
    { id: 'pair', name: 'Pairwise coalescent' },
    { id: 'arg',  name: 'Full ARG' },
    { id: 'ld',   name: 'Linkage disequilibrium' },
    { id: 'ibd',  name: 'IBD segments' }
  ];
  var svg = el('s01-map');
  var frames = {};
  function line(g, x1, y1, x2, y2, col, w){ mk('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: col || 'var(--muted)', 'stroke-width': w || 1.5 }, null, g); }
  if (svg){
    var pw = 225, gap = 20;
    FAMS.forEach(function(f, i){
      var x0 = i * (pw + gap) + 10;
      var g = mk('g', { transform: 'translate(' + x0 + ',8)' }, null, svg);
      frames[f.id] = mk('rect', { x: 0, y: 0, width: pw, height: 232, rx: 6, fill: 'var(--panel)', stroke: 'var(--line)', 'stroke-width': 1.5 }, null, g);
      mk('text', { x: 12, y: 22, class: 'lab', 'font-weight': 600 }, f.name, g);
      if (f.id === 'pair'){
        mk('text', { x: 12, y: 40 }, 'heterozygous sites on one genome', null, g).textContent = 'heterozygous sites, one genome';
        line(g, 14, 80, pw - 14, 80, 'var(--muted)', 3);
        [28, 40, 47, 90, 99, 104, 112, 150, 177, 190].forEach(function(x){ line(g, x, 68, x, 92, 'var(--het)', 2); });
        mk('text', { x: 12, y: 116 }, 'size through time', null, g);
        mk('path', { d: 'M20 190 L20 128 M20 190 L' + (pw - 20) + ' 190', stroke: 'var(--line)', fill: 'none' }, null, g);
        mk('path', { d: 'M22 175 C60 175 70 150 100 150 C130 150 140 182 170 182 L' + (pw - 24) + ' 182', stroke: 'var(--accent)', 'stroke-width': 2.5, fill: 'none' }, null, g);
        mk('text', { x: 12, y: 214 }, 'no tree is built', null, g);
      } else if (f.id === 'arg'){
        mk('text', { x: 12, y: 40 }, 'a tree for each stretch', null, g);
        var trees = [ [20, 'a'], [120, 'b'] ];
        trees.forEach(function(t){
          var x = t[0];
          // leaves at y=120, 4 leaves
          var lx = [x, x + 22, x + 44, x + 66];
          lx.forEach(function(l){ line(g, l, 120, l, t[1] === 'a' ? 100 : 100, 'var(--muted)'); });
          if (t[1] === 'a'){
            line(g, lx[0], 100, lx[1], 100); line(g, x + 11, 100, x + 11, 82);
            line(g, lx[2], 100, lx[3], 100); line(g, x + 55, 100, x + 55, 70);
            line(g, x + 11, 82, x + 11, 56, 'var(--muted)'); line(g, x + 11, 56, x + 55, 56); line(g, x + 55, 70, x + 55, 56);
            line(g, x + 33, 56, x + 33, 46);
          } else {
            line(g, lx[1], 100, lx[2], 100); line(g, x + 33, 100, x + 33, 84);
            line(g, lx[0], 100, lx[0], 64); line(g, x + 33, 84, x + 33, 64); line(g, lx[0], 64, x + 33, 64);
            line(g, x + 16, 64, x + 16, 52); line(g, lx[3], 100, lx[3], 52); line(g, x + 16, 52, lx[3], 52);
            line(g, x + 41, 52, x + 41, 44);
          }
        });
        line(g, 14, 150, pw - 14, 150, 'var(--muted)', 3);
        line(g, 112, 140, 112, 160, 'var(--accent)', 2.5);
        mk('text', { x: 100, y: 176 }, 'recombination', null, g);
        mk('text', { x: 12, y: 214 }, 'joined = ARG', null, g);
      } else if (f.id === 'ld'){
        mk('text', { x: 12, y: 40 }, 'association between two sites', null, g);
        mk('path', { d: 'M24 190 L24 56 M24 190 L' + (pw - 18) + ' 190', stroke: 'var(--line)', fill: 'none' }, null, g);
        mk('path', { d: 'M26 62 C50 100 80 160 ' + (pw - 20) + ' 184', stroke: 'var(--accent)', 'stroke-width': 2.5, fill: 'none' }, null, g);
        [[34,72],[46,86],[60,110],[78,126],[98,150],[122,158],[148,170],[176,176],[196,182]].forEach(function(p){ mk('circle', { cx: p[0], cy: p[1], r: 2.8, fill: 'var(--het)' }, null, g); });
        mk('text', { x: 40, y: 206 }, 'distance between sites', null, g);
        mk('text', { x: 12, y: 224 }, 'no phasing needed by GONE', null, g);
      } else {
        mk('text', { x: 12, y: 40 }, 'stretches shared by two animals', null, g);
        mk('text', { x: 12, y: 74 }, 'A', null, g); mk('text', { x: 12, y: 114 }, 'B', null, g);
        line(g, 30, 70, pw - 14, 70, 'var(--muted)', 8); line(g, 30, 110, pw - 14, 110, 'var(--muted)', 8);
        line(g, 70, 70, 140, 70, 'var(--accent)', 8); line(g, 70, 110, 140, 110, 'var(--accent)', 8);
        line(g, 70, 74, 70, 106, 'var(--accent)', 1); line(g, 140, 74, 140, 106, 'var(--accent)', 1);
        mk('text', { x: 78, y: 140 }, 'long = recent ancestor', null, g);
        mk('text', { x: 12, y: 170 }, 'many animals: count and length', null, g);
        mk('text', { x: 12, y: 188 }, 'of shared stretches', null, g);
        mk('text', { x: 12, y: 224 }, 'detection needs phased data', null, g);
      }
    });
  }

  /* ---------- helper ---------- */
  // Source keys
  var SRC = {
    R:  'R = Nielsen, Vaughn &amp; Deng 2025, Nat Rev Genet 26:47-58 (Table 1 and text)',
    L4: 'L4 = lesson 4, section tables (each tool\'s own documentation, checked there)',
    AN: 'AN = ARG-Needle manual (palamaralab.github.io/software/argneedle/manual)',
    TS: 'TS = tsinfer documentation (docs/inference.md, docs/quickstart.md)',
    RL: 'RL = Relate documentation (myersgroup.github.io/relate) and Speidel et al. 2019 abstract',
    SG: 'SG = SINGER README (github.com/YunDeng98/SINGER)',
    GO: 'GO = GONE: Santiago et al. 2020 abstract and the GONE README',
    AS: 'AS = ASMC documentation (github.com/PalamaraLab/ASMC, docs/asmc.md)',
    HI: 'HI = hap-ibd README and Zhou et al. 2020 abstract',
    IB: 'IB = Browning &amp; Browning 2015 abstract (IBDNe)'
  };
  var TIP_ARR = 'our inference: its documentation describes sequence input only';

  // spec fields: arr/seq: 'y' | 'n' | 'inf' (not supported by our inference); ph: 'req' | 'any';
  // minCopies: hard floor in chromosome copies; maxN: soft ceiling in animals (use a subset above it)
  var M = [
    { id: 'psmc', name: 'PSMC', fam: 'pair', arr: 'inf', seq: 'y', ph: 'any',
      okTxt: 'one genome at a time; with several animals run each one separately [L4]',
      arrTxt: 'input is the consensus sequence of one genome in bins [L4]; array: ' + TIP_ARR },
    { id: 'msmc2', name: 'MSMC2', fam: 'pair', arr: 'inf', seq: 'y', ph: 'any', maxN: 8,
      okTxt: 'about 1 to 8 animals (up to 16 copies) [L4]; unphased animals can be run by pairing only the two copies inside each animal [L4]',
      phTxt: 'phasing improves very recent times when several animals are combined [L4]',
      maxTxt: 'above 8 animals the author does not think it feasible to go beyond 16 copies [L4]; use a subset',
      arrTxt: 'built on sequence segregating-site files [L4]; array: ' + TIP_ARR },
    { id: 'smcpp', name: 'SMC++', fam: 'pair', arr: 'inf', seq: 'y', ph: 'any',
      okTxt: 'one to hundreds of animals; results independent of phasing (authors\' abstract) [L4]',
      arrTxt: 'input is VCF plus a mask of uncalled regions [L4]; array: ' + TIP_ARR },
    { id: 'cobraa', name: 'cobraa', fam: 'pair', arr: 'inf', seq: 'y', ph: 'any',
      okTxt: 'one diploid genome by design; run each animal separately [L4]',
      arrTxt: 'input is a sequence-based multihetsep file [L4]; array: ' + TIP_ARR },

    { id: 'relate', name: 'Relate', fam: 'arg', arr: 'n', seq: 'y', ph: 'req',
      okTxt: 'needs the ancestral allele at each site [R, RL]; the review says it handles thousands of sequences, including the full 1000 Genomes data [R]',
      arrTxt: 'the review\'s Table 1: no genotyping-array support [R]',
      phTxt: 'input is the phased haps/sample format [RL]' },
    { id: 'tsinfer', name: 'tsinfer + tsdate', fam: 'arg', arr: 'y', seq: 'y', ph: 'req',
      okTxt: 'needs the ancestral allele at each site and biallelic sites only [TS]; scales to the UK Biobank [R]',
      arrTxt: 'array: via the variant "tsinfer-sparse" [R] (named in the review; not found in the tsinfer docs version we read)',
      phTxt: 'data must be phased [TS]' },
    { id: 'argneedle', name: 'ARG-Needle', fam: 'arg', arr: 'y', seq: 'y', ph: 'req', minCopies: 300,
      okTxt: 'array mode is the default; sequence mode works but is tuned for SNP data and may be slow [AN]; scales to the UK Biobank [R]; the review lists ancestral-state polarisation as a requirement only of Relate and tsinfer [R]',
      phTxt: 'input is phased haps/sample files [AN]',
      minTxt: 'the model needs at least 300 haploid samples, that is 150 diploids (manual FAQ) [AN]' },
    { id: 'singer', name: 'SINGER', fam: 'arg', arr: 'n', seq: 'y', ph: 'req', maxN: 500,
      okTxt: 'samples many ARGs to show uncertainty [R]; works with unpolarised data (option -polar, default 0.5) [SG]; the review: hundreds of whole-genome sequences [R]',
      arrTxt: 'the review\'s Table 1: no genotyping-array support [R]',
      phTxt: 'the README: "we only support phased, high-quality genomes"; sites with missing data are excluded [SG]',
      maxTxt: 'the review reports hundreds of sequences, not thousands [R]; use a subset' },
    { id: 'argweaver', name: 'ARGweaver', fam: 'arg', arr: 'n', seq: 'y', ph: 'any', maxN: 49,
      okTxt: 'one of the only methods that can use unphased data [R]; handles tens of sequences [R]',
      arrTxt: 'the review\'s Table 1: no genotyping-array support [R]',
      maxTxt: 'the review: only tens of sequences; use a subset' },

    { id: 'gone', name: 'GONE', fam: 'ld', arr: 'y', seq: 'y', ph: 'any', maxN: 1800,
      okTxt: 'recent history only, about the last 100 generations; phased or unphased, samples from fewer than ten to large [GO]',
      maxTxt: 'the README allows at most 1,800 individuals, 200 chromosomes and 100,000 SNPs per chromosome [GO]; use a subset' },

    { id: 'asmc', name: 'ASMC', fam: 'ibd', arr: 'y', seq: 'y', ph: 'req',
      okTxt: 'pairwise coalescence times along the genome, from "SNP array or whole-genome sequencing data" [AS]',
      phTxt: 'input is phased haps/sample files [AS]' },
    { id: 'ibd', name: 'hap-ibd + IBDNe', fam: 'ibd', arr: 'y', seq: 'y', ph: 'req',
      okTxt: 'IBD segments (hap-ibd) are turned into recent size history (IBDNe): about 4 to 50 generations ago for array data, over 200 for sequence data [IB]; the sample-size needs of IBDNe were not checked (abstract only)',
      phTxt: 'hap-ibd detects segments in phased data [HI]' }
  ];

  function evalMethod(m, d, nAn, ph){
    var copies = 2 * nAn;
    var status = 'ok', why = [];
    var support = d === 'arr' ? m.arr : m.seq;
    if (support === 'n' || support === 'inf'){
      return { status: 'no', why: [m.arrTxt] };
    }
    if (m.minCopies && copies < m.minCopies){
      return { status: 'no', why: [m.minTxt + '; you have ' + copies + ' copies'] };
    }
    why.push(m.okTxt);
    if (d === 'arr' && m.arrTxt && m.arr === 'y') why.push(m.arrTxt);
    if (m.ph === 'req' && ph === 'no'){
      status = 'fix'; why.unshift('phase the data first (<a href="../04-demography/#s05">lesson 4, s05</a>): ' + m.phTxt);
    } else if (m.ph === 'req'){
      why.push(m.phTxt);
    } else if (m.phTxt && ph === 'no'){
      why.push(m.phTxt);
    }
    if (m.maxN && nAn > m.maxN){
      status = 'fix'; why.unshift(m.maxTxt + ' (you have ' + nAn.toLocaleString('en-US') + ' animals)');
    }
    return { status: status, why: why };
  }

  var LAB = { ok: ['usable', 's01-ok'], fix: ['after fixing', 's01-fix'], no: ['not for this data', 's01-no'] };
  var FAMNAME = { pair: 'pairwise', arg: 'full ARG', ld: 'LD', ibd: 'IBD' };
  var st = { dt: 'seq', ph: 'yes' };

  function render(){
    var body = el('s01-body'); if (!body) return;
    var nRaw = parseInt(el('s01-n').value, 10);
    var n = isFinite(nRaw) && nRaw >= 1 ? nRaw : 1;
    var cnt = { ok: 0, fix: 0, no: 0 }, famOn = {};
    body.innerHTML = '';
    M.forEach(function(m){
      var r = evalMethod(m, st.dt, n, st.ph);
      cnt[r.status]++;
      if (r.status !== 'no') famOn[m.fam] = true;
      var tr = document.createElement('tr');
      tr.setAttribute('data-m', m.id); tr.setAttribute('data-s', r.status);
      var lab = LAB[r.status];
      tr.innerHTML = '<td><b>' + m.name + '</b></td><td>' + FAMNAME[m.fam] + '</td><td class="' + lab[1] + '">' + lab[0] + '</td><td>' + r.why.join('; ') + '</td>';
      body.appendChild(tr);
    });
    el('s01-sum').innerHTML = '<b>' + n.toLocaleString('en-US') + '</b> animals = ' + (2 * n).toLocaleString('en-US') + ' chromosome copies, ' +
      (st.dt === 'arr' ? 'SNP array' : 'whole-genome sequence') + ', ' + (st.ph === 'yes' ? 'phased' : 'unphased') + ': ' +
      cnt.ok + ' usable, ' + cnt.fix + ' after fixing the input, ' + cnt.no + ' not for this data.';
    FAMS.forEach(function(f){
      if (!frames[f.id]) return;
      frames[f.id].setAttribute('stroke', famOn[f.id] ? 'var(--accent)' : 'var(--line)');
      frames[f.id].setAttribute('stroke-width', famOn[f.id] ? 3 : 1.5);
    });
  }
  function seg(id, key){
    var g = el(id); if (!g) return;
    g.addEventListener('click', function(e){
      var b = e.target.closest('button'); if (!b) return;
      Array.prototype.forEach.call(g.querySelectorAll('button'), function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      st[key] = b.getAttribute('data-v'); render();
    });
  }
  if (el('s01-body')){
    seg('s01-dt', 'dt'); seg('s01-ph', 'ph');
    el('s01-n').addEventListener('input', render);
    var s = el('s01-src');
    s.innerHTML = '<b>Sources</b>: ' + Object.keys(SRC).map(function(k){ return SRC[k]; }).join('; ') + '.';
    render();
  }
})();
