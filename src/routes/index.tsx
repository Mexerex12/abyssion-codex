import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { listLoreEntries, listTimeline } from "@/lib/lore.functions";
import { CATEGORY_META, isClassified } from "@/lib/lore-meta";
import type { LoreCategory } from "@/lib/lore-meta";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Abyssion SMP · Arquivos da União Trivalente" },
      { name: "description", content: "Enciclopédia oficial da lore do universo Abyssion SMP." },
      { property: "og:title", content: "Abyssion SMP · Arquivos da União Trivalente" },
      { property: "og:description", content: "Enciclopédia oficial da lore do universo Abyssion SMP." },
    ],
  }),
  loader: async () => {
    const [entries, timeline] = await Promise.all([listLoreEntries({ data: {} }), listTimeline()]);
    return { entries, timeline };
  },
  component: Home,
  errorComponent: () => <p className="p-10 text-center">Falha ao carregar.</p>,
  notFoundComponent: () => <p className="p-10 text-center">Não encontrado.</p>,
});

// Ordered display of categories on the index (only those with content are rendered).
const INDEX_ORDER: LoreCategory[] = [
  "universo",
  "historia",
  "faccao",
  "dominio",
  "bastiao",
  "classe",
  "esquadrao",
  "npc",
  "regente",
  "curador",
  "personagem_historico",
  "vestigio",
  "ruptura",
  "evento",
  "documento_restrito",
];

function Home() {
  const fetchEntries = useServerFn(listLoreEntries);
  const fetchTimeline = useServerFn(listTimeline);
  const entries = useSuspenseQuery({ queryKey: ["lore", "all"], queryFn: () => fetchEntries({ data: {} }) });
  const timeline = useSuspenseQuery({ queryKey: ["timeline"], queryFn: () => fetchTimeline() });

  const { counts, recent } = useMemo(() => {
    const list = entries.data ?? [];
    const c: Partial<Record<LoreCategory, number>> = {};
    for (const e of list) c[e.category] = (c[e.category] ?? 0) + 1;
    const r = [...list]
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      .slice(0, 6);
    return { counts: c, recent: r };
  }, [entries.data]);

  const total = entries.data?.length ?? 0;
  const lastEvent = timeline.data?.[timeline.data.length - 1];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, oklch(0.78 0.13 210) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.78 0.13 210) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:py-28">
          <div>
            <p className="hud-label text-cyan">Arquivo Aberto · União Trivalente</p>
            <h1 className="mt-4 text-display text-5xl font-bold leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
              Arquivos da<br />
              <span className="text-cyan">União Trivalente</span>
            </h1>
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <Link
                to="/wiki"
                className="border border-cyan bg-cyan px-5 py-2.5 text-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-foreground hover:bg-cyan/90"
              >
                Enciclopédia
              </Link>
              <Link
                to="/linha-do-tempo"
                className="border border-border px-5 py-2.5 text-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:border-foreground hover:text-foreground"
              >
                Linha do Tempo
              </Link>
              <Link
                to="/arquivos-restritos"
                className="border border-border px-5 py-2.5 text-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:border-destructive hover:text-destructive"
              >
                Restritos
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 border border-border bg-surface-1 p-4 md:grid-cols-3 lg:grid-cols-2">
            <Stat label="Registros" value={total} />
            <Stat label="Categorias" value={Object.keys(counts).length} />
            <Stat label="Eventos" value={timeline.data?.length ?? 0} />
            <Stat
              label="Último evento"
              value={lastEvent?.timeline_date ?? "—"}
              small
            />
          </dl>
        </div>
      </section>

      {/* CATEGORY INDEX */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <SectionHead
          eyebrow="Índice"
          title="Categorias catalogadas"
          hint={`${Object.keys(counts).length} de ${INDEX_ORDER.length}`}
        />
        <div className="mt-6 grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-4">
          {INDEX_ORDER.filter((k) => (counts[k] ?? 0) > 0).map((k) => {
            const meta = CATEGORY_META[k];
            const tone = meta.color === "alert" ? "text-destructive" : "text-cyan";
            return (
              <Link
                key={k}
                to="/categoria/$category"
                params={{ category: k }}
                className="group flex items-end justify-between bg-background p-5 transition-colors hover:bg-surface-1"
              >
                <div>
                  <p className={`text-mono text-[10px] uppercase tracking-[0.18em] ${tone}`}>
                    {meta.label}
                  </p>
                  <p className="mt-2 text-display text-3xl font-bold">{counts[k]}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-cyan" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* RECENT + TIMELINE PREVIEW */}
      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-24 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SectionHead eyebrow="Atualizações" title="Recentes" />
          <ul className="mt-6 divide-y divide-border border border-border bg-surface-1">
            {recent.map((e) => {
              const classified = isClassified(e.clearance);
              return (
                <li key={e.id}>
                  <Link
                    to="/wiki/$slug"
                    params={{ slug: e.slug }}
                    className="group flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-2"
                  >
                    <div className="min-w-0">
                      <p className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {CATEGORY_META[e.category as LoreCategory]?.label ?? e.category}
                      </p>
                      <p className="mt-0.5 truncate text-display text-sm font-semibold group-hover:text-cyan">
                        {classified ? (
                          <span className="bg-foreground/90 px-1 text-background">{e.title}</span>
                        ) : (
                          e.title
                        )}
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-cyan" />
                  </Link>
                </li>
              );
            })}
            {recent.length === 0 && (
              <li className="px-4 py-6 text-center text-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Nenhum registro.
              </li>
            )}
          </ul>
        </div>

        <div>
          <SectionHead eyebrow="Cronologia" title="Último evento" />
          {lastEvent ? (
            <Link
              to="/wiki/$slug"
              params={{ slug: lastEvent.slug }}
              className="group mt-6 block border border-border bg-surface-1 p-6 hover:border-cyan/60"
            >
              <p className="text-mono text-[11px] uppercase tracking-[0.18em] text-cyan">
                {lastEvent.timeline_date ?? "Data desconhecida"}
              </p>
              <h3 className="mt-2 text-display text-xl font-semibold group-hover:text-cyan">
                {lastEvent.title}
              </h3>
              {lastEvent.summary && (
                <p className="mt-3 line-clamp-4 text-sm text-muted-foreground">{lastEvent.summary}</p>
              )}
              <p className="mt-6 text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground group-hover:text-cyan">
                Ver na linha do tempo →
              </p>
            </Link>
          ) : (
            <p className="mt-6 border border-dashed border-border bg-surface-1 px-6 py-10 text-center text-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Nenhum evento catalogado.
            </p>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function SectionHead({ eyebrow, title, hint }: { eyebrow: string; title: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
      <div>
        <p className="hud-label text-cyan">{eyebrow}</p>
        <h2 className="mt-1 text-display text-2xl font-bold md:text-3xl">{title}</h2>
      </div>
      {hint && (
        <p className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="border-l-2 border-cyan/60 px-3 py-2">
      <p className="text-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-display font-bold ${small ? "text-sm" : "text-2xl"}`}>{value}</p>
    </div>
  );
}
