# Live school deployment checklist

Use this when moving from local development to a **real hosted** environment (HTTPS, real domain, real users).  
This is an engineering checklist only — it does **not** replace legal review, privacy policies, or a school’s data agreements.

### Host the UI (HTTPS)

Step-by-step for **Vercel / Netlify / Cloudflare Pages**: see **`deploy/HOSTING.md`**.  
Configs are in **`frontend/`** (`vercel.json`, `netlify.toml`, `public/_redirects`).

### Automated checks (from repo root)

```bash
npm run deploy:check
```

Stricter (production rules: JWT length, CORS, `frontend/.env.production`):

```bash
npm run deploy:check:strict
```

See also **`deploy/nginx.example.conf`** and **`frontend/.env.production.example`**.

---

## 1. HTTPS (TLS)

- Serve both the **API** and the **static web app** over **HTTPS**.
- Typical options: your host’s managed TLS, **Cloudflare** in front, or **nginx** / Caddy / Traefik as a reverse proxy with certificates (e.g. Let’s Encrypt).
- Do not ship production auth over plain `http://` for public URLs.

---

## 2. Backend (`backend/.env`) — production

Copy from `backend/.env.example` and set at least:

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `production` (enforces strong JWT, CORS rules, and safer error responses). |
| `JWT_SECRET` | Long random string, **≥ 32 characters** in production. |
| `SUPABASE_URL` | Your project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; never expose to the browser. |
| `FRONTEND_ORIGIN` | Exact origin of the web app, **no trailing slash** (e.g. `https://app.yourschool.org`). **Required** in production so CORS allows the browser. |
| `CORS_ORIGINS` | Optional: comma-separated extra allowed origins (e.g. staging). |

The server will **exit on startup** in production if no allowed CORS origin is configured (see `backend/app.js`).

---

## 3. Frontend build

- Copy **`frontend/.env.production.example`** → **`frontend/.env.production`** and set **`VITE_API_BASE_URL`** to your **API origin only** (scheme + host + port if needed), **no path** — e.g. `https://api.yourschool.org`, not `.../api` or `.../login`.
- Build: `npm run build` in `frontend/` (or `npm run build` from the repo root).
- Deploy the contents of **`frontend/dist/`** to static hosting (S3+CloudFront, Netlify, Vercel, nginx, etc.).
- For **nginx**, see **`deploy/nginx.example.conf`** as a starting point (uncomment and edit).

---

## 4. Legal / school policy (outside code)

For **real student or family data**, you typically need:

- A **privacy notice** (what you collect, why, how long, who can access it).
- **Terms of use** or a school agreement appropriate to your jurisdiction.
- Internal policies: who approves accounts, how incidents are reported, retention, and backups.

Consult qualified counsel / your institution’s DPO where applicable — this repo cannot provide legal documents.

---

## 5. Smoke test after deploy

- **API:** `GET https://your-api-host/api/health` — should return a healthy JSON response.
- **Browser:** open the app URL, log in, open one dashboard page that calls the API.
- If the UI shows CORS or network errors, recheck **`FRONTEND_ORIGIN`** and **`VITE_API_BASE_URL`** (exact scheme and host).

---

## Summary

| Step | Action |
|------|--------|
| TLS | HTTPS everywhere for users |
| API env | `NODE_ENV`, `JWT_SECRET`, Supabase keys, `FRONTEND_ORIGIN` (+ `CORS_ORIGINS` if needed) |
| Web | Build with `VITE_API_BASE_URL`, host `dist/` |
| Compliance | Privacy / agreements for real data — professional review |
| Verify | `/api/health` + login flow in browser |

Nothing here replaces a lawyer or DPO, but aligning hosting and environment variables with this list matches how a production school product is usually structured.
