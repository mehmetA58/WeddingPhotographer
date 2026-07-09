/* =========================================================================
   slideshow.js — Canlı Sunum Ekranı (mekandaki TV / projeksiyon)
   - 20 sn'de bir Apps Script'ten listeyi çeker (JSONP, js/api.js)
   - Yeni fotoğraflar "masaya bırakılan polaroid" animasyonuyla öne alınır
   - Aralara Anı Defteri notları serpiştirilir
   - Tıklama = tam ekran; Wake Lock ile ekran uyumaz
   URL parametreleri: api (zorunlu), token, event, title, lang,
                      qr (misafir yükleme linki — köşe QR'ı)
   ========================================================================= */

(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var i18n = window.EventPhotoI18n || { getLang: function () { return 'tr'; }, t: function (key) { return key; } };
  var t = function (key, vars) { return i18n.t(key, vars); };
  var Api = window.EventPhotoApi;

  var params  = new URLSearchParams(location.search);
  var API     = (params.get('api') || '').trim();
  var TOKEN   = (params.get('token') || '').trim();
  var TITLE   = (params.get('title') || '').trim();
  var QR_LINK = (params.get('qr') || '').trim();
  var DEMO    = params.get('demo') === '1';   // API'siz örnek akış (landing/tanıtım)

  // ?poll= ve ?slide= (ms) ile ayarlanabilir; varsayılanlar etkinlik için dengeli
  var POLL_MS    = clamp(parseInt(params.get('poll'), 10)  || 20000, 4000, 120000);
  var SLIDE_MS   = clamp(parseInt(params.get('slide'), 10) || 8000,  2000, 60000);
  var NOTE_EVERY = 3;     // kaç fotoğrafta bir not kartı

  function clamp(v, min, max) {
    if (isNaN(v)) return min;
    return Math.min(max, Math.max(min, v));
  }

  var EVENT_KEY = window.EventPhotoEvents.getKey();

  /* --- DOM --------------------------------------------------------------- */
  var layers     = [$('layerA'), $('layerB')];
  var noteSlide  = $('noteSlide');
  var stageEmpty = $('stageEmpty');
  var stageError = $('stageError');
  var stageTitle = $('stageTitle');
  var stageCount = $('stageCount');
  var stageQrBox = $('stageQrBox');

  /* --- Başlık ------------------------------------------------------------ */
  var barTitle = TITLE || t('event.' + EVENT_KEY + '.name');
  stageTitle.textContent = barTitle;
  document.title = barTitle + ' · EventPhoto';

  /* --- Yapılandırma eksikse dur ------------------------------------------ */
  if (!API && !DEMO) {
    stageError.innerHTML = t('slideshow.configErrorHtml');
    stageError.classList.remove('hidden');
    $('stageHint').classList.add('hidden');
    return;
  }

  /* --- Köşe + boş durum QR'ları ------------------------------------------ */
  if (QR_LINK && window.QRCode) {
    new QRCode($('stageQr'), {
      text: QR_LINK, width: 104, height: 104,
      colorDark: '#2E2A26', colorLight: '#FDFCF8',
      correctLevel: QRCode.CorrectLevel.L
    });
    new QRCode($('emptyQr'), {
      text: QR_LINK, width: 208, height: 208,
      colorDark: '#2E2A26', colorLight: '#FDFCF8',
      correctLevel: QRCode.CorrectLevel.L
    });
    stageQrBox.classList.remove('hidden');
  }

  /* --- Durum -------------------------------------------------------------- */
  var known = {};        // görülen dosya id'leri
  var knownNotes = {};   // görülen not imzaları
  var photos = [];       // dönüş listesi (yeni → eski)
  var freshQueue = [];   // yeni gelenler (öncelikli, kronolojik)
  var freshNotesQueue = [];
  var notes = [];        // { g, m, t }
  var active = 0;        // görünür katman
  var rotIdx = 0;
  var sinceNote = 0;
  var noteIdx = 0;
  var firstLoad = true;
  var slideTimer = null;

  /* --- Liste döngüsü ------------------------------------------------------ */
  function poll() {
    Api.list(API, { max: 200, token: TOKEN, notes: true }).then(function (data) {
      if (!data || data.status !== 'ok') {
        showConnError(data && data.code === 'invalid_token' ? t('gallery.invalidToken') : t('slideshow.connError'));
        return;
      }
      hideConnError();
      var freshNotes = syncNotes(data.notes || []);

      var files = data.files || [];
      var total = data.count || files.length;
      stageCount.textContent = total ? t('slideshow.count', { count: total }) : '';

      var fresh = [];
      files.forEach(function (f) {
        if (known[f.id]) return;
        known[f.id] = true;
        var meta = Api.parseMeta(f.d);
        fresh.push({ id: f.id, t: f.t, guest: meta.guest, task: meta.task });
      });

      photos = files.map(function (f) {
        var meta = Api.parseMeta(f.d);
        return { id: f.id, t: f.t, guest: meta.guest, task: meta.task };
      });

      if (firstLoad) {
        firstLoad = false;
        if (photos.length || notes.length) { hideEmpty(); advance(); }
        else showEmpty();
      } else if (fresh.length || freshNotes.length) {
        // sunucu yeni → eski verir; kuyruk kronolojik aksın
        fresh.reverse();
        freshQueue = freshQueue.concat(fresh);
        freshNotes.reverse();
        freshNotesQueue = freshNotesQueue.concat(freshNotes);
        hideEmpty();
        if (!slideTimer) advance();
      } else if (!photos.length && !freshQueue.length && !notes.length && !freshNotesQueue.length) {
        showEmpty();
      }
    }).catch(function () {
      // Erişilebilir ama okunamıyorsa geçici bir kesinti değil, dağıtım
      // ayarıdır — ev sahibine düzeltmenin yerini söyle.
      Api.reachable(API).then(function (r) {
        showConnError(t(r ? 'slideshow.connAccess' : 'slideshow.connError'));
      });
    }).then(function () {
      setTimeout(poll, POLL_MS);
    });
  }

  /* --- Demo modu: API'siz örnek akış (landing / tanıtım) ------------------- */
  function runDemo() {
    var base = 'assets/demo/';
    var samples = [
      ['dans-pisti.svg', 'Ayşe Teyze', 'Dans pistinden bir kare'],
      ['gun-batimi.svg', 'Deniz', ''],
      ['pasta.svg', 'Zeynep', 'Mum üfleme anı'],
      ['kadeh.svg', 'Mehmet Amca', 'Kadeh kaldırma anı'],
      ['isiklar.svg', 'Elif', ''],
      ['manzara.svg', 'Can', 'En güzel manzara'],
      ['konfeti.svg', 'Selin', 'En içten kahkaha'],
      ['sahil.svg', 'Burak', '']
    ];
    var all = samples.map(function (s, i) {
      return { id: 'demo' + i, t: Date.now() - i * 60000, guest: s[1], task: s[2], src: base + s[0] };
    });

    notes = [
      { g: 'Fatma', m: 'Nice mutlu senelere! Bu gece unutulmazdı.', t: Date.now() },
      { g: 'Emre', m: 'Her şey çok güzeldi, emeğinize sağlık.', t: Date.now() - 90000 }
    ];

    photos = all.slice(0, 5);
    var upcoming = all.slice(5);
    var demoCount = photos.length;
    stageCount.textContent = t('slideshow.count', { count: demoCount });
    firstLoad = false;
    advance();

    // Arada bir taze kare düşür: "Yeni" rozetli geliş de demoda görünsün
    setInterval(function () {
      if (!upcoming.length) upcoming = all.slice(0);
      var nextItem = upcoming.shift();
      freshQueue.push({
        id: nextItem.id + '_' + Date.now(), t: Date.now(),
        guest: nextItem.guest, task: nextItem.task, src: nextItem.src
      });
      demoCount++;
      stageCount.textContent = t('slideshow.count', { count: demoCount });
    }, 18000);
  }

  /* --- Kare akışı ---------------------------------------------------------- */
  function advance() {
    slideTimer = null;
    var item = null;
    var isNew = false;

    if (freshQueue.length) {
      item = freshQueue.shift();
      isNew = true;
    } else if (freshNotesQueue.length) {
      showNote(freshNotesQueue.shift(), true);
      sinceNote = 0;
      slideTimer = setTimeout(advance, SLIDE_MS);
      return;
    } else if (notes.length && sinceNote >= NOTE_EVERY) {
      showNote();
      sinceNote = 0;
      slideTimer = setTimeout(advance, SLIDE_MS);
      return;
    } else if (photos.length) {
      item = photos[rotIdx % photos.length];
      rotIdx++;
    }

    if (!item) {
      if (notes.length) {
        hideEmpty();
        showNote();
        slideTimer = setTimeout(advance, SLIDE_MS);
      } else {
        showEmpty();
      }
      return;
    }
    sinceNote++;

    showPhoto(item, isNew, function () {
      // Yeni kareye biraz daha uzun sahne süresi
      slideTimer = setTimeout(advance, isNew ? SLIDE_MS + 2000 : SLIDE_MS);
    });
  }

  function showPhoto(item, isNew, done) {
    var img = new Image();
    img.alt = '';
    img.onload = function () {
      hideNote();
      var next = layers[1 - active];
      next.innerHTML = polaroidHtml(item, isNew);
      next.querySelector('.pol-img-slot').appendChild(img);
      var pol = next.querySelector('.polaroid');
      pol.style.setProperty('--rot', (Math.random() * 6 - 3).toFixed(2) + 'deg');
      if (isNew) pol.classList.add('is-new');
      next.classList.add('visible');
      layers[active].classList.remove('visible');
      active = 1 - active;
      done();
    };
    img.onerror = function () { done(); }; // yüklenemeyen kareyi atla
    img.src = item.src || Api.thumb(item.id, 1600);
  }

  function polaroidHtml(item, isNew) {
    return '<figure class="polaroid">' +
      (isNew ? '<span class="pol-new">' + esc(t('slideshow.new')) + '</span>' : '') +
      '<div class="pol-img-slot"></div>' +
      '<figcaption class="pol-cap">' +
        '<span class="pol-guest">' + esc(item.guest || '') + '</span>' +
        (item.task ? '<span class="pol-task">' + esc(item.task) + '</span>' : '') +
        '<span class="date-stamp">' + esc(stamp(item.t)) + '</span>' +
      '</figcaption>' +
    '</figure>';
  }

  /* --- Not kartı ----------------------------------------------------------- */
  function syncNotes(incoming) {
    notes = incoming.filter(function (n) { return n && n.m; });
    var fresh = [];
    notes.forEach(function (n) {
      var key = noteKey(n);
      if (knownNotes[key]) return;
      knownNotes[key] = true;
      if (!firstLoad) fresh.push(n);
    });
    return fresh;
  }

  function noteKey(n) {
    return String(n.t || '') + '|' + String(n.g || '') + '|' + String(n.m || '');
  }

  function showNote(note, isNew) {
    var n = note || notes[noteIdx % notes.length];
    if (!note) noteIdx++;
    if (!n || !n.m) return;
    noteSlide.innerHTML =
      '<div class="note-card note-card-lg">' +
        (isNew ? '<span class="pol-new">' + esc(t('slideshow.new')) + '</span>' : '') +
        '<p class="note-text">' + esc(n.m) + '</p>' +
        (n.g ? '<p class="note-by">— ' + esc(n.g) + '</p>' : '') +
      '</div>';
    hideEmpty();
    layers[active].classList.remove('visible');
    noteSlide.classList.remove('hidden');
  }

  function hideNote() { noteSlide.classList.add('hidden'); }

  /* --- Boş / hata durumları -------------------------------------------------- */
  function showEmpty() { stageEmpty.classList.remove('hidden'); }
  function hideEmpty() { stageEmpty.classList.add('hidden'); }

  function showConnError(msg) {
    stageError.textContent = msg;
    stageError.classList.remove('hidden');
  }
  function hideConnError() { stageError.classList.add('hidden'); }

  /* --- Tam ekran + ekranı uyanık tut ------------------------------------------ */
  document.body.addEventListener('click', function () {
    var el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(function () {});
    } else if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
    }
  });

  var wakeLock = null;
  function acquireWakeLock() {
    if (!navigator.wakeLock || !navigator.wakeLock.request) return;
    navigator.wakeLock.request('screen').then(function (lock) {
      wakeLock = lock;
    }).catch(function () {});
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') acquireWakeLock();
  });
  acquireWakeLock();

  /* --- Yardımcılar -------------------------------------------------------------- */
  function stamp(ms) {
    var d = ms ? new Date(ms) : new Date();
    var pad2 = function (n) { return ('0' + n).slice(-2); };
    return '’' + String(d.getFullYear()).slice(2) + ' ' + pad2(d.getMonth() + 1) + ' ' + pad2(d.getDate());
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  if (DEMO) runDemo();
  else poll();
})();
