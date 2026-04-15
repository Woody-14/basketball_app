"""
Summit Hoops — Backend API

Run with:
    uvicorn app.main:app --reload

API docs available at:
    http://localhost:8000/docs  (Swagger UI)
    http://localhost:8000/redoc (ReDoc)
"""

from contextlib import asynccontextmanager
from app.api.uploads import router as uploads_router

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.api import all_routers

# Import all models so SQLAlchemy knows about them
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs on app startup and shutdown.
    In development, this creates all database tables automatically.
    In production, you'd use Alembic migrations instead.
    """
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
