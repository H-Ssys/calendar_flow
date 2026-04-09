"""Transcription endpoint -- stub implementation."""

from fastapi import APIRouter, Depends, Request, UploadFile
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.security import verify_token

router = APIRouter(tags=["transcribe"])


def _get_user_key(request: Request) -> str:
    """Rate limit key: use authenticated user_id from state."""
    return getattr(request.state, "user_id", get_remote_address(request))


limiter = Limiter(key_func=_get_user_key)


class TranscribeResponse(BaseModel):
    transcript: str
    duration: float
    summary: str


@router.post("/api/v1/transcribe", response_model=TranscribeResponse)
@limiter.limit("10/hour")
async def transcribe(
    request: Request,
    file: UploadFile,
    user_id: str = Depends(verify_token),
) -> TranscribeResponse:
    """Transcribe an uploaded audio file.

    Rate limited to 10 requests per hour per user.
    Stub: actual Whisper/Deepgram integration to be added later.
    """
    request.state.user_id = user_id
    # Stub -- read file to acknowledge upload, return placeholder
    _content = await file.read()
    return TranscribeResponse(
        transcript="[stub] Transcription not yet implemented",
        duration=0.0,
        summary="[stub] Summary not yet implemented",
    )
