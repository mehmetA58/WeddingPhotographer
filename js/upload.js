/* =========================================================================
   upload.js — Katılımcı fotoğraf yükleme mantığı
   - URL parametrelerinden yapılandırmayı okur (api, title/couple, token, event)
   - Fotoğrafları istemcide yeniden boyutlandırır (hız + boyut limiti)
   - Apps Script'e "basit istek" (text/plain, base64) olarak SIRALI yükler
   - Tekil + toplam ilerleme çubuğu, per-dosya durum, tekrar deneme
   ========================================================================= */

(function () {
  'use strict';
  var i18n = window.EventPhotoI18n || { getLang: function () { return 'tr'; }, t: function (key) { return key; } };
  var t = function (key, vars) { return i18n.t(key, vars); };

  /* --- Yapılandırma (URL parametreleri) --------------------------------- */
  var params  = new URLSearchParams(location.search);
  var API_URL = (params.get('api') || '').trim();
  var EVENT_TITLE = (params.get('title') || params.get('couple') || '').trim();
  var TOKEN   = (params.get('token') || '').trim();
  var RAW     = params.get('raw') === '1';                 // resize'ı kapat
  var MAX_DIM = clamp(parseInt(params.get('maxdim'), 10) || 2560, 1200, 4096); // uzun kenar (px)
  var QUALITY = clamp(parseFloat(params.get('q')) || 0.9, 0.72, 0.95);         // JPEG kalitesi
  var MAX_RAW_BYTES = 40 * 1024 * 1024;

  /* --- DOM ------------------------------------------------------------- */
  var $ = function (id) { return document.getElementById(id); };
  var coupleTitle = $('coupleTitle');
  var welcomeLine = $('welcomeLine');
  var configError = $('configError');
  var uploader    = $('uploader');
  var uploadBtn   = $('uploadBtn');
  var uploadBtnText = $('uploadBtnText');
  var previews    = $('previews');
  var progressWrap= $('progressWrap');
  var progressFill= $('progressFill');
  var progressLabel = $('progressLabel');
  var progressCount = $('progressCount');
  var statusNote  = $('statusNote');
  var successScreen = $('successScreen');
  var guestNameEl = $('guestName');
  var sendBar     = $('sendBar');
  var sendBarBtn  = $('sendBarBtn');
  var sendBarText = $('sendBarText');
  var sendBarInfo = $('sendBarInfo');

  // Misafir adı cihazda hatırlanır: aynı gece tekrar yüklemede yeniden yazılmaz
  var NAME_KEY = 'eventPhotoGuestName';
  try {
    var rememberedName = localStorage.getItem(NAME_KEY);
    if (rememberedName && !guestNameEl.value) guestNameEl.value = rememberedName;
  } catch (e) {}

  /* --- Etkinlik konsepti + karşılamayı kişiselleştir ------------------- */
  var EVENT_KEY = window.EventPhotoEvents.getKey();
  var EVENT = window.EventPhotoEvents.get(EVENT_KEY);

  var subtitleEl = $('subtitle');
  if (subtitleEl) subtitleEl.textContent = t('event.' + EVENT_KEY + '.subtitle');

  // Film tarih damgası ('26 07 07) — başarı ekranındaki analog dokunuş
  var dateStampEl = $('dateStamp');
  if (dateStampEl) {
    var now = new Date();
    var pad2 = function (n) { return ('0' + n).slice(-2); };
    dateStampEl.textContent = '’' + String(now.getFullYear()).slice(2) +
      ' ' + pad2(now.getMonth() + 1) + ' ' + pad2(now.getDate());
  }

  if (EVENT_TITLE) {
    // "&" ile isim yığını yalnızca çift-temelli etkinliklerde
    if (EVENT.names && EVENT_TITLE.indexOf('&') >= 0) {
      var parts = EVENT_TITLE.split('&');
      coupleTitle.innerHTML =
        esc(parts[0].trim()) + '<span class="amp">&amp;</span>' + esc(parts.slice(1).join('&').trim());
    } else {
      coupleTitle.textContent = EVENT_TITLE;
    }
    coupleTitle.classList.remove('hidden');
    welcomeLine.textContent = t('event.' + EVENT_KEY + '.welcome', { title: EVENT_TITLE });
    document.title = EVENT_TITLE + ' · EventPhoto';
  } else {
    welcomeLine.textContent = t('event.' + EVENT_KEY + '.welcomeDefault');
    document.title = t('event.' + EVENT_KEY + '.name') + ' · EventPhoto';
  }

  /* --- Yapılandırma yoksa dur ------------------------------------------ */
  if (!API_URL) {
    uploader.classList.add('hidden');
    $('guestbook').classList.add('hidden');
    configError.classList.remove('hidden');
    return;
  }

  /* --- Anı Defteri: kısa not gönder ------------------------------------- */
  var noteText = $('noteText');
  var noteBtn  = $('noteBtn');
  var noteDone = $('noteDone');
  var noteStatus = $('noteStatus');
  var noteNameField = $('noteNameField');
  var noteGuestNameEl = $('noteGuestName');

  noteBtn.addEventListener('click', startSendFlow);

  function sendNote(msg, guestName) {
    var payload = {
      token: TOKEN,
      guestName: String(guestName || '').trim().slice(0, 40),
      message: msg.slice(0, 400),
      noteId: makeClientId('n')
    };

    // Not metnini URL'e yazmamak için POST kullanılır; ardından JSONP list ile
    // noteId doğrulanır. Böylece no-cors yanıtı okunamasa bile başarı kanıtlanır.
    function postNote() {
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 60000) : null;
      var clear = function () { if (timer) clearTimeout(timer); };
      return fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          type: 'note',
          token: payload.token,
          guestName: payload.guestName,
          message: payload.message,
          noteId: payload.noteId
        }),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function () { clear(); return verifyNote(payload.noteId); }, function (err) {
        clear();
        throw err;
      });
    }

    return postNote();
  }

  function verifyNote(noteId) {
    if (!window.EventPhotoApi || !window.EventPhotoApi.list) {
      var noApi = new Error(t('upload.noteVerifyFail'));
      noApi.code = 'verify_unavailable';
      throw noApi;
    }
    return window.EventPhotoApi.list(API_URL, { max: 1, token: TOKEN, notes: true, timeoutMs: 15000 })
      .then(function (data) {
        if (!data || data.status !== 'ok') {
          var err = new Error(data && data.message ? data.message : t('upload.noteVerifyFail'));
          err.code = data && data.code;
          throw err;
        }
        var notes = data.notes || [];
        var serverKnowsNoteIds = false;
        for (var i = 0; i < notes.length; i++) {
          if (notes[i] && notes[i].id) {
            serverKnowsNoteIds = true;
            if (notes[i].id === noteId) return { status: 'ok', type: 'note', noteId: noteId };
          }
        }
        // Sunucu not kimliği döndürmüyorsa (eski Apps Script dağıtımı) kimlikle
        // doğrulama yapılamaz — not gönderimi başarılıydı, misafiri yanlışça
        // "doğrulanamadı" diye uyarmak yerine iyimser davranıp başarı sayarız.
        if (!serverKnowsNoteIds) return { status: 'ok', type: 'note', noteId: noteId };
        var missing = new Error(t('upload.noteVerifyFail'));
        missing.code = 'note_not_found';
        throw missing;
      });
  }

  /* --- Fotoğraf görevleri (öneri çipleri) -------------------------------- */
  var selectedTask = '';
  var taskField = $('taskField');
  var taskChips = $('taskChips');
  var TASKS = (params.get('tasks') === '0') ? [] : (EVENT.tasks || []);

  if (!TASKS.length) {
    taskField.classList.add('hidden');
  } else {
    TASKS.forEach(function (slug) {
      var text = t('task.' + EVENT_KEY + '.' + slug);
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'task-chip';
      chip.textContent = text;
      chip.setAttribute('aria-pressed', 'false');
      chip.addEventListener('click', function () {
        var on = selectedTask !== text;      // aynı çipe basmak seçimi kaldırır
        selectedTask = on ? text : '';
        Array.prototype.forEach.call(taskChips.children, function (c) {
          var active = on && c === chip;
          c.classList.toggle('active', active);
          c.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
      });
      taskChips.appendChild(chip);
    });
  }

  /* --- Durum ----------------------------------------------------------- */
  var items = [];        // { id, file, url, status, el, badge }
  var seen = {};         // tekrar seçilen dosyaları ele
  var nextId = 1;
  var busy = false;

  /* --- Dosya seçimi bağlantıları --------------------------------------- */
  var galleryInput = $('galleryInput');
  var cameraInput  = $('cameraInput');
  var dropzone     = $('dropzone');

  $('galleryBtn').addEventListener('click', function () { galleryInput.click(); });
  $('cameraBtn').addEventListener('click',  function () { cameraInput.click(); });
  dropzone.addEventListener('click', function () { galleryInput.click(); });
  dropzone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); galleryInput.click(); }
  });

  galleryInput.addEventListener('change', function () { addFiles(this.files); this.value = ''; });
  cameraInput.addEventListener('change',  function () { addFiles(this.files); this.value = ''; });

  ['dragenter', 'dragover'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.remove('dragover'); });
  });
  dropzone.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  });

  $('moreBtn').addEventListener('click', reset);
  uploadBtn.addEventListener('click', startSendFlow);
  sendBarBtn.addEventListener('click', startSendFlow);
  // Çubuktaki ipucu satırı ad/not durumunu yansıtsın
  guestNameEl.addEventListener('input', syncControls);
  noteText.addEventListener('input', syncControls);

  /* --- Dosya ekleme ---------------------------------------------------- */
  function addFiles(fileList) {
    var added = 0;
    var skippedType = 0;
    var skippedSize = 0;
    Array.prototype.forEach.call(fileList, function (file) {
      if (!isImageFile(file)) { skippedType++; return; }             // sadece görsel
      if (RAW && file.size > MAX_RAW_BYTES) { skippedSize++; return; }
      var key = file.name + '_' + file.size + '_' + (file.lastModified || 0);
      if (seen[key]) return;                                         // tekrarı atla
      seen[key] = true;

      var item = {
        id: nextId++, file: file, url: URL.createObjectURL(file),
        status: 'pending', el: null, badge: null, uploadId: makeClientId('u')
      };
      items.push(item);
      renderThumb(item);
      added++;
    });
    if (added) syncControls();
    if (skippedType || skippedSize) {
      var msg = [];
      if (skippedType) msg.push(t('upload.skippedType', { count: skippedType }));
      if (skippedSize) msg.push(t('upload.skippedSize', { count: skippedSize }));
      showNote('info', msg.join(' '));
    }
  }

  /* --- Önizleme küçük resmi ------------------------------------------- */
  function renderThumb(item) {
    var el = document.createElement('div');
    el.className = 'thumb';
    el.dataset.id = item.id;
    el.innerHTML =
      '<img src="' + item.url + '" alt="" />' +
      '<div class="cover"></div>' +
      '<button class="remove" title="Kaldır" aria-label="Kaldır">×</button>' +
      '<div class="badge pending">•</div>';
    el.querySelector('.remove').addEventListener('click', function (e) {
      e.stopPropagation();
      removeItem(item.id);
    });
    previews.appendChild(el);
    item.el = el;
    item.badge = el.querySelector('.badge');
  }

  function removeItem(id) {
    var i = items.findIndex(function (x) { return x.id === id; });
    if (i < 0) return;
    var it = items[i];
    if (it.status === 'uploading') return;
    URL.revokeObjectURL(it.url);
    if (it.el && it.el.parentNode) it.el.parentNode.removeChild(it.el);
    items.splice(i, 1);
    syncControls();
  }

  function setStatus(item, status) {
    item.status = status;
    item.el.classList.remove('is-uploading', 'is-done');
    var b = item.badge;
    b.className = 'badge ' + status;
    if (status === 'uploading') {
      item.el.classList.add('is-uploading');
      b.innerHTML = '<span class="spin">◠</span>';
    } else if (status === 'done') {
      item.el.classList.add('is-done');
      b.textContent = '';
    } else if (status === 'error') {
      b.textContent = '!';
    } else {
      b.textContent = '•';
    }
  }

  /* --- Buton/çubuk durumunu güncelle ------------------------------------ */
  function syncControls() {
    // Eski satır-içi buton kullanılmıyor; gönderim yapışkan çubukta ve
    // Anı Defteri'ndeki "Gönder"de birleşir.
    uploadBtn.classList.add('hidden');
    uploadBtn.disabled = true;
    noteBtn.disabled = busy;

    var pending = items.filter(function (x) { return x.status === 'pending' || x.status === 'error'; });
    var hasError = items.some(function (x) { return x.status === 'error'; });
    var showBar = !busy && pending.length > 0 && !uploader.classList.contains('hidden');

    if (!showBar) {
      sendBar.classList.add('hidden');
      document.body.classList.remove('has-sendbar');
      return;
    }
    sendBarText.textContent = hasError
      ? t('upload.retrySend', { count: pending.length })
      : t('upload.sendCount', { count: pending.length });
    sendBarInfo.textContent = !(guestNameEl.value || '').trim()
      ? t('upload.sendBarName')
      : ((noteText.value || '').trim() ? t('upload.sendBarWithNote') : t('upload.sendBarReady'));
    sendBar.classList.remove('hidden');
    document.body.classList.add('has-sendbar');
  }

  /* --- Ortak gönderim: fotoğraf + opsiyonel not ------------------------- */
  function startSendFlow() {
    if (busy) return;
    var queue = items.filter(function (x) { return x.status === 'pending' || x.status === 'error'; });
    var msg = (noteText.value || '').trim();
    if (queue.length === 0 && !msg) {
      showSendError(t('upload.emptySend'));
      noteText.focus();
      return;
    }

    var guestName = requireGuestName();
    if (!guestName) return;
    try { localStorage.setItem(NAME_KEY, guestName); } catch (e) {}

    busy = true;
    noteBtn.disabled = true;
    uploadBtn.disabled = true;
    hideNote();
    hideNoteStatus();
    noteDone.classList.add('hidden');
    syncControls(); // gönderim sürerken çubuk gizlenir

    var hadPhotos = queue.length > 0;
    var noteMessage = msg;
    var uploadPromise = hadPhotos ? uploadQueue(queue) : Promise.resolve({ total: 0, failed: 0, errorCode: '' });

    uploadPromise.then(function (result) {
      if (result.failed) {
        showUploadFailure(result.total, result.failed, result.errorCode);
        var handled = new Error('upload_failed');
        handled.handled = true;
        throw handled;
      }
      if (noteMessage) {
        if (hadPhotos) progressLabel.textContent = t('upload.sendingNote');
        return sendNote(noteMessage, guestName).catch(function (err) {
          err = err || new Error(t('upload.noteFail'));
          err.noteStage = true;
          throw err;
        });
      }
      return null;
    }).then(function (data) {
      if (data && data.status !== 'ok') {
        var err = new Error(data.message || t('upload.noteFail'));
        err.code = data.code;
        err.noteStage = true;
        throw err;
      }
      if (noteMessage) {
        noteText.value = '';
        noteDone.classList.remove('hidden');
        setTimeout(function () { noteDone.classList.add('hidden'); }, 3000);
      }
      if (hadPhotos) showSuccessScreen();
      busy = false;
      syncControls();
    }).catch(function (err) {
      busy = false;
      if (!err || !err.handled) {
        progressWrap.classList.add('hidden');
        // Misafire yalnızca insan dilinde mesaj göster: sunucudan gelen anlamlı
        // yanıtlar (err.code taşır, ör. geçersiz token) aynen; "Betik hatası" /
        // "Zaman aşımı" gibi iç mesajlar genel metne çevrilir.
        var human;
        if (err && err.noteStage && hadPhotos) human = t('upload.noteFailAfterPhotos');
        else if (err && err.code && err.message) human = err.message;
        else human = t('upload.noteFail');
        showSendError(human);
      }
      syncControls();
    });
  }

  function requireGuestName() {
    var el = getActiveGuestNameEl();
    var name = (el.value || '').trim();
    if (!name) {
      showSendError(t('upload.nameRequired'));
      el.focus();
      return '';
    }
    guestNameEl.value = name;
    if (noteGuestNameEl) noteGuestNameEl.value = name;
    return name.slice(0, 40);
  }

  function getActiveGuestNameEl() {
    if (uploader.classList.contains('hidden') && noteNameField && !noteNameField.classList.contains('hidden')) {
      return noteGuestNameEl;
    }
    return guestNameEl;
  }

  function setGuestbookNameField(visible) {
    if (!noteNameField || !noteGuestNameEl) return;
    noteNameField.classList.toggle('hidden', !visible);
    if (visible && !noteGuestNameEl.value && guestNameEl.value) {
      noteGuestNameEl.value = guestNameEl.value;
    }
  }

  /* Fotoğraflar 3'lü eşzamanlı havuzla yüklenir (sıralıya göre ~3× hızlı;
     Apps Script eşzamanlı istekleri sorunsuz karşılar). Byte düzeyinde
     ilerleme Apps Script CORS'u ile okunamadığından çubuk, biten + uçuştaki
     dosya sayısından hesaplanır: uçuştakiler yarım slot sayılır ve çubuk
     hedefe yavaşça "süzülür", dosya bitince yerine oturur. */
  var UPLOAD_CONCURRENCY = 3;

  function uploadQueue(queue) {
    progressWrap.classList.remove('hidden');

    var total = queue.length;
    var doneCount = 0;
    var failed = 0;
    var inFlight = 0;
    var idx = 0;
    var lastErrorCode = '';

    progressFill.style.transition = 'width 0s';
    progressFill.style.width = '0%';
    progressCount.textContent = '0 / ' + total;
    progressLabel.textContent = t('upload.uploading');

    function paint(settled) {
      var frac = Math.min(1, (doneCount + failed + inFlight * 0.45) / total);
      progressFill.style.transition = settled
        ? 'width 0.3s ease'
        : 'width 7s cubic-bezier(0,0,0.2,1)';
      progressFill.style.width = (frac * 100).toFixed(1) + '%';
      progressCount.textContent = doneCount + ' / ' + total;
    }

    return new Promise(function (resolve) {
      var finalized = false;
      function pump() {
        if (finalized) return;
        if (doneCount + failed === total) {
          finalized = true;
          if (failed) {
            resolve({ total: total, failed: failed, errorCode: lastErrorCode });
            return;
          }
          verifyUploadedItems(queue).then(resolve);
          return;
        }
        while (inFlight < UPLOAD_CONCURRENCY && idx < total) {
          (function (item) {
            inFlight++;
            setStatus(item, 'uploading');
            paint(false);
            prepareBlob(item.file, item.uploadId).then(function (prepared) {
              return uploadOne(prepared);
            }).then(function () {
              setStatus(item, 'done');
              doneCount++;
            }).catch(function (err) {
              setStatus(item, 'error');
              failed++;
              if (err && err.code) lastErrorCode = err.code;
              console.error('Yükleme hatası:', err);
            }).then(function () {
              inFlight--;
              paint(true);
              pump();
            });
          })(queue[idx++]);
        }
      }
      pump();
    });
  }

  function verifyUploadedItems(queue) {
    progressLabel.textContent = t('upload.verifying');
    if (!window.EventPhotoApi || !window.EventPhotoApi.list) {
      markVerifyFailed(queue);
      return Promise.resolve({ total: queue.length, failed: queue.length, errorCode: 'verify_unavailable' });
    }
    return checkUploadList(queue, false).then(function (result) {
      if (result.failed) return checkUploadList(queue, true);
      return result;
    }).catch(function () {
      markVerifyFailed(queue);
      return { total: queue.length, failed: queue.length, errorCode: 'verify_failed' };
    });
  }

  function checkUploadList(queue, refresh) {
    return window.EventPhotoApi.list(API_URL, {
      max: 1000,
      token: TOKEN,
      timeoutMs: refresh ? 30000 : 15000,
      refresh: refresh
    }).then(function (data) {
      if (!data || data.status !== 'ok') {
        markVerifyFailed(queue);
        return {
          total: queue.length,
          failed: queue.length,
          errorCode: data && data.code || 'verify_failed'
        };
      }

      var found = {};
      (data.files || []).forEach(function (f) {
        var meta = window.EventPhotoApi.parseMeta(f.d);
        if (meta.uploadId) found[meta.uploadId] = true;
      });

      // Sunucu açıklamada UploadId döndürüyor mu? Eski Apps Script dağıtımları
      // yazmaz; o zaman uploadId ile doğrulama yapılamaz. Liste geldiği (yani
      // ağ yüklemesi başarılı olduğu) halde hiçbir dosyada kimlik yoksa,
      // misafiri yanlışça "başarısız" diye korkutmak yerine iyimser davranıp
      // başarı sayarız. Kimlik döndüren güncel dağıtımlarda kesin doğrulama
      // korunur: gerçekten eksik dosya hâlâ hata olarak yakalanır.
      var serverKnowsIds = Object.keys(found).length > 0;
      var listHasFiles = (data.files || []).length > 0;

      var failed = 0;
      queue.forEach(function (item) {
        if (found[item.uploadId] || (!serverKnowsIds && listHasFiles)) {
          setStatus(item, 'done');
        } else {
          setStatus(item, 'error');
          failed++;
        }
      });
      if (!failed) {
        progressFill.style.width = '100%';
      }
      return { total: queue.length, failed: failed, errorCode: failed ? 'verify_failed' : '' };
    });
  }

  function markVerifyFailed(queue) {
    queue.forEach(function (item) { setStatus(item, 'error'); });
  }

  function showUploadFailure(total, failed, errorCode) {
    var ok = total - failed;
    progressWrap.classList.add('hidden');
    showNote('error', errorCode === 'invalid_token'
      ? t('upload.invalidTokenHtml')
      : (errorCode === 'verify_failed' || errorCode === 'verify_unavailable'
        ? t('upload.verifyFail')
        : t('upload.partialErrorHtml', { ok: ok, failed: failed })));
  }

  function showSuccessScreen() {
    progressFill.style.width = '100%';
    setTimeout(function () {
      uploader.classList.add('hidden');
      successScreen.classList.remove('hidden');
      setGuestbookNameField(true);
      successScreen.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 400);
  }

  /* --- Tek dosya yükleme (fetch, no-cors) ------------------------------ */
  // NEDEN no-cors: Apps Script /exec yanıtı çapraz-köken CORS başlığı (ACAO)
  // döndürmez; bu yüzden NORMAL bir istekte tarayıcı YANITI okuyamaz ve
  // "Ağ hatası" (xhr.onerror) verir — oysa istek sunucuya ulaşıp dosya
  // KAYDEDİLİR. no-cors ile isteği göndeririz: yanıt "opaque"tur (okunamaz)
  // ama yükleme güvenilir çalışır. Bu, Apps Script yüklemelerinin standart yolu.
  //  • text/plain + özel olmayan header = CORS "basit istek" (preflight yok).
  //  • Yanıtı okuyamadığımız için uploadId ile sonradan doğrularız; tekrar denemede
  //    backend aynı uploadId'yi ikinci kez kaydetmez.
  function uploadOne(prepared) {
    var payload = JSON.stringify({
      token: TOKEN,
      guestName: (guestNameEl.value || '').trim().slice(0, 40),
      task: selectedTask.slice(0, 60),
      uploadId: prepared.uploadId,
      filename: prepared.filename,
      mimeType: prepared.mimeType,
      data: prepared.base64
    });

    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 120000) : null;
    var clear = function () { if (timer) clearTimeout(timer); };

    return fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payload,
      signal: ctrl ? ctrl.signal : undefined
    }).then(
      function () { clear(); return { status: 'ok' }; },          // opaque yanıt → gönderildi = başarı
      function (err) { clear(); throw new Error('Ağ hatası: ' + (err && err.message || err)); }
    );
  }

  /* --- Fotoğrafı hazırla: (opsiyonel) resize + base64 ------------------ */
  function prepareBlob(file, uploadId) {
    if (RAW) {
      // Orijinali olduğu gibi gönder
      return fileToBase64(file).then(function (b64) {
        return { base64: b64, mimeType: sourceMime(file), filename: file.name, uploadId: uploadId };
      });
    }
    return resizeImage(file, MAX_DIM, QUALITY).then(function (blob) {
      return fileToBase64(blob).then(function (b64) {
        return { base64: b64, mimeType: 'image/jpeg', filename: ensureJpg(file.name), uploadId: uploadId };
      });
    }).catch(function () {
      // Resize başarısızsa orijinale düş
      return fileToBase64(file).then(function (b64) {
        return { base64: b64, mimeType: sourceMime(file), filename: file.name, uploadId: uploadId };
      });
    });
  }

  function resizeImage(file, maxDim, quality) {
    return loadBitmap(file).then(function (bmp) {
      var w = bmp.width, h = bmp.height;
      var scale = Math.min(1, maxDim / Math.max(w, h));
      var nw = Math.round(w * scale), nh = Math.round(h * scale);
      var canvas = document.createElement('canvas');
      canvas.width = nw; canvas.height = nh;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(bmp, 0, 0, nw, nh);
      if (bmp.close) bmp.close();
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          blob ? resolve(blob) : reject(new Error('toBlob boş'));
        }, 'image/jpeg', quality);
      });
    });
  }

  // EXIF yön bilgisini uygula (dönmüş fotoğrafları düzeltir)
  function loadBitmap(file) {
    if (window.createImageBitmap) {
      try {
        return createImageBitmap(file, { imageOrientation: 'from-image' })
          .catch(function () { return createImageBitmap(file); })
          .catch(function () { return loadViaImg(file); });
      } catch (e) { return loadViaImg(file); }
    }
    return loadViaImg(file);
  }
  function loadViaImg(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Görsel yüklenemedi')); };
      img.src = url;
    });
  }

  function fileToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var s = reader.result || '';
        var comma = s.indexOf(',');
        resolve(comma >= 0 ? s.slice(comma + 1) : s); // "data:...;base64," önekini at
      };
      reader.onerror = function () { reject(new Error('Dosya okunamadı')); };
      reader.readAsDataURL(blob);
    });
  }

  /* --- Yeniden başlat -------------------------------------------------- */
  function reset() {
    items.forEach(function (it) { URL.revokeObjectURL(it.url); });
    items = [];
    seen = {};
    previews.innerHTML = '';
    progressWrap.classList.add('hidden');
    progressFill.style.width = '0%';
    hideNote();
    hideNoteStatus();
    noteDone.classList.add('hidden');
    setGuestbookNameField(false);
    successScreen.classList.add('hidden');
    uploader.classList.remove('hidden');
    syncControls();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* --- Yardımcılar ----------------------------------------------------- */
  function showNote(type, html) {
    statusNote.className = 'note note-' + type;
    statusNote.innerHTML = html;
    statusNote.classList.remove('hidden');
  }
  function hideNote() { statusNote.classList.add('hidden'); }
  function showSendError(message) {
    var html = '<span aria-hidden="true"></span><div>' + esc(message) + '</div>';
    if (uploader.classList.contains('hidden')) {
      noteStatus.className = 'note note-error';
      noteStatus.innerHTML = html;
      noteStatus.classList.remove('hidden');
    } else {
      showNote('error', html);
    }
  }
  function hideNoteStatus() { noteStatus.classList.add('hidden'); }
  function ensureJpg(name) { return name.replace(/\.[^.]+$/, '') + '.jpg'; }
  function isImageFile(file) {
    return (file.type && file.type.indexOf('image/') === 0) ||
      /\.(jpe?g|png|webp|gif|heic|heif|bmp|tiff?)$/i.test(file.name || '');
  }
  function sourceMime(file) {
    if (file.type && file.type.indexOf('image/') === 0) return file.type;
    var m = String(file.name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    var ext = m ? m[1] : '';
    return {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
      gif: 'image/gif', heic: 'image/heic', heif: 'image/heif', bmp: 'image/bmp',
      tif: 'image/tiff', tiff: 'image/tiff'
    }[ext] || 'image/jpeg';
  }
  function clamp(value, min, max) {
    if (isNaN(value)) return min;
    return Math.min(max, Math.max(min, value));
  }
  function makeClientId(prefix) {
    prefix = prefix || 'id';
    var arr = new Uint8Array(10);
    if ((window.crypto || {}).getRandomValues) {
      window.crypto.getRandomValues(arr);
    } else {
      Array.prototype.forEach.call(arr, function (_, i) {
        arr[i] = Math.floor(Math.random() * 256);
      });
    }
    return prefix + '_' + Date.now().toString(36) + '_' +
      Array.prototype.map.call(arr, function (b) {
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  syncControls();
})();
