DROP POLICY IF EXISTS "Students view own batch schedule" ON public.schedule;
CREATE POLICY "Students view own batch schedule" ON public.schedule
FOR SELECT
USING (
  batch_id IS NULL
  OR batch_id IN (SELECT public.current_student_batch_ids())
);