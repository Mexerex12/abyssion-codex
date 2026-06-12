import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { LoreCard } from "@/components/lore-card";
import { listLoreEntries } from "@/lib/lore.functions";
import { CATEGORY_META } from "@/lib/lore-meta";
import type { LoreCategory } from "@/lib/lore-meta";
import { Search } from "lucide-react";

export const Route = createFileRoute("/wiki")({
  head: () => ({
    meta: [
      { title: "Enciclopédia — Arquivos da União Trivalente" },
      { name: "description", content: "Banco de dados completo da lore Abyssion SMP." },
    ],
  }),
  component: Wiki,
});

function Wiki() {
  const fetchEntries = useServerFn(listLoreEntries);
  const entries = useQuery({ queryKey: ["lore", "all"], queryFn: () => fetchEntries({ data: {} }) });
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"all" | LoreCategory>("all");

  const filtered = useMemo(() => {
    const list = entries.data ?? [];
    return list.filter((e) => {
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
  }, [entries.data, q, cat]);

  const cats = Object.entries(CATEGORY_META) as [LoreCategory, (typeof CATEGORY_META)[LoreCategory]][];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 pt-10">
        <p className="hud-label">Enciclopédia · Banco de Dados Completo</p>
        <h1 className="mt-2 text-display text-4xl font-bold md:text-5xl">Arquivos</h1>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar por nome, tag ou resumo..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full border border-input bg-surface-1 py-2.5 pl-10 pr-4 text-sm focus:border-cyan focus:outline-none"
            />
          </div>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value as typeof cat)}
            className="border border-input bg-surface-1 px-3 py-2.5 text-mono text-xs uppercase tracking-[0.16em] focus:border-cyan focus:outline-none"
          >
            <option value="all">Todas as categorias</option>
            {cats.map(([k, v]) => (
              <option key={k} value={k}>{v.plural}</option>
            ))}
          </select>
        </div>

        <div className="hud-divider mt-6" />

        <p className="mt-4 text-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {filtered.length} registro(s) listado(s)
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 pb-12 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <LoreCard
              key={e.id}
              slug={e.slug}
              title={e.title}
              subtitle={e.subtitle}
              summary={e.summary}
              category={e.category}
              clearance={e.clearance}
            />
          ))}
          {filtered.length === 0 && !entries.isLoading && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              Nenhum arquivo encontrado.
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
