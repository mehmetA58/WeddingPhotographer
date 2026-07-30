/* =========================================================================
   hero3d.js — Hero'nun three.js sahnesi ("Kartpostal" scrollytelling)
   ---------------------------------------------------------------------
   500vh'lik #top bölümünde sticky bir sahne: sekiz polaroid kart eğik bir
   sıra halinde durur, scroll ilerlemesi beş aşamalı bir keyframe zaman
   çizgisini sürer. Canvas zemini şeffaftır; arkasındaki DOM tipografisi
   kartların arasından görünür, öndeki metin ve butonlar gerçek DOM'dur.

   Bu dosya yalnızca landing.js tarafından, WebGL + ≥768px + hareket azaltma
   kapalıyken yüklenir. Kurulum baştan sona try/catch içindedir: herhangi bir
   hata sahneyi söker ve sayfa statik hero'ya döner.

   Sahne renkleri CSS custom property'lerinden okunur; <html data-event>
   değiştiğinde (konsept şeridi) palet yeniden okunur.
   ========================================================================= */

import * as THREE from './vendor/three.module.min.js';

const SECTION_ID = 'top';
const STAGE_COUNT = 5;

/* Kartların fotoğrafları — index sırası sahnedeki soldan sağa dizilimdir.
   Ortadaki (HERO_CARD) aşama 2 ve 3'te öne çıkan karedir. */
const PHOTOS = [
  { src: 'assets/demo/gun-batimi.svg', caption: 'Deniz' },
  { src: 'assets/demo/dans-pisti.svg', caption: 'Ayşe Teyze' },
  { src: 'assets/demo/kadeh.svg', caption: 'Kadeh' },
  { src: 'assets/demo/pasta.svg', caption: 'Zeynep' },
  { src: 'assets/demo/konfeti.svg', caption: 'Konfeti' },
  { src: 'assets/demo/isiklar.svg', caption: 'Işıklar' },
  { src: 'assets/demo/manzara.svg', caption: 'Manzara' },
  { src: 'assets/demo/sahil.svg', caption: 'Sahil' }
];
const HERO_CARD = 3;

const CARD_W = 1.0;
const CARD_H = 1.2;
const CARD_D = 0.035;

/* Aşama başına zemin rengi (CSS token adı) ve ambient gücü.
   Lambert BRDF katkıyı π'ye böldüğü için beyaz kağıdın beyaz kalması ancak
   ambient ≈ π civarında mümkün; daha düşük değerlerde polaroidler grileşir. */
const AMBIENT_BASE = 2.4;
const KEY_BASE = 0.9;
const STAGES = [
  { bg: '--cream',   light: AMBIENT_BASE },
  { bg: '--gold-bg', light: 2.5 },
  { bg: '--cream-2', light: 2.45 },
  { bg: '--ink',     light: 2.8 },
  { bg: '--cream',   light: AMBIENT_BASE }
];

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (t) => t * t * (3 - 2 * t);
const rad = (deg) => (deg * Math.PI) / 180;

let renderer = null;
let disposed = false;

/* -------------------------------------------------------------------------
   Doku hattı: SVG → 2D canvas polaroid kompoziti → CanvasTexture
   assets/demo/*.svg dosyalarında width/height niteliği yok, yalnızca viewBox
   var. Safari böyle bir SVG'yi <img> üzerinden 0 boyutla çizebildiği için
   dosyayı metin olarak alıp ölçüleri enjekte ediyor ve blob URL'den
   yüklüyoruz — tüm tarayıcılarda deterministik boyut.
   ------------------------------------------------------------------------- */
async function loadSvgImage(src) {
  const res = await fetch(src);
  if (!res.ok) throw new Error('SVG alınamadı: ' + src);
  let text = await res.text();
  if (!/<svg[^>]*\swidth=/.test(text)) {
    text = text.replace(/<svg\b/, '<svg width="800" height="600"');
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('SVG çizilemedi: ' + src));
      img.src = url;
    });
    if (img.decode) { try { await img.decode(); } catch (e) { /* onload yeterli */ } }
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* Pul çerçeveli polaroid: beyaz kağıt, 4:3 foto penceresi, el yazısı altyazı.
   Kağıt rengi (--surface) on konsept paletinde de sabit olduğundan dokular
   tema değişiminde yeniden üretilmez. */
function paintPolaroid(img, caption, paper, inkSoft) {
  const W = 512;
  const H = Math.round(W * (CARD_H / CARD_W));
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');

  g.fillStyle = paper;
  g.fillRect(0, 0, W, H);

  const pad = 26;
  const winW = W - pad * 2;
  const winH = Math.round(winW * 0.75);
  g.drawImage(img, pad, pad, winW, winH);

  g.strokeStyle = 'rgba(55, 43, 30, .10)';
  g.lineWidth = 2;
  g.strokeRect(pad, pad, winW, winH);

  g.fillStyle = inkSoft;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '42px Caveat, "Comic Sans MS", cursive';
  g.fillText(caption, W / 2, pad + winH + (H - pad - winH - pad) / 2 + 4);

  return cv;
}

/* -------------------------------------------------------------------------
   Zaman çizgisi: kart başına aşama pozları
   ------------------------------------------------------------------------- */
/* half = sıranın z=0 düzlemindeki yarı genişliği (world birimi).
   Kart grubu layout() içinde dikeyde aşağı kaydırıldığından, öne çıkan kartın
   y değerleri bu kaydırmayı geri alarak kartı ekran ortasına taşır.
   narrow (dikey/dar viewport): öne çıkan kart ortalanır ve biraz küçülür —
   yanlara kaçarsa ekrandan taşar, tam ortaya gelirse metnin altına girer. */
function buildKeyframes(count, half, lift, narrow) {
  const heroX2 = narrow ? 0 : 0.30;
  const heroX3 = narrow ? 0 : 0.36;
  const heroY = narrow ? lift * 0.5 : lift;
  const heroS2 = narrow ? 1.1 : 1.5;
  const heroS3 = narrow ? 1.15 : 1.75;
  const frames = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const centered = t - 0.5;
    const isHero = i === HERO_CARD;
    const side = i < HERO_CARD ? -1 : 1;
    const away = Math.abs(i - HERO_CARD);

    frames.push([
      /* 0 — eğik, bindirmeli sıra */
      {
        x: centered * half * 1.72,
        y: (i % 2 ? 0.14 : -0.12) + Math.sin(i * 1.7) * 0.06,
        z: -Math.abs(centered) * 0.55,
        rx: rad(4),
        ry: rad(-centered * 26),
        rz: rad((i % 2 ? 1 : -1) * (3.5 + (i % 3) * 1.4)),
        s: 1
      },
      /* 1 — kartlar dikleşir, eşit yayılır */
      {
        x: centered * half * 2,
        y: 0,
        z: 0,
        rx: 0,
        ry: rad(-centered * 10),
        rz: 0,
        s: 1
      },
      /* 2 — orta kart öne çıkar, diğerleri düzgün sırada geriler */
      {
        x: isHero ? half * heroX2 : centered * half * 2.15,
        y: isHero ? heroY : lift * 0.72,
        z: isHero ? 2.4 : -1.0 - away * 0.15,
        rx: 0,
        ry: isHero ? rad(-8) : rad(-centered * 16),
        rz: isHero ? 0 : rad(side * 3),
        s: isHero ? heroS2 : 0.9
      },
      /* 3 — koyu zemin, tek kart baskın ve dönüyor */
      {
        x: isHero ? half * heroX3 : centered * half * 2.7,
        y: isHero ? heroY : lift * 0.72,
        z: isHero ? 3.1 : -1.4,
        rx: 0,
        ry: isHero ? rad(-18) : rad(-centered * 12),
        rz: 0,
        s: isHero ? heroS3 : 0.85
      },
      /* 4 — sıra geri gelir, hafif yukarı süzülür */
      {
        x: centered * half * 1.88,
        y: 0.18 + (i % 2 ? 0.1 : -0.08),
        z: -Math.abs(centered) * 0.4,
        rx: rad(-3),
        ry: rad(-centered * 20),
        rz: rad((i % 2 ? -1 : 1) * 2.6),
        s: 0.96
      }
    ]);
  }
  return frames;
}

/* -------------------------------------------------------------------------
   Kurulum
   ------------------------------------------------------------------------- */
async function init() {
  const section = document.getElementById(SECTION_ID);
  const sticky = section && section.querySelector('.lp-hero3d-sticky');
  if (!section || !sticky) return;

  const root = document.documentElement;
  const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  /* --- Renderer + sahne --- */
  const canvas = document.createElement('canvas');
  canvas.className = 'lp-hero3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0, 0, 9);

  const ambient = new THREE.AmbientLight(0xffffff, AMBIENT_BASE);
  const key = new THREE.DirectionalLight(0xffffff, KEY_BASE);
  key.position.set(3, 4, 6);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-4, -1, 3);
  scene.add(ambient, key, fill);

  const group = new THREE.Group();
  scene.add(group);

  /* --- Kartlar --- */
  const paper = css('--postal-paper') || '#FFFDF7';
  const inkSoft = css('--ink-soft') || '#6C6353';
  const geometry = new THREE.BoxGeometry(CARD_W, CARD_H, CARD_D);
  const edgeMaterial = new THREE.MeshLambertMaterial({ color: new THREE.Color(paper) });
  const cards = [];
  const textures = [];

  PHOTOS.forEach((photo) => {
    /* BoxGeometry malzeme sırası: +x, -x, +y, -y, +z (ön), -z (arka) */
    const front = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, [
      edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, front, edgeMaterial
    ]);
    group.add(mesh);
    cards.push({ mesh, front });
  });

  /* Fotoğraf dokuları arka planda akar; yüklenene kadar kartlar boş kağıt
     olarak görünür, hazır olan tek tek yerine oturur. */
  PHOTOS.forEach(async (photo, i) => {
    try {
      /* Altyazılar Caveat ile çizilir; font gelmeden boyamak fallback yazı
         tipini dokuya sabitlerdi. */
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const img = await loadSvgImage(photo.src);
      if (disposed) return;
      const tex = new THREE.CanvasTexture(paintPolaroid(img, photo.caption, paper, inkSoft));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      textures.push(tex);
      cards[i].front.map = tex;
      cards[i].front.needsUpdate = true;
    } catch (e) {
      /* Tek bir kare yüklenemezse sahne boş kağıtla devam eder. */
    }
  });

  /* --- Ölçüler --- */
  let keyframes = [];

  function layout() {
    const w = sticky.clientWidth || window.innerWidth;
    const h = sticky.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    /* Kart aralığı, kamera düzlemindeki görünür genişlikten türetilir */
    const visibleH = 2 * Math.tan(rad(camera.fov) / 2) * camera.position.z;
    const visibleW = visibleH * camera.aspect;
    /* CARD_W kadar pay bırakılır ki geniş ekranda kenardaki kartlar
       kırpılmasın; dar ekranda alt sınır devreye girer ve bant taşar. */
    const perCard = clamp((visibleW - CARD_W) / (PHOTOS.length - 1), 0.72, 1.3);
    const half = (perCard * (PHOTOS.length - 1)) / 2;

    /* Sıra alt yarıya iner; metin bloğu üstte kalır, yalnızca başlığın
       alt satırı kartların arkasından geçer (videodaki bindirme).
       Dikey ekranda metin daha çok yer kapladığından bant biraz daha iner. */
    const narrow = camera.aspect < 1.15;
    const drop = visibleH * (narrow ? 0.29 : 0.22);
    group.position.y = -drop;
    keyframes = buildKeyframes(PHOTOS.length, half, drop, narrow);
  }
  layout();

  /* --- Tema --- */
  const palette = { bg: [], light: [] };
  function readPalette() {
    palette.bg = STAGES.map((s) => new THREE.Color(css(s.bg) || '#FBF6EC'));
    palette.light = STAGES.map((s) => s.light);
  }
  readPalette();

  const themeObserver = new MutationObserver(() => {
    readPalette();
    applyBackground(pCur, true);
  });
  themeObserver.observe(root, { attributes: true, attributeFilter: ['data-event'] });

  /* --- Scroll ilerlemesi --- */
  let pTarget = 0;
  let pCur = 0;
  let lastStage = -1;
  const bgColor = new THREE.Color();

  function readProgress() {
    const rect = section.getBoundingClientRect();
    const scrollable = section.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return 0;
    return clamp(-rect.top / scrollable, 0, 1);
  }

  /* p (0..1) → aşama indeksi + aşama içi oran */
  function segment(p) {
    const raw = clamp(p, 0, 1) * (STAGE_COUNT - 1);
    const i = Math.min(Math.floor(raw), STAGE_COUNT - 2);
    return { i, t: smoothstep(clamp(raw - i, 0, 1)) };
  }

  function applyBackground(p, force) {
    const { i, t } = segment(p);

    /* Renk, aşamanın orta yarısında geçer: kenarlarda ton yerleşik kalır,
       krem ile mürekkep arasındaki çamurlu ara tonda daha az vakit geçirilir. */
    const tc = smoothstep(clamp((t - 0.25) / 0.5, 0, 1));
    bgColor.copy(palette.bg[i]).lerp(palette.bg[i + 1], tc);
    sticky.style.backgroundColor = '#' + bgColor.getHexString();

    /* Metin rengi aşama numarasına değil zeminin gerçek parlaklığına bağlanır;
       böylece geçişin ortasında da kontrast korunur ve on konsept paletinin
       hangisinin koyu olduğunu ayrıca bilmek gerekmez. */
    const lum = 0.2126 * bgColor.r + 0.7152 * bgColor.g + 0.0722 * bgColor.b;
    if (lum < 0.2) section.setAttribute('data-hero-dark', '');
    else section.removeAttribute('data-hero-dark');

    const l = lerp(palette.light[i], palette.light[i + 1], tc);
    ambient.intensity = l;
    key.intensity = KEY_BASE * (l / AMBIENT_BASE);

    const stage = Math.round(clamp(p, 0, 1) * (STAGE_COUNT - 1));
    if (force || stage !== lastStage) {
      lastStage = stage;
      section.setAttribute('data-hero-stage', String(stage));
      if (window.__hero3d) window.__hero3d.stage = stage;
    }
  }

  /* --- Sürükleme: sırayı yatayda ittirir, bırakınca yaylanarak döner --- */
  let dragX = 0;
  let dragTarget = 0;
  let dragging = false;
  let pointerId = null;
  let startX = 0;
  let startTarget = 0;

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    pointerId = e.pointerId;
    startX = e.clientX;
    startTarget = dragTarget;
    canvas.classList.add('is-dragging');
    canvas.setPointerCapture(pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    const dx = (e.clientX - startX) / (sticky.clientWidth || 1);
    dragTarget = clamp(startTarget + dx * 4.5, -2.2, 2.2);
  });
  function endDrag(e) {
    if (!dragging || (e && e.pointerId !== pointerId)) return;
    dragging = false;
    dragTarget = 0;
    canvas.classList.remove('is-dragging');
    if (pointerId !== null && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
    pointerId = null;
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', endDrag);

  /* --- Kare döngüsü --- */
  let running = false;
  let rafId = 0;
  let lastT = 0;
  let visible = false;

  function frame(now) {
    if (disposed) return;
    rafId = requestAnimationFrame(frame);
    const dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 0.016;
    lastT = now;

    /* Kare hızından bağımsız yumuşatma */
    pCur += (pTarget - pCur) * (1 - Math.exp(-6 * dt));
    dragX += (dragTarget - dragX) * (1 - Math.exp(-7 * dt));

    const { i, t } = segment(pCur);
    for (let c = 0; c < cards.length; c++) {
      const a = keyframes[c][i];
      const b = keyframes[c][i + 1];
      const m = cards[c].mesh;
      m.position.set(
        lerp(a.x, b.x, t) + dragX * (0.9 + c * 0.03),
        lerp(a.y, b.y, t),
        lerp(a.z, b.z, t)
      );
      m.rotation.set(
        lerp(a.rx, b.rx, t),
        lerp(a.ry, b.ry, t) + dragX * 0.32,
        lerp(a.rz, b.rz, t)
      );
      const s = lerp(a.s, b.s, t);
      m.scale.set(s, s, s);
    }

    /* Koyu aşamada öne çıkan kart yavaşça döner */
    const spin = clamp((pCur - 0.62) / 0.2, 0, 1) * clamp((0.94 - pCur) / 0.14, 0, 1);
    if (spin > 0) cards[HERO_CARD].mesh.rotation.y += spin * 0.25 * dt;

    applyBackground(pCur);
    renderer.render(scene, camera);
  }

  function start() {
    if (running || disposed) return;
    running = true;
    lastT = 0;
    rafId = requestAnimationFrame(frame);
    if (window.__hero3d) window.__hero3d.running = true;
  }
  function stop() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(rafId);
    if (window.__hero3d) window.__hero3d.running = false;
  }

  /* --- Olaylar --- */
  function onScroll() {
    pTarget = readProgress();
    if (visible) start();
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      layout();
      pTarget = readProgress();
      if (!running) renderer.render(scene, camera);
    }, 150);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (visible) start();
  });

  /* Hero ekrandan çıkınca döngü tamamen durur */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      visible = en.isIntersecting;
      if (visible && !document.hidden) start();
      else stop();
    });
  }, { threshold: 0 });
  io.observe(section);

  /* --- İlk kare: sahne hazır olmadan .hero3d-on eklenmez --- */
  pTarget = pCur = readProgress();
  applyBackground(pCur, true);
  renderer.render(scene, camera);

  sticky.insertBefore(canvas, sticky.querySelector('.lp-hero3d-front'));
  root.classList.add('hero3d-on');

  /* Sticky yükseklik sınıf eklendikten sonra oturur; ölçüleri tazele. */
  requestAnimationFrame(() => {
    if (disposed) return;
    layout();
    pTarget = pCur = readProgress();
    applyBackground(pCur, true);
    renderer.render(scene, camera);
    visible = true;
    start();
  });

  window.__hero3d = { stage: lastStage, running: false };

  /* Kurulum sonrası hata olursa sahneyi söküp statik hero'ya dönmek için */
  window.__hero3dTeardown = () => {
    disposed = true;
    stop();
    io.disconnect();
    themeObserver.disconnect();
    root.classList.remove('hero3d-on');
    canvas.remove();
    textures.forEach((t) => t.dispose());
    geometry.dispose();
    edgeMaterial.dispose();
    cards.forEach((c) => c.front.dispose());
    renderer.dispose();
  };
}

try {
  await init();
} catch (e) {
  disposed = true;
  document.documentElement.classList.remove('hero3d-on');
  const c = document.querySelector('.lp-hero3d-canvas');
  if (c) c.remove();
  if (renderer) { try { renderer.dispose(); } catch (e2) { /* yoksay */ } }
}
