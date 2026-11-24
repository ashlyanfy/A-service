(() => {
  'use strict';

  const video = document.getElementById('hero-film-video');
  const toggle = document.getElementById('hero-film-toggle');
  if (!video || !toggle || !video.canPlayType('video/mp4')) return;

  const labels = {
    ru: { pause: 'Пауза', play: 'Включить', pauseFull: 'Приостановить фоновое видео', playFull: 'Включить фоновое видео' },
    kk: { pause: 'Кідірту', play: 'Қосу', pauseFull: 'Фондық видеоны кідірту', playFull: 'Фондық видеоны қосу' },
  };
  const mobile = matchMedia('(max-width: 600px) and (orientation: portrait)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const hero = video.closest('.hero');
  const controlLabel = toggle.querySelector('.hero-film-label');
  let preference = 'auto';
  let blocked = false;
  let pending = false;
  let turn = 0;
  let startAt = 0;
  const bounds = hero.getBoundingClientRect();
  let inView = bounds.bottom > 0 && bounds.top < window.innerHeight;

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = true;
  toggle.setAttribute('aria-controls', video.id);

  function mayPlay() {
    const requested = preference === 'play' || (preference === 'auto' && !motion.matches);
    return requested && !blocked && inView && !document.hidden;
  }

  function updateControl() {
    const playing = pending || !video.paused;
    const t = labels[document.documentElement.lang.toLowerCase().startsWith('kk') ? 'kk' : 'ru'];
    const name = playing ? t.pauseFull : t.playFull;
    toggle.dataset.playing = String(playing);
    toggle.title = name;
    toggle.setAttribute('aria-label', name);
    controlLabel.textContent = playing ? t.pause : t.play;
  }

  function updatePoster() {
    video.poster = mobile.matches ? '/assets/hero-mobile-poster.webp' : '/assets/hero-poster.webp';
  }

  function sync() {
    if (!mayPlay()) {
      turn++;
      pending = false;
      if (!video.paused) video.pause();
      updateControl();
      return;
    }

    const src = mobile.matches ? '/video/a-service-hero-mobile-v2.mp4' : '/video/a-service-hero-desktop-v2.mp4';
    if (video.getAttribute('src') !== src || video.error) {
      startAt = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      video.classList.remove('has-film-frame');
      video.src = src;
      pending = false;
    } else if (pending || !video.paused) {
      updateControl();
      return;
    }

    const attempt = ++turn;
    pending = true;
    updateControl();
    const promise = video.play();
    if (promise) promise.catch(() => {
      if (turn !== attempt) return;
      blocked = true;
      pending = false;
      updateControl();
    });
  }

  video.addEventListener('loadedmetadata', () => {
    if (startAt > 0 && Number.isFinite(video.duration)) {
      video.currentTime = Math.min(startAt, Math.max(0, video.duration - .1));
    }
    startAt = 0;
  });
  video.addEventListener('playing', () => {
    pending = false;
    if (!mayPlay()) video.pause();
    else video.classList.add('has-film-frame');
    updateControl();
  });
  video.addEventListener('pause', updateControl);
  video.addEventListener('error', () => {
    blocked = true;
    pending = false;
    if (!video.paused) video.pause();
    video.classList.remove('has-film-frame');
    updateControl();
  });

  toggle.addEventListener('click', () => {
    const wasPlaying = pending || !video.paused;
    preference = wasPlaying ? 'pause' : 'play';
    blocked = false;
    sync();
  });

  // Re-evaluate the visible label when the site switches between Russian and Kazakh.
  new MutationObserver(updateControl).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      sync();
    }).observe(hero);
  } else {
    window.addEventListener('scroll', () => {
      const box = hero.getBoundingClientRect();
      const visible = box.bottom > 0 && box.top < window.innerHeight;
      if (visible !== inView) { inView = visible; sync(); }
    }, { passive: true });
  }

  document.addEventListener('visibilitychange', sync);
  mobile.addEventListener('change', () => { blocked = false; updatePoster(); sync(); });
  motion.addEventListener('change', () => {
    if (motion.matches && preference !== 'pause') preference = 'auto';
    blocked = false;
    sync();
  });

  updatePoster();
  updateControl();
  toggle.hidden = false;
  sync();
})();
