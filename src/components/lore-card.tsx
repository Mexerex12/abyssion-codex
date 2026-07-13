import { Link } from "@tanstack/react-router";
import {
  CATEGORY_META,
  CLEARANCE_META,
  classificationMeta,
  isClassified,
  isRestrictedVisibility,
  visibilityMeta,
} from "@/lib/lore-meta";
import type { Classification, LoreCategory, ClearanceLevel, Visibility } from "@/lib/lore-meta";
import { Lock } from "lucide-react";

export function ClearanceBadge({ level }: { level: ClearanceLevel }) {
  const meta = CLEARANCE_META[level];
  const tone =
    meta.tone === "alert"
      ? "border-destructive/60 text-destructive bg-destructive/10"
      : meta.tone === "amber"
        ? "border-amber-500/60 text-amber-400 bg-amber-500/10"
        : "border-border text-muted-foreground bg-surface-2";
  return (
    <span
      className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-mono text-[10px] uppercase tracking-[0.16em] ${tone}`}
    >
      {isClassified(level) && <Lock className="h-2.5 w-2.5" />}
      {meta.short}
    </span>
  );
}

export function CategoryBadge({ category }: { category: LoreCategory }) {
  const meta = CATEGORY_META[category];
  return <span className="hud-label">{meta?.label ?? category}</span>;
}

export function ClassificationBadge({ classification }: { classification: Classification }) {
  const meta = classificationMeta(classification);
  return (
    <span className="inline-flex items-center border border-border bg-surface-2 px-1.5 py-0.5 text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
      {meta.short}
    </span>
  );
}

export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  const meta = visibilityMeta(visibility);
  const restricted = isRestrictedVisibility(visibility);
  return (
    <span
      className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-mono text-[10px] uppercase tracking-[0.16em] ${
        restricted
          ? "border-amber-500/60 bg-amber-500/10 text-amber-400"
          : "border-border bg-surface-2 text-muted-foreground"
      }`}
    >
      {restricted && <Lock className="h-2.5 w-2.5" />}
      {meta.short}
    </span>
  );
}

export function LoreCard({
  slug,
  title,
  subtitle,
  summary,
  category,
  clearance,
  classification,
}: {
  slug: string;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  category: LoreCategory;
  clearance: ClearanceLevel;
  classification?: Classification;
}) {
  const classified = isClassified(clearance);
  return (
    <Link
      to="/wiki/$slug"
      params={{ slug }}
      className="group relative block border border-border bg-surface-1 p-5 transition-all hover:border-cyan/50 hover:bg-surface-2"
    >
      <div className="flex items-start justify-between gap-3">
        <CategoryBadge category={category} />
        {classification ? (
          <ClassificationBadge classification={classification} />
        ) : (
          <ClearanceBadge level={clearance} />
        )}
      </div>
      <h3 className="mt-3 text-display text-lg font-semibold leading-tight text-foreground group-hover:text-cyan">
        {classified ? (
          <span className="bg-foreground/90 px-1 text-background">{title}</span>
        ) : (
          title
        )}
      </h3>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      {summary && <p className="mt-3 line-clamp-3 text-sm text-foreground/70">{summary}</p>}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          /{slug}
        </span>
        <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-cyan opacity-0 transition-opacity group-hover:opacity-100">
          Abrir
        </span>
      </div>
    </Link>
  );
}
