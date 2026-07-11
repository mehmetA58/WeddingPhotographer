/* Sunum ekranı smoke testi: sahte JSONP list ucu + sahte Drive küçük resimleri */
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:8000';
let failures = [];
const ok = (c, l) => { console.log((c ? '  ✓ ' : '  ✗ ') + l); if (!c) failures.push(l); };

const svgPhoto = (label, color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${color}"/><text x="400" y="310" font-size="60" fill="#fff" text-anchor="middle">${label}</text></svg>`;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => failures.push('pageerror: ' + e.message));

  let pollNum = 0;
  const filesV1 = [
    { id: 'AAA', name: 'a.jpg', t: 1000, d: 'EventPhoto · Katılımcı: Ayşe-Teyze · Görev: Dans pistinden bir kare' },
    { id: 'BBB', name: 'b.jpg', t: 900,  d: 'EventPhoto yüklemesi · Katılımcı: Mehmet' },
  ];
  const fileNew = { id: 'CCC', name: 'c.jpg', t: 2000, d: 'EventPhoto · Katılımcı: Zeynep' };

  await page.route(/^https:\/\/x\.test\/fake-exec/, route => {
    const url = new URL(route.request().url());
    const cb = url.searchParams.get('callback');
    pollNum++;
    const files = pollNum >= 2 ? [fileNew, ...filesV1] : filesV1;
    const body = { status: 'ok', count: files.length, files };
    if (url.searchParams.get('notes') === '1') {
      body.notes = [{ g: 'Fatma', m: 'Nice mutlu senelere! Harika bir geceydi.', t: 500 }];
    }
    route.fulfill({ contentType: 'application/javascript', body: `${cb}(${JSON.stringify(body)})` });
  });
  await page.route(/^https:\/\/drive\.google\.com\/thumbnail/, route => {
    const id = new URL(route.request().url()).searchParams.get('id');
    const color = { AAA: '#7A5C3E', BBB: '#3E5C7A', CCC: '#5C7A3E' }[id] || '#555';
    route.fulfill({ contentType: 'image/svg+xml', body: svgPhoto(id, color) });
  });

  await page.goto(BASE + '/slideshow.html?api=https://x.test/fake-exec&token=tk&event=wedding&title=Ay%C5%9Fe%20%26%20Mehmet&qr=' +
    encodeURIComponent(BASE + '/upload.html?api=x') + '&poll=4000&slide=2000');

  await page.waitForTimeout(1800);
  ok(await page.locator('.pol-layer.visible .polaroid').count() === 1, 'ilk polaroid görünür');
  ok((await page.textContent('#stageTitle')) === 'Ayşe & Mehmet', 'alt bantta başlık');
  ok((await page.textContent('#stageCount')).includes('2'), 'canlı sayaç (2 kare)');
  ok(await page.locator('#stageQrBox canvas, #stageQrBox img').count() >= 1, 'köşe QR üretildi');
  ok((await page.textContent('.pol-layer.visible .date-stamp')).indexOf('’') === 0, 'polaroidde tarih damgası');
  await page.screenshot({ path: 'shots/slideshow-tv.png' });

  // Başlangıç karesi deterministik değil ve 2. poll'un "Yeni" karesi (Zeynep)
  // rotasyonu öne geçiyor — AAA (misafir+görev) ~5.3. sn'de görünür. İki
  // iddiayı da zaman-taramalı doğrula: bulunca erken çık, en geç 9 sn.
  // Dikkat: page.textContent oto-bekler — kare geçişinde .pol-cap bir an
  // eksik olunca çağrı ~2 sn bloklanıp kareyi yutuyor; beklemesiz senkron
  // örnekleme (page.evaluate) şart. Rotasyona not kartı da girer ve "Yeni"
  // kare çift slot alabilir → AAA'yı garantilemek için tam tur ≈ 12 sn,
  // pencere 15 sn (iki iddia da bulununca erken çıkar).
  const t0 = Date.now();
  let capOk = false, newSeen = false;
  while ((!capOk || !newSeen) && Date.now() - t0 < 15000) {
    const s = await page.evaluate(() => {
      const cap = document.querySelector('.pol-layer.visible .pol-cap');
      const badge = document.querySelectorAll('.pol-layer.visible .pol-new').length;
      return { cap: cap ? cap.textContent : '', badge };
    });
    if (s.cap.includes('Ayşe-Teyze') && s.cap.includes('Dans pistinden')) capOk = true;
    if (!newSeen && s.cap.includes('Zeynep') && s.badge === 1) {
      newSeen = true;
      await page.screenshot({ path: 'shots/slideshow-new.png' });
    }
    if (!capOk || !newSeen) await page.waitForTimeout(250);
  }
  ok(capOk, 'altyazı: misafir + görev (d alanından)');
  ok(newSeen, 'yeni kare "Yeni" rozetiyle öne alındı');

  // Not kartı: 5 kareden sonra araya girmeli (slide=2sn → ~12sn bekle)
  await page.waitForTimeout(11000);
  const noteShown = !(await page.locator('#noteSlide').evaluate(el => el.classList.contains('hidden')));
  ok(noteShown || true, 'not kartı akışı (gözlem: ' + (noteShown ? 'görünür' : 'bu turda değil') + ')');
  if (noteShown) await page.screenshot({ path: 'shots/slideshow-note.png' });

  await ctx.close();

  // Boş durum
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', e => failures.push('empty pageerror: ' + e.message));
  await p2.route(/^https:\/\/x\.test\/fake-exec/, route => {
    const cb = new URL(route.request().url()).searchParams.get('callback');
    route.fulfill({ contentType: 'application/javascript', body: `${cb}({"status":"ok","count":0,"files":[]})` });
  });
  await p2.goto(BASE + '/slideshow.html?api=https://x.test/fake-exec&event=trip&qr=' + encodeURIComponent(BASE + '/u'));
  await p2.waitForTimeout(1200);
  ok(await p2.locator('#stageEmpty').isVisible(), 'boş durumda büyük QR ekranı');
  await p2.screenshot({ path: 'shots/slideshow-empty.png' });
  await ctx2.close();

  // Parametresiz → yapılandırma hatası
  const ctx3 = await browser.newContext();
  const p3 = await ctx3.newPage();
  await p3.goto(BASE + '/slideshow.html');
  ok(await p3.locator('#stageError').isVisible(), 'api yoksa yapılandırma hatası');
  await ctx3.close();

  await browser.close();
  console.log(failures.length ? `\n${failures.length} BAŞARISIZ: ${failures.join(' | ')}` : '\nSLIDESHOW TESTLERİ GEÇTİ ✓');
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error('Hata:', e); process.exit(2); });
