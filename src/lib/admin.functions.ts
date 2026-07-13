import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  cmsStatusToLegacy,
  legacyClearanceToClassification,
  legacyClearanceToVisibility,
  legacyStatusToCms,
  visibilityToLegacyClearance,
  type EntryStatus,
} from "@/cms/permissions/policy";
import { cmsEntrySchema, libraryFilterSchema, relationSchema } from "@/cms/documents/schemas";

type UnknownRecord = Record<string, unknown>;
type DbError = { message: string } | null;
type DbResponse<T = unknown> = { data: T | null; error: DbError; count?: number | null };
type QueryBuilder<T = unknown> = PromiseLike<DbResponse<T>> & {
  select: (...args: unknown[]) => QueryBuilder<T>;
  eq: (...args: unknown[]) => QueryBuilder<T>;
  or: (...args: unknown[]) => QueryBuilder<T>;
  in: (...args: unknown[]) => QueryBuilder<T>;
  contains: (...args: unknown[]) => QueryBuilder<T>;
  order: (...args: unknown[]) => QueryBuilder<T>;
  limit: (...args: unknown[]) => QueryBuilder<T>;
  maybeSingle: (...args: unknown[]) => QueryBuilder<T>;
  single: (...args: unknown[]) => QueryBuilder<T>;
  insert: (...args: unknown[]) => QueryBuilder<T>;
  update: (...args: unknown[]) => QueryBuilder<T>;
  delete: (...args: unknown[]) => QueryBuilder<T>;
  upsert: (...args: unknown[]) => QueryBuilder<T>;
};
type SupabaseLike = {
  rpc: (fn: string, args?: UnknownRecord) => Promise<DbResponse>;
  from: <T = unknown>(table: string) => QueryBuilder<T>;
};
type AuthContext = { supabase: SupabaseLike; userId: string };
type CmsEntryRow = UnknownRecord & {
  clearance?: string | null;
  classification?: string | null;
  visibility?: string | null;
  cms_status?: string | null;
  status?: string | null;
};

async function assertAdmin(ctx: AuthContext) {
  const { data } = await ctx.supabase.rpc("is_admin", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden: requer administrador.");
}

async function assertStaff(ctx: AuthContext) {
  const { data } = await ctx.supabase.rpc("is_staff", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden: requer staff.");
}

function normalizeEntry(row: CmsEntryRow) {
  return {
    ...row,
    classification: row.classification ?? legacyClearanceToClassification(row.clearance),
    visibility: row.visibility ?? legacyClearanceToVisibility(row.clearance),
    status: legacyStatusToCms(row.cms_status ?? row.status),
  };
}

function diffFields(before: UnknownRecord | null, after: UnknownRecord) {
  if (!before) return Object.keys(after).filter((key) => after[key] !== undefined);
  const changed: string[] = [];
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null))
      changed.push(key);
  }
  return changed;
}

async function writeVersion(
  ctx: AuthContext,
  entryId: string,
  before: UnknownRecord | null,
  after: UnknownRecord,
) {
  const changed = diffFields(before, after);
  if (changed.length === 0) return;
  await ctx.supabase.from("lore_entry_versions").insert({
    entry_id: entryId,
    author_id: ctx.userId,
    changed_fields: changed,
    snapshot: before ?? after,
  });
}

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

export const listCmsEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => libraryFilterSchema.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    let q = context.supabase
      .from("lore_entries")
      .select(
        "id, slug, category, title, subtitle, summary, clearance, classification, visibility, cms_status, status, tags, updated_at, created_at",
      )
      .limit(data.limit);

    if (data.status) q = q.eq("cms_status", data.status);
    if (data.category) q = q.eq("category", data.category);
    if (data.visibility) q = q.eq("visibility", data.visibility);
    if (data.tag) q = q.contains("tags", [data.tag]);
    if (data.q) {
      const term = `%${data.q}%`;
      q = q.or(
        `title.ilike.${term},subtitle.ilike.${term},summary.ilike.${term},body.ilike.${term},slug.ilike.${term}`,
      );
    }
    if (data.sort === "title_asc" || data.sort === "title_desc") {
      q = q.order("title", { ascending: data.sort === "title_asc" });
    } else {
      q = q.order("updated_at", { ascending: data.sort === "updated_asc" });
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map(normalizeEntry);
  });

export const getCmsEntry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const [{ data: row, error }, { data: outgoing }, { data: incoming }, { data: versions }] =
      await Promise.all([
        context.supabase.from("lore_entries").select("*").eq("id", data.id).maybeSingle(),
        context.supabase
          .from("lore_relations")
          .select(
            "id, relation_type, notes, from_entry, to_entry, to:lore_entries!lore_relations_to_entry_fkey(id, slug, title, category, visibility, classification, cms_status, status)",
          )
          .eq("from_entry", data.id),
        context.supabase
          .from("lore_relations")
          .select(
            "id, relation_type, notes, from_entry, to_entry, from:lore_entries!lore_relations_from_entry_fkey(id, slug, title, category, visibility, classification, cms_status, status)",
          )
          .eq("to_entry", data.id),
        context.supabase
          .from("lore_entry_versions")
          .select("id, author_id, changed_fields, created_at, snapshot")
          .eq("entry_id", data.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
    if (error) throw new Error(error.message);
    if (!row) return null;
    return {
      entry: normalizeEntry(row),
      outgoing: outgoing ?? [],
      incoming: incoming ?? [],
      versions: versions ?? [],
    };
  });

export const upsertLoreEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    cmsEntrySchema
      .extend({
        clearance: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    const { data: isStaff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!isAdmin && !(isStaff && data.category === "evento")) {
      throw new Error("Forbidden: você não tem permissão para esta operação.");
    }

    const payload = {
      slug: data.slug.trim(),
      category: data.category,
      title: data.title.trim(),
      subtitle: data.subtitle || null,
      summary: data.summary || null,
      body: data.body || null,
      cover_image_url: data.cover_image_url || null,
      banner_image_url: data.banner_image_url || null,
      classification: data.classification,
      visibility: data.visibility,
      clearance: visibilityToLegacyClearance(data.visibility) as never,
      cms_status: data.status,
      status: cmsStatusToLegacy(data.status) as never,
      timeline_date: data.timeline_date || null,
      timeline_order: data.timeline_order,
      tags: data.tags,
      metadata: data.metadata,
      created_by: context.userId,
    };

    if (data.id) {
      const { data: before } = await context.supabase
        .from("lore_entries")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      const { error } = await context.supabase
        .from("lore_entries")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      await writeVersion(context, data.id, before, payload);
      return { id: data.id };
    }

    const { data: row, error } = await context.supabase
      .from("lore_entries")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await writeVersion(context, row.id, null, payload);
    return { id: row.id };
  });

export const moveLoreEntryToTrash = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: before } = await context.supabase
      .from("lore_entries")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const patch = { cms_status: "trash" as EntryStatus, status: "arquivado" };
    const { error } = await context.supabase.from("lore_entries").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeVersion(context, data.id, before, patch);
    return { ok: true };
  });

export const restoreLoreEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["draft", "published", "archived", "obsolete"]).default("draft"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: before } = await context.supabase
      .from("lore_entries")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const patch = { cms_status: data.status, status: cmsStatusToLegacy(data.status) };
    const { error } = await context.supabase.from("lore_entries").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeVersion(context, data.id, before, patch);
    return { ok: true };
  });

export const deleteLoreEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ id: z.string().uuid(), permanent: z.boolean().optional().default(false) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.permanent) {
      const { data: before } = await context.supabase
        .from("lore_entries")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      const patch = { cms_status: "trash" as EntryStatus, status: "arquivado" };
      const { error } = await context.supabase.from("lore_entries").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
      await writeVersion(context, data.id, before, patch);
      return { ok: true };
    }
    const { error } = await context.supabase
      .from("lore_entries")
      .delete()
      .eq("id", data.id)
      .eq("cms_status", "trash");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertLoreRelation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => relationSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload = {
      from_entry: data.from_entry,
      to_entry: data.to_entry,
      relation_type: data.relation_type,
      notes: data.notes || null,
    };
    const query = data.id
      ? context.supabase.from("lore_relations").update(payload).eq("id", data.id)
      : context.supabase.from("lore_relations").insert(payload);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLoreRelation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("lore_relations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restoreLoreVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ versionId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: version, error } = await context.supabase
      .from("lore_entry_versions")
      .select("entry_id, snapshot")
      .eq("id", data.versionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!version) throw new Error("Versão não encontrada.");
    const snapshot = version.snapshot as Record<string, unknown>;
    const { data: before } = await context.supabase
      .from("lore_entries")
      .select("*")
      .eq("id", version.entry_id)
      .maybeSingle();
    const { error: updateError } = await context.supabase
      .from("lore_entries")
      .update(snapshot)
      .eq("id", version.entry_id);
    if (updateError) throw new Error(updateError.message);
    await writeVersion(context, version.entry_id, before, snapshot);
    return { ok: true };
  });

export const getCmsDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const [entries, categories, npcs, eventos, dominios, vestigios, versions] = await Promise.all([
      context.supabase.from("lore_entries").select("category, cms_status, status, tags"),
      context.supabase.from("lore_entries").select("category"),
      context.supabase
        .from("lore_entries")
        .select("id", { count: "exact", head: true })
        .eq("category", "npc"),
      context.supabase
        .from("lore_entries")
        .select("id", { count: "exact", head: true })
        .eq("category", "evento"),
      context.supabase
        .from("lore_entries")
        .select("id", { count: "exact", head: true })
        .eq("category", "dominio"),
      context.supabase
        .from("lore_entries")
        .select("id", { count: "exact", head: true })
        .eq("category", "vestigio"),
      context.supabase
        .from("lore_entry_versions")
        .select(
          "id, entry_id, author_id, changed_fields, created_at, entry:lore_entries(title, slug)",
        )
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    if (entries.error) throw new Error(entries.error.message);
    const statusCounts: Record<string, number> = {};
    const tagSet = new Set<string>();
    for (const row of entries.data ?? []) {
      const status = legacyStatusToCms(String(row.cms_status ?? row.status));
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
      for (const tag of row.tags ?? []) tagSet.add(tag);
    }
    return {
      documents: entries.data?.length ?? 0,
      npcs: npcs.count ?? 0,
      eventos: eventos.count ?? 0,
      dominios: dominios.count ?? 0,
      vestigios: vestigios.count ?? 0,
      categories: new Set(
        ((categories.data ?? []) as Array<{ category: string }>).map((row) => row.category),
      ).size,
      tags: tagSet.size,
      drafts: statusCounts.draft ?? 0,
      archived: statusCounts.archived ?? 0,
      obsolete: statusCounts.obsolete ?? 0,
      trash: statusCounts.trash ?? 0,
      latest: versions.data ?? [],
    };
  });

export const listUsersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const rolesByUser: Record<string, string[]> = {};
    for (const r of roles ?? [])
      rolesByUser[r.user_id] = [...(rolesByUser[r.user_id] ?? []), r.role];
    const emailsByUser: Record<string, string | null> = {};
    try {
      const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      for (const u of usersList?.users ?? []) emailsByUser[u.id] = u.email ?? null;
    } catch {
      // Email can be unavailable depending on service-role configuration.
    }
    return (profiles ?? []).map((p) => ({
      ...p,
      email: emailsByUser[p.id] ?? null,
      roles: rolesByUser[p.id] ?? [],
    }));
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
    await assertAdmin(context);
    if (data.role === "fundador") {
      const { data: isFundador } = await context.supabase.rpc("is_fundador", {
        _user_id: context.userId,
      });
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
