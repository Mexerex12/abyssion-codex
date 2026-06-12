import { createFileRoute } from "@tanstack/react-router";
import { EntryEditor } from "@/components/entry-editor";

export const Route = createFileRoute("/_authenticated/admin/novo")({
  head: () => ({ meta: [{ title: "Nova Entrada — Admin" }] }),
  component: () => <EntryEditor mode="create" />,
});
