"""Archived page rows stay in the database for history. Public content uses the new routes."""

ARCHIVED_SLUGS = frozenset((
    "/ru/uslugi/remont-denezhnyh-kasset/",
    "/ru/uslugi/vykup-denezhnyh-kasset/",
    "/kk/qyzmetter/aksha-kassetalaryn-zhondeu/",
    "/kk/qyzmetter/aksha-kassetalaryn-satyp-alu/",
    "/ru/uslugi/chistka-bankomatov-i-terminalov/",
    "/kk/qyzmetter/bankomattar-men-terminaldardy-tazalau/",
    "/ru/proekty/podem-i-peremeshchenie-terminala/",
    "/kk/zhobalar/terminaldy-koteru-zhane-zhylzhytu/",
))
