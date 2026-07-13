import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { restoreLoreVersion } from "@/lib/admin.functions";
import { RotateCcw } from "lucide-react";

export type HistoryVersion = {
  id: string;
  author_id: string | null;
  changed_fields: string[] | null;
  created_at: string;
  snapshot: unknown;
};

export function HistoryTab({ versions }: { versions: HistoryVersion[] }) {
  const qc = useQueryClient();
  const restore = useServerFn(restoreLoreVersion);
  const restoreMut = useMutation({
    mutationFn: (versionId: string) => restore({ data: { versionId } }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Versão restaurada.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Falha ao restaurar"),
  });

  return (
    <div className="space-y-3">
      {versions.map((version) => (
        <div
          key={version.id}
          className="flex items-start justify-between gap-4 border border-border bg-surface-1 p-4"
        >
          <div>
            <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {new Date(version.created_at).toLocaleString()} · {version.author_id ?? "sistema"}
            </p>
            <p className="mt-2 text-sm text-foreground">
              Campos: {(version.changed_fields ?? []).join(", ") || "snapshot"}
            </p>
            <details className="mt-3">
              <summary className="cursor-pointer text-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
                Comparar snapshot
              </summary>
              <pre className="mt-2 max-h-72 overflow-auto border border-border bg-background p-3 text-[11px] text-muted-foreground">
                {JSON.stringify(version.snapshot, null, 2)}
              </pre>
            </details>
          </div>
          <button
            type="button"
            onClick={() => restoreMut.mutate(version.id)}
            className="inline-flex shrink-0 items-center gap-2 border border-border px-3 py-2 text-mono text-[10px] uppercase tracking-[0.16em] hover:border-cyan"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar
          </button>
        </div>
      ))}
      {versions.length === 0 && (
        <p className="border border-dashed border-border bg-surface-1 p-8 text-center text-sm text-muted-foreground">
          Nenhuma versão registrada.
        </p>
      )}
    </div>
  );
}
