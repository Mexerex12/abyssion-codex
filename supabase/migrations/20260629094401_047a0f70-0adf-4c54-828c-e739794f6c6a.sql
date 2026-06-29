CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.lore_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  slug text,
  term text NOT NULL,
  category text,
  clearance text,
  chunk_index int NOT NULL DEFAULT 0,
  content text NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lore_index_source_chunk_uq
  ON public.lore_index (source_type, source_id, chunk_index);
CREATE INDEX IF NOT EXISTS lore_index_embedding_idx
  ON public.lore_index USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS lore_index_term_trgm
  ON public.lore_index USING gin (term gin_trgm_ops);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lore_index TO authenticated;
GRANT ALL ON public.lore_index TO service_role;
ALTER TABLE public.lore_index ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff manage lore_index" ON public.lore_index;
CREATE POLICY "staff manage lore_index" ON public.lore_index
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.match_lore_index(
  query_embedding vector(1536),
  match_count int DEFAULT 12,
  min_similarity float DEFAULT 0.25
)
RETURNS TABLE (
  id uuid, source_type text, source_id uuid, slug text, term text,
  category text, clearance text, content text, similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT li.id, li.source_type, li.source_id, li.slug, li.term, li.category, li.clearance, li.content,
         1 - (li.embedding <=> query_embedding) AS similarity
  FROM public.lore_index li
  WHERE public.is_staff(auth.uid())
    AND 1 - (li.embedding <=> query_embedding) >= min_similarity
  ORDER BY li.embedding <=> query_embedding
  LIMIT match_count;
$$;