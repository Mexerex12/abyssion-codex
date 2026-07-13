import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-chrome";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Abyssion SMP" },
      { name: "description", content: "Arquivos da União Trivalente." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(0.78 0.13 210) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.78 0.13 210) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 flex items-center justify-between border-b border-border/60 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-7 w-7 place-items-center border border-cyan/50 bg-cyan/10 text-cyan">
            <Shield className="h-3.5 w-3.5" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <p className="text-display text-[15px] font-bold tracking-tight">ABYSSION SMP</p>
            <p className="hud-label mt-0.5 text-[9px]">União Trivalente</p>
          </div>
        </div>
        <Link
          to="/auth"
          className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-cyan"
        >
          Identificar-se
        </Link>
      </div>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col justify-center px-6 py-20">
        <h1 className="text-display text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
          ARQUIVOS DA<br />
          <span className="text-cyan">UNIÃO TRIVALENTE</span>
        </h1>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Link
            to="/dashboard"
            className="border border-cyan bg-cyan px-6 py-3 text-mono text-xs font-semibold uppercase tracking-[0.18em] text-cyan-foreground hover:bg-cyan/90"
          >
            Acessar Arquivos
          </Link>
          <Link
            to="/wiki"
            className="border border-border px-6 py-3 text-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:border-foreground hover:text-foreground"
          >
            Enciclopédia
          </Link>
          <Link
            to="/linha-do-tempo"
            className="border border-border px-6 py-3 text-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:border-foreground hover:text-foreground"
          >
            Linha do Tempo
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
