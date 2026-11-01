(function(){
  var $ = function(id){ return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function esc(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* ---------- copy buttons inside this section only ---------- */
  try {
    var wrap = $('s13-wrap');
    if (wrap) wrap.querySelectorAll('.code button').forEach(function(b){
      if (b.dataset.s13) return; b.dataset.s13 = '1';
      b.addEventListener('click', function(){
        var pre = b.nextElementSibling; if (!pre) return;
        var t = pre.innerText;
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).catch(function(){});
      });
    });
  } catch(e) {}

  /* ---------- accession decoder ---------- */
  var EX = [
    ['GCA_123456789.1','assembly, format example (ENA accession guide)'],
    ['PRJEB12345','project, format example (ENA guide)'],
    ['SAMEA123456','sample, format example (ENA guide)'],
    ['ERX123456','experiment, format example (ENA guide)'],
    ['ERR123456','run, format example (ENA guide)'],
    ['ERZ123456','analysis receipt, format example (ENA guide)'],
    ['PRJNA289059','project, example in NCBI Datasets docs'],
    ['GCA_003774525.2','assembly, example in NCBI Datasets docs'],
    ['GCF_000001405.40','RefSeq human GRCh38 (NCBI Datasets docs)'],
    ['GCA_019776245.1','assembly, example in NCBI WGS guide'],
    ['ABCDEF000000000','WGS set, format example (NCBI WGS guide)'],
    ['ABCD01123456','WGS contig, format example (ENA guide)'],
    ['AB123456.1','sequence record, format example (ENA guide)'],
    ['NC_000001.11','RefSeq human chromosome 1 (NCBI docs)'],
    ['SAMN00000000','sample (synthetic)'],
    ['SRR000000','run (synthetic)'],
    ['PRJCA000005','NGDC project, example in NGDC guide'],
    ['SAMC000001','NGDC sample, example in NGDC guide'],
    ['CRA000001','GSA dataset, example in NGDC guide'],
    ['CRR000000','GSA run (synthetic)'],
    ['GWHAAAA00000000','GWH assembly, example in GWH paper'],
    ['GWHAAAA00000001','GWH sequence, format from GWH paper'],
    ['HRA000000','GSA-Human dataset (synthetic)'],
    ['SUB0000000','NCBI temporary submission ID (synthetic)']
  ];
  var P = { // prefixes per archive, shown in the diagram
    NCBI:{proj:'PRJNA… / SRP…',samp:'SAMN… / SRS…',exp:'SRX…',run:'SRR…',asm:'GCA_… (RefSeq GCF_…)',seq:'WGS set + contigs, GenBank'},
    ENA:{proj:'PRJEB… / ERP…',samp:'SAMEA… / ERS…',exp:'ERX…',run:'ERR…',asm:'GCA_… (receipt ERZ…)',seq:'WGS set + contigs (C…)'},
    DDBJ:{proj:'PRJDB… / DRP…',samp:'SAMD… / DRS…',exp:'DRX…',run:'DRR…',asm:'GCA_…',seq:'WGS set + contigs (B…)'},
    NGDC:{proj:'PRJCA…',samp:'SAMC…',exp:'CRX… (in CRA…)',run:'CRR…',asm:'GWHxxxx00000000',seq:'GWHxxxx00000001…'}
  };
  var NAMES = {proj:'BioProject',samp:'BioSample',exp:'Experiment',run:'Run (read files)',asm:'Assembly',seq:'Sequences'};
  function partner(c){ return c==='E'?'ENA':c==='D'?'DDBJ':c==='S'?'NCBI':null; }
  var INSDC = 'INSDC: shared by NCBI, ENA and DDBJ';
  var NG = 'NGDC (China), not part of INSDC';

  function decode(raw){
    var a = (raw||'').trim().toUpperCase().replace(/\s+/g,'');
    var m;
    if (!a) return null;
    if ((m = a.match(/^PRJ(NA|EB|DB)\d+$/))) { var ar = {NA:'NCBI',EB:'ENA',DB:'DDBJ'}[m[1]];
      return {acc:a,node:'proj',arch:ar,kind:'BioProject',where:ar+' ('+INSDC+')',what:'The study umbrella. Opens the list of samples, read runs and assemblies of the project. Cite this in the Data availability statement.',up:'—',down:'BioSamples (SAM…), SRA experiments/runs, assemblies (GCA_)'}; }
    if ((m = a.match(/^PRJCA\d+$/))) return {acc:a,node:'proj',arch:'NGDC',kind:'BioProject (NGDC)',where:NG,what:'The study umbrella at NGDC. Linked to GSA datasets (CRA…) and GWH assemblies.',up:'—',down:'BioSamples (SAMC…), GSA (CRA…), GWH assemblies'};
    if ((m = a.match(/^SAM(N|EA|E|D)\d+$/))) { var s = m[1][0]==='N'?'NCBI':m[1][0]==='E'?'ENA':'DDBJ';
      return {acc:a,node:'samp',arch:s,kind:'BioSample',where:s+' ('+INSDC+')',what:'One specimen: species, isolate, sex, tissue, place, date, voucher. Both haplotype assemblies of one animal share it.',up:'BioProject(s)',down:'SRA experiments and runs, assemblies made from this specimen'}; }
    if ((m = a.match(/^SAMC\d+$/))) return {acc:a,node:'samp',arch:'NGDC',kind:'BioSample (NGDC)',where:NG,what:'One specimen with its attributes.',up:'BioProject (PRJCA…)',down:'GSA experiments (CRX…), GWH assemblies'};
    if ((m = a.match(/^([EDS])R([PSXRZ])\d{6,}$/))) { var pa = partner(m[1]);
      var t = {P:['proj','SRA study','Same study as the BioProject, seen from the read archive.','—','experiments, runs'],
               S:['samp','SRA sample','Same specimen as the BioSample, seen from the read archive.','study','experiments, runs'],
               X:['exp','SRA experiment','One library on one instrument model: strategy, source, selection, layout, platform.','sample, study','runs'],
               R:['run','SRA run','The read files. Download reads with this accession (fasterq-dump from NCBI\u2019s SRA Toolkit, or the FTP links in the ENA browser).','experiment','—'],
               Z:['asm','Analysis','An analysis object; at ENA an assembly gets an ERZ number at once as a receipt. Do not cite it; cite the GCA_ that comes later.','study, sample','—']}[m[2]];
      return {acc:a,node:t[0],arch:pa,kind:t[1],where:pa+' ('+INSDC+')',what:t[2],up:t[3],down:t[4]}; }
    if ((m = a.match(/^CR([AXR])\d+$/))) { var g = {A:['exp','GSA dataset','A GSA submission: a set of experiments and runs.','BioProject PRJCA…, BioSamples SAMC…','experiments CRX…, runs CRR…'],
               X:['exp','GSA experiment','One library of one BioSample.','dataset CRA…, sample SAMC…','runs CRR…'],
               R:['run','GSA run','The read files. Released runs download from ftp://download.big.ac.cn/gsa3/CRA…/CRR…/.','experiment CRX…','—']}[m[1]];
      return {acc:a,node:g[0],arch:'NGDC',kind:g[1],where:NG,what:g[2],up:g[3],down:g[4]}; }
    if ((m = a.match(/^HR([AXR])\d+$/))) return {acc:a,node:m[1]==='R'?'run':'exp',arch:'NGDC',kind:'GSA-Human '+(m[1]==='A'?'dataset':m[1]==='X'?'experiment':'run'),where:NG,what:'Human data. Controlled-access files can be downloaded only after a Data Access Committee approves a request.',up:'BioProject, BioSample',down:'—'};
    if ((m = a.match(/^GC([AF])_(\d{9})(\.\d+)?$/))) {
      if (m[1]==='A') return {acc:a,node:'asm',arch:'NCBI',archAny:true,kind:'Assembly (GenBank/ENA/DDBJ)',where:INSDC,what:'A whole submitted genome assembly'+(m[3]?' (version '+m[3].slice(1)+')':' (no version given: means the latest)')+'. Owned by the submitter; may or may not be annotated. Download: datasets download genome accession '+a,up:'BioProject, BioSample',down:'WGS set and its contig/scaffold/chromosome sequences'};
      return {acc:a,node:'asm',arch:'NCBI',kind:'RefSeq assembly',where:'NCBI RefSeq (curated copy of a GCA_)',what:'NCBI’s own copy of a GenBank assembly; always annotated; may differ slightly from the GCA_ it was copied from (same 9 digits).',up:'the GCA_ with the same number',down:'RefSeq sequences (NC_, NW_, …)'};
    }
    if ((m = a.match(/^GWH([GTP])?([A-Z]{4})(\d+)(\.\d+)?$/))) {
      if (m[1]) return {acc:a,node:'seq',arch:'NGDC',kind:'GWH '+({G:'gene',T:'transcript',P:'protein'}[m[1]]),where:NG,what:'An annotation feature of a GWH assembly.',up:'assembly GWH'+m[2]+'00000000',down:'—'};
      if (/^0+$/.test(m[3])) return {acc:a,node:'asm',arch:'NGDC',kind:'GWH assembly',where:NG,what:'A genome assembly in Genome Warehouse. Its sequences count up from '+'GWH'+m[2]+'00000001. Download from download.cncb.ac.cn/gwh/.',up:'PRJCA…, SAMC…',down:'sequences GWH'+m[2]+'0000000x, genes GWHG…'};
      return {acc:a,node:'seq',arch:'NGDC',kind:'GWH sequence',where:NG,what:'One contig, scaffold or chromosome of assembly GWH'+m[2]+'00000000.',up:'assembly GWH'+m[2]+'00000000',down:'—'};
    }
    if ((m = a.match(/^([A-Z]{4})(\d{2})(S?)(\d{6,9})(\.\d+)?$/)) || (m = a.match(/^([A-Z]{6})(\d{2})(S?)(\d{7,9})(\.\d+)?$/))) {
      var f = m[1][0], wa = f==='B'?'DDBJ':f==='C'?'ENA':'NCBI';
      var whereW = (f==='B'?'DDBJ prefix (B…)':f==='C'?'ENA prefix (C…)':'probably NCBI (check NCBI’s prefix table)')+'; '+INSDC;
      var master = /^0+$/.test(m[4]);
      return {acc:a,node:'seq',arch:wa,kind:master?'WGS set (master record)':(m[3]?'WGS scaffold':'WGS contig'),where:whereW,what:master?'Stands for all sequences of one WGS assembly: prefix '+m[1]+', assembly version '+m[2]+'. Running number all zeros = the whole set.':'One sequence of WGS set '+m[1]+', assembly version '+m[2]+', number '+m[4]+'.',up:'assembly GCA_…',down:master?'all contigs/scaffolds '+m[1]+m[2]+'…':'—'};
    }
    if ((m = a.match(/^([A-Z]{2})_\d+(\.\d+)?$/))) return {acc:a,node:'seq',arch:'NCBI',kind:'RefSeq sequence ('+m[1]+'_)',where:'NCBI RefSeq',what:'A curated RefSeq record: NC_ complete molecule/chromosome, NW_ scaffold, NZ_ from a WGS project, NM_/XM_ mRNA, NP_/XP_ protein.',up:'RefSeq assembly GCF_…',down:'—'};
    if (/^([A-Z]\d{5}|[A-Z]{2}\d{6}|[A-Z]{2}\d{8})(\.\d+)?$/.test(a)) return {acc:a,node:'seq',arch:'NCBI',archAny:true,kind:'Nucleotide sequence record',where:INSDC+' (the 1–2 letter prefix tells which partner issued it)',what:'An ordinary GenBank/ENA/DDBJ entry: a gene, a mitogenome, or a finished chromosome of an assembly.',up:'assembly GCA_… (if part of one), BioSample',down:'—'};
    if (/^SUB\d+$/.test(a)) return {acc:a,node:null,arch:'NCBI',kind:'Temporary submission ID',where:'NCBI Submission Portal',what:'Your submission’s working number. Quote it to the help desk; never cite it in a paper.',up:'—',down:'—'};
    if (/^SUB(PRJCA|CRA)\d+$/.test(a)) return {acc:a,node:null,arch:'NGDC',kind:'NGDC temporary submission ID',where:'BIG Sub (NGDC)',what:'Working number before archiving. Do not cite it.',up:'—',down:'—'};
    return {acc:a,bad:true};
  }

  function urlFor(d){
    var a = d.acc, L = [];
    if (d.bad || !d.node && !/^SUB/.test(a)) return L;
    if (d.arch==='NGDC') {
      if (/^SAMC/.test(a)) L.push(['NGDC BioSample','https://ngdc.cncb.ac.cn/biosample/browse/'+a]);
      else if (/^CRA/.test(a)) L.push(['GSA','https://ngdc.cncb.ac.cn/gsa/browse/'+a]);
      else if (/^GWH/.test(a)) L.push(['Genome Warehouse (search there)','https://ngdc.cncb.ac.cn/gwh/']);
      else if (/^HR/.test(a)) L.push(['GSA-Human','https://ngdc.cncb.ac.cn/gsa-human/']);
      else if (/^CR|^PRJCA/.test(a)) L.push(['NGDC (search there)','https://ngdc.cncb.ac.cn/']);
      return L;
    }
    if (/^SUB/.test(a)) return L;
    if (/^GC[AF]_/.test(a)) L.push(['NCBI Datasets','https://www.ncbi.nlm.nih.gov/datasets/genome/'+a+'/']);
    else if (/^PRJ/.test(a)) L.push(['NCBI BioProject','https://www.ncbi.nlm.nih.gov/bioproject/'+a]);
    else if (/^SAM/.test(a)) L.push(['NCBI BioSample','https://www.ncbi.nlm.nih.gov/biosample/'+a]);
    else if (/^[EDS]R[PSXR]/.test(a)) L.push(['NCBI SRA','https://www.ncbi.nlm.nih.gov/sra/'+a]);
    else if (d.node==='seq') L.push(['NCBI Nucleotide','https://www.ncbi.nlm.nih.gov/nuccore/'+a]);
    if (!/^[A-Z]{2}_/.test(a) && !/^GCF_/.test(a)) L.push(['ENA browser','https://www.ebi.ac.uk/ena/browser/view/'+a]);
    return L;
  }

  var NODES = {proj:[360,34],samp:[360,98],exp:[190,164],run:[190,228],asm:[530,164],seq:[530,228]};
  var EDGES = [['proj','samp'],['samp','exp'],['exp','run'],['samp','asm'],['asm','seq']];
  function drawDiagram(d){
    var box = $('s13-dec-fig'); if (!box) return;
    var arch = (d && !d.bad && d.arch) ? d.arch : 'NCBI';
    var hi = d && !d.bad ? d.node : null;
    var svg = document.createElementNS(NS,'svg');
    svg.setAttribute('viewBox','0 0 720 262'); svg.setAttribute('width','100%');
    svg.setAttribute('role','img'); svg.setAttribute('aria-label','Linked records: BioProject, BioSample, experiment, run, assembly, sequences');
    svg.style.minWidth = '600px';
    var h = '';
    h += '<defs><marker id="s13-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" style="fill:var(--muted)"/></marker></defs>';
    EDGES.forEach(function(e){
      var A = NODES[e[0]], B = NODES[e[1]];
      h += '<line x1="'+A[0]+'" y1="'+(A[1]+19)+'" x2="'+B[0]+'" y2="'+(B[1]-21)+'" style="stroke:var(--muted);stroke-width:1.3" marker-end="url(#s13-ar)"/>';
    });
    var R = NODES.run, S = NODES.asm;
    h += '<path d="M'+(R[0]+92)+','+R[1]+' C 360,'+R[1]+' 360,'+S[1]+' '+(S[0]-92)+','+S[1]+'" style="fill:none;stroke:var(--het);stroke-width:1.3;stroke-dasharray:4 3" marker-end="url(#s13-ar)"/>';
    h += '<text x="360" y="'+(R[1]+20)+'" text-anchor="middle">reads used to build</text>';
    Object.keys(NODES).forEach(function(k){
      var c = NODES[k], on = (k===hi);
      h += '<rect x="'+(c[0]-90)+'" y="'+(c[1]-20)+'" width="180" height="40" rx="4" style="fill:'+(on?'var(--accent)':'var(--panel)')+';stroke:'+(on?'var(--accent)':'var(--line)')+';stroke-width:1.5"/>';
      h += '<text x="'+c[0]+'" y="'+(c[1]-4)+'" text-anchor="middle" class="lab" style="font-weight:600'+(on?';fill:var(--bg)':'')+'">'+esc(NAMES[k])+'</text>';
      h += '<text x="'+c[0]+'" y="'+(c[1]+12)+'" text-anchor="middle" style="font-size:10.5px'+(on?';fill:var(--bg)':'')+'">'+esc(P[arch][k])+'</text>';
    });
    h += '<text x="8" y="16" class="lab">'+esc(arch==='NGDC'?'NGDC (China)':arch+' (INSDC)')+'</text>';
    if (d && !d.bad && !d.node) h += '<text x="8" y="252">(temporary ID: not part of the public chain)</text>';
    svg.innerHTML = h;
    box.innerHTML = ''; box.appendChild(svg);
  }

  function render(){
    var inp = $('s13-acc'), out = $('s13-dec-out'), lk = $('s13-dec-links');
    if (!inp || !out) return;
    var d = decode(inp.value);
    if (!d) { out.innerHTML = '<div><span>Type an accession</span></div>'; drawDiagram(null); if (lk) lk.textContent=''; return; }
    if (d.bad) {
      out.innerHTML = '<div><span>Result</span><b class="s13-txt s13-bad">Not a format this decoder knows</b><span>Check for typing errors (O vs 0, missing underscore in GCA_). Other databases (UniProt, Ensembl IDs, museum numbers) are not covered.</span></div>';
      drawDiagram(null); if (lk) lk.textContent=''; return;
    }
    var ex = ''; EX.forEach(function(e){ if (e[0]===d.acc) ex = e[1]; });
    out.innerHTML =
      '<div><span>Record type</span><b class="s13-txt">'+esc(d.kind)+'</b>'+(ex?'<span style="font-size:12px;color:var(--muted)">'+esc(ex)+'</span>':'')+'</div>'+
      '<div><span>Archive</span><b class="s13-txt">'+esc(d.where)+'</b></div>'+
      '<div><span>What it holds</span><b class="s13-txt" style="font-weight:400">'+esc(d.what)+'</b></div>'+
      '<div><span>Linked up to → down to</span><b class="s13-txt" style="font-weight:400">'+esc(d.up)+' → '+esc(d.down)+'</b></div>';
    drawDiagram(d);
    if (lk) {
      var L = urlFor(d);
      lk.innerHTML = L.length ? 'Open: ' + L.map(function(x){ return '<a href="'+esc(x[1])+'" target="_blank" rel="noopener">'+esc(x[0])+'</a> <code>'+esc(x[1])+'</code>'; }).join(' · ') + '<br>Links are built from the accession; a format example may not exist as a real record.' : '';
    }
  }

  try {
    var sel = $('s13-ex'), inp = $('s13-acc');
    if (sel && inp) {
      var o0 = document.createElement('option'); o0.value=''; o0.textContent='pick…'; sel.appendChild(o0);
      EX.forEach(function(e){ var o = document.createElement('option'); o.value = e[0]; o.textContent = e[0]+' — '+e[1]; sel.appendChild(o); });
      sel.addEventListener('change', function(){ if (sel.value) { inp.value = sel.value; render(); } });
      inp.addEventListener('input', render);
      render();
    }
  } catch(e) { if (window.console) console.warn('s13 decoder', e); }

  /* ---------- submission planner ---------- */
  function ck(id){ var e = $(id); return !!(e && e.checked); }
  function radio(name){ var r = document.querySelector('input[name="'+name+'"]:checked'); return r ? r.value : ''; }
  function plan(){
    var out = $('s13-plan-out'); if (!out) return;
    var lev = radio('s13-lev') || 'none', hap = radio('s13-hap') || 'one';
    var mt = ck('s13-x-mt'), ann = ck('s13-x-ann'), hold = ck('s13-x-hold');
    var reads = [];
    if (ck('s13-r-ill')) reads.push(['Illumina/DNBSEQ WGS','2 FASTQ.gz per library (R1, R2), library_layout paired, strategy WGS, source GENOMIC, selection RANDOM']);
    if (ck('s13-r-hifi')) reads.push(['PacBio HiFi','HiFi reads BAM (or FASTQ.gz), platform PACBIO_SMRT, model e.g. Revio / Sequel IIe, layout single']);
    if (ck('s13-r-ont')) reads.push(['Oxford Nanopore','FASTQ.gz (or basecalled BAM), platform OXFORD_NANOPORE, model MinION / GridION / PromethION']);
    if (ck('s13-r-odd')) reads.push(['Instrument not in the list','ask the help desk for the value to use; real instrument, kit, flow cell and basecaller version in the design description; never another company’s model']);
    if (ck('s13-r-hic')) reads.push(['Hi-C','2 FASTQ.gz, strategy Hi-C, layout paired, selection from the list (e.g. Restriction Digest), enzyme/kit in the description']);
    if (ck('s13-r-rna')) reads.push(['RNA-seq','FASTQ.gz, strategy RNA-Seq, source TRANSCRIPTOMIC; tissue in its own BioSample if it came from another tissue or animal']);
    var nAsm = lev==='none' ? 0 : (hap==='one' ? 1 : 2);
    var steps = [];
    var projTxt = nAsm===2 ? 'Umbrella BioProject + one BioProject per haplotype ('+(hap==='pa'?'principal, alternate':'haplotype 1, haplotype 2')+'). The Genome portal can create them; staff create the umbrella if you have none.' : 'One BioProject describing the study.';
    steps.push(['BioProject', projTxt + (ann ? ' Tick "autogenerate locus tag prefix" (needed for annotation).' : ''), 'title, description, relevance, data type']);
    steps.push(['BioSample', 'One per sequenced animal (package Model organism or animal, or Invertebrate). '+(nAsm===2?'Both haplotypes use this same BioSample; isolate name required. ':'')+(ck('s13-r-rna')?'Add one for RNA-seq tissue if it is a different specimen. ':''), 'organism, isolate, sex, tissue, geo_loc_name, collection_date, (dev_stage/age), specimen_voucher']);
    if (reads.length) steps.push(['SRA: '+reads.length+' read type'+(reads.length>1?'s':''), reads.map(function(r){ return '<b>'+esc(r[0])+'</b>: '+esc(r[1]); }).join('<br>') + '<br>Upload by preload folder (FTP or Aspera) if large; every FASTQ under 100 GB.', 'SRA metadata spreadsheet, read files']);
    else steps.push(['SRA', '<span class="s13-bad">No reads ticked. Most journals want the raw reads too; an assembly without reads cannot be checked.</span>', '']);
    if (lev !== 'none') {
      var files = [];
      var asmTxt;
      if (lev==='contig') { asmTxt = 'Contig-level WGS assembly. No gaps inside sequences.'; files.push('contigs.fsa (FASTA, sequences ≥ 200 nt, no terminal Ns)'); }
      else if (lev==='scaffold') { asmTxt = 'Scaffold-level WGS assembly. Gaps as runs of N (state minimum gap size, N-count for unknown gaps, linkage evidence) or an AGP file.'; files.push('scaffolds.fsa','or contigs + scaffolds.agp'); }
      else { asmTxt = 'Chromosome-level WGS assembly. Chromosome assignment in the portal form or in FASTA headers ([location=chromosome] [chromosome=1]); unplaced scaffolds allowed. Linkage evidence for Hi-C joins: proximity-ligation.'; files.push('chromosomes + unplaced (FASTA or AGP)','chromosome assignment'); }
      if (nAsm===2) asmTxt += ' Submit both as "Pseudohaplotypes of a diploid/polyploid assembly": '+(hap==='pa'?'Principal + Alternate':'Haplotype 1 + Haplotype 2')+', names that tell them apart (e.g. xName1.pri / xName1.alt or .hap1 / .hap2).';
      if (mt) asmTxt += ' Mitogenome goes in'+(nAsm===2?(hap==='pa'?' the principal assembly':' one of the two assemblies (NCBI names only principal or maternal; ask the help desk for a hap1/hap2 pair)'):' the same assembly')+' with [location=mitochondrion] [topology=circular] [completeness=complete].';
      asmTxt += ' Run FCS-adaptor and FCS-GX on the final assembly first (section 9) and remove what they flag.';
      if (ann) { asmTxt += ' With annotation: build .sqn with table2asn (-M n -Z), fix every ERROR in .val and FATAL in .dr.'; files.unshift('.sqn from table2asn (template.sbt + .fsa + .tbl/.gff)'); }
      else files.unshift('FASTA files (no annotation)');
      steps.push(['Genome'+(nAsm===2?' ×2 (one submission)':''), asmTxt, files.join(' · ') + ' · metadata: assembly program + version, coverage, sequencing technologies, full/partial']);
    } else if (mt) {
      steps.push(['Mitogenome (GenBank, not the Genome portal)', 'Without a nuclear assembly the mitogenome goes through SP-GenBank as an organelle genome.', 'mito.fsa + 5-column feature table (.tbl), or a .sqn from table2asn']);
    }
    if (lev==='none' && !mt) steps.push(['Genome', 'Later, when the assembly is ready; reuse the same BioProject and BioSample.', '']);
    steps.push([hold?'Hold, then release':'Release', hold ? 'Set one release date (or "on publication"); release dates of project and samples follow. If a genome is held, tell NCBI at least two weeks before the paper is published.' : 'Released immediately after processing.', 'cite PRJ… + GCA_… (+ SRR… if asked)']);
    out.innerHTML = steps.map(function(s){
      return '<li><div><b>'+esc(s[0])+'</b><div class="d">'+s[1]+'</div>'+(s[2]?'<div class="s13-files">'+esc(s[2])+'</div>':'')+'</div></li>';
    }).join('');
  }
  try {
    var pin = $('s13-plan-in');
    if (pin) { pin.addEventListener('change', plan); plan(); }
  } catch(e) { if (window.console) console.warn('s13 planner', e); }
})();
