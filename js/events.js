/* =========================================================================
   events.js — Etkinlik türü yapılandırması (v1)
   Ortak sade yapı korunur; etkinliğe göre METİN + AKSAN RENGİ + ZEMİN TONU
   değişir. Metinler js/i18n.js içindeki 'event.<key>.*' anahtarlarındadır.
   Renkler css/style.css içindeki html[data-event="<key>"] bloklarındadır.
   URL parametresi: ?event=<key>  (yoksa varsayılan: wedding)
   ========================================================================= */

(function () {
  'use strict';

  // Sıra, kurulum sayfasındaki kart ızgarasının sırasıdır.
  //  names: true  → başlıkta "&" ile isim yığını (Ayşe & Mehmet) gösterilir.
  //  tasks: yükleme sayfasındaki fotoğraf görevi önerileri; metinleri
  //         i18n.js'te 'task.<key>.<slug>' anahtarlarındadır (?tasks=0 kapatır).
  //  V1 kapsamı: kullanıcı tarafından istenen sabit etkinlik türleri.
  var EVENTS = [
    { key: 'wedding',     names: true,  tasks: ['selfie', 'dance', 'table', 'style', 'toast', 'laugh'] },
    { key: 'engagement',  names: true,  tasks: ['ring', 'couple', 'family', 'sweet', 'laugh'] },
    { key: 'anniversary', names: true,  tasks: ['couple', 'toast', 'cake', 'friends', 'memory'] },
    { key: 'birthday',    names: false, tasks: ['cake', 'gift', 'group', 'funny', 'decor'] },
    { key: 'romantic',    names: false, tasks: ['table', 'cheers', 'couple', 'detail'] },
    { key: 'welcome',     names: false, tasks: ['greet', 'hug', 'group', 'smile'] },
    { key: 'farewell',    names: false, tasks: ['hug', 'group', 'memory', 'smile'] },
    { key: 'trip',        names: false, tasks: ['view', 'group', 'food', 'candid', 'funny'] },
    { key: 'meeting',     names: false, tasks: ['team', 'stage', 'coffee', 'detail'] }
  ];

  var DEFAULT_KEY = 'wedding';
  var BY_KEY = {};
  EVENTS.forEach(function (e) { BY_KEY[e.key] = e; });

  function get(key) { return BY_KEY[key] || BY_KEY[DEFAULT_KEY]; }
  function has(key) { return !!BY_KEY[key]; }

  function getKey() {
    var k = null;
    try { k = new URLSearchParams(location.search).get('event'); } catch (e) {}
    return (k && BY_KEY[k]) ? k : DEFAULT_KEY;
  }

  function apply(key) {
    var event = get(key);
    document.documentElement.setAttribute('data-event', event.key);
    syncThemeColor();
    return event;
  }

  // Tarayıcı çubuğu rengini etkinliğin zemin tonuyla eşitle.
  // Stylesheet henüz yüklenmemişse --cream boş döner; sessizce geç.
  function syncThemeColor() {
    try {
      var cream = getComputedStyle(document.documentElement).getPropertyValue('--cream').trim();
      if (!cream) return;
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', cream);
    } catch (e) {}
  }

  apply(getKey());

  window.WeddingEvents = {
    LIST: EVENTS,
    DEFAULT_KEY: DEFAULT_KEY,
    get: get,
    has: has,
    getKey: getKey,
    apply: apply
  };
})();
