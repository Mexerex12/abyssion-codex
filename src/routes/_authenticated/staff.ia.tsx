import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  askLore, gerarEvento, gerarDominio, gerarNpc, gerarGanchos, analisarImpacto,
} from "@/lib/ai.functions";
import { PageHeader, Button, Field, Input, Textarea, Select } from "@/components/staff-ui";
import { Sparkles, BookOpenText, Castle, Users, Lightbulb, ShieldAlert, MessagesSquare } from "lucide-react";
import { renderMarkdown } from "@/lib/markdown";

export const Route = createFileRoute("/_authenticated/staff/ia")({ component: AIPage });

const TABS = [
  { id: "lore", label: "Motor de Lore", icon: BookOpenText },
  { id: "evento", label: "Evento", icon: Sparkles },
  { id: "dominio", label: "Domínio", icon: Castle },
  { id: "npc", label: "NPC", icon: Users },
  { id: "ganchos", label: "Ganchos", icon: Lightbulb },
  { id: "impacto", label: "Impacto", icon: ShieldAlert },
] as const;

function AIPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("lore");
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="IA Narrativa · Curador-Auxiliar"
        title="Central de Inteligência Narrativa"
        sub="Ferramentas de IA alimentadas com toda a lore, NPCs, eventos e fatos canônicos do sistema."
      />
      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                active ? "border-cyan text-cyan" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>
      <div className="rounded-none border border-border bg-surface-1 p-5">
        {tab === "lore" && <LoreQA />}
        {tab === "evento" && <EventoGen />}
        {tab === "dominio" && <DominioGen />}
        {tab === "npc" && <NpcGen />}
        {tab === "ganchos" && <GanchosGen />}
        {tab === "impacto" && <ImpactoAnalise />}
      </div>
      <p className="flex items-center gap-2 text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <MessagesSquare className="h-3 w-3" /> Para conversar como um NPC específico, abra a página NPCs e use o botão "Conversar como este NPC".
      </p>
    </div>
  );
}

function Result({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div
      className="prose prose-invert mt-4 max-w-none border-l-2 border-cyan/50 bg-surface-2 p-4 text-sm"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
    />
  );
}

function useGen<TIn, TOut extends { result?: string; answer?: string; reply?: string }>(fn: any) {
  const call = useServerFn(fn);
  return useMutation({ mutationFn: (data: TIn) => call({ data }) as Promise<TOut> });
}

function LoreQA() {
  const m = useGen<{ question: string }, { answer: string }>(askLore);
  const [q, setQ] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate({ question: q }); }} className="space-y-3">
      <Field label="Pergunta sobre o universo">
        <Textarea rows={3} value={q} onChange={(e) => setQ(e.target.value)} placeholder='Ex: "Qual a relação entre Miranda e o Peregrino Branco?"' />
      </Field>
      <Button type="submit" disabled={m.isPending || !q.trim()}>{m.isPending ? "Consultando..." : "Consultar Motor de Lore"}</Button>
      {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}
      <Result text={m.data?.answer ?? ""} />
    </form>
  );
}

function EventoGen() {
  const m = useGen<any, { result: string }>(gerarEvento);
  const [f, setF] = useState({ players: 6, perigo: "alto", faccoes: "", objetivo: "" });
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(f); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantidade de players"><Input type="number" min={1} max={50} value={f.players} onChange={(e) => setF({ ...f, players: Number(e.target.value) })} /></Field>
        <Field label="Nível de perigo">
          <Select value={f.perigo} onChange={(e) => setF({ ...f, perigo: e.target.value })}>
            {["baixo", "médio", "alto", "crítico", "catastrófico"].map((p) => <option key={p}>{p}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Facções envolvidas"><Input value={f.faccoes} onChange={(e) => setF({ ...f, faccoes: e.target.value })} placeholder="União Trivalente, Vestígios..." /></Field>
      <Field label="Objetivo do evento"><Textarea rows={3} value={f.objetivo} onChange={(e) => setF({ ...f, objetivo: e.target.value })} /></Field>
      <Button type="submit" disabled={m.isPending || !f.objetivo.trim()}>{m.isPending ? "Gerando..." : "Gerar Evento"}</Button>
      {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}
      <Result text={m.data?.result ?? ""} />
    </form>
  );
}

function DominioGen() {
  const m = useGen<any, { result: string }>(gerarDominio);
  const [f, setF] = useState<any>({ tema: "", classe: "", dificuldade: 5 });
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(f); }} className="space-y-3">
      <Field label="Tema / conceito (opcional)"><Input value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Classe (opcional)"><Input value={f.classe} onChange={(e) => setF({ ...f, classe: e.target.value })} /></Field>
        <Field label="Dificuldade (1-10)"><Input type="number" min={1} max={10} value={f.dificuldade} onChange={(e) => setF({ ...f, dificuldade: Number(e.target.value) })} /></Field>
      </div>
      <Button type="submit" disabled={m.isPending}>{m.isPending ? "Gerando..." : "Gerar Domínio"}</Button>
      {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}
      <Result text={m.data?.result ?? ""} />
    </form>
  );
}

function NpcGen() {
  const m = useGen<any, { result: string }>(gerarNpc);
  const [f, setF] = useState({ conceito: "", faccao: "", cargo: "" });
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(f); }} className="space-y-3">
      <Field label="Conceito / arquétipo (opcional)"><Input value={f.conceito} onChange={(e) => setF({ ...f, conceito: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Facção"><Input value={f.faccao} onChange={(e) => setF({ ...f, faccao: e.target.value })} /></Field>
        <Field label="Cargo"><Input value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })} /></Field>
      </div>
      <Button type="submit" disabled={m.isPending}>{m.isPending ? "Gerando..." : "Gerar NPC"}</Button>
      {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}
      <Result text={m.data?.result ?? ""} />
    </form>
  );
}

function GanchosGen() {
  const m = useGen<any, { result: string }>(gerarGanchos);
  const [f, setF] = useState({ quantidade: 6, foco: "" });
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(f); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantidade"><Input type="number" min={1} max={15} value={f.quantidade} onChange={(e) => setF({ ...f, quantidade: Number(e.target.value) })} /></Field>
        <Field label="Foco (opcional)"><Input value={f.foco} onChange={(e) => setF({ ...f, foco: e.target.value })} placeholder="Ex: Vestígios" /></Field>
      </div>
      <Button type="submit" disabled={m.isPending}>{m.isPending ? "Analisando..." : "Sugerir Ganchos"}</Button>
      {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}
      <Result text={m.data?.result ?? ""} />
    </form>
  );
}

function ImpactoAnalise() {
  const m = useGen<any, { result: string }>(analisarImpacto);
  const [d, setD] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate({ descricao: d }); }} className="space-y-3">
      <Field label="Descreva o evento, decisão ou retcon proposto">
        <Textarea rows={6} value={d} onChange={(e) => setD(e.target.value)} />
      </Field>
      <Button type="submit" disabled={m.isPending || d.length < 10}>{m.isPending ? "Analisando..." : "Analisar Impacto"}</Button>
      {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}
      <Result text={m.data?.result ?? ""} />
    </form>
  );
}
