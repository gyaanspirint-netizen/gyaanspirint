
REVOKE EXECUTE ON FUNCTION public.current_owner_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_owner_id() TO authenticated, service_role;
