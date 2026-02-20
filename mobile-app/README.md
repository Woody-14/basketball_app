# Basketball Training — Student Mobile App

React Native + Expo mobile app for students to view and complete their assigned workouts.

## Prerequisites

1. **Node.js** — you should already have this from the admin dashboard
2. **Expo CLI** — install globally:
   ```
   npm install -g expo-cli
   ```
3. **Expo Go app** on your phone (download from App Store / Google Play)

## Setup

```bash
cd mobile-app
npm install
npx expo start
```

This opens the Expo dev tools. Scan the QR code with:
- **iPhone**: Camera app → tap the Expo banner
- **Android**: Expo Go app → scan QR code

## Important: API Connection

The app needs to talk to your FastAPI backend. By default it points to `localhost:8000`, which works if you test in a web browser but **NOT from your phone**.

### To test on a physical device:

1. Find your computer's local IP:
   - Open Command Prompt → `ipconfig`
   - Look for **IPv4 Address** (e.g., `192.168.1.42`)

2. Edit `src/services/api.js`, line 14:
   ```js
   const API_BASE = 'http://192.168.1.42:8000/api';  // Use YOUR IP
   ```

3. Make sure your phone and computer are on the **same WiFi network**

4. Make sure your backend is running: `uvicorn app.main:app --reload --host 0.0.0.0`
   - The `--host 0.0.0.0` part is important — it makes the backend accessible from other devices

## Backend Endpoint Needed

The mobile app expects a student-facing assignments endpoint. Add this route to your backend:

**File:** `backend/app/api/assignments.py` (or add to existing routes)

```python
@router.get("/assignments/me")
async def get_my_assignments(
    start_date: str = None,
    end_date: str = None,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the logged-in student's own assignments."""
    query = select(WorkoutAssignment).where(
        WorkoutAssignment.student_id == current_user.id
    ).options(
        selectinload(WorkoutAssignment.workout)
    )
    if start_date:
        query = query.where(WorkoutAssignment.scheduled_date >= start_date)
    if end_date:
        query = query.where(WorkoutAssignment.scheduled_date <= end_date)
    query = query.order_by(WorkoutAssignment.scheduled_date)
    result = await db.execute(query)
    return result.scalars().all()
```

## Login Credentials

Use the demo student account created by the seed script:
- **Email:** demo.student@example.com
- **Password:** student123

Or create a new student from the admin dashboard and log in with those credentials.

## App Structure

```
mobile-app/
├── App.jsx                      # Root component
├── app.json                     # Expo configuration
├── package.json                 # Dependencies
├── babel.config.js              # Babel + Reanimated plugin
└── src/
    ├── constants/
    │   └── theme.js             # Colors, spacing, fonts, labels
    ├── services/
    │   └── api.js               # All backend API calls
    ├── hooks/
    │   └── useAuth.js           # Auth context (login state management)
    ├── navigation/
    │   └── index.js             # Tab bar + stack navigators
    └── screens/
        ├── LoginScreen.jsx      # Student sign-in
        ├── HomeScreen.jsx       # Dashboard: today's workout, week overview, stats
        ├── ScheduleScreen.jsx   # Monthly calendar with workout days highlighted
        ├── DrillLibraryScreen.jsx  # Browse all drills with search + category filters
        ├── DrillDetailScreen.jsx   # Single drill: video player, coaching cues, specs
        ├── WorkoutDetailScreen.jsx # Preview workout before starting
        ├── ActiveWorkoutScreen.jsx # THE workout experience: drill-by-drill with timer
        ├── WorkoutCompleteScreen.jsx # 🏆 Celebration after finishing workout
        ├── ProgressScreen.jsx   # Stats, streak, activity heatmap, history
        ├── ProfileScreen.jsx    # Player info, badges, settings, logout
        └── MessagesScreen.jsx   # Chat with coach (placeholder UI)
```

## Screens Overview

| Screen | What It Does |
|--------|-------------|
| **Home** | Greeting, week calendar dots, today's workout card, upcoming workouts, quick stats (streak, badges, completions) |
| **Schedule** | Full month calendar, tap any day to see assigned workout, start workout from calendar |
| **Drill Library** | Grid of all drills, search bar, category filter chips, tap for detail |
| **Drill Detail** | Video player (expo-av), coaching cues, description, sets/reps/duration, tags |
| **Workout Detail** | Full drill list preview, estimated duration, scheduled date, start button |
| **Active Workout** | Step-through drills one at a time, elapsed timer, drill timer, coaching cues, mark complete, progress dots, pause overlay, finish button |
| **Workout Complete** | Animated celebration, stats (drills completed, time, completion %), motivational message |
| **Progress** | Streak display, stats grid, 28-day activity heatmap, workout history list |
| **Profile** | Avatar, name, position, tier, badges grid (with locked state), settings menu, sign out |
| **Messages** | Chat UI with coach (placeholder — backend messaging not yet built) |

## What's Stubbed vs. Working

**Working now** (connects to existing backend):
- Login / authentication
- View assigned workouts (needs /assignments/me endpoint — see above)
- Browse drill library
- View drill details + video
- View workout details

**Stubbed** (UI built, backend endpoints needed):
- Mark workout/drill complete → needs POST /assignments/{id}/complete
- Form check video upload → needs video upload endpoint
- Messaging → needs messaging endpoints
- Badges → hardcoded placeholders, needs badges API
- Streak calculation → calculated client-side from assignments for now

## Next Steps

1. Add the `/assignments/me` endpoint to the backend
2. Test login with demo student account
3. Assign workouts to the demo student from admin dashboard
4. Open app → see workouts appear on home screen and calendar
5. Build the completion endpoints so students can mark drills done
