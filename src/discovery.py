"""Publish reader-friendly guides from the same public catalogue that produces the site."""
from html import unescape
from pathlib import Path


def page_link(page, site_url, detailed):
    title = unescape(page['title']).split(' | A-SERVICE')[0].replace('[', r'\[').replace(']', r'\]')
    link = f"- [{title}]({site_url}{page['url']})"
    return link + (' — ' + unescape(page['description']) if detailed else '')


def write_site_guides(out, site_url, catalogue, other_pages, indexable):
    root = Path(out)
    if not indexable:
        for filename in ('llms.txt', 'llms-full.txt'):
            (root / filename).unlink(missing_ok=True)
        return

    intro = [
        '# A-SERVICE',
        '',
        '> Монтаж, демонтаж и перевозка банкоматов, утилизация списанного оборудования, изготовление козырьков, наружная мойка банкоматов и терминалов и перевозка банковской мебели в Казахстане.',
        '',
        'Қазақстанда банкоматтарды орнату, бөлшектеу, тасымалдау, кәдеге жарату, күнқағар жасау, банкоматтар мен терминалдардың сыртын жуу және банк жиһазын тасымалдау.',
    ]
    for detailed, filename in [(False, 'llms.txt'), (True, 'llms-full.txt')]:
        lines = intro.copy()
        for lang in ('ru', 'kk'):
            pages = catalogue[lang]
            cases_prefix = '/ru/proekty/' if lang == 'ru' else '/kk/zhobalar/'
            services_prefix = '/ru/uslugi/' if lang == 'ru' else '/kk/qyzmetter/'
            home = next(p for p in pages if p['url'] == f'/{lang}/')
            lines.extend(['', '## ' + ('Русский' if lang == 'ru' else 'Қазақша'), '', page_link(home, site_url, detailed)])
            for prefix, heading in ((services_prefix, 'Услуги' if lang == 'ru' else 'Қызметтер'),
                                    (cases_prefix, 'Портфолио и кейсы' if lang == 'ru' else 'Портфолио және жобалар')):
                lines.extend(['', '### ' + heading, ''])
                lines.extend(page_link(p, site_url, detailed) for p in pages if p['url'].startswith(prefix))
            info = other_pages[lang]
            if not detailed:
                key_pages = {'/ru/geografiya/', '/kk/geografiya/', '/ru/kontakty/', '/kk/baylanystar/'}
                info = [p for p in info if p['url'] in key_pages]
            lines.extend(['', '### ' + ('Справочные страницы' if lang == 'ru' else 'Анықтамалық беттер'), ''])
            lines.extend(page_link(p, site_url, detailed) for p in info)
        (root / filename).write_text('\n'.join(lines) + '\n', encoding='utf-8')
