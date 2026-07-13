import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EntryEditor } from "@/components/entry-editor";
import { getCmsEntry } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/editar/$id")({
  head: () => ({ meta: [{ title: "Editar Entrada | Admin" }] }),
  component: EditEntry,
});

function EditEntry() {
  const { id } = Route.useParams();
  const getEntry = useServerFn(getCmsEntry);
  const q = useQuery({
    queryKey: ["entry-edit", id],
    queryFn: () => getEntry({ data: { id } }),
  });
  if (q.isLoading)
    return <p className="p-10 text-center text-mono text-xs uppercase">Carregando...</p>;
  if (!q.data) return <p className="p-10 text-center">Entrada não encontrada.</p>;
  return <EntryEditor mode="edit" initial={q.data} />;
}
