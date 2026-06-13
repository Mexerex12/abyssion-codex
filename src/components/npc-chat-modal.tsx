import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { chatComoNpc } from "@/lib/ai.functions";
import { Modal, Button, Input } from "@/components/staff-ui";
import { renderMarkdown } from "@/lib/markdown";

type Msg = { role: "user" | "assistant"; content: string };

export function NpcChatModal({ npc, onClose }: { npc: { id: string; nome: string; cargo?: string | null }; onClose: () => void }) {
  const call = useServerFn(chatComoNpc);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");

  const m = useMutation({
    mutationFn: async (next: Msg[]) => {
      const r = (await call({ data: { npcId: npc.id, mensagens: next } })) as { reply: string };
      return r.reply;
    },
    onSuccess: (reply) => setMessages((prev) => [...prev, { role: "assistant", content: reply }]),
  });

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const next: Msg[] = [...messages, { role: "user", content: input.trim() }];
    setMessages(next);
    setInput("");
    m.mutate(next);
  }

  const cargo = (npc.cargo ?? "").toLowerCase();
  const tipo = cargo.includes("curador") ? "Curador" : cargo.includes("regente") ? "Regente" : "NPC";

  return (
    <Modal open onClose={onClose} title={`Interpretando — ${npc.nome} (${tipo})`} wide>
      <div className="flex h-[60vh] flex-col gap-3">
        <div className="flex-1 space-y-3 overflow-y-auto border border-border bg-surface-2 p-4">
          {messages.length === 0 && (
            <p className="text-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Inicie a conversa. A IA responderá em primeira pessoa, como {npc.nome}.
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "ml-12" : "mr-12"}>
              <p className="hud-label mb-1 text-[9px] text-muted-foreground">
                {msg.role === "user" ? "Narrador" : npc.nome}
              </p>
              <div
                className={`prose prose-invert max-w-none border-l-2 p-3 text-sm ${
                  msg.role === "user" ? "border-border bg-surface-1" : "border-cyan/60 bg-surface-1"
                }`}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
              />
            </div>
          ))}
          {m.isPending && <p className="text-mono text-[11px] text-cyan">{npc.nome} está respondendo…</p>}
          {m.error && <p className="text-mono text-xs text-destructive">{(m.error as Error).message}</p>}
        </div>
        <form onSubmit={send} className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Falar com ${npc.nome}...`} disabled={m.isPending} />
          <Button type="submit" disabled={m.isPending || !input.trim()}>Enviar</Button>
        </form>
      </div>
    </Modal>
  );
}
