import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listEventos, upsertEvento, listDominios, listNpcs } from "@/lib/staff.functions";
import { PageHeader, Button, Field, Input, Select, Textarea, Modal, Empty, Badge } from "@/components/staff-ui";
import { Plus, Pencil } from "lucide-react";
import { ContradictionCheck } from "@/components/contradiction-check";

export const Route = createFileRoute("/_authenticated/staff/eventos")({
  component: EventosPage,
});

const STATUS = ["planejado", "em_andamento", "concluido", "cancelado"] as const;
const TIPOS = ["global", "faccao", "esquadrao", "secreto"] as const;
const CLEARANCE = ["publico", "uniao", "instrutores", "diretores", "curadores", "restrito", "verdade_absoluta"] as const;

function EventosPage() {
  const fetch = useServerFn(listEventos);
  const { data } = useQuery({ queryKey: ["eventos"], queryFn: () => fetch() });
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<any | null>(null);

  const cols: Record<string, any[]> = { planejado: [], em_andamento: [], concluido: [], cancelado: [] };
  for (const e of data ?? []) cols[e.status]?.push(e);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Banco · Eventos"
        title="Eventos"
        sub="Quando um evento for concluído, entra automaticamente na linha do tempo pública."
        actions={<Button onClick={() => { setEditing({}); setOpen(true); }}><Plus className="h-3 w-3" /> Novo Evento</Button>}
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(cols) as (keyof typeof cols)[]).map((k) => (
          <div key={k} className="border border-border bg-surface-1">
            <div className="border-b border-border bg-surface-2 px-3 py-2"><p className="hud-label text-cyan">{k.replace("_", " ")} · {cols[k].length}</p></div>
            <div className="space-y-2 p-2">
              {cols[k].length === 0 && <p className="px-2 py-4 text-center text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">vazio</p>}
              {cols[k].map((e) => (
                <button key={e.id} onClick={() => { setEditing(e); setOpen(true); }} className="block w-full border border-border bg-background p-3 text-left hover:border-cyan/50">
                  <p className="text-display text-sm font-bold">{e.nome}</p>
                  <p className="mt-0.5 text-mono text-[10px] text-muted-foreground">{e.data ? new Date(e.data).toLocaleDateString("pt-BR") : "sem data"}</p>
                  <div className="mt-2 flex flex-wrap gap-1"><Badge tone="cyan">{e.tipo}</Badge>{e.tipo === "secreto" && <Badge tone="alert">restrito</Badge>}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {(data ?? []).length === 0 && <Empty>Nenhum evento cadastrado.</Empty>}
      {open && <EvModal e={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function EvModal({ e, onClose }: { e: any; onClose: () => void }) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertEvento);
  const fetchDom = useServerFn(listDominios); const fetchNpcs = useServerFn(listNpcs);
  const { data: doms } = useQuery({ queryKey: ["dominios"], queryFn: () => fetchDom() });
  const { data: npcs } = useQuery({ queryKey: ["npcs"], queryFn: () => fetchNpcs() });
  const [form, setForm] = useState<any>({
    id: e?.id, nome: e?.nome ?? "", data: e?.data?.slice(0, 16) ?? "",
    dominio_id: e?.dominio_id ?? "", npcs_envolvidos: e?.npcs_envolvidos ?? [],
    resumo: e?.resumo ?? "", consequencias: e?.consequencias ?? "",
    status: e?.status ?? "planejado", tipo: e?.tipo ?? "global", clearance: e?.clearance ?? "uniao",
  });
  const m = useMutation({
    mutationFn: () => upsert({ data: {
      ...form, dominio_id: form.dominio_id || null,
      data: form.data ? new Date(form.data).toISOString() : null,
    } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["eventos"] }); qc.invalidateQueries({ queryKey: ["world-state"] }); onClose(); },
  });
  const toggleNpc = (id: string) => setForm((f: any) => ({ ...f, npcs_envolvidos: f.npcs_envolvidos.includes(id) ? f.npcs_envolvidos.filter((x: string) => x !== id) : [...f.npcs_envolvidos, id] }));
  return (
    <Modal open onClose={onClose} title={e?.id ? `Editar: ${e.nome}` : "Novo Evento"} wide>
      <form onSubmit={(ev) => { ev.preventDefault(); m.mutate(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome*"><Input required value={form.nome} onChange={(ev) => setForm({ ...form, nome: ev.target.value })} /></Field>
          <Field label="Data"><Input type="datetime-local" value={form.data} onChange={(ev) => setForm({ ...form, data: ev.target.value })} /></Field>
          <Field label="Tipo"><Select value={form.tipo} onChange={(ev) => setForm({ ...form, tipo: ev.target.value })}>{TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
          <Field label="Status"><Select value={form.status} onChange={(ev) => setForm({ ...form, status: ev.target.value })}>{STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
          <Field label="Domínio"><Select value={form.dominio_id} onChange={(ev) => setForm({ ...form, dominio_id: ev.target.value })}><option value="">—</option>{(doms ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.nome}</option>)}</Select></Field>
          <Field label="Classificação"><Select value={form.clearance} onChange={(ev) => setForm({ ...form, clearance: ev.target.value })}>{CLEARANCE.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
        </div>
        <Field label="NPCs envolvidos">
          <div className="max-h-32 overflow-y-auto border border-border bg-surface-2 p-2">
            <div className="flex flex-wrap gap-1">
              {(npcs ?? []).map((n: any) => (
                <button key={n.id} type="button" onClick={() => toggleNpc(n.id)} className={`border px-2 py-0.5 text-mono text-[10px] uppercase tracking-[0.14em] ${form.npcs_envolvidos.includes(n.id) ? "border-cyan bg-cyan text-cyan-foreground" : "border-border text-muted-foreground hover:border-cyan"}`}>{n.nome}</button>
              ))}
              {(npcs ?? []).length === 0 && <span className="text-mono text-[11px] text-muted-foreground">Nenhum NPC cadastrado ainda.</span>}
            </div>
          </div>
        </Field>
        <Field label="Resumo"><Textarea rows={3} value={form.resumo} onChange={(ev) => setForm({ ...form, resumo: ev.target.value })} /></Field>
        <Field label="Consequências"><Textarea rows={3} value={form.consequencias} onChange={(ev) => setForm({ ...form, consequencias: ev.target.value })} /></Field>
        {form.status === "concluido" && !e?.lore_entry_id && <p className="text-mono text-[11px] text-amber-400">⚠ Ao salvar como "concluído", uma entrada será criada automaticamente na linha do tempo pública.</p>}
        <ContradictionCheck text={`${form.nome} ${form.resumo ?? ""} ${form.consequencias ?? ""}`} />
        {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={m.isPending}>Salvar</Button></div>
      </form>
    </Modal>
  );
}
