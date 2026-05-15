# Frontend MVC

- **`models/`** — HTTP API client and data access (`apiClient.ts`).
- **`controllers/`** — App-wide state and orchestration (`AuthContextController`, exports in `controllers/index.ts`).
- **`views/`** — UI only:
  - **`views/pages/`** — route-level screens
  - **`views/components/`** — shared layout, UI primitives, auth chrome

The app shell composes views in `App.tsx` (routes). Use the **`@/`** import alias (`tsconfig` + Vite) for paths under `src/`, e.g. `@/mvc/views/pages/LoginPage`, `@/utils/csvDownload`.
