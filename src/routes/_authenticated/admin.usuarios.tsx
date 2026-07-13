import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { listUsersAdmin, setUserRole } from "@/lib/admin.functions";
import { ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({ meta: [{ title: "Usuários | Admin" }] }),
  component: Users,
});

const ROLES = ["visitante", "narrador", "diretor", "administrador", "fundador"] as const;
type Role = (typeof ROLES)[number];

const ROLE_TONE: Record<Role, string> = {
  visitante: "border-border bg-surface-2 text-muted-foreground",
  narrador: "border-cyan/50 bg-cyan/10 text-cyan",
  diretor: "border-amber-400/50 bg-amber-400/10 text-amber-400",
  administrador: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  fundador: "border-destructive/60 bg-destructive/15 text-destructive",
};

function Users() {
  const { isAdmin, isFundador, loading } = useAuth();
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listUsersAdmin);
  const updateRole = useServerFn(setUserRole);
  const [q, setQ] = useState("");

  const users = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fetchUsers(),
    enabled: isAdmin,
  });

  const toggle = useMutation({
    mutationFn: (v: { userId: string; role: Role; grant: boolean }) => updateRole({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Permissão atualizada.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = users.data ?? [];
    if (!term) return list;
    return list.filter(
      (u) =>
        (u.display_name ?? "").toLowerCase().includes(term) ||
        (u.email ?? "").toLowerCase().includes(term) ||
        u.id.toLowerCase().includes(term),
    );
  }, [users.data, q]);

  if (loading) return null;
  if (!isAdmin) return <p className="p-10 text-center">Acesso restrito.</p>;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 pt-10 pb-16">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-cyan"
        >
          <ArrowLeft className="h-3 w-3" /> Painel
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-display text-3xl font-bold">Operadores Registrados</h1>
            <p className="mt-1 text-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {users.data?.length ?? 0} conta(s)
            </p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, e-mail ou id"
              className="w-full border border-border bg-surface-1 py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-cyan focus:outline-none"
            />
          </div>
        </div>

        <div className="hud-divider mt-6" />

        {users.isLoading ? (
          <p className="mt-8 text-center text-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Carregando…
          </p>
        ) : filtered.length === 0 ? (
          <p className="mt-8 border border-dashed border-border bg-surface-1 px-6 py-10 text-center text-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Nenhum operador encontrado.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border border-border text-sm">
              <thead className="bg-surface-1">
                <tr className="text-left text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-3 py-2.5">Operador</th>
                  <th className="px-3 py-2.5">Papéis</th>
                  <th className="px-3 py-2.5 text-right">Permissões</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-t border-border align-top">
                    <td className="px-3 py-3">
                      <p className="font-medium">{u.display_name ?? "n/d"}</p>
                      {u.email && (
                        <p className="text-mono text-[10px] text-muted-foreground">{u.email}</p>
                      )}
                      <p className="text-mono text-[10px] text-muted-foreground/70">
                        {u.id.slice(0, 8)}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-mono text-[10px] text-muted-foreground">—</span>
                        ) : (
                          u.roles.map((r) => (
                            <span
                              key={r}
                              className={`border px-1.5 py-0.5 text-mono text-[10px] uppercase tracking-[0.16em] ${ROLE_TONE[r as Role] ?? "border-border text-muted-foreground"}`}
                            >
                              {r}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        {ROLES.map((r) => {
                          const has = u.roles.includes(r);
                          const disabled =
                            toggle.isPending || (r === "fundador" && !isFundador);
                          return (
                            <button
                              key={r}
                              disabled={disabled}
                              onClick={() =>
                                toggle.mutate({ userId: u.id, role: r, grant: !has })
                              }
                              className={`border px-2 py-1 text-mono text-[10px] uppercase tracking-[0.16em] transition-colors disabled:opacity-40 ${
                                has
                                  ? "border-destructive/60 text-destructive hover:bg-destructive/10"
                                  : "border-border text-muted-foreground hover:border-cyan hover:text-cyan"
                              }`}
                              title={
                                r === "fundador" && !isFundador
                                  ? "Apenas Fundador pode alterar este papel"
                                  : undefined
                              }
                            >
                              {has ? `− ${r}` : `+ ${r}`}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
