# -*- coding: utf-8 -*-
"""One-off extractor: converts the old Next.js static export into clean source files.

Reads  frontend/<lang>/**/index.html  (the legacy build)
Writes src/content/<lang>/<slug>.html     - per-page front-matter + pretty <main>
       src/templates/*.html               - shared shell (head, header, footer, dialog)

Run once from repo root:  python src/tools/extract.py
"""
import re, os, glob, json, sys, html

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OLD = os.path.join(REPO, 'frontend')
SRC = os.path.join(REPO, 'src')

NAV_KEYS = ['uslugi', 'proekty', 'resheniya', 'o-kompanii', 'kontakty']

# head tags that belong to the shared layout, not to page content
DROP_HEAD = (
    '<meta charSet', '<meta name="viewport"', 'rel="preload"', 'rel="stylesheet"',
    '<script', 'rel="manifest"', 'name="theme-color"', 'name="color-scheme"',
    'rel="icon"', 'rel="apple-touch-icon"',
)

BLOCK_TAGS = {
    'main', 'section', 'article', 'div', 'nav', 'ul', 'ol', 'li', 'header', 'footer',
    'form', 'fieldset', 'legend', 'figure', 'figcaption', 'details', 'summary', 'dialog',
    'aside', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'table', 'thead', 'tbody', 'tr',
    'video', 'picture', 'blockquote', 'dl', 'dt', 'dd', 'hr', 'address', 'time',
}


def pretty(markup):
    """Conservative reformatter: newline+indent only at `><` boundaries where the
    following tag is block-level, so inline whitespace stays byte-identical."""
    out = []
    depth = 0
    i = 0
    n = len(markup)
    while i < n:
        j = markup.find('<', i)
        if j < 0:
            out.append(markup[i:])
            break
        if j > i:
            out.append(markup[i:j])
        k = markup.find('>', j)
        if k < 0:
            out.append(markup[j:])
            break
        tag = markup[j:k + 1]
        m = re.match(r'</?([a-zA-Z0-9-]+)', tag)
        name = m.group(1).lower() if m else ''
        closing = tag.startswith('</')
        selfclosed = tag.endswith('/>') or name in ('img', 'br', 'hr', 'input', 'source', 'meta', 'link')
        block = name in BLOCK_TAGS
        if block and out and out[-1].endswith('>'):
            if closing:
                depth = max(0, depth - 1)
            out.append('\n' + '  ' * depth)
            if not closing and not selfclosed:
                depth += 1
        elif block:
            if closing:
                depth = max(0, depth - 1)
            elif not selfclosed:
                depth += 1
        out.append(tag)
        i = k + 1
    return ''.join(out)


def split_head(head):
    """returns list of top-level tags in <head> content"""
    tags = []
    i = 0
    while i < len(head):
        j = head.find('<', i)
        if j < 0:
            break
        m = re.match(r'<(meta|link|title|script)\b', head[j:])
        if not m:
            i = j + 1
            continue
        name = m.group(1)
        if name in ('title', 'script'):
            e = head.find('</%s>' % name, j)
            e = e + len(name) + 3
        else:
            e = head.find('>', j) + 1
        tags.append(head[j:e])
        i = e
    return tags


def extract_page(path, lang):
    s = open(path, encoding='utf-8').read()
    rel = os.path.relpath(os.path.dirname(path), os.path.join(OLD, lang)).replace('\\', '/')
    slug = '' if rel == '.' else rel

    head = s[s.find('<head') + 6:s.find('</head>')]
    head_tags = [t for t in split_head(head) if not any(d in t for d in DROP_HEAD)]

    # json-ld scripts (before skip-link); first two are Organization/WebSite -> shared
    body = s[s.find('<body'):]
    jsonld = re.findall(r'<script type="application/ld\+json">.*?</script>', body[:body.find('<header class="site-header"')], re.S)
    page_jsonld = jsonld[2:]

    # header specifics: active nav + other-locale URL
    hs = body.find('<header class="site-header"')
    he = body.find('</header>') + 9
    hdr = body[hs:he]
    nav = None
    dm = re.search(r'<nav class="desktop-nav"[^>]*>(.*?)</nav>', hdr, re.S)
    for idx, a in enumerate(re.finditer(r'<a class="([^"]*)"[^>]*href="([^"]+)"', dm.group(1))):
        if 'active' in a.group(1).split():
            nav = NAV_KEYS[idx]
    other = 'kk' if lang == 'ru' else 'ru'
    pm = re.search(r'hrefLang="%s"[^>]*href="([^"]+)"' % other, hdr) or \
         re.search(r'hrefLang="%s" lang="%s" class="[^"]*"[^>]*href="([^"]+)"' % (other, other), hdr)
    pair = pm.group(1) if pm else None

    ms = body.find('<main')
    me = body.find('</main>') + 7
    main = body[ms:me]
    main = main.replace('<!-- -->', '')

    return {
        'slug': slug, 'lang': lang, 'nav': nav, 'pair': pair,
        'head': head_tags, 'jsonld': page_jsonld, 'main': main,
        'shared_jsonld': jsonld[:2], 'header': body[hs:he],
    }


def extract_shell(sample_page_html, lang):
    """header/footer/dialog templates from any page of the locale"""
    s = sample_page_html
    body = s[s.find('<body'):]
    hs = body.find('<header class="site-header"')
    he = body.find('</header>') + 9
    hdr = body[hs:he]
    ds = body.find('<dialog', he)
    fe = body.find('</footer>', ds) + 9
    post = body[ds:fe]
    return hdr, post


def main():
    os.makedirs(os.path.join(SRC, 'templates'), exist_ok=True)
    shared_written = False
    counts = {}
    for lang in ('ru', 'kk'):
        outdir = os.path.join(SRC, 'content', lang)
        os.makedirs(outdir, exist_ok=True)
        pages = sorted(glob.glob(os.path.join(OLD, lang, '**', 'index.html'), recursive=True))
        counts[lang] = len(pages)
        for p in pages:
            d = extract_page(p, lang)
            name = (d['slug'] or 'index').replace('/', '__') + '.html'
            fm = {'nav': d['nav'], 'pair': d['pair']}
            parts = ['<!--@meta ' + json.dumps(fm, ensure_ascii=False) + ' -->']
            parts.append('<!--@head-->')
            parts.extend(d['head'])
            if d['jsonld']:
                parts.append('<!--@jsonld-->')
                parts.extend(d['jsonld'])
            parts.append('<!--@main-->')
            parts.append(pretty(d['main']))
            open(os.path.join(outdir, name), 'w', encoding='utf-8', newline='\n').write('\n'.join(parts) + '\n')

        # shell templates once per locale, from the services catalogue page
        cat = 'uslugi' if lang == 'ru' else 'kyzmetter'
        sample = open(os.path.join(OLD, lang, cat, 'index.html'), encoding='utf-8').read()
        hdr, post = extract_shell(sample, lang)
        d = extract_page(os.path.join(OLD, lang, cat, 'index.html'), lang)
        open(os.path.join(SRC, 'templates', 'header-%s.html' % lang), 'w', encoding='utf-8', newline='\n').write(pretty(hdr) + '\n')
        open(os.path.join(SRC, 'templates', 'post-%s.html' % lang), 'w', encoding='utf-8', newline='\n').write(pretty(post) + '\n')
        open(os.path.join(SRC, 'templates', 'jsonld-shared-%s.html' % lang), 'w', encoding='utf-8', newline='\n').write('\n'.join(d['shared_jsonld']) + '\n')
    print('extracted:', counts)


if __name__ == '__main__':
    main()
