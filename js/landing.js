/* =========================================================================
   landing.js — EventPhoto tanıtım sayfası etkileşimleri
   - Kaydırmayla işleyen hero (faz geçişleri, polaroid parallax, sahne kapanışı)
   - Üst üste binen adım kartlarının derinlik ölçeği
   - Özellik akordeonu (hover + tıklama + klavye)
   - Tema şeridi: data-event ile sayfanın kendisi palete boyanır
   - TV mockup'ına canlı demo iframe'inin tembel yüklenmesi
   prefers-reduced-motion: tüm kaydırma sahneleri kapalı, içerik statik.
   ========================================================================= */

(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  function clamp01(v) { return Math.min(1, Math.max(0, v)); }
  function seg(p, a, b) { return clamp01((p - a) / (b - a)); } // p'yi [a,b] aralığında 0..1'e eşle

  /* =====================================================================
     Nav: kaydırma durumu + mobil menü
     ===================================================================== */
  var nav = $('#lpNav');
  var menu = $('#lpMenu');
  var menuBtn = $('#lpMenuBtn');

  function setMenu(open) {
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  menuBtn.addEventListener('click', function () { setMenu(true); });
  $('#lpMenuClose').addEventListener('click', function () { setMenu(false); });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false);
  });

  /* =====================================================================
     Kayarken beliren bloklar (.rv)
     ===================================================================== */
  var rvs = $$('.rv');
  if (reduce || !('IntersectionObserver' in window)) {
    rvs.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    rvs.forEach(function (el) { io.observe(el); });
  }

  /* =====================================================================
     Kaydırma sahneleri (hero + adım kartları) — tek rAF döngüsü
     ===================================================================== */
  var hero   = $('.lp-hero');
  var stage  = $('#heroStage');
  var phase1 = $('#phase1');
  var phase2 = $('#phase2');
  var phone  = $('#heroPhone');
  var hint   = $('.lp-scroll-hint');
  var pols   = $$('.lp-pol', stage);
  var steps  = $$('.lp-step');

  var ticking = false;
  /* Ölçümler önbelleğe alınır: mobilde URL çubuğu açılıp kapanınca yalnızca
     yükseklik değişir ve resize tetiklenir — bunu yeniden ölçmeye bağlarsak
     scroll'a kilitli parallax zıplar. Onun yerine ölçümleri dondurur, yalnızca
     genişlik değişince (yön değişimi / pencere yeniden boyutlanması) yenileriz. */
  var vh = window.innerHeight;
  var heroH = hero.offsetHeight;
  var heroTop = hero.offsetTop;
  var lastW = window.innerWidth;

  function measure() {
    vh = window.innerHeight;
    heroH = hero.offsetHeight;
    heroTop = hero.offsetTop;
  }

  function onScroll() {
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
    if (reduce) return;
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  function onResize() {
    if (window.innerWidth === lastW) return;   // yükseklik-yalnızca (URL çubuğu) yok sayılır
    lastW = window.innerWidth;
    measure();
    onScroll();
  }

  function update() {
    ticking = false;

    /* --- Hero --- */
    var span = heroH - vh;
    if (span > 0) {
      var p = clamp01((window.scrollY - heroTop) / span);

      var out = seg(p, 0.06, 0.26);                    // faz 1 çıkışı
      phase1.style.opacity = String(1 - out);
      phase1.style.transform = 'translateY(' + (-64 * out) + 'px)';
      phase1.style.pointerEvents = out > 0.8 ? 'none' : '';

      var into = seg(p, 0.30, 0.52);                   // faz 2 girişi
      phase2.style.opacity = String(into);
      phase2.style.transform = 'translateY(' + (56 * (1 - into)) + 'px)';
      phase2.style.pointerEvents = into < 0.4 ? 'none' : '';

      pols.forEach(function (pol) {                    // polaroidler yukarı süzülür
        var d = parseFloat(pol.dataset.depth) || 1;
        pol.style.transform = 'rotate(var(--r)) translateY(' + (-p * d * vh * 0.52) + 'px)';
      });

      phone.style.transform = 'translate(-50%, ' + (-p * vh * 0.16) + 'px)';
      if (hint) hint.style.opacity = String(1 - seg(p, 0.01, 0.06));

      var end = seg(p, 0.82, 1);                       // sahne küçülüp köşelenir
      stage.style.transform = 'scale(' + (1 - 0.08 * end) + ')';
      stage.style.borderRadius = (56 * end) + 'px';
      stage.style.boxShadow = end > 0
        ? '0 40px 90px -40px rgba(40, 28, 14, ' + (0.55 * end) + ')' : '';
    }

    /* --- Adım kartları: üstteki kart, alttaki yükselirken hafifçe küçülür --- */
    for (var i = 0; i < steps.length - 1; i++) {
      var nextTop = steps[i + 1].getBoundingClientRect().top;
      var x = clamp01(1 - (nextTop - (86 + i * 30)) / (vh * 0.7));
      steps[i].style.transform = 'scale(' + (1 - 0.055 * x) + ')';
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  onScroll();
  if (!reduce) update();

  /* =====================================================================
     Özellik akordeonu
     ===================================================================== */
  var acc = $('#lpAcc');
  var items = $$('.lp-acc-item', acc);
  function activate(item) {
    items.forEach(function (x) {
      var on = x === item;
      x.classList.toggle('is-active', on);
      x.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
  }
  items.forEach(function (item) {
    item.addEventListener('mouseenter', function () { activate(item); });
    item.addEventListener('focus', function () { activate(item); });
    item.addEventListener('click', function () { activate(item); });
  });

  /* =====================================================================
     Tema şeridi — sayfa, seçilen etkinliğin paletine boyanır
     ===================================================================== */
  var chips = $$('.lp-theme-chip');
  var word = $('#themeWord');
  function paint(chip) {
    chips.forEach(function (c) { c.classList.toggle('active', c === chip); });
    word.textContent = chip.textContent;
    if (window.EventPhotoEvents) window.EventPhotoEvents.apply(chip.dataset.event);
    else document.documentElement.setAttribute('data-event', chip.dataset.event);
  }
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () { paint(chip); });
    chip.addEventListener('mouseenter', function () { paint(chip); });
    chip.addEventListener('focus', function () { paint(chip); });
  });

  /* =====================================================================
     TV: canlı demo iframe'i görünürlüğe yaklaşınca yüklenir
     (reduced-motion'da poster görsel kalır)
     ===================================================================== */
  var tv = $('#lpTv');
  if (tv && !reduce && 'IntersectionObserver' in window) {
    var tvIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        tvIo.disconnect();
        var frame = document.createElement('iframe');
        frame.src = tv.dataset.src;
        frame.title = 'EventPhoto canlı sunum demosu';
        frame.setAttribute('tabindex', '-1');
        frame.setAttribute('aria-hidden', 'true');
        frame.loading = 'lazy';
        tv.appendChild(frame);
      });
    }, { rootMargin: '300px' });
    tvIo.observe(tv);
  }

  /* =====================================================================
     Footer videosu: ekran dışındayken durdur (pil/veri)
     ===================================================================== */
  var koVideo = $('.lp-ko video');
  if (koVideo && !reduce && 'IntersectionObserver' in window) {
    var vIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) koVideo.play().catch(function () {});
        else koVideo.pause();
      });
    }, { threshold: 0.05 });
    vIo.observe(koVideo);
  }
})();
