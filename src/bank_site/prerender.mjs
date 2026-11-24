import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {copy, procurementQuestions, serviceConnections} from './prerender-copy.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, '../../frontend');
const pages = path.join(here, 'pages');
// These templates are committed. The Python deployment build supplies the hosting origin and indexing policy.
const base = new URL('https://a-service.asia');
const indexable = true;
await fs.rm(pages, {recursive: true, force: true});
// Project pages share the same origin, robot policy and localized navigation.
await import('./prerender-portfolio.mjs');
const absolute = route => new URL(route, base).href;
const escape = value => String(value ?? '').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const context = vm.createContext({window:{}, URL, URLSearchParams});
const script = name => fs.readFile(path.join(dist,name),'utf8');
for (const name of ['seo-routes.js','portfolio-route.js','service-icons.js','services.js','portfolio-data.js','portfolio.js','bank-resources.js','extra-service-pages.js','service-page.js','site.js']) {
  vm.runInContext(await script(name),context,{filename:name});
}
const api=context.window;
const services=[...api.bankServices,...api.bankExtraPageServices];
if (!api.bankHomeTranslations || !api.bankResourceCopy || !api.bankServiceMarkup || !api.bankServiceCover || !api.bankCaseUrl || !api.bankPortfolioMarkup) {
  throw new Error('Missing shared translation, resource, service or case renderer');
}
const languages = ['ru','kk'];
const homeTemplate = await fs.readFile(path.join(here,'prerender-home-template.html'),'utf8');
const serviceTemplate = await script('service-page.html');
const schemaId = base.origin + '/#organization';
const cleanJSON = input => JSON.stringify(input).replaceAll('<','\\u003c');
const attr = (id,val) => ' '+id+'="'+escape(val)+'"';
const org = {'@type':'Organization','@id':schemaId,name:'A-SERVICE',url:absolute('/ru/'),logo:absolute('/assets/company-logo.png'),telephone:'+77777294964',email:'haba-87@mail.ru',areaServed:{'@type':'Country',name:'Kazakhstan',identifier:'KZ'}};
org.contactPoint = {'@type':'ContactPoint', contactType:'sales', telephone:org.telephone, email:org.email, availableLanguage:['ru','kk']};
const words={
  ru:{home:'Главная',services:'Услуги',faq:'Частый вопрос',crumbs:'Навигация по странице',contact:'Для расчёта позвоните или напишите',all:'Все услуги',request:'Запросить расчёт',skip:'К содержанию',projects:'Портфолио',procurement:'Для закупок',contacts:'Контакты',contactPrompt:'Контакт по проектам',menu:'Меню',language:'Выбрать язык',search:'Найти услугу',see:'Посмотреть проекты',additional:'Смежные услуги'},
  kk:{home:'Басты бет',services:'Қызметтер',faq:'Жиі қойылатын сұрақ',crumbs:'Бет бойынша шарлау',contact:'Баға сұрату үшін қоңырау шалыңыз немесе жазыңыз',all:'Барлық қызметтер',request:'Баға сұрату',skip:'Мазмұнға өту',projects:'Портфолио',procurement:'Сатып алу бөліміне',contacts:'Байланыс',contactPrompt:'Жоба бойынша байланыс',menu:'Мәзір',language:'Тілді таңдау',search:'Қызметті іздеу',see:'Жобаларды көру',additional:'Қосымша қызметтер'}
};
function baseMarkup(template,lang,type,serviceId){
  return template.replace(/<html\b[^>]*>/i,'<html'+attr('lang',lang)+attr('data-page-locale',lang)+attr('data-seo-page',type)+(serviceId?attr('data-service',serviceId):'')+'>');
}
function metadata(markup,{lang,title,description,pair,image,graph}){
  let shell=markup.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i,'')
    .replace(/<meta\b[^>]*(?:name="(?:description|robots)"|property="og:[^"]+")[^>]*>/gi,'')
    .replace(/<link\b[^>]*rel="(?:canonical|alternate)"[^>]*>/gi,'')
    .replace(/<base\b[^>]*>/ig,'');
  const tags=[
    '<base href="/">','<title>'+escape(title)+'</title>','<meta name="description"'+attr('content',description)+'>',
    '<meta name="robots"'+attr('content',indexable?'index,follow,max-image-preview:large':'noindex,follow')+'>',
    '<link rel="canonical"'+attr('href',absolute(pair[lang]))+'>',
    ...languages.map(l=>'<link rel="alternate"'+attr('hreflang',l+'-KZ')+attr('href',absolute(pair[l]))+'>'),
    '<link rel="alternate" hreflang="x-default"'+attr('href',absolute(pair.ru))+'>',
    ...Object.entries({type:'website',site_name:'A-SERVICE',title,description,url:absolute(pair[lang]),image:absolute(image),locale:lang+'_KZ','locale:alternate':(lang==='ru'?'kk':'ru')+'_KZ'}).map(([k,v])=>'<meta'+attr('property','og:'+k)+attr('content',v)+'>'),
    '<script type="application/ld+json">'+cleanJSON({'@context':'https://schema.org','@graph':graph})+'</script>'
  ];
  // The base must precede all relative asset tags. Keep the encoding declaration first.
  shell=shell.replace(/(<meta\s+charset=[^>]+>)/i,'$1\n'+tags.join('\n'));
  if (!shell.includes('src="seo-routes.js"') && !shell.includes('src="/seo-routes.js"')) {
    shell=shell.replace(/(<script\s[^>]*\bsrc=)/i,'<script defer src="/seo-routes.js"></script>\n$1');
  }
  return shell;
}
function fill(markup,id,html){
  const regexp=new RegExp('(<([a-z0-9]+)\\b[^>]*\\bid="'+id+'"[^>]*>)([\\s\\S]*?)(</\\2>)','i');
  if (!regexp.test(markup)) throw new Error('Missing '+id+' in template');
  return markup.replace(regexp,(_full,start,_tag,_old,end)=>start+html+end);
}
function assetIcon(id){
  const paths=api.serviceIconPaths[id];
  return paths?'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>':'';
}
function sameDocument(markup,route){
  return markup.replace(/href="#([^"]*)"/g,(_all,fragment)=>'href="'+route+'#'+fragment+'"');
}
function contact(lang){
  return '<p class="sp-contact-fallback">'+words[lang].contact+' · <a href="tel:+77777294964">+7 777 729 49 64</a> · <a href="mailto:haba-87@mail.ru">haba-87@mail.ru</a></p>';
}
function serviceReferences(id,lang){
  const context=serviceConnections[id];
  const links=context.services.map(key=>{
    const target=services.find(service=>service.id===key);
    if(!target || target.id===id) throw new Error('Invalid related service: '+id+' / '+key);
    return {url:api.bankServiceUrl(key,lang),name:target[lang].title};
  });
  for (const caseId of context.cases || []) {
    const item=api.portfolioCases.find(record=>record.id===caseId);
    if(!item) throw new Error('Invalid related project: '+id+' / '+caseId);
    links.push({url:api.bankCaseUrl(caseId,lang),name:item[lang].title});
  }
  if(context.region)links.push({
    url:api.bankHomeUrl(lang)+'#service-geography',
    name:lang==='ru'?'Города и условия выезда по Казахстану':'Қазақстан бойынша қызмет көрсетілетін қалалар және нысанға бару шарттары'
  });
  return links;
}
async function write(route,html){
  const folder=path.join(pages,route);
  await fs.mkdir(folder,{recursive:true});
  await fs.writeFile(path.join(folder,'index.html'),html);
}
function serviceHtml(service,lang){
  const w=words[lang], page=service[lang], route=api.bankServiceUrl(service.id,lang), home=api.bankHomeUrl(lang);
  const pair=Object.fromEntries(languages.map(l=>[l,api.bankServiceUrl(service.id,l)]));
  const [topic,description,firstQuestion]=copy[service.id][lang], title=topic+' | A-SERVICE', image=api.bankServiceCover(service.id);
  const pageUrl=absolute(route);
  const references=serviceReferences(service.id,lang);
  const questions=[firstQuestion,procurementQuestions[service.id][lang]];
  const questionNodes=questions.map(([q,a],i)=>({'@type':'Question','@id':pageUrl+'#service-question-'+(i+1),name:q,acceptedAnswer:{'@type':'Answer',text:a}}));
  const graph=[org,{
      '@type':'WebPage','@id':pageUrl+'#page',url:pageUrl,name:topic,description,
      inLanguage:lang+'-KZ',isPartOf:{'@id':base.origin+'/#website'},publisher:{'@id':schemaId},
      mainEntity:{'@id':pageUrl+'#service'},breadcrumb:{'@id':pageUrl+'#breadcrumbs'},
      hasPart:questionNodes,relatedLink:references.map(link=>absolute(link.url))
    },{
      '@type':'Service','@id':pageUrl+'#service',name:page.title,serviceType:page.title,description:page.short,url:pageUrl,
      mainEntityOfPage:{'@id':pageUrl+'#page'},provider:{'@id':schemaId},areaServed:org.areaServed,image:absolute(image),
      audience:{'@type':'BusinessAudience',audienceType:lang==='ru'?'Банки и операторы банковского оборудования':'Банктер мен банк жабдықтарының операторлары'},
      availableChannel:{'@type':'ServiceChannel',serviceUrl:pageUrl+'#service-request-form'}
    },
    {'@type':'BreadcrumbList','@id':absolute(route)+'#breadcrumbs',itemListElement:[
      {'@type':'ListItem',position:1,name:w.all,item:absolute(home+'#services')},
      {'@type':'ListItem',position:2,name:page.title,item:absolute(route)}]}];
  let html=metadata(baseMarkup(serviceTemplate,lang,'service',service.id),{lang,title,description,pair,image,graph});
  html=html.replace('</head>','<link rel="stylesheet" href="/seo-detail.css">\n</head>');
  html=fill(html,'sp-service',api.bankServiceMarkup(service,lang));
  const faqTitle=lang==='ru'?'Вопросы перед заказом':'Тапсырыс берер алдындағы сұрақтар';
  const faq='<section class="sp-faq" aria-labelledby="sp-faq-title"><h2 id="sp-faq-title">'+faqTitle+'</h2>'+
    questions.map(([q,a],i)=>'<details id="service-question-'+(i+1)+'"><summary>'+escape(q)+'</summary><p>'+escape(a)+'</p></details>').join('')+'</section>';
  const links='<nav class="sp-related" aria-labelledby="sp-related-title"><h2 id="sp-related-title">'+escape(serviceConnections[service.id][lang])+'</h2><ul>'+
    references.map(ref=>'<li><a href="'+escape(ref.url)+'">'+escape(ref.name)+'</a></li>').join('')+'</ul></nav>';
  html=html.replace('<div id="service-request-form"',faq+'\n<div id="service-request-form"');
  html=html.replace(/(<div id="service-request-form"[^>]*><\/div>)/,'$1\n'+links);
  html=html.replace(/<noscript>[\s\S]*?<\/noscript>/i,'');
  html=fill(html,'service-request-form',contact(lang));
  html=fill(html,'sp-back','<span aria-hidden="true">←</span><span>'+w.all+'</span>');
  html=html.replace(/(<a[^>]*id="sp-back"[^>]*>[\s\S]*?<\/a>)/,'<nav class="sp-breadcrumb" aria-label="'+w.crumbs+'">$1<span aria-hidden="true">/</span><span aria-current="page">'+escape(page.title)+'</span></nav>');
  html=html.replace(/href="\.\/\?lang=ru#services"/g,'href="'+home+'#services"').replace(/href="\.\/" id="sp-brand"/,'href="'+home+'" id="sp-brand"');
  const nav=['services','projects','procurement','contacts'].map(id=>'<a href="'+home+'#'+id+'">'+w[id]+'</a>').join('');
  html=fill(fill(html,'sp-nav',nav),'sp-mobile-nav',nav);
  html=fill(html,'sp-skip',w.skip);html=fill(html,'sp-header-request',w.request);
  html=fill(html,'sp-language',languages.map(l=>'<a href="'+pair[l]+'" lang="'+l+'" hreflang="'+l+'-KZ"'+(l===lang?' aria-current="true"':'')+'>'+(l==='kk'?'ҚАЗ':'RU')+'</a>').join(''));
  html=html.replaceAll('aria-label="Навигация"','aria-label="'+w.menu+'"').replaceAll('aria-label="Меню"','aria-label="'+w.menu+'"').replaceAll('aria-label="Язык"','aria-label="'+w.language+'"');
  const footer='<div class="wrap sp-footer-inner"><a class="brand" href="'+home+'"><img src="/assets/company-logo.png" width="165" height="45" alt="A-SERVICE"></a><div class="sp-contact"><span>'+w.contactPrompt+'</span><b>Азиз Асылжанов</b></div><div class="sp-contact"><a href="tel:+77777294964">+7 777 729 49 64</a><a href="mailto:haba-87@mail.ru">haba-87@mail.ru</a></div></div>';
  return sameDocument(fill(html,'sp-footer',footer),route);
}
function resourceMarkup(lang){
  const p=api.bankResourceCopy[lang];
  const extras='<details class="br-disclosure" data-resource-key="extras"><summary class="br-summary">'+escape(p.more)+'</summary><ul class="br-service-list">'+api.bankExtraServices.map(x=>'<li class="br-service"><div class="br-service-info"><h3 class="br-service-title"><a class="br-service-link" href="'+api.bankServiceUrl(x.id,lang)+'">'+escape(x[lang].title)+'</a></h3><p class="br-service-desc">'+escape(x[lang].short)+'</p></div></li>').join('')+'</ul></details>';
  const guides=p.entries.map(e=>{
    const links=e.links?'<ul class="br-guides">'+e.links.map(l=>'<li><a href="'+escape(l.href)+'">'+escape(l.title)+'</a></li>').join('')+'</ul>':'';
    const download=e.id==='register'?'<a class="br-download" href="/assets/object-register-'+lang+'.xlsx" download>'+escape(p.download)+'</a>':'';
    const region=e.id==='geography'?' id="service-geography" open':'';
    return '<details class="br-disclosure" data-resource-key="'+e.id+'"'+region+'><summary class="br-summary">'+escape(e.title)+'</summary><div class="br-body">'+(e.body?'<p>'+escape(e.body)+'</p>':'')+links+download+'</div></details>';
  }).join('');
  return [extras,'<section class="br-faq" aria-labelledby="br-faq-title"><h3 id="br-faq-title" class="br-faq-title">'+escape(p.resources)+'</h3><div class="br-faq-list">'+guides+'</div></section>'];
}
function homeHtml(lang,route){
  const pair={ru:'/ru/',kk:'/kk/'}, meta=copy.home[lang], t=api.bankHomeTranslations[lang], w=words[lang];
  const graph=[org,{'@type':'WebSite','@id':base.origin+'/#website',url:absolute('/'),name:'A-SERVICE',publisher:{'@id':schemaId},inLanguage:['ru-KZ','kk-KZ']},
    {'@type':'CollectionPage','@id':absolute(pair[lang])+'#page',url:absolute(pair[lang]),name:meta.title,description:meta.description,inLanguage:lang+'-KZ',publisher:{'@id':schemaId},isPartOf:{'@id':base.origin+'/#website'},mainEntity:{'@type':'ItemList',name:t.catTitle,numberOfItems:services.length,itemListElement:services.map((s,i)=>({'@type':'ListItem',position:i+1,name:s[lang].title,url:absolute(api.bankServiceUrl(s.id,lang)),item:{'@id':absolute(api.bankServiceUrl(s.id,lang))+'#service'}}))}}];
  let html=metadata(baseMarkup(homeTemplate,lang,'home'),{lang,pair,...meta,image:'/assets/hero-poster.webp',graph});
  html=html.replace(/(<([a-z0-9]+)\b[^>]*\bdata-key="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/gi,(all,start,_tag,key,_old,end)=>t[key]===undefined?all:start+escape(t[key])+end);
  html=html.replace('<br><span class="hero-accent"','<br> <span class="hero-accent"');
  html=fill(html,'lang-label',lang==='kk'?'ҚАЗ':'RU');
  html=fill(html,'lang-list',languages.map(l=>'<a href="'+pair[l]+'" lang="'+l+'" hreflang="'+l+'-KZ" data-locale="'+l+'"'+(l===lang?' aria-current="true"':'')+'>'+(l==='kk'?'Қазақша':'Русский')+'</a>').join(''));
  html=html.replace(/(id="service-search"[^>]*)aria-label="[^"]*" placeholder="[^"]*"/,'$1aria-label="'+w.search+'" placeholder="'+w.search+'"');
  html=html.replaceAll('aria-label="Навигация"','aria-label="'+w.menu+'"');
  html=fill(html,'filters',['all','equipment','infrastructure','office'].map(id=>'<button type="button" data-filter="'+id+'" aria-pressed="'+(id==='all')+'">'+escape(t[id])+'</button>').join(''));
  html=fill(html,'service-grid',api.bankServices.map(s=>'<a class="scard" href="'+api.bankServiceUrl(s.id,lang)+'" data-service="'+s.id+'"><span class="icon-tile">'+assetIcon(s.icon)+'</span><span class="service-name">'+escape(s[lang].title)+'</span></a>').join(''));
  html=fill(html,'portfolio-root',api.bankPortfolioMarkup(lang));
  const [extras,resources]=resourceMarkup(lang);
  html=fill(html,'additional-services',extras);html=fill(html,'procurement-resources',resources);
  html=html.replace('</footer>','<noscript><div class="wrap"><a href="'+pair[lang==='ru'?'kk':'ru']+'">'+(lang==='ru'?'Қазақша':'Русский')+'</a></div></noscript></footer>');
  return sameDocument(html,route);
}
for (const service of services) {
  if (!copy[service.id]) throw new Error('Missing metadata for service '+service.id);
  for (const lang of languages) await write(api.bankServiceUrl(service.id,lang),serviceHtml(service,lang));
}
for (const lang of languages) await write(api.bankHomeUrl(lang),homeHtml(lang,api.bankHomeUrl(lang)));
console.log('Updated bilingual page templates. Run python src/build.py to rebuild frontend.');
