"""Join the approved bank catalogue to the legacy static build without requiring Node on Railway."""
import html
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ORIGIN = 'https://a-service.asia'
PAGES = Path(__file__).resolve().parent / 'bank_site' / 'pages'


class PageMetadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reading_title = False
        self.title = ''
        self.description = ''
        self.alternates = {}
        self.images = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'title':
            self.reading_title = True
        elif tag == 'meta' and a.get('name') == 'description':
            self.description = a['content']
        elif tag == 'link' and a.get('rel') == 'alternate':
            self.alternates[a['hreflang']] = urlsplit(a['href']).path
        elif tag == 'a' and 'data-case-image' in a:
            self.images.append(a['href'])
        elif tag == 'img' and a.get('alt') and (
                a.get('id') == 'service-hero-image' or a.get('src', '').startswith('/assets/work-photos/')):
            self.images.append(a['src'])

    def handle_endtag(self, tag):
        if tag == 'title':
            self.reading_title = False

    def handle_data(self, data):
        if self.reading_title:
            self.title += data


def catalogue():
    pages = {}
    for source in sorted(PAGES.glob('*/**/index.html')):
        route = '/' + source.parent.relative_to(PAGES).as_posix() + '/'
        lang = route.split('/')[1]
        text = source.read_text(encoding='utf-8')
        meta = PageMetadata()
        meta.feed(text)
        if not meta.title or not meta.description or meta.alternates.get(lang+'-KZ') != route:
            raise ValueError('Incomplete page metadata in ' + str(source))
        pages[route] = (text, meta)
    if not {'/ru/', '/kk/'} <= pages.keys():
        raise ValueError('Missing src/bank_site/pages. Restore it or run node src/bank_site/prerender.mjs.')
    for route, (_, meta) in pages.items():
        if any(target not in pages for target in meta.alternates.values()):
            raise ValueError('Missing translated page for ' + route)
    return pages


def install(pages, out, site_url, indexable, scripts):
    """Render the additional storefront and return index rows for the existing Python pipeline."""
    search = {'ru': [], 'kk': []}
    sitemap = []
    for route, (text, meta) in pages.items():
        lang = route.split('/')[1]
        section = 'home' if route in ('/ru/', '/kk/') else ('proekty' if route.startswith(('/ru/proekty/', '/kk/zhobalar/')) else 'uslugi')
        text = text.replace(ORIGIN+'/', site_url+'/')
        if not indexable:
            text = text.replace('content="index,follow', 'content="noindex,follow')
        # Original analytics and CRM settings load after the storefront's own deferred scripts.
        text = text.replace('</head>', scripts(lang, section) + '\n</head>', 1)
        dest = Path(out, route.strip('/'), 'index.html')
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(text, encoding='utf-8')
        search[lang].append({'url': route, 'title': meta.title, 'description': meta.description})
        other = 'kk' if lang == 'ru' else 'ru'
        sitemap.append({'lang': lang, 'url': route, 'pair': meta.alternates[other+'-KZ'],
                        'nav': section, 'images': list(dict.fromkeys(meta.images)),
                        'slug': 'index' if section == 'home' else route.strip('/').split('/')[-1]})
    return search, sitemap


def shared_scripts(lang, section, api_url, ga_id, js_version, ga_snippet):
    config = {'apiUrl': api_url, 'gaId': ga_id, 'lang': lang, 'section': section}
    encoded = json.dumps(config, ensure_ascii=False).replace('<', '\\u003c')
    version = html.escape(js_version, quote=True)
    return (f'<link rel="manifest" href="/manifest-{lang}.webmanifest">\n'
            f'<script>window.AS_CONFIG={encoded}</script>\n'
            f'<script defer src="/assets/js/cms.js?v={version}"></script>\n'
            + ga_snippet + f'\n<script defer src="/assets/js/bank-bridge.js?v={version}"></script>')
