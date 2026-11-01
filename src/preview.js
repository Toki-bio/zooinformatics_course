// Preview one section while writing it.
//   node src/preview.js 2 05-yahs [width]
// Builds build/preview-<lesson>-<slug>.html (course style + the section's html, css and js),
// opens it in headless Chrome with all <details> open, prints script errors and page width,
// and saves a full-page screenshot next to it. Look at the PNG to catch overlapping labels.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const ROOT = path.join(__dirname, '..');
const [lesson, slug, w] = process.argv.slice(2);
if (!lesson || !slug) { console.error('usage: node src/preview.js <lesson number> <NN-slug> [width]'); process.exit(2); }
const width = +(w || 1100);
const dir = path.join(__dirname, 'lesson' + String(lesson).padStart(2, '0'), 'sections');
const base = fs.readFileSync(path.join(__dirname, 'lesson01', 'lesson01.html'), 'utf8');
const style = base.slice(base.indexOf('<style>'), base.indexOf('</style>') + 8);
const rd = f => fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8') : '';
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${style}<style>body{margin:0}${rd(slug + '.css')}</style></head><body><main class="wrap">${rd(slug + '.html')}</main><script>${rd(slug + '.js')}</script></body></html>`;
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
const out = path.join(ROOT, 'build', `preview-${lesson}-${slug}.html`);
fs.writeFileSync(out, html);
const CHROME = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const p = await b.newPage({ viewport: { width, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + out.split(path.sep).join('/'), { waitUntil: 'load' });
  await p.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
  const png = out.replace(/\.html$/, `-${width}.png`);
  await p.screenshot({ path: png, fullPage: true });
  console.log(JSON.stringify({ errors: errs, scrollWidth: await p.evaluate(() => document.documentElement.scrollWidth), width, png }));
  await b.close();
})();
