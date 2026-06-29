import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { smartSearch, reindexLoreIndex, indexStats } from "@/lib/staff.functions";
import { PageHeader, Button, Input, Empty, Badge } from "@/components/staff-ui";
import { Sparkles, RefreshCw, Search, Database } from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff/pesquisa")({
  component: PesquisaPage,
});

const SOURCE_LABEL: Record<string, string> = {
  npcs: "NPC",
  vestigios: "Vestígio",
  dominios: "Domínio",
  eventos_operacionais: "Evento",
  ganchos_narrativos: "Gancho",
  documentos: "Documento",
  fatos_canonicos: "Fato Canônico",
  lore_entries: "Wiki / Lore",
};

const SOURCE_LINK: Record<string, string> = {
  npcs: "/staff/npcs",
  vestigios: "/staff/vestigios",
  dominios: "/staff/dominios",
  eventos_operacionais: "/staff/eventos",
  ganchos_narrativos: "/staff/ganchos",
  documentos: "/staff/documentos",
  fatos_canonicos: "/staff/fatos",
  lore_entries: "/wiki",
};

function PesquisaPage() {
  const qc = useQueryClient();
  const search = useServerFn(smartSearch);
  const reindex = useServerFn(reindexLoreIndex);
  const fetchStats = useServerFn(indexStats);

  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data: stats } = useQuery({ queryKey: ["lore-index-stats"], queryFn: () => fetchStats() });
  const { data, isFetching, error } = useQuery({
    queryKey: ["smart-search", submitted],
    queryFn: () => search({ data: { q: submitted, explain: true, limit: 14 } }),
    enabled: submitted.length >= 2,
    staleTime: 60_000,
  });

  const m = useMutation({
    mutationFn: () => reindex({}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lore-index-stats"] });
      qc.invalidateQueries({ queryKey: ["smart-search"] });
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Workspace · Pesquisa Inteligente"
        title="Pesquisa Semântica de Termos"
        sub="Digite um conceito, nome ou pergunta. O Curador-Auxiliar interpreta o significado e retorna os registros mais relevantes do universo Abyssion."
        actions={
          <Button onClick={() => m.mutate()} disabled={m.isPending} variant="ghost">
            <RefreshCw className={`h-3 w-3 ${m.isPending ? "animate-spin" : ""}`} /> {m.isPending ? "Indexando..." : "Reindexar"}
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <StatBox label="Trechos indexados" value={stats?.total ?? 0} />
        <StatBox label="Fontes ativas" value={Object.keys(stats?.bySource ?? {}).length} />
        <StatBox label="Última indexação" value={stats?.lastIndexedAt ? new Date(stats.lastIndexedAt).toLocaleString("pt-BR") : "n/d"} />
        <StatBox label="Modo" value="Semântico + Fuzzy" />
      </div>

      {m.isSuccess && <p className="text-mono text-[11px] text-emerald-400">✓ {m.data.indexed} trechos reindexados.</p>}
      {m.error && <p className="text-mono text-[11px] text-destructive">{(m.error as Error).message}</p>}

      <form
        onSubmit={(e) => { e.preventDefault(); setSubmitted(q.trim()); }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Ex: 'quem é o Rei Pálido', 'vestígios consumidos', 'Domínios classe ômega'..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">Pesquisar</Button>
      </form>

      {(stats?.total ?? 0) === 0 && (
        <div className="border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="text-mono text-[11px] uppercase tracking-[0.14em] text-amber-400">
            ⚠ O índice está vazio. Clique em <strong>Reindexar</strong> para gerar os embeddings da lore atual.
          </p>
        </div>
      )}

      {error && <Empty>Erro: {(error as Error).message}</Empty>}

      {submitted.length >= 2 && isFetching && <Empty>Interpretando "{submitted}"...</Empty>}

      {data && !isFetching && (
        <>
          {data.explanation && (
            <div className="border border-cyan/40 bg-cyan/5 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-cyan" />
                <p className="hud-label text-cyan">Síntese do Curador</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{data.explanation}</p>
            </div>
          )}

          {data.results.length === 0 ? (
            <Empty>Nenhum registro semântico relevante para "{submitted}".</Empty>
          ) : (
            <section className="space-y-2">
              <p className="hud-label text-cyan">Registros relevantes · {data.results.length}</p>
              <ul className="space-y-2">
                {data.results.map((r: any, i: number) => (
                  <li key={r.id} className="border border-border bg-surface-1 p-3 hover:border-cyan/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-mono text-[10px] text-muted-foreground">[{i + 1}]</span>
                          <Link
                            to={SOURCE_LINK[r.source_type] ?? "/staff"}
                            className="text-display text-sm font-bold text-foreground hover:text-cyan"
                          >
                            {r.term}
                          </Link>
                          <Badge tone="cyan">{SOURCE_LABEL[r.source_type] ?? r.source_type}</Badge>
                          {r.category && <Badge>{r.category}</Badge>}
                          {r.clearance && <Badge tone="amber">{r.clearance}</Badge>}
                        </div>
                        <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">{r.content}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">match</p>
                        <p className="text-mono text-sm font-bold text-cyan">{Math.round((r.similarity ?? 0) * 100)}%</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {submitted.length < 2 && (stats?.total ?? 0) > 0 && (
        <div className="border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-cyan" />
            <p className="hud-label text-cyan">Como pesquisar</p>
          </div>
          <ul className="mt-2 space-y-1 text-mono text-[11px] text-muted-foreground">
            <li>· Use frases naturais. Ex: <em>"NPC que protege o portal sul"</em>.</li>
            <li>· Faça perguntas. Ex: <em>"o que aconteceu com o Esquadrão Vértice?"</em></li>
            <li>· Combine termos. Ex: <em>"vestígio ômega consumido durante a ruptura"</em>.</li>
            <li>· Após criar lore nova, clique em <strong>Reindexar</strong>.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: any }) {
  return (
    <div className="border border-border bg-surface-1 p-3">
      <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-display text-sm font-bold text-cyan">{value}</p>
    </div>
  );
}
