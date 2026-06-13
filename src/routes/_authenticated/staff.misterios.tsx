import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { listMisterios, upsertMisterio, deleteMisterio } from "@/lib/canon.functions";
import { PageHeader, Button, Field, Input, Select, Textarea, Modal, Empty, Badge } from "@/components/staff-ui";
import { Plus, HelpCircle, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff/misterios")({
  component: MisteriosPage,
});

const STATUS = ["sem_resposta", "parcial", "em_revelacao", "resolvido", "arquivado"] as const;
const SCOPE = ["players", "uniao", "diretores", "curadores", "staff_apenas"] as const;

function statusTone(s: string): any {
  return s === "resolvido" ? "green" : s === "em_revelacao" ? "amber" : s === "parcial" ? "cyan" : s === "arquivado" ? "neutral" : "alert";
}

function MisteriosPage() {
  const fetch = useServerFn(listMisterios);
  const { data } = useQuery({ queryKey: ["misterios"], queryFn: () => fetch() });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [statusF, setStatusF] = useState<string>("");
  const [scopeF, setScopeF] = useState<string>("");

  const filtered = useMemo(() => {
    let arr = data ?? [];
    if (statusF) arr = arr.filter((m: any) => m.status === statusF);
    if (scopeF) arr = arr.filter((m: any) => m.escopo_conhecimento === scopeF);
    return arr;
  }, [data, statusF, scopeF]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Workspace · Painel de Mistérios"
        title="Mistérios em Aberto"
        sub="Nem tudo na lore precisa de resposta, mas tudo precisa estar rastreado."
        actions={<Button onClick={() => { setEditing({}); setOpen(true); }}><Plus className="h-3 w-3" /> Novo Mistério</Button>}
      />

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Select value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </Select>
        <Select value={scopeF} onChange={(e) => setScopeF(e.target.value)}>
          <option value="">Todos os escopos</option>
          {SCOPE.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </Select>
      </div>

      {filtered.length === 0 ? <Empty>Nenhum mistério registrado.</Empty> : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((m: any) => (
            <button key={m.id} onClick={() => { setEditing(m); setOpen(true); }} className="border border-border bg-surface-1 p-4 text-left hover:border-cyan/50">
              <div className="flex items-start gap-2">
                <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                <p className="flex-1 text-display text-sm font-bold">{m.pergunta}</p>
                <Badge tone={statusTone(m.status)}>{m.status.replace("_", " ")}</Badge>
              </div>
              {m.contexto && <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{m.contexto}</p>}
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge>{m.escopo_conhecimento.replace("_", " ")}</Badge>
                {(m.possiveis_respostas ?? []).length > 0 && <Badge tone="cyan">{m.possiveis_respostas.length} hipóteses</Badge>}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && <MisterioModal m={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function MisterioModal({ m, onClose }: { m: any; onClose: () => void }) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertMisterio);
  const del = useServerFn(deleteMisterio);
  const [form, setForm] = useState<any>({
    id: m?.id,
    pergunta: m?.pergunta ?? "",
    contexto: m?.contexto ?? "",
    status: m?.status ?? "sem_resposta",
    escopo_conhecimento: m?.escopo_conhecimento ?? "players",
    possiveis_respostas: m?.possiveis_respostas ?? [],
    resolucao_planejada: m?.resolucao_planejada ?? "",
    npcs_envolvidos: m?.npcs_envolvidos ?? [],
    faccoes_envolvidas: m?.faccoes_envolvidas ?? [],
    eventos_envolvidos: m?.eventos_envolvidos ?? [],
  });
  const [newHip, setNewHip] = useState("");

  const mut = useMutation({
    mutationFn: () => upsert({ data: form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["misterios"] }); onClose(); },
  });
  const d = useMutation({
    mutationFn: () => del({ data: { id: form.id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["misterios"] }); onClose(); },
  });

  function addHip() {
    if (!newHip.trim()) return;
    setForm({ ...form, possiveis_respostas: [...form.possiveis_respostas, { texto: newHip.trim() }] });
    setNewHip("");
  }

  return (
    <Modal open onClose={onClose} title={m?.id ? "Editar Mistério" : "Novo Mistério"} wide>
      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
        <Field label="Pergunta*"><Input required value={form.pergunta} onChange={(e) => setForm({ ...form, pergunta: e.target.value })} placeholder="O que o Peregrino viu no Núcleo?" /></Field>
        <Field label="Contexto"><Textarea rows={3} value={form.contexto} onChange={(e) => setForm({ ...form, contexto: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select></Field>
          <Field label="Quem sabe"><Select value={form.escopo_conhecimento} onChange={(e) => setForm({ ...form, escopo_conhecimento: e.target.value })}>{SCOPE.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select></Field>
        </div>

        <Field label="Hipóteses / Possíveis respostas">
          <div className="space-y-2">
            {form.possiveis_respostas.map((h: any, i: number) => (
              <div key={i} className="flex items-center gap-2 border border-border bg-surface-2 px-3 py-2">
                <span className="flex-1 text-sm">{h.texto}</span>
                <button type="button" onClick={() => setForm({ ...form, possiveis_respostas: form.possiveis_respostas.filter((_: any, j: number) => j !== i) })} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input value={newHip} onChange={(e) => setNewHip(e.target.value)} placeholder="Nova hipótese..." onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHip(); } }} />
              <Button variant="ghost" onClick={addHip}>+ Add</Button>
            </div>
          </div>
        </Field>

        <Field label="Resolução planejada (apenas staff vê)">
          <Textarea rows={4} value={form.resolucao_planejada} onChange={(e) => setForm({ ...form, resolucao_planejada: e.target.value })} className="font-mono text-xs" />
        </Field>

        {mut.error && <p className="text-mono text-xs text-destructive">{(mut.error as Error).message}</p>}
        <div className="flex justify-between gap-2">
          <div>{form.id && <Button variant="danger" onClick={() => { if (confirm("Excluir mistério?")) d.mutate(); }}><Trash2 className="h-3 w-3" /> Excluir</Button>}</div>
          <div className="flex gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={mut.isPending}>Salvar</Button></div>
        </div>
      </form>
    </Modal>
  );
}
