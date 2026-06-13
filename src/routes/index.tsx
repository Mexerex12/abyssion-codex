import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-chrome";
import { Shield, ArrowRight } from "lucide-react";

const QUOTES = [
  "O Núcleo está morrendo.",
  "A União observa.",
  "Sete Vestígios permanecem.",
  "Os Domínios estão mudando.",
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Abyssion SMP — Portal da União Trivalente" },
      {
        name: "description",
        content:
          "Arquivo oficial do universo Abyssion SMP. Domínios, Vestígios, Curadores, Bastiões e os registros classificados da União Trivalente.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setQuoteIdx((i) => (i + 1) % QUOTES.length), 3800);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* grid lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(0.78 0.13 210) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.78 0.13 210) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* top HUD bar */}
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
        <div className="hidden items-center gap-6 text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:flex">
          <span>Setor 17/B</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse bg-cyan" />
            Transmissão Ativa
          </span>
          <span>Bastião Vulcanom</span>
        </div>
        <Link
          to="/auth"
          className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-cyan"
        >
          Identificar-se →
        </Link>
      </div>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col justify-center px-6 py-20">
        <p className="hud-label flicker">Comunicado oficial · 0314 · classificação pública</p>

        <h1 className="mt-6 text-display text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
          ARQUIVOS DA<br />
          <span className="text-cyan">UNIÃO TRIVALENTE</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-foreground/80 md:text-xl">
          Banco de dados oficial sobre Rupturas, Domínios e anomalias ligadas ao Sistema.
          Acesso parcial liberado a operadores autorizados.
        </p>

        {/* Rotating quote */}
        <div className="mt-10 border-l-2 border-cyan/60 pl-5">
          <p className="hud-label text-cyan">Mensagem recorrente. Origem desconhecida.</p>
          <div className="relative mt-2 h-12">
            {QUOTES.map((q, i) => (
              <p
                key={q}
                className={`absolute inset-0 text-display text-2xl font-semibold transition-all duration-700 md:text-3xl ${
                  i === quoteIdx
                    ? "opacity-100 translate-y-0 blur-0"
                    : "opacity-0 -translate-y-2 blur-sm"
                }`}
              >
                "{q}"
              </p>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Link
            to="/dashboard"
            className="group flex items-center gap-3 border border-cyan bg-cyan px-6 py-3 text-mono text-xs font-semibold uppercase tracking-[0.18em] text-cyan-foreground transition-all hover:bg-cyan/90 hover:shadow-[0_0_30px_oklch(0.78_0.13_210/0.4)]"
          >
            Acessar Arquivos da União
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/wiki"
            className="border border-border px-6 py-3 text-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:border-foreground hover:text-foreground"
          >
            Explorar Enciclopédia
          </Link>
        </div>

        {/* stat strip */}
        <div className="mt-20 grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-4">
          {[
            { k: "Domínios", v: "07+" },
            { k: "Bastiões", v: "ATIVO" },
            { k: "Curadores", v: "DESCONHECIDO" },
            { k: "Núcleo", v: "INSTÁVEL" },
          ].map((s) => (
            <div key={s.k} className="bg-background px-5 py-4">
              <p className="hud-label">{s.k}</p>
              <p className="mt-1 text-display text-2xl font-bold text-foreground">{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
