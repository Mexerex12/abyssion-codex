CREATE OR REPLACE FUNCTION public.evento_to_timeline()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_slug text; body_text text;
BEGIN
  IF NEW.status = 'concluido' AND (OLD.status IS DISTINCT FROM 'concluido') AND NEW.lore_entry_id IS NULL THEN
    new_slug := lower(regexp_replace(NEW.nome, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8);
    body_text := COALESCE(NEW.resumo,'') ||
      CASE WHEN COALESCE(NEW.relatorio,'') <> '' THEN E'\n\n## Relatório\n\n' || NEW.relatorio ELSE '' END ||
      CASE WHEN COALESCE(NEW.consequencias,'') <> '' THEN E'\n\n## Consequências\n\n' || NEW.consequencias ELSE '' END;
    INSERT INTO public.lore_entries (slug, category, title, summary, body, clearance, status, timeline_date, created_by)
    VALUES (
      new_slug, 'evento', NEW.nome, NEW.resumo, body_text,
      CASE WHEN NEW.tipo = 'secreto' THEN 'restrito'::clearance_level ELSE NEW.clearance END,
      'publicado',
      to_char(COALESCE(NEW.data, now()), 'YYYY-MM-DD'),
      NEW.narrador_id
    )
    RETURNING id INTO NEW.lore_entry_id;
  END IF;
  RETURN NEW;
END;
$function$;