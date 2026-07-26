import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { deleteLoreEntry, listCmsEntries, upsertLoreEntry } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import {
  ContentTab,
  GeneralTab,
  MetadataTab,
  PermissionsTab,
  type CmsEntryForm,
} from "@/cms/documents/components/editor-tabs";
import {
  RelationsTab,
  type RelationPickerEntry,
  type RelationRow,
} from "@/cms/relations/components/relations-tab";
import { HistoryTab, type HistoryVersion } from "@/cms/history/components/history-tab";
import {
  legacyClearanceToClassification,
  legacyClearanceToVisibility,
  legacyStatusToCms,
} from "@/cms/permissions/policy";

type EntryEditorInitial =
  | {
      entry?: Partial<CmsEntryForm> & Record<string, unknown>;
      outgoing?: RelationRow[];
      incoming?: RelationRow[];
      versions?: HistoryVersion[];
    }
  | (Partial<CmsEntryForm> & Record<string, unknown>);

export function EntryEditor({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: EntryEditorInitial;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const save = useServerFn(upsertLoreEntry);
  const del = useServerFn(deleteLoreEntry);
  const listEntries = useServerFn(listCmsEntries);
  const normalizedInitial = "entry" in (initial ?? {}) ? initial?.entry : initial;
  const relations =
    "entry" in (initial ?? {}) ? initial : { outgoing: [], incoming: [], versions: [] };

  const [form, setForm] = useState<CmsEntryForm>(() => ({
    id: normalizedInitial?.id,
    slug: normalizedInitial?.slug ?? "",
    category: normalizedInitial?.category ?? "npc",
    title: normalizedInitial?.title ?? "",
    subtitle: normalizedInitial?.subtitle ?? "",
    summary: normalizedInitial?.summary ?? "",
    body: normalizedInitial?.body ?? "",
    cover_image_url: normalizedInitial?.cover_image_url ?? "",
    banner_image_url: normalizedInitial?.banner_image_url ?? "",
    classification:
      normalizedInitial?.classification ??
      legacyClearanceToClassification(normalizedInitial?.clearance),
    visibility:
      normalizedInitial?.visibility ?? legacyClearanceToVisibility(normalizedInitial?.clearance),
    status:
      normalizedInitial?.status ??
      legacyStatusToCms(normalizedInitial?.cms_status ?? normalizedInitial?.status),
    timeline_date: normalizedInitial?.timeline_date ?? "",
    timeline_order: normalizedInitial?.timeline_order ?? null,
    tags: (normalizedInitial?.tags ?? []).join(", "),
    metadata: JSON.stringify(normalizedInitial?.metadata ?? {}, null, 2),
  }));

  const entries = useQuery({
    queryKey: ["cms", "entries", "relations-picker"],
    queryFn: () => listEntries({ data: { limit: 1000 } }),
  });

  const payload = useMemo(() => {
    let metadata: Record<string, unknown> = {};
    try {
      metadata = form.metadata.trim() ? JSON.parse(form.metadata) : {};
    } catch {
      metadata = {};
    }
    return {
      id: form.id,
      slug: form.slug.trim(),
      category: form.category,
      title: form.title.trim(),
      subtitle: form.subtitle || null,
      summary: form.summary || null,
      body: form.body || null,
      cover_image_url: form.cover_image_url || null,
      banner_image_url: form.banner_image_url || null,
      classification: form.classification,
      visibility: form.visibility,
      status: form.status,
      timeline_date: form.timeline_date || null,
      timeline_order: form.timeline_order,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      metadata,
    };
  }, [form]);

  const saveMut = useMutation({
    mutationFn: () => save({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Entrada salva.");
      navigate({ to: "/admin" });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Falha ao salvar"),
  });

  const delMut = useMutation({
    mutationFn: () => {
      if (!form.id) return Promise.resolve();
      return del({ data: { id: form.id } });
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Entrada movida para a lixeira.");
      navigate({ to: "/admin" });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Falha ao excluir"),
  });

  async function uploadImage(field: "cover_image_url" | "banner_image_url", file: File) {
    const path = `${field}/${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, "_")}`;
    const { error } = await supabase.storage
      .from("lore-media")
      .upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = await supabase.storage
      .from("lore-media")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (data?.signedUrl) {
      setForm((current) => ({ ...current, [field]: data.signedUrl }));
      toast.success("Imagem enviada.");
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 pt-10 pb-16">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-cyan"
        >
          <ArrowLeft className="h-3 w-3" /> Voltar ao painel
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-display text-3xl font-bold">
              {mode === "create" ? "Nova Entrada" : "Editar Entrada"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              CMS modular para documentos, relações, permissões e histórico.
            </p>
          </div>
          <button
            type="button"
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate()}
            className="inline-flex items-center gap-2 border border-cyan bg-cyan px-5 py-2 text-mono text-xs font-semibold uppercase tracking-[0.18em] text-cyan-foreground hover:bg-cyan/90 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {saveMut.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>

        <Tabs defaultValue="general" className="mt-8">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
            <TabsTrigger value="relations">Relações</TabsTrigger>
            <TabsTrigger value="permissions">Permissões</TabsTrigger>
            <TabsTrigger value="metadata">Metadados</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>
          <div className="mt-6 border border-border bg-background p-5">
            <TabsContent value="general">
              <GeneralTab form={form} setForm={setForm} />
            </TabsContent>
            <TabsContent value="content">
              <ContentTab form={form} setForm={setForm} onFile={uploadImage} />
            </TabsContent>
            <TabsContent value="relations">
              <RelationsTab
                entryId={form.id}
                outgoing={relations?.outgoing ?? []}
                incoming={relations?.incoming ?? []}
                entries={(entries.data ?? []) as RelationPickerEntry[]}
              />
            </TabsContent>
            <TabsContent value="permissions">
              <PermissionsTab form={form} setForm={setForm} />
            </TabsContent>
            <TabsContent value="metadata">
              <MetadataTab form={form} setForm={setForm} />
            </TabsContent>
            <TabsContent value="history">
              <HistoryTab versions={relations?.versions ?? []} />
            </TabsContent>
          </div>
        </Tabs>

        {mode === "edit" && (
          <div className="mt-6 flex justify-between border-t border-border pt-6">
            <button
              type="button"
              onClick={() => confirm("Mover esta entrada para a lixeira?") && delMut.mutate()}
              className="inline-flex items-center gap-2 border border-destructive/60 px-4 py-2 text-mono text-xs uppercase tracking-[0.18em] text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" /> Mover para lixeira
            </button>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
