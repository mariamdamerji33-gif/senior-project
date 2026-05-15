# Senior Project Feature Flow Report

## Project Title
Autism Communication & Learning Platform

## Project Purpose
This project supports autism learning and communication between school administration, coordinators, teachers, families, and children. It provides a web dashboard for school operations and a mobile app for parents and daily child practice.

## System Components
- `frontend`: React/Vite website dashboard.
- `backend`: Express API with authentication, role guards, rate limits, CORS, and Supabase access.
- `supabase`: PostgreSQL database schema, feature tables, and storage support.
- `mobile`: Expo mobile app for parent login and Child Mode activities.

## Main User Roles

### 1. School Admin
Code role: `super_admin`

Main flow:
- Logs in to the web dashboard.
- Reviews analytics.
- Approves registration requests.
- Manages admin users and school accounts.
- Opens support inbox for mobile support requests.
- Can access all major system areas for supervision.

### 2. Coordinator
Code role: `manager`

Main flow:
- Logs in to the web dashboard.
- Manages staff and accounts.
- Creates and updates student records.
- Manages sessions.
- Reviews reports.
- Handles mobile support requests.
- Uses CSV/export and demo readiness tools.

### 3. Teacher / Therapist
Code role: `therapist`

Main flow:
- Logs in to the web dashboard.
- Views assigned students.
- Creates sessions and activities.
- Records progress.
- Writes notes and reports.
- Creates intervention plans and goals.
- Adds home steps for families.
- Reviews parent daily check-ins.
- Chats with families.

### 4. Family / Parent
Code role: `parent`

Main flow:
- Logs in to the website or mobile app.
- Views assigned child.
- Submits daily check-in.
- Reads teacher home steps.
- Reviews treatment plan, progress, and reports.
- Chats with school or teacher.
- Opens Child Mode in the mobile app.

### 5. Child
Code role: no separate login role

Main flow:
- Uses Child Mode from the parent mobile app.
- Plays large-button activities.
- Practices communication, matching, speech, routine, feelings, and daily games.
- Watches daily learning videos.
- Earns stars from completed activities.

## Website Flow

### Public Flow
1. User opens website.
2. User can log in, register, read privacy policy, or read terms.
3. Login sends credentials to backend API.
4. Backend returns a JWT token.
5. Website opens the correct dashboard based on role.

### School Admin Flow
1. Open dashboard.
2. Review analytics.
3. Approve or reject registration requests.
4. Manage users.
5. Monitor support inbox.
6. Review other role areas when needed.

### Coordinator Flow
1. Open dashboard.
2. Manage staff accounts.
3. Manage students.
4. Schedule and update sessions.
5. Review notes and reports.
6. Export/report data when needed.
7. Handle support requests from mobile users.

### Teacher Flow
1. Open assigned students.
2. Create activities and sessions.
3. Add progress records.
4. Write reports.
5. Create treatment plans and goals.
6. Add family home steps.
7. Review daily check-ins from parents.
8. Chat with families.

### Parent Flow
1. Open daily update.
2. Submit mood, sleep, appetite, meltdowns, and notes.
3. View child progress.
4. Read reports.
5. Follow treatment plan and home steps.
6. Chat with school.
7. Use Child Space or mobile Child Mode.

## Mobile App Flow

### Parent Login
1. Parent signs in with school account.
2. Mobile app loads parent children.
3. Parent opens the main overview.
4. Parent can open daily check-in, chat, reports, notifications, downloads, support, or Child Mode.

### Child Mode
Child Mode is designed with large buttons, simple text, and English/Arabic support.

Activities:
- PECS Cards: child chooses pictures to communicate needs.
- Matching Game: child matches picture pairs.
- Daily Games: child plays short daily games for colors, shapes, feelings, first/then, routine, same/different, and size.
- Speech Repeat: child practices useful phrases.
- Daily Routine: child follows simple routine steps.
- Feelings Check-In: child chooses emotion and saves it for parent/teacher support.
- Learning Videos: child watches short daily autism-friendly learning videos.

## Daily Games Flow
1. Parent opens Child Mode.
2. Parent taps Daily Games.
3. Child completes short mini games:
   - Color match.
   - Shape match.
   - Feeling face.
   - First / Then.
   - What comes next.
   - Same or different.
   - Big and small.
4. App calculates progress score.
5. Parent saves daily games progress.
6. App awards stars.
7. Progress appears in reports/progress data.

## Offline Mode Flow
Offline mode is used when the mobile app cannot reach the backend API.

1. Child completes an activity.
2. Parent taps save progress.
3. If the API is online, the app saves directly to backend.
4. If the API is offline, the app saves progress locally in AsyncStorage.
5. The app shows a saved-offline message.
6. When internet/API returns, the next successful save syncs queued progress to backend.

Offline-supported child progress features:
- Daily Games.
- Matching Game.
- PECS Cards.
- Speech Repeat.
- Daily Routine.
- Feelings Check-In.

## Backend API Flow

Main API groups:
- `/api/auth`: login, register, registration status, CSRF token, current user.
- `/api/admin`: analytics, registration approval, admin user management.
- `/api/manager`: users, students, sessions, reports.
- `/api/therapist`: progress, sessions, children, reports, activities, treatment plans, parent steps.
- `/api/parent`: children, reports, progress, treatment, daily check-ins, notifications.
- `/api/chat`: messages, voice notes, image upload.
- `/api/student`: student profile, contacts, documents.
- `/api/support`: support requests and support inbox.
- `/api/health`: deployment and database health check.

## Database / Supabase Flow

Supabase stores:
- Users and roles.
- Children/students.
- Sessions.
- Activities.
- Progress.
- Reports.
- Treatment plans and goals.
- Daily check-ins.
- Parent steps.
- Chat messages.
- Student contacts and documents.
- Registration requests.
- Support requests.

Backend uses Supabase service role only on the server. The service role key is not exposed to frontend or mobile.

## Suggested Doctor Presentation Order
1. Start with the problem: communication between school, teacher, family, and child daily practice is hard to coordinate.
2. Show the architecture: website, backend API, Supabase database, mobile app.
3. Show role-based login and dashboards.
4. Demonstrate school admin and coordinator management.
5. Demonstrate teacher workflow: sessions, progress, reports, treatment plan, family steps.
6. Demonstrate parent workflow: daily check-in, reports, chat.
7. Demonstrate mobile Child Mode: videos, games, speech, routine, feelings.
8. Demonstrate offline progress save.
9. End with value: the platform connects school supervision, therapy tracking, parent engagement, and child daily learning.

## Key Strengths
- Full-stack system, not only a static website.
- Role-based access for real school workflow.
- Bilingual mobile child experience.
- Parent and teacher communication.
- Reports, progress, treatment plans, and daily check-ins.
- Autism-friendly daily videos and games.
- Offline progress queue for mobile child activities.
- Deployment preparation for Vercel, Render, Supabase, and Expo.
