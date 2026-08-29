// ============================================
// Skill-Vorlagen für Community-Karten je Klasse
// ============================================
// Community-Karten haben (noch) keine eigenen dokumentierten Skills — sie
// leihen sich Passiv/Aktiv/Ultimate von der thematisch nächsten Standard-
// Karte derselben Klasse. Genutzt sowohl beim Cold-Start (card-provisioning.ts)
// als auch bei jeder Klassen-Neuzuordnung durch einen Saison-Lauf
// (apply-season-results.ts) — sonst würden Skills einer alten Klasse an
// Stats einer neuen Klasse hängen bleiben.

import type { CardClass } from "@prisma/client";
import { STANDARD_CARDS, type StandardCardSeed } from "../../../prisma/battle-cards-seed-data";

export const SKILL_TEMPLATE_CARD_BY_CLASS: Record<CardClass, string> = {
  TANK: "Bastionella",
  DAMAGE_DEALER: "Scherbe",
  SUPPORT: "Pflästerchen",
};

export function getSkillTemplate(cls: CardClass): StandardCardSeed {
  return STANDARD_CARDS.find((c) => c.name === SKILL_TEMPLATE_CARD_BY_CLASS[cls])!;
}
