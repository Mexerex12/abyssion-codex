import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { upsertLoreEntry, deleteLoreEntry } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_META, CLEARANCE_META } from "@/lib/lore-meta";
import { ArrowLeft, Save, Trash2, Upload } from "lucide-react";

type EntryRow = {
  id: string;
  slug: string;
  category: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  body: string | null;
  cover_image_url: string | null;
  banner_image_url: string | null;
  clearance: string;
  status: string;
  timeline_date: string | null;
  timeline_order: number | null;
  tags: string[];
};

const inputCls =
  "w-full border border-input bg-surface-1 px-3 py-2 text-sm text-foreground focus:border-cyan focus:outline-none";

export function EntryEditor({ mode, initial }: { mode: "create" | "edit"; initial?: EntryRow }) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    id: initial?.id,
    slug: initial?.slug ?? "",
    category: initial?.category ?? "npc",
    title: initial?.title ?? "",
    subtitle: initial?.subtitle ?? "",
    summary: initial?.summary ?? "",
    body: initial?.body ?? "",
    cover_image_url: initial?.cover_image_url ?? "",
    banner_image_url: initial?.banner_image_url ?? "",
    clearance: initial?.clearance ?? "publico",
    status: (initial?.status ?? "publicado") as "publicado" | "rascunho" | "arquivado",
    timeline_date: initial?.timeline_date ?? "",
    timeline_order: initial?.timeline_order ?? null,
    tags: (initial?.tags ?? []).join(", "),
  });

  const save = useServerFn(upsertLoreEntry);
  const del = useServerFn(deleteLoreEntry);

  const saveMut = useMutation({
    mutationFn: async () => {
      return await save({
        data: {
          id: form.id,
          slug: form.slug.trim(),
          category: form.category as never,
          title: form.title.trim(),
          subtitle: form.subtitle || null,
          summary: form.summary || null,
          body: form.body || null,
          cover_image_url: form.cover_image_url || null,
          banner_image_url: form.banner_image_url || null,
          clearance: form.clearance as never,
          status: form.status,
          timeline_date: form.timeline_date || null,
          timeline_order: form.timeline_order,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Entrada salva.");
      navigate({ to: "/admin" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar"),
  });

  const delMut = useMutation({
    mutationFn: async () => {
      if (!form.id) return;
      return await del({ data: { id: form.id } });
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Entrada excluída.");
      navigate({ to: "/admin" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao excluir"),
  });

  async function uploadImage(field: "cover_image_url" | "banner_image_url", file: File) {
    const path = `${field}/${Date.now()}-${file.name.replace(/[^a-z0-9.\-]/gi, "_")}`;
    const { error } = await supabase.storage.from("lore-media").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = await supabase.storage.from("lore-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (data?.signedUrl) {
      setForm((f) => ({ ...f, [field]: data.signedUrl }));
      toast.success("Imagem enviada.");
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 pt-10 pb-16">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-cyan"
        >
          <ArrowLeft className="h-3 w-3" /> Voltar ao painel
        </Link>

        <h1 className="mt-4 text-display text-3xl font-bold">
          {mode === "create" ? "Nova Entrada" : "Editar Entrada"}
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMut.mutate();
          }}
          className="mt-8 space-y-5"
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Título">
              <input className={inputCls} required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Slug (URL)">
              <input className={inputCls} required pattern="[a-z0-9-]+" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="ex: caissa-rainha" />
            </Field>
            <Field label="Categoria">
              <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(CATEGORY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Nível de classificação">
              <select className={inputCls} value={form.clearance} onChange={(e) => setForm({ ...form, clearance: e.target.value })}>
                {Object.entries(CLEARANCE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Subtítulo">
              <input className={inputCls} maxLength={200} value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}>
                <option value="publicado">Publicado</option>
                <option value="rascunho">Rascunho</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </Field>
          </div>

          <Field label="Resumo (uma linha)">
            <textarea className={inputCls} rows={2} maxLength={800} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          </Field>

          <Field label="Corpo (Markdown suportado)">
            <textarea className={`${inputCls} text-mono text-[13px] leading-relaxed`} rows={18} maxLength={50000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <p className="mt-1 text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Suporta **negrito**, &gt; citação, # títulos, listas, links.
            </p>
          </Field>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ImageField label="Capa" value={form.cover_image_url} onUrlChange={(v) => setForm({ ...form, cover_image_url: v })} onFile={(f) => uploadImage("cover_image_url", f)} />
            <ImageField label="Banner" value={form.banner_image_url} onUrlChange={(v) => setForm({ ...form, banner_image_url: v })} onFile={(f) => uploadImage("banner_image_url", f)} />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <Field label="Data (linha do tempo)">
              <input className={inputCls} maxLength={60} value={form.timeline_date ?? ""} onChange={(e) => setForm({ ...form, timeline_date: e.target.value })} placeholder="ex: Ano 0, 03:14" />
            </Field>
            <Field label="Ordem cronológica">
              <input type="number" className={inputCls} value={form.timeline_order ?? ""} onChange={(e) => setForm({ ...form, timeline_order: e.target.value ? Number(e.target.value) : null })} />
            </Field>
            <Field label="Tags (separadas por vírgula)">
              <input className={inputCls} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="origem, sistema, anomalia" />
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
            <div>
              {mode === "edit" && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Excluir esta entrada permanentemente?")) delMut.mutate();
                  }}
                  className="flex items-center gap-2 border border-destructive/60 px-4 py-2 text-mono text-xs uppercase tracking-[0.18em] text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={saveMut.isPending}
              className="flex items-center gap-2 border border-cyan bg-cyan px-5 py-2 text-mono text-xs font-semibold uppercase tracking-[0.18em] text-cyan-foreground hover:bg-cyan/90 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> {saveMut.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="hud-label mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function ImageField({ label, value, onUrlChange, onFile }: { label: string; value: string; onUrlChange: (v: string) => void; onFile: (f: File) => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input className={inputCls} placeholder="URL ou faça upload →" value={value} onChange={(e) => onUrlChange(e.target.value)} />
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 border border-border bg-surface-1 px-3 text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:border-cyan hover:text-cyan">
          <Upload className="h-3 w-3" />
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      </div>
      {value && <img src={value} alt="" className="mt-2 h-24 w-full object-cover border border-border" />}
    </Field>
  );
}
