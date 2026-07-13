import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { LoreCard } from "@/components/lore-card";
import { listLoreEntries } from "@/lib/lore.functions";
import { CATEGORY_META } from "@/lib/lore-meta";
import type { LoreCategory } from "@/lib/lore-meta";
import { Search, X } from "lucide-react";

export const Route = createFileRoute("/wiki/")({
  head: () => ({
    meta: [
      { title: "Enciclopédia | Arquivos da União Trivalente" },
      { name: "description", content: "Banco de dados completo da lore Abyssion SMP." },
    ],
  }),
  loader: () => listLoreEntries({ data: {} }),
  component: Wiki,
  errorComponent: () => <p className="p-10 text-center">Falha ao carregar.</p>,
  notFoundComponent: () => <p className="p-10 text-center">Não encontrado.</p>,
});

const GROUP_ORDER: LoreCategory[] = [
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

function Wiki() {
  const fetchEntries = useServerFn(listLoreEntries);
  const { data } = useSuspenseQuery({ queryKey: ["lore", "all"], queryFn: () => fetchEntries({ data: {} }) });
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"all" | LoreCategory>("all");

  const filtered = useMemo(() => {
    return (data ?? []).filter((e) => {
      if (cat !== "all" && e.category !== cat) return false;
      if (q) {
        const needle = q.toLowerCase();
        return (
          e.title.toLowerCase().includes(needle) ||
          (e.subtitle ?? "").toLowerCase().includes(needle) ||
          (e.summary ?? "").toLowerCase().includes(needle) ||
          (e.tags ?? []).some((t) => t.toLowerCase().includes(needle))
        );
      }
      return true;
    });
  }, [data, q, cat]);

  const grouped = useMemo(() => {
    const map: Partial<Record<LoreCategory, typeof filtered>> = {};
    for (const e of filtered) {
      const k = e.category as LoreCategory;
      (map[k] ||= []).push(e);
    }
    return GROUP_ORDER.filter((k) => (map[k]?.length ?? 0) > 0).map((k) => ({
      cat: k,
      items: map[k]!,
    }));
  }, [filtered]);

  const totalByCat = useMemo(() => {
    const m: Partial<Record<LoreCategory, number>> = {};
    for (const e of data ?? []) m[e.category as LoreCategory] = (m[e.category as LoreCategory] ?? 0) + 1;
    return m;
  }, [data]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 pt-10 pb-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="hud-label text-cyan">Enciclopédia</p>
            <h1 className="mt-2 text-display text-4xl font-bold md:text-5xl">Arquivos</h1>
          </div>
          <p className="text-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {filtered.length} de {data?.length ?? 0}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar por nome, tag ou resumo..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full border border-input bg-surface-1 py-2.5 pl-10 pr-10 text-sm focus:border-cyan focus:outline-none"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category chips */}
        <div className="mt-4 -mx-1 flex flex-wrap gap-1">
          <Chip active={cat === "all"} onClick={() => setCat("all")} count={data?.length ?? 0}>
            Todas
          </Chip>
          {GROUP_ORDER.filter((k) => (totalByCat[k] ?? 0) > 0).map((k) => (
            <Chip
              key={k}
              active={cat === k}
              onClick={() => setCat(k)}
              count={totalByCat[k] ?? 0}
              tone={CATEGORY_META[k].color === "alert" ? "alert" : "cyan"}
            >
              {CATEGORY_META[k].plural}
            </Chip>
          ))}
        </div>

        <div className="hud-divider mt-6" />

        {filtered.length === 0 ? (
          <p className="mt-16 border border-dashed border-border bg-surface-1 px-6 py-16 text-center text-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Nenhum arquivo encontrado.
          </p>
        ) : (
          <div className="mt-8 space-y-12">
            {grouped.map(({ cat: k, items }) => {
              const meta = CATEGORY_META[k];
              const tone = meta.color === "alert" ? "text-destructive" : "text-cyan";
              return (
                <section key={k}>
                  <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
                    <div className="flex items-baseline gap-3">
                      <h2 className="text-display text-xl font-bold md:text-2xl">{meta.plural}</h2>
                      <span className={`text-mono text-[10px] uppercase tracking-[0.18em] ${tone}`}>
                        {items.length}
                      </span>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((e) => (
                      <LoreCard
                        key={e.id}
                        slug={e.slug}
                        title={e.title}
                        subtitle={e.subtitle}
                        summary={e.summary}
                        category={e.category as LoreCategory}
                        clearance={e.clearance}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  count,
  tone = "cyan",
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count: number;
  tone?: "cyan" | "alert";
}) {
  const activeClass =
    tone === "alert"
      ? "border-destructive bg-destructive/15 text-destructive"
      : "border-cyan bg-cyan/15 text-cyan";
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 border px-3 py-1.5 text-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
        active
          ? activeClass
          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
      }`}
    >
      <span>{children}</span>
      <span className="opacity-70">{count}</span>
    </button>
  );
}
