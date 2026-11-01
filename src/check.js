// Check the built course pages in headless Chrome.
//   npm run check            (all lessons, desktop 1100 px and phone 420 px)
// Reports: script errors, horizontal page overflow, duplicate ids, broken in-page links,
// broken links to other lessons, empty figures. Exits with code 1 on any problem.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const ROOT = path.join(__dirname, '..');
const CHROME = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(p => fs.existsSync(p));
const lessons = fs.readdirSync(path.join(ROOT, 'lessons')).filter(d => fs.existsSync(path.join(ROOT, 'lessons', d, 'index.html')));
const ids = {};
for (const d of lessons) ids[d] = new Set([...fs.readFileSync(path.join(ROOT, 'lessons', d, 'index.html'), 'utf8').matchAll(/id="([^"]+)"/g)].map(m => m[1]));

(async () => {
  if (!CHROME) { console.error('No Chrome/Edge found; set CHROME_PATH'); process.exit(2); }
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  let bad = 0;
  for (const d of lessons) {
    const html = fs.readFileSync(path.join(ROOT, 'lessons', d, 'index.html'), 'utf8');
    const cross = [...html.matchAll(/href="\.\.\/([\w-]+)\/#([\w-]+)"/g)].filter(m => !ids[m[1]] || !ids[m[1]].has(m[2])).map(m => m[1] + '#' + m[2]);
    for (const width of [1100, 420]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
      await page.goto('file:///' + path.join(ROOT, 'lessons', d, 'index.html').split(path.sep).join('/'), { waitUntil: 'load' });
      const r = await page.evaluate(() => {
        const seen = {}; document.querySelectorAll('[id]').forEach(e => seen[e.id] = (seen[e.id] || 0) + 1);
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          duplicateIds: Object.keys(seen).filter(k => seen[k] > 1),
          brokenAnchors: [...new Set([...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href').slice(1)).filter(h => h && !document.getElementById(h)))],
          emptyFigures: [...document.querySelectorAll('.svgbox')].filter(x => !x.innerHTML.trim()).map(x => x.id),
        };
      });
      const problems = { errors, ...r, brokenLessonLinks: width === 1100 ? cross : [] };
      const fail = errors.length || r.overflow > 0 || r.duplicateIds.length || r.brokenAnchors.length || r.emptyFigures.length || problems.brokenLessonLinks.length;
      console.log(`${fail ? 'FAIL' : 'ok  '} ${d} @${width}px` + (fail ? ' ' + JSON.stringify(problems) : ''));
      if (fail) bad++;
      await page.close();
    }
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
