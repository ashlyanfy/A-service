"""Check search signals against the files that will actually be served.

Run after python src/build.py: python src/tools/check_discovery.py
"""
from collections import Counter
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser
from xml.etree import ElementTree

PUBLIC = Path(__file__).resolve().parents[2] / 'frontend'
ORIGIN = os.getenv('ASERVICE_SITE_URL', 'https://a-service.asia').rstrip('/')
NAMESPACES = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9',
              'x': 'http://www.w3.org/1999/xhtml',
              'i': 'http://www.google.com/schemas/sitemap-image/1.1'}


class Document(HTMLParser):
    def __init__(self, file):
        super().__init__()
        self.canonicals = []
        self.alternates = {}
        self.robots = []
        self.description = ''
        self.title = ''
        self.h1 = self.graphs = 0
        self.capture = None
        self.feed(file.read_text(encoding='utf-8'))

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canonicals.append(a['href'])
        if tag == 'link' and a.get('rel') == 'alternate' and a.get('hreflang'):
            self.alternates[a['hreflang']] = a['href']
        if tag == 'meta' and a.get('name') in ('robots', 'googlebot'):
            self.robots.extend(re.split('[, ]+', a.get('content', '').lower()))
        if tag == 'meta' and a.get('name') == 'description':
            self.description = a.get('content', '')
        if tag == 'h1':
            self.h1 += 1
        if tag == 'title':
            self.capture = 'title'
        if tag == 'script' and a.get('type') == 'application/ld+json':
            self.capture = 'schema'

    def handle_endtag(self, tag):
        if tag in ('script', 'title'):
            self.capture = None

    def handle_data(self, data):
        if self.capture == 'title':
            self.title += data
        elif self.capture == 'schema':
            json.loads(data)
            self.graphs += 1


def check(condition, description):
    if not condition:
        raise ValueError(description)


def main():
    sitemap = ElementTree.parse(PUBLIC / 'sitemap.xml')
    entries = {}
    images = set()
    for url in sitemap.findall('s:url', NAMESPACES):
        loc = url.findtext('s:loc', namespaces=NAMESPACES)
        check(loc not in entries, 'Duplicate sitemap URL: ' + loc)
        entries[loc] = {e.get('hreflang'): e.get('href') for e in url.findall('x:link', NAMESPACES)}
        for image in url.findall('i:image/i:loc', NAMESPACES):
            src = image.text
            check(src.startswith(ORIGIN + '/assets/') and (PUBLIC / urlsplit(src).path[1:]).is_file(), str(src))
            images.add(src)

    robots = RobotFileParser()
    robots.parse((PUBLIC / 'robots.txt').read_text(encoding='utf-8').splitlines())
    pages = {}
    for lang in ('ru', 'kk'):
        for file in (PUBLIC / lang).rglob('index.html'):
            url = ORIGIN + '/' + file.parent.relative_to(PUBLIC).as_posix() + '/'
            doc = Document(file)
            if 'noindex' in doc.robots:
                continue
            check(doc.canonicals == [url], 'Canonical does not match served URL: ' + url)
            check(doc.h1 == 1 and doc.graphs and doc.title.strip() and doc.description.strip(), 'Incomplete HTML: ' + url)
            pages[url] = doc

    check(entries.keys() == pages.keys(), 'Sitemap differs from public indexable HTML: ' + str(set(entries) ^ set(pages)))
    for url, doc in pages.items():
        check(doc.alternates.keys() == {'ru-KZ', 'kk-KZ', 'x-default'}, 'Incomplete hreflang: ' + url)
        check(doc.alternates == entries[url] and doc.alternates['x-default'] == doc.alternates['ru-KZ'], 'Sitemap alternates: ' + url)
        for alt in doc.alternates.values():
            check(alt in pages and pages[alt].alternates == doc.alternates, 'Hreflang return link: ' + url + ' -> ' + alt)
    if os.getenv('ASERVICE_INDEXABLE', '1') == '1':
        check(pages, 'No indexable content in production')
        for field in ('title', 'description'):
            counts = Counter(getattr(doc, field).strip() for doc in pages.values())
            check(max(counts.values()) == 1, 'Duplicate ' + field)
        for bot in ('Googlebot', 'YandexBot', 'bingbot', 'OAI-SearchBot'):
            check(all(robots.can_fetch(bot, url) for url in pages), bot + ' cannot access a published page')
            for private in ('/leads/1', '/api/requests', '/manager/requests', '/admin/', '/auth/me'):
                check(not robots.can_fetch(bot, ORIGIN + private), 'Missing crawler exclusion: ' + private)
        check(robots.site_maps() == [ORIGIN + '/sitemap.xml'], 'Sitemap directive in robots.txt')
        for name in ('llms.txt', 'llms-full.txt'):
            guide = (PUBLIC / name).read_text(encoding='utf-8')
            links = set(re.findall(r'\]\((https?://[^)]+)\)', guide))
            check(links and links <= pages.keys(), 'Broken or non-canonical guide link in ' + name)
            if name == 'llms-full.txt':
                check(links == pages.keys(), 'Incomplete detailed guide')
    else:
        check(not pages and not robots.can_fetch('Googlebot', ORIGIN + '/ru/'), 'Staging is open to crawling')
    print(f'{len(pages)} indexable pages, {len(images)} unique sitemap images; HTML, schema, hreflang, sitemap and crawler checks passed.')


if __name__ == '__main__':
    main()
