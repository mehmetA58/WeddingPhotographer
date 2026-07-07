/* =========================================================================
   api.js — Apps Script uç noktasıyla konuşan ortak yardımcılar
   (gallery.js ve slideshow.js tarafından kullanılır)
   ========================================================================= */

(function () {
  'use strict';

  /* JSONP isteği: Apps Script GET yanıtı CORS başlığı taşımadığından
     liste okumaları <script> etiketiyle yapılır. */
  function jsonp(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var cb = '__gcb_' + Math.random().toString(36).slice(2);
      var s = document.createElement('script');
      var timer = setTimeout(function () { cleanup(); reject(new Error('Zaman aşımı')); }, timeoutMs || 20000);
      function cleanup() {
        clearTimeout(timer);
        try { delete window[cb]; } catch (e) { window[cb] = undefined; }
        if (s.parentNode) s.parentNode.removeChild(s);
      }
      window[cb] = function (data) { cleanup(); resolve(data); };
      s.onerror = function () { cleanup(); reject(new Error('Betik hatası')); };
      s.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + cb;
      document.head.appendChild(s);
    });
  }

  /* Fotoğraf listesi: action=list (+ opsiyonel notlar) */
  function list(apiUrl, opts) {
    opts = opts || {};
    var url = apiUrl + (apiUrl.indexOf('?') >= 0 ? '&' : '?') +
      'action=list&max=' + (opts.max || 500) +
      (opts.token ? '&token=' + encodeURIComponent(opts.token) : '') +
      (opts.notes ? '&notes=1' : '');
    return jsonp(url, opts.timeoutMs);
  }

  /* Google Drive küçük resim servisi (dosyalar "bağlantıya sahip olan
     görüntüler" olduğu için token gerektirmeden <img>'de yüklenir). */
  function thumb(id, w) {
    return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + w;
  }

  /* Dosya description'ından misafir adı / görevi ayıkla.
     Biçim: "EventPhoto · Katılımcı: X · Görev: Y" (eski biçimle uyumlu). */
  function parseMeta(desc) {
    desc = String(desc || '');
    var guest = (desc.match(/Katılımcı:\s*([^·]+)/) || [])[1] || '';
    var task  = (desc.match(/Görev:\s*([^·]+)/) || [])[1] || '';
    return { guest: guest.trim(), task: task.trim() };
  }

  window.WeddingApi = { jsonp: jsonp, list: list, thumb: thumb, parseMeta: parseMeta };
})();
