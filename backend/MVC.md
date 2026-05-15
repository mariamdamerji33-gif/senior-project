# Backend MVC layout

This Express API follows a classic MVC-style split under **`backend/mvc/`**:

| Layer | Folder | Role |
|--------|--------|------|
| **Routes** | `mvc/routes/` | URL mapping, HTTP verbs, middleware wiring (thin). |
| **Controllers** | `mvc/controllers/` | Request/response handling, validation, calling models. |
| **Models** | `mvc/models/` | Data access and business rules (e.g. Supabase). |
| **Views** | *(none)* | JSON API only — no server-rendered HTML views. |
| **Cross-cutting** | `middleware/`, `config/`, `utils/`, `lib/`, `data/` | Auth, DB client, helpers, static HTML for `/console` etc. |

Entry: `server.js` → `app.js` mounts routes from `mvc/routes/`; each route delegates to a controller in `mvc/controllers/`.
