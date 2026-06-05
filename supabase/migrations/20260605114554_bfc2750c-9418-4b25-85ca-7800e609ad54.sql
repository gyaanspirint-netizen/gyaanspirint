
CREATE TABLE public.tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  batch TEXT NOT NULL,
  test_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tests TO authenticated;
GRANT ALL ON public.tests TO service_role;

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view tests"
ON public.tests FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins manage tests"
ON public.tests FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_tests_date ON public.tests(test_date);
CREATE INDEX idx_tests_batch ON public.tests(batch);

CREATE TRIGGER update_tests_updated_at
BEFORE UPDATE ON public.tests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
