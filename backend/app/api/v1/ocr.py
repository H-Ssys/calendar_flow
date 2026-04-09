"""OCR endpoint for business card scanning -- stub implementation."""

from fastapi import APIRouter, Depends, Request, UploadFile
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.security import verify_token

router = APIRouter(tags=["ocr"])


def _get_user_key(request: Request) -> str:
    """Rate limit key: use authenticated user_id from state."""
    return getattr(request.state, "user_id", get_remote_address(request))


limiter = Limiter(key_func=_get_user_key)


class OCRResponse(BaseModel):
    name: str
    email: str
    phone: str
    company: str
    title: str


@router.post("/api/v1/ocr", response_model=OCRResponse)
@limiter.limit("20/hour")
async def ocr(
    request: Request,
    image: UploadFile,
    user_id: str = Depends(verify_token),
) -> OCRResponse:
    """Extract contact info from a business card image.

    Rate limited to 20 requests per hour per user.
    Stub: actual GenKit + Tesseract integration to be added later.
    """
    request.state.user_id = user_id
    _content = await image.read()
    return OCRResponse(
        name="[stub]",
        email="[stub]",
        phone="[stub]",
        company="[stub]",
        title="[stub]",
    )
