/* Landing varlık üretimi: gerçek sayfalardan 2x ekran görüntüleri + OG görseli.
   Koşum: python3 -m http.server 8000 (proje kökünde) açıkken
          cd tests && node makeassets.js
   Çıktı: tests/raw/*.png  →  sonra sips ile assets/*.jpg (bkz. script sonu yorum) */
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = 'http://localhost:8000';
const RAW = __dirname + '/raw';
fs.mkdirSync(RAW, { recursive: true });

const b64url = o => Buffer.from(JSON.stringify(o), 'utf8').toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });

  async function shot(name, path, vp, opts = {}) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    if (opts.mock) await opts.mock(p);
    await p.goto(BASE + '/' + path);
    await p.waitForTimeout(opts.wait || 1400);
    if (opts.prep) await opts.prep(p);
    if (opts.el) {
      await p.locator(opts.el).screenshot({ path: `${RAW}/${name}.png` });
    } else {
      await p.screenshot({ path: `${RAW}/${name}.png`, clip: opts.clip });
    }
    await ctx.close();
    console.log('✓', name);
  }

  // JSONP + thumbnail mock'u (galeri/sunum için demo SVG kareleri)
  const demoIds = ['gun-batimi', 'dans-pisti', 'pasta', 'kadeh', 'isiklar', 'manzara', 'konfeti', 'sahil'];
  const listMock = (withMeta) => async (p) => {
    await p.route(/^https:\/\/x\.test\//, r => {
      const cb = new URL(r.request().url()).searchParams.get('callback');
      const guests = ['Ayşe Teyze', 'Mehmet Amca', 'Deniz', 'Zeynep', 'Elif', 'Can', 'Fatma', 'Ali'];
      const files = demoIds.map((id, i) => ({
        id, name: id + '.jpg', t: Date.now() - i * 90000,
        d: 'EventPhoto · Katılımcı: ' + guests[i] + (withMeta && i === 0 ? ' · Görev: Dans pistinden bir kare' : '')
      }));
      const body = { status: 'ok', count: files.length, files,
        notes: [{ g: 'Fatma', m: 'Nice mutlu senelere! Harika bir geceydi.', t: 1 }] };
      r.fulfill({ contentType: 'application/javascript; charset=utf-8', body: `${cb}(${JSON.stringify(body)})` });
    });
    await p.route(/^https:\/\/drive\.google\.com\/thumbnail/, async r => {
      const id = new URL(r.request().url()).searchParams.get('id');
      const svg = fs.readFileSync('/Users/mehmet/Desktop/WeddingPhoto/assets/demo/' + id + '.svg');
      r.fulfill({ contentType: 'image/svg+xml', body: svg });
    });
  };

  /* --- Telefon ekranları: 390×844 @2x → 780×1688, üstten 1600 kırp --- */
  const phoneClip = { x: 0, y: 0, width: 390, height: 800 };
  await shot('shot-phone-wedding', 'upload.html?api=https://x.test/e&event=wedding&title=Ay%C5%9Fe%20%26%20Mehmet',
    { width: 390, height: 844 }, { clip: phoneClip, mock: listMock() });
  await shot('shot-phone-birthday', 'upload.html?api=https://x.test/e&event=birthday&title=Deniz%205%20Ya%C5%9F%C4%B1nda',
    { width: 390, height: 844 }, { clip: phoneClip, mock: listMock() });
  await shot('shot-phone-trip', 'upload.html?api=https://x.test/e&event=trip&title=Kapadokya%20Gezisi',
    { width: 390, height: 844 }, { clip: phoneClip, mock: listMock() });

  /* --- Kurulum: 480×820 @2x → 960×1640 --- */
  await shot('shot-setup', 'setup.html', { width: 480, height: 820 });

  /* --- Sunum: 800×450 @2x → 1600×900 (polaroid görünene dek bekle) --- */
  await shot('shot-slideshow', 'slideshow.html?demo=1&event=wedding&title=Ay%C5%9Fe%20%26%20Mehmet&slide=3500',
    { width: 800, height: 450 }, { wait: 4200 });

  /* --- Anı Defteri bölümü: eleman görüntüsü (350px genişlik @2x = 700) --- */
  await shot('shot-guestbook', 'upload.html?api=https://x.test/e&event=anniversary&title=10.%20Y%C4%B1l',
    { width: 350, height: 900 }, {
      el: '#guestbook', mock: listMock(),
      prep: async p => { await p.fill('#noteText', 'Nice mutlu senelere! Bu gece harikaydı…'); }
    });

  /* --- Davetiye: kart + zarf --- */
  const inv = b64url({ t: 'Ayşe & Mehmet', e: 'wedding', d: '2026-08-15', h: '17:00',
    ve: 'Bahçe Teras', a: 'Çengelköy, İstanbul' });
  await shot('shot-invite-envelope', 'invite.html#d=' + inv, { width: 400, height: 640 },
    { wait: 1600, el: '.envelope' });
  await shot('shot-invite-card', 'invite.html#d=' + inv, { width: 380, height: 900 }, {
    wait: 1200,
    prep: async p => { await p.locator('.envelope').click().catch(() => {}); await p.waitForTimeout(1800); },
    el: '#inviteCard'
  });

  /* --- Galeri: 640×565 @2x → 1280×1130 --- */
  await shot('shot-gallery', 'gallery.html?api=https://x.test/e&event=wedding&title=Ay%C5%9Fe%20%26%20Mehmet&token=t',
    { width: 640, height: 565 }, { wait: 2000, mock: listMock(true) });

  /* --- OG görseli: 1200×630 kompozisyon --- */
  const og = `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=Inter:wght@400;500;600&family=Caveat:wght@500;600&family=Courier+Prime:wght@700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${BASE}/css/style.css">
  <style>
    body { margin:0; width:1200px; height:630px; overflow:hidden;
           background: linear-gradient(180deg,#FBF6EC,#F1E5CF); position:relative; }
    .airmail-og { position:absolute; top:0; left:0; right:0; height:14px; border-radius:0;
      background: repeating-linear-gradient(-45deg,#BF3F34 0 18px,#FFFDF7 18px 36px,#29508C 36px 54px,#FFFDF7 54px 72px); }
    .wrap { position:absolute; left:70px; top:150px; width:600px; }
    h1 { font: 700 74px/1.04 "Bricolage Grotesque"; color:#33302A; margin:0 0 18px; letter-spacing:-.02em; }
    h1 em { font-style:normal; color:#29508C; }
    p { font: 500 26px/1.5 Inter; color:#6C6353; margin:0 0 26px; }
    .brand { font: 700 20px "Courier Prime"; letter-spacing:.18em; color:#BF3F34; text-transform:uppercase; }
    .pol { position:absolute; right:90px; top:110px; width:300px; background:#FFFDF7; padding:12px 12px 44px;
           box-shadow:0 30px 60px -25px rgba(55,43,30,.55); transform:rotate(4deg); }
    .pol img { display:block; width:100%; }
    .pol span { position:absolute; bottom:10px; left:0; right:0; text-align:center;
                font:600 26px Caveat; color:#4A4238; }
    .pm { position:absolute; right:52px; top:64px; width:104px; height:104px; border:3px solid #6C6353;
          border-radius:50%; display:grid; place-items:center; font:700 15px/1.3 "Courier Prime";
          color:#6C6353; text-align:center; transform:rotate(-10deg); opacity:.75; }
  </style></head><body>
    <div class="airmail-og"></div>
    <div class="wrap">
      <div class="brand">EventPhoto</div>
      <h1>Anılar <em>birlikte</em> birikir.</h1>
      <p>Misafirler QR okutur, fotoğraflar anında ortak albümde. Üyeliksiz, ücretsiz, kendi Drive'ınızda.</p>
    </div>
    <div class="pol"><img src="${BASE}/assets/demo/gun-batimi.svg" alt=""><span>ilk dans…</span></div>
    <div class="pm">15<br>AĞU<br>2026</div>
  </body></html>`;
  fs.writeFileSync(RAW + '/og-compose.html', og);
  {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 } });
    const p = await ctx.newPage();
    await p.goto('file://' + RAW + '/og-compose.html');
    await p.waitForTimeout(2200);
    await p.screenshot({ path: RAW + '/og.png' });
    await ctx.close();
    console.log('✓ og');
  }

  await browser.close();
  console.log('\nPNG üretimi bitti → sips dönüşümü:');
  console.log('  cd tests/raw && for f in shot-*.png og.png; do sips -s format jpeg -s formatOptions 82 "$f" --out "../../assets/${f%.png}.jpg"; done');
})().catch(e => { console.error('Hata:', e); process.exit(1); });
