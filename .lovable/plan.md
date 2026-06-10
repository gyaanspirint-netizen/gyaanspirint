# Coaching Hub Enhancements

## 1. Database changes (single migration)

**`batches` table — new columns:**
- `course_name` (text)
- `start_date` (date)
- `end_date` (date)
- `start_time` (time)
- `end_time` (time)
- `schedule_type` (text: `daily` | `alternate` | `custom`)
- `schedule_days` (text[] — only used when `schedule_type='custom'`, e.g. `{Mon,Wed,Fri}`)
- `status` (text: `active` | `completed`, default `active`)

**New table `batch_teachers`** (many-to-many between batches and teacher profiles):
- `batch_id` → batches
- `teacher_name` (text), `subject` (text), `email` (text)
- `owner_id` (auth.users)
- Standard timestamps, RLS scoped to owner; students can `SELECT` rows for batches they belong to.

**New table `support_tickets`:**
- `subject`, `message`, `status` (`open` | `in_progress` | `resolved`)
- `created_by` (auth.users), `owner_id` (admin who owns the tenant)
- Student creates own ticket; admin sees all tickets in their tenant.

All new tables get GRANTs + RLS + `current_owner_id()` policies consistent with the existing multi-tenant setup.

## 2. Admin — Batches page (`src/routes/_authenticated/batches.tsx`)

Extend the existing add/edit dialog:
- Course name, start/end date, start/end time (validated: end > start), status select.
- Schedule type dropdown (Daily / Alternate / Custom). When Custom, show 7 day checkboxes.
- "Teachers" section inside the dialog: list current teachers (name + subject + email) with add/remove buttons. Backed by `batch_teachers`.
- Batch list shows: name, code, course, timing, schedule pattern, teacher count, status badge.

## 3. Student dashboard (`src/routes/_authenticated/student.tsx`)

Add a "My Batches" section that for each batch the student belongs to shows:
- Batch name, code, course, start/end date, status badge, timings, schedule pattern (Daily / Alternate / `Mon, Wed, Fri`), assigned teachers list (name + subject + email).
- Stat cards: Total Classes (count of past+future schedule entries for their batches), Upcoming Classes (future schedule entries), Assigned Teachers (distinct count), Attendance % (already computed — keep existing logic).

Read-only — no edit controls.

## 4. Help Desk

**Sidebar** — new "Help Desk" entry for both admin and student.

**`/help-desk` route (shared):**
- Static contact card: "Need Help? Email gyaansprint@gmail.com" with mailto link.
- Below it, a "Submit a ticket" form (subject + message) → inserts into `support_tickets`.
- Student sees their own previous tickets with status.
- Admin sees an "Admin Support Dashboard" panel on the same page (or a separate `/support` admin-only): stats (Total / Open / In Progress / Resolved), search box, status filter, table of all tickets, row actions (change status, delete, view details dialog).

## 5. Out of scope

- No teacher login/role (teachers are stored as text records on a batch — no auth account).
- No automatic class-instance generation from schedule pattern; "Total Classes" derives from existing `schedule` rows.
- No email sending from the ticket form (the contact email is the documented channel; tickets are stored for admin to triage).

## Files

**Migration:** new `supabase/migrations/<ts>_batch_meta_teachers_support.sql`

**Edited:**
- `src/components/app-sidebar.tsx` (Help Desk item)
- `src/routes/_authenticated/batches.tsx` (new fields + teacher management)
- `src/routes/_authenticated/student.tsx` (batch info section + cards)
- `src/routes/_authenticated/schedule.tsx` (optional: surface schedule pattern label)
- `src/integrations/supabase/types.ts` (regenerated)

**Created:**
- `src/routes/_authenticated/help-desk.tsx` (shared page; admin sees ticket manager, student sees contact + own tickets)
