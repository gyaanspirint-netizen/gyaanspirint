
-- 1) Backfill the super_admin role for the platform owner
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'gyaanspirint@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Also ensure a profile row exists
INSERT INTO public.profiles (id, full_name, email)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', 'Super Admin'), u.email
FROM auth.users u
WHERE lower(u.email) = 'gyaanspirint@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- 2) Attach the handle_new_user trigger so future signups get roles + profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
