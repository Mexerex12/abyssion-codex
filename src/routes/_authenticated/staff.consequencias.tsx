import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listConsequencias, upsertConsequencia, deleteConsequencia } from "@/lib/canon.functions";
import { listEventos } from "@/lib/staff.functions";
import { PageHeader, Button, Field, Input, Select, Textarea, Modal, Empty, Badge } from "@/components/staff-ui";
import { Plus, GitBranch, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff/consequencias")({
  component: ConsPage,
});

const SCOPE = ["players", "uniao", "diretores", "curadores", "staff_apenas"] as const;
const TIPOS = ["morte", "surgimento", "criacao_misterio", "ruptura", "mudanca_politica", "alianca", "traicao", "destruicao", "outro"];

function ConsPage() {
  const fetch = useServerFn(listConsequencias);
  const { data } = useQuery({ queryKey: ["consequencias"], queryFn: () => fetch() });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const byEvento = (data ?? []).reduce((acc: any, c: any) => {
    const k = c.evento?.nome ?? "— sem evento —";
    (acc[k] ||= []).push(c);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Workspace · Sistema de Consequências"
        title="Consequências"
        sub="Toda ação importante gera consequências registradas — agrupadas por evento de origem."
        actions={<Button onClick={() => { setEditing({}); setOpen(true); }}><Plus className="h-3 w-3" /> Nova Consequência</Button>}
      />

      {Object.keys(byEvento).length === 0 ? <Empty>Nenhuma consequência registrada.</Empty> : (
        <div className="space-y-5">
          {Object.entries(byEvento).map(([nome, lista]: any) => (
            <div key={nome} className="border border-border bg-surface-1">
              <div className="border-b border-border bg-surface-2 px-4 py-2">
                <p className="hud-label text-cyan">{nome} · {lista.length}</p>
              </div>
              <div className="divide-y divide-border">
                {lista.map((c: any) => (
                  <button key={c.id} onClick={() => { setEditing(c); setOpen(true); }} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-2">
                    <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-display text-sm font-bold">{c.titulo}</p>
                        <div className="flex gap-1">
                          {c.tipo && <Badge tone="amber">{c.tipo}</Badge>}
                          <Badge>{c.escopo_conhecimento.replace("_", " ")}</Badge>
                        </div>
                      </div>
                      {c.descricao && <p className="mt-1 text-xs text-muted-foreground">{c.descricao}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <ConsModal c={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function ConsModal({ c, onClose }: { c: any; onClose: () => void }) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertConsequencia);
  const del = useServerFn(deleteConsequencia);
  const fetchEv = useServerFn(listEventos);
  const { data: eventos } = useQuery({ queryKey: ["eventos"], queryFn: () => fetchEv() });

  const [form, setForm] = useState<any>({
    id: c?.id,
    evento_id: c?.evento_id ?? "",
    titulo: c?.titulo ?? "",
    descricao: c?.descricao ?? "",
    tipo: c?.tipo ?? "",
    escopo_conhecimento: c?.escopo_conhecimento ?? "players",
    npcs_afetados: c?.npcs_afetados ?? [],
    dominios_afetados: c?.dominios_afetados ?? [],
    misterios_gerados: c?.misterios_gerados ?? [],
    fatos_gerados: c?.fatos_gerados ?? [],
  });

  const m = useMutation({
    mutationFn: () => upsert({ data: { ...form, evento_id: form.evento_id || null } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["consequencias"] }); onClose(); },
  });
  const d = useMutation({
    mutationFn: () => del({ data: { id: form.id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["consequencias"] }); onClose(); },
  });

  return (
    <Modal open onClose={onClose} title={c?.id ? `Editar — ${c.titulo}` : "Nova Consequência"} wide>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
        <Field label="Evento de origem">
          <Select value={form.evento_id} onChange={(e) => setForm({ ...form, evento_id: e.target.value })}>
            <option value="">— nenhum —</option>
            {(eventos ?? []).map((ev: any) => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
          </Select>
        </Field>
        <Field label="Título*"><Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Surgimento do Peregrino" /></Field>
        <Field label="Descrição"><Textarea rows={4} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="">—</option>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Quem sabe"><Select value={form.escopo_conhecimento} onChange={(e) => setForm({ ...form, escopo_conhecimento: e.target.value })}>{SCOPE.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select></Field>
        </div>
        {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}
        <div className="flex justify-between gap-2">
          <div>{form.id && <Button variant="danger" onClick={() => { if (confirm("Excluir?")) d.mutate(); }}><Trash2 className="h-3 w-3" /> Excluir</Button>}</div>
          <div className="flex gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={m.isPending}>Salvar</Button></div>
        </div>
      </form>
    </Modal>
  );
}
