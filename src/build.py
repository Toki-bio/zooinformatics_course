"""Build the course pages from src/.

    python src/build.py            build every lesson
    python src/build.py 2          build lesson 2 only

Lesson 1 is a single hand-written page (src/lesson01/lesson01.html).
Later lessons are assembled from sections: src/lessonNN/lesson.json gives the title,
introduction and order of work; src/lessonNN/sections/NN-slug.{html,js,css} are the sections.

Outputs
    lessons/NN-slug/index.html      the course page (GitHub Pages)
    build/lessonNN.html             the same page without the course frame, for preview
                                    or for publishing elsewhere (build/ is not tracked)
"""
import io, os, re, sys, glob, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
STYLE_SOURCE = os.path.join(SRC, 'lesson01', 'lesson01.html')

# The course, in order. Add a lesson here and in index.html.
LESSONS = [
    {'number': 1, 'slug': '01-pre-assembly', 'title': 'Pre-Assembly Read Profiling'},
    {'number': 2, 'slug': '02-assembly', 'title': 'Genome Assembly'},
    {'number': 3, 'slug': '03-annotation', 'title': 'Repeats, Genes and ROH'},
    {'number': 4, 'slug': '04-demography', 'title': 'Population History from One Genome'},
    {'number': 5, 'slug': '05-methylation', 'title': 'DNA Methylation from Long Reads'},
    {'number': 6, 'slug': '06-sines-satellites', 'title': 'SINEs and Satellite DNA'},
]


def read(path):
    with io.open(path, encoding='utf-8') as f:
        return f.read()


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with io.open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)


COPY_JS = '''/* ---- copy buttons ---- */
(function(){function sel(el){const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r)}
document.querySelectorAll('.code button').forEach(b=>b.addEventListener('click',()=>{const t=b.nextElementSibling.innerText;const done=()=>{b.textContent='copied';setTimeout(()=>b.textContent='copy',1400)};
 try{navigator.clipboard.writeText(t).then(done,()=>sel(b.nextElementSibling))}catch(e){sel(b.nextElementSibling)}}))})();'''

FRAME_CSS = '''
/* ---- course frame (standalone hosting) ---- */
body{margin:0}
img{max-width:100%}
[hidden]{display:none!important}
/* long words (file names, sequences) wrap instead of widening the page */
.wrap{overflow-wrap:break-word}
.crumb{font-family:var(--f-mono);font-size:12.5px;color:var(--muted);display:flex;gap:8px;flex-wrap:wrap}
.crumb a{color:var(--accent);text-decoration:none}.crumb a:hover{text-decoration:underline}
.lesson-nav{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:16px;font-size:14.5px}
.lesson-nav a{color:var(--accent);text-decoration:none;font-weight:600}
.lesson-nav a:hover{text-decoration:underline}
.lesson-nav .next{margin-left:auto;text-align:right}
'''


def lesson_page(n):
    """Return (head_html_with_style, body_html) of lesson n without the course frame."""
    if n == 1:
        s = read(STYLE_SOURCE)
        i = s.index('</style>')
        return s[:i], s[i + len('</style>'):]
    cfg = json.loads(read(os.path.join(SRC, f'lesson{n:02d}', 'lesson.json')))
    base = read(STYLE_SOURCE)
    style = base[base.index('<style>') + 7:base.index('</style>')]
    links = base[:base.index('<style>')]
    links = re.sub(r'<title>.*?</title>', f'<title>{cfg["title"]}</title>', links)
    sec_dir = os.path.join(SRC, f'lesson{n:02d}', 'sections')
    slugs = sorted(os.path.basename(p)[:-5] for p in glob.glob(os.path.join(sec_dir, '[0-9][0-9]-*.html')))
    opt = lambda f: read(os.path.join(sec_dir, f)) if os.path.exists(os.path.join(sec_dir, f)) else ''
    steps = '\n'.join(
        f'    <li><div><b>{st["title"]}</b><a href="#s{i + 1:02d}">section {i + 1}</a>'
        f'<div class="d">{st["what"]}</div><div class="t">{st["tools"]}</div></div></li>'
        for i, st in enumerate(cfg['steps']))
    intro = '\n'.join(f'  <p class="lede">{p}</p>' for p in cfg['intro'])
    header = f'''<header style="display:flex;flex-direction:column;gap:12px">
  <div class="eyebrow">{cfg["eyebrow"]}</div>
  <h1>{cfg["title"]}</h1>
{intro}
</header>

<section aria-labelledby="flow{n}">
  <h2 id="flow{n}">The order of work</h2>
  <ol class="steps">
{steps}
  </ol>
</section>
'''
    css = '\n'.join(opt(s + '.css') for s in slugs)
    sections = '\n\n'.join(f'<!-- ============ {s} ============ -->\n' + opt(s + '.html').strip() for s in slugs)
    js = '\n'.join(f'/* ==== {s} ==== */\n' + opt(s + '.js').strip() for s in slugs)
    footer = ('<footer style="display:flex;flex-direction:column;gap:8px;font-size:13px;color:var(--muted)">\n'
              f'  <p>{cfg["footer"]}</p>\n</footer>')
    head = links + '<style>' + style + '\n/* ---- section css ---- */\n' + css + '\n'
    body = ('\n\n<div class="wrap">\n\n' + header + '\n' + sections + '\n\n' + footer + '\n</div>\n\n<script>\n'
            + js + '\n' + COPY_JS + '\n</script>\n')
    return head, body


def build(n):
    meta = LESSONS[n - 1]
    head, body = lesson_page(n)
    # preview copy without the course frame
    write(os.path.join(ROOT, 'build', f'lesson{n:02d}.html'), head + '</style>' + body)
    # course page
    head = head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
    crumbs = ['<a href="../../">← Zooinformatics course</a>']
    for m in LESSONS[:n - 1]:
        crumbs.append(f'<a href="../{m["slug"]}/">Lesson {m["number"]}</a>')
    crumbs.append(f'<span>Lesson {n}</span>')
    crumb = ('\n<nav class="crumb" aria-label="Course navigation">' + '<span>/</span>'.join(crumbs) + '</nav>\n')
    prev_l = LESSONS[n - 2] if n > 1 else None
    next_l = LESSONS[n] if n < len(LESSONS) else None
    nav = '<nav class="lesson-nav" aria-label="Previous and next lesson">'
    nav += (f'<a href="../{prev_l["slug"]}/">← Lesson {prev_l["number"]}: {prev_l["title"]}</a>' if prev_l
            else '<a href="../../">← Course home</a>')
    nav += (f'<a class="next" href="../{next_l["slug"]}/">Lesson {next_l["number"]}: {next_l["title"]} →</a>' if next_l
            else '<a class="next" href="../../">Course home →</a>')
    nav += '</nav>\n'
    body = body.replace('<div class="wrap">\n', '<div class="wrap">' + crumb, 1)
    k = body.index('</div>\n\n<script>')  # end of .wrap, just before the page script
    body = body[:k] + nav + body[k:]
    doc = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
           '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
           + head + FRAME_CSS + '</style>\n</head>\n<body>\n' + body.strip() + '\n</body>\n</html>\n')
    out = os.path.join(ROOT, 'lessons', meta['slug'], 'index.html')
    write(out, doc)
    print(f'lesson {n}: {os.path.relpath(out, ROOT)} ({len(doc):,} bytes)')


if __name__ == '__main__':
    todo = [int(a) for a in sys.argv[1:]] or [m['number'] for m in LESSONS]
    for n in todo:
        build(n)
