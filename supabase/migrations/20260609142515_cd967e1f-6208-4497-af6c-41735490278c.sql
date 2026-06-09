
-- Attendance: make batch-wise
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS batch text NOT NULL DEFAULT '';
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_id_date_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_student_date_batch_key') THEN
    ALTER TABLE public.attendance ADD CONSTRAINT attendance_student_date_batch_key UNIQUE (student_id, date, batch);
  END IF;
END $$;

-- Schedule table (per-batch class schedule)
CREATE TABLE IF NOT EXISTS public.schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE,
  title text NOT NULL,
  schedule_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule TO authenticated;
GRANT ALL ON public.schedule TO service_role;

ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage own schedule" ON public.schedule;
CREATE POLICY "Admins manage own schedule" ON public.schedule
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

DROP POLICY IF EXISTS "Students view own-owner schedule" ON public.schedule;
CREATE POLICY "Students view own-owner schedule" ON public.schedule
  FOR SELECT TO authenticated
  USING (owner_id = current_owner_id());

CREATE INDEX IF NOT EXISTS idx_schedule_owner ON public.schedule(owner_id);
CREATE INDEX IF NOT EXISTS idx_schedule_batch ON public.schedule(batch_id);

DROP TRIGGER IF EXISTS update_schedule_updated_at ON public.schedule;
CREATE TRIGGER update_schedule_updated_at BEFORE UPDATE ON public.schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
