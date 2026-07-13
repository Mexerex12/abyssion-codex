DO $$
BEGIN
  CREATE TYPE public.lore_classification AS ENUM ('publico', 'n_i', 'n_ii', 'n_iii', 'diretor');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.lore_visibility AS ENUM ('public', 'trivalente', 'instructor', 'director', 'council', 'founder');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.cms_entry_status AS ENUM ('draft', 'published', 'archived', 'obsolete', 'trash');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.lore_entries
  ADD COLUMN IF NOT EXISTS classification public.lore_classification NOT NULL DEFAULT 'publico',
  ADD COLUMN IF NOT EXISTS visibility public.lore_visibility NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS cms_status public.cms_entry_status NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

UPDATE public.lore_entries
SET
  classification = CASE
    WHEN clearance IN ('nivel_1','uniao') THEN 'n_i'::public.lore_classification
    WHEN clearance IN ('nivel_2','instrutores') THEN 'n_ii'::public.lore_classification
    WHEN clearance IN ('nivel_3','nivel_4','curadores') THEN 'n_iii'::public.lore_classification
    WHEN clearance IN ('nivel_diretor','nivel_fundador','diretores','restrito','verdade_absoluta') THEN 'diretor'::public.lore_classification
    ELSE 'publico'::public.lore_classification
  END,
  visibility = CASE
    WHEN clearance = 'publico' THEN 'public'::public.lore_visibility
    WHEN clearance IN ('nivel_1','nivel_2','uniao') THEN 'trivalente'::public.lore_visibility
    WHEN clearance = 'instrutores' THEN 'instructor'::public.lore_visibility
    WHEN clearance IN ('nivel_3','nivel_4','diretores') THEN 'director'::public.lore_visibility
    WHEN clearance IN ('nivel_diretor','curadores','restrito') THEN 'council'::public.lore_visibility
    WHEN clearance IN ('nivel_fundador','verdade_absoluta') THEN 'founder'::public.lore_visibility
    ELSE 'public'::public.lore_visibility
  END,
  cms_status = CASE
    WHEN status = 'publicado' THEN 'published'::public.cms_entry_status
    WHEN status = 'arquivado' THEN 'archived'::public.cms_entry_status
    ELSE 'draft'::public.cms_entry_status
  END;

CREATE INDEX IF NOT EXISTS lore_entries_visibility_idx ON public.lore_entries(visibility);
CREATE INDEX IF NOT EXISTS lore_entries_cms_status_idx ON public.lore_entries(cms_status);
CREATE INDEX IF NOT EXISTS lore_entries_tags_idx ON public.lore_entries USING gin(tags);

CREATE TABLE IF NOT EXISTS public.lore_entry_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.lore_entries(id) ON DELETE CASCADE,
  author_id uuid,
  changed_fields text[] NOT NULL DEFAULT '{}',
  snapshot jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lore_entry_versions_entry_idx ON public.lore_entry_versions(entry_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lore_entry_versions TO authenticated;
GRANT ALL ON public.lore_entry_versions TO service_role;
ALTER TABLE public.lore_entry_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read versions" ON public.lore_entry_versions;
DROP POLICY IF EXISTS "Staff write versions" ON public.lore_entry_versions;
CREATE POLICY "Staff read versions" ON public.lore_entry_versions
  FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff write versions" ON public.lore_entry_versions
  FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.can_view_visibility(_user_id uuid, _visibility public.lore_visibility)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _visibility = 'public' THEN RETURN TRUE; END IF;
  IF _user_id IS NULL THEN RETURN FALSE; END IF;
  IF _visibility = 'trivalente' THEN RETURN TRUE; END IF;
  IF _visibility = 'instructor' THEN RETURN public.is_staff(_user_id); END IF;
  IF _visibility = 'director' THEN RETURN public.is_diretor(_user_id); END IF;
  IF _visibility = 'council' THEN RETURN public.is_admin(_user_id); END IF;
  IF _visibility = 'founder' THEN RETURN public.is_fundador(_user_id); END IF;
  RETURN FALSE;
END $$;

DROP POLICY IF EXISTS "Read by clearance" ON public.lore_entries;
DROP POLICY IF EXISTS "Admins read all" ON public.lore_entries;
DROP POLICY IF EXISTS "Read published public lore" ON public.lore_entries;
DROP POLICY IF EXISTS "Staff read cms lore" ON public.lore_entries;
CREATE POLICY "Read published public lore" ON public.lore_entries FOR SELECT
  USING (cms_status = 'published' AND visibility = 'public');
CREATE POLICY "Staff read cms lore" ON public.lore_entries FOR SELECT
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Relations readable by all" ON public.lore_relations;
DROP POLICY IF EXISTS "Relations readable when both ends are visible" ON public.lore_relations;
DROP POLICY IF EXISTS "Staff read all relations" ON public.lore_relations;
CREATE POLICY "Relations readable when both ends are visible" ON public.lore_relations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lore_entries e
      WHERE e.id = from_entry
        AND e.cms_status = 'published'
        AND e.visibility = 'public'
    )
    AND EXISTS (
      SELECT 1 FROM public.lore_entries e
      WHERE e.id = to_entry
        AND e.cms_status = 'published'
        AND e.visibility = 'public'
    )
  );
CREATE POLICY "Staff read all relations" ON public.lore_relations FOR SELECT
  USING (public.is_staff(auth.uid()));
