(function(){
  var $ = function(id){ return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function nf(x, d){
    if (!isFinite(x)) return '–';
    var a = Math.abs(x);
    if (d === undefined) d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 1 : 2;
    return x.toLocaleString('en-US', {maximumFractionDigits:d, minimumFractionDigits:0});
  }
  function gb(x){ // GB -> readable
    if (!isFinite(x)) return '–';
    if (x >= 1000) return nf(x/1000, 1) + ' TB';
    if (x >= 10) return nf(x, 0) + ' GB';
    return nf(x, 1) + ' GB';
  }
  function hrs(h){
    if (!isFinite(h)) return '–';
    if (h < 1) return nf(h*60, 0) + ' min';
    if (h < 48) return nf(h, 1) + ' h';
    return nf(h/24, 1) + ' days';
  }
  function range(lo, hi, f){ return (Math.abs(hi-lo) < 1e-9*Math.max(1,hi)) ? '≈ ' + f(lo) : f(lo) + ' – ' + f(hi); }

  /* ================= 1. k-mer count toy ================= */
  (function(){
    var fig = $('s02-km-fig'); if (!fig) return;
    var ids = {g:'s02-km-g', c:'s02-km-c', e:'s02-km-e', h:'s02-km-h2', k:'s02-km-k'};
    var outs = {g:'s02-km-go', c:'s02-km-co', e:'s02-km-eo', h:'s02-km-ho', k:'s02-km-ko'};
    var presets = { sr:{e:0.3, c:30}, ont:{e:3.2, c:25}, hifi:{e:0.1, c:30} };
    var pre = $('s02-km-preset');
    function val(n){ return parseFloat($(ids[n]).value); }
    function draw(){
      var G = val('g'), C = val('c'), e = val('e')/100, h = val('h')/100, k = val('k');
      Object.keys(outs).forEach(function(n){ $(outs[n]).textContent = $(ids[n]).value; });
      var B = G*C;                         // read bases, billions
      var gen = G;                         // ~1 distinct k-mer per base
      var het = Math.min(G, G*h*k);        // up to k new k-mers per het site
      var err = Math.min(B, B*e*k);        // up to k new k-mers per error
      var tot = gen + het + err;
      var bars = [
        {lab:'genome', v:gen, c:'var(--accent)'},
        {lab:'heterozygous', v:het, c:'var(--het)'},
        {lab:'error', v:err, c:'var(--bad)'},
        {lab:'total', v:tot, c:'var(--fg)'}
      ];
      var W = 640, H = 40 + bars.length*34, x0 = 110, x1 = W - 90;
      var mx = Math.max(tot, 1e-9);
      var s = '<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="min-width:360px" role="img" aria-label="Bar chart of distinct k-mer counts">';
      s += '<text x="'+x0+'" y="16">different k-mers, billions (one scale)</text>';
      bars.forEach(function(b, i){
        var y = 28 + i*34, w = Math.max(1, (x1-x0) * b.v / mx);
        s += '<text class="lab" x="'+(x0-8)+'" y="'+(y+15)+'" text-anchor="end">'+b.lab+'</text>';
        s += '<rect x="'+x0+'" y="'+y+'" width="'+w.toFixed(1)+'" height="20" rx="2" style="fill:'+b.c+';opacity:'+(b.lab==='total'?0.35:0.8)+'"></rect>';
        s += '<text x="'+(x0+w+6).toFixed(1)+'" y="'+(y+15)+'">'+nf(b.v, b.v<10?2:1)+'</text>';
      });
      s += '</svg>';
      fig.innerHTML = s;
      var bytes = k <= 32 ? 8 : 16;
      $('s02-km-out').innerHTML =
        '<div>read bases<b>'+nf(B,1)+' billion</b></div>'+
        '<div>different k-mers ÷ genome k-mers<b>'+nf(tot/gen,1)+' ×</b></div>'+
        '<div>share that are errors<b>'+nf(100*err/tot,0)+' %</b></div>'+
        '<div title="2 bits per base: a k-mer of up to 32 bases fits in one 8-byte computer word, up to 64 bases in two. Real tools also store counts, links or overlaps, so they need more.">just storing them, '+bytes+' bytes each<b>'+gb(tot*bytes)+'</b></div>';
    }
    Object.keys(ids).forEach(function(n){ $(ids[n]).addEventListener('input', function(){
      if (n === 'e' || n === 'c') pre.querySelectorAll('button').forEach(function(b){ b.setAttribute('aria-pressed','false'); });
      draw(); }); });
    pre.querySelectorAll('button').forEach(function(b){
      b.addEventListener('click', function(){
        var p = presets[b.getAttribute('data-p')];
        $(ids.e).value = p.e; $(ids.c).value = p.c;
        pre.querySelectorAll('button').forEach(function(o){ o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        draw();
      });
    });
    draw();
  })();

  /* ================= 2. Amdahl toy ================= */
  (function(){
    var fig = $('s02-am-fig'); if (!fig) return;
    var T1 = 100, NMAX = 128;
    function wall(p, n){ return T1 * ((1-p) + p/n); }
    function draw(){
      var p = parseFloat($('s02-am-p').value)/100, n = parseInt($('s02-am-t').value, 10);
      $('s02-am-po').textContent = $('s02-am-p').value; $('s02-am-to').textContent = n;
      var W = 640, H = 250, L = 52, R = 20, T = 18, Bm = 40;
      var xs = function(t){ return L + (W-L-R) * Math.log(t)/Math.log(NMAX); };
      var ys = function(h){ return T + (H-T-Bm) * (1 - h/T1); };
      var s = '<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="min-width:360px" role="img" aria-label="Wall time against number of threads">';
      [0,25,50,75,100].forEach(function(h){ s += '<line class="grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+ys(h)+'" y2="'+ys(h)+'"></line><text x="'+(L-6)+'" y="'+(ys(h)+4)+'" text-anchor="end">'+h+'</text>'; });
      [1,2,4,8,16,32,64,128].forEach(function(t){ s += '<line class="grid" x1="'+xs(t)+'" x2="'+xs(t)+'" y1="'+T+'" y2="'+(H-Bm)+'"></line><text x="'+xs(t)+'" y="'+(H-Bm+16)+'" text-anchor="middle">'+t+'</text>'; });
      s += '<text x="'+((L+W-R)/2)+'" y="'+(H-6)+'" text-anchor="middle">threads (doubling steps)</text>';
      s += '<text x="12" y="'+(T+((H-T-Bm)/2))+'" transform="rotate(-90 12 '+(T+((H-T-Bm)/2))+')" text-anchor="middle">wall time, h</text>';
      var perfect = '', real = '';
      for (var t = 1; t <= NMAX; t *= 1.05){ perfect += (perfect?'L':'M') + xs(t).toFixed(1)+','+ys(T1/t).toFixed(1); real += (real?'L':'M') + xs(t).toFixed(1)+','+ys(wall(p,t)).toFixed(1); }
      perfect += 'L'+xs(NMAX).toFixed(1)+','+ys(T1/NMAX).toFixed(1); real += 'L'+xs(NMAX).toFixed(1)+','+ys(wall(p,NMAX)).toFixed(1);
      s += '<path d="'+perfect+'" style="fill:none;stroke:var(--muted);stroke-width:1.5;stroke-dasharray:5 4"></path>';
      s += '<path d="'+real+'" style="fill:none;stroke:var(--accent);stroke-width:2.2"></path>';
      var floorH = T1*(1-p);
      s += '<line x1="'+L+'" x2="'+(W-R)+'" y1="'+ys(floorH)+'" y2="'+ys(floorH)+'" style="stroke:var(--bad);stroke-width:1;stroke-dasharray:2 3"></line>';
      s += '<text x="'+(W-R-4)+'" y="'+(ys(floorH)-5)+'" text-anchor="end" style="fill:var(--bad)">one-thread part: '+nf(floorH,1)+' h</text>';
      var w = wall(p,n);
      s += '<circle cx="'+xs(n)+'" cy="'+ys(w)+'" r="5" style="fill:var(--accent)"></circle>';
      var lx = xs(n) > W*0.6 ? xs(n)-8 : xs(n)+8, an = xs(n) > W*0.6 ? 'end' : 'start';
      s += '<text class="lab" x="'+lx+'" y="'+(Math.max(ys(w)-10, T+10))+'" text-anchor="'+an+'">'+nf(w,1)+' h at '+n+' threads</text>';
      s += '<g transform="translate('+(W-R-210)+','+(T+6)+')"><line x1="0" x2="22" y1="0" y2="0" style="stroke:var(--accent);stroke-width:2.2"></line><text x="28" y="4">this job</text>'+
           '<line x1="90" x2="112" y1="0" y2="0" style="stroke:var(--muted);stroke-width:1.5;stroke-dasharray:5 4"></line><text x="118" y="4">perfect scaling</text></g>';
      s += '</svg>';
      fig.innerHTML = s;
      var S = T1/w;
      $('s02-am-out').innerHTML =
        '<div>wall time<b>'+nf(w,1)+' h</b></div>'+
        '<div>speed-up over 1 thread<b>'+nf(S,1)+' ×</b></div>'+
        '<div title="Speed-up divided by threads: the share of the threads that is busy on average">threads busy on average<b>'+nf(S,1)+' of '+n+' ('+nf(100*S/n,0)+' %)</b></div>'+
        '<div>best possible, any number of threads<b>'+(p >= 1 ? 'no limit' : nf(1/(1-p),0)+' ×')+'</b></div>';
    }
    $('s02-am-p').addEventListener('input', draw); $('s02-am-t').addEventListener('input', draw);
    draw();
  })();

  /* ================= 3. Estimator ================= */
  (function(){
    var sel = $('s02-es-a'); if (!sel) return;
    var DT = { sr:'Illumina / MGI short reads', ontraw:'Nanopore / CycloneSEQ ~Q15', ontq20:'Nanopore R10 Q20+', hifi:'PacBio HiFi' };
    // gzipped FASTQ bytes per base, measured on our own files
    var GZ = { sr:[0.53, 'our NovaSeq files of one short-read project'], ontraw:[0.87, 'our long-read files of two projects'] };
    GZ.ontq20 = GZ.ontraw; GZ.hifi = [0.87, 'assumed like our long-read files (not measured for HiFi)'];
    var NS_ = '<span class="tag">not stated</span> ';
    var DOC = '<span class="tag s">docs</span> ', OUR = '<span class="tag l">our run</span> ', CALC = '<span class="tag">arithmetic</span> ';

    // each tool: data types; ram(G,C,B,d,R) -> {lo,hi,src}; cpu(...) -> {lo,hi (CPU-hours), src} or {wall:[lo,hi], src} or {txt,src}; disk -> {lo,hi,src} or {txt}
    var TOOLS = {
      hifiasm: { name:'hifiasm', data:['hifi','ontq20','ontraw'],
        ram:function(G,C,B){ return {lo:Math.max(16,1.15*B), hi:Math.max(16,1.7*B), src: DOC+'hifiasm README results table (v0.12, HiFi): 1.15–1.7 GB per Gb of reads (mouse 2.6 Gb×25: 76 GB; human 3.1 Gb×32–36: 114–137 GB; frog 9.5 Gb×29: 463 GB). At least the 16 GiB Bloom filter (<code>-f37</code>).'}; },
        cpu:function(G,C,B){ return {lo:2.6*B, hi:4.2*B, src: DOC+'same table: 2.6–4.2 CPU-hours per Gb of reads (mouse 172.9 h, human 269–311 h, maize 203 h; the frog needed 10.3 per Gb).'}; },
        disk:function(){ return {txt:'not stated', src: NS_+'hifiasm keeps corrected reads and overlaps in <code>*.bin</code> files for reuse; size not given.'}; },
        warn:function(d){ return d==='hifi' ? '' : 'hifiasm\'s published benchmarks are HiFi runs; the same scaling for <code>--ont</code> is an assumption. <code>--ont</code> is meant for ONT R10 simplex reads'+(d==='ontraw'?'; with ~Q15 reads expect worse results and possibly different needs.':'.'); } },
      flye: { name:'Flye', data:['ontraw','ontq20','hifi'],
        ram:function(G,C,B,d){
          if (d==='hifi') return {lo:1.57*B, hi:1.57*B, src: DOC+'Flye benchmarks: human CHM13 HiFi 30×, 141 GB → 1.6 GB per Gb of reads; FAQ: memory grows linearly with genome size and coverage.'};
          if (d==='ontq20') return {lo:2.45*B, hi:2.45*B, src: DOC+'Flye benchmarks: "Cliveome" ONT Q20 35× (3.0 Gb), 257 GB → 2.45 GB per Gb of reads.'};
          return {lo:3.75*B, hi:4.0*B, src: DOC+'Flye FAQ: mammal at 40× ONT ~450 GB; benchmarks: human NA12878 ONT 35×, 394 GB → 3.75–4.0 GB per Gb of reads. <code>--asm-coverage 40</code> lowers the first stage.'}; },
        cpu:function(G,C,B,d){
          if (d==='hifi') return {lo:8.7*B, hi:8.7*B, src: DOC+'Flye benchmarks: CHM13 HiFi 30×, 780 CPU-hours → 8.7 per Gb of reads.'};
          if (d==='ontq20') return {lo:19*B, hi:19*B, src: DOC+'Flye benchmarks: Cliveome ONT Q20 35×, 2000 CPU-hours → 19 per Gb of reads.'};
          return {lo:18*B, hi:31.6*B, src: DOC+'Flye FAQ: mammal 40× ONT in 3–4 days on 30 threads (18–24 per Gb); benchmarks: NA12878, 3100 CPU-hours (31.6 per Gb). '+OUR+'species B (CycloneSEQ, mammal genome): about 7 thread-hours per Gb, much less; at that rate this run would take about '+hrs(7*B/TH)+'.'}; },
        disk:function(){ return {txt:'not stated', src: NS_+'Flye\'s docs give no disk figure.'}; } },
      shasta: { name:'Shasta', data:['ontraw','ontq20'],
        ram:function(G,C,B){ return {lo:4*B, hi:6*B, src: DOC+'Shasta docs: "around 4 to 6 bytes per input base" for best speed; with less RAM, <code>--memoryMode filesystem --memoryBacking disk</code> is slower but gives the same assembly.'}; },
        cpu:function(G,C,B){ var f = B/180; return {lo:4*64*f, hi:4*128*f, src: DOC+'Shasta docs: human 60× in about 4 h on 64 cores / 128 virtual CPUs (256–512 thread-hours for ~180 Gb), scaled linearly.'}; },
        disk:function(G,C,B,d){ return {txt:'≈ input + output', src: DOC+'Shasta works in memory, with disk use only for reading input and writing output.'}; } },
      nextdenovo: { name:'NextDenovo', data:['ontraw','ontq20'],
        ram:function(G,C,B){ var c = 0.3*B; return {lo:Math.max(32,c), hi:Math.max(64,c), src: DOC+'NextDenovo FAQ: each alignment job 32–64 GB, each correction job ~(input bases × 1.2 ÷ 4) bytes = '+gb(c)+' here; shown for one job of each at a time.'}; },
        cpu:function(){ return {txt:'not stated', src: NS_+'NextDenovo docs name minimap2 and disk input/output as the bottlenecks, without times.'}; },
        disk:function(){ return {txt:'not stated', src: NS_+'set <code>usetempdir</code> to a local SSD to cut disk waiting.'}; } },
      canu: { name:'Canu', data:['ontraw','ontq20','hifi'],
        ram:function(G,C,B,d){ return {lo:64, hi:64, show:'at least 64 GB', src: DOC+'Canu FAQ: at least one node with 64 GB, 16 GB per cluster node (a lower limit, not an estimate).'}; },
        cpu:function(G,C,B,d){ var f = G/3.1; if (d==='hifi') return {lo:1000*f, hi:2000*f, src: DOC+'Canu FAQ: mammal with HiFi 1,000–2,000 CPU-hours; scaled by genome size from a 3.1 Gb mammal.'};
          return {lo:10000*f, hi:25000*f, src: DOC+'Canu FAQ: mammal from raw reads 10,000–25,000 CPU-hours "depending on coverage"; scaled by genome size from a 3.1 Gb mammal.'}; },
        disk:function(G,C,B,d){ var f = G/3.1; if (d==='hifi') return {lo:200*f, hi:200*f, src: DOC+'Canu FAQ: plan 200 GB for a mammal with HiFi; scaled by genome size.'};
          return {lo:1000*f, hi:3000*f, src: DOC+'Canu FAQ: human 40–50× needs 1–2 TB at the peak, plan 3 TB; scaled by genome size.'}; } },
      verkko: { name:'Verkko', data:['hifi','ontq20'],
        ram:function(){ return {lo:128, hi:128, show:'≥ 128 GB (request of one stage)', src: DOC+'Verkko script defaults: the largest fixed per-stage request is 128 GB (combining overlaps); some stages have no fixed value. Not a measured peak.'}; },
        cpu:function(){ return {txt:'not stated', src: NS_+'per-stage time limits only (<code>--&lt;stage&gt;-run</code>).'}; },
        disk:function(){ return {txt:'not stated', src: NS_+'—'}; },
        warn:function(d){ return 'Verkko needs high-accuracy reads (HiFi or ONT duplex) through <code>--hifi</code>; ultra-long ONT through <code>--nano</code> is strongly recommended.'+(d==='ontq20'?' Simplex Q20 reads are not duplex.':''); } },
      spades: { name:'SPAdes', data:['sr'],
        ram:function(){ return {lo:256, hi:470, src: NS_+'SPAdes docs give no figure for large genomes (<code>-m</code> is a hard limit, default 250 GB). '+OUR+'species D ran out of memory under 256 GB in error correction; for <i>Darevskia</i> on Monsoon we requested 470 GB.'}; },
        cpu:function(){ return {txt:'not stated', src: NS_+'—'}; },
        disk:function(){ return {txt:'not stated', src: NS_+'checkpoints "may take … a significant amount of disk space".'}; },
        warn:function(){ return 'SPAdes is built mainly for small genomes. For a large eukaryote its docs recommend <code>--isolate</code> at 50× or more and advise against <code>--careful</code>.'; } },
      abyss: { name:'ABySS 2', data:['sr'],
        ram:function(G){ return {lo:16*G, hi:25*G, src: DOC+'ABySS README: Bloom filter budget <code>B=50G</code> for human (3.1 Gb), <code>B=500G</code> for 20 Gb spruce, <code>B=2G</code> for 0.1 Gb <i>C. elegans</i> → 16–25 GB per Gb of genome. Later stages need extra memory (not stated). '+OUR+'requested 120 GB on Monsoon for <i>Darevskia</i>.'}; },
        cpu:function(){ return {txt:'not stated', src: NS_+OUR+'mouse reads at 32×: 5.4 h on Monsoon (threads not recorded).'}; },
        disk:function(){ return {txt:'not stated', src: NS_+'—'}; } },
      megahit: { name:'MEGAHIT', data:['sr'],
        ram:function(G,C,B,d,R){ return {lo:0.9*R, hi:0.9*R, show:'takes '+gb(0.9*R)+' (90 % of RAM) unless -m is set', src: DOC+'MEGAHIT takes 90 % of the machine\'s RAM by default (<code>-m 0.9</code>) and halts if reads/k-mers do not fit; no per-genome figure. '+OUR+'requested 240 GB on Monsoon for <i>Darevskia</i>.'}; },
        cpu:function(){ return {txt:'not stated', src: NS_+OUR+'mouse reads at 32×: 8 h on Monsoon (threads not recorded).'}; },
        disk:function(){ return {txt:'not stated', src: NS_+'—'}; } },
      masurca: { name:'MaSuRCA', data:['sr'],
        cls:function(G){ return G<=0.01?[16,8,0.01,'<1 hour','bacteria (≤10 Mb)']:G<=0.5?[128,16,1,'1–2 days','insect (≤500 Mb)']:G<=1?[256,32,2,'4–5 days','avian / small plant (≤1 Gb)']:G<=3?[512,32,5,'15–20 days','mammal (≤3 Gb)']:[2000,64,10,'60–90 days','large plant (≤30 Gb)']; },
        ram:function(G){ var c = TOOLS.masurca.cls(G); return {lo:c[0], hi:c[0], src: DOC+'MaSuRCA README hardware guide, class "'+c[4]+'": '+gb(c[0])+' RAM, '+c[1]+'+ cores.'}; },
        cpu:function(G){ var c = TOOLS.masurca.cls(G); return {txt:c[3]+' (at '+c[1]+'+ cores)', src: DOC+'MaSuRCA README, Illumina-only run time for the minimum configuration; long reads add 50–100 %.'}; },
        disk:function(G){ var c = TOOLS.masurca.cls(G); return {lo:c[2]*1000, hi:c[2]*1000, src: DOC+'MaSuRCA README hardware guide.'}; } }
    };
    var TH = 16;
    var ORDER = ['hifiasm','flye','shasta','nextdenovo','canu','verkko','spades','abyss','megahit','masurca'];

    function fillTools(){
      var d = $('s02-es-d').value, cur = sel.value, first = null, keep = false;
      sel.innerHTML = '';
      ORDER.forEach(function(k){ if (TOOLS[k].data.indexOf(d) < 0) return;
        var o = document.createElement('option'); o.value = k; o.textContent = TOOLS[k].name; sel.appendChild(o);
        if (!first) first = k; if (k === cur) keep = true; });
      sel.value = keep ? cur : (d==='ontraw' ? 'flye' : d==='sr' ? 'abyss' : first);
    }
    function num(id, def, lo, hi){ var v = parseFloat($(id).value); if (!isFinite(v) || v <= 0) v = def; return Math.min(hi, Math.max(lo, v)); }

    function draw(){
      var G = num('s02-es-g', 2.5, 0.001, 40), C = num('s02-es-c', 25, 0.1, 1000), d = $('s02-es-d').value;
      var th = Math.round(num('s02-es-t', 16, 1, 1024)), R = num('s02-es-r', 500, 1, 100000);
      var t = TOOLS[sel.value]; if (!t) return;
      var B = G*C; TH = th;
      var rows = [];
      rows.push(['Read bases', nf(B,1)+' Gb', CALC+'genome size × coverage = '+nf(G,2)+' Gb × '+nf(C,0)+'.']);
      var gz = GZ[d];
      rows.push(['Input on disk', gb(B*gz[0])+' gzipped<br>~'+gb(B*2)+' unpacked', OUR+gz[1]+' ('+gz[0]+' bytes per base). '+CALC+'unpacked FASTQ ≈ 2 bytes per base (letter + quality).']);
      var ram = t.ram(G,C,B,d,R);
      var fit = ram.hi <= R*0.8 ? ['fits','var(--good)'] : ram.lo <= R ? ['tight','var(--het)'] : ['does not fit','var(--bad)'];
      rows.push(['Peak RAM', (ram.show ? esc(ram.show) : range(ram.lo, ram.hi, gb))+'<br><span style="color:'+fit[1]+';font-weight:600">'+fit[0]+' in '+gb(R)+'</span>', ram.src]);
      var cpu = t.cpu(G,C,B,d,R), cpuCell;
      if (cpu.txt) cpuCell = esc(cpu.txt).replace(/–/g,'–');
      else cpuCell = range(cpu.lo, cpu.hi, function(x){ return nf(x, 0); }) + ' CPU-h<br>at least ' + (Math.abs(cpu.hi-cpu.lo) < 1e-9 ? hrs(cpu.lo/th) : hrs(cpu.lo/th) + ' – ' + hrs(cpu.hi/th)) + '<br>at '+th+' threads';
      rows.push(['CPU and wall time', cpuCell, cpu.src + (cpu.txt ? '' : ' Wall time assumes every thread busy all the time, so it is a lower bound (see the threads box above).')]);
      var dk = t.disk(G,C,B,d,R);
      rows.push(['Peak intermediate disk', dk.txt ? esc(dk.txt) : range(dk.lo, dk.hi, gb), dk.src]);
      rows.push(['Final assembly', '~'+gb(G)+' per haplotype', CALC+'FASTA ≈ 1 byte per base; haplotype-resolved runs write two or three of these.']);
      var tb = $('s02-es-out'); tb.innerHTML = '';
      rows.forEach(function(r){ var tr = document.createElement('tr'); tr.innerHTML = '<td><b>'+r[0]+'</b></td><td class="mono" style="white-space:nowrap">'+r[1]+'</td><td style="font-size:12.5px">'+r[2]+'</td>'; tb.appendChild(tr); });
      var w = t.warn ? t.warn(d) : '';
      if (d === 'ontraw' && sel.value !== 'hifiasm') w = (w ? w + ' ' : '') + 'CycloneSEQ reads are not Nanopore reads: Nanopore-trained models (Medaka, dorado) may not fit them.';
      $('s02-es-note').innerHTML = w ? '<b>Note.</b> ' + w : '';
      // figure: log-scale bars of RAM and disk
      var W = 640, H = 150, L = 120, Rm = 20, lo = 1, hi = 20000;
      var xs = function(v){ v = Math.max(lo, Math.min(hi, v)); return L + (W-L-Rm) * Math.log(v/lo)/Math.log(hi/lo); };
      var s = '<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="min-width:360px" role="img" aria-label="Estimated RAM and disk on a log scale">';
      [1,10,100,1000,10000].forEach(function(v){ s += '<line class="grid" x1="'+xs(v)+'" x2="'+xs(v)+'" y1="14" y2="'+(H-28)+'"></line><text x="'+xs(v)+'" y="'+(H-12)+'" text-anchor="middle">'+gb(v)+'</text>'; });
      function bar(y, a, b, col, lab, dashed){
        var x1 = xs(a), x2 = Math.max(xs(b), x1+4);
        s += '<text class="lab" x="'+(L-8)+'" y="'+(y+13)+'" text-anchor="end">'+lab+'</text>';
        s += '<rect x="'+x1.toFixed(1)+'" y="'+y+'" width="'+(x2-x1).toFixed(1)+'" height="18" rx="2" style="fill:'+col+';opacity:.75'+(dashed?';stroke:var(--muted);stroke-dasharray:3 2;fill-opacity:.2':'')+'"></rect>';
      }
      bar(20, ram.lo, ram.hi, 'var(--accent)', 'peak RAM');
      bar(48, B*gz[0], B*gz[0], 'var(--het)', 'input (gzip)');
      if (dk.lo !== undefined) bar(76, dk.lo, dk.hi, 'var(--rep)', 'intermediate');
      else s += '<text class="lab" x="'+(L-8)+'" y="89" text-anchor="end">intermediate</text><text x="'+(L+4)+'" y="89">'+esc(dk.txt)+'</text>';
      var xr = xs(R);
      s += '<line x1="'+xr+'" x2="'+xr+'" y1="12" y2="'+(H-28)+'" style="stroke:var(--bad);stroke-width:1.5;stroke-dasharray:4 3"></line>';
      s += '<text x="'+(xr > W-120 ? xr-4 : xr+4)+'" y="12" text-anchor="'+(xr > W-120 ? 'end':'start')+'" style="fill:var(--bad)">free RAM '+gb(R)+'</text>';
      s += '</svg>';
      $('s02-es-fig').innerHTML = s;
    }
    $('s02-es-d').addEventListener('change', function(){ fillTools(); draw(); });
    ['s02-es-a'].forEach(function(id){ $(id).addEventListener('change', draw); });
    ['s02-es-g','s02-es-c','s02-es-t','s02-es-r'].forEach(function(id){ $(id).addEventListener('input', draw); });
    fillTools(); draw();
  })();
})();
