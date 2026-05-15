# Publishing Guide

This project is published as three connected parts:

- Frontend website: Vercel, using the `frontend` folder.
- Backend API: Render, using the `backend` folder.
- Database and storage: Supabase.

The mobile app is built later with Expo EAS after the API has a public HTTPS URL.

## 1. Supabase

1. Create a Supabase project.
2. In Supabase SQL Editor, apply your main/core schema first if the project is empty.
3. Run `supabase/run_all.sql` for feature tables.
4. For a real production school, skip or remove the optional demo seed block in `supabase/run_all.sql`.
5. Copy these values for Render:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

Keep the service role key server-only. Never add it to Vercel, frontend code, or mobile code.

## 2. Backend API on Render

Use `render.yaml` from the repo root, or create a Render Web Service manually:

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`

Set these Render environment variables:

```text
NODE_ENV=production
JWT_SECRET=<long random string, at least 32 characters>
SUPABASE_URL=<your Supabase project URL>
SUPABASE_ANON_KEY=<your Supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<your Supabase service role key>
FRONTEND_ORIGIN=<your Vercel website URL, no trailing slash>
```

After deploy, open:

```text
https://your-render-api.onrender.com/api/health
```

## 3. Frontend Website on Vercel

Import the GitHub repository into Vercel:

- Root directory: `frontend`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

Set this Vercel environment variable:

```text
VITE_API_BASE_URL=https://your-render-api.onrender.com
```

Do not include `/api` at the end.

After the first Vercel deployment, copy the Vercel URL and set it as `FRONTEND_ORIGIN` in Render, then redeploy the backend.

## 4. Mobile App Later

When the backend API is live, update `mobile/app.json`:

```json
"extra": {
  "apiBaseUrl": "https://your-render-api.onrender.com"
}
```

Then use Expo EAS to create Android/iOS builds.

## 5. Local Validation

Run these from the repo root:

```bash
npm run lint --prefix frontend
npm run build --prefix frontend
npm test --prefix backend
npm run typecheck --prefix mobile
npm run lint --prefix mobile
npm run deploy:check
```

Use strict mode only after replacing local placeholder URLs and secrets with production values:

```bash
npm run deploy:check:strict
```
