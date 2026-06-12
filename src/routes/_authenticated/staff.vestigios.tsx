import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listVestigios, upsertVestigio, appendVestigioHistorico } from "@/lib/staff.functions";
import { PageHeader, Button, Field, Input, Select, Textarea, Modal, Empty, Badge } from "@/components/staff-ui";
import { Plus, Pencil, History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff/vestigios")({
  component: VestigiosPage,
});

const ESTADOS = ["ativo", "morto", "instavel", "desaparecido"] as const;

function VestigiosPage() {
  const fetch = useServerFn(listVestigios);
  const { data } = useQuery({ queryKey: ["vestigios"], queryFn: () => fetch() });
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [historico, setHistorico] = useState<any | null>(null);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Banco · Vestígios"
        title="Vestígios"
        sub="Anomalias remanescentes. Vidas, esquadrão, histórico de aparições."
        actions={<Button onClick={() => { setEditing({}); setOpen(true); }}><Plus className="h-3 w-3" /> Novo Vestígio</Button>}
      />

      {(data ?? []).length === 0 ? (
        <Empty>Nenhum vestígio catalogado.</Empty>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {(data ?? []).map((v: any) => <VestCard key={v.id} v={v} onEdit={() => { setEditing(v); setOpen(true); }} onHistory={() => setHistorico(v)} />)}
        </div>
      )}

      {open && <VestModal v={editing} onClose={() => setOpen(false)} />}
      {historico && <HistoricoModal v={historico} onClose={() => setHistorico(null)} />}
    </div>
  );
}

function VestCard({ v, onEdit, onHistory }: { v: any; onEdit: () => void; onHistory: () => void }) {
  const tone: any = v.estado === "ativo" ? "green" : v.estado === "morto" ? "alert" : v.estado === "instavel" ? "amber" : "neutral";
  const dots = Array.from({ length: v.vidas_limite }).map((_, i) => i < v.vidas_atuais);
  return (
    <div className="group border border-border bg-surface-1 p-4 hover:border-cyan/40">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">VEST-{String(v.numero ?? "?").padStart(3, "0")}</p>
          <p className="mt-1 text-display text-lg font-bold">{v.nome}</p>
        </div>
        <Badge tone={tone}>{v.estado}</Badge>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {dots.map((alive, i) => (
          <span key={i} className={`h-3 w-3 border ${alive ? "border-cyan bg-cyan" : "border-destructive/50 bg-transparent"}`} />
        ))}
        <span className="ml-2 text-mono text-[11px] text-muted-foreground">{v.vidas_atuais}/{v.vidas_limite}</span>
      </div>
      {v.esquadrao && <p className="mt-2 text-mono text-[11px] text-muted-foreground">Esquadrão · {v.esquadrao}</p>}
      {v.ultima_aparicao && <p className="text-mono text-[11px] text-muted-foreground">Último visto · {v.ultima_aparicao}</p>}
      <div className="mt-3 flex justify-end gap-1">
        <Button size="sm" variant="ghost" onClick={onHistory}><History className="h-3 w-3" /></Button>
        <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-3 w-3" /> Editar</Button>
      </div>
    </div>
  );
}

function VestModal({ v, onClose }: { v: any; onClose: () => void }) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertVestigio);
  const [form, setForm] = useState<any>({
    id: v?.id, nome: v?.nome ?? "", numero: v?.numero ?? "",
    esquadrao: v?.esquadrao ?? "", vidas_atuais: v?.vidas_atuais ?? 3, vidas_limite: v?.vidas_limite ?? 3,
    ultima_aparicao: v?.ultima_aparicao ?? "", estado: v?.estado ?? "ativo", notas: v?.notas ?? "",
  });
  const m = useMutation({
    mutationFn: () => upsert({ data: { ...form, numero: form.numero === "" ? null : Number(form.numero) } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vestigios"] }); onClose(); },
  });
  return (
    <Modal open onClose={onClose} title={v?.id ? `Editar — ${v.nome}` : "Novo Vestígio"}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome*"><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
          <Field label="Número"><Input type="number" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></Field>
          <Field label="Esquadrão"><Input value={form.esquadrao} onChange={(e) => setForm({ ...form, esquadrao: e.target.value })} /></Field>
          <Field label="Estado"><Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>{ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
          <Field label="Vidas Atuais"><Input type="number" min={0} max={10} value={form.vidas_atuais} onChange={(e) => setForm({ ...form, vidas_atuais: Number(e.target.value) })} /></Field>
          <Field label="Vidas Limite"><Input type="number" min={1} max={10} value={form.vidas_limite} onChange={(e) => setForm({ ...form, vidas_limite: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Última Aparição"><Input value={form.ultima_aparicao} onChange={(e) => setForm({ ...form, ultima_aparicao: e.target.value })} /></Field>
        <Field label="Notas"><Textarea rows={3} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></Field>
        {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={m.isPending}>Salvar</Button></div>
      </form>
    </Modal>
  );
}

function HistoricoModal({ v, onClose }: { v: any; onClose: () => void }) {
  const qc = useQueryClient();
  const append = useServerFn(appendVestigioHistorico);
  const [txt, setTxt] = useState("");
  const m = useMutation({
    mutationFn: () => append({ data: { id: v.id, entrada: txt } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vestigios"] }); setTxt(""); },
  });
  const entries = Array.isArray(v.historico) ? v.historico : [];
  return (
    <Modal open onClose={onClose} title={`Histórico — ${v.nome}`}>
      <div className="space-y-4">
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {entries.length === 0 && <Empty>Sem entradas no histórico.</Empty>}
          {entries.slice().reverse().map((e: any, i: number) => (
            <div key={i} className="border-l-2 border-cyan/50 bg-surface-2 px-3 py-2">
              <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-cyan">{new Date(e.em).toLocaleString("pt-BR")}</p>
              <p className="mt-1 text-sm">{e.texto}</p>
            </div>
          ))}
        </div>
        <form onSubmit={(ev) => { ev.preventDefault(); if (txt.trim()) m.mutate(); }} className="space-y-2">
          <Field label="Adicionar entrada"><Textarea rows={2} value={txt} onChange={(e) => setTxt(e.target.value)} /></Field>
          <div className="flex justify-end"><Button type="submit" disabled={m.isPending || !txt.trim()}>Registrar</Button></div>
        </form>
      </div>
    </Modal>
  );
}
