import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ============================ helpers ============================
async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("is_staff", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden: requer staff.");
}
async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("is_admin", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden: requer admin.");
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
  dominio_id: z.string().uuid().nullable().optional(),
  resumo: z.string().max(10000).nullable().optional(),
  consequencias: z.string().max(10000).nullable().optional(),
  status: z.enum(["planejado", "em_andamento", "concluido", "cancelado"]),
  tipo: z.enum(["global", "faccao", "esquadrao", "secreto"]),
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
    const term = `%${data.q}%`;
    const [npcs, eventos, dominios, vestigios, ganchos, documentos, lore] = await Promise.all([
      context.supabase.from("npcs").select("id,nome,cargo,faccao,status").or(`nome.ilike.${term},cargo.ilike.${term},faccao.ilike.${term}`).limit(20),
      context.supabase.from("eventos_operacionais").select("id,nome,status,tipo,data").or(`nome.ilike.${term},resumo.ilike.${term}`).limit(20),
      context.supabase.from("dominios").select("id,nome,classe,status").or(`nome.ilike.${term},classe.ilike.${term}`).limit(20),
      context.supabase.from("vestigios").select("id,nome,numero,estado").ilike("nome", term).limit(20),
      context.supabase.from("ganchos_narrativos").select("id,titulo,prioridade,status").or(`titulo.ilike.${term},resumo.ilike.${term}`).limit(20),
      context.supabase.from("documentos").select("id,slug,titulo,categoria").or(`titulo.ilike.${term},conteudo.ilike.${term}`).limit(20),
      context.supabase.from("lore_entries").select("id,slug,title,category").or(`title.ilike.${term},summary.ilike.${term},body.ilike.${term}`).eq("status", "publicado").limit(20),
    ]);
    return {
      npcs: npcs.data ?? [],
      eventos: eventos.data ?? [],
      dominios: dominios.data ?? [],
      vestigios: vestigios.data ?? [],
      ganchos: ganchos.data ?? [],
      documentos: documentos.data ?? [],
      lore: lore.data ?? [],
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
