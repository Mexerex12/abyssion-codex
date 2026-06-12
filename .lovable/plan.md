
# Central de Operações — Abyssion SMP

Transformar o que hoje é uma wiki/portal em uma **central administrativa profissional** para narradores e administradores, mantendo a wiki pública como vitrine. O foco passa a ser **produtividade da staff, rastreamento de lore e gerenciamento de eventos**, não estética.

## Visão geral

Três camadas convivendo no mesmo app:

1. **Público / União** — vitrine + wiki existente (mantida).
2. **Staff Workspace** — nova área `/staff` para narradores e admins, com tudo abaixo.
3. **Estado do Mundo** — dashboard vivo, alimentado pelo workspace.

Toda a Fase 1 (lore_entries, clearance, RLS, CMS, auth) é **aproveitada e estendida** — não jogada fora. NPCs/Domínios/Eventos continuam em `lore_entries` para a wiki pública, mas ganham **tabelas-irmãs operacionais** com os campos da staff (status, segredos, objetivos, vidas, etc.).

## Novas entidades (banco)

Tudo abaixo entra como tabelas novas no schema `public`, com RLS scopeada para `is_staff(auth.uid())`. Onde fizer sentido, ligam por FK opcional a `lore_entries` (para que a ficha pública e o registro operacional sejam o mesmo personagem/domínio).

- **`world_state`** — tabela de uma única linha, editável só por admin. Campos: `assimilacao_media`, `nivel_ameaca` (enum baixo/medio/alto/critico/catastrofico), `peregrino_ultimo_local`, `peregrino_ultimo_em`, `evento_global_atual_id`, `notas`. O dashboard "Estado Atual do Mundo" lê daqui + agrega contagens das outras tabelas.
- **`npcs`** — ficha operacional. Campos: `nome, imagem_url, cargo, faccao, status (ativo/morto/desaparecido/oculto), localizacao, objetivos[], segredos (markdown, clearance própria), ultima_aparicao, observacoes_staff, lore_entry_id?`.
- **`npc_relations`** — `from_npc_id, to_npc_id, tipo (aliado/inimigo/mentor/criação/etc), notas`. Base do grafo.
- **`vestigios`** — `nome, numero (int único), esquadrao_id?, vidas_atuais, vidas_limite (default 3), ultima_aparicao, estado (ativo/morto/instavel/desaparecido), historico (jsonb append-only)`.
- **`dominios`** — `nome, classe, regente_npc_id?, arquiteto_npc_id?, dificuldade (1-10), status (ativo/encerrado/selado/instavel), recompensas[], historico, ultima_abertura, proxima_abertura, lore_entry_id?`.
- **`rupturas`** — `nome, dominio_id?, estado (aberta/contida/critica/fechada), aberta_em, fechada_em, descricao`.
- **`eventos_operacionais`** — substitui o uso de `lore_entries` para eventos in-game futuros. Campos: `nome, data, narrador_id (uuid users), npcs_envolvidos[] (uuid npcs), dominio_id?, resumo, consequencias, status (planejado/em_andamento/concluido/cancelado), tipo (global/faccao/esquadrao/secreto), clearance`. Ao virar `concluido`, um trigger cria automaticamente uma `lore_entries` categoria `evento` publicada → entra na timeline pública.
- **`ganchos_narrativos`** — `titulo, resumo, narrador_id, faccao, npcs_envolvidos[], prioridade (baixa/media/alta/critica), status (nao_iniciado/planejado/em_andamento/executado/arquivado)`.
- **`documentos`** — `titulo, slug, conteudo (md), clearance, anexos[] (storage paths), categoria` + **`documento_revisoes`** (`documento_id, conteudo, editor_id, criado_em`) para histórico append-only.

Tudo com RLS: leitura por `is_staff`, escrita por `is_staff`, deleções restritas a admin. `clearance` continua usando `clearance_level` já existente, **estendido** com os novos níveis pedidos: `publico, uniao, instrutores, diretores, curadores, restrito, verdade_absoluta`. `can_view_clearance` é reescrito para a nova escala.

## Novas rotas

**Staff workspace** (todas em `_authenticated/staff/...`, gateadas por `is_staff`):

- `/staff` — **Estado Atual do Mundo**: cards com contagens (vestígios vivos/mortos, domínios ativos/encerrados, rupturas abertas/críticas, regentes ativos, curadores conhecidos), gauges de assimilação média e nível de ameaça, último avistamento do Peregrino, último evento global. Botão "editar estado" abre formulário do `world_state`.
- `/staff/npcs` + `/staff/npcs/$id` — CRUD completo, abas: Ficha · Relações · Eventos · Segredos · Observações.
- `/staff/vestigios` — grid visual com indicador de vidas (●●● / ●●○ / ●○○), filtros por esquadrão e estado, detalhe com histórico append-only.
- `/staff/dominios` — tabela com filtros classe/regente/status, agenda de próximas aberturas, detalhe ligado ao regente e à última ruptura.
- `/staff/rupturas` — lista priorizada por criticidade.
- `/staff/eventos` — kanban planejado/em_andamento/concluído + agenda. Concluir → publica na timeline.
- `/staff/timeline` — timeline interna (inclui secretos), filtros: globais/facção/esquadrão/secretos.
- `/staff/ganchos` — kanban de ideias narrativas por status, ordenado por prioridade.
- `/staff/documentos` + `/staff/documentos/$slug` — editor markdown, upload de anexos, painel de revisões com diff cronológico.
- `/staff/grafo` — **Mapa de Relações** em grafo (canvas SVG/force-directed leve, sem nova dependência pesada — usar `d3-force` apenas), nós = NPCs + Facções + Domínios + Eventos, arestas = `npc_relations` + FKs.
- `/staff/buscar` — **Enciclopédia Global**: input único; retorna NPCs, eventos, facções, domínios, documentos relacionados, agrupados.

**Público (mantido + 1 ajuste):**
- Wiki, dashboard atual, linha do tempo pública, arquivos restritos — sem mudança estrutural, só passam a ler a nova escala de clearance.

## Server functions (RPC)

Um arquivo por domínio em `src/lib/`:
`world-state.functions.ts`, `npcs.functions.ts`, `vestigios.functions.ts`, `dominios.functions.ts`, `rupturas.functions.ts`, `eventos.functions.ts`, `ganchos.functions.ts`, `documentos.functions.ts`, `search.functions.ts`, `graph.functions.ts`.

Cada um expõe `list/get/upsert/delete` validados com Zod e protegidos por `requireSupabaseAuth` + checagem `is_staff`/`is_admin`. `search.functions.ts` faz a busca universal com `ILIKE` em todas as tabelas e devolve agrupado. `graph.functions.ts` devolve `{nodes, edges}` prontos para render.

## Não inclui nesta fase

- App mobile / push.
- Notificações em tempo real (realtime do Supabase) — fica para depois.
- Permissões granulares por narrador (todos os narradores enxergam todo o workspace; admin controla CRUD destrutivo).
- Importação automática do PDF para popular NPCs/Vestígios/Domínios operacionais — staff cadastra manualmente conforme jogar. (Posso fazer um seed inicial leve se você pedir.)

## Stack / detalhes técnicos

- TanStack Start + Supabase (já em uso). Sem novas integrações pesadas.
- Uma dep nova: `d3-force` para o grafo.
- Migração única criando todas as tabelas, grants, RLS, policies, trigger evento→timeline, e ALTER no enum `clearance_level`.
- Componentes reutilizáveis: `<EntityTable>`, `<Kanban>`, `<ClearanceSelect>`, `<RelationPicker>`, `<MarkdownEditor>` (reaproveitar `entry-editor`).
- Wiki/admin existentes permanecem; o link "Admin" do header passa a apontar para `/staff` para staff, e o `/admin` antigo vira sub-área "CMS Wiki" dentro do workspace.

## Ordem de execução

1. Migração: novo enum de clearance, tabelas, grants, RLS, trigger evento→timeline.
2. Server functions de todas as entidades.
3. Layout `/staff` + sidebar do workspace + dashboard Estado do Mundo.
4. CRUDs: NPCs → Vestígios → Domínios → Rupturas → Eventos.
5. Timeline interna, Ganchos, Documentos + revisões.
6. Busca universal + Grafo.
7. Ajustar header/auth para rotear staff para `/staff`.

---

**Confirma este escopo?** Se sim, começo pela migração. Se quiser cortar algo (ex.: deixar grafo e documentos para fase 2), me avise antes.
