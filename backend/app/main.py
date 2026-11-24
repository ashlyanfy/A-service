from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.core.limiter import limiter
from app.routers import (
    auth,
    bank_requests,
    events,
    leads,
    notifications,
    pages,
    public,
    search,
    seo,
    settings as settings_router,
    users,
)
from app.static_site import STATIC_DIR, mount_site

# 12 MB: заявка с вложением до 10 MB + поля формы; остальные запросы много меньше.
MAX_BODY_SIZE = 12 * 1024 * 1024

app = FastAPI(
    title="A-SERVICE Admin API",
    version="1.0.0",
    lifespan=bank_requests.mail_lifespan,
    docs_url="/docs" if settings.env == "development" else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.env == "development" else None,
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_429_TOO_MANY_REQUESTS, content={"detail": "Too many requests"})


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length is not None and int(content_length) > MAX_BODY_SIZE:
        return JSONResponse(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, content={"detail": "Payload too large"})
    return await call_next(request)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    if settings.env != "development":
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    return response


app.include_router(auth.router)
app.include_router(leads.router)
app.include_router(events.router)
app.include_router(users.router)
app.include_router(pages.router)
app.include_router(seo.router)
app.include_router(settings_router.router)
app.include_router(notifications.router)
app.include_router(search.router)
app.include_router(public.router)
app.include_router(bank_requests.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


# Статика сайта монтируется последней: маршруты API объявлены выше и имеют приоритет.
if mount_site(app):
    print(f"[static] сайт раздаётся из {STATIC_DIR}")
else:
    print(
        f"[static] папка сборки не найдена: {STATIC_DIR}. Поднят только API. "
        "Соберите сайт (python src/build.py) и запускайте сервис из корня репозитория."
    )
