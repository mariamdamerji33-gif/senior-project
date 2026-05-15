# Run this project (step by step)

## 1. Backend environment

1. Copy `backend/.env.example` to `backend/.env` (if you do not have `.env` yet).
2. Open **Supabase** → your project → **Project Settings** → **API**.
3. In `backend/.env` set:
   - **SUPABASE_URL** — **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **SUPABASE_ANON_KEY** — the **anon** `public` key (JWT, starts with `eyJ`)
   - **SUPABASE_SERVICE_ROLE_KEY** — the **service_role** `secret` key (JWT, starts with `eyJ`). Never put this in the frontend or in public repos.
4. Optionally set **JWT_SECRET** to a long random string (used for app login tokens).
5. Save the file. Use **one line per value**, no quotes around the keys.

## 2. Install dependencies (once)

From the **project root** (`SENIOR PROJECT`):

```powershell
npm install
npm install --prefix backend
npm install --prefix frontend
npm install --prefix mobile
```

## 3. Start the API

From the project root:

```powershell
npm run start --prefix backend
```

Wait until you see: **Server running on port 5000**.

## 4. Check the API

In the browser open: **http://localhost:5000/api/health**

You should see `"database":"ok"` and `"serviceRoleKeyConfigured":true`.  
If `serviceRoleKeyConfigured` is false, fix `backend/.env` and restart the backend (step 3).

## 5. Start the frontend

Open a **second** terminal, project root:

**Option A — API + UI together**

```powershell
npm start
```

**Option B — UI only** (if the API is already running)

```powershell
npm run start --prefix frontend
```

(Or `npm run dev --prefix frontend` — same thing.)

From the **repo root** you can also use: `npm run start:frontend`

Open **http://localhost:5173** (or the URL printed in the terminal).

## 6. Log in (school demo — recommended)

1. After `backend/.env` is filled, seed the classroom accounts (from project root):

   ```powershell
   npm run seed:school-users --prefix backend
   ```

2. Open **http://localhost:5173/login** and sign in. On the login form, choose the **role dropdown** that matches the account (stored roles use the keys `super_admin`, `manager`, `therapist`, `parent` — the UI labels them School Admin, Coordinator, Teacher, Family):

   | Role (dropdown) | Demo email | Demo password |
   |-----------------|------------|-----------------|
   | School Admin (`super_admin`) | `schooladmin@asp.com` | `AspAdmin123` |
   | Coordinator (`manager`) | `coordinator@asp.com` | `AspCoord123` |
   | Teacher (`therapist`) | `teacher@asp.com` | `AspTeach123` |
   | Family (`parent`) | `family@asp.com` | `AspFamily123` |

**Alternative:** If you use `supabase/seed_demo_data.sql` instead, use the emails/passwords from that script (e.g. `demo1234` where documented there).

## 7. After any change to `backend/.env`

1. Stop the backend (**Ctrl+C** in its terminal).
2. Start it again (step 3).  
   Environment variables load only when Node starts.

## 8. Optional: database scripts (Supabase SQL Editor)

Run in order if you need demo data or chat:

1. `supabase/chat_messages.sql` — chat table
2. `supabase/seed_demo_data.sql` — demo users (password `demo1234` in seed) and sample rows
3. `supabase/sessions_status_check.sql` — if session **status** inserts fail

## Troubleshooting

| Problem | What to try |
|--------|-------------|
| `fetch failed` / cannot reach API | Backend not running; confirm step 3 and **http://localhost:5000/api/health** |
| 503 / “service role” on writes | `serviceRoleKeyConfigured` false; fix **SUPABASE_SERVICE_ROLE_KEY** in `backend/.env`, restart |
| Login fails | Check **users** in Supabase; password must match what you type. After login, passwords can be stored as bcrypt. |
| Admin “create user” password rejected | Password must be **8–128 characters** with **at least one letter and one number** (School Admin users API). |
| Production start fails on JWT | Set **JWT_SECRET** to **32+ random characters** when `NODE_ENV=production`. |
| Wrong `.env` loaded | Keys must live in **`backend/.env`** next to `server.js`, not only in the repo root |

Do not commit **`backend/.env`**; it contains secrets.
