/* A-SERVICE — общее поведение сайта.
   Заменяет React-рантайм прежней сборки: шапка, reveal-анимации,
   фоновое видео на главной, регистрация service worker. */
(function () {
  'use strict';

  var doc = document.documentElement;

  /* ---------------- Шапка: тень при прокрутке ---------------- */
  var header = document.querySelector('.site-header');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 48);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------------- Плавное появление блоков [data-reveal] ---------------- */
  var revealed = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealed.forEach(function (el) { el.classList.add('is-visible'); });
    doc.classList.add('motion-ready');
  } else {
    revealed.forEach(function (el, i) {
      el.classList.add('reveal-ready');
      el.style.setProperty('--reveal-order', String(i % 5));
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    revealed.forEach(function (el) { io.observe(el); });
    doc.classList.add('motion-ready');
  }

  /* ---------------- Мобильное меню: закрывать при переходе ---------------- */
  var mobileMenu = document.querySelector('details.mobile-menu');
  if (mobileMenu) {
    mobileMenu.addEventListener('click', function (e) {
      if (e.target.closest('a')) mobileMenu.removeAttribute('open');
    });
  }

  /* ---------------- Фоновое видео на главной ---------------- */
  var media = document.querySelector('.premium-hero-media');
  if (media && !reduceMotion) {
    var mobile = window.matchMedia('(max-width: 700px)').matches;
    var src = mobile ? '/video/a-service-hero-mobile-v2.mp4' : '/video/a-service-hero-desktop-v2.mp4';
    var poster = mobile ? '/images/a-service-hero-mobile-poster-v2.webp' : '/images/a-service-hero-desktop-poster-v2.webp';
    var video = document.createElement('video');
    video.className = 'premium-hero-video';
    video.src = src;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.poster = poster;
    video.setAttribute('aria-hidden', 'true');
    video.tabIndex = -1;
    video.addEventListener('canplay', function () { media.classList.add('is-ready'); });
    video.addEventListener('error', function () { media.classList.add('is-fallback'); });
    media.appendChild(video);

    var inView = false;
    function syncPlayback() {
      if (inView && document.visibilityState === 'visible') {
        video.play().catch(function () { media.classList.add('is-fallback'); });
      } else {
        video.pause();
      }
    }
    var vio = new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      syncPlayback();
    }, { threshold: 0.12 });
    vio.observe(video);
    document.addEventListener('visibilitychange', syncPlayback);
  }

  /* ---------------- Карусель фотоленты на главной ----------------
     Автопрокрутка каждые 2 секунды по кругу; перетаскивание мышью и пальцем;
     пауза при наведении, перетаскивании и в фоновой вкладке. */
  var carousel = document.querySelector('.experience-carousel');
  if (carousel && carousel.children.length > 1) {
    var slides = Array.prototype.slice.call(carousel.children);
    var paused = false;
    var timer = null;

    function slideStep() {
      return slides[1].offsetLeft - slides[0].offsetLeft;
    }
    function advance() {
      if (paused || document.visibilityState !== 'visible') return;
      var step = slideStep();
      var max = carousel.scrollWidth - carousel.clientWidth;
      if (carousel.scrollLeft >= max - 4) {
        carousel.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        carousel.scrollTo({ left: Math.min(carousel.scrollLeft + step, max), behavior: 'smooth' });
      }
    }
    if (!reduceMotion) {
      timer = setInterval(advance, 2000);
    }
    carousel.addEventListener('mouseenter', function () { paused = true; });
    carousel.addEventListener('mouseleave', function () { paused = false; });
    carousel.addEventListener('focusin', function () { paused = true; });
    carousel.addEventListener('focusout', function () { paused = false; });

    /* перетаскивание мышью (на тач-экранах работает нативный скролл) */
    var dragFrom = null;
    carousel.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      dragFrom = { x: e.clientX, left: carousel.scrollLeft };
      paused = true;
      carousel.classList.add('is-dragging');
      try { carousel.setPointerCapture(e.pointerId); } catch (err) { /* синтетические события */ }
    });
    carousel.addEventListener('pointermove', function (e) {
      if (dragFrom) carousel.scrollLeft = dragFrom.left - (e.clientX - dragFrom.x);
    });
    function endDrag(e) {
      if (!dragFrom) return;
      dragFrom = null;
      carousel.classList.remove('is-dragging');
      paused = carousel.matches(':hover');
      /* дотянуть до ближайшего слайда */
      var step = slideStep();
      var target = Math.round(carousel.scrollLeft / step) * step;
      carousel.scrollTo({ left: target, behavior: 'smooth' });
    }
    carousel.addEventListener('pointerup', endDrag);
    carousel.addEventListener('pointercancel', endDrag);
  }

  /* ---------------- PWA ---------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    }, { once: true });
  }
})();
