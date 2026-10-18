// ============================================
// OMA Gems — Kosmetik für „Mein Held“: was frei ist und wie man den Rest bekommt
// ============================================
// Jedes wählbare Teil eines Helden-Looks (look.ts) hat eine Freischalt-Regel. Frei sind die Teile
// zum Start; alle anderen kommen über Münzen, Karten-Ränge, Wächter oder die Aufstiegs-Saison
// (Besitz und Vergabe: Phase 10c). Kosmetik gibt nie Kampfwerte. Rein, ohne DB.

import { basesForClass, type HeroClass, type HeroLook } from "./look";

export type CosmeticSlot = "scheme" | "emblem" | "headgear" | "accessory" | "pose" | "backdrop";

export type Unlock =
  | { kind: "free" }
  | { kind: "coins"; price: number }
  | { kind: "rank"; rank: number }
  | { kind: "guardian"; stage: number }
  | { kind: "season"; place: "top10" | "first" };

/** Regeln je Slot und Teil. Grundfigur, Gesicht, Hautton, Frisur und Haarfarbe sind immer frei. */
const RULES: Record<CosmeticSlot, Record<string, Unlock>> = {
  scheme: {
    tuerkis: { kind: "free" },
    rot: { kind: "coins", price: 900 },
    violett: { kind: "coins", price: 900 },
    nacht: { kind: "coins", price: 900 },
    wald: { kind: "coins", price: 900 },
    rose: { kind: "coins", price: 900 },
    glut: { kind: "guardian", stage: 30 },
    gold: { kind: "season", place: "top10" },
  },
  emblem: {
    juwel: { kind: "free" },
    herz: { kind: "coins", price: 600 },
    blitz: { kind: "coins", price: 600 },
    stern: { kind: "rank", rank: 3 },
    krone: { kind: "season", place: "first" },
  },
  headgear: {
    keine: { kind: "free" },
    helm: { kind: "coins", price: 600 },
    kapuze: { kind: "coins", price: 600 },
    stirnband: { kind: "coins", price: 600 },
    muetze: { kind: "coins", price: 600 },
  },
  accessory: {
    keins: { kind: "free" },
    brille: { kind: "coins", price: 600 },
    schal: { kind: "coins", price: 600 },
    headset: { kind: "coins", price: 1200 },
    umhang: { kind: "guardian", stage: 20 },
  },
  pose: {
    stehen: { kind: "free" },
    angriff: { kind: "coins", price: 800 },
    jubel: { kind: "rank", rank: 5 },
  },
  backdrop: {
    wiese: { kind: "free" },
    wald: { kind: "free" },
    berge: { kind: "free" },
    kueste: { kind: "coins", price: 700 },
    wueste: { kind: "coins", price: 700 },
    burg: { kind: "coins", price: 700 },
    nacht: { kind: "coins", price: 700 },
    vulkan: { kind: "guardian", stage: 40 },
  },
};

/** Zur Klasse passend von Anfang an frei: das Farbschema der Klasse und zwei Kopfbedeckungen. */
const CLASS_FREE: Record<HeroClass, { scheme: string; headgear: string[] }> = {
  TANK: { scheme: "tuerkis", headgear: ["helm", "muetze"] },
  DAMAGE_DEALER: { scheme: "rot", headgear: ["stirnband", "kapuze"] },
  SUPPORT: { scheme: "violett", headgear: ["kapuze", "muetze"] },
};

export const COSMETIC_SLOTS: CosmeticSlot[] = ["scheme", "emblem", "headgear", "accessory", "pose", "backdrop"];

/** Kennung eines Kosmetik-Teils, wie sie im Besitz (UserCosmetic.itemId, Phase 10c) steht. */
export function cosmeticItemId(slot: CosmeticSlot, id: string): string {
  return `${slot}:${id}`;
}

export function unlockFor(slot: CosmeticSlot, id: string, cls: HeroClass): Unlock {
  const free = CLASS_FREE[cls];
  if (slot === "scheme" && id === free.scheme) return { kind: "free" };
  if (slot === "headgear" && free.headgear.includes(id)) return { kind: "free" };
  return RULES[slot]?.[id] ?? { kind: "free" };
}

export function isAvailable(slot: CosmeticSlot, id: string, cls: HeroClass, owned: ReadonlySet<string>): boolean {
  return unlockFor(slot, id, cls).kind === "free" || owned.has(cosmeticItemId(slot, id));
}

/** Kurzer Text, wie man ein Teil bekommt. */
export function unlockLabel(unlock: Unlock): string {
  switch (unlock.kind) {
    case "free":
      return "Frei";
    case "coins":
      return `${unlock.price} Münzen`;
    case "rank":
      return `Karte auf Rang ${unlock.rank}`;
    case "guardian":
      return `Wächter ${unlock.stage}`;
    case "season":
      return unlock.place === "first" ? "Saison-Platz 1" : "Saison Top 10";
  }
}

/** Welche Teile eines Looks nicht verfügbar sind (leer = alles erlaubt). Grundfigur muss zur Klasse
 *  passen; Gesicht, Haut, Frisur und Haarfarbe sind immer frei. */
export function unavailableParts(look: HeroLook, cls: HeroClass, owned: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  if (!basesForClass(cls).includes(look.base)) problems.push(`base:${look.base}`);
  for (const slot of COSMETIC_SLOTS) {
    if (!isAvailable(slot, look[slot], cls, owned)) problems.push(cosmeticItemId(slot, look[slot]));
  }
  return problems;
}

// ---------- Erspielte Teile ----------

/** Alle Teile mit ihrer Regel (über alle Slots), für Shop und Ableitung. */
export function allCosmetics(): { slot: CosmeticSlot; id: string; itemId: string; unlock: Unlock }[] {
  return COSMETIC_SLOTS.flatMap((slot) =>
    Object.entries(RULES[slot]).map(([id, unlock]) => ({ slot, id, itemId: cosmeticItemId(slot, id), unlock }))
  );
}

export interface CosmeticProgress {
  /** Höchster Rang irgendeiner eigenen Karte (card-ranks.ts). */
  maxCardRank: number;
  /** Je geschaffte Wächter-Stufen (Stufe 20, 30, …). */
  guardianStages: ReadonlySet<number>;
  /** Beste Platzierung in einer abgeschlossenen Aufstiegs-Saison, oder null. */
  bestSeasonPlace: number | null;
}

/** Rein, damit testbar: welche Teile der Fortschritt freischaltet (Rang, Wächter, Saison). Wird bei
 *  jedem Zugriff neu abgeleitet — so gelten auch Erfolge von vor der Einführung der Kosmetik. */
export function earnedCosmetics(progress: CosmeticProgress): string[] {
  return allCosmetics()
    .filter(({ unlock }) => {
      if (unlock.kind === "rank") return progress.maxCardRank >= unlock.rank;
      if (unlock.kind === "guardian") return progress.guardianStages.has(unlock.stage);
      if (unlock.kind === "season") {
        const place = progress.bestSeasonPlace;
        return place !== null && (unlock.place === "first" ? place === 1 : place <= 10);
      }
      return false;
    })
    .map((c) => c.itemId);
}

/** Preis eines kaufbaren Teils, sonst null (frei oder nur erspielbar). */
export function coinPrice(itemId: string): number | null {
  const item = allCosmetics().find((c) => c.itemId === itemId);
  return item?.unlock.kind === "coins" ? item.unlock.price : null;
}

/** Teile, die ein bestimmter Erfolg neu freischaltet — für den Hinweis im Ergebnisbildschirm. */
export function cosmeticsUnlockedBy(event: { rankReached?: number; guardianStage?: number }): { itemId: string; label: string }[] {
  return allCosmetics()
    .filter(({ unlock }) =>
      (unlock.kind === "rank" && unlock.rank === event.rankReached) ||
      (unlock.kind === "guardian" && unlock.stage === event.guardianStage)
    )
    .map((c) => ({ itemId: c.itemId, label: cosmeticLabel(c.slot, c.id) }));
}

const SLOT_LABEL: Record<CosmeticSlot, string> = {
  scheme: "Farbschema",
  emblem: "Emblem",
  headgear: "Kopfbedeckung",
  accessory: "Accessoire",
  pose: "Pose",
  backdrop: "Hintergrund",
};

/** Lesbarer Name, z. B. „Accessoire Umhang“. */
export function cosmeticLabel(slot: CosmeticSlot, id: string): string {
  const name = id.charAt(0).toUpperCase() + id.slice(1);
  const pretty: Record<string, string> = { tuerkis: "OMA-Türkis", muetze: "Mütze", keins: "Keins", juwel: "OMA-Juwel", glut: "Glut", gold: "Saison-Gold", nacht: "Mitternacht", rot: "Kampfrot", kueste: "Küste", wueste: "Wüste" };
  // „nacht“ heißt als Farbschema „Mitternacht“, als Hintergrund schlicht „Nacht“.
  const label = slot === "backdrop" && id === "nacht" ? "Nacht" : pretty[id] ?? name;
  return `${SLOT_LABEL[slot]} ${label}`;
}
