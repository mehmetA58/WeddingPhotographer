/* Yükleme yanıt sözleşmesi testi (aynı origin, gerçek yanıt):
   A) Sunucu status:ok  → başarı ekranı, uyarı yok
   B) Sunucu status:error → başarı YOK, hata gösterilir
   (Eski "opaque + fail-open doğrulama" mantığı kaldırıldı.) */
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:8000';
let failures = [];
const ok = (c, l) => { console.log((c ? '  ✓ ' : '  ✗ ') + l); if (!c) failures.push(l); };

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const file = n => ({ name: n, mimeType: 'image/png', buffer: PNG });

/* mode: 'ok' → status:ok | 'err' → status:error */
async function run(browser, mode) {
  const posted = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const page = await ctx.newPage();
  let perr = null;
  page.on('pageerror', e => perr = e.message);

  await page.route('**/api/upload*', route => {
    const url = new URL(route.request().url());
    const uploadId = url.searchParams.get('uploadId');
    posted.push(uploadId);
    if (mode === 'ok') {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', uploadId, fileId: 'f' + posted.length, name: 'x.jpg' })
      });
    } else {
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'error', code: 'server_error', message: 'Yükleme tamamlanamadı' })
      });
    }
  });

  await page.goto(BASE + '/upload.html?e=evt123&event=wedding&title=Test');
  await page.waitForTimeout(400);
  await page.setInputFiles('#galleryInput', [file('a.png'), file('b.png')]);
  await page.waitForTimeout(300);
  await page.fill('#guestName', 'Ayşe Teyze');
  await page.click('#sendBarBtn');
  await page.waitForTimeout(2500); // yükleme + (başarıda) 900ms geçişli başarı ekranı

  const success = await page.locator('#successScreen').isVisible();
  const errShown = await page.locator('#statusNote').isVisible().catch(() => false);
  if (perr) failures.push(`[${mode}] pageerror: ${perr}`);
  await ctx.close();
  return { success, errShown, posted: posted.length };
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });

  const A = await run(browser, 'ok');
  ok(A.posted === 2 && A.success && !A.errShown, `A) status:ok → başarı ekranı, uyarı yok (${JSON.stringify(A)})`);

  const B = await run(browser, 'err');
  ok(!B.success && B.errShown, `B) status:error → başarı YOK, hata gösteriliyor (${JSON.stringify(B)})`);

  await browser.close();
  console.log(failures.length ? `\n${failures.length} BAŞARISIZ: ${failures.join(' | ')}` : '\nYÜKLEME YANIT TESTLERİ GEÇTİ ✓');
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error('Hata:', e); process.exit(2); });
