/* Landing testi (evently düzeni + Kartpostal kimliği): davranışlar + SEO +
   kırık link taraması + görsel kareler */
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:8000';
let failures = [];
const ok = (c, l) => { console.log((c ? '  ✓ ' : '  ✗ ') + l); if (!c) failures.push(l); };

(async () => {
  // --enable-unsafe-swiftshader: GPU'suz makinelerde yazılımsal WebGL açılsın,
  // yoksa hero3d sessizce statik fallback'e düşer ve aşağıdaki testler patlar.
  const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });

  /* ---- 1) Masaüstü: hero (3D sahne), nav, reveal, demo, tema ---- */
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => failures.push('pageerror: ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(1000);

  ok((await p.title()).includes('EventPhoto'), 'başlık doğru');
  ok((await p.textContent('.lp-h1')).includes('birikir'), 'hero başlığı görünür');
  ok(!(await p.locator('#lpNav').evaluate(el => el.classList.contains('is-scrolled'))), 'nav: başta şeffaf');
  ok(await p.locator('.lp-airmail-top').count() === 1, 'imza: airmail şeridi var');
  await p.screenshot({ path: 'shots/lp-hero.png' });

  // JSON-LD geçerli mi
  const lds = await p.$$eval('script[type="application/ld+json"]', els => els.map(e => e.textContent));
  let ldOk = lds.length === 2;
  try { lds.forEach(s => JSON.parse(s)); } catch (e) { ldOk = false; }
  ok(ldOk, 'JSON-LD: 2 blok, geçerli JSON');
  ok(lds.some(s => s.includes('FAQPage')) && lds.some(s => s.includes('SoftwareApplication')), 'JSON-LD türleri doğru');

  // Tüm img'lerde alt + boyut
  const imgs = await p.$$eval('img', els => els.map(e => ({ alt: e.hasAttribute('alt'), w: e.getAttribute('width') })));
  ok(imgs.every(i => i.alt), 'tüm görsellerde alt niteliği');
  ok(imgs.every(i => i.w), 'tüm görsellerde width/height');

  // Hero: three.js sahnesi kuruldu
  ok(await p.locator('.lp-hero3d-canvas').count() === 1, 'hero3d: canvas eklendi');
  ok(await p.evaluate(() => document.documentElement.classList.contains('hero3d-on')), 'hero3d: etkin');
  ok(await p.getAttribute('.lp-hero3d', 'data-hero-stage') === '0', 'hero3d: 0. aşamada başlar');

  // Kaydırdıkça aşamalar ilerler ve koyu sahneye geçilir
  await p.evaluate(() => window.scrollTo(0, window.innerHeight * 1.6));
  await p.waitForTimeout(700);
  ok(Number(await p.getAttribute('.lp-hero3d', 'data-hero-stage')) >= 1, 'hero3d: aşama ilerledi');
  await p.evaluate(() => window.scrollTo(0, window.innerHeight * 3.1));
  await p.waitForTimeout(700);
  ok(await p.getAttribute('.lp-hero3d', 'data-hero-stage') === '3', 'hero3d: koyu aşamaya geçti');
  await p.screenshot({ path: 'shots/lp-hero3d-dark.png' });

  // Hero geçilince kare döngüsü durur (pil/CPU)
  await p.locator('#fiyat').scrollIntoViewIfNeeded();
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => window.__hero3d && window.__hero3d.running === false), 'hero3d: ekran dışında durdu');
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(400);

  // Kaydır: nav blur hap + reveal blokları açılıyor
  await p.evaluate(() => window.scrollTo(0, 700));
  await p.waitForTimeout(500);
  ok(await p.locator('#lpNav').evaluate(el => el.classList.contains('is-scrolled')), 'nav: kaydırınca blur hap');
  await p.locator('#nasil-calisir').scrollIntoViewIfNeeded();
  await p.waitForTimeout(600);
  ok(await p.locator('#nasil-calisir .rv').first().evaluate(el => el.classList.contains('in')), 'reveal: bölüm belirdi');
  ok(await p.locator('.lp-step').count() === 3, 'nasıl çalışır: 3 adım kartı');
  await p.screenshot({ path: 'shots/lp-steps.png' });

  // Demo TV: iframe tembel yüklendi ve içinde polaroid dönüyor
  await p.locator('#canli-sunum').scrollIntoViewIfNeeded();
  await p.waitForTimeout(3500);
  ok(await p.locator('#lpTv iframe').count() === 1, 'TV: demo iframe yüklendi');
  const framePol = await p.frameLocator('#lpTv iframe').locator('.pol-layer.visible .polaroid').count();
  ok(framePol === 1, 'TV: iframe içinde canlı polaroid');
  await p.screenshot({ path: 'shots/lp-demo.png' });

  // Konsept şeridi: 10 tür + sayfa boyanıyor
  await p.locator('#konseptler').scrollIntoViewIfNeeded();
  await p.waitForTimeout(400);
  ok(await p.locator('.lp-theme-chip').count() === 10, 'konseptler: 10 tür (Konser dahil)');
  ok(await p.locator('.lp-theme-chip[data-event="concert"]').count() === 1, 'konseptler: Konser çipi var');
  await p.locator('.lp-theme-chip[data-event="trip"]').click();
  await p.waitForTimeout(300);
  ok((await p.getAttribute('html', 'data-event')) === 'trip', 'tema: data-event=trip');
  ok((await p.textContent('#themeWord')) === 'Gezi', 'tema: kelime güncellendi');
  const cream = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--cream').trim());
  ok(cream.toUpperCase() === '#E9F3F2', 'tema: sayfa zemini gezi tonuna boyandı');
  await p.screenshot({ path: 'shots/lp-themes.png' });

  // Fiyat: dürüst tek plan
  await p.locator('#fiyat').scrollIntoViewIfNeeded();
  await p.waitForTimeout(300);
  ok((await p.textContent('.lp-plan-price')).includes('0'), 'fiyat: ücretsiz plan görünür');

  // Footer: knockout + video
  await p.locator('.lp-footer').scrollIntoViewIfNeeded();
  await p.waitForTimeout(800);
  ok(await p.locator('.lp-ko video').evaluate(v => !v.paused), 'footer: video oynuyor');
  await p.screenshot({ path: 'shots/lp-footer.png' });

  // Kırık link taraması (yerel hedefler)
  const hrefs = await p.$$eval('a[href]', as => as.map(a => a.getAttribute('href')));
  const local = [...new Set(hrefs.filter(h => !h.startsWith('http') && !h.startsWith('#')))];
  for (const h of local) {
    const path = h.split('?')[0].split('#')[0];
    const r = await p.request.get(BASE + '/' + path);
    ok(r.status() === 200, `link 200: ${h}`);
  }
  await ctx.close();

  /* ---- 2) Mobil 390px: taşma yok + menü ---- */
  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  m.on('pageerror', e => failures.push('mobil pageerror: ' + e.message));
  await m.goto(BASE + '/index.html');
  await m.waitForTimeout(1000);
  ok(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'mobil: yatay taşma yok');
  ok(await m.locator('#lpMenuBtn').isVisible(), 'mobil: menü butonu görünür');
  ok(await m.evaluate(() => document.documentElement.classList.contains('hero3d-on')), 'mobil: 3D hero etkin');
  ok(await m.locator('.lp-hero3d-canvas').count() === 1, 'mobil: canvas eklendi');
  await m.evaluate(() => window.scrollTo(0, window.innerHeight * 3.1));
  await m.waitForTimeout(700);
  ok(await m.getAttribute('.lp-hero3d', 'data-hero-stage') === '3', 'mobil: aşamalar ilerliyor');
  await m.screenshot({ path: 'shots/lp-mobile-hero3d.png' });
  await m.evaluate(() => window.scrollTo(0, 0));
  await m.waitForTimeout(400);
  await m.click('#lpMenuBtn');
  await m.waitForTimeout(700);
  ok(await m.locator('#lpMenu').evaluate(el => el.classList.contains('open')), 'mobil: menü açıldı');
  await m.screenshot({ path: 'shots/lp-mobile-menu.png' });
  await m.click('#lpMenuClose');
  await m.waitForTimeout(600);
  await m.screenshot({ path: 'shots/lp-mobile.png' });
  await m.context().close();

  /* ---- 3) Reduced motion: statik ve tam erişilebilir ---- */
  const r = await (await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } })).newPage();
  r.on('pageerror', e => failures.push('rm pageerror: ' + e.message));
  await r.goto(BASE + '/index.html');
  await r.waitForTimeout(900);
  ok(await r.locator('.lp-h1').isVisible(), 'rm: hero başlığı statik görünür');
  ok(await r.locator('.rv').first().evaluate(el => el.classList.contains('in')), 'rm: rv blokları açık');
  ok(await r.locator('.lp-hero3d-canvas').count() === 0, 'rm: 3D hero kurulmadı');
  ok(await r.locator('.lp-hero-art').isVisible(), 'rm: statik kolaj görünür');
  await r.locator('#canli-sunum').scrollIntoViewIfNeeded();
  await r.waitForTimeout(500);
  ok(await r.locator('#lpTv img').isVisible(), 'rm: TV poster görselde kaldı');
  await r.context().close();

  await browser.close();
  console.log(failures.length ? `\n${failures.length} BAŞARISIZ: ${failures.join(' | ')}` : '\nLANDING TESTLERİ GEÇTİ ✓');
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error('Hata:', e); process.exit(2); });
