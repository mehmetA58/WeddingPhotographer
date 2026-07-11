/* Görev + gönder çubuğu + paralel yükleme testi */
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:8000';
let failures = [];
const ok = (c, l) => { console.log((c ? '  ✓ ' : '  ✗ ') + l); if (!c) failures.push(l); };

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const file = n => ({ name: n, mimeType: 'image/png', buffer: PNG });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 900 } })).newPage();
  page.on('pageerror', e => failures.push('pageerror: ' + e.message));

  let posted = [];
  await page.route(/^https:\/\/x\.test\/fake-exec/, route => {
    if (route.request().method() === 'POST') {
      posted.push(JSON.parse(route.request().postData()));
      setTimeout(() => route.fulfill({ contentType: 'application/json', body: '{"status":"ok"}' }), 250);
    } else {
      // Doğrulama listesi: gerçek sunucu gibi yüklenen uploadId'leri geri ver
      const cb = new URL(route.request().url()).searchParams.get('callback');
      const files = posted.map((b, i) => ({ id: 'f' + i, d: 'EventPhoto · UploadId: ' + b.uploadId }));
      route.fulfill({ contentType: 'application/javascript; charset=utf-8', body: `${cb}(${JSON.stringify({ status: 'ok', files })})` });
    }
  });

  await page.goto(BASE + '/upload.html?api=https://x.test/fake-exec&event=wedding&title=Test&token=tk');
  await page.waitForTimeout(600);

  ok(await page.locator('.task-chip').count() === 6, 'düğün: 6 görev çipi');
  await page.click('.task-chip:nth-child(2)'); // Dans pistinden bir kare
  ok(await page.locator('.task-chip.active').count() === 1, 'çip seçimi aktif');

  // Gönder çubuğu: foto yokken gizli, foto eklenince sayıyla belirir
  ok(!(await page.locator('#sendBar').isVisible()), 'foto yokken çubuk gizli');
  await page.setInputFiles('#galleryInput', [file('a.png'), file('b.png'), file('c.png')]);
  await page.waitForTimeout(400);
  ok(await page.locator('#sendBar').isVisible(), 'foto eklenince çubuk belirdi');
  ok((await page.textContent('#sendBarText')).includes('3'), 'çubukta sayı: ' + await page.textContent('#sendBarText'));
  ok((await page.textContent('#sendBarInfo')).includes('adınızı'), 'ad boşken ipucu: adınızı yazın');
  await page.screenshot({ path: 'shots/sendbar.png' });

  // Ad zorunlu: çubuktan boş adla gönderim engellenmeli
  await page.click('#sendBarBtn');
  await page.waitForTimeout(300);
  ok(posted.length === 0, 'ad boşken gönderim yapılmıyor');

  await page.fill('#guestName', 'Ayşe Teyze');
  await page.waitForTimeout(200);
  ok((await page.textContent('#sendBarInfo')).includes('hazır'), 'ad girilince ipucu değişti');
  await page.click('#sendBarBtn');
  await page.waitForTimeout(300);
  ok(!(await page.locator('#sendBar').isVisible()), 'gönderim sürerken çubuk gizli');
  await page.waitForTimeout(2500);

  ok(posted.length === 3, `3 fotoğraf paralel POST edildi (${posted.length})`);
  ok(posted.every(b => b.task === 'Dans pistinden bir kare'), 'her payload.task doğru');
  ok(posted.every(b => b.guestName === 'Ayşe Teyze' && b.token === 'tk'), 'payload isim + token doğru');
  ok(await page.locator('#successScreen').isVisible(), 'başarı ekranı');
  ok((await page.evaluate(() => localStorage.getItem('eventPhotoGuestName'))) === 'Ayşe Teyze',
     'ad gönderimde cihaza kaydedildi');

  // Aynı cihazda ikinci ziyaret: ad otomatik dolu gelmeli
  const pageB = await page.context().newPage();
  await pageB.goto(BASE + '/upload.html?api=x&event=wedding');
  await pageB.waitForTimeout(300);
  ok((await pageB.inputValue('#guestName')) === 'Ayşe Teyze', 'ad ikinci ziyarette hatırlanıyor');
  await page.context().close();

  // tasks=0 → çipler gizli
  const p3 = await (await browser.newContext()).newPage();
  await p3.goto(BASE + '/upload.html?api=x&event=wedding&tasks=0');
  await p3.waitForTimeout(300);
  ok(!(await p3.locator('#taskField').isVisible()), 'tasks=0 → görev alanı gizli');
  await browser.close();

  console.log(failures.length ? `\n${failures.length} BAŞARISIZ: ${failures.join(' | ')}` : '\nGÖREV + ÇUBUK TESTLERİ GEÇTİ ✓');
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error('Hata:', e); process.exit(2); });
