
-- Institutes table
CREATE TABLE IF NOT EXISTS public.institutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','rejected')),
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS institutes_owner_id_key ON public.institutes(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS institutes_status_idx ON public.institutes(status);
CREATE INDEX IF NOT EXISTS institutes_email_idx ON public.institutes(lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.institutes TO authenticated;
GRANT SELECT, INSERT ON public.institutes TO anon;
GRANT ALL ON public.institutes TO service_role;

ALTER TABLE public.institutes ENABLE ROW LEVEL SECURITY;

-- Helper: is current user a super admin?
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Helper: get current user's institute status
CREATE OR REPLACE FUNCTION public.current_institute_status()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT status FROM public.institutes WHERE owner_id = auth.uid() LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.current_institute_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_institute_status() TO authenticated;

-- RLS: anyone can register (insert pending row tied to themselves or anon)
CREATE POLICY "Anyone can register an institute"
  ON public.institutes FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

CREATE POLICY "Owner can view own institute"
  ON public.institutes FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Super admin can view all institutes"
  ON public.institutes FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admin can update institutes"
  ON public.institutes FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin can delete institutes"
  ON public.institutes FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

CREATE TRIGGER update_institutes_updated_at
  BEFORE UPDATE ON public.institutes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-promote the platform owner email to super_admin on signup,
-- and skip the default admin/student role assignment for that account.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  chosen_role public.app_role;
  is_platform_owner boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);

  is_platform_owner := lower(COALESCE(NEW.email, '')) = 'gyaanspirint@gmail.com';

  IF is_platform_owner THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin'::public.app_role)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;

  chosen_role := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'role', '')::public.app_role,
    'student'::public.app_role
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, chosen_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- If gyaanspirint@gmail.com already exists, promote now
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = 'gyaanspirint@gmail.com' LIMIT 1;
  IF uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (uid, 'super_admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
