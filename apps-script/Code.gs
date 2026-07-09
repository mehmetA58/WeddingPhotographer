/****************************************************************************
 * EventPhoto — Google Apps Script Backend
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
var SETUP_ADMIN_KEY = 'EVENTPHOTO_SETUP_KEY_PLACEHOLDER';
var SETUP_KEY_PLACEHOLDER = 'EVENTPHOTO_SETUP_KEY_UNSET';
var MAX_UPLOAD_INDEX_ITEMS = 500;
var MAX_NOTE_ITEMS = 120;
var NOTE_LIST_LIMIT = 50;

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
  if (action === 'note') {
    return reply_({ status: 'error', code: 'method_not_allowed', message: 'Not kaydı için POST kullanın' }, p.callback);
  }

  var out = (action === 'list') ? listFiles_(p)
                                : { status: 'ready', service: 'eventphoto-api' };
  return reply_(out, p.callback);
}

/** Otomatik kurulum: TOKEN, ROOT_FOLDER_ID ve FOLDER_NAME'i URL
 *  parametrelerinden alıp Script Properties'e kaydeder.
 *  Web App herkese açık olduğu için bu uç nokta setupKey ile korunur. */
function handleSetup_(p) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    lock.waitLock(15000);
    locked = true;
    var props = PropertiesService.getScriptProperties();
    var setupErr = setupAuthError_(p, props);
    if (setupErr) return setupHtml_(false, 'Kurulum Reddedildi', setupErr.message, []);

    var changed = [];
    if (p.token)     { props.setProperty('TOKEN', p.token); changed.push('TOKEN'); }
    if (p.folderId)  { props.setProperty('ROOT_FOLDER_ID', p.folderId); changed.push('ROOT_FOLDER_ID'); }
    if (p.folderName){ props.setProperty('FOLDER_NAME', p.folderName); changed.push('FOLDER_NAME'); }

    var activeKey = activeSetupKey_(props);
    if (activeKey) props.setProperty('SETUP_ADMIN_KEY', activeKey);
    props.setProperty('SETUP_LOCKED', '1');

    return setupHtml_(true, 'Kurulum Başarılı!', 'Google Drive bağlantınız tamamlandı', changed);
  } catch (err) {
    return setupHtml_(false, 'Kurulum Tamamlanamadı', 'Ayarlar kaydedilemedi. Lütfen tekrar deneyin.', []);
  } finally {
    if (locked) lock.releaseLock();
  }
}

/** Galeri: klasördeki görselleri (yeni → eski) döndürür. */
function listFiles_(p) {
  var props = PropertiesService.getScriptProperties();
  var tokenErr = tokenError_(p.token);
  if (tokenErr) return tokenErr;
  var id = props.getProperty('ROOT_FOLDER_ID');
  var folder = null;
  if (id) {
    try { folder = DriveApp.getFolderById(id); } catch (e) {}
  }

  var arr = (p.refresh === '1') ? [] : listUploadIndex_();
  if (!arr.length) {
    if (folder) {
      arr = scanFolderFiles_(folder);
      replaceUploadIndex_(arr);
    } else {
      arr = listUploadIndex_();
      if (!arr.length) return emptyList_(p); // henüz yükleme yok
    }
  }

  var max = Math.max(1, Math.min(parseInt(p.max, 10) || 500, 1000));
  var out = {
    status: 'ok',
    count: arr.length,
    folderId: folder ? folder.getId() : id,
    folderUrl: folder ? folder.getUrl() : '',
    files: arr.slice(0, max)
  };
  // Anı Defteri notları (sunum ekranı ve galeri için; Drive taraması yok)
  if (p.notes === '1') out.notes = listNotes_();
  return out;
}

function emptyList_(p) {
  var out = { status: 'ok', count: 0, files: [] };
  if (p.notes === '1') out.notes = listNotes_();
  return out;
}

function tokenError_(token) {
  var required = PropertiesService.getScriptProperties().getProperty('TOKEN');
  if (required && String(token || '') !== required) {
    return { status: 'error', code: 'invalid_token', message: 'Geçersiz güvenlik anahtarı' };
  }
  return null;
}

/**
 * Anı Defteri notunu kaydeder. Çift kayıt yapılır:
 *  (a) Script Properties (NOTE_*) — sunum/galeri anlık okur, Drive'a gitmez
 *  (b) Drive'a Not_*.txt — ev sahibine kalıcı hatıra (paylaşıma açılmaz)
 */
function saveNoteData_(body) {
  var tokenErr = tokenError_(body.token);
  if (tokenErr) return tokenErr;

  var msg = String(body.message || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!msg) return { status: 'error', code: 'empty_note', message: 'Boş not' };
  var guest = descClean_(body.guestName, 40);
  if (!guest) return { status: 'error', code: 'missing_guest', message: 'Ad zorunlu' };
  var noteId = idClean_(body.noteId, 80);
  var now = Date.now();
  var savedProps = false;
  var savedDrive = false;
  var fileId = '';
  var existing = noteId ? findNoteById_(noteId) : null;
  if (existing) {
    return {
      status: 'ok',
      type: 'note',
      duplicate: true,
      noteId: noteId,
      savedProperties: true,
      savedDrive: true
    };
  }

  try {
    var key = 'NOTE_' + (noteId || (now + '_' + Math.floor(Math.random() * 9000 + 1000)));
    PropertiesService.getScriptProperties()
      .setProperty(key, JSON.stringify({ id: noteId, g: guest, m: msg, t: now }));
    pruneNotes_();
    savedProps = true;
  } catch (e) {}

  try {
    var tz = Session.getScriptTimeZone() || 'Europe/Istanbul';
    var ts = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd_HH-mm-ss');
    var name = 'Not_' + ts + (guest ? '_' + sanitize_(guest, 30) : '') + '.txt';
    var file = getUploadFolder_().createFile(name, (guest ? guest + ':\n' : '') + msg +
      (noteId ? '\n\nEventPhoto NoteId: ' + noteId : ''), 'text/plain');
    savedDrive = true;
    try { fileId = file.getId(); } catch (e3) {}
  } catch (e2) {}

  if (!savedProps) {
    return { status: 'error', code: 'note_save_failed', message: 'Not kaydedilemedi' };
  }

  return {
    status: 'ok',
    type: 'note',
    noteId: noteId,
    savedProperties: savedProps,
    savedDrive: savedDrive,
    fileId: fileId
  };
}

function saveNote_(body) {
  return json_(saveNoteData_(body));
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
  return notes.slice(0, NOTE_LIST_LIMIT);
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

    // 1) Anı Defteri notu (fotoğraf değil)
    if (body.type === 'note') {
      return saveNote_(body);
    }

    // 1b) Token doğrulaması (ayarlandıysa)
    var tokenErr = tokenError_(body.token);
    if (tokenErr) return json_(tokenErr);

    // 2) Tür ve veri kontrolü
    var mime = String(body.mimeType || '');
    if (!isAllowedImageMime_(mime)) {
      return json_({ status: 'error', message: 'Yalnızca görsel dosyalar kabul edilir' });
    }
    if (!body.data) {
      return json_({ status: 'error', message: 'Dosya verisi bulunamadı' });
    }
    // Kaba boyut koruması (base64 ~ %33 fazla; ~40MB orijinal ≈ 55MB base64)
    if (body.data.length > MAX_BASE64_CHARS) {
      return json_({ status: 'error', message: 'Dosya çok büyük (maks. ~40MB)' });
    }

    var guest = descClean_(body.guestName, 40);
    if (!guest) return json_({ status: 'error', code: 'missing_guest', message: 'Ad zorunlu' });

    // 3) Çöz, imzayı doğrula ve kaydet
    var bytes;
    try { bytes = Utilities.base64Decode(body.data); }
    catch (decodeErr) { return json_({ status: 'error', code: 'bad_base64', message: 'Dosya verisi okunamadı' }); }
    if (!looksLikeImage_(bytes, mime)) {
      return json_({ status: 'error', code: 'bad_image_signature', message: 'Dosya biçimi doğrulanamadı' });
    }

    var uploadId = idClean_(body.uploadId, 80);
    var folder = getUploadFolder_();
    var existing = uploadId ? findUploadById_(folder, uploadId) : null;
    if (existing) {
      return json_({
        status: 'ok',
        duplicate: true,
        uploadId: uploadId,
        fileId: existing.id,
        name: existing.name
      });
    }

    var name  = buildFileName_(body.filename, guest, mime, body.task);
    var blob  = Utilities.newBlob(bytes, mime, name);

    var file   = folder.createFile(blob);
    var desc = buildDescription_(guest, body.task, uploadId);
    try {
      file.setDescription(desc);
    } catch (e) {}
    recordUpload_(file, desc);

    // Galeri sayfası küçük resimleri gösterebilsin diye "bağlantıya sahip olan
    // görüntüleyebilir" yapılır. Dosya ID'leri tahmin edilemez ve galeri listesi
    // token ile korunur; yani fotoğraflar herkese açık listelenmez.
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}

    return json_({ status: 'ok', uploadId: uploadId, fileId: file.getId(), name: file.getName() });

  } catch (err) {
    return json_({ status: 'error', code: 'server_error', message: 'Yükleme tamamlanamadı' });
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
  var locked = false;
  try {
    lock.waitLock(15000);
    locked = true;
    id = props.getProperty('ROOT_FOLDER_ID'); // kilit içinde tekrar kontrol
    if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }

    var folderName = props.getProperty('FOLDER_NAME') || DEFAULT_FOLDER_NAME;
    var folder = DriveApp.createFolder(folderName);
    props.setProperty('ROOT_FOLDER_ID', folder.getId());
    return folder;
  } finally {
    if (locked) lock.releaseLock();
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
function buildDescription_(guestName, task, uploadId) {
  var parts = ['EventPhoto'];
  var guest = descClean_(guestName, 60);
  if (guest) parts.push('Katılımcı: ' + guest);
  var t = descClean_(task, 80);
  if (t) parts.push('Görev: ' + t);
  var id = idClean_(uploadId, 80);
  if (id) parts.push('UploadId: ' + id);
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
function idClean_(s, max) {
  s = String(s || '').replace(/[^0-9A-Za-z_-]/g, '').slice(0, max || 80);
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

function isAllowedImageMime_(mime) {
  return !!extFromMime_(mime);
}

function byte_(bytes, i) {
  var b = bytes[i] || 0;
  return b < 0 ? b + 256 : b;
}

function ascii_(bytes, start, len) {
  var s = '';
  for (var i = 0; i < len; i++) s += String.fromCharCode(byte_(bytes, start + i));
  return s;
}

function looksLikeImage_(bytes, mime) {
  if (!bytes || bytes.length < 4) return false;
  mime = String(mime || '').toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    return byte_(bytes, 0) === 0xFF && byte_(bytes, 1) === 0xD8 && byte_(bytes, 2) === 0xFF;
  }
  if (mime === 'image/png') {
    return byte_(bytes, 0) === 0x89 && ascii_(bytes, 1, 3) === 'PNG';
  }
  if (mime === 'image/gif') {
    return ascii_(bytes, 0, 4) === 'GIF8';
  }
  if (mime === 'image/webp') {
    return bytes.length >= 12 && ascii_(bytes, 0, 4) === 'RIFF' && ascii_(bytes, 8, 4) === 'WEBP';
  }
  if (mime === 'image/bmp') {
    return ascii_(bytes, 0, 2) === 'BM';
  }
  if (mime === 'image/tiff') {
    return (ascii_(bytes, 0, 2) === 'II' && byte_(bytes, 2) === 42 && byte_(bytes, 3) === 0) ||
      (ascii_(bytes, 0, 2) === 'MM' && byte_(bytes, 2) === 0 && byte_(bytes, 3) === 42);
  }
  if (mime === 'image/heic' || mime === 'image/heif') {
    if (bytes.length < 12 || ascii_(bytes, 4, 4) !== 'ftyp') return false;
    var brand = ascii_(bytes, 8, 4);
    return /^(heic|heix|hevc|hevx|heif|mif1|msf1)$/.test(brand);
  }
  return false;
}

function activeSetupKey_(props) {
  var stored = props.getProperty('SETUP_ADMIN_KEY');
  if (isStrongSetupKey_(stored)) return stored;
  if (isStrongSetupKey_(SETUP_ADMIN_KEY)) return SETUP_ADMIN_KEY;
  return '';
}

function isStrongSetupKey_(key) {
  key = String(key || '');
  return key &&
    key !== SETUP_KEY_PLACEHOLDER &&
    key !== 'EVENTPHOTO_SETUP_KEY_PLACEHOLDER' &&
    key.length >= 24;
}

function setupAuthError_(p, props) {
  var key = activeSetupKey_(props);
  if (!key) {
    return {
      code: 'setup_key_required',
      message: 'Bu Web App için kurulum anahtarı tanımlı değil. Manuel kurulumda SETUP_ADMIN_KEY değerini ayarlayın.'
    };
  }
  if (String(p.setupKey || '') !== key) {
    return { code: 'invalid_setup_key', message: 'Kurulum anahtarı geçersiz.' };
  }
  return null;
}

function setupHtml_(ok, title, message, changed) {
  var color = ok ? '#6E8B5B' : '#B4544B';
  var emoji = ok ? '✅' : '!';
  var detail = ok && changed && changed.length
    ? ' (' + changed.join(', ') + ' ayarlandı)'
    : '';
  var body = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<title>Kurulum</title>' +
    '<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;' +
    'display:flex;align-items:center;justify-content:center;min-height:100vh;' +
    'margin:0;background:#FBF8F3;color:#3A3632}' +
    '.card{text-align:center;padding:48px 32px;background:#fff;' +
    'border-radius:12px;box-shadow:0 18px 50px -24px rgba(90,70,30,.35);max-width:420px}' +
    'h1{font-size:28px;margin:0 0 8px;color:' + color + '}' +
    'p{font-size:15px;line-height:1.5;margin:0 0 16px;color:#6E655B}' +
    '.emoji{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;' +
    'margin:0 auto 16px;background:' + color + ';color:#fff;font-weight:700}' +
    '.btn{display:inline-block;padding:10px 28px;background:#C6A15B;color:#fff;' +
    'border-radius:8px;text-decoration:none;font-weight:500;font-size:14px;cursor:pointer}' +
    '</style></head><body><div class="card">' +
    '<span class="emoji">' + escHtml_(emoji) + '</span>' +
    '<h1>' + escHtml_(title) + '</h1>' +
    '<p>' + escHtml_(message) + detail +
    (ok ? '.<br>Bu sekmeyi kapatıp kurulum sayfasına dönebilirsiniz.' : '') +
    '</p><button class="btn" onclick="window.close()">Bu Sekmeyi Kapat</button>' +
    '</div></body></html>';
  return HtmlService.createHtmlOutput(body);
}

function escHtml_(s) {
  return String(s || '').replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function scanFolderFiles_(folder) {
  var arr = [];
  var it = folder.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (String(f.getMimeType() || '').indexOf('image/') !== 0) continue;
    arr.push(fileMeta_(f, ''));
  }
  arr.sort(function (a, b) { return b.t - a.t; });
  return arr.slice(0, MAX_UPLOAD_INDEX_ITEMS);
}

function fileMeta_(file, desc) {
  var created = file.getDateCreated();
  if (!desc) {
    try { desc = file.getDescription() || ''; } catch (e) {}
  }
  return {
    id: file.getId(),
    name: file.getName(),
    t: created.getTime(),
    createdAt: created.toISOString ? created.toISOString() : String(created),
    size: file.getSize(),
    d: desc
  };
}

function uploadPropKey_(meta) {
  var uploadId = parseUploadId_(meta.d);
  return 'UPLOAD_' + (uploadId || idClean_(meta.id, 80) || String(meta.t || Date.now()));
}

function listUploadIndex_() {
  var all;
  try { all = PropertiesService.getScriptProperties().getProperties(); }
  catch (e) { return []; }
  var arr = [];
  for (var k in all) {
    if (k.indexOf('UPLOAD_') !== 0) continue;
    try { arr.push(JSON.parse(all[k])); } catch (e2) {}
  }
  arr.sort(function (a, b) { return (b.t || 0) - (a.t || 0); });
  return arr.slice(0, MAX_UPLOAD_INDEX_ITEMS);
}

function replaceUploadIndex_(arr) {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  for (var k in all) {
    if (k.indexOf('UPLOAD_') === 0) props.deleteProperty(k);
  }
  arr.slice(0, MAX_UPLOAD_INDEX_ITEMS).forEach(function (meta) {
    try { props.setProperty(uploadPropKey_(meta), JSON.stringify(meta)); } catch (e) {}
  });
}

function recordUpload_(file, desc) {
  try {
    var meta = fileMeta_(file, desc);
    PropertiesService.getScriptProperties().setProperty(uploadPropKey_(meta), JSON.stringify(meta));
    pruneUploads_();
  } catch (e) {}
}

function pruneUploads_() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var rows = [];
  for (var k in all) {
    if (k.indexOf('UPLOAD_') !== 0) continue;
    try {
      var meta = JSON.parse(all[k]);
      rows.push({ key: k, t: meta.t || 0 });
    } catch (e) {
      rows.push({ key: k, t: 0 });
    }
  }
  rows.sort(function (a, b) { return b.t - a.t; });
  rows.slice(MAX_UPLOAD_INDEX_ITEMS).forEach(function (row) {
    props.deleteProperty(row.key);
  });
}

function parseUploadId_(desc) {
  return idClean_(((String(desc || '').match(/UploadId:\s*([^·]+)/) || [])[1] || '').trim(), 80);
}

function findUploadById_(folder, uploadId) {
  uploadId = idClean_(uploadId, 80);
  if (!uploadId) return null;
  var indexed = listUploadIndex_();
  for (var i = 0; i < indexed.length; i++) {
    if (parseUploadId_(indexed[i].d) === uploadId) return indexed[i];
  }
  if (!folder) return null;
  var it = folder.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (String(f.getMimeType() || '').indexOf('image/') !== 0) continue;
    var desc = '';
    try { desc = f.getDescription() || ''; } catch (e) {}
    if (parseUploadId_(desc) === uploadId) {
      var meta = fileMeta_(f, desc);
      recordUpload_(f, desc);
      return meta;
    }
  }
  return null;
}

function findNoteById_(noteId) {
  noteId = idClean_(noteId, 80);
  if (!noteId) return null;
  var all;
  try { all = PropertiesService.getScriptProperties().getProperties(); }
  catch (e) { return null; }
  for (var k in all) {
    if (k.indexOf('NOTE_') !== 0) continue;
    try {
      var note = JSON.parse(all[k]);
      if (idClean_(note.id, 80) === noteId) return note;
    } catch (e2) {}
  }
  return null;
}

function pruneNotes_() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var rows = [];
  for (var k in all) {
    if (k.indexOf('NOTE_') !== 0) continue;
    try {
      var note = JSON.parse(all[k]);
      rows.push({ key: k, t: note.t || 0 });
    } catch (e) {
      rows.push({ key: k, t: 0 });
    }
  }
  rows.sort(function (a, b) { return b.t - a.t; });
  rows.slice(MAX_NOTE_ITEMS).forEach(function (row) {
    props.deleteProperty(row.key);
  });
}

/** Manuel kurulum yardımcıları: gerekiyorsa değerleri düzenleyip Apps Script'te Run deyin. */
function SETUP_setToken() {
  var token = 'BURAYA_TOKEN_YAPISTIRIN';
  if (token.indexOf('BURAYA_') === 0) throw new Error('Önce token değerini bu fonksiyona yapıştırın.');
  PropertiesService.getScriptProperties().setProperty('TOKEN', token);
}

function SETUP_setExistingFolderId() {
  var folderId = 'BURAYA_DRIVE_KLASOR_ID_YAPISTIRIN';
  if (folderId.indexOf('BURAYA_') === 0) throw new Error('Önce Drive klasör ID değerini bu fonksiyona yapıştırın.');
  PropertiesService.getScriptProperties().setProperty('ROOT_FOLDER_ID', folderId);
}

function SETUP_setSetupKey() {
  var setupKey = 'BURAYA_UZUN_KURULUM_ANAHTARI_YAPISTIRIN';
  if (setupKey.indexOf('BURAYA_') === 0) throw new Error('Önce uzun kurulum anahtarını bu fonksiyona yapıştırın.');
  PropertiesService.getScriptProperties().setProperty('SETUP_ADMIN_KEY', setupKey);
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
