// ============================================
// Zuordnung OMA-Quest-Klasse → Battle-Engine-Rolle (CardClass)
// ============================================
// Fix zur Auswürfel-Zeit (character/create), danach über overriddenFields
// ("class") dauerhaft geschützt — siehe plan Abschnitt 1.2.

import type { CardClass } from "@prisma/client";

export const DND_CLASS_TO_CARD_CLASS: Record<string, CardClass> = {
  krieger: "TANK",
  magier: "DAMAGE_DEALER",
  kleriker: "SUPPORT",
  schurke: "DAMAGE_DEALER",
  waldlaeufer: "DAMAGE_DEALER",
  barde: "SUPPORT",
};

export function mapDndClassToCardClass(dndClassId: string): CardClass {
  return DND_CLASS_TO_CARD_CLASS[dndClassId] ?? "TANK";
}
