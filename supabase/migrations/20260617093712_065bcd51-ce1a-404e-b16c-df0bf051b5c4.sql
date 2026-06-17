
-- 1) Add owner_id scope to student SELECT policies on student-facing tables
DROP POLICY IF EXISTS "Students read own homework" ON public.homework;
CREATE POLICY "Students read own homework" ON public.homework
FOR SELECT TO authenticated
USING (
  owner_id = public.current_owner_id()
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = homework.student_id AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Students view own attendance" ON public.attendance;
CREATE POLICY "Students view own attendance" ON public.attendance
FOR SELECT TO authenticated
USING (
  owner_id = public.current_owner_id()
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = attendance.student_id AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Students view own fees" ON public.fees;
CREATE POLICY "Students view own fees" ON public.fees
FOR SELECT TO authenticated
USING (
  owner_id = public.current_owner_id()
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = fees.student_id AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Students read own test marks" ON public.test_marks;
CREATE POLICY "Students read own test marks" ON public.test_marks
FOR SELECT TO authenticated
USING (
  owner_id = public.current_owner_id()
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = test_marks.student_id AND s.user_id = auth.uid()
  )
);

-- 2) Fix WITH CHECK on admin user_roles UPDATE to require admin role
DROP POLICY IF EXISTS "Admins update non-admin roles" ON public.user_roles;
CREATE POLICY "Admins update non-admin roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND role <> 'admin'::public.app_role
  AND user_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.user_id = user_roles.user_id AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND role <> 'admin'::public.app_role
  AND user_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.user_id = user_roles.user_id AND s.owner_id = auth.uid()
  )
);

-- 3) Revoke EXECUTE from anon/public on SECURITY DEFINER functions; keep authenticated for RLS evaluation
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_owner_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_student_batch_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_institute_status() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_activation_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_admin_role() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_owner_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_student_batch_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_institute_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_activation_code() TO service_role;
