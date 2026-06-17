
-- 1. profiles: tenant-scoped admin SELECT
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view tenant profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = profiles.id AND s.owner_id = auth.uid()
    )
  )
);

-- 2. user_roles: tenant-scoped admin SELECT
DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
CREATE POLICY "Admins view tenant roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = user_roles.user_id AND s.owner_id = auth.uid()
    )
  )
);

-- 3. user_roles UPDATE: prevent escalation to super_admin (or admin)
DROP POLICY IF EXISTS "Admins update non-admin roles" ON public.user_roles;
CREATE POLICY "Admins update student roles only"
ON public.user_roles FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND role = 'student'
  AND user_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.user_id = user_roles.user_id AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND role = 'student'
  AND user_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.user_id = user_roles.user_id AND s.owner_id = auth.uid()
  )
);

-- 4. Revoke PUBLIC/anon EXECUTE on handle_new_user (trigger function; runs as definer regardless)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
