import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { CategoryBadge, ClassificationBadge, VisibilityBadge } from "@/components/lore-card";
import { useAuth } from "@/hooks/use-auth";
import { getCmsDashboard, listCmsEntries } from "@/lib/admin.functions";
import { STATUS_META, type EntryStatus } from "@/cms/permissions/policy";
import { Archive, FileEdit, Library, Plus, Tags, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Painel Administrativo | União Trivalente" }] }),
  component: AdminHome,
});

const STATUS_ORDER: EntryStatus[] = ["published", "draft", "archived", "obsolete", "trash"];

type LatestChange = {
  id: string;
  entry_id: string;
  changed_fields: string[] | null;
  created_at: string;
  entry?: { title?: string | null } | null;
};

function AdminHome() {
  const { isAdmin, isStaff, loading } = useAuth();
  const navigate = useNavigate();
  const fetchEntries = useServerFn(listCmsEntries);
  const fetchDashboard = useServerFn(getCmsDashboard);

  useEffect(() => {
    if (!loading && !isStaff) navigate({ to: "/dashboard" });
  }, [isStaff, loading, navigate]);

  const entries = useQuery({
    queryKey: ["cms", "entries", "admin-home"],
    queryFn: () => fetchEntries({ data: { limit: 12, sort: "updated_desc" } }),
    enabled: isStaff,
  });
  const dashboard = useQuery({
    queryKey: ["cms", "dashboard"],
    queryFn: () => fetchDashboard(),
    enabled: isStaff,
  });

  if (loading) return null;
  const d = dashboard.data;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 pt-10 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="hud-label text-cyan">Painel · {isAdmin ? "Administrador" : "Narrador"}</p>
            <h1 className="mt-2 text-display text-4xl font-bold">CMS · Arquivos da União</h1>
          </div>
          <div className="flex flex-wrap gap-2">
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

        <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          <Metric label="NPCs" value={d?.npcs ?? 0} />
          <Metric label="Documentos" value={d?.documents ?? 0} />
          <Metric label="Eventos" value={d?.eventos ?? 0} />
          <Metric label="Domínios" value={d?.dominios ?? 0} />
          <Metric label="Vestígios" value={d?.vestigios ?? 0} />
          <Metric label="Categorias" value={d?.categories ?? 0} />
          <Metric label="Rascunhos" value={d?.drafts ?? 0} />
          <Metric label="Arquivados" value={d?.archived ?? 0} />
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <SectionTitle
              icon={<Library className="h-4 w-4" />}
              title="Biblioteca"
              href="/admin/biblioteca"
            />
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
              {STATUS_ORDER.map((status) => (
                <Link
                  key={status}
                  to="/admin/biblioteca"
                  className="border border-border bg-surface-1 p-3 hover:border-cyan"
                >
                  <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {STATUS_META[status].label}
                  </p>
                  <p className="mt-2 text-display text-2xl font-bold">
                    {status === "draft"
                      ? (d?.drafts ?? 0)
                      : status === "archived"
                        ? (d?.archived ?? 0)
                        : status === "obsolete"
                          ? (d?.obsolete ?? 0)
                          : status === "trash"
                            ? (d?.trash ?? 0)
                            : (d?.documents ?? 0) -
                              (d?.drafts ?? 0) -
                              (d?.archived ?? 0) -
                              (d?.obsolete ?? 0) -
                              (d?.trash ?? 0)}
                  </p>
                </Link>
              ))}
            </div>

            <table className="mt-6 w-full border border-border text-sm">
              <thead className="bg-surface-1">
                <tr className="text-left text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-3 py-2.5">Categoria</th>
                  <th className="px-3 py-2.5">Título</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Classificação</th>
                  <th className="px-3 py-2.5">Visibilidade</th>
                  <th className="px-3 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(entries.data ?? []).map((entry) => (
                  <tr key={entry.id} className="border-t border-border hover:bg-surface-1">
                    <td className="px-3 py-2.5">
                      <CategoryBadge category={entry.category} />
                    </td>
                    <td className="px-3 py-2.5 font-medium">{entry.title}</td>
                    <td className="px-3 py-2.5 text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {STATUS_META[entry.status as EntryStatus]?.label ?? entry.status}
                    </td>
                    <td className="px-3 py-2.5">
                      <ClassificationBadge classification={entry.classification} />
                    </td>
                    <td className="px-3 py-2.5">
                      <VisibilityBadge visibility={entry.visibility} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link
                        to="/admin/editar/$id"
                        params={{ id: entry.id }}
                        className="inline-flex items-center gap-1 text-mono text-[11px] uppercase tracking-[0.16em] text-cyan hover:underline"
                      >
                        <FileEdit className="h-3 w-3" /> Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <SectionTitle icon={<Archive className="h-4 w-4" />} title="Últimas alterações" />
            <ul className="mt-4 divide-y divide-border border border-border bg-surface-1">
              {((d?.latest ?? []) as LatestChange[]).map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <p className="text-sm font-medium">{item.entry?.title ?? item.entry_id}</p>
                  <p className="mt-1 text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {(item.changed_fields ?? []).join(", ")} ·{" "}
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
              {(d?.latest ?? []).length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Sem alterações.
                </li>
              )}
            </ul>
            <div className="mt-4 border border-border bg-surface-1 p-4">
              <div className="flex items-center gap-2 text-cyan">
                <Tags className="h-4 w-4" />
                <p className="hud-label">Etiquetas catalogadas</p>
              </div>
              <p className="mt-2 text-display text-3xl font-bold">{d?.tags ?? 0}</p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border bg-surface-1 p-3">
      <p className="text-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function SectionTitle({ icon, title, href }: { icon: ReactNode; title: string; href?: string }) {
  const inner = (
    <div className="flex items-center gap-2">
      {icon}
      <h2 className="text-display text-2xl font-bold">{title}</h2>
    </div>
  );
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      {inner}
      {href && (
        <Link
          to={href}
          className="text-mono text-[10px] uppercase tracking-[0.16em] text-cyan hover:underline"
        >
          Abrir
        </Link>
      )}
    </div>
  );
}
