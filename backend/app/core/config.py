"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration. Secrets are loaded from env vars only."""

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str  # NEVER log or expose
    SUPABASE_JWT_SECRET: str  # NEVER log or expose

    # SiYuan
    SIYUAN_URL: str = "http://siyuan:6806"
    SIYUAN_TOKEN: str  # NEVER log or expose
    SIYUAN_SYNC_INTERVAL_SECONDS: int = 30

    # CORS
    FASTAPI_CORS_ORIGINS: str = "http://localhost:5173"

    # Email (optional)
    RESEND_API_KEY: str = ""

    # Logging
    LOG_LEVEL: str = "INFO"

    @property
    def cors_origins(self) -> list[str]:
        """Parse comma-separated CORS origins."""
        return [o.strip() for o in self.FASTAPI_CORS_ORIGINS.split(",") if o.strip()]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }

    def __repr__(self) -> str:
        """Override repr to prevent accidental secret leakage."""
        return "Settings(***)"

    def __str__(self) -> str:
        """Override str to prevent accidental secret leakage."""
        return "Settings(***)"


settings = Settings()  # type: ignore[call-arg]
