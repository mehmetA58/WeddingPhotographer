/* =========================================================================
   gallery.js — Etkinlik sahibi için fotoğraf galerisi
   - Apps Script'ten JSONP ile fotoğraf listesini çeker (CORS'a takılmaz)
   - Google Drive thumbnail URL'leriyle ızgara + lightbox gösterir
   URL parametreleri: api (zorunlu), token (opsiyonel), title/couple (başlık), event
   ========================================================================= */

(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var i18n = window.WeddingI18n || { getLang: function () { return 'tr'; }, t: function (key) { return key; } };
  var t = function (key, vars) { return i18n.t(key, vars); };

  var params = new URLSearchParams(location.search);
  var API    = (params.get('api') || '').trim();
  var TOKEN  = (params.get('token') || '').trim();
  var EVENT_TITLE = (params.get('title') || params.get('couple') || '').trim();

  var grid = $('grid');
  var driveFolderBtn = $('driveFolderBtn');
  var files = [];
  var lbIndex = 0;

  // Etkinlik konsepti: başlık emojisi
  var EVENT = window.WeddingEvents ? window.WeddingEvents.get(window.WeddingEvents.getKey()) : null;
  var eventEmojiEl = $('eventEmoji');
  if (EVENT && eventEmojiEl) eventEmojiEl.textContent = EVENT.emoji;

  if (EVENT_TITLE) {
    $('galleryTitle').textContent = EVENT_TITLE;
    $('gallerySub').textContent = t('gallery.subtitleTitle', { title: EVENT_TITLE });
    document.title = EVENT_TITLE + ' · ' + (i18n.getLang() === 'en' ? 'Photo Album' : 'Fotoğraf Albümü');
  }

  if (!API) {
    $('configError').classList.remove('hidden');
    return;
  }

  $('toolbar').classList.remove('hidden');
  $('refreshBtn').addEventListener('click', load);
  load();

  /* --- Listeyi yükle (JSONP) ------------------------------------------- */
  function load() {
    show('loading');
    hide('empty'); hide('galleryNote');
    grid.innerHTML = '';

    var url = API + (API.indexOf('?') >= 0 ? '&' : '?') +
      'action=list&max=1000' + (TOKEN ? '&token=' + encodeURIComponent(TOKEN) : '');

    jsonp(url).then(function (data) {
      hide('loading');
      if (!data || data.status !== 'ok') {
        if (data && data.code === 'invalid_token') return fail(t('gallery.invalidToken'));
        return fail(data && data.message ? data.message : t('gallery.failList'));
      }
      files = data.files || [];
      if (data.folderUrl) {
        driveFolderBtn.href = data.folderUrl;
        driveFolderBtn.classList.remove('hidden');
      } else {
        driveFolderBtn.removeAttribute('href');
        driveFolderBtn.classList.add('hidden');
      }
      $('countLabel').textContent = files.length
        ? t('gallery.countPhotos', { count: files.length })
        : t('gallery.countEmpty');
      if (!files.length) { show('empty'); return; }
      render();
    }).catch(function (err) {
      hide('loading');
      fail(t('gallery.failConnection'));
      console.error(err);
    });
  }

  function render() {
    var frag = document.createDocumentFragment();
    files.forEach(function (f, i) {
      var cell = document.createElement('button');
      cell.className = 'g-cell';
      cell.type = 'button';
      cell.setAttribute('aria-label', f.name || 'Fotoğraf');
      var img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = f.name || '';
      img.src = thumb(f.id, 600);
      img.onerror = function () { cell.classList.add('g-fail'); img.remove(); };
      cell.appendChild(img);
      cell.addEventListener('click', function () { openLightbox(i); });
      frag.appendChild(cell);
    });
    grid.appendChild(frag);
  }

  /* --- Lightbox -------------------------------------------------------- */
  var lb = $('lightbox'), lbImg = $('lbImg'), lbOpen = $('lbOpen');
  function openLightbox(i) {
    lbIndex = i;
    updateLightbox();
    lb.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lb.classList.add('hidden');
    lbImg.src = '';
    document.body.style.overflow = '';
  }
  function updateLightbox() {
    var f = files[lbIndex];
    if (!f) return;
    lbImg.src = thumb(f.id, 1600);
    lbOpen.href = 'https://drive.google.com/file/d/' + f.id + '/view';
  }
  function nav(d) {
    lbIndex = (lbIndex + d + files.length) % files.length;
    updateLightbox();
  }
  $('lbClose').addEventListener('click', closeLightbox);
  $('lbPrev').addEventListener('click', function () { nav(-1); });
  $('lbNext').addEventListener('click', function () { nav(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', function (e) {
    if (lb.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') nav(-1);
    else if (e.key === 'ArrowRight') nav(1);
  });

  /* --- Yardımcılar ----------------------------------------------------- */
  // Google Drive küçük resim servisi (dosya "bağlantıya sahip olan görüntüler"
  // olduğu için token gerektirmeden <img>'de yüklenir).
  function thumb(id, w) {
    return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + w;
  }
  function jsonp(url) {
    return new Promise(function (resolve, reject) {
      var cb = '__gcb_' + Math.random().toString(36).slice(2);
      var s = document.createElement('script');
      var timer = setTimeout(function () { cleanup(); reject(new Error('Zaman aşımı')); }, 20000);
      function cleanup() { clearTimeout(timer); try { delete window[cb]; } catch (e) { window[cb] = undefined; } if (s.parentNode) s.parentNode.removeChild(s); }
      window[cb] = function (data) { cleanup(); resolve(data); };
      s.onerror = function () { cleanup(); reject(new Error('Betik hatası')); };
      s.src = url + '&callback=' + cb;
      document.head.appendChild(s);
    });
  }
  function fail(msg) {
    var n = $('galleryNote');
    n.innerHTML = '';
    var icon = document.createElement('span');
    var text = document.createElement('div');
    icon.textContent = '⚠️';
    text.textContent = msg;
    n.appendChild(icon);
    n.appendChild(text);
    show('galleryNote');
  }
  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }
})();
