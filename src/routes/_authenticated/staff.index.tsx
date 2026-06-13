import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getWorldState, updateWorldState } from "@/lib/staff.functions";
import { PageHeader, StatCard, Button, Field, Input, Select, Textarea, Modal } from "@/components/staff-ui";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/staff/")({
  component: WorldStatePage,
});

function WorldStatePage() {
  const { isAdmin } = useAuth();
  const fetchWS = useServerFn(getWorldState);
  const { data } = useQuery({ queryKey: ["world-state"], queryFn: () => fetchWS() });
  const [open, setOpen] = useState(false);

  const c = data?.counts;
  const s = data?.state;
  const threat = s?.nivel_ameaca ?? "medio";
  const threatTone: any = threat === "catastrofico" || threat === "critico" ? "alert" : threat === "alto" ? "amber" : "cyan";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Painel · Estado Atual do Mundo"
        title="Estado Atual do Mundo"
        sub="Indicadores vivos do universo. Atualize manualmente conforme os eventos evoluírem."
        actions={isAdmin ? <Button onClick={() => setOpen(true)}>Editar Estado</Button> : null}
      />

      <section>
        <p className="hud-label mb-2">Indicadores Críticos</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatCard label="Nível de Ameaça" value={threat.toUpperCase()} tone={threatTone} />
          <StatCard label="Assimilação Média" value={`${s?.assimilacao_media ?? 0}%`} tone="cyan" />
          <StatCard label="Rupturas Críticas" value={c?.rupturas_criticas ?? 0} tone="alert" />
          <StatCard label="Rupturas Abertas" value={c?.rupturas_abertas ?? 0} tone="amber" />
        </div>
      </section>

      <section>
        <p className="hud-label mb-2">Vestígios</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatCard label="Vestígios Vivos" value={c?.vestigios_vivos ?? 0} tone="green" />
          <StatCard label="Vestígios Mortos" value={c?.vestigios_mortos ?? 0} tone="alert" />
          <StatCard label="Domínios Ativos" value={c?.dominios_ativos ?? 0} tone="cyan" />
          <StatCard label="Domínios Encerrados" value={c?.dominios_encerrados ?? 0} />
        </div>
      </section>

      <section>
        <p className="hud-label mb-2">Figuras Conhecidas</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <StatCard label="Regentes Ativos" value={c?.regentes_ativos ?? 0} tone="amber" />
          <StatCard label="Curadores Conhecidos" value={c?.curadores_conhecidos ?? 0} tone="alert" />
          <StatCard label="NPCs Catalogados" value={c?.npcs_total ?? 0} tone="cyan" />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="border border-border bg-surface-1 p-5">
          <p className="hud-label text-cyan">Peregrino Branco · Último Avistamento</p>
          <p className="mt-3 text-display text-xl font-bold">{s?.peregrino_ultimo_local || "—"}</p>
          <p className="mt-1 text-mono text-[11px] text-muted-foreground">
            {s?.peregrino_ultimo_em ? new Date(s.peregrino_ultimo_em).toLocaleString("pt-BR") : "Sem registro recente"}
          </p>
        </div>
        <div className="border border-border bg-surface-1 p-5">
          <p className="hud-label text-cyan">Último Evento Global</p>
          <p className="mt-3 text-display text-xl font-bold">{data?.ultimo_evento_global?.nome || "—"}</p>
          <p className="mt-1 text-mono text-[11px] text-muted-foreground">
            {data?.ultimo_evento_global?.data ? new Date(data.ultimo_evento_global.data).toLocaleString("pt-BR") : ""}
          </p>
        </div>
      </section>

      {s?.notas && (
        <section className="border border-amber-400/40 bg-amber-400/5 p-5">
          <p className="hud-label text-amber-400">Notas da Direção</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{s.notas}</p>
        </section>
      )}

      <EditModal open={open} onClose={() => setOpen(false)} state={s} />
    </div>
  );
}

function EditModal({ open, onClose, state }: { open: boolean; onClose: () => void; state: any }) {
  const qc = useQueryClient();
  const update = useServerFn(updateWorldState);
  const m = useMutation({
    mutationFn: (data: any) => update({ data }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["world-state"] }); onClose(); },
  });
  const [form, setForm] = useState<any>(() => ({
    assimilacao_media: state?.assimilacao_media ?? 0,
    nivel_ameaca: state?.nivel_ameaca ?? "medio",
    peregrino_ultimo_local: state?.peregrino_ultimo_local ?? "",
    peregrino_ultimo_em: state?.peregrino_ultimo_em?.slice(0, 16) ?? "",
    notas: state?.notas ?? "",
  }));
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Editar Estado do Mundo">
      <form
        onSubmit={(e) => { e.preventDefault(); m.mutate({ ...form, peregrino_ultimo_em: form.peregrino_ultimo_em ? new Date(form.peregrino_ultimo_em).toISOString() : null }); }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assimilação Média (%)">
            <Input type="number" min={0} max={100} value={form.assimilacao_media} onChange={(e) => setForm({ ...form, assimilacao_media: Number(e.target.value) })} />
          </Field>
          <Field label="Nível de Ameaça">
            <Select value={form.nivel_ameaca} onChange={(e) => setForm({ ...form, nivel_ameaca: e.target.value })}>
              {["baixo", "medio", "alto", "critico", "catastrofico"].map((l) => <option key={l} value={l}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Peregrino · Último Local">
            <Input value={form.peregrino_ultimo_local} onChange={(e) => setForm({ ...form, peregrino_ultimo_local: e.target.value })} />
          </Field>
          <Field label="Peregrino · Visto em">
            <Input type="datetime-local" value={form.peregrino_ultimo_em} onChange={(e) => setForm({ ...form, peregrino_ultimo_em: e.target.value })} />
          </Field>
        </div>
        <Field label="Notas da Direção">
          <Textarea rows={5} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
        </Field>
        {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={m.isPending}>Salvar</Button></div>
      </form>
    </Modal>
  );
}
