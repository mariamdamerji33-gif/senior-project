# Autism Communication & Learning Platform

Senior project for coordinating autism learning support across school admins, coordinators, teachers, families, and a parent-focused mobile app.

**Stack:** React (Vite) + Express + Supabase (+ Expo mobile).

## Quick steps

Follow these steps when you want to run and show the project.

### 1. Install packages

From the project root:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
npm install --prefix mobile
```

### 2. Check backend environment

Make sure this file exists:

```text
backend/.env
```

It must include:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

### 3. Seed demo accounts

Run:

```bash
npm run seed:school-users --prefix backend
```

Demo accounts:

| Role | Email | Password |
|------|-------|----------|
| School Admin | `schooladmin@asp.com` | `AspAdmin123` |
| Coordinator | `coordinator@asp.com` | `AspCoord123` |
| Teacher | `teacher@asp.com` | `AspTeach123` |
| Family | `family@asp.com` | `AspFamily123` |

### 4. Run website and backend

From the project root:

```bash
npm start
```

Open:

```text
http://localhost:5173
```

API health check:

```text
http://localhost:5000/api/health
```

### 5. Run mobile app

Keep backend running, then open another terminal:

```bash
npm run start:mobile
```

Use the Family account for the mobile app.

### 6. Test everything

Before demo or submission:

```bash
npm run validate
```

### 7. Present the project

Use:

- Website page: `Dashboard → Demo readiness`
- `DEMO_SCRIPT.md`
- `FINAL_PRESENTATION_CHECKLIST.md`
- `MANUAL_TEST_CHECKLIST.md`
- `DATABASE_NOTES.md`

## Project structure

- `backend/` — Express API, Supabase, auth, role guards, chat, reports, sessions, support, uploads
- `frontend/` — React/Vite web dashboard for all web roles
- `mobile/` — Expo app for parents/families
- `scripts/` — Deployment and environment checks
- `supabase/` — Schema / reference material

## Main demo features

- Role-based login and dashboards (school admin, coordinator, teacher, family)
- Student management, sessions, progress, reports, plans, and family steps
- Parent daily check-ins, child-friendly web space, chat, support inbox, mobile workflows
- Coordinator tools: filter and export sessions and reports to CSV; family overview and progress pages link to full student profiles
- Scripts to validate configuration before submit or deploy

## Prerequisites

- Node.js and npm
- A Supabase project using the schema expected by this backend
- `backend/.env` created from `backend/.env.example`

**Never commit `backend/.env`** (it holds secrets). It is listed in `.gitignore`.

## Environment setup

1. Install dependencies (from repo root):

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
npm install --prefix mobile
```

2. Copy and fill the backend env file:

```bash
copy backend\.env.example backend\.env
```

Required values: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET` (use a long random string; see comments in `.env.example`).

For a **deployed** web app, also set `FRONTEND_ORIGIN` or `CORS_ORIGINS` in `backend/.env`, and create `frontend/.env.production` from `frontend/.env.production.example` (for local `validate:strict`, using `VITE_API_BASE_URL=http://localhost:5000` is fine; change it to your public API URL when you host for real).

Detailed steps and troubleshooting: **`RUN-STEPS.md`**.

## Demo accounts

After `backend/.env` is ready, seed classroom accounts:

```bash
npm run seed:school-users --prefix backend
```

Defaults (local demo only — rotate before real data):

- School Admin: `schooladmin@asp.com` / `AspAdmin123`
- Coordinator: `coordinator@asp.com` / `AspCoord123`
- Teacher: `teacher@asp.com` / `AspTeach123`
- Family: `family@asp.com` / `AspFamily123`

## Run the web app

From repo root (API + Vite together):

```bash
npm start
```

Or separately:

```bash
npm run start:backend
npm run start:frontend
```

- Frontend: http://localhost:5173  
- API health: http://localhost:5000/api/health  

## Run the mobile app

Start the backend, then Expo:

```bash
npm run start:backend
npm run start:mobile
```

`mobile/app.json` → `expo.extra.apiBaseUrl`: leave blank for LAN auto-detect, or set e.g. `http://10.0.2.2:5000` (Android emulator), `http://<your-pc-ip>:5000` (phone), or `http://127.0.0.1:5000` (USB reverse). Use the **family** account for the mobile demo.

## Before you submit or present

One command (lint, build, smoke test, mobile checks, deploy check):

```bash
npm run validate
```

**Stricter** (JWT length, CORS, `VITE_API_BASE_URL` — use before treating the project as production-ready):

```bash
npm run validate:strict
```

Or step by step:

```bash
npm run lint --prefix frontend
npm run build --prefix frontend
npm test --prefix backend
npm run typecheck --prefix mobile
npm run lint --prefix mobile
npm run deploy:check
```

Stricter deploy audit only:

```bash
npm run deploy:check:strict
```

## Presentation-ready checklist

For final delivery, use these files:

- Website: open `Dashboard → Demo readiness` after login for health check and role demo links
- `DEMO_SCRIPT.md` — exact flow and talking points for the live demo
- `MANUAL_TEST_CHECKLIST.md` — manual QA checklist for website, backend, and mobile
- `DATABASE_NOTES.md` — Supabase files, role model, and ERD summary
- `FINAL_PRESENTATION_CHECKLIST.md` — slide order, security talking points, and backup plan

## More documentation

| Doc | Purpose |
|-----|---------|
| `RUN-STEPS.md` | Install, env, ports, troubleshooting |
| `DEMO_SCRIPT.md` | Step-by-step presentation script |
| `MANUAL_TEST_CHECKLIST.md` | Manual test plan before demo/submission |
| `DATABASE_NOTES.md` | Supabase setup notes and ERD summary |
| `FINAL_PRESENTATION_CHECKLIST.md` | Slides, talking points, and final delivery checklist |
| `LIVE_SCHOOL_DEPLOYMENT.md` | HTTPS, production env, build, legal checklist |
| `deploy/HOSTING.md` | Static hosting + `VITE_API_BASE_URL` |
| `SECURITY_HARDENING.md` | CSP, cookies, security follow-ups |
| `.github/workflows/ci.yml` | GitHub Actions: frontend build, backend tests, mobile checks (no secrets required) |

## Deployment notes

- Production backend needs CORS via `FRONTEND_ORIGIN` or `CORS_ORIGINS`
- Production frontend: `VITE_API_BASE_URL` = backend origin **without** `/api`
- Seed credentials are **not** production credentials

## Suggested presentation flow

1. Login and role-based dashboards  
2. School admin / coordinator management (users, students, sessions)  
3. Teacher: sessions, reports, progress, family steps  
4. Family: daily update, child space, progress, chat  
5. Mobile app against the same API  

## Architecture (short)

- **Backend:** `mvc/routes/` → middleware → `mvc/controllers/` → `mvc/models/` (Supabase). Helpers in `middleware/`, `config/`, `utils/`.
- **Frontend:** MVC under `frontend/src/mvc/` — `views/pages/`, `views/components/`, `models/apiClient.ts`, `controllers/` (auth). Imports may use `@/` → `src/`.

## Ports

- **5173** — Vite dev server  
- **5000** — API  
