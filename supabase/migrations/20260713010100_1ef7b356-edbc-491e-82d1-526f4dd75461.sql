-- Restringir EXECUTE em funções SECURITY DEFINER do schema public.
-- Padrão: revogar de PUBLIC/anon, manter apenas quem realmente precisa.

-- 1) Funções de trigger: ninguém chama diretamente
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.evento_to_timeline() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.snapshot_documento() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_fundador_for_email() FROM PUBLIC, anon, authenticated;

-- 2) Helpers de papel usados em RLS: precisam ser executáveis por usuários autenticados
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_diretor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_diretor(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_fundador(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_fundador(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.can_view_clearance(uuid, clearance_level) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_clearance(uuid, clearance_level) TO authenticated;

-- 3) Funções chamadas por server code autenticado (staff)
REVOKE ALL ON FUNCTION public.match_lore_index(vector, integer, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_lore_index(vector, integer, double precision) TO authenticated;

REVOKE ALL ON FUNCTION public.check_contradictions(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_contradictions(text) TO authenticated;