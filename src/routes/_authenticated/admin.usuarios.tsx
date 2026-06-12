import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { listUsersAdmin, setUserRole } from "@/lib/admin.functions";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Admin" }] }),
  component: Users,
});

const ROLES = ["visitante", "narrador", "administrador"] as const;

function Users() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listUsersAdmin);
  const updateRole = useServerFn(setUserRole);

  const users = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fetchUsers(),
    enabled: isAdmin,
  });

  const toggle = useMutation({
    mutationFn: (v: { userId: string; role: (typeof ROLES)[number]; grant: boolean }) =>
      updateRole({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Permissão atualizada.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });

  if (loading) return null;
  if (!isAdmin) return <p className="p-10 text-center">Acesso restrito.</p>;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 pt-10 pb-16">
        <Link to="/admin" className="inline-flex items-center gap-2 text-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-cyan">
          <ArrowLeft className="h-3 w-3" /> Painel
        </Link>
        <h1 className="mt-4 text-display text-3xl font-bold">Operadores Registrados</h1>
        <div className="hud-divider mt-6" />
        <table className="mt-6 w-full border border-border text-sm">
          <thead className="bg-surface-1">
            <tr className="text-left text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-3 py-2.5">Operador</th>
              <th className="px-3 py-2.5">Papéis</th>
              <th className="px-3 py-2.5 text-right">Permissões</th>
            </tr>
          </thead>
          <tbody>
            {(users.data ?? []).map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-3 py-2.5">
                  <p className="font-medium">{u.display_name ?? "—"}</p>
                  <p className="text-mono text-[10px] text-muted-foreground">{u.id.slice(0, 8)}</p>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <span key={r} className="border border-cyan/40 bg-cyan/10 px-1.5 py-0.5 text-mono text-[10px] uppercase tracking-[0.16em] text-cyan">{r}</span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap justify-end gap-1">
                    {ROLES.map((r) => {
                      const has = u.roles.includes(r);
                      return (
                        <button
                          key={r}
                          onClick={() => toggle.mutate({ userId: u.id, role: r, grant: !has })}
                          className={`border px-2 py-1 text-mono text-[10px] uppercase tracking-[0.16em] ${
                            has ? "border-destructive/60 text-destructive hover:bg-destructive/10" : "border-border text-muted-foreground hover:border-cyan hover:text-cyan"
                          }`}
                        >
                          {has ? `Remover ${r}` : `+ ${r}`}
                        </button>
                      );
                    })}
                  </div>
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
