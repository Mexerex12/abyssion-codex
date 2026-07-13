DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evento_categoria') THEN
    CREATE TYPE public.evento_categoria AS ENUM ('evento','operacao','sessao','reuniao');
  END IF;
END $$;

ALTER TABLE public.eventos_operacionais
  ADD COLUMN IF NOT EXISTS categoria public.evento_categoria NOT NULL DEFAULT 'evento';

CREATE INDEX IF NOT EXISTS idx_eventos_operacionais_categoria ON public.eventos_operacionais(categoria);