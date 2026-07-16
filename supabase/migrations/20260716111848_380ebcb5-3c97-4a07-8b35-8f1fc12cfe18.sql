
-- =========================================
-- TEACHERS + ASSIGNMENTS + REMARKS + ANNOUNCEMENTS + ACTIVITY LOG
-- =========================================

-- teachers
CREATE TABLE public.teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  teacher_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  subject TEXT,
  qualification TEXT,
  experience TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','inactive')),
  temp_password TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, mobile),
  UNIQUE(owner_id, teacher_code)
);
CREATE INDEX idx_teachers_owner ON public.teachers(owner_id);
CREATE INDEX idx_teachers_user ON public.teachers(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own teachers" ON public.teachers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Teacher reads own row" ON public.teachers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Teacher updates own row" ON public.teachers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- helper: is user an active teacher?
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teachers
    WHERE user_id = auth.uid() AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.current_teacher_owner_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT owner_id FROM public.teachers WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_teacher_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.teachers WHERE user_id = auth.uid() LIMIT 1
$$;

-- teacher_assignments
CREATE TABLE public.teacher_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  subject TEXT,
  class_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, batch_id, subject)
);
CREATE INDEX idx_teacher_assignments_owner ON public.teacher_assignments(owner_id);
CREATE INDEX idx_teacher_assignments_teacher ON public.teacher_assignments(teacher_id);
CREATE INDEX idx_teacher_assignments_batch ON public.teacher_assignments(batch_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_assignments TO authenticated;
GRANT ALL ON public.teacher_assignments TO service_role;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own assignments" ON public.teacher_assignments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Teacher reads own assignments" ON public.teacher_assignments
  FOR SELECT TO authenticated
  USING (teacher_id = public.current_teacher_id());

-- teacher-of-batch check
CREATE OR REPLACE FUNCTION public.is_teacher_of_batch(_batch_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_assignments ta
    JOIN public.teachers t ON t.id = ta.teacher_id
    WHERE ta.batch_id = _batch_id AND t.user_id = auth.uid() AND t.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_batch_name(_batch_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_assignments ta
    JOIN public.teachers t ON t.id = ta.teacher_id
    JOIN public.batches b ON b.id = ta.batch_id
    WHERE b.name = _batch_name
      AND b.owner_id = t.owner_id
      AND t.user_id = auth.uid()
      AND t.status = 'active'
  )
$$;

-- teacher_remarks
CREATE TABLE public.teacher_remarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  remark TEXT NOT NULL,
  tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_teacher_remarks_student ON public.teacher_remarks(student_id);
CREATE INDEX idx_teacher_remarks_owner ON public.teacher_remarks(owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_remarks TO authenticated;
GRANT ALL ON public.teacher_remarks TO service_role;
ALTER TABLE public.teacher_remarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read own remarks" ON public.teacher_remarks
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Teachers manage own remarks" ON public.teacher_remarks
  FOR ALL TO authenticated
  USING (teacher_id = public.current_teacher_id())
  WITH CHECK (teacher_id = public.current_teacher_id() AND owner_id = public.current_teacher_owner_id());

CREATE POLICY "Students read own remarks" ON public.teacher_remarks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = teacher_remarks.student_id AND s.user_id = auth.uid()));

-- announcements
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  created_by UUID,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  audience_type TEXT NOT NULL DEFAULT 'all' CHECK (audience_type IN ('all','batch','class')),
  audience_ids UUID[] NOT NULL DEFAULT '{}',
  audience_labels TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_announcements_owner ON public.announcements(owner_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Teachers manage own announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (teacher_id = public.current_teacher_id())
  WITH CHECK (teacher_id = public.current_teacher_id() AND owner_id = public.current_teacher_owner_id());

CREATE POLICY "Students read announcements for their institute" ON public.announcements
  FOR SELECT TO authenticated
  USING (owner_id = public.current_owner_id());

-- activity_log
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_user_id UUID,
  actor_role TEXT,
  actor_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_owner ON public.activity_log(owner_id, created_at DESC);

GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read own activity" ON public.activity_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Teachers read own activity" ON public.activity_log
  FOR SELECT TO authenticated
  USING (actor_user_id = auth.uid());

CREATE POLICY "Authenticated insert own activity" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

-- =========================================
-- TEACHER access to existing tables via new SELECT/INSERT/UPDATE policies
-- =========================================

-- students: teachers see students in assigned batches (by batch name)
CREATE POLICY "Teachers read assigned students" ON public.students
  FOR SELECT TO authenticated
  USING (
    owner_id = public.current_teacher_owner_id()
    AND public.is_teacher_of_batch_name(batch)
  );

-- batches: teachers read assigned batches
CREATE POLICY "Teachers read assigned batches" ON public.batches
  FOR SELECT TO authenticated
  USING (public.is_teacher_of_batch(id));

-- attendance: teachers read + write for assigned batches
CREATE POLICY "Teachers read attendance for assigned batches" ON public.attendance
  FOR SELECT TO authenticated
  USING (owner_id = public.current_teacher_owner_id() AND public.is_teacher_of_batch_name(batch));

CREATE POLICY "Teachers write attendance for assigned batches" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.current_teacher_owner_id() AND public.is_teacher_of_batch_name(batch));

CREATE POLICY "Teachers update attendance for assigned batches" ON public.attendance
  FOR UPDATE TO authenticated
  USING (owner_id = public.current_teacher_owner_id() AND public.is_teacher_of_batch_name(batch))
  WITH CHECK (owner_id = public.current_teacher_owner_id() AND public.is_teacher_of_batch_name(batch));

-- class_updates: teachers read + write for assigned batches
CREATE POLICY "Teachers read class_updates for assigned batches" ON public.class_updates
  FOR SELECT TO authenticated
  USING (owner_id = public.current_teacher_owner_id() AND (batch = '' OR public.is_teacher_of_batch_name(batch)));

CREATE POLICY "Teachers write class_updates for assigned batches" ON public.class_updates
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.current_teacher_owner_id() AND created_by = auth.uid() AND (batch = '' OR public.is_teacher_of_batch_name(batch)));

CREATE POLICY "Teachers update own class_updates" ON public.class_updates
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- tests: teachers read + write for assigned batches (assume tests has owner_id + batch text)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tests' AND column_name='batch') THEN
    EXECUTE $p$
      CREATE POLICY "Teachers read tests for assigned batches" ON public.tests
        FOR SELECT TO authenticated
        USING (owner_id = public.current_teacher_owner_id() AND public.is_teacher_of_batch_name(batch));
    $p$;
    EXECUTE $p$
      CREATE POLICY "Teachers insert tests for assigned batches" ON public.tests
        FOR INSERT TO authenticated
        WITH CHECK (owner_id = public.current_teacher_owner_id() AND public.is_teacher_of_batch_name(batch));
    $p$;
    EXECUTE $p$
      CREATE POLICY "Teachers update tests for assigned batches" ON public.tests
        FOR UPDATE TO authenticated
        USING (owner_id = public.current_teacher_owner_id() AND public.is_teacher_of_batch_name(batch))
        WITH CHECK (owner_id = public.current_teacher_owner_id() AND public.is_teacher_of_batch_name(batch));
    $p$;
  END IF;
END $$;

-- test_marks: teachers read + write when the parent test is in an assigned batch
CREATE POLICY "Teachers read test_marks for assigned batches" ON public.test_marks
  FOR SELECT TO authenticated
  USING (
    owner_id = public.current_teacher_owner_id()
    AND EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_marks.test_id
        AND public.is_teacher_of_batch_name(t.batch)
    )
  );

CREATE POLICY "Teachers write test_marks for assigned batches" ON public.test_marks
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = public.current_teacher_owner_id()
    AND EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_marks.test_id
        AND public.is_teacher_of_batch_name(t.batch)
    )
  );

CREATE POLICY "Teachers update test_marks for assigned batches" ON public.test_marks
  FOR UPDATE TO authenticated
  USING (
    owner_id = public.current_teacher_owner_id()
    AND EXISTS (
      SELECT 1 FROM public.tests t WHERE t.id = test_marks.test_id AND public.is_teacher_of_batch_name(t.batch)
    )
  )
  WITH CHECK (
    owner_id = public.current_teacher_owner_id()
    AND EXISTS (
      SELECT 1 FROM public.tests t WHERE t.id = test_marks.test_id AND public.is_teacher_of_batch_name(t.batch)
    )
  );

-- schedule: teachers read for assigned batches
CREATE POLICY "Teachers read schedule for assigned batches" ON public.schedule
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.batches b
      WHERE b.id = schedule.batch_id AND public.is_teacher_of_batch(b.id)
    )
  );

-- =========================================
-- teacher_code sequence generator
-- =========================================
CREATE OR REPLACE FUNCTION public.next_teacher_code(_owner_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  n INT;
BEGIN
  SELECT COALESCE(MAX((regexp_replace(teacher_code, '^GS-TCH-', ''))::int), 0) + 1
    INTO n
    FROM public.teachers
    WHERE owner_id = _owner_id AND teacher_code ~ '^GS-TCH-[0-9]+$';
  RETURN 'GS-TCH-' || LPAD(n::text, 4, '0');
END $$;
