## Goal
Convert the coaching app into a multi-tenant SaaS where each admin (coaching owner) sees only their own data, plus the requested feature changes.

## 1. Multi-tenant data isolation

Add `owner_id uuid` (references `auth.users`) to every domain table: `students`, `batches`, `tests`, `fees`, `attendance`, and the new `homework` table. (`profiles` and `user_roles` are already per-user.)

- Backfill `owner_id` on existing rows to the first admin in `user_roles`.
- Make `owner_id` NOT NULL going forward.
- Rewrite RLS policies on every domain table:
  - Admin: can do everything WHERE `owner_id = auth.uid()`.
  - Student: can SELECT rows scoped to themselves AND that belong to their owning admin (via their `students` row's `owner_id`).
- New helper SQL function `public.current_admin_id()` that returns the admin who owns the calling student (used by student-side RLS) — implemented as SECURITY DEFINER reading `students.owner_id` where `students.user_id = auth.uid()`.
- All admin insert flows (students, batches, tests, fees, homework, attendance) auto-set `owner_id = auth.uid()`.
- The student-creation server function (`students.functions.ts`) stamps `owner_id` from the calling admin.
- CUID prefix already derives from admin's name; keep that.

## 2. Admin/Student name display

- Admin dashboard header: show admin full name from `profiles.full_name`.
- Student dashboard header: show the student's `name` from their `students` row (the name the admin entered), not the email.

## 3. Tests + marks

Add `marks` (numeric) and `max_marks` (numeric) columns to `tests`... wait — tests are per-batch. To assign per-student marks we need a child table.

- New table `test_marks` (`id`, `test_id`, `student_id`, `marks`, `max_marks`, `owner_id`, timestamps).
- Admin tests page: for each test, "Assign Marks" dialog listing students in that test's batch with marks inputs. Upsert into `test_marks`.
- Student tests page: shows upcoming tests for their batch AND their own marks for past tests (joined from `test_marks` where `student_id = me`).

## 4. Fee due popup on student dashboard

- On student dashboard mount, query their `fees` row.
- If `paid_amount < total_fees` (i.e. pending > 0), show a dismissible AlertDialog: "You have pending fees of ₹X, due {date}".
- Dismissal is session-only (state in component) — re-appears on next dashboard open. No persistence.

## 5. Homework module (replaces Courses)

- Remove "Courses" sidebar entry for both admin and student. Delete `src/routes/_authenticated/courses.tsx`.
- New table `homework`: `id`, `owner_id`, `student_id` (per-student), `note` (text), `assigned_date`, `done` (boolean default false), timestamps.
- Admin homework page (`/homework`):
  - List students, add a homework note for a selected student.
  - Edit / delete notes.
  - Toggle "Done" status.
- Student homework page (`/homework`):
  - See own homework notes with done/pending badges.
  - Cannot edit.

## 6. Files to change

- New migration: add `owner_id` to existing tables, backfill, NOT NULL, replace RLS, create `homework`, `test_marks`, helper function, GRANTs.
- Edit `src/routes/_authenticated/admin.tsx` — show admin name, scope counts to owner_id (RLS handles it but show admin name explicitly).
- Edit `src/routes/_authenticated/student.tsx` — show student name, fees popup, homework summary.
- Edit `src/routes/_authenticated/students.tsx` — set owner_id on insert; server fn updated.
- Edit `src/routes/_authenticated/batches.tsx`, `fees.tsx`, `tests.tsx`, `attendance.tsx` — set owner_id on insert; tests page gains "Assign Marks" dialog with per-student inputs; student tests view shows own marks.
- New `src/routes/_authenticated/homework.tsx`.
- Edit `src/components/app-sidebar.tsx` — remove Courses, add Homework for both roles.
- Delete `src/routes/_authenticated/courses.tsx`.
- Edit `src/lib/students.functions.ts` — stamp owner_id from caller.
- Edit `src/integrations/supabase/types.ts` — regenerated after migration.

## 7. Out of scope (confirm)

- No separate signup approval flow — any admin signup becomes its own tenant immediately.
- No org/team table — tenant key is the admin's `auth.users.id` directly. (Simplest correct model; if you need multi-admin-per-tenant later we can add an `organizations` table.)
- No file/PDF uploads in homework (per your instruction — text notes only).
