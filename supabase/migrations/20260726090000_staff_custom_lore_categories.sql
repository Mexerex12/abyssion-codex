-- Allow the CMS to grow beyond the original hard-coded lore_category enum.
CREATE TABLE IF NOT EXISTS public.lore_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  plural text NOT NULL,
  color text NOT NULL DEFAULT 'cyan',
  description text NOT NULL DEFAULT '',
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lore_categories_slug_format CHECK (slug ~ '^[a-z0-9-]{2,40}$'),
  CONSTRAINT lore_categories_color_check CHECK (color IN ('cyan', 'alert'))
);

ALTER TABLE public.lore_entries
  ALTER COLUMN category TYPE text USING category::text;

INSERT INTO public.lore_categories (slug, label, plural, color, is_system)
VALUES
  ('universo', 'Universo', 'Universo', 'cyan', true),
  ('historia', 'História', 'História', 'cyan', true),
  ('npc', 'NPC', 'NPCs', 'cyan', true),
  ('faccao', 'Facção', 'Facções', 'cyan', true),
  ('vestigio', 'Vestígio', 'Vestígios', 'alert', true),
  ('regente', 'Regente', 'Regentes', 'alert', true),
  ('curador', 'Curador', 'Curadores', 'alert', true),
  ('dominio', 'Domínio', 'Domínios', 'cyan', true),
  ('evento', 'Evento', 'Eventos', 'cyan', true),
  ('bastiao', 'Bastião', 'Bastiões', 'cyan', true),
  ('esquadrao', 'Esquadrão', 'Esquadrões', 'cyan', true),
  ('personagem_historico', 'Histórico', 'Personagens Históricos', 'cyan', true),
  ('documento_restrito', 'Documento', 'Arquivos Restritos', 'alert', true),
  ('classe', 'Classe', 'Classes', 'cyan', true),
  ('ruptura', 'Ruptura', 'Rupturas', 'alert', true)
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  plural = EXCLUDED.plural,
  color = EXCLUDED.color,
  is_system = true,
  updated_at = now();

CREATE INDEX IF NOT EXISTS lore_categories_label_idx ON public.lore_categories(label);

ALTER TABLE public.lore_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read lore categories" ON public.lore_categories;
CREATE POLICY "Staff can read lore categories"
  ON public.lore_categories FOR SELECT
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can create lore categories" ON public.lore_categories;
CREATE POLICY "Staff can create lore categories"
  ON public.lore_categories FOR INSERT
  WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can update custom lore categories" ON public.lore_categories;
CREATE POLICY "Staff can update custom lore categories"
  ON public.lore_categories FOR UPDATE
  USING (public.is_staff(auth.uid()) AND NOT is_system)
  WITH CHECK (public.is_staff(auth.uid()) AND NOT is_system);
