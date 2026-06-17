import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { listDominios, upsertDominio, listNpcs } from "@/lib/staff.functions";
import { PageHeader, Button, Field, Input, Select, Textarea, Modal, Empty, Badge } from "@/components/staff-ui";
import { Plus, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff/dominios")({
  component: DominiosPage,
});

const STATUS = ["ativo", "encerrado", "selado", "instavel"] as const;

function DominiosPage() {
  const fetch = useServerFn(listDominios);
  const { data } = useQuery({ queryKey: ["dominios"], queryFn: () => fetch() });
  const [fc, setFc] = useState(""); const [fs, setFs] = useState(""); const [fr, setFr] = useState("");
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<any | null>(null);

  const classes = useMemo(() => Array.from(new Set((data ?? []).map((d: any) => d.classe).filter(Boolean))) as string[], [data]);
  const regentes = useMemo(() => Array.from(new Map((data ?? []).filter((d: any) => d.regente).map((d: any) => [d.regente.id, d.regente])).values()) as any[], [data]);

  const filtered = (data ?? []).filter((d: any) =>
    (!fc || d.classe === fc) && (!fs || d.status === fs) && (!fr || d.regente_npc_id === fr),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Banco · Domínios"
        title="Domínios"
        sub="Realidades acessadas via Rupturas. Classe, regente, dificuldade, agenda."
        actions={<Button onClick={() => { setEditing({}); setOpen(true); }}><Plus className="h-3 w-3" /> Novo Domínio</Button>}
      />
      <div className="flex flex-wrap gap-2">
        <Select value={fc} onChange={(e) => setFc(e.target.value)} className="w-auto"><option value="">Todas classes</option>{classes.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
        <Select value={fs} onChange={(e) => setFs(e.target.value)} className="w-auto"><option value="">Todos status</option>{STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
        <Select value={fr} onChange={(e) => setFr(e.target.value)} className="w-auto"><option value="">Todos regentes</option>{regentes.map((r: any) => <option key={r.id} value={r.id}>{r.nome}</option>)}</Select>
      </div>
      {filtered.length === 0 ? <Empty>Nenhum domínio.</Empty> : (
        <table className="w-full border border-border text-sm">
          <thead className="bg-surface-1 text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <tr><th className="px-3 py-2 text-left">Nome</th><th className="px-3 py-2 text-left">Classe</th><th className="px-3 py-2 text-left">Regente</th><th className="px-3 py-2 text-left">Dif.</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Próx. abertura</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody>
            {filtered.map((d: any) => (
              <tr key={d.id} className="border-t border-border hover:bg-surface-1">
                <td className="px-3 py-2.5 font-medium">{d.nome}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{d.classe || "n/d"}</td>
                <td className="px-3 py-2.5">{d.regente?.nome || "n/d"}</td>
                <td className="px-3 py-2.5 text-mono">{d.dificuldade ?? "n/d"}</td>
                <td className="px-3 py-2.5"><Badge tone={d.status === "ativo" ? "green" : d.status === "instavel" ? "amber" : d.status === "encerrado" ? "neutral" : "cyan"}>{d.status}</Badge></td>
                <td className="px-3 py-2.5 text-mono text-[11px]">{d.proxima_abertura ? new Date(d.proxima_abertura).toLocaleString("pt-BR") : "n/d"}</td>
                <td className="px-3 py-2.5 text-right"><Button size="sm" variant="ghost" onClick={() => { setEditing(d); setOpen(true); }}><Pencil className="h-3 w-3" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {open && <DomModal d={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function DomModal({ d, onClose }: { d: any; onClose: () => void }) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertDominio);
  const npcsFetch = useServerFn(listNpcs);
  const { data: npcs } = useQuery({ queryKey: ["npcs"], queryFn: () => npcsFetch() });
  const [form, setForm] = useState<any>({
    id: d?.id, nome: d?.nome ?? "", classe: d?.classe ?? "",
    regente_npc_id: d?.regente_npc_id ?? "", arquiteto_npc_id: d?.arquiteto_npc_id ?? "",
    dificuldade: d?.dificuldade ?? "", status: d?.status ?? "ativo",
    recompensas: (d?.recompensas ?? []).join("\n"), historico: d?.historico ?? "",
    ultima_abertura: d?.ultima_abertura?.slice(0, 16) ?? "", proxima_abertura: d?.proxima_abertura?.slice(0, 16) ?? "",
  });
  const m = useMutation({
    mutationFn: () => upsert({ data: {
      ...form,
      dificuldade: form.dificuldade === "" ? null : Number(form.dificuldade),
      regente_npc_id: form.regente_npc_id || null,
      arquiteto_npc_id: form.arquiteto_npc_id || null,
      recompensas: form.recompensas.split("\n").map((s: string) => s.trim()).filter(Boolean),
      ultima_abertura: form.ultima_abertura ? new Date(form.ultima_abertura).toISOString() : null,
      proxima_abertura: form.proxima_abertura ? new Date(form.proxima_abertura).toISOString() : null,
    } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dominios"] }); onClose(); },
  });
  return (
    <Modal open onClose={onClose} title={d?.id ? `Editar: ${d.nome}` : "Novo Domínio"} wide>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome*"><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
          <Field label="Classe"><Input value={form.classe} onChange={(e) => setForm({ ...form, classe: e.target.value })} /></Field>
          <Field label="Regente"><Select value={form.regente_npc_id} onChange={(e) => setForm({ ...form, regente_npc_id: e.target.value })}><option value="">Selecione...</option>{(npcs ?? []).map((n: any) => <option key={n.id} value={n.id}>{n.nome}</option>)}</Select></Field>
          <Field label="Arquiteto"><Select value={form.arquiteto_npc_id} onChange={(e) => setForm({ ...form, arquiteto_npc_id: e.target.value })}><option value="">Selecione...</option>{(npcs ?? []).map((n: any) => <option key={n.id} value={n.id}>{n.nome}</option>)}</Select></Field>
          <Field label="Dificuldade (1-10)"><Input type="number" min={1} max={10} value={form.dificuldade} onChange={(e) => setForm({ ...form, dificuldade: e.target.value })} /></Field>
          <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
          <Field label="Última abertura"><Input type="datetime-local" value={form.ultima_abertura} onChange={(e) => setForm({ ...form, ultima_abertura: e.target.value })} /></Field>
          <Field label="Próxima abertura"><Input type="datetime-local" value={form.proxima_abertura} onChange={(e) => setForm({ ...form, proxima_abertura: e.target.value })} /></Field>
        </div>
        <Field label="Recompensas (uma por linha)"><Textarea rows={3} value={form.recompensas} onChange={(e) => setForm({ ...form, recompensas: e.target.value })} /></Field>
        <Field label="Histórico"><Textarea rows={4} value={form.historico} onChange={(e) => setForm({ ...form, historico: e.target.value })} /></Field>
        {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={m.isPending}>Salvar</Button></div>
      </form>
    </Modal>
  );
}
