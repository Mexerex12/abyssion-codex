import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth, signOut } from "@/hooks/use-auth";
import { Shield, Search, LogOut, Database, Clock, Lock, Settings, Activity } from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Painel", icon: Database },
  { to: "/wiki", label: "Arquivos", icon: Search },
  { to: "/linha-do-tempo", label: "Linha do Tempo", icon: Clock },
  { to: "/arquivos-restritos", label: "Restritos", icon: Lock },
];

export function SiteHeader() {
  const { user, isAdmin, isStaff } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="grid h-7 w-7 place-items-center border border-cyan/50 bg-cyan/10 text-cyan transition-colors group-hover:bg-cyan group-hover:text-cyan-foreground">
            <Shield className="h-3.5 w-3.5" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <p className="text-display text-[15px] font-bold tracking-tight">ABYSSION</p>
            <p className="hud-label mt-0.5 text-[9px]">União Trivalente</p>
          </div>
        </Link>

        <nav className="ml-4 hidden flex-1 items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-2 px-3 py-2 text-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${
                  active ? "text-cyan" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isStaff && (
            <Link
              to="/staff"
              className="hidden items-center gap-1.5 border border-cyan/40 bg-cyan/10 px-2.5 py-1.5 text-mono text-[10px] uppercase tracking-[0.16em] text-cyan hover:bg-cyan hover:text-cyan-foreground sm:flex"
            >
              <Activity className="h-3 w-3" />
              Central
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              className="hidden items-center gap-1.5 border border-border px-2.5 py-1.5 text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:border-cyan hover:text-cyan sm:flex"
            >
              <Settings className="h-3 w-3" />
              CMS
            </Link>
          )}
          {user ? (
            <>
              <div className="hidden text-right md:block">
                <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Operador
                </p>
                <p className="text-mono text-[11px] text-foreground">
                  {user.email?.split("@")[0]}
                </p>
              </div>
              <button
                onClick={() => signOut()}
                className="grid h-8 w-8 place-items-center border border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                title="Encerrar sessão"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="border border-cyan/40 bg-cyan/10 px-3 py-1.5 text-mono text-[11px] uppercase tracking-[0.16em] text-cyan hover:bg-cyan hover:text-cyan-foreground"
            >
              Identificar-se
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface-1">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-display text-lg font-bold">ABYSSION SMP</p>
          <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            União Trivalente
          </p>
        </div>
      </div>
    </footer>
  );
}
