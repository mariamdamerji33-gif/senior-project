# Security hardening status

This file tracks practical security upgrades for production readiness.

## Implemented now

- **Helmet** with a strict production CSP on the API (`backend/app.js`); HSTS in production.
- **JWT:** tokens are **signed and verified with HS256 only** (`algorithm: 'HS256'`, `verify(..., { algorithms: ['HS256'] })`) in `backend/mvc/controllers/authController.js` and `backend/middleware/auth.js`.
- **Auth:** Bearer header **or** HttpOnly auth cookie when `AUTH_COOKIE_ENABLED=true`.
- **Logout** clears the auth cookie (`POST /api/auth/logout`).
- **CSRF** (cookie-auth mode): double-submit cookie + header; CSRF cookie is **HttpOnly**, `SameSite=Lax`, `Secure` in production (`backend/middleware/csrf.js`).
- **CORS** allowlist via `FRONTEND_ORIGIN` / `CORS_ORIGINS`; production fails fast if unset.
- **Rate limits:** login, registration status, auth bucket, general `/api` writes; **registration** capped at **10 / 15 min / IP** (`backend/mvc/routes/authRoutes.js`); **GET `/api/health`** skipped on the per-minute API limiter for monitoring.
- **Bodies:** JSON capped at **200kb**; uploads restricted (e.g. PDF-only) via multer.
- **Frontend API client:** `credentials: 'include'`; optional CSRF header for writes without Bearer; **one automatic retry** after clearing CSRF cache on 403 CSRF (`frontend/src/mvc/models/apiClient.ts`).
- **Student profile** PDF upload `fetch` uses `credentials: 'include'` (`frontend/src/mvc/views/pages/StudentProfilePage.tsx`).
- **Process / env:** production requires `JWT_SECRET` length ≥ 32; dev warns if shorter (`backend/server.js`).
- **Audit logging** (`backend/utils/auditLog.js`) for sensitive actions, including admin user/registration flows, manager child create/reassign/**delete**, manager session **update/delete**.
- **Website session storage:** browser JWT is stored in `sessionStorage`, old persistent tokens are removed, and expired JWTs are cleared before restoring a session.
- **Mobile secure storage:** mobile JWT is stored in Expo SecureStore and expired JWTs are cleared before restoring a session.
- **JWT hardening:** tokens include `jti`, expiry, optional issuer/audience support, strict payload validation, and `Cache-Control: no-store` on auth responses.

## Current auth mode

- Primary mode is still Bearer token returned in JSON. The website keeps it in session storage; mobile keeps it in secure storage.
- Cookie mode is optional and backward compatible for phased rollout.

## Recommended next steps

1. Enable cookie mode in production:
   - `AUTH_COOKIE_ENABLED=true`
   - `AUTH_COOKIE_NAME=asp_auth` (or your preferred name)
2. Move frontend session source from session storage to server-managed HttpOnly session (or short-lived access token + refresh).
3. Configure **CSP and security headers** on the static host / CDN (in addition to API Helmet).
4. Extend audit coverage to therapist/parent writes if needed; define log retention and access control for `audit.log`.
5. Run **dependency audits** (`npm audit`) before each release; keep Supabase RLS policies reviewed for each table.

## Notes

- In production, cookies require **HTTPS** (`Secure` is set when `NODE_ENV=production`).
- Keep `FRONTEND_ORIGIN` and `CORS_ORIGINS` aligned with deployed UI domains.
- Do not commit `backend/.env` or service-role keys.
