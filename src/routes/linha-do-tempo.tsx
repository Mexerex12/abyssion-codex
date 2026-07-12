import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ClearanceBadge } from "@/components/lore-card";
import { listTimeline } from "@/lib/lore.functions";
import { ZoomIn, ZoomOut, Maximize2, LayoutList } from "lucide-react";

export const Route = createFileRoute("/linha-do-tempo")({
  loader: () => listTimeline(),
  head: () => ({
    meta: [
      { title: "Linha do Tempo Visual | União Trivalente" },
      { name: "description", content: "Cronologia visual com zoom dos eventos catalogados do universo Abyssion SMP." },
    ],
  }),
  component: Timeline,
});

type Event = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  timeline_date: string | null;
  timeline_order: number | null;
  clearance: string;
};

function parseYear(d: string | null): number | null {
  if (!d) return null;
  const m = d.match(/-?\d{1,4}/);
  return m ? parseInt(m[0], 10) : null;
}

function Timeline() {
  const fetch = useServerFn(listTimeline);
  const { data } = useSuspenseQuery({ queryKey: ["timeline"], queryFn: () => fetch() });
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<"visual" | "lista">("visual");
  const scrollRef = useRef<HTMLDivElement>(null);

  const events = data as Event[];

  const { positioned, minYear, maxYear, span } = useMemo(() => {
    const withYear = events
      .map((e) => ({ ev: e, year: parseYear(e.timeline_date) }))
      .filter((x): x is { ev: Event; year: number } => x.year !== null)
      .sort((a, b) => a.year - b.year);
    const undated = events.filter((e) => parseYear(e.timeline_date) === null);
    const yrs = withYear.map((x) => x.year);
    const min = yrs.length ? Math.min(...yrs) : 0;
    const max = yrs.length ? Math.max(...yrs) : 0;
    const s = Math.max(1, max - min);
    return { positioned: withYear, undated, minYear: min, maxYear: max, span: s };
  }, [events]);

  // Base pixel width per year at zoom=1
  const pxPerYear = 80 * zoom;
  const totalWidth = Math.max(1200, span * pxPerYear + 400);

  const yearTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = span > 200 ? 25 : span > 50 ? 10 : span > 20 ? 5 : 1;
    for (let y = Math.ceil(minYear / step) * step; y <= maxYear; y += step) ticks.push(y);
    return ticks;
  }, [minYear, maxYear, span]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 pt-10 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="hud-label">Cronologia Oficial · União Trivalente</p>
            <h1 className="mt-2 text-display text-4xl font-bold md:text-5xl">Linha do Tempo</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Visualização cronológica com zoom. Use os controles para expandir períodos densos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border">
              <button
                onClick={() => setMode("visual")}
                className={`grid h-8 w-9 place-items-center border-r border-border ${mode === "visual" ? "bg-cyan/15 text-cyan" : "text-muted-foreground hover:text-foreground"}`}
                title="Visual"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setMode("lista")}
                className={`grid h-8 w-9 place-items-center ${mode === "lista" ? "bg-cyan/15 text-cyan" : "text-muted-foreground hover:text-foreground"}`}
                title="Lista"
              >
                <LayoutList className="h-3.5 w-3.5" />
              </button>
            </div>
            {mode === "visual" && (
              <div className="flex items-center gap-2 border border-border px-2 py-1">
                <button
                  onClick={() => setZoom((z) => Math.max(0.3, z - 0.25))}
                  className="grid h-6 w-6 place-items-center text-muted-foreground hover:text-cyan"
                  title="Diminuir zoom"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <input
                  type="range"
                  min={0.3}
                  max={6}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="h-1 w-32 accent-cyan"
                />
                <button
                  onClick={() => setZoom((z) => Math.min(6, z + 0.25))}
                  className="grid h-6 w-6 place-items-center text-muted-foreground hover:text-cyan"
                  title="Aumentar zoom"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="hud-divider mt-6" />

        {mode === "visual" ? (
          <div
            ref={scrollRef}
            className="mt-8 overflow-x-auto border border-border bg-surface-1"
            style={{ scrollBehavior: "smooth" }}
          >
            <div className="relative" style={{ width: totalWidth, minHeight: 460 }}>
              {/* Year ruler */}
              <div className="sticky top-0 z-10 flex h-8 items-end border-b border-border bg-surface-1">
                {yearTicks.map((y) => {
                  const left = (y - minYear) * pxPerYear + 200;
                  return (
                    <div key={y} className="absolute" style={{ left }}>
                      <div className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        {y}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Central line */}
              <div className="absolute left-0 right-0 top-1/2 h-px bg-border" />

              {/* Grid ticks */}
              {yearTicks.map((y) => {
                const left = (y - minYear) * pxPerYear + 200;
                return (
                  <div
                    key={`tick-${y}`}
                    className="absolute top-8 bottom-0 w-px bg-border/40"
                    style={{ left }}
                  />
                );
              })}

              {/* Events */}
              {positioned.map((x, idx) => {
                const left = (x.year - minYear) * pxPerYear + 200;
                const above = idx % 2 === 0;
                return (
                  <div
                    key={x.ev.id}
                    className="absolute"
                    style={{
                      left,
                      top: above ? 44 : "calc(50% + 12px)",
                      transform: "translateX(-50%)",
                    }}
                  >
                    {/* Connector */}
                    <div
                      className={`absolute left-1/2 w-px bg-cyan/40 ${above ? "top-full" : "bottom-full"}`}
                      style={{ height: 40 }}
                    />
                    {/* Dot on line */}
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 grid h-3 w-3 place-items-center border border-cyan bg-background ${above ? "top-[calc(100%+38px)]" : "bottom-[calc(100%+38px)]"}`}
                    >
                      <div className="h-1 w-1 bg-cyan" />
                    </div>
                    <Link
                      to="/wiki/$slug"
                      params={{ slug: x.ev.slug }}
                      className="group block w-56 border border-border bg-background p-3 transition-all hover:border-cyan/60"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
                          {x.ev.timeline_date}
                        </span>
                        <ClearanceBadge level={x.ev.clearance as "publico"} />
                      </div>
                      <p className="mt-1 text-display text-sm font-semibold leading-tight group-hover:text-cyan">
                        {x.ev.title}
                      </p>
                      {x.ev.summary && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {x.ev.summary}
                        </p>
                      )}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <ol className="mt-8 space-y-4">
            {events.map((ev) => (
              <li key={ev.id}>
                <Link
                  to="/wiki/$slug"
                  params={{ slug: ev.slug }}
                  className="group block border border-border bg-surface-1 p-5 transition-all hover:border-cyan/60"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-mono text-[11px] uppercase tracking-[0.18em] text-cyan">
                      {ev.timeline_date ?? "Data desconhecida"}
                    </span>
                    <ClearanceBadge level={ev.clearance as "publico"} />
                  </div>
                  <h3 className="mt-2 text-display text-lg font-semibold group-hover:text-cyan">
                    {ev.title}
                  </h3>
                  {ev.summary && (
                    <p className="mt-2 text-sm text-muted-foreground">{ev.summary}</p>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        )}

        {events.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Nenhum evento catalogado.
          </p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
