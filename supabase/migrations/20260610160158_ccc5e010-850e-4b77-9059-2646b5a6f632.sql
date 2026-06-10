
-- 1) Tighten user_roles: prevent privilege escalation
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

-- Admins can INSERT non-admin roles for other users (not themselves)
CREATE POLICY "Admins assign non-admin roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND role <> 'admin'::public.app_role
  AND user_id <> auth.uid()
);

-- Admins can UPDATE non-admin roles (cannot promote to admin, cannot modify themselves)
CREATE POLICY "Admins update non-admin roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND role <> 'admin'::public.app_role
  AND user_id <> auth.uid()
)
WITH CHECK (
  role <> 'admin'::public.app_role
  AND user_id <> auth.uid()
);

-- Admins can DELETE non-admin role rows for others
CREATE POLICY "Admins delete non-admin roles"
ON public.user_roles FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND role <> 'admin'::public.app_role
  AND user_id <> auth.uid()
);

-- 2) Narrow student visibility from tenant-wide to own batch only
CREATE OR REPLACE FUNCTION public.current_student_batch_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.id
  FROM public.batches b
  JOIN public.students s
    ON s.owner_id = b.owner_id AND s.batch = b.name
  WHERE s.user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.current_student_batch_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_student_batch_ids() TO authenticated;

DROP POLICY IF EXISTS "Students view own-owner batches" ON public.batches;
CREATE POLICY "Students view own batch"
ON public.batches FOR SELECT TO authenticated
USING (id IN (SELECT public.current_student_batch_ids()));

DROP POLICY IF EXISTS "Students view own-owner schedule" ON public.schedule;
CREATE POLICY "Students view own batch schedule"
ON public.schedule FOR SELECT TO authenticated
USING (batch_id IN (SELECT public.current_student_batch_ids()));

DROP POLICY IF EXISTS "Students view own owner batch_teachers" ON public.batch_teachers;
CREATE POLICY "Students view own batch teachers"
ON public.batch_teachers FOR SELECT TO authenticated
USING (batch_id IN (SELECT public.current_student_batch_ids()));

DROP POLICY IF EXISTS "Students view own-owner tests" ON public.tests;
CREATE POLICY "Students view own batch tests"
ON public.tests FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.batches b
    WHERE b.owner_id = tests.owner_id
      AND b.name = tests.batch
      AND b.id IN (SELECT public.current_student_batch_ids())
  )
);

-- 3) Lock down SECURITY DEFINER functions: revoke from anon/public, allow authenticated only
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.current_owner_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_owner_id() TO authenticated;

REVOKE ALL ON FUNCTION public.claim_admin_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_role() TO authenticated;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 4) Allow users to delete their own profile (explicit policy)
CREATE POLICY "Users delete own profile"
ON public.profiles FOR DELETE TO authenticated
USING (auth.uid() = id);
