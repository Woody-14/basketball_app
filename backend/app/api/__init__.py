from app.api.auth import router as auth_router
from app.api.drills import router as drills_router
from app.api.workouts import router as workouts_router
from app.api.students import router as students_router
from app.api.messages import router as messages_router

all_routers = [
    auth_router,
    drills_router,
    workouts_router,
    students_router,
    messages_router,
]
