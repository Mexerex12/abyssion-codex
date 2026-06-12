import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listStaffTimeline } from "@/lib/staff.functions";
import { PageHeader, Empty, Badge, Select } from "@/components/staff-ui";

export const Route = createFileRoute("/_authenticated/staff/timeline")({
  component: TimelinePage,
});

function TimelinePage() {
  const fetch = useServerFn(listStaffTimeline);
  const { data } = useQuery({ queryKey: ["staff-timeline"], queryFn: () => fetch() });
  const [filter, setFilter] = useState("");
  const filtered = (data ?? []).filter((e: any) => !filter || e.tipo === filter);
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Workspace · Linha do Tempo" title="Linha do Tempo" sub="Visão interna — inclui eventos secretos e classificados." />
      <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-auto">
        <option value="">Todos os tipos</option>
        {["global", "faccao", "esquadrao", "secreto"].map((t) => <option key={t} value={t}>{t}</option>)}
      </Select>
      {filtered.length === 0 ? <Empty>Nenhum evento.</Empty> : (
        <div className="relative ml-3 space-y-4 border-l-2 border-cyan/40 pl-6">
          {filtered.map((e: any) => (
            <div key={e.id} className="relative">
              <span className="absolute -left-[31px] top-2 h-3 w-3 border-2 border-cyan bg-background" />
              <div className="border border-border bg-surface-1 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{e.data ? new Date(e.data).toLocaleDateString("pt-BR") : "Sem data"}</p>
                    <p className="mt-1 text-display text-lg font-bold">{e.nome}</p>
                  </div>
                  <div className="flex gap-1">
                    <Badge tone={e.status === "concluido" ? "green" : e.status === "em_andamento" ? "amber" : "neutral"}>{e.status}</Badge>
                    <Badge tone={e.tipo === "secreto" ? "alert" : "cyan"}>{e.tipo}</Badge>
                  </div>
                </div>
                {e.resumo && <p className="mt-2 text-sm text-foreground/80">{e.resumo}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
