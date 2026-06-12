import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const slugSchema = z.object({ slug: z.string().min(1).max(120) });
const categorySchema = z.object({ category: z.string().min(1).max(40) });

export const listLoreEntries = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({
        category: z.string().optional(),
        clearanceMax: z.enum(["publico", "nivel_2", "all"]).optional().default("all"),
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
      .eq("status", "publicado")
      .order("title", { ascending: true })
      .limit(data.limit);

    if (data.category) q = q.eq("category", data.category as never);
    if (data.clearanceMax === "publico") q = q.eq("clearance", "publico");
    else if (data.clearanceMax === "nivel_2") q = q.in("clearance", ["publico", "nivel_1", "nivel_2"]);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getLoreEntry = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => slugSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: entry, error } = await supabaseAdmin
      .from("lore_entries")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "publicado")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!entry) return null;

    const { data: outgoing } = await supabaseAdmin
      .from("lore_relations")
      .select("relation_type, to:lore_entries!lore_relations_to_entry_fkey(id, slug, title, category, clearance)")
      .eq("from_entry", entry.id);

    const { data: incoming } = await supabaseAdmin
      .from("lore_relations")
      .select("relation_type, from:lore_entries!lore_relations_from_entry_fkey(id, slug, title, category, clearance)")
      .eq("to_entry", entry.id);

    return { entry, outgoing: outgoing ?? [], incoming: incoming ?? [] };
  });

export const listTimeline = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("lore_entries")
    .select("id, slug, title, summary, timeline_date, timeline_order, clearance")
    .eq("category", "evento")
    .eq("status", "publicado")
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
      .eq("status", "publicado")
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listClassified = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("lore_entries")
    .select("id, slug, title, summary, category, clearance, updated_at")
    .in("clearance", ["nivel_1", "nivel_2", "nivel_3", "nivel_4", "nivel_diretor"])
    .eq("status", "publicado")
    .order("clearance", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("lore_entries")
    .select("category", { count: "exact" });
  if (error) throw new Error(error.message);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.category] = (counts[row.category] ?? 0) + 1;
  return { total: data?.length ?? 0, byCategory: counts };
});
