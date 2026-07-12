import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const roles = (data ?? []).map((r) => r.role);
    const isFundador = roles.includes("fundador");
    const isAdmin = isFundador || roles.includes("administrador");
    const isDiretor = isAdmin || roles.includes("diretor");
    const isStaff = isDiretor || roles.includes("narrador");
    return { userId: context.userId, roles, isAdmin, isStaff, isDiretor, isFundador };
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  category: z.enum([
    "universo", "historia", "npc", "faccao", "vestigio", "regente",
    "curador", "dominio", "evento", "bastiao", "esquadrao",
    "personagem_historico", "documento_restrito", "classe", "ruptura",
  ]),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(200).optional().nullable(),
  summary: z.string().max(800).optional().nullable(),
  body: z.string().max(50000).optional().nullable(),
  cover_image_url: z.string().url().optional().nullable().or(z.literal("")),
  banner_image_url: z.string().url().optional().nullable().or(z.literal("")),
  clearance: z.enum(["publico", "nivel_1", "nivel_2", "nivel_3", "nivel_4", "nivel_diretor"]),
  status: z.enum(["rascunho", "publicado", "arquivado"]).default("publicado"),
  timeline_date: z.string().max(60).optional().nullable(),
  timeline_order: z.number().int().optional().nullable(),
  tags: z.array(z.string().max(40)).max(20).default([]),
});

export const upsertLoreEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => upsertSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    const { data: isStaff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!isAdmin && !(isStaff && data.category === "evento")) {
      throw new Error("Forbidden: você não tem permissão para esta operação.");
    }
    const payload = {
      ...data,
      cover_image_url: data.cover_image_url || null,
      banner_image_url: data.banner_image_url || null,
      created_by: context.userId,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("lore_entries")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("lore_entries")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteLoreEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase.from("lore_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listUsersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const rolesByUser: Record<string, string[]> = {};
    for (const r of roles ?? []) {
      rolesByUser[r.user_id] = [...(rolesByUser[r.user_id] ?? []), r.role];
    }
    return (profiles ?? []).map((p) => ({ ...p, roles: rolesByUser[p.id] ?? [] }));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["visitante", "narrador", "diretor", "administrador", "fundador"]),
        grant: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    // Only fundador can grant/revoke fundador role
    if (data.role === "fundador") {
      const { data: isFundador } = await context.supabase.rpc("is_fundador", { _user_id: context.userId });
      if (!isFundador) throw new Error("Forbidden: apenas Fundador pode conceder este papel.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
