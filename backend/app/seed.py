"""
Seed script — creates the coach account and some sample data.

Run with:
    python -m app.seed

This is idempotent — safe to run multiple times.
"""

import asyncio
from sqlalchemy import select

from app.database import AsyncSessionLocal, engine, Base
from app.models.user import User, UserRole, SubscriptionTier
from app.models.drill import Drill, DrillTag, DrillCategory, DrillDifficulty
from app.models.workout import Workout, WorkoutDrill
from app.models.progress import Badge, BadgeType
from app.services.auth import hash_password

# Import all models
import app.models  # noqa


async def seed():
    async with AsyncSessionLocal() as db:
        # ---- COACH ACCOUNT ----
        result = await db.execute(select(User).where(User.email == "coach@example.com"))
        if not result.scalar_one_or_none():
            coach = User(
                email="coach@example.com",
                hashed_password=hash_password("coach123"),
                first_name="Coach",
                last_name="Admin",
                role=UserRole.COACH,
            )
            db.add(coach)
            print("✅ Created coach account (coach@example.com / changeme123)")
        else:
            print("ℹ️  Coach account already exists")

        # ---- DRILL TAGS ----
        tag_names = [
            "needs_hoop", "no_equipment", "needs_cones", "needs_partner",
            "can_do_at_home", "indoor_only", "needs_wall", "needs_ball_only",
        ]
        for name in tag_names:
            existing = await db.execute(select(DrillTag).where(DrillTag.name == name))
            if not existing.scalar_one_or_none():
                db.add(DrillTag(name=name))
        print("✅ Created drill tags")

        # ---- SAMPLE DRILLS ----
        sample_drills = [
            {
                "name": "Stationary Crossover",
                "description": "Stand in athletic stance. Cross the ball over from right to left hand, then back. Stay low, push the ball hard to the floor.",
                "coaching_cues": "Keep your eyes up. Push the ball, don't slap it. Stay below your waist.",
                "category": DrillCategory.BALL_HANDLING,
                "difficulty": DrillDifficulty.BEGINNER,
                "default_duration_seconds": 60,
                "default_sets": 3,
            },
            {
                "name": "Form Shooting — One Hand",
                "description": "Stand 3 feet from the basket. Shoot with one hand only (shooting hand). Focus on follow-through and backspin.",
                "coaching_cues": "Elbow under the ball. Flick the wrist. Hold your follow-through like you're reaching into a cookie jar on a high shelf.",
                "category": DrillCategory.SHOOTING_FORM,
                "difficulty": DrillDifficulty.BEGINNER,
                "default_reps": 20,
                "default_sets": 3,
            },
            {
                "name": "Mikan Drill",
                "description": "Stand under the basket. Alternate layups — right hand on the right side, left hand on the left side. No dribbling.",
                "coaching_cues": "Use the backboard. Soft touch. Keep the ball high — don't bring it below your chin.",
                "category": DrillCategory.FINISHING,
                "difficulty": DrillDifficulty.BEGINNER,
                "default_reps": 20,
                "default_sets": 2,
            },
            {
                "name": "Defensive Slides",
                "description": "In a defensive stance, slide laterally from sideline to sideline. Stay low the entire time.",
                "coaching_cues": "Don't click your feet together. Stay wide. Hands active. Butt down.",
                "category": DrillCategory.DEFENSE,
                "difficulty": DrillDifficulty.BEGINNER,
                "default_duration_seconds": 30,
                "default_sets": 4,
            },
            {
                "name": "Between-the-Legs Combo",
                "description": "Dribble between your legs, then crossover, then behind the back. Repeat the combo continuously.",
                "coaching_cues": "Don't look at the ball. Each move should flow into the next. Stay low and explosive.",
                "category": DrillCategory.BALL_HANDLING,
                "difficulty": DrillDifficulty.INTERMEDIATE,
                "default_duration_seconds": 45,
                "default_sets": 3,
            },
        ]

        for drill_data in sample_drills:
            existing = await db.execute(select(Drill).where(Drill.name == drill_data["name"]))
            if not existing.scalar_one_or_none():
                db.add(Drill(**drill_data))
        print("✅ Created sample drills")

        # ---- BADGES ----
        badges = [
            {"name": "First Workout", "description": "Completed your first workout!", "badge_type": BadgeType.WORKOUT_COUNT, "threshold_value": 1},
            {"name": "10 Workouts", "description": "Completed 10 workouts. You're building a habit!", "badge_type": BadgeType.WORKOUT_COUNT, "threshold_value": 10},
            {"name": "25 Workouts", "description": "25 workouts done. Consistency is key!", "badge_type": BadgeType.WORKOUT_COUNT, "threshold_value": 25},
            {"name": "50 Workouts", "description": "50 workouts! You're dedicated.", "badge_type": BadgeType.WORKOUT_COUNT, "threshold_value": 50},
            {"name": "100 Workouts", "description": "100 workouts. Elite work ethic!", "badge_type": BadgeType.WORKOUT_COUNT, "threshold_value": 100},
            {"name": "7-Day Streak", "description": "Worked out 7 days in a row!", "badge_type": BadgeType.STREAK, "threshold_value": 7},
            {"name": "30-Day Streak", "description": "30-day streak! Unstoppable.", "badge_type": BadgeType.STREAK, "threshold_value": 30},
            {"name": "60-Day Streak", "description": "60 days straight. Machine.", "badge_type": BadgeType.STREAK, "threshold_value": 60},
            {"name": "Perfect Week", "description": "Completed every assigned workout this week.", "badge_type": BadgeType.PERFECT_WEEK},
        ]
        for badge_data in badges:
            existing = await db.execute(select(Badge).where(Badge.name == badge_data["name"]))
            if not existing.scalar_one_or_none():
                db.add(Badge(**badge_data))
        print("✅ Created badges")

        # ---- SAMPLE STUDENT ----
        result = await db.execute(select(User).where(User.email == "demo.student@example.com"))
        if not result.scalar_one_or_none():
            student = User(
                email="demo.student@example.com",
                hashed_password=hash_password("student123"),
                first_name="Demo",
                last_name="Student",
                role=UserRole.STUDENT,
                age=14,
                position="PG",
                school="Demo Middle School",
                subscription_tier=SubscriptionTier.BASE,
            )
            db.add(student)
            print("✅ Created demo student (demo.student@example.com / student123)")
        else:
            print("ℹ️  Demo student already exists")

        await db.commit()
        print("\n🏀 Seed complete! Run the API with: uvicorn app.main:app --reload")


if __name__ == "__main__":
    asyncio.run(seed())
