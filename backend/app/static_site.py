"""Раздача статического сайта тем же приложением, что и API.

Сайт (папка frontend/) и CRM живут на одном домене: посетитель получает страницы,
а форма и аналитика бьют в /public/* без CORS. Отдельный веб-сервер не нужен.

Порядок обработки запроса:
  1. маршруты API (подключены в main.py раньше этого модуля);
  2. постоянные редиректы из frontend/redirects.json;
  3. файл из frontend/ — включая чистые URL (/ru/uslugi/ -> ru/uslugi/index.html);
  4. если ничего не нашлось — frontend/404.html с кодом 404.
"""
import json
import os
from urllib.parse import parse_qs

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from starlette.staticfiles import StaticFiles

# frontend/ лежит рядом с backend/ в корне репозитория.
DEFAULT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))
STATIC_DIR = os.path.abspath(os.environ.get("ASERVICE_STATIC_DIR", DEFAULT_DIR))

# Медиа и ассеты версионируются хэшем в имени запроса (?v=), их можно кэшировать надолго.
IMMUTABLE_PREFIXES = ("/assets/", "/images/", "/icons/", "/video/", "/brands/")
NO_STORE_PATHS = ("/sw.js",)


def load_redirects() -> dict[str, str]:
    """Карта постоянных редиректов; собирается сборкой из src/redirects.txt."""
    path = os.path.join(STATIC_DIR, "redirects.json")
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def _normalize(path: str) -> str:
    """Адреса сайта заканчиваются слэшем; сравниваем в одном виде."""
    if path.endswith("/index.html"):
        path = path[:-len("index.html")]
    if not path.endswith("/"):
        path += "/"
    return path


class SiteFiles(StaticFiles):
    """StaticFiles с кэш-заголовками и своей страницей 404."""

    def file_response(self, full_path, stat_result, scope, status_code=200):
        response = super().file_response(full_path, stat_result, scope, status_code)
        path = scope.get("path", "")
        versioned = b"v" in parse_qs(scope.get("query_string", b""))
        if path.startswith(IMMUTABLE_PREFIXES) and (versioned or not path.startswith("/assets/")):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        elif path in NO_STORE_PATHS:
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        else:
            response.headers["Cache-Control"] = "public, max-age=0, must-revalidate"
        return response


def mount_site(app: FastAPI) -> bool:
    """Подключает раздачу сайта. False — если папка сборки не найдена."""
    if not os.path.isdir(STATIC_DIR):
        return False

    redirects = load_redirects()

    @app.middleware("http")
    async def old_urls_redirect(request: Request, call_next):
        target = redirects.get(_normalize(request.url.path))
        if target:
            query = ("?" + request.url.query) if request.url.query else ""
            path, separator, fragment = target.partition("#")
            return RedirectResponse(path + query + separator + fragment, status_code=301)
        return await call_next(request)

    # html=True: каталог отдаётся как index.html, а отсутствующий файл — как
    # 404.html с кодом 404 (ответы API это не затрагивает: их маршруты выше).
    app.mount("/", SiteFiles(directory=STATIC_DIR, html=True), name="site")
    return True
