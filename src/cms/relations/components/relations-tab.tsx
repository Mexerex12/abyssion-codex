import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { deleteLoreRelation, upsertLoreRelation } from "@/lib/admin.functions";
import { inputCls } from "@/cms/documents/components/fields";
import { Link2, Trash2 } from "lucide-react";
import { useState } from "react";

type RelationTarget = {
  id: string;
  title: string;
};

export type RelationRow = {
  id: string;
  relation_type: string;
  from?: RelationTarget | null;
  to?: RelationTarget | null;
};

export type RelationPickerEntry = {
  id: string;
  title: string;
};

export function RelationsTab({
  entryId,
  outgoing,
  incoming,
  entries,
}: {
  entryId?: string;
  outgoing: RelationRow[];
  incoming: RelationRow[];
  entries: RelationPickerEntry[];
}) {
  const qc = useQueryClient();
  const saveRelation = useServerFn(upsertLoreRelation);
  const deleteRelation = useServerFn(deleteLoreRelation);
  const [toEntry, setToEntry] = useState("");
  const [type, setType] = useState("relacionado");

  const save = useMutation({
    mutationFn: () => {
      if (!entryId || !toEntry) throw new Error("Selecione um documento.");
      return saveRelation({
        data: { from_entry: entryId, to_entry: toEntry, relation_type: type, notes: null },
      });
    },
    onSuccess: () => {
      setToEntry("");
      qc.invalidateQueries();
      toast.success("Relação salva.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Falha ao salvar relação"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteRelation({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Relação removida.");
    },
  });

  if (!entryId) {
    return (
      <p className="border border-dashed border-border bg-surface-1 p-8 text-center text-sm text-muted-foreground">
        Salve o documento para relacionar outros registros.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 border border-border bg-surface-1 p-4 md:grid-cols-[1fr_180px_auto]">
        <select
          className={inputCls}
          value={toEntry}
          onChange={(event) => setToEntry(event.target.value)}
        >
          <option value="">Selecionar documento...</option>
          {entries
            .filter((entry) => entry.id !== entryId)
            .map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.title}
              </option>
            ))}
        </select>
        <input
          className={inputCls}
          value={type}
          onChange={(event) => setType(event.target.value)}
          placeholder="tipo"
        />
        <button
          type="button"
          onClick={() => save.mutate()}
          className="inline-flex items-center justify-center gap-2 border border-cyan bg-cyan px-4 py-2 text-mono text-xs uppercase tracking-[0.18em] text-cyan-foreground"
        >
          <Link2 className="h-3.5 w-3.5" /> Relacionar
        </button>
      </div>

      <RelationList
        title="Saindo deste documento"
        rows={outgoing}
        targetKey="to"
        onDelete={(id) => remove.mutate(id)}
      />
      <RelationList
        title="Referenciam este documento"
        rows={incoming}
        targetKey="from"
        onDelete={(id) => remove.mutate(id)}
      />
    </div>
  );
}

function RelationList({
  title,
  rows,
  targetKey,
  onDelete,
}: {
  title: string;
  rows: RelationRow[];
  targetKey: "to" | "from";
  onDelete: (id: string) => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between border-b border-border pb-2">
        <p className="hud-label text-cyan">{title}</p>
        <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {rows.length}
        </span>
      </div>
      <ul className="mt-3 divide-y divide-border border border-border bg-surface-1">
        {rows.map((row) => {
          const target = row[targetKey];
          return (
            <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{target?.title ?? "Documento"}</p>
                <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {row.relation_type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(row.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
        {rows.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhuma relação.</li>
        )}
      </ul>
    </section>
  );
}
