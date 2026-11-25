# CarePoint — Patient Admission Management App

A patient admission management application built for the DScribe Software Engineer Intern Round 1 task.

## Features

- Register a patient and view all patient records.
- Search patients by **name**.
- Filter records by **Ward**, **Department**, and **Doctor**.
- Filter by admission status.
- Edit patient details.
- Mark an admitted patient as **Discharged** with a dedicated action and confirmation.
- Delete a patient with confirmation.
- Dashboard statistics for total, admitted, and discharged patients.
- Responsive layout for desktop, tablet, and mobile.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React.js, Vite, CSS |
| HTTP client | Axios |
| Icons | Lucide React |
| Backend | Python, FastAPI |
| Validation | Pydantic |
| ORM | SQLAlchemy |
| Database | PostgreSQL (Neon supported) |

Node.js is used by Vite/npm for frontend development and builds only. The API/backend is Python FastAPI.

## Patient fields

Name, Age, Gender, Ward, Department, Doctor, Admission Date, and Status.

The dropdowns contain standard choices and also include values already used in saved records. This preserves older records while keeping new entries selectable from lists.

## Validation

Validation runs in both the browser and API:

- Name is required and accepts English letters and spaces only.
- Age is required and must be an integer from 0 through 120.
- Gender, Ward, Department, and Doctor are required selections.
- Admission Date is required and cannot be in the future (India timezone).
- Status must be `Admitted` or `Discharged`.
- The backend returns HTTP 422 with a clear validation detail for invalid input.

## Project structure

```text
dscribe-patient-management/
├── backend/
│   ├── app/
│   │   ├── routes/patients.py
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   └── schemas.py
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
├── screenshots/
└── README.md
```

## Run locally on Windows PowerShell

### 1. Configure the database

Create a PostgreSQL database (Neon is supported).

Copy `backend/.env.example` to `backend/.env`, then replace the placeholder `DATABASE_URL` with your actual connection string.

Do not commit `.env`. The repository `.gitignore` excludes environment files and local virtual environments.

### 2. Start the backend

Open PowerShell:

```powershell
cd "C:\path\to\dscribe-patient-management\backend"

py -m venv .venv
.\.venv\Scripts\Activate.ps1

python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

The API runs at `http://127.0.0.1:8000`.

Interactive API documentation: `http://127.0.0.1:8000/docs`

### 3. Start the frontend

Open a second PowerShell window:

```powershell
cd "C:\path\to\dscribe-patient-management\frontend"

npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`).

### 4. Frontend API configuration

For local development, the frontend defaults to `http://127.0.0.1:8000`.

To use a different backend URL, copy `frontend/.env.example` to `frontend/.env.local` and set:

```text
VITE_API_URL=https://your-backend-domain.example
```

Restart Vite after changing an environment variable.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/patients/options` | Dropdown choices |
| POST | `/patients/` | Create a patient |
| GET | `/patients/` | List patients; optional `search`, `ward`, `department`, `doctor`, and `status` query parameters |
| GET | `/patients/{id}` | Get one patient |
| PUT | `/patients/{id}` | Update a patient |
| PATCH | `/patients/{id}/discharge` | Mark a patient as discharged |
| DELETE | `/patients/{id}` | Delete a patient |

## Deployment notes

The frontend and backend must both be deployed and connected for the submission live link to work.

**Backend environment variables**
- `DATABASE_URL`: PostgreSQL connection string, configured in the hosting provider's secret/environment settings.
- `CORS_ORIGINS`: comma-separated frontend origin(s), for example `https://your-frontend.example`.

The backend allows the two local Vite development origins by default. Add the deployed frontend origin to `CORS_ORIGINS`.

A typical backend start command is:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Frontend environment variable**
- `VITE_API_URL`: public URL of the deployed FastAPI backend, without a trailing slash.

Do not put the database URL or other secrets in the frontend. Do not commit `.env` files.

## Screenshots

The `screenshots/` folder contains the earlier local UI preview supplied during development. Those captures predate the newly added Ward/Department/Doctor filters and discharge button. Replace them with fresh screenshots of the final running version before submitting the repository.

- Patient records preview: `screenshots/patient-records-preview.png`
- Admissions preview: `screenshots/admissions-preview.png`

## Final verification checklist

Before submitting, test the live application:

1. Add a patient with valid values.
2. Confirm the new patient appears in the list.
3. Search by the patient's name.
4. Filter independently by Ward, Department, and Doctor.
5. Edit the patient.
6. Mark an admitted patient as discharged and confirm the status updates.
7. Delete a test patient and verify the confirmation prompt.
8. Try invalid names, ages, empty selections, and a future admission date; confirm the API rejects invalid requests.
9. Restart the backend and confirm patient records remain saved.
10. Check the layout at desktop, tablet, and mobile widths.

## DScribe submission

Before emailing, add your public GitHub repository URL and live working frontend URL to your final README. Send both links to `pramod@dscribe.in` and `suhasm@dscribe.in` with your full name in the email subject.
