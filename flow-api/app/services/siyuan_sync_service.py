"""SiYuan sync service -- runs as a FastAPI lifespan background task.

Polls SiYuan for modified notes and syncs content back to Supabase.
Implements exponential backoff on failure (capped at 300s).
SIYUAN_TOKEN is used server-side only and never logged or exposed.
"""

import asyncio
import logging
from datetime import datetime, timezone

import httpx

from app.core.config import settings
from app.core.supabase_admin import get_supabase_admin

logger = logging.getLogger(__name__)


class SiYuanSyncService:
    """Polls SiYuan API and syncs note content into Supabase."""

    def __init__(self) -> None:
        self._task: asyncio.Task[None] | None = None
        self._interval: int = settings.SIYUAN_SYNC_INTERVAL_SECONDS

    # ------------------------------------------------------------------
    # SiYuan HTTP helper
    # ------------------------------------------------------------------

    async def _siyuan_request(self, endpoint: str, payload: dict[str, object]) -> dict[str, object]:
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

    # ------------------------------------------------------------------
    # Single-note sync
    # ------------------------------------------------------------------

    async def sync_note(self, note_id: str) -> None:
        """Sync a single note from SiYuan to Supabase by its Supabase note id."""
        supabase = get_supabase_admin()
        result = (
            supabase.from_("notes")
            .select("id, siyuan_block_id, siyuan_synced_at")
            .eq("id", note_id)
            .execute()
        )
        if not result.data:
            logger.warning("[Sync] Note %s not found in Supabase", note_id)
            return

        note = result.data[0]
        siyuan_block_id = note.get("siyuan_block_id")
        if not siyuan_block_id:
            return

        export = await self._siyuan_request(
            "export/exportMdContent", {"id": siyuan_block_id}
        )
        markdown = export.get("data", {}).get("content", "")  # type: ignore[union-attr]
        supabase.from_("notes").update(
            {
                "content": str(markdown),
                "siyuan_synced_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", note["id"]).execute()

    # ------------------------------------------------------------------
    # Bulk sync
    # ------------------------------------------------------------------

    async def _sync_modified_notes(self) -> None:
        """Fetch all notes with a siyuan_block_id and sync their content."""
        supabase = get_supabase_admin()
        result = (
            supabase.from_("notes")
            .select("id, siyuan_block_id, siyuan_synced_at")
            .not_.is_("siyuan_block_id", "null")
            .execute()
        )
        for note in result.data or []:
            try:
                siyuan_block_id = note["siyuan_block_id"]
                export = await self._siyuan_request(
                    "export/exportMdContent", {"id": siyuan_block_id}
                )
                markdown = export.get("data", {}).get("content", "")  # type: ignore[union-attr]
                supabase.from_("notes").update(
                    {
                        "content": str(markdown),
                        "siyuan_synced_at": datetime.now(timezone.utc).isoformat(),
                    }
                ).eq("id", note["id"]).execute()
            except Exception:
                logger.exception("[Sync] Failed for block %s", note.get("siyuan_block_id"))

    # ------------------------------------------------------------------
    # Polling loop with exponential backoff
    # ------------------------------------------------------------------

    async def _run_loop(self) -> None:
        """Run the sync polling loop indefinitely."""
        backoff = self._interval
        while True:
            try:
                await self._sync_modified_notes()
                backoff = self._interval
            except asyncio.CancelledError:
                logger.info("[Sync] Loop cancelled, shutting down")
                raise
            except Exception:
                logger.exception("[Sync] Loop error, backing off %ds", backoff)
                backoff = min(backoff * 2, 300)
            await asyncio.sleep(backoff)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def start(self) -> None:
        """Begin the background polling loop."""
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._run_loop())
            logger.info("[Sync] SiYuan sync service started (interval=%ds)", self._interval)

    async def stop(self) -> None:
        """Cancel the polling loop."""
        if self._task is not None and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            logger.info("[Sync] SiYuan sync service stopped")
