
DO $$ BEGIN
  CREATE TYPE public.update_priority AS ENUM ('normal','important','urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.update_audience AS ENUM ('class','batch','students');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.completion_status AS ENUM ('completed','partial','not_completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.class_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  subject text NOT NULL,
  class_name text NOT NULL DEFAULT '',
  batch text NOT NULL DEFAULT '',
  topic text NOT NULL,
  homework text NOT NULL DEFAULT '',
  notice text,
  due_date date,
  priority public.update_priority NOT NULL DEFAULT 'normal',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  audience_type public.update_audience NOT NULL DEFAULT 'class',
  audience_ids uuid[] NOT NULL DEFAULT '{}',
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_updates TO authenticated;
GRANT ALL ON public.class_updates TO service_role;
ALTER TABLE public.class_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage class_updates" ON public.class_updates FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Students read targeted class_updates" ON public.class_updates FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.user_id = auth.uid()
      AND s.owner_id = class_updates.owner_id
      AND (
        class_updates.audience_type = 'class'
        OR (class_updates.audience_type = 'batch' AND class_updates.batch = ANY(string_to_array(s.batch, ',')))
        OR (class_updates.audience_type = 'students' AND s.id = ANY(class_updates.audience_ids))
      )
  ));

CREATE TRIGGER update_class_updates_updated_at BEFORE UPDATE ON public.class_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_class_updates_owner_published ON public.class_updates(owner_id, published_at DESC);

CREATE TABLE IF NOT EXISTS public.class_update_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES public.class_updates(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  status public.completion_status NOT NULL,
  marked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(update_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_update_completions TO authenticated;
GRANT ALL ON public.class_update_completions TO service_role;
ALTER TABLE public.class_update_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage completions" ON public.class_update_completions FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Students read own completions" ON public.class_update_completions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = class_update_completions.student_id AND s.user_id = auth.uid()));

CREATE TRIGGER update_class_update_completions_updated_at BEFORE UPDATE ON public.class_update_completions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.class_update_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  subject text,
  topic text,
  homework text,
  notice text,
  priority public.update_priority NOT NULL DEFAULT 'normal',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_update_templates TO authenticated;
GRANT ALL ON public.class_update_templates TO service_role;
ALTER TABLE public.class_update_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage templates" ON public.class_update_templates FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TRIGGER update_class_update_templates_updated_at BEFORE UPDATE ON public.class_update_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.class_update_reads (
  update_id uuid NOT NULL REFERENCES public.class_updates(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (update_id, student_user_id)
);
GRANT SELECT, INSERT, DELETE ON public.class_update_reads TO authenticated;
GRANT ALL ON public.class_update_reads TO service_role;
ALTER TABLE public.class_update_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reads" ON public.class_update_reads FOR ALL TO authenticated
  USING (student_user_id = auth.uid()) WITH CHECK (student_user_id = auth.uid());

-- Storage policies for class-attachments bucket
CREATE POLICY "class_attachments owners insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'class-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "class_attachments owners manage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'class-attachments' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'class-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "class_attachments students read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'class-attachments'
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = auth.uid() AND s.owner_id::text = (storage.foldername(name))[1]
    )
  );
