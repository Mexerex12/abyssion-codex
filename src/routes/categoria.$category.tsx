import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { LoreCard } from "@/components/lore-card";
import { listByCategory } from "@/lib/lore.functions";
import { CATEGORY_META } from "@/lib/lore-meta";
import type { LoreCategory } from "@/lib/lore-meta";

export const Route = createFileRoute("/categoria/$category")({
  loader: async ({ params }) => {
    if (!(params.category in CATEGORY_META)) throw notFound();
    return await listByCategory({ data: { category: params.category } });
  },
  head: ({ params }) => {
    const meta = CATEGORY_META[params.category as LoreCategory];
    return {
      meta: [
        { title: `${meta?.plural ?? "Categoria"} | União Trivalente` },
        { name: "description", content: meta?.description ?? "" },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const params = Route.useParams();
  const cat = params.category as LoreCategory;
  const meta = CATEGORY_META[cat];
  const fetchByCat = useServerFn(listByCategory);
  const { data } = useSuspenseQuery({
    queryKey: ["category", cat],
    queryFn: () => fetchByCat({ data: { category: cat } }),
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 pt-10">
        <h1 className="text-display text-4xl font-bold md:text-5xl">{meta.plural}</h1>
        <div className="hud-divider mt-6" />
        <p className="mt-4 text-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {data.length} registro(s)
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 pb-12 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((e) => (
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
          {data.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              Nenhum registro nesta categoria.
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
