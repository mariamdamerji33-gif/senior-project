-- =============================================================================
-- DEMO DATA for Autism Learning Platform (run in Supabase → SQL Editor)
-- =============================================================================
-- Password for ALL demo logins below: demo1234 (8+ chars, letter + number — matches API password policy for admin-created users)
--   super_admin: admin@demo.com
--   manager:     manager@demo.com
--   therapist:   therapist@demo.com
--   parent:      parent@demo.com
--
-- After running:
--   1. Log in on the app with Role matching the account.
--   2. Run `supabase/chat_messages.sql` first if you use Chat (table must exist).
--
-- Safe to run multiple times: skips rows that already exist (by email / names).
-- =============================================================================

-- 1) Users (plain-text passwords — prototype only; use hashing in production)
INSERT INTO public.users (name, email, password, role, created_at)
SELECT 'Demo Super Admin', 'admin@demo.com', 'demo1234', 'super_admin', now()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'admin@demo.com');

INSERT INTO public.users (name, email, password, role, created_at)
SELECT 'Demo Manager', 'manager@demo.com', 'demo1234', 'manager', now()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'manager@demo.com');

INSERT INTO public.users (name, email, password, role, created_at)
SELECT 'Demo Therapist', 'therapist@demo.com', 'demo1234', 'therapist', now()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'therapist@demo.com');

INSERT INTO public.users (name, email, password, role, created_at)
SELECT 'Demo Parent', 'parent@demo.com', 'demo1234', 'parent', now()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'parent@demo.com');

-- 2) One child linked to demo parent + therapist (name "Ali")
INSERT INTO public.children (name, age, diagnosis, parent_id, therapist_id)
SELECT
  'Ali',
  7,
  'ASD',
  p.id,
  t.id
FROM public.users p
CROSS JOIN public.users t
WHERE p.email = 'parent@demo.com'
  AND t.email = 'therapist@demo.com'
  AND NOT EXISTS (
    SELECT 1
    FROM public.children c
    JOIN public.users pp ON pp.id = c.parent_id
    WHERE pp.email = 'parent@demo.com' AND c.name = 'Ali'
  );

-- 3) One activity created by the therapist (for progress screen)
INSERT INTO public.activities (title, description, created_by)
SELECT
  'Visual schedule',
  'Morning routine with picture cards.',
  t.id
FROM public.users t
WHERE t.email = 'therapist@demo.com'
  AND NOT EXISTS (SELECT 1 FROM public.activities WHERE title = 'Visual schedule');

-- 4) Progress row (child Ali + activity above)
-- If this fails on `date`, your column may be text or timestamptz — try:
--   date = to_char(now(), 'YYYY-MM-DD')  OR  date = now()
INSERT INTO public.progress (child_id, activity_id, score, date)
SELECT c.id, a.id, 8, CURRENT_DATE
FROM public.children c
JOIN public.users p ON p.id = c.parent_id
JOIN public.activities a ON a.title = 'Visual schedule'
JOIN public.users th ON th.id = c.therapist_id
WHERE p.email = 'parent@demo.com'
  AND th.email = 'therapist@demo.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.progress pr WHERE pr.child_id = c.id AND pr.activity_id = a.id
  );

-- 5) Sample report
INSERT INTO public.reports (child_id, therapist_id, notes, progress_score, created_at)
SELECT
  c.id,
  t.id,
  'Good engagement during structured play. Continue visual supports.',
  7,
  now()
FROM public.children c
JOIN public.users p ON p.id = c.parent_id
JOIN public.users t ON t.id = c.therapist_id
WHERE p.email = 'parent@demo.com'
  AND t.email = 'therapist@demo.com'
  AND c.name = 'Ali'
  AND NOT EXISTS (
    SELECT 1 FROM public.reports r WHERE r.child_id = c.id AND r.notes LIKE 'Good engagement%'
  );

-- 6) Sample session
INSERT INTO public.sessions (child_id, therapist_id, date, status)
SELECT
  c.id,
  t.id,
  (now() + interval '2 days')::timestamptz,
  'scheduled'
FROM public.children c
JOIN public.users p ON p.id = c.parent_id
JOIN public.users t ON t.id = c.therapist_id
WHERE p.email = 'parent@demo.com'
  AND t.email = 'therapist@demo.com'
  AND c.name = 'Ali'
  AND NOT EXISTS (
    SELECT 1 FROM public.sessions s WHERE s.child_id = c.id AND s.status = 'scheduled'
  );

-- 7) Chat sample (run supabase/chat_messages.sql first or this step errors)
INSERT INTO public.chat_messages (child_id, sender_id, sender_role, body, created_at)
SELECT
  c.id,
  p.id,
  'parent',
  'Hello, we practiced the schedule this morning.',
  now()
FROM public.children c
JOIN public.users p ON p.id = c.parent_id
WHERE p.email = 'parent@demo.com'
  AND c.name = 'Ali'
  AND NOT EXISTS (
    SELECT 1 FROM public.chat_messages m WHERE m.child_id = c.id AND m.body LIKE 'Hello, we practiced%'
  );
