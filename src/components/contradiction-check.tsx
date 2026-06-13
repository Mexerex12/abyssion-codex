import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkContradictions } from "@/lib/canon.functions";
import { Button, Badge } from "@/components/staff-ui";
import { AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";

export function ContradictionCheck({ text }: { text: string }) {
  const run = useServerFn(checkContradictions);
  const [state, setState] = useState<{ loading: boolean; hits: any[] | null; err?: string }>({
    loading: false, hits: null,
  });

  async function go() {
    setState({ loading: true, hits: null });
    try {
      const hits = await run({ data: { text } });
      setState({ loading: false, hits });
    } catch (e: any) {
      setState({ loading: false, hits: null, err: e.message });
    }
  }

  return (
    <div className="border border-amber-400/30 bg-amber-400/5 p-3">
      <div className="flex items-center justify-between">
        <p className="hud-label text-amber-400">Verificador de Consistência</p>
        <Button size="sm" variant="ghost" onClick={go} disabled={state.loading || !text || text.length < 5}>
          {state.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verificar fatos canônicos"}
        </Button>
      </div>
      {state.err && <p className="mt-2 text-mono text-xs text-destructive">{state.err}</p>}
      {state.hits && state.hits.length === 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-mono text-[11px] uppercase tracking-[0.14em] text-emerald-400">
          <ShieldCheck className="h-3 w-3" /> Nenhum conflito encontrado.
        </p>
      )}
      {state.hits && state.hits.length > 0 && (
        <div className="mt-2 space-y-1.5">
          <p className="flex items-center gap-1.5 text-mono text-[11px] uppercase tracking-[0.14em] text-amber-400">
            <AlertTriangle className="h-3 w-3" /> Possíveis conflitos: {state.hits.length}
          </p>
          {state.hits.map((h: any) => (
            <div key={h.id} className="border border-amber-400/40 bg-background p-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-display text-sm font-bold">{h.titulo}</p>
                <Badge tone="amber">{h.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{h.descricao}</p>
              <p className="mt-1 text-mono text-[10px] uppercase tracking-[0.14em] text-cyan">
                Categoria: {h.categoria} · Palavras: {(h.matched_keywords ?? []).join(", ")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
