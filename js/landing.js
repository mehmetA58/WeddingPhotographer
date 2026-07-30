/* =========================================================================
   landing.js — EventPhoto tanıtım sayfası etkileşimleri
   - Nav kaydırma durumu + mobil menü
   - Kayarken beliren bloklar (.rv)
   - Konsept şeridi: data-event ile sayfanın kendisi palete boyanır
   - TV mockup'ına canlı demo iframe'inin tembel yüklenmesi
   - Footer videosu ekran dışındayken durur
   - hero3d.js'in koşullu yüklenmesi (WebGL + ≥768px + hareket azaltma yok)
   prefers-reduced-motion: 3D hero kurulmaz, reveal anında görünür.
   ========================================================================= */

(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

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

  function onScroll() { nav.classList.toggle('is-scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

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
     Konsept şeridi — sayfa, seçilen etkinliğin paletine boyanır
     ===================================================================== */
  var chips = $$('.lp-theme-chip');
  var word = $('#themeWord');
  function paint(chip) {
    chips.forEach(function (c) { c.classList.toggle('active', c === chip); });
    if (word) word.textContent = chip.textContent;
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

  /* =====================================================================
     Hero: three.js sahnesi yalnızca desteklenen ortamda yüklenir.
     Modül olarak enjekte edilir; type="module" tanımayan tarayıcı etiketi
     yok sayar ve statik hero olduğu gibi kalır. import() sözdizimi burada
     KULLANILMAZ — eski motorlarda bu dosyanın tamamını parse hatasına
     düşürürdü.
     ===================================================================== */
  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  }
  var wide = true;
  try { wide = window.matchMedia('(min-width: 768px)').matches; } catch (e) {}

  if (!reduce && wide && 'IntersectionObserver' in window && hasWebGL()) {
    var mod = document.createElement('script');
    mod.type = 'module';
    mod.src = 'js/hero3d.js';
    mod.onerror = function () {};
    document.head.appendChild(mod);
  }
})();
