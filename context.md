# Basketball Training App — Project Context Document

**Project Codename:** TBD (needs a name — see branding notes below)
**Last Updated:** February 18, 2026
**Purpose:** Feed this document to Claude at the start of future conversations so it has full context on the project without needing to reference past chats.

### Session Log
| Session | Date | What Was Accomplished |
|---------|------|----------------------|
| 1 | Feb 17–18, 2026 | Brainstormed app concept, researched competitors, defined feature specs, chose tech stack, built full backend (FastAPI + PostgreSQL), built admin dashboard (React + Vite), got everything running locally on Windows. |

---

## 1. PROJECT OVERVIEW

### What This Is
A mobile app (iOS + Android) that serves as a **personalized basketball skills development platform**. The founder is a private basketball trainer who works with K-12 students. The app extends his in-person coaching into a structured, subscription-based digital training program. Each student receives a **custom training regimen** built specifically for them by the coach, delivered through the app with video demonstrations, messaging, progress tracking, and gamification.

### Core Philosophy
This is NOT a generic drill library or AI-generated workout plan. The differentiator is the **direct, personal relationship between coach and player**. Every workout is hand-built by the coach based on the student's current skill level, goals, weaknesses, and progress. The app is the delivery mechanism for that 1-on-1 coaching relationship at scale.

### Business Model
- **Subscription-based**, tiered pricing
- **Acquisition is word-of-mouth** — students sign up by contacting the coach directly
- **The coach manually onboards each student** — sets up their account, assigns their first drills, then gives them access
- Monthly in-person evaluations anchor the digital experience in real-world accountability

---

## 2. COMPETITIVE LANDSCAPE & REFERENCE APPS

### Direct Comparisons

**ATG Online Coaching (KneesOverToesGuy)** — *Closest business model*
- $49.50/month, no long-term contract
- Video form checks submitted by users, coach feedback within 24 hours
- Programs with exercise video tutorials, sets, reps, timers
- Progression/regression system for every exercise
- Multiple program tiers (Zero, Basics, Pro, Sport-specific)
- Coach messaging built into the app
- Users earn a 50% discount by submitting form videos monthly
- Key takeaway: Proves the model works at $50/month with video-based coaching. Their weakness is it's a many-to-many coaching model (team of coaches, thousands of users). Our app is truly 1-on-1.

**Trainerize (ABC Trainerize)** — *Best platform/infrastructure reference*
- Admin UI (trainer side) + Client UI (student side) — exactly the dual-UI model we need
- Custom workout builder with video demonstrations
- In-app messaging (text, voice, video)
- Progress photos and tracking
- Tiered subscription products
- Phased training programs
- Custom branded app option
- Habit coaching, challenges, badges
- Payment processing built in
- Key takeaway: This is the gold standard for "coach builds program, client follows it" infrastructure. Many features directly applicable. However, it's a generic fitness platform — no basketball-specific features.

**HomeCourt** — *Basketball-specific, tech-forward*
- AI-powered using phone camera to track shot makes, ball handling, agility
- Gamification: badges, trophies, coins, leaderboards, battle mode
- Teams feature where coaches can invite players and track progress
- NBA Global Scout integration
- 100+ drills in free library, 50+ premium sessions
- Key takeaway: Great gamification and the Teams concept is relevant. However, it's AI-driven with no personal coaching relationship. Our app fills the gap HomeCourt leaves — the human element.

**Level Up Basketball** — *Coach-and-player platform*
- Practice planner and drill assignment tools for coaches
- Gamification (coins, achievements, trophies, virtual character customization)
- Attendance tracking, payment processing
- Parent reporting
- AI coach feature
- Video camera support for facilities
- Key takeaway: Closest to our model in basketball specifically. Their coach tools (practice planner, drill assignment, attendance, parent reporting) are very relevant. Their gamification approach (virtual character customization) is creative for the K-12 demographic.

**94FeetOfGame (Phil Handy)** — *Celebrity trainer app*
- Workout builder: select skills, duration, difficulty → app generates a session
- All drills filmed by Phil Handy personally
- Sessions range from 10–45 minutes
- Drill reordering within sessions
- Key takeaway: The "select skills + duration + difficulty" workout builder is an excellent model for our admin UI. Coach films all drills himself — same approach our founder plans to take.

**Good Drills** — *Phase-based basketball training*
- 6-phase development plan
- Vertical jump, handles, shooting, finishing, footwork, strength
- Progress tracking and self-assessment
- Discord community for coaching support
- $200 price point
- Key takeaway: The phased development plan concept is very relevant — players should feel a sense of progression through stages, not just random drill assignments.

### Key Differentiators of Our App vs. All of the Above
1. **True 1-on-1 personalization** — not templated programs, not AI-generated
2. **Two-way video interaction** — coach sends demo videos, students send practice videos back
3. **Monthly in-person evaluation** anchoring the digital experience
4. **K-12 focus** — age-appropriate design, parent visibility, gamification that appeals to kids
5. **Coach-as-brand** — the app IS the coach's brand, not a marketplace

---

## 3. FEATURE SPECIFICATIONS

### 3A. USER (STUDENT) UI

**Home / Dashboard**
- Personalized greeting with student's name
- Today's assigned workout (or next upcoming workout)
- Current streak count prominently displayed
- Quick-access button to start today's workout
- Badge showcase / recent achievements
- Days until next in-person session countdown

**Workout View**
- Ordered list of drills for the session with estimated time per drill
- Each drill expands to show:
  - Video of the coach demonstrating the drill
  - Written instructions / coaching cues
  - Sets, reps, or duration
  - Option to mark as complete
  - Option to record and submit a video of themselves doing the drill
- Session timer (total elapsed time)
- "Workout Complete" confirmation with celebration animation
- Post-workout self-assessment (how did it feel? 1-5 scale, or emoji-based for younger kids)

**Video Submission / Form Checks**
- Record directly in-app or upload from camera roll
- Tag video to specific drill
- Coach reviews and responds with text/voice/video feedback
- Video history: student can see all past submissions + coach feedback side by side

**Messaging**
- In-app chat with the coach
- Supports text, photos, video, and voice messages
- Push notifications for new messages from coach

**Progress & Stats**
- Calendar view showing completed workout days (think GitHub contribution graph or a streak calendar)
- Total workouts completed, total minutes trained
- Skill-specific progress tracking (e.g., ball handling, shooting, footwork, finishing) — coach rates and updates these monthly during in-person evaluations
- Before/after video comparisons (coach curates these from submitted form check videos)

**Badges & Gamification**
- Streak badges (7-day, 30-day, 60-day, 90-day streaks)
- Skill milestone badges (awarded by coach during monthly evaluations)
- Workout completion badges (10, 25, 50, 100, 250 workouts)
- "Perfect Week" badge (completed all assigned workouts)
- Monthly challenge badges (coach can create monthly challenges)
- Badge display / trophy case in profile
- Consider: leaderboard among students (opt-in, could be motivating for competitive kids)
- Consider: XP / level system tied to workout completion and badge collection

**Profile**
- Student photo, name, age, position(s), school/team
- Current subscription tier
- Badge showcase
- Training stats summary
- Skill radar chart (visual representation of their skill levels across categories)

**Schedule / Calendar**
- View assigned workouts for the week/month
- See upcoming in-person evaluation date
- Workout reminders (push notifications)

---

### 3B. ADMIN (COACH) UI

**Student Roster / Dashboard**
- List of all active students with:
  - Name, age, tier, last active date
  - Compliance rate (% of assigned workouts completed)
  - Pending video submissions to review
  - Quick-access to their profile
- Filter/sort by tier, age group, compliance, last active
- Flagging system for students who are falling behind (e.g., haven't logged in for 3+ days)

**Drill Library**
- The coach's entire library of drills, organized by category
- Categories might include: Ball Handling, Shooting (Form, Midrange, 3-Point, Free Throw), Finishing, Footwork, Defense, Passing, Conditioning, Basketball IQ
- Each drill entry contains:
  - Video of coach demonstrating
  - Written description / coaching cues
  - Difficulty level (Beginner / Intermediate / Advanced)
  - Recommended duration or rep count
  - Tags (e.g., "can do at home", "needs a hoop", "needs a partner", "indoor only")
  - Age-appropriateness tags
- Search and filter functionality
- Ability to add new drills (upload video + fill out details)
- Ability to edit/update existing drills

**Workout Builder**
- Drag-and-drop interface to build workouts from the drill library
- Set order of drills within a workout
- Set custom reps/sets/duration per drill (override the library default)
- Save workouts as templates for reuse
- Estimated total workout time auto-calculated
- Assign a workout to one or multiple students
- Schedule workouts on specific days or set recurring patterns (e.g., MWF)
- Copy/modify a student's existing workout plan to create a new week

**Student Profile (Admin View)**
- All the info from the student-facing profile, plus:
  - Full workout history and compliance data
  - All submitted videos with coach feedback history
  - Skill assessment history (ratings over time)
  - Notes section (private coach notes about the student — observations, parent conversations, injury notes, etc.)
  - Current assigned workout plan
  - Subscription tier and billing status
  - Badge management (award/revoke badges)
  - Skill rating interface (update skill levels per category — this feeds the student's radar chart)

**Video Review Queue**
- Centralized inbox of all pending student video submissions
- Play video, then respond with:
  - Text feedback
  - Voice note feedback
  - Video response (coach records themselves giving feedback or demonstrating corrections)
- Mark as reviewed
- Flag for follow-up at next in-person session

**Messaging (Admin Side)**
- Same messaging features as student side
- Broadcast messaging to all students or filtered groups (e.g., "All Advanced tier students")
- Message templates for common communications

**Analytics / Reporting**
- Overview dashboard: total active students, average compliance rate, revenue by tier
- Individual student progress reports (exportable — useful for parent conversations)
- Which drills are most/least completed
- Average response time to student videos

**Account Management**
- Create new student accounts (coach-initiated onboarding)
- Set/change subscription tier
- Pause/deactivate accounts
- Manage billing (or integrate with Stripe/payment processor)

---

### 3C. SUBSCRIPTION TIERS (Initial Pricing Structure)

| Tier | Price/Month | Workouts/Week | Duration/Workout | Features |
|------|-------------|---------------|------------------|----------|
| Base | $50 | 2–3 | 20–30 min | Core drill assignments, messaging, badges, monthly in-person eval |
| Standard | $75 (TBD) | 3–4 | 30–45 min | Everything in Base + priority video feedback, skill tracking |
| Elite | $100+ (TBD) | 5 | 45–60 min | Everything in Standard + unlimited video feedback, advanced drill library access, detailed progress reports |

*Pricing is tentative and will be refined.*

---

## 4. ADDITIONAL FEATURE IDEAS TO CONSIDER

### Parent Portal / Visibility
Since the target demographic is K-12, parents are the paying customers. Consider:
- Parent login that can view (but not modify) their child's progress, workout completion, and coach feedback
- Weekly or monthly automated progress summary emails to parents
- This builds trust and justifies the subscription cost

### Onboarding Flow
- Coach creates account → sets initial skill assessment → assigns first workout
- Student receives invite link/code → downloads app → sees welcome video from coach → completes first workout
- Consider an initial skills assessment questionnaire or video submission before the coach builds the first plan

### Skill Assessment Framework
Create a standardized rubric the coach uses during monthly evaluations:
- Ball Handling (1–10)
- Shooting Form (1–10)
- Shooting Accuracy (1–10)
- Footwork (1–10)
- Finishing (1–10)
- Court Vision / Basketball IQ (1–10)
- Athleticism / Conditioning (1–10)
- Defense (1–10)

These scores update the student's radar chart and unlock tier-specific drills.

### Seasonal / Phase-Based Programming
Borrow from Good Drills' 6-phase model:
- Phase 1: Foundation (fundamentals, form)
- Phase 2: Development (adding complexity)
- Phase 3: Refinement (game-speed reps)
- Phase 4: Competition Prep (in-season)
- Phase 5: Maintenance (during season)
- Phase 6: Off-season intensives

Students visually progress through phases, which adds motivation and structure.

### "Drill of the Week" / Content Feed
- Coach posts a weekly highlight drill, motivational message, or basketball tip
- Creates a sense of community even though students train individually
- Could evolve into a social feed if the user base grows

### Offline Mode
- Students should be able to download their workout (including videos) for offline use
- Common scenario: practicing at a gym or park without reliable WiFi

### Rest Day Content
- On non-workout days, serve light content: basketball film study clips, mental game tips, stretching routines
- Keeps daily engagement without overtraining

### Referral Program
- Since acquisition is word-of-mouth, formalize it: give existing students a referral code
- Reward: free month, exclusive badge, or merch credit
- Track referrals in admin dashboard

### Equipment Tags on Drills
- Tag drills with required equipment: "basketball only", "basketball + cone", "needs a hoop", "needs a wall", "partner required"
- When building workouts, filter by what equipment the student has access to

---

## 5. TECHNICAL STACK (Decided)

### Founder's Background
- Intermediate programmer, comfortable with **Python** and **Java**
- Learning JavaScript/React as part of this project

### Chosen Stack
| Layer | Technology | Why |
|-------|-----------|-----|
| **Backend API** | Python + FastAPI | Founder already knows Python. FastAPI is modern, async, fast, with auto-generated API docs. |
| **Database** | PostgreSQL (async via asyncpg) | Industry standard relational DB. Handles complex relationships well. |
| **ORM** | SQLAlchemy 2.0 (async) | Python's most mature ORM. Mapped column syntax for type safety. |
| **Auth** | JWT tokens (python-jose + bcrypt) | Stateless auth — mobile app stores token, sends with every request. |
| **Student Mobile App** | React Native + Expo | One codebase → iOS + Android. Expo simplifies builds/deploys. |
| **Admin Dashboard** | React (web app via Vite) | Browser-based. Same React skills transfer to mobile app. |
| **Video Storage** | S3-compatible (AWS S3 or Cloudflare R2) | Scalable, cheap. Will configure later. |
| **Payments** | Stripe (future) | Industry standard for subscriptions. |

### Architecture
- Admin dashboard = React web app (runs in browser on coach's laptop)
- Student app = React Native mobile app (iOS + Android)
- Both talk to the same FastAPI backend
- Backend is fully async for handling concurrent video uploads

### Backend Project Structure (Scaffolded — BUILT & RUNNING ✅)
```
backend/
├── app/
│   ├── main.py          # FastAPI entry point
│   ├── config.py        # Env-based settings
│   ├── database.py      # Async SQLAlchemy
│   ├── seed.py          # Sample data seeder (creates coach account, demo student, sample drills, badges)
│   ├── models/          # SQLAlchemy ORM models (user, drill, workout, progress)
│   ├── schemas/         # Pydantic request/response validation
│   ├── api/             # Route handlers (auth, drills, workouts, students)
│   └── services/        # Business logic (auth service)
├── requirements.txt
└── .env.example
```

**Backend API Endpoints (20+ built):**
- Auth: login, create student account
- Drills: full CRUD, filtering by category/difficulty/search/tag, tag management
- Workouts: create from drills, list, view details, update (replace drills), delete
- Assignments: assign workout to student on date, bulk assign multiple dates, get student's assignments
- Students: list with compliance stats, get detail, update

**Default accounts:** coach@example.com / changeme123 | demo.student@example.com / student123

### Admin Dashboard Structure (BUILT & RUNNING ✅)
```
admin-dashboard/
├── src/
│   ├── main.jsx         # React entry point
│   ├── App.jsx          # Root component, routing, auth/toast contexts
│   ├── index.css        # Full design system (CSS variables, components, layout)
│   ├── services/
│   │   └── api.js       # All backend API calls centralized here
│   ├── components/
│   │   ├── Sidebar.jsx  # Left nav panel
│   │   ├── Modal.jsx    # Reusable popup dialog
│   │   └── Toast.jsx    # Notification toasts
│   └── pages/
│       ├── LoginPage.jsx      # Coach login
│       ├── DashboardPage.jsx  # Overview with stats, student roster preview
│       ├── DrillsPage.jsx     # Drill library: grid view, search/filter, create/edit/delete modals
│       ├── WorkoutsPage.jsx   # Workout builder: pick drills, set order, save templates, view details
│       └── StudentsPage.jsx   # Student roster, add student, assign workouts to dates
├── package.json
├── vite.config.js       # Dev server on port 3000, proxies /api to backend on 8000
└── index.html
```

**Design:** Dark sidebar (#1A1A2E) + light content area. Basketball orange accent (#E8712A). DM Sans + Space Mono fonts. Professional coaching tool aesthetic.

### Local Development Setup (Windows)
- **PostgreSQL** installed via EDB installer, database `basketball_app` created
- **Backend** runs on `http://localhost:8000` — `uvicorn app.main:app --reload`
- **Admin dashboard** runs on `http://localhost:3000` — `npm run dev`
- Vite proxies `/api` requests from :3000 to :8000 automatically
- **Known issue:** passlib + bcrypt compatibility — must pin `bcrypt==4.0.1`
- **Python setup:** Use `py -3.11 -m venv venv` if multiple Python versions installed

### Data & Privacy Considerations
- COPPA compliance is critical since users include children under 13
- Parental consent flow for minors
- Video data privacy — student videos must be stored securely, only accessible to coach and the student/parent
- Consider: data retention policies for video (auto-delete after X months to manage storage costs)

---

## 6. BRANDING & NAMING NOTES

*No name has been chosen yet.* Some considerations:
- Should be memorable, simple, and basketball-adjacent
- Should work as an app name and a brand name
- Domain availability matters
- Should appeal to both kids (cool factor) and parents (professionalism)
- The coach's personal brand should be prominent (this isn't a faceless platform)

---

## 7. OPEN QUESTIONS & DECISIONS NEEDED

1. **App name / brand identity** — needs to be decided early as it affects everything. Currently using "CoachApp" as a placeholder in the sidebar.
2. ~~**Build vs. buy for the platform**~~ — **DECIDED: Custom build.** Too much nuance for a generic platform.
3. **Pricing tiers** — exact pricing, what's included at each level, how many tiers. Currently modeled as Base ($50), Standard ($75), Elite ($100+).
4. **Parent portal** — yes or no for v1? (Strong recommendation: yes, even if simple)
5. **Leaderboard** — opt-in? Age-grouped? Could be demotivating for struggling students
6. **Offline video download** — important for v1 or can wait?
7. **How many students can the coach realistically manage?** — this determines whether the app needs to scale to multiple coaches eventually
8. **Legal** — terms of service, liability waivers (especially for minors), COPPA compliance
9. **Monetization of the app itself** — is this only for the coach's own students, or could it eventually become a platform for multiple coaches? (Big strategic question)
10. **Video upload infrastructure** — currently drill videos are stored as URLs. Need to implement actual file upload to S3/Cloudflare R2.

---

## 8. DEVELOPMENT PHASES

### Phase 1: MVP — IN PROGRESS
- ✅ Backend API (FastAPI + PostgreSQL + SQLAlchemy)
- ✅ Data models: Users, Drills, Workouts, Assignments, Completions, Badges, Skill Assessments
- ✅ Authentication (JWT + bcrypt, role-based: coach vs student)
- ✅ Admin dashboard: login, dashboard overview, drill library (CRUD + search/filter), workout builder, student roster, workout assignment
- ✅ **Video upload** — replace URL field with actual S3 file upload for drill demo videos
- ✅ **Student mobile app** (React Native + Expo) — students view/complete assigned workouts
- ✅ Basic messaging between coach and student
- ✅ Workout completion tracking (student marks drills done)
- ⬜ Simple badge/streak auto-awarding

### Phase 2: Core Experience
- ⬜ Video submission and form check feedback loop (student records themselves → coach reviews)
- ⬜ Multiple subscription tiers enforced in the app
- ⬜ Skill assessment and radar chart
- ⬜ Parent view (read-only portal)
- ⬜ Push notifications
- ⬜ Improved gamification (more badges, XP, levels)

### Phase 3: Polish & Growth
- ⬜ Offline mode
- ⬜ Advanced analytics (admin)
- ⬜ Referral system
- ⬜ Content feed / Drill of the Week
- ⬜ Seasonal programming / phases
- ⬜ Export progress reports

### Phase 4: Scale (If Applicable)
- ⬜ Multi-coach support
- ⬜ White-label potential
- ⬜ Marketplace features
- ⬜ Payment automation at scale (Stripe)

### Recommended Next Steps (for next session)
1. **Video upload for drills** — get real video into the drill library
2. **Student mobile app** — React Native, so students can see and complete workouts
3. **Workout completion flow** — students mark drills done, submit form check videos
4. **Messaging** — in-app coach-student communication
5. **Badges & streaks** — auto-award based on completions

---

*End of context document. Feed this to Claude at the start of any future conversation about this project.*
