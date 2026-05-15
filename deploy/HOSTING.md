# Host the frontend (HTTPS included)

Deploy the **`frontend`** folder (Vite build). Your host issues **HTTPS** automatically.

## One-time: environment variable

In the host’s dashboard, add:

- **`VITE_API_BASE_URL`** = your **API** base URL only, e.g. `https://api.yourschool.org`  
  (no `/api` path; must match what you set in `backend/.env` for CORS: `FRONTEND_ORIGIN` = this **site’s** `https://` URL).

Then trigger a build, or build locally with `frontend/.env.production` and upload `dist/`.

---

## Vercel

1. Import this Git repo.
2. **Root Directory:** `frontend`
3. Framework Preset: Vite (auto).
4. **Environment Variables:** `VITE_API_BASE_URL`
5. Deploy → you get a **`https://`** URL.

`vercel.json` in `frontend/` enables SPA routing (React Router).

---

## Netlify

1. New site from Git, **base directory:** `frontend`
2. Build: `npm run build`, publish: `dist`
3. **Environment:** `VITE_API_BASE_URL`
4. `netlify.toml` + `public/_redirects` handle HTTPS (Netlify TLS) and SPA fallback.

---

## Cloudflare Pages

1. Connect repo → **Build configuration**
2. **Root directory:** `frontend`
3. Build command: `npm run build`
4. Build output: `dist`
5. **Environment variable:** `VITE_API_BASE_URL`
6. `public/_redirects` is copied into `dist` for SPA routing.

Use Cloudflare DNS/proxy if your domain is there; Pages still serves **`https://`**.

---

## API (Express)

Deploy **`backend`** separately (Railway, Render, Fly.io, VPS, etc.) with **`NODE_ENV=production`**, **`FRONTEND_ORIGIN=https://your-frontend-host`**, and HTTPS on the API hostname. See **`LIVE_SCHOOL_DEPLOYMENT.md`**.
