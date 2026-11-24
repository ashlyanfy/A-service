(() => {
  'use strict';

  const copy = {
    ru: {
      title: 'Оставить обращение', intro: 'Укажите, как с вами связаться. Менеджер уточнит задачу и ответит на вопросы.',
      contact: 'Телефон или электронная почта', placeholder: '+7 700 000 00 00 / name@bank.kz',
      service: 'Услуга', general: 'Общий вопрос', main: 'Основные услуги', extra: 'Дополнительные работы',
      more: 'Добавить комментарий', comment: 'Комментарий', commentHint: 'Например, какие работы нужны и в каком городе',
      send: 'Отправить обращение', sending: 'Отправляем…', retry: 'Повторить отправку', close: 'Закрыть', another: 'Новое обращение',
      invalid: 'Введите номер телефона с кодом страны или электронную почту.',
      failed: 'Не удалось подтвердить приём обращения. Проверьте соединение и попробуйте ещё раз.',
      rejected: 'Проверьте контактные данные и попробуйте ещё раз.',
      busy: 'Сейчас много обращений. Пожалуйста, попробуйте чуть позже.',
      thanks: 'Спасибо за обращение!', accepted: 'Ваша заявка принята. Мы свяжемся с вами в ближайшее время.', done: 'Хорошо',
    },
    kk: {
      title: 'Өтініш қалдыру', intro: 'Байланыс деректеріңізді қалдырыңыз. Менеджер қажетті жұмысты нақтылап, сұрақтарыңызға жауап береді.',
      contact: 'Телефон немесе электрондық пошта', placeholder: '+7 700 000 00 00 / name@bank.kz',
      service: 'Қызмет', general: 'Жалпы сұрақ', main: 'Негізгі қызметтер', extra: 'Қосымша жұмыстар',
      more: 'Пікір қосу', comment: 'Қосымша мәлімет', commentHint: 'Мысалы, қандай жұмыс қажет және қай қалада',
      send: 'Өтініш жіберу', sending: 'Жіберілуде…', retry: 'Қайта жіберу', close: 'Жабу', another: 'Жаңа өтініш',
      invalid: 'Телефон нөмірін ел кодымен немесе электрондық пошта мекенжайын енгізіңіз.',
      failed: 'Өтініштің қабылданғаны расталмады. Интернет байланысын тексеріп, қайта жіберіңіз.',
      rejected: 'Байланыс деректерін тексеріп, қайта жіберіңіз.',
      busy: 'Қазір өтініш көп. Біраз уақыттан кейін қайталап көріңіз.',
      thanks: 'Өтінішіңізге рақмет!', accepted: 'Өтінішіңіз қабылданды. Жақын арада сізбен хабарласамыз.', done: 'Жақсы',
    },
  };
  const states = new WeakMap();
  let nextId = 0;
  let dialog;
  let dialogHost;
  let returnFocus;
  let previousOverflow;

  const locale = () => document.documentElement.lang.toLowerCase().startsWith('kk') ? 'kk' : 'ru';
  const mainServices = () => window.bankServices || [];
  const extraServices = () => window.bankExtraServices || [];
  const serviceId = (id) => [...mainServices(), ...extraServices()].some(item => item.id === id) ? id : 'general';

  function reset(state) {
    Object.assign(state, { service: state.initial, contact: '', comment: '', expanded: false, result: 'ready', error: '', fingerprint: '', requestId: '', requestLocale: '', viewed: false });
  }

  function makeId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
  }

  function validContact(value) {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) return true;
    const digits = value.replace(/\D/g, '');
    return /^\+?[\d\s()-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
  }

  const pickerGroups = [
    { ru: 'Банкоматы и терминалы', kk: 'Банкоматтар мен терминалдар', ids: ['install', 'transport', 'terminal', 'rigging', 'clean', 'paint', 'dispose'], icon: '<rect x="3" y="2" width="14" height="16" rx="2"/><path d="M6 5h8v5H6zM6 13h3"/>' },
    { ru: 'Козырьки', kk: 'Күнқағарлар', ids: ['canopy', 'canopy-care'], icon: '<path d="M2 10 6 5h9l3 5H2Zm2 0v6m12-6v6"/>' },
    { ru: 'Мебель и переезд', kk: 'Жиһаз және көшіру', ids: ['furniture', 'furniture-pack'], icon: '<path d="M5 9V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4M4 9v5h12V9M4 12h12M6 14v3m8-3v3"/>' },
  ];
  let openPicker = null;
  // One set of document listeners serves both inline forms and dialogs.
  function dismissOutside(event) {
    if (openPicker && !openPicker.root.contains(event.target)) openPicker.close();
  }
  document.addEventListener('pointerdown', dismissOutside, true);
  document.addEventListener('focusin', dismissOutside);
  document.addEventListener('cancel', event => {
    if (openPicker?.root.closest('dialog') === event.target) {
      event.preventDefault();
      openPicker.close();
    }
  }, true);
  document.addEventListener('close', event => {
    if (openPicker?.root.closest('dialog') === event.target) openPicker.close();
  }, true);

  function fillServices(root, key, chosen, id) {
    if (openPicker && !openPicker.root.isConnected) openPicker.close();
    const field = root.querySelector('input');
    const trigger = root.querySelector('.bq-picker-trigger');
    const value = root.querySelector('.bq-picker-value');
    const list = root.querySelector('[role=listbox]');
    const items = new Map([...mainServices(), ...extraServices()].map(item => [item.id, item]));
    const options = [];
    let active = -1;
    let prefix = '';
    let typedAt = 0;

    function appendOption(parent, itemId, title) {
      const row = document.createElement('div');
      row.className = 'bq-picker-option';
      row.id = id + '-option-' + itemId;
      row.dataset.service = itemId;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', 'false');
      row.textContent = title;
      options.push(row);
      parent.append(row);
    }

    appendOption(list, 'general', copy[key].general);
    for (const group of pickerGroups) {
      const services = group.ids.map(itemId => items.get(itemId)).filter(Boolean);
      if (!services.length) continue;
      const section = document.createElement('div');
      section.className = 'bq-picker-group';
      section.setAttribute('role', 'group');
      section.setAttribute('aria-label', group[key]);
      const heading = document.createElement('div');
      heading.className = 'bq-picker-group-title';
      heading.setAttribute('aria-hidden', 'true');
      heading.innerHTML = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${group.icon}</svg>`;
      heading.append(document.createTextNode(group[key]));
      section.append(heading);
      for (const service of services) appendOption(section, service.id, (service[key] || service.ru).title);
      list.append(section);
    }

    function setValue(option) {
      field.value = option.dataset.service;
      value.textContent = option.textContent;
      for (const row of options) row.setAttribute('aria-selected', String(row === option));
    }

    function mark(index) {
      const option = options[index];
      if (active >= 0) options[active].classList.remove('is-active');
      active = index;
      option.classList.add('is-active');
      trigger.setAttribute('aria-activedescendant', option.id);
      // Scroll the list only. scrollIntoView can drag the surrounding dialog or page.
      const box = list.getBoundingClientRect();
      const item = option.getBoundingClientRect();
      if (item.bottom > box.bottom) list.scrollTop += item.bottom - box.bottom + 2;
      else if (item.top < box.top) list.scrollTop -= box.top - item.top + 2;
    }

    function close() {
      list.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      if (openPicker?.root === root) openPicker = null;
      prefix = '';
    }

    function open() {
      if (openPicker?.root === root || trigger.disabled) return;
      openPicker?.close();
      openPicker = { root, close };
      list.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      mark(Math.max(0, options.findIndex(row => row.dataset.service === field.value)));
    }

    function choose(index) {
      const previous = field.value;
      setValue(options[index]);
      close();
      if (field.value !== previous) field.dispatchEvent(new Event('change', { bubbles: true }));
    }

    setValue(options.find(row => row.dataset.service === chosen) || options[0]);
    trigger.addEventListener('click', () => {
      if (list.hidden) { trigger.focus({ preventScroll: true }); open(); }
      else close();
    });
    list.addEventListener('mousedown', event => {
      if (event.target.closest('[role=option]')) event.preventDefault();
    });
    list.addEventListener('click', event => {
      const row = event.target.closest('[role=option]');
      if (!row || trigger.disabled) return;
      choose(options.indexOf(row));
      trigger.focus({ preventScroll: true });
    });
    trigger.addEventListener('keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      const k = event.key;
      if (k === 'Tab') { close(); return; }
      if (k === 'Escape') {
        if (!list.hidden) { event.preventDefault(); event.stopPropagation(); close(); }
        return;
      }
      if (k === 'Enter' || k === ' ') {
        event.preventDefault();
        if (list.hidden) open(); else choose(active);
        return;
      }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(k)) {
        event.preventDefault();
        open();
        if (k === 'Home') mark(0);
        if (k === 'End') mark(options.length - 1);
        if (k === 'ArrowDown') mark(Math.min(active + 1, options.length - 1));
        if (k === 'ArrowUp') mark(Math.max(0, active - 1));
        return;
      }
      if (k.length !== 1) return;
      event.preventDefault();
      open();
      const now = Date.now();
      const char = k.toLocaleLowerCase(key);
      prefix = now - typedAt < 700 ? prefix + char : char;
      typedAt = now;
      const needle = [...prefix].every(c => c === char) ? char : prefix;
      for (let offset = 1; offset <= options.length; offset++) {
        const index = (active + offset) % options.length;
        if (options[index].textContent.toLocaleLowerCase(key).startsWith(needle)) { mark(index); break; }
      }
    });
  }

  function updateFeedback(host, state) {
    const t = copy[state.locale];
    const form = host.querySelector('form');
    const error = form.querySelector('.bq-error');
    const busy = state.result === 'sending';
    error.textContent = state.error ? t[state.error] : '';
    form.elements.contact.setAttribute('aria-invalid', String(state.error === 'invalid'));
    form.setAttribute('aria-busy', String(busy));
    if (busy && openPicker && form.contains(openPicker.root)) openPicker.close();
    for (const control of form.elements) control.disabled = busy;
    form.querySelector('[type=submit]').textContent = busy ? t.sending : state.result === 'failed' ? t.retry : t.send;
  }

  function receiptMarkup(id, t, action, label) {
    return `<div class="bq-receipt">
      <div class="bq-receipt-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="m7 16 6 6 12-13" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <h2 id="${id}-title" tabindex="-1">${t.thanks}</h2>
      <p id="${id}-message">${t.accepted}</p>
      <button class="bq-receipt-done" type="button" ${action}>${label}</button>
    </div>`;
  }

  function showInlineReceipt(host, state) {
    // Keep a later response from interrupting another form the visitor has already opened.
    if (!host.isConnected || document.querySelector('dialog[open]')) return;
    const popup = document.createElement('dialog');
    const id = state.id + '-receipt';
    const t = copy[state.locale];
    popup.className = 'bq-dialog bq-dialog-receipt';
    popup.setAttribute('aria-labelledby', id + '-title');
    popup.setAttribute('aria-describedby', id + '-message');
    popup.innerHTML = receiptMarkup(id, t, 'data-receipt-done', t.done);
    popup.addEventListener('click', event => {
      if (event.target.closest('[data-receipt-done]')) popup.close();
      else if (event.target === popup) {
        const box = popup.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) popup.close();
      }
    });
    popup.addEventListener('close', () => {
      popup.remove();
      if (!host.isConnected || states.get(host) !== state) return;
      reset(state);
      render(host, state);
      if (!document.querySelector('dialog[open]')) host.querySelector('[type="submit"]').focus({preventScroll:true});
    }, { once: true });
    document.body.append(popup);
    popup.showModal();
    popup.querySelector('h2').focus({preventScroll:true});
  }

  function render(host, state, focus = false) {
    state.locale = locale();
    const t = copy[state.locale];
    const id = state.id;
    const close = host === dialogHost ? `<button class="bq-close" type="button" data-bq-close aria-label="${t.close}"><span aria-hidden="true"></span></button>` : '';
    if (host === dialogHost) {
      dialog.setAttribute('aria-labelledby', id + '-title');
      const accepted = state.result === 'accepted';
      dialog.classList.toggle('bq-dialog-receipt', accepted);
      if (accepted) dialog.setAttribute('aria-describedby', id + '-message');
      else dialog.removeAttribute('aria-describedby');
    }
    if (state.result === 'accepted') {
      host.innerHTML = host === dialogHost
        ? receiptMarkup(id, t, 'data-bq-close', t.done)
        : `<div class="bq-inline-confirmed"><h2 id="${id}-title" tabindex="-1">${t.thanks}</h2><p>${t.accepted}</p>
            <button type="button" class="bq-secondary" data-bq-reset>${t.another}</button></div>`;
    } else {
      host.innerHTML = `<h2 id="${id}-title" tabindex="-1">${t.title}</h2>${close}<p class="bq-intro">${t.intro}</p>
        <form class="bq-form" action="/api/requests" method="post" novalidate>
          <label class="bq-field"><span>${t.contact}</span><input name="contact" type="text" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="254" placeholder="${t.placeholder}" required aria-describedby="${id}-error"></label>
          <div class="bq-field bq-picker"><span id="${id}-service-label">${t.service}</span>
            <input type="hidden" name="service"><button type="button" class="bq-picker-trigger" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}-services" aria-labelledby="${id}-service-label ${id}-service-value"><span class="bq-picker-value" id="${id}-service-value"></span></button>
            <div class="bq-picker-list" id="${id}-services" role="listbox" aria-labelledby="${id}-service-label" hidden></div>
          </div>
          <details class="bq-details"><summary>${t.more}</summary><label class="bq-field"><span>${t.comment}</span><textarea name="comment" rows="2" maxlength="1000" placeholder="${t.commentHint}"></textarea></label></details>
          <p class="bq-error" id="${id}-error" role="alert"></p>
          <button class="bq-submit" type="submit">${t.send}</button>
        </form>`;
      const form = host.querySelector('form');
      fillServices(form.querySelector('.bq-picker'), state.locale, state.service, state.id);
      form.elements.contact.value = state.contact;
      form.elements.comment.value = state.comment;
      const details = form.querySelector('details');
      details.open = state.expanded || !!state.comment;
      details.addEventListener('toggle', () => { if (details.isConnected) state.expanded = details.open; });
      updateFeedback(host, state);
    }
    if (focus) host.querySelector('h2').focus({ preventScroll: true });
  }

  async function submit(host, state, event) {
    event.preventDefault();
    if (state.result === 'sending' || state.result === 'accepted') return;
    const form = event.target;
    state.contact = form.elements.contact.value.trim();
    state.comment = form.elements.comment.value.trim();
    state.service = serviceId(form.elements.service.value);
    if (!validContact(state.contact)) {
      state.error = 'invalid';
      updateFeedback(host, state);
      form.elements.contact.focus();
      return;
    }
    const payload = { service: state.service, contact: state.contact, comment: state.comment };
    const fingerprint = JSON.stringify(payload);
    if (state.fingerprint !== fingerprint) {
      state.requestId = makeId();
      state.fingerprint = fingerprint;
      state.requestLocale = state.locale;
    }
    payload.locale = state.requestLocale;
    payload.requestId = state.requestId;
    payload.sourcePage = location.pathname;
    if (window.asVisitorId) payload.visitorId = window.asVisitorId();
    state.result = 'sending';
    state.error = '';
    updateFeedback(host, state);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch((window.AS_CONFIG?.apiUrl || '') + '/api/requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload), signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.accepted === true) {
        state.result = 'accepted';
        window.asTrackGA?.('generate_lead', { quote_category: state.service, form_place: host === dialogHost ? 'dialog' : 'page' });
        state.viewed = host !== dialogHost || dialog.open;
        state.contact = state.comment = state.fingerprint = state.requestId = '';
        // An unfinished request can be accepted after the visitor closed its dialog.
        render(host, state, host === dialogHost && dialog.open);
        if (host !== dialogHost) showInlineReceipt(host, state);
        return;
      }
      state.error = response.status === 429 ? 'busy' : response.status === 400 || response.status === 422 ? 'rejected' : 'failed';
    } catch {
      state.error = 'failed';
    } finally {
      clearTimeout(timer);
    }
    state.result = 'failed';
    updateFeedback(host, state);
  }

  function mountBankRequest(host, initialId) {
    if (!host) return;
    const initial = serviceId(initialId);
    let state = states.get(host);
    if (state) {
      if (state.initial !== initial && state.result !== 'sending') {
        state.initial = initial;
        if (state.result === 'accepted') reset(state);
        else { state.service = initial; state.error = ''; }
        render(host, state);
      } else if (state.locale !== locale()) render(host, state);
      return;
    }
    state = { id: 'bank-request-' + (++nextId), initial, locale: locale() };
    reset(state);
    states.set(host, state);
    host.classList.add('bq-request-box');
    host.setAttribute('data-bank-request', '');
    host.addEventListener('submit', event => submit(host, state, event));
    const changed = (event) => {
      if (state.result === 'sending') return;
      const field = event.target;
      if (!['contact', 'service', 'comment'].includes(field.name)) return;
      state[field.name] = field.value;
      if (state.result === 'failed' || state.error) {
        state.result = 'ready';
        state.error = '';
        updateFeedback(host, state);
      }
    };
    host.addEventListener('input', changed);
    host.addEventListener('change', changed);
    host.addEventListener('click', event => {
      if (event.target.closest('[data-bq-close]')) { dialog?.close(); return; }
      if (event.target.closest('[data-bq-reset]')) { reset(state); render(host, state, true); }
    });
    render(host, state);
  }

  function ensureDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.className = 'bq-dialog';
    dialogHost = document.createElement('div');
    dialog.append(dialogHost);
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.style.overflow = previousOverflow;
      if (returnFocus?.isConnected && !document.querySelector('dialog[open]')) returnFocus.focus({ preventScroll: true });
    });
    document.body.append(dialog);
  }

  window.mountBankRequest = mountBankRequest;
  window.openBankQuote = (initialId, comment) => {
    ensureDialog();
    const prior = states.get(dialogHost);
    if (prior?.result === 'accepted' && prior.viewed) { reset(prior); render(dialogHost, prior); }
    if (prior?.result === 'accepted') prior.viewed = true;
    else mountBankRequest(dialogHost, initialId);
    if (comment && !prior?.contact && states.get(dialogHost)?.result === 'ready') {
      const state = states.get(dialogHost);
      state.comment = String(comment).slice(0, 1000);
      state.expanded = true;
      render(dialogHost, state);
    }
    if (!dialog.open) {
      window.asSendEvent?.('QUOTE_OPEN');
      window.asTrackGA?.('quote_open', { quote_source: location.pathname });
      returnFocus = document.activeElement;
      previousOverflow = document.body.style.overflow;
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    }
    dialogHost.querySelector('h2').focus({ preventScroll: true });
  };
  new MutationObserver(() => {
    for (const host of document.querySelectorAll('[data-bank-request]')) {
      const state = states.get(host);
      if (state && state.locale !== locale()) render(host, state);
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
