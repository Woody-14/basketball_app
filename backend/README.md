# Basketball Training App — Backend

Personalized basketball training platform API built with FastAPI + PostgreSQL.

## Prerequisites

- **Python 3.11+** — [python.org/downloads](https://www.python.org/downloads/)
- **PostgreSQL 15+** — [postgresql.org/download](https://www.postgresql.org/download/)

## Quick Start

### 1. Install PostgreSQL and Create the Database

```bash
# macOS (using Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Create the database
createdb basketball_app
```

For Windows, download the installer from postgresql.org and use pgAdmin to create a database called `basketball_app`.

### 2. Set Up the Python Environment

```bash
cd backend

# Create a virtual environment
py -3.11 -m venv venv

# Activate it
source venv/bin/activate      # macOS/Linux
# venv\Scripts\activate       # Windows

# Install dependencies
pip install -r requirements.txt bcrypt==4.0.1
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env with your database credentials and a secure SECRET_KEY
```

### 4. Seed the Database

This creates the coach account, sample drills, badges, and a demo student:

```bash
python -m app.seed
```

### 5. Run the API

```bash
uvicorn app.main:app --reload
```

The API is now running at **http://localhost:8000**

- **Swagger UI (interactive docs):** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Health check:** http://localhost:8000/health

## Default Accounts

| Role    | Email                      | Password    |
|---------|----------------------------|-------------|
| Coach   | coach@example.com          | changeme123 |
| Student | demo.student@example.com   | student123  |

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Environment-based settings
│   ├── database.py          # Async SQLAlchemy setup
│   ├── seed.py              # Database seeder
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── user.py          #   Users (coach, student, parent)
│   │   ├── drill.py         #   Drill library
│   │   ├── workout.py       #   Workouts & assignments
│   │   └── progress.py      #   Completions, badges, skill assessments
│   ├── schemas/             # Pydantic request/response schemas
│   │   ├── user.py
│   │   ├── drill.py
│   │   └── workout.py
│   ├── api/                 # Route handlers
│   │   ├── auth.py          #   Login & account creation
│   │   ├── drills.py        #   Drill library CRUD
│   │   ├── workouts.py      #   Workout builder & assignments
│   │   └── students.py      #   Student management (admin)
│   └── services/
│       └── auth.py          #   JWT, password hashing, auth dependencies
├── requirements.txt
├── .env.example
└── README.md
```

## API Endpoints (MVP)

### Authentication
| Method | Endpoint              | Auth     | Description                     |
|--------|-----------------------|----------|---------------------------------|
| POST   | /api/auth/login       | None     | Log in, get JWT token           |
| POST   | /api/auth/students    | Coach    | Create a new student account    |

### Drill Library
| Method | Endpoint              | Auth     | Description                     |
|--------|-----------------------|----------|---------------------------------|
| GET    | /api/drills           | Any      | List drills (with filters)      |
| POST   | /api/drills           | Coach    | Create a drill                  |
| GET    | /api/drills/{id}      | Any      | Get drill details               |
| PUT    | /api/drills/{id}      | Coach    | Update a drill                  |
| DELETE | /api/drills/{id}      | Coach    | Delete a drill                  |
| GET    | /api/drills/tags      | Any      | List all tags                   |
| POST   | /api/drills/tags      | Coach    | Create a tag                    |

### Workouts
| Method | Endpoint              | Auth     | Description                     |
|--------|-----------------------|----------|---------------------------------|
| POST   | /api/workouts         | Coach    | Create a workout from drills    |
| GET    | /api/workouts         | Coach    | List workouts/templates         |
| GET    | /api/workouts/{id}    | Any      | Get workout with all drills     |
| PUT    | /api/workouts/{id}    | Coach    | Update a workout                |
| DELETE | /api/workouts/{id}    | Coach    | Delete a workout                |

### Assignments
| Method | Endpoint                          | Auth     | Description                        |
|--------|-----------------------------------|----------|------------------------------------|
| POST   | /api/assignments                  | Coach    | Assign workout to student          |
| POST   | /api/assignments/bulk             | Coach    | Assign to multiple dates           |
| GET    | /api/assignments/me               | Student  | Get my assigned workouts           |
| GET    | /api/assignments/student/{id}     | Coach    | View a student's assignments       |

### Students (Admin)
| Method | Endpoint              | Auth     | Description                     |
|--------|-----------------------|----------|---------------------------------|
| GET    | /api/students         | Coach    | List all students with stats    |
| GET    | /api/students/{id}    | Coach    | Get detailed student profile    |
| PUT    | /api/students/{id}    | Coach    | Update student info             |

## Next Steps

After getting the backend running:
1. **Test the API** using Swagger UI at /docs
2. **Build the admin dashboard** (React web app)
3. **Build the mobile app** (React Native with Expo)
