# Demo Script

Use this script for a clear 8-12 minute senior project presentation.

## 1. Opening

Say:

> This project is an Autism Communication and Learning Platform. It connects school admins, coordinators, teachers, and families through one website, plus a parent mobile app. The goal is to make student progress, sessions, reports, daily check-ins, and family communication easier to manage.

Show:

- Website login page
- Role selector
- Mobile app splash/login if you are also demoing mobile

## 2. Login And Roles

Explain:

- Each user logs in with email and password.
- Permissions come from the database role, not from the login form.
- JWT authentication protects private pages and API routes.

Demo accounts:

| Role | Email | Password |
|------|-------|----------|
| School Admin | `schooladmin@asp.com` | `AspAdmin123` |
| Coordinator | `coordinator@asp.com` | `AspCoord123` |
| Teacher | `teacher@asp.com` | `AspTeach123` |
| Family | `family@asp.com` | `AspFamily123` |

## 3. School Admin / Coordinator Flow

Show:

1. Dashboard overview.
2. Students management.
3. Staff/accounts.
4. Sessions.
5. Reports.
6. Support inbox.

Say:

> The coordinator can manage the operational side of the school: students, families, teachers, sessions, and reports. The support inbox helps handle urgent family requests from the mobile app.

## 4. Teacher Flow

Log in as teacher and show:

1. Assigned students.
2. Sessions.
3. Progress.
4. Activities.
5. Notes and reports.
6. IEP / intervention plan.
7. Steps for families.
8. Family chat.

Say:

> The teacher can track progress, write reports, manage activities, send home steps, and communicate with parents.

## 5. Family Website Flow

Log in as family and show:

1. Daily update.
2. Progress.
3. Notes and reports.
4. Home steps.
5. School chat.
6. Student profile.

Say:

> Families can understand progress in simple terms and stay connected with the school team.

## 6. Mobile App Flow

Show:

1. Mobile login.
2. Family home.
3. Start Here card.
4. Daily check-in.
5. Child Mode.
6. Feelings check-in or activity.
7. Chat / reports.

Say:

> The mobile app is designed for parents and families. It keeps the most important actions simple: daily updates, child activities, chat, and progress.

## 7. Security Explanation

Say:

> The backend uses password hashing, JWT authentication, role-based route guards, rate limiting, CORS allowlists, Helmet headers, and secure mobile token storage. The website stores the session token only for the browser session.

Mention:

- `JWT_SECRET` is configured in `backend/.env`.
- Backend protected routes use `requireAuth` and `requireRole`.
- Mobile uses `expo-secure-store`.
- Website clears expired tokens automatically.

## 8. Validation

Show or mention:

```bash
npm run validate
```

This checks:

- Frontend lint
- Frontend build
- Backend tests
- Mobile typecheck
- Mobile lint
- Deployment configuration check

## 9. Closing

Say:

> This platform solves the communication gap between school staff and families. It gives each role a focused dashboard and connects the website and mobile app through the same secure API.

