
-- Helper functions
CREATE OR REPLACE FUNCTION public.is_fundador(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'fundador') $$;

CREATE OR REPLACE FUNCTION public.is_diretor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('diretor','administrador','fundador')) $$;

-- Update is_admin so fundador implies admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('administrador','fundador')) $$;

-- Update is_staff to include diretor/fundador
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('narrador','administrador','diretor','fundador')) $$;

-- Update can_view_clearance with new levels
CREATE OR REPLACE FUNCTION public.can_view_clearance(_user_id uuid, _clearance clearance_level)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _clearance = 'publico' THEN RETURN TRUE; END IF;
  IF _user_id IS NULL THEN RETURN FALSE; END IF;
  IF _clearance IN ('nivel_1','nivel_2','uniao','instrutores') THEN RETURN TRUE; END IF;
  IF _clearance IN ('nivel_3','nivel_4','curadores') THEN RETURN public.is_staff(_user_id); END IF;
  IF _clearance IN ('nivel_diretor','diretores','restrito') THEN RETURN public.is_diretor(_user_id); END IF;
  IF _clearance IN ('nivel_fundador','verdade_absoluta') THEN RETURN public.is_fundador(_user_id); END IF;
  RETURN FALSE;
END;
$$;

-- Fix search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Grant Fundador + Administrador roles to mexerexgamer@gmail.com (if user exists)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'fundador'::app_role FROM auth.users WHERE email = 'mexerexgamer@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'administrador'::app_role FROM auth.users WHERE email = 'mexerexgamer@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Auto-grant Fundador on signup for that email (verified)
CREATE OR REPLACE FUNCTION public.grant_fundador_for_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND lower(NEW.email) = 'mexerexgamer@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'fundador') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'administrador') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_fundador ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_fundador
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.grant_fundador_for_email();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_fundador ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_fundador
AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW
WHEN (old.email_confirmed_at IS NULL AND new.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_fundador_for_email();

-- Storage: restrict lore-media to authenticated users
DROP POLICY IF EXISTS "Public read lore-media" ON storage.objects;
CREATE POLICY "Authenticated read lore-media" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'lore-media');

-- documento_revisoes: allow admins to update/delete
CREATE POLICY "Admins update documento_revisoes" ON public.documento_revisoes
FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete documento_revisoes" ON public.documento_revisoes
FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
