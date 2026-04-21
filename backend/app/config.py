"""
Application configuration.
All settings are loaded from environment variables (or a .env file).
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings
from typing import Optional, List


class Settings(BaseSettings):

    # -- CORS --
    # Comma-separated list of allowed origins in production.
    # Defaults to "*" for local dev. Override via ALLOWED_ORIGINS env var.
    ALLOWED_ORIGINS: List[str] = ["*"]

    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "basketball-app-videos"
    
    # -- App --
    APP_NAME: str = "Summit Hoops"
    DEBUG: bool = False

    # -- Database --
    # Format: postgresql+asyncpg://user:password@host:port/dbname
    # Railway's Postgres template provides DATABASE_URL as postgresql://...
    # The validator below normalises it to the asyncpg scheme automatically.
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/basketball_app"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _coerce_async_db_url(cls, v: str) -> str:
        """Replace the sync postgresql:// scheme with postgresql+asyncpg://."""
        if isinstance(v, str) and v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # -- Authentication --
    SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION-use-a-random-64-char-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # -- S3 / Video Storage (configure when ready) --
    S3_BUCKET_NAME: Optional[str] = None
    S3_REGION: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None

    
    class Config:
        env_file = ".env"


settings = Settings()
