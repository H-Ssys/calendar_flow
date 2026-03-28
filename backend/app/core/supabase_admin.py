"""Supabase admin client for server-side operations that bypass RLS."""

from supabase import Client, create_client

from app.core.config import settings

_admin_client: Client | None = None


def get_supabase_admin() -> Client:
    """Return a singleton Supabase admin client using the service key.

    The service key bypasses RLS -- use only for server-side operations.
    """
    global _admin_client
    if _admin_client is None:
        _admin_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY,
        )
    return _admin_client
