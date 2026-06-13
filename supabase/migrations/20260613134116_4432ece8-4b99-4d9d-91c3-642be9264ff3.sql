
-- Enum para escopo de conhecimento (quem sabe a informação)
CREATE TYPE public.knowledge_scope AS ENUM (
  'players', 'uniao', 'diretores', 'curadores', 'staff_apenas'
);

-- Enum para nível de confirmação de fatos
CREATE TYPE public.fact_status AS ENUM (
  'canonico', 'provavel', 'rumor', 'descartado', 'retconado'
);

-- Enum para status de mistérios
CREATE TYPE public.mystery_status AS ENUM (
  'sem_resposta', 'parcial', 'em_revelacao', 'resolvido', 'arquivado'
);

-- Enum para status de plots
CREATE TYPE public.plot_status AS ENUM (
  'rascunho', 'planejado', 'em_andamento', 'executado', 'arquivado', 'cancelado'
);

-- ==============================
-- FATOS CANÔNICOS
-- ==============================
CREATE TABLE public.fatos_canonicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL, -- personagem, faccao, evento, dominio, regra_universo, vestigio, etc
  fonte TEXT, -- referência (livro, sessão, decisão da staff)
  status fact_status NOT NULL DEFAULT 'canonico',
  escopo_conhecimento knowledge_scope NOT NULL DEFAULT 'staff_apenas',
  palavras_chave TEXT[] DEFAULT '{}', -- usadas pelo verificador de contradições
  npcs_relacionados UUID[] DEFAULT '{}',
  faccoes_relacionadas TEXT[] DEFAULT '{}',
  eventos_relacionados UUID[] DEFAULT '{}',
  notas TEXT,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fatos_canonicos TO authenticated;
GRANT ALL ON public.fatos_canonicos TO service_role;
ALTER TABLE public.fatos_canonicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fatos_select_staff" ON public.fatos_canonicos FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "fatos_insert_staff" ON public.fatos_canonicos FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "fatos_update_staff" ON public.fatos_canonicos FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "fatos_delete_admin" ON public.fatos_canonicos FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER fatos_touch BEFORE UPDATE ON public.fatos_canonicos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_fatos_palavras ON public.fatos_canonicos USING GIN (palavras_chave);
CREATE INDEX idx_fatos_categoria ON public.fatos_canonicos (categoria);

-- ==============================
-- MISTÉRIOS
-- ==============================
CREATE TABLE public.misterios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pergunta TEXT NOT NULL,
  contexto TEXT,
  status mystery_status NOT NULL DEFAULT 'sem_resposta',
  escopo_conhecimento knowledge_scope NOT NULL DEFAULT 'players',
  npcs_envolvidos UUID[] DEFAULT '{}',
  faccoes_envolvidas TEXT[] DEFAULT '{}',
  eventos_envolvidos UUID[] DEFAULT '{}',
  possiveis_respostas JSONB DEFAULT '[]'::jsonb, -- [{texto, probabilidade}]
  resolucao_planejada TEXT, -- markdown, só staff vê
  resolvido_em TIMESTAMPTZ,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.misterios TO authenticated;
GRANT ALL ON public.misterios TO service_role;
ALTER TABLE public.misterios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mist_select_staff" ON public.misterios FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "mist_insert_staff" ON public.misterios FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "mist_update_staff" ON public.misterios FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "mist_delete_admin" ON public.misterios FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER mist_touch BEFORE UPDATE ON public.misterios FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ==============================
-- CONSEQUÊNCIAS
-- ==============================
CREATE TABLE public.consequencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID REFERENCES public.eventos_operacionais(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT, -- morte, surgimento, criacao_misterio, ruptura, mudanca_politica, etc
  npcs_afetados UUID[] DEFAULT '{}',
  dominios_afetados UUID[] DEFAULT '{}',
  misterios_gerados UUID[] DEFAULT '{}',
  fatos_gerados UUID[] DEFAULT '{}',
  escopo_conhecimento knowledge_scope NOT NULL DEFAULT 'players',
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consequencias TO authenticated;
GRANT ALL ON public.consequencias TO service_role;
ALTER TABLE public.consequencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cons_select_staff" ON public.consequencias FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "cons_insert_staff" ON public.consequencias FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "cons_update_staff" ON public.consequencias FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "cons_delete_admin" ON public.consequencias FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER cons_touch BEFORE UPDATE ON public.consequencias FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ==============================
-- PLOTS (planejamento narrativo futuro)
-- ==============================
CREATE TABLE public.plots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  objetivo TEXT,
  resumo TEXT,
  status plot_status NOT NULL DEFAULT 'rascunho',
  data_prevista DATE,
  narrador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  npcs_envolvidos UUID[] DEFAULT '{}',
  faccoes_envolvidas TEXT[] DEFAULT '{}',
  misterios_relacionados UUID[] DEFAULT '{}',
  fatos_relacionados UUID[] DEFAULT '{}',
  dependencias UUID[] DEFAULT '{}', -- outros plots que precisam acontecer antes
  notas TEXT,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plots TO authenticated;
GRANT ALL ON public.plots TO service_role;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plots_select_staff" ON public.plots FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "plots_insert_staff" ON public.plots FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "plots_update_staff" ON public.plots FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "plots_delete_admin" ON public.plots FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER plots_touch BEFORE UPDATE ON public.plots FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ==============================
-- Verificador de contradições (função usada pelas server fns)
-- Retorna fatos canônicos cujas palavras-chave aparecem no texto fornecido.
-- ==============================
CREATE OR REPLACE FUNCTION public.check_contradictions(_text TEXT)
RETURNS TABLE (id UUID, titulo TEXT, descricao TEXT, categoria TEXT, status fact_status, matched_keyword TEXT)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lower_text TEXT;
BEGIN
  IF _text IS NULL OR length(_text) < 3 THEN RETURN; END IF;
  lower_text := lower(_text);
  RETURN QUERY
    SELECT f.id, f.titulo, f.descricao, f.categoria, f.status, kw
    FROM public.fatos_canonicos f, unnest(f.palavras_chave) AS kw
    WHERE f.status IN ('canonico','provavel')
      AND length(kw) >= 3
      AND lower_text LIKE '%' || lower(kw) || '%';
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_contradictions(TEXT) TO authenticated;
