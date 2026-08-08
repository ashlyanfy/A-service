# -*- coding: utf-8 -*-
"""One-off: консолидация каталога услуг (ru/uslugi, kk/kyzmetter).

Меньше карточек в секции, дубли по смыслу — компактной строкой ссылок
«Смежные страницы»; каждой карточке — своя тематическая картинка.
Правит src/content/{ru/uslugi,kk/kyzmetter}.html.

Запуск из корня:  python src/tools/consolidate_services.py
"""
import os
import re

SRC = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# карточки в секции (по slug из href) и дубли, уходящие в строку ссылок
SECTIONS = [
    {
        'cards': ['bankovskaya-infrastruktura', 'montazh-bankomatov', 'demontazh-bankomatov',
                  'peremeshchenie-bankomatov-i-terminalov', 'takelazhnye-raboty',
                  'pogruzka-bankovskogo-oborudovaniya'],
        'links': ['montazh-platezhnyh-terminalov', 'demontazh-platezhnyh-terminalov'],
    },
    {
        'cards': ['pokraska-i-vosstanovlenie-bankomatov', 'chastichnaya-pokraska-bankomata',
                  'rebrending-bankomatov', 'podbor-tsveta-ral-dlya-bankomata'],
        'links': ['pokraska-bankomatov', 'vosstanovlenie-bankomatov', 'brendirovanie-bankomatov'],
    },
    {
        'cards': ['kozyrki-dlya-bankomatov', 'zamer-i-proektirovanie-kozyrkov',
                  'izgotovlenie-kozyrkov', 'montazh-demontazh-kozyrkov', 'remont-kozyrkov'],
        'links': ['ulichnye-kozyrki-dlya-bankomatov', 'fasadnye-kozyrki-dlya-bankomatov',
                  'usilennye-kozyrki-dlya-bankomatov', 'kozyrki-dlya-platezhnyh-terminalov',
                  'pokraska-i-brending-kozyrkov', 'dostavka-kozyrkov-dlya-bankomatov',
                  'demontazh-kozyrkov-bankomatov', 'vosstanovlenie-mesta-montazha'],
    },
    {
        'cards': ['korporativnaya-logistika', 'perevozka-ofisnoy-mebeli', 'uslugi-gruzchikov',
                  'sborka-razborka-mebeli', 'upakovka-mebeli'],
        'links': ['pogruzochno-razgruzochnye-raboty', 'vnutrennee-peremeshchenie-mebeli',
                  'razborka-ofisnoy-mebeli', 'vyvoz-ofisnoy-mebeli', 'vyvoz-mebeli-i-musora'],
    },
]

# slug (ru) -> тематическая картинка
IMAGES = {
    'bankovskaya-infrastruktura': 'quality-team.webp',
    'montazh-bankomatov': 'visual-atm-installation.webp',
    'demontazh-bankomatov': 'interior-relocation.webp',
    'peremeshchenie-bankomatov-i-terminalov': 'visual-rigging.webp',
    'takelazhnye-raboty': 'site-hoisting.webp',
    'pogruzka-bankovskogo-oborudovaniya': 'atm-batch-secured-truck.webp',
    'pokraska-i-vosstanovlenie-bankomatov': 'visual-atm-painting.webp',
    'chastichnaya-pokraska-bankomata': 'remont_bankomat.webp',
    'rebrending-bankomatov': 'workshop-batch.webp',
    'podbor-tsveta-ral-dlya-bankomata': 'painted-enclosures.webp',
    'kozyrki-dlya-bankomatov': 'installed-yellow-atm-canopy.webp',
    'zamer-i-proektirovanie-kozyrkov': 'visual-site-survey.webp',
    'izgotovlenie-kozyrkov': 'visual-canopy-fabrication.webp',
    'montazh-demontazh-kozyrkov': 'visual-canopy-installation.webp',
    'remont-kozyrkov': 'experience-installed-canopy.webp',
    'korporativnaya-logistika': 'logistics-fleet.webp',
    'perevozka-ofisnoy-mebeli': 'visual-corporate-move.webp',
    'uslugi-gruzchikov': 'mobile-service-team.webp',
    'sborka-razborka-mebeli': 'visual-furniture-assembly.webp',
    'upakovka-mebeli': 'visual-secure-packing.webp',
}

LABEL = {'ru': 'Смежные страницы', 'kk': 'Қатысты беттер'}
FILES = {'ru': 'ru/uslugi.html', 'kk': 'kk/kyzmetter.html'}


# исходный порядок 38 карточек (одинаков в ru и kk файлах до консолидации)
ORIGINAL_ORDER = [
    'bankovskaya-infrastruktura', 'pokraska-bankomatov', 'vosstanovlenie-bankomatov',
    'brendirovanie-bankomatov', 'montazh-bankomatov', 'demontazh-bankomatov',
    'montazh-platezhnyh-terminalov', 'demontazh-platezhnyh-terminalov',
    'peremeshchenie-bankomatov-i-terminalov', 'pogruzka-bankovskogo-oborudovaniya',
    'takelazhnye-raboty',
    'pokraska-i-vosstanovlenie-bankomatov', 'chastichnaya-pokraska-bankomata',
    'rebrending-bankomatov', 'podbor-tsveta-ral-dlya-bankomata',
    'kozyrki-dlya-bankomatov', 'izgotovlenie-kozyrkov', 'montazh-demontazh-kozyrkov',
    'remont-kozyrkov', 'zamer-i-proektirovanie-kozyrkov', 'ulichnye-kozyrki-dlya-bankomatov',
    'fasadnye-kozyrki-dlya-bankomatov', 'kozyrki-dlya-platezhnyh-terminalov',
    'usilennye-kozyrki-dlya-bankomatov', 'dostavka-kozyrkov-dlya-bankomatov',
    'demontazh-kozyrkov-bankomatov', 'pokraska-i-brending-kozyrkov',
    'vosstanovlenie-mesta-montazha',
    'korporativnaya-logistika', 'perevozka-ofisnoy-mebeli', 'uslugi-gruzchikov',
    'sborka-razborka-mebeli', 'upakovka-mebeli', 'vyvoz-mebeli-i-musora',
    'pogruzochno-razgruzochnye-raboty', 'vnutrennee-peremeshchenie-mebeli',
    'razborka-ofisnoy-mebeli', 'vyvoz-ofisnoy-mebeli',
]


def ru_slug_map(text, lang):
    """href (текущей локали) -> ru-slug, по порядку карточек в файле."""
    hrefs = re.findall(r'<a class="service-card"[^>]*href="([^"]+)"', text)
    if lang == 'ru':
        return {h: h.strip('/').split('/')[-1] for h in hrefs}
    assert len(hrefs) == len(ORIGINAL_ORDER), 'kk file has %d cards' % len(hrefs)
    return {h: r for h, r in zip(hrefs, ORIGINAL_ORDER)}


def transform(path, lang):
    text = open(path, encoding='utf-8').read()
    slug_of = ru_slug_map(text, lang)

    # собрать карточки: href -> (полный html карточки)
    cards = {}
    for m in re.finditer(r'<a class="service-card".*?</a>', text, re.S):
        href = re.search(r'href="([^"]+)"', m.group(0)).group(1)
        cards[slug_of[href]] = m.group(0)

    # найти сетки
    grids = list(re.finditer(r'<div class="service-card-grid">(.*?)\n(\s*)</div>', text, re.S))
    assert len(grids) == 4, 'expected 4 grids in %s' % path

    out = text
    for gi in reversed(range(4)):
        plan = SECTIONS[gi]
        g = grids[gi]
        indent = g.group(2)
        new_cards = []
        for n, slug in enumerate(plan['cards'], 1):
            c = cards[slug]
            img = IMAGES[slug]
            if '<img src="/images/' in c:
                c = re.sub(r'<img src="/images/[^"]+"', '<img src="/images/%s"' % img, c, count=1)
            else:
                c = c.replace('<svg', '<img src="/images/%s" width="900" height="620" alt="" loading="lazy"/><svg' % img, 1)
            c = re.sub(r'(<span class="service-index">)[^<]*(</span>)', r'\g<1>%02d\g<2>' % n, c, count=1)
            new_cards.append(c)

        chips = ['<span class="service-links-label">%s</span>' % LABEL[lang]]
        for slug in plan['links']:
            href = re.search(r'href="([^"]+)"', cards[slug]).group(1)
            title = re.search(r'<h3>(.*?)</h3>', cards[slug]).group(1)
            chips.append('<a class="service-link" href="%s">%s</a>' % (href, title))

        block = ('<div class="service-card-grid">\n' + indent + '  '
                 + ('\n' + indent + '  ').join(new_cards)
                 + '\n' + indent + '</div>\n' + indent
                 + '<div class="service-links">' + ''.join(chips) + '</div>')
        out = out[:g.start()] + block + out[g.end():]

    # повторяющийся подзаголовок секции оставить только в первой
    heads = list(re.finditer(r'(<div class="section-heading">.*?)(<p>[^<]*</p>)(\s*</div>)', out, re.S))
    for h in reversed(heads[1:]):
        out = out[:h.start()] + h.group(1).rstrip() + h.group(3) + out[h.end():]

    open(path, 'w', encoding='utf-8', newline='\n').write(out)
    total = sum(len(s['cards']) for s in SECTIONS)
    print('%s: %d cards, %d link chips' % (path, total, sum(len(s['links']) for s in SECTIONS)))


for lang, rel in FILES.items():
    transform(os.path.join(SRC, 'content', rel), lang)
