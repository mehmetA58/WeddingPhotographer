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
  //  V1 kapsamı: kullanıcı tarafından istenen sabit etkinlik türleri.
  var EVENTS = [
    { key: 'wedding',     names: true  },
    { key: 'engagement',  names: true  },
    { key: 'anniversary', names: true  },
    { key: 'birthday',    names: false },
    { key: 'romantic',    names: false },
    { key: 'welcome',     names: false },
    { key: 'farewell',    names: false },
    { key: 'trip',        names: false },
    { key: 'meeting',     names: false }
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
