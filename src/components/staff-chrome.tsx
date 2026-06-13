import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-chrome";
import {
  Activity, Users, Skull, MapPin, Zap, Calendar, Clock, Lightbulb,
  FileText, Network, Search, Settings, ShieldCheck, HelpCircle, GitBranch, BookMarked,
} from "lucide-react";

const NAV = [
  { to: "/staff", label: "Estado do Mundo", icon: Activity, exact: true },
  { section: "Operações" },
  { to: "/staff/npcs", label: "NPCs", icon: Users },
  { to: "/staff/vestigios", label: "Vestígios", icon: Skull },
  { to: "/staff/dominios", label: "Domínios", icon: MapPin },
  { to: "/staff/rupturas", label: "Rupturas", icon: Zap },
  { to: "/staff/eventos", label: "Eventos", icon: Calendar },
  { to: "/staff/timeline", label: "Linha do Tempo", icon: Clock },
  { section: "Consistência Narrativa" },
  { to: "/staff/fatos", label: "Fatos Canônicos", icon: ShieldCheck },
  { to: "/staff/misterios", label: "Mistérios", icon: HelpCircle },
  { to: "/staff/consequencias", label: "Consequências", icon: GitBranch },
  { to: "/staff/plots", label: "Plots Futuros", icon: BookMarked },
  { to: "/staff/ganchos", label: "Ganchos", icon: Lightbulb },
  { section: "Arquivo" },
  { to: "/staff/documentos", label: "Documentos", icon: FileText },
  { to: "/staff/grafo", label: "Mapa de Relações", icon: Network },
  { to: "/staff/buscar", label: "Busca Universal", icon: Search },
  { to: "/admin", label: "CMS Wiki", icon: Settings },
] as const;

export function StaffShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto flex max-w-[1600px] gap-0">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r border-border bg-surface-1 px-3 py-6 lg:block">
          <p className="hud-label px-2 text-cyan">Central de Operações</p>
          <p className="mt-1 px-2 text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Workspace · Staff
          </p>
          <nav className="mt-5 flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.to
                : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2.5 border-l-2 px-3 py-2 text-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                    active
                      ? "border-cyan bg-cyan/10 text-cyan"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
