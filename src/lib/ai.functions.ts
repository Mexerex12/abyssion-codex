import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { callAI, type ChatMessage } from "./ai-gateway.server";
import {
  canRoleViewVisibility,
  legacyClearanceToVisibility,
  VISIBILITIES,
  type Visibility,
} from "@/cms/permissions/policy";

async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("is_staff", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden: requer staff.");
}

async function getUserRoles(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);
  return (data ?? []).map((row: { role: string }) => row.role);
}

function isMissingCmsColumns(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";
  return (
    message.includes("cms_status") ||
    message.includes("visibility") ||
    message.includes("classification")
  );
}

function canSeeLoreRow(
  row: {
    visibility?: string | null;
    clearance?: string | null;
    cms_status?: string | null;
    status?: string | null;
  },
  roles: string[],
) {
  const visibility = (row.visibility ?? legacyClearanceToVisibility(row.clearance)) as Visibility;
  const isPublished = row.cms_status ? row.cms_status === "published" : row.status === "publicado";
  return isPublished && canRoleViewVisibility(visibility, roles, true);
}

function canSeeAccessValue(value: string | null | undefined, roles: string[]) {
  if (!value) return true;
  const visibility = ((VISIBILITIES as readonly string[]).includes(value)
    ? value
    : legacyClearanceToVisibility(value)) as Visibility;
  return canRoleViewVisibility(visibility, roles, true);
}

// ============================================================
// CONTEXTO: monta um resumo compacto do universo a partir do DB
// ============================================================
async function buildUniverseContext(
  ctx: { supabase: any; userId: string },
  opts?: { full?: boolean; limit?: number },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const limit = opts?.limit ?? (opts?.full ? 400 : 120);
  const roles = await getUserRoles(ctx);

  const loreQuery = supabaseAdmin
    .from("lore_entries")
    .select("title, category, summary, body, status, cms_status, visibility, classification, clearance")
    .neq("cms_status", "trash")
    .limit(limit);
  const faccoesQuery = supabaseAdmin
    .from("lore_entries")
    .select("title, summary, status, cms_status, visibility, clearance")
    .eq("category", "faccao")
    .neq("cms_status", "trash")
    .limit(50);

  const [loreResult, npcs, dominios, vestigios, rupturas, eventos, fatos, misterios, faccoesResult, docs, ws] = await Promise.all([
    loreQuery,
    supabaseAdmin.from("npcs").select("nome, cargo, faccao, status, localizacao, objetivos, segredos, segredos_clearance, observacoes_staff, ultima_aparicao").limit(limit),
    supabaseAdmin.from("dominios").select("nome, classe, dificuldade, status, recompensas, historico, ultima_abertura").limit(limit),
    supabaseAdmin.from("vestigios").select("nome, numero, vidas_atuais, vidas_limite, estado, ultima_aparicao").limit(limit),
    supabaseAdmin.from("rupturas").select("nome, estado, descricao, aberta_em, fechada_em").limit(limit),
    supabaseAdmin.from("eventos_operacionais").select("nome, data, tipo, status, clearance, resumo, consequencias").order("data", { ascending: false }).limit(limit),
    supabaseAdmin.from("fatos_canonicos").select("titulo, descricao, categoria, fonte, nivel_confirmacao").limit(limit),
    supabaseAdmin.from("misterios").select("titulo, descricao, status, hipoteses").limit(limit),
    faccoesQuery,
    supabaseAdmin.from("documentos").select("titulo, conteudo, clearance").limit(50),
    supabaseAdmin.from("world_state").select("*").maybeSingle(),
  ]);
  let lore = loreResult;
  let faccoes = faccoesResult;

  if (isMissingCmsColumns(loreResult.error)) {
    lore = await supabaseAdmin
      .from("lore_entries")
      .select("title, category, summary, body, status, clearance")
      .eq("status", "publicado")
      .limit(limit);
  }

  if (isMissingCmsColumns(faccoesResult.error)) {
    faccoes = await supabaseAdmin
      .from("lore_entries")
      .select("title, summary, status, clearance")
      .eq("category", "faccao")
      .eq("status", "publicado")
      .limit(50);
  }

  const trim = (s: any, n = 220) => (s ? String(s).replace(/\s+/g, " ").slice(0, n) : "");
  const visibleLore = (lore.data ?? []).filter((row: any) => canSeeLoreRow(row, roles));
  const visibleFaccoes = (faccoes.data ?? []).filter((row: any) => canSeeLoreRow(row, roles));
  const visibleEventos = (eventos.data ?? []).filter((row: any) =>
    canSeeAccessValue(row.clearance, roles),
  );
  const visibleDocs = (docs.data ?? []).filter((row: any) =>
    canSeeAccessValue(row.clearance, roles),
  );

  const sections: string[] = [];
  sections.push(`# ESTADO DO MUNDO\n${JSON.stringify(ws.data ?? {})}`);
  if (visibleLore.length) sections.push(`# LORE (${visibleLore.length})\n` + visibleLore.map((l: any) => `- [${l.category}] ${l.title}: ${trim(l.summary || l.body)}`).join("\n"));
  if (visibleFaccoes.length) sections.push(`# FACÇÕES (${visibleFaccoes.length})\n` + visibleFaccoes.map((f: any) => `- ${f.title}: ${trim(f.summary)}`).join("\n"));
  if (npcs.data?.length) sections.push(`# NPCs (${npcs.data.length})\n` + npcs.data.map((n: any) => `- ${n.nome} (${n.cargo ?? "?"}, ${n.faccao ?? "?"}, ${n.status}) loc=${n.localizacao ?? "?"} obj=${(n.objetivos ?? []).slice(0, 3).join("; ")} | seg=${canSeeAccessValue(n.segredos_clearance, roles) ? trim(n.segredos, 140) : "[segredo restrito]"}`).join("\n"));
  if (dominios.data?.length) sections.push(`# DOMÍNIOS (${dominios.data.length})\n` + dominios.data.map((d: any) => `- ${d.nome} [${d.classe}] dif=${d.dificuldade} ${d.status} ult=${d.ultima_abertura ?? "?"} | ${trim(d.historico, 140)}`).join("\n"));
  if (vestigios.data?.length) sections.push(`# VESTÍGIOS (${vestigios.data.length})\n` + vestigios.data.map((v: any) => `- #${v.numero ?? "?"} ${v.nome} (${v.vidas_atuais}/${v.vidas_limite} vidas, ${v.estado})`).join("\n"));
  if (rupturas.data?.length) sections.push(`# RUPTURAS\n` + rupturas.data.map((r: any) => `- ${r.nome} (${r.estado}) ${trim(r.descricao, 120)}`).join("\n"));
  if (visibleEventos.length) sections.push(`# EVENTOS\n` + visibleEventos.map((e: any) => `- ${e.data ?? "?"} [${e.tipo}/${e.status}] ${e.nome}: ${trim(e.resumo, 160)}`).join("\n"));
  if (fatos.data?.length) sections.push(`# FATOS CANÔNICOS (imutáveis)\n` + fatos.data.map((f: any) => `- [${f.nivel_confirmacao}] ${f.titulo}: ${trim(f.descricao, 200)}`).join("\n"));
  if (misterios.data?.length) sections.push(`# MISTÉRIOS EM ABERTO\n` + misterios.data.map((m: any) => `- [${m.status}] ${m.titulo}: ${trim(m.descricao, 160)}`).join("\n"));
  if (visibleDocs.length) sections.push(`# DOCUMENTOS (${visibleDocs.length})\n` + visibleDocs.map((d: any) => `- [${d.clearance}] ${d.titulo}: ${trim(d.conteudo, 180)}`).join("\n"));

  let context = sections.join("\n\n");
  // Cap context to ~30k chars to stay safe
  if (context.length > 30000) context = context.slice(0, 30000) + "\n\n[...contexto truncado...]";
  return context;
}

const SYSTEM_BASE = `Você é o Curador-Auxiliar da União Trivalente, IA narrativa oficial do Abyssion SMP.
Você conhece TODA a lore registrada no sistema e deve gerar conteúdo coerente com ela.
REGRAS ABSOLUTAS:
- Nunca contradiga fatos canônicos confirmados.
- Use APENAS personagens, facções, domínios, vestígios e eventos cadastrados no contexto fornecido.
- Quando inventar algo novo, identifique claramente como [SUGESTÃO NOVA].
- Estilo: sombrio, ocultista, técnico-burocrático no tom (SCP/Control).
- Português do Brasil. Markdown permitido.`;

async function generate(
  authContext: { supabase: any; userId: string },
  prompt: string,
  ctxMode: "compact" | "full" = "compact",
): Promise<string> {
  const context = await buildUniverseContext(authContext, { full: ctxMode === "full" });
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_BASE },
    { role: "system", content: `CONTEXTO DO UNIVERSO (somente dados oficiais):\n\n${context}` },
    { role: "user", content: prompt },
  ];
  return callAI({ messages, temperature: 0.9 });
}

// ============================================================
// 1. MOTOR DE LORE Q&A sobre o universo
// ============================================================
export const askLore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { question: string }) => z.object({ question: z.string().min(3).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const out = await generate(
      context,
      `Pergunta da staff: ${data.question}\n\nResponda usando EXCLUSIVAMENTE os dados do contexto acima. Se não há informação suficiente, diga claramente "INFORMAÇÃO NÃO REGISTRADA" e sugira o que precisa ser cadastrado.`,
      "full",
    );
    return { answer: out };
  });

// ============================================================
// 2. GERADOR DE EVENTOS
// ============================================================
export const gerarEvento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { players: number; perigo: string; faccoes: string; objetivo: string }) =>
    z.object({
      players: z.number().int().min(1).max(50),
      perigo: z.string().min(1).max(50),
      faccoes: z.string().max(500),
      objetivo: z.string().min(3).max(1000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const prompt = `Gere um EVENTO de RPG completo.
Parâmetros:
- Players: ${data.players}
- Nível de perigo: ${data.perigo}
- Facções envolvidas: ${data.faccoes || "livre escolha"}
- Objetivo: ${data.objetivo}

Estrutura obrigatória em markdown:
## Nome do Evento
## Sinopse
## Introdução (gancho)
## Desenvolvimento (3-5 cenas)
## Possíveis Finais (mínimo 3)
## Consequências (para mundo, NPCs, facções)
## NPCs e Domínios envolvidos (apenas existentes)`;
    return { result: await generate(context, prompt) };
  });

// ============================================================
// 3. GERADOR DE DOMÍNIOS
// ============================================================
export const gerarDominio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tema?: string; classe?: string; dificuldade?: number }) =>
    z.object({ tema: z.string().max(500).optional(), classe: z.string().max(50).optional(), dificuldade: z.number().int().min(1).max(10).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const prompt = `Gere um DOMÍNIO novo coerente com a lore.
Tema: ${data.tema || "livre"} | Classe sugerida: ${data.classe || "livre"} | Dificuldade: ${data.dificuldade ?? "livre (1-10)"}

Estrutura em markdown:
## Nome
## Classe
## Regente (NPC existente ou [SUGESTÃO NOVA])
## Arquitetos
## Dificuldade (1-10)
## Mecânicas (3-6)
## Regras internas
## Recompensas
## História / Origem`;
    return { result: await generate(context, prompt) };
  });

// ============================================================
// 4. GERADOR DE NPCs
// ============================================================
export const gerarNpc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conceito?: string; faccao?: string; cargo?: string }) =>
    z.object({ conceito: z.string().max(500).optional(), faccao: z.string().max(100).optional(), cargo: z.string().max(100).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const prompt = `Gere um NPC coerente com o universo.
Conceito: ${data.conceito || "livre"} | Facção: ${data.faccao || "livre"} | Cargo: ${data.cargo || "livre"}

Responda em markdown:
## Nome
## Personalidade
## Facção / Cargo
## Objetivos (3)
## Relações (com NPCs ou facções existentes)
## Segredos (1-3, classificados)
## Potencial de plot (ganchos narrativos)`;
    return { result: await generate(context, prompt) };
  });

// ============================================================
// 5. GERADOR DE GANCHOS
// ============================================================
export const gerarGanchos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { quantidade?: number; foco?: string }) =>
    z.object({ quantidade: z.number().int().min(1).max(15).optional(), foco: z.string().max(300).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const q = data.quantidade ?? 6;
    const prompt = `Analise TODO o contexto e proponha ${q} ganchos narrativos AINDA NÃO UTILIZADOS.
${data.foco ? `Foco específico: ${data.foco}` : ""}

Categorias possíveis: Mistério · Evento · Conflito · Traição · Descoberta.

Para cada gancho:
### Título
- **Categoria:**
- **Resumo:**
- **NPCs/facções envolvidos (existentes):**
- **Por que é interessante agora:**
- **Possível desdobramento:**`;
    return { result: await generate(context, prompt, "full") };
  });

// ============================================================
// 6. ANÁLISE DE IMPACTO
// ============================================================
export const analisarImpacto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { descricao: string }) => z.object({ descricao: z.string().min(10).max(5000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const prompt = `Analise o impacto do seguinte evento/decisão proposto:

"""
${data.descricao}
"""

Responda em markdown estruturado:
## 1. O que este evento afeta?
## 2. NPCs impactados (lista com motivo)
## 3. Facções impactadas
## 4. Domínios/Vestígios afetados
## 5. Conflitos com a LORE existente? (sim/não, detalhe)
## 6. Conflitos com FATOS CANÔNICOS? (sim/não, cite o fato)
## 7. Risco de furo de roteiro (baixo/médio/alto + justificativa)
## 8. Recomendação final (aprovar / ajustar / rejeitar)`;
    return { result: await generate(context, prompt, "full") };
  });

// ============================================================
// 7. ASSISTENTE DE PERSONAGEM (NPC / Regente / Curador)
// ============================================================
export const chatComoNpc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { npcId: string; mensagens: ChatMessage[] }) =>
    z.object({
      npcId: z.string().uuid(),
      mensagens: z.array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string().max(4000) })).min(1).max(40),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: npc } = await supabaseAdmin.from("npcs").select("*").eq("id", data.npcId).maybeSingle();
    if (!npc) throw new Error("NPC não encontrado.");

    const cargo = (npc.cargo || "").toLowerCase();
    const isRegente = cargo.includes("regente");
    const isCurador = cargo.includes("curador");

    const tomExtra = isCurador
      ? "Você é um CURADOR: mantenha mistério, fale em enigmas, nunca revele conhecimentos restritos diretamente. Tom ritualístico e distante."
      : isRegente
      ? "Você é um REGENTE de Domínio: proponha desafios, jogos, regras absurdas mas internamente coerentes. Tom autoritário e teatral."
      : "Interprete fielmente este NPC.";

    const context_text = await buildUniverseContext(context, { limit: 80 });
    const sysPersona = `${SYSTEM_BASE}

${tomExtra}

VOCÊ AGORA INTERPRETA:
Nome: ${npc.nome}
Cargo: ${npc.cargo ?? "?"}
Facção: ${npc.faccao ?? "?"}
Status: ${npc.status}
Localização: ${npc.localizacao ?? "?"}
Objetivos: ${(npc.objetivos ?? []).join(" | ")}
Personalidade / Observações: ${npc.observacoes_staff ?? "?"}
SEGREDOS (use estrategicamente, sem revelar diretamente): ${npc.segredos ?? "nenhum"}
Última aparição: ${npc.ultima_aparicao ?? "?"}

Fale em primeira pessoa, sem nunca quebrar o personagem. Não cite que é IA.

CONTEXTO DO MUNDO (referência):
${context_text}`;

    const messages: ChatMessage[] = [{ role: "system", content: sysPersona }, ...data.mensagens];
    const reply = await callAI({ messages, temperature: 0.95 });
    return { reply };
  });
