import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { DASHBOARD_CARDS } from "@/lib/lore-meta";
import { getStats } from "@/lib/lore.functions";
import { Lock, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel | União Trivalente" },
      { name: "description", content: "Painel central dos Arquivos da União Trivalente. Acesso aos setores temáticos do banco de dados." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const fetchStats = useServerFn(getStats);
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => fetchStats() });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-display text-4xl font-bold md:text-5xl">Painel</h1>
          </div>
          <div className="flex gap-px border border-border bg-border">
            <div className="bg-background px-4 py-3">
              <p className="hud-label">Registros</p>
              <p className="text-display text-2xl font-bold">{stats.data?.total ?? "n/d"}</p>
            </div>
            <div className="bg-background px-4 py-3">
              <p className="hud-label">Domínios</p>
              <p className="text-display text-2xl font-bold">{stats.data?.byCategory?.dominio ?? "n/d"}</p>
            </div>
            <div className="bg-background px-4 py-3">
              <p className="hud-label">Eventos</p>
              <p className="text-display text-2xl font-bold">{stats.data?.byCategory?.evento ?? "n/d"}</p>
            </div>
          </div>
        </div>

        <div className="hud-divider mt-8" />

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {DASHBOARD_CARDS.map((card) => (
            <Link
              key={card.href}
              to={card.href}
              className="group relative block overflow-hidden border border-border bg-surface-1 p-5 transition-all hover:border-cyan/60 hover:bg-surface-2"
            >
              {card.classified && (
                <div className="absolute inset-0 classified-stripe opacity-40 transition-opacity group-hover:opacity-20" />
              )}
              <div className="relative flex items-start justify-end">
                {card.classified ? (
                  <Lock className="h-3.5 w-3.5 text-destructive" />
                ) : (
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-cyan" />
                )}
              </div>
              <h3 className="relative mt-6 text-display text-lg font-semibold text-foreground group-hover:text-cyan">
                {card.title}
              </h3>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
