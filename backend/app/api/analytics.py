"""
Analytics endpoints — aggregate metrics for the admin dashboard.

GET /api/analytics/overview        — Key stats: students, compliance, revenue, at-risk
GET /api/analytics/compliance-trend — 12-week weekly assigned vs completed
GET /api/analytics/drills          — Top 15 drills by assignment count
"""

from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.workout import WorkoutAssignment, WorkoutDrill, AssignmentStatus
from app.models.progress import DrillCompletion
from app.models.drill import Drill
from app.services.auth import require_coach

router = APIRouter(tags=["Analytics"])


@router.get("/api/analytics/overview")
async def get_analytics_overview(
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns one JSON object with all the key dashboard metrics.
    Includes: active students, avg compliance (30d), pending video reviews,
    avg response time, tier breakdown + revenue, at-risk student list.
    """
    today = date.today()
    thirty_days_ago = today - timedelta(days=30)

    # --- Active student count ---
    student_result = await db.execute(
        select(func.count()).where(
            User.role == UserRole.STUDENT,
            User.is_active == True,  # noqa: E712
        )
    )
    total_students = student_result.scalar() or 0

    # --- Avg compliance last 30 days (across all students) ---
    compliance_result = await db.execute(
        select(
            func.count().label("total"),
            func.sum(
                case((WorkoutAssignment.status == AssignmentStatus.COMPLETED, 1), else_=0)
            ).label("completed"),
        ).where(WorkoutAssignment.assigned_date >= thirty_days_ago)
    )
    comp_row = compliance_result.one()
    total_assigned = comp_row.total or 0
    total_completed = comp_row.completed or 0
    avg_compliance_30d = round(total_completed / total_assigned * 100, 1) if total_assigned else 0.0

    # --- Pending video reviews ---
    reviews_result = await db.execute(
        select(func.count()).where(
            DrillCompletion.is_reviewed == False,  # noqa: E712
            DrillCompletion.video_url.isnot(None),
        )
    )
    pending_video_reviews = reviews_result.scalar() or 0

    # --- Avg response time: hours from completed_at → feedback_at ---
    response_result = await db.execute(
        select(
            func.avg(
                func.extract(
                    "epoch",
                    DrillCompletion.feedback_at - DrillCompletion.completed_at
                ) / 3600
            )
        ).where(DrillCompletion.feedback_at.isnot(None))
    )
    avg_response_hours = round(float(response_result.scalar() or 0.0), 1)

    # --- Tier breakdown ---
    tier_result = await db.execute(
        select(User.subscription_tier, func.count().label("cnt"))
        .where(User.role == UserRole.STUDENT, User.is_active == True)  # noqa: E712
        .group_by(User.subscription_tier)
    )
    TRAINING_PRICE = 90
    ELITE_PRICE = 195
    training_count = 0
    elite_count = 0
    for row in tier_result.all():
        tier_val = row.subscription_tier.value if row.subscription_tier else None
        if tier_val == "elite":
            elite_count += row.cnt
        else:
            training_count += row.cnt

    total_monthly_revenue = training_count * TRAINING_PRICE + elite_count * ELITE_PRICE

    # --- At-risk: <60% compliance in 30d OR no completed workout in 7+ days ---
    students_result = await db.execute(
        select(User).where(User.role == UserRole.STUDENT, User.is_active == True)  # noqa: E712
    )
    students = students_result.scalars().all()

    at_risk = []
    for student in students:
        s_result = await db.execute(
            select(
                func.count().label("total"),
                func.sum(
                    case((WorkoutAssignment.status == AssignmentStatus.COMPLETED, 1), else_=0)
                ).label("completed"),
                func.max(
                    case(
                        (WorkoutAssignment.status == AssignmentStatus.COMPLETED,
                         WorkoutAssignment.assigned_date),
                        else_=None,
                    )
                ).label("last_completed"),
            ).where(
                WorkoutAssignment.student_id == student.id,
                WorkoutAssignment.assigned_date >= thirty_days_ago,
            )
        )
        s_row = s_result.one()
        s_total = s_row.total or 0
        s_completed = s_row.completed or 0
        compliance = (s_completed / s_total) if s_total > 0 else 0.0
        last_completed = s_row.last_completed

        days_since = None
        if last_completed:
            days_since = (today - last_completed).days
        elif s_total > 0:
            days_since = 30  # Has assignments but never completed

        is_low_compliance = s_total > 0 and compliance < 0.6
        is_inactive = days_since is None or days_since >= 7

        if is_low_compliance or is_inactive:
            at_risk.append({
                "id": student.id,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "compliance_30d": round(compliance * 100, 1),
                "days_since_workout": days_since,
                "current_streak": student.current_streak or 0,
            })

    return {
        "total_students": total_students,
        "avg_compliance_30d": avg_compliance_30d,
        "pending_video_reviews": pending_video_reviews,
        "avg_response_hours": avg_response_hours,
        "tier_breakdown": {
            "training": {
                "count": training_count,
                "monthly_revenue": training_count * TRAINING_PRICE,
            },
            "elite": {
                "count": elite_count,
                "monthly_revenue": elite_count * ELITE_PRICE,
            },
        },
        "total_monthly_revenue": total_monthly_revenue,
        "at_risk": at_risk,
    }


@router.get("/api/analytics/compliance-trend")
async def get_compliance_trend(
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns last 12 weeks of assignment data (Mon–Sun windows).
    Each item: week_start date, week_label, assigned count, completed count, rate%.
    """
    today = date.today()
    current_monday = today - timedelta(days=today.weekday())
    start_date = current_monday - timedelta(weeks=11)  # 12 weeks total

    week_col = func.date_trunc("week", WorkoutAssignment.assigned_date).label("week_start")
    result = await db.execute(
        select(
            week_col,
            func.count().label("assigned"),
            func.sum(
                case((WorkoutAssignment.status == AssignmentStatus.COMPLETED, 1), else_=0)
            ).label("completed"),
        )
        .where(WorkoutAssignment.assigned_date >= start_date)
        .group_by(week_col)
        .order_by(week_col)
    )

    # Index rows by week_start date
    row_map = {}
    for row in result.all():
        ws = row.week_start
        if hasattr(ws, "date"):
            ws = ws.date()
        row_map[ws] = (row.assigned, row.completed or 0)

    # Build all 12 weeks (filling in zeros for empty weeks)
    weeks = []
    for i in range(12):
        week_start = start_date + timedelta(weeks=i)
        assigned, completed = row_map.get(week_start, (0, 0))
        rate = round(completed / assigned * 100, 1) if assigned else 0.0
        # Cross-platform short date label: "Jan 6"
        label = f"{week_start.strftime('%b')} {week_start.day}"
        weeks.append({
            "week_start": week_start.isoformat(),
            "week_label": label,
            "assigned": assigned,
            "completed": completed,
            "rate": rate,
        })

    return weeks


@router.get("/api/analytics/drills")
async def get_drill_analytics(
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """
    Top 15 drills by times assigned (across all workout assignments).
    Each row: drill name, category, times_assigned, times_completed, completion_pct.
    """
    result = await db.execute(
        select(
            Drill.id.label("drill_id"),
            Drill.name.label("name"),
            Drill.category.label("category"),
            func.count(WorkoutAssignment.id).label("times_assigned"),
            func.sum(
                case((WorkoutAssignment.status == AssignmentStatus.COMPLETED, 1), else_=0)
            ).label("times_completed"),
        )
        .join(WorkoutDrill, WorkoutDrill.drill_id == Drill.id)
        .join(WorkoutAssignment, WorkoutAssignment.workout_id == WorkoutDrill.workout_id)
        .group_by(Drill.id, Drill.name, Drill.category)
        .order_by(func.count(WorkoutAssignment.id).desc())
        .limit(15)
    )

    drills = []
    for row in result.all():
        assigned = row.times_assigned or 0
        completed = row.times_completed or 0
        completion_pct = round(completed / assigned * 100, 1) if assigned else 0.0
        drills.append({
            "drill_id": row.drill_id,
            "name": row.name,
            "category": row.category.value if row.category else "",
            "times_assigned": assigned,
            "times_completed": completed,
            "completion_pct": completion_pct,
        })

    return drills
