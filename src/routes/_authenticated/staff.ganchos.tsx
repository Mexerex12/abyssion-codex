import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listGanchos, upsertGancho } from "@/lib/staff.functions";
import { PageHeader, Button, Field, Input, Select, Textarea, Modal, Empty, Badge } from "@/components/staff-ui";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff/ganchos")({
  component: GanchosPage,
});

const STATUS = ["nao_iniciado", "planejado", "em_andamento", "executado", "arquivado"] as const;
const PRIORIDADE = ["baixa", "media", "alta", "critica"] as const;

function GanchosPage() {
  const fetch = useServerFn(listGanchos);
  const { data } = useQuery({ queryKey: ["ganchos"], queryFn: () => fetch() });
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<any | null>(null);

  const cols: Record<string, any[]> = Object.fromEntries(STATUS.map((s) => [s, []]));
  const prioOrder = { critica: 0, alta: 1, media: 2, baixa: 3 } as any;
  for (const g of data ?? []) cols[g.status]?.push(g);
  for (const k in cols) cols[k].sort((a, b) => prioOrder[a.prioridade] - prioOrder[b.prioridade]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Workspace · Ganchos Narrativos"
        title="Ganchos Narrativos"
        sub="Banco de ideias futuras. Movimente entre estágios conforme planeja."
        actions={<Button onClick={() => { setEditing({}); setOpen(true); }}><Plus className="h-3 w-3" /> Novo Gancho</Button>}
      />
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STATUS.map((k) => (
          <div key={k} className="border border-border bg-surface-1">
            <div className="border-b border-border bg-surface-2 px-3 py-2"><p className="hud-label text-cyan">{k.replace("_", " ")} · {cols[k].length}</p></div>
            <div className="space-y-2 p-2">
              {cols[k].length === 0 && <p className="px-2 py-4 text-center text-mono text-[10px] uppercase text-muted-foreground">vazio</p>}
              {cols[k].map((g) => {
                const tone: any = g.prioridade === "critica" ? "alert" : g.prioridade === "alta" ? "amber" : g.prioridade === "media" ? "cyan" : "neutral";
                return (
                  <button key={g.id} onClick={() => { setEditing(g); setOpen(true); }} className="block w-full border border-border bg-background p-3 text-left hover:border-cyan/50">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-display text-sm font-bold">{g.titulo}</p>
                      <Badge tone={tone}>{g.prioridade}</Badge>
                    </div>
                    {g.resumo && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{g.resumo}</p>}
                    {g.faccao && <p className="mt-2 text-mono text-[10px] uppercase tracking-[0.14em] text-cyan">{g.faccao}</p>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {(data ?? []).length === 0 && <Empty>Nenhum gancho registrado.</Empty>}
      {open && <GModal g={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function GModal({ g, onClose }: { g: any; onClose: () => void }) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertGancho);
  const [form, setForm] = useState<any>({
    id: g?.id, titulo: g?.titulo ?? "", resumo: g?.resumo ?? "", faccao: g?.faccao ?? "",
    prioridade: g?.prioridade ?? "media", status: g?.status ?? "nao_iniciado",
    npcs_envolvidos: g?.npcs_envolvidos ?? [],
  });
  const m = useMutation({
    mutationFn: () => upsert({ data: form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ganchos"] }); onClose(); },
  });
  return (
    <Modal open onClose={onClose} title={g?.id ? `Editar: ${g.titulo}` : "Novo Gancho"}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
        <Field label="Título*"><Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></Field>
        <Field label="Resumo"><Textarea rows={5} value={form.resumo} onChange={(e) => setForm({ ...form, resumo: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Facção"><Input value={form.faccao} onChange={(e) => setForm({ ...form, faccao: e.target.value })} /></Field>
          <Field label="Prioridade"><Select value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })}>{PRIORIDADE.map((p) => <option key={p} value={p}>{p}</option>)}</Select></Field>
          <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
        </div>
        {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={m.isPending}>Salvar</Button></div>
      </form>
    </Modal>
  );
}
