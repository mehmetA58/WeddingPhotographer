/* =========================================================================
   setup.js — Etkinlik kurulum sayfası
   - "Google ile Bağlan" → sunucu tarafı OAuth (authorization code) akışı
     (/api/oauth/start → Google onayı → /api/oauth/callback → buraya ?e=&k=)
   - Backend Cloudflare Pages Functions'tır; kullanıcı tarafında ekstra adım yok
   - QR kodu ve linkleri üretir
   ========================================================================= */

(function () {
  'use strict';

  /* =====================================================================
     DOM / i18n
     ===================================================================== */
  var $ = function (id) { return document.getElementById(id); };
  var i18n = window.EventPhotoI18n || { getLang: function () { return 'tr'; }, setLang: function () {}, t: function (key) { return key; } };
  var t = function (key, vars) { return i18n.t(key, vars); };

  var eventTitleEl      = $('eventTitle');
  var eventTitleLabel   = $('eventTitleLabel');
  var rawEl             = $('rawMode');
  var noTasksEl         = $('noTasks');
  var langEl            = $('languageSelect');
  var noteEl            = $('setupNote');

  var formSec           = $('form');
  var resultSec         = $('result');
  var qrHolder          = $('qrHolder');
  var qrCaption         = $('qrCaption');
  var linkText          = $('linkText');
  var previewBtn        = $('previewBtn');

  var googleBtn         = $('googleBtn');
  var googleNotAuthed   = $('googleNotAuthed');
  var setupComplete     = $('setupComplete');
  var googleError       = $('googleError');
  var generateBtn       = $('generateBtn');
  var reconnectBtn      = $('reconnectBtn');
  var rotateBtn         = $('rotateBtn');

  var LS_KEY            = 'eventPhotoSetup';
  var LS_GSETUP         = 'eventPhotoGoogleSetup';
  var LEGACY_LS_KEY     = 'weddingUploadSetup';

  var currentLink      = '';
  var currentGallery   = '';
  var currentSlideshow = '';

  /* Internal state ------------------------------------------------------ */
  var eventId  = '';
  var adminKey = '';

  /* =====================================================================
     OAuth dönüşü: /api/oauth/callback bizi ?e=&k=&title=&event= (veya ?err=)
     ile buraya döndürür. URL'i temizleyip durumu kaydederiz.
     ===================================================================== */
  var urlParams = new URLSearchParams(location.search);
  var returnedEvent = (urlParams.get('e') || '').trim();
  var returnedKey   = (urlParams.get('k') || '').trim();
  var returnedTitle = (urlParams.get('title') || '').trim();
  var returnedType  = (urlParams.get('event') || '').trim();
  var oauthErr      = (urlParams.get('err') || '').trim();

  /* =====================================================================
     Kayıtlı ayarları geri yükle
     ===================================================================== */
  var currentEvent = window.EventPhotoEvents.getKey ? window.EventPhotoEvents.getKey() : window.EventPhotoEvents.DEFAULT_KEY;
  try {
    var saved = JSON.parse(localStorage.getItem(LS_KEY) || localStorage.getItem(LEGACY_LS_KEY) || '{}');
    if (saved.title || saved.couple) eventTitleEl.value = saved.title || saved.couple;
    if (saved.raw)     rawEl.checked  = true;
    if (saved.noTasks) noTasksEl.checked = true;
    if (saved.event && window.EventPhotoEvents.has(saved.event)) currentEvent = saved.event;

    var gsaved = JSON.parse(localStorage.getItem(LS_GSETUP) || '{}');
    if (gsaved.eventId)  eventId  = gsaved.eventId;
    if (gsaved.adminKey) adminKey = gsaved.adminKey;
  } catch (e) {}

  // OAuth dönüşü kayıtlı duruma göre önceliklidir.
  if (returnedEvent && returnedKey) {
    eventId  = returnedEvent;
    adminKey = returnedKey;
    if (returnedTitle) eventTitleEl.value = returnedTitle;
    if (returnedType && window.EventPhotoEvents.has(returnedType)) currentEvent = returnedType;
    saveGoogleState();
    // Sorgu parametrelerini temizle (yenilemede tekrar tetiklenmesin)
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
  }

  window.EventPhotoEvents.apply(currentEvent);
  langEl.value = i18n.getLang();

  if (oauthErr) {
    showNote('error', t('setup.oauthError', { code: escapeHtml(oauthErr) }));
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
  }

  if (eventId && adminKey) {
    showSetupComplete();
  }
  updateGenerateState();

  /* =====================================================================
     Konsept (etkinlik) kart ızgarası
     ===================================================================== */
  var conceptGrid = $('conceptGrid');
  function buildConceptGrid() {
    conceptGrid.innerHTML = '';
    conceptGrid.setAttribute('aria-label', t('setup.eventLabel').replace(/^\d+\s*·\s*/, ''));
    window.EventPhotoEvents.LIST.forEach(function (ev) {
      var name = t('event.' + ev.key + '.name');
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'concept-card' + (ev.key === currentEvent ? ' active' : '');
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', ev.key === currentEvent ? 'true' : 'false');
      card.title = name;
      card.dataset.key = ev.key;
      var accentEl = document.createElement('span');
      accentEl.className = 'ce-accent';
      accentEl.setAttribute('aria-hidden', 'true');
      var nameEl = document.createElement('span');
      nameEl.className = 'ce-name';
      nameEl.textContent = name;
      card.appendChild(accentEl);
      card.appendChild(nameEl);
      card.addEventListener('click', function () { selectEvent(ev.key); });
      conceptGrid.appendChild(card);
    });
  }

  function selectEvent(key) {
    currentEvent = key;
    window.EventPhotoEvents.apply(key);
    Array.prototype.forEach.call(conceptGrid.children, function (c) {
      var on = c.dataset.key === key;
      c.classList.toggle('active', on);
      c.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    updateTitleField();
  }

  function updateTitleField() {
    eventTitleLabel.textContent = '2 · ' + t('event.' + currentEvent + '.titleLabel');
    eventTitleEl.setAttribute('placeholder', t('event.' + currentEvent + '.titlePlaceholder'));
  }

  buildConceptGrid();
  updateTitleField();

  langEl.addEventListener('change', function () {
    i18n.setLang(langEl.value);
    buildConceptGrid();
    updateTitleField();
    if (!resultSec.classList.contains('hidden')) {
      generateBtn.click();
    }
  });

  /* =====================================================================
     GOOGLE İLE BAĞLAN  → sunucu tarafı OAuth'a yönlendir
     ===================================================================== */
  googleBtn.addEventListener('click', function () {
    googleError.style.display = 'none';
    // Kullanıcının seçimlerini sakla; OAuth dönüşünde form geri gelsin.
    persistForm();
    var qs = new URLSearchParams();
    var title = (eventTitleEl.value || '').trim();
    if (title) qs.set('title', title);
    qs.set('event', currentEvent);
    location.href = '/api/oauth/start?' + qs.toString();
  });

  reconnectBtn.addEventListener('click', function () {
    try { localStorage.removeItem(LS_GSETUP); } catch (e) {}
    eventId = '';
    adminKey = '';
    setupComplete.classList.add('hidden');
    googleNotAuthed.classList.remove('hidden');
    updateGenerateState();
  });

  if (rotateBtn) rotateBtn.addEventListener('click', function () {
    fetch('/api/admin/rotate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: eventId, adminKey: adminKey })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (!data || data.status !== 'ok') throw new Error('rotate_failed');
      adminKey = data.adminKey;
      saveGoogleState();
      if (!resultSec.classList.contains('hidden')) generateBtn.click();
      showNoteResult('ok', t('setup.rotateOk'), rotateBtn);
    }).catch(function () { showNote('error', t('setup.rotateFail')); });
  });

  function showSetupComplete() {
    googleNotAuthed.classList.add('hidden');
    setupComplete.classList.remove('hidden');
    updateGenerateState();
    hideNote();
  }

  function updateGenerateState() {
    generateBtn.disabled = !(eventId && adminKey);
  }

  function saveGoogleState() {
    try {
      localStorage.setItem(LS_GSETUP, JSON.stringify({
        eventId: eventId, adminKey: adminKey, timestamp: Date.now()
      }));
    } catch (e) {}
  }

  function persistForm() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        title: (eventTitleEl.value || '').trim(),
        raw: rawEl.checked, lang: i18n.getLang(),
        event: currentEvent, noTasks: noTasksEl.checked
      }));
    } catch (e) {}
  }

  /* =====================================================================
     QR oluştur — linkler eventId (misafir) ve adminKey (ev sahibi) ile
     ===================================================================== */
  generateBtn.addEventListener('click', function () {
    if (!eventId || !adminKey) { showNote('error', t('setup.needAuth')); return; }
    var eventTitle = eventTitleEl.value.trim();
    var raw = rawEl.checked;
    var lang = i18n.getLang();

    var url = new URL('upload.html', location.href);
    url.searchParams.set('e', eventId);
    url.searchParams.set('lang', lang);
    url.searchParams.set('event', currentEvent);
    if (eventTitle) url.searchParams.set('title', eventTitle);
    if (raw)    url.searchParams.set('raw', '1');
    if (noTasksEl.checked) url.searchParams.set('tasks', '0');
    currentLink = url.toString();

    var gurl = new URL('gallery.html', location.href);
    gurl.searchParams.set('e', eventId);
    gurl.searchParams.set('k', adminKey);
    gurl.searchParams.set('lang', lang);
    gurl.searchParams.set('event', currentEvent);
    if (eventTitle) gurl.searchParams.set('title', eventTitle);
    currentGallery = gurl.toString();

    // Canlı sunum ekranı (TV/projeksiyon): liste + köşe QR için yükleme linki
    var surl = new URL('slideshow.html', location.href);
    surl.searchParams.set('e', eventId);
    surl.searchParams.set('k', adminKey);
    surl.searchParams.set('lang', lang);
    surl.searchParams.set('event', currentEvent);
    if (eventTitle) surl.searchParams.set('title', eventTitle);
    surl.searchParams.set('qr', currentLink);
    currentSlideshow = surl.toString();

    var curl = new URL('card.html', location.href);
    curl.searchParams.set('data', currentLink);
    curl.searchParams.set('lang', lang);
    curl.searchParams.set('event', currentEvent);
    if (eventTitle) curl.searchParams.set('title', eventTitle);

    persistForm();

    qrHolder.innerHTML = '';
    new QRCode(qrHolder, {
      text: currentLink,
      width: 240,
      height: 240,
      colorDark: '#2E2A26',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.L
    });

    qrCaption.textContent = eventTitle || t('setup.albumTitle');
    linkText.textContent = currentLink;
    previewBtn.href = currentLink;
    $('cardBtn').href = curl.toString();
    $('galleryOpenBtn').href = currentGallery;
    $('galleryLinkText').textContent = currentGallery;
    $('slideshowOpenBtn').href = currentSlideshow;
    $('slideshowLinkText').textContent = currentSlideshow;

    formSec.classList.add('hidden');
    resultSec.classList.remove('hidden');
    resultSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* =====================================================================
     PNG indir / Link kopyala / Düzenle
     ===================================================================== */
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

  $('copySlideshowBtn').addEventListener('click', function () {
    copyText(currentSlideshow, function () {
      showNoteResult('ok', t('setup.copySlideshowOk'), $('slideshowLinkText'));
    });
  });

  $('editBtn').addEventListener('click', function () {
    resultSec.classList.add('hidden');
    formSec.classList.remove('hidden');
    formSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* =====================================================================
     Yardımcılar
     ===================================================================== */
  function getQrDataUrl() {
    var canvas = qrHolder.querySelector('canvas');
    if (canvas) { try { return canvas.toDataURL('image/png'); } catch (e) {} }
    var img = qrHolder.querySelector('img');
    return img ? img.src : '';
  }

  function showNote(type, html) {
    noteEl.className = 'note note-' + type;
    // Metni tek bir sarmalayıcıya koy: .note flex olduğundan aksi halde
    // her inline eleman (<b>, <code>) ayrı bir flex öğesi olup satırı bozar.
    noteEl.innerHTML = '<span aria-hidden="true"></span><div>' + html + '</div>';
    noteEl.classList.remove('hidden');
  }

  function hideNote() { noteEl.classList.add('hidden'); }

  function showNoteResult(type, msg, afterEl) {
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

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

})();
