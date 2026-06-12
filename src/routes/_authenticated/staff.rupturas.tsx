import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listRupturas, upsertRuptura, listDominios } from "@/lib/staff.functions";
import { PageHeader, Button, Field, Input, Select, Textarea, Modal, Empty, Badge } from "@/components/staff-ui";
import { Plus, Pencil, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff/rupturas")({
  component: RupturasPage,
});

const ESTADOS = ["aberta", "contida", "critica", "fechada"] as const;

function RupturasPage() {
  const fetch = useServerFn(listRupturas);
  const { data } = useQuery({ queryKey: ["rupturas"], queryFn: () => fetch() });
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<any | null>(null);

  const sorted = (data ?? []).slice().sort((a: any, b: any) => {
    const order = { critica: 0, aberta: 1, contida: 2, fechada: 3 } as any;
    return order[a.estado] - order[b.estado];
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Banco · Rupturas"
        title="Rupturas"
        sub="Rachaduras ativas na realidade. Priorizado por criticidade."
        actions={<Button onClick={() => { setEditing({}); setOpen(true); }}><Plus className="h-3 w-3" /> Nova Ruptura</Button>}
      />
      {sorted.length === 0 ? <Empty>Sem rupturas registradas.</Empty> : (
        <div className="space-y-2">
          {sorted.map((r: any) => {
            const tone: any = r.estado === "critica" ? "alert" : r.estado === "aberta" ? "amber" : r.estado === "contida" ? "cyan" : "neutral";
            return (
              <div key={r.id} className={`border bg-surface-1 p-4 ${r.estado === "critica" ? "border-destructive/60" : "border-border"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Zap className={`mt-1 h-4 w-4 ${r.estado === "critica" ? "text-destructive" : "text-cyan"}`} />
                    <div>
                      <p className="text-display text-base font-bold">{r.nome}</p>
                      <p className="text-mono text-[11px] text-muted-foreground">{r.dominio?.nome ? `→ ${r.dominio.nome}` : "Sem domínio vinculado"}</p>
                      {r.descricao && <p className="mt-2 text-sm text-foreground/80">{r.descricao}</p>}
                      <p className="mt-2 text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Aberta · {new Date(r.aberta_em).toLocaleString("pt-BR")}{r.fechada_em && ` · Fechada · ${new Date(r.fechada_em).toLocaleString("pt-BR")}`}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge tone={tone}>{r.estado}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {open && <RuptModal r={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function RuptModal({ r, onClose }: { r: any; onClose: () => void }) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertRuptura);
  const fetchDom = useServerFn(listDominios);
  const { data: doms } = useQuery({ queryKey: ["dominios"], queryFn: () => fetchDom() });
  const [form, setForm] = useState<any>({
    id: r?.id, nome: r?.nome ?? "", dominio_id: r?.dominio_id ?? "", estado: r?.estado ?? "aberta",
    descricao: r?.descricao ?? "", fechada_em: r?.fechada_em?.slice(0, 16) ?? "",
  });
  const m = useMutation({
    mutationFn: () => upsert({ data: {
      ...form, dominio_id: form.dominio_id || null,
      fechada_em: form.fechada_em ? new Date(form.fechada_em).toISOString() : null,
    } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rupturas"] }); onClose(); },
  });
  return (
    <Modal open onClose={onClose} title={r?.id ? `Editar — ${r.nome}` : "Nova Ruptura"}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome*"><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
          <Field label="Estado"><Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>{ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
          <Field label="Domínio"><Select value={form.dominio_id} onChange={(e) => setForm({ ...form, dominio_id: e.target.value })}><option value="">—</option>{(doms ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.nome}</option>)}</Select></Field>
          <Field label="Fechada em"><Input type="datetime-local" value={form.fechada_em} onChange={(e) => setForm({ ...form, fechada_em: e.target.value })} /></Field>
        </div>
        <Field label="Descrição"><Textarea rows={4} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></Field>
        {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={m.isPending}>Salvar</Button></div>
      </form>
    </Modal>
  );
}
