/* =========================================================================
   i18n.js — Ortak TR/EN metin katmani
   URL parametresi: ?lang=tr veya ?lang=en
   ========================================================================= */

(function () {
  'use strict';

  var STORAGE_KEY = 'eventPhotoLang';
  var LEGACY_STORAGE_KEY = 'weddingUploadLang';

  var DICT = {
    tr: {
      'title.setup': 'EventPhoto · Kurulum',
      'title.upload': 'EventPhoto · Fotoğraf Paylaşımı',
      'title.gallery': 'EventPhoto · Galeri',
      'title.card': 'EventPhoto · QR Kart',
      'title.slideshow': 'EventPhoto · Canlı Sunum',

      'setup.eyebrow': 'EventPhoto · Etkinlik Sahibi',
      'setup.brandHtml': 'EventPhoto<span class="amp">ortak</span>Albüm',
      'setup.subtitleHtml': 'Her etkinlik için kendi Google Drive\'ınıza bağlı bir <b>QR albüm</b> oluşturun. Katılımcılar QR\'ı okutup fotoğraflarını doğrudan Drive\'ınıza yükler.',
      'setup.googleTitle': 'Google Drive\'a Bağlan',
      'setup.googleDesc': 'Fotoğraflar otomatik olarak Google Drive\'ınıza kaydedilecek. Apps Script projesi sizin için otomatik oluşturulup yayınlanacak.',
      'setup.googleSignIn': 'Google ile Bağlan',
      'setup.deployTitle': 'Kurulum yapılıyor…',
      'setup.deployFolder': 'Drive klasörü oluşturuluyor',
      'setup.deployProject': 'Apps Script projesi oluşturuluyor',
      'setup.deployDeploy': 'Web App yayınlanıyor',
      'setup.deployAuth': 'Drive izni bekleniyor',
      'setup.deployDone': 'Kurulum tamamlandı',
      'setup.completeTitle': 'Google Drive Bağlantısı Hazır',
      'setup.completeDesc': 'Apps Script projeniz oluşturuldu ve Drive klasörünüz hazır. Şimdi etkinlik ayarlarını yapabilirsiniz.',
      'setup.reconnect': 'Yeniden Bağlan',
      'setup.languageLabel': '3 · Dil',
      'setup.advanced': 'Gelişmiş ayarlar (isteğe bağlı)',
      'setup.manualApiLabelHtml': 'Web App URL (manuel bağlantı) <span class="hint">— "Google ile Bağlan" kullanmadan kendi yayınladığınız Apps Script adresi</span>',
      'setup.manualApiPlaceholder': 'https://script.google.com/macros/s/…/exec',
      'setup.manualApiHelp': 'Code.gs\'i kendiniz yayınladıysanız (README Bölüm B) Web App URL\'ini buraya yapıştırın; Google ile bağlanmak gerekmez.',
      'setup.tokenLabelHtml': 'Güvenlik anahtarı (token) <span class="hint">— linkiniz sızsa bile yabancı yüklemeleri engeller</span>',
      'setup.tokenPlaceholder': '(boş bırakılabilir)',
      'setup.generateToken': 'Üret',
      'setup.tokenHelpHtml': 'Bu anahtar otomatik yapılandırıldı.',
      'setup.rawLabelHtml': 'Orijinal çözünürlükte yükle <span class="hint">(kapalıyken fotoğraflar hızlı yüklenmesi için ~2560px\'e küçültülür)</span>',
      'setup.noTasksLabelHtml': 'Fotoğraf görevlerini kapat <span class="hint">(misafirlere "Dans pistinden bir kare" gibi görev önerileri gösterilmez)</span>',
      'setup.generateButton': 'QR Kodu Oluştur',
      'setup.resultTitle': 'QR Kodunuz Hazır',
      'setup.resultSubtitle': 'Aşağıdaki QR\'ı indirip masalara yerleştirin veya bu kartı doğrudan yazdırın.',
      'setup.qrSmall': 'Fotoğraflarınızı paylaşmak için okutun',
      'setup.downloadPng': 'PNG İndir',
      'setup.cardPdf': 'Kart Yazdır (PDF)',
      'setup.copyUpload': 'Yükleme Linkini Kopyala',
      'setup.preview': 'Yükleme Sayfasını Önizle',
      'setup.galleryTitle': 'Özel Galeri',
      'setup.gallerySubtitleHtml': 'Yüklenen tüm fotoğrafları görmek için bu <b>özel</b> linki <b>yalnızca siz</b> kullanın. Katılımcılarla paylaşmayın.',
      'setup.openGallery': 'Galeriyi Aç',
      'setup.copyGallery': 'Galeri Linkini Kopyala',
      'setup.slideshowTitle': 'Canlı Sunum Ekranı',
      'setup.slideshowSubtitleHtml': 'Mekandaki <b>TV veya projeksiyona</b> bu linki açın: yüklenen fotoğraflar saniyeler içinde ekranda belirir, köşedeki QR misafirleri paylaşmaya çağırır. Link özeldir, katılımcılarla paylaşmayın.',
      'setup.openSlideshow': 'Sunum Ekranını Aç',
      'setup.copySlideshow': 'Sunum Linkini Kopyala',
      'setup.copySlideshowOk': 'Sunum linki kopyalandı.',
      'setup.edit': 'Ayarları Düzenle',
      'setup.footer': 'EventPhoto sunucusuz & ücretsizdir · Fotoğraflar yalnızca sizin Google Drive\'ınıza kaydedilir.',
      'setup.albumTitle': 'EventPhoto Etkinlik Albümü',
      'setup.needAuth': 'Önce Google ile bağlanın veya Gelişmiş ayarlar\'dan Web App URL\'inizi girin.',
      'setup.deployError': 'Kurulum sırasında hata oluştu: {msg}',
      'setup.deployRetry': 'Tekrar Dene',
      'setup.authError': 'Google oturum açma başarısız oldu.',
      'setup.popupBlocked': 'Popup engelleyiciyi kapatıp tekrar deneyin.',
      'setup.setupOk': 'Kurulum başarılı. QR kodu oluşturabilirsiniz.',
      'setup.qrMissing': 'QR görüntüsü hazırlanamadı, tekrar oluşturun.',
      'setup.copyUploadOk': 'Yükleme linki kopyalandı.',
      'setup.copyGalleryOk': 'Galeri linki kopyalandı.',

      'setup.eventLabel': '1 · Etkinlik Türü',

      'event.wedding.name': 'Düğün',
      'event.wedding.welcome': '{title} çiftinin mutlu gününe hoş geldiniz!',
      'event.wedding.welcomeDefault': 'Mutlu Günümüze Hoş Geldiniz!',
      'event.wedding.subtitle': 'Lütfen bu geceye ait karelerinizi bizimle paylaşın. Her fotoğraf bizim için çok kıymetli.',
      'event.wedding.titleLabel': 'Çift İsimleri',
      'event.wedding.titlePlaceholder': 'Örn. Ayşe & Mehmet',

      'event.engagement.name': 'Nişan',
      'event.engagement.welcome': '{title} çiftinin nişanına hoş geldiniz!',
      'event.engagement.welcomeDefault': 'Nişanımıza Hoş Geldiniz!',
      'event.engagement.subtitle': 'Bu mutlu anımıza ait karelerinizi bizimle paylaşın.',
      'event.engagement.titleLabel': 'Çift İsimleri',
      'event.engagement.titlePlaceholder': 'Örn. Ayşe & Mehmet',

      'event.anniversary.name': 'Yıldönümü',
      'event.anniversary.welcome': 'Yıldönümümüze Hoş Geldiniz!',
      'event.anniversary.welcomeDefault': 'Yıldönümümüze Hoş Geldiniz!',
      'event.anniversary.subtitle': 'Bu özel akşama ait karelerinizi bizimle paylaşın.',
      'event.anniversary.titleLabel': 'İsimler / Başlık',
      'event.anniversary.titlePlaceholder': 'Örn. Ayşe & Mehmet · 10. Yıl',

      'event.birthday.name': 'Doğum Günü',
      'event.birthday.welcome': 'Doğum Günü Partisine Hoş Geldiniz!',
      'event.birthday.welcomeDefault': 'Doğum Günü Partisine Hoş Geldiniz!',
      'event.birthday.subtitle': 'Bu neşeli güne ait karelerinizi bizimle paylaşın!',
      'event.birthday.titleLabel': 'Başlık (kimin doğum günü)',
      'event.birthday.titlePlaceholder': 'Örn. Ayşe’nin 30. Yaşı',

      'event.romantic.name': 'Romantik Akşam Yemeği',
      'event.romantic.welcome': '{title} için romantik akşamımıza hoş geldiniz.',
      'event.romantic.welcomeDefault': 'Romantik Akşam Yemeğimize Hoş Geldiniz',
      'event.romantic.subtitle': 'Bu özel akşam yemeğine ait güzel kareleri bizimle paylaşın.',
      'event.romantic.titleLabel': 'Başlık (isteğe bağlı)',
      'event.romantic.titlePlaceholder': 'Örn. Yıldönümü Akşam Yemeği',

      'event.welcome.name': 'Hoş Geldin Partisi',
      'event.welcome.welcome': '{title} hoş geldin partisine hoş geldiniz!',
      'event.welcome.welcomeDefault': 'Hoş Geldin Partisine Hoş Geldiniz!',
      'event.welcome.subtitle': 'Bu güzel hoş geldin partisine ait karelerinizi bizimle paylaşın!',
      'event.welcome.titleLabel': 'Başlık',
      'event.welcome.titlePlaceholder': 'Örn. Ayşe için Hoş Geldin',

      'event.farewell.name': 'Veda Partisi',
      'event.farewell.welcome': '{title} veda partisine hoş geldiniz.',
      'event.farewell.welcomeDefault': 'Veda Partisine Hoş Geldiniz',
      'event.farewell.subtitle': 'Bu anlamlı veda partisine ait karelerinizi bizimle paylaşın.',
      'event.farewell.titleLabel': 'Başlık',
      'event.farewell.titlePlaceholder': 'Örn. Mehmet için Veda',

      'event.trip.name': 'Gezi',
      'event.trip.welcome': 'Gezimize Hoş Geldiniz!',
      'event.trip.welcomeDefault': 'Gezimize Hoş Geldiniz!',
      'event.trip.subtitle': 'Gezimizden çektiğiniz kareleri bizimle paylaşın!',
      'event.trip.titleLabel': 'Gezi Adı',
      'event.trip.titlePlaceholder': 'Örn. Kapadokya 2026',

      'event.meeting.name': 'Toplantı',
      'event.meeting.welcome': 'Toplantımıza Hoş Geldiniz!',
      'event.meeting.welcomeDefault': 'Toplantımıza Hoş Geldiniz!',
      'event.meeting.subtitle': 'Etkinlikten çektiğiniz kareleri bizimle paylaşın.',
      'event.meeting.titleLabel': 'Toplantı / Organizasyon Adı',
      'event.meeting.titlePlaceholder': 'Örn. Yıllık Şirket Toplantısı',

      'task.wedding.selfie': 'Çiftle bir selfie',
      'task.wedding.dance': 'Dans pistinden bir kare',
      'task.wedding.table': 'Masanızdan bir detay',
      'task.wedding.style': 'En şık misafir',
      'task.wedding.toast': 'Kadeh kaldırma anı',
      'task.wedding.laugh': 'En içten kahkaha',
      'task.engagement.ring': 'Yüzüklerin yakın çekimi',
      'task.engagement.couple': 'Çiftle bir kare',
      'task.engagement.family': 'Aileler bir arada',
      'task.engagement.sweet': 'En tatlı an',
      'task.engagement.laugh': 'En içten kahkaha',
      'task.anniversary.couple': 'Çiftin en güzel karesi',
      'task.anniversary.toast': 'Kadeh kaldırma anı',
      'task.anniversary.cake': 'Pasta anı',
      'task.anniversary.friends': 'Dostlarla bir kare',
      'task.anniversary.memory': 'Geceden bir hatıra',
      'task.birthday.cake': 'Mum üfleme anı',
      'task.birthday.gift': 'Hediye açılışı',
      'task.birthday.group': 'Grup fotoğrafı',
      'task.birthday.funny': 'En komik an',
      'task.birthday.decor': 'Süslemelerden bir detay',
      'task.romantic.table': 'Masadan bir kare',
      'task.romantic.cheers': 'Kadehler tokuşurken',
      'task.romantic.couple': 'Birlikte bir selfie',
      'task.romantic.detail': 'Akşamdan bir detay',
      'task.welcome.greet': 'Karşılama anı',
      'task.welcome.hug': 'En sıcak kucaklaşma',
      'task.welcome.group': 'Hep birlikte bir kare',
      'task.welcome.smile': 'En büyük gülümseme',
      'task.farewell.hug': 'Veda kucaklaşması',
      'task.farewell.group': 'Son bir grup fotoğrafı',
      'task.farewell.memory': 'Buradan bir hatıra',
      'task.farewell.smile': 'Gülümseyen yüzler',
      'task.trip.view': 'En güzel manzara',
      'task.trip.group': 'Grup fotoğrafı',
      'task.trip.food': 'Yerel bir lezzet',
      'task.trip.candid': 'Doğal bir an',
      'task.trip.funny': 'En komik an',
      'task.meeting.team': 'Ekip bir arada',
      'task.meeting.stage': 'Sahneden bir kare',
      'task.meeting.coffee': 'Kahve molası',
      'task.meeting.detail': 'Etkinlikten bir detay',

      'upload.eyebrow': 'Hoş Geldiniz',
      'upload.welcomeDefault': 'Etkinliğimize Hoş Geldiniz!',
      'upload.taskLabelHtml': 'Fotoğraf görevi seç <span class="hint">(isteğe bağlı — eğlenceli bir kare yakala!)</span>',
      'upload.welcomeCouple': '{couple} etkinliğine hoş geldiniz!',
      'upload.subtitle': 'Lütfen etkinliğe ait karelerinizi bizimle paylaşın. Her fotoğraf bizim için çok kıymetli.',
      'upload.configErrorHtml': '<b>Bağlantı ayarı bulunamadı.</b><br />Bu sayfa masadaki QR kod üzerinden açılmalıdır. Lütfen QR kodu tekrar okutun.',
      'upload.guestLabelHtml': 'Adınız <span class="hint">(isteğe bağlı)</span>',
      'upload.guestPlaceholder': 'Örn. Ayşe Teyze',
      'upload.dropTitle': 'Fotoğraf Seç / Çek',
      'upload.dropAria': 'Fotoğraf seç veya çek',
      'upload.dropSub': 'Galerinizden seçin veya buraya sürükleyin',
      'upload.galleryButton': 'Galeri',
      'upload.cameraButton': 'Kamera',
      'upload.progressLoading': 'Yükleniyor…',
      'upload.uploadButton': 'Yükle',
      'upload.successTitle': 'Teşekkür Ederiz!',
      'upload.successText': 'Fotoğraflarınız bizimle güvenle paylaşıldı. Bu güzel anı ölümsüzleştirdiğiniz için minnettarız.',
      'upload.more': 'Daha Fazla Fotoğraf Yükle',
      'upload.footer': 'Fotoğraflarınız yalnızca özel albümde güvenle saklanır.',
      'upload.retryFailed': 'Başarısızları Tekrar Dene ({count})',
      'upload.uploadMany': '{count} Fotoğrafı Yükle',
      'upload.preparing': 'Hazırlanıyor…',
      'upload.uploading': 'Yükleniyor…',
      'upload.skippedType': '{count} dosya fotoğraf olmadığı için eklenmedi.',
      'upload.skippedSize': '{count} fotoğraf 40MB sınırını aştığı için eklenmedi.',
      'upload.noteTitle': 'Anı Defteri',
      'upload.noteSub': 'Fotoğrafın yanına bir de not bırakın — sunum ekranında ve albümde yerini alır.',
      'upload.notePlaceholder': 'Örn. Nice mutlu senelere! Bu gece harikaydı…',
      'upload.noteSend': 'Notu Gönder',
      'upload.noteThanks': 'Notunuz iletildi. Teşekkürler!',
      'upload.noteFail': 'Not gönderilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.',
      'upload.invalidTokenHtml': '<b>Yükleme güvenlik anahtarı geçersiz.</b> Lütfen QR kodu tekrar okutun veya paylaşılan güncel linki kullanın.',
      'upload.partialErrorHtml': '<b>{ok} fotoğraf yüklendi, {failed} tanesi başarısız.</b> İnternet bağlantınızı kontrol edip “Tekrar Dene”ye dokunun.',

      'gallery.eyebrow': 'Fotoğraf Albümü',
      'gallery.titleDefault': 'Anılarımız',
      'gallery.subtitleDefault': 'Katılımcıların etkinliğe ait paylaştığı kareler.',
      'gallery.subtitleCouple': '{couple} · katılımcıların paylaştığı kareler.',
      'gallery.subtitleTitle': '{title} · katılımcıların paylaştığı kareler.',
      'gallery.configErrorHtml': '<b>Galeri bağlantısı eksik.</b><br />Bu sayfa kurulum ekranındaki <b>“Galeri Linki”</b> ile açılmalıdır.',
      'gallery.notesTitle': 'Anı Defteri ({count} not)',
      'gallery.countLoading': 'Yükleniyor…',
      'gallery.driveFolder': 'Drive Klasörü',
      'gallery.refresh': 'Yenile',
      'gallery.loading': 'Fotoğraflar getiriliyor…',
      'gallery.empty': 'Henüz fotoğraf yüklenmemiş. Katılımcılar QR\'ı okutup fotoğraf paylaştıkça burada görünecek.',
      'gallery.footer': 'Bu galeri yalnızca sizin görmeniz içindir. Linki paylaşmayın.',
      'gallery.openDrive': 'Drive\'da aç ↗',
      'gallery.countPhotos': '{count} fotoğraf',
      'gallery.countEmpty': 'Fotoğraf yok',
      'gallery.failList': 'Liste alınamadı.',
      'gallery.failConnection': 'Bağlantı kurulamadı. Web App URL\'inizi ve internet bağlantınızı kontrol edin.',
      'gallery.invalidToken': 'Geçersiz güvenlik anahtarı.',

      'card.toolsEyebrow': 'Yazdırılabilir QR Kart',
      'card.toolsTitle': 'Masa Kartı',
      'card.toolsSubtitleHtml': 'Sayfa başına kaç kart istediğinizi seçin, ardından <b>Yazdır</b>\'a basıp hedef olarak <b>“PDF olarak kaydet”</b>i seçin. Kesik çizgilerden kesip masalara koyun.',
      'card.errorHtml': '<b>Kart verisi eksik.</b> Bu sayfayı kurulum ekranındaki “Yazdırılabilir Kart” butonuyla açın.',
      'card.copies1': '1 / sayfa',
      'card.copies2': '2 / sayfa',
      'card.copies4': '4 / sayfa',
      'card.copies6': '6 / sayfa',
      'card.print': 'Yazdır / PDF Kaydet',
      'card.back': 'Kuruluma Dön',
      'card.tipHtml': 'İpucu: En iyi sonuç için bilgisayardan yazdırın ve tarayıcı yazdırma ayarlarında <b>“Arka plan grafikleri”</b> seçeneğini açın.',
      'card.pcEyebrow': 'Hoş Geldiniz',
      'card.defaultCouple': 'Etkinliğimiz',
      'card.defaultTitle': 'Etkinliğimiz',
      'card.qrFail': 'QR üretilemedi',
      'card.pcCta': 'Anılarınızı bizimle paylaşın',
      'card.pcSub': 'Fotoğraflarınızı yüklemek için QR kodu telefonunuzla okutun',

      'slideshow.share': 'Fotoğraflarını paylaş',
      'slideshow.emptyTitle': 'İlk kareyi sen paylaş!',
      'slideshow.emptySub': 'QR\'ı telefonunla okut; fotoğrafın saniyeler içinde bu ekranda belirsin.',
      'slideshow.hint': 'Tam ekran için tıklayın',
      'slideshow.count': '{count} kare',
      'slideshow.new': 'Yeni',
      'slideshow.connError': 'Bağlantı bekleniyor… Ekran otomatik olarak yeniden denenecek.',
      'slideshow.configErrorHtml': '<b>Sunum bağlantısı eksik.</b> Bu sayfayı kurulum ekranındaki “Sunum Ekranı” linkiyle açın.'
    },

    en: {
      'title.setup': 'EventPhoto · Setup',
      'title.upload': 'EventPhoto · Photo Sharing',
      'title.gallery': 'EventPhoto · Gallery',
      'title.card': 'EventPhoto · QR Card',
      'title.slideshow': 'EventPhoto · Live Wall',

      'setup.eyebrow': 'EventPhoto · Host Setup',
      'setup.brandHtml': 'EventPhoto<span class="amp">shared</span>Album',
      'setup.subtitleHtml': 'Create a <b>QR album</b> connected to your own Google Drive for any event. Participants scan the QR and upload photos directly to your Drive.',
      'setup.googleTitle': 'Connect Google Drive',
      'setup.googleDesc': 'Photos will be saved to your Google Drive automatically. An Apps Script project will be created and deployed for you.',
      'setup.googleSignIn': 'Sign in with Google',
      'setup.deployTitle': 'Setting up…',
      'setup.deployFolder': 'Creating Drive folder',
      'setup.deployProject': 'Creating Apps Script project',
      'setup.deployDeploy': 'Deploying Web App',
      'setup.deployAuth': 'Waiting for Drive permission',
      'setup.deployDone': 'Setup complete',
      'setup.completeTitle': 'Google Drive Connected',
      'setup.completeDesc': 'Your Apps Script project and Drive folder are ready. Now configure your event below.',
      'setup.reconnect': 'Reconnect',
      'setup.languageLabel': '3 · Language',
      'setup.advanced': 'Advanced settings (optional)',
      'setup.manualApiLabelHtml': 'Web App URL (manual connection) <span class="hint">— your own deployed Apps Script address, no Google sign-in needed</span>',
      'setup.manualApiPlaceholder': 'https://script.google.com/macros/s/…/exec',
      'setup.manualApiHelp': 'If you deployed Code.gs yourself (README section B), paste its Web App URL here; Google sign-in is not required.',
      'setup.tokenLabelHtml': 'Security key (token) <span class="hint">— blocks uploads without the private link token</span>',
      'setup.tokenPlaceholder': '(optional)',
      'setup.generateToken': 'Generate',
      'setup.tokenHelpHtml': 'Configured automatically during setup.',
      'setup.rawLabelHtml': 'Upload original resolution <span class="hint">(off: photos are resized to ~2560px for faster uploads)</span>',
      'setup.noTasksLabelHtml': 'Turn off photo tasks <span class="hint">(guests won’t see suggestions like “A shot from the dance floor”)</span>',
      'setup.generateButton': 'Create QR Code',
      'setup.resultTitle': 'Your QR Code Is Ready',
      'setup.resultSubtitle': 'Download the QR below for the tables, or open the printable card layout.',
      'setup.qrSmall': 'Scan to share your photos',
      'setup.downloadPng': 'Download PNG',
      'setup.cardPdf': 'Print Card (PDF)',
      'setup.copyUpload': 'Copy Upload Link',
      'setup.preview': 'Preview Upload Page',
      'setup.galleryTitle': 'Private Gallery',
      'setup.gallerySubtitleHtml': 'Use this <b>private</b> link to view every uploaded photo. Keep it for hosts only.',
      'setup.openGallery': 'Open Gallery',
      'setup.copyGallery': 'Copy Gallery Link',
      'setup.slideshowTitle': 'Live Photo Wall',
      'setup.slideshowSubtitleHtml': 'Open this link on the venue <b>TV or projector</b>: uploaded photos appear on screen within seconds, and the corner QR invites guests to share. The link is private — do not share it with guests.',
      'setup.openSlideshow': 'Open Live Wall',
      'setup.copySlideshow': 'Copy Live Wall Link',
      'setup.copySlideshowOk': 'Live wall link copied.',
      'setup.edit': 'Edit Settings',
      'setup.footer': 'EventPhoto is serverless & free · Photos are saved only to your Google Drive.',
      'setup.albumTitle': 'EventPhoto Event Album',
      'setup.needAuth': 'Connect with Google first, or paste your Web App URL under Advanced settings.',
      'setup.deployError': 'Setup error: {msg}',
      'setup.deployRetry': 'Retry',
      'setup.authError': 'Google sign-in failed.',
      'setup.popupBlocked': 'Disable popup blocker and try again.',
      'setup.setupOk': 'Setup complete. You can now create the QR code.',
      'setup.qrMissing': 'The QR image could not be prepared. Please create it again.',
      'setup.copyUploadOk': 'Upload link copied.',
      'setup.copyGalleryOk': 'Gallery link copied.',

      'setup.eventLabel': '1 · Event Type',

      'event.wedding.name': 'Wedding',
      'event.wedding.welcome': 'Welcome to {title}’s special day!',
      'event.wedding.welcomeDefault': 'Welcome to Our Special Day!',
      'event.wedding.subtitle': 'Please share your favorite moments from tonight. Every photo means so much to us.',
      'event.wedding.titleLabel': 'Couple Names',
      'event.wedding.titlePlaceholder': 'e.g., Emma & Noah',

      'event.engagement.name': 'Engagement',
      'event.engagement.welcome': 'Welcome to {title}’s engagement!',
      'event.engagement.welcomeDefault': 'Welcome to Our Engagement!',
      'event.engagement.subtitle': 'Share your favorite moments from our happy day.',
      'event.engagement.titleLabel': 'Couple Names',
      'event.engagement.titlePlaceholder': 'e.g., Emma & Noah',

      'event.anniversary.name': 'Anniversary',
      'event.anniversary.welcome': 'Welcome to Our Anniversary!',
      'event.anniversary.welcomeDefault': 'Welcome to Our Anniversary!',
      'event.anniversary.subtitle': 'Share your favorite moments from this special evening.',
      'event.anniversary.titleLabel': 'Names / Title',
      'event.anniversary.titlePlaceholder': 'e.g., Emma & Noah · 10th Year',

      'event.birthday.name': 'Birthday',
      'event.birthday.welcome': 'Welcome to the Birthday Party!',
      'event.birthday.welcomeDefault': 'Welcome to the Birthday Party!',
      'event.birthday.subtitle': 'Share your fun moments from today!',
      'event.birthday.titleLabel': 'Title (whose birthday)',
      'event.birthday.titlePlaceholder': 'e.g., Emma’s 30th',

      'event.romantic.name': 'Romantic Dinner',
      'event.romantic.welcome': 'Welcome to {title}.',
      'event.romantic.welcomeDefault': 'Welcome to Our Romantic Dinner',
      'event.romantic.subtitle': 'Share the beautiful moments from this special dinner.',
      'event.romantic.titleLabel': 'Title (optional)',
      'event.romantic.titlePlaceholder': 'e.g., Anniversary Dinner',

      'event.welcome.name': 'Welcome Party',
      'event.welcome.welcome': 'Welcome to {title}!',
      'event.welcome.welcomeDefault': 'Welcome to the Welcome Party!',
      'event.welcome.subtitle': 'Share your photos from this wonderful welcome party!',
      'event.welcome.titleLabel': 'Title',
      'event.welcome.titlePlaceholder': 'e.g., Welcome Emma',

      'event.farewell.name': 'Farewell Party',
      'event.farewell.welcome': 'Welcome to {title}.',
      'event.farewell.welcomeDefault': 'Welcome to the Farewell Party',
      'event.farewell.subtitle': 'Share your photos from this meaningful farewell party.',
      'event.farewell.titleLabel': 'Title',
      'event.farewell.titlePlaceholder': 'e.g., Farewell Noah',

      'event.trip.name': 'Trip',
      'event.trip.welcome': 'Welcome to Our Trip!',
      'event.trip.welcomeDefault': 'Welcome to Our Trip!',
      'event.trip.subtitle': 'Share the photos you took on our trip!',
      'event.trip.titleLabel': 'Trip Name',
      'event.trip.titlePlaceholder': 'e.g., Cappadocia 2026',

      'event.meeting.name': 'Meeting',
      'event.meeting.welcome': 'Welcome to Our Meeting!',
      'event.meeting.welcomeDefault': 'Welcome to Our Meeting!',
      'event.meeting.subtitle': 'Share the photos you took at the event.',
      'event.meeting.titleLabel': 'Meeting / Organization Name',
      'event.meeting.titlePlaceholder': 'e.g., Annual Company Meeting',

      'task.wedding.selfie': 'A selfie with the couple',
      'task.wedding.dance': 'A shot from the dance floor',
      'task.wedding.table': 'A detail from your table',
      'task.wedding.style': 'The best-dressed guest',
      'task.wedding.toast': 'A toast moment',
      'task.wedding.laugh': 'The most genuine laugh',
      'task.engagement.ring': 'A close-up of the rings',
      'task.engagement.couple': 'A shot with the couple',
      'task.engagement.family': 'The families together',
      'task.engagement.sweet': 'The sweetest moment',
      'task.engagement.laugh': 'The most genuine laugh',
      'task.anniversary.couple': 'The couple’s best shot',
      'task.anniversary.toast': 'A toast moment',
      'task.anniversary.cake': 'The cake moment',
      'task.anniversary.friends': 'A shot with friends',
      'task.anniversary.memory': 'A memory from tonight',
      'task.birthday.cake': 'Blowing out the candles',
      'task.birthday.gift': 'Opening a gift',
      'task.birthday.group': 'A group photo',
      'task.birthday.funny': 'The funniest moment',
      'task.birthday.decor': 'A detail of the decorations',
      'task.romantic.table': 'A shot from the table',
      'task.romantic.cheers': 'Clinking glasses',
      'task.romantic.couple': 'A selfie together',
      'task.romantic.detail': 'A detail from the evening',
      'task.welcome.greet': 'The welcome moment',
      'task.welcome.hug': 'The warmest hug',
      'task.welcome.group': 'Everyone together',
      'task.welcome.smile': 'The biggest smile',
      'task.farewell.hug': 'The farewell hug',
      'task.farewell.group': 'One last group photo',
      'task.farewell.memory': 'A keepsake from here',
      'task.farewell.smile': 'Smiling faces',
      'task.trip.view': 'The best view',
      'task.trip.group': 'A group photo',
      'task.trip.food': 'A local taste',
      'task.trip.candid': 'A candid moment',
      'task.trip.funny': 'The funniest moment',
      'task.meeting.team': 'The team together',
      'task.meeting.stage': 'A shot from the stage',
      'task.meeting.coffee': 'The coffee break',
      'task.meeting.detail': 'A detail from the event',

      'upload.eyebrow': 'Welcome',
      'upload.welcomeDefault': 'Welcome to Our Event!',
      'upload.taskLabelHtml': 'Pick a photo task <span class="hint">(optional — catch a fun shot!)</span>',
      'upload.welcomeCouple': 'Welcome to {couple}!',
      'upload.subtitle': 'Please share your favorite moments from the event. Every photo means so much to us.',
      'upload.configErrorHtml': '<b>Connection settings are missing.</b><br />Please open this page from the QR code on the table.',
      'upload.guestLabelHtml': 'Your name <span class="hint">(optional)</span>',
      'upload.guestPlaceholder': 'Example: Aunt Sarah',
      'upload.dropTitle': 'Choose / Take Photos',
      'upload.dropAria': 'Choose or take photos',
      'upload.dropSub': 'Pick from your gallery or drop photos here',
      'upload.galleryButton': 'Gallery',
      'upload.cameraButton': 'Camera',
      'upload.progressLoading': 'Uploading…',
      'upload.uploadButton': 'Upload',
      'upload.successTitle': 'Thank You!',
      'upload.successText': 'Your photos were shared safely. Thank you for helping us keep these memories.',
      'upload.more': 'Upload More Photos',
      'upload.footer': 'Your photos are stored safely in a private album.',
      'upload.retryFailed': 'Retry Failed ({count})',
      'upload.uploadMany': 'Upload {count} Photos',
      'upload.preparing': 'Preparing…',
      'upload.uploading': 'Uploading…',
      'upload.skippedType': '{count} file(s) were skipped because they are not photos.',
      'upload.skippedSize': '{count} photo(s) were skipped because they are over the 40MB limit.',
      'upload.noteTitle': 'Guest Book',
      'upload.noteSub': 'Leave a short note along with your photos — it appears on the live wall and in the album.',
      'upload.notePlaceholder': 'e.g. Congratulations! Tonight was wonderful…',
      'upload.noteSend': 'Send Note',
      'upload.noteThanks': 'Your note has been sent. Thank you!',
      'upload.noteFail': 'The note could not be sent. Check your connection and try again.',
      'upload.invalidTokenHtml': '<b>The upload security key is invalid.</b> Please scan the QR again or use the latest shared link.',
      'upload.partialErrorHtml': '<b>{ok} photos uploaded, {failed} failed.</b> Check your connection and tap “Retry Failed”.',

      'gallery.eyebrow': 'Photo Album',
      'gallery.titleDefault': 'Our Memories',
      'gallery.subtitleDefault': 'Photos shared by participants from the event.',
      'gallery.subtitleCouple': 'Photos shared by participants from {couple}.',
      'gallery.subtitleTitle': 'Photos shared by participants from {title}.',
      'gallery.configErrorHtml': '<b>Gallery link is missing.</b><br />Open this page from the <b>Gallery Link</b> on the setup screen.',
      'gallery.notesTitle': 'Guest Book ({count} notes)',
      'gallery.countLoading': 'Loading…',
      'gallery.driveFolder': 'Drive Folder',
      'gallery.refresh': 'Refresh',
      'gallery.loading': 'Loading photos…',
      'gallery.empty': 'No photos have been uploaded yet. They will appear here as participants scan the QR and share photos.',
      'gallery.footer': 'This gallery is private for you. Do not share this link with guests.',
      'gallery.openDrive': 'Open in Drive ↗',
      'gallery.countPhotos': '{count} photos',
      'gallery.countEmpty': 'No photos',
      'gallery.failList': 'Could not load the list.',
      'gallery.failConnection': 'Could not connect. Check your Web App URL and internet connection.',
      'gallery.invalidToken': 'Invalid security key.',

      'card.toolsEyebrow': 'Printable QR Card',
      'card.toolsTitle': 'Table Card',
      'card.toolsSubtitleHtml': 'Choose how many cards per page, then press <b>Print</b> and select <b>“Save as PDF”</b>. Cut along the dashed lines and place them on the tables.',
      'card.errorHtml': '<b>Card data is missing.</b> Open this page from the “Printable Card” button on the setup screen.',
      'card.copies1': '1 / page',
      'card.copies2': '2 / page',
      'card.copies4': '4 / page',
      'card.copies6': '6 / page',
      'card.print': 'Print / Save PDF',
      'card.back': 'Back to Setup',
      'card.tipHtml': 'Tip: for the best result, print from a computer and enable <b>background graphics</b> in browser print settings.',
      'card.pcEyebrow': 'Welcome',
      'card.defaultCouple': 'Our Event',
      'card.defaultTitle': 'Our Event',
      'card.qrFail': 'QR could not be created',
      'card.pcCta': 'Share your memories with us',
      'card.pcSub': 'Scan the QR code with your phone to upload photos',

      'slideshow.share': 'Share your photos',
      'slideshow.emptyTitle': 'Share the first photo!',
      'slideshow.emptySub': 'Scan the QR with your phone; your photo will appear on this screen within seconds.',
      'slideshow.hint': 'Click for fullscreen',
      'slideshow.count': '{count} photos',
      'slideshow.new': 'New',
      'slideshow.connError': 'Waiting for connection… The screen will retry automatically.',
      'slideshow.configErrorHtml': '<b>Live wall link is missing.</b> Open this page from the “Live Wall” link on the setup screen.'
    }
  };

  var currentLang = normalize(getParam('lang') || safeGet(STORAGE_KEY) || safeGet(LEGACY_STORAGE_KEY) || 'tr');

  function getParam(name) {
    try { return new URLSearchParams(location.search).get(name); }
    catch (e) { return ''; }
  }

  function normalize(lang) {
    lang = String(lang || '').toLowerCase().slice(0, 2);
    return DICT[lang] ? lang : 'tr';
  }

  function safeGet(key) {
    try { return localStorage.getItem(key); }
    catch (e) { return ''; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, value); }
    catch (e) {}
  }

  function t(key, vars) {
    var table = DICT[currentLang] || DICT.tr;
    var value = table[key] || DICT.tr[key] || key;
    vars = vars || {};
    return String(value).replace(/\{([a-zA-Z0-9_]+)\}/g, function (_, name) {
      return vars[name] == null ? '' : String(vars[name]);
    });
  }

  function apply(root) {
    root = root || document;
    document.documentElement.lang = currentLang;

    each(root, '[data-i18n]', function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    each(root, '[data-i18n-html]', function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    each(root, '[data-i18n-placeholder]', function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    each(root, '[data-i18n-title]', function (el) {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    each(root, '[data-i18n-aria-label]', function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
    });
  }

  function each(root, selector, fn) {
    Array.prototype.forEach.call(root.querySelectorAll(selector), fn);
  }

  function setLang(lang) {
    currentLang = normalize(lang);
    safeSet(STORAGE_KEY, currentLang);
    apply(document);
  }

  window.EventPhotoI18n = {
    apply: apply,
    getLang: function () { return currentLang; },
    setLang: setLang,
    t: t
  };
  window.WeddingI18n = window.EventPhotoI18n;

  apply(document);
})();
