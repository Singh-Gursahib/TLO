# The Little Orbits

A mobile-first Progressive Web App for running **The Little Orbits** after-school daycare in Kamloops, BC. Clean & minimal light theme with a deep-teal accent, built with **Next.js 16** + **Supabase**.

## Features

- **Home / Today** — live snapshot: who's on shift, present count, outings in progress, and alerts (consecutive absences, missing fridge log).
- **Student attendance** — mark arrivals (picked up from school by staff *or* dropped off) and departures, recording who dropped off / picked up.
- **Outings** — start an outing (outdoor check-out) → confirm every child safely back inside (indoor check-in).
- **Incidents** — one-tap quick capture → expand into a full report.
- **Time clock** — staff clock in/out with username + password.
- **Fridge temperature** — daily log with weekly/monthly trend charts and safe-range compliance.
- **Students & staff directories** — profiles with one-tap **call / text / email** buttons.
- **Admin (PIN)** — analytics dashboard + full CRUD for students, staff, inquiries, admissions and attendance.

Installable PWA (manifest + service worker), mobile bottom-nav / desktop sidebar.

## Tech

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS v4 · Supabase (publishable/anon key) · Recharts · lucide-react.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Create `.env.local` (see `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your publishable key>
NEXT_PUBLIC_ADMIN_PIN=3113
```

The database schema and seed SQL are maintained separately. Run them in the Supabase SQL Editor to provision tables (`students`, `student_contacts`, `student_attendance`, `outings`, `incidents`, `staff`, `staff_attendance`, `fridge_temp_logs`, `inquiries`, `admissions`, `app_settings`) plus the `verify_staff_login` / `set_staff_password` functions.

## Deploy (Vercel)

Import the repo in Vercel, add the environment variables above, and deploy. Point your domain at Vercel via DNS.

## Security note

This is a pragmatic setup for a private, dedicated facility device: it uses the Supabase publishable (anon) key with permissive Row Level Security. Staff passwords are bcrypt-hashed (pgcrypto) and verified server-side via a `SECURITY DEFINER` function. The admin PIN is a client-side gate. **Before handling real data**, harden by moving database access behind server routes with the `service_role` key and replacing the permissive RLS policies.
