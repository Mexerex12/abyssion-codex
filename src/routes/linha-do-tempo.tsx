import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ClearanceBadge } from "@/components/lore-card";
import { listTimeline } from "@/lib/lore.functions";

export const Route = createFileRoute("/linha-do-tempo")({
  loader: () => listTimeline(),
  head: () => ({
    meta: [
      { title: "Linha do Tempo — União Trivalente" },
      { name: "description", content: "Cronologia dos eventos catalogados do universo Abyssion SMP." },
    ],
  }),
  component: Timeline,
});

function Timeline() {
  const fetch = useServerFn(listTimeline);
  const { data } = useSuspenseQuery({ queryKey: ["timeline"], queryFn: () => fetch() });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 pt-10 pb-16">
        <p className="hud-label">Cronologia Oficial · União Trivalente</p>
        <h1 className="mt-2 text-display text-4xl font-bold md:text-5xl">Linha do Tempo</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Eventos catalogados em ordem cronológica. Registros novos são adicionados conforme aprovados pelo Alto Conselho.
        </p>
        <div className="hud-divider mt-6" />

        <div className="relative mt-10">
          <div className="absolute left-4 top-2 bottom-2 w-px bg-border md:left-1/2" />
          <ol className="space-y-10">
            {data.map((ev, i) => (
              <li key={ev.id} className={`relative flex flex-col md:flex-row md:items-start ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                <div className="absolute left-4 top-3 z-10 -translate-x-1/2 md:left-1/2">
                  <div className="grid h-3 w-3 place-items-center border border-cyan bg-background">
                    <div className="h-1 w-1 bg-cyan" />
                  </div>
                </div>
                <div className="pl-10 md:w-1/2 md:pl-0 md:pr-12">
                  {i % 2 === 0 ? (
                    <TimelineCard ev={ev} side="left" />
                  ) : (
                    <div className="hidden md:block" />
                  )}
                </div>
                <div className={`pl-10 md:w-1/2 ${i % 2 === 0 ? "md:hidden" : "md:pl-12"}`}>
                  <TimelineCard ev={ev} side="right" />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function TimelineCard({ ev, side }: { ev: { slug: string; title: string; summary: string | null; timeline_date: string | null; clearance: string }; side: "left" | "right" }) {
  return (
    <Link
      to="/wiki/$slug"
      params={{ slug: ev.slug }}
      className={`group block border border-border bg-surface-1 p-5 transition-all hover:border-cyan/60 ${side === "left" ? "md:text-right" : ""}`}
    >
      <div className={`flex items-center gap-2 ${side === "left" ? "md:justify-end" : ""}`}>
        <span className="text-mono text-[11px] uppercase tracking-[0.18em] text-cyan">
          {ev.timeline_date ?? "Data desconhecida"}
        </span>
        <ClearanceBadge level={ev.clearance as "publico"} />
      </div>
      <h3 className="mt-2 text-display text-lg font-semibold group-hover:text-cyan">
        {ev.title}
      </h3>
      {ev.summary && <p className="mt-2 text-sm text-muted-foreground">{ev.summary}</p>}
    </Link>
  );
}
