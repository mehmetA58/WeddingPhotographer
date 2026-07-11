# EventPhoto — Tasarım Sistemi

Bu belge projenin görsel dilinin tek kaynağıdır: token'lar, yerleşim sistemi, sınıf
envanteri ve adlandırma kuralları. Sonunda, değerlendirilen **üç tasarım yönü** yer alır
(bkz. [Alternatif Yönler](#alternatif-yönler)) — **C · Kartpostal seçildi ve uygulandı.**

**Neden Tailwind yok:** Proje sıfır-derleme statik bir sitedir (GitHub Pages, build
adımı yok). Utility-class yaklaşımı yerine **anlamlı bileşen sınıfları + CSS custom
property token'ları** kullanılır: `class="btn btn-ghost"` gibi. Tema değişimi
(9 etkinlik paleti) tek bir `html[data-event]` niteliğiyle, markup'a dokunmadan çalışır —
utility sınıflarıyla bu mümkün olmazdı. Yeni stil yazarken kural: *renk/boşluk değerini
elle yazma, token kullan; tek kullanımlık inline stil yerine bileşen sınıfı aç.*

---

## 1. Tasarım dili: "Kartpostal" (Canlı Albüm'ün evrimi)

Uygulama bir *form* değil, **postalanan bir anı** gibi davranır: fotoğraf çekip
göndermek, kelimenin tam anlamıyla bir kartpostal yollamaktır. Her görsel karar
bu metafordan türetilir:

- **İmza — üç posta artefaktı** (`.airmail`, `.stamp`, `.postmark`): uçak postası
  şeridi, perfore pul kenarı, yuvarlak tarih damgası. Pul kırmızısı ve posta mavisi
  yalnızca bu artefaktlarda + hatada kullanılır; başka dekor eklenmez.
- Albüm köşe cepleri (`.mounts`, artık pul kırmızısı), polaroid çerçeveler,
  Caveat el yazısı altyazılar, analog tarih baskısı (`.date-stamp`) korunur.
- **Emoji yok.** Vurgu yalnızca renk ve tipografiyle yapılır (kullanıcı kararı).
- Zemin her zaman kâğıt dokusundadır: `body::before` iki yönlü çizgi dokusu
  (`mix-blend-mode: multiply`) tüm sayfalara serilir.

## 2. Token sistemi (`css/style.css` → `:root`)

### Renk

| Token | Değer | Rol |
|---|---|---|
| `--cream` / `--cream-2` | `#FBF6EC` / `#F1E5CF` | Kartpostal kâğıdı / kraft (sayfa gradyanı) |
| `--surface` | `#FFFDF7` | Kart zemini — **etkinlik paletinde değişmez** |
| `--ink` / `--ink-soft` / `--muted` | `#33302A` / `#6C6353` / `#9C8F79` | Metin hiyerarşisi |
| `--gold` / `--gold-dark` | `#29508C` / `#1D3C6D` | Vurgu: posta mavisi (butonlar, başlık altı) |
| `--gold-light` / `--gold-bg` | `#A9BEDD` / `#EBF0F8` | Vurgu kenarlık / vurgu zemin |
| `--line` | `#DFD2B8` | Ayraç ve kenarlıklar |
| `--danger` / `--success` | `#BF3F34` / `#5D8A54` | Durum renkleri (palete göre değişmez) |
| `--stamp` / `--postal-red` | `#BF3F34` | Pul kırmızısı: tarih damgası + artefaktlar |
| `--postal-blue` / `--postal-paper` | `#29508C` / `#FFFDF7` | Artefakt sabitleri (palete göre değişmez) |

Not: `--gold*` adları tarihseldir — "vurgu ailesi" olarak okuyun; 9 etkinlik paleti
bu aileyi yeniden boyar, posta artefaktları (`--postal-*`) sabit kalır.

### Tipografi

| Token | Yazıtipi | Kullanım |
|---|---|---|
| `--serif` | **Bricolage Grotesque** (opsz 12–96) | Başlıklar, çift/etkinlik adı (`.couple`) |
| `--sans` | **Inter** 400/500/600 | Gövde, arayüz |
| `--hand` | **Caveat** 500/600 | El yazısı: polaroid altyazı, not defteri, isimler arasındaki `&` |
| `--mono` | **Courier Prime** | Damga/adres satırı, tarih baskısı, kod/URL |

Yükleme: Google Fonts, her sayfada `preconnect` + tek `<link>`. Davetiye PNG
dışa aktarımı (`js/invite.js → drawPng`) aynı aileleri canvas'ta kullanır ve
`document.fonts.load` ile önceden yükler.

### Biçim

`--radius: 12px`, `--radius-sm: 8px`; gölgeler sıcak kahve tonlu ve yumuşaktır
(`--shadow`, `--shadow-sm`). Köşe cebi: `--corner-c` (pul kırmızısı),
`--corner-len: 22px`, `--corner-w: 1.5px`.

## 3. Etkinlik paletleri (`html[data-event="…"]`)

Konsept seçimi yalnızca **vurgu ailesini ve sayfa zeminini** tonlar; `--surface`,
metin ve durum renkleri sabittir. Palet, `js/events.js → apply(key)` ile uygulanır.

| Etkinlik | `--gold` | Karakter |
|---|---|---|
| wedding (varsayılan) | `#A8844E` | Altın |
| engagement | `#B27680` | Gül kurusu |
| anniversary | `#B89652` | Şampanya |
| birthday | `#BD7653` | Turuncu-kahve |
| romantic | `#B85F73` | Bordo-gül |
| welcome | `#6EA875` | Yaprak yeşili |
| farewell | `#8B7BB7` | Leylak |
| trip | `#4F9FA3` | Deniz camgöbeği |
| meeting | `#5F84B8` | Kurumsal mavi |

Her blok 6 token tanımlar: `--gold`, `--gold-dark`, `--gold-light`, `--gold-bg`,
`--cream`, `--cream-2`. **Yeni palet eklerken bu altılıyı eksiksiz ver** — aksi halde
önceki paletten kalıntı sızar.

## 4. Yerleşim sistemi

### Konteynerler

| Sınıf | Genişlik | Kullanım |
|---|---|---|
| `.page` | `max-width: 560px` | Tek sütun akışlar: yükleme, kurulum, davetiye |
| `.page-wide` | `max-width: 900px` | Galeri ızgarası |
| `.lp-wrap` | `max-width: 1160px` | Landing bölümleri |
| `.stage` | `position: fixed; inset: 0` | Sunum ekranı (tam ekran sahne) |

Mobil öncelikli: temel stiller dar ekran içindir, `min-width` sorguları genişletir
(galeri 1→3→4 sütun; önizleme 3→4 sütun).

### Kırılma noktası ölçeği (kanonik)

```
380 (küçük telefon) · 480 (telefon) · 640 (phablet) · 860 (tablet)
+ 320 güvenlik ağı · orientation-landscape · prefers-reduced-motion · print
```

Yeni `@media` yazarken bu değerlerin dışına çıkma. 320px'te hiçbir sayfada yatay
taşma olmamalı (test: `scratchpad/mobiletest.js`).

### Viewport ve güvenli alan kuralları

- Tüm sayfalarda `viewport-fit=cover`; çentik/ada kenarları **her** `fixed` öğede
  `env(safe-area-inset-*)` ile karşılanır (sendbar, lightbox, sahne çubuğu).
- Tam-yükseklik ölçülerde `svh` kullan (`100vh` yalnızca eski tarayıcı yedeği olarak
  bir üst satırda kalır). `background-attachment: fixed` **yasak** (iOS repaint sorunu).
- Dokunma hedefleri **≥ 44px** (butonlar, çipler, lightbox okları).
- Görsel `width`/`height` nitelikleri (CLS için) varsa CSS'te `height: auto` şart —
  yoksa `aspect-ratio` ezilir.

## 5. Sınıf envanteri ve adlandırma

Kurallar: kebab-case bileşen adı + alt öğe öneki (`.sendbar` → `.sendbar-inner`,
`.sendbar-btn`); durum sınıfları `.active`, `.hidden`, `.is-*`; landing sınıfları
`lp-` önekiyle izole edilir. JS kancaları `id` ile bağlanır, stil sınıfla.

| Küme | Sınıflar | Dosya/bölüm |
|---|---|---|
| Kart & imza | `.card`, `.mounts`, `.event-accent`, `.airmail`, `.stamp`, `.postmark` | style.css §Layout/§Posta artefaktları |
| Tipografi | `.couple`, `.welcome`, `.date-stamp` | §Tipografi |
| Form & buton | `.btn`, `.btn-ghost`, `.field`, `.field-row` | §Formlar/Butonlar |
| Yükleme | `.dropzone`, `.previews`, `.thumb`, `.progress`, `.sendbar`, `.task-chip` | §Yükleme |
| Anı Defteri | `.note-input`, `.notes-wrap`, `.note-card`, `.note-by` | §Anı Defteri |
| Galeri | `.gallery-grid`, `.g-cell`, `.gallery-bar`, `.gallery-actions` | §Galeri |
| Lightbox | `.lb`, `.lb-img`, `.lb-nav`, `.lb-cap` | §Lightbox |
| Kurulum | `.concept-grid`, `.concept-card`, `.google-card`, `.deploy-card` | §Kurulum |
| Davetiye | `.envelope`, `.env-seal`, `.invite-card`, `.inv-*` | §Davetiye |
| Sunum | `.stage`, `.pol-layer`, `.polaroid`, `.stage-bar`, `.stage-qr` | §Canlı Sunum |
| Landing | `.lp-nav`, `.lp-hero`, `.lp-pol`, `.lp-step`, `.lp-acc-*`, `.lp-theme-chip`, `.lp-ko` | landing.css |

Ölü kod notu: `.wizard`/`.wz-*` bloğu artık hiçbir HTML'de kullanılmıyor
(kaldırılabilir).

## 6. Hareket ve erişilebilirlik

- Her animasyonun `prefers-reduced-motion: reduce` karşılığı vardır: scroll-scrub
  sahneleri statikleşir, video durur, geçişler kapanır.
- Landing scroll animasyonu tek rAF döngüsüdür; ölçümler önbelleklidir ve `resize`
  yalnızca **genişlik** değişince yeniden ölçer (mobil URL çubuğu titretmez).
- Odak halkaları kaldırılmaz; akordeon/çipler klavye ve dokunmayla da çalışır
  (hover yalnızca zenginleştirme).

---

## Alternatif yönler

> **Karar (2026-07-11):** Üç yön görsel önizlemeyle karşılaştırıldı; kullanıcı
> **C · Kartpostal**'ı seçti. C artık `:root`'un kendisidir (yukarıdaki bölümler
> onu anlatır). A ve B, ileride gerekirse `data-skin` bloğu olarak buradan
> canlandırılabilir; C'nin bloğu tarihçe için korunmuştur.

Üç yön de fotoğrafçılığın **malzeme dünyasından** türetildi ve gerçek `style.css`
üzerinde bileşen örnekleriyle doğrulandı. Her biri mevcut token adlarını yeniden
doldurur: bileşenler token okuduğu için restil büyük ölçüde kendiliğinden akar.

**Deneme mekanizması (A/B için):** Aşağıdaki bloklardan birini `css/style.css` sonuna
yapıştır, `<html>` etiketine `data-skin="…"` ekle ve belirtilen font linkini sayfaya al.

### A — Kontak Baskı *(karanlık oda)*

Fotoğrafçının çalışma masası: kontak baskı üzerinde kareler, kenarlarında film
rebate yazıları, emniyet lambasının amber ışığı. Sunum ekranının koyu estetiği
tüm uygulamaya yayılır — "albüm" değil "banyo/baskı masası" metaforu.

- **Palet:** film siyahı `#221E19` · çerçeve `#15130F` · baskı beyazı `#F0EBE1` ·
  amber `#D98E32` · gres kalemi kırmızısı `#C3512E`
- **Tipografi:** Archivo (wdth ekseni; başlık %112 geniş, 700) tek aile + Space Mono
  (rebate markaları). El yazısı yok — altyazılar `24A ▸ AYŞE TEYZE · 23:47` biçiminde
  mono "kenar yazısı" olur.
- **Yerleşim/imza:** Fotoğraflar film karesi çerçevesinde (`#15130F` zemin, altında
  amber mono etiket); galeri bir kontak baskı ızgarası; seçim/vurgu gres kalemi
  kırmızısıyla daire/işaret. Gölge yerine 1px çerçeve çizgisi.
- **Ne zaman:** Uygulamayı profesyonel/kiosk hissiyatına taşımak, sahne ekranıyla
  bütünleşmek istenirse. Riski: davetiye gibi "sıcak" akışlarda soğuk kalabilir;
  açık zemin bekleyen misafir kitlesine alışılmadık gelir.

```css
html[data-skin="kontak"] {
  --cream: #221E19; --cream-2: #191612; --surface: #2B2620;
  --ink: #F0EBE1; --ink-soft: #B5AB9C; --muted: #857B6C;
  --gold: #D98E32; --gold-dark: #E8A33D; /* koyu zeminde vurgu AÇIK ton olmalı */
  --gold-light: #6B5322; --gold-bg: #33291A; --line: #453D32;
  --danger: #C3512E; --success: #8FA871; --stamp: #D98E32;
  --shadow: 0 0 0 1px #15130F, 0 14px 30px -18px rgba(0,0,0,.8);
  --shadow-sm: 0 0 0 1px #15130F;
  --corner-c: #F0EBE1;
  --serif: "Archivo", sans-serif; --sans: "Archivo", sans-serif;
  --hand: "Space Mono", monospace; --mono: "Space Mono", monospace;
}
/* Gerekli bileşen dokunuşları (önizlemede saptandı):
   1) .btn birincil: koyu zeminde amber dolgu + koyu metin
   2) .task-chip pasif: açık gri blok yerine saydam zemin + --line kenarlık
   3) body::before doku katmanının opaklığını ~%30'a düşür */
```
Font linki: `family=Archivo:wdth,wght@62..125,400..800&family=Space+Mono:wght@400;700`

### B — Renk Kartı *(stüdyo beyazı)*

Stüdyonun kesintisiz beyaz fonu + fotoğrafçının kalibrasyon kartı (ColorChecker).
Kusursuz nötr zemin üzerinde tek hassas vurgu; süs tamamen atılır, hassasiyet
süsün yerini alır.

- **Palet:** fon beyazı `#F7F7F5` · fon gölgesi `#ECECE8` · stüdyo mürekkebi `#26282B` ·
  kalibre mavi `#3565D1` · kart turuncusu `#E0912F` (yalnız uyarı/işaret)
- **Tipografi:** Schibsted Grotesk (başlık, sıkı espas) + Inter (gövde) +
  JetBrains Mono (EXIF-altyazılar: `23:47 · Ayşe teyze · f/1.8`).
- **Yerleşim/imza:** Gölge yerine **baskı destesi ofseti** (`4px 4px 0 var(--line)`),
  köşeler 6px'e iner. **İmza:** 9 etkinlik paleti, pill çip yerine ColorChecker
  **kare renk yaması şeridi** olarak sunulur (aktif yama `outline` alır) — hem tema
  seçici hem marka anı. Polaroid altyazıları EXIF satırına dönüşür (genişliği fotoğrafla
  sınırla; önizlemede taşma görüldü).
- **Ne zaman:** "meeting/kurumsal" kullanım ağırlıklıysa, uygulamanın araç-gibi
  (utility) algılanması istenirse. Riski: sıcaklık kaybı — düğün kitlesinde mesafeli
  durabilir; el yazısı tamamen kaybolur.

```css
html[data-skin="renk-karti"] {
  --cream: #F7F7F5; --cream-2: #ECECE8; --surface: #FFFFFF;
  --ink: #26282B; --ink-soft: #5F6368; --muted: #94989E;
  --gold: #3565D1; --gold-dark: #2A4FA8; --gold-light: #B9CBEE; --gold-bg: #EEF3FC;
  --line: #DCDCD6; --danger: #C24438; --success: #4C8A55; --stamp: #E0912F;
  --radius: 6px; --radius-sm: 4px;
  --shadow: 4px 4px 0 #DCDCD6, 0 0 0 1px #DCDCD6;
  --shadow-sm: 3px 3px 0 #E4E4DF, 0 0 0 1px #DCDCD6;
  --corner-c: #26282B;
  --serif: "Schibsted Grotesk", sans-serif; --sans: "Inter", sans-serif;
  --hand: "JetBrains Mono", monospace; --mono: "JetBrains Mono", monospace;
}
/* Bileşen dokunuşları: .task-chip ve .lp-theme-chip kare yamaya dönüşür;
   body::before dokusu kapatılır (fon kusursuz kalmalı). */
```
Font linki: `family=Schibsted+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500`

### C — Kartpostal *(posta yolu)* — **SEÇİLDİ ✓**

Anı paylaşmanın en eski hali: kartpostal. Pul, damga, uçak postası şeridi —
"fotoğraf çek, gönder" eylemi kelimenin tam anlamıyla *postalamak* olur. Türk
kitleye en tanıdık duygusal kod; davetiye özelliğiyle kusursuz örtüşür.
*Uygulandı: token'lar `:root`'a işlendi, artefakt sınıfları style.css'te,
airmail şeridi upload/gallery/davetiye kartlarında, postmark başarı ekranında.*

- **Palet:** kartpostal kâğıdı `#FBF6EC` · kraft `#F1E5CF` · posta mavisi `#29508C` ·
  pul kırmızısı `#BF3F34` · mürekkep `#33302A`
- **Tipografi:** Bricolage Grotesque (başlık — sıcak, karakterli grotesk) + Inter
  (gövde) + **Caveat kalır** (kartpostal el yazısı!) + Courier Prime (adres satırı /
  damga yazısı).
- **Yerleşim/imza:** Üç posta artefaktı: **uçak postası şeridi** (kırmızı-beyaz-mavi
  diyagonal, bölüm ayracı olarak), **perfore pul kenarı** (radial-gradient mask —
  fotoğraflar "pul" olur), **yuvarlak tarih damgası** (`11 TEM 2026`, hafif dönük).
  Davetiye ana özellik konumuna yükselir: zarf → kartpostal çevirme animasyonu.
  Anı Defteri notları kartpostal arkası gibi dizilir (sol mesaj, sağ adres/imza).
- **Ne zaman:** Uygulamanın duygusal, paylaşım-odaklı kimliğini büyütmek istenirse;
  mevcut kimlikten en az kopan, en çok "karakter ekleyen" seçenek. Riski: iki vurgu
  rengi (mavi+kırmızı) disiplin ister — kırmızı yalnız posta artefaktlarında ve
  hatada kullanılmalı, yoksa sayfa bayraklaşır.

```css
html[data-skin="kartpostal"] {
  --cream: #FBF6EC; --cream-2: #F1E5CF; --surface: #FFFDF7;
  --ink: #33302A; --ink-soft: #6C6353; --muted: #9C8F79;
  --gold: #29508C; --gold-dark: #1D3C6D; --gold-light: #A9BEDD; --gold-bg: #EBF0F8;
  --line: #DFD2B8; --danger: #BF3F34; --success: #5D8A54; --stamp: #BF3F34;
  --corner-c: #BF3F34;
  --serif: "Bricolage Grotesque", sans-serif; --sans: "Inter", sans-serif;
  --hand: "Caveat", cursive; --mono: "Courier Prime", monospace;
}
/* İmza yardımcıları (yeni sınıflar):
   .airmail  → repeating-linear-gradient(-45deg, #BF3F34 0 12px, #FFFDF7 12px 24px,
               #29508C 24px 36px, #FFFDF7 36px 48px); height: 8px
   .stamp    → perfore kenar: mask: radial-gradient(circle 5px at 5px 5px,
               transparent 98%, #000) -5px -5px / 12px 12px
   .postmark → 74px daire, 2px kenarlık, Courier, rotate(-8deg) */
```
Font linki: `family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=Courier+Prime:wght@400;700`

### Karşılaştırma

| | A · Kontak Baskı | B · Renk Kartı | C · Kartpostal |
|---|---|---|---|
| Sıcaklık | Koyu, loş | Nötr, serin | Sıcak, oyunlu |
| El yazısı | Yok (mono rebate) | Yok (EXIF mono) | **Kalır** (Caveat) |
| data-event paletleri | Yalnız vurgu tonlar | Yama şeridi olur | Aynen çalışır |
| Uygulama maliyeti | Orta (buton/çip dokunuşu) | Orta (çip→yama, doku kapatma) | Düşük (3 yeni sınıf) |
| En güçlü sayfa | Sunum ekranı | Galeri/kurulum | Davetiye/yükleme |

Öneri **C** idi; kullanıcı onayıyla uygulandı. **A**, sunum-ekranı-ağırlıklı kiosk
kullanımına dönüş olursa; **B**, `meeting` gibi kurumsal senaryo öne çıkarsa hâlâ
değerlendirilebilir.
