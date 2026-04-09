"""AI assistant endpoints -- stub implementation."""

from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.security import verify_token

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])


def _get_user_key(request: Request) -> str:
    """Rate limit key: use authenticated user_id from state."""
    return getattr(request.state, "user_id", get_remote_address(request))


limiter = Limiter(key_func=_get_user_key)


class ChatRequest(BaseModel):
    message: str
    context: Optional[dict[str, object]] = None


class ChatResponse(BaseModel):
    reply: str
    actions: Optional[list[dict[str, object]]] = None


class MemoryResponse(BaseModel):
    memories: list[dict[str, object]]


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("30/minute")
async def chat(
    request: Request,
    body: ChatRequest,
    user_id: str = Depends(verify_token),
) -> ChatResponse:
    """Send a message to the AI assistant.

    Rate limited to 30 requests per minute per user.
    Stub: actual OpenClaw integration to be added later.
    """
    request.state.user_id = user_id
    return ChatResponse(
        reply="[stub] AI chat not yet implemented",
        actions=None,
    )


@router.get("/memory", response_model=MemoryResponse)
async def get_memory(
    user_id: str = Depends(verify_token),
) -> MemoryResponse:
    """Retrieve AI long-term memory from notes vault.

    Stub: actual memory retrieval to be added later.
    """
    return MemoryResponse(memories=[])
