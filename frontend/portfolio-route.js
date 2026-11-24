(() => {
  'use strict';

  const cases = new Set(['jusan', 'altyn', 'rigging', 'packing', 'batch', 'ral', 'serial', 'canopies']);
  window.bankCaseUrl = (id, locale = 'ru') => {
    if (id === 'atm-logistics') return locale === 'kk' ? '/kk/zhobalar/bankomattardy-tasymaldau/' : '/ru/proekty/perevozka-bankomatov/';
    if (id === 'atm-recess') return locale === 'kk' ? '/kk/zhobalar/bankomat-oyygyn-arleu/' : '/ru/proekty/otdelka-nishi-bankomata/';
    if (!cases.has(id)) return null;
    return (locale === 'kk' ? '/kk/zhobalar/' : '/ru/proekty/') + id + '/';
  };
  if (typeof document === 'undefined') return;

  function mountCase() {
    const root = document.querySelector('[data-portfolio-page]');
    if (!root) return;

    const host = root.querySelector('[data-case-request]');
    if (host && typeof window.mountBankRequest === 'function') {
      window.mountBankRequest(host, host.dataset.service || undefined);
    }

    const gallery = [...root.querySelectorAll('a[data-case-image]')];
    const dialog = root.querySelector('[data-case-dialog]');
    if (!gallery.length || !dialog || !dialog.showModal) return;

    const preview = dialog.querySelector('img');
    const caption = dialog.querySelector('figcaption');
    const counter = dialog.querySelector('[data-photo-count]');
    const close = dialog.querySelector('[data-photo-close]');
    let activeIndex = 0;
    let priorFocus;
    function show(index) {
      activeIndex = (index + gallery.length) % gallery.length;
      const target = gallery[activeIndex];
      const original = target.querySelector('img');
      preview.src = original.src;
      preview.alt = original.alt;
      caption.textContent = target.closest('figure').querySelector('figcaption').textContent;
      counter.textContent = (activeIndex + 1) + ' / ' + gallery.length;
    }
    gallery.forEach((link, index) => link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      priorFocus = link;
      show(index);
      dialog.showModal();
      close.focus();
    }));
    dialog.addEventListener('close', () => priorFocus?.focus({ preventScroll: true }));
    close.addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-photo-prev]')?.addEventListener('click', () => show(activeIndex - 1));
    dialog.querySelector('[data-photo-next]')?.addEventListener('click', () => show(activeIndex + 1));
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
    dialog.addEventListener('keydown', event => {
      if (gallery.length < 2) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); show(activeIndex + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); show(activeIndex - 1); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountCase, { once: true });
  else mountCase();
})();
