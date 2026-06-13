import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { universalSearch } from "@/lib/staff.functions";
import { PageHeader, Input, Empty } from "@/components/staff-ui";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff/buscar")({
  component: BuscarPage,
});

function BuscarPage() {
  const [q, setQ] = useState("");
  const fetch = useServerFn(universalSearch);
  const { data, isFetching } = useQuery({
    queryKey: ["search", q],
    queryFn: () => fetch({ data: { q } }),
    enabled: q.length >= 2,
  });

  const groups: { label: string; key: keyof NonNullable<typeof data>; render: (r: any) => React.ReactNode }[] = [
    { label: "NPCs", key: "npcs", render: (r) => `${r.nome} | ${r.cargo || ""} (${r.status})` },
    { label: "Eventos", key: "eventos", render: (r) => `${r.nome} | ${r.tipo} / ${r.status}` },
    { label: "Domínios", key: "dominios", render: (r) => `${r.nome} | ${r.classe || ""} (${r.status})` },
    { label: "Vestígios", key: "vestigios", render: (r) => `${r.nome} | VEST-${String(r.numero ?? "?").padStart(3, "0")} (${r.estado})` },
    { label: "Ganchos", key: "ganchos", render: (r) => `${r.titulo} | ${r.prioridade} / ${r.status}` },
    { label: "Documentos", key: "documentos", render: (r) => `${r.titulo} | ${r.categoria || ""}` },
    { label: "Wiki (Lore)", key: "lore", render: (r) => `${r.title} | ${r.category}` },
  ];

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Workspace · Busca Universal" title="Enciclopédia Global" sub="Pesquise um termo. Retorna tudo: NPCs, eventos, facções, domínios, documentos, wiki." />
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input autoFocus placeholder="Digite ao menos 2 caracteres..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
      </div>
      {q.length < 2 ? <Empty>Comece a digitar para buscar.</Empty> : isFetching ? <Empty>Buscando...</Empty> : (
        <div className="space-y-5">
          {groups.map((g) => {
            const items = (data?.[g.key] ?? []) as any[];
            if (items.length === 0) return null;
            return (
              <section key={g.key as string}>
                <p className="hud-label text-cyan">{g.label} · {items.length}</p>
                <ul className="mt-2 space-y-1">
                  {items.map((r) => (
                    <li key={r.id} className="border border-border bg-surface-1 px-3 py-2 text-sm">{g.render(r)}</li>
                  ))}
                </ul>
              </section>
            );
          })}
          {groups.every((g) => ((data?.[g.key] as any[])?.length ?? 0) === 0) && <Empty>Sem resultados para "{q}".</Empty>}
        </div>
      )}
    </div>
  );
}
