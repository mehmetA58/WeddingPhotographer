/* Davetiye testi: oluşturucu → link round-trip → zarf → kart → ICS/PNG/LCV */
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = 'http://localhost:8000';
let failures = [];
const ok = (c, l) => { console.log((c ? '  ✓ ' : '  ✗ ') + l); if (!c) failures.push(l); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });

  /* ---- 1) Oluşturucu ---- */
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => failures.push('builder pageerror: ' + e.message));

  await page.goto(BASE + '/invite.html');
  await page.waitForTimeout(600);
  ok(await page.locator('#inviteBuilder').isVisible(), 'oluşturucu modu açıldı');
  ok(await page.locator('#invConceptGrid .concept-card').count() === 9, '9 etkinlik kartı');

  await page.click('.concept-card[data-key="wedding"]');
  await page.fill('#invTitleIn', 'Ayşe & Mehmet');
  await page.fill('#invDateIn', '2026-09-12');
  await page.fill('#invTimeIn', '17:00');
  await page.fill('#invVenueIn', 'Beyaz Bahçe');
  await page.fill('#invAddrIn', 'Çeşme, İzmir');
  await page.fill('#invMsgIn', 'Bu özel günümüzü sizinle paylaşmak bizi çok mutlu eder.');
  await page.fill('#invPhoneIn', '0555 111 22 33');
  await page.waitForTimeout(400);

  // canlı önizleme
  const prev = await page.textContent('#previewCard');
  ok(prev.includes('Düğünümüze Davetlisiniz') && prev.includes('Ayşe') && prev.includes('Beyaz Bahçe'),
     'canlı önizleme doluyor');
  ok(await page.locator('#previewCard .amp').count() === 1, 'önizlemede & isim yığını');
  ok(prev.includes('12') && prev.toLowerCase().includes('eylül'), 'tarih bloğu (12 Eylül)');
  ok(prev.includes('gün kaldı') || prev.includes('Bugün'), 'geri sayım satırı');
  await page.screenshot({ path: 'shots/invite-builder.png', fullPage: true });

  const link = await page.textContent('#invLinkText');
  ok(link.includes('#d='), 'link #d= paketi taşıyor');
  ok(!link.includes('api=') && !link.includes('token='), 'linkte api/token YOK (gizlilik)');

  // PNG indirme
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.click('#invPngBtn')
  ]);
  const pngPath = '/tmp/davetiye-test.png';
  await dl.saveAs(pngPath);
  const size = fs.statSync(pngPath).size;
  ok(dl.suggestedFilename() === 'davetiye.png' && size > 30000, `PNG indirildi (${Math.round(size / 1024)} KB)`);
  await ctx.close();

  /* ---- 2) Round-trip: link → görüntüleme ---- */
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', e => failures.push('view pageerror: ' + e.message));
  await p2.goto(link);
  await p2.waitForTimeout(600);

  ok(await p2.locator('#envelope').isVisible(), 'zarf görünüyor');
  ok((await p2.textContent('#envSeal')) === 'A·M', 'mühürde baş harfler (A·M)');
  ok((await p2.textContent('#envTo')).includes('Ayşe'), 'zarfın üzerinde isimler');
  ok(!(await p2.locator('#inviteCard').isVisible()), 'kart henüz kapalı');
  await p2.screenshot({ path: 'shots/invite-envelope.png' });

  await p2.click('#envelope');
  await p2.waitForTimeout(1500);
  ok(await p2.locator('#inviteCard').isVisible(), 'zarf açıldı, kart göründü');
  const card = await p2.textContent('#inviteCard');
  ok(card.includes('Beyaz Bahçe') && card.includes('Çeşme') && card.includes('mutlu eder'),
     'kart içeriği tam (round-trip)');
  ok((await p2.title()).includes('Ayşe & Mehmet'), 'sekme başlığı kişisel');

  // Aksiyonlar
  ok((await p2.getAttribute('#mapBtn', 'href')).includes('maps.google.com'), 'Haritada Aç linki');
  const rsvp = await p2.getAttribute('#rsvpBtn', 'href');
  ok(rsvp.startsWith('https://wa.me/905551112233'), `LCV wa.me linki (${rsvp.slice(0, 32)}…)`);
  const [icsDl] = await Promise.all([
    p2.waitForEvent('download', { timeout: 10000 }),
    p2.click('#icsBtn')
  ]);
  const icsPath = '/tmp/davetiye-test.ics';
  await icsDl.saveAs(icsPath);
  const ics = fs.readFileSync(icsPath, 'utf8');
  ok(ics.includes('DTSTART:20260912T170000') && ics.includes('SUMMARY:') && ics.includes('LOCATION:'),
     'ICS içeriği doğru (DTSTART/SUMMARY/LOCATION)');
  await p2.screenshot({ path: 'shots/invite-card.png', fullPage: true });
  await ctx2.close();

  /* ---- 3) Reduced motion: zarf atlanır ---- */
  const ctx3 = await browser.newContext({ reducedMotion: 'reduce' });
  const p3 = await ctx3.newPage();
  await p3.goto(link);
  await p3.waitForTimeout(400);
  ok(!(await p3.locator('#envelope').isVisible()), 'reduced-motion: zarf yok');
  ok(await p3.locator('#inviteCard').isVisible(), 'reduced-motion: kart doğrudan açık');
  await ctx3.close();

  /* ---- 4) Bozuk link → hata + oluşturucu ---- */
  const ctx4 = await browser.newContext();
  const p4 = await ctx4.newPage();
  await p4.goto(BASE + '/invite.html#d=bozukVERI!!!');
  await p4.waitForTimeout(400);
  ok(await p4.locator('#inviteError').isVisible(), 'bozuk pakette hata notu');
  ok(await p4.locator('#inviteBuilder').isVisible(), 'bozuk pakette oluşturucu da açılıyor');
  await ctx4.close();

  /* ---- 5) EN dili round-trip + gezi teması ---- */
  const ctx5 = await browser.newContext();
  const p5 = await ctx5.newPage();
  await p5.goto(BASE + '/invite.html');
  await p5.waitForTimeout(500);
  await p5.selectOption('#invLangSel', 'en');
  await p5.click('.concept-card[data-key="trip"]');
  await p5.fill('#invTitleIn', 'Cappadocia 2026');
  await p5.fill('#invDateIn', '2026-10-03');
  await p5.waitForTimeout(300);
  const enLink = await p5.textContent('#invLinkText');
  const p5b = await ctx5.newPage();
  await p5b.goto(enLink);
  await p5b.waitForTimeout(500);
  await p5b.click('#envelope');
  await p5b.waitForTimeout(1400);
  const enCard = await p5b.textContent('#inviteCard');
  ok(enCard.includes('Join Us on Our Trip') && enCard.toLowerCase().includes('october'),
     'EN + gezi: headline ve ay adı İngilizce');
  ok((await p5b.getAttribute('html', 'data-event')) === 'trip', 'görüntülemede tema=trip');
  await ctx5.close();

  /* ---- 6) Boş form paylaşımı engellenir ---- */
  const ctx6 = await browser.newContext();
  const p6 = await ctx6.newPage();
  await p6.goto(BASE + '/invite.html');
  await p6.waitForTimeout(400);
  await p6.click('#invCopyBtn');
  await p6.waitForTimeout(200);
  ok(await p6.locator('#invShareNote').isVisible(), 'başlık/tarih yokken uyarı gösteriliyor');
  await ctx6.close();

  await browser.close();
  console.log(failures.length ? `\n${failures.length} BAŞARISIZ: ${failures.join(' | ')}` : '\nDAVETİYE TESTLERİ GEÇTİ ✓');
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error('Hata:', e); process.exit(2); });
