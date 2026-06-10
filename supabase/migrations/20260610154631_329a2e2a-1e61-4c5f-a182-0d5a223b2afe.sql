CREATE OR REPLACE FUNCTION public.claim_admin_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  uemail text;
  uname text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email, COALESCE(raw_user_meta_data->>'full_name','')
    INTO uemail, uname
    FROM auth.users WHERE id = uid;

  INSERT INTO public.profiles (id, full_name, email)
  VALUES (uid, uname, uemail)
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_admin_role() TO authenticated;

-- Backfill: any existing auth user with no role becomes admin + gets a profile.
INSERT INTO public.profiles (id, full_name, email)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name',''), u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL;