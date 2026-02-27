"""
Badge Evaluation Service.

Calculates and awards badges to a student when they complete workouts.
Evaluates:
- WORKOUT_COUNT badges (e.g., First Rep, 10 Workouts, Century Club)
- STREAK badges (e.g., Hat Trick, Weekly Warrior, 60-Day Elite)
- PERFECT_WEEK badge: complete all assigned workouts in a Mon–Sun week (≥3 assigned)
"""

from datetime import date, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.progress import Badge, UserBadge, BadgeType, WorkoutCompletion
from app.models.workout import WorkoutAssignment, AssignmentStatus


# Default badge definitions — seeded into the DB on startup
_DEFAULT_BADGES = [
    # WORKOUT_COUNT
    {"name": "First Rep",      "description": "Complete your very first workout.",                 "badge_type": BadgeType.WORKOUT_COUNT, "threshold_value": 1},
    {"name": "5 Strong",       "description": "Complete 5 workouts.",                              "badge_type": BadgeType.WORKOUT_COUNT, "threshold_value": 5},
    {"name": "10 Workouts",    "description": "Complete 10 workouts.",                             "badge_type": BadgeType.WORKOUT_COUNT, "threshold_value": 10},
    {"name": "25 Workouts",    "description": "Complete 25 workouts.",                             "badge_type": BadgeType.WORKOUT_COUNT, "threshold_value": 25},
    {"name": "50 Workouts",    "description": "Complete 50 workouts.",                             "badge_type": BadgeType.WORKOUT_COUNT, "threshold_value": 50},
    {"name": "Century Club",   "description": "Complete 100 workouts. Elite dedication.",          "badge_type": BadgeType.WORKOUT_COUNT, "threshold_value": 100},
    # STREAK
    {"name": "Hat Trick",      "description": "Maintain a 3-day streak.",                         "badge_type": BadgeType.STREAK,        "threshold_value": 3},
    {"name": "Weekly Warrior", "description": "Maintain a 7-day streak.",                         "badge_type": BadgeType.STREAK,        "threshold_value": 7},
    {"name": "Two Weeks Strong","description": "Maintain a 14-day streak.",                       "badge_type": BadgeType.STREAK,        "threshold_value": 14},
    {"name": "Monthly Grind",  "description": "Maintain a 30-day streak.",                        "badge_type": BadgeType.STREAK,        "threshold_value": 30},
    {"name": "60-Day Elite",   "description": "Maintain a 60-day streak.",                        "badge_type": BadgeType.STREAK,        "threshold_value": 60},
    # PERFECT_WEEK
    {"name": "Perfect Week",   "description": "Complete every assigned workout in a full week (min 3 assigned).", "badge_type": BadgeType.PERFECT_WEEK, "threshold_value": 3},
]


async def seed_default_badges(db: AsyncSession) -> None:
    """
    Insert the default badge set if the badges don't already exist.
    Idempotent — safe to call on every startup.
    """
    inserted = 0
    for badge_data in _DEFAULT_BADGES:
        result = await db.execute(select(Badge).where(Badge.name == badge_data["name"]))
        if result.scalar_one_or_none() is None:
            db.add(Badge(**badge_data))
            inserted += 1
    if inserted:
        await db.flush()
        print(f"Seeded {inserted} badge(s)")


async def evaluate_badges(student: User, db: AsyncSession) -> list[Badge]:
    """
    Evaluate if the student has earned any new badges based on their current stats.
    Awards the badges by inserting UserBadge records.
    Returns a list of newly awarded badges (empty if none).
    """
    newly_earned: list[Badge] = []

    # 1. Fetch all available system badges
    result = await db.execute(select(Badge))
    all_badges = result.scalars().all()

    # 2. Fetch badges the student already has
    result = await db.execute(
        select(UserBadge).where(UserBadge.user_id == student.id)
    )
    existing_user_badges = result.scalars().all()
    owned_badge_ids = {ub.badge_id for ub in existing_user_badges}

    # 3. Calculate student's total completed workouts
    result = await db.execute(
        select(func.count(WorkoutAssignment.id))
        .where(WorkoutAssignment.student_id == student.id)
        .where(WorkoutAssignment.status == AssignmentStatus.COMPLETED)
    )
    total_workouts = result.scalar() or 0

    current_streak = student.current_streak or 0
    longest_streak = student.longest_streak or 0
    actual_longest = max(current_streak, longest_streak)

    # 4. Perfect week data — current Mon-Sun window
    perfect_week_achieved = await _check_perfect_week(student.id, db)

    # 5. Evaluate each badge
    for badge in all_badges:
        # Skip if they already have it
        if badge.id in owned_badge_ids:
            continue

        earned = False

        if badge.badge_type == BadgeType.WORKOUT_COUNT:
            if total_workouts >= (badge.threshold_value or 1):
                earned = True

        elif badge.badge_type == BadgeType.STREAK:
            if actual_longest >= (badge.threshold_value or 1):
                earned = True

        elif badge.badge_type == BadgeType.PERFECT_WEEK:
            if perfect_week_achieved:
                earned = True

        if earned:
            new_ub = UserBadge(user_id=student.id, badge_id=badge.id)
            db.add(new_ub)
            newly_earned.append(badge)

    if newly_earned:
        await db.flush()

    return newly_earned


async def _check_perfect_week(student_id: int, db: AsyncSession) -> bool:
    """
    Return True if the student completed ALL assigned workouts in the current
    Mon–Sun calendar week, with at least 3 assignments in that window.
    """
    today = date.today()
    # Monday of this week
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)

    # Count total assignments this week
    total_result = await db.execute(
        select(func.count(WorkoutAssignment.id))
        .where(WorkoutAssignment.student_id == student_id)
        .where(WorkoutAssignment.assigned_date >= monday)
        .where(WorkoutAssignment.assigned_date <= sunday)
    )
    total = total_result.scalar() or 0

    if total < 3:
        return False

    # Count completed assignments this week
    completed_result = await db.execute(
        select(func.count(WorkoutAssignment.id))
        .where(WorkoutAssignment.student_id == student_id)
        .where(WorkoutAssignment.assigned_date >= monday)
        .where(WorkoutAssignment.assigned_date <= sunday)
        .where(WorkoutAssignment.status == AssignmentStatus.COMPLETED)
    )
    completed = completed_result.scalar() or 0

    return completed >= total
