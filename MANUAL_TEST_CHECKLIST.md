# Manual Test Checklist

Use this checklist before a presentation or submission.

## Setup

- [ ] `backend/.env` exists.
- [ ] `SUPABASE_URL` is filled.
- [ ] `SUPABASE_ANON_KEY` is filled.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is filled.
- [ ] `JWT_SECRET` is set and strong.
- [ ] Backend starts with `npm run start:backend`.
- [ ] Website starts with `npm run start:frontend`.
- [ ] Mobile starts with `npm run start:mobile`.
- [ ] API health opens: `http://localhost:5000/api/health`.
- [ ] Website opens: `http://localhost:5173`.

## Automated Checks

Run:

```bash
npm run validate
```

Expected:

- [ ] Frontend lint passes.
- [ ] Frontend build passes.
- [ ] Backend tests pass.
- [ ] Mobile typecheck passes.
- [ ] Mobile lint passes.
- [ ] Deploy check passes.

## Login And Auth

- [ ] Invalid login shows an error.
- [ ] School Admin login works.
- [ ] Coordinator login works.
- [ ] Teacher login works.
- [ ] Family login works.
- [ ] Logout clears the session.
- [ ] Protected dashboard pages redirect or block access when logged out.
- [ ] Wrong role cannot access restricted pages.
- [ ] Refreshing the browser keeps a valid session.
- [ ] Expired or invalid token signs the user out.

## Website: School Admin

- [ ] Dashboard loads.
- [ ] Analytics page loads.
- [ ] Registration requests page loads.
- [ ] Admin users page loads.
- [ ] Support inbox loads.
- [ ] Admin can view all role areas through sidebar.

## Website: Coordinator

- [ ] Dashboard loads.
- [ ] Staff/accounts page loads.
- [ ] Students management page loads.
- [ ] Create/edit student flow works.
- [ ] Sessions page loads.
- [ ] Reports page loads.
- [ ] Support inbox loads.

## Website: Teacher

- [ ] Dashboard loads.
- [ ] Students page loads.
- [ ] Sessions page loads.
- [ ] Progress page loads.
- [ ] Activities page loads.
- [ ] Notes and reports page loads.
- [ ] IEP / intervention plan page loads.
- [ ] Daily check-ins page loads.
- [ ] Steps for families page loads.
- [ ] Family chat works.

## Website: Family

- [ ] Dashboard loads.
- [ ] Daily update page loads.
- [ ] Child Space page loads.
- [ ] IEP / intervention plan page loads.
- [ ] Home steps page loads.
- [ ] Progress page loads.
- [ ] Notes and reports page loads.
- [ ] School chat works.
- [ ] Student profile opens.

## Mobile App

- [ ] App opens without crash.
- [ ] Splash screen appears.
- [ ] Login screen appears.
- [ ] Family login works.
- [ ] Family home loads.
- [ ] Start Here card works.
- [ ] Daily check-in opens.
- [ ] Child Mode opens.
- [ ] Child activity opens and saves progress.
- [ ] Feelings check-in works.
- [ ] Videos screen opens.
- [ ] Chat opens and sends a message.
- [ ] Reports/progress screens open.
- [ ] Security settings open.
- [ ] Inactivity timeout logs out when configured.

## Presentation Smoke Test

- [ ] Browser zoom and screen resolution look good.
- [ ] Mobile emulator or phone is connected before presentation.
- [ ] Backend terminal stays running.
- [ ] Website terminal stays running.
- [ ] Expo terminal stays running if mobile is shown.
- [ ] Demo accounts are ready.
- [ ] Screenshots/video backup exists in case Wi-Fi fails.

