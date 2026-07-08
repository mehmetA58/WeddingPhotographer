# EventPhoto — QR ile Ortak Etkinlik Fotoğraf Albümü

EventPhoto, düğünden geziye, toplantıdan doğum gününe kadar her etkinlik için
QR ile çalışan ortak bir fotoğraf albümüdür. Katılımcılar masadaki **QR kodu**
okutur, **giriş yapmadan** telefonlarındaki fotoğrafları seçip yükler;
fotoğraflar doğrudan **sizin Google Drive'ınıza** kaydedilir. Sunucusuz,
ücretsiz, bakım gerektirmez.

```
📷 Katılımcı telefonu ──(QR)──▶ upload.html ──(base64 foto)──▶ Apps Script ──▶ Google Drive
```

---

## 🧩 Sistem nasıl çalışıyor?

Merkezî sunucu yok. Her organizasyon sahibi kendi Drive'ını şöyle bağlar:

> **Organizasyon sahibi, `apps-script/Code.gs` dosyasını kendi Google hesabına kurar ve
> "Web App" olarak yayınlar.** İşte "kendi Drive'ınızla eşleştirme" adımı budur.
> Deploy ettiğinizde size özel bir **Web App URL'i** verilir; bu adres sizin
> Drive'ınıza bağlıdır.

Statik site (`index.html`, `upload.html`) **bir kez** yayınlanır. Kurulum sayfası
sizin Web App URL'inizi + etkinlik türünü + etkinlik başlığını linke gömüp
**kişiselleştirilmiş bir QR** üretir. O QR'ı okutan herkes, sizin Drive'ınıza
yükleme yapar.

V1 etkinlik türleri sabittir: **Gezi, Toplantı, Doğum Günü, Düğün, Nişan,
Yıldönümü, Romantik Akşam Yemeği, Hoş Geldin Partisi, Veda Partisi**.

---

## ✨ Öne çıkanlar

- **Canlı Sunum Ekranı** — kurulumdaki özel linki mekandaki **TV/projeksiyona** açın;
  yüklenen kareler saniyeler içinde "masaya bırakılan polaroid" olarak ekranda belirir,
  köşedeki QR misafirleri paylaşmaya çağırır. Tıklama tam ekran yapar, ekran uyumaz.
- **Fotoğraf Görevleri** — misafirlere etkinliğe özel eğlenceli görev önerileri sunulur
  ("Dans pistinden bir kare", "Yerel bir lezzet"…); seçilen görev fotoğrafın altyazısı olur.
  İstemezseniz kurulumda *Gelişmiş ayarlar → Fotoğraf görevlerini kapat*.
- **Anı Defteri** — misafirler fotoğrafın yanına kısa bir tebrik notu bırakabilir; notlar
  sunum ekranında el yazısı kartlar olarak döner ve Drive'a `.txt` hatıra olarak kaydedilir.
- **Canlı Albüm tasarımı** — albüm köşe cepleri, polaroid "banyo" efekti, film tarih damgası;
  karşılama metni, vurgu rengi ve zemin tonu seçilen etkinliğe göre değişir.

---

## 📁 Dosya yapısı

```
EventPhoto/
├── index.html          # Kurulum sayfası (etkinlik → link + QR üretir)
├── upload.html         # Katılımcı yükleme sayfası (QR buraya gider)
├── gallery.html        # Organizasyon sahibi için özel fotoğraf galerisi
├── slideshow.html      # Canlı sunum ekranı (mekandaki TV/projeksiyon)
├── card.html           # Yazdırmaya hazır QR masa kartı
├── css/style.css       # "Canlı Albüm" teması (etkinliğe göre renklenir)
├── js/
│   ├── qrcode.min.js   # Yerel QR kütüphanesi (CDN yok)
│   ├── i18n.js         # Türkçe / İngilizce dil metinleri
│   ├── events.js       # V1 etkinlik türleri, konsept + görev tanımları
│   ├── api.js          # Apps Script liste/JSONP ortak yardımcıları
│   ├── setup.js        # Kurulum mantığı
│   ├── upload.js       # Yükleme + resize + progress + görev/not
│   ├── gallery.js      # Galeri + lightbox + Anı Defteri
│   ├── slideshow.js    # Canlı sunum: polaroid duvarı + not kartları
│   └── card.js         # PDF/yazdırma kartı
├── apps-script/Code.gs # Google Apps Script backend (Drive'a kaydeder)
├── docs/
│   ├── openapi.yaml    # Apps Script API için OpenAPI/Swagger sözleşmesi
│   └── swagger.html    # Swagger UI ile okunabilir API dokümanı
└── README.md           # Bu dosya
```

---

## 📘 API / Swagger dokümanı

Apps Script backend sözleşmesi `docs/openapi.yaml` içinde OpenAPI 3.0 formatında
tanımlıdır. Tarayıcıdan görüntülemek için `docs/swagger.html` dosyasını açın.

GitHub Pages yayındaysa doküman şu adreste olur:

```text
https://<kullanıcı-adınız>.github.io/<repo-adı>/docs/swagger.html
```

Not: Fotoğraf yükleme akışı Apps Script CORS kısıtları nedeniyle `no-cors`
kullanır; bu yüzden Swagger gerçek JSON yanıtını belgeler, fakat tarayıcıdaki
misafir arayüzü yükleme yanıtını okuyamaz.

---

## 🚀 Kurulum — Adım Adım

Toplam süre: ~10 dakika. İki bölüm var: **(A) Siteyi yayınla**, **(B) Drive'ını bağla**.

### Bölüm A — Statik siteyi yayınlayın (bir kez)

**Seçenek 1: GitHub Pages (önerilen, ücretsiz)**

1. [github.com](https://github.com) hesabı açın → **New repository** (örn. `etkinlik-foto`), *Public*.
2. Bu klasördeki tüm dosyaları repoya yükleyin (sürükle-bırak ile "Add file → Upload files").
3. Repo → **Settings → Pages** → *Build and deployment* → **Source: GitHub Actions**.
   (Depoda hazır `.github/workflows/deploy.yml` var; her `main` push'unda site otomatik yayınlanır.
   Dilerseniz bunun yerine *Source: Deploy from a branch → `main` / `(root)`* de seçebilirsiniz.)
4. 1–2 dakika sonra siteniz yayında olur:
   `https://<kullanıcı-adınız>.github.io/etkinlik-foto/`
5. Kurulum sayfanız: `.../etkinlik-foto/index.html`

**Seçenek 2: Netlify (daha da hızlı, sürükle-bırak)**

1. [app.netlify.com/drop](https://app.netlify.com/drop) adresine gidin.
2. `EventPhoto` klasörünü olduğu gibi tarayıcıya sürükleyin → anında yayınlanır.

> İki seçenek de HTTPS sağlar (kamera erişimi için zorunlu).

---

### Bölüm B — Google Drive'ınızı bağlayın (Apps Script)

> Bu adımı **organizasyon sahibi** kendi Google hesabında yapar.
> İki yol var; **birini** seçmeniz yeterli.

#### Yol 1 — "Google ile Bağlan" (otomatik kurulum)

Kurulum sayfasındaki **"Google ile Bağlan"** butonu; Drive klasörünü, Apps Script
projesini ve Web App yayınını sizin adınıza otomatik oluşturur. Bunun çalışması için
**siteyi yayınlayan kişinin** bir kez OAuth istemcisi tanımlaması gerekir:

1. [console.cloud.google.com](https://console.cloud.google.com) → yeni bir proje oluşturun.
2. **APIs & Services → Library** → şu ikisini etkinleştirin: **Apps Script API** ve **Google Drive API**.
3. **APIs & Services → OAuth consent screen** → *External* → uygulama adını girin;
   kendi e-postanızı **Test users** listesine ekleyin.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → *Web application*.
   **Authorized JavaScript origins** alanına sitenizin adresini ekleyin
   (örn. `https://<kullanıcı-adınız>.github.io`; yerelde denemek için `http://localhost:8000`).
5. Oluşan **Client ID**'yi `js/setup.js` başındaki `GOOGLE_CLIENT_ID` değerine yapıştırın
   ve siteyi yeniden yayınlayın.
6. Organizasyon sahibi ayrıca [script.google.com/home/usersettings](https://script.google.com/home/usersettings)
   adresinden **Google Apps Script API** iznini **Açık** konuma getirmelidir
   (kapalıysa proje oluşturma `403` hatası verir).

Artık kurulum sayfasında **"Google ile Bağlan"** → izinleri onaylayın → kurulum
adımları (klasör, proje, yayın, token) otomatik tamamlanır. Yol 2'ye gerek kalmaz.

#### Yol 2 — Manuel kurulum (Cloud Console gerektirmez)

1. [script.google.com](https://script.google.com) → **Yeni proje**.
2. Soldaki `Code.gs` dosyasının içeriğini silin; `apps-script/Code.gs`
   dosyamızın **tamamını** yapıştırın → **Kaydet** (💾).
3. (İsteğe bağlı ama önerilir) **Güvenlik anahtarı**:
   - Bir sonraki bölümdeki kurulum sayfasında **"Üret"** ile bir token oluşturun.
   - Apps Script'te üstteki fonksiyon menüsünden **`SETUP_setToken`** seçin,
     kod içindeki `'BURAYA_TOKEN_YAPISTIRIN'` yerine o token'ı yazın → **Run**.
     (Alternatif: **Proje Ayarları ⚙ → Script Properties → Add**, `TOKEN` = değeriniz.)
4. (İsteğe bağlı) Fotoğraflar mevcut bir Drive klasörüne gitsin istiyorsanız:
   - Drive klasör linkindeki ID'yi kopyalayın.
   - Apps Script'te `SETUP_setExistingFolderId` içindeki
     `'BURAYA_DRIVE_KLASOR_ID_YAPISTIRIN'` alanına yapıştırın → **Run**.
   - Bunu yapmazsanız ilk yüklemede **"Etkinlik Fotoğrafları"** klasörü otomatik oluşur.
5. **Deploy → New deployment** → dişli ⚙ → **Web app**:
   - **Execute as:** `Me` (kendi hesabınız)
   - **Who has access:** `Anyone`  ← *katılımcılar anonim yükleyecek, bu şart*
   - **Deploy**.
6. İlk kez izin istenir → hesabınızı seçin → "Advanced → Go to project (unsafe)"
   → **Allow** (kendi betiğinize Drive izni veriyorsunuz).
7. Açılan **Web app URL**'ini kopyalayın — `https://script.google.com/macros/s/AKfyc…/exec`
8. Kurulum sayfasında **Gelişmiş ayarlar → Web App URL (manuel bağlantı)** alanına bu adresi yapıştırın.

✅ Artık Drive'ınız bağlı. İlk fotoğraf yüklendiğinde Drive'ınızda
**"Etkinlik Fotoğrafları"** klasörü otomatik oluşur.

---

### Bölüm C — QR kodunuzu oluşturun

1. Yayınladığınız **`index.html`** (kurulum) sayfasını açın ve Bölüm B'deki
   yollardan biriyle Drive'ınızı bağlayın (Yol 1: **"Google ile Bağlan"** ·
   Yol 2: **Gelişmiş ayarlar → Web App URL**).
2. **Etkinlik Türü** seçin. Karşılama metni, vurgu rengi ve sayfa zemin tonu
   buna göre değişir.
3. **Etkinlik Başlığı** girin (örn. `Ayşe & Mehmet`, `Kapadokya 2026`,
   `Ayşe'nin 30. Yaşı`) — karşılama yazısında görünür.
4. **Dil** alanından Türkçe veya English seçin. QR linki bu dili otomatik taşır.
5. (Yol 2 + token kullandıysanız) *Gelişmiş ayarlar → Güvenlik anahtarı* alanına
   Apps Script'te ayarladığınız token'ı girin. (Yol 1'de token otomatik yapılandırılır.)
6. **"QR Kodu Oluştur"** → QR belirir.
7. **PNG İndir** ile tek QR görseli alın veya **Kart Yazdır (PDF)** ile
   yazdırmaya hazır masa kartını açın.
8. **Galeri Linkini Kopyala** butonuyla özel galeri linkini saklayın.
   Bu linki katılımcılarla paylaşmayın.
9. **Sunum Linkini Kopyala** ile canlı sunum ekranı linkini alın. Etkinlik günü
   mekandaki TV/projeksiyona bağlı bir tarayıcıda açın ve tıklayarak tam ekran yapın.
   Bu link de galeri gibi **özeldir** — yalnızca ekranda gösterin, dağıtmayın.
   (İnce ayar: linke `&slide=6000` eklerseniz kare süresi 6 sn olur,
   `&poll=10000` liste tazelemeyi 10 sn'ye indirir.)

---

### Bölüm D — Masalara yerleştirin

QR kartlarını masalara koyun. Küçük bir not ekleyebilirsiniz:

> *"Etkinliğe ait karelerinizi paylaşmak için QR'ı okutmanız yeterli."*

---

## ✅ Doğrulama / Test

- **Konsept kontrolü:** Kurulumda farklı etkinlik türleri seçtikçe karşılama metni,
  vurgu rengi ve sayfa zemin tonu değişmeli; **"Yükleme Sayfasını Önizle"** ile
  katılımcının göreceği ekranı kontrol edin.
- **Uçtan uca:** Telefonunuzla QR'ı okutun → 2–3 fotoğraf seçin → ilerleme çubuğu
  dolmalı → "Teşekkür Ederiz" ekranı gelmeli → **Drive klasörünüzde** zaman
  damgalı dosyalar görünmeli.
- **Çoklu + kamera:** Hem galeriden çoklu seçim hem "Kamera" ile anlık çekim çalışmalı.
- **Galeri:** Kurulum ekranındaki **Galeri Linki** açıldığında yüklenen fotoğraflar
  ızgarada görünmeli; isterseniz **Drive Klasörü** butonuyla dosyaları Drive'da açın.
- **Canlı sunum:** Sunum linkini bilgisayarda açın, telefonla bir fotoğraf yükleyin →
  kare ~20 sn içinde **"Yeni"** rozetiyle ekranda belirmeli; sayaç artmalı.
- **Görev + not:** Yüklemede bir görev seçin → Drive'daki dosya adında ve galeri
  lightbox altyazısında görev görünmeli. Bir not bırakın → Drive klasöründe
  `Not_*.txt` oluşmalı, galerideki **Anı Defteri** bölümünde ve sunumda görünmeli.
- **QR kart:** **Kart Yazdır (PDF)** sayfasında sayfa başına 1/2/4/6 kart seçip
  tarayıcıdan "PDF olarak kaydet" diyebilirsiniz.

---

## 🔧 Sık karşılaşılan sorunlar

| Sorun | Çözüm |
|---|---|
| **Yükleme başarısız / CORS "Ağ hatası"** | Apps Script `/exec` yanıtı CORS başlığı döndürmediği için istek `mode:'no-cors'` ile gönderilir (kodda ayarlı) — yükleme çalışır ama tarayıcı yanıtı **okuyamaz**, bu yüzden arayüz iyimser şekilde "başarılı" gösterir. Fotoğrafların gerçekten geldiğini **Galeri** veya Drive klasöründen doğrulayın. Web App'in **"Who has access: Anyone"** ile yayınlandığından emin olun. |
| **"0 uploaded, 1 failed" görüyordum** | Eski sürümde tarayıcı başarı yanıtını okuyamadığı için yanlışlıkla "başarısız" gösteriyordu; **fotoğraflar aslında Drive'a kaydedilmiş olabilir**. Güncel sürüm bunu düzeltir (`no-cors`). |
| **Güvenlik anahtarı (token) uyarısı** | `no-cors` ile tarayıcı sunucu yanıtını okuyamadığından, **yanlış token** durumunda arayüz yine "başarılı" gösterir ama sunucu dosyayı **kaydetmez**. Token kullanıyorsanız yüklemeyi Galeri'den doğrulayın. |
| **"Google ile Bağlan" hata veriyor (403 / yetki)** | [script.google.com/home/usersettings](https://script.google.com/home/usersettings)'ten **Google Apps Script API**'yi açın; Cloud Console'da **Apps Script API + Drive API**'nin etkin ve sitenizin **Authorized JavaScript origins** listesinde olduğundan emin olun. Alternatif: Bölüm B · Yol 2 (manuel) ile Web App URL'inizi *Gelişmiş ayarlar*'dan girin. |
| **Kodda değişiklik yaptım, çalışmıyor** | Aynı URL'i korumak için **Deploy → Manage deployments → ✏ → Version: New version**. "New deployment" **yeni URL** üretir (QR'ı da yenilemeniz gerekir). |
| **Görev/not/sunum altyazısı çalışmıyor** | Apps Script projeniz eski sürüm `Code.gs` ile yayınlanmış olabilir. Güncel `apps-script/Code.gs` içeriğini projeye yapıştırıp **Deploy → Manage deployments → ✏ → Version: New version** deyin (URL aynı kalır). Eski sürümde fotoğraf yükleme çalışmaya devam eder; yalnızca yeni özellikler eksik kalır. |
| **Anı Defteri notları kaydedilmiyor** | Güncel sürümde notlar `GET ?action=note` JSONP akışıyla kaydedilir ve sonucu okunur. Apps Script tarafında güncel `Code.gs` yoksa notlar hiç kaydolmaz. `apps-script/Code.gs` dosyasını Apps Script projenize tekrar yapıştırın, **Deploy → Manage deployments → ✏ → Version: New version** ile aynı Web App URL'ini güncelleyin. Sonra galeri linkini açıp notların **Anı Defteri** bölümünde veya Drive klasöründe `Not_*.txt` olarak oluştuğunu kontrol edin. |
| **iPhone HEIC fotoğrafları** | Varsayılan resize açıkken tarayıcı fotoğrafı **JPEG'e** çevirir (uyumlu). Kapatırsanız (orijinal) HEIC olarak kaydolur. |
| **Çok büyük fotoğraf / yavaş** | Resize varsayılan açık (~2560px). Orijinal kalite isterseniz kurulumda *"Orijinal çözünürlükte yükle"*yi işaretleyin (daha yavaş, ~40MB/dosya sınırı). |
| **QR okunmuyor** | Daha büyük yazdırın; link uzun olduğu için QR yoğun olabilir. İsim/token kısaldıkça QR sadeleşir. |

---

## 🔒 Güvenlik notları

- Tasarım gereği giriş yok: **linke/QR'a sahip herkes yükleyebilir** (katılımcılar anonim).
  Bu yüzden linki halka açık paylaşmayın; QR'ı yalnızca mekânda kullanın.
- **Güvenlik anahtarı (token)** kullanırsanız, link sızsa bile token'sız istekler reddedilir.
- Fotoğraflar yalnızca **sizin** Drive'ınıza gider; bu proje hiçbir yere kopya göndermez.
- **Galeri için not:** Yüklenen her fotoğraf, galeri sayfasında küçük resim görünebilsin diye
  “**bağlantıya sahip olan görüntüleyebilir**” yapılır. Dosya kimlikleri (ID) tahmin edilemez ve
  galeri listesi token ile korunur; yani fotoğraflar herkese açık **listelenmez**, ama ID'yi bilen
  görebilir. Bu davranışı istemiyorsanız `Code.gs` içindeki `setSharing(...)` satırını silin
  (o zaman galeri küçük resimleri yüklenmez, fotoğrafları yalnızca Drive'dan görürsünüz).

---

## 💸 Maliyet & limitler

- **Ücretsiz.** GitHub Pages/Netlify ve Apps Script tüketici kotaları etkinlik ölçeği
  (yüzlerce fotoğraf) için fazlasıyla yeterlidir.
- Apps Script tek istek gövdesi **~50MB**; bu yüzden istemci tarafı resize önerilir.
- Drive depolama, Google hesabınızın kotasına tabidir (15GB ücretsiz).

---

## 🔁 Başka bir organizasyon için

Statik siteyi tekrar yayınlamaya gerek yok. Yeni organizasyon sahibi:
1. `apps-script/Code.gs`'i **kendi** Google hesabında deploy eder (Bölüm B),
2. Kendi Web App URL'i + etkinlik türü + başlığıyla aynı kurulum sayfasından **kendi QR'ını** üretir.

Her organizasyonun fotoğrafları ilgili sahibin kendi Drive'ına gider.
