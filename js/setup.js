/* =========================================================================
   setup.js — Etkinlik kurulum sayfası
   - Google OAuth ile oturum açar
   - Google Apps Script API ile backend projesini otomatik oluşturup yayınlar
   - Google Drive API ile fotoğraf klasörü oluşturur
   - QR kodu ve linkleri üretir
   ========================================================================= */

(function () {
  'use strict';

  /* =====================================================================
     YAPILANDIRMA
     Google Cloud Console > APIs & Services > Credentials > OAuth 2.0
     Web Client ID'nizi aşağıya yapıştırın.
     ===================================================================== */
  var configuredClientId = (window.EventPhotoConfig && window.EventPhotoConfig.googleClientId) ||
    window.EVENTPHOTO_GOOGLE_CLIENT_ID || '';
  var GOOGLE_CLIENT_ID = String(configuredClientId || 'BURAYA_GOOGLE_CLIENT_ID_YAZIN').trim();

  var SCOPES = [
    'https://www.googleapis.com/auth/script.projects',
    'https://www.googleapis.com/auth/drive.file',
    'openid',
    'email'
  ].join(' ');

  /* =====================================================================
     DOM / i18n
     ===================================================================== */
  var $ = function (id) { return document.getElementById(id); };
  var i18n = window.EventPhotoI18n || { getLang: function () { return 'tr'; }, setLang: function () {}, t: function (key) { return key; } };
  var t = function (key, vars) { return i18n.t(key, vars); };

  var eventTitleEl      = $('eventTitle');
  var eventTitleLabel   = $('eventTitleLabel');
  var manualApiEl       = $('manualApi');
  var tokenEl           = $('token');
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
  var deployProgress    = $('deployProgress');
  var setupComplete     = $('setupComplete');
  var googleError       = $('googleError');
  var generateBtn       = $('generateBtn');
  var reconnectBtn      = $('reconnectBtn');

  var LS_KEY            = 'eventPhotoSetup';
  var LS_GSETUP         = 'eventPhotoGoogleSetup';
  var LEGACY_LS_KEY     = 'weddingUploadSetup';
  var LEGACY_LS_GSETUP  = 'weddingGSetup';

  var currentLink      = '';
  var currentGallery   = '';
  var currentSlideshow = '';

  /* Internal state ------------------------------------------------------ */
  var accessToken    = null;
  var deploymentUrl  = '';
  var folderId       = '';
  var securityToken  = '';
  var setupAdminKey  = '';
  var googleInitAttempts = 0;

  /* =====================================================================
     Kayıtlı ayarları geri yükle
     ===================================================================== */
  var currentEvent = window.EventPhotoEvents.getKey ? window.EventPhotoEvents.getKey() : window.EventPhotoEvents.DEFAULT_KEY;
  try {
    var saved = JSON.parse(localStorage.getItem(LS_KEY) || localStorage.getItem(LEGACY_LS_KEY) || '{}');
    if (saved.title || saved.couple) eventTitleEl.value = saved.title || saved.couple;
    if (saved.token)   tokenEl.value  = saved.token;
    if (saved.raw)     rawEl.checked  = true;
    if (saved.noTasks) noTasksEl.checked = true;
    if (saved.event && window.EventPhotoEvents.has(saved.event)) currentEvent = saved.event;

    var gsaved = JSON.parse(localStorage.getItem(LS_GSETUP) || localStorage.getItem(LEGACY_LS_GSETUP) || '{}');
    if (gsaved.apiUrl)    deploymentUrl = gsaved.apiUrl;
    if (gsaved.folderId)  folderId      = gsaved.folderId;
    if (gsaved.token)     securityToken = gsaved.token;

    // Daha önce elle girilen Web App URL'i geri getir (OAuth kurulumu yoksa)
    if (!deploymentUrl && saved.api) manualApiEl.value = saved.api;
  } catch (e) {}

  window.EventPhotoEvents.apply(currentEvent);
  langEl.value = i18n.getLang();

  // Setup tamamlanmışsa UI'ı güncelle
  if (deploymentUrl) {
    showSetupComplete();
  }

  /* =====================================================================
     Manuel Web App URL ("Google ile Bağlan" alternatifi)
     Alan doluysa QR üretiminde OAuth kurulumuna gerek kalmaz; elle girilen
     adres önceliklidir (kullanıcı bilinçli olarak farklı bir deploy girebilir).
     ===================================================================== */
  function manualApiUrl() {
    var v = (manualApiEl.value || '').trim();
    return /^https:\/\/\S+$/i.test(v) ? v : '';
  }

  function updateGenerateState() {
    generateBtn.disabled = !(manualApiUrl() || deploymentUrl);
  }

  manualApiEl.addEventListener('input', updateGenerateState);
  updateGenerateState();

  // "Sına": Web App'in gerçekten okunabilir yanıt verdiğini teşhis eder.
  // 'unreadable' tipik olarak "Who has access: Anyone" seçilmemiş demektir.
  $('testApiBtn').addEventListener('click', function () {
    var api = manualApiUrl() || deploymentUrl;
    if (!api) { showNote('error', t('setup.needAuth')); return; }
    var btn = $('testApiBtn');
    btn.disabled = true;
    showNote('info', t('setup.testing'));
    window.EventPhotoApi.diagnose(api).then(function (state) {
      btn.disabled = false;
      if (state === 'ok') showNote('ok', t('setup.testOkHtml'));
      else if (state === 'unreadable') showNote('error', t('setup.testAccessHtml'));
      else showNote('error', t('setup.testNetworkHtml'));
    });
  });

  langEl.addEventListener('change', function () {
    i18n.setLang(langEl.value);
    buildConceptGrid();
    updateTitleField();
    if (!resultSec.classList.contains('hidden')) {
      generateBtn.click();
    }
  });

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

  /* =====================================================================
     Token üret
     ===================================================================== */
  $('genToken').addEventListener('click', function () {
    var arr = new Uint8Array(9);
    (window.crypto || {}).getRandomValues
      ? window.crypto.getRandomValues(arr)
      : arr.forEach(function (_, i) { arr[i] = Math.floor(Math.random() * 256); });
    tokenEl.value = Array.prototype.map.call(arr, function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  });

  /* =====================================================================
     GOOGLE İLE BAĞLAN
     ===================================================================== */

  // GIS token client
  var tokenClient = null;

  function initGoogleAuth() {
    if (typeof google === 'undefined' || !google.accounts) {
      googleInitAttempts++;
      if (googleInitAttempts > 12) {
        googleBtn.disabled = true;
        showGoogleError(t('setup.authError'));
        return;
      }
      // GIS henüz yüklenmedi — kısa süre bekle
      setTimeout(initGoogleAuth, 1000);
      return;
    }
    if (GOOGLE_CLIENT_ID === 'BURAYA_GOOGLE_CLIENT_ID_YAZIN') {
      googleBtn.disabled = true;
      // Görünür bir notun (ör. Sına sonucu) üzerine yazma — yalnızca alan boşken göster
      if (noteEl.classList.contains('hidden')) {
        showNote('info', t('setup.googleClientMissingHtml'));
      }
      return;
    }
    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: handleTokenResponse,
        error_callback: function (err) {
          console.error('OAuth hatası:', err);
          showGoogleError(t('setup.authError'));
        }
      });
    } catch (e) {
      console.error('GIS init hatası:', e);
    }
  }

  function handleTokenResponse(response) {
    if (response.error) {
      console.error('OAuth token hatası:', response.error, response.error_description);
      showGoogleError(response.error_description || t('setup.authError'));
      return;
    }
    accessToken = response.access_token;
    startDeployment();
  }

  googleBtn.addEventListener('click', function () {
    if (!tokenClient) {
      showGoogleError(t('setup.authError'));
      return;
    }
    googleError.style.display = 'none';
    // Popup engelleyiciye karşı kullanıcı etkileşimiyle tetiklenmeli
    tokenClient.requestAccessToken();
  });

  function showGoogleError(msg) {
    googleError.textContent = msg;
    googleError.style.display = 'block';
  }

  /* =====================================================================
     DEPLOYMENT AKIŞI
     ===================================================================== */

  function setStepActive(step) {
    var all = document.querySelectorAll('.deploy-step');
    Array.prototype.forEach.call(all, function (el) {
      el.classList.remove('active', 'done');
      if (el.dataset.step === step) el.classList.add('active');
    });
  }

  function setStepDone(step) {
    var all = document.querySelectorAll('.deploy-step');
    Array.prototype.forEach.call(all, function (el) {
      if (el.dataset.step === step) {
        el.classList.remove('active');
        el.classList.add('done');
      }
    });
  }

  var scriptId_ = '';

  function startDeployment() {
    googleNotAuthed.classList.add('hidden');
    deployProgress.classList.remove('hidden');
    generateBtn.disabled = true;
    ensureSecurityToken();
    setupAdminKey = randomHex(16);

    Promise.resolve()
      .then(function () { return stepCreateFolder(); })
      .then(function () { return deployFull_(); })
      .then(function () { return stepAuthorize(); })
      .then(function () {
        setStepDone('done');
        saveSetupState();
        showSetupComplete();
      })
      .catch(function (err) {
        deployProgress.classList.add('hidden');
        googleNotAuthed.classList.remove('hidden');
        showNote('error', t('setup.deployError', { msg: err && err.message || String(err) }));
        console.error('Deployment hatası:', err);
      });
  }

  /* --- 1. Drive klasörü oluştur -------------------------------------- */
  function stepCreateFolder() {
    setStepActive('folder');
    return fetchJson('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Etkinlik Fotoğrafları',
        mimeType: 'application/vnd.google-apps.folder'
      })
    }, 30000).then(function (data) {
      if (data.error) throw new Error(data.error.message || 'Drive klasörü oluşturulamadı');
      folderId = data.id;
      setStepDone('folder');
    });
  }

  /* --- 2. Apps Script projesi oluştur + kod yükle + deploy ----------- */
  function deployFull_() {
    setStepActive('project');

    return fetchText('apps-script/Code.gs', {}, 15000)
      .then(function (codeContent) {
        codeContent = injectSetupKey(codeContent);
        // Proje oluştur
        return fetchJson('https://script.googleapis.com/v1/projects', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title: 'Etkinlik Fotoğraf Yükleme' })
        }, 30000).then(function (project) {
          if (project.error) throw new Error(project.error.message || 'Proje oluşturulamadı');
          scriptId_ = project.scriptId;

          var manifest = JSON.stringify({
            timeZone: 'Europe/Istanbul',
            dependencies: {},
            exceptionLogging: 'STACKDRIVER',
            runtimeVersion: 'V8',
            oauthScopes: [
              'https://www.googleapis.com/auth/drive.file',
              'https://www.googleapis.com/auth/script.external_request'
            ]
          });

          setStepDone('folder');
          setStepActive('project');
          return fetchJson('https://script.googleapis.com/v1/projects/' + scriptId_ + '/content', {
            method: 'PUT',
            headers: {
              'Authorization': 'Bearer ' + accessToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              files: [
                { name: 'Code', type: 'SERVER_JS', source: codeContent },
                { name: 'appsscript', type: 'JSON', source: manifest }
              ]
            })
          }, 30000);
        });
      })
      .then(function (content) {
        if (content.error) throw new Error(content.error.message || 'Kod yüklenemedi');
        setStepDone('project');
        setStepActive('deploy');

        // Version oluştur
        return fetchJson('https://script.googleapis.com/v1/projects/' + scriptId_ + '/versions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ description: 'İlk yayın' })
        }, 30000);
      })
      .then(function (version) {
        if (version.error) throw new Error(version.error.message || 'Version oluşturulamadı');
        var versionNumber = version.versionNumber;

        // Deploy et
        return fetchJson('https://script.googleapis.com/v1/projects/' + scriptId_ + '/deployments', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            versionNumber: versionNumber,
            manifestFileName: 'appsscript',
            entryPoints: [{
              entryPointType: 'WEB_APP',
              webApp: {
                executionRole: 'ME',
                access: 'ANYONE_ANONYMOUS'
              }
            }]
          })
        }, 30000);
      })
      .then(function (deployment) {
        if (deployment.error) throw new Error(deployment.error.message || 'Deploy başarısız');
        var entryPoints = deployment.entryPoints || [];
        var webApp = entryPoints[0];
        if (!webApp || !webApp.webApp || !webApp.webApp.url) {
          throw new Error('Web App URL alınamadı');
        }
        deploymentUrl = webApp.webApp.url;
        setStepDone('deploy');
      });
  }

  /* --- 4. Yetkilendirme popup'ı -------------------------------------- */
  function stepAuthorize() {
    setStepActive('auth');
    ensureSecurityToken();
    if (!setupAdminKey) setupAdminKey = randomHex(16);

    // Setup URL'ini oluştur: action=setup + setupKey + token + folderId
    var setupUrl = deploymentUrl +
      '?action=setup' +
      '&setupKey=' + encodeURIComponent(setupAdminKey) +
      '&token=' + encodeURIComponent(securityToken) +
      '&folderId=' + encodeURIComponent(folderId) +
      '&folderName=' + encodeURIComponent('Etkinlik Fotoğrafları');

    // Popup'ta aç
    var popup = window.open(setupUrl, 'authPopup', 'width=600,height=600');
    if (!popup) {
      // Popup engelleyici
      showNote('info', t('setup.popupBlocked'));
      // Manuel link göster
      var a = document.createElement('a');
      a.href = setupUrl;
      a.target = '_blank';
      a.textContent = 'Drive izni vermek için tıklayın →';
      a.className = 'btn btn-outline';
      a.style.margin = '8px 0';
      var note = document.querySelector('.note');
      if (note) note.appendChild(document.createElement('br'));
      if (note) note.appendChild(a);
      setStepDone('auth');
      return Promise.resolve();
    }

    return new Promise(function (resolve) {
      var authTimeout;
      var checkClosed = setInterval(function () {
        if (popup.closed) {
          clearInterval(checkClosed);
          clearTimeout(authTimeout);
          setStepDone('auth');
          resolve();
        }
      }, 500);

      // Güvenlik: 5 dk sonra timeout
      authTimeout = setTimeout(function () {
        clearInterval(checkClosed);
        setStepDone('auth');
        resolve();
      }, 300000);
    });
  }

  /* =====================================================================
     Durum kaydetme ve UI güncelleme
     ===================================================================== */

  function saveSetupState() {
    try {
      localStorage.setItem(LS_GSETUP, JSON.stringify({
        apiUrl: deploymentUrl,
        folderId: folderId,
        token: securityToken,
        timestamp: Date.now()
      }));
    } catch (e) {}
    // Token'ı input'a da yaz
    if (tokenEl && securityToken) tokenEl.value = securityToken;
  }

  function showSetupComplete() {
    googleNotAuthed.classList.add('hidden');
    deployProgress.classList.add('hidden');
    setupComplete.classList.remove('hidden');
    generateBtn.disabled = false;
    hideNote();
  }

  reconnectBtn.addEventListener('click', function () {
    try { localStorage.removeItem(LS_GSETUP); } catch (e) {}
    try { localStorage.removeItem(LEGACY_LS_GSETUP); } catch (e) {}
    deploymentUrl = '';
    folderId = '';
    securityToken = '';
    accessToken = null;
    setupComplete.classList.add('hidden');
    googleNotAuthed.classList.remove('hidden');
    updateGenerateState();
  });

  /* =====================================================================
     QR oluştur (apiUrl deploymentUrl'den alınır)
     ===================================================================== */
  generateBtn.addEventListener('click', function () {
    var api = manualApiUrl() || deploymentUrl;
    var eventTitle = eventTitleEl.value.trim();
    var token = tokenEl.value.trim() || securityToken;
    var raw = rawEl.checked;
    var lang = i18n.getLang();

    if (!api) { showNote('error', t('setup.needAuth')); return; }

    var url = new URL('upload.html', location.href);
    url.searchParams.set('api', api);
    url.searchParams.set('lang', lang);
    url.searchParams.set('event', currentEvent);
    if (eventTitle) url.searchParams.set('title', eventTitle);
    if (token)  url.searchParams.set('token', token);
    if (raw)    url.searchParams.set('raw', '1');
    if (noTasksEl.checked) url.searchParams.set('tasks', '0');
    currentLink = url.toString();

    var gurl = new URL('gallery.html', location.href);
    gurl.searchParams.set('api', api);
    gurl.searchParams.set('lang', lang);
    gurl.searchParams.set('event', currentEvent);
    if (eventTitle) gurl.searchParams.set('title', eventTitle);
    if (token)  gurl.searchParams.set('token', token);
    currentGallery = gurl.toString();

    // Canlı sunum ekranı (TV/projeksiyon): liste + köşe QR için yükleme linki
    var surl = new URL('slideshow.html', location.href);
    surl.searchParams.set('api', api);
    surl.searchParams.set('lang', lang);
    surl.searchParams.set('event', currentEvent);
    if (eventTitle) surl.searchParams.set('title', eventTitle);
    if (token)  surl.searchParams.set('token', token);
    surl.searchParams.set('qr', currentLink);
    currentSlideshow = surl.toString();

    var curl = new URL('card.html', location.href);
    curl.searchParams.set('data', currentLink);
    curl.searchParams.set('lang', lang);
    curl.searchParams.set('event', currentEvent);
    if (eventTitle) curl.searchParams.set('title', eventTitle);

    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        api: api, title: eventTitle, token: token, raw: raw, lang: lang,
        event: currentEvent, noTasks: noTasksEl.checked
      }));
    } catch (e) {}

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

  function ensureSecurityToken() {
    if (!securityToken) securityToken = randomHex(9);
    if (tokenEl && securityToken) tokenEl.value = securityToken;
  }

  function randomHex(bytes) {
    var arr = new Uint8Array(bytes);
    if ((window.crypto || {}).getRandomValues) {
      window.crypto.getRandomValues(arr);
    } else {
      Array.prototype.forEach.call(arr, function (_, i) {
        arr[i] = Math.floor(Math.random() * 256);
      });
    }
    return Array.prototype.map.call(arr, function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }

  function injectSetupKey(codeContent) {
    var marker = "var SETUP_ADMIN_KEY = 'EVENTPHOTO_SETUP_KEY_PLACEHOLDER';";
    if (codeContent.indexOf(marker) < 0) {
      throw new Error('Code.gs kurulum anahtarı yeri bulunamadı');
    }
    return codeContent.replace(marker, "var SETUP_ADMIN_KEY = '" + setupAdminKey + "';");
  }

  function fetchWithTimeout(url, opts, timeoutMs) {
    opts = opts || {};
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs || 30000) : null;
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(url, opts).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r;
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw err;
    });
  }

  function fetchJson(url, opts, timeoutMs) {
    return fetchWithTimeout(url, opts, timeoutMs).then(function (r) { return r.json(); });
  }

  function fetchText(url, opts, timeoutMs) {
    return fetchWithTimeout(url, opts, timeoutMs).then(function (r) { return r.text(); });
  }

  /* =====================================================================
     Başlat
     ===================================================================== */
  initGoogleAuth();

})();
