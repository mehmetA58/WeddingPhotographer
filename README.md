# EventPhoto — QR ile Ortak Etkinlik Fotoğraf Albümü

EventPhoto, düğünden geziye, toplantıdan doğum gününe kadar her etkinlik için
QR ile çalışan ortak bir fotoğraf albümüdür. Katılımcılar masadaki **QR kodu**
okutur, **giriş yapmadan** telefonlarındaki fotoğrafları seçip yükler;
fotoğraflar doğrudan **organizatörün Google Drive'ına** kaydedilir.

Backend, sitenin kendisiyle aynı adreste çalışan **Cloudflare Pages Functions**'tır
(uç sunucu). Organizatör "Google ile Bağlan"a **tek dokunuşla** Drive'ını bağlar;
kurmak, indirmek, açmak zorunda olduğu hiçbir ayar yoktur.

```
📷 Katılımcı ──(QR)──▶ upload.html ──(ikili foto)──▶ /api/upload (Cloudflare) ──▶ Google Drive
🧑‍💼 Organizatör ──(tek tık)──▶ /api/oauth ──▶ Google onayı ──▶ Drive bağlandı
```

---

## 🧩 Sistem nasıl çalışıyor?

- **Statik site** (`index.html`, `setup.html`, `upload.html`, …) Cloudflare Pages'te yayınlanır.
- **`functions/api/*`** dizini otomatik olarak Cloudflare Pages Functions'a dönüşür ve
  aynı origin'de `/api/…` uçlarını karşılar (CORS/JSONP derdi yok).
- Organizatör kurulum sayfasında **"Google ile Bağlan"** der → sunucu tarafı OAuth
  (authorization code) akışı çalışır → Drive'da bir klasör oluşturulur → etkinlik
  Cloudflare **KV**'ye kaydedilir. Sonuç: organizatöre özel bir **eventId** ve
  **ev-sahibi anahtarı (adminKey)**.
- Kurulum sayfası eventId'yi bir **QR**'a gömer. QR'ı okutan herkes organizatörün
  Drive'ına yükler. Galeri/sunum ise yalnızca adminKey ile açılır.
- Yalnızca **`drive.file`** OAuth kapsamı kullanılır: uygulama SADECE kendi
  oluşturduğu klasör/dosyaları görür. Bu kapsam Google tarafından *non-sensitive*
  sayılır → **uygulama doğrulaması (verification) gerektirmez**, kullanıcı başına
  hiçbir manuel ayar yoktur.

V1 etkinlik türleri sabittir: **Gezi, Toplantı, Doğum Günü, Düğün, Nişan,
Yıldönümü, Romantik Akşam Yemeği, Hoş Geldin Partisi, Veda Partisi**.

---

## ✨ Öne çıkanlar

> **Canlı demo:** Sunum ekranını örnek karelerle hemen görmek için
> `slideshow.html?demo=1` açın — kurulum gerektirmez. Sitenin kök adresi
> (`index.html`) tüm özellikleri anlatan tanıtım sayfasıdır.

- **Davetiye** — `invite.html` ile zarif bir dijital davetiye oluşturun: tarih, mekan,
  el yazısı mesaj, geri sayım. Davetli linki açınca **mühürlü zarf** belirir, dokununca
  davetiye çıkar. Link/WhatsApp/PNG olarak paylaşılır; **Takvime Ekle** (.ics),
  **Haritada Aç** ve **LCV (WhatsApp)** butonları hazır. Google bağlantısı gerektirmez.
- **Canlı Sunum Ekranı** — kurulumdaki özel linki mekandaki **TV/projeksiyona** açın;
  yüklenen kareler saniyeler içinde "masaya bırakılan polaroid" olarak ekranda belirir,
  köşedeki QR misafirleri paylaşmaya çağırır. Tıklama tam ekran yapar, ekran uyumaz.
- **Fotoğraf Görevleri** — misafirlere etkinliğe özel eğlenceli görev önerileri sunulur
  ("Dans pistinden bir kare", "Yerel bir lezzet"…); seçilen görev fotoğrafın altyazısı olur.
- **Anı Defteri** — misafirler fotoğrafın yanına kısa bir tebrik notu bırakabilir; notlar
  sunum ekranında el yazısı kartlar olarak döner ve Drive'a `.txt` hatıra olarak kaydedilir.
- **Canlı Albüm tasarımı** — albüm köşe cepleri, polaroid "banyo" efekti, film tarih damgası;
  karşılama metni, vurgu rengi ve zemin tonu seçilen etkinliğe göre değişir.

---

## 📁 Dosya yapısı

```
EventPhoto/
├── index.html          # Landing page (tanıtım / ön kapı)
├── setup.html          # Kurulum sayfası (etkinlik → link + QR üretir)
├── upload.html         # Katılımcı yükleme sayfası (QR buraya gider)
├── gallery.html        # Organizatör için özel fotoğraf galerisi
├── slideshow.html      # Canlı sunum ekranı (mekandaki TV/projeksiyon)
├── invite.html         # Davetiye oluşturucu + davetli görünümü (zarf)
├── card.html           # Yazdırmaya hazır QR masa kartı
├── css/style.css       # "Canlı Albüm" teması (etkinliğe göre renklenir)
├── js/
│   ├── qrcode.min.js   # Yerel QR kütüphanesi (CDN yok)
│   ├── i18n.js         # Türkçe / İngilizce dil metinleri
│   ├── events.js       # V1 etkinlik türleri, konsept + görev tanımları
│   ├── api.js          # /api/list & /api/ping ortak fetch yardımcıları
│   ├── setup.js        # Kurulum + OAuth başlatma + QR üretimi
│   ├── upload.js       # Yükleme + resize + progress + görev/not
│   ├── gallery.js      # Galeri + lightbox + Anı Defteri
│   ├── slideshow.js    # Canlı sunum: polaroid duvarı + not kartları
│   ├── invite.js       # Davetiye: link-içi veri, zarf, ICS, PNG çizimi
│   └── card.js         # PDF/yazdırma kartı
├── functions/api/      # Cloudflare Pages Functions (backend)
│   ├── ping.js         # GET /api/ping (sağlık)
│   ├── upload.js       # POST /api/upload?e= (ikili foto → Drive)
│   ├── list.js         # GET  /api/list?e=&k= (galeri/sunum listesi)
│   ├── note.js         # POST /api/note?e= (Anı Defteri notu)
│   ├── oauth/start.js  # GET  /api/oauth/start (Google'a yönlendir)
│   ├── oauth/callback.js # GET /api/oauth/callback (token + klasör + KV)
│   └── _lib/           # google.js (OAuth/Drive), util.js, notes.js
├── wrangler.toml       # Cloudflare Pages + KV yapılandırması
├── .dev.vars.example   # Yerel secret şablonu (.dev.vars gitignore'lu)
└── README.md           # Bu dosya
```

---

## 🚀 Kurulum — Adım Adım

Bu adımları **yalnızca site sahibi bir kez** yapar. Organizatörler ve misafirler
için ek adım yoktur.

### Bölüm A — Cloudflare Pages'e yayınlayın

1. Depoyu GitHub'a gönderin (veya Cloudflare'e doğrudan bağlayın).
2. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages**
   → **Connect to Git** → bu depoyu seçin.
   - **Build command:** *(boş bırakın)*
   - **Build output directory:** `/` (kök)
3. **KV namespace** oluşturun: **Workers & Pages → KV → Create** → ad: `eventphoto`.
   (Veya `npx wrangler kv namespace create EVENTS`.) Oluşan namespace'i Pages projesine
   bağlayın: **Pages projesi → Settings → Functions → KV namespace bindings** →
   **Variable name: `EVENTS`** → namespace'i seçin.
   (`wrangler.toml`'daki `id`/`preview_id` alanlarını da doldurabilirsiniz.)
4. **Secret'ları** girin: **Pages projesi → Settings → Environment variables**
   (Production ve Preview için, "Encrypt" işaretli):
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Bölüm B'den)
   - `BASE_URL` = sitenizin kök adresi, sonda `/` olmadan
     (ör. `https://eventphoto.pages.dev` veya özel alan adınız)
5. Deploy tamamlanınca siteniz `https://<proje>.pages.dev` adresinde yayında olur.
   Kurulum sayfanız: `.../setup.html`.

> **Not:** Cloudflare'in *preview* dağıtımları rastgele alt alan adı üretir; OAuth
> yalnızca `BASE_URL` ile Google'daki **Authorized redirect URI**'nin eşleştiği
> **production/özel alan adında** çalışır.

### Bölüm B — Google Cloud Console (bir kez)

1. [console.cloud.google.com](https://console.cloud.google.com) → yeni bir proje oluşturun.
2. **APIs & Services → Library** → **Google Drive API**'yi etkinleştirin.
   *(Apps Script API'ye artık gerek yok.)*
3. **APIs & Services → OAuth consent screen** → *External* → uygulama adı, destek
   e-postası, geliştirici e-postası girin.
   - **Scopes:** yalnızca `openid`, `email` ve `.../auth/drive.file` eklenir.
   - **Publishing status → PUBLISH APP → Production.** ⚠️ *Testing'de bırakmayın:*
     Testing modunda refresh token'lar **7 günde** geçersiz olur; etkinlik gününden
     önce bağlanan organizatör kopar. `drive.file` non-sensitive olduğu için
     Production'a geçiş **doğrulama (verification) gerektirmez**.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** →
   *Web application*:
   - **Authorized redirect URIs:** `https://<siteniz>/api/oauth/callback`
     (yerelde ayrıca `http://localhost:8788/api/oauth/callback`)
   - Oluşan **Client ID** ve **Client Secret**'i Bölüm A · adım 4'teki Cloudflare
     secret'larına yazın.

### Bölüm C — QR kodunuzu oluşturun

1. Yayınladığınız **`setup.html`** sayfasını açın.
2. **Etkinlik Türü** ve **Etkinlik Başlığı** seçin, **Dil**'i belirleyin.
3. **"Google ile Bağlan"** → Google onayı → sayfa `?e=…&k=…` ile geri döner ve
   **"Google Drive Bağlantısı Hazır"** görünür. *(Kullanıcı tarafında başka adım yoktur.)*
4. **"QR Kodu Oluştur"** → QR belirir.
5. **PNG İndir** / **Kart Yazdır (PDF)** ile masalara koyacağınız QR'ı alın.
6. **Galeri Linkini Kopyala** ve **Sunum Linkini Kopyala** — bu linkler
   ev-sahibi anahtarını (`k=`) taşır; **yalnızca sizindir, katılımcılarla paylaşmayın.**
   (İnce ayar: sunum linkine `&slide=6000` kare süresini, `&poll=10000` liste
   tazeleme aralığını ms olarak değiştirir.)

### Bölüm D — Masalara yerleştirin

QR kartlarını masalara koyun; küçük bir not ekleyin:

> *"Etkinliğe ait karelerinizi paylaşmak için QR'ı okutmanız yeterli."*

---

## ✉️ Davetiye — oluştur, paylaş

1. `invite.html` sayfasını açın (kurulumdaki **Davetiye Oluştur** butonu da buraya gelir).
   **Google bağlantısı gerekmez.**
2. Etkinlik türünü seçin; başlık, tarih/saat, mekan, el yazısı mesaj ve isteğe bağlı
   **LCV WhatsApp numarası** girin. Önizleme her tuşta güncellenir.
3. Paylaşın: **Davetiye Linkini Kopyala** / **WhatsApp'ta Paylaş** / **PNG İndir**
   (1080×1620 görsel).
4. Nasıl çalışır? Davetiye verisi sunucuya değil, linkin `#d=` bölümüne yazılır.
   **Fotoğraf yükleme linki/eventId davetiyeye asla eklenmez** (davetiye ileri
   paylaşılsa bile albüm adresiniz sızmaz).

---

## ✅ Doğrulama / Test

**Yerelde (Cloudflare çalışma zamanı):**

```bash
cp .dev.vars.example .dev.vars      # GOOGLE_CLIENT_ID/SECRET, BASE_URL=http://localhost:8788
npx wrangler pages dev .            # http://localhost:8788
curl http://localhost:8788/api/ping # {"status":"ready","service":"eventphoto-api"}
```

- **Tek tık OAuth:** `setup.html` → "Google ile Bağlan" → onay → sayfa `?e=&k=` ile
  döner, "Bağlantı Hazır" görünür. Drive'da **"Etkinlik Fotoğrafları — …"** klasörü oluşur.
- **Yükleme:** Üretilen `upload.html?e=…` → 2–3 foto + ad + not → **Gönder** → gerçek
  başarı yanıtı; Drive klasöründe zaman damgalı dosyalar + `Not_*.txt`.
- **Galeri/Sunum:** `gallery.html?e=&k=` fotoğrafları ızgarada gösterir; yanlış/eksik
  `k` → "Geçersiz güvenlik anahtarı". `slideshow.html?e=&k=` yeni kareyi ~20 sn'de
  "Yeni" rozetiyle gösterir. `slideshow.html?demo=1` API'siz çalışır.

**Statik arayüz regresyonu (Playwright):** proje kökünde `python3 -m http.server 8000`
açın, `cd tests && node <test>.js`. Testler `/api/*` yanıtlarını `page.route` ile
mock'lar; gerçek Google/Cloudflare gerektirmez.

---

## 🔧 Sık karşılaşılan sorunlar

| Sorun | Çözüm |
|---|---|
| **"Google bağlantısı başarısız (redirect_uri_mismatch)"** | Google Cloud → Credentials → OAuth client → **Authorized redirect URIs** listesinde `https://<siteniz>/api/oauth/callback` **birebir** olmalı (şema/alan adı/sonda-slash dahil). `BASE_URL` secret'ı da bununla aynı köke işaret etmeli. |
| **Bir hafta sonra bağlantı düşüyor** | OAuth consent screen **Testing** modunda kalmış. **Production**'a publish edin (refresh token'lar kalıcı olur). |
| **`Sunucu yapılandırması eksik` (500)** | Cloudflare'de `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BASE_URL` secret'ları veya `EVENTS` KV binding'i tanımlı değil. |
| **Yükleme "bad_image_signature"** | Dosya gerçekten görsel değil ya da bozuk; başka bir kareyle deneyin. Sunucu ilk baytlardaki imzayı doğrular. |
| **Galeri thumbnail'ları yüklenmiyor** | Her dosya yüklenirken "bağlantıya sahip olan görüntüler" yapılır (`permissions.create`). Google tarafında geçici bir hata olduysa yeni yüklemeler etkilenmez; dosyayı Drive'dan da açabilirsiniz. |
| **Galeri boş görünüyor ama Drive'da dosya var** | Galeri linkindeki `k=` (ev-sahibi anahtarı) doğru mu? Yanlış `k` "Geçersiz güvenlik anahtarı" döndürür. Kurulumdaki **Galeri Linkini Kopyala**'yı kullanın. |
| **iPhone HEIC fotoğrafları** | Varsayılan resize açıkken tarayıcı fotoğrafı **JPEG'e** çevirir. Kapatırsanız (orijinal) HEIC olarak kaydolur. |
| **QR okunmuyor** | Daha büyük yazdırın. eventId kısa olduğu için QR bu sürümde daha sadedir. |

---

## 🔒 Güvenlik notları

- Tasarım gereği giriş yok: **QR/eventId'ye sahip herkes yükleyebilir** (misafirler anonim).
  Bu yüzden misafir QR'ını yalnızca mekânda kullanın.
- **Galeri/sunum ayrı anahtarla korunur:** listeleme yalnızca `k=` (adminKey) ile açılır;
  misafir QR'ı fotoğrafları **listeleyemez**. adminKey QR'a/yükleme linkine eklenmez.
- **Emanet edilen yetki sizde:** Bu modelde organizatörün refresh token'ı Cloudflare
  **KV**'de saklanır ve `GOOGLE_CLIENT_SECRET` bir Cloudflare secret'ıdır. Yani site
  sahibi olarak, bağlanan organizatörlerin Drive'ına (yalnızca `drive.file` kapsamında —
  uygulamanın oluşturduğu dosyalar) yazma yetkisini elinde tutarsınız. Bunu bilerek
  yönetin; secret'ları paylaşmayın.
- **Kapsam dar:** `drive.file` yalnızca uygulamanın oluşturduğu dosya/klasörlere erişir;
  organizatörün Drive'ındaki diğer hiçbir dosyaya erişemez.
- **Anyone-with-link thumbnail:** Yüklenen her fotoğraf, galeri küçük resimleri Google
  CDN'den yüklenebilsin diye "bağlantıya sahip olan görüntüleyebilir" yapılır. Dosya
  ID'leri tahmin edilemez ve liste `k=` ile korunur; yani fotoğraflar herkese açık
  **listelenmez**, ama ID'yi bilen görebilir. İstemiyorsanız `functions/api/upload.js`
  içindeki `driveSetAnyoneReader(...)` çağrısını kaldırın (o zaman thumbnail'lar
  yüklenmez, fotoğrafları yalnızca Drive'dan görürsünüz).

---

## 💸 Maliyet & limitler

- **Ücretsiz.** Cloudflare Pages free planı: statik istekler sınırsız; Functions
  günde **100.000 istek** (Workers ile ortak), çağrı başına **10 ms CPU**, 100 MB
  istek gövdesi. KV free kotası etkinlik ölçeği için fazlasıyla yeterli.
- İstemci tarafı resize (~2560px) hem hızı hem 10 ms CPU bütçesini korur; yükleme
  base64 değil **ikili** gönderildiği için sunucuda decode maliyeti yoktur.
- Drive depolama, organizatörün Google hesabı kotasına tabidir (15 GB ücretsiz).

---

## 🔁 Başka bir organizasyon için

Siteyi yeniden yayınlamaya gerek yok. Her yeni organizatör aynı `setup.html`'de
**"Google ile Bağlan"** der → kendi eventId'sini ve QR'ını alır. Her organizasyonun
fotoğrafları ilgili sahibin kendi Drive'ına gider; hiçbiri diğerini göremez.
