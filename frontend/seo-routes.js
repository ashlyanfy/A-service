(() => {
  'use strict';
  const slugs = {
    install: ['montazh-i-demontazh-bankomatov', 'bankomattardy-ornatu-zhane-bolshekteu'],
    transport: ['perevozka-bankomatov', 'bankomattardy-tasymaldau'],
    dispose: ['utilizatsiya-bankomatov', 'bankomattardy-kadege-zharatu'],
    canopy: ['izgotovlenie-kozyrkov', 'bankomatka-kalqa-zhasau'],
    clean: ['naruzhnaya-moyka-bankomatov-i-terminalov', 'bankomattar-men-terminaldardyn-syrtyn-zhuu'],
    furniture: ['perevozka-bankovskoy-mebeli', 'bank-zhihazyn-tasymaldau'],
    paint: ['pokraska-i-brendirovanie-bankomatov','bankomattardy-boyau-zhane-brendteu'],
    rigging: ['takelazh-bankovskogo-oborudovaniya','bank-zhabdygyn-koteru-zhane-zhylzhytu'],
    terminal: ['montazh-i-demontazh-terminalov','terminaldardy-ornatu-zhane-bolshekteu'],
    'canopy-care': ['remont-kozyrkov','bankomat-kunqagarlaryn-zhondeu'],
    'furniture-pack': ['upakovka-bankovskoy-mebeli','bank-zhihazyn-qaptau']
  };
  window.bankHomeUrl = lang => lang === 'kk' ? '/kk/' : '/ru/';
  window.bankServiceUrl = (id, lang) => {
    if (!slugs[id]) return window.bankHomeUrl(lang) + '#services';
    return lang === 'kk' ? '/kk/qyzmetter/' + slugs[id][1] + '/' : '/ru/uslugi/' + slugs[id][0] + '/';
  };
  if (typeof document === 'undefined') return;
  // The shared root-relative base resolves images and downloads on nested routes.
  // Explicitly scope fragment links to this document so native anchor navigation stays here.
  if (!document.querySelector('base[href="/"]')) return;
  const fix = link => {
    const hash = link.getAttribute('href');
    if (hash?.startsWith('#')) link.setAttribute('href', location.pathname + location.search + hash);
  };
  document.querySelectorAll('a[href^="#"]').forEach(fix);
  new MutationObserver(changes => {
    for (const change of changes) {
      if (change.type === 'attributes') fix(change.target);
      else for (const node of change.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.tagName === 'A') fix(node);
        node.querySelectorAll('a[href^="#"]').forEach(fix);
      }
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['href'] });
})();
