/* =========================================================================
   i18n.js — Ortak TR/EN metin katmani
   URL parametresi: ?lang=tr veya ?lang=en
   ========================================================================= */

(function () {
  'use strict';

  var STORAGE_KEY = 'weddingUploadLang';

  var DICT = {
    tr: {
      'title.setup': 'Düğün Fotoğraf QR · Kurulum',
      'title.upload': 'Düğün Fotoğrafları · Anılarınızı Paylaşın',
      'title.gallery': 'Düğün Fotoğraf Albümü · Galeri',
      'title.card': 'Yazdırılabilir QR Kart',

      'setup.eyebrow': 'Kurulum · Yalnızca Çift İçin',
      'setup.brandHtml': 'Düğün<span class="amp">Fotoğraf</span>Albümü',
      'setup.subtitleHtml': 'Kendi Google Drive\'ınıza bağlı bir <b>QR kod</b> oluşturun. Misafirleriniz bu QR\'ı okutup fotoğraflarını doğrudan Drive\'ınıza yükleyecek.',
      'setup.wizTitle': 'Google Drive\'a bağlanmak çok kolay',
      'setup.wizIntro': 'Aşağıdaki 3 adımı yalnızca bir kez yapın (~2 dk), sonra çıkan adresi 1. kutuya yapıştırın.',
      'setup.wizStep1': 'Apps Script\'i açın',
      'setup.wizOpenScript': 'Apps Script\'i Aç ↗',
      'setup.wizStep2': 'Kodu kopyalayıp yapıştırın',
      'setup.wizStep2Desc': 'Açılan projedeki tüm kodu silin, aşağıdaki butonla kopyaladığınız kodu yapıştırın ve kaydedin (💾).',
      'setup.wizCopyCode': 'Backend Kodunu Kopyala',
      'setup.wizCopied': '✓ Kopyalandı!',
      'setup.wizStep3': 'Yayınlayın (Deploy)',
      'setup.wizStep3DescHtml': 'Sağ üstten <b>Deploy → New deployment → Web app</b>. “Execute as: <b>Me</b>”, “Who has access: <b>Anyone</b>” seçin, <b>Deploy</b>\'a basın ve çıkan <b>Web App URL</b>\'ini kopyalayın.',
      'setup.wizGuideHtml': 'Takılırsanız ekran görüntülü <a href="README.md" target="_blank" rel="noopener">kurulum rehberine</a> bakın.',
      'setup.apiLabel': '1 · Apps Script Web App URL\'iniz',
      'setup.apiPlaceholder': 'https://script.google.com/macros/s/AK.../exec',
      'setup.apiHelpHtml': 'Bu adresi nasıl alacağınız <a href="README.md" target="_blank" rel="noopener">kurulum rehberinde</a> anlatılıyor (2 dakikalık işlem).',
      'setup.coupleLabelHtml': '2 · Çift İsimleri <span class="hint">(karşılama yazısında görünecek)</span>',
      'setup.couplePlaceholder': 'Örn. Ayşe & Mehmet',
      'setup.languageLabel': '3 · Dil',
      'setup.advanced': 'Gelişmiş ayarlar (isteğe bağlı)',
      'setup.tokenLabelHtml': 'Güvenlik anahtarı (token) <span class="hint">— linkiniz sızsa bile yabancı yüklemeleri engeller</span>',
      'setup.tokenPlaceholder': '(boş bırakılabilir)',
      'setup.generateToken': 'Üret',
      'setup.tokenHelpHtml': 'Bu anahtarı Apps Script\'te de <code>TOKEN</code> olarak ayarlayın (rehbere bakın).',
      'setup.rawLabelHtml': 'Orijinal çözünürlükte yükle <span class="hint">(kapalıyken fotoğraflar hızlı yüklenmesi için ~2560px\'e küçültülür)</span>',
      'setup.testButton': 'Bağlantıyı Test Et',
      'setup.generateButton': 'QR Kodu Oluştur',
      'setup.resultTitle': 'QR Kodunuz Hazır',
      'setup.resultSubtitle': 'Aşağıdaki QR\'ı indirip masalara yerleştirin veya bu kartı doğrudan yazdırın.',
      'setup.qrSmall': 'Fotoğraflarınızı bizimle paylaşmak için okutun',
      'setup.downloadPng': 'PNG İndir',
      'setup.cardPdf': 'Kart Yazdır (PDF)',
      'setup.copyUpload': 'Yükleme Linkini Kopyala',
      'setup.preview': 'Misafir Sayfasını Önizle',
      'setup.galleryTitle': 'Çift İçin Galeri',
      'setup.gallerySubtitleHtml': 'Yüklenen tüm fotoğrafları görmek için bu <b>özel</b> linki <b>yalnızca siz</b> kullanın. Misafirlerle paylaşmayın.',
      'setup.openGallery': 'Galeriyi Aç',
      'setup.copyGallery': 'Galeri Linkini Kopyala',
      'setup.edit': 'Ayarları Düzenle',
      'setup.footer': 'Sunucusuz & ücretsiz · Fotoğraflar yalnızca sizin Google Drive\'ınıza kaydedilir.',
      'setup.albumTitle': 'Düğün Fotoğraf Albümü',
      'setup.needApi': 'Önce Apps Script Web App URL\'inizi girin.',
      'setup.testing': 'Bağlantı test ediliyor…',
      'setup.slow': 'Yanıt gecikti. QR\'ı oluşturup telefonla denemeniz de yeterli olur.',
      'setup.ok': '✓ Bağlantı başarılı! Web App çalışıyor. QR kodu oluşturabilirsiniz.',
      'setup.unexpected': 'Bağlantı kuruldu ama beklenen yanıt gelmedi. URL\'in <b>/exec</b> ile bittiğinden emin olun.',
      'setup.cors': 'Test tarayıcı güvenliği (CORS) nedeniyle doğrulanamadı; bu normal olabilir. QR\'ı oluşturup <b>telefonla bir test fotoğrafı</b> yükleyerek kontrol edin.',
      'setup.requiredApi': 'Apps Script Web App URL\'i zorunludur.',
      'setup.urlShape': 'Not: URL beklenen biçimde görünmüyor (…/macros/s/…/exec). Yine de devam ediliyor.',
      'setup.qrMissing': 'QR görüntüsü hazırlanamadı, tekrar oluşturun.',
      'setup.copyUploadOk': '✓ Yükleme linki kopyalandı.',
      'setup.copyGalleryOk': '✓ Galeri linki kopyalandı.',

      'upload.eyebrow': 'Hoş Geldiniz',
      'upload.welcomeDefault': 'Gelin & Damat\'ın Mutlu Gününe Hoş Geldiniz!',
      'upload.welcomeCouple': '{couple} çiftinin mutlu gününe hoş geldiniz!',
      'upload.subtitle': 'Lütfen bu geceye ait karelerinizi bizimle paylaşın. Her fotoğraf bizim için çok kıymetli.',
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
      'upload.footer': 'Fotoğraflarınız yalnızca çiftin özel albümünde saklanır.',
      'upload.retryFailed': 'Başarısızları Tekrar Dene ({count})',
      'upload.uploadMany': '{count} Fotoğrafı Yükle',
      'upload.preparing': 'Hazırlanıyor…',
      'upload.uploading': 'Yükleniyor…',
      'upload.skippedType': '{count} dosya fotoğraf olmadığı için eklenmedi.',
      'upload.skippedSize': '{count} fotoğraf 40MB sınırını aştığı için eklenmedi.',
      'upload.invalidTokenHtml': '<b>Yükleme güvenlik anahtarı geçersiz.</b> Lütfen QR kodu tekrar okutun veya çiftin paylaştığı güncel linki kullanın.',
      'upload.partialErrorHtml': '<b>{ok} fotoğraf yüklendi, {failed} tanesi başarısız.</b> İnternet bağlantınızı kontrol edip “Tekrar Dene”ye dokunun.',

      'gallery.eyebrow': 'Fotoğraf Albümü',
      'gallery.titleDefault': 'Anılarımız',
      'gallery.subtitleDefault': 'Misafirlerimizin bu güzel geceye ait paylaştığı kareler.',
      'gallery.subtitleCouple': '{couple} düğününe ait, misafirlerin paylaştığı kareler.',
      'gallery.configErrorHtml': '<b>Galeri bağlantısı eksik.</b><br />Bu sayfa kurulum ekranındaki <b>“Galeri Linki”</b> ile açılmalıdır.',
      'gallery.countLoading': 'Yükleniyor…',
      'gallery.driveFolder': 'Drive Klasörü',
      'gallery.refresh': 'Yenile',
      'gallery.loading': 'Fotoğraflar getiriliyor…',
      'gallery.empty': 'Henüz fotoğraf yüklenmemiş. Misafirler QR\'ı okutup fotoğraf paylaştıkça burada görünecek.',
      'gallery.footer': 'Bu galeri yalnızca sizin (çiftin) görmesi içindir. Linki paylaşmayın.',
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
      'card.defaultCouple': 'Düğünümüz',
      'card.qrFail': 'QR üretilemedi',
      'card.pcCta': 'Anılarınızı bizimle paylaşın',
      'card.pcSub': 'Fotoğraflarınızı yüklemek için QR kodu telefonunuzla okutun'
    },

    en: {
      'title.setup': 'Wedding Photo QR · Setup',
      'title.upload': 'Wedding Photos · Share Your Moments',
      'title.gallery': 'Wedding Photo Album · Gallery',
      'title.card': 'Printable QR Card',

      'setup.eyebrow': 'Setup · Couple Only',
      'setup.brandHtml': 'Wedding<span class="amp">Photo</span>Album',
      'setup.subtitleHtml': 'Create a <b>QR code</b> connected to your own Google Drive. Guests scan it and upload photos directly to your Drive.',
      'setup.wizTitle': 'Connecting Google Drive is easy',
      'setup.wizIntro': 'Do these 3 steps once (~2 min), then paste the resulting URL into box 1.',
      'setup.wizStep1': 'Open Apps Script',
      'setup.wizOpenScript': 'Open Apps Script ↗',
      'setup.wizStep2': 'Copy & paste the code',
      'setup.wizStep2Desc': 'Delete all code in the new project, paste the code copied with the button below, and save (💾).',
      'setup.wizCopyCode': 'Copy Backend Code',
      'setup.wizCopied': '✓ Copied!',
      'setup.wizStep3': 'Deploy',
      'setup.wizStep3DescHtml': 'Top right: <b>Deploy → New deployment → Web app</b>. Set “Execute as: <b>Me</b>”, “Who has access: <b>Anyone</b>”, click <b>Deploy</b>, and copy the <b>Web App URL</b>.',
      'setup.wizGuideHtml': 'Stuck? See the <a href="README.md" target="_blank" rel="noopener">setup guide</a> with screenshots.',
      'setup.apiLabel': '1 · Your Apps Script Web App URL',
      'setup.apiPlaceholder': 'https://script.google.com/macros/s/AK.../exec',
      'setup.apiHelpHtml': 'The <a href="README.md" target="_blank" rel="noopener">setup guide</a> explains how to get this URL in a few minutes.',
      'setup.coupleLabelHtml': '2 · Couple Names <span class="hint">(shown on the welcome screen)</span>',
      'setup.couplePlaceholder': 'Example: Emma & Noah',
      'setup.languageLabel': '3 · Language',
      'setup.advanced': 'Advanced settings (optional)',
      'setup.tokenLabelHtml': 'Security key (token) <span class="hint">— blocks uploads without the private link token</span>',
      'setup.tokenPlaceholder': '(optional)',
      'setup.generateToken': 'Generate',
      'setup.tokenHelpHtml': 'Set the same key as <code>TOKEN</code> in Apps Script (see the guide).',
      'setup.rawLabelHtml': 'Upload original resolution <span class="hint">(off: photos are resized to ~2560px for faster uploads)</span>',
      'setup.testButton': 'Test Connection',
      'setup.generateButton': 'Create QR Code',
      'setup.resultTitle': 'Your QR Code Is Ready',
      'setup.resultSubtitle': 'Download the QR below for the tables, or open the printable card layout.',
      'setup.qrSmall': 'Scan to share your photos with us',
      'setup.downloadPng': 'Download PNG',
      'setup.cardPdf': 'Print Card (PDF)',
      'setup.copyUpload': 'Copy Upload Link',
      'setup.preview': 'Preview Guest Page',
      'setup.galleryTitle': 'Private Gallery',
      'setup.gallerySubtitleHtml': 'Use this <b>private</b> link to view every uploaded photo. Keep it for the couple only.',
      'setup.openGallery': 'Open Gallery',
      'setup.copyGallery': 'Copy Gallery Link',
      'setup.edit': 'Edit Settings',
      'setup.footer': 'Serverless & free · Photos are saved only to your Google Drive.',
      'setup.albumTitle': 'Wedding Photo Album',
      'setup.needApi': 'Enter your Apps Script Web App URL first.',
      'setup.testing': 'Testing connection…',
      'setup.slow': 'The response is taking a while. You can still create the QR and test it from a phone.',
      'setup.ok': '✓ Connection successful! The Web App is running.',
      'setup.unexpected': 'Connected, but the response was unexpected. Make sure the URL ends with <b>/exec</b>.',
      'setup.cors': 'The browser could not verify the test because of CORS. This can be normal; create the QR and upload a test photo from a phone.',
      'setup.requiredApi': 'The Apps Script Web App URL is required.',
      'setup.urlShape': 'Note: the URL does not look like the expected …/macros/s/…/exec format. Continuing anyway.',
      'setup.qrMissing': 'The QR image could not be prepared. Please create it again.',
      'setup.copyUploadOk': '✓ Upload link copied.',
      'setup.copyGalleryOk': '✓ Gallery link copied.',

      'upload.eyebrow': 'Welcome',
      'upload.welcomeDefault': 'Welcome to the Bride & Groom’s Special Day!',
      'upload.welcomeCouple': 'Welcome to {couple}’s special day!',
      'upload.subtitle': 'Please share your favorite moments from tonight. Every photo means so much to us.',
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
      'upload.footer': 'Your photos are stored only in the couple’s private album.',
      'upload.retryFailed': 'Retry Failed ({count})',
      'upload.uploadMany': 'Upload {count} Photos',
      'upload.preparing': 'Preparing…',
      'upload.uploading': 'Uploading…',
      'upload.skippedType': '{count} file(s) were skipped because they are not photos.',
      'upload.skippedSize': '{count} photo(s) were skipped because they are over the 40MB limit.',
      'upload.invalidTokenHtml': '<b>The upload security key is invalid.</b> Please scan the QR again or use the latest link shared by the couple.',
      'upload.partialErrorHtml': '<b>{ok} photos uploaded, {failed} failed.</b> Check your connection and tap “Retry Failed”.',

      'gallery.eyebrow': 'Photo Album',
      'gallery.titleDefault': 'Our Memories',
      'gallery.subtitleDefault': 'Photos shared by our guests from this beautiful night.',
      'gallery.subtitleCouple': 'Guest photos from {couple}’s wedding.',
      'gallery.configErrorHtml': '<b>Gallery link is missing.</b><br />Open this page from the <b>Gallery Link</b> on the setup screen.',
      'gallery.countLoading': 'Loading…',
      'gallery.driveFolder': 'Drive Folder',
      'gallery.refresh': 'Refresh',
      'gallery.loading': 'Loading photos…',
      'gallery.empty': 'No photos have been uploaded yet. They will appear here as guests scan the QR and share photos.',
      'gallery.footer': 'This gallery is private for the couple. Do not share this link with guests.',
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
      'card.defaultCouple': 'Our Wedding',
      'card.qrFail': 'QR could not be created',
      'card.pcCta': 'Share your memories with us',
      'card.pcSub': 'Scan the QR code with your phone to upload photos'
    }
  };

  var currentLang = normalize(getParam('lang') || safeGet(STORAGE_KEY) || 'tr');

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

  window.WeddingI18n = {
    apply: apply,
    getLang: function () { return currentLang; },
    setLang: setLang,
    t: t
  };

  apply(document);
})();
