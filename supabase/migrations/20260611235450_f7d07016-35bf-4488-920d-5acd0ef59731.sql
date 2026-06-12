
-- ============ ROLES & PROFILES ============
CREATE TYPE public.app_role AS ENUM ('visitante', 'narrador', 'administrador');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'administrador') $$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('narrador','administrador')) $$;

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Auto-create profile + visitante role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'visitante');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ LORE SCHEMA ============
CREATE TYPE public.lore_category AS ENUM (
  'universo','historia','npc','faccao','vestigio','regente','curador',
  'dominio','evento','bastiao','esquadrao','personagem_historico',
  'documento_restrito','classe','ruptura'
);

CREATE TYPE public.clearance_level AS ENUM (
  'publico','nivel_1','nivel_2','nivel_3','nivel_4','nivel_diretor'
);

CREATE TYPE public.entry_status AS ENUM ('rascunho','publicado','arquivado');

CREATE TABLE public.lore_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  category public.lore_category NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  summary TEXT,
  body TEXT,
  cover_image_url TEXT,
  banner_image_url TEXT,
  clearance public.clearance_level NOT NULL DEFAULT 'publico',
  status public.entry_status NOT NULL DEFAULT 'publicado',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  timeline_date TEXT,
  timeline_order INT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX lore_entries_category_idx ON public.lore_entries(category);
CREATE INDEX lore_entries_clearance_idx ON public.lore_entries(clearance);
CREATE INDEX lore_entries_timeline_idx ON public.lore_entries(timeline_order) WHERE category = 'evento';

GRANT SELECT ON public.lore_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lore_entries TO authenticated;
GRANT ALL ON public.lore_entries TO service_role;
ALTER TABLE public.lore_entries ENABLE ROW LEVEL SECURITY;

-- Clearance access: público qualquer um; nivel_1/2 = autenticados; nivel_3/4/diretor = narrador/admin
CREATE OR REPLACE FUNCTION public.can_view_clearance(_user_id UUID, _clearance public.clearance_level)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _clearance = 'publico' THEN RETURN TRUE; END IF;
  IF _user_id IS NULL THEN RETURN FALSE; END IF;
  IF _clearance IN ('nivel_1','nivel_2') THEN RETURN TRUE; END IF;
  IF _clearance IN ('nivel_3','nivel_4') THEN RETURN public.is_staff(_user_id); END IF;
  IF _clearance = 'nivel_diretor' THEN RETURN public.is_admin(_user_id); END IF;
  RETURN FALSE;
END;
$$;

CREATE POLICY "Read by clearance" ON public.lore_entries FOR SELECT
  USING (status = 'publicado' AND public.can_view_clearance(auth.uid(), clearance));
CREATE POLICY "Admins read all" ON public.lore_entries FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins insert" ON public.lore_entries FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update" ON public.lore_entries FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete" ON public.lore_entries FOR DELETE USING (public.is_admin(auth.uid()));
-- Narradores podem criar Eventos
CREATE POLICY "Narradores criam eventos" ON public.lore_entries FOR INSERT
  WITH CHECK (public.is_staff(auth.uid()) AND category = 'evento');
-- Narradores podem atualizar status/metadata de NPCs e Domínios
CREATE POLICY "Narradores atualizam npcs/dominios" ON public.lore_entries FOR UPDATE
  USING (public.is_staff(auth.uid()) AND category IN ('npc','dominio','evento'));

-- ============ RELACIONAMENTOS ============
CREATE TABLE public.lore_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entry UUID NOT NULL REFERENCES public.lore_entries(id) ON DELETE CASCADE,
  to_entry UUID NOT NULL REFERENCES public.lore_entries(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_entry, to_entry, relation_type)
);
GRANT SELECT ON public.lore_relations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lore_relations TO authenticated;
GRANT ALL ON public.lore_relations TO service_role;
ALTER TABLE public.lore_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Relations readable by all" ON public.lore_relations FOR SELECT USING (true);
CREATE POLICY "Admins manage relations" ON public.lore_relations FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ TIMESTAMPS TRIGGER ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER lore_entries_touch BEFORE UPDATE ON public.lore_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
