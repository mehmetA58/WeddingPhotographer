// Statik tutarlılık kontrolleri: JS'in aradığı DOM id'leri HTML'de var mı,
// HTML'in kullandığı i18n anahtarları sözlükte var mı, JS'in t() anahtarları tam mı.
const fs = require('fs');
const path = '/Users/mehmet/Desktop/WeddingPhoto';
const read = f => fs.readFileSync(path + '/' + f, 'utf8');

const pages = {
  'setup.html':     ['js/i18n.js', 'js/events.js', 'js/setup.js'],
  'upload.html':    ['js/i18n.js', 'js/events.js', 'js/upload.js'],
  'gallery.html':   ['js/i18n.js', 'js/events.js', 'js/api.js', 'js/gallery.js'],
  'card.html':      ['js/i18n.js', 'js/events.js', 'js/card.js'],
  'slideshow.html': ['js/i18n.js', 'js/events.js', 'js/api.js', 'js/slideshow.js'],
  'invite.html':    ['js/i18n.js', 'js/events.js', 'js/invite.js'],
};

let fail = 0;

// --- 1. getElementById / $('id') referansları HTML'de mevcut mu? ---
for (const [page, scripts] of Object.entries(pages)) {
  const html = read(page);
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  for (const s of scripts) {
    if (s.includes('i18n') || s.includes('events')) continue; // DOM id kullanmazlar
    const js = read(s);
    const refs = new Set([...js.matchAll(/\$\('([^']+)'\)|getElementById\('([^']+)'\)/g)]
      .map(m => m[1] || m[2]));
    for (const id of refs) {
      if (!ids.has(id)) { console.log(`MISSING ID: #${id} (aranıyor: ${s}, sayfa: ${page})`); fail++; }
    }
  }
}

// --- 2. i18n anahtarları ---
const i18n = read('js/i18n.js');
const trBlock = i18n.slice(i18n.indexOf('tr: {'), i18n.indexOf('en: {'));
const enBlock = i18n.slice(i18n.indexOf('en: {'));
const keysOf = b => new Set([...b.matchAll(/'([a-z][a-zA-Z0-9.]+)':\s/g)].map(m => m[1]));
const tr = keysOf(trBlock), en = keysOf(enBlock);

for (const k of tr) if (!en.has(k)) { console.log(`EN'de eksik anahtar: ${k}`); fail++; }
for (const k of en) if (!tr.has(k)) { console.log(`TR'de eksik anahtar: ${k}`); fail++; }

// HTML data-i18n* öznitelikleri
for (const page of Object.keys(pages)) {
  const html = read(page);
  for (const m of html.matchAll(/data-i18n(?:-html|-placeholder|-title|-aria-label)?="([^"]+)"/g)) {
    if (!tr.has(m[1])) { console.log(`Sözlükte yok: ${m[1]} (${page})`); fail++; }
  }
}

// JS içindeki t('key') çağrıları (dinamik 'event.'+key+'.x' hariç)
for (const scripts of Object.values(pages)) {
  for (const s of scripts) {
    const js = read(s);
    for (const m of js.matchAll(/\bt\('([a-z][a-zA-Z0-9.]+)'/g)) {
      if (m[1].endsWith('.')) continue; // dinamik: t('event.' + key + '.x') — ayrıca kontrol ediliyor
      if (!tr.has(m[1])) { console.log(`Sözlükte yok: ${m[1]} (${s})`); fail++; }
    }
  }
}

// Dinamik event anahtarları: her etkinlik için 5 alan tam mı?
const events = ['wedding','engagement','anniversary','birthday','romantic','welcome','farewell','trip','meeting'];
const fields = ['name','welcome','welcomeDefault','subtitle','titleLabel','titlePlaceholder'];
for (const e of events) for (const f of fields) {
  const k = `event.${e}.${f}`;
  if (!tr.has(k)) { console.log(`TR'de eksik: ${k}`); fail++; }
  if (!en.has(k)) { console.log(`EN'de eksik: ${k}`); fail++; }
}

// Davetiye başlıkları: her etkinlik için invite.<key>.headline
for (const e of events) {
  for (const set of [['TR', tr], ['EN', en]]) {
    if (!set[1].has(`invite.${e}.headline`)) { console.log(`${set[0]}'de eksik: invite.${e}.headline`); fail++; }
  }
}

// Görev anahtarları: events.js'teki her tasks slug'ı sözlükte olmalı
const evSrc = read('js/events.js');
for (const m of evSrc.matchAll(/key:\s*'(\w+)',\s*names:\s*\w+,\s*tasks:\s*\[([^\]]*)\]/g)) {
  const ev = m[1];
  for (const sm of m[2].matchAll(/'(\w+)'/g)) {
    const k = `task.${ev}.${sm[1]}`;
    if (!tr.has(k)) { console.log(`TR'de eksik görev: ${k}`); fail++; }
    if (!en.has(k)) { console.log(`EN'de eksik görev: ${k}`); fail++; }
  }
}

// --- 3. CSS: her etkinlik için data-event bloğu + cream tonları var mı? ---
const css = read('css/style.css');
for (const e of events.filter(e => e !== 'wedding')) {
  const block = css.match(new RegExp(`html\\[data-event="${e}"\\]\\s*\\{([^}]+)\\}`));
  if (!block) { console.log(`CSS bloğu yok: ${e}`); fail++; continue; }
  for (const v of ['--gold:', '--gold-dark:', '--gold-light:', '--gold-bg:', '--cream:', '--cream-2:']) {
    if (!block[1].includes(v)) { console.log(`CSS ${e} bloğunda eksik: ${v}`); fail++; }
  }
}

console.log(fail ? `\n${fail} sorun bulundu` : 'Tüm kontroller temiz ✓');
process.exit(fail ? 1 : 0);
