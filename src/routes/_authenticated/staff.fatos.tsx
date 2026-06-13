import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { listFatos, upsertFato, deleteFato } from "@/lib/canon.functions";
import { PageHeader, Button, Field, Input, Select, Textarea, Modal, Empty, Badge } from "@/components/staff-ui";
import { Plus, Search, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff/fatos")({
  component: FatosPage,
});

const STATUS = ["canonico", "provavel", "rumor", "descartado", "retconado"] as const;
const SCOPE = ["players", "uniao", "diretores", "curadores", "staff_apenas"] as const;
const CATEGORIAS = ["personagem", "faccao", "evento", "dominio", "regra_universo", "vestigio", "objeto", "local", "outro"];

function statusTone(s: string): any {
  return s === "canonico" ? "green" : s === "provavel" ? "cyan" : s === "rumor" ? "amber" : "alert";
}

function FatosPage() {
  const fetch = useServerFn(listFatos);
  const { data } = useQuery({ queryKey: ["fatos"], queryFn: () => fetch() });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [q, setQ] = useState("");
  const [scopeF, setScopeF] = useState<string>("");
  const [statusF, setStatusF] = useState<string>("");

  const filtered = useMemo(() => {
    let arr = data ?? [];
    if (q) {
      const lq = q.toLowerCase();
      arr = arr.filter((f: any) =>
        f.titulo.toLowerCase().includes(lq) ||
        f.descricao.toLowerCase().includes(lq) ||
        (f.palavras_chave ?? []).some((k: string) => k.toLowerCase().includes(lq))
      );
    }
    if (scopeF) arr = arr.filter((f: any) => f.escopo_conhecimento === scopeF);
    if (statusF) arr = arr.filter((f: any) => f.status === statusF);
    return arr;
  }, [data, q, scopeF, statusF]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Workspace · Consistência Narrativa"
        title="Fatos Canônicos"
        sub="Banco imutável de verdades do universo. Usado pelo verificador automático de contradições."
        actions={<Button onClick={() => { setEditing({}); setOpen(true); }}><Plus className="h-3 w-3" /> Novo Fato</Button>}
      />

      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título, descrição ou palavra-chave..." className="pl-9" />
        </div>
        <Select value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={scopeF} onChange={(e) => setScopeF(e.target.value)}>
          <option value="">Todos os escopos</option>
          {SCOPE.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </Select>
      </div>

      {filtered.length === 0 ? <Empty>Nenhum fato cadastrado.</Empty> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((f: any) => (
            <button key={f.id} onClick={() => { setEditing(f); setOpen(true); }} className="border border-border bg-surface-1 p-4 text-left transition-colors hover:border-cyan/50">
              <div className="flex items-start justify-between gap-2">
                <p className="text-display text-sm font-bold">{f.titulo}</p>
                <Badge tone={statusTone(f.status)}>{f.status}</Badge>
              </div>
              <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{f.descricao}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge tone="cyan">{f.categoria}</Badge>
                <Badge>{f.escopo_conhecimento.replace("_", " ")}</Badge>
                {(f.palavras_chave ?? []).slice(0, 4).map((k: string) => <Badge key={k}>#{k}</Badge>)}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && <FatoModal f={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function FatoModal({ f, onClose }: { f: any; onClose: () => void }) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertFato);
  const del = useServerFn(deleteFato);
  const [form, setForm] = useState<any>({
    id: f?.id,
    titulo: f?.titulo ?? "",
    descricao: f?.descricao ?? "",
    categoria: f?.categoria ?? "personagem",
    fonte: f?.fonte ?? "",
    status: f?.status ?? "canonico",
    escopo_conhecimento: f?.escopo_conhecimento ?? "staff_apenas",
    palavras_chave: (f?.palavras_chave ?? []).join(", "),
    faccoes_relacionadas: (f?.faccoes_relacionadas ?? []).join(", "),
    notas: f?.notas ?? "",
    npcs_relacionados: f?.npcs_relacionados ?? [],
    eventos_relacionados: f?.eventos_relacionados ?? [],
  });
  const m = useMutation({
    mutationFn: () => upsert({
      data: {
        ...form,
        palavras_chave: form.palavras_chave.split(",").map((s: string) => s.trim()).filter(Boolean),
        faccoes_relacionadas: form.faccoes_relacionadas.split(",").map((s: string) => s.trim()).filter(Boolean),
      },
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fatos"] }); onClose(); },
  });
  const d = useMutation({
    mutationFn: () => del({ data: { id: form.id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fatos"] }); onClose(); },
  });

  return (
    <Modal open onClose={onClose} title={f?.id ? `Editar — ${f.titulo}` : "Novo Fato Canônico"} wide>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
        <Field label="Título*"><Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></Field>
        <Field label="Descrição*"><Textarea required rows={4} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Categoria"><Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>{CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
          <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
          <Field label="Quem sabe"><Select value={form.escopo_conhecimento} onChange={(e) => setForm({ ...form, escopo_conhecimento: e.target.value })}>{SCOPE.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select></Field>
        </div>
        <Field label="Fonte (sessão, livro, decisão da staff)"><Input value={form.fonte} onChange={(e) => setForm({ ...form, fonte: e.target.value })} /></Field>
        <Field label="Palavras-chave (separe por vírgula — usadas pelo verificador automático)">
          <Input value={form.palavras_chave} onChange={(e) => setForm({ ...form, palavras_chave: e.target.value })} placeholder="rei pálido, vestígio, núcleo" />
        </Field>
        <Field label="Facções relacionadas (separe por vírgula)">
          <Input value={form.faccoes_relacionadas} onChange={(e) => setForm({ ...form, faccoes_relacionadas: e.target.value })} />
        </Field>
        <Field label="Notas internas"><Textarea rows={3} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></Field>
        {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}
        <div className="flex justify-between gap-2">
          <div>{form.id && <Button variant="danger" onClick={() => { if (confirm("Excluir fato?")) d.mutate(); }}><Trash2 className="h-3 w-3" /> Excluir</Button>}</div>
          <div className="flex gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={m.isPending}>Salvar</Button></div>
        </div>
      </form>
    </Modal>
  );
}
