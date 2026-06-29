ALTER TABLE public.eventos_operacionais ADD COLUMN IF NOT EXISTS esquadroes text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.eventos_operacionais ADD COLUMN IF NOT EXISTS relatorio text;