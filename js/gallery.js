/* =========================================================================
   gallery.js — Etkinlik sahibi için fotoğraf galerisi
   - Apps Script'ten JSONP ile fotoğraf listesini çeker (CORS'a takılmaz)
   - Google Drive thumbnail URL'leriyle ızgara + lightbox gösterir
   URL parametreleri: api (zorunlu), token (opsiyonel), title/couple (başlık), event
   ========================================================================= */

(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var i18n = window.EventPhotoI18n || { getLang: function () { return 'tr'; }, t: function (key) { return key; } };
  var t = function (key, vars) { return i18n.t(key, vars); };
  var thumb = window.EventPhotoApi.thumb;

  var params = new URLSearchParams(location.search);
  var API    = (params.get('api') || '').trim();
  var TOKEN  = (params.get('token') || '').trim();
  var EVENT_TITLE = (params.get('title') || params.get('couple') || '').trim();

  var grid = $('grid');
  var driveFolderBtn = $('driveFolderBtn');
  var files = [];
  var lbIndex = 0;

  if (EVENT_TITLE) {
    $('galleryTitle').textContent = EVENT_TITLE;
    $('gallerySub').textContent = t('gallery.subtitleTitle', { title: EVENT_TITLE });
    document.title = EVENT_TITLE + ' · EventPhoto';
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

    window.EventPhotoApi.list(API, { max: 1000, token: TOKEN, notes: true }).then(function (data) {
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
      renderNotes(data.notes || []);
      if (!files.length) { if (!(data.notes || []).length) show('empty'); return; }
      render();
    }).catch(function (err) {
      console.error(err);
      // Sunucuya erişiliyor ama yanıt okunamıyorsa neden büyük olasılıkla
      // dağıtım ayarıdır ("Who has access: Anyone") — ev sahibine tam adresi söyle.
      window.EventPhotoApi.diagnose(API).then(function (state) {
        hide('loading');
        failHtml(state === 'unreadable'
          ? t('gallery.failAccessHtml')
          : t('gallery.failConnectionHtml'));
      });
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

  /* --- Anı Defteri notları ---------------------------------------------- */
  function renderNotes(notes) {
    var wrap = $('notesWrap');
    if (!notes.length) { wrap.classList.add('hidden'); return; }
    $('notesSummary').textContent = t('gallery.notesTitle', { count: notes.length });
    var listEl = $('notesList');
    listEl.innerHTML = '';
    notes.forEach(function (n) {
      if (!n || !n.m) return;
      var card = document.createElement('div');
      card.className = 'note-card';
      var text = document.createElement('p');
      text.className = 'note-text';
      text.textContent = n.m;
      card.appendChild(text);
      if (n.g) {
        var by = document.createElement('p');
        by.className = 'note-by';
        by.textContent = '— ' + n.g;
        card.appendChild(by);
      }
      listEl.appendChild(card);
    });
    wrap.classList.remove('hidden');
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

    // Altyazı: misafir adı + görev (dosya description'ından)
    var meta = window.EventPhotoApi.parseMeta(f.d);
    var cap = $('lbCap');
    cap.textContent = meta.guest + (meta.guest && meta.task ? ' · ' : '') + meta.task;
    cap.style.display = (meta.guest || meta.task) ? '' : 'none';
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
  function fail(msg) {
    var n = $('galleryNote');
    n.innerHTML = '';
    var icon = document.createElement('span');
    var text = document.createElement('div');
    icon.setAttribute('aria-hidden', 'true');
    text.textContent = msg;
    n.appendChild(icon);
    n.appendChild(text);
    show('galleryNote');
  }
  function failHtml(html) {
    var n = $('galleryNote');
    n.innerHTML = '<span aria-hidden="true"></span><div>' + html + '</div>';
    show('galleryNote');
  }
  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }
})();
