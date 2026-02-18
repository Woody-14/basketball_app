"""
Database engine, session factory, and base model.

We use async SQLAlchemy so the API can handle many simultaneous
requests without blocking (important when students are uploading videos).
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


# Create the async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # Logs SQL queries when DEBUG=True
)

# Session factory — each API request gets its own session
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# Base class for all our database models
class Base(DeclarativeBase):
    pass


# Dependency that FastAPI injects into route handlers
async def get_db():
    """
    Usage in a route:
        @router.get("/stuff")
        async def get_stuff(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
