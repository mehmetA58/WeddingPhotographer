/* =========================================================================
   card.js — Yazdırılabilir QR kart (PDF)
   URL parametreleri:
     data   = QR'a gömülecek misafir yükleme linki (zorunlu)
     couple = çift isimleri (başlık)
   Tek bir QR üretir, seçilen kopya sayısına göre A4'e döşer, window.print()
   ile "PDF olarak kaydet" edilebilir.
   ========================================================================= */

(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var i18n = window.WeddingI18n || { t: function (key) { return key; } };
  var t = function (key, vars) { return i18n.t(key, vars); };

  var params = new URLSearchParams(location.search);
  var DATA   = (params.get('data') || '').trim();
  var COUPLE = (params.get('couple') || '').trim();

  var sheet = $('sheet');
  var copies = 4;
  var qrDataUrl = '';

  if (!DATA) {
    $('cardError').classList.remove('hidden');
    $('controls').classList.add('hidden');
    return;
  }

  // "Geri" butonu kurulum ayarlarını korusun diye couple'ı taşı
  $('backBtn').href = 'index.html';

  // QR'ı bir kez üret → dataURL olarak yeniden kullan
  var gen = $('qrGen');
  gen.innerHTML = '';
  new QRCode(gen, {
    text: DATA, width: 360, height: 360,
    colorDark: '#2E2A26', colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.L
  });
  qrDataUrl = extractQr(gen);

  // Kopya seçici
  Array.prototype.forEach.call(document.querySelectorAll('#copiesRow button'), function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('#copiesRow button').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      copies = parseInt(b.dataset.n, 10) || 4;
      build();
    });
  });

  $('printBtn').addEventListener('click', function () { window.print(); });

  build();

  /* --- Kağıdı kartlarla doldur ----------------------------------------- */
  function build() {
    sheet.className = 'sheet copies-' + copies;
    sheet.innerHTML = '';
    var coupleHtml = COUPLE ? esc(COUPLE) : esc(t('card.defaultCouple'));
    for (var i = 0; i < copies; i++) {
      var card = document.createElement('div');
      card.className = 'pcard';
      card.innerHTML =
        '<div class="pc-eyebrow">' + esc(t('card.pcEyebrow')) + '</div>' +
        '<div class="pc-couple">' + coupleHtml + '</div>' +
        '<div class="pc-orn">❦</div>' +
        (qrDataUrl ? '<img class="pc-qr" src="' + qrDataUrl + '" alt="QR" />'
                   : '<div class="pc-sub">' + esc(t('card.qrFail')) + '</div>') +
        '<div class="pc-cta">' + esc(t('card.pcCta')) + '</div>' +
        '<div class="pc-sub">' + esc(t('card.pcSub')) + '</div>';
      sheet.appendChild(card);
    }
  }

  /* --- QR görüntüsünü dataURL olarak al -------------------------------- */
  function extractQr(holder) {
    var canvas = holder.querySelector('canvas');
    if (canvas) { try { return canvas.toDataURL('image/png'); } catch (e) {} }
    var img = holder.querySelector('img');
    return img ? img.src : '';
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
