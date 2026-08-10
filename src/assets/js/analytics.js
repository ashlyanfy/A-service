/* A-SERVICE — подробная аналитика для Google Analytics 4.
   Подключается сборкой только если задан ASERVICE_GA_ID (см. src/build.py).

   Базовый page_view отправляет сам gtag (с разрезами page_lang и page_section),
   здесь — что посетитель делает на странице:
     • клики по WhatsApp, телефону, почте, кнопкам, карточкам, меню;
     • переходы по внешним ссылкам и скачивание файлов;
     • анкета «Получить расчёт»: открытие, шаги, выбор категории, отправка;
     • глубина прокрутки и время на странице. */
(function () {
  'use strict';

  var CFG = window.AS_CONFIG || {};
  if (!CFG.gaId) return;

  // Пишем прямо в очередь dataLayer — так же, как это делает сам gtag.
  // Не зависим от того, успел ли определиться window.gtag: оптимизаторы
  // хостинга (например Cloudflare Rocket Loader) откладывают inline-скрипты,
  // и проверка на функцию раньше отключала весь сбор событий.
  window.dataLayer = window.dataLayer || [];

  function pushToDataLayer() {
    window.dataLayer.push(arguments);
  }

  var LANG = CFG.lang || (document.documentElement.lang === 'kk' ? 'kk' : 'ru');
  var SECTION = CFG.section || 'other';
  var PAGE = location.pathname;

  /* Значения параметров GA4 ограничены 100 символами. */
  function clip(value, limit) {
    var s = (value === null || value === undefined ? '' : String(value)).replace(/\s+/g, ' ').trim();
    return s.length > limit ? s.slice(0, limit) : s;
  }

  function track(name, params) {
    var payload = { page_path: PAGE, page_lang: LANG, page_section: SECTION };
    if (params) {
      for (var key in params) {
        if (Object.prototype.hasOwnProperty.call(params, key) && params[key] !== '') {
          payload[key] = params[key];
        }
      }
    }
    (window.gtag || pushToDataLayer)('event', name, payload);
  }

  /* Доступно другим скриптам (form.js шлёт события анкеты). */
  window.asTrackGA = track;

  /* ---------------- Где именно нажали: блок страницы */
  function blockOf(el) {
    var cms = el.closest('[data-block]');
    if (cms) return clip(cms.getAttribute('data-block'), 60);
    if (el.closest('dialog.quote-dialog')) return 'quote_dialog';
    if (el.closest('.whatsapp-float')) return 'floating_whatsapp';
    if (el.closest('.site-header')) return 'header';
    if (el.closest('.site-footer')) return 'footer';
    var section = el.closest('section');
    if (section) return clip(section.id || section.className.split(' ')[0] || 'section', 60);
    return 'page';
  }

  /* Подпись клика: у карточек берём заголовок, иначе весь текст блока попадёт в отчёт. */
  function labelOf(el) {
    var explicit = el.getAttribute('aria-label') || el.getAttribute('title');
    if (explicit) return clip(explicit, 100);
    var heading = el.querySelector ? el.querySelector('h1, h2, h3, h4, .service-card-title') : null;
    return clip(heading ? heading.textContent : el.textContent, 100);
  }

  /* ---------------- Клики */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('a, button') : null;
    if (!el) return;

    // Кнопки самой анкеты (Назад / Продолжить / Отправить / Закрыть) имеют
    // собственные события quote_step и generate_lead — как CTA их не считаем.
    if (el.closest('.quote-form-actions') || el.closest('.quote-dialog-close')) return;

    var anchor = el.tagName === 'A' ? el : null;
    var href = anchor ? (anchor.getAttribute('href') || '') : '';
    var common = { click_text: labelOf(el), click_block: blockOf(el) };

    if (/^tel:/i.test(href)) {
      common.link_url = clip(href.replace(/^tel:/i, ''), 100);
      track('call_click', common);
      return;
    }
    if (/wa\.me|api\.whatsapp\.com|whatsapp/i.test(href)) {
      common.link_url = clip(href, 100);
      track('whatsapp_click', common);
      return;
    }
    if (/^mailto:/i.test(href)) {
      common.link_url = clip(href.replace(/^mailto:/i, ''), 100);
      track('email_click', common);
      return;
    }

    var file = href.match(/\/([^\/?#]+\.(pdf|docx?|xlsx?|pptx?|csv|zip|rar))($|[?#])/i);
    if (file) {
      common.file_name = clip(file[1], 100);
      common.file_extension = file[2].toLowerCase();
      track('file_download', common);
      return;
    }

    if (anchor && anchor.hostname && anchor.hostname !== location.hostname) {
      common.link_url = clip(href, 100);
      common.link_domain = clip(anchor.hostname, 100);
      common.outbound = true;
      track('outbound_click', common);
      return;
    }

    if (el.closest('.language-switcher')) {
      common.language_to = clip(el.getAttribute('lang') || '', 10);
      track('language_switch', common);
      return;
    }

    if (el.closest('.desktop-nav') || el.closest('.mobile-menu-panel')) {
      common.link_url = clip(href, 100);
      common.nav_type = el.closest('.desktop-nav') ? 'desktop' : 'mobile';
      track('nav_click', common);
      return;
    }

    var card = el.closest('.service-card, .as-stage-card, .motion-card, .card-link');
    if (card) {
      common.link_url = clip(href, 100);
      track('card_click', common);
      return;
    }

    if (el.classList.contains('button') || el.closest('.button')) {
      common.link_url = clip(href, 100);
      common.cta_kind = el.className.indexOf('button-primary') >= 0 ? 'primary' : 'secondary';
      track('cta_click', common);
      return;
    }

    if (anchor && href && href.charAt(0) === '/') {
      common.link_url = clip(href, 100);
      track('link_click', common);
    }
  }, true);

  /* ---------------- Раскрытие вопросов FAQ (мобильное меню в шапке не считаем) */
  document.querySelectorAll('main details, .site-footer details').forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      var summary = item.querySelector('summary');
      track('faq_open', { faq_question: clip(summary ? summary.textContent : '', 100) });
    });
  });

  /* ---------------- Поиск по сайту */
  var searchForm = document.querySelector('.search-page form');
  if (searchForm) {
    searchForm.addEventListener('submit', function () {
      var input = searchForm.querySelector('input[type="search"]');
      track('search', { search_term: clip(input ? input.value : '', 100) });
    });
  }

  /* ---------------- Глубина прокрутки: 25 / 50 / 75 / 90 % */
  var MARKS = [25, 50, 75, 90];
  var reached = {};
  var maxPercent = 0;
  var scheduled = false;

  function measure() {
    scheduled = false;
    var root = document.documentElement;
    var scrollable = root.scrollHeight - root.clientHeight;
    if (scrollable <= 0) return;
    var offset = window.pageYOffset || root.scrollTop || 0;
    var percent = Math.round((offset / scrollable) * 100);
    if (percent > maxPercent) maxPercent = Math.min(percent, 100);
    MARKS.forEach(function (mark) {
      if (percent >= mark && !reached[mark]) {
        reached[mark] = true;
        track('scroll_depth', { percent_scrolled: mark });
      }
    });
  }

  // Троттлинг таймером, а не requestAnimationFrame: rAF не выполняется,
  // пока вкладка не отрисовывается, и замер бы потерялся.
  window.addEventListener('scroll', function () {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(measure, 200);
  }, { passive: true });

  /* ---------------- Время на странице (только активные секунды) */
  var activeMs = 0;
  var since = document.visibilityState === 'visible' ? Date.now() : 0;

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      since = Date.now();
    } else if (since) {
      activeMs += Date.now() - since;
      since = 0;
    }
  });

  var reported = false;
  function reportEngagement() {
    if (reported) return;
    reported = true;
    if (since) activeMs += Date.now() - since;
    track('page_engagement', {
      engagement_seconds: Math.round(activeMs / 1000),
      percent_scrolled: maxPercent
    });
  }

  window.addEventListener('pagehide', reportEngagement);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') reportEngagement();
  });
})();
