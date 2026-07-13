import { Upload } from "lucide-react";
import { CATEGORY_META } from "@/lib/lore-meta";
import {
  CLASSIFICATION_META,
  CLASSIFICATIONS,
  ENTRY_STATUSES,
  STATUS_META,
  VISIBILITIES,
  VISIBILITY_META,
  type Classification,
  type EntryStatus,
  type Visibility,
} from "@/cms/permissions/policy";
import { Field, SelectField, inputCls } from "./fields";

export type CmsEntryForm = {
  id?: string;
  slug: string;
  category: keyof typeof CATEGORY_META;
  title: string;
  subtitle: string;
  summary: string;
  body: string;
  cover_image_url: string;
  banner_image_url: string;
  classification: Classification;
  visibility: Visibility;
  status: EntryStatus;
  timeline_date: string;
  timeline_order: number | null;
  tags: string;
  metadata: string;
};

type FormProps = {
  form: CmsEntryForm;
  setForm: (form: CmsEntryForm) => void;
};

export function GeneralTab({ form, setForm }: FormProps) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Field label="Título">
        <input
          className={inputCls}
          required
          maxLength={200}
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
        />
      </Field>
      <Field label="Slug">
        <input
          className={inputCls}
          required
          pattern="[a-z0-9-]+"
          value={form.slug}
          onChange={(event) => setForm({ ...form, slug: event.target.value })}
        />
      </Field>
      <Field label="Categoria">
        <select
          className={inputCls}
          value={form.category}
          onChange={(event) =>
            setForm({ ...form, category: event.target.value as CmsEntryForm["category"] })
          }
        >
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
      </Field>
      <Field label="Subtítulo">
        <input
          className={inputCls}
          maxLength={200}
          value={form.subtitle}
          onChange={(event) => setForm({ ...form, subtitle: event.target.value })}
        />
      </Field>
      <Field label="Resumo">
        <textarea
          className={inputCls}
          rows={3}
          maxLength={800}
          value={form.summary}
          onChange={(event) => setForm({ ...form, summary: event.target.value })}
        />
      </Field>
      <SelectField
        label="Status"
        value={form.status}
        options={ENTRY_STATUSES}
        onChange={(status) => setForm({ ...form, status })}
        getOptionLabel={(status) => STATUS_META[status].label}
      />
    </div>
  );
}

export function ContentTab({
  form,
  setForm,
  onFile,
}: FormProps & { onFile: (field: "cover_image_url" | "banner_image_url", file: File) => void }) {
  return (
    <div className="space-y-5">
      <Field label="Corpo">
        <textarea
          className={`${inputCls} text-mono text-[13px] leading-relaxed`}
          rows={22}
          maxLength={100000}
          value={form.body}
          onChange={(event) => setForm({ ...form, body: event.target.value })}
        />
      </Field>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ImageField
          label="Capa"
          value={form.cover_image_url}
          onUrlChange={(value) => setForm({ ...form, cover_image_url: value })}
          onFile={(file) => onFile("cover_image_url", file)}
        />
        <ImageField
          label="Banner"
          value={form.banner_image_url}
          onUrlChange={(value) => setForm({ ...form, banner_image_url: value })}
          onFile={(file) => onFile("banner_image_url", file)}
        />
      </div>
    </div>
  );
}

export function PermissionsTab({ form, setForm }: FormProps) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Field label="Classificação">
        <select
          className={inputCls}
          value={form.classification}
          onChange={(event) =>
            setForm({ ...form, classification: event.target.value as Classification })
          }
        >
          {CLASSIFICATIONS.map((value) => (
            <option key={value} value={value}>
              {CLASSIFICATION_META[value].label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Visibilidade">
        <select
          className={inputCls}
          value={form.visibility}
          onChange={(event) => setForm({ ...form, visibility: event.target.value as Visibility })}
        >
          {VISIBILITIES.map((value) => (
            <option key={value} value={value}>
              {VISIBILITY_META[value].label}
            </option>
          ))}
        </select>
      </Field>
      <div className="border border-border bg-surface-1 p-4 md:col-span-2">
        <p className="hud-label text-cyan">Regra de segurança</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Classificação descreve a lore. Visibilidade controla acesso e é validada no backend.
        </p>
      </div>
    </div>
  );
}

export function MetadataTab({ form, setForm }: FormProps) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      <Field label="Data da timeline">
        <input
          className={inputCls}
          maxLength={60}
          value={form.timeline_date}
          onChange={(event) => setForm({ ...form, timeline_date: event.target.value })}
        />
      </Field>
      <Field label="Ordem cronológica">
        <input
          type="number"
          className={inputCls}
          value={form.timeline_order ?? ""}
          onChange={(event) =>
            setForm({
              ...form,
              timeline_order: event.target.value ? Number(event.target.value) : null,
            })
          }
        />
      </Field>
      <Field label="Etiquetas">
        <input
          className={inputCls}
          value={form.tags}
          onChange={(event) => setForm({ ...form, tags: event.target.value })}
          placeholder="origem, sistema, anomalia"
        />
      </Field>
      <Field label="Metadados JSON">
        <textarea
          className={`${inputCls} text-mono text-[12px] md:col-span-3`}
          rows={10}
          value={form.metadata}
          onChange={(event) => setForm({ ...form, metadata: event.target.value })}
        />
      </Field>
      <div className="border border-border bg-surface-1 p-4 md:col-span-3">
        <p className="hud-label">{STATUS_META[form.status].label}</p>
      </div>
    </div>
  );
}

function ImageField({
  label,
  value,
  onUrlChange,
  onFile,
}: {
  label: string;
  value: string;
  onUrlChange: (value: string) => void;
  onFile: (file: File) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          className={inputCls}
          value={value}
          onChange={(event) => onUrlChange(event.target.value)}
        />
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 border border-border bg-surface-1 px-3 text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:border-cyan hover:text-cyan">
          <Upload className="h-3 w-3" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => event.target.files?.[0] && onFile(event.target.files[0])}
          />
        </label>
      </div>
      {value && (
        <img src={value} alt="" className="mt-2 h-24 w-full border border-border object-cover" />
      )}
    </Field>
  );
}
