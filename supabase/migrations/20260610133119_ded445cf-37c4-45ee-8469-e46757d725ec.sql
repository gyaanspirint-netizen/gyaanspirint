
-- Extend batches with course/dates/status/schedule pattern
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS course_name text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS schedule_type text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS schedule_days text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.batches
  DROP CONSTRAINT IF EXISTS batches_schedule_type_check;
ALTER TABLE public.batches
  ADD CONSTRAINT batches_schedule_type_check CHECK (schedule_type IN ('daily','alternate','custom'));
ALTER TABLE public.batches
  DROP CONSTRAINT IF EXISTS batches_status_check;
ALTER TABLE public.batches
  ADD CONSTRAINT batches_status_check CHECK (status IN ('active','completed'));

-- batch_teachers
CREATE TABLE IF NOT EXISTS public.batch_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  teacher_name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_teachers TO authenticated;
GRANT ALL ON public.batch_teachers TO service_role;
ALTER TABLE public.batch_teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages own batch_teachers" ON public.batch_teachers;
CREATE POLICY "Admin manages own batch_teachers" ON public.batch_teachers
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Students view own owner batch_teachers" ON public.batch_teachers;
CREATE POLICY "Students view own owner batch_teachers" ON public.batch_teachers
  FOR SELECT TO authenticated
  USING (owner_id = public.current_owner_id());

CREATE TRIGGER trg_batch_teachers_updated_at
  BEFORE UPDATE ON public.batch_teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_tickets_status_check CHECK (status IN ('open','in_progress','resolved'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages own support_tickets" ON public.support_tickets;
CREATE POLICY "Admin manages own support_tickets" ON public.support_tickets
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Student manages own tickets" ON public.support_tickets;
CREATE POLICY "Student manages own tickets" ON public.support_tickets
  FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid() AND owner_id = public.current_owner_id());

CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
