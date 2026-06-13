import type { Database } from "@/integrations/supabase/types";

export type LoreCategory = Database["public"]["Enums"]["lore_category"];
export type ClearanceLevel = Database["public"]["Enums"]["clearance_level"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export const CATEGORY_META: Record<
  LoreCategory,
  { label: string; plural: string; color: string; description: string }
> = {
  universo: { label: "Universo", plural: "Universo", color: "cyan", description: "Princípios, leis e camadas da realidade." },
  historia: { label: "História", plural: "História", color: "cyan", description: "Eventos fundadores e linha histórica." },
  npc: { label: "NPC", plural: "NPCs", color: "cyan", description: "Personagens ativos no universo." },
  faccao: { label: "Facção", plural: "Facções", color: "cyan", description: "Organizações e blocos de poder." },
  vestigio: { label: "Vestígio", plural: "Vestígios", color: "alert", description: "Entidades remanescentes de Domínios." },
  regente: { label: "Regente", plural: "Regentes", color: "alert", description: "Arquitetos que governam Domínios." },
  curador: { label: "Curador", plural: "Curadores", color: "alert", description: "Trabalhadores eternos do Sistema." },
  dominio: { label: "Domínio", plural: "Domínios", color: "cyan", description: "Realidades acessadas via Rupturas." },
  evento: { label: "Evento", plural: "Eventos", color: "cyan", description: "Acontecimentos da Linha do Tempo." },
  bastiao: { label: "Bastião", plural: "Bastiões", color: "cyan", description: "Instalações da União Trivalente." },
  esquadrao: { label: "Esquadrão", plural: "Esquadrões", color: "cyan", description: "Unidades de Trivalentes." },
  personagem_historico: { label: "Histórico", plural: "Personagens Históricos", color: "cyan", description: "Figuras do passado." },
  documento_restrito: { label: "Documento", plural: "Arquivos Restritos", color: "alert", description: "Documentação classificada." },
  classe: { label: "Classe", plural: "Classes", color: "cyan", description: "Especialidades de Trivalente." },
  ruptura: { label: "Ruptura", plural: "Rupturas", color: "alert", description: "Rachaduras na realidade." },
};

export const CLEARANCE_META: Record<
  ClearanceLevel,
  { label: string; short: string; tone: "neutral" | "amber" | "alert" }
> = {
  publico: { label: "Acesso Público", short: "PÚBLICO", tone: "neutral" },
  uniao: { label: "União Trivalente", short: "UNIÃO", tone: "neutral" },
  instrutores: { label: "Instrutores", short: "INSTR", tone: "neutral" },
  diretores: { label: "Diretores", short: "DIR", tone: "amber" },
  curadores: { label: "Curadores", short: "CUR", tone: "amber" },
  restrito: { label: "Restrito", short: "RESTR", tone: "alert" },
  verdade_absoluta: { label: "Verdade Absoluta", short: "VERDADE", tone: "alert" },
  nivel_1: { label: "Nível I: Operacional", short: "N-I", tone: "neutral" },
  nivel_2: { label: "Nível II: Restrito", short: "N-II", tone: "neutral" },
  nivel_3: { label: "Nível III: Confidencial", short: "N-III", tone: "amber" },
  nivel_4: { label: "Nível IV: Secreto", short: "N-IV", tone: "amber" },
  nivel_diretor: { label: "Nível Diretor: Alto Conselho", short: "DIRETOR", tone: "alert" },
};

export const DASHBOARD_CARDS: { title: string; subtitle: string; href: string; classified?: boolean }[] = [
  { title: "Universo", subtitle: "Leis e camadas", href: "/categoria/universo" },
  { title: "História", subtitle: "Linha fundadora", href: "/categoria/historia" },
  { title: "União Trivalente", subtitle: "Estrutura de poder", href: "/wiki/uniao-trivalente" },
  { title: "Domínios", subtitle: "Realidades em Ruptura", href: "/categoria/dominio" },
  { title: "Vestígios", subtitle: "Anomalias remanescentes", href: "/categoria/vestigio" },
  { title: "Curadores", subtitle: "Trabalhadores do Sistema", href: "/categoria/curador" },
  { title: "Regentes", subtitle: "Arquitetos de Domínios", href: "/categoria/regente" },
  { title: "Peregrino Branco", subtitle: "Quem voltou do Núcleo", href: "/wiki/peregrino-branco" },
  { title: "Rei Pálido", subtitle: "O primeiro Curador", href: "/wiki/rei-palido", classified: true },
  { title: "Bastiões", subtitle: "Instalações da União", href: "/categoria/bastiao" },
  { title: "Linha do Tempo", subtitle: "Eventos catalogados", href: "/linha-do-tempo" },
  { title: "Arquivos Restritos", subtitle: "Documentação classificada", href: "/arquivos-restritos", classified: true },
];

export function categoryLabel(c: LoreCategory) {
  return CATEGORY_META[c]?.label ?? c;
}

export function clearanceMeta(c: ClearanceLevel) {
  return CLEARANCE_META[c];
}

export function isClassified(c: ClearanceLevel) {
  return c === "nivel_3" || c === "nivel_4" || c === "nivel_diretor";
}
