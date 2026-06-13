import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ClearanceBadge, CategoryBadge } from "@/components/lore-card";
import { getLoreEntry } from "@/lib/lore.functions";
import { renderMarkdown } from "@/lib/markdown";
import { CATEGORY_META, isClassified } from "@/lib/lore-meta";
import { ArrowLeft, Calendar, Tag } from "lucide-react";

export const Route = createFileRoute("/wiki/$slug")({
  loader: async ({ params }) => {
    const res = await getLoreEntry({ data: { slug: params.slug } });
    if (!res) throw notFound();
    return res;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.entry.title} | Arquivos da União Trivalente` },
          {
            name: "description",
            content: loaderData.entry.summary ?? `Registro oficial: ${loaderData.entry.title}`,
          },
          { property: "og:title", content: loaderData.entry.title },
          { property: "og:description", content: loaderData.entry.summary ?? "" },
        ]
      : [{ title: "Documento" }],
  }),
  component: Entry,
});

function Entry() {
  const fetchEntry = useServerFn(getLoreEntry);
  const params = Route.useParams();
  const { data } = useSuspenseQuery({
    queryKey: ["entry", params.slug],
    queryFn: () => fetchEntry({ data: { slug: params.slug } }),
  });

  if (!data) return null;
  const { entry, outgoing, incoming } = data;
  const classified = isClassified(entry.clearance);
  const html = renderMarkdown(entry.body);

  // Group relations
  const byType: Record<string, typeof outgoing> = {};
  for (const r of outgoing) {
    byType[r.relation_type] = [...(byType[r.relation_type] ?? []), r];
  }
  const incomingByType: Record<string, typeof incoming> = {};
  for (const r of incoming) {
    incomingByType[r.relation_type] = [...(incomingByType[r.relation_type] ?? []), r];
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 pt-10">
        <Link
          to="/wiki"
          className="inline-flex items-center gap-2 text-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-cyan"
        >
          <ArrowLeft className="h-3 w-3" /> Voltar aos Arquivos
        </Link>

        <article className="mt-6">
          <header className="border border-border bg-surface-1 p-6 md:p-10">
            <div className="flex flex-wrap items-center gap-3">
              <CategoryBadge category={entry.category} />
              <ClearanceBadge level={entry.clearance} />
              {entry.timeline_date && (
                <span className="flex items-center gap-1.5 text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <Calendar className="h-3 w-3" /> {entry.timeline_date}
                </span>
              )}
            </div>
            <h1 className="mt-5 text-display text-3xl font-bold leading-tight md:text-5xl">
              {classified ? <span className="bg-foreground/90 px-1.5 text-background">{entry.title}</span> : entry.title}
            </h1>
            {entry.subtitle && (
              <p className="mt-3 text-lg text-muted-foreground">{entry.subtitle}</p>
            )}
            {entry.summary && (
              <p className="mt-5 border-l-2 border-cyan/60 pl-4 text-foreground/80">
                {entry.summary}
              </p>
            )}
          </header>

          {classified && (
            <div className="mt-3 border border-destructive/60 bg-destructive/10 p-4 classified-stripe">
              <p className="text-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-destructive">
                ⚠ DOCUMENTO RESTRITO · {CATEGORY_META[entry.category].label}
              </p>
              <p className="mt-1 text-sm text-foreground/80">
                A divulgação não autorizada deste registro constitui quebra de protocolo nível S.
              </p>
            </div>
          )}

          {html && (
            <div
              className="prose-doc mt-8"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}

          {entry.tags && entry.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap items-center gap-2">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {entry.tags.map((t) => (
                <span key={t} className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {(outgoing.length > 0 || incoming.length > 0) && (
            <section className="mt-12">
              <p className="hud-label">Conexões catalogadas</p>
              <div className="hud-divider mt-2" />
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                {Object.entries(byType).map(([type, rels]) => (
                  <RelGroup key={`out-${type}`} title={prettyRel(type)} rels={rels.map((r) => r.to).filter(Boolean) as RelTarget[]} />
                ))}
                {Object.entries(incomingByType).map(([type, rels]) => (
                  <RelGroup key={`in-${type}`} title={`${prettyRel(type)} (referenciado por)`} rels={rels.map((r) => r.from).filter(Boolean) as RelTarget[]} />
                ))}
              </div>
            </section>
          )}
        </article>
      </main>
      <SiteFooter />
      <style>{`
        .prose-doc { color: var(--color-foreground); line-height: 1.75; font-size: 1rem; }
        .prose-doc h1, .prose-doc h2, .prose-doc h3 { font-family: var(--font-display); font-weight: 600; margin-top: 2em; margin-bottom: 0.6em; color: var(--color-foreground); }
        .prose-doc h2 { font-size: 1.6rem; border-bottom: 1px solid var(--color-border); padding-bottom: 0.3em; }
        .prose-doc h3 { font-size: 1.25rem; color: var(--color-cyan); }
        .prose-doc p { margin: 1em 0; }
        .prose-doc strong { color: var(--color-cyan); font-weight: 600; }
        .prose-doc blockquote { border-left: 3px solid var(--color-cyan); background: var(--color-surface-1); padding: 1em 1.25em; margin: 1.5em 0; font-style: italic; color: var(--color-foreground); }
        .prose-doc ul, .prose-doc ol { padding-left: 1.5em; margin: 1em 0; }
        .prose-doc li { margin: 0.4em 0; }
        .prose-doc a { color: var(--color-cyan); text-decoration: underline; }
        .prose-doc code { font-family: var(--font-mono); background: var(--color-surface-2); padding: 0.1em 0.3em; font-size: 0.9em; }
        .prose-doc hr { border: 0; border-top: 1px solid var(--color-border); margin: 2em 0; }
        .prose-doc mark { background: oklch(0.78 0.13 210 / 0.25); color: var(--color-foreground); padding: 0.05em 0.2em; }
      `}</style>
    </div>
  );
}

type RelTarget = { id: string; slug: string; title: string; category: string; clearance: string };

function RelGroup({ title, rels }: { title: string; rels: RelTarget[] }) {
  if (rels.length === 0) return null;
  return (
    <div className="border border-border bg-surface-1 p-4">
      <p className="hud-label text-cyan">{title}</p>
      <ul className="mt-3 space-y-1.5">
        {rels.map((r) => (
          <li key={r.id}>
            <Link
              to="/wiki/$slug"
              params={{ slug: r.slug }}
              className="group flex items-center justify-between border-b border-border/40 py-1.5 hover:border-cyan/60"
            >
              <span className="text-sm text-foreground group-hover:text-cyan">{r.title}</span>
              <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {CATEGORY_META[r.category as keyof typeof CATEGORY_META]?.label ?? r.category}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function prettyRel(type: string) {
  return type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
