# 💛 Düğün Fotoğraf Yükleme — QR ile Anlık Fotoğraf Toplama

Misafirleriniz masadaki **QR kodu** okutur, **giriş yapmadan** telefonlarındaki
fotoğrafları seçip yükler; fotoğraflar doğrudan **sizin Google Drive'ınıza**
kaydedilir. Sunucusuz, ücretsiz, bakım gerektirmez.

```
📷 Misafir telefonu ──(QR)──▶ upload.html ──(base64 foto)──▶ Apps Script ──▶ Google Drive
```

---

## 🧩 Sistem nasıl çalışıyor? (Çok çiftli mantık)

Merkezî sunucu yok. Çok çiftliliği (her çiftin kendi Drive'ı) şöyle sağlıyoruz:

> **Her çift, `apps-script/Code.gs` dosyasını kendi Google hesabına kurar ve
> "Web App" olarak yayınlar.** İşte "kendi Drive'ınızla eşleştirme" adımı budur.
> Deploy ettiğinizde size özel bir **Web App URL'i** verilir; bu adres sizin
> Drive'ınıza bağlıdır.

Statik site (`index.html`, `upload.html`) **bir kez** yayınlanır. Kurulum sayfası
sizin Web App URL'inizi + isimlerinizi bir linke gömüp **kişiselleştirilmiş bir
QR** üretir. O QR'ı okutan herkes, sizin Drive'ınıza yükleme yapar. Başka bir çift
için tek yapılacak: onların kendi Code.gs'i deploy edip kendi QR'larını üretmesi.

---

## 📁 Dosya yapısı

```
WeddingPhoto/
├── index.html          # Kurulum sayfası (çift → link + QR üretir)
├── upload.html         # Misafir yükleme sayfası (QR buraya gider)
├── gallery.html        # Çift için özel fotoğraf galerisi
├── card.html           # Yazdırmaya hazır QR masa kartı
├── css/style.css       # Zarif krem/gold tema
├── js/
│   ├── qrcode.min.js   # Yerel QR kütüphanesi (CDN yok)
│   ├── i18n.js         # Türkçe / İngilizce dil metinleri
│   ├── setup.js        # Kurulum mantığı
│   ├── upload.js       # Yükleme + resize + progress
│   ├── gallery.js      # Galeri + lightbox
│   └── card.js         # PDF/yazdırma kartı
├── apps-script/Code.gs # Google Apps Script backend (Drive'a kaydeder)
└── README.md           # Bu dosya
```

---

## 🚀 Kurulum — Adım Adım

Toplam süre: ~10 dakika. İki bölüm var: **(A) Siteyi yayınla**, **(B) Drive'ını bağla**.

### Bölüm A — Statik siteyi yayınlayın (bir kez)

**Seçenek 1: GitHub Pages (önerilen, ücretsiz)**

1. [github.com](https://github.com) hesabı açın → **New repository** (örn. `dugun-foto`), *Public*.
2. Bu klasördeki tüm dosyaları repoya yükleyin (sürükle-bırak ile "Add file → Upload files").
3. Repo → **Settings → Pages** → *Build and deployment* → **Source: GitHub Actions**.
   (Depoda hazır `.github/workflows/deploy.yml` var; her `main` push'unda site otomatik yayınlanır.
   Dilerseniz bunun yerine *Source: Deploy from a branch → `main` / `(root)`* de seçebilirsiniz.)
4. 1–2 dakika sonra siteniz yayında olur:
   `https://<kullanıcı-adınız>.github.io/dugun-foto/`
5. Kurulum sayfanız: `.../dugun-foto/index.html`
   İlk açılışta **kurulum sihirbazı** çıkar: “Apps Script'i Aç” ve “Backend Kodunu Kopyala”
   butonlarıyla Bölüm B'yi neredeyse otomatik yaparsınız.

**Seçenek 2: Netlify (daha da hızlı, sürükle-bırak)**

1. [app.netlify.com/drop](https://app.netlify.com/drop) adresine gidin.
2. `WeddingPhoto` klasörünü olduğu gibi tarayıcıya sürükleyin → anında yayınlanır.

> İki seçenek de HTTPS sağlar (kamera erişimi için zorunlu).

---

### Bölüm B — Google Drive'ınızı bağlayın (Apps Script)

> Bu adımı **düğün sahibi çift** kendi Google hesabında yapar.

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
   - Bunu yapmazsanız ilk yüklemede **"Düğün Fotoğrafları"** klasörü otomatik oluşur.
5. **Deploy → New deployment** → dişli ⚙ → **Web app**:
   - **Execute as:** `Me` (kendi hesabınız)
   - **Who has access:** `Anyone`  ← *misafirler anonim yükleyecek, bu şart*
   - **Deploy**.
6. İlk kez izin istenir → hesabınızı seçin → "Advanced → Go to project (unsafe)"
   → **Allow** (kendi betiğinize Drive izni veriyorsunuz).
7. Açılan **Web app URL**'ini kopyalayın — `https://script.google.com/macros/s/AKfyc…/exec`

✅ Artık Drive'ınız bağlı. İlk fotoğraf yüklendiğinde Drive'ınızda
**"Düğün Fotoğrafları"** klasörü otomatik oluşur.

---

### Bölüm C — QR kodunuzu oluşturun

1. Yayınladığınız **`index.html`** (kurulum) sayfasını açın.
2. **Web App URL**'inizi yapıştırın.
3. **Çift isimlerini** girin (örn. `Ayşe & Mehmet`) — karşılama yazısında görünür.
4. **Dil** alanından Türkçe veya English seçin. QR linki bu dili otomatik taşır.
5. (Token kullandıysanız) *Gelişmiş ayarlar → Güvenlik anahtarı* alanına aynı token'ı girin.
6. **"Bağlantıyı Test Et"** → yeşil onay bekleyin.
7. **"QR Kodu Oluştur"** → QR belirir.
8. **PNG İndir** ile tek QR görseli alın veya **Kart Yazdır (PDF)** ile
   yazdırmaya hazır masa kartını açın.
9. **Galeri Linkini Kopyala** butonuyla çift için özel galeri linkini saklayın.
   Bu linki misafirlerle paylaşmayın.

---

### Bölüm D — Masalara yerleştirin

QR kartlarını masalara koyun. Küçük bir not ekleyebilirsiniz:

> *"Bu geceye ait karelerinizi bizimle paylaşın — QR'ı okutmanız yeterli 💛"*

---

## ✅ Doğrulama / Test

- **Bağlantı testi:** Kurulum sayfasındaki "Bağlantıyı Test Et" başarı vermeli.
  (CORS uyarısı görürseniz sorun değil — aşağıdaki nota bakın, telefonla test edin.)
- **Uçtan uca:** Telefonunuzla QR'ı okutun → 2–3 fotoğraf seçin → ilerleme çubuğu
  dolmalı → "Teşekkür Ederiz" ekranı gelmeli → **Drive klasörünüzde** zaman
  damgalı dosyalar görünmeli.
- **Çoklu + kamera:** Hem galeriden çoklu seçim hem "Kamera" ile anlık çekim çalışmalı.
- **Galeri:** Kurulum ekranındaki **Galeri Linki** açıldığında yüklenen fotoğraflar
  ızgarada görünmeli; isterseniz **Drive Klasörü** butonuyla dosyaları Drive'da açın.
- **QR kart:** **Kart Yazdır (PDF)** sayfasında sayfa başına 1/2/4/6 kart seçip
  tarayıcıdan "PDF olarak kaydet" diyebilirsiniz.

---

## 🔧 Sık karşılaşılan sorunlar

| Sorun | Çözüm |
|---|---|
| **Yükleme başarısız / CORS "Ağ hatası"** | Apps Script `/exec` yanıtı CORS başlığı döndürmediği için istek `mode:'no-cors'` ile gönderilir (kodda ayarlı) — yükleme çalışır ama tarayıcı yanıtı **okuyamaz**, bu yüzden arayüz iyimser şekilde "başarılı" gösterir. Fotoğrafların gerçekten geldiğini **Galeri** veya Drive klasöründen doğrulayın. Web App'in **"Who has access: Anyone"** ile yayınlandığından emin olun. |
| **"0 uploaded, 1 failed" görüyordum** | Eski sürümde tarayıcı başarı yanıtını okuyamadığı için yanlışlıkla "başarısız" gösteriyordu; **fotoğraflar aslında Drive'a kaydedilmiş olabilir**. Güncel sürüm bunu düzeltir (`no-cors`). |
| **Güvenlik anahtarı (token) uyarısı** | `no-cors` ile tarayıcı sunucu yanıtını okuyamadığından, **yanlış token** durumunda arayüz yine "başarılı" gösterir ama sunucu dosyayı **kaydetmez**. Token kullanıyorsanız yüklemeyi Galeri'den doğrulayın. |
| **Kurulumdaki "Bağlantı Testi" doğrulanamadı** | Tarayıcı, GET yanıtını CORS nedeniyle okuyamayabilir. Bu tek başına hata değildir — QR'ı üretip **telefonla bir test fotoğrafı** yükleyin. |
| **Kodda değişiklik yaptım, çalışmıyor** | Aynı URL'i korumak için **Deploy → Manage deployments → ✏ → Version: New version**. "New deployment" **yeni URL** üretir (QR'ı da yenilemeniz gerekir). |
| **iPhone HEIC fotoğrafları** | Varsayılan resize açıkken tarayıcı fotoğrafı **JPEG'e** çevirir (uyumlu). Kapatırsanız (orijinal) HEIC olarak kaydolur. |
| **Çok büyük fotoğraf / yavaş** | Resize varsayılan açık (~2560px). Orijinal kalite isterseniz kurulumda *"Orijinal çözünürlükte yükle"*yi işaretleyin (daha yavaş, ~40MB/dosya sınırı). |
| **QR okunmuyor** | Daha büyük yazdırın; link uzun olduğu için QR yoğun olabilir. İsim/token kısaldıkça QR sadeleşir. |

---

## 🔒 Güvenlik notları

- Tasarım gereği giriş yok: **linke/QR'a sahip herkes yükleyebilir** (misafirler anonim).
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

- **Ücretsiz.** GitHub Pages/Netlify ve Apps Script tüketici kotaları düğün ölçeği
  (yüzlerce fotoğraf) için fazlasıyla yeterlidir.
- Apps Script tek istek gövdesi **~50MB**; bu yüzden istemci tarafı resize önerilir.
- Drive depolama, Google hesabınızın kotasına tabidir (15GB ücretsiz).

---

## 🔁 Başka bir çift için

Statik siteyi tekrar yayınlamaya gerek yok. Yeni çift:
1. `apps-script/Code.gs`'i **kendi** Google hesabında deploy eder (Bölüm B),
2. Kendi Web App URL'i + isimleriyle aynı kurulum sayfasından **kendi QR'ını** üretir.

Her çiftin fotoğrafları kendi Drive'ına gider. 💛
