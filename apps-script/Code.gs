/****************************************************************************
 * Etkinlik Fotoğraf Yükleme — Google Apps Script Backend
 * --------------------------------------------------------------------------
 * Bu betik, katılımcılardan gelen fotoğrafları SİZİN Google Drive'ınızdaki
 * bir klasöre kaydeder. Sunucu gerektirmez, ücretsizdir.
 *
 * KURULUM:
 *   Kurulum sayfasındaki "Google ile Bağlan" butonu, bu betiği içeren
 *   bir Apps Script projesini otomatik oluşturup yayınlar. Yayın sonrası
 *   aşağıdaki `action=setup` adımı ile TOKEN ve klasör ayarları yapılır.
 *
 * NOT: Kodda değişiklik yaparsanız, aynı URL'i korumak için
 *      Deploy → Manage deployments → (kalem ikonu) → Version: New version
 *      ile güncelleyin (yeni deployment yeni URL üretir).
 ****************************************************************************/

var DEFAULT_FOLDER_NAME = 'Etkinlik Fotoğrafları';
var MAX_BASE64_CHARS = 55 * 1024 * 1024;

/**
 * GET uç noktası. Üç iş görür:
 *   - action yok / 'ping'  → sağlık kontrolü
 *   - action = 'list'      → galeri için fotoğraf listesi (token korumalı)
 *   - action = 'setup'     → otomatik kurulum (TOKEN, folder ID vb. kaydeder)
 * `callback` parametresi verilirse JSONP döner.
 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || 'ping';

  if (action === 'setup') {
    return handleSetup_(p);
  }

  var out = (action === 'list') ? listFiles_(p)
                                : { status: 'ready', service: 'event-photo-upload' };
  return reply_(out, p.callback);
}

/** Otomatik kurulum: TOKEN, ROOT_FOLDER_ID ve FOLDER_NAME'i URL
 *  parametrelerinden alıp Script Properties'e kaydeder. */
function handleSetup_(p) {
  var props = PropertiesService.getScriptProperties();
  var changed = [];
  if (p.token)     { props.setProperty('TOKEN', p.token); changed.push('TOKEN'); }
  if (p.folderId)  { props.setProperty('ROOT_FOLDER_ID', p.folderId); changed.push('ROOT_FOLDER_ID'); }
  if (p.folderName){ props.setProperty('FOLDER_NAME', p.folderName); changed.push('FOLDER_NAME'); }

  var body = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<title>Kurulum</title>' +
    '<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;' +
    'display:flex;align-items:center;justify-content:center;min-height:100vh;' +
    'margin:0;background:#FBF8F3;color:#3A3632}' +
    '.card{text-align:center;padding:48px 32px;background:#fff;' +
    'border-radius:12px;box-shadow:0 18px 50px -24px rgba(90,70,30,.35);max-width:420px}' +
    'h1{color:#6E8B5B;font-size:28px;margin:0 0 8px}' +
    'p{font-size:15px;line-height:1.5;margin:0 0 16px;color:#6E655B}' +
    '.emoji{font-size:48px;display:block;margin-bottom:16px}' +
    '.btn{display:inline-block;padding:10px 28px;background:#C6A15B;color:#fff;' +
    'border-radius:8px;text-decoration:none;font-weight:500;font-size:14px;cursor:pointer}' +
    '</style></head><body>' +
    '<div class="card">' +
    '<span class="emoji">✅</span>' +
    '<h1>Kurulum Başarılı!</h1>' +
    '<p>Google Drive bağlantınız tamamlandı' +
    (changed.length ? ' (' + changed.join(', ') + ' ayarlandı)' : '') +
    '.<br>Bu sekmeyi kapatıp kurulum sayfasına dönebilirsiniz.</p>' +
    '<button class="btn" onclick="window.close()">Bu Sekmeyi Kapat</button>' +
    '</div></body></html>';

  return HtmlService.createHtmlOutput(body);
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
    var desc = '';
    try { desc = f.getDescription() || ''; } catch (e) {}
    arr.push({
      id: f.getId(),
      name: f.getName(),
      t: created.getTime(),
      createdAt: created.toISOString ? created.toISOString() : String(created),
      size: f.getSize(),
      d: desc
    });
  }
  arr.sort(function (a, b) { return b.t - a.t; });

  var max = Math.max(1, Math.min(parseInt(p.max, 10) || 500, 1000));
  var out = {
    status: 'ok',
    count: arr.length,
    folderId: folder.getId(),
    folderUrl: folder.getUrl(),
    files: arr.slice(0, max)
  };
  // Anı Defteri notları (sunum ekranı ve galeri için; Drive taraması yok)
  if (p.notes === '1') out.notes = listNotes_();
  return out;
}

/**
 * Anı Defteri notunu kaydeder. Çift kayıt yapılır:
 *  (a) Script Properties (NOTE_*) — sunum/galeri anlık okur, Drive'a gitmez
 *  (b) Drive'a Not_*.txt — ev sahibine kalıcı hatıra (paylaşıma açılmaz)
 */
function saveNote_(body) {
  var msg = String(body.message || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!msg) return json_({ status: 'error', message: 'Boş not' });
  var guest = descClean_(body.guestName, 40);
  var now = Date.now();

  try {
    var key = 'NOTE_' + now + '_' + Math.floor(Math.random() * 9000 + 1000);
    PropertiesService.getScriptProperties()
      .setProperty(key, JSON.stringify({ g: guest, m: msg, t: now }));
  } catch (e) {}

  try {
    var tz = Session.getScriptTimeZone() || 'Europe/Istanbul';
    var ts = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd_HH-mm-ss');
    var name = 'Not_' + ts + (guest ? '_' + sanitize_(guest, 30) : '') + '.txt';
    getUploadFolder_().createFile(name, (guest ? guest + ':\n' : '') + msg, 'text/plain');
  } catch (e2) {}

  return json_({ status: 'ok', type: 'note' });
}

/** Kayıtlı notları yeniden eskiye döndürür (en fazla 50). */
function listNotes_() {
  var all;
  try { all = PropertiesService.getScriptProperties().getProperties(); }
  catch (e) { return []; }
  var notes = [];
  for (var k in all) {
    if (k.indexOf('NOTE_') !== 0) continue;
    try { notes.push(JSON.parse(all[k])); } catch (e2) {}
  }
  notes.sort(function (a, b) { return (b.t || 0) - (a.t || 0); });
  return notes.slice(0, 50);
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

    // 1b) Anı Defteri notu (fotoğraf değil)
    if (body.type === 'note') {
      return saveNote_(body);
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
    var name  = buildFileName_(body.filename, body.guestName, mime, body.task);
    var blob  = Utilities.newBlob(bytes, mime, name);

    var folder = getUploadFolder_();
    var file   = folder.createFile(blob);
    try {
      file.setDescription(buildDescription_(body.guestName, body.task));
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

/** yyyy-MM-dd_HH-mm-ss_[isim]_[görev]_[orijinal]_[rastgele].uzantı biçiminde ad. */
function buildFileName_(filename, guestName, mime, task) {
  var tz = Session.getScriptTimeZone() || 'Europe/Istanbul';
  var ts = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd_HH-mm-ss');
  var rand = Math.floor(Math.random() * 9000 + 1000); // aynı saniyedeki çakışmayı önle

  var parts = [ts];
  var guest = sanitize_(guestName, 30);
  if (guest) parts.push(guest);

  var taskPart = sanitize_(task, 24);
  if (taskPart) parts.push(taskPart);

  var base = sanitize_(stripExt_(filename), 24);
  if (base) parts.push(base);

  parts.push(rand);
  var ext = extFromMime_(mime) || extFromName_(filename) || 'jpg';
  return parts.join('_') + '.' + ext;
}

/** "EventPhoto · Katılımcı: X · Görev: Y" — galeri/sunum altyazıları
 *  bu alanı okur (js/api.js parseMeta). '·' ayıracı metinden temizlenir. */
function buildDescription_(guestName, task) {
  var parts = ['EventPhoto'];
  var guest = descClean_(guestName, 60);
  if (guest) parts.push('Katılımcı: ' + guest);
  var t = descClean_(task, 80);
  if (t) parts.push('Görev: ' + t);
  return parts.join(' · ');
}

function descClean_(s, max) {
  s = String(s || '').replace(/[·\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
  if (max && s.length > max) s = s.slice(0, max);
  return s;
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


