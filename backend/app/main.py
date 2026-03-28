"""Ofative Calendar Platform -- FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1.ai import limiter as ai_limiter
from app.api.v1.ai import router as ai_router
from app.api.v1.email import router as email_router
from app.api.v1.notes import router as notes_router
from app.api.v1.ocr import limiter as ocr_limiter
from app.api.v1.ocr import router as ocr_router
from app.api.v1.transcribe import limiter as transcribe_limiter
from app.api.v1.transcribe import router as transcribe_router
from app.core.config import settings
from app.services.siyuan_sync_service import SiYuanSyncService

logger = logging.getLogger(__name__)

sync_service = SiYuanSyncService()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Start background services on startup, clean up on shutdown."""
    # Start SiYuan sync background task (graceful — skip if connection fails)
    try:
        await sync_service.start()
    except Exception:
        logger.warning("SiYuan sync service failed to start — running without sync")
    logger.info("Application started")
    yield
    # Shutdown
    try:
        await sync_service.stop()
    except Exception:
        pass
    logger.info("Application shut down")


app = FastAPI(
    title="Ofative Calendar Platform API",
    version="0.1.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Rate limiting (slowapi)
# ---------------------------------------------------------------------------

# Register all limiters with the app state
app.state.limiter = transcribe_limiter  # primary limiter for the handler
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ---------------------------------------------------------------------------
# Prometheus metrics
# ---------------------------------------------------------------------------

Instrumentator().instrument(app).expose(app)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(notes_router)
app.include_router(transcribe_router)
app.include_router(ocr_router)
app.include_router(ai_router)
app.include_router(email_router)


# ---------------------------------------------------------------------------
# Health / Readiness
# ---------------------------------------------------------------------------

@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}


@app.get("/ready")
async def ready() -> dict[str, object]:
    """Readiness probe -- checks connectivity to Supabase and SiYuan."""
    checks: dict[str, bool] = {"database": False, "siyuan": False}

    # Check Supabase
    try:
        from app.core.supabase_admin import get_supabase_admin

        client = get_supabase_admin()
        # A lightweight query to verify connectivity
        client.from_("notes").select("id").limit(1).execute()
        checks["database"] = True
    except Exception:
        logger.warning("Readiness: Supabase check failed")

    # Check SiYuan
    try:
        async with httpx.AsyncClient(timeout=5.0) as http_client:
            resp = await http_client.post(
                f"{settings.SIYUAN_URL}/api/system/version",
                json={},
                headers={"Authorization": f"Token {settings.SIYUAN_TOKEN}"},
            )
            checks["siyuan"] = resp.status_code == 200
    except Exception:
        logger.warning("Readiness: SiYuan check failed")

    all_ok = all(checks.values())
    return {"ready": all_ok, "checks": checks}
