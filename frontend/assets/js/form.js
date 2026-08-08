/* A-SERVICE — анкета расчёта проекта.
   Трёхшаговый визард (Задача → Объекты → Контакты), диалог по кнопкам
   «Получить расчёт», подстановка подзадач по выбранной категории.
   Отправка — Netlify Forms (форма a-service-project-brief). */
(function () {
  'use strict';

  var LANG = document.documentElement.lang === 'kk' ? 'kk' : 'ru';

  /* Категории работ и подзадачи (перенесено из прежней React-сборки). */
  var CATEGORIES = [
    { value: 'atm-installation', ru: 'Монтаж и демонтаж банкоматов', kk: 'Банкоматтарды орнату және демонтаждау',
      details: [
        { value: 'installation', ru: 'Монтаж на объекте', kk: 'Нысанда орнату' },
        { value: 'dismantling', ru: 'Демонтаж с объекта', kk: 'Нысаннан демонтаждау' },
        { value: 'full-relocation', ru: 'Демонтаж и монтаж на новом объекте', kk: 'Демонтаж және жаңа нысанда орнату' },
        { value: 'site-preparation', ru: 'Подготовка площадки и инженерные работы', kk: 'Алаңды дайындау және инженерлік жұмыстар' }
      ] },
    { value: 'transport-rigging', ru: 'Перевозка и такелаж оборудования', kk: 'Жабдықты тасымалдау және такелаж',
      details: [
        { value: 'single-unit', ru: 'Перемещение одной единицы', kk: 'Бір жабдықты көшіру' },
        { value: 'batch', ru: 'Партийная перевозка', kk: 'Партиялық тасымалдау' },
        { value: 'heavy', ru: 'Сложный или тяжёлый такелаж', kk: 'Күрделі немесе ауыр такелаж' },
        { value: 'storage', ru: 'Перевозка с временным хранением', kk: 'Уақытша сақтаумен тасымалдау' }
      ] },
    { value: 'restoration-branding', ru: 'Покраска, восстановление и брендирование', kk: 'Бояу, қалпына келтіру және брендтеу',
      details: [
        { value: 'painting', ru: 'Полная или частичная покраска', kk: 'Толық немесе ішінара бояу' },
        { value: 'restoration', ru: 'Восстановление корпуса', kk: 'Корпусты қалпына келтіру' },
        { value: 'rebranding', ru: 'Ребрендинг партии оборудования', kk: 'Жабдық партиясын ребрендингтеу' },
        { value: 'ral', ru: 'Подбор и согласование RAL', kk: 'RAL түсін таңдау және келісу' }
      ] },
    { value: 'canopies', ru: 'Козырьки и защитные конструкции', kk: 'Қалқалар және қорғаныс конструкциялары',
      details: [
        { value: 'new', ru: 'Изготовление новой конструкции', kk: 'Жаңа конструкция жасау' },
        { value: 'installation', ru: 'Доставка и монтаж', kk: 'Жеткізу және монтаждау' },
        { value: 'repair', ru: 'Ремонт и восстановление', kk: 'Жөндеу және қалпына келтіру' },
        { value: 'dismantling', ru: 'Демонтаж конструкции', kk: 'Конструкцияны демонтаждау' }
      ] },
    { value: 'corporate-logistics', ru: 'Корпоративная логистика и переезды', kk: 'Корпоративтік логистика және көшу',
      details: [
        { value: 'office-move', ru: 'Переезд офиса или филиала', kk: 'Кеңсе немесе филиал көшіру' },
        { value: 'furniture', ru: 'Перевозка и сборка мебели', kk: 'Жиһазды тасымалдау және жинау' },
        { value: 'internal', ru: 'Внутреннее перемещение', kk: 'Ішкі көшіру' },
        { value: 'removal', ru: 'Вывоз согласованного объёма', kk: 'Келісілген көлемді шығару' }
      ] }
  ];

  var T = {
    back: { ru: 'Назад', kk: 'Артқа' },
    next: { ru: 'Продолжить', kk: 'Жалғастыру' },
    submit: { ru: 'Отправить задачу', kk: 'Міндетті жіберу' }
  };

  function initWizard(form) {
    var step = 1;
    var steps = form.querySelectorAll('.quote-step');
    var progress = form.querySelectorAll('.quote-progress li');
    var actions = form.querySelector('.quote-form-actions');
    if (!steps.length || !actions) return;

    var back = document.createElement('button');
    back.className = 'button button-secondary';
    back.type = 'button';
    back.textContent = T.back[LANG];
    var next = document.createElement('button');
    next.className = 'button button-primary';
    next.innerHTML = '<span class="label"></span> <span aria-hidden="true">→</span>';
    actions.innerHTML = '';
    actions.appendChild(back);
    actions.appendChild(next);

    function render() {
      steps.forEach(function (s, i) {
        var active = i + 1 === step;
        s.classList.toggle('is-active', active);
        s.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      progress.forEach(function (li, i) {
        li.className = i + 1 === step ? 'active' : (i + 1 < step ? 'done' : '');
        if (i + 1 === step) li.setAttribute('aria-current', 'step');
        else li.removeAttribute('aria-current');
      });
      back.style.visibility = step > 1 ? 'visible' : 'hidden';
      next.type = step < steps.length ? 'button' : 'submit';
      next.querySelector('.label').textContent = step < steps.length ? T.next[LANG] : T.submit[LANG];
    }

    function stepValid() {
      var current = form.querySelector('[data-form-step="' + step + '"]');
      var fields = current.querySelectorAll('input[required], select[required], textarea[required]');
      for (var i = 0; i < fields.length; i++) {
        if (!fields[i].reportValidity()) return false;
      }
      return true;
    }

    back.addEventListener('click', function () { step = Math.max(1, step - 1); render(); });
    next.addEventListener('click', function (e) {
      if (next.type === 'submit') return; // обычная отправка формы
      e.preventDefault();
      if (stepValid()) { step = Math.min(steps.length, step + 1); render(); }
    });

    /* категория → подзадачи */
    var select = form.querySelector('select[name="subtask"]');
    form.querySelectorAll('input[name="category"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        form.querySelectorAll('.quote-category-grid label').forEach(function (l) {
          l.classList.toggle('selected', l.contains(radio) && radio.checked);
        });
        var cat = CATEGORIES.find(function (c) { return c.value === radio.value; });
        if (cat && select) {
          select.innerHTML = '';
          cat.details.forEach(function (d) {
            var o = document.createElement('option');
            o.value = d.value;
            o.textContent = d[LANG];
            select.appendChild(o);
          });
        }
      });
    });

    render();
    return {
      setTask: function (text) {
        var area = form.querySelector('textarea[name="task"]');
        if (area && text) area.value = text;
      },
      setSource: function (value) {
        var hidden = form.querySelector('input[name="sourceService"]');
        if (hidden) hidden.value = value || '';
      }
    };
  }

  /* формы на страницах (Контакты, Запрос КП) */
  document.querySelectorAll('form.project-brief-form').forEach(function (form) {
    if (!form.closest('dialog')) initWizard(form);
  });

  /* диалог расчёта */
  var dialog = document.querySelector('dialog.quote-dialog');
  var dialogWizard = null;
  if (dialog) {
    dialogWizard = initWizard(dialog.querySelector('form.project-brief-form'));
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', function () {
      doc().classList.remove('quote-dialog-open');
    });
    var closeBtn = dialog.querySelector('.quote-dialog-close');
    if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
  }

  function doc() { return document.documentElement; }

  function openDialog(detail) {
    if (!dialog) return;
    if (dialogWizard) {
      dialogWizard.setSource((detail && detail.sourceService) || location.pathname);
      if (detail && detail.task) dialogWizard.setTask(detail.task);
    }
    if (!dialog.open) dialog.showModal();
    doc().classList.add('quote-dialog-open');
  }

  /* Любая кнопка «Получить расчёт/предложение» вне форм открывает диалог */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('button.button');
    if (!btn || btn.type === 'submit' || btn.closest('form') || btn.closest('dialog')) return;
    openDialog();
  });

  /* Быстрая заявка в hero главной страницы */
  var quick = document.querySelector('form.as-quick-request');
  if (quick) {
    quick.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = quick.querySelector('input');
      openDialog({ task: input ? input.value : '' });
    });
  }
})();
