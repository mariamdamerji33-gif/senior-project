# Final Presentation Checklist

Use this list to prepare the final senior project delivery.

## Required Files

- [ ] `README.md`
- [ ] `RUN-STEPS.md`
- [ ] `DEMO_SCRIPT.md`
- [ ] `MANUAL_TEST_CHECKLIST.md`
- [ ] `DATABASE_NOTES.md`
- [ ] `SECURITY_HARDENING.md`
- [ ] `ARCHITECTURE_MVC.md`
- [ ] Supabase SQL files in `supabase/`

## Slides

Recommended slide order:

1. Title and team/name.
2. Problem statement.
3. Project goals.
4. User roles.
5. System architecture.
6. Database overview / ERD.
7. Website features.
8. Mobile app features.
9. Security.
10. Testing and validation.
11. Demo flow.
12. Future work.

## Problem Statement

Autism support often needs continuous communication between school staff and families. Without one shared platform, progress notes, sessions, reports, daily updates, and home steps can become scattered.

## Project Goal

Build a secure website and mobile app that helps school admins, coordinators, teachers, and families manage autism learning support in one place.

## Main Features To Mention

- Role-based login.
- School admin dashboard.
- Coordinator user/student/session management.
- Teacher progress, activities, reports, IEP plans, family steps, chat.
- Family progress, daily update, reports, home steps, chat.
- Parent mobile app.
- Child-friendly activities and feelings check-in.
- Support inbox.
- JWT authentication and role guards.

## Architecture Talking Points

- React/Vite frontend.
- Express backend API.
- Supabase database.
- Expo mobile app.
- JWT authentication.
- MVC-style organization.
- Shared API used by website and mobile.

## Security Talking Points

- Password hashing.
- JWT authentication.
- Role-based authorization.
- Protected backend routes.
- Rate limits for abuse protection.
- CORS allowlist.
- Helmet security headers.
- Mobile secure token storage.
- Website session token cleared after browser session.
- Strong `JWT_SECRET` in `backend/.env`.

## Demo Backup Plan

Prepare these before presenting:

- [ ] Screenshots of login, dashboards, mobile home, chat, progress.
- [ ] Short screen recording.
- [ ] Backend already running.
- [ ] Website already open.
- [ ] Mobile emulator/Expo already loaded.
- [ ] Demo accounts written in a private note.
- [ ] Website `Dashboard → Demo readiness` page opens and API health recheck passes.

## Future Work

Good future work to mention:

- Password reset by email.
- Login history.
- Account lock after repeated failed login attempts.
- Push notification improvements.
- More analytics charts.
- Parent/teacher appointment scheduling.
- Offline-first mobile sync improvements.
- More accessibility customization.

## Final Validation

Run:

```bash
npm run validate
```

Expected: all checks pass.

