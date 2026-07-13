import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { listLoreEntries } from "@/lib/lore.functions";
import { ClearanceBadge, CategoryBadge } from "@/components/lore-card";
import { Plus, Users, FileEdit } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Painel Administrativo | União Trivalente" }] }),
  component: AdminHome,
});

function AdminHome() {
  const { isAdmin, isStaff, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isStaff) navigate({ to: "/dashboard" });
  }, [isStaff, loading, navigate]);

  const fetchEntries = useServerFn(listLoreEntries);
  const entries = useQuery({
    queryKey: ["admin", "entries"],
    queryFn: () => fetchEntries({ data: { limit: 500 } }),
    enabled: isStaff,
  });

  f (loading) return null;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 pt-10 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="hud-label text-cyan">Painel · {isAdmin ? "Administrador" : "Narrador"}</p>
            <h1 className="mt-2 text-display text-4xl font-bold">CMS · Arquivos da União</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Edite a lore diretamente. {isAdmin ? "Você possui controle total sobre o banco." : "Você pode criar Eventos e atualizar status de NPCs/Domínios."}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/admin/novo"
              className="flex items-center gap-2 border border-cyan bg-cyan px-4 py-2 text-mono text-xs uppercase tracking-[0.18em] text-cyan-foreground hover:bg-cyan/90"
            >
              <Plus className="h-3.5 w-3.5" /> Nova Entrada
            </Link>
            {isAdmin && (
              <Link
                to="/admin/usuarios"
                className="flex items-center gap-2 border border-border px-4 py-2 text-mono text-xs uppercase tracking-[0.18em] hover:border-cyan"
              >
                <Users className="h-3.5 w-3.5" /> Usuários
              </Link>
            )}
          </div>
        </div>

        <div className="hud-divider mt-8" />

        <table className="mt-6 w-full border border-border text-sm">
          <thead className="bg-surface-1">
            <tr className="text-left text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-3 py-2.5">Categoria</th>
              <th className="px-3 py-2.5">Título</th>
              <th className="px-3 py-2.5">Slug</th>
              <th className="px-3 py-2.5">Class.</th>
              <th className="px-3 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(entries.data ?? []).map((e) => (
              <tr key={e.id} className="border-t border-border hover:bg-surface-1">
                <td className="px-3 py-2.5"><CategoryBadge category={e.category} /></td>
                <td className="px-3 py-2.5 font-medium">{e.title}</td>
                <td className="px-3 py-2.5 text-mono text-[11px] text-muted-foreground">/{e.slug}</td>
                <td className="px-3 py-2.5"><ClearanceBadge level={e.clearance} /></td>
                <td className="px-3 py-2.5 text-right">
                  <Link
                    to="/admin/editar/$id"
                    params={{ id: e.id }}
                    className="inline-flex items-center gap-1 text-mono text-[11px] uppercase tracking-[0.16em] text-cyan hover:underline"
                  >
                    <FileEdit className="h-3 w-3" /> Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
      <SiteFooter />
    </div>
  );
}
