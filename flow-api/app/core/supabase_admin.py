from supabase import create_client
from app.core.config import settings

supabase_admin = create_client(
    settings.supabase_url,
    settings.supabase_service_key,
)
