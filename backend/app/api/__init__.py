from app.api.auth import router as auth_router
from app.api.drills import router as drills_router
from app.api.workouts import router as workouts_router
from app.api.students import router as students_router
from app.api.messages import router as messages_router
from app.api.completions import router as completions_router
from app.api.skills import router as skills_router
from app.api.parent import router as parent_router
from app.api.analytics import router as analytics_router
from app.api.content import router as content_router

all_routers = [
    auth_router,
    drills_router,
    workouts_router,
    students_router,
    messages_router,
    completions_router,
    skills_router,
    parent_router,
    analytics_router,
    content_router,
]
