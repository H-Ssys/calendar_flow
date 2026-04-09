from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_service_key: str
    jwt_secret: str = ""

    # AI Providers — all optional, only need the one you use
    google_api_key: str = ""
    openai_api_key: str = ""
    deepseek_api_key: str = ""

    # Active provider selection
    # Options: "deepseek" | "gemini" | "openai"
    ocr_provider: Literal["deepseek", "gemini", "openai"] = "deepseek"

    # Active embedding provider
    # Options: "openai" | "deepseek"
    embed_provider: Literal["openai", "deepseek"] = "openai"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
