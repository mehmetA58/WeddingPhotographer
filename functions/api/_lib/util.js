/* =========================================================================
   util.js — Saf yardımcılar (Cloudflare Pages Functions)
   apps-script/Code.gs'ten portlandı; hiçbir bağımlılık / global yok.
   ========================================================================= */

export const DEFAULT_FOLDER_NAME = 'Etkinlik Fotoğrafları';
export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024; // ~40MB ham dosya
export const MAX_NOTE_ITEMS = 120;
export const NOTE_LIST_LIMIT = 50;
export const MAX_LIST_ITEMS = 1000;
export const ADMIN_KEY_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function isValidAdminKey(record, key) {
  if (!record || !key || key !== record.adminKey) return false;
  var expiresAt = Number(record.adminKeyExpiresAt || 0);
  // Records created before expiry was introduced get a bounded migration window.
  if (!expiresAt) expiresAt = Number(record.createdAt || 0) + ADMIN_KEY_TTL_MS;
  return expiresAt > Date.now();
}

/* --- JSON yanıt sarmalayıcı ------------------------------------------- */
export function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

/* --- Metin temizleyiciler (Code.gs birebir) --------------------------- */
export function descClean(s, max) {
  s = String(s || '').replace(/[·\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
  if (max && s.length > max) s = s.slice(0, max);
  return s;
}

export function sanitize(s, max) {
  s = String(s || '')
    .replace(/[\/\\?%*:|"<>]/g, '')   // dosya adında geçersiz karakterler
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '-');
  if (max && s.length > max) s = s.slice(0, max);
  return s;
}

export function idClean(s, max) {
  return String(s || '').replace(/[^0-9A-Za-z_-]/g, '').slice(0, max || 80);
}

function stripExt(name) { return String(name || '').replace(/\.[^.]+$/, ''); }

function extFromName(name) {
  const m = String(name || '').match(/\.([a-zA-Z0-9]{2,5})$/);
  return m ? m[1].toLowerCase() : '';
}

export function extFromMime(mime) {
  const map = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
    'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic',
    'image/heif': 'heif', 'image/bmp': 'bmp', 'image/tiff': 'tiff'
  };
  return map[String(mime).toLowerCase()] || '';
}

export function isAllowedImageMime(mime) {
  return !!extFromMime(mime);
}

/* --- Dosya adı ve açıklama (galeri altyazıları bunu okur) ------------- */
export function buildFileName(filename, guestName, mime, task) {
  const ts = formatStamp(new Date());
  const rand = Math.floor(Math.random() * 9000 + 1000); // aynı saniyedeki çakışmayı önle

  const parts = [ts];
  const guest = sanitize(guestName, 30);
  if (guest) parts.push(guest);

  const taskPart = sanitize(task, 24);
  if (taskPart) parts.push(taskPart);

  const base = sanitize(stripExt(filename), 24);
  if (base) parts.push(base);

  parts.push(rand);
  const ext = extFromMime(mime) || extFromName(filename) || 'jpg';
  return parts.join('_') + '.' + ext;
}

/** "EventPhoto · Katılımcı: X · Görev: Y · UploadId: Z" — js/api.js parseMeta bunu ayrıştırır. */
export function buildDescription(guestName, task, uploadId) {
  const parts = ['EventPhoto'];
  const guest = descClean(guestName, 60);
  if (guest) parts.push('Katılımcı: ' + guest);
  const t = descClean(task, 80);
  if (t) parts.push('Görev: ' + t);
  const id = idClean(uploadId, 80);
  if (id) parts.push('UploadId: ' + id);
  return parts.join(' · ');
}

/* --- Zaman damgası (Europe/Istanbul, yyyy-MM-dd_HH-mm-ss) ------------- */
export function formatStamp(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(date).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  // en-CA verir: 2026-07-25, 24 saat "00".."23"
  const hh = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}_${hh}-${parts.minute}-${parts.second}`;
}

/* --- Görsel imza doğrulama (Code.gs looksLikeImage_ portu) ------------ */
export function looksLikeImage(bytes, mime) {
  if (!bytes || bytes.length < 4) return false;
  mime = String(mime || '').toLowerCase();
  const b = (i) => bytes[i] || 0;
  const ascii = (start, len) => {
    let s = '';
    for (let i = 0; i < len; i++) s += String.fromCharCode(b(start + i));
    return s;
  };
  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    return b(0) === 0xFF && b(1) === 0xD8 && b(2) === 0xFF;
  }
  if (mime === 'image/png') {
    return b(0) === 0x89 && ascii(1, 3) === 'PNG';
  }
  if (mime === 'image/gif') {
    return ascii(0, 4) === 'GIF8';
  }
  if (mime === 'image/webp') {
    return bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP';
  }
  if (mime === 'image/bmp') {
    return ascii(0, 2) === 'BM';
  }
  if (mime === 'image/tiff') {
    return (ascii(0, 2) === 'II' && b(2) === 42 && b(3) === 0) ||
      (ascii(0, 2) === 'MM' && b(2) === 0 && b(3) === 42);
  }
  if (mime === 'image/heic' || mime === 'image/heif') {
    if (bytes.length < 12 || ascii(4, 4) !== 'ftyp') return false;
    return /^(heic|heix|hevc|hevx|heif|mif1|msf1)$/.test(ascii(8, 4));
  }
  return false;
}

/* --- Rastgele kimlikler ---------------------------------------------- */
export function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** URL-güvenli, tahmin edilemez etkinlik kimliği (~22 karakter). */
export function randomId() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
