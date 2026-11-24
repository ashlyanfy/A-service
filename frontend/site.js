(() => {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const S = window.bankServices;
const icons = {
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c4 4 4 14 0 18-4-4-4-14 0-18Z"/>',
 down:'<path d="m6 9 6 6 6-6"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',x:'<path d="m6 6 12 12M18 6 6 18"/>',
 grid:'<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><rect x="14" y="14" width="6.5" height="6.5" rx="1"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
 file:'<path d="M5 3h9l5 5v13H5zM14 3v5h5M8 12h8M8 16h6"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 15v5h16v-5"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-14 5 3 3 6-6"/>',
 atm:'<rect x="5" y="2" width="14" height="20" rx="2"/><rect x="8" y="5" width="8" height="6" rx="1"/><path d="M8 15h3m3 0h2m-8 4h8"/>',
 pin:'<path d="M19.5 10c0 5.3-7.5 11.5-7.5 11.5S4.5 15.3 4.5 10a7.5 7.5 0 0 1 15 0Z"/><circle cx="12" cy="10" r="2.4"/>',
 play:'<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/>'
};
function svg(name){if(window.serviceIconPaths?.[name]) return '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+window.serviceIconPaths[name]+'</svg>'; return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||'')+'</svg>'}
function glyph(name){return '<i data-icon="'+name+'" aria-hidden="true">'+svg(name)+'</i>'}
const langMap={
ru:{skip:'К услугам',navServices:'Услуги',navProjects:'Портфолио',navProcure:'Для закупок',navContacts:'Контакты',getQuote:'Запросить расчёт',heroTag:'Банковская инфраструктура',hero1:'Сервис банкоматов',hero2:'и отделений банка',heroIntro:'Устанавливаем и перевозим банкоматы, изготавливаем козырьки и организуем переезд отделений по всему Казахстану.',choose:'Выбрать услугу',stat1:'С 2012 года',stat1a:'Работаем с банками',stat2a:'Банкоматов обслужено',stat3:'Казахстан',stat3a:'Работы по всей стране',catKicker:'Каталог услуг',catTitle:'Услуги для банков',film:'Смотреть видео',filmTitle:'Видео A-SERVICE',clientLabel:'Банки из портфолио A-SERVICE',whatsapp:'Написать в WhatsApp',workKicker:'Опыт A-SERVICE',workTitle:'Портфолио и кейсы',procKicker:'Для закупок',procTitle:'Материалы для закупщика',procDesc:'Оставьте запрос, и менеджер отправит вам профиль A-SERVICE с перечнем услуг и контактами. Его можно передать коллегам для согласования.',profile:'Запросить профиль компании',stepsTitle:'Как проходит работа',step1:'Уточняем задачу',step1a:'Адреса, объём, доступ на объекты.',step2:'Согласуем предложение',step2a:'Состав работ, стоимость и график.',step3:'Передаём результат',step3a:'Фото и документы в согласованном формате.',footLead:'Банковская инфраструктура Казахстана',contact:'Контакт по проектам',person:'Азиз Асылжанов',all:'Все',equipment:'Банкоматы',infrastructure:'Инфраструктура',office:'Мебель',more:'Подробнее',includes:'Что входит в услугу',need:'Что потребуется для расчёта',result:'Что получает банк',add:'Рассчитать эту услугу',search:'Найти услугу',none:'Услуги по этому запросу не найдены.',clear:'Сбросить фильтры',close:'Закрыть',menu:'Меню',lang:'Выбрать язык',filter:'Направления услуг',pageTitle:'A-SERVICE — сервис банкоматов и отделений банка'},
kk:{skip:'Қызметтерге өту',navServices:'Қызметтер',navProjects:'Портфолио',navProcure:'Сатып алуға',navContacts:'Байланыс',getQuote:'Баға сұрату',heroTag:'Банк инфрақұрылымы',hero1:'Банкоматтар мен',hero2:'бөлімшелерге қызмет',heroIntro:'Қазақстан бойынша банкоматтарды орнатамыз және тасымалдаймыз, күнқағар жасаймыз, банк бөлімшелерін көшіреміз.',choose:'Қызметті таңдау',stat1:'2012 жылдан бері',stat1a:'Банктермен жұмыс істейміз',stat2a:'Банкоматқа қызмет көрсетілді',stat3:'Қазақстан',stat3a:'Бүкіл ел бойынша жұмыс',catKicker:'Қызметтер каталогы',catTitle:'Банктерге арналған қызметтер',film:'Видеоны көру',filmTitle:'A-SERVICE бейнесі',clientLabel:'A-SERVICE жұмыс істеген банктер',whatsapp:'WhatsApp арқылы жазу',workKicker:'A-SERVICE тәжірибесі',workTitle:'Портфолио және жобалар',procKicker:'Сатып алу бөліміне',procTitle:'Сатып алушыға арналған материалдар',procDesc:'Сұрау қалдырсаңыз, менеджер сізге A-SERVICE қызметтері мен байланыс деректері жазылған таныстырылымды жібереді. Оны әріптестеріңізбен бөлісе аласыз.',profile:'Компания таныстырылымын сұрату',stepsTitle:'Жұмыс тәртібі',step1:'Тапсырманы нақтылаймыз',step1a:'Мекенжайлар, жұмыс көлемі, нысанға кіру.',step2:'Ұсынысты келісеміз',step2a:'Жұмыс құрамы, құны және кестесі.',step3:'Нәтижені тапсырамыз',step3a:'Келісілген форматтағы фотолар мен құжаттар.',footLead:'Қазақстанның банк инфрақұрылымы',contact:'Жоба бойынша байланыс',person:'Азиз Асылжанов',all:'Барлығы',equipment:'Банкоматтар',infrastructure:'Инфрақұрылым',office:'Жиһаз',more:'Толығырақ',includes:'Қызметке не кіреді',need:'Бағаны есептеуге қажет деректер',result:'Банк алатын нәтиже',add:'Осы қызметтің бағасын сұрату',search:'Қызметті іздеу',none:'Сұрауыңызға сәйкес қызмет табылмады.',clear:'Сүзгілерді тазарту',close:'Жабу',menu:'Мәзір',lang:'Тілді таңдау',filter:'Қызмет бағыттары',pageTitle:'A-SERVICE — банкоматтар мен банк бөлімшелеріне қызмет көрсету'}
};
window.bankHomeTranslations = langMap;
if(typeof document==='undefined')return;
const compactFilters = {ru:'Техника',kk:'Жабдық'};
const keywords={install:'монтаж установка демонтаж снять снять орнату бөлшектеу',transport:'транспортировка перевозка банкоматов доставка такелаж тасымалдау жеткізу',dispose:'списание отходы утилизация кәдеге жарату қалдық',canopy:'навес козырьки козырьков производство қалқа',clean:'мойка мытьё уборка корпус экран клиентская панель терминалы клининг чистка жуу тазалау сүрту',furniture:'транспортировка мебели банков переезд отделений офис филиал жиһаз көшу'};
const routeLocale = location.pathname.split('/')[1];
const requestedLocale = new URLSearchParams(location.search).get('lang');
const locale = routeLocale === 'kk' || routeLocale === 'ru' ? routeLocale : requestedLocale === 'kk' ? 'kk' : 'ru';
let group='all',query='';
const tx=()=>langMap[locale];
function normalize(value){return value.toLowerCase().replaceAll('ё','е').trim()}
function filtered(){const words=normalize(query).split(/\s+/).filter(Boolean);return S.filter(s=>(group==='all'||group===s.group)&&words.every(w=>normalize([s[locale].title,s[locale].short,keywords[s.id]].join(' ')).includes(w)))}
function renderCards(){
  const grid=$('#service-grid');
  grid.innerHTML=filtered().map(s=>'<a class="scard" href="'+window.bankServiceUrl(s.id,locale)+'" data-service="'+s.id+'" aria-label="'+s[locale].title+'"><span class="icon-tile">'+glyph(s.icon)+'</span><span class="service-name">'+s[locale].title+'</span></a>').join('');
  if(!grid.children.length)grid.innerHTML='<p class="no-matches">'+tx().none+'<button data-clear type="button">'+tx().clear+'</button></p>'}
function renderFilters(){const el=$('#filters');el.setAttribute('aria-label',tx().filter);el.innerHTML=['all','equipment','infrastructure','office'].map(k=>'<button data-filter="'+k+'" aria-pressed="'+(k===group)+'" type="button">'+(k==='equipment'?'<span class="filter-desktop">'+tx()[k]+'</span><span class="filter-mobile">'+compactFilters[locale]+'</span>':tx()[k])+'</button>').join('')}
function closeMenus(){$('#lang-list').hidden=true;$('#lang-toggle').setAttribute('aria-expanded','false');$('#mobile-nav').hidden=true;$('#mobile-toggle').setAttribute('aria-expanded','false')}
function render(){document.documentElement.lang=locale;if(!document.documentElement.dataset.pageLocale)document.title=tx().pageTitle;$$('[data-key]').forEach(el=>el.textContent=tx()[el.dataset.key]);$('#lang-label').textContent=locale==='kk'?'ҚАЗ':'RU';$('#lang-toggle').setAttribute('aria-label',tx().lang);$('#mobile-toggle').setAttribute('aria-label',tx().menu);$('#service-search').placeholder=locale==='kk'?'Іздеу':'Поиск';$('#service-search').setAttribute('aria-label',tx().search);$('.desktop-nav').setAttribute('aria-label',tx().menu);$('#mobile-nav').setAttribute('aria-label',tx().menu);$$('[data-locale]').forEach(el=>{el.href=window.bankHomeUrl(el.dataset.locale)+location.hash;if(el.dataset.locale===locale)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});renderFilters();renderCards();window.renderBankResources(locale);window.renderBankPortfolio(locale)}
document.addEventListener('click',e=>{
const el=e.target.closest('button,a');if(!e.target.closest('.language')&&!$('#lang-list').hidden){$('#lang-list').hidden=true;$('#lang-toggle').setAttribute('aria-expanded','false')};
if(!el)return;
if(el.id==='lang-toggle'||el.id==='mobile-toggle'){const isLang=el.id==='lang-toggle',menu=$(isLang?'#lang-list':'#mobile-nav'),show=menu.hidden;closeMenus();menu.hidden=!show;el.setAttribute('aria-expanded',String(show));return}
if(el.hasAttribute('data-locale')){el.href=window.bankHomeUrl(el.dataset.locale)+location.hash;closeMenus();return}
if(el.hasAttribute('data-filter')){group=el.dataset.filter;renderFilters();renderCards();$('#filters [aria-pressed=true]').focus({preventScroll:true});return}
if(el.hasAttribute('data-clear')){group='all';query='';$('#service-search').value='';renderFilters();renderCards();$('#service-search').focus();return}
if(el.hasAttribute('data-quote')){closeMenus();window.openBankQuote();return}
if(el.closest('nav')||el.classList.contains('brand'))closeMenus();
});
$('#service-search').addEventListener('input',e=>{query=e.target.value;renderCards()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(!$('#lang-list').hidden||!$('#mobile-nav').hidden)){const node=!$('#lang-list').hidden?$('#lang-toggle'):$('#mobile-toggle');closeMenus();node.focus()}});
$$('i[data-icon]').forEach(n=>{n.innerHTML=svg(n.dataset.icon);n.setAttribute('aria-hidden','true')});render();
})();
