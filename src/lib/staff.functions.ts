import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  canRoleViewVisibility,
  legacyClearanceToVisibility,
  VISIBILITIES,
  type Visibility,
} from "@/cms/permissions/policy";

// ============================ helpers ============================
async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("is_staff", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden: requer staff.");
}
async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("is_admin", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden: requer admin.");
}

async function getUserRoles(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);
  return (data ?? []).map((row: { role: string }) => row.role);
}

function accessValueToVisibility(value: string | null | undefined): Visibility {
  if (value && (VISIBILITIES as readonly string[]).includes(value)) return value as Visibility;
  return legacyClearanceToVisibility(value);
}

function canSeeAccessValue(value: string | null | undefined, roles: string[]) {
  if (!value) return true;
  return canRoleViewVisibility(accessValueToVisibility(value), roles, true);
}

function isMissingCmsColumns(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";
  return (
    message.includes("cms_status") ||
    message.includes("visibility") ||
    message.includes("classification")
  );
}

// ============================ WORLD STATE ============================
const worldStateSchema = z.object({
  assimilacao_media: z.number().int().min(0).max(100),
  nivel_ameaca: z.enum(["baixo", "medio", "alto", "critico", "catastrofico"]),
  peregrino_ultimo_local: z.string().max(200).nullable().optional(),
  peregrino_ultimo_em: z.string().nullable().optional(),
  evento_global_atual_id: z.string().uuid().nullable().optional(),
  notas: z.string().max(4000).nullable().optional(),
});

export const getWorldState = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [ws, npcs, vest, dom, rup, ev] = await Promise.all([
    supabaseAdmin.from("world_state").select("*").maybeSingle(),
    supabaseAdmin.from("npcs").select("status, cargo").limit(2000),
    supabaseAdmin.from("vestigios").select("estado, vidas_atuais").limit(2000),
    supabaseAdmin.from("dominios").select("status").limit(2000),
    supabaseAdmin.from("rupturas").select("estado").limit(2000),
    supabaseAdmin
      .from("eventos_operacionais")
      .select("id, nome, data, tipo")
      .eq("tipo", "global")
      .order("data", { ascending: false })
      .limit(1),
  ]);

  const count = <T extends Record<string, any>>(rows: T[] | null, key: keyof T, val: string) =>
    (rows ?? []).filter((r) => r[key] === val).length;

  return {
    state: ws.data,
    counts: {
      npcs_total: npcs.data?.length ?? 0,
      regentes_ativos: (npcs.data ?? []).filter(
        (n: any) => n.status === "ativo" && (n.cargo ?? "").toLowerCase().includes("regente"),
      ).length,
      curadores_conhecidos: (npcs.data ?? []).filter((n: any) =>
        (n.cargo ?? "").toLowerCase().includes("curador"),
      ).length,
      vestigios_vivos: count(vest.data, "estado", "ativo"),
      vestigios_mortos: count(vest.data, "estado", "morto"),
      dominios_ativos: count(dom.data, "status", "ativo"),
      dominios_encerrados: count(dom.data, "status", "encerrado"),
      rupturas_abertas: (rup.data ?? []).filter((r: any) =>
        ["aberta", "critica"].includes(r.estado),
      ).length,
      rupturas_criticas: count(rup.data, "estado", "critica"),
    },
    ultimo_evento_global: ev.data?.[0] ?? null,
  };
});

export const updateWorldState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => worldStateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("world_state")
      .update({
        ...data,
        peregrino_ultimo_em: data.peregrino_ultimo_em || null,
        evento_global_atual_id: data.evento_global_atual_id || null,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================ NPCs ============================
const npcSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1).max(200),
  imagem_url: z.string().url().nullable().optional().or(z.literal("")),
  cargo: z.string().max(200).nullable().optional(),
  faccao: z.string().max(200).nullable().optional(),
  status: z.enum(["ativo", "morto", "desaparecido", "oculto", "corrompido"]),
  localizacao: z.string().max(200).nullable().optional(),
  objetivos: z.array(z.string().max(300)).max(20).default([]),
  segredos: z.string().max(10000).nullable().optional(),
  segredos_clearance: z.enum([
    "publico", "uniao", "instrutores", "diretores", "curadores", "restrito", "verdade_absoluta",
  ]),
  ultima_aparicao: z.string().max(200).nullable().optional(),
  observacoes_staff: z.string().max(10000).nullable().optional(),
  lore_entry_id: z.string().uuid().nullable().optional(),
});

export const listNpcs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("npcs")
      .select("*")
      .order("nome");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getNpc = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const [npc, rels] = await Promise.all([
      context.supabase.from("npcs").select("*").eq("id", data.id).maybeSingle(),
      context.supabase
        .from("npc_relations")
        .select("id, tipo, notas, from_npc_id, to_npc_id, from:npcs!npc_relations_from_npc_id_fkey(id,nome), to:npcs!npc_relations_to_npc_id_fkey(id,nome)")
        .or(`from_npc_id.eq.${data.id},to_npc_id.eq.${data.id}`),
    ]);
    return { npc: npc.data, relations: rels.data ?? [] };
  });

export const upsertNpc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => npcSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload = {
      ...data,
      imagem_url: data.imagem_url || null,
      lore_entry_id: data.lore_entry_id || null,
      created_by: context.userId,
    };
    if (data.id) {
      const { error } = await context.supabase.from("npcs").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("npcs").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteNpc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("npcs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertNpcRelation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      from_npc_id: z.string().uuid(),
      to_npc_id: z.string().uuid(),
      tipo: z.string().min(1).max(60),
      notas: z.string().max(500).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("npc_relations")
      .upsert(data, { onConflict: "from_npc_id,to_npc_id,tipo" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteNpcRelation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("npc_relations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================ VESTIGIOS ============================
const vestigioSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1).max(200),
  numero: z.number().int().nullable().optional(),
  esquadrao: z.string().max(200).nullable().optional(),
  vidas_atuais: z.number().int().min(0).max(10),
  vidas_limite: z.number().int().min(1).max(10),
  ultima_aparicao: z.string().max(200).nullable().optional(),
  estado: z.enum(["ativo", "morto", "instavel", "desaparecido"]),
  notas: z.string().max(10000).nullable().optional(),
});

export const listVestigios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase.from("vestigios").select("*").order("numero", { nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertVestigio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => vestigioSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    if (data.id) {
      const { error } = await context.supabase.from("vestigios").update(data).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("vestigios").insert(data).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const appendVestigioHistorico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), entrada: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: v } = await context.supabase.from("vestigios").select("historico").eq("id", data.id).maybeSingle();
    const arr = Array.isArray(v?.historico) ? v.historico : [];
    arr.push({ em: new Date().toISOString(), texto: data.entrada, por: context.userId });
    const { error } = await context.supabase.from("vestigios").update({ historico: arr }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteVestigio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("vestigios").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================ DOMINIOS ============================
const dominioSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1).max(200),
  classe: z.string().max(120).nullable().optional(),
  regente_npc_id: z.string().uuid().nullable().optional(),
  arquiteto_npc_id: z.string().uuid().nullable().optional(),
  dificuldade: z.number().int().min(1).max(10).nullable().optional(),
  status: z.enum(["ativo", "encerrado", "selado", "instavel"]),
  recompensas: z.array(z.string().max(200)).max(30).default([]),
  historico: z.string().max(10000).nullable().optional(),
  ultima_abertura: z.string().nullable().optional(),
  proxima_abertura: z.string().nullable().optional(),
  lore_entry_id: z.string().uuid().nullable().optional(),
});

export const listDominios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("dominios")
      .select("*, regente:npcs!dominios_regente_npc_id_fkey(id,nome), arquiteto:npcs!dominios_arquiteto_npc_id_fkey(id,nome)")
      .order("nome");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertDominio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => dominioSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload = {
      ...data,
      regente_npc_id: data.regente_npc_id || null,
      arquiteto_npc_id: data.arquiteto_npc_id || null,
      lore_entry_id: data.lore_entry_id || null,
      ultima_abertura: data.ultima_abertura || null,
      proxima_abertura: data.proxima_abertura || null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("dominios").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("dominios").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteDominio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("dominios").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================ RUPTURAS ============================
const rupturaSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1).max(200),
  dominio_id: z.string().uuid().nullable().optional(),
  estado: z.enum(["aberta", "contida", "critica", "fechada"]),
  aberta_em: z.string().optional(),
  fechada_em: z.string().nullable().optional(),
  descricao: z.string().max(5000).nullable().optional(),
});

export const listRupturas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("rupturas")
      .select("*, dominio:dominios(id,nome)")
      .order("aberta_em", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertRuptura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rupturaSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload = {
      ...data,
      dominio_id: data.dominio_id || null,
      fechada_em: data.fechada_em || null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("rupturas").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("rupturas").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteRuptura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("rupturas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================ EVENTOS ============================
const eventoSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1).max(200),
  data: z.string().nullable().optional(),
  narrador_id: z.string().uuid().nullable().optional(),
  npcs_envolvidos: z.array(z.string().uuid()).max(50).default([]),
  esquadroes: z.array(z.string().min(1).max(80)).max(30).default([]),
  dominio_id: z.string().uuid().nullable().optional(),
  resumo: z.string().max(10000).nullable().optional(),
  consequencias: z.string().max(10000).nullable().optional(),
  relatorio: z.string().max(20000).nullable().optional(),
  status: z.enum(["planejado", "em_andamento", "concluido", "cancelado"]),
  tipo: z.enum(["global", "faccao", "esquadrao", "secreto"]),
  categoria: z.enum(["evento", "operacao", "sessao", "reuniao"]).default("evento"),
  clearance: z.enum([
    "publico", "uniao", "instrutores", "diretores", "curadores", "restrito", "verdade_absoluta",
  ]),
});

export const listEventos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("eventos_operacionais")
      .select("*, dominio:dominios(id,nome)")
      .order("data", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listNarradores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data: roles } = await context.supabase
      .from("user_roles").select("user_id, role").in("role", ["narrador", "administrador"]);
    const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
    if (ids.length === 0) return [];
    const { data: profiles } = await context.supabase
      .from("profiles").select("id, display_name").in("id", ids);
    return (profiles ?? []) as { id: string; display_name: string | null }[];
  });

export const upsertEvento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => eventoSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload = {
      ...data,
      narrador_id: data.narrador_id || context.userId,
      dominio_id: data.dominio_id || null,
      data: data.data || null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("eventos_operacionais").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("eventos_operacionais").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const finalizarEvento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    relatorio: z.string().min(10).max(20000),
    consequencias: z.string().max(10000).nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: row, error } = await context.supabase
      .from("eventos_operacionais")
      .update({
        relatorio: data.relatorio,
        consequencias: data.consequencias ?? null,
        status: "concluido",
      })
      .eq("id", data.id)
      .select("id, lore_entry_id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });


export const deleteEvento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("eventos_operacionais").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================ GANCHOS ============================
const ganchoSchema = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().min(1).max(200),
  resumo: z.string().max(5000).nullable().optional(),
  narrador_id: z.string().uuid().nullable().optional(),
  faccao: z.string().max(200).nullable().optional(),
  npcs_envolvidos: z.array(z.string().uuid()).max(50).default([]),
  prioridade: z.enum(["baixa", "media", "alta", "critica"]),
  status: z.enum(["nao_iniciado", "planejado", "em_andamento", "executado", "arquivado"]),
});

export const listGanchos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("ganchos_narrativos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertGancho = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ganchoSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload = { ...data, narrador_id: data.narrador_id || context.userId };
    if (data.id) {
      const { error } = await context.supabase.from("ganchos_narrativos").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("ganchos_narrativos").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteGancho = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("ganchos_narrativos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================ DOCUMENTOS ============================
const documentoSchema = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().min(1).max(200),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  conteudo: z.string().max(100000).nullable().optional(),
  categoria: z.string().max(120).nullable().optional(),
  clearance: z.enum([
    "publico", "uniao", "instrutores", "diretores", "curadores", "restrito", "verdade_absoluta",
  ]),
  anexos: z.array(z.string().max(500)).max(20).default([]),
});

export const listDocumentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase.from("documentos").select("*").order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getDocumento = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: doc } = await context.supabase.from("documentos").select("*").eq("slug", data.slug).maybeSingle();
    if (!doc) return { doc: null, revisoes: [] };
    const { data: revs } = await context.supabase
      .from("documento_revisoes")
      .select("*")
      .eq("documento_id", doc.id)
      .order("criado_em", { ascending: false })
      .limit(50);
    return { doc, revisoes: revs ?? [] };
  });

export const upsertDocumento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => documentoSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload = { ...data, created_by: context.userId };
    if (data.id) {
      const { error } = await context.supabase.from("documentos").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("documentos").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteDocumento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("documentos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================ SEARCH ============================
export const universalSearch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const roles = await getUserRoles(context);
    const term = `%${data.q}%`;
    const loreQuery = context.supabase
      .from("lore_entries")
      .select("id,slug,title,category,visibility,cms_status,clearance,status")
      .or(`title.ilike.${term},summary.ilike.${term},body.ilike.${term}`)
      .neq("cms_status", "trash")
      .limit(20);
    const [npcs, eventos, dominios, vestigios, ganchos, documentos, loreResult] = await Promise.all([
      context.supabase.from("npcs").select("id,nome,cargo,faccao,status").or(`nome.ilike.${term},cargo.ilike.${term},faccao.ilike.${term}`).limit(20),
      context.supabase.from("eventos_operacionais").select("id,nome,status,tipo,data").or(`nome.ilike.${term},resumo.ilike.${term}`).limit(20),
      context.supabase.from("dominios").select("id,nome,classe,status").or(`nome.ilike.${term},classe.ilike.${term}`).limit(20),
      context.supabase.from("vestigios").select("id,nome,numero,estado").ilike("nome", term).limit(20),
      context.supabase.from("ganchos_narrativos").select("id,titulo,prioridade,status").or(`titulo.ilike.${term},resumo.ilike.${term}`).limit(20),
      context.supabase.from("documentos").select("id,slug,titulo,categoria").or(`titulo.ilike.${term},conteudo.ilike.${term}`).limit(20),
      loreQuery,
    ]);
    let lore = loreResult;
    if (isMissingCmsColumns(loreResult.error)) {
      lore = await context.supabase
        .from("lore_entries")
        .select("id,slug,title,category,clearance,status")
        .or(`title.ilike.${term},summary.ilike.${term},body.ilike.${term}`)
        .eq("status", "publicado")
        .limit(20);
    }
    return {
      npcs: npcs.data ?? [],
      eventos: eventos.data ?? [],
      dominios: dominios.data ?? [],
      vestigios: vestigios.data ?? [],
      ganchos: ganchos.data ?? [],
      documentos: documentos.data ?? [],
      lore: (lore.data ?? []).filter(
        (row: any) =>
          (row.cms_status ? row.cms_status !== "trash" : row.status === "publicado") &&
          canSeeAccessValue(row.visibility ?? row.clearance, roles),
      ),
    };
  });

// ============================ GRAPH ============================
export const getGraph = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const [npcs, rels, dominios] = await Promise.all([
      context.supabase.from("npcs").select("id,nome,faccao,status"),
      context.supabase.from("npc_relations").select("from_npc_id,to_npc_id,tipo"),
      context.supabase.from("dominios").select("id,nome,regente_npc_id,arquiteto_npc_id"),
    ]);
    const nodes: { id: string; label: string; group: string }[] = [];
    const edges: { from: string; to: string; label: string }[] = [];
    for (const n of npcs.data ?? []) nodes.push({ id: `npc:${n.id}`, label: n.nome, group: n.faccao || "NPC" });
    for (const d of dominios.data ?? []) {
      nodes.push({ id: `dom:${d.id}`, label: d.nome, group: "Domínio" });
      if (d.regente_npc_id) edges.push({ from: `dom:${d.id}`, to: `npc:${d.regente_npc_id}`, label: "regente" });
      if (d.arquiteto_npc_id) edges.push({ from: `dom:${d.id}`, to: `npc:${d.arquiteto_npc_id}`, label: "arquiteto" });
    }
    for (const r of rels.data ?? []) {
      edges.push({ from: `npc:${r.from_npc_id}`, to: `npc:${r.to_npc_id}`, label: r.tipo });
    }
    return { nodes, edges };
  });

// ============================ TIMELINE STAFF ============================
export const listStaffTimeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("eventos_operacionais")
      .select("id,nome,data,status,tipo,clearance,resumo,dominio_id")
      .order("data", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ============================ SMART SEARCH (RAG) ============================
const SEARCH_SOURCES = [
  "npcs", "vestigios", "dominios", "eventos_operacionais",
  "ganchos_narrativos", "documentos", "fatos_canonicos", "lore_entries",
] as const;

function buildIndexableRow(table: string, r: any): { term: string; category: string | null; clearance: string | null; slug: string | null; content: string } | null {
  const join = (parts: Array<string | null | undefined>) => parts.filter(Boolean).join("\n").trim();
  switch (table) {
    case "npcs":
      return { term: r.nome, category: r.cargo || "NPC", clearance: r.segredos_clearance ?? null, slug: null,
        content: join([`NPC: ${r.nome}`, r.cargo && `Cargo: ${r.cargo}`, r.faccao && `Facção: ${r.faccao}`, r.localizacao && `Localização: ${r.localizacao}`, r.objetivos && `Objetivos: ${r.objetivos}`, r.segredos && `Segredos: ${r.segredos}`, r.observacoes_staff]) };
    case "vestigios":
      return { term: r.nome, category: "Vestígio", clearance: null, slug: null,
        content: join([`Vestígio VEST-${String(r.numero ?? "?").padStart(3, "0")}: ${r.nome}`, r.estado && `Estado: ${r.estado}`, r.esquadrao && `Esquadrão: ${r.esquadrao}`, r.historico, r.notas]) };
    case "dominios":
      return { term: r.nome, category: r.classe || "Domínio", clearance: null, slug: null,
        content: join([`Domínio: ${r.nome}`, r.classe && `Classe: ${r.classe}`, r.dificuldade && `Dificuldade: ${r.dificuldade}`, r.recompensas && `Recompensas: ${r.recompensas}`, r.historico]) };
    case "eventos_operacionais":
      return { term: r.nome, category: r.tipo || "Evento", clearance: r.clearance ?? null, slug: null,
        content: join([`Evento: ${r.nome}`, r.resumo, r.relatorio && `Relatório: ${r.relatorio}`, r.consequencias && `Consequências: ${r.consequencias}`]) };
    case "ganchos_narrativos":
      return { term: r.titulo, category: "Gancho", clearance: null, slug: null,
        content: join([`Gancho: ${r.titulo}`, r.resumo, r.faccao && `Facção: ${r.faccao}`, r.prioridade && `Prioridade: ${r.prioridade}`]) };
    case "documentos":
      return { term: r.titulo, category: r.categoria || "Documento", clearance: r.clearance ?? null, slug: r.slug,
        content: join([`Documento: ${r.titulo}`, r.conteudo]) };
    case "fatos_canonicos":
      return { term: r.titulo, category: r.categoria || "Fato", clearance: r.escopo_conhecimento ?? null, slug: null,
        content: join([`Fato canônico (${r.status}): ${r.titulo}`, r.descricao, r.notas]) };
    case "lore_entries":
      if (r.cms_status === "trash") return null;
      return { term: r.title, category: r.category || "Lore", clearance: r.visibility ?? r.clearance ?? null, slug: r.slug,
        content: join([`Lore: ${r.title}`, r.subtitle, r.summary, r.body]) };
  }
  return null;
}

export const reindexLoreIndex = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { embedText, chunkText } = await import("./embeddings.server");
    let total = 0;
    await context.supabase.from("lore_index").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    for (const table of SEARCH_SOURCES) {
      const { data: rows, error } = await context.supabase.from(table).select("*").limit(2000);
      if (error || !rows) continue;
      const docs: { source_type: string; source_id: string; chunk_index: number; term: string;
        category: string | null; clearance: string | null; slug: string | null; content: string }[] = [];
      for (const r of rows as any[]) {
        const built = buildIndexableRow(table, r);
        if (!built || !built.content || built.content.length < 5) continue;
        const chunks = chunkText(built.content, 1200, 150);
        chunks.forEach((c, i) => docs.push({
          source_type: table, source_id: r.id, chunk_index: i, term: built.term,
          category: built.category, clearance: built.clearance, slug: built.slug, content: c,
        }));
      }
      // Embed in batches of 32
      for (let i = 0; i < docs.length; i += 32) {
        const batch = docs.slice(i, i + 32);
        const vectors = await embedText(batch.map((d) => `${d.term}\n${d.content}`));
        const payload = batch.map((d, idx) => ({ ...d, embedding: vectors[idx] as any }));
        const { error: insErr } = await context.supabase.from("lore_index").insert(payload);
        if (insErr) throw new Error(`Falha indexando ${table}: ${insErr.message}`);
        total += payload.length;
      }
    }
    return { ok: true, indexed: total };
  });

export const smartSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    q: z.string().min(2).max(400),
    explain: z.boolean().optional().default(true),
    limit: z.number().int().min(1).max(30).optional().default(12),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const roles = await getUserRoles(context);
    const { embedText } = await import("./embeddings.server");
    const [qvec] = await embedText(data.q);
    const { data: semantic, error } = await context.supabase.rpc("match_lore_index", {
      query_embedding: qvec as any,
      match_count: data.limit,
      min_similarity: 0.2,
    });
    if (error) throw new Error(error.message);

    // Fallback fuzzy by term/content for the same term
    const term = `%${data.q}%`;
    const { data: literal } = await context.supabase
      .from("lore_index")
      .select("id,source_type,source_id,slug,term,category,clearance,content")
      .or(`term.ilike.${term},content.ilike.${term}`)
      .limit(10);

    // merge unique by id
    const map = new Map<string, any>();
    for (const r of (semantic ?? []) as any[]) map.set(r.id, r);
    for (const r of (literal ?? []) as any[]) if (!map.has(r.id)) map.set(r.id, { ...r, similarity: 0.15 });
    const results = Array.from(map.values())
      .filter((row) => canSeeAccessValue(row.clearance, roles))
      .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));

    let explanation: string | null = null;
    if (data.explain && results.length > 0) {
      try {
        const { callAI } = await import("./ai-gateway.server");
        const context_text = results.slice(0, 6).map((r, i) =>
          `[${i + 1}] (${r.source_type} · ${r.category ?? ""}) ${r.term}\n${r.content}`
        ).join("\n\n---\n\n");
        explanation = await callAI({
          temperature: 0.4,
          messages: [
            { role: "system", content:
              "Você é o Curador-Auxiliar do universo Abyssion SMP. Responda em português, em no máximo 6 linhas, usando APENAS o contexto fornecido. " +
              "Se o termo aparecer em múltiplas fontes, sintetize uma definição unificada. " +
              "Cite as fontes entre colchetes como [1], [2]. Se o contexto não cobrir o termo, diga claramente que não há registro." },
            { role: "user", content: `Termo pesquisado: "${data.q}"\n\nContexto do banco de lore:\n${context_text}\n\nDefina o termo.` },
          ],
        });
      } catch (e) {
        explanation = `(IA indisponível: ${(e as Error).message})`;
      }
    }

    return { results, explanation, count: results.length };
  });

export const indexStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { count } = await context.supabase.from("lore_index").select("*", { count: "exact", head: true });
    const { data: lastRow } = await context.supabase.from("lore_index").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data: bySource } = await context.supabase.from("lore_index").select("source_type");
    const counts: Record<string, number> = {};
    for (const r of (bySource ?? []) as any[]) counts[r.source_type] = (counts[r.source_type] ?? 0) + 1;
    return { total: count ?? 0, lastIndexedAt: lastRow?.created_at ?? null, bySource: counts };
  });
