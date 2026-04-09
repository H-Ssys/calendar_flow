from fastapi import APIRouter

from app.core.config import settings
from app.core.supabase_admin import supabase_admin

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/ready")
async def ready():
    checks = {}
    try:
        supabase_admin.from_("profiles").select("id").limit(1).execute()
        checks["supabase"] = True
    except Exception:
        checks["supabase"] = False
    return {
        "ready": all(checks.values()),
        "checks": checks,
        "ocr_provider": settings.ocr_provider,
        "embed_provider": settings.embed_provider,
    }
