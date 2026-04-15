"""
Application configuration.
All settings are loaded from environment variables (or a .env file).
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    
        
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "basketball-app-videos"
    
    # -- App --
    APP_NAME: str = "Summit Hoops"
    DEBUG: bool = False

    # -- Database --
    # Format: postgresql+asyncpg://user:password@host:port/dbname
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/basketball_app"

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
