
-- Generic types
CREATE TYPE public.threat_level AS ENUM ('baixo','medio','alto','critico','catastrofico');
CREATE TYPE public.npc_status AS ENUM ('ativo','morto','desaparecido','oculto','corrompido');
CREATE TYPE public.vestigio_estado AS ENUM ('ativo','morto','instavel','desaparecido');
CREATE TYPE public.dominio_status AS ENUM ('ativo','encerrado','selado','instavel');
CREATE TYPE public.ruptura_estado AS ENUM ('aberta','contida','critica','fechada');
CREATE TYPE public.evento_status AS ENUM ('planejado','em_andamento','concluido','cancelado');
CREATE TYPE public.evento_tipo AS ENUM ('global','faccao','esquadrao','secreto');
CREATE TYPE public.gancho_status AS ENUM ('nao_iniciado','planejado','em_andamento','executado','arquivado');
CREATE TYPE public.gancho_prioridade AS ENUM ('baixa','media','alta','critica');

-- WORLD STATE
CREATE TABLE public.world_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  assimilacao_media integer NOT NULL DEFAULT 0 CHECK (assimilacao_media BETWEEN 0 AND 100),
  nivel_ameaca threat_level NOT NULL DEFAULT 'medio',
  peregrino_ultimo_local text,
  peregrino_ultimo_em timestamptz,
  evento_global_atual_id uuid,
  notas text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.world_state TO anon, authenticated;
GRANT INSERT, UPDATE ON public.world_state TO authenticated;
GRANT ALL ON public.world_state TO service_role;
ALTER TABLE public.world_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read" ON public.world_state FOR SELECT USING (true);
CREATE POLICY "ws admin upd" ON public.world_state FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "ws admin ins" ON public.world_state FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
INSERT INTO public.world_state (id) VALUES (true);

-- NPCs
CREATE TABLE public.npcs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  imagem_url text,
  cargo text,
  faccao text,
  status npc_status NOT NULL DEFAULT 'ativo',
  localizacao text,
  objetivos text[] NOT NULL DEFAULT '{}',
  segredos text,
  segredos_clearance clearance_level NOT NULL DEFAULT 'diretores',
  ultima_aparicao text,
  observacoes_staff text,
  lore_entry_id uuid REFERENCES public.lore_entries(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.npcs TO authenticated;
GRANT ALL ON public.npcs TO service_role;
ALTER TABLE public.npcs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "npcs read" ON public.npcs FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "npcs ins" ON public.npcs FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "npcs upd" ON public.npcs FOR UPDATE USING (public.is_staff(auth.uid()));
CREATE POLICY "npcs del" ON public.npcs FOR DELETE USING (public.is_admin(auth.uid()));
CREATE TRIGGER npcs_touch BEFORE UPDATE ON public.npcs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX npcs_faccao_idx ON public.npcs (faccao);

-- NPC RELATIONS
CREATE TABLE public.npc_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_npc_id uuid NOT NULL REFERENCES public.npcs(id) ON DELETE CASCADE,
  to_npc_id uuid NOT NULL REFERENCES public.npcs(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_npc_id, to_npc_id, tipo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.npc_relations TO authenticated;
GRANT ALL ON public.npc_relations TO service_role;
ALTER TABLE public.npc_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nr read" ON public.npc_relations FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "nr write" ON public.npc_relations FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- VESTIGIOS
CREATE TABLE public.vestigios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  numero integer UNIQUE,
  esquadrao text,
  vidas_atuais integer NOT NULL DEFAULT 3,
  vidas_limite integer NOT NULL DEFAULT 3,
  ultima_aparicao text,
  estado vestigio_estado NOT NULL DEFAULT 'ativo',
  historico jsonb NOT NULL DEFAULT '[]',
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vestigios TO authenticated;
GRANT ALL ON public.vestigios TO service_role;
ALTER TABLE public.vestigios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v read" ON public.vestigios FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "v ins" ON public.vestigios FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "v upd" ON public.vestigios FOR UPDATE USING (public.is_staff(auth.uid()));
CREATE POLICY "v del" ON public.vestigios FOR DELETE USING (public.is_admin(auth.uid()));
CREATE TRIGGER vestigios_touch BEFORE UPDATE ON public.vestigios FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- DOMINIOS
CREATE TABLE public.dominios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  classe text,
  regente_npc_id uuid REFERENCES public.npcs(id) ON DELETE SET NULL,
  arquiteto_npc_id uuid REFERENCES public.npcs(id) ON DELETE SET NULL,
  dificuldade integer CHECK (dificuldade BETWEEN 1 AND 10),
  status dominio_status NOT NULL DEFAULT 'ativo',
  recompensas text[] NOT NULL DEFAULT '{}',
  historico text,
  ultima_abertura timestamptz,
  proxima_abertura timestamptz,
  lore_entry_id uuid REFERENCES public.lore_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dominios TO authenticated;
GRANT ALL ON public.dominios TO service_role;
ALTER TABLE public.dominios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "d read" ON public.dominios FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "d ins" ON public.dominios FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "d upd" ON public.dominios FOR UPDATE USING (public.is_staff(auth.uid()));
CREATE POLICY "d del" ON public.dominios FOR DELETE USING (public.is_admin(auth.uid()));
CREATE TRIGGER dominios_touch BEFORE UPDATE ON public.dominios FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RUPTURAS
CREATE TABLE public.rupturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  dominio_id uuid REFERENCES public.dominios(id) ON DELETE SET NULL,
  estado ruptura_estado NOT NULL DEFAULT 'aberta',
  aberta_em timestamptz NOT NULL DEFAULT now(),
  fechada_em timestamptz,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rupturas TO authenticated;
GRANT ALL ON public.rupturas TO service_role;
ALTER TABLE public.rupturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r read" ON public.rupturas FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "r ins" ON public.rupturas FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "r upd" ON public.rupturas FOR UPDATE USING (public.is_staff(auth.uid()));
CREATE POLICY "r del" ON public.rupturas FOR DELETE USING (public.is_admin(auth.uid()));
CREATE TRIGGER rupturas_touch BEFORE UPDATE ON public.rupturas FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- EVENTOS OPERACIONAIS
CREATE TABLE public.eventos_operacionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  data timestamptz,
  narrador_id uuid,
  npcs_envolvidos uuid[] NOT NULL DEFAULT '{}',
  dominio_id uuid REFERENCES public.dominios(id) ON DELETE SET NULL,
  resumo text,
  consequencias text,
  status evento_status NOT NULL DEFAULT 'planejado',
  tipo evento_tipo NOT NULL DEFAULT 'global',
  clearance clearance_level NOT NULL DEFAULT 'uniao',
  lore_entry_id uuid REFERENCES public.lore_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos_operacionais TO authenticated;
GRANT ALL ON public.eventos_operacionais TO service_role;
ALTER TABLE public.eventos_operacionais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ev read" ON public.eventos_operacionais FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "ev ins" ON public.eventos_operacionais FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "ev upd" ON public.eventos_operacionais FOR UPDATE USING (public.is_staff(auth.uid()));
CREATE POLICY "ev del" ON public.eventos_operacionais FOR DELETE USING (public.is_admin(auth.uid()));
CREATE TRIGGER eventos_touch BEFORE UPDATE ON public.eventos_operacionais FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.evento_to_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_slug text;
BEGIN
  IF NEW.status = 'concluido' AND (OLD.status IS DISTINCT FROM 'concluido') AND NEW.lore_entry_id IS NULL THEN
    new_slug := lower(regexp_replace(NEW.nome, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8);
    INSERT INTO public.lore_entries (slug, category, title, summary, body, clearance, status, timeline_date, created_by)
    VALUES (
      new_slug, 'evento', NEW.nome, NEW.resumo,
      COALESCE(NEW.resumo,'') || E'\n\n## Consequências\n\n' || COALESCE(NEW.consequencias,''),
      CASE WHEN NEW.tipo = 'secreto' THEN 'restrito'::clearance_level ELSE NEW.clearance END,
      'publicado',
      to_char(COALESCE(NEW.data, now()), 'YYYY-MM-DD'),
      NEW.narrador_id
    )
    RETURNING id INTO NEW.lore_entry_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.evento_to_timeline() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER eventos_to_timeline BEFORE UPDATE ON public.eventos_operacionais FOR EACH ROW EXECUTE FUNCTION public.evento_to_timeline();

-- GANCHOS
CREATE TABLE public.ganchos_narrativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  resumo text,
  narrador_id uuid,
  faccao text,
  npcs_envolvidos uuid[] NOT NULL DEFAULT '{}',
  prioridade gancho_prioridade NOT NULL DEFAULT 'media',
  status gancho_status NOT NULL DEFAULT 'nao_iniciado',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ganchos_narrativos TO authenticated;
GRANT ALL ON public.ganchos_narrativos TO service_role;
ALTER TABLE public.ganchos_narrativos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "g read" ON public.ganchos_narrativos FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "g ins" ON public.ganchos_narrativos FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "g upd" ON public.ganchos_narrativos FOR UPDATE USING (public.is_staff(auth.uid()));
CREATE POLICY "g del" ON public.ganchos_narrativos FOR DELETE USING (public.is_admin(auth.uid()));
CREATE TRIGGER ganchos_touch BEFORE UPDATE ON public.ganchos_narrativos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- DOCUMENTOS + REVISIONS
CREATE TABLE public.documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  slug text NOT NULL UNIQUE,
  conteudo text,
  categoria text,
  clearance clearance_level NOT NULL DEFAULT 'uniao',
  anexos text[] NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc read" ON public.documentos FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "doc ins" ON public.documentos FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "doc upd" ON public.documentos FOR UPDATE USING (public.is_staff(auth.uid()));
CREATE POLICY "doc del" ON public.documentos FOR DELETE USING (public.is_admin(auth.uid()));
CREATE TRIGGER documentos_touch BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.documento_revisoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  conteudo text,
  titulo text,
  editor_id uuid,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.documento_revisoes TO authenticated;
GRANT ALL ON public.documento_revisoes TO service_role;
ALTER TABLE public.documento_revisoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drev read" ON public.documento_revisoes FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "drev ins" ON public.documento_revisoes FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.snapshot_documento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.conteudo IS DISTINCT FROM NEW.conteudo OR OLD.titulo IS DISTINCT FROM NEW.titulo THEN
    INSERT INTO public.documento_revisoes (documento_id, conteudo, titulo, editor_id)
    VALUES (OLD.id, OLD.conteudo, OLD.titulo, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.snapshot_documento() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER documentos_snapshot BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION public.snapshot_documento();
