(() => {
  'use strict';

  const ui = {
    ru: {
      group: { all: 'Все', bank: 'Банки', logistics: 'Логистика', workshop: 'Мастерская', canopy: 'Козырьки' },
      named: 'Банковский проект', practice: 'Рабочая практика', photos: 'Фотоподборка', seePhotos: 'Смотреть фотографии', archive: 'Все материалы',
      hide: 'Свернуть каталог', reveal: 'Развернуть каталог', open: 'Открыть проект', material: 'Смотреть материал',
      filters: 'Фильтр материалов', task: 'Задача', work: 'Что сделали', result: 'Результат',
      source: 'Исходная публикация A-SERVICE', close: 'Закрыть', previous: 'Предыдущее фото', next: 'Следующее фото',
      gallery: 'Фотографии', quote: 'Обсудить похожую задачу', logo: 'Логотип банка'
    },
    kk: {
      group: { all: 'Барлығы', bank: 'Банктер', logistics: 'Логистика', workshop: 'Шеберхана', canopy: 'Қалқалар' },
      named: 'Банк жобасы', practice: 'Жұмыс тәжірибесі', photos: 'Фототоптама', seePhotos: 'Фотоларды көру', archive: 'Барлық материал',
      hide: 'Каталогты жию', reveal: 'Каталогты ашу', open: 'Жобаны ашу', material: 'Материалды көру',
      filters: 'Материалдар сүзгісі', task: 'Міндет', work: 'Атқарылған жұмыс', result: 'Нәтиже',
      source: 'A-SERVICE жарияланымы', close: 'Жабу', previous: 'Алдыңғы фото', next: 'Келесі фото',
      gallery: 'Фотосуреттер', quote: 'Ұқсас жұмысты талқылау', logo: 'Банк логотипі'
    }
  };
  const paths = {
    arrow: 'M4 12h15m-6-6 6 6-6 6', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
    close: 'M6 6l12 12M18 6 6 18', back: 'M15 5l-7 7 7 7', next: 'M9 5l7 7-7 7'
  };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => (
    {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]
  ));
  const icon = id => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + paths[id] + '"/></svg>';
  const getCases = () => window.portfolioCases || [];
  const getHref = (id, locale) => window.bankCaseUrl?.(id, locale)
    || (locale === 'kk' ? '/kk/zhobalar/' : '/ru/proekty/') + encodeURIComponent(id) + '/';

  function getCover(item, locale) {
    if (item.photoReport) {
      const images = item[locale].images.slice(0, 2);
      return '<span class="pf-compare-cover">' + images.map(image => '<span><img src="' + escape(image.src)
        + '" alt="" loading="lazy" decoding="async"><b>' + escape(image.stage) + '</b></span>').join('') + '</span>';
    }
    if (item.id === 'ral') {
      const label = locale === 'kk' ? 'Реңкті таңдау' : 'Подбор оттенка';
      return '<span class="pf-ral-print" aria-hidden="true"><b>RAL 6018</b><span>' + label + '</span></span>';
    }
    return '<img src="' + escape(item.cover) + '" alt="" loading="lazy" decoding="async">';
  }

  function storyTile(item, locale) {
    const text = ui[locale];
    const record = item[locale];
    const title = '<h3>' + escape(record.title) + '</h3>';
    const label = record.galleryTitle ? text.seePhotos : item.group === 'bank' ? text.open : text.material;
    const kind = record.galleryTitle ? text.photos : item.group === 'bank' ? text.named : text.practice;
    return '<a class="pf-tile" href="' + escape(getHref(item.id, locale)) + '" data-pf-id="' + escape(item.id) + '">'
      + '<div class="pf-cover' + (item.logoCover ? ' pf-logo' : '') + '">' + getCover(item, locale) + '</div>'
      + '<div class="pf-copy"><div class="pf-kind">' + escape(kind) + '</div>' + title
      + (record.meta ? '<p class="pf-meta">' + escape(record.meta) + '</p>' : '')
      + '<span class="pf-read">' + escape(label) + icon('arrow') + '</span></div></a>';
  }

  function portfolioMarkup(locale, expanded = true, group = 'all') {
    const text = ui[locale === 'kk' ? 'kk' : 'ru'];
    const cases = getCases();
    if (!cases.length) return '';
    const lead = cases.find(item => item.group === 'bank' && !item.logoCover) || cases[0];
    const supporting = [
      cases.find(item => item.group === 'logistics'),
      cases.find(item => item.group === 'canopy') || cases.find(item => item.group === 'workshop')
    ].filter(item => item && item !== lead);
    const archiveLabel = text.archive + ' (' + cases.length + ')';
    const groupButtons = Object.entries(text.group).filter(([key]) => key === 'all' || cases.some(item => item.group === key))
      .map(([key, label]) => '<button type="button" class="pf-filter" data-pf-group="' + key + '" aria-pressed="' + (group === key) + '">' + escape(label) + '</button>').join('');
    const featured = [lead, ...supporting];
    const ordered = [...featured, ...cases.filter(item => !featured.includes(item))];
    const visible = expanded ? ordered.filter(item => group === 'all' || item.group === group) : featured;
    const entries = visible.map(item => '<li>' + storyTile(item, locale) + '</li>').join('');
    return '<div class="pf-bar"><button class="pf-toggle" id="pf-toggle" type="button" aria-controls="pf-index" aria-expanded="' + expanded
      + '" aria-label="' + escape(archiveLabel + '. ' + (expanded ? text.hide : text.reveal)) + '"><span>' + escape(archiveLabel) + '</span>' + icon(expanded ? 'minus' : 'plus') + '</button>'
      + (expanded ? '<div class="pf-filters" role="group" aria-label="' + escape(text.filters) + '">' + groupButtons + '</div>' : '') + '</div>'
      + '<ul id="pf-index" class="pf-grid" aria-live="polite">' + entries + '</ul>';
  }

  window.bankPortfolioMarkup = lang => portfolioMarkup(lang === 'kk' ? 'kk' : 'ru');

  if (typeof document === 'undefined') return;
  let locale = 'ru';
  let expanded = true;
  let group = 'all';
  let boundRoot;

  function renderListing() {
    const root = document.getElementById('portfolio-root');
    if (!root || !getCases().length) return;
    root.innerHTML = portfolioMarkup(locale, expanded, group);
    if (boundRoot !== root) {
      root.addEventListener('click', onListingClick);
      boundRoot = root;
    }
  }

  function onListingClick(event) {
    if (event.target.closest('#pf-toggle')) {
      expanded = !expanded;
      group = 'all';
      renderListing();
      document.getElementById('pf-toggle').focus({preventScroll:true});
      if (expanded || !inViewport(document.getElementById('pf-toggle'))) {
        document.getElementById('portfolio-root').scrollIntoView({block:'start'});
      }
      return;
    }
    const filter = event.target.closest('[data-pf-group]');
    if (filter) {
      group = filter.dataset.pfGroup;
      renderListing();
      boundRoot.querySelector('[data-pf-group="' + group + '"]').focus({preventScroll:true});
    }
  }

  function inViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
  }

  function followLegacyUrl() {
    if (!location.hash.startsWith('#project-')) return;
    // Old bookmarks have ASCII case ids; unknown fragments remain available to the browser.
    const id = location.hash.slice(9);
    if (getCases().some(item => item.id === id)) location.replace(getHref(id, locale));
  }

  window.addEventListener('hashchange', followLegacyUrl);
  window.renderBankPortfolio = newLocale => {
    locale = newLocale === 'kk' ? 'kk' : 'ru';
    renderListing();
    followLegacyUrl();
  };
})();
