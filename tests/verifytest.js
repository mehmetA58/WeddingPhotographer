/* Yükleme doğrulaması dayanıklılık testi:
   A) Güncel sunucu (uploadId geri veriyor)     → kesin doğrulama, başarı
   B) Eski sunucu (dosyalar var ama uploadId yok) → iyimser başarı (yanlış alarm YOK)
   C) Gerçek kayıp (kimlik destekli ama bizimki listede yok) → doğrulama hatası gösterilir  */
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:8000';
let failures = [];
const ok = (c, l) => { console.log((c ? '  ✓ ' : '  ✗ ') + l); if (!c) failures.push(l); };

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const file = n => ({ name: n, mimeType: 'image/png', buffer: PNG });

/* mode: 'new' (id yankılar) | 'old' (dosya var, id yok) | 'miss' (başka id var, bizimki yok) */
async function run(browser, mode) {
  const posted = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const page = await ctx.newPage();
  let perr = null;
  page.on('pageerror', e => perr = e.message);

  await page.route(/^https:\/\/x\.test\/fake-exec/, route => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData());
      posted.push(body);
      route.fulfill({ contentType: 'application/json', body: '{"status":"ok"}' });
      return;
    }
    // GET = JSONP list
    const cb = new URL(req.url()).searchParams.get('callback');
    let files = [];
    if (mode === 'new') {
      files = posted.map((b, i) => ({ id: 'f' + i, d: 'EventPhoto · UploadId: ' + b.uploadId }));
    } else if (mode === 'old') {
      files = posted.map((b, i) => ({ id: 'f' + i, d: 'EventPhoto · Katılımcı: X' })); // kimlik YOK
    } else if (mode === 'miss') {
      files = [{ id: 'z', d: 'EventPhoto · UploadId: baskasi_123' }]; // kimlik destekli ama bizimki yok
    }
    route.fulfill({ contentType: 'application/javascript; charset=utf-8', body: `${cb}(${JSON.stringify({ status: 'ok', files })})` });
  });

  await page.goto(BASE + '/upload.html?api=https://x.test/fake-exec&event=wedding&title=Test&token=tk');
  await page.waitForTimeout(400);
  await page.setInputFiles('#galleryInput', [file('a.png'), file('b.png')]);
  await page.waitForTimeout(300);
  await page.fill('#guestName', 'Ayşe Teyze');
  await page.click('#sendBarBtn');
  // yükleme + doğrulama + (başarıda) 900ms geçişli başarı ekranı
  await page.waitForTimeout(3500);

  const success = await page.locator('#successScreen').isVisible();
  const errShown = await page.locator('#statusNote').isVisible().catch(() => false);
  const errText = errShown ? (await page.locator('#statusNote').textContent()) : '';
  if (perr) failures.push(`[${mode}] pageerror: ${perr}`);
  await ctx.close();
  return { success, errShown, errText, posted: posted.length };
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });

  const A = await run(browser, 'new');
  ok(A.posted === 2 && A.success && !A.errShown, `A) güncel sunucu → başarı ekranı, uyarı yok (${JSON.stringify(A)})`);

  const B = await run(browser, 'old');
  ok(B.success && !B.errShown, `B) eski sunucu (id yok) → iyimser başarı, "doğrulanamadı" YOK (${JSON.stringify(B)})`);

  const C = await run(browser, 'miss');
  ok(!C.success && C.errShown && /doğrulan/i.test(C.errText), `C) gerçek kayıp → doğrulama hatası gösteriliyor (${JSON.stringify({ success: C.success, errShown: C.errShown })})`);

  await browser.close();
  console.log(failures.length ? `\n${failures.length} BAŞARISIZ: ${failures.join(' | ')}` : '\nDOĞRULAMA DAYANIKLILIK TESTLERİ GEÇTİ ✓');
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error('Hata:', e); process.exit(2); });
