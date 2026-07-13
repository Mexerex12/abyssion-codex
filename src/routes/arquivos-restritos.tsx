import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ClearanceBadge } from "@/components/lore-card";
import { listClassified } from "@/lib/lore.functions";
import { CLEARANCE_META, CATEGORY_META } from "@/lib/lore-meta";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/arquivos-restritos")({
  head: () => ({
    meta: [
      { title: "Arquivos Restritos | União Trivalente" },
      {
        name: "description",
        content:
          "Documentação classificada da União Trivalente. Acesso restrito por nível de credencial.",
      },
    ],
  }),
  component: Restricted,
});

const LEVELS = ["nivel_1", "nivel_2", "nivel_3", "nivel_4", "nivel_diretor"] as const;

function Restricted() {
  const fetchClassified = useServerFn(listClassified);
  const list = useQuery({ queryKey: ["classified"], queryFn: () => fetchClassified() });

  const grouped: Record<string, typeof list.data> = {};
  for (const d of list.data ?? []) {
    grouped[d.clearance] = [...(grouped[d.clearance] ?? []), d];
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 pt-10 pb-16">
        <div className="border border-destructive/40 bg-destructive/5 p-6 classified-stripe">
          <div className="flex items-start gap-4">
            <Shield className="h-6 w-6 shrink-0 text-destructive" />
            <div>
              <h1 className="text-display text-3xl font-bold md:text-4xl">Arquivos Restritos</h1>
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-10">
          {LEVELS.map((lvl) => {
            const items = grouped[lvl] ?? [];
            const meta = CLEARANCE_META[lvl];
            return (
              <section key={lvl}>
                <div className="flex items-end justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-3">
                    <ClearanceBadge level={lvl} />
                    <h2 className="text-display text-xl font-semibold">{meta.label}</h2>
                  </div>
                  <span className="text-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {items.length} registro(s)
                  </span>
                </div>

                {items.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">Nenhum registro neste nível.</p>
                ) : (
                  <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {items.map((d) => (
                      <li key={d.id}>
                        <Link
                          to="/wiki/$slug"
                          params={{ slug: d.slug }}
                          className="group flex items-start justify-between gap-3 border border-border bg-surface-1 p-4 hover:border-destructive/60"
                        >
                          <div>
                            <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                              {CATEGORY_META[d.category as keyof typeof CATEGORY_META]?.label}
                            </p>
                            <p className="mt-1 text-display text-base font-semibold group-hover:text-destructive">
                              {d.title}
                            </p>
                            {d.summary && (
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                {d.summary}
                              </p>
                            )}
                          </div>
                          <Lock className="h-3.5 w-3.5 shrink-0 text-destructive" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
