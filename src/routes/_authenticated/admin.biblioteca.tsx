import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { CategoryBadge, ClassificationBadge, VisibilityBadge } from "@/components/lore-card";
import { deleteLoreEntry, listCmsEntries, restoreLoreEntry } from "@/lib/admin.functions";
import { CATEGORY_META } from "@/lib/lore-meta";
import {
  ENTRY_STATUSES,
  STATUS_META,
  VISIBILITIES,
  VISIBILITY_META,
  type EntryStatus,
  type Visibility,
} from "@/cms/permissions/policy";
import { ArchiveRestore, FileEdit, Search, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/biblioteca")({
  head: () => ({ meta: [{ title: "Biblioteca | CMS" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    status:
      typeof search.status === "string" && ENTRY_STATUSES.includes(search.status as EntryStatus)
        ? (search.status as EntryStatus)
        : undefined,
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const search = Route.useSearch();
  const qc = useQueryClient();
  const listEntries = useServerFn(listCmsEntries);
  const moveTrash = useServerFn(deleteLoreEntry);
  const restore = useServerFn(restoreLoreEntry);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<EntryStatus | "all">(search.status ?? "all");
  const [category, setCategory] = useState<string>("all");
  const [visibility, setVisibility] = useState<Visibility | "all">("all");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState<"updated_desc" | "updated_asc" | "title_asc" | "title_desc">(
    "updated_desc",
  );

  const entries = useQuery({
    queryKey: ["cms", "library", q, status, category, visibility, tag, sort],
    queryFn: () =>
      listEntries({
        data: {
          q,
          status: status === "all" ? undefined : status,
          category: category === "all" ? undefined : (category as never),
          visibility: visibility === "all" ? undefined : visibility,
          tag: tag || undefined,
          sort,
          limit: 1000,
        },
      }),
  });

  const trashMut = useMutation({
    mutationFn: (id: string) => moveTrash({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Entrada movida para a lixeira.");
    },
  });
  const restoreMut = useMutation({
    mutationFn: (id: string) => restore({ data: { id, status: "draft" } }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Entrada restaurada como rascunho.");
    },
  });

  const rows = entries.data ?? [];
  const counts = ENTRY_STATUSES.reduce<Record<string, number>>((acc, item) => {
    acc[item] = rows.filter((row) => row.status === item).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 pt-10 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="hud-label text-cyan">CMS</p>
            <h1 className="mt-2 text-display text-4xl font-bold">Biblioteca</h1>
          </div>
          <Link
            to="/admin/novo"
            className="border border-cyan bg-cyan px-4 py-2 text-mono text-xs uppercase tracking-[0.18em] text-cyan-foreground"
          >
            Nova Entrada
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-5">
          {ENTRY_STATUSES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={`border p-3 text-left ${status === item ? "border-cyan bg-cyan/10" : "border-border bg-surface-1 hover:border-cyan"}`}
            >
              <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {STATUS_META[item].label}
              </p>
              <p className="mt-2 text-display text-2xl font-bold">{counts[item] ?? 0}</p>
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_170px_170px_170px_150px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full border border-input bg-surface-1 py-2.5 pl-10 pr-10 text-sm focus:border-cyan focus:outline-none"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Pesquisa instantânea..."
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            className="border border-input bg-surface-1 px-3 py-2 text-sm"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">Todas as categorias</option>
            {(
              Object.entries(CATEGORY_META) as Array<
                [keyof typeof CATEGORY_META, (typeof CATEGORY_META)[keyof typeof CATEGORY_META]]
              >
            ).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
          <select
            className="border border-input bg-surface-1 px-3 py-2 text-sm"
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as Visibility | "all")}
          >
            <option value="all">Todas as permissões</option>
            {VISIBILITIES.map((item) => (
              <option key={item} value={item}>
                {VISIBILITY_META[item].label}
              </option>
            ))}
          </select>
          <input
            className="border border-input bg-surface-1 px-3 py-2 text-sm"
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            placeholder="Etiqueta"
          />
          <select
            className="border border-input bg-surface-1 px-3 py-2 text-sm"
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
          >
            <option value="updated_desc">Recentes</option>
            <option value="updated_asc">Antigos</option>
            <option value="title_asc">A-Z</option>
            <option value="title_desc">Z-A</option>
          </select>
        </div>

        <table className="mt-6 w-full border border-border text-sm">
          <thead className="bg-surface-1">
            <tr className="text-left text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-3 py-2.5">Categoria</th>
              <th className="px-3 py-2.5">Título</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Etiquetas</th>
              <th className="px-3 py-2.5">Classificação</th>
              <th className="px-3 py-2.5">Visibilidade</th>
              <th className="px-3 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr key={entry.id} className="border-t border-border hover:bg-surface-1">
                <td className="px-3 py-2.5">
                  <CategoryBadge category={entry.category} />
                </td>
                <td className="px-3 py-2.5">
                  <p className="font-medium">{entry.title}</p>
                  <p className="text-mono text-[10px] text-muted-foreground">/{entry.slug}</p>
                </td>
                <td className="px-3 py-2.5 text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {STATUS_META[entry.status as EntryStatus]?.label ?? entry.status}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {(entry.tags ?? []).join(", ")}
                </td>
                <td className="px-3 py-2.5">
                  <ClassificationBadge classification={entry.classification} />
                </td>
                <td className="px-3 py-2.5">
                  <VisibilityBadge visibility={entry.visibility} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="inline-flex items-center gap-2">
                    {entry.status === "trash" ? (
                      <button
                        type="button"
                        onClick={() => restoreMut.mutate(entry.id)}
                        className="text-cyan"
                      >
                        <ArchiveRestore className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => trashMut.mutate(entry.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <Link to="/admin/editar/$id" params={{ id: entry.id }} className="text-cyan">
                      <FileEdit className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhum documento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </main>
      <SiteFooter />
    </div>
  );
}
