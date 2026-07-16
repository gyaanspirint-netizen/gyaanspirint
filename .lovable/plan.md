# Teacher Portal & RBAC — Implementation Plan

This adds a third role (`teacher`) with its own portal, first-time activation flow, and admin-side management, without touching the existing Admin dashboard visuals or Super Admin flow.

## 1. Database (single migration)

**Enum**
- Extend `app_role` with `'teacher'`.

**New tables (all in `public`, with GRANTs + RLS + `updated_at` trigger where relevant):**

- `teachers`
  - `id`, `owner_id` (institute owner uuid), `user_id` (nullable until activation), `teacher_code` (e.g. `GS-TCH-0001`, unique per owner), `full_name`, `mobile`, `email`, `subject`, `qualification`, `experience`, `photo_url`, `status` (`pending|active|inactive`), `temp_password_hash`, `must_change_password`, `last_login_at`, `created_at`, `updated_at`.
  - Unique: `(owner_id, mobile)`, `(owner_id, teacher_code)`.
- `teacher_assignments`
  - `id`, `owner_id`, `teacher_id`, `batch_id`, `subject`, `class_name`. Unique `(teacher_id, batch_id, subject)`.
- `teacher_remarks`
  - `id`, `owner_id`, `teacher_id`, `student_id`, `remark` (text), `tag` (enum-ish text: Excellent/Needs Improvement/…), `created_at`.
- `announcements`
  - `id`, `owner_id`, `teacher_id` (nullable, admin can post), `title`, `body`, `audience_type` (`batch|class|all`), `audience_ids uuid[]`, `created_at`.
- `activity_log`
  - `id`, `owner_id`, `actor_user_id`, `actor_role`, `action` (text), `entity_type`, `entity_id`, `metadata jsonb`, `created_at`.

**Helper functions (SECURITY DEFINER, `search_path = public`):**
- `is_teacher_of_batch(_batch_id uuid)` → bool: current auth.uid() has a row in `teacher_assignments` for that batch.
- `current_teacher_owner_id()` → uuid: institute owner for the current teacher.
- `next_teacher_code(_owner_id)` → text: sequential `GS-TCH-XXXX`.

**RLS policies (highlights):**
- `teachers`: admin (owner) full CRUD on their rows; teacher can SELECT/UPDATE own row (limited columns via app layer).
- `teacher_assignments`: admin CRUD on own rows; teacher SELECT own.
- Existing `students`, `attendance`, `class_updates`, `tests`, `test_marks`, `batches`, `schedule`: **add teacher SELECT policies** gated by `is_teacher_of_batch(batch_id)` (or owner match + assignment for students). Add teacher INSERT/UPDATE where allowed (attendance, class_updates, tests, test_marks, teacher_remarks). Fee tables stay admin-only (teacher gets SELECT only where student is in their batch).
- `activity_log`: admin SELECT own institute; teacher INSERT own; no delete.

## 2. Auth & Activation Flow

- Login page: segmented control **Institute Admin / Teacher** (Super Admin still auto-detected).
- **Teacher first login:** enters Teacher ID + Temporary Password → server fn `activateTeacher` verifies against `teachers.temp_password_hash`, then prompts for **new password** and **email confirmation**. Server creates the `auth.users` account with `email = <mobile>@teachers.gyanspirint.local` (deterministic synthetic email so mobile-based sign-in works via Supabase's email/password provider), links `teachers.user_id`, clears `temp_password_hash`, sets `status='active'`.
- **Subsequent teacher login:** mobile number field → client resolves to synthetic email → `signInWithPassword`.
- Role resolution in `useAuth` already prioritizes admin/super_admin; add `teacher` handling.

Server functions (all with `requireSupabaseAuth` unless noted):
- `activateTeacher` — **public** (no auth), input: teacher_code, temp_password, new_password. Uses `supabaseAdmin` (loaded inside handler) to create user + update row.
- `teacherSignInLookup` — public, mobile → synthetic email (for client to sign in).
- Admin fns: `createTeacher`, `updateTeacher`, `deleteTeacher`, `setTeacherStatus`, `resetTeacherPassword`, `assignTeacher`, `unassignTeacher`, `listTeachers`, `listActivity`.
- Teacher fns: `getMyAssignments`, `addRemark`, `createAnnouncement`, plus reuse of existing attendance/class-update/test fns (their RLS now permits teachers).

## 3. Admin Portal additions

New sidebar item **Teachers** (admin only) → `/teachers`:
- Table (desktop) / cards (mobile): name, code, mobile, subject, status, assignments count, actions.
- Add Teacher dialog → auto-generates `teacher_code` + temp password; shows a "Copy credentials" panel post-create (Teacher ID, temp password, login URL) with Copy button.
- Edit / Activate / Deactivate / Reset Password / Delete actions.
- **Assignments tab** inside teacher detail: pick batch + subject; list existing.
- **Activity Log** page `/activity` (admin only): filter by teacher, action, date.

No changes to existing admin pages beyond adding these routes + sidebar entries.

## 4. Teacher Portal

New pathless layout `src/routes/_teacher/route.tsx` gated to `role === 'teacher'` (redirects admins/students away). Sidebar + mobile bottom nav variant for teachers.

Routes under `/teacher/*`:
- `/teacher` — Dashboard: welcome, today's classes, pending attendance/homework/tests counts, recent activity, quick actions, today's schedule.
- `/teacher/attendance` — list of assigned batches → mark/edit today, view history (assigned batches only).
- `/teacher/updates` — reuse existing class-updates UI but scoped: teacher sees only their updates + can create for assigned batches/students.
- `/teacher/tests` — create test, upload/edit marks, history, download CSV.
- `/teacher/students` — list of students in assigned batches; profile view shows attendance/homework/tests/remarks; **fees read-only**.
- `/teacher/remarks` — quick add remark for a student with tag chips.
- `/teacher/announcements` — create/list announcements for assigned batches.
- `/teacher/schedule` — today / weekly / upcoming.
- `/teacher/profile` — edit photo, password, email, qualification, experience. Teacher ID + mobile read-only.

Mobile: card layout, FAB for primary action per page, 44px touch targets, no horizontal scroll. Desktop: clean two-column with sidebar (same design tokens as admin).

## 5. Activity logging

Wrap teacher mutation server fns with an `await logActivity(...)` insert. Admin activity log page reads `activity_log` filtered by their `owner_id`.

## 6. Permission enforcement summary

Enforced at DB (RLS) — client UI just hides disallowed controls:
- Teacher: no delete on students/teachers, no fee writes, no institute/subscription access, cannot read other teachers' batch data (assignment-gated policies).
- Admin: unchanged full access within their institute.
- Super admin: unchanged.

## 7. Files

**New**
- `supabase/migrations/…_teacher_rbac.sql`
- `src/lib/teachers.functions.ts`, `src/lib/teacher-portal.functions.ts`, `src/lib/activity.functions.ts`, `src/lib/announcements.functions.ts`, `src/lib/remarks.functions.ts`
- `src/routes/_authenticated/teachers.tsx`, `src/routes/_authenticated/activity.tsx`
- `src/routes/_teacher/route.tsx` + `index.tsx`, `attendance.tsx`, `updates.tsx`, `tests.tsx`, `students.tsx`, `remarks.tsx`, `announcements.tsx`, `schedule.tsx`, `profile.tsx`
- `src/components/teacher-sidebar.tsx`, `src/components/teacher-bottom-nav.tsx`, `src/components/add-teacher-dialog.tsx`, `src/components/assign-teacher-dialog.tsx`, `src/components/teacher-credentials-card.tsx`

**Edited**
- `src/routes/auth.tsx` — add Admin/Teacher toggle + activation flow.
- `src/hooks/use-auth.tsx` — recognize `teacher` role.
- `src/components/app-sidebar.tsx` — add Teachers + Activity items for admin.
- `src/routes/_authenticated/route.tsx` — redirect teachers to `/teacher`.

## Out of scope
- Push notifications.
- Full rich-text editor in remarks/announcements.
- Bulk teacher CSV import.
- Real SMS delivery of credentials (Copy-to-clipboard only).

Proceeding after approval — this is a large, multi-file change (~20 files + 1 migration).
