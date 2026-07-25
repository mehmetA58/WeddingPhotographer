/* Anı Defteri testi: not POST /api/note ile gider (JSON), yanıt gerçek okunur;
   galeri /api/list?notes=1 ile notları listeler. */
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:8000';
let failures = [];
const ok = (c, l) => { console.log((c ? '  ✓ ' : '  ✗ ') + l); if (!c) failures.push(l); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });

  // 1) Yükleme sayfasından yalnızca not gönder
  const page = await (await browser.newContext({ viewport: { width: 390, height: 900 } })).newPage();
  page.on('pageerror', e => failures.push('pageerror: ' + e.message));

  let noteReqs = [];
  await page.route('**/api/note*', route => {
    const body = JSON.parse(route.request().postData() || '{}');
    noteReqs.push(body);
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', type: 'note', noteId: body.noteId })
    });
  });

  await page.goto(BASE + '/upload.html?e=evt123&event=anniversary&title=10.%20Y%C4%B1l');
  await page.waitForTimeout(500);

  ok(await page.locator('#guestbook').isVisible(), 'Anı Defteri bölümü görünür');
  await page.click('#noteBtn');                       // boş: ne foto ne not
  await page.waitForTimeout(300);
  ok(noteReqs.length === 0, 'boş gönderim engelleniyor');

  await page.fill('#guestName', 'Fatma');
  await page.fill('#noteText', 'Nice mutlu senelere! Harika bir geceydi.');
  await page.screenshot({ path: 'shots/guestbook-form.png' });
  await page.click('#noteBtn');
  await page.waitForTimeout(800);
  ok(noteReqs.length === 1, 'not POST /api/note ile gönderildi');
  const q = noteReqs[0] || {};
  ok(q.message && q.message.includes('Nice mutlu') && q.guestName === 'Fatma' && !!q.noteId,
     'gövde: mesaj + isim + noteId');
  ok(await page.locator('#noteDone').isVisible(), 'teşekkür onayı görünür');
  ok((await page.inputValue('#noteText')) === '', 'textarea temizlendi');
  await page.context().close();

  // 1b) Sunucu hata dönerse kullanıcıya hata gösterilir (gerçek yanıt okunur)
  const ctxF = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const pF = await ctxF.newPage();
  pF.on('pageerror', e => failures.push('err pageerror: ' + e.message));
  await pF.route('**/api/note*', route => {
    route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'error', code: 'server_error', message: 'Not kaydedilemedi' })
    });
  });
  await pF.goto(BASE + '/upload.html?e=evt123&event=wedding');
  await pF.waitForTimeout(500);
  await pF.fill('#guestName', 'Zeynep');
  await pF.fill('#noteText', 'Sunucu hatası testi.');
  await pF.click('#noteBtn');
  await pF.waitForTimeout(800);
  ok(!(await pF.locator('#noteDone').isVisible()), 'hata durumunda başarı onayı gösterilmez');
  ok(await pF.locator('#noteStatus').isVisible() || await pF.locator('#statusNote').isVisible(),
     'hata mesajı gösterilir');
  await ctxF.close();

  // 2) Galeri: notlar listeleniyor
  const p2 = await (await browser.newContext({ viewport: { width: 800, height: 900 } })).newPage();
  p2.on('pageerror', e => failures.push('gallery pageerror: ' + e.message));
  await p2.route('**/api/list*', route => {
    const url = new URL(route.request().url());
    ok(url.searchParams.get('notes') === '1', 'galeri notes=1 istiyor');
    const body = { status: 'ok', count: 0, files: [], notes: [
      { g: 'Fatma', m: 'Nice mutlu senelere! Harika bir geceydi.', t: 2 },
      { g: '', m: 'Her şey çok güzeldi, emeğinize sağlık.', t: 1 }
    ]};
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  await p2.goto(BASE + '/gallery.html?e=evt123&k=key456&event=anniversary&title=10.%20Y%C4%B1l');
  await p2.waitForTimeout(800);
  ok(await p2.locator('#notesWrap').isVisible(), 'not bölümü görünür');
  ok((await p2.textContent('#notesSummary')).includes('2'), 'başlıkta not sayısı');
  await p2.click('#notesSummary');
  await p2.waitForTimeout(200);
  ok(await p2.locator('.note-card').count() === 2, '2 not kartı listelendi');
  ok((await p2.textContent('.note-card:first-child .note-by')) === '— Fatma', 'imza satırı doğru');
  await p2.screenshot({ path: 'shots/gallery-notes.png' });
  await p2.context().close();

  await browser.close();
  console.log(failures.length ? `\n${failures.length} BAŞARISIZ: ${failures.join(' | ')}` : '\nANI DEFTERİ TESTLERİ GEÇTİ ✓');
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error('Hata:', e); process.exit(2); });
