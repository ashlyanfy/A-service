(() => {
  'use strict';

  const additionalServices = [
    {
      id: 'paint',
      ru: {title: 'Покраска и брендирование банкоматов', short: 'Обновляем покрытие корпуса и наносим оформление по согласованному образцу.'},
      kk: {title: 'Банкоматтарды бояу және брендке сай безендіру', short: 'Корпус жабындысын жаңартып, келісілген үлгі бойынша фирмалық безендіруді орындаймыз.'}
    },
    {
      id: 'rigging',
      ru: {title: 'Такелаж банковского оборудования', short: 'Планируем подъём и перемещение тяжёлой техники с учётом её массы и проходов на объекте.'},
      kk: {title: 'Ауыр банк жабдығын көтеру және жылжыту', short: 'Жабдықтың салмағын және нысандағы өткелдердің өлшемін ескеріп, көтеру мен жылжытуды жоспарлаймыз.'}
    },
    {
      id: 'terminal',
      ru: {title: 'Монтаж и демонтаж платёжных терминалов', short: 'Устанавливаем терминал в согласованном месте или готовим к перемещению.'},
      kk: {title: 'Төлем терминалдарын орнату және бөлшектеу', short: 'Терминалды келісілген орынға орнатамыз немесе тасымалдауға дайындаймыз.'}
    },
    {
      id: 'canopy-care',
      ru: {title: 'Ремонт козырьков', short: 'Проверяем покрытие и крепления, согласуем восстановление повреждённых элементов.'},
      kk: {title: 'Күнқағарларды жөндеу', short: 'Жабыны мен бекітпелерін тексеріп, зақымдалған бөліктерін қалпына келтіру тәртібін келісеміз.'}
    },
    {
      id: 'furniture-pack',
      ru: {title: 'Упаковка мебели и имущества', short: 'Защищаем и маркируем мебель и её детали перед переездом отделения.'},
      kk: {title: 'Жиһаз бен мүлікті қаптау', short: 'Бөлімше көшкенде жиһаз бен оның бөлшектерін қорғайтын қаптамаға орап, таңбалаймыз.'}
    }
  ];

  const content = {
    ru: {
      more: 'Другие работы с оборудованием',
      add: 'Добавить в запрос',
      resources: 'Вопросы закупщика',
      download: 'Скачать шаблон Excel',
      entries: [
        {id: 'register', title: 'Как подготовить реестр объектов?', body: 'Скачайте пустой шаблон. Для каждого объекта укажите город, вид работ, оборудование, количество и удобное время. Заполненный файл можно передать менеджеру по согласованному каналу.'},
        {id: 'geography', title: 'В каких городах можно заказать работы?', body: 'Принимаем запросы по Алматы, Астане, Шымкенту, Караганде и Усть-Каменогорску. Для проекта в другом городе укажите его в запросе. Возможность выезда и график подтвердим для конкретных адресов.', links: [{title: 'Города обслуживания', href: '/ru/geografiya/'}]},
        {id: 'price', title: 'Как рассчитывается стоимость?', body: 'Учитываем количество и состояние оборудования, материалы, маршрут, этажность и время доступа. Для группы адресов удобно приложить реестр. Состав работ и цену закрепляем в коммерческом предложении.'},
        {id: 'handover', title: 'Как проходит сдача и приёмка?', body: 'До начала согласуем результат по каждому объекту и формат документов. При сдаче сверяем работы с реестром, фиксируем замечания и передаём согласованные материалы, например акт и фотоотчёт.'},
        {id: 'guides', title: "Инструкции по подготовке проекта", links: [
            {title: "Как составить реестр объектов", href: "/ru/blog/kak-podgotovit-reestr-obektov/"},
            {title: "Как выбрать объём покраски банкомата", href: "/ru/blog/polnaya-ili-chastichnaya-pokraska-bankomata/"},
            {title: "Как спланировать переезд отделения", href: "/ru/blog/kak-podgotovit-ofisnyy-pereezd/"},
            {title: "Что подготовить для замера козырька", href: "/ru/blog/kak-podgotovit-zamer-kozyrka/"},
            {title: "Как согласовать цвет по каталогу RAL", href: "/ru/kak-podobrat-tsvet-ral/"},
            {title: "Как подготовить демонтаж и перевозку банкомата", href: "/ru/demontazh-i-peremeshchenie-bankomata/"}
        ]}
      ]
    },
    kk: {
      more: 'Жабдықпен орындалатын басқа жұмыстар',
      add: 'Сұрауға қосу',
      resources: 'Сатып алушының сұрақтары',
      download: 'Excel үлгісін жүктеу',
      entries: [
        {id: 'register', title: 'Нысандар тізілімін қалай дайындауға болады?', body: 'Бос үлгіні жүктеп алыңыз. Әр нысанның қаласын, жұмыс түрін, жабдықты, санын және қолайлы уақытты көрсетіңіз. Толтырылған файлды менеджерге келісілген байланыс арнасы арқылы жібере аласыз.'},
        {id: 'geography', title: 'Қай қалаларда тапсырыс беруге болады?', body: 'Алматы, Астана, Шымкент, Қарағанды және Өскемен қалалары бойынша сұраулар қабылдаймыз. Нысан басқа қалада болса, оны сұрауда көрсетіңіз. Бару мүмкіндігі мен жұмыс кестесін әр мекенжай бойынша растаймыз.', links: [{title: 'Қызмет көрсетілетін қалалар', href: '/kk/geografiya/'}]},
        {id: 'price', title: 'Құны қалай есептеледі?', body: 'Жабдықтың саны мен жай-күйін, материалдарды, бағытты, қабатты және нысанға кіру уақытын ескереміз. Бірнеше мекенжай үшін тізілімді қоса жіберген ыңғайлы. Жұмыс көлемі мен бағасын коммерциялық ұсыныста көрсетеміз.'},
        {id: 'handover', title: 'Жұмысты тапсыру және қабылдау қалай өтеді?', body: 'Бастамас бұрын әр нысан бойынша күтілетін нәтижені және құжаттардың нысанын келісеміз. Тапсыру кезінде орындалған жұмысты тізіліммен салыстырып, ескертулерді тіркейміз және келісілген материалдарды, мысалы акт пен фотоесепті, береміз.'},
        {id: 'guides', title: "Жобаны дайындау нұсқаулықтары", links: [
            {title: "Нысандар тізілімін қалай жасауға болады?", href: "/kk/bilim-bazasy/nysandar-tizilimin-daiyndau/"},
            {title: "Банкоматты толық немесе ішінара бояуды қалай таңдауға болады?", href: "/kk/bilim-bazasy/bankomatty-tolyq-nemese-ishinara-boyau/"},
            {title: "Бөлімшенің көшуін қалай жоспарлауға болады?", href: "/kk/bilim-bazasy/ofis-koshuin-daiyndau/"},
            {title: "Күнқағарды өлшеуге не дайындау керек?", href: "/kk/bilim-bazasy/kalqa-olsheuin-daiyndau/"},
            {title: "RAL каталогы бойынша түсті қалай келісуге болады?", href: "/kk/ral-tusin-kalai-tandau/"},
            {title: "Банкоматты бөлшектеу мен тасымалдауға қалай дайындалу керек?", href: "/kk/bankomatty-demontazhdau-zhane-koshiru/"}
        ]}
      ]
    }
  };

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  function disclosure(key, title, expanded) {
    const detail = element('details', 'br-disclosure');
    detail.dataset.resourceKey = key;
    detail.open = expanded.has(key);
    detail.append(element('summary', 'br-summary', title));
    return detail;
  }

  const initializedHosts = new WeakSet();

  function update(hostId, lang, populate) {
    const host = document.getElementById(hostId);
    if (!host || (host.dataset.resourceLocale === lang && initializedHosts.has(host))) return;
    initializedHosts.add(host);
    const expanded = new Set(Array.from(host.querySelectorAll('details[open]'), node => node.dataset.resourceKey));
    host.replaceChildren(populate(expanded));
    host.dataset.resourceLocale = lang;
  }

  window.bankResourceCopy = content;
  window.bankExtraServices = additionalServices;
  window.renderBankResources = function renderBankResources(locale) {
    const lang = locale === 'kk' ? 'kk' : 'ru';
    const copy = content[lang];

    update('additional-services', lang, expanded => {
      const detail = disclosure('extras', copy.more, expanded);
      const list = element('ul', 'br-service-list');
      for (const service of additionalServices) {
        const item = element('li', 'br-service');
        const info = element('div', 'br-service-info');
        const {title, short} = service[lang];
        const heading = element('h3', 'br-service-title');
        const serviceLink = element('a', 'br-service-link', title);
        serviceLink.href = window.bankServiceUrl(service.id, lang);
        heading.append(serviceLink);
        info.append(heading, element('p', 'br-service-desc', short));
        const select = element('button', 'br-service-select', copy.add);
        select.type = 'button';
        select.setAttribute('aria-label', copy.add + ' — ' + title);
        select.addEventListener('click', () => window.openBankQuote(service.id));
        item.append(info, select);
        list.append(item);
      }
      detail.append(list);
      return detail;
    });

    update('procurement-resources', lang, expanded => {
      const section = element('section', 'br-faq');
      const heading = element('h3', 'br-faq-title', copy.resources);
      heading.id = 'br-faq-title';
      section.setAttribute('aria-labelledby', heading.id);
      const entries = element('div', 'br-faq-list');
      for (const entry of copy.entries) {
        const detail = disclosure(entry.id, entry.title, expanded);
        if (entry.id === 'geography') detail.id = 'service-geography';
        const body = element('div', 'br-body');
        if (entry.body) body.append(element('p', '', entry.body));
        if (entry.links) {
          const list = element('ul', 'br-guides');
          for (const guide of entry.links) {
            const item = element('li', '');
            const link = element('a', '', guide.title);
            link.href = guide.href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            item.append(link);
            list.append(item);
          }
          body.append(list);
        }
        if (entry.id === 'register') {
          const link = element('a', 'br-download', copy.download);
          link.href = '/assets/object-register-' + lang + '.xlsx';
          link.download = 'A-SERVICE-' + (lang === 'kk' ? 'nysandar' : 'reestr') + '.xlsx';
          body.append(link);
        }
        detail.append(body);
        entries.append(detail);
      }
      section.append(heading, entries);
      return section;
    });
  };
})();
