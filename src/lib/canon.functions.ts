import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("is_staff", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden: requer staff.");
}
async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("is_admin", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden: requer admin.");
}

const SCOPE = ["players", "uniao", "diretores", "curadores", "staff_apenas"] as const;

// ============================ FATOS CANÔNICOS ============================
const fatoSchema = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().min(1).max(300),
  descricao: z.string().min(1).max(10000),
  categoria: z.string().min(1).max(80),
  fonte: z.string().max(400).nullable().optional(),
  status: z.enum(["canonico", "provavel", "rumor", "descartado", "retconado"]),
  escopo_conhecimento: z.enum(SCOPE),
  palavras_chave: z.array(z.string().min(2).max(60)).max(40).default([]),
  npcs_relacionados: z.array(z.string().uuid()).max(50).default([]),
  faccoes_relacionadas: z.array(z.string().max(120)).max(30).default([]),
  eventos_relacionados: z.array(z.string().uuid()).max(50).default([]),
  notas: z.string().max(5000).nullable().optional(),
});

export const listFatos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("fatos_canonicos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertFato = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => fatoSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload = { ...data, criado_por: context.userId };
    if (data.id) {
      const { error } = await context.supabase.from("fatos_canonicos").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("fatos_canonicos").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteFato = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("fatos_canonicos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================ VERIFICADOR DE CONTRADIÇÕES ============================
export const checkContradictions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ text: z.string().max(20000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: hits, error } = await context.supabase.rpc("check_contradictions", { _text: data.text });
    if (error) throw new Error(error.message);
    // Dedup por fato (mais de uma keyword pode bater)
    const map = new Map<string, any>();
    for (const h of hits ?? []) {
      const cur = map.get(h.id);
      if (cur) cur.matched_keywords.push(h.matched_keyword);
      else map.set(h.id, { ...h, matched_keywords: [h.matched_keyword] });
    }
    return Array.from(map.values());
  });

// ============================ MISTÉRIOS ============================
const misterioSchema = z.object({
  id: z.string().uuid().optional(),
  pergunta: z.string().min(1).max(500),
  contexto: z.string().max(5000).nullable().optional(),
  status: z.enum(["sem_resposta", "parcial", "em_revelacao", "resolvido", "arquivado"]),
  escopo_conhecimento: z.enum(SCOPE),
  npcs_envolvidos: z.array(z.string().uuid()).max(50).default([]),
  faccoes_envolvidas: z.array(z.string().max(120)).max(30).default([]),
  eventos_envolvidos: z.array(z.string().uuid()).max(50).default([]),
  possiveis_respostas: z.array(z.object({
    texto: z.string().min(1).max(500),
    probabilidade: z.number().min(0).max(100).optional(),
  })).max(20).default([]),
  resolucao_planejada: z.string().max(10000).nullable().optional(),
});

export const listMisterios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("misterios")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertMisterio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => misterioSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload: any = { ...data, criado_por: context.userId };
    if (data.status === "resolvido") payload.resolvido_em = new Date().toISOString();
    if (data.id) {
      const { error } = await context.supabase.from("misterios").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("misterios").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteMisterio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("misterios").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================ CONSEQUÊNCIAS ============================
const consequenciaSchema = z.object({
  id: z.string().uuid().optional(),
  evento_id: z.string().uuid().nullable().optional(),
  titulo: z.string().min(1).max(300),
  descricao: z.string().max(5000).nullable().optional(),
  tipo: z.string().max(80).nullable().optional(),
  npcs_afetados: z.array(z.string().uuid()).max(50).default([]),
  dominios_afetados: z.array(z.string().uuid()).max(50).default([]),
  misterios_gerados: z.array(z.string().uuid()).max(50).default([]),
  fatos_gerados: z.array(z.string().uuid()).max(50).default([]),
  escopo_conhecimento: z.enum(SCOPE),
});

export const listConsequencias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("consequencias")
      .select("*, evento:eventos_operacionais(id,nome,data)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertConsequencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => consequenciaSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload = { ...data, evento_id: data.evento_id || null, criado_por: context.userId };
    if (data.id) {
      const { error } = await context.supabase.from("consequencias").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("consequencias").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteConsequencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("consequencias").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================ PLOTS ============================
const plotSchema = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().min(1).max(300),
  objetivo: z.string().max(2000).nullable().optional(),
  resumo: z.string().max(10000).nullable().optional(),
  status: z.enum(["rascunho", "planejado", "em_andamento", "executado", "arquivado", "cancelado"]),
  data_prevista: z.string().nullable().optional(),
  narrador_id: z.string().uuid().nullable().optional(),
  npcs_envolvidos: z.array(z.string().uuid()).max(50).default([]),
  faccoes_envolvidas: z.array(z.string().max(120)).max(30).default([]),
  misterios_relacionados: z.array(z.string().uuid()).max(50).default([]),
  fatos_relacionados: z.array(z.string().uuid()).max(50).default([]),
  dependencias: z.array(z.string().uuid()).max(30).default([]),
  notas: z.string().max(10000).nullable().optional(),
});

export const listPlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("plots")
      .select("*")
      .order("data_prevista", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertPlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => plotSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload = {
      ...data,
      narrador_id: data.narrador_id || context.userId,
      data_prevista: data.data_prevista || null,
      criado_por: context.userId,
    };
    if (data.id) {
      const { error } = await context.supabase.from("plots").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("plots").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deletePlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("plots").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
