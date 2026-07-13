import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  listEventos, upsertEvento, finalizarEvento,
  listDominios, listNpcs, listNarradores,
} from "@/lib/staff.functions";
import { PageHeader, Button, Field, Input, Select, Textarea, Modal, Badge } from "@/components/staff-ui";
import { Plus, ChevronLeft, ChevronRight, FileText, X } from "lucide-react";
import { ContradictionCheck } from "@/components/contradiction-check";

export const Route = createFileRoute("/_authenticated/staff/calendario")({
  component: CalendarioPage,
});

const STATUS = ["planejado", "em_andamento", "concluido", "cancelado"] as const;
const TIPOS = ["global", "faccao", "esquadrao", "secreto"] as const;
const CATEGORIAS = ["evento", "operacao", "sessao", "reuniao"] as const;
type Categoria = (typeof CATEGORIAS)[number];
const CATEGORIA_META: Record<Categoria, { label: string; dot: string; bar: string; chip: string }> = {
  evento:   { label: "Evento",   dot: "bg-cyan",         bar: "border-cyan bg-cyan/10 text-cyan",                 chip: "border-cyan/40 bg-cyan/10 text-cyan" },
  operacao: { label: "Operação", dot: "bg-destructive",  bar: "border-destructive bg-destructive/10 text-destructive", chip: "border-destructive/40 bg-destructive/10 text-destructive" },
  sessao:   { label: "Sessão",   dot: "bg-amber-500",    bar: "border-amber-500 bg-amber-500/10 text-amber-300",  chip: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  reuniao:  { label: "Reunião",  dot: "bg-emerald-500",  bar: "border-emerald-500 bg-emerald-500/10 text-emerald-300", chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
};
const CLEARANCE = ["publico", "uniao", "instrutores", "diretores", "curadores", "restrito", "verdade_absoluta"] as const;
const STATUS_TONE: Record<string, "cyan" | "amber" | "green" | "alert" | "neutral"> = {
  planejado: "cyan", em_andamento: "amber", concluido: "green", cancelado: "alert",
};
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function CalendarioPage() {
  const fetchEv = useServerFn(listEventos);
  const { data: eventos } = useQuery({ queryKey: ["eventos"], queryFn: () => fetchEv() });
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [finalizing, setFinalizing] = useState<any | null>(null);
  const [filter, setFilter] = useState<Record<Categoria, boolean>>({
    evento: true, operacao: true, sessao: true, reuniao: true,
  });

  const visibleEventos = useMemo(
    () => (eventos ?? []).filter((e: any) => filter[(e.categoria ?? "evento") as Categoria]),
    [eventos, filter],
  );

  const grid = useMemo(() => {
    const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: { date: Date | null }[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d) });
    while (cells.length % 7 !== 0) cells.push({ date: null });
    return cells;
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const e of visibleEventos) {
      if (!e.data) continue;
      const k = new Date(e.data).toISOString().slice(0, 10);
      const arr = map.get(k) ?? []; arr.push(e); map.set(k, arr);
    }
    return map;
  }, [visibleEventos]);

  const openNew = (date?: Date) => {
    const base: any = {};
    if (date) {
      const d = new Date(date); d.setHours(20, 0, 0, 0);
      base.data = d.toISOString().slice(0, 16);
    }
    setEditing(base); setOpen(true);
  };

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendário"
        actions={<Button onClick={() => openNew()}><Plus className="h-3 w-3" /> Agendar</Button>}
      />

      <div className="flex flex-wrap items-center gap-2 border border-border bg-surface-1 px-3 py-2">
        {CATEGORIAS.map((c) => {
          const meta = CATEGORIA_META[c];
          const active = filter[c];
          return (
            <button
              key={c}
              onClick={() => setFilter((f) => ({ ...f, [c]: !f[c] }))}
              className={`inline-flex items-center gap-1.5 border px-2 py-1 text-mono text-[10px] uppercase tracking-[0.14em] transition-opacity ${
                active ? meta.chip : "border-border text-muted-foreground opacity-50"
              }`}
            >
              <span className={`inline-block h-2 w-2 ${meta.dot}`} />
              {meta.label}
            </button>
          );
        })}
      </div>

      <div className="border border-border bg-surface-1">
        <div className="flex items-center justify-between border-b border-border bg-surface-2 px-3 py-2">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="border border-border bg-background p-1 hover:border-cyan/50">
            <ChevronLeft className="h-3 w-3" />
          </button>
          <p className="text-display text-sm font-bold uppercase tracking-[0.18em] text-cyan">
            {MONTHS[cursor.getMonth()]} / {cursor.getFullYear()}
          </p>
          <div className="flex gap-2">
            <button onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }} className="border border-border bg-background px-2 py-1 text-mono text-[10px] uppercase tracking-[0.14em] hover:border-cyan/50">
              Hoje
            </button>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="border border-border bg-background p-1 hover:border-cyan/50">
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-border bg-background">
          {WEEKDAYS.map((w) => (
            <p key={w} className="border-r border-border px-2 py-1.5 text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground last:border-r-0">{w}</p>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((c, i) => {
            if (!c.date) return <div key={i} className="min-h-[110px] border-b border-r border-border bg-surface-2/30 last:border-r-0" />;
            const key = c.date.toISOString().slice(0, 10);
            const items = byDay.get(key) ?? [];
            const isToday = key === todayKey;
            return (
              <div key={i} className={`group relative min-h-[110px] border-b border-r border-border p-1.5 last:border-r-0 ${isToday ? "bg-cyan/5" : "bg-background"}`}>
                <div className="flex items-center justify-between">
                  <p className={`text-mono text-[11px] ${isToday ? "font-bold text-cyan" : "text-muted-foreground"}`}>{c.date.getDate()}</p>
                  <button onClick={() => openNew(c.date!)} className="opacity-0 transition-opacity group-hover:opacity-100">
                    <Plus className="h-3 w-3 text-muted-foreground hover:text-cyan" />
                  </button>
                </div>
                <div className="mt-1 space-y-1">
                  {items.slice(0, 3).map((e) => {
                    const cat = (e.categoria ?? "evento") as Categoria;
                    const cancelled = e.status === "cancelado";
                    const done = e.status === "concluido";
                    return (
                      <button
                        key={e.id}
                        onClick={() => { setEditing(e); setOpen(true); }}
                        className={`block w-full truncate border-l-2 px-1.5 py-0.5 text-left text-mono text-[10px] ${CATEGORIA_META[cat].bar} ${cancelled ? "opacity-50 line-through" : ""} ${done ? "opacity-80" : ""}`}
                        title={`${CATEGORIA_META[cat].label} · ${e.nome}`}
                      >
                        {new Date(e.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {e.nome}
                      </button>
                    );
                  })}
                  {items.length > 3 && <p className="px-1.5 text-mono text-[9px] text-muted-foreground">+{items.length - 3} mais</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border border-border bg-surface-1">
        <div className="border-b border-border bg-surface-2 px-3 py-2"><p className="hud-label text-cyan">Próximas Sessões</p></div>
        <div className="divide-y divide-border">
          {(eventos ?? [])
            .filter((e: any) => e.data && new Date(e.data) >= new Date(Date.now() - 86400000) && e.status !== "concluido" && e.status !== "cancelado")
            .sort((a: any, b: any) => +new Date(a.data) - +new Date(b.data))
            .slice(0, 6)
            .map((e: any) => (
              <button key={e.id} onClick={() => { setEditing(e); setOpen(true); }} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-surface-2">
                <div>
                  <p className="text-display text-sm font-bold">{e.nome}</p>
                  <p className="mt-0.5 text-mono text-[10px] text-muted-foreground">
                    {new Date(e.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    {e.dominio?.nome ? ` · ${e.dominio.nome}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Badge tone="cyan">{e.tipo}</Badge>
                  <Badge tone={STATUS_TONE[e.status]}>{e.status.replace("_", " ")}</Badge>
                </div>
              </button>
            ))}
          {(eventos ?? []).filter((e: any) => e.data && new Date(e.data) >= new Date(Date.now() - 86400000) && e.status !== "concluido" && e.status !== "cancelado").length === 0 && (
            <p className="px-3 py-6 text-center text-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Nenhuma sessão agendada.</p>
          )}
        </div>
      </div>

      {open && <SessionModal e={editing} onClose={() => setOpen(false)} onFinalize={(ev) => { setOpen(false); setFinalizing(ev); }} />}
      {finalizing && <RelatorioModal e={finalizing} onClose={() => setFinalizing(null)} />}
    </div>
  );
}

function SessionModal({ e, onClose, onFinalize }: { e: any; onClose: () => void; onFinalize: (e: any) => void }) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertEvento);
  const fetchDom = useServerFn(listDominios);
  const fetchNpcs = useServerFn(listNpcs);
  const fetchNarr = useServerFn(listNarradores);
  const { data: doms } = useQuery({ queryKey: ["dominios"], queryFn: () => fetchDom() });
  const { data: npcs } = useQuery({ queryKey: ["npcs"], queryFn: () => fetchNpcs() });
  const { data: narradores } = useQuery({ queryKey: ["narradores"], queryFn: () => fetchNarr() });

  const [form, setForm] = useState<any>({
    id: e?.id,
    nome: e?.nome ?? "",
    data: e?.data ? new Date(e.data).toISOString().slice(0, 16) : "",
    narrador_id: e?.narrador_id ?? "",
    dominio_id: e?.dominio_id ?? "",
    npcs_envolvidos: e?.npcs_envolvidos ?? [],
    esquadroes: e?.esquadroes ?? [],
    resumo: e?.resumo ?? "",
    consequencias: e?.consequencias ?? "",
    relatorio: e?.relatorio ?? "",
    status: e?.status ?? "planejado",
    tipo: e?.tipo ?? "global",
    clearance: e?.clearance ?? "uniao",
  });
  const [esquadInput, setEsquadInput] = useState("");

  const m = useMutation({
    mutationFn: () => upsert({ data: {
      ...form,
      dominio_id: form.dominio_id || null,
      narrador_id: form.narrador_id || null,
      data: form.data ? new Date(form.data).toISOString() : null,
    } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["eventos"] }); onClose(); },
  });

  const toggleNpc = (id: string) => setForm((f: any) => ({
    ...f, npcs_envolvidos: f.npcs_envolvidos.includes(id) ? f.npcs_envolvidos.filter((x: string) => x !== id) : [...f.npcs_envolvidos, id],
  }));
  const addEsquad = () => {
    const v = esquadInput.trim(); if (!v) return;
    if (form.esquadroes.includes(v)) { setEsquadInput(""); return; }
    setForm((f: any) => ({ ...f, esquadroes: [...f.esquadroes, v] })); setEsquadInput("");
  };
  const removeEsquad = (v: string) => setForm((f: any) => ({ ...f, esquadroes: f.esquadroes.filter((x: string) => x !== v) }));

  const canFinalize = !!form.id && form.status !== "concluido" && form.status !== "cancelado";

  return (
    <Modal open onClose={onClose} title={e?.id ? `Sessão: ${e.nome}` : "Agendar Sessão"} wide>
      <form onSubmit={(ev) => { ev.preventDefault(); m.mutate(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome*"><Input required value={form.nome} onChange={(ev) => setForm({ ...form, nome: ev.target.value })} /></Field>
          <Field label="Data e Hora"><Input type="datetime-local" value={form.data} onChange={(ev) => setForm({ ...form, data: ev.target.value })} /></Field>
          <Field label="Narrador">
            <Select value={form.narrador_id} onChange={(ev) => setForm({ ...form, narrador_id: ev.target.value })}>
              <option value="">Eu (padrão)</option>
              {(narradores ?? []).map((n: any) => <option key={n.id} value={n.id}>{n.display_name ?? n.id.slice(0, 8)}</option>)}
            </Select>
          </Field>
          <Field label="Domínio">
            <Select value={form.dominio_id} onChange={(ev) => setForm({ ...form, dominio_id: ev.target.value })}>
              <option value="">Selecione...</option>
              {(doms ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </Select>
          </Field>
          <Field label="Tipo">
            <Select value={form.tipo} onChange={(ev) => setForm({ ...form, tipo: ev.target.value })}>{TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(ev) => setForm({ ...form, status: ev.target.value })}>{STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
          </Field>
          <Field label="Classificação">
            <Select value={form.clearance} onChange={(ev) => setForm({ ...form, clearance: ev.target.value })}>{CLEARANCE.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
          </Field>
        </div>

        <Field label="NPCs envolvidos">
          <div className="max-h-32 overflow-y-auto border border-border bg-surface-2 p-2">
            <div className="flex flex-wrap gap-1">
              {(npcs ?? []).map((n: any) => (
                <button key={n.id} type="button" onClick={() => toggleNpc(n.id)}
                  className={`border px-2 py-0.5 text-mono text-[10px] uppercase tracking-[0.14em] ${
                    form.npcs_envolvidos.includes(n.id) ? "border-cyan bg-cyan text-cyan-foreground" : "border-border text-muted-foreground hover:border-cyan"
                  }`}>{n.nome}</button>
              ))}
              {(npcs ?? []).length === 0 && <span className="text-mono text-[11px] text-muted-foreground">Nenhum NPC cadastrado ainda.</span>}
            </div>
          </div>
        </Field>

        <Field label="Esquadrões participantes">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Nome do esquadrão (ex: Esquadrão Vértice)"
                value={esquadInput}
                onChange={(ev) => setEsquadInput(ev.target.value)}
                onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); addEsquad(); } }}
              />
              <Button type="button" variant="ghost" onClick={addEsquad}>Adicionar</Button>
            </div>
            {form.esquadroes.length > 0 && (
              <div className="flex flex-wrap gap-1 border border-border bg-surface-2 p-2">
                {form.esquadroes.map((s: string) => (
                  <span key={s} className="inline-flex items-center gap-1 border border-cyan/40 bg-cyan/10 px-2 py-0.5 text-mono text-[10px] uppercase tracking-[0.14em] text-cyan">
                    {s}
                    <button type="button" onClick={() => removeEsquad(s)} className="hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Field>

        <Field label="Resumo / Briefing"><Textarea rows={3} value={form.resumo} onChange={(ev) => setForm({ ...form, resumo: ev.target.value })} /></Field>

        <ContradictionCheck text={`${form.nome} ${form.resumo ?? ""}`} />

        {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}

        <div className="flex items-center justify-between gap-2">
          <div>
            {canFinalize && (
              <Button type="button" variant="ghost" onClick={() => onFinalize({ ...e, ...form })}>
                <FileText className="h-3 w-3" /> Gerar Relatório Final
              </Button>
            )}
            {form.status === "concluido" && e?.lore_entry_id && (
              <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-emerald-400">✓ Publicado na linha do tempo</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={m.isPending}>{form.id ? "Salvar" : "Agendar"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function RelatorioModal({ e, onClose }: { e: any; onClose: () => void }) {
  const qc = useQueryClient();
  const finalize = useServerFn(finalizarEvento);
  const [relatorio, setRelatorio] = useState<string>(e.relatorio ?? "");
  const [consequencias, setConsequencias] = useState<string>(e.consequencias ?? "");

  const m = useMutation({
    mutationFn: () => finalize({ data: { id: e.id, relatorio, consequencias: consequencias || null } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["eventos"] }); qc.invalidateQueries({ queryKey: ["lore"] }); onClose(); },
  });

  return (
    <Modal open onClose={onClose} title={`Relatório Final: ${e.nome}`} wide>
      <form onSubmit={(ev) => { ev.preventDefault(); m.mutate(); }} className="space-y-4">
        <div className="border border-cyan/30 bg-cyan/5 p-3">
          <p className="hud-label text-cyan">Publicação na Linha do Tempo</p>
          <p className="mt-1 text-mono text-[11px] text-muted-foreground">
            Ao confirmar, o evento será marcado como <strong className="text-foreground">concluído</strong> e o relatório abaixo será publicado
            automaticamente como entrada de lore com a classificação <strong className="text-foreground">{e.clearance}</strong>.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <div><p className="text-cyan">Data</p><p className="text-foreground">{e.data ? new Date(e.data).toLocaleString("pt-BR") : "n/d"}</p></div>
          <div><p className="text-cyan">Domínio</p><p className="text-foreground">{e.dominio?.nome ?? "n/d"}</p></div>
          <div><p className="text-cyan">Esquadrões</p><p className="text-foreground">{(e.esquadroes ?? []).join(", ") || "n/d"}</p></div>
        </div>

        <Field label="Relatório da Sessão*">
          <Textarea
            required
            rows={10}
            placeholder="Descreva o que aconteceu, decisões dos jogadores, ações dos NPCs, reviravoltas..."
            value={relatorio}
            onChange={(ev) => setRelatorio(ev.target.value)}
          />
        </Field>

        <Field label="Consequências Narrativas">
          <Textarea
            rows={4}
            placeholder="Mudanças no mundo, mortes, segredos revelados, novos ganchos..."
            value={consequencias}
            onChange={(ev) => setConsequencias(ev.target.value)}
          />
        </Field>

        <ContradictionCheck text={`${relatorio} ${consequencias}`} />

        {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={m.isPending || relatorio.trim().length < 10}>
            <FileText className="h-3 w-3" /> Publicar na Linha do Tempo
          </Button>
        </div>
      </form>
    </Modal>
  );
}
