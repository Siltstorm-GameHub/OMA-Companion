/**
 * Gemeinsame Typen/Helfer für die frei belegbaren Vitrinen-Fächer — von
 * room-profile-data.ts (Server), RoomStage.tsx und den Vitrine-Modals
 * (Client) sowie der API-Route gleichermaßen genutzt. Bewusst ohne
 * React/Prisma-Importe, damit die Datei überall importierbar bleibt.
 *
 * Ein Fach zeigt IMMER genau eins von drei Dingen: einen digitalen Pokal,
 * einen Wanderpokal oder ein Abzeichen — welches Fach welchen Typ zeigt, ist
 * frei wählbar (nicht an die Bühnen-Reihe gebunden). Die Reihen (Trophäen
 * oben, Pokale mittig, Abzeichen unten) bestimmen nur die Standardbelegung,
 * wenn der User ein Fach nicht angefasst hat.
 */

export const VITRINE_SLOT_COUNTS = { trophies: 4, pokale: 6, badges: 5 } as const;
export const VITRINE_TOTAL_SLOTS =
  VITRINE_SLOT_COUNTS.trophies + VITRINE_SLOT_COUNTS.pokale + VITRINE_SLOT_COUNTS.badges;

/** Index-Bereich [start, ende) je Reihe, im flachen 0..14-Fächer-Index. */
export const VITRINE_SLOT_RANGES = {
  trophies: [0, VITRINE_SLOT_COUNTS.trophies] as const,
  pokale: [
    VITRINE_SLOT_COUNTS.trophies,
    VITRINE_SLOT_COUNTS.trophies + VITRINE_SLOT_COUNTS.pokale,
  ] as const,
  badges: [
    VITRINE_SLOT_COUNTS.trophies + VITRINE_SLOT_COUNTS.pokale,
    VITRINE_TOTAL_SLOTS,
  ] as const,
};

export type VitrineItem =
  | { kind: "pokal"; id: string; title: string; category: string; isSeries: boolean; awardedAt: string }
  | { kind: "trophy"; scopeType: string; scopeValue: string; heldSince: string; winCount: number }
  | { kind: "badge"; key: string; icon: string; name: string; desc: string; earnedAt: string | null; custom: boolean };

export function encodePokalValue(id: string): string {
  return `pokal:${id}`;
}
export function encodeTrophyValue(scopeType: string, scopeValue: string): string {
  return `trophy:${scopeType}:${scopeValue}`;
}
export function encodeBadgeValue(key: string): string {
  return `badge:${key}`;
}

/** Kodiert ein aufgelöstes VitrineItem zurück in den Fach-Wert (Inverse zu parseSlotValue). */
export function encodeSlotValue(item: VitrineItem): string {
  if (item.kind === "pokal") return encodePokalValue(item.id);
  if (item.kind === "trophy") return encodeTrophyValue(item.scopeType, item.scopeValue);
  return encodeBadgeValue(item.key);
}

export type ParsedSlotValue =
  | { kind: "pokal"; id: string }
  | { kind: "trophy"; scopeType: string; scopeValue: string }
  | { kind: "badge"; key: string };

export function parseSlotValue(value: string): ParsedSlotValue | null {
  if (value.startsWith("pokal:")) {
    const id = value.slice(6);
    return id ? { kind: "pokal", id } : null;
  }
  if (value.startsWith("trophy:")) {
    const rest = value.slice(7);
    const sep = rest.indexOf(":");
    if (sep === -1) return null;
    const scopeType = rest.slice(0, sep);
    const scopeValue = rest.slice(sep + 1);
    return scopeType && scopeValue ? { kind: "trophy", scopeType, scopeValue } : null;
  }
  if (value.startsWith("badge:")) {
    const key = value.slice(6);
    return key ? { kind: "badge", key } : null;
  }
  return null;
}

/** Defensives Parsen des Fächer-JSON — kaputte Daten dürfen die Vitrine nie kippen. */
export function parseVitrineSlotsJson(json: string | null | undefined): Record<number, string | null> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const out: Record<number, string | null> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const idx = Number(k);
      if (!Number.isInteger(idx) || idx < 0 || idx >= VITRINE_TOTAL_SLOTS) continue;
      if (v === null || typeof v === "string") out[idx] = v;
    }
    return out;
  } catch {
    return {};
  }
}
