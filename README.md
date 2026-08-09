# GitGood

GitGood is a Flask-based course review platform for browsing NSYSU courses, saving favorite courses, writing reviews, and comparing course ratings.

The app combines a course catalog, user authentication, admin course management, favorites, review replies, reactions, notifications, and department/category filters in one web interface.

## Features

- Browse courses with pagination, search, sorting, and responsive course cards.
- Search by course title, course code, instructor, department, program tags, year, semester, grade, and requirement type.
- Filter courses by category, department, grade, year, semester, and rating.
- Save favorite courses after login and view them from the user menu.
- Register/login with avatar and gender-based avatar styling.
- Write course reviews using four rating dimensions: Quality, Sweetness, Coolness, and Solidity.
- Calculate the displayed course rating from the four dimensions, rounded to one decimal place.
- Reply to reviews, react to reviews/replies, and receive notifications.
- View course detail pages with latest offering, history, instructor, class time, room, type, grade, department, and program tags.
- Admin users can edit course information from the course detail page.

## Tech Stack

- Python
- Flask
- Flask-Login
- Flask-SQLAlchemy
- SQLite
- HTML, CSS, JavaScript

## Project Structure

```text
gitgood/
|-- app.py                  # Flask application, routes, API endpoints, and app setup
|-- models.py               # SQLAlchemy database models
|-- requirements.txt        # Python dependencies
|-- 12354.db                # Main SQLite database used by the app
|-- templates/              # Jinja/HTML templates
|-- static/                 # CSS, JavaScript, icons, and frontend assets
|-- utils/                  # Course utilities and department filter definitions
`-- NSYSU Course Database/  # Source course database files
```

## Team Responsibilities

| Member | GitHub            | Responsibilities                                                                               |
| ------ | ----------------- | ---------------------------------------------------------------------------------------------- |
| 陳佳晨 | `Kcc122`          | Frontend implementation, course UI, review interactions, and supporting backend integration.   |
| 白宜巧 | `WhiteChocolate0` | UI/UX refinement, search/filter flow, course detail experience, and department/category logic. |
| 李秉宸 | `agito`           | Backend development, database integration, Flask routes, and project documentation.            |

### Supporting Contributors

| Member | GitHub              | Contributions                                                                        |
| ------ | ------------------- | ------------------------------------------------------------------------------------ |
| 王昱晴 | `mimi` / `mimiw420` | Backend/template support, documentation updates, and feature integration assistance. |
| Rami   | `Rami` / `iRami21`  | Backend and template support.                                                        |
| 何昕芳 | `hofang1025`        | Backend/database support.                                                            |

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/bli202118-collab/gitgood.git
cd gitgood
```

### 2. Create a virtual environment

macOS/Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

## Configuration

The app provides development defaults, but these values can be overridden with environment variables:

| Variable         | Purpose                  | Default             |
| ---------------- | ------------------------ | ------------------- |
| `SECRET_KEY`     | Flask session secret key | `dev`               |
| `ADMIN_USERNAME` | Default admin username   | `admin`             |
| `ADMIN_EMAIL`    | Default admin email      | `admin@example.com` |
| `ADMIN_PASSWORD` | Default admin password   | `admin123`          |

For production, always set a strong `SECRET_KEY` and change the default admin password.

## Run the App

Recommended Flask CLI command:

```bash
flask --app app:create_app run --host 127.0.0.1 --port 5050
```

Then open:

```text
http://127.0.0.1:5050
```

## Deploy to Vercel

This project can be deployed to Vercel as a Flask serverless app.

1. Push the repository to GitHub.
2. Import the repo into Vercel.
3. Keep the default root directory.
4. Let Vercel use the Python function at `api/index.py`.

The repo now includes the Vercel entrypoint and routing config:

- [api/index.py](api/index.py)
- [vercel.json](vercel.json)

Important limitation: this app uses SQLite for logins, favorites, reviews, and notifications. Vercel's filesystem is ephemeral, so those writes are not a good long-term fit there. If you only need a demo or read-mostly deployment, Vercel is fine. If you need persistent user data, move the database to an external service first.

If port `5050` is already in use, either stop the existing Flask process or run on another port:

```bash
flask --app app:create_app run --host 127.0.0.1 --port 5051
```

## Development Checks

Run these checks before committing frontend or backend changes:

```bash
python3 -m py_compile app.py models.py
node --check static/script.js
git diff --check
```

## Database Notes

- The main application database is `12354.db`.
- The course source databases are stored under `NSYSU Course Database/`.
- Local database files may change during testing. Review database changes carefully before committing them.

## Notes for Contributors

- Keep frontend assets in `static/`.
- Keep HTML templates in `templates/`.
- Keep reusable backend helpers in `utils/`.
- Avoid committing local test data unless the database change is intentional.
- Prefer small, focused commits with a clear message.
