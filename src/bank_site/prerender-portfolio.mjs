import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../../frontend/', import.meta.url));
const pages = fileURLToPath(new URL('./pages/', import.meta.url));
const siteBase = new URL('https://a-service.asia');
const indexable = true;
const data = vm.createContext({ window: {} });
for (const name of ['services.js', 'bank-resources.js', 'portfolio-data.js', 'portfolio-route.js', 'seo-routes.js']) {
  vm.runInContext(await readFile(path.join(dist, name), 'utf8'), data, { filename: name });
}
const { bankCaseUrl, bankHomeUrl, bankServiceUrl, bankServices, bankExtraServices, portfolioCases } = data.window;
// Search-facing case headings distinguish completed bank work from process examples.
const casePages = {
  'atm-recess': {
    title: { ru: 'Отделка ниши банкомата', kk: 'Банкомат ойығын әрлеу' },
    intro: { ru: 'Сразу после установки взгляд цепляется за открытые края проёма. Когда стену выравнивают до самой рамы, банкомат становится частью интерьера. Разницу видно на двух фотографиях.', kk: 'Банкоматты орнатқан кезде ойықтың ашық жиектері бірден көзге түседі. Қабырғаны жақтауға дейін тегістеп әрлеген соң, банкомат интерьермен үйлеседі. Екі фотодан осы өзгерісті көруге болады.' },
    services: ['install'],
  },
  jusan: {
    title: { ru: 'Покраска банкоматов и терминалов Jusan Bank', kk: 'Jusan Bank банкоматтары мен терминалдарын бояу' },
    intro: { ru: 'В 2019 году A-SERVICE покрасила банкоматы и терминалы Jusan Bank в корпоративный цвет. Работы на объектах банка в Казахстане организовали по единой программе.', kk: '2019 жылы A-SERVICE компаниясы Jusan Bank банкоматтары мен терминалдарын банктің корпоративтік түсіне бояды. Қазақстандағы нысандарда жұмыс ортақ бағдарлама бойынша жүргізілді.' },
    services: ['paint'],
  },
  altyn: {
    title: { ru: 'Работы с банковским оборудованием Altyn Bank', kk: 'Altyn Bank жабдығымен атқарылған жұмыстар' },
    services: [],
  },
  'atm-logistics': {
    title: { ru: 'Перевозка банкоматов', kk: 'Банкоматтарды тасымалдау' },
    services: ['transport'],
  },
  rigging: {
    title: { ru: 'Подъём банкомата к месту установки', kk: 'Банкоматты орнату орнына көтеріп жеткізу' },
    intro: { ru: 'Из-за ограниченного доступа банкомат подали к зданию краном. Дальше оборудование перемещали внутри на гидравлической тележке.', kk: 'Нысанға кіру мүмкіндігі шектеулі болғандықтан, банкоматты ғимаратқа кранмен көтерді. Әрі қарай оны гидравликалық арбамен жылжытты.' },
    services: ['rigging', 'install'],
  },
  packing: {
    title: { ru: 'Упаковка и крепление банковского оборудования перед перевозкой', kk: 'Банк жабдығын тасымалдау алдында қаптау және бекіту' },
    intro: { ru: 'Как подготовили партию банковского оборудования к перевозке. На архивных фото видны защитная упаковка корпусов, транспортировочные основания и крепление груза в кузове.', kk: 'Банк жабдығының партиясын тасымалдауға дайындау барысы. Мұрағат фотоларында корпустардың қапталуы, тасымалдау тұғырлары және жүктің көлік шанағына бекітілуі көрінеді.' },
    services: ['transport', 'rigging'],
  },
  batch: {
    title: { ru: 'Подготовка корпусов терминалов к окраске и сборке', kk: 'Терминал корпустарын бояуға және құрастыруға дайындау' },
    services: ['paint'],
  },
  ral: {
    title: { ru: 'Окраска корпусов банковского оборудования по образцу RAL 6018', kk: 'Банк жабдығының корпусын RAL 6018 үлгісі бойынша бояу' },
    services: ['paint'],
  },
  serial: {
    title: { ru: 'Серийная окраска корпусов банковских терминалов', kk: 'Банк терминалдарының корпустарын сериямен бояу' },
    services: ['paint'],
  },
  canopies: {
    title: { ru: 'Изготовление и монтаж козырька для уличного банкомата', kk: 'Көшедегі банкоматқа күнқағар жасау және орнату' },
    services: ['canopy'],
  },
};
const imageDescriptions = {
  'experience-jusan-atms': {ru: 'Оранжевые банкоматы Jusan Bank на транспортировочных основаниях в кузове', kk: 'Көлік шанағындағы тасымалдау тұғырларына қойылған қызғылт сары Jusan Bank банкоматтары'},
  'crane-installation': {ru: 'Кран поднимает жёлтый банкомат на стропах', kk: 'Кран сары банкоматты жүкбаумен көтеріп жатыр'},
  'interior-relocation': {ru: 'Банкомат на гидравлической тележке внутри здания', kk: 'Ғимарат ішінде гидравликалық арбаға қойылған банкомат'},
  'protected-shipment': {ru: 'Банковское оборудование в защитной плёнке закреплено на палете в кузове', kk: 'Көлік шанағындағы тұғырға бекітілген, қорғаныш үлдірмен оралған банк жабдығы'},
  'secured-in-transit': {ru: 'Упакованный терминал с защитой выступающих частей в кузове', kk: 'Көлік шанағында шығыңқы бөліктері қорғалып, қапталған терминал'},
  'workshop-batch': {ru: 'Жёлтые корпуса терминалов на разных этапах сборки в мастерской', kk: 'Шеберханада құрастырудың әр кезеңінде тұрған сары терминал корпустары'},
  'painted-enclosures': {ru: 'Два окрашенных жёлтых корпуса с закрытыми рабочими зонами', kk: 'Жұмыс бөліктері жабылған, сары түске боялған екі терминал корпусы'},
  'experience-painted-enclosures': {ru: 'Бумажные маски на рабочих зонах окрашенных жёлтых корпусов терминалов', kk: 'Сары түске боялған терминал корпустарының жұмыс бөліктері қағазбен жабылған'},
  'installed-yellow-atm-canopy': {ru: 'Жёлтый защитный козырёк у банкомата на фасаде здания', kk: 'Ғимарат қасбетіндегі банкоматтың сары қорғаныс күнқағары'},
};
function imageAlt(image, locale) {
  const key = path.parse(image.src).name;
  return image.alt || imageDescriptions[key]?.[locale] || image.caption;
}
const serviceList = [...bankServices, ...bankExtraServices];
const ui = {
  ru: {
    home: 'Главная', cases: 'Портфолио', services: 'Услуги', tender: 'Для закупок', contacts: 'Контакты',
    nav: 'Навигация', crumbs: 'Путь по сайту', skip: 'К содержанию', languages: 'Язык страницы',
    bank: 'Банковский проект', background: 'Опыт команды', discussion: 'Обсудить похожую задачу',
    task: 'Задача', work: 'Ход работ', result: 'Результат', source: 'Исходная публикация A-SERVICE',
    related: 'Услуги по теме', all: 'Услуги для банков', original: 'Архив A-SERVICE',
    gallery: 'Фотографии работ', enlarge: 'Открыть фотографию', previous: 'Предыдущая', next: 'Следующая',
    close: 'Закрыть', logo: 'Логотип Altyn Bank', contact: 'Для связи с A-SERVICE',
    noScript: 'Оставить обращение можно по телефону', languageTag: 'ru_KZ',
  },
  kk: {
    home: 'Басты бет', cases: 'Портфолио', services: 'Қызметтер', tender: 'Сатып алушыларға', contacts: 'Байланыс',
    nav: 'Навигация', crumbs: 'Сайттағы жол', skip: 'Негізгі мазмұнға өту', languages: 'Бет тілі',
    bank: 'Банк жобасы', background: 'Команда тәжірибесі', discussion: 'Ұқсас жұмысты талқылау',
    task: 'Міндет', work: 'Жұмыс барысы', result: 'Нәтиже', source: 'A-SERVICE бастапқы жарияланымы',
    related: 'Осы тақырыптағы қызметтер', all: 'Банктерге арналған қызметтер', original: 'A-SERVICE мұрағаты',
    gallery: 'Жұмыс фотолары', enlarge: 'Фотосуретті ашу', previous: 'Алдыңғысы', next: 'Келесісі',
    close: 'Жабу', logo: 'Altyn Bank логотипі', contact: 'A-SERVICE байланыс деректері',
    noScript: 'Өтінішті телефон арқылы қалдыруға болады', languageTag: 'kk_KZ',
  },
};
const h = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const absolute = href => new URL(href, siteBase.origin).href;
const asset = file => '/' + file.replace(/^\/+/, '');
const lens = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5m-12.5-10h5m-2.5-2.5v5"/></svg>';

const photoDimensions = {
  'assets/portfolio/atm-hall-cladding.jpg': [1152, 1536],
  'assets/portfolio/atm-hall-open-wall.jpg': [864, 1536],
  'assets/portfolio/atm-recess-after.jpg': [864, 1536],
  'assets/portfolio/atm-recess-before.jpg': [864, 1536],
  'assets/portfolio/crane-installation.webp': [1100, 1467],
  'assets/portfolio/experience-jusan-atms.webp': [1152, 1536],
  'assets/portfolio/experience-painted-enclosures.webp': [1024, 1536],
  'assets/portfolio/interior-relocation.webp': [889, 1500],
  'assets/portfolio/painted-enclosures.webp': [1000, 1500],
  'assets/portfolio/protected-shipment.webp': [1000, 1500],
  'assets/portfolio/secured-in-transit.webp': [1000, 1500],
  'assets/portfolio/workshop-batch.webp': [1536, 1024],
  'assets/work-photos/canopy-pair.webp': [864, 1536],
  'assets/work-photos/canopy-yellow.webp': [864, 1536],
  'assets/work-photos/fleet-vans.webp': [1536, 1024],
  'assets/work-photos/transport-padding.webp': [1024, 1536],
  'assets/work-photos/transport-pallet.webp': [1024, 1536],
  'assets/work-photos/transport-truck.webp': [1536, 1024],
};

function photo(image, locale, section, eager = false) {
  const words = ui[locale];
  const url = h(asset(image.src));
  const description = h(imageAlt(image, locale));
  const size = photoDimensions[image.src];
  const dimensions = size ? ` width="${size[0]}" height="${size[1]}"` : '';
  return `<figure class="${section}"><a class="pfc-frame" href="${url}" data-case-image
    aria-label="${h(words.enlarge)}. ${description}"><img src="${url}" alt="${description}"${dimensions} decoding="async" loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''}><span class="pfc-zoom" aria-hidden="true">${lens}</span></a><figcaption>${image.stage ? '<strong class="pfc-stage">' + h(image.stage) + '</strong> ' : ''}${h(image.caption)}</figcaption></figure>`;
}

function makePage(item, locale) {
  const words = ui[locale];
  const record = item[locale];
  const home = bankHomeUrl(locale);
  const url = bankCaseUrl(item.id, locale);
  const otherLocale = locale === 'ru' ? 'kk' : 'ru';
  const languageUrls = Object.fromEntries(['ru','kk'].map(lang => [lang, bankCaseUrl(item.id, lang)]));
  const { title: heading, intro, services } = casePages[item.id];
  const headline = heading[locale];
  const description = intro?.[locale] || record.summary;
  const title = headline + ' · A-SERVICE';
  const serviceId = services[0] || 'general';
  const related = services.length ? services.map(id => {
    const service = serviceList.find(entry => entry.id === id);
    if (!service) throw new Error('Unknown portfolio service: ' + id);
    return { title: service[locale].title, url: bankServiceUrl(id, locale) };
  }) : [{ title: words.all, url: home + '#services' }];
  const relatedLinks = related.map(({title, url}) => `<li><a href="${h(url)}">${h(title)}</a></li>`).join('');
  const illustrativeNote = item.id === 'ral'
    ? (locale === 'kk' ? 'Мұрағат фотосы дайындау кезеңін көрсетеді.' : 'Архивная иллюстрация этапа подготовки.')
    : '';
  const coverPhoto = record.images.find(image => image.src === item.cover) || record.images[0];
  const coverAlt = item.logoCover ? words.logo : [illustrativeNote, imageAlt(coverPhoto, locale)].filter(Boolean).join(' ');
  const caseKind = item.group === 'bank' ? words.bank : words.background;
  const canonical = absolute(url);
  const homeTitle = 'A-SERVICE';
  const schema = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Article', '@id': canonical + '#article', url: canonical, headline, description,
        inLanguage: locale + '-KZ', author: { '@type': 'Organization', name: homeTitle }, ...(record.source && { isBasedOn: absolute(record.source) }),
        ...(!item.logoCover && { image: record.images.map(image => ({
          '@type': 'ImageObject', contentUrl: absolute(asset(image.src)), caption: [illustrativeNote, image.caption].filter(Boolean).join(' '),
          description: imageAlt(image, locale),
        })) }) },
      { '@type': 'BreadcrumbList', itemListElement: [
        [words.home, absolute(home)], [words.cases, absolute(home + '#projects')], [headline, canonical],
      ].map(([name, link], index) => ({ '@type': 'ListItem', position: index + 1, name, item: link })) },
    ],
  };
  const leadPhoto = item.logoCover ? `<div class="pfc-logo-frame"><img src="${h(asset(item.cover))}" width="900" height="193" alt="${h(words.logo)}"></div>` : photo(record.images[0], locale, 'pfc-cover', true);
  const comparison = item.photoReport ? '<div class="pfc-comparison">' + record.images.slice(0, 2)
    .map(image => photo(image, locale, 'pfc-compare-photo', true)).join('') + '</div>' : '';
  const processGallery = item.photoReport ? `<section class="pfc-process" aria-labelledby="process-title"><h2 id="process-title">${h(record.processTitle)}</h2><p>${h(record.processIntro)}</p><div class="pfc-process-grid">${record.images.slice(2).map(image => photo(image, locale, 'pfc-process-photo')).join('')}</div></section>` : '';
  const morePhotos = item.photoReport || record.galleryTitle ? '' : record.images.slice(1).map(img => photo(img, locale, 'pfc-extra-photo')).join('');
  const dialog = record.images.length ? `<dialog class="pfc-dialog" data-case-dialog aria-label="${h(words.gallery)}"><header><span data-photo-count aria-live="polite"></span><button type="button" class="pfc-control" data-photo-close>${h(words.close)}</button></header>
    <figure><img alt=""><figcaption></figcaption></figure>${record.images.length > 1 ? `<nav aria-label="${h(words.gallery)}"><button type="button" class="pfc-control" data-photo-prev>${h(words.previous)}</button><button type="button" class="pfc-control" data-photo-next>${h(words.next)}</button></nav>` : ''}</dialog>` : '';
  const nav = [
    ['#services', words.services], ['#projects', words.cases], ['#procurement', words.tender], ['#contacts', words.contacts],
  ].map(([hash, label]) => `<a href="${h(home + hash)}">${h(label)}</a>`).join('');
  const l10n = ['ru','kk'].map(lang => `<a href="${h(languageUrls[lang])}" lang="${lang}" hreflang="${lang}"${lang===locale?' aria-current="page"':''}>${lang === 'ru' ? 'RU' : 'ҚАЗ'}</a>`).join('');
  const photoStory = record.galleryTitle && `<section class="pfc-album" aria-labelledby="album-title"><h2 id="album-title">${h(record.galleryTitle)}</h2><div class="pfc-album-grid">${record.images.slice(1).map(image => photo(image, locale, 'pfc-album-image')).join('')}</div></section>`;
  const story = photoStory || [['task',words.task],['work',words.work],['result',words.result]].map(([key,heading]) => `<section><h2>${h(heading)}</h2><p>${h(record[key])}</p></section>`).join('');
  return `<!doctype html>
<html lang="${locale}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#3b24a8">
<title>${h(title)}</title><meta name="description" content="${h(description)}"><meta name="robots" content="${indexable ? 'index,follow' : 'noindex,follow'}">
<link rel="canonical" href="${h(canonical)}">${Object.entries(languageUrls).map(([lang,href])=>`<link rel="alternate" hreflang="${lang}-KZ" href="${h(absolute(href))}">`).join('')}<link rel="alternate" hreflang="x-default" href="${h(absolute(languageUrls.ru))}">
<meta property="og:type" content="article"><meta property="og:site_name" content="A-SERVICE"><meta property="og:locale" content="${words.languageTag}"><meta property="og:locale:alternate" content="${ui[otherLocale].languageTag}"><meta property="og:title" content="${h(title)}"><meta property="og:description" content="${h(description)}"><meta property="og:url" content="${h(canonical)}"><meta property="og:image" content="${h(absolute(asset(item.cover)))}"><meta property="og:image:alt" content="${h(coverAlt)}">
<link rel="icon" href="/assets/favicon.png"><link rel="stylesheet" href="/site.css"><link rel="stylesheet" href="/quote.css"><link rel="stylesheet" href="/portfolio-page.css">
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>
<script defer src="/services.js"></script><script defer src="/bank-resources.js"></script><script defer src="/quote.js"></script><script defer src="/portfolio-route.js"></script>
</head>
<body class="pfc-page" data-portfolio-page>
<a class="skip" href="#case-main">${h(words.skip)}</a>
<header class="topbar"><div class="wrap header-row"><a class="brand" href="${h(home)}" aria-label="A-SERVICE"><img width="165" height="45" src="/assets/company-logo.png" alt="A-SERVICE"></a>
<nav class="nav desktop-nav pfc-header-nav" aria-label="${h(words.nav)}">${nav}</nav>
<div class="pfc-tools"><nav class="pfc-locales" aria-label="${h(words.languages)}">${l10n}</nav><a class="btn pfc-primary header-quote" href="#case-request">${h(words.discussion)}</a></div></div></header>
<main class="wrap pfc-main" id="case-main" tabindex="-1">
<nav aria-label="${h(words.crumbs)}"><ol class="pfc-breadcrumb"><li><a href="${h(home)}">${h(words.home)}</a></li><li><a href="${h(home+'#projects')}">${h(words.cases)}</a></li><li aria-current="page">${h(headline)}</li></ol></nav>
<article>
<div class="pfc-hero${item.photoReport ? ' pfc-report-hero' : ''}"><div><p class="pfc-kind">${h(caseKind)}</p><h1>${h(headline)}</h1><p class="pfc-meta">${h(record.meta)}</p><p class="pfc-lead">${h(description)}</p>
<div class="pfc-actions"><a class="btn pfc-primary" href="#case-request">${h(words.discussion)}</a></div></div>${comparison || leadPhoto}</div>
${processGallery}
<div class="pfc-body${record.galleryTitle ? ' pfc-album-body' : ''}"><div class="${record.galleryTitle ? 'pfc-photo-story' : 'pfc-story'}">${story}${record.source ? `<div class="pfc-source"><a href="${h(record.source)}" target="_blank" rel="noopener noreferrer">${h(words.source)}</a></div>` : ''}</div>
<aside>${morePhotos ? `<section class="pfc-more-photos" aria-label="${h(words.gallery)}"><h2>${h(words.original)}</h2>${morePhotos}</section>` : ''}<section class="pfc-related"><h2>${h(words.related)}</h2><ul>${relatedLinks}</ul></section></aside></div>
</article>
<section id="case-request" class="pfc-form-area" aria-label="${h(words.discussion)}"><div data-case-request data-service="${h(serviceId)}"></div><noscript><p class="pfc-noscript">${h(words.noScript)} <a href="tel:+77777294964">+7 777 729 49 64</a>.</p></noscript></section>
</main>${dialog}
<footer><div class="wrap pfc-foot"><strong>A-SERVICE</strong><span>${h(words.contact)}</span><a href="tel:+77777294964">+7 777 729 49 64</a><a href="mailto:haba-87@mail.ru">haba-87@mail.ru</a></div></footer>
</body></html>
`;
}

for (const item of portfolioCases) {
  for (const lang of ['ru','kk']) {
    const output = path.join(pages, bankCaseUrl(item.id,lang));
    await mkdir(output, { recursive:true });
    await writeFile(path.join(output,'index.html'), makePage(item, lang));
  }
}
console.log('Prerendered ' + portfolioCases.length * 2 + ' portfolio pages.');
