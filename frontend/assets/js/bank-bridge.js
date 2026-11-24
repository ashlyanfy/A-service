/* Основные банковские страницы используют ту же PWA, что и остальной сайт. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, { once: true });
}
