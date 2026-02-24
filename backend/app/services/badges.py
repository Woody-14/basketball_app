"""
Badge Evaluation Service.

Calculates and awards badges to a student when they complete workouts.
Currently evaluates:
- WORKOUT_COUNT badges (e.g., First Workout, 10 Workouts)
- STREAK badges (e.g., 7-Day Streak, 30-Day Streak)
"""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.progress import Badge, UserBadge, BadgeType, WorkoutCompletion
from app.models.workout import WorkoutAssignment, AssignmentStatus


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
    
    # 4. Evaluate each badge
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
                
        # (PERFECT_WEEK logic would go here, calculating Monday-Sunday completions vs assignments)
                
        if earned:
            new_ub = UserBadge(user_id=student.id, badge_id=badge.id)
            db.add(new_ub)
            newly_earned.append(badge)
            
    if newly_earned:
        await db.flush()
        
    return newly_earned
