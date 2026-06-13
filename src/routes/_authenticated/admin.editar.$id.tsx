import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EntryEditor } from "@/components/entry-editor";

export const Route = createFileRoute("/_authenticated/admin/editar/$id")({
  head: () => ({ meta: [{ title: "Editar Entrada | Admin" }] }),
  component: EditEntry,
});

function EditEntry() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["entry-edit", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("lore_entries").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading) return <p className="p-10 text-center text-mono text-xs uppercase">Carregando...</p>;
  if (!q.data) return <p className="p-10 text-center">Entrada não encontrada.</p>;
  return <EntryEditor mode="edit" initial={q.data} />;
}
