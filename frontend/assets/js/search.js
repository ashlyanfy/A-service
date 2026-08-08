/* A-SERVICE — поиск по сайту (/ru/poisk/, /kk/izdeu/).
   Индекс генерируется сборкой: /assets/search-ru.json, /assets/search-kk.json. */
(function () {
  'use strict';

  var container = document.querySelector('.search-page');
  if (!container) return;

  var LANG = document.documentElement.lang === 'kk' ? 'kk' : 'ru';
  var results = container.querySelector('.search-results');
  var input = container.querySelector('input[type="search"]');
  var form = container.querySelector('form');
  if (!results || !input || !form) return;

  var EMPTY = LANG === 'kk'
    ? 'Ештеңе табылмады. Сұрауды өзгертіп көріңіз немесе бізге тікелей жазыңыз.'
    : 'Ничего не найдено. Попробуйте изменить запрос или напишите нам напрямую.';

  var index = null;

  function render(items) {
    results.innerHTML = '';
    if (!items.length) {
      var p = document.createElement('p');
      p.className = 'muted';
      p.textContent = EMPTY;
      results.appendChild(p);
      return;
    }
    items.forEach(function (item) {
      var a = document.createElement('a');
      a.href = item.url;
      var h = document.createElement('h2');
      h.textContent = item.title;
      var d = document.createElement('p');
      d.textContent = item.description;
      var arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';
      a.appendChild(h);
      a.appendChild(d);
      a.appendChild(arrow);
      results.appendChild(a);
    });
  }

  function search(query) {
    var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return null;
    return index.filter(function (item) {
      var hay = (item.title + ' ' + item.description).toLowerCase();
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    }).slice(0, 30);
  }

  function run(query) {
    if (!index) return;
    var found = search(query);
    if (found !== null) render(found);
  }

  fetch('/assets/search-' + LANG + '.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      index = data;
      var q = new URLSearchParams(location.search).get('q');
      if (q) { input.value = q; run(q); }
    })
    .catch(function () {});

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    run(input.value);
    var url = new URL(location.href);
    url.searchParams.set('q', input.value);
    history.replaceState(null, '', url);
  });
  input.addEventListener('input', function () {
    if (index && input.value.trim().length >= 2) run(input.value);
  });
})();
