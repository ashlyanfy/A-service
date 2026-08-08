# -*- coding: utf-8 -*-
"""Сборка сайта A-SERVICE: src/ -> frontend/.

Чистая статика без фреймворков: страницы собираются из
  src/content/<lang>/<slug>.html   (front-matter + <main>)
  src/templates/                   (шапка, подвал, диалог, общий JSON-LD)
  src/assets/                      (CSS-слои, JS)

Запуск из корня репозитория:  python src/build.py
"""
import glob
import hashlib
import json
import os
import re
import shutil

SRC = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(SRC, '..'))
OUT = os.path.join(REPO, 'frontend')

LANGS = ('ru', 'kk')
NAV_KEYS = ['uslugi', 'proekty', 'resheniya', 'o-kompanii', 'kontakty']
SEARCH_SLUGS = {'ru': 'poisk', 'kk': 'izdeu'}

HEAD_TOP = (
    '<meta charset="utf-8"/>'
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5"/>'
    '<link rel="preload" href="/images/a-service-logo-v2-transparent.png" as="image"/>'
    '<link rel="stylesheet" href="/assets/css/site.css?v={css_v}"/>'
    '<link rel="manifest" href="/manifest-{lang}.webmanifest"/>'
    '<meta name="theme-color" content="#3F23A0"/>'
    '<meta name="color-scheme" content="light"/>'
)
HEAD_BOTTOM = (
    '<link rel="icon" href="/icons/favicon-v2.ico" sizes="32x32" type="image/x-icon"/>'
    '<link rel="icon" href="/icons/favicon-32-v2.png" sizes="32x32" type="image/png"/>'
    '<link rel="icon" href="/icons/icon-192-v2.png" sizes="192x192" type="image/png"/>'
    '<link rel="apple-touch-icon" href="/icons/apple-touch-icon-v2.png"/>'
)
SCRIPTS = '<script defer src="/assets/js/main.js?v={js_v}"></script><script defer src="/assets/js/form.js?v={js_v}"></script>'
SEARCH_SCRIPT = '<script defer src="/assets/js/search.js?v={js_v}"></script>'

VERSIONS = {'css_v': '0', 'js_v': '0'}


def asset_hash(paths):
    h = hashlib.md5()
    for p in sorted(paths):
        h.update(open(p, 'rb').read())
    return h.hexdigest()[:10]


def read(path):
    return open(path, encoding='utf-8').read()


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf-8', newline='\n').write(text)


def parse_content(path):
    s = read(path)
    m = re.match(r'<!--@meta (.*?) -->\n', s)
    fm = json.loads(m.group(1))
    sections = re.split(r'<!--@(head|jsonld|main)-->\n?', s[m.end():])
    data = {'head': '', 'jsonld': '', 'main': ''}
    for i in range(1, len(sections), 2):
        data[sections[i]] = sections[i + 1].strip('\n')
    fm.update(data)
    return fm


def render_header(template, lang, self_url, pair_url, nav):
    h = template
    h = h.replace(' class="active"', ' class=""').replace(' aria-current="page"', '')

    # активный пункт основного меню (desktop + мобильная панель)
    if nav in NAV_KEYS:
        idx = NAV_KEYS.index(nav)

        def mark_nav(m):
            links = re.findall(r'<a [^>]*href="[^"]*"[^>]*>.*?</a>', m.group(2))
            for i, a in enumerate(links):
                if i == idx:
                    marked = a
                    if 'class="' in marked:
                        marked = marked.replace('class=""', 'class="active"', 1)
                    marked = marked.replace('<a ', '<a aria-current="page" ', 1) \
                        if 'class="active"' in marked else marked
                    links[i] = marked
            return m.group(1) + ''.join(links) + m.group(3)

        h = re.sub(r'(<nav class="desktop-nav"[^>]*>)(.*?)(</nav>)', mark_nav, h, flags=re.S)
        h = re.sub(r'(<div class="mobile-menu-panel"><nav[^>]*>)(.*?)(</nav>)',
                   lambda m: m.group(1) + re.sub(
                       r'(<a )([^>]*href="%s")' % re.escape(self_url),
                       r'\1aria-current="page" \2', m.group(2)) + m.group(3),
                   h, flags=re.S)

    # переключатель языков: свой URL активен, второй ведёт на пару
    other = 'kk' if lang == 'ru' else 'ru'

    def lang_link(m):
        tag_lang = m.group(1)
        if tag_lang == lang:
            return ('<a hrefLang="%s" lang="%s" class="active" aria-current="page" href="%s">'
                    % (lang, lang, self_url))
        return '<a hrefLang="%s" lang="%s" class="" href="%s">' % (other, other, pair_url)

    h = re.sub(r'<a hrefLang="(ru|kk)" lang="(?:ru|kk)" class="[^"]*"[^>]*href="[^"]*">', lang_link, h)
    return h


def build_css():
    files = sorted(glob.glob(os.path.join(SRC, 'assets', 'css', '[0-9]*.css')))
    body = '\n'.join(read(f) for f in files)
    write(os.path.join(OUT, 'assets', 'css', 'site.css'), body)
    return files


def build_js():
    os.makedirs(os.path.join(OUT, 'assets', 'js'), exist_ok=True)
    for f in glob.glob(os.path.join(SRC, 'assets', 'js', '*.js')):
        shutil.copy2(f, os.path.join(OUT, 'assets', 'js', os.path.basename(f)))


def patch_sw():
    sw = read(os.path.join(OUT, 'sw.js'))
    sw = sw.replace('a-service-static-v8-brand-v2', 'a-service-static-v9-clean')
    sw = sw.replace('url.pathname.startsWith("/_next/static/")',
                    'url.pathname.startsWith("/assets/")')
    write(os.path.join(OUT, 'sw.js'), sw)


def clean_output():
    for d in ('_next', 'ru', 'kk', '_not-found', '404'):
        p = os.path.join(OUT, d)
        if os.path.isdir(p):
            shutil.rmtree(p)
    for f in glob.glob(os.path.join(OUT, '__next*')) + glob.glob(os.path.join(OUT, 'index.txt')):
        os.remove(f)
    os.makedirs(os.path.join(OUT, 'assets'), exist_ok=True)


def page_out_path(lang, slug):
    rel = slug.replace('__', '/')
    return os.path.join(OUT, lang, rel, 'index.html') if rel != 'index' \
        else os.path.join(OUT, lang, 'index.html')


def page_url(lang, slug):
    rel = slug.replace('__', '/')
    return '/%s/' % lang if rel == 'index' else '/%s/%s/' % (lang, rel)


def render_page(fm, lang, slug, tpl):
    self_url = page_url(lang, slug)
    header = render_header(tpl['header'], lang, self_url, fm.get('pair') or '/%s/' % ('kk' if lang == 'ru' else 'ru'), fm.get('nav'))
    head = (HEAD_TOP.format(lang=lang, css_v=VERSIONS['css_v']) + '\n' + fm['head'] + '\n' + HEAD_BOTTOM +
            (SCRIPTS + (SEARCH_SCRIPT if slug == SEARCH_SLUGS[lang] else '')).format(js_v=VERSIONS['js_v']))
    jsonld = tpl['jsonld'] + ('\n' + fm['jsonld'] if fm['jsonld'] else '')
    skip = ('<a class="skip-link" href="#main-content">Перейти к содержанию</a>' if lang == 'ru'
            else '<a class="skip-link" href="#main-content">Мазмұнға өту</a>')
    return ('<!DOCTYPE html><html lang="%s">\n<head>%s</head>\n<body>\n%s\n%s\n%s\n%s\n%s\n</body>\n</html>\n'
            % (lang, head, jsonld, skip, header, fm['main'], tpl['post']))


def build_pages():
    search_index = {l: [] for l in LANGS}
    for lang in LANGS:
        tpl = {
            'header': read(os.path.join(SRC, 'templates', 'header-%s.html' % lang)).strip(),
            'post': read(os.path.join(SRC, 'templates', 'post-%s.html' % lang)).strip(),
            'jsonld': read(os.path.join(SRC, 'templates', 'jsonld-shared-%s.html' % lang)).strip(),
        }
        for path in sorted(glob.glob(os.path.join(SRC, 'content', lang, '*.html'))):
            slug = os.path.splitext(os.path.basename(path))[0]
            fm = parse_content(path)
            html = render_page(fm, lang, slug, tpl)
            write(page_out_path(lang, slug), html)

            if 'noindex' not in fm['head']:
                t = re.search(r'<title>(.*?)</title>', fm['head'])
                d = re.search(r'<meta name="description" content="([^"]*)"', fm['head'])
                if t and d:
                    search_index[lang].append({
                        'url': page_url(lang, slug),
                        'title': t.group(1),
                        'description': d.group(1),
                    })
    for lang in LANGS:
        write(os.path.join(OUT, 'assets', 'search-%s.json' % lang),
              json.dumps(search_index[lang], ensure_ascii=False, indent=1))
    return {l: len(search_index[l]) for l in LANGS}


ROOT_INDEX = """<!DOCTYPE html><html lang="ru">
<head><meta charset="utf-8"/><meta http-equiv="refresh" content="0; url=/ru/"/>
<title>A-SERVICE</title><link rel="canonical" href="/ru/"/></head>
<body><p><a href="/ru/">Перейти на сайт A-SERVICE</a></p></body>
</html>
"""

NOT_FOUND = """<!--@meta {"nav": null, "pair": "/kk/"} -->
<!--@head-->
<title>Страница не найдена — A-SERVICE</title>
<meta name="robots" content="noindex, follow"/>
<!--@main-->
<main id="main-content">
  <section class="standard-hero">
    <div class="standard-hero-inner not-found-page">
      <p class="eyebrow">Ошибка 404</p>
      <h1>Такой страницы нет</h1>
      <p class="hero-lead">Возможно, адрес изменился. Начните с главной страницы или каталога услуг.</p>
      <div class="hero-actions"><a class="button button-primary" href="/ru/">На главную</a><a class="button button-secondary" href="/ru/uslugi/">Каталог услуг</a>
      </div>
    </div>
  </section>
</main>
"""


def build_404():
    tpl = {
        'header': read(os.path.join(SRC, 'templates', 'header-ru.html')).strip(),
        'post': read(os.path.join(SRC, 'templates', 'post-ru.html')).strip(),
        'jsonld': read(os.path.join(SRC, 'templates', 'jsonld-shared-ru.html')).strip(),
    }
    tmp = os.path.join(SRC, 'content', '_404.html')
    open(tmp, 'w', encoding='utf-8', newline='\n').write(NOT_FOUND)
    fm = parse_content(tmp)
    os.remove(tmp)
    html = render_page(fm, 'ru', 'index', tpl)  # ссылки шапки ведут на главные страницы
    write(os.path.join(OUT, '404.html'), html)


def main():
    clean_output()
    build_css()
    build_js()
    patch_sw()
    VERSIONS['css_v'] = asset_hash([os.path.join(OUT, 'assets', 'css', 'site.css')])
    VERSIONS['js_v'] = asset_hash(glob.glob(os.path.join(OUT, 'assets', 'js', '*.js')))
    counts = build_pages()
    write(os.path.join(OUT, 'index.html'), ROOT_INDEX)
    build_404()
    print('built pages per locale (indexable):', counts)


if __name__ == '__main__':
    main()
