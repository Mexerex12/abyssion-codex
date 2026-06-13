import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { listNpcs, upsertNpc, deleteNpc } from "@/lib/staff.functions";
import { PageHeader, Button, Field, Input, Select, Textarea, Modal, Empty, Badge } from "@/components/staff-ui";
import { Plus, Search, Pencil, Trash2, MessageCircle } from "lucide-react";
import { ContradictionCheck } from "@/components/contradiction-check";
import { NpcChatModal } from "@/components/npc-chat-modal";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/staff/npcs")({
  component: NpcsPage,
});

const STATUS = ["ativo", "morto", "desaparecido", "oculto", "corrompido"] as const;
const CLEARANCE = ["publico", "uniao", "instrutores", "diretores", "curadores", "restrito", "verdade_absoluta"] as const;

function NpcsPage() {
  const { isAdmin } = useAuth();
  const fetch = useServerFn(listNpcs);
  const { data } = useQuery({ queryKey: ["npcs"], queryFn: () => fetch() });
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFaccao, setFilterFaccao] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return (data ?? []).filter((n: any) =>
      (!q || n.nome.toLowerCase().includes(q.toLowerCase()) || (n.cargo ?? "").toLowerCase().includes(q.toLowerCase())) &&
      (!filterStatus || n.status === filterStatus) &&
      (!filterFaccao || n.faccao === filterFaccao),
    );
  }, [data, q, filterStatus, filterFaccao]);

  const faccoes = useMemo(() => Array.from(new Set((data ?? []).map((n: any) => n.faccao).filter(Boolean))) as string[], [data]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Banco de Dados · NPCs"
        title="NPCs"
        sub="Fichas operacionais. Status, segredos, relacionamentos."
        actions={<Button onClick={() => { setEditing({}); setOpen(true); }}><Plus className="h-3 w-3" /> Novo NPC</Button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nome ou cargo..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-auto">
          <option value="">Todos os status</option>
          {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={filterFaccao} onChange={(e) => setFilterFaccao(e.target.value)} className="w-auto">
          <option value="">Todas as facções</option>
          {faccoes.map((f) => <option key={f} value={f}>{f}</option>)}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Empty>Nenhum NPC cadastrado. Comece criando um novo registro.</Empty>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((n: any) => (
            <NpcCard key={n.id} npc={n} onEdit={() => { setEditing(n); setOpen(true); }} canDelete={isAdmin} />
          ))}
        </div>
      )}

      {open && <NpcModal npc={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function NpcCard({ npc, onEdit, canDelete }: { npc: any; onEdit: () => void; canDelete: boolean }) {
  const qc = useQueryClient();
  const del = useServerFn(deleteNpc);
  const m = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["npcs"] }) });
  const tone: any = npc.status === "ativo" ? "green" : npc.status === "morto" ? "alert" : npc.status === "corrompido" ? "amber" : "neutral";
  return (
    <div className="group relative border border-border bg-surface-1 p-4 hover:border-cyan/40">
      <div className="flex items-start gap-3">
        {npc.imagem_url ? (
          <img src={npc.imagem_url} alt="" className="h-14 w-14 border border-border object-cover" />
        ) : (
          <div className="grid h-14 w-14 place-items-center border border-border bg-surface-2 text-display text-lg text-muted-foreground">
            {npc.nome[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-display text-base font-bold">{npc.nome}</p>
          <p className="truncate text-mono text-[11px] text-muted-foreground">{npc.cargo || "—"}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Badge tone={tone}>{npc.status}</Badge>
            {npc.faccao && <Badge tone="cyan">{npc.faccao}</Badge>}
          </div>
        </div>
      </div>
      {npc.localizacao && <p className="mt-2 text-mono text-[11px] text-muted-foreground">📍 {npc.localizacao}</p>}
      <div className="mt-3 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-3 w-3" /> Editar</Button>
        {canDelete && <Button size="sm" variant="danger" onClick={() => confirm(`Apagar ${npc.nome}?`) && m.mutate(npc.id)}><Trash2 className="h-3 w-3" /></Button>}
      </div>
    </div>
  );
}

function NpcModal({ npc, onClose }: { npc: any; onClose: () => void }) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertNpc);
  const [form, setForm] = useState<any>({
    id: npc?.id,
    nome: npc?.nome ?? "",
    imagem_url: npc?.imagem_url ?? "",
    cargo: npc?.cargo ?? "",
    faccao: npc?.faccao ?? "",
    status: npc?.status ?? "ativo",
    localizacao: npc?.localizacao ?? "",
    objetivos: (npc?.objetivos ?? []).join("\n"),
    segredos: npc?.segredos ?? "",
    segredos_clearance: npc?.segredos_clearance ?? "diretores",
    ultima_aparicao: npc?.ultima_aparicao ?? "",
    observacoes_staff: npc?.observacoes_staff ?? "",
  });
  const m = useMutation({
    mutationFn: () => upsert({ data: { ...form, objetivos: form.objetivos.split("\n").map((s: string) => s.trim()).filter(Boolean) } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["npcs"] }); onClose(); },
  });
  return (
    <Modal open onClose={onClose} title={npc?.id ? `Editar — ${npc.nome}` : "Novo NPC"} wide>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome*"><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
          <Field label="Imagem (URL)"><Input value={form.imagem_url} onChange={(e) => setForm({ ...form, imagem_url: e.target.value })} /></Field>
          <Field label="Cargo"><Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></Field>
          <Field label="Facção"><Input value={form.faccao} onChange={(e) => setForm({ ...form, faccao: e.target.value })} /></Field>
          <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
          <Field label="Localização"><Input value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} /></Field>
        </div>
        <Field label="Objetivos (um por linha)"><Textarea rows={3} value={form.objetivos} onChange={(e) => setForm({ ...form, objetivos: e.target.value })} /></Field>
        <Field label="Última Aparição"><Input value={form.ultima_aparicao} onChange={(e) => setForm({ ...form, ultima_aparicao: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Segredos (markdown)"><Textarea rows={4} value={form.segredos} onChange={(e) => setForm({ ...form, segredos: e.target.value })} /></Field>
          <Field label="Classificação dos Segredos"><Select value={form.segredos_clearance} onChange={(e) => setForm({ ...form, segredos_clearance: e.target.value })}>{CLEARANCE.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
        </div>
        <Field label="Observações da Staff"><Textarea rows={3} value={form.observacoes_staff} onChange={(e) => setForm({ ...form, observacoes_staff: e.target.value })} /></Field>
        <ContradictionCheck text={`${form.nome} ${form.cargo ?? ""} ${form.segredos ?? ""} ${form.observacoes_staff ?? ""} ${(form.objetivos ?? []).join(" ")}`} />
        {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={m.isPending}>Salvar</Button></div>
      </form>
    </Modal>
  );
}
