# Project-wide MVC layout

| Area | MVC location | Notes |
|------|----------------|-------|
| **Mobile (Expo)** | `mobile/src/mvc/` | `controllers/`, `models/`, **`views/`** (`views/screens/`, `views/components/`). |
| **Frontend (Vite + React)** | `frontend/src/mvc/` | `models/`, `controllers/`, **`views/`** (`views/pages/`, `views/components/`). Path alias `@/*` → `src/*`. |
| **Backend (Express)** | `backend/mvc/routes/`, `backend/mvc/controllers/`, `backend/mvc/models/` | See `backend/MVC.md`. JSON API has no HTML view layer. |
| **Supabase** | `supabase/` | SQL/schema — persistence backing **backend models**; see `supabase/MVC.md`. |
| **Scripts / Deploy** | `scripts/`, `deploy/` | Tooling and hosting docs only; see each folder’s `MVC.md`. |
