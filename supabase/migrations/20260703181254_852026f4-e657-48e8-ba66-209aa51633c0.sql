
ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS registration_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_approval boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_generate_id boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_generate_password boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS registration_token text UNIQUE;

CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  student_name text NOT NULL,
  parent_name text NOT NULL,
  parent_phone text NOT NULL,
  student_phone text NOT NULL DEFAULT '',
  batch text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_registrations TO authenticated;
GRANT ALL ON public.pending_registrations TO service_role;

ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their pending registrations"
  ON public.pending_registrations FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners update their pending registrations"
  ON public.pending_registrations FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners delete their pending registrations"
  ON public.pending_registrations FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_pending_registrations_owner_status
  ON public.pending_registrations(owner_id, status);

CREATE TRIGGER trg_pending_registrations_updated_at
  BEFORE UPDATE ON public.pending_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
