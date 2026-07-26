import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ClearanceBadge, CategoryBadge } from "@/components/lore-card";
import { getLoreEntry } from "@/lib/lore.functions";
import { renderMarkdownWithToc } from "@/lib/markdown";
import { CATEGORY_META, isClassified } from "@/lib/lore-meta";
import { ArrowLeft, Calendar, Tag, ChevronRight, List } from "lucide-react";

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

  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(".prose-doc h2[id], .prose-doc h3[id]"),
    );
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId((visible[0].target as HTMLElement).id);
      },
      { rootMargin: "-88px 0px -70% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [data?.entry?.id]);

  if (!data) return null;
  const { entry, outgoing, incoming } = data;
  const classified = isClassified(entry.clearance);
  const { html, toc } = renderMarkdownWithToc(entry.body);

  const catMeta = CATEGORY_META[entry.category as keyof typeof CATEGORY_META];

  const byType: Record<string, typeof outgoing> = {};
  for (const r of outgoing) byType[r.relation_type] = [...(byType[r.relation_type] ?? []), r];
  const incomingByType: Record<string, typeof incoming> = {};
  for (const r of incoming)
    incomingByType[r.relation_type] = [...(incomingByType[r.relation_type] ?? []), r];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-[1400px] px-6 pt-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <Link to="/" className="hover:text-cyan">
            Arquivos
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/wiki" className="hover:text-cyan">
            Enciclopédia
          </Link>
          <ChevronRight className="h-3 w-3" />
          {catMeta && (
            <>
              <Link
                to="/categoria/$category"
                params={{ category: entry.category }}
                className="hover:text-cyan"
              >
                {catMeta.plural}
              </Link>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="truncate text-foreground/80">{entry.title}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
          <article className="min-w-0">
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
                {classified ? (
                  <span className="bg-foreground/90 px-1.5 text-background">{entry.title}</span>
                ) : (
                  entry.title
                )}
              </h1>
              {entry.subtitle && (
                <p className="mt-3 text-lg text-muted-foreground">{entry.subtitle}</p>
              )}
              {entry.summary && (
                <p className="mt-6 border-l-2 border-cyan/60 pl-4 text-[15px] leading-relaxed text-foreground/85">
                  {entry.summary}
                </p>
              )}
            </header>

            {classified && (
              <div className="mt-3 border border-destructive/60 bg-destructive/10 p-4 classified-stripe">
                <p className="text-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-destructive">
                  DOCUMENTO RESTRITO · {catMeta?.label ?? entry.category}
                </p>
              </div>
            )}

            {html && (
              <div className="mx-auto mt-10 max-w-[72ch]">
                <div className="prose-doc" dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            )}

            {entry.tags && entry.tags.length > 0 && (
              <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-border pt-6">
                <Tag className="h-3 w-3 text-muted-foreground" />
                {entry.tags.map((t) => (
                  <span
                    key={t}
                    className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                  >
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
                    <RelGroup
                      key={`out-${type}`}
                      title={prettyRel(type)}
                      rels={rels.map((r) => r.to).filter(Boolean) as RelTarget[]}
                    />
                  ))}
                  {Object.entries(incomingByType).map(([type, rels]) => (
                    <RelGroup
                      key={`in-${type}`}
                      title={`${prettyRel(type)} (referenciado por)`}
                      rels={rels.map((r) => r.from).filter(Boolean) as RelTarget[]}
                    />
                  ))}
                </div>
              </section>
            )}

            <div className="mt-14 border-t border-border pt-6">
              <Link
                to="/wiki"
                className="inline-flex items-center gap-2 text-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-cyan"
              >
                <ArrowLeft className="h-3 w-3" /> Voltar à Enciclopédia
              </Link>
            </div>
          </article>

          {/* Sticky sidebar: table of contents (desktop only) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              {toc.length > 0 ? (
                <nav className="border-l border-border pl-4">
                  <p className="mb-3 flex items-center gap-1.5 text-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
                    <List className="h-3 w-3" /> Neste registro
                  </p>
                  <ul className="space-y-1.5">
                    {toc.map((item) => {
                      const active = activeId === item.id;
                      return (
                        <li key={item.id} className={item.level === 3 ? "pl-3" : ""}>
                          <a
                            href={`#${item.id}`}
                            className={`block truncate text-sm transition-colors ${
                              active ? "text-cyan" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {item.text}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              ) : (
                <div className="border-l border-border pl-4">
                  <p className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Sem seções indexadas
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
      <style>{`
        html { scroll-behavior: smooth; scroll-padding-top: 88px; }
        .prose-doc { color: var(--color-foreground); line-height: 1.8; font-size: 1.0625rem; }
        .prose-doc h2, .prose-doc h3 { font-family: var(--font-display); font-weight: 600; scroll-margin-top: 88px; color: var(--color-foreground); }
        .prose-doc h2 { font-size: 1.65rem; margin-top: 2.2em; margin-bottom: 0.6em; border-bottom: 1px solid var(--color-border); padding-bottom: 0.35em; letter-spacing: -0.01em; }
        .prose-doc h3 { font-size: 1.2rem; margin-top: 1.8em; margin-bottom: 0.4em; color: var(--color-cyan); }
        .prose-doc p { margin: 1.1em 0; }
        .prose-doc strong { color: var(--color-foreground); font-weight: 600; }
        .prose-doc em { color: var(--color-cyan); font-style: italic; }
        .prose-doc blockquote { border-left: 3px solid var(--color-cyan); background: var(--color-surface-1); padding: 1em 1.25em; margin: 1.5em 0; color: var(--color-foreground); }
        .prose-doc ul, .prose-doc ol { padding-left: 1.5em; margin: 1em 0; }
        .prose-doc li { margin: 0.5em 0; }
        .prose-doc li::marker { color: var(--color-cyan); }
        .prose-doc a { color: var(--color-cyan); text-decoration: underline; text-underline-offset: 3px; }
        .prose-doc code { font-family: var(--font-mono); background: var(--color-surface-2); padding: 0.1em 0.35em; font-size: 0.9em; }
        .prose-doc hr { border: 0; border-top: 1px solid var(--color-border); margin: 2.5em 0; }
        .prose-doc mark { background: oklch(0.78 0.13 210 / 0.25); color: var(--color-foreground); padding: 0.05em 0.2em; }
        .prose-doc img { border: 1px solid var(--color-border); margin: 1.5em 0; }
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
