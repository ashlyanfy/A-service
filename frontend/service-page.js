(() => {
  'use strict';

  const root = window.document?.documentElement;
  const query = root ? new URLSearchParams(window.location.search) : null;
  const locale = (root?.dataset.service ? root.lang : query?.get('lang') || root?.lang) === 'kk' ? 'kk' : 'ru';
  const serviceId = root?.dataset.service || query?.get('service') || '';
  const service = [...(window.bankServices || []), ...(window.bankExtraPageServices || [])].find(item => item.id === serviceId);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => (
    {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]
  ));
  const el = id => document.getElementById(id);
  const home = lang => window.bankHomeUrl?.(lang) || './?lang=' + lang;
  function serviceUrl(lang) {
    if (!service) return home(lang) + '#services';
    return window.bankServiceUrl?.(service.id, lang)
      || 'service-page.html?service=' + encodeURIComponent(service.id) + '&lang=' + lang;
  }

  const i18n = {
    ru: {
      skip:'К содержанию', nav:'Навигация', language:'Язык', menu:'Открыть меню',
      services:'Услуги', projects:'Портфолио', procurement:'Для закупок', contacts:'Контакты',
      back:'Все услуги', quote:'Запросить расчёт', process:'Как проходит работа', toProcess:'Состав работ',
      result:'Что получает банк', inputs:'Что нужно для расчёта', practice:'Из практики A-SERVICE',
      hardware:'Банковское оборудование', equipment:'Банкоматы', infrastructure:'Инфраструктура отделений', office:'Переезд отделения',
      ill:'Иллюстрация услуги', unavailable:'Услуга не найдена', choose:'Выбрать услугу',
      contact:'Контакт по проектам', person:'Азиз Асылжанов', phone:'Позвонить', country:'Казахстан'
    },
    kk: {
      skip:'Мазмұнға өту', nav:'Навигация', language:'Тіл', menu:'Мәзірді ашу',
      services:'Қызметтер', projects:'Портфолио', procurement:'Сатып алу бөліміне', contacts:'Байланыс',
      back:'Барлық қызметтер', quote:'Баға сұрату', process:'Жұмыс қалай өтеді', toProcess:'Жұмыс құрамы',
      result:'Банк алатын нәтиже', inputs:'Бағаны есептеуге қажетті деректер', practice:'A-SERVICE тәжірибесінен',
      hardware:'Банк жабдығы', equipment:'Банкоматтар', infrastructure:'Бөлімше инфрақұрылымы', office:'Бөлімшені көшіру',
      ill:'Қызметтің иллюстрациясы', unavailable:'Қызмет табылмады', choose:'Қызметті таңдау',
      contact:'Жоба бойынша байланыс', person:'Азиз Асылжанов', phone:'Қоңырау шалу', country:'Қазақстан'
    }
  };
  const t = i18n[locale];
  const pages = {
    install: {
      ru:['Проверяем объект','Согласуем время','Устанавливаем или демонтируем'],
      kk:['Нысанды тексереміз','Уақытын келісеміз','Орнатамыз немесе бөлшектейміз'],
      art:[['atm','ruler'],['calendar','clock'],['atm','tool']],
      practice:['rigging','Подъём банкомата к месту установки','Банкоматты орнатылатын жерге көтеру']
    },
    transport: {
      ru:['Проверяем маршрут','Защищаем оборудование','Доставляем и передаём'],
      kk:['Бағытты тексереміз','Жабдықты қорғаймыз','Жеткізіп, тапсырамыз'],
      art:[['truck','pin'],['atm','shield'],['truck','signed']],
      practice:['packing','Упаковка оборудования перед перевозкой','Тасымал алдында жабдықты қаптау']
    },
    dispose: {
      ru:['Сверяем перечень','Согласуем документы','Передаём по реестру'],
      kk:['Тізімді тексереміз','Құжаттарды келісеміз','Тізім бойынша тапсырамыз'],
      art:[['atm','list'],['paper','signed'],['truck','recycle']]
    },
    canopy: {
      ru:['Снимаем размеры','Утверждаем эскиз','Изготавливаем козырёк'],
      kk:['Өлшемін аламыз','Нобайды келісеміз','Күнқағарды дайындаймыз'],
      art:[['roof','ruler'],['roof','pencil'],['roof','tool']],
      practice:['canopies','Изготовление и монтаж защитного козырька','Қорғаныш күнқағарды жасау және орнату']
    },
    clean: {
      ru:['Осматриваем поверхности','Выбираем время','Моем корпус и протираем экран'],
      kk:['Сыртқы беттерін қараймыз','Уақытын келісеміз','Корпусын жуып, экранын сүртеміз'],
      art:[['atm','lens'],['calendar','pin'],['atm','shine']]
    },
    furniture: {
      ru:['Проверяем адреса и доступ','Готовим мебель к переезду','Доставляем и расставляем'],
      kk:['Мекенжайлар мен кіру жолын тексереміз','Жиһазды көшуге дайындаймыз','Жеткізіп, орналастырамыз'],
      art:[['desk','pin'],['desk','box'],['truck','floor']]
    },
    paint: {
      ru:['Оцениваем покрытие','Утверждаем цвет','Обновляем корпус'],
      kk:['Жабындыны бағалаймыз','Түсті келісеміз','Корпусты жаңартамыз'],
      art:[['atm','lens'],['atm','swatch'],['atm','brush']],
      practice:['jusan','Обновление банкоматов Jusan Bank','Jusan Bank банкоматтарын жаңарту']
    },
    rigging: {
      ru:['Осматриваем путь','Планируем подъём','Перемещаем технику'],
      kk:['Жолды тексереміз','Көтеруді жоспарлаймыз','Жабдықты жылжытамыз'],
      art:[['atm','ruler'],['crane','pin'],['crane','signed']],
      practice:['rigging','Подъём банкомата к месту установки','Банкоматты орнатылатын жерге көтеру']
    },
    terminal: {
      ru:['Проверяем площадку','Согласуем доступ','Монтируем или снимаем'],
      kk:['Алаңды тексереміз','Кіру тәртібін келісеміз','Орнатамыз немесе шешеміз'],
      art:[['terminal','ruler'],['calendar','pin'],['terminal','tool']],
      practice:['rigging','Перемещение банкомата внутри объекта','Банкоматты нысан ішінде жылжыту']
    },
    'canopy-care': {
      ru:['Осматриваем повреждения','Согласуем восстановление','Ремонтируем конструкцию'],
      kk:['Зақымдануды тексереміз','Қалпына келтіруді келісеміз','Құрылымды жөндейміз'],
      art:[['roof','lens'],['paper','list'],['roof','tool']]
    },
    'furniture-pack': {
      ru:['Осматриваем предметы','Выбираем защиту','Упаковываем и маркируем'],
      kk:['Заттарды қарап шығамыз','Қорғаныш материалын таңдаймыз','Қаптап, белгі қоямыз'],
      art:[['desk','lens'],['desk','shield'],['crate','tag']]
    }
  };

  const heroPhotos = {
    dispose:['Списанные банкоматы подготовлены к передаче','Есептен шығарылған банкоматтар тапсыруға дайындалған'],
    clean:['Специалист протирает экран банкомата','Маман банкомат экранын сүртіп жатыр'],
    furniture:['Подготовка офисного имущества к переезду','Кеңсе мүлкін көшуге дайындау'],
    paint:['Корпуса терминалов после окраски в мастерской','Шеберханада боялған терминал корпустары'],
    rigging:['Подъём банкомата краном','Банкоматты кранмен көтеру'],
    terminal:['Банкомат перемещают к месту установки на гидравлической тележке','Банкоматты гидравликалық арбамен орнатылатын жерге жеткізу'],
    'canopy-care':['Работы с креплениями козырька','Күнқағар бекітпелерімен жұмыс'],
    'furniture-pack':['Подготовка офисной мебели к переезду','Кеңсе жиһазын көшіруге дайындау']
  };
  const archival = new Set(['paint','terminal','rigging']);

  const workPhotos = {
    install: [
      ['install-crane-winter', 'Подъём банкомата краном', 'Банкоматты кранмен көтеру', 'Жёлтый банкомат на стропах крана на фоне зимней стройки', 'Қысқы құрылыс алаңының жанында кранмен көтеріліп жатқан сары банкомат'],
      ['install-green-hoist', 'Банкомат у лестницы', 'Баспалдақ жанындағы банкомат', 'Зелёный банкомат под крюком подъёмника у лестничной площадки', 'Баспалдақ алаңының жанындағы көтергіш ілмегінің астында тұрған жасыл банкомат'],
      ['install-facing', 'Монтаж наружного оформления', 'Сыртқы қаптаманы орнату', 'Специалист придерживает зелёное обрамление встраиваемого банкомата', 'Маман қабырғаға кіріктірілген банкоматтың жасыл жақтауын ұстап тұр'],
      ['install-yellow-lift', 'Перемещение банкомата на стропах', 'Банкоматты көтергіш белдіктермен жылжыту', 'Жёлтый банкомат подвешен на стропах рядом с бортом грузовика', 'Жүк көлігінің жанындағы көтергіш белдіктерге ілінген сары банкомат']
    ],
    transport: [
      ['transport-pallet', 'Банкомат закреплён на поддоне', 'Тұғырға бекітілген банкомат', 'Банкомат Bereke Bank на поддоне в кузове, корпус обёрнут плёнкой и стянут ремнями', 'Көлік шанағындағы тұғырға қойылған Bereke Bank банкоматы үлдірмен оралып, белдіктермен бекітілген'],
      ['transport-padding', 'Защита корпуса в кузове', 'Көлік шанағындағы корпусты қорғау', 'Под крепёжным ремнём на зелёном банкомате установлены мягкие прокладки', 'Жасыл банкоматтың бекіту белдігінің астына жұмсақ төсемдер қойылған'],
      ['transport-truck', 'Партия банкоматов перед перевозкой', 'Тасымалдауға дайын банкоматтар', 'Три упакованных банкомата закреплены в кузове, рядом гидравлическая тележка', 'Оралған үш банкомат көлік шанағына бекітілген, жанында гидравликалық арба тұр']
    ],
    canopy: [
      ['canopy-yellow', 'Козырёк уличного банкомата', 'Сырттағы банкоматтың күнқағары', 'Жёлтый козырёк с боковой панелью и логотипом Alatau City Bank у фасада', 'Ғимарат қасбетіндегі Alatau City Bank логотипі бар, бүйір панельді сары күнқағар'],
      ['canopy-pair', 'Два банкомата под козырьками', 'Күнқағар астындағы екі банкомат', 'Два банкомата Halyk с козырьками и боковыми информационными панелями', 'Күнқағарлары мен бүйірлік ақпараттық панельдері бар екі Halyk банкоматы']
    ]
  };
  const photoPath = photo => '/assets/work-photos/' + photo[0] + '.webp';
  window.bankServiceCover = id => workPhotos[id] ? photoPath(workPhotos[id][0]) : '/assets/service-art/' + id + '.webp';
  const galleryLabels = {
    ru: {name:'Фотографии с объектов',prev:'Предыдущее фото',next:'Следующее фото',pause:'Приостановить показ',play:'Продолжить показ'},
    kk: {name:'Нысандардан түсірілген фотолар',prev:'Алдыңғы фото',next:'Келесі фото',pause:'Көрсетілімді кідірту',play:'Көрсетілімді жалғастыру'}
  };

  // The left drawing identifies the work object; the right drawing depicts the action.
  const objects = {
    crane:'<path d="M3 51h48m-43-1V14l36-8 8 8H9m4 7 6-6m-6 13 12-14m14 3v11a5 5 0 1 1-5 5"/><path d="m25 46 10-9 12 9m-23 1h25"/>',
    terminal:'<path d="M22 5h21l-1 19-5 6 5 20H14l6-22-3-4z"/><path d="m23 10 14 0-1 10H22zm-1 17h10m-12 7h4m-5 9h15"/>',
    crate:'<path d="m6 18 25-12 25 12v24L31 54 6 42zM7 19l24 12 23-12M31 31v23M18 13l25 12v11"/>',
    atm:'<rect x="13" y="5" width="39" height="49" rx="4"/><path d="M17 45h31M14 50h38"/><rect x="20" y="11" width="24" height="13" rx="2"/><path d="M21 29h10m5 0h6m-21 8h18"/>',
    truck:'<rect x="3" y="13" width="35" height="29" rx="2"/><path d="M38 23h11l10 13v7h-6M38 41h5M5 42H2m15 1h21m5-15v7h13"/><circle cx="12" cy="44" r="5"/><circle cx="48" cy="44" r="5"/><path d="M9 20h21m-21 6h14"/>',
    calendar:'<rect x="8" y="10" width="46" height="42" rx="4"/><path d="M17 6v9m28-9v9M9 22h44M17 29h6m8 0h5m8 0h3M17 37h6m8 0h5m8 0h3"/>',
    paper:'<path d="M14 4h28l10 10v41H14zM41 5v11h10"/><path d="M22 23h22m-22 7h22m-22 7h12m-12 8h8"/>',
    roof:'<path d="m4 25 11-14h36l9 14ZM4 25h56v5H4zM9 31v21m45-21v21M9 41l10-10m34 10L43 31"/><rect x="25" y="36" width="13" height="16" rx="1.5"/><path d="M28 40h7"/>',
    desk:'<path d="M2 30h47v5H2zM7 36v13m37-13v13M16 29v-6m-6 0h12"/><rect x="7" y="6" width="21" height="15" rx="2"/><path d="M49 38h8l3-12m-8 13v9m-5 3 5-3 6 3"/>'
  };
  const actions = {
    swatch:'<path d="M6 4h11v29H6zM17 12l8-5 6 8-14 12m1-4 14-3 2 10-16 4"/><path d="M7 13h9m-9 8h9"/><circle cx="11" cy="28" r="1"/>',
    brush:'<path d="m20 5 13 9-8 11-13-9zM11 16l13 9-3 3-5-3-6 9a3 3 0 0 1-5-3l7-9-4-3Z"/>',
    ruler:'<path d="M4 30 28 6l8 8-24 24Z"/><path d="m24 10 4 4m-8 0 3 3m-8 1 4 4m-8 1 3 3"/>',
    clock:'<circle cx="20" cy="22" r="14"/><path d="M20 12v11l7 4"/>',
    tool:'<path d="M9 33 22 20a9 9 0 0 0 11-11l-6 6-5-1-1-5 6-6a9 9 0 0 0-11 11L4 27a4 4 0 0 0 5 6Z"/>',
    pin:'<path d="M31 16c0 9-12 21-12 21S7 25 7 16a12 12 0 1 1 24 0Z"/><circle cx="19" cy="16" r="4"/>',
    shield:'<path d="m19 4 13 5v9c0 9-7 15-13 18C13 33 6 27 6 18V9Z"/><path d="m12 20 5 5 10-12"/>',
    signed:'<rect x="6" y="5" width="25" height="30" rx="2"/><path d="M12 12h13m-13 5h8m-8 8 4 4 10-11"/>',
    list:'<rect x="5" y="5" width="29" height="30" rx="2"/><path d="M11 12h1m5 0h10m-16 8h1m5 0h10m-16 8h1m5 0h8"/>',
    recycle:'<path d="m13 13 4-7a3 3 0 0 1 5 0l5 9m-7-2 7 2 2-7M29 20l4 7a3 3 0 0 1-3 5H20m5-5-5 5 5 5M14 32H7a3 3 0 0 1-3-5l5-9m2 7-2-7-7 2"/>',
    pencil:'<path d="m6 31 3-9L26 5a3 3 0 0 1 4 0l3 3a3 3 0 0 1 0 4L16 29 6 32Zm4-9 6 6m8-20 6 6M7 36h25"/>',
    lens:'<circle cx="16" cy="16" r="11"/><path d="m24 25 10 10m-24-20a6 6 0 0 1 6-5"/>',
    tag:'<path d="M4 8h15l15 15-12 12L4 17z"/><circle cx="11" cy="13" r="2"/><path d="m16 23 6-6m-3 9 6-6m-1 1 4 4"/>',
    shine:'<path d="M20 3c1 9 4 12 12 13-8 1-11 5-12 13-1-8-4-12-12-13 8-1 11-4 12-13Zm10 22c1 4 2 5 6 6-4 1-5 2-6 6-1-4-2-5-6-6 4-1 5-2 6-6Z"/>',
    box:'<path d="m4 12 15-8 15 8v15l-15 8-15-8zM4 12l15 8 15-8M19 20v15M12 8l15 8v6"/>',
    floor:'<path d="M5 5h28v29H5zM5 19h13m0-14v9m6 8h9m-13 4v8"/><path d="M10 10h3m11 0h5m-3 16h4"/>'
  };
  function scene(pair) {
    const [object, action] = pair;
    return '<svg class="sp-scene" viewBox="0 0 144 72" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<g transform="translate(8 7)" stroke="#685880" stroke-width="1.8">' + objects[object] + '</g>'
      + '<path d="M71 38h13" stroke="#ad9ac7" stroke-dasharray="2 4" stroke-width="1.8"/>'
      + '<g transform="translate(91 16)" stroke="#5538a9" stroke-width="2">' + actions[action] + '</g></svg>';
  }
  const svg = (content, box = 24) => '<svg aria-hidden="true" viewBox="0 0 ' + box + ' ' + box + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + content + '</svg>';
  const arrow = svg('<path d="M4 12h15m-6-6 6 6-6 6"/>');
  const down = svg('<path d="M12 4v15m-6-6 6 6 6-6"/>');
  const playerIcons = {
    prev:svg('<path d="m14 6-6 6 6 6"/>'), next:svg('<path d="m10 6 6 6-6 6"/>'),
    pause:svg('<path d="M9 6v12m6-12v12" stroke-width="2.5"/>'), play:svg('<path d="m9 5 10 7-10 7z"/>')
  };

  function heroFigure(id, lang) {
    const photos = workPhotos[id];
    if (!photos) {
      const caption = heroPhotos[id][lang === 'kk' ? 1 : 0];
      const label = archival.has(id) ? (lang === 'kk' ? 'A-SERVICE мұрағаты' : 'Архив A-SERVICE') : i18n[lang].ill;
      return '<figure class="sp-hero-art" data-service-art="' + id + '"><img id="service-hero-image" width="840" height="600" src="' + window.bankServiceCover(id) + '" alt="' + esc(caption) + '" fetchpriority="high">'
        + '<figcaption>' + esc(label) + '</figcaption></figure>';
    }
    const labels = galleryLabels[lang];
    const titleIndex = lang === 'kk' ? 2 : 1;
    const images = photos.map((photo, i) => {
      const src = photoPath(photo);
      return '<div class="sp-photo-slide" data-caption="' + esc(photo[titleIndex]) + '" aria-hidden="' + (i !== 0) + '" style="--sp-image:url(' + src + ')">'
        + '<img ' + (i === 0 ? 'id="service-hero-image" fetchpriority="high"' : 'loading="lazy"') + ' decoding="async" src="' + src + '" alt="' + esc(photo[titleIndex + 2]) + '"></div>';
    }).join('');
    const control = key => '<button type="button" data-gallery-action="' + key + '" aria-label="' + labels[key] + '" title="' + labels[key] + '">' + playerIcons[key] + '</button>';
    return '<figure class="sp-work-gallery" data-work-gallery aria-label="' + labels.name + '"><div class="sp-photo-stage">' + images + '</div>'
      + '<figcaption class="sp-photo-bar"><span class="sp-photo-number" aria-hidden="true"><b>1</b> / ' + photos.length + '</span>'
      + '<span class="sp-photo-caption" aria-live="off">' + esc(photos[0][titleIndex]) + '</span><span class="sp-photo-controls" hidden>'
      + control('prev') + control('pause') + control('next') + '</span></figcaption></figure>';
  }

  function mountGallery(gallery, lang) {
    if (!gallery) return;
    const labels = galleryLabels[lang];
    const slides = [...gallery.querySelectorAll('.sp-photo-slide')];
    const caption = gallery.querySelector('.sp-photo-caption');
    const number = gallery.querySelector('.sp-photo-number b');
    const toggle = gallery.querySelector('[data-gallery-action="pause"]');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = motion.matches;
    let onscreen = false;
    let current = 0;
    let wanted = 0;
    let revision = 0;
    let timer;

    function schedule() {
      clearTimeout(timer);
      if (!paused && onscreen && !document.hidden) timer = setTimeout(() => move(1), 5000);
    }
    function setPaused(value) {
      paused = value;
      const action = paused ? 'play' : 'pause';
      toggle.innerHTML = playerIcons[action];
      toggle.title = labels[action];
      toggle.setAttribute('aria-label', labels[action]);
      caption.setAttribute('aria-live', paused ? 'polite' : 'off');
      schedule();
    }
    async function move(step) {
      clearTimeout(timer);
      const request = ++revision;
      const next = (wanted + step + slides.length) % slides.length;
      wanted = next;
      const slide = slides[next];
      const image = slide.querySelector('img');
      image.loading = 'eager';
      try { await image.decode(); } catch { /* Keep the current photograph when loading fails. */ }
      if (request !== revision) return;
      if (image.naturalWidth) {
        slide.classList.add('sp-photo-loaded');
        slides[current].setAttribute('aria-hidden','true');
        slide.setAttribute('aria-hidden','false');
        caption.textContent = slide.dataset.caption;
        number.textContent = String(next + 1);
        current = next;
      }
      schedule();
    }

    slides[0].classList.add('sp-photo-loaded');
    gallery.querySelector('.sp-photo-controls').hidden = false;
    setPaused(paused);
    gallery.addEventListener('click', event => {
      const button = event.target.closest('[data-gallery-action]');
      if (!button) return;
      const action = button.dataset.galleryAction;
      if (action === 'pause') { setPaused(!paused); return; }
      setPaused(true);
      move(action === 'prev' ? -1 : 1);
    });
    gallery.addEventListener('focusin', event => {
      if (!gallery.contains(event.relatedTarget) && event.target.matches(':focus-visible')) setPaused(true);
    });
    gallery.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      setPaused(true);
      move(event.key === 'ArrowLeft' ? -1 : 1);
    });
    motion.addEventListener('change', () => { if (motion.matches) setPaused(true); });
    document.addEventListener('visibilitychange', schedule);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { onscreen = entry.isIntersecting; schedule(); }, {threshold:0.1}).observe(gallery);
    } else { onscreen = true; schedule(); }
  }

  function setupShell() {
    root.lang = locale;
    el('sp-skip').textContent = t.skip;
    el('sp-brand').href = home(locale);
    el('sp-back').href = home(locale) + '#services';
    el('sp-back').lastElementChild.textContent = t.back;
    const nav = Object.entries({services:t.services,projects:t.projects,procurement:t.procurement,contacts:t.contacts})
      .map(([key,label]) => '<a href="' + esc(home(locale) + '#' + key) + '">' + esc(label) + '</a>').join('');
    for (const id of ['sp-nav','sp-mobile-nav']) {
      el(id).innerHTML = nav;
      el(id).setAttribute('aria-label', t.nav);
    }
    el('sp-mobile-menu').querySelector('summary').setAttribute('aria-label', t.menu);
    el('sp-language').setAttribute('aria-label',t.language);
    el('sp-language').querySelectorAll('a').forEach(link => {
      link.href = serviceUrl(link.lang);
      if (link.lang === locale) link.setAttribute('aria-current','true');
    });
    el('sp-header-request').textContent = t.quote;
    el('sp-footer').innerHTML = '<div class="wrap sp-footer-inner"><a class="brand" href="' + esc(home(locale)) + '"><img width="165" height="45" src="assets/company-logo.png" alt="A-SERVICE"></a>'
      + '<div class="sp-contact"><span>' + t.contact + '</span><b>' + t.person + '</b></div><div class="sp-contact"><a href="tel:+77777294964">+7 777 729 49 64</a><a href="mailto:haba-87@mail.ru">haba-87@mail.ru</a></div></div>';
    const menu = el('sp-mobile-menu');
    document.addEventListener('click', event => { if (menu.open && !menu.contains(event.target)) menu.open = false; });
    menu.addEventListener('keydown', event => {
      if (event.key === 'Escape') { menu.open = false; menu.querySelector('summary').focus(); }
    });
  }

  window.bankServiceMarkup = function bankServiceMarkup(service, locale) {
    const t = i18n[locale];
    const record = service[locale];
    const page = pages[service.id];
    const practice = page.practice;
    const practiceLink = practice ? '<a class="sp-practice" href="' + esc(window.bankCaseUrl?.(practice[0], locale) || home(locale) + '#project-' + practice[0])
      + '"><span class="sp-practice-label">' + t.practice + '</span><span>' + esc(practice[locale === 'kk' ? 2 : 1]) + '</span>' + arrow + '</a>' : '';
    const serviceIcon = svg(window.serviceIconPaths?.[service.icon] || window.bankExtraPageIcons?.[service.icon] || '', 32);
    const steps = record.details.map((description,index) =>
      '<li class="sp-stage"><div class="sp-stage-art">' + scene(page.art[index]) + '</div>'
      + '<h3>' + esc(page[locale][index]) + '</h3><p>' + esc(description) + '</p></li>'
    ).join('');
    const header = '<div class="sp-hero"><div class="sp-hero-copy"><p class="sp-group"><span class="sp-symbol">' + serviceIcon + '</span>'
      + esc(t[service.group]) + '</p><h1 id="service-title">' + esc(record.title) + '</h1>'
      + '<p class="sp-lead">' + esc(record.short) + '</p><div class="sp-hero-actions"><a class="btn btn-brand" id="sp-hero-request" href="#service-request-form">' + t.quote + arrow + '</a>'
      + '<a class="sp-process-link" href="#service-work-title">' + t.toProcess + down + '</a></div></div>'
      + heroFigure(service.id, locale) + '</div>';
    return header + '<section class="sp-work" aria-labelledby="service-work-title"><h2 id="service-work-title" tabindex="-1">' + t.process + '</h2>'
      + '<ol class="sp-stages">' + steps + '</ol></section><div class="sp-brief"><section id="sp-result"><h2>' + t.result + '</h2><p>' + esc(record.result)
      + '</p></section><section id="sp-inputs"><h2>' + t.inputs + '</h2><p>' + esc(record.inputs) + '</p></section></div>' + practiceLink;
  };

  if (!root) return;

  function renderService() {
    const record = service[locale];
    const art = window.bankServiceCover(service.id);
    const article = el('sp-service');
    if (!article.querySelector('[data-work-gallery]')) article.innerHTML = window.bankServiceMarkup(service, locale);
    mountGallery(article.querySelector('[data-work-gallery]'), locale);
    if (!root.dataset.seoPage) {
      document.title = record.title + ' · A-SERVICE';
      document.querySelector('meta[name="description"]').content = record.short;
      document.querySelector('meta[property="og:title"]').content = document.title;
      document.querySelector('meta[property="og:description"]').content = record.short;
      document.querySelector('meta[property="og:image"]').content = new URL(art, document.baseURI).href;
    }
    const target = el('service-request-form');
    if (typeof window.mountBankRequest === 'function') window.mountBankRequest(target, service.id);
    if (location.hash === '#service-request-form') target.scrollIntoView({block:'start'});
  }

  setupShell();
  if (service && pages[service.id]) {
    renderService();
    // A fragment inside the currently loaded document must remain on this service even with a static-page base URL.
    const ownUrl = new URL(location.href);
    ownUrl.hash = '';
    document.querySelectorAll('a[href]').forEach(link => {
      const targetUrl = new URL(link.href);
      const raw = link.getAttribute('href');
      const samePage = targetUrl.pathname === location.pathname && targetUrl.search === location.search;
      const fragment = raw.startsWith('#') ? raw : samePage && targetUrl.hash;
      if (!fragment) return;
      link.href = ownUrl.href + fragment;
      if (fragment === '#service-request-form') {
        link.addEventListener('click', event => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          const target = el('service-request-form');
          target.focus({preventScroll:true});
          target.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth'});
        });
      }
    });
  } else {
    document.title = t.unavailable + ' · A-SERVICE';
    el('sp-header-request').hidden = true;
    el('service-request-form').hidden = true;
    el('sp-service').innerHTML = '<div class="sp-missing"><h1>' + t.unavailable + '</h1><a class="btn btn-brand" href="' + esc(home(locale) + '#services') + '">' + t.choose + arrow + '</a></div>';
  }
  root.dataset.serviceReady = 'true';
  document.dispatchEvent(new CustomEvent('bank-service-ready',{detail:{service:service?.id || null,locale}}));
})();
