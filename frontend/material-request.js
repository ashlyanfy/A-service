(() => {
  'use strict';

  const copy = {
    ru: {
      title: 'Запросить профиль компании', lead: 'Укажите email и имя. Менеджер отправит вам PDF с услугами и контактами A-SERVICE.',
      name: 'Имя для связи', email: 'Рабочая почта', phone: 'Телефон', phoneMore: 'Добавить телефон',
      placeholderName: 'Ваше имя', placeholderEmail: 'name@bank.kz', placeholderPhone: '+7 700 000 00 00',
      send: 'Отправить запрос', wait: 'Отправляем запрос…', retry: 'Повторить', close: 'Закрыть',
      nameError: 'Укажите имя для связи.', emailError: 'Проверьте адрес электронной почты.', phoneError: 'Проверьте номер, включая код страны.',
      failed: 'Не удалось подтвердить приём запроса. Проверьте соединение и повторите попытку.',
      busy: 'Сейчас много запросов. Пожалуйста, попробуйте чуть позже.', rejected: 'Проверьте контактные данные и повторите попытку.',
      thanks: 'Спасибо, запрос принят!', next: 'Менеджер рассмотрит запрос и отправит профиль компании на указанную вами почту.',
    },
    kk: {
      title: 'Компания таныстырылымын сұрату', lead: 'Атыңыз бен электрондық поштаңызды көрсетіңіз. Менеджер сізге A-SERVICE қызметтері мен байланыс деректері жазылған PDF файлын жібереді.',
      name: 'Есіміңіз', email: 'Жұмыс поштасы', phone: 'Телефон', phoneMore: 'Телефон нөмірін қосу',
      placeholderName: 'Есіміңізді жазыңыз', placeholderEmail: 'name@bank.kz', placeholderPhone: '+7 700 000 00 00',
      send: 'Сұрау жіберу', wait: 'Сұрау жіберіліп жатыр…', retry: 'Қайта жіберу', close: 'Жабу',
      nameError: 'Есіміңізді жазыңыз.', emailError: 'Электрондық пошта мекенжайын тексеріңіз.', phoneError: 'Телефон нөмірін ел кодымен бірге тексеріңіз.',
      failed: 'Сұраудың қабылданғаны расталмады. Интернет байланысын тексеріп, қайта жіберіңіз.',
      busy: 'Қазір сұрау көп. Біраз уақыттан кейін қайталап көріңіз.', rejected: 'Байланыс деректерін тексеріп, қайта жіберіңіз.',
      thanks: 'Рақмет, сұрауыңыз қабылданды!', next: 'Менеджер сұрауыңызды қарап, компания таныстырылымын көрсеткен поштаңызға жібереді.',
    },
  };
  const language = () => document.documentElement.lang.toLowerCase().startsWith('kk') ? 'kk' : 'ru';
  const fresh = () => ({ name: '', email: '', phone: '', expanded: false, mode: 'ready', error: '', locale: language(), fingerprint: '', requestId: '', requestLocale: '', viewed: false });
  let state = fresh();
  let dialog;
  let host;
  let previousFocus;
  let previousOverflow;

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = b[6] & 15 | 64;
    b[8] = b[8] & 63 | 128;
    const hex = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
  }

  function errorField() {
    if (!state.name || state.name.length > 100) return 'name';
    if (state.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(state.email)) return 'email';
    const digits = state.phone.replace(/\D/g, '');
    if (state.phone && (state.phone.length > 40 || !/^\+?[\d\s()-]+$/.test(state.phone) || digits.length < 7 || digits.length > 15)) return 'phone';
    return '';
  }

  function refresh() {
    const t = copy[state.locale];
    const form = host.querySelector('form');
    const busy = state.mode === 'sending';
    form.setAttribute('aria-busy', String(busy));
    for (const control of form.elements) control.disabled = busy;
    for (const field of ['name', 'email', 'phone']) form.elements.namedItem(field).setAttribute('aria-invalid', String(state.error === field + 'Error'));
    form.querySelector('.bq-error').textContent = state.error ? t[state.error] : '';
    form.querySelector('[type=submit]').textContent = busy ? t.wait : state.mode === 'failed' ? t.retry : t.send;
  }

  function draw(focusTitle = false) {
    state.locale = language();
    const t = copy[state.locale];
    const close = `<button type="button" class="bq-close" data-material-close aria-label="${t.close}"><span aria-hidden="true"></span></button>`;
    if (state.mode === 'accepted') {
      host.innerHTML = `<div class="bq-success mr-success" role="status"><span class="bq-success-mark" aria-hidden="true"></span><h2 id="material-request-title" tabindex="-1">${t.thanks}</h2><p>${t.next}</p></div>${close}<button type="button" class="bq-secondary" data-material-close>${t.close}</button>`;
    } else {
      host.innerHTML = `<h2 id="material-request-title" tabindex="-1">${t.title}</h2>${close}<p class="bq-intro">${t.lead}</p>
        <form class="bq-form mr-form" method="post" action="/api/material-requests" novalidate>
          <label class="bq-field"><span>${t.email}</span><input name="email" type="email" autocomplete="email" autocapitalize="none" autocorrect="off" inputmode="email" spellcheck="false" maxlength="254" required placeholder="${t.placeholderEmail}" aria-describedby="material-request-error"></label>
          <label class="bq-field"><span>${t.name}</span><input name="name" type="text" autocomplete="name" maxlength="100" required placeholder="${t.placeholderName}" aria-describedby="material-request-error"></label>
          <details class="bq-details mr-phone-extra"><summary>${t.phoneMore}</summary><label class="bq-field"><span>${t.phone}</span><input name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="40" placeholder="${t.placeholderPhone}" aria-describedby="material-request-error"></label></details>
          <p class="bq-error" id="material-request-error" role="alert"></p><button class="bq-submit" type="submit">${t.send}</button></form>`;
      const form = host.querySelector('form');
      for (const key of ['email', 'name', 'phone']) form.elements.namedItem(key).value = state[key];
      const details = form.querySelector('details');
      details.open = state.expanded || !!state.phone;
      details.addEventListener('toggle', () => { if (details.isConnected) state.expanded = details.open; });
      refresh();
    }
    if (focusTitle) host.querySelector('h2').focus({ preventScroll: true });
  }

  async function submit(event) {
    event.preventDefault();
    if (state.mode === 'sending' || state.mode === 'accepted') return;
    const form = event.target;
    for (const key of ['email', 'name', 'phone']) state[key] = form.elements.namedItem(key).value.trim();
    const invalid = errorField();
    if (invalid) {
      state.error = invalid + 'Error';
      if (invalid === 'phone') form.querySelector('details').open = true;
      refresh();
      form.elements.namedItem(invalid).focus();
      return;
    }
    const payload = { name: state.name, email: state.email, phone: state.phone };
    const fingerprint = JSON.stringify(payload);
    if (state.fingerprint !== fingerprint) {
      state.requestId = uuid();
      state.requestLocale = state.locale;
      state.fingerprint = fingerprint;
    }
    payload.requestId = state.requestId;
    payload.locale = state.requestLocale;
    payload.sourcePage = location.pathname;
    if (window.asVisitorId) payload.visitorId = window.asVisitorId();
    state.error = '';
    state.mode = 'sending';
    refresh();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch((window.AS_CONFIG?.apiUrl || '') + '/api/material-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload), signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.accepted === true) {
        window.asTrackGA?.('profile_request', { document_lang: state.requestLocale });
        state = { ...fresh(), mode: 'accepted', viewed: dialog.open };
        draw(dialog.open);
        return;
      }
      state.error = response.status === 429 ? 'busy' : response.status === 400 || response.status === 422 ? 'rejected' : 'failed';
    } catch {
      state.error = 'failed';
    } finally {
      clearTimeout(timer);
    }
    state.mode = 'failed';
    refresh();
  }

  function create() {
    dialog = document.createElement('dialog');
    dialog.className = 'bq-dialog mr-dialog';
    dialog.id = 'material-request-dialog';
    dialog.setAttribute('aria-labelledby', 'material-request-title');
    host = document.createElement('div');
    host.className = 'bq-request-box mr-box';
    dialog.append(host);
    host.addEventListener('submit', submit);
    host.addEventListener('input', (event) => {
      const field = event.target;
      if (state.mode === 'sending' || !['email', 'name', 'phone'].includes(field.name)) return;
      state[field.name] = field.value;
      if (state.error) { state.mode = 'ready'; state.error = ''; refresh(); }
    });
    dialog.addEventListener('click', e => {
      if (e.target.closest('[data-material-close]')) { dialog.close(); return; }
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    });
    document.body.append(dialog);
    new MutationObserver(() => { if (dialog.open && state.locale !== language()) draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  window.openMaterialRequest = () => {
    if (!dialog) create();
    if (dialog.open) return;
    if (state.mode === 'accepted') {
      if (state.viewed) state = fresh();
      else state.viewed = true;
    }
    previousFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    draw();
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    host.querySelector('h2').focus({ preventScroll: true });
  };
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-material-request]');
    if (trigger) { event.preventDefault(); window.openMaterialRequest(); }
  });
})();
