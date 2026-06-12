import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { getGraph } from "@/lib/staff.functions";
import { PageHeader, Empty } from "@/components/staff-ui";

export const Route = createFileRoute("/_authenticated/staff/grafo")({
  component: GrafoPage,
});

function GrafoPage() {
  const fetch = useServerFn(getGraph);
  const { data } = useQuery({ queryKey: ["graph"], queryFn: () => fetch() });

  const layout = useMemo(() => {
    if (!data) return null;
    const groups = new Map<string, typeof data.nodes>();
    for (const n of data.nodes) {
      if (!groups.has(n.group)) groups.set(n.group, []);
      groups.get(n.group)!.push(n);
    }
    const W = 1200, H = 800;
    const cx = W / 2, cy = H / 2;
    const groupList = Array.from(groups.entries());
    const groupRadius = 320;
    const positions = new Map<string, { x: number; y: number; group: string; label: string }>();
    groupList.forEach(([groupName, nodes], gi) => {
      const angle = (gi / groupList.length) * Math.PI * 2;
      const gx = cx + Math.cos(angle) * groupRadius;
      const gy = cy + Math.sin(angle) * groupRadius;
      const localR = Math.max(40, Math.min(120, nodes.length * 14));
      nodes.forEach((n, i) => {
        const a = (i / nodes.length) * Math.PI * 2;
        positions.set(n.id, { x: gx + Math.cos(a) * localR, y: gy + Math.sin(a) * localR, group: groupName, label: n.label });
      });
    });
    const colors = ["#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#a855f7", "#ec4899", "#3b82f6", "#eab308"];
    const groupColors = new Map<string, string>();
    groupList.forEach(([g], i) => groupColors.set(g, colors[i % colors.length]));
    return { W, H, positions, edges: data.edges, groupColors };
  }, [data]);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Workspace · Mapa de Relações" title="Mapa de Relações" sub="Visualização em grafo. NPCs, Domínios, vínculos de regência e arquitetura." />
      {!layout || data?.nodes.length === 0 ? <Empty>Sem dados suficientes para gerar o grafo. Cadastre NPCs, Domínios e relações.</Empty> : (
        <>
          <div className="flex flex-wrap gap-2">
            {Array.from(layout.groupColors.entries()).map(([g, c]) => (
              <span key={g} className="inline-flex items-center gap-1.5 border border-border bg-surface-1 px-2 py-1 text-mono text-[10px] uppercase tracking-[0.14em]">
                <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                {g}
              </span>
            ))}
          </div>
          <div className="overflow-auto border border-border bg-surface-1">
            <svg viewBox={`0 0 ${layout.W} ${layout.H}`} className="h-[700px] w-full">
              {layout.edges.map((e, i) => {
                const a = layout.positions.get(e.from); const b = layout.positions.get(e.to);
                if (!a || !b) return null;
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="hsl(var(--border))" strokeOpacity="0.4" strokeWidth="1" />;
              })}
              {Array.from(layout.positions.entries()).map(([id, p]) => (
                <g key={id}>
                  <circle cx={p.x} cy={p.y} r={6} fill={layout.groupColors.get(p.group)} stroke="hsl(var(--background))" strokeWidth="2" />
                  <text x={p.x + 9} y={p.y + 3} fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">{p.label}</text>
                </g>
              ))}
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
