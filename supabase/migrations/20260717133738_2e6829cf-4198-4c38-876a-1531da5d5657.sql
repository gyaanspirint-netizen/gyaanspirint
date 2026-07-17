
-- Add 'leave' status to attendance enum
ALTER TYPE public.attendance_status ADD VALUE IF NOT EXISTS 'leave';

-- Allow announcements with audience_type='all' to be visible to any student of that owner (already via current_owner_id policy).
-- Tighten batch-scoped audience visibility for students: keep existing SELECT (owner scoped) since institute-wide read is intentional here.

-- Ensure teachers table can be selected by admin for listing (owner_id = auth.uid())
-- policies already exist.

-- No structural changes needed; add helpful index
CREATE INDEX IF NOT EXISTS idx_attendance_batch_date ON public.attendance(batch, date);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_batch ON public.teacher_assignments(batch_id);
