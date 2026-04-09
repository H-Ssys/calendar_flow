"""Notes proxy endpoints -- all SiYuan calls are server-side only."""

from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import verify_token

router = APIRouter(prefix="/api/v1/notes", tags=["notes"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class NoteCreateRequest(BaseModel):
    title: str
    content: str
    notebookId: str


class NoteCreateResponse(BaseModel):
    siyuanBlockId: str
    supabaseNoteId: str


class NoteUpdateRequest(BaseModel):
    blockId: str
    content: str


class NoteUpdateResponse(BaseModel):
    updated: bool


class NoteSearchRequest(BaseModel):
    query: str


class NoteSearchResponse(BaseModel):
    blocks: list[dict[str, object]]


class NoteGetResponse(BaseModel):
    kramdown: str


class NoteExportResponse(BaseModel):
    content: str


# ---------------------------------------------------------------------------
# SiYuan helper -- SIYUAN_TOKEN never exposed in any response
# ---------------------------------------------------------------------------

async def _siyuan_request(endpoint: str, payload: dict[str, object]) -> dict[str, object]:
    """Make an authenticated request to the SiYuan kernel API."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{settings.SIYUAN_URL}/api/{endpoint}",
            json=payload,
            headers={"Authorization": f"Token {settings.SIYUAN_TOKEN}"},
        )
        resp.raise_for_status()
        data: dict[str, object] = resp.json()
        return data


# ---------------------------------------------------------------------------
# Endpoints -- every one requires verify_token
# ---------------------------------------------------------------------------

@router.post("/create", response_model=NoteCreateResponse)
async def create_note(
    req: NoteCreateRequest,
    user_id: str = Depends(verify_token),
) -> NoteCreateResponse:
    """Create a note in SiYuan and record metadata in Supabase."""
    result = await _siyuan_request(
        "filetree/createDocWithMd",
        {"notebook": req.notebookId, "path": f"/{req.title}", "markdown": req.content},
    )
    siyuan_block_id = str(result.get("data", ""))

    # Insert metadata into Supabase notes table
    from app.core.supabase_admin import get_supabase_admin

    supabase = get_supabase_admin()
    insert_result = (
        supabase.from_("notes")
        .insert(
            {
                "user_id": user_id,
                "title": req.title,
                "siyuan_block_id": siyuan_block_id,
                "vault_path": f"/{req.title}",
            }
        )
        .execute()
    )
    supabase_note_id = insert_result.data[0]["id"] if insert_result.data else ""

    return NoteCreateResponse(
        siyuanBlockId=siyuan_block_id,
        supabaseNoteId=supabase_note_id,
    )


@router.post("/update", response_model=NoteUpdateResponse)
async def update_note(
    req: NoteUpdateRequest,
    user_id: str = Depends(verify_token),
) -> NoteUpdateResponse:
    """Update note content via SiYuan API."""
    await _siyuan_request(
        "block/updateBlock",
        {"dataType": "markdown", "data": req.content, "id": req.blockId},
    )
    return NoteUpdateResponse(updated=True)


@router.post("/search", response_model=NoteSearchResponse)
async def search_notes(
    req: NoteSearchRequest,
    user_id: str = Depends(verify_token),
) -> NoteSearchResponse:
    """Search SiYuan blocks by full-text query."""
    result = await _siyuan_request(
        "search/fullTextSearchBlock",
        {"query": req.query},
    )
    blocks: list[dict[str, object]] = result.get("data", {}).get("blocks", [])  # type: ignore[union-attr]
    return NoteSearchResponse(blocks=blocks)


@router.get("/{block_id}", response_model=NoteGetResponse)
async def get_note(
    block_id: str,
    user_id: str = Depends(verify_token),
) -> NoteGetResponse:
    """Fetch kramdown content for a single block."""
    result = await _siyuan_request(
        "block/getBlockKramdown",
        {"id": block_id},
    )
    kramdown = str(result.get("data", {}).get("kramdown", ""))  # type: ignore[union-attr]
    return NoteGetResponse(kramdown=kramdown)


@router.post("/export/{block_id}", response_model=NoteExportResponse)
async def export_note(
    block_id: str,
    user_id: str = Depends(verify_token),
) -> NoteExportResponse:
    """Export note content as Markdown."""
    result = await _siyuan_request(
        "export/exportMdContent",
        {"id": block_id},
    )
    content = str(result.get("data", {}).get("content", ""))  # type: ignore[union-attr]
    return NoteExportResponse(content=content)
