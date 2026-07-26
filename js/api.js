/* =========================================================================
   api.js — Cloudflare Pages Functions uç noktasıyla konuşan ortak yardımcılar
   (gallery.js ve slideshow.js tarafından kullanılır)
   Aynı origin olduğundan düz fetch yeterli — JSONP/CORS gerekmez.
   ========================================================================= */

(function () {
  'use strict';

  /* Aynı-origin JSON isteği (zaman aşımlı). Sunucu hata durumlarını da JSON
     gövdesiyle döndürdüğü için HTTP durumuna bakmadan gövdeyi çözeriz;
     yalnızca ağ/parse hatası reddedilir. */
  function apiFetch(path, timeoutMs) {
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs || 20000) : null;
    var clear = function () { if (timer) clearTimeout(timer); };
    return fetch(path, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) {
        clear();
        return r.json().catch(function () { throw new Error('Geçersiz yanıt'); });
      }, function (err) {
        clear();
        throw err;
      });
  }

  /* Fotoğraf listesi: /api/list?e=<eventId>&k=<adminKey> */
  function list(eventId, opts) {
    opts = opts || {};
    var qs = new URLSearchParams();
    qs.set('e', eventId);
    if (opts.token) qs.set('k', opts.token);   // ev sahibi anahtarı (adminKey)
    qs.set('max', String(opts.max || 500));
    if (opts.notes) qs.set('notes', '1');
    if (opts.refresh) qs.set('refresh', '1');
    return apiFetch('/api/list?' + qs.toString(), opts.timeoutMs);
  }

  /* Özel görselleri aynı-origin backend proxy üzerinden yükle. */
  function thumb(id, w, eventId, token) {
    var qs = new URLSearchParams();
    qs.set('e', eventId || '');
    qs.set('k', token || '');
    qs.set('id', id || '');
    qs.set('w', String(w || 600));
    return '/api/photo?' + qs.toString();
  }

  /* Dosya description'ından misafir adı / görevi ayıkla.
     Biçim: "EventPhoto · Katılımcı: X · Görev: Y". */
  function parseMeta(desc) {
    desc = String(desc || '');
    var guest = (desc.match(/Katılımcı:\s*([^·]+)/) || [])[1] || '';
    var task  = (desc.match(/Görev:\s*([^·]+)/) || [])[1] || '';
    var uploadId = (desc.match(/UploadId:\s*([^·]+)/) || [])[1] || '';
    return { guest: guest.trim(), task: task.trim(), uploadId: uploadId.trim() };
  }

  /* Sağlık kontrolü: /api/ping */
  function ping(timeoutMs) {
    return apiFetch('/api/ping', timeoutMs || 8000);
  }

  /* Sunucuya erişilebiliyor mu? */
  function reachable() {
    return ping().then(
      function (d) { return !!(d && (d.status === 'ready' || d.status === 'ok')); },
      function () { return false; }
    );
  }

  /* Bağlantı teşhisi:
       'ok'      → API yanıt veriyor
       'network' → erişilemiyor                                              */
  function diagnose() {
    return ping().then(
      function (data) { return (data && (data.status === 'ready' || data.status === 'ok')) ? 'ok' : 'network'; },
      function () { return 'network'; }
    );
  }

  window.EventPhotoApi = {
    list: list, thumb: thumb, parseMeta: parseMeta,
    ping: ping, reachable: reachable, diagnose: diagnose
  };
  window.WeddingApi = window.EventPhotoApi;
})();
