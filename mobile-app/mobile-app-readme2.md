# Basketball Training — Student Mobile App

React Native + Expo mobile app for students to view and complete their assigned workouts.

**Expo SDK:** 54  
**Status:** Core features working — login, assignments, drill library, workout flow

---

## Prerequisites

1. **Node.js 18+** — you should already have this from the admin dashboard
2. **Expo Go app** on your phone — download from the App Store (iPhone) or Google Play (Android). **Make sure it's the latest version** — SDK 54 requires the most recent Expo Go.

You do NOT need to install `expo-cli` globally. We use `npx expo` instead.

---

## Setup (First Time)

```powershell
cd C:\Dev\basketball_app\mobile-app

# Clean install
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue

# Install dependencies
npm install

# Let Expo fix any version mismatches automatically
npx expo install --fix
```

If you see errors about missing packages like `babel-preset-expo` or `expo-asset`, install them explicitly:

```powershell
npx expo install babel-preset-expo expo-asset
```

---

## Running the App

You need **two terminals** running at the same time:

### Terminal 1 — Backend API

```powershell
cd C:\Dev\basketball_app\backend
venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0
```

> The `--host 0.0.0.0` is required so your phone can reach the backend. Without it, only your computer can access it.

### Terminal 2 — Expo Dev Server

```powershell
cd C:\Dev\basketball_app\mobile-app
npx expo start
```

Then scan the QR code with:
- **iPhone**: Open the Camera app → tap the Expo banner that appears
- **Android**: Open the Expo Go app → scan QR code

### If the QR code scan fails

Try these in order:
1. `npx expo start --lan` — uses your local network
2. `npx expo start --tunnel` — routes through the internet (slower but bypasses network issues)
3. `npx expo start --web` — opens in your browser (good for testing the UI without a phone)

If tunnel mode says `ngrok` is not installed, let it install when prompted.

### If you get a "cache" error

```powershell
npx expo start --clear
```

---

## Connecting Your Phone to the Backend (IMPORTANT)

The #1 issue you will hit: **"Network request failed"** when trying to log in.

This happens because `localhost` on your phone refers to the phone itself, not your computer. You must use your computer's local IP address.

### Step 1: Find your computer's IP

```powershell
ipconfig
```

Look for **IPv4 Address** under your WiFi adapter. It will look like `192.168.1.93` or similar.

### Step 2: Update the API URL

Open `src/services/api.js` and change line ~14:

```js
// For testing on your phone — use your computer's IP WITH the port
const API_BASE = 'http://192.168.1.93:8000/api';

// For testing in the browser — use localhost
// const API_BASE = 'http://localhost:8000/api';
```

**Common mistakes:**
- ❌ `http://192.168.1.93/api` — missing the port `:8000`
- ❌ `https://192.168.1.93:8000/api` — should be `http`, not `https`
- ❌ `http://localhost:8000/api` — won't work from your phone
- ✅ `http://192.168.1.93:8000/api` — correct

### Step 3: Verify the connection

Open your phone's browser and go to:

```
http://192.168.1.93:8000/docs
```

If you see the Swagger API docs, the connection works. If not:
- Confirm your phone and computer are on the **same WiFi network**
- Run these firewall commands in PowerShell **as Administrator**:

```powershell
netsh advfirewall firewall add rule name="Backend API" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="Expo Metro" dir=in action=allow protocol=TCP localport=8081
```

### Step 4: Reload the app

After saving `api.js`, press `r` in your Expo terminal to force a reload.

---

## Login Credentials

| Role    | Email                    | Password    |
|---------|--------------------------|-------------|
| Coach   | coach@example.com        | changeme123 |
| Student | demo.student@example.com | student123  |

Log into the **admin dashboard** (http://localhost:3000) as coach to create workouts and assign them to the demo student. Then log into the **mobile app** as the student to see them.

---

## App Structure

```
mobile-app/
├── App.jsx                         # Root — auth check, navigation setup
├── app.json                        # Expo SDK 54 configuration
├── package.json                    # Dependencies (managed by npx expo install)
├── babel.config.js                 # Babel + Reanimated plugin
└── src/
    ├── constants/
    │   └── theme.js                # Colors, spacing, fonts, category labels
    ├── services/
    │   └── api.js                  # All backend API calls + token management
    ├── hooks/
    │   └── useAuth.js              # Auth context (login state across all screens)
    ├── navigation/
    │   └── index.js                # Bottom tabs + stack navigators
    └── screens/
        ├── LoginScreen.jsx         # Student sign-in (dark branded UI)
        ├── HomeScreen.jsx          # Dashboard: greeting, week dots, today's workout, stats
        ├── ScheduleScreen.jsx      # Month calendar with workout indicators
        ├── DrillLibraryScreen.jsx  # 2-column grid, search, category filter chips
        ├── DrillDetailScreen.jsx   # Video player, coaching cues, specs, tags
        ├── WorkoutDetailScreen.jsx # Drill list preview before starting
        ├── ActiveWorkoutScreen.jsx # Step-by-step workout with timers and progress
        ├── WorkoutCompleteScreen.jsx # Animated celebration + stats
        ├── ProgressScreen.jsx      # Streak, heatmap, compliance rate, history
        ├── ProfileScreen.jsx       # Avatar, badges, settings, sign out
        └── MessagesScreen.jsx      # Chat UI (placeholder — backend not built yet)
```

---

## Screens Overview

| Screen | What It Does |
|--------|-------------|
| **Login** | Dark branded screen. Students sign in with credentials the coach created for them. |
| **Home** | Greeting by time of day, week calendar with completion dots, today's workout card with "Start Workout" button, upcoming workouts list, quick stats (streak, badges, completions this week). |
| **Schedule** | Full month calendar with navigation arrows. Orange dots = assigned, green dots = completed. Tap any day to see the workout and start it. |
| **Drill Library** | 2-column grid of all drills. Search bar + scrollable category filter chips. Tap any drill for details. |
| **Drill Detail** | Video player (expo-av), difficulty badge, coaching cues in highlighted box, sets/reps/duration pills, description, tags. |
| **Workout Detail** | Numbered drill list, estimated duration, scheduled date badge, completion status. "Start Workout" button at the bottom. |
| **Active Workout** | The core experience. Shows one drill at a time with: elapsed timer, per-drill countdown timer, coaching cues, coach notes, progress dots (tap to jump), pause overlay, "Mark Drill Complete" button, navigation between drills, "Finish Workout" when done. |
| **Workout Complete** | Animated trophy + bounce animation. Shows drills completed, total time, completion %. Motivational message. "Back to Home" button. |
| **Progress** | Streak counter with motivational text, stats grid (completed/compliance/assigned), 28-day activity heatmap with legend, recent workout history list. |
| **Profile** | Avatar with initial, name, position badge, tier, age. Quick stats row. Badge grid (earned vs locked). Settings menu (messages, notifications, help). Sign out button. |
| **Messages** | Chat bubble UI with coach avatar. Placeholder messages showing the design. Text input with send button. Banner noting messaging is coming soon. |

---

## What's Working vs. Stubbed

### ✅ Working (connected to backend)
- Student login / logout with JWT tokens
- View assigned workouts on home screen and calendar
- Browse full drill library with search and category filters
- View drill details with video playback
- View workout details with full drill list
- Start workout and step through drills
- Elapsed timer and per-drill countdown timer
- Workout completion celebration screen

### ⬜ Stubbed (UI built, backend endpoints not yet built)
- Mark workout/drill complete → needs `POST /assignments/{id}/complete`
- Form check video upload → needs video upload endpoint on completions
- Messaging → needs messaging endpoints
- Badges → hardcoded placeholders, needs badges API
- Streak calculation → computed client-side from assignment dates
- Push notifications → needs Firebase Cloud Messaging setup

---

## Known Warnings

**`expo-av` deprecation warning:** You'll see a warning that expo-av is deprecated in SDK 54. It still works fine. The replacement packages are `expo-video` and `expo-audio`. We can migrate later — it's cosmetic only.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Network request failed" on login | Check `API_BASE` in `api.js` — must be `http://YOUR_IP:8000/api` (not localhost, not missing port) |
| Login spins forever | Backend isn't running, or running without `--host 0.0.0.0` |
| QR code scan fails | Try `npx expo start --tunnel` or check firewall rules |
| "Cannot find module babel-preset-expo" | Run `npx expo install babel-preset-expo` |
| "expo-asset cannot be found" | Run `npx expo install expo-asset` |
| Version mismatch warnings | Run `npx expo install --fix` to auto-correct all versions |
| Stale changes not showing | Press `r` in terminal to reload, or `npx expo start --clear` |
| App crashes on launch | Delete `node_modules` and `package-lock.json`, run `npm install` fresh |

---

## Next Steps

1. ✅ ~~Login and authentication~~
2. ✅ ~~View assigned workouts~~
3. ✅ ~~Drill library and detail views~~
4. ✅ ~~Active workout flow with timers~~
5. ⬜ Build workout completion API endpoints
6. ⬜ Build messaging backend + connect to Messages screen
7. ⬜ Build badges API + connect to Profile screen
8. ⬜ Add form check video recording and upload
9. ⬜ Push notifications for new assignments
10. ⬜ Migrate from expo-av to expo-video/expo-audio
