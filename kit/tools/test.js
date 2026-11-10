// Browser checks for a skinned guidelines site (Playwright).
//   NODE_PATH=$(npm root -g) node tools/test.js <site folder>
// Checks at 1440 and 390: no console errors or failed requests, no sideways scroll,
// every # link has a target, the top nav moves between Brand, Templates and the kit,
// the burger menu opens on mobile and the bar hides on scroll down and returns on scroll up.
// If the Concept review tab is on, it also checks the password screen, the concept frame and the review panel.
// Reference mode (a supplied brand, no index.html): checks the kit on its own, and that its top bar stays on the kit.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const site = path.resolve(process.argv[2] || 'site');
const PORT = 8000 + Math.floor(Math.random() * 900);
const base = `http://localhost:${PORT}/`;
const fails = [];
const guide = fs.existsSync(path.join(site, 'index.html'));
const home = guide ? 'index.html' : 'reference-kit.html';
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: site, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const b = await chromium.launch();
  try {
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      for (const page of guide ? ['index.html', 'index.html#brand', 'index.html#templates', 'reference-kit.html'] : ['reference-kit.html', 'reference-kit.html#brand-ch']) {
        const p = await b.newPage({ viewport: { width: w, height: h } });
        const errs = [];
        p.on('pageerror', e => errs.push(e.message));
        p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
        p.on('requestfailed', r => errs.push('failed ' + r.url().replace(base, '')));
        await p.goto(base + page, { waitUntil: 'networkidle' });
        await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } scrollTo(0, 0); });
        await p.waitForTimeout(400);
        ok(!errs.length, `${w} ${page}: ${errs.slice(0, 3).join(' | ')}`);
        const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        ok(over <= 1, `${w} ${page}: page scrolls sideways by ${over}px`);
        const missing = await p.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(x => x.length > 1 && !document.getElementById(decodeURIComponent(x.slice(1)))));
        ok(!missing.length, `${w} ${page}: links with no target ${[...new Set(missing)].join(' ')}`);
        const fonts = await p.evaluate(async () => { await document.fonts.ready; return [document.fonts.check("16px 'Brand Display'"), document.fonts.check("16px 'Brand Body'")]; });
        ok(fonts.every(Boolean), `${w} ${page}: brand fonts not loaded`);
        await p.close();
      }
      if (!guide) {
        // reference mode: nothing points at a guidelines site that isn't there
        const k = await b.newPage({ viewport: { width: w, height: h } });
        await k.goto(base + 'reference-kit.html', { waitUntil: 'networkidle' });
        const dead = await k.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(x => /^index\.html/.test(x)));
        ok(!dead.length, `${w}: the kit links to index.html, which reference mode doesn't have`);
        ok(await k.locator('#brand-ch').count() === 1, `${w}: the kit has no Brand chapter (reference mode)`);
        await k.close();
      }
      // navigation round trip
      if (guide) {
      const p = await b.newPage({ viewport: { width: w, height: h } });
      await p.goto(base + 'index.html', { waitUntil: 'networkidle' });
      const view = () => p.evaluate(() => [...document.querySelectorAll('[data-view]')].find(v => !v.hidden).dataset.view);
      const go = async (sel, v) => {
        if (w <= 900) { const bt = p.locator(`#view-${v} .tn-burger`); if (await bt.isVisible()) await bt.click(); }
        await p.locator(sel).locator('visible=true').first().click(); await p.waitForTimeout(300);
      };
      await p.locator('.cover-cards a[href="#brand"]').click(); await p.waitForTimeout(300);
      ok(await view() === 'brand', `${w}: cover to Brand failed`);
      await go('#view-brand .pnav a[href="#templates"]', 'brand');
      ok(await view() === 'templates', `${w}: Brand to Templates failed`);
      await go('#view-templates .pnav a[href="#brand"]', 'templates');
      ok(await view() === 'brand', `${w}: Templates to Brand failed`);
      await p.locator('#view-brand .tn-logo').click(); await p.waitForTimeout(300);
      ok(await view() === 'home', `${w}: logo to cover failed`);
      if (w <= 900) {
        await p.locator('.cover-cards a[href="#brand"]').click(); await p.waitForTimeout(300);
        for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(80); }
        await p.waitForTimeout(400);
        ok(await p.evaluate(() => document.querySelector('#view-brand .topnav').classList.contains('tn-hide')), `${w}: nav doesn't hide on scroll down`);
        await p.mouse.wheel(0, -200); await p.waitForTimeout(500);
        ok(!(await p.evaluate(() => document.querySelector('#view-brand .topnav').classList.contains('tn-hide'))), `${w}: nav doesn't return on scroll up`);
      }
      await p.close();
      // kit back to guidelines
      const k = await b.newPage({ viewport: { width: w, height: h } });
      await k.goto(base + 'reference-kit.html', { waitUntil: 'networkidle' });
      if (w <= 900) await k.locator('.tn-burger').click();
      await k.locator('.pnav a[href="index.html#templates"]').click(); await k.waitForLoadState('networkidle'); await k.waitForTimeout(300);
      ok(await k.evaluate(() => [...document.querySelectorAll('[data-view]')].find(v => !v.hidden).dataset.view) === 'templates', `${w}: kit to Templates failed`);
      await k.close();
      }
      // Concept review tab, when it's on
      const cr = path.join(site, 'concept-review.html');
      if (fs.existsSync(cr)) {
        const slug = (fs.readFileSync(cr, 'utf8').match(/^  project: ['"]([^'"]+)/m) || [])[1];
        const c0 = await b.newContext({ viewport: { width: w, height: h } });
        const g = await c0.newPage();
        await g.goto(base + 'concept/home.html', { waitUntil: 'networkidle' });
        ok(g.url().endsWith('concept-review.html'), `${w}: the concept opens without the password screen`);
        // Several pages (concept/manifest.js from the website repo's tools/concept.py): every inner page is behind the password too
        const man = path.join(site, 'concept', 'manifest.js');
        const pages = fs.existsSync(man) ? JSON.parse(fs.readFileSync(man, 'utf8').match(/\[[\s\S]*\]/)[0]) : [];
        for (const pg of pages.filter(x => x.file !== 'home.html')) {
          await g.goto(base + 'concept/' + pg.file, { waitUntil: 'networkidle' });
          ok(g.url().endsWith('concept-review.html'), `${w}: concept/${pg.file} opens without the password screen`);
        }
        await c0.close();
        const ctx = await b.newContext({ viewport: { width: w, height: h } });
        await ctx.addInitScript(s => { try { localStorage.setItem(s + '-cr', '1'); } catch (_) {} }, slug);
        const c = await ctx.newPage(); const errs = [];
        c.on('pageerror', e => errs.push(e.message)); c.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
        await c.goto(base + home, { waitUntil: 'networkidle' });
        ok(await c.locator('.pnav a[data-concept-link]').count() >= (guide ? 2 : 1), `${w}: Concept review missing from the top bar`);
        await c.goto(base + 'concept-review.html', { waitUntil: 'networkidle' }); await c.waitForTimeout(800);
        ok(await c.locator('.app').isVisible(), `${w}: concept review doesn't open`);
        ok(await c.locator('#slist li').count() > 0, `${w}: no sections found in concept/home.html (add data-section and data-label)`);
        const fr = c.frames().find(f => /concept\/home/.test(f.url()));
        const boxes = fr ? await fr.evaluate(() => document.querySelectorAll('[data-cr-edit]').length) : 0;
        ok(boxes > 0, `${w}: Edit content found nothing to edit in concept/home.html (is review.js at the end of <body>?)`);
        // Every page loads in the frame from the page picker, with its sections and editable boxes
        for (const pg of pages) {
          await c.evaluate(k => { const s = document.getElementById('pg-sel'); s.value = k; s.dispatchEvent(new Event('change')); }, pg.key);
          await c.waitForTimeout(2500);
          const pf = c.frames().find(f => f.url().endsWith('concept/' + pg.file));
          ok(!!pf, `${w}: the page picker doesn't open concept/${pg.file}`);
          if (pf) ok(await pf.evaluate(() => document.querySelectorAll('[data-section]').length) > 0 && await pf.evaluate(() => document.querySelectorAll('[data-cr-edit]').length) > 0, `${w}: concept/${pg.file} has no sections or nothing to edit`);
        }
        if (pages.length) ok(await c.locator('#slist li:not(.pg-h)').count() === new Set(pages.flatMap(x => x.sections.map(s => s.id))).size, `${w}: the approval list doesn't hold every section on every page`);
        const over = await c.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        ok(over <= 1, `${w} concept-review.html: page scrolls sideways by ${over}px`);
        ok(!errs.filter(e => !/review sheet|Failed to fetch|ERR_/.test(e)).length, `${w} concept-review.html: ${errs.slice(0, 3).join(' | ')}`);
        await ctx.close();
      }
    }
  } finally { await b.close(); srv.kill(); }
  console.log(fails.length ? `${fails.length} problems\n  ` + fails.join('\n  ') : 'All checks passed');
  process.exit(fails.length ? 1 : 0);
})();
