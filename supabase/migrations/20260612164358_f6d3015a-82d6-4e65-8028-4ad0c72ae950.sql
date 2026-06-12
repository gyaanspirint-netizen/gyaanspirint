-- 1. Schedule: restrict to authenticated, scope NULL-batch rows to student's institute
DROP POLICY IF EXISTS "Students view own batch schedule" ON public.schedule;
CREATE POLICY "Students view own batch schedule"
  ON public.schedule
  FOR SELECT
  TO authenticated
  USING (
    owner_id = public.current_owner_id()
    AND (
      batch_id IS NULL
      OR batch_id IN (SELECT public.current_student_batch_ids())
    )
  );

-- 2. Batch teachers: enforce same-owner scoping
DROP POLICY IF EXISTS "Students view own batch teachers" ON public.batch_teachers;
CREATE POLICY "Students view own batch teachers"
  ON public.batch_teachers
  FOR SELECT
  TO authenticated
  USING (
    owner_id = public.current_owner_id()
    AND batch_id IN (SELECT public.current_student_batch_ids())
  );

-- 3. User roles: scope admin mutations to users within the admin's institute
DROP POLICY IF EXISTS "Admins assign non-admin roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins update non-admin roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins delete non-admin roles" ON public.user_roles;

CREATE POLICY "Admins assign non-admin roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND role <> 'admin'::public.app_role
    AND user_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = user_roles.user_id
        AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins update non-admin roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND role <> 'admin'::public.app_role
    AND user_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = user_roles.user_id
        AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    role <> 'admin'::public.app_role
    AND user_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = user_roles.user_id
        AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins delete non-admin roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND role <> 'admin'::public.app_role
    AND user_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = user_roles.user_id
        AND s.owner_id = auth.uid()
    )
  );

-- 4. Revoke public execute on SECURITY DEFINER claim_admin_role
REVOKE EXECUTE ON FUNCTION public.claim_admin_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_role() TO authenticated;