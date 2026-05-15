# Mobile MVC structure

- **`controllers/`** — App state and orchestration (auth, language).
- **`models/`** — API client and domain helpers (HTTP, local queues, etc.).
- **`views/`** — UI layer:
  - **`views/screens/`** — stack screens (re-exported from `views/screens/index.ts`)
  - **`views/components/`** — shared UI (import individual modules, e.g. `InlineLoadError.tsx`)

Navigation (`src/navigation/`), theme, chat helpers, and feature modules stay at `src/` as supporting code.

See repo root **`ARCHITECTURE_MVC.md`** for how this fits with `frontend/` and `backend/`.
