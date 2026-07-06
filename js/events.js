/* =========================================================================
   events.js — Etkinlik türü yapılandırması (v1)
   Ortak sade yapı korunur; etkinliğe göre EMOJİ + METİN + AKSAN RENK
   değişir. Metinler js/i18n.js içindeki 'event.<key>.*' anahtarlarındadır.
   URL parametresi: ?event=<key>  (yoksa varsayılan: wedding)
   ========================================================================= */

(function () {
  'use strict';

  // Sıra, kurulum sayfasındaki kart ızgarasının sırasıdır.
  //  names: true  → başlıkta "&" ile isim yığını (Ayşe & Mehmet) gösterilir.
  //  V1 kapsamı: kullanıcı tarafından istenen sabit etkinlik türleri.
  var EVENTS = [
    { key: 'wedding',     emoji: '💍', success: '💛', names: true  },
    { key: 'engagement',  emoji: '💍', success: '💐', names: true  },
    { key: 'anniversary', emoji: '🥂', success: '🥂', names: true  },
    { key: 'birthday',    emoji: '🎂', success: '🎉', names: false },
    { key: 'romantic',    emoji: '🕯️', success: '❤️', names: false },
    { key: 'welcome',     emoji: '🎉', success: '🎉', names: false },
    { key: 'farewell',    emoji: '👋', success: '💫', names: false },
    { key: 'trip',        emoji: '✈️', success: '📸', names: false },
    { key: 'meeting',     emoji: '🤝', success: '✅', names: false }
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
    return event;
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
