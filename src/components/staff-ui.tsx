import { ReactNode } from "react";

export function PageHeader({ eyebrow, title, sub, actions }: { eyebrow: string; title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        <p className="hud-label text-cyan">{eyebrow}</p>
        <h1 className="mt-1.5 text-display text-3xl font-bold">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, tone = "neutral" }: { label: string; value: ReactNode; tone?: "neutral" | "cyan" | "alert" | "amber" | "green" }) {
  const toneClass = tone === "cyan" ? "text-cyan border-cyan/40" : tone === "alert" ? "text-destructive border-destructive/40" : tone === "amber" ? "text-amber-400 border-amber-400/40" : tone === "green" ? "text-emerald-400 border-emerald-500/40" : "border-border";
  const valueClass = tone === "cyan" ? "text-cyan" : tone === "alert" ? "text-destructive" : tone === "amber" ? "text-amber-400" : tone === "green" ? "text-emerald-400" : "text-foreground";
  return (
    <div className={`border ${toneClass} bg-surface-1 px-4 py-3`}>
      <p className="hud-label">{label}</p>
      <p className={`mt-1 text-display text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

export function Button({
  children, onClick, variant = "primary", type = "button", size = "md", disabled,
}: { children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "danger"; type?: "button" | "submit"; size?: "sm" | "md"; disabled?: boolean }) {
  const base = "inline-flex items-center justify-center gap-1.5 text-mono uppercase tracking-[0.16em] transition-colors disabled:opacity-50";
  const sz = size === "sm" ? "px-2.5 py-1 text-[10px]" : "px-4 py-2 text-[11px]";
  const v = variant === "ghost"
    ? "border border-border hover:border-cyan hover:text-cyan"
    : variant === "danger"
    ? "border border-destructive/60 text-destructive hover:bg-destructive hover:text-destructive-foreground"
    : "border border-cyan bg-cyan text-cyan-foreground hover:bg-cyan/90";
  return <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${sz} ${v}`}>{children}</button>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="hud-label">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full border border-border bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-cyan focus:outline-none ${props.className ?? ""}`} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full border border-border bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-cyan focus:outline-none ${props.className ?? ""}`} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full border border-border bg-surface-1 px-3 py-2 text-sm text-foreground focus:border-cyan focus:outline-none ${props.className ?? ""}`} />;
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className={`mt-12 w-full ${wide ? "max-w-4xl" : "max-w-2xl"} border border-cyan/40 bg-surface-1 shadow-[0_0_60px_-15px] shadow-cyan/30`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border bg-surface-2 px-5 py-3">
          <h2 className="text-display text-sm font-bold uppercase tracking-[0.18em] text-cyan">{title}</h2>
          <button onClick={onClose} className="text-mono text-xs text-muted-foreground hover:text-foreground">FECHAR ✕</button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="border border-dashed border-border bg-surface-1 px-6 py-10 text-center text-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">{children}</div>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "cyan" | "alert" | "amber" | "green" }) {
  const t = tone === "cyan" ? "border-cyan/50 bg-cyan/10 text-cyan"
    : tone === "alert" ? "border-destructive/60 bg-destructive/15 text-destructive"
    : tone === "amber" ? "border-amber-400/50 bg-amber-400/10 text-amber-400"
    : tone === "green" ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
    : "border-border bg-surface-2 text-muted-foreground";
  return <span className={`inline-block border px-1.5 py-0.5 text-mono text-[9px] uppercase tracking-[0.16em] ${t}`}>{children}</span>;
}
