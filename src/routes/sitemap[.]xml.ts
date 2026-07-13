import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let { data, error } = await supabaseAdmin
          .from("lore_entries")
          .select("slug, updated_at")
          .eq("cms_status", "published")
          .eq("visibility", "public");
        if (
          error &&
          (error.message.includes("cms_status") ||
            error.message.includes("visibility") ||
            error.message.includes("classification"))
        ) {
          const fallbackResult = await supabaseAdmin
            .from("lore_entries")
            .select("slug, updated_at")
            .eq("status", "publicado")
            .eq("clearance", "publico");
          data = fallbackResult.data;
          error = fallbackResult.error;
        }
        if (error) throw new Error(error.message);

        const staticPaths = [
          { path: "/", priority: "1.0", changefreq: "weekly" },
          { path: "/dashboard", priority: "0.9", changefreq: "weekly" },
          { path: "/wiki", priority: "0.9", changefreq: "daily" },
          { path: "/linha-do-tempo", priority: "0.8", changefreq: "weekly" },
        ];
        const entries = [
          ...staticPaths.map(
            (p) =>
              `<url><loc>${BASE_URL}${p.path}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`,
          ),
          ...(data ?? []).map(
            (e) =>
              `<url><loc>${BASE_URL}/wiki/${e.slug}</loc><lastmod>${new Date(e.updated_at).toISOString()}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
          ),
        ].join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
