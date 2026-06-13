import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listPlots, upsertPlot, deletePlot, listMisterios } from "@/lib/canon.functions";
import { PageHeader, Button, Field, Input, Select, Textarea, Modal, Empty, Badge } from "@/components/staff-ui";
import { Plus, Calendar, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff/plots")({
  component: PlotsPage,
});

const STATUS = ["rascunho", "planejado", "em_andamento", "executado", "arquivado", "cancelado"] as const;

function statusTone(s: string): any {
  return s === "executado" ? "green" : s === "em_andamento" ? "amber" : s === "planejado" ? "cyan" : "neutral";
}

function PlotsPage() {
  const fetch = useServerFn(listPlots);
  const { data } = useQuery({ queryKey: ["plots"], queryFn: () => fetch() });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const cols: Record<string, any[]> = Object.fromEntries(STATUS.map((s) => [s, []]));
  for (const p of data ?? []) cols[p.status]?.push(p);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Workspace · Planejamento Narrativo"
        title="Plots Futuros"
        sub="Arcos planejados, conectados a mistérios e fatos canônicos."
        actions={<Button onClick={() => { setEditing({}); setOpen(true); }}><Plus className="h-3 w-3" /> Novo Plot</Button>}
      />

      {(data ?? []).length === 0 ? <Empty>Nenhum plot registrado.</Empty> : (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {STATUS.map((k) => (
            <div key={k} className="border border-border bg-surface-1">
              <div className="border-b border-border bg-surface-2 px-3 py-2"><p className="hud-label text-cyan">{k.replace("_", " ")} · {cols[k].length}</p></div>
              <div className="space-y-2 p-2">
                {cols[k].length === 0 && <p className="px-2 py-4 text-center text-mono text-[10px] uppercase text-muted-foreground">vazio</p>}
                {cols[k].map((p: any) => (
                  <button key={p.id} onClick={() => { setEditing(p); setOpen(true); }} className="block w-full border border-border bg-background p-3 text-left hover:border-cyan/50">
                    <p className="text-display text-sm font-bold">{p.titulo}</p>
                    {p.objetivo && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.objetivo}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge tone={statusTone(p.status)}>{p.status.replace("_", " ")}</Badge>
                      {p.data_prevista && <Badge tone="cyan"><Calendar className="mr-1 inline h-2.5 w-2.5" />{p.data_prevista}</Badge>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <PlotModal p={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function PlotModal({ p, onClose }: { p: any; onClose: () => void }) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertPlot);
  const del = useServerFn(deletePlot);
  const fetchM = useServerFn(listMisterios);
  const { data: misterios } = useQuery({ queryKey: ["misterios"], queryFn: () => fetchM() });

  const [form, setForm] = useState<any>({
    id: p?.id,
    titulo: p?.titulo ?? "",
    objetivo: p?.objetivo ?? "",
    resumo: p?.resumo ?? "",
    status: p?.status ?? "rascunho",
    data_prevista: p?.data_prevista ?? "",
    notas: p?.notas ?? "",
    npcs_envolvidos: p?.npcs_envolvidos ?? [],
    faccoes_envolvidas: p?.faccoes_envolvidas ?? [],
    misterios_relacionados: p?.misterios_relacionados ?? [],
    fatos_relacionados: p?.fatos_relacionados ?? [],
    dependencias: p?.dependencias ?? [],
  });

  const m = useMutation({
    mutationFn: () => upsert({ data: form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plots"] }); onClose(); },
  });
  const d = useMutation({
    mutationFn: () => del({ data: { id: form.id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plots"] }); onClose(); },
  });

  function toggleMist(id: string) {
    const has = form.misterios_relacionados.includes(id);
    setForm({
      ...form,
      misterios_relacionados: has
        ? form.misterios_relacionados.filter((x: string) => x !== id)
        : [...form.misterios_relacionados, id],
    });
  }

  return (
    <Modal open onClose={onClose} title={p?.id ? `Editar — ${p.titulo}` : "Novo Plot"} wide>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
        <Field label="Título*"><Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></Field>
        <Field label="Objetivo"><Textarea rows={2} value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} /></Field>
        <Field label="Resumo / Roteiro"><Textarea rows={6} value={form.resumo} onChange={(e) => setForm({ ...form, resumo: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select></Field>
          <Field label="Data prevista"><Input type="date" value={form.data_prevista} onChange={(e) => setForm({ ...form, data_prevista: e.target.value })} /></Field>
        </div>

        <Field label="Mistérios relacionados">
          <div className="max-h-40 overflow-y-auto border border-border bg-surface-2 p-2">
            {(misterios ?? []).length === 0 && <p className="text-mono text-[10px] uppercase text-muted-foreground">Nenhum mistério cadastrado</p>}
            {(misterios ?? []).map((mst: any) => (
              <label key={mst.id} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
                <input type="checkbox" checked={form.misterios_relacionados.includes(mst.id)} onChange={() => toggleMist(mst.id)} />
                <span className="flex-1 truncate">{mst.pergunta}</span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Notas internas"><Textarea rows={3} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></Field>

        {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}
        <div className="flex justify-between gap-2">
          <div>{form.id && <Button variant="danger" onClick={() => { if (confirm("Excluir plot?")) d.mutate(); }}><Trash2 className="h-3 w-3" /> Excluir</Button>}</div>
          <div className="flex gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={m.isPending}>Salvar</Button></div>
        </div>
      </form>
    </Modal>
  );
}
