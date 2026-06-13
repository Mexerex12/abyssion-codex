// Server-only helper for calling the Lovable AI Gateway.
// Used by AI narrative tools. Keeps LOVABLE_API_KEY out of any client bundle.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export interface CallAIOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  json?: boolean;
}

export async function callAI({
  messages,
  model = "google/gemini-3-flash-preview",
  temperature = 0.85,
  json = false,
}: CallAIOptions): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente. Lovable Cloud não está configurado.");

  const body: Record<string, unknown> = { model, messages, temperature };
  if (json) body.response_format = { type: "json_object" };

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "custom-fetch",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Limite de requisições da IA atingido. Aguarde e tente novamente.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados no workspace. Adicione créditos para continuar.");
    throw new Error(`Falha na IA (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function callAIJson<T = unknown>(opts: CallAIOptions): Promise<T> {
  const text = await callAI({ ...opts, json: true });
  try {
    return JSON.parse(text) as T;
  } catch {
    // try to extract a JSON block
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error("Resposta da IA não estava em JSON válido.");
  }
}
