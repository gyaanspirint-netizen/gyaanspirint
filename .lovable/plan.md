## Plan: Unify Teacher Portal with Admin & Student dashboards

Goal: one shared database, one attendance flow, teacher actions instantly visible in Admin and Student/Parent dashboards. Nothing existing gets deleted — only rewired.

### 1. Batches — assign real teachers, not free‑text names
- `src/routes/_authenticated/batches.tsx`: remove the "Teacher name / Subject / Email" input. Replace with a multi‑select list of teachers from `public.teachers` (owner‑scoped). Also expose a Subject text per assignment.
- Writes go to `public.teacher_assignments (teacher_id, batch_id, subject)` — the same table the Teacher Portal already reads. Remove reliance on `batch_teachers` for the new assignment flow (keep the table intact; just stop writing there from this UI).
- Support add / remove / re‑assign at any time. Batch cards/table show teacher names from `teacher_assignments`.

### 2. Attendance — teachers mark students (not themselves)
- `src/routes/_authenticated/teacher.attendance.tsx`: replace the stub redirect with a real page:
  - Pick assigned batch (from `teacher_assignments`) → date → student list from `students` matching the batch name.
  - Buttons: **Present / Absent / Leave**. Upsert into `public.attendance` with `marked_by = auth.uid()`, `marked_by_role='teacher'`, `owner_id = teacher.owner_id`.
- `src/routes/_authenticated/attendance.tsx` (admin): add a **status = 'leave'** third option, and add filters (date / batch / teacher / student). Admin can still edit any row (override).
- Attendance history tab already exists — extend it with the new filters for admin; teacher gets a history tab scoped by RLS to assigned batches only.

### 3. Announcements — visible to Admin + targeted students
- Existing `announcements` table is fine. Rework RLS:
  - Admin (owner) can SELECT all announcements where `owner_id = auth.uid()`.
  - Student can SELECT announcements where `audience_type='all'` OR (audience_type='batch' AND their batch_id ∈ `audience_ids`).
- `src/routes/_authenticated/admin.tsx`: add "Teacher Announcements" section — teacher name, batch labels, title/body, date. Read‑only.
- `src/routes/_authenticated/student.tsx`: add "Announcements" card listing relevant announcements with teacher name + date.

### 4. Teacher Remarks — visible to Admin + the student
- Rework `teacher_remarks` RLS so:
  - Admin (owner_id = auth.uid()) SELECT all.
  - Student SELECT own (`student_id ∈ my student rows`).
- Admin `students.tsx`: add "View remarks" action per student → dialog showing teacher name, remark, date.
- Student dashboard: "Teacher Remarks" section.

### 5. RLS / permissions cleanup
Single migration:
- Add `status` enum for attendance to accept `'leave'` (or store as text — already text; just permit the value in UI/queries).
- Attendance INSERT/UPDATE policies: allow teacher when `is_teacher_of_batch_name(batch)` OR admin. Admin override on UPDATE stays.
- `teacher_assignments`: allow admin insert/delete (already has admin policy).
- Ensure students/fees/settings remain admin‑only writes (teachers can only read students in their batches — already covered).

### 6. Data sync
No new tables. Everything (announcements, remarks, attendance, homework, tests) already writes to shared tables — the fix is RLS + UI wiring so admin and students actually see it.

### Technical notes
- Migration touches: RLS on `announcements`, `teacher_remarks`, `attendance` (permit teacher writes + leave status), plus a helper `is_teacher_of_student(student_id)` if needed for remark reads.
- No breaking changes to signatures of existing server fns; new server fns added only where a client can't reach data via RLS (unlikely — RLS alone should suffice).
- Existing `batch_teachers` table stays for now to avoid breaking any legacy read; new UI uses `teacher_assignments` exclusively.

Once you approve I'll run the migration and rewrite the four screens (batches, attendance admin + teacher, student dashboard, admin dashboard, students list remarks dialog).