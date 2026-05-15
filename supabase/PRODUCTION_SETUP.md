# Supabase Production Setup

Use this checklist before connecting a public website or mobile app to Supabase.

## Required Order

1. Create a Supabase project.
2. Apply the main/core schema for these existing tables first:
   - `public.users`
   - `public.children`
   - `public.sessions`
   - `public.activities`
   - `public.progress`
   - `public.reports`
3. Apply feature SQL from `supabase/run_all.sql`.
4. Verify storage buckets and policies used by the app.
5. Seed only the accounts you really want to use.

## Important Production Warning

`run_all.sql` includes an optional demo seed block near the bottom with demo users and simple passwords.

For a real school deployment:

- Do not run the optional demo seed block.
- Do not keep demo passwords.
- Create real admin/coordinator/teacher/parent users through controlled seed scripts or the app approval flow.

## Backend Keys

The backend hosting provider needs:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Only the backend gets `SUPABASE_SERVICE_ROLE_KEY`. Never expose it in frontend hosting or mobile builds.

## Suggested First Admin

After Supabase and backend environment variables are configured, create the first admin with:

```bash
npm run seed:super-admin --prefix backend
```

Set these variables in `backend/.env` or your backend host before running it:

```text
SEED_SUPER_ADMIN_EMAIL=<your admin email>
SEED_SUPER_ADMIN_PASSWORD=<strong password>
SEED_SUPER_ADMIN_NAME=<admin name>
```
