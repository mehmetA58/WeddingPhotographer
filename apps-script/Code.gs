/****************************************************************************
 * Etkinlik Fotoğraf Yükleme — Google Apps Script Backend
 * --------------------------------------------------------------------------
 * Bu betik, katılımcılardan gelen fotoğrafları SİZİN Google Drive'ınızdaki
 * bir klasöre kaydeder. Sunucu gerektirmez, ücretsizdir.
 *
 * KURULUM (özet — ayrıntı için README.md):
 *   1) script.google.com → Yeni proje → bu dosyanın tamamını yapıştırın.
 *   2) (İsteğe bağlı) Güvenlik anahtarı için: aşağıdaki SETUP_setToken()
 *      fonksiyonunu bir kez çalıştırın (menüden Run) veya
 *      Proje Ayarları → Script Properties'ten TOKEN ekleyin.
 *   3) Deploy → New deployment → "Web app"
 *        - Execute as:      Me (kendi hesabınız)
 *        - Who has access:  Anyone
 *      Çıkan "Web app URL"i (…/exec) kopyalayın → kurulum sayfasına yapıştırın.
 *   4) İlk çalıştırmada Google, Drive erişim izni ister → onaylayın.
 *
 * NOT: Kodda değişiklik yaparsanız, aynı URL'i korumak için
 *      Deploy → Manage deployments → (kalem ikonu) → Version: New version
 *      ile güncelleyin (yeni deployment yeni URL üretir).
 ****************************************************************************/

// Fotoğrafların kaydedileceği klasör adı (ilk yüklemede otomatik oluşturulur).
var DEFAULT_FOLDER_NAME = 'Etkinlik Fotoğrafları';

// Apps Script istek gövdesi limiti için kaba koruma.
// Base64 veri ham dosyadan yaklasik %33 daha buyuktur; 55MB base64 ~= 40MB dosya.
var MAX_BASE64_CHARS = 55 * 1024 * 1024;

/**
 * GET uç noktası. İki iş görür:
 *   - action yok / 'ping'  → sağlık kontrolü (kurulum "Bağlantıyı Test Et")
 *   - action = 'list'      → galeri için fotoğraf listesi (token korumalı)
 * `callback` parametresi verilirse JSONP döner (tarayıcı CORS'unu tamamen aşar).
 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || 'ping';
  var out = (action === 'list') ? listFiles_(p)
                                : { status: 'ready', service: 'event-photo-upload' };
  return reply_(out, p.callback);
}

/** Galeri: klasördeki görselleri (yeni → eski) döndürür. */
function listFiles_(p) {
  var props = PropertiesService.getScriptProperties();
  var required = props.getProperty('TOKEN');
  if (required && String(p.token || '') !== required) {
    return { status: 'error', code: 'invalid_token', message: 'Geçersiz güvenlik anahtarı' };
  }
  var id = props.getProperty('ROOT_FOLDER_ID');
  if (!id) return { status: 'ok', count: 0, files: [] }; // henüz yükleme yok

  var folder;
  try { folder = DriveApp.getFolderById(id); }
  catch (e) { return { status: 'ok', count: 0, files: [] }; }

  var arr = [];
  var it = folder.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (String(f.getMimeType() || '').indexOf('image/') !== 0) continue;
    var created = f.getDateCreated();
    arr.push({
      id: f.getId(),
      name: f.getName(),
      t: created.getTime(),
      createdAt: created.toISOString ? created.toISOString() : String(created),
      size: f.getSize()
    });
  }
  arr.sort(function (a, b) { return b.t - a.t; });

  var max = Math.max(1, Math.min(parseInt(p.max, 10) || 500, 1000));
  return {
    status: 'ok',
    count: arr.length,
    folderId: folder.getId(),
    folderUrl: folder.getUrl(),
    files: arr.slice(0, max)
  };
}

/**
 * Fotoğraf yükleme uç noktası.
 * İstek gövdesi (text/plain içinde JSON):
 *   { token, guestName, filename, mimeType, data(base64) }
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ status: 'error', message: 'Boş istek' });
    }

    var body = JSON.parse(e.postData.contents);

    // 1) Token doğrulaması (ayarlandıysa)
    var required = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (required && String(body.token || '') !== required) {
      return json_({ status: 'error', code: 'invalid_token', message: 'Geçersiz güvenlik anahtarı' });
    }

    // 2) Tür ve veri kontrolü
    var mime = String(body.mimeType || '');
    if (mime.indexOf('image/') !== 0) {
      return json_({ status: 'error', message: 'Yalnızca görsel dosyalar kabul edilir' });
    }
    if (!body.data) {
      return json_({ status: 'error', message: 'Dosya verisi bulunamadı' });
    }
    // Kaba boyut koruması (base64 ~ %33 fazla; ~40MB orijinal ≈ 55MB base64)
    if (body.data.length > MAX_BASE64_CHARS) {
      return json_({ status: 'error', message: 'Dosya çok büyük (maks. ~40MB)' });
    }

    // 3) Çöz ve kaydet
    var bytes = Utilities.base64Decode(body.data);
    var name  = buildFileName_(body.filename, body.guestName, mime);
    var blob  = Utilities.newBlob(bytes, mime, name);

    var folder = getUploadFolder_();
    var file   = folder.createFile(blob);
    try {
      file.setDescription('EventPhoto yüklemesi' +
        (body.guestName ? ' · Katılımcı: ' + sanitize_(body.guestName, 60) : ''));
    } catch (e) {}

    // Galeri sayfası küçük resimleri gösterebilsin diye "bağlantıya sahip olan
    // görüntüleyebilir" yapılır. Dosya ID'leri tahmin edilemez ve galeri listesi
    // token ile korunur; yani fotoğraflar herkese açık listelenmez.
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}

    return json_({ status: 'ok', fileId: file.getId(), name: file.getName() });

  } catch (err) {
    return json_({ status: 'error', message: String(err && err.message || err) });
  }
}

/* ------------------------------------------------------------------------ */
/* Yardımcılar                                                              */
/* ------------------------------------------------------------------------ */

/** Kayıt klasörünü döndürür; yoksa oluşturur (eşzamanlılık için kilitli). */
function getUploadFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('ROOT_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* silinmiş olabilir */ }
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    id = props.getProperty('ROOT_FOLDER_ID'); // kilit içinde tekrar kontrol
    if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }

    var folderName = props.getProperty('FOLDER_NAME') || DEFAULT_FOLDER_NAME;
    var folder = DriveApp.createFolder(folderName);
    props.setProperty('ROOT_FOLDER_ID', folder.getId());
    return folder;
  } finally {
    lock.releaseLock();
  }
}

/** yyyy-MM-dd_HH-mm-ss_[isim]_[orijinal]_[rastgele].uzantı biçiminde ad. */
function buildFileName_(filename, guestName, mime) {
  var tz = Session.getScriptTimeZone() || 'Europe/Istanbul';
  var ts = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd_HH-mm-ss');
  var rand = Math.floor(Math.random() * 9000 + 1000); // aynı saniyedeki çakışmayı önle

  var parts = [ts];
  var guest = sanitize_(guestName, 30);
  if (guest) parts.push(guest);

  var base = sanitize_(stripExt_(filename), 24);
  if (base) parts.push(base);

  parts.push(rand);
  var ext = extFromMime_(mime) || extFromName_(filename) || 'jpg';
  return parts.join('_') + '.' + ext;
}

function sanitize_(s, max) {
  s = String(s || '')
    .replace(/[\/\\?%*:|"<>]/g, '')   // dosya adında geçersiz karakterler
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '-');
  if (max && s.length > max) s = s.slice(0, max);
  return s;
}
function stripExt_(name) { return String(name || '').replace(/\.[^.]+$/, ''); }
function extFromName_(name) {
  var m = String(name || '').match(/\.([a-zA-Z0-9]{2,5})$/);
  return m ? m[1].toLowerCase() : '';
}
function extFromMime_(mime) {
  var map = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
    'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic',
    'image/heif': 'heif', 'image/bmp': 'bmp', 'image/tiff': 'tiff'
  };
  return map[String(mime).toLowerCase()] || '';
}

/** ContentService JSON yanıtı. */
function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** JSON veya (callback verildiyse) JSONP yanıtı — galeri okuması CORS'a takılmaz. */
function reply_(obj, callback) {
  var body = JSON.stringify(obj);
  if (callback && isValidCallback_(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + body + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function isValidCallback_(callback) {
  return /^[A-Za-z_$][0-9A-Za-z_$]*(\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(String(callback || ''));
}

/* ------------------------------------------------------------------------ */
/* İSTEĞE BAĞLI: kurulum yardımcıları (menüden bir kez Run edin)            */
/* ------------------------------------------------------------------------ */

/**
 * Güvenlik anahtarını ayarlar. Kurulum sayfasında ürettiğiniz token'ı
 * aşağıdaki tırnaklar arasına yapıştırıp bu fonksiyonu bir kez çalıştırın.
 */
function SETUP_setToken() {
  var TOKEN = 'BURAYA_TOKEN_YAPISTIRIN';
  if (!TOKEN || TOKEN === 'BURAYA_TOKEN_YAPISTIRIN') {
    throw new Error('Önce TOKEN değerini kurulum sayfasında ürettiğiniz anahtarla değiştirin.');
  }
  PropertiesService.getScriptProperties().setProperty('TOKEN', TOKEN);
  Logger.log('TOKEN ayarlandı.');
}

/** Token kullanmak istemezseniz mevcut güvenlik anahtarını siler. */
function SETUP_clearToken() {
  PropertiesService.getScriptProperties().deleteProperty('TOKEN');
  Logger.log('TOKEN silindi.');
}

/** Klasör adını değiştirmek isterseniz (yüklemeden önce çalıştırın). */
function SETUP_setFolderName() {
  var NAME = 'Etkinlik Fotoğrafları';
  PropertiesService.getScriptProperties().setProperty('FOLDER_NAME', NAME);
  Logger.log('Klasör adı ayarlandı: ' + NAME);
}

/**
 * Fotoğrafları otomatik oluşturulan klasör yerine mevcut bir Drive klasörüne
 * kaydetmek isterseniz, klasör ID'sini aşağıya yapıştırıp bir kez çalıştırın.
 */
function SETUP_setExistingFolderId() {
  var FOLDER_ID = 'BURAYA_DRIVE_KLASOR_ID_YAPISTIRIN';
  if (!FOLDER_ID || FOLDER_ID === 'BURAYA_DRIVE_KLASOR_ID_YAPISTIRIN') {
    throw new Error('Önce FOLDER_ID değerini Drive klasör linkinizdeki ID ile değiştirin.');
  }
  var folder = DriveApp.getFolderById(FOLDER_ID); // izin/ID kontrolü
  PropertiesService.getScriptProperties().setProperty('ROOT_FOLDER_ID', folder.getId());
  Logger.log('Klasör bağlandı: ' + folder.getUrl());
}

/** Kayıtlı klasör eşleşmesini siler; sonraki yüklemede yeni klasör oluşturulur. */
function SETUP_resetFolderBinding() {
  PropertiesService.getScriptProperties().deleteProperty('ROOT_FOLDER_ID');
  Logger.log('Klasör eşleşmesi silindi.');
}

/** Kurulum durumunu Apps Script günlüklerine yazar. */
function SETUP_showConfig() {
  var props = PropertiesService.getScriptProperties();
  Logger.log('TOKEN: ' + (props.getProperty('TOKEN') ? 'ayarlı' : 'yok'));
  Logger.log('FOLDER_NAME: ' + (props.getProperty('FOLDER_NAME') || DEFAULT_FOLDER_NAME));
  Logger.log('ROOT_FOLDER_ID: ' + (props.getProperty('ROOT_FOLDER_ID') || 'henüz yok'));
}
