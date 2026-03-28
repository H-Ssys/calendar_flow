"""Email endpoints -- stub implementation."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.security import verify_token

router = APIRouter(prefix="/api/v1/email", tags=["email"])


class InviteRequest(BaseModel):
    to: str
    event_id: str


class InviteResponse(BaseModel):
    sent: bool


class DigestRequest(BaseModel):
    user_id: str


class DigestResponse(BaseModel):
    sent: bool
    items_count: int


@router.post("/invite", response_model=InviteResponse)
async def send_invite(
    body: InviteRequest,
    user_id: str = Depends(verify_token),
) -> InviteResponse:
    """Send an event invitation email.

    Stub: actual Resend/SMTP integration to be added later.
    """
    return InviteResponse(sent=False)


@router.post("/digest", response_model=DigestResponse)
async def send_digest(
    body: DigestRequest,
    user_id: str = Depends(verify_token),
) -> DigestResponse:
    """Generate and send a notification digest.

    Stub: actual digest generation to be added later.
    """
    return DigestResponse(sent=False, items_count=0)
