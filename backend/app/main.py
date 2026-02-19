"""
Basketball Training App — Backend API

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
from app.database import engine, Base
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
    print(f"🏀 {settings.APP_NAME} is running!")

    yield  # App runs here

    # Shutdown: clean up
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="Personalized basketball training platform — API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the admin dashboard and mobile app to call the API
# In production, replace "*" with your actual frontend domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Lock down in production
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
