import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listDocumentos, upsertDocumento, getDocumento } from "@/lib/staff.functions";
import { PageHeader, Button, Field, Input, Select, Textarea, Modal, Empty, Badge } from "@/components/staff-ui";
import { Plus, FileText, History } from "lucide-react";
import { ContradictionCheck } from "@/components/contradiction-check";
import { renderMarkdown } from "@/lib/markdown";

export const Route = createFileRoute("/_authenticated/staff/documentos")({
  component: DocsPage,
});

const CLEARANCE = ["publico", "uniao", "instrutores", "diretores", "curadores", "restrito", "verdade_absoluta"] as const;

function DocsPage() {
  const fetch = useServerFn(listDocumentos);
  const { data } = useQuery({ queryKey: ["documentos"], queryFn: () => fetch() });
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<any | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Workspace · Documentos"
        title="Documentos Internos"
        sub="Markdown, anexos, histórico automático de revisões."
        actions={<Button onClick={() => { setEditing({}); setOpen(true); }}><Plus className="h-3 w-3" /> Novo Documento</Button>}
      />

      {(data ?? []).length === 0 ? <Empty>Nenhum documento criado.</Empty> : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-1">
            {(data ?? []).map((d: any) => (
              <button key={d.id} onClick={() => setSelected(d.slug)} className={`block w-full border-l-2 px-3 py-2 text-left transition-colors ${selected === d.slug ? "border-cyan bg-cyan/10" : "border-transparent hover:bg-surface-1"}`}>
                <p className="flex items-center gap-1.5 text-display text-sm font-medium"><FileText className="h-3 w-3 text-muted-foreground" />{d.titulo}</p>
                <p className="mt-0.5 text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{d.categoria || "—"}</p>
              </button>
            ))}
          </div>
          <div>{selected && <DocView slug={selected} onEdit={(doc) => { setEditing(doc); setOpen(true); }} />}</div>
        </div>
      )}
      {open && <DocModal d={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function DocView({ slug, onEdit }: { slug: string; onEdit: (d: any) => void }) {
  const fetch = useServerFn(getDocumento);
  const { data } = useQuery({ queryKey: ["doc", slug], queryFn: () => fetch({ data: { slug } }) });
  const [showRev, setShowRev] = useState(false);
  if (!data?.doc) return <Empty>Selecione um documento.</Empty>;
  return (
    <article className="border border-border bg-surface-1 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="hud-label text-cyan">{data.doc.categoria || "Documento"}</p>
          <h2 className="mt-1 text-display text-2xl font-bold">{data.doc.titulo}</h2>
          <div className="mt-2 flex gap-1"><Badge tone="amber">{data.doc.clearance}</Badge></div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setShowRev(true)}><History className="h-3 w-3" /> Revisões ({data.revisoes.length})</Button>
          <Button size="sm" onClick={() => onEdit(data.doc)}>Editar</Button>
        </div>
      </div>
      <div className="prose prose-invert mt-6 max-w-none text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(data.doc.conteudo || "") }} />
      {showRev && (
        <Modal open onClose={() => setShowRev(false)} title={`Revisões — ${data.doc.titulo}`} wide>
          <div className="space-y-3">
            {data.revisoes.length === 0 && <Empty>Sem revisões.</Empty>}
            {data.revisoes.map((r: any) => (
              <details key={r.id} className="border border-border bg-surface-2">
                <summary className="cursor-pointer px-3 py-2 text-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{new Date(r.criado_em).toLocaleString("pt-BR")} · {r.titulo}</summary>
                <pre className="overflow-auto whitespace-pre-wrap p-3 text-xs">{r.conteudo}</pre>
              </details>
            ))}
          </div>
        </Modal>
      )}
    </article>
  );
}

function DocModal({ d, onClose }: { d: any; onClose: () => void }) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertDocumento);
  const [form, setForm] = useState<any>({
    id: d?.id, titulo: d?.titulo ?? "", slug: d?.slug ?? "",
    conteudo: d?.conteudo ?? "", categoria: d?.categoria ?? "",
    clearance: d?.clearance ?? "uniao", anexos: d?.anexos ?? [],
  });
  const m = useMutation({
    mutationFn: () => upsert({ data: form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documentos"] }); qc.invalidateQueries({ queryKey: ["doc"] }); onClose(); },
  });
  return (
    <Modal open onClose={onClose} title={d?.id ? `Editar — ${d.titulo}` : "Novo Documento"} wide>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Título*"><Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></Field>
          <Field label="Slug*"><Input required pattern="[a-z0-9-]+" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <Field label="Categoria"><Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></Field>
          <Field label="Classificação"><Select value={form.clearance} onChange={(e) => setForm({ ...form, clearance: e.target.value })}>{CLEARANCE.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
        </div>
        <Field label="Conteúdo (markdown)"><Textarea rows={14} value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} className="font-mono text-xs" /></Field>
        {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={m.isPending}>Salvar</Button></div>
      </form>
    </Modal>
  );
}
