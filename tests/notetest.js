/* Anı Defteri testi: not POST (type=note) ile gider, JSONP list ile doğrulanır */
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:8000';
let failures = [];
const ok = (c, l) => { console.log((c ? '  ✓ ' : '  ✗ ') + l); if (!c) failures.push(l); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });

  // 1) Yükleme sayfasından yalnızca not gönder
  const page = await (await browser.newContext({ viewport: { width: 390, height: 900 } })).newPage();
  page.on('pageerror', e => failures.push('pageerror: ' + e.message));
  // Yeni akış: not, metni URL'e yazmamak için POST ile gider; sonra JSONP list
  // ile noteId doğrulanır. Sunucu, doğrulama listesinde notu id ile geri verir.
  let noteReqs = [];
  await page.route(/^https:\/\/x\.test\/fake-exec/, route => {
    const req = route.request();
    const url = new URL(req.url());
    const cb = url.searchParams.get('callback');
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData());
      if (body.type === 'note') noteReqs.push(body);
      route.fulfill({ contentType: 'application/json', body: '{"status":"ok"}' });
    } else {
      const notes = noteReqs.map(n => ({ g: n.guestName, m: n.message, id: n.noteId, t: Date.now() }));
      route.fulfill({ contentType: 'application/javascript; charset=utf-8', body: `${cb}(${JSON.stringify({ status: 'ok', files: [], notes })})` });
    }
  });
  await page.goto(BASE + '/upload.html?api=https://x.test/fake-exec&event=anniversary&title=10.%20Y%C4%B1l&token=tk');
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
  ok(noteReqs.length === 1, 'not POST (type=note) ile gönderildi');
  const q = noteReqs[0] || {};
  ok(q.message && q.message.includes('Nice mutlu') && q.guestName === 'Fatma' && q.token === 'tk',
     'parametreler: mesaj + isim + token');
  ok(await page.locator('#noteDone').isVisible(), 'teşekkür onayı görünür');
  ok((await page.inputValue('#noteText')) === '', 'textarea temizlendi');
  await page.context().close();

  // 1b) JSONP kırık ("Betik hatası" senaryosu) → not otomatik POST'a düşer
  const ctxF = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const pF = await ctxF.newPage();
  pF.on('pageerror', e => failures.push('fallback pageerror: ' + e.message));
  let fallbackPost = null;
  await pF.route(/^https:\/\/x\.test\/fake-exec/, route => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'POST') {
      fallbackPost = JSON.parse(route.request().postData());
      route.fulfill({ contentType: 'application/json', body: '{"status":"ok"}' });
    } else if (url.searchParams.get('action') === 'note') {
      route.abort(); // betik yüklenemiyor → jsonp onerror
    } else {
      const cb = url.searchParams.get('callback');
      route.fulfill({ contentType: 'application/javascript; charset=utf-8', body: `${cb}({"status":"ok"})` });
    }
  });
  await pF.goto(BASE + '/upload.html?api=https://x.test/fake-exec&event=wedding&token=tk');
  await pF.waitForTimeout(500);
  await pF.fill('#guestName', 'Zeynep');
  await pF.fill('#noteText', 'Betik hatası testi — bu not yine de ulaşmalı.');
  await pF.click('#noteBtn');
  await pF.waitForTimeout(1200);
  ok(!!fallbackPost && fallbackPost.type === 'note' && fallbackPost.message.includes('ulaşmalı'),
     'JSONP kırıkken not POST yoluna düştü');
  ok(await pF.locator('#noteDone').isVisible(), 'kullanıcı başarı onayı gördü');
  ok(!(await pF.locator('#noteStatus').isVisible()) && !(await pF.locator('#statusNote').isVisible()),
     'hata alanları gizli — "Betik hatası" ekrana sızmıyor');
  await ctxF.close();

  // 2) Galeri: notlar listeleniyor
  const p2 = await (await browser.newContext({ viewport: { width: 800, height: 900 } })).newPage();
  p2.on('pageerror', e => failures.push('gallery pageerror: ' + e.message));
  await p2.route(/^https:\/\/x\.test\/fake-exec/, route => {
    const url = new URL(route.request().url());
    const cb = url.searchParams.get('callback');
    ok(url.searchParams.get('notes') === '1', 'galeri notes=1 istiyor');
    const body = { status: 'ok', count: 0, files: [], notes: [
      { g: 'Fatma', m: 'Nice mutlu senelere! Harika bir geceydi.', t: 2 },
      { g: '', m: 'Her şey çok güzeldi, emeğinize sağlık.', t: 1 }
    ]};
    route.fulfill({ contentType: 'application/javascript; charset=utf-8', body: `${cb}(${JSON.stringify(body)})` });
  });
  await p2.goto(BASE + '/gallery.html?api=https://x.test/fake-exec&event=anniversary&title=10.%20Y%C4%B1l&token=tk');
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
