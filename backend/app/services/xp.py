"""
XP and Level system.

XP is awarded when a student completes a workout:
  - 100 XP base
  - +5 XP per day of current streak (capped at 10 days = +50 XP max)
  - +50 XP per badge earned in that session

Levels use basketball-themed names.
"""

# Ordered highest→lowest so we can iterate and return the first match
LEVELS = [
    (7, "Legend",      30_000),
    (6, "Pro",         15_000),
    (5, "All-Star",     7_500),
    (4, "Varsity",      3_500),
    (3, "Starter",      1_500),
    (2, "Rising Star",    500),
    (1, "Rookie",           0),
]

_LEVEL_NAMES = {lvl: name for lvl, name, _ in LEVELS}
_LEVEL_THRESHOLDS = sorted([(threshold, lvl) for lvl, _, threshold in LEVELS])


def calculate_level(xp: int) -> int:
    """Return the level number for the given XP total."""
    for lvl, _, threshold in LEVELS:
        if xp >= threshold:
            return lvl
    return 1


def level_name(level: int) -> str:
    """Return the display name for a level number."""
    return _LEVEL_NAMES.get(level, "Rookie")


def xp_for_next_level(current_xp: int) -> int:
    """
    Return the XP threshold for the next level.
    Returns 0 if already at max level (Legend).
    """
    for _, threshold in _LEVEL_THRESHOLDS:
        if threshold > current_xp:
            return threshold
    return 0


def calculate_xp_earned(streak: int, badges_earned: int) -> int:
    """Calculate XP gained from completing one workout."""
    streak_bonus = min(streak, 10) * 5
    badge_bonus = badges_earned * 50
    return 100 + streak_bonus + badge_bonus
