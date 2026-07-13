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
    let q = supabaseAdmin
      .from("lore_entries")
      .select(
        "id, slug, category, title, subtitle, summary, cover_image_url, clearance, timeline_date, timeline_order, tags, updated_at",
      )
      .eq("cms_status", "published")
      .eq("visibility", "public")
      .order("title", { ascending: true })
      .limit(data.limit);

    if (data.category) q = q.eq("category", data.category as never);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => ({
      ...row,
      classification: legacyClearanceToClassification(row.classification ?? row.clearance),
      visibility: legacyClearanceToVisibility(row.visibility ?? row.clearance),
      status: legacyStatusToCms(row.cms_status ?? "published"),
    }));
  });

export const getLoreEntry = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => slugSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: entry, error } = await supabaseAdmin
      .from("lore_entries")
      .select("*")
      .eq("slug", data.slug)
      .eq("cms_status", "published")
      .eq("visibility", "public")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!entry) return null;

    const { data: outgoing } = await supabaseAdmin
      .from("lore_relations")
      .select(
        "relation_type, to:lore_entries!lore_relations_to_entry_fkey(id, slug, title, category, clearance, visibility, classification, cms_status)",
      )
      .eq("from_entry", entry.id);

    const { data: incoming } = await supabaseAdmin
      .from("lore_relations")
      .select(
        "relation_type, from:lore_entries!lore_relations_from_entry_fkey(id, slug, title, category, clearance, visibility, classification, cms_status)",
      )
      .eq("to_entry", entry.id);

    const visibleTarget = (target?: PublicLoreRow | null) =>
      target?.visibility === "public" && target?.cms_status === "published";
    return {
      entry: {
        ...entry,
        classification: entry.classification ?? legacyClearanceToClassification(entry.clearance),
        visibility: entry.visibility ?? legacyClearanceToVisibility(entry.clearance),
        status: legacyStatusToCms(entry.cms_status ?? entry.status),
      },
      outgoing: ((outgoing ?? []) as PublicRelation[]).filter((rel) => visibleTarget(rel.to)),
      incoming: ((incoming ?? []) as PublicRelation[]).filter((rel) => visibleTarget(rel.from)),
    };
  });

export const listTimeline = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("lore_entries")
    .select("id, slug, title, summary, timeline_date, timeline_order, clearance")
    .eq("category", "evento")
    .eq("cms_status", "published")
    .eq("visibility", "public")
    .order("timeline_order", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listByCategory = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => categorySchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("lore_entries")
      .select("id, slug, category, title, subtitle, summary, clearance, tags, updated_at")
      .eq("category", data.category as never)
      .eq("cms_status", "published")
      .eq("visibility", "public")
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listClassified = createServerFn({ method: "GET" }).handler(async () => {
  return [];
});

export const getStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("lore_entries")
    .select("category", { count: "exact" })
    .eq("cms_status", "published")
    .eq("visibility", "public");
  if (error) throw new Error(error.message);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.category] = (counts[row.category] ?? 0) + 1;
  return { total: data?.length ?? 0, byCategory: counts };
});
