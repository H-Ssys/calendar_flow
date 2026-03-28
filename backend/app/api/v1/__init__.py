"""V1 API routers."""

from app.api.v1.ai import router as ai_router
from app.api.v1.email import router as email_router
from app.api.v1.notes import router as notes_router
from app.api.v1.ocr import router as ocr_router
from app.api.v1.transcribe import router as transcribe_router

__all__ = [
    "ai_router",
    "email_router",
    "notes_router",
    "ocr_router",
    "transcribe_router",
]
