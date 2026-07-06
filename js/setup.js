/* =========================================================================
   setup.js — Etkinlik kurulum sayfası
   - Apps Script URL + etkinlik başlığı + token'dan yükleme linki üretir
   - Linkin QR kodunu çizer (yerel qrcode.min.js), indirilebilir/yazdırılabilir
   - "Bağlantıyı Test Et" ile Web App'in çalıştığını doğrular
   Tamamen istemci tarafı — sunucuya hiçbir şey gönderilmez.
   ========================================================================= */

(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var i18n = window.WeddingI18n || { getLang: function () { return 'tr'; }, setLang: function () {}, t: function (key) { return key; } };
  var t = function (key, vars) { return i18n.t(key, vars); };

  var apiUrlEl   = $('apiUrl');
  var eventTitleEl = $('eventTitle');
  var eventTitleLabel = $('eventTitleLabel');
  var tokenEl    = $('token');
  var rawEl      = $('rawMode');
  var langEl     = $('languageSelect');
  var noteEl     = $('setupNote');

  var formSec    = $('form');
  var resultSec  = $('result');
  var qrHolder   = $('qrHolder');
  var qrCaption  = $('qrCaption');
  var linkText   = $('linkText');
  var previewBtn = $('previewBtn');

  var LS_KEY = 'weddingUploadSetup';
  var currentLink = '';       // katılımcı yükleme linki
  var currentGallery = '';    // organizasyon sahibi için özel galeri linki

  /* --- Kayıtlı ayarları geri yükle ------------------------------------- */
  var currentEvent = window.WeddingEvents.getKey ? window.WeddingEvents.getKey() : window.WeddingEvents.DEFAULT_KEY;
  try {
    var saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    if (saved.api)    apiUrlEl.value = saved.api;
    if (saved.title || saved.couple) eventTitleEl.value = saved.title || saved.couple;
    if (saved.token)  tokenEl.value  = saved.token;
    if (saved.raw)    rawEl.checked  = true;
    if (saved.event && window.WeddingEvents.has(saved.event)) currentEvent = saved.event;
  } catch (e) { /* yoksay */ }
  window.WeddingEvents.apply(currentEvent);
  langEl.value = i18n.getLang();

  langEl.addEventListener('change', function () {
    i18n.setLang(langEl.value);
    buildConceptGrid();   // kart adları dile göre yenilensin
    updateTitleField();   // başlık etiketi/placeholder dile göre yenilensin
    if (!resultSec.classList.contains('hidden')) {
      $('generateBtn').click();
    }
  });

  /* --- Konsept (etkinlik) kart ızgarası -------------------------------- */
  var conceptGrid = $('conceptGrid');

  function buildConceptGrid() {
    conceptGrid.innerHTML = '';
    conceptGrid.setAttribute('aria-label', t('setup.eventLabel').replace(/^\d+\s*·\s*/, ''));
    window.WeddingEvents.LIST.forEach(function (ev) {
      var name = t('event.' + ev.key + '.name');
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'concept-card' + (ev.key === currentEvent ? ' active' : '');
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', ev.key === currentEvent ? 'true' : 'false');
      card.title = name;
      card.dataset.key = ev.key;

      var emojiEl = document.createElement('span');
      emojiEl.className = 'ce-emoji';
      emojiEl.setAttribute('aria-hidden', 'true');
      emojiEl.textContent = ev.emoji;
      var nameEl = document.createElement('span');
      nameEl.className = 'ce-name';
      nameEl.textContent = name;

      card.appendChild(emojiEl);
      card.appendChild(nameEl);
      card.addEventListener('click', function () { selectEvent(ev.key); });
      conceptGrid.appendChild(card);
    });
  }

  function selectEvent(key) {
    currentEvent = key;
    window.WeddingEvents.apply(key);
    Array.prototype.forEach.call(conceptGrid.children, function (c) {
      var on = c.dataset.key === key;
      c.classList.toggle('active', on);
      c.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    updateTitleField();
  }

  function updateTitleField() {
    eventTitleLabel.textContent = '3 · ' + t('event.' + currentEvent + '.titleLabel');
    eventTitleEl.setAttribute('placeholder', t('event.' + currentEvent + '.titlePlaceholder'));
  }

  buildConceptGrid();
  updateTitleField();

  /* --- Sihirbaz: backend kodunu önden çek ve kopyala ------------------- */
  var backendCode = '';
  fetch('apps-script/Code.gs')
    .then(function (r) { return r.ok ? r.text() : ''; })
    .then(function (txt) { backendCode = txt; })
    .catch(function () { /* file:// veya erişilemez → tıklamada yedeğe düşülür */ });

  $('copyCodeBtn').addEventListener('click', function () {
    var btn = $('copyCodeBtn');
    if (backendCode) {
      copyText(backendCode, function () {
        btn.textContent = t('setup.wizCopied');
        setTimeout(function () { btn.textContent = t('setup.wizCopyCode'); }, 2000);
      });
    } else {
      // Kod önden çekilemediyse (ör. yerel dosya) ham dosyayı yeni sekmede aç
      window.open('apps-script/Code.gs', '_blank');
    }
  });

  /* --- Token üret ------------------------------------------------------ */
  $('genToken').addEventListener('click', function () {
    var arr = new Uint8Array(9);
    (window.crypto || {}).getRandomValues
      ? window.crypto.getRandomValues(arr)
      : arr.forEach(function (_, i) { arr[i] = Math.floor(Math.random() * 256); });
    tokenEl.value = Array.prototype.map.call(arr, function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  });

  /* --- Bağlantıyı test et ---------------------------------------------- */
  $('testBtn').addEventListener('click', function () {
    var api = apiUrlEl.value.trim();
    if (!api) { showNote('error', t('setup.needApi')); return; }
    showNote('info', t('setup.testing'));

    var done = false;
    var timer = setTimeout(function () {
      if (done) return; done = true;
      showNote('info', t('setup.slow'));
    }, 12000);

    fetch(api, { method: 'GET' })
      .then(function (r) { return r.text(); })
      .then(function (body) {   // NOT: parametreyi "t" yapmayın — dıştaki i18n t()'yi gölgeler
        if (done) return; done = true; clearTimeout(timer);
        var ok = false;
        try { ok = JSON.parse(body).status === 'ready'; } catch (e) {}
        ok ? showNote('ok', t('setup.ok'))
           : showNote('info', t('setup.unexpected'));
      })
      .catch(function () {
        if (done) return; done = true; clearTimeout(timer);
        // Tarayıcı CORS nedeniyle GET yanıtını okuyamayabilir — bu her zaman hata değildir.
        showNote('info', t('setup.cors'));
      });
  });

  /* --- QR oluştur ------------------------------------------------------ */
  $('generateBtn').addEventListener('click', function () {
    var api = apiUrlEl.value.trim();
    var eventTitle = eventTitleEl.value.trim();
    var token = tokenEl.value.trim();
    var raw = rawEl.checked;
    var lang = i18n.getLang();

    if (!api) { showNote('error', t('setup.requiredApi')); apiUrlEl.focus(); return; }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(api)) {
      showNote('info', t('setup.urlShape'));
    } else {
      hideNote();
    }

    // Katılımcı yükleme linki (upload.html bu sayfayla aynı klasörde)
    var url = new URL('upload.html', location.href);
    url.searchParams.set('api', api);
    url.searchParams.set('lang', lang);
    url.searchParams.set('event', currentEvent);
    if (eventTitle) url.searchParams.set('title', eventTitle);
    if (token)  url.searchParams.set('token', token);
    if (raw)    url.searchParams.set('raw', '1');
    currentLink = url.toString();

    // Etkinlik sahibi için özel galeri linki (gallery.html)
    var gurl = new URL('gallery.html', location.href);
    gurl.searchParams.set('api', api);
    gurl.searchParams.set('lang', lang);
    gurl.searchParams.set('event', currentEvent);
    if (eventTitle) gurl.searchParams.set('title', eventTitle);
    if (token)  gurl.searchParams.set('token', token);
    currentGallery = gurl.toString();

    // Yazdırılabilir kart linki (card.html) — QR verisi = katılımcı yükleme linki
    var curl = new URL('card.html', location.href);
    curl.searchParams.set('data', currentLink);
    curl.searchParams.set('lang', lang);
    curl.searchParams.set('event', currentEvent);
    if (eventTitle) curl.searchParams.set('title', eventTitle);

    // Kaydet
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ api: api, title: eventTitle, token: token, raw: raw, lang: lang, event: currentEvent }));
    } catch (e) {}

    // QR çiz
    qrHolder.innerHTML = '';
    new QRCode(qrHolder, {
      text: currentLink,
      width: 240,
      height: 240,
      colorDark: '#2E2A26',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.L  // uzun URL için daha az yoğun = daha kolay okunur
    });

    qrCaption.textContent = window.WeddingEvents.get(currentEvent).emoji + ' ' + (eventTitle || t('setup.albumTitle'));
    linkText.textContent = currentLink;
    previewBtn.href = currentLink;
    $('cardBtn').href = curl.toString();
    $('galleryOpenBtn').href = currentGallery;
    $('galleryLinkText').textContent = currentGallery;

    formSec.classList.add('hidden');
    resultSec.classList.remove('hidden');
    resultSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* --- PNG indir ------------------------------------------------------- */
  $('downloadBtn').addEventListener('click', function () {
    var dataUrl = getQrDataUrl();
    if (!dataUrl) { showNote('error', t('setup.qrMissing')); return; }
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'etkinlik-qr' + (eventTitleEl.value.trim() ? '-' + slug(eventTitleEl.value) : '') + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  /* --- Linki kopyala --------------------------------------------------- */
  $('copyBtn').addEventListener('click', function () {
    copyText(currentLink, function () {
      showNoteResult('ok', t('setup.copyUploadOk'), linkText);
    });
  });

  $('copyGalleryBtn').addEventListener('click', function () {
    copyText(currentGallery, function () {
      showNoteResult('ok', t('setup.copyGalleryOk'), $('galleryLinkText'));
    });
  });

  /* --- Ayarları düzenle ------------------------------------------------ */
  $('editBtn').addEventListener('click', function () {
    resultSec.classList.add('hidden');
    formSec.classList.remove('hidden');
    formSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* --- Yardımcılar ----------------------------------------------------- */
  function getQrDataUrl() {
    var canvas = qrHolder.querySelector('canvas');
    if (canvas) { try { return canvas.toDataURL('image/png'); } catch (e) {} }
    var img = qrHolder.querySelector('img');
    return img ? img.src : '';
  }
  function showNote(type, html) {
    noteEl.className = 'note note-' + type;
    noteEl.innerHTML = html;
    noteEl.classList.remove('hidden');
  }
  function hideNote() { noteEl.classList.add('hidden'); }
  function showNoteResult(type, msg, afterEl) {
    // Sonuç bölümünde kısa geri bildirim (kopyalandı vb.)
    var el = document.createElement('div');
    el.className = 'note note-' + type;
    el.textContent = msg;
    el.style.marginTop = '10px';
    (afterEl || linkText).insertAdjacentElement('afterend', el);
    setTimeout(function () { el.remove(); }, 2500);
  }
  function copyText(text, ok) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () { legacyCopy(text, ok); });
    } else { legacyCopy(text, ok); }
  }
  function legacyCopy(text, cb) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); cb && cb(); } catch (e) {}
    document.body.removeChild(ta);
  }
  function slug(s) {
    return s.toLowerCase()
      .replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g')
      .replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
})();
