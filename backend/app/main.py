"""
Summit Hoops — Backend API

Run with:
    uvicorn app.main:app --reload

API docs available at:
    http://localhost:8000/docs  (Swagger UI)
    http://localhost:8000/redoc (ReDoc)
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from app.api.uploads import router as uploads_router

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.api import all_routers

# Import all models so SQLAlchemy knows about them
import app.models  # noqa: F401

logger = logging.getLogger(__name__)

# Exceptions that indicate the database isn't ready yet (not a config error).
_DB_TRANSIENT_ERRORS = (
    ConnectionRefusedError,
    OperationalError,
    OSError,
)


async def _wait_for_db(
    max_wait: float = 30.0,
    base_delay: float = 1.0,
    backoff_factor: float = 2.0,
    max_delay: float = 8.0,
) -> None:
    """
    Probe the database with a lightweight query, retrying with exponential
    backoff until the connection succeeds or *max_wait* seconds have elapsed.

    Catches transient connection errors (ConnectionRefusedError, asyncpg
    CannotConnectNowError surfaced as SQLAlchemy OperationalError, etc.) so
    the app can survive a race between the app container and the Postgres
    container starting in parallel.
    """
    deadline = asyncio.get_event_loop().time() + max_wait
    delay = base_delay
    attempt = 0

    while True:
        attempt += 1
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            logger.info("Database is ready (attempt %d).", attempt)
            return
        except _DB_TRANSIENT_ERRORS as exc:
            remaining = deadline - asyncio.get_event_loop().time()
            if remaining <= 0:
                logger.error(
                    "Database still unavailable after %.0f s — giving up.", max_wait
                )
                raise RuntimeError(
                    f"Could not connect to the database after {max_wait}s."
                ) from exc

            wait = min(delay, remaining)
            logger.warning(
                "Database not ready (attempt %d): %s. Retrying in %.1f s…",
                attempt,
                exc,
                wait,
            )
            await asyncio.sleep(wait)
            delay = min(delay * backoff_factor, max_delay)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs on app startup and shutdown.
    In development, this creates all database tables automatically.
    In production, you'd use Alembic migrations instead.
    """
    # Wait until Postgres is accepting connections before running any DDL.
    await _wait_for_db()

    # Startup: create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Idempotent column migrations (create_all won't add columns to existing tables)
        await conn.execute(text("ALTER TABLE drills ADD COLUMN IF NOT EXISTS video_key VARCHAR"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token VARCHAR(200)"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1"))
        await conn.execute(text(
            "ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS "
            "scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW()"
        ))
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS training_phase VARCHAR(30)"
        ))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS drill_phases (
                drill_id INTEGER NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
                phase VARCHAR(30) NOT NULL,
                PRIMARY KEY (drill_id, phase)
            )
        """))

    # ALTER TYPE ADD VALUE must run in AUTOCOMMIT mode — PostgreSQL won't allow it
    # inside a regular transaction block alongside DML statements.
    async with engine.connect() as conn:
        await conn.execution_options(isolation_level="AUTOCOMMIT")
        await conn.execute(text("ALTER TYPE subscriptiontier ADD VALUE IF NOT EXISTS 'training'"))

    # Migrate legacy tier values in a separate transaction after the enum is committed.
    # Cast to ::text in the WHERE clause so PostgreSQL doesn't reject 'base'/'standard'
    # as invalid enum literals if the type was recently recreated without them.
    async with engine.begin() as conn:
        await conn.execute(text(
            "UPDATE users SET subscription_tier = 'training' "
            "WHERE subscription_tier::text IN ('base', 'standard')"
        ))

    # Seed default badges (idempotent — only inserts if not already present)
    from app.services.badges import seed_default_badges
    async with AsyncSessionLocal() as db:
        await seed_default_badges(db)
        await db.commit()

    # Seed demo accounts and sample data (idempotent)
    from app.seed import seed as run_seed
    await run_seed()

    print(f"{settings.APP_NAME} is running!")

    yield  # App runs here

    # Shutdown: clean up
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="Summit Hoops — API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — controlled by ALLOWED_ORIGINS env var (defaults to "*" in dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all route modules
for router in all_routers:
    app.include_router(router)
app.include_router(uploads_router)



# Health check
@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}
