import type { Database } from "@/integrations/supabase/types";
import {
  CLASSIFICATION_META,
  VISIBILITY_META,
  type Classification,
  type EntryStatus,
  type Visibility,
} from "@/cms/permissions/policy";

export type LoreCategory = Database["public"]["Enums"]["lore_category"];
export type ClearanceLevel = Database["public"]["Enums"]["clearance_level"];
export type AppRole = Database["public"]["Enums"]["app_role"];
export type { Classification, Visibility, EntryStatus };

export const CATEGORY_META: Record<
  LoreCategory,
  { label: string; plural: string; color: string; description: string }
> = {
  universo: { label: "Universo", plural: "Universo", color: "cyan", description: "" },
  historia: { label: "História", plural: "História", color: "cyan", description: "" },
  npc: { label: "NPC", plural: "NPCs", color: "cyan", description: "" },
  faccao: { label: "Facção", plural: "Facções", color: "cyan", description: "" },
  vestigio: { label: "Vestígio", plural: "Vestígios", color: "alert", description: "" },
  regente: { label: "Regente", plural: "Regentes", color: "alert", description: "" },
  curador: { label: "Curador", plural: "Curadores", color: "alert", description: "" },
  dominio: { label: "Domínio", plural: "Domínios", color: "cyan", description: "" },
  evento: { label: "Evento", plural: "Eventos", color: "cyan", description: "" },
  bastiao: { label: "Bastião", plural: "Bastiões", color: "cyan", description: "" },
  esquadrao: { label: "Esquadrão", plural: "Esquadrões", color: "cyan", description: "" },
  personagem_historico: {
    label: "Histórico",
    plural: "Personagens Históricos",
    color: "cyan",
    description: "",
  },
  documento_restrito: {
    label: "Documento",
    plural: "Arquivos Restritos",
    color: "alert",
    description: "",
  },
  classe: { label: "Classe", plural: "Classes", color: "cyan", description: "" },
  ruptura: { label: "Ruptura", plural: "Rupturas", color: "alert", description: "" },
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
  nivel_fundador: { label: "Nível Fundador", short: "FUNDADOR", tone: "alert" },
};

export const DASHBOARD_CARDS: {
  title: string;
  subtitle: string;
  href: string;
  classified?: boolean;
}[] = [
  { title: "Universo", subtitle: "", href: "/categoria/universo" },
  { title: "História", subtitle: "", href: "/categoria/historia" },
  { title: "União Trivalente", subtitle: "", href: "/wiki/uniao-trivalente" },
  { title: "Domínios", subtitle: "", href: "/categoria/dominio" },
  { title: "Vestígios", subtitle: "", href: "/categoria/vestigio" },
  { title: "Curadores", subtitle: "", href: "/categoria/curador" },
  { title: "Regentes", subtitle: "", href: "/categoria/regente" },
  { title: "Peregrino Branco", subtitle: "", href: "/wiki/peregrino-branco" },
  { title: "Rei Pálido", subtitle: "", href: "/wiki/rei-palido", classified: true },
  { title: "Bastiões", subtitle: "", href: "/categoria/bastiao" },
  { title: "Linha do Tempo", subtitle: "", href: "/linha-do-tempo" },
  { title: "Arquivos Restritos", subtitle: "", href: "/arquivos-restritos", classified: true },
];

export function categoryLabel(c: LoreCategory) {
  return CATEGORY_META[c]?.label ?? c;
}

export function clearanceMeta(c: ClearanceLevel) {
  return CLEARANCE_META[c];
}

export function isClassified(c: ClearanceLevel) {
  return (
    c === "nivel_3" ||
    c === "nivel_4" ||
    c === "nivel_diretor" ||
    c === "nivel_fundador" ||
    c === "restrito" ||
    c === "verdade_absoluta"
  );
}

export function classificationMeta(c: Classification) {
  return CLASSIFICATION_META[c];
}

export function visibilityMeta(v: Visibility) {
  return VISIBILITY_META[v];
}

export function isRestrictedVisibility(v: Visibility) {
  return v !== "public";
}
