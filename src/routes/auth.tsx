import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, ArrowLeft, Mail, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Identificação | União Trivalente" },
      { name: "description", content: "Acesso ao Portal dos Arquivos da União Trivalente." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Cadastro registrado. Verifique seu email se a confirmação estiver ativa.");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Identificação confirmada.");
        navigate({ to: "/dashboard" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha na autenticação";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between border-r border-border bg-surface-1 p-12 lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, oklch(0.78 0.13 210) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.78 0.13 210) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <Link to="/" className="relative flex items-center gap-2.5">
          <div className="grid h-7 w-7 place-items-center border border-cyan/50 bg-cyan/10 text-cyan">
            <Shield className="h-3.5 w-3.5" strokeWidth={2.5} />
          </div>
          <p className="text-display text-[15px] font-bold">ABYSSION</p>
        </Link>
        <div className="relative">
          <h2 className="text-display text-4xl font-bold leading-tight">
            Identifique-se<br />perante a União.
          </h2>
        </div>
        <div className="relative" />
      </aside>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>

          <h1 className="text-display text-3xl font-bold">
            {mode === "login" ? "Identificação" : "Registro"}
          </h1>

          <form onSubmit={submit} className="mt-8 space-y-5">
            {mode === "signup" && (
              <Field label="Nome operacional" htmlFor="name">
                <input
                  id="name"
                  type="text"
                  required
                  maxLength={60}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Cód. ou alcunha"
                  className={inputCls}
                />
              </Field>
            )}
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Senha" htmlFor="password">
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full border border-cyan bg-cyan py-3 text-mono text-xs font-semibold uppercase tracking-[0.18em] text-cyan-foreground transition-all hover:bg-cyan/90 disabled:opacity-50"
            >
              {loading ? "Processando..." : mode === "login" ? "Entrar" : "Registrar"}
            </button>

            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="w-full text-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-cyan"
            >
              {mode === "login" ? "Registrar" : "Entrar"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

const inputCls =
  "w-full border border-input bg-surface-1 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="hud-label mb-2 block">{label}</label>
      {children}
    </div>
  );
}
