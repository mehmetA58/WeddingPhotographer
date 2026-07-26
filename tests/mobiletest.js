/* Proje geneli mobil doğrulama:
   - her sayfa × viewport matrisi için yatay taşma yok
   - dokunma hedefleri ≥44px
   - landing parallax: yükseklik-yalnızca resize sahneyi zıplatmıyor  */
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:8000';
let failures = [];
const ok = (c, l) => { console.log((c ? '  ✓ ' : '  ✗ ') + l); if (!c) failures.push(l); };

const PAGES = [
  ['index.html',     'landing'],
  ['setup.html',     'kurulum'],
  ['upload.html?e=testevt&title=Test', 'yükleme'],
  ['gallery.html?e=testevt&k=testkey&title=Test', 'galeri'],
  ['slideshow.html?demo=1', 'sunum'],
  ['invite.html',    'davetiye'],
  ['card.html?data=x&title=Test', 'kart'],
];
const VIEWPORTS = [
  { w: 320, h: 690, name: '320' },
  { w: 360, h: 780, name: '360' },
  { w: 390, h: 844, name: '390' },
  { w: 414, h: 896, name: '414' },
  { w: 768, h: 1024, name: '768' },
  { w: 740, h: 360, name: 'yatay-740x360' },
];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });

  /* ---- 1) Taşma matrisi ---- */
  for (const [path, label] of PAGES) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
      const pg = await ctx.newPage();
      // dış çağrıları engelle (api=x.test)
      await pg.route(/^https:\/\/x\.test\//, r => {
        const cb = new URL(r.request().url()).searchParams.get('callback') || 'callback';
        r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: `window[${JSON.stringify(cb)}] && window[${JSON.stringify(cb)}]({items:[]})` });
      });
      let perr = null;
      pg.on('pageerror', e => { perr = e.message; });
      try {
        await pg.goto(BASE + '/' + path, { waitUntil: 'load', timeout: 15000 });
        await pg.waitForTimeout(500);
        const over = await pg.evaluate(() => {
          const de = document.documentElement;
          return { sw: de.scrollWidth, iw: window.innerWidth };
        });
        ok(over.sw <= over.iw + 1, `${label} @${vp.name}: taşma yok (sw=${over.sw} iw=${over.iw})`);
        if (perr) failures.push(`${label} @${vp.name} pageerror: ${perr}`);
      } catch (e) {
        failures.push(`${label} @${vp.name} yüklenemedi: ${e.message}`);
      }
      await ctx.close();
    }
  }

  /* ---- 2) Dokunma hedefleri ≥44px (480px viewport) ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 480, height: 900 } });
    const pg = await ctx.newPage();
    await pg.route(/^https:\/\/x\.test\//, r => {
      const cb = new URL(r.request().url()).searchParams.get('callback') || 'callback';
      r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: `window[${JSON.stringify(cb)}] && window[${JSON.stringify(cb)}]({items:[]})` });
    });
    // Galeri: yenile butonu
    await pg.goto(BASE + '/gallery.html?e=testevt&k=testkey&title=Test', { waitUntil: 'load' });
    await pg.waitForTimeout(400);
    const gbtn = await pg.locator('#refreshBtn').evaluate(el => el.getBoundingClientRect().height).catch(() => 0);
    ok(gbtn >= 44, `galeri #refreshBtn ≥44px (${Math.round(gbtn)})`);
    await ctx.close();

    // Landing: tema çipi
    const c3 = await browser.newContext({ viewport: { width: 480, height: 900 } });
    const p3 = await c3.newPage();
    await p3.goto(BASE + '/index.html', { waitUntil: 'load' });
    await p3.waitForTimeout(400);
    const chip = await p3.locator('.lp-theme-chip').first().evaluate(el => el.getBoundingClientRect().height).catch(() => 0);
    ok(chip >= 44, `landing .lp-theme-chip ≥44px (${Math.round(chip)})`);
    await c3.close();
  }

  /* ---- 3) Landing (evently düzeni): mobilde yatay taşma yok + hata yok ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pg = await ctx.newPage();
    let perr = null; pg.on('pageerror', e => perr = e.message);
    await pg.goto(BASE + '/index.html', { waitUntil: 'load' });
    await pg.waitForTimeout(600);
    ok(await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'landing: mobilde yatay taşma yok');
    // Sayfayı sonuna kaydır: marquee/kolaj gibi öğeler taşma yaratmamalı
    await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await pg.waitForTimeout(400);
    ok(await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'landing: kaydırınca da taşma yok');
    ok(!perr, 'landing: mobilde JS hatası yok');
    await ctx.close();
  }

  await browser.close();
  console.log(failures.length ? `\n${failures.length} BAŞARISIZ:\n - ${failures.join('\n - ')}` : '\nMOBİL TESTLER GEÇTİ ✓');
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error('Hata:', e); process.exit(2); });
