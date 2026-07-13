export const CLASSIFICATIONS = ["publico", "n_i", "n_ii", "n_iii", "diretor"] as const;
export const VISIBILITIES = [
  "public",
  "trivalente",
  "instructor",
  "director",
  "council",
  "founder",
] as const;
export const ENTRY_STATUSES = ["draft", "published", "archived", "obsolete", "trash"] as const;

export type Classification = (typeof CLASSIFICATIONS)[number];
export type Visibility = (typeof VISIBILITIES)[number];
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export const CLASSIFICATION_META: Record<Classification, { label: string; short: string }> = {
  publico: { label: "Público", short: "PUB" },
  n_i: { label: "N-I", short: "N-I" },
  n_ii: { label: "N-II", short: "N-II" },
  n_iii: { label: "N-III", short: "N-III" },
  diretor: { label: "Diretor", short: "DIR" },
};

export const VISIBILITY_META: Record<Visibility, { label: string; short: string; rank: number }> = {
  public: { label: "Public", short: "PUBLIC", rank: 0 },
  trivalente: { label: "Trivalente", short: "TRI", rank: 1 },
  instructor: { label: "Instructor", short: "INST", rank: 2 },
  director: { label: "Director", short: "DIR", rank: 3 },
  council: { label: "Council", short: "COUNCIL", rank: 4 },
  founder: { label: "Founder", short: "FOUND", rank: 5 },
};

export const STATUS_META: Record<
  EntryStatus,
  { label: string; tone: "neutral" | "amber" | "alert" }
> = {
  draft: { label: "Draft", tone: "neutral" },
  published: { label: "Published", tone: "neutral" },
  archived: { label: "Archived", tone: "amber" },
  obsolete: { label: "Obsolete", tone: "amber" },
  trash: { label: "Trash", tone: "alert" },
};

export function legacyStatusToCms(status: string | null | undefined): EntryStatus {
  if (status === "publicado") return "published";
  if (status === "arquivado") return "archived";
  if (
    status === "obsolete" ||
    status === "trash" ||
    status === "draft" ||
    status === "published" ||
    status === "archived"
  ) {
    return status;
  }
  return "draft";
}

export function cmsStatusToLegacy(status: EntryStatus) {
  if (status === "published") return "publicado";
  if (status === "archived" || status === "obsolete" || status === "trash") return "arquivado";
  return "rascunho";
}

export function legacyClearanceToClassification(
  clearance: string | null | undefined,
): Classification {
  if (clearance === "nivel_1" || clearance === "uniao") return "n_i";
  if (clearance === "nivel_2" || clearance === "instrutores") return "n_ii";
  if (clearance === "nivel_3" || clearance === "nivel_4" || clearance === "curadores")
    return "n_iii";
  if (
    clearance === "nivel_diretor" ||
    clearance === "nivel_fundador" ||
    clearance === "diretores" ||
    clearance === "restrito" ||
    clearance === "verdade_absoluta"
  ) {
    return "diretor";
  }
  return "publico";
}

export function legacyClearanceToVisibility(clearance: string | null | undefined): Visibility {
  if (clearance === "publico") return "public";
  if (clearance === "nivel_1" || clearance === "nivel_2" || clearance === "uniao")
    return "trivalente";
  if (clearance === "instrutores") return "instructor";
  if (clearance === "nivel_3" || clearance === "nivel_4" || clearance === "diretores")
    return "director";
  if (clearance === "nivel_diretor" || clearance === "curadores" || clearance === "restrito")
    return "council";
  if (clearance === "nivel_fundador" || clearance === "verdade_absoluta") return "founder";
  return "public";
}

export function visibilityToLegacyClearance(visibility: Visibility) {
  switch (visibility) {
    case "public":
      return "publico";
    case "trivalente":
      return "uniao";
    case "instructor":
      return "instrutores";
    case "director":
      return "diretores";
    case "council":
      return "restrito";
    case "founder":
      return "nivel_fundador";
  }
}

export function canRoleViewVisibility(
  visibility: Visibility,
  roles: string[],
  isAuthenticated: boolean,
) {
  if (visibility === "public") return true;
  if (!isAuthenticated) return false;
  if (visibility === "trivalente") return true;
  if (visibility === "instructor")
    return roles.some((role) =>
      ["narrador", "diretor", "administrador", "fundador"].includes(role),
    );
  if (visibility === "director")
    return roles.some((role) => ["diretor", "administrador", "fundador"].includes(role));
  if (visibility === "council")
    return roles.some((role) => ["administrador", "fundador"].includes(role));
  return roles.includes("fundador");
}
