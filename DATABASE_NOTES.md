# Database Notes

The backend uses Supabase as the database and storage layer.

## Main Data Areas

The project includes data for:

- Users and roles
- Students / children
- Sessions
- Reports and notes
- Activities and progress
- Parent daily check-ins
- IEP / intervention plans
- Home steps for families
- Chat messages
- Registration requests
- Support requests
- Student profile documents and contacts

## Supabase SQL Files

Important SQL files are in `supabase/`:

| File | Purpose |
|------|---------|
| `run_all.sql` | Main setup runner for the included SQL files |
| `seed_demo_data.sql` | Demo records for presentation |
| `registration_requests.sql` | School admin approval workflow |
| `chat_messages.sql` | Chat storage |
| `daily_checkins.sql` | Parent daily check-ins |
| `daily_checkins_mood_values.sql` | Mood value updates |
| `sessions_status_check.sql` | Session status constraints |
| `treatment_plans.sql` | IEP / intervention plan tables |
| `parent_steps.sql` | Teacher steps for families |
| `student_profile_upgrades.sql` | Student profile contacts/documents upgrades |

## Recommended Setup Order

1. Create or open your Supabase project.
2. Open the Supabase SQL editor.
3. Run `supabase/run_all.sql`.
4. Run `supabase/seed_demo_data.sql` if you need demo records.
5. Fill `backend/.env` with Supabase API values.
6. Run backend health check.

Health check:

```text
http://localhost:5000/api/health
```

Expected:

- `database` should be `ok`.
- `serviceRoleKeyConfigured` should be `true`.

## Role Model

The app expects these roles:

| Role Key | Display Name | Main Purpose |
|----------|--------------|--------------|
| `super_admin` | School Admin | Full system access and approval flows |
| `manager` | Coordinator | Manage users, students, sessions, and reports |
| `therapist` | Teacher | Manage student progress, activities, reports, plans, chat |
| `parent` | Family | View child progress, daily updates, reports, chat, mobile app |

## ERD Summary

High-level relationship:

```text
users
  ├─ children.parent_id
  ├─ children.therapist_id
  ├─ sessions.therapist_id
  ├─ reports.therapist_id
  ├─ chat_messages.sender_id
  └─ support_requests.user_id

children
  ├─ sessions.child_id
  ├─ reports.child_id
  ├─ progress.child_id
  ├─ daily_checkins.child_id
  ├─ treatment_plans.child_id
  ├─ parent_steps.child_id
  ├─ chat_messages.child_id
  └─ student_profile records
```

## Demo Data

Seed classroom users:

```bash
npm run seed:school-users --prefix backend
```

Default demo accounts:

| Role | Email | Password |
|------|-------|----------|
| School Admin | `schooladmin@asp.com` | `AspAdmin123` |
| Coordinator | `coordinator@asp.com` | `AspCoord123` |
| Teacher | `teacher@asp.com` | `AspTeach123` |
| Family | `family@asp.com` | `AspFamily123` |

Do not use these default credentials with real student data.

