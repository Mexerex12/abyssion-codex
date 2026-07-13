import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  legacyClearanceToClassification,
  legacyClearanceToVisibility,
  legacyStatusToCms,
} from "@/cms/permissions/policy";

const slugSchema = z.object({ slug: z.string().min(1).max(120) });
const categorySchema = z.object({ category: z.string().min(1).max(40) });

type PublicLoreRow = {
  clearance?: string | null;
  classification?: string | null;
  visibility?: string | null;
  cms_status?: string | null;
  status?: string | null;
  [key: string]: unknown;
};

type PublicRelation = {
  to?: PublicLoreRow | null;
  from?: PublicLoreRow | null;
  [key: string]: unknown;
};

type SupabaseErrorLike = {
  message?: string;
  code?: string;
};

function isMissingCmsColumns(error: SupabaseErrorLike | null | undefined) {
  const message = error?.message ?? "";
  return (
    message.includes("cms_status") ||
    message.includes("visibility") ||
    message.includes("classification")
  );
}

function normalizePublicRow<T extends PublicLoreRow>(row: T) {
  return {
    ...row,
    classification: legacyClearanceToClassification(row.classification ?? row.clearance),
    visibility: legacyClearanceToVisibility(row.visibility ?? row.clearance),
    status: legacyStatusToCms(row.cms_status ?? row.status ?? "published"),
  };
}

function visibleTarget(target?: PublicLoreRow | null) {
  if (!target) return false;
  if (target.visibility || target.cms_status) {
    return target.visibility === "public" && target.cms_status === "published";
  }
  return target.clearance === "publico" && (target.status === "publicado" || !target.status);
}

export const listLoreEntries = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({
        category: z.string().optional(),
        limit: z.number().int().min(1).max(500).optional().default(200),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const select =
      "id, slug, category, title, subtitle, summary, cover_image_url, clearance, classification, visibility, cms_status, status, timeline_date, timeline_order, tags, updated_at";
    const legacySelect =
      "id, slug, category, title, subtitle, summary, cover_image_url, clearance, status, timeline_date, timeline_order, tags, updated_at";
    let q = supabaseAdmin
      .from("lore_entries")
      .select(select)
      .eq("cms_status", "published")
      .eq("visibility", "public")
      .order("title", { ascending: true })
      .limit(data.limit);

    if (data.category) q = q.eq("category", data.category as never);

    let { data: rows, error } = await q;
    if (isMissingCmsColumns(error)) {
      let fallback = supabaseAdmin
        .from("lore_entries")
        .select(legacySelect)
        .eq("status", "publicado")
        .eq("clearance", "publico")
        .order("title", { ascending: true })
        .limit(data.limit);
      if (data.category) fallback = fallback.eq("category", data.category as never);
      const fallbackResult = await fallback;
      rows = fallbackResult.data;
      error = fallbackResult.error;
    }
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => normalizePublicRow(row));
  });

export const getLoreEntry = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => slugSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let usingLegacySchema = false;
    let { data: entry, error } = await supabaseAdmin
      .from("lore_entries")
      .select("*")
      .eq("slug", data.slug)
      .eq("cms_status", "published")
      .eq("visibility", "public")
      .maybeSingle();
    if (isMissingCmsColumns(error)) {
      usingLegacySchema = true;
      const fallbackResult = await supabaseAdmin
        .from("lore_entries")
        .select("*")
        .eq("slug", data.slug)
        .eq("status", "publicado")
        .eq("clearance", "publico")
        .maybeSingle();
      entry = fallbackResult.data;
      error = fallbackResult.error;
    }
    if (error) throw new Error(error.message);
    if (!entry) return null;

    const outgoingSelect = usingLegacySchema
      ? "relation_type, to:lore_entries!lore_relations_to_entry_fkey(id, slug, title, category, clearance, status)"
      : "relation_type, to:lore_entries!lore_relations_to_entry_fkey(id, slug, title, category, clearance, visibility, classification, cms_status, status)";
    const incomingSelect = usingLegacySchema
      ? "relation_type, from:lore_entries!lore_relations_from_entry_fkey(id, slug, title, category, clearance, status)"
      : "relation_type, from:lore_entries!lore_relations_from_entry_fkey(id, slug, title, category, clearance, visibility, classification, cms_status, status)";
    const { data: outgoing } = await supabaseAdmin
      .from("lore_relations")
      .select(outgoingSelect)
      .eq("from_entry", entry.id);

    const { data: incoming } = await supabaseAdmin
      .from("lore_relations")
      .select(incomingSelect)
      .eq("to_entry", entry.id);

    return {
      entry: normalizePublicRow(entry),
      outgoing: ((outgoing ?? []) as PublicRelation[]).filter((rel) => visibleTarget(rel.to)),
      incoming: ((incoming ?? []) as PublicRelation[]).filter((rel) => visibleTarget(rel.from)),
    };
  });

export const listTimeline = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let { data, error } = await supabaseAdmin
    .from("lore_entries")
    .select("id, slug, title, summary, timeline_date, timeline_order, clearance")
    .eq("category", "evento")
    .eq("cms_status", "published")
    .eq("visibility", "public")
    .order("timeline_order", { ascending: true, nullsFirst: false });
  if (isMissingCmsColumns(error)) {
    const fallbackResult = await supabaseAdmin
      .from("lore_entries")
      .select("id, slug, title, summary, timeline_date, timeline_order, clearance, status")
      .eq("category", "evento")
      .eq("status", "publicado")
      .eq("clearance", "publico")
      .order("timeline_order", { ascending: true, nullsFirst: false });
    data = fallbackResult.data;
    error = fallbackResult.error;
  }
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listByCategory = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => categorySchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let { data: rows, error } = await supabaseAdmin
      .from("lore_entries")
      .select(
        "id, slug, category, title, subtitle, summary, clearance, classification, visibility, cms_status, status, tags, updated_at",
      )
      .eq("category", data.category as never)
      .eq("cms_status", "published")
      .eq("visibility", "public")
      .order("title", { ascending: true });
    if (isMissingCmsColumns(error)) {
      const fallbackResult = await supabaseAdmin
        .from("lore_entries")
        .select("id, slug, category, title, subtitle, summary, clearance, status, tags, updated_at")
        .eq("category", data.category as never)
        .eq("status", "publicado")
        .eq("clearance", "publico")
        .order("title", { ascending: true });
      rows = fallbackResult.data;
      error = fallbackResult.error;
    }
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => normalizePublicRow(row));
  });

export const listClassified = createServerFn({ method: "GET" }).handler(async () => {
  return [];
});

export const getStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let { data, error } = await supabaseAdmin
    .from("lore_entries")
    .select("category", { count: "exact" })
    .eq("cms_status", "published")
    .eq("visibility", "public");
  if (isMissingCmsColumns(error)) {
    const fallbackResult = await supabaseAdmin
      .from("lore_entries")
      .select("category", { count: "exact" })
      .eq("status", "publicado")
      .eq("clearance", "publico");
    data = fallbackResult.data;
    error = fallbackResult.error;
  }
  if (error) throw new Error(error.message);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.category] = (counts[row.category] ?? 0) + 1;
  return { total: data?.length ?? 0, byCategory: counts };
});
