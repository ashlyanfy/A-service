# -*- coding: utf-8 -*-
"""One-off: de-minify the legacy CSS bundle and split it into sequential modules.

Source order is preserved exactly (files are meant to be loaded in numeric order),
so the cascade stays identical to the original bundle.

Run from repo root:  python src/tools/split_css.py
"""
import re, os

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC_CSS = os.path.join(REPO, 'frontend', '_next', 'static', 'chunks', '0.c7rya17m5lt.css')
OUT_DIR = os.path.join(REPO, 'src', 'assets', 'css')


def parse_rules(css, depth=0):
    """yields formatted chunks, preserving order; recurses into @media/@supports"""
    out = []
    i = 0
    n = len(css)
    ind = '  ' * depth
    while i < n:
        while i < n and css[i] in ' \t\r\n':
            i += 1
        if i >= n:
            break
        if css.startswith('/*', i):
            e = css.find('*/', i) + 2
            out.append(('comment', css[i:e], ind + css[i:e]))
            i = e
            continue
        b = css.find('{', i)
        if b < 0:
            break
        sel = css[i:b].strip()
        if sel.startswith(('@media', '@supports', '@keyframes')):
            # find matching close brace
            depth_c = 1
            j = b + 1
            while j < n and depth_c:
                if css[j] == '{':
                    depth_c += 1
                elif css[j] == '}':
                    depth_c -= 1
                j += 1
            inner = parse_rules(css[b + 1:j - 1], depth + 1)
            body = '\n'.join(t[2] for t in inner)
            out.append(('at', sel, '%s%s {\n%s\n%s}' % (ind, sel, body, ind)))
            i = j
            continue
        e = css.find('}', b)
        decls = css[b + 1:e].strip().rstrip(';')
        if decls:
            lines = []
            # split on ; not inside parens/quotes
            d = 0
            start = 0
            for k, c in enumerate(decls):
                if c == '(':
                    d += 1
                elif c == ')':
                    d -= 1
                elif c == ';' and d == 0:
                    lines.append(decls[start:k].strip())
                    start = k + 1
            lines.append(decls[start:].strip())
            body = '\n'.join('%s  %s;' % (ind, l) for l in lines if l)
            out.append(('rule', sel, '%s%s {\n%s\n%s}' % (ind, sel, body, ind)))
        else:
            out.append(('rule', sel, '%s%s {}' % (ind, sel)))
        i = e + 1
    return out


HEADER = ('/* %s\n'
          '   Слой %d из 5. Файлы подключаются строго по номерам: это исторические\n'
          '   слои одного каскада, порядок менять нельзя. */\n\n')

# (filename, human title, first rule index of the layer)
LAYERS = [
    ('10-base.css', 'Базовые стили: токены, типографика, кнопки, шапка, секции (первая итерация дизайна)', 0),
    ('20-redesign.css', 'Вторая итерация дизайна: герои, карточки, рельсы, футер', None),      # первый :root после медиа-блока
    ('30-premium-home.css', 'Премиум-редизайн главной и общих блоков (префикс .as-)', None),
    ('40-brand-components.css', 'Фирменные токены --as-brand-*, карточки услуг, диалог расчёта, формы', None),
    ('50-overrides.css', 'Точечные правки поверх всех слоёв', None),
]


def main():
    css = open(SRC_CSS, encoding='utf-8').read()
    rules = parse_rules(css)
    os.makedirs(OUT_DIR, exist_ok=True)

    idx_lines = []
    for i, (kind, sel, _) in enumerate(rules):
        idx_lines.append('%4d %s %s' % (i, kind, sel[:110]))
    open(os.path.join(OUT_DIR, '_rule-index.txt'), 'w', encoding='utf-8').write('\n'.join(idx_lines))

    # layer boundaries: every `:root` rule that follows an at-rule block starts a
    # new generation; the custom-overrides comment starts the last file
    roots = [i for i, (k, sel, _) in enumerate(rules)
             if k == 'rule' and sel == ':root' and i > 0 and rules[i - 1][0] == 'at']
    comment = [i for i, (k, sel, _) in enumerate(rules) if k == 'comment' and 'custom overrides' in sel]
    bounds = [0] + roots + comment
    assert len(bounds) == len(LAYERS), 'expected %d layers, found bounds %r' % (len(LAYERS), bounds)

    for li, (fname, title, _) in enumerate(LAYERS):
        a = bounds[li]
        b = bounds[li + 1] if li + 1 < len(bounds) else len(rules)
        body = '\n\n'.join(t[2] for t in rules[a:b])
        text = (HEADER % (title, li + 1)) + body + '\n'
        open(os.path.join(OUT_DIR, fname), 'w', encoding='utf-8', newline='\n').write(text)
        print('%s  rules %d..%d  (%.1f KB)' % (fname, a, b - 1, len(text) / 1024))


if __name__ == '__main__':
    main()
