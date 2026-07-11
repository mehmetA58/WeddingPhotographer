const { chromium } = require('playwright-core');
const BASE = 'http://localhost:8000';
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  // Mobil: upload (kartpostal görünümü + airmail)
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  await m.goto(BASE + '/upload.html?api=https://x.test/e&event=wedding&title=Ay%C5%9Fe%20%26%20Mehmet');
  await m.waitForTimeout(1600);
  await m.screenshot({ path: 'shots/new-upload.png' });
  // Başarı ekranı + postmark: JS ile aç
  await m.evaluate(() => {
    document.getElementById('uploader').classList.add('hidden');
    document.getElementById('successScreen').classList.remove('hidden');
  });
  await m.waitForTimeout(300);
  await m.screenshot({ path: 'shots/new-success.png' });
  await m.context().close();
  // Davetiye: zarf + kart
  const i = await (await b.newContext({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 2 })).newPage();
  const d = Buffer.from(JSON.stringify({ t: 'Ayşe & Mehmet', e: 'wedding', d: '2026-08-15', h: '17:00', ve: 'Bahçe Teras', a: 'Çengelköy, İstanbul' })).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  await i.goto(BASE + '/invite.html#d=' + d);
  await i.waitForTimeout(1800);
  await i.screenshot({ path: 'shots/new-invite-env.png' });
  await i.locator('.envelope').click().catch(() => {});
  await i.waitForTimeout(2000);
  await i.screenshot({ path: 'shots/new-invite-card.png', fullPage: true });
  await i.context().close();
  // Landing hero masaüstü
  const l = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await l.goto(BASE + '/index.html');
  await l.waitForTimeout(1800);
  await l.screenshot({ path: 'shots/new-landing.png' });
  await l.context().close();
  await b.close();
  console.log('OK');
})().catch(e => { console.error(e); process.exit(1); });
