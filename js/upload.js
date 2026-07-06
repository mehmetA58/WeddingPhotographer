/* =========================================================================
   upload.js — Misafir fotoğraf yükleme mantığı
   - URL parametrelerinden yapılandırmayı okur (api, couple, token)
   - Fotoğrafları istemcide yeniden boyutlandırır (hız + boyut limiti)
   - Apps Script'e "basit istek" (text/plain, base64) olarak SIRALI yükler
   - Tekil + toplam ilerleme çubuğu, per-dosya durum, tekrar deneme
   ========================================================================= */

(function () {
  'use strict';
  var i18n = window.WeddingI18n || { getLang: function () { return 'tr'; }, t: function (key) { return key; } };
  var t = function (key, vars) { return i18n.t(key, vars); };

  /* --- Yapılandırma (URL parametreleri) --------------------------------- */
  var params  = new URLSearchParams(location.search);
  var API_URL = (params.get('api') || '').trim();
  var COUPLE  = (params.get('couple') || '').trim();
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

  /* --- Karşılama başlığını kişiselleştir ------------------------------- */
  if (COUPLE) {
    var parts = COUPLE.split('&');
    if (parts.length === 2) {
      coupleTitle.innerHTML =
        esc(parts[0].trim()) + '<span class="amp">&amp;</span>' + esc(parts[1].trim());
    } else {
      coupleTitle.textContent = COUPLE;
    }
    coupleTitle.classList.remove('hidden');
    welcomeLine.textContent = t('upload.welcomeCouple', { couple: COUPLE });
    document.title = COUPLE + ' · ' + (i18n.getLang() === 'en' ? 'Wedding Photos' : 'Düğün Fotoğrafları');
  }

  /* --- Yapılandırma yoksa dur ------------------------------------------ */
  if (!API_URL) {
    uploader.classList.add('hidden');
    configError.classList.remove('hidden');
    return;
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
  uploadBtn.addEventListener('click', startUpload);

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
        status: 'pending', el: null, badge: null
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
      b.textContent = '✓';
    } else if (status === 'error') {
      b.textContent = '!';
    } else {
      b.textContent = '•';
    }
  }

  /* --- Buton/başlık durumunu güncelle ---------------------------------- */
  function syncControls() {
    var pending = items.filter(function (x) { return x.status === 'pending' || x.status === 'error'; });
    var hasError = items.some(function (x) { return x.status === 'error'; });
    if (items.length === 0) {
      uploadBtn.classList.add('hidden');
      return;
    }
    uploadBtn.classList.remove('hidden');
    uploadBtn.disabled = busy || pending.length === 0;
    uploadBtnText.textContent = hasError
      ? t('upload.retryFailed', { count: pending.length })
      : (pending.length > 1 ? t('upload.uploadMany', { count: pending.length }) : t('upload.uploadButton'));
  }

  /* --- Yüklemeyi başlat (sıralı) --------------------------------------- */
  function startUpload() {
    if (busy) return;
    var queue = items.filter(function (x) { return x.status === 'pending' || x.status === 'error'; });
    if (queue.length === 0) return;

    busy = true;
    uploadBtn.disabled = true;
    hideNote();
    progressWrap.classList.remove('hidden');

    var total = queue.length;
    var doneCount = 0;
    var failed = 0;
    var lastErrorCode = '';

    progressFill.style.transition = 'width 0s';
    progressFill.style.width = '0%';
    progressCount.textContent = '0 / ' + total;

    (function next(idx) {
      if (idx >= queue.length) {
        finishUpload(total, failed, lastErrorCode);
        return;
      }
      var item = queue[idx];
      setStatus(item, 'uploading');
      progressLabel.textContent = t('upload.preparing');
      trickleSlot(idx, total);   // bu dosya için çubuğu yavaşça ilerlet

      prepareBlob(item.file).then(function (prepared) {
        progressLabel.textContent = t('upload.uploading');
        return uploadOne(prepared);
      }).then(function () {
        setStatus(item, 'done');
        doneCount++;
      }).catch(function (err) {
        setStatus(item, 'error');
        failed++;
        if (err && err.code) lastErrorCode = err.code;
        console.error('Yükleme hatası:', err);
      }).then(function () {           // her iki durumda da slotu tamamla ve devam et
        settleSlot(idx, total, doneCount);
        next(idx + 1);
      });
    })(0);
  }

  /* Byte düzeyinde ilerleme Apps Script CORS'u ile mümkün olmadığından (upload
     listener'ı preflight tetikler), dosya-başına "trickle" animasyonu kullanılır:
     her dosya süresince çubuk kendi slotuna doğru yavaşça yaklaşır, dosya
     bittiğinde slot sonuna oturur. */
  function trickleSlot(idx, total) {
    progressFill.style.transition = 'width 12s cubic-bezier(0,0,0.2,1)';
    progressFill.style.width = (((idx + 0.92) / total) * 100).toFixed(1) + '%';
  }
  function settleSlot(idx, total, doneCount) {
    progressFill.style.transition = 'width 0.3s ease';
    progressFill.style.width = (((idx + 1) / total) * 100).toFixed(1) + '%';
    progressCount.textContent = doneCount + ' / ' + total;
  }

  function finishUpload(total, failed, errorCode) {
    busy = false;
    var ok = total - failed;
    if (failed === 0) {
      // Tümü başarılı → teşekkür ekranı
      progressFill.style.width = '100%';
      setTimeout(function () {
        uploader.classList.add('hidden');
        successScreen.classList.remove('hidden');
        successScreen.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    } else {
      progressWrap.classList.add('hidden');
      showNote('error', errorCode === 'invalid_token'
        ? t('upload.invalidTokenHtml')
        : t('upload.partialErrorHtml', { ok: ok, failed: failed }));
      syncControls();
    }
  }

  /* --- Tek dosya yükleme (XHR, basit istek) ---------------------------- */
  function uploadOne(prepared) {
    return new Promise(function (resolve, reject) {
      var payload = JSON.stringify({
        token: TOKEN,
        guestName: (guestNameEl.value || '').trim().slice(0, 40),
        filename: prepared.filename,
        mimeType: prepared.mimeType,
        data: prepared.base64
      });

      var xhr = new XMLHttpRequest();
      xhr.open('POST', API_URL, true);
      // ÖNEMLİ: Bunun bir CORS "basit istek"i olması şart — aksi halde tarayıcı
      // preflight (OPTIONS) yollar ve Apps Script bunu yanıtlayamaz → yükleme çöker.
      //  • Content-Type text/plain olmalı (application/json KULLANMAYIN).
      //  • xhr.upload üzerine ASLA event listener eklenmez (byte-progress dahil);
      //    upload listener'ı da preflight tetikler.
      xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
      xhr.timeout = 120000;

      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            var res = JSON.parse(xhr.responseText);
            if (res && res.status === 'ok') return resolve(res);
            var serverError = new Error(res && res.message ? res.message : 'Sunucu reddetti');
            serverError.code = res && res.code;
            return reject(serverError);
          } catch (e2) {
            // Yanıt okunamasa da 2xx geldiyse başarı say (bazı CORS senaryoları)
            return resolve({ status: 'ok' });
          }
        }
        reject(new Error('HTTP ' + xhr.status));
      };
      xhr.onerror = function () { reject(new Error('Ağ hatası')); };
      xhr.ontimeout = function () { reject(new Error('Zaman aşımı')); };
      xhr.send(payload);
    });
  }

  /* --- Fotoğrafı hazırla: (opsiyonel) resize + base64 ------------------ */
  function prepareBlob(file) {
    if (RAW) {
      // Orijinali olduğu gibi gönder
      return fileToBase64(file).then(function (b64) {
        return { base64: b64, mimeType: sourceMime(file), filename: file.name };
      });
    }
    return resizeImage(file, MAX_DIM, QUALITY).then(function (blob) {
      return fileToBase64(blob).then(function (b64) {
        return { base64: b64, mimeType: 'image/jpeg', filename: ensureJpg(file.name) };
      });
    }).catch(function () {
      // Resize başarısızsa orijinale düş
      return fileToBase64(file).then(function (b64) {
        return { base64: b64, mimeType: sourceMime(file), filename: file.name };
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
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  syncControls();
})();
