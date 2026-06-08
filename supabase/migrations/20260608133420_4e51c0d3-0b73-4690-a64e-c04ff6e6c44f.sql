
-- ============ Add owner_id columns FIRST ============
ALTER TABLE public.students  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.batches   ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.tests     ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.fees      ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============ Backfill from created_by, fallback first admin ============
DO $$
DECLARE
  default_admin uuid;
BEGIN
  SELECT user_id INTO default_admin FROM public.user_roles WHERE role = 'admin' ORDER BY created_at LIMIT 1;
  UPDATE public.students   SET owner_id = COALESCE(owner_id, created_by, default_admin) WHERE owner_id IS NULL;
  UPDATE public.batches    SET owner_id = COALESCE(owner_id, created_by, default_admin) WHERE owner_id IS NULL;
  UPDATE public.tests      SET owner_id = COALESCE(owner_id, created_by, default_admin) WHERE owner_id IS NULL;
  UPDATE public.fees       SET owner_id = COALESCE(owner_id, created_by, default_admin) WHERE owner_id IS NULL;
  UPDATE public.attendance a
     SET owner_id = COALESCE(a.owner_id, a.marked_by, s.owner_id, default_admin)
    FROM public.students s
   WHERE a.student_id = s.id AND a.owner_id IS NULL;
END $$;

DELETE FROM public.attendance WHERE owner_id IS NULL;
DELETE FROM public.fees       WHERE owner_id IS NULL;
DELETE FROM public.tests      WHERE owner_id IS NULL;
DELETE FROM public.batches    WHERE owner_id IS NULL;
DELETE FROM public.students   WHERE owner_id IS NULL;

ALTER TABLE public.students   ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.batches    ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.tests      ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.fees       ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.attendance ALTER COLUMN owner_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_students_owner   ON public.students(owner_id);
CREATE INDEX IF NOT EXISTS idx_batches_owner    ON public.batches(owner_id);
CREATE INDEX IF NOT EXISTS idx_tests_owner      ON public.tests(owner_id);
CREATE INDEX IF NOT EXISTS idx_fees_owner       ON public.fees(owner_id);
CREATE INDEX IF NOT EXISTS idx_attendance_owner ON public.attendance(owner_id);

ALTER TABLE public.batches DROP CONSTRAINT IF EXISTS batches_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS batches_owner_name_key ON public.batches(owner_id, name);

-- ============ Helper now that students.owner_id exists ============
CREATE OR REPLACE FUNCTION public.current_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_id FROM public.students WHERE user_id = auth.uid() LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.current_owner_id() TO authenticated, service_role;

-- ============ Policies — STUDENTS ============
DROP POLICY IF EXISTS "Admins manage students" ON public.students;
DROP POLICY IF EXISTS "Students view own student record" ON public.students;
CREATE POLICY "Admins manage own students"
  ON public.students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Student reads own row"
  ON public.students FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============ Policies — BATCHES ============
DROP POLICY IF EXISTS "Admins manage batches" ON public.batches;
DROP POLICY IF EXISTS "Authenticated view batches" ON public.batches;
CREATE POLICY "Admins manage own batches"
  ON public.batches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Students view own-owner batches"
  ON public.batches FOR SELECT TO authenticated
  USING (owner_id = public.current_owner_id());

-- ============ Policies — TESTS ============
DROP POLICY IF EXISTS "Admins manage tests" ON public.tests;
DROP POLICY IF EXISTS "Authenticated view tests" ON public.tests;
CREATE POLICY "Admins manage own tests"
  ON public.tests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Students view own-owner tests"
  ON public.tests FOR SELECT TO authenticated
  USING (owner_id = public.current_owner_id());

-- ============ Policies — FEES ============
DROP POLICY IF EXISTS "Admins manage fees" ON public.fees;
DROP POLICY IF EXISTS "Students view own fees" ON public.fees;
CREATE POLICY "Admins manage own fees"
  ON public.fees FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Students view own fees"
  ON public.fees FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = fees.student_id AND s.user_id = auth.uid()));

-- ============ Policies — ATTENDANCE ============
DROP POLICY IF EXISTS "Admins manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins view all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Students view own attendance" ON public.attendance;
CREATE POLICY "Admins manage own attendance"
  ON public.attendance FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Students view own attendance"
  ON public.attendance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = attendance.student_id AND s.user_id = auth.uid()));

-- ============ HOMEWORK table ============
CREATE TABLE IF NOT EXISTS public.homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  note text NOT NULL,
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework TO authenticated;
GRANT ALL ON public.homework TO service_role;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage own homework"
  ON public.homework FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Students read own homework"
  ON public.homework FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = homework.student_id AND s.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_homework_student ON public.homework(student_id);
CREATE INDEX IF NOT EXISTS idx_homework_owner ON public.homework(owner_id);
DROP TRIGGER IF EXISTS update_homework_updated_at ON public.homework;
CREATE TRIGGER update_homework_updated_at
  BEFORE UPDATE ON public.homework
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TEST MARKS table ============
CREATE TABLE IF NOT EXISTS public.test_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  marks numeric(8,2),
  max_marks numeric(8,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(test_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_marks TO authenticated;
GRANT ALL ON public.test_marks TO service_role;
ALTER TABLE public.test_marks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage own test marks"
  ON public.test_marks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Students read own test marks"
  ON public.test_marks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = test_marks.student_id AND s.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_test_marks_owner ON public.test_marks(owner_id);
CREATE INDEX IF NOT EXISTS idx_test_marks_test ON public.test_marks(test_id);
DROP TRIGGER IF EXISTS update_test_marks_updated_at ON public.test_marks;
CREATE TRIGGER update_test_marks_updated_at
  BEFORE UPDATE ON public.test_marks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
