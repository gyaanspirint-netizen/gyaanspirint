
-- Add activation code system to institutes
ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS activation_code text,
  ADD COLUMN IF NOT EXISTS activation_code_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS institutes_activation_code_key
  ON public.institutes(activation_code) WHERE activation_code IS NOT NULL;

-- Helper: generate unique ACT-XXXXXX code (6 chars, unambiguous alphabet)
CREATE OR REPLACE FUNCTION public.generate_activation_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  attempts int := 0;
BEGIN
  LOOP
    code := 'ACT-';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.institutes WHERE activation_code = code) THEN
      RETURN code;
    END IF;
    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'Could not generate unique activation code';
    END IF;
  END LOOP;
END;
$$;

-- Backfill: every existing institute that has no code gets one now
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.institutes WHERE activation_code IS NULL LOOP
    UPDATE public.institutes
      SET activation_code = public.generate_activation_code(),
          activation_code_generated_at = COALESCE(activation_code_generated_at, now())
      WHERE id = r.id;
  END LOOP;
END $$;
