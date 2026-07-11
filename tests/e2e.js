/* Headless doğrulama: sayfalar hatasız yükleniyor mu, etkinlik teması
   (data-event + zemin tonu + theme-color + metinler) uygulanıyor mu,
   manuel Web App URL akışı ve QR üretimi çalışıyor mu. */
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:8000';
const SHOT = __dirname + '/shots';
require('fs').mkdirSync(SHOT, { recursive: true });

let failures = [];
const ok = (cond, label) => {
  console.log((cond ? '  ✓ ' : '  ✗ ') + label);
  if (!cond) failures.push(label);
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });

  async function newPage(name) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // iPhone boyutu
    const page = await ctx.newPage();
    page._errors = [];
    page.on('pageerror', e => page._errors.push(name + ': ' + e.message));
    return page;
  }

  /* ---- 1. upload.html: gezi konsepti ---- */
  let p = await newPage('upload-trip');
  await p.goto(BASE + '/upload.html?api=https://example.com/exec&event=trip&title=Kapadokya%202026');
  await p.waitForTimeout(600);
  ok((await p.getAttribute('html', 'data-event')) === 'trip', 'upload: data-event=trip');
  const cream = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--cream').trim());
  ok(cream.toUpperCase() === '#E9F3F2', `upload: gezi zemin tonu (--cream=${cream})`);
  const themeColor = await p.evaluate(() => document.querySelector('meta[name="theme-color"]').content);
  ok(themeColor.toUpperCase() === '#E9F3F2', `upload: theme-color senkron (${themeColor})`);
  ok((await p.textContent('#welcomeLine')).includes('Gezimize'), 'upload: gezi karşılama metni');
  ok((await p.textContent('#coupleTitle')) === 'Kapadokya 2026', 'upload: başlık görünüyor');
  await p.screenshot({ path: SHOT + '/upload-trip.png' });
  ok(p._errors.length === 0, 'upload-trip: JS hatası yok' + (p._errors[0] ? ' — ' + p._errors[0] : ''));
  await p.context().close();

  /* ---- 2. upload.html: düğün + "&" isim yığını ---- */
  p = await newPage('upload-wedding');
  await p.goto(BASE + '/upload.html?api=https://example.com/exec&event=wedding&title=Ay%C5%9Fe%20%26%20Mehmet');
  await p.waitForTimeout(400);
  ok((await p.getAttribute('html', 'data-event')) === 'wedding', 'upload: data-event=wedding');
  ok(await p.locator('#coupleTitle .amp').count() === 1, 'upload: & isim yığını (amp span)');
  ok((await p.textContent('#welcomeLine')).includes('mutlu gününe'), 'upload: düğün karşılama metni');
  await p.screenshot({ path: SHOT + '/upload-wedding.png' });
  ok(p._errors.length === 0, 'upload-wedding: JS hatası yok');
  await p.context().close();

  /* ---- 3. upload.html: parametresiz → config hatası + varsayılan düğün ---- */
  p = await newPage('upload-bare');
  await p.goto(BASE + '/upload.html');
  await p.waitForTimeout(300);
  ok((await p.getAttribute('html', 'data-event')) === 'wedding', 'upload: varsayılan=wedding');
  ok(await p.locator('#configError').isVisible(), 'upload: configError görünür');
  ok(!(await p.locator('#uploader').isVisible()), 'upload: uploader gizli');
  ok(p._errors.length === 0, 'upload-bare: JS hatası yok');
  await p.context().close();

  /* ---- 4. setup.html: ızgara, konsept seçimi, manuel URL, QR ---- */
  p = await newPage('setup');
  await p.goto(BASE + '/setup.html');
  await p.waitForTimeout(600);
  ok(await p.locator('.concept-card').count() === 9, 'setup: 9 etkinlik kartı');
  ok((await p.textContent('#eventLabel')).trim() === '1 · Etkinlik Türü', 'setup: etiket "1 · Etkinlik Türü"');
  ok((await p.textContent('#eventTitleLabel')).trim().indexOf('2 · ') === 0, 'setup: başlık etiketi "2 · …"');
  ok(await p.locator('#generateBtn').isDisabled(), 'setup: başta üret butonu kapalı');

  // Doğum günü konseptini seç
  await p.click('.concept-card[data-key="birthday"]');
  await p.waitForTimeout(200);
  ok((await p.getAttribute('html', 'data-event')) === 'birthday', 'setup: seçim → data-event=birthday');
  const bCream = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--cream').trim());
  ok(bCream.toUpperCase() === '#F6EBE0', `setup: doğum günü zemin tonu (${bCream})`);
  const bTheme = await p.evaluate(() => document.querySelector('meta[name="theme-color"]').content);
  ok(bTheme.toUpperCase() === '#F6EBE0', 'setup: seçimde theme-color güncellendi');
  ok((await p.textContent('#eventTitleLabel')).includes('kimin doğum günü'), 'setup: başlık etiketi etkinliğe uydu');

  // Manuel Web App URL → buton açılır
  await p.click('details.advanced summary');
  await p.fill('#manualApi', 'not-a-url');
  ok(await p.locator('#generateBtn').isDisabled(), 'setup: geçersiz URL → buton kapalı');
  await p.fill('#manualApi', 'https://script.google.com/macros/s/TEST123/exec');
  ok(await p.locator('#generateBtn').isEnabled(), 'setup: geçerli URL → buton açık');

  // QR üret
  await p.fill('#eventTitle', 'Ayşe’nin 30. Yaşı');
  await p.click('#generateBtn');
  await p.waitForTimeout(600);
  ok(await p.locator('#result').isVisible(), 'setup: sonuç bölümü açıldı');
  ok(await p.locator('#qrHolder canvas, #qrHolder img').count() >= 1, 'setup: QR üretildi');
  const caption = await p.textContent('#qrCaption');
  ok(caption === 'Ayşe’nin 30. Yaşı', `setup: QR başlığında baştaki boşluk yok ("${caption}")`);
  const link = await p.textContent('#linkText');
  ok(link.includes('event=birthday') && link.includes('api=https%3A%2F%2Fscript.google.com'), 'setup: linkte event + manuel api parametresi');
  const galleryLink = await p.textContent('#galleryLinkText');
  ok(galleryLink.includes('event=birthday'), 'setup: galeri linkinde event parametresi');
  await p.screenshot({ path: SHOT + '/setup-result.png' });
  ok(p._errors.length === 0, 'setup: JS hatası yok' + (p._errors[0] ? ' — ' + p._errors[0] : ''));
  await p.context().close();

  /* ---- 5. setup.html: İngilizce ---- */
  p = await newPage('setup-en');
  await p.goto(BASE + '/setup.html?lang=en');
  await p.waitForTimeout(500);
  ok((await p.textContent('#eventLabel')).trim() === '1 · Event Type', 'setup EN: "1 · Event Type"');
  ok((await p.textContent('.concept-card[data-key="trip"] .ce-name')) === 'Trip', 'setup EN: kart adı İngilizce');
  ok(p._errors.length === 0, 'setup-en: JS hatası yok');
  await p.context().close();

  /* ---- 6. gallery.html: doğum günü teması ---- */
  p = await newPage('gallery');
  await p.goto(BASE + '/gallery.html?api=' + encodeURIComponent(BASE + '/fake') + '&event=birthday&title=Ay%C5%9Fe');
  await p.waitForTimeout(800);
  ok((await p.getAttribute('html', 'data-event')) === 'birthday', 'gallery: data-event=birthday');
  ok((await p.textContent('#galleryTitle')) === 'Ayşe', 'gallery: başlık parametreden');
  ok(p._errors.length === 0, 'gallery: JS hatası yok' + (p._errors[0] ? ' — ' + p._errors[0] : ''));
  await p.context().close();

  /* ---- 7. card.html: romantik tema, 4 kart ---- */
  p = await newPage('card');
  const uploadUrl = BASE + '/upload.html?api=x&event=romantic&title=Y%C4%B1ld%C3%B6n%C3%BСm%C3%BC';
  await p.goto(BASE + '/card.html?data=' + encodeURIComponent(uploadUrl) + '&event=romantic&title=Y%C4%B1ld%C3%B6n%C3%BCm%C3%BC%20Yeme%C4%9Fi');
  await p.waitForTimeout(700);
  ok((await p.getAttribute('html', 'data-event')) === 'romantic', 'card: data-event=romantic');
  ok(await p.locator('.pcard').count() === 4, 'card: 4 kart döşendi');
  ok(await p.locator('.pcard .pc-qr').count() === 4, 'card: her kartta QR var');
  ok((await p.textContent('.pcard .pc-couple')) === 'Yıldönümü Yemeği', 'card: başlık doğru');
  ok(p._errors.length === 0, 'card: JS hatası yok' + (p._errors[0] ? ' — ' + p._errors[0] : ''));
  await p.context().close();

  /* ---- 8. Farklı temaların ekran görüntüleri (görsel kontrol) ---- */
  for (const ev of ['romantic', 'meeting', 'welcome']) {
    p = await newPage('shot-' + ev);
    await p.goto(BASE + '/upload.html?api=https://example.com/exec&event=' + ev + '&title=Deneme');
    await p.waitForTimeout(500);
    await p.screenshot({ path: SHOT + '/upload-' + ev + '.png' });
    await p.context().close();
  }

  await browser.close();
  console.log(failures.length ? `\n${failures.length} BAŞARISIZ` : '\nTÜM TESTLER GEÇTİ ✓');
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error('Çalıştırma hatası:', e); process.exit(2); });
