from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import verify_token
from app.core.supabase_admin import supabase_admin
from app.services.ai_providers import run_embed

router = APIRouter()


class EmbedRequest(BaseModel):
    contact_id: str
    name: str
    full_name: str = ""
    title: str = ""
    department: str = ""
    company: str = ""
    industry: str = ""
    email: str = ""
    phone: str = ""
    address: str = ""
    website: str = ""
    notes: str = ""
    meeting_context: str = ""


@router.post("/embed")
async def generate_embedding(req: EmbedRequest, user=Depends(verify_token)):
    """Generate embedding and store in contact_embeddings table."""
    input_text = (
        f"{req.name} | {req.full_name} | {req.title} | {req.department} | "
        f"{req.company} | {req.industry} | {req.email} | {req.phone} | "
        f"{req.address} | {req.notes} | {req.meeting_context}"
    )

    embedding = await run_embed(input_text)

    supabase_admin.from_("contact_embeddings").upsert(
        {
            "contact_id": req.contact_id,
            "embedding": embedding,
            "metadata": {
                "model": settings.embed_provider,
                "input_preview": input_text[:200],
            },
        },
        on_conflict="contact_id",
    ).execute()

    return {
        "success": True,
        "contact_id": req.contact_id,
        "provider": settings.embed_provider,
    }
