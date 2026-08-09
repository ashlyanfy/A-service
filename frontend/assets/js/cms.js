/* A-SERVICE — связка лендинга с админкой (admin.a-service.asia).
   1. Аналитика: просмотры страниц и клики по CTA уходят в собственный бэкенд.
   2. Контент: редактируемые блоки и SEO подтягиваются из админки поверх статики.
   3. Контакты: телефон/email на всех страницах обновляются из настроек CRM.
   Адрес API задаётся сборкой: window.AS_CONFIG.apiUrl. */
(function () {
  'use strict';

  var CONFIG = window.AS_CONFIG || {};
  var API = (CONFIG.apiUrl || '').replace(/\/$/, '');
  if (!API) return;

  var PAGE = location.pathname;

  /* ---------------- Идентификатор посетителя (случайный токен, без персональных данных) */
  function getVisitorId() {
    try {
      var id = localStorage.getItem('aservice_vid');
      if (!id) {
        id = (window.crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
        localStorage.setItem('aservice_vid', id);
      }
      return id;
    } catch (e) {
      return 'anon';
    }
  }

  function sendEvent(eventType) {
    try {
      fetch(API + '/public/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({ event_type: eventType, page: PAGE, visitor_id: getVisitorId() }),
      }).catch(function () {});
    } catch (e) { /* сеть недоступна — не мешаем сайту */ }
  }
  window.asSendEvent = sendEvent;
  window.asVisitorId = getVisitorId;

  /* ---------------- Посещаемость: одно событие на загрузку страницы */
  sendEvent('PAGE_VIEW');

  /* ---------------- Клики: WhatsApp и телефон */
  document.addEventListener('click', function (e) {
    var wa = e.target.closest('a[href*="wa.me"]');
    if (wa) sendEvent('WHATSAPP');
    var tel = e.target.closest('a[href^="tel:"]');
    if (tel) sendEvent('CALL');
  });

  function fetchJson(url) {
    return fetch(url, { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .catch(function () { return null; });
  }

  /* ---------------- SEO из админки (title / description / og) */
  function upsertMeta(selector, attr, value, content) {
    if (!content) return;
    var tag = document.head.querySelector(selector);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attr, value);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  }

  function applySeo(seo) {
    if (!seo) return;
    if (seo.title) {
      document.title = seo.title;
      upsertMeta('meta[property="og:title"]', 'property', 'og:title', seo.title);
    }
    if (seo.description) {
      upsertMeta('meta[name="description"]', 'name', 'description', seo.description);
      upsertMeta('meta[property="og:description"]', 'property', 'og:description', seo.description);
    }
    upsertMeta('meta[name="keywords"]', 'name', 'keywords', seo.keywords);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', seo.og_image);
  }

  /* ---------------- Контентные блоки поверх статики (data-block / data-field) */
  function setFieldValue(el, value) {
    if (value === undefined || value === null || value === '') return;
    if (el.tagName === 'IMG') { el.src = value; return; }
    el.textContent = '';
    String(value).split('\n').forEach(function (line, i) {
      if (i > 0) el.appendChild(document.createElement('br'));
      el.appendChild(document.createTextNode(line));
    });
  }

  function applyBlocks(page) {
    if (!page || !Array.isArray(page.blocks)) return;
    page.blocks.forEach(function (block) {
      var host = document.querySelector('[data-block="' + block.id + '"]');
      if (!host) return;
      Object.keys(block.data || {}).forEach(function (field) {
        var el = host.querySelector('[data-field="' + field + '"]');
        if (el) setFieldValue(el, block.data[field]);
      });
    });
  }

  /* ---------------- Контакты из настроек CRM */
  function applyContacts(contacts) {
    if (!contacts) return;
    var phone = contacts.contact_phone;
    var whatsapp = contacts.contact_whatsapp;
    var email = contacts.contact_email;

    if (phone) {
      var telHref = 'tel:' + phone.replace(/[^\d+]/g, '');
      document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
        a.setAttribute('href', telHref);
        if (/\d/.test(a.textContent)) a.textContent = phone;
      });
    }
    if (whatsapp) {
      document.querySelectorAll('a[href*="wa.me"]').forEach(function (a) {
        a.setAttribute('href', a.getAttribute('href').replace(/wa\.me\/\d+/, 'wa.me/' + whatsapp));
      });
    }
    if (email) {
      document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) {
        a.setAttribute('href', 'mailto:' + email);
        if (a.textContent.indexOf('@') !== -1) a.textContent = email;
      });
    }
  }

  Promise.all([
    fetchJson(API + '/public/seo' + PAGE),
    fetchJson(API + '/public/pages' + PAGE),
    fetchJson(API + '/public/contacts'),
  ]).then(function (results) {
    applySeo(results[0]);
    applyBlocks(results[1]);
    applyContacts(results[2]);
  });
})();
