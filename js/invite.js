/* =========================================================================
   invite.js — Davetiye: oluştur + paylaş + görüntüle
   Sunucu yok: davetiye verisi LİNKİN İÇİNDE yaşar.
     invite.html                → oluşturucu (form + canlı önizleme)
     invite.html#d=<base64url>  → davetiye görünümü (zarf → kart)
   Paket: {v:1, e:tür, t:başlık, d:tarih, h:saat, ve:mekan, a:adres,
           m:mesaj, w:whatsapp, l:dil}  (boş alanlar pakete girmez)
   ========================================================================= */

(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var i18n = window.EventPhotoI18n || { getLang: function () { return 'tr'; }, setLang: function () {}, t: function (k) { return k; } };
  var t = function (key, vars) { return i18n.t(key, vars); };
  var Events = window.EventPhotoEvents;

  /* =====================================================================
     Veri katmanı: JSON ↔ base64url (Türkçe karakter güvenli)
     ===================================================================== */
  function encodeData(obj) {
    var b64 = btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeData(s) {
    try {
      s = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      var obj = JSON.parse(decodeURIComponent(escape(atob(s))));
      return (obj && typeof obj === 'object') ? obj : null;
    } catch (e) { return null; }
  }

  /* =====================================================================
     Yardımcılar
     ===================================================================== */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function eventKey(e) { return Events.has(e) ? e : Events.DEFAULT_KEY; }
  function locale() { return i18n.getLang() === 'en' ? 'en-US' : 'tr-TR'; }

  function parseDate(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || ''));
    if (!m) return null;
    var dt = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(dt.getTime()) ? null : dt;
  }

  function dateBits(data) {
    var dt = parseDate(data.d);
    if (!dt) return null;
    return {
      day: String(dt.getDate()),
      month: dt.toLocaleDateString(locale(), { month: 'long' }),
      year: String(dt.getFullYear()),
      weekday: dt.toLocaleDateString(locale(), { weekday: 'long' }),
      time: /^\d{2}:\d{2}$/.test(data.h || '') ? data.h : ''
    };
  }

  function countdownText(d) {
    var dt = parseDate(d);
    if (!dt) return '';
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var diff = Math.round((dt.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return t('invite.today');
    if (diff === 1) return t('invite.tomorrow');
    if (diff > 1) return t('invite.daysLeft', { count: diff });
    return '';
  }

  /* =====================================================================
     Davetiye kartı (görüntüleme + önizleme aynı render)
     ===================================================================== */
  function titleHtml(data) {
    var ev = Events.get(eventKey(data.e));
    var title = (data.t || '').trim();
    if (!title) return '';
    if (ev.names && title.indexOf('&') >= 0) {
      var parts = title.split('&');
      return esc(parts[0].trim()) +
        '<span class="amp">&amp;</span>' +
        esc(parts.slice(1).join('&').trim());
    }
    return esc(title);
  }

  function mapsUrl(data) {
    var q = ((data.ve || '') + ' ' + (data.a || '')).trim();
    return 'https://maps.google.com/?q=' + encodeURIComponent(q);
  }

  // WhatsApp ülke kodu ister; TR alışkanlığı 05xx için 90 öneki eklenir
  function normPhone(w) {
    var d = String(w || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.charAt(0) === '0') d = '90' + d.slice(1);
    else if (d.length === 10 && d.charAt(0) === '5') d = '90' + d;
    return d;
  }
  function waRsvpUrl(data) {
    return 'https://wa.me/' + normPhone(data.w) +
      '?text=' + encodeURIComponent(t('invite.rsvpMsg', { title: data.t || '' }));
  }

  var ICONS = {
    cal: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    pin: '<svg class="icon" viewBox="0 0 24 24"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    wa:  '<svg class="icon" viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5z"/></svg>'
  };

  function cardHtml(data, withActions) {
    var e = eventKey(data.e);
    var bits = dateBits(data);
    var cd = countdownText(data.d);

    var html = '<i class="mounts" aria-hidden="true"></i>' +
      '<p class="eyebrow">' + esc(t('invite.' + e + '.headline')) + '</p>';

    var th = titleHtml(data);
    if (th) html += '<h1 class="couple inv-title">' + th + '</h1>';
    html += '<div class="divider"><span></span></div>';

    if (bits) {
      html += '<div class="inv-date">' +
        '<div class="inv-day">' + esc(bits.day) + '</div>' +
        '<div class="inv-md">' +
          '<div>' + esc(bits.month) + ' ' + esc(bits.year) + '</div>' +
          '<div>' + esc(bits.weekday) + '</div>' +
          (bits.time ? '<div class="inv-time-line">' + esc(bits.time) + '</div>' : '') +
        '</div>' +
      '</div>';
      if (cd) html += '<p class="inv-countdown">' + esc(cd) + '</p>';
    }

    if (data.ve || data.a) {
      html += '<div class="inv-venue">' +
        (data.ve ? '<div class="inv-venue-name">' + esc(data.ve) + '</div>' : '') +
        (data.a ? '<div class="inv-venue-addr">' + esc(data.a) + '</div>' : '') +
      '</div>';
    }

    if (data.m) html += '<p class="inv-message">' + esc(data.m) + '</p>';

    if (withActions) {
      var actions = '';
      if (parseDate(data.d)) {
        actions += '<button type="button" class="btn btn-outline" id="icsBtn">' +
          ICONS.cal + '<span>' + esc(t('invite.addToCalendar')) + '</span></button>';
      }
      if (data.ve || data.a) {
        actions += '<a class="btn btn-outline" id="mapBtn" target="_blank" rel="noopener" href="' + esc(mapsUrl(data)) + '">' +
          ICONS.pin + '<span>' + esc(t('invite.openMap')) + '</span></a>';
      }
      if (normPhone(data.w)) {
        actions += '<a class="btn btn-gold" id="rsvpBtn" target="_blank" rel="noopener" href="' + esc(waRsvpUrl(data)) + '">' +
          ICONS.wa + '<span>' + esc(t('invite.rsvp')) + '</span></a>';
      }
      if (actions) html += '<div class="inv-actions no-print">' + actions + '</div>';
    }
    return html;
  }

  /* =====================================================================
     Takvim (.ics) — istemcide üretilir
     ===================================================================== */
  function icsEsc(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;')
      .replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  function buildIcs(data) {
    var d = String(data.d || '').replace(/-/g, '');
    var hasTime = /^\d{2}:\d{2}$/.test(data.h || '');
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    var summary = (data.t ? data.t + ' — ' : '') + t('invite.' + eventKey(data.e) + '.headline');
    var loc = ((data.ve || '') + (data.a ? ', ' + data.a : '')).trim();

    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EventPhoto//Davetiye//TR',
      'BEGIN:VEVENT',
      'UID:' + Date.now() + '-' + Math.floor(Math.random() * 1e6) + '@eventphoto',
      'DTSTAMP:' + stamp,
      hasTime ? 'DTSTART:' + d + 'T' + data.h.replace(':', '') + '00'
              : 'DTSTART;VALUE=DATE:' + d,
      'SUMMARY:' + icsEsc(summary)
    ];
    if (loc)    lines.push('LOCATION:' + icsEsc(loc));
    if (data.m) lines.push('DESCRIPTION:' + icsEsc(data.m));
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.join('\r\n');
  }

  function downloadBlob(blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  function bindActions(root, data) {
    var icsBtn = root.querySelector('#icsBtn');
    if (icsBtn) {
      icsBtn.addEventListener('click', function () {
        downloadBlob(new Blob([buildIcs(data)], { type: 'text/calendar;charset=utf-8' }), 'davetiye.ics');
      });
    }
  }

  /* =====================================================================
     Mod seçimi
     ===================================================================== */
  var hash = location.hash || '';
  var data = (hash.indexOf('#d=') === 0) ? decodeData(hash.slice(3)) : null;

  if (data) viewMode(data);
  else builderMode(hash.indexOf('#d=') === 0); // #d= var ama çözülemedi → hata notuyla

  /* =====================================================================
     GÖRÜNTÜLEME: zarf → kart
     ===================================================================== */
  function viewMode(data) {
    if (data.l && data.l !== i18n.getLang()) i18n.setLang(data.l);
    Events.apply(eventKey(data.e));
    document.title = (data.t ? data.t + ' · ' : '') + t('title.invite');

    $('inviteView').classList.remove('hidden');
    var card = $('inviteCard');
    card.innerHTML = cardHtml(data, true);
    bindActions(card, data);

    var env = $('envelope');
    var reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (reduce) {
      env.classList.add('gone');
      card.classList.remove('hidden');
      return;
    }

    $('envSeal').textContent = sealText(data);
    $('envTo').textContent = data.t || '';

    var opened = false;
    function open() {
      if (opened) return;
      opened = true;
      env.classList.add('open');
      setTimeout(function () {
        env.classList.add('gone');
        card.classList.remove('hidden');
        card.classList.add('inv-in');
      }, 620);
    }
    env.addEventListener('click', open);
    env.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
    setTimeout(open, 6000); // dokunulmazsa kendiliğinden açılır
  }

  // Mühürdeki baş harf(ler): "Ayşe & Mehmet" → "A·M", "Kapadokya" → "K"
  function sealText(data) {
    var title = (data.t || '').trim();
    if (title.indexOf('&') > 0) {
      var p = title.split('&');
      var a = p[0].trim().charAt(0);
      var b = (p[1] || '').trim().charAt(0);
      if (a && b) return (a + '·' + b).toLocaleUpperCase(locale());
    }
    return (title.charAt(0) || '&').toLocaleUpperCase(locale());
  }

  /* =====================================================================
     OLUŞTURUCU: form + canlı önizleme + paylaşım
     ===================================================================== */
  function builderMode(showError) {
    if (showError) $('inviteError').classList.remove('hidden');
    $('inviteBuilder').classList.remove('hidden');

    var currentEvent = Events.DEFAULT_KEY;

    // Kurulum sayfasındaki kayıttan ön doldur (varsa)
    try {
      var saved = JSON.parse(localStorage.getItem('eventPhotoSetup') ||
                             localStorage.getItem('weddingUploadSetup') || '{}');
      if (saved.event && Events.has(saved.event)) currentEvent = saved.event;
      if (saved.title) $('invTitleIn').value = saved.title;
      if (saved.lang) i18n.setLang(saved.lang);
    } catch (e) {}

    $('invLangSel').value = i18n.getLang();
    Events.apply(currentEvent);

    /* --- Etkinlik türü ızgarası (kurulumdaki desenle) ------------------ */
    var grid = $('invConceptGrid');
    function buildGrid() {
      grid.innerHTML = '';
      Events.LIST.forEach(function (ev) {
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
        grid.appendChild(card);
      });
    }

    function selectEvent(key) {
      currentEvent = key;
      Events.apply(key);
      Array.prototype.forEach.call(grid.children, function (c) {
        var on = c.dataset.key === key;
        c.classList.toggle('active', on);
        c.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      updateTitleField();
      update();
    }

    function updateTitleField() {
      $('invTitleLabel').textContent = '2 · ' + t('event.' + currentEvent + '.titleLabel');
      $('invTitleIn').setAttribute('placeholder', t('event.' + currentEvent + '.titlePlaceholder'));
    }

    /* --- Durum → link → önizleme --------------------------------------- */
    function collect() {
      return {
        v: 1,
        e: currentEvent,
        t: $('invTitleIn').value.trim(),
        d: $('invDateIn').value,
        h: $('invTimeIn').value,
        ve: $('invVenueIn').value.trim(),
        a: $('invAddrIn').value.trim(),
        m: $('invMsgIn').value.trim(),
        w: $('invPhoneIn').value.trim(),
        l: i18n.getLang()
      };
    }

    function compact(o) {
      var r = {};
      for (var k in o) if (o[k]) r[k] = o[k];
      return r;
    }

    function buildLink() {
      var u = new URL('invite.html', location.href);
      return u.toString() + '#d=' + encodeData(compact(collect()));
    }

    function update() {
      $('previewCard').innerHTML = cardHtml(collect(), false);
      var link = buildLink();
      $('invLinkText').textContent = link;
      $('invOpenBtn').href = link;
      $('invWaBtn').href = 'https://wa.me/?text=' +
        encodeURIComponent(t('invite.shareText') + '\n' + link);
    }

    ['invTitleIn', 'invDateIn', 'invTimeIn', 'invVenueIn', 'invAddrIn', 'invMsgIn', 'invPhoneIn']
      .forEach(function (id) {
        $(id).addEventListener('input', update);
        $(id).addEventListener('change', update);
      });

    $('invLangSel').addEventListener('change', function () {
      i18n.setLang(this.value);
      buildGrid();
      updateTitleField();
      update();
    });

    /* --- Paylaşım ------------------------------------------------------- */
    function basicsOk() {
      var d = collect();
      return !!(d.t && parseDate(d.d));
    }

    function flashNote(type, msg) {
      var n = $('invShareNote');
      n.className = 'note note-' + type;
      n.innerHTML = '<span aria-hidden="true"></span><div>' + esc(msg) + '</div>';
      n.classList.remove('hidden');
      clearTimeout(flashNote._t);
      flashNote._t = setTimeout(function () { n.classList.add('hidden'); }, 3000);
    }

    function guard(e) {
      if (basicsOk()) return true;
      if (e) e.preventDefault();
      flashNote('info', t('invite.needBasics'));
      return false;
    }

    $('invCopyBtn').addEventListener('click', function () {
      if (!guard()) return;
      copyText(buildLink(), function () { flashNote('ok', t('invite.copied')); });
    });
    $('invWaBtn').addEventListener('click', guard);
    $('invOpenBtn').addEventListener('click', guard);
    $('invPngBtn').addEventListener('click', function () {
      if (!guard()) return;
      downloadPng(collect());
    });

    buildGrid();
    updateTitleField();
    update();
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

  /* =====================================================================
     PNG dışa aktarma — 1080×1620, kütüphanesiz canvas çizimi
     (WhatsApp/Instagram'da görsel olarak paylaşmak için)
     ===================================================================== */
  function cssVar(name, fallback) {
    var v = '';
    try { v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch (e) {}
    return v || fallback;
  }

  function downloadPng(data) {
    Events.apply(eventKey(data.e)); // tema renkleri doğru okunsun
    var wanted = ['600 92px "Fraunces"', '500 64px "Fraunces"', '600 30px "Inter"',
                  '400 32px "Inter"', '500 52px "Caveat"', '600 150px "Fraunces"'];
    var ready = (document.fonts && document.fonts.load)
      ? Promise.all(wanted.map(function (f) { return document.fonts.load(f).catch(function () {}); }))
      : Promise.resolve();
    ready.then(function () {
      try { drawPng(data); }
      catch (e) { alert(t('invite.pngFail')); }
    });
  }

  function drawPng(data) {
    var W = 1080, H = 1620, M = 70;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var x = canvas.getContext('2d');

    var cream    = cssVar('--cream', '#F3EDE2');
    var gold     = cssVar('--gold', '#A8844E');
    var goldDark = cssVar('--gold-dark', '#735B37');
    var goldLight= cssVar('--gold-light', '#D6C29B');
    var ink      = cssVar('--ink', '#302B25');
    var inkSoft  = cssVar('--ink-soft', '#6E6256');
    var surface  = '#FFFCF6';
    var hand     = '#4A4238';

    /* Zemin + kart + çift çerçeve */
    x.fillStyle = cream; x.fillRect(0, 0, W, H);
    x.fillStyle = surface; x.fillRect(M, M, W - 2 * M, H - 2 * M);
    x.strokeStyle = goldLight; x.lineWidth = 2;
    x.strokeRect(M, M, W - 2 * M, H - 2 * M);
    x.globalAlpha = .55;
    x.strokeRect(M + 26, M + 26, W - 2 * M - 52, H - 2 * M - 52);
    x.globalAlpha = 1;

    /* Köşe cepleri */
    function tri(x1, y1, x2, y2, x3, y3) {
      x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.lineTo(x3, y3);
      x.closePath(); x.fill();
    }
    var L = 62;
    x.globalAlpha = .5; x.fillStyle = gold;
    tri(M, M, M + L, M, M, M + L);
    tri(W - M, M, W - M - L, M, W - M, M + L);
    tri(M, H - M, M + L, H - M, M, H - M - L);
    tri(W - M, H - M, W - M - L, H - M, W - M, H - M - L);
    x.globalAlpha = 1;

    /* Metin yardımcıları */
    var cx = W / 2;
    var maxW = W - 2 * M - 170;
    x.textAlign = 'center';
    function setSpacing(px) { try { x.letterSpacing = px + 'px'; } catch (e) {} }
    function wrap(str, mw) {
      var words = String(str).split(/\s+/), lines = [], line = '';
      words.forEach(function (w) {
        var tryLine = line ? line + ' ' + w : w;
        if (x.measureText(tryLine).width > mw && line) { lines.push(line); line = w; }
        else line = tryLine;
      });
      if (line) lines.push(line);
      return lines;
    }

    var y = M + 150;

    /* Üst yazı (headline) */
    x.fillStyle = goldDark;
    x.font = '600 30px Inter, sans-serif';
    setSpacing(6);
    wrap(t('invite.' + eventKey(data.e) + '.headline').toLocaleUpperCase(locale()), maxW)
      .forEach(function (ln) { x.fillText(ln, cx, y); y += 44; });
    setSpacing(0);
    y += 26;

    /* Başlık / isimler */
    var ev = Events.get(eventKey(data.e));
    var title = (data.t || '').trim();
    if (title) {
      x.fillStyle = ink;
      x.font = '600 92px Fraunces, serif';
      if (ev.names && title.indexOf('&') >= 0) {
        var parts = title.split('&');
        wrap(parts[0].trim(), maxW).forEach(function (ln) { x.fillText(ln, cx, y + 66); y += 104; });
        x.fillStyle = gold;
        x.font = 'italic 500 62px Fraunces, serif';
        x.fillText('&', cx, y + 42); y += 86;
        x.fillStyle = ink;
        x.font = '600 92px Fraunces, serif';
        wrap(parts.slice(1).join('&').trim(), maxW).forEach(function (ln) { x.fillText(ln, cx, y + 66); y += 104; });
      } else {
        wrap(title, maxW).forEach(function (ln) { x.fillText(ln, cx, y + 66); y += 104; });
      }
      y += 14;
    }

    /* Ayraç: çizgi + orta nokta */
    x.strokeStyle = goldLight; x.lineWidth = 2;
    x.beginPath(); x.moveTo(cx - 130, y); x.lineTo(cx - 16, y);
    x.moveTo(cx + 16, y); x.lineTo(cx + 130, y); x.stroke();
    x.fillStyle = gold;
    x.beginPath(); x.arc(cx, y, 6, 0, Math.PI * 2); x.fill();
    y += 88;

    /* Tarih bloğu */
    var bits = dateBits(data);
    if (bits) {
      x.fillStyle = ink;
      x.font = '600 150px Fraunces, serif';
      x.fillText(bits.day, cx, y + 60); y += 120;
      x.fillStyle = goldDark;
      x.font = '600 30px Inter, sans-serif';
      setSpacing(5);
      x.fillText((bits.month + ' ' + bits.year).toLocaleUpperCase(locale()), cx, y); y += 46;
      x.fillText(bits.weekday.toLocaleUpperCase(locale()), cx, y); y += 46;
      setSpacing(0);
      if (bits.time) {
        x.fillStyle = inkSoft;
        x.font = '500 34px Inter, sans-serif';
        x.fillText(bits.time, cx, y); y += 48;
      }
      var cd = countdownText(data.d);
      if (cd) {
        x.fillStyle = goldDark;
        x.font = '500 44px Caveat, cursive';
        x.fillText(cd, cx, y + 16); y += 66;
      }
      y += 22;
    }

    /* Mekan */
    if (data.ve || data.a) {
      if (data.ve) {
        x.fillStyle = ink;
        x.font = '600 46px Fraunces, serif';
        wrap(data.ve, maxW).forEach(function (ln) { x.fillText(ln, cx, y + 30); y += 58; });
      }
      if (data.a) {
        x.fillStyle = inkSoft;
        x.font = '400 30px Inter, sans-serif';
        wrap(data.a, maxW).forEach(function (ln) { x.fillText(ln, cx, y + 24); y += 42; });
      }
      y += 30;
    }

    /* El yazısı mesaj */
    if (data.m) {
      x.fillStyle = hand;
      x.font = '500 52px Caveat, cursive';
      wrap(data.m, maxW - 40).forEach(function (ln) { x.fillText(ln, cx, y + 36); y += 62; });
    }

    canvas.toBlob(function (blob) {
      if (!blob) { alert(t('invite.pngFail')); return; }
      downloadBlob(blob, 'davetiye.png');
    }, 'image/png');
  }
})();
