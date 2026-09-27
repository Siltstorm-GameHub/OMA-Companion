// ============================================
// OMA Quest — Reisetempo-Bonus (rein): Begleiter, Ausrüstung und ein Talent verkürzen die Reisezeit
// ============================================
// Drei unabhängige Quellen zählen zusammen, sind aber gemeinsam gedeckelt (sonst wird Reisen mit genug Ausrüstung witzlos):
// ein ausgerüsteter Gegenstand mit Reise-Bonus (z. B. Wanderstiefel), ein "reittierartiger" Begleiter (Wölfe, Rentier — stärker mit
// dessen Stufe) und das Talent "Wegkundig" im Fähigkeitsbaum. Angewandt wird die Summe nur beim Start der Reise (siehe
// api/dnd/character/travel): die gespeicherte Ankunftszeit ist danach die Wahrheit, nichts wird nachträglich neu berechnet.

import type { ItemDef } from "./items";
import { getMonster } from "./combat";

/** Höchstens so viel schneller (Summe aller Quellen), egal wie viel zusammenkommt. */
export const MAX_TRAVEL_BONUS = 0.45;

/** "Reittierartige" Begleiter: Wölfe und Rentiere sind schnell und ausdauernd; die Stärke wächst mit ihrer Monsterstufe. */
const MOUNT_BONUS: Record<string, number> = {
  wolf: 0.1, waldwolf: 0.1, frostwolf: 0.14, schattenwolf: 0.16,
  rentier: 0.14,
};

/** Reise-Bonus eines ausgerüsteten Begleiters (0, wenn er kein Reittier ist). */
export function companionTravelBonus(monsterId: string | null | undefined): number {
  return (monsterId && MOUNT_BONUS[monsterId]) || 0;
}

/** Reise-Bonus eines Gegenstands (z. B. Wanderstiefel), unabhängig davon, ob er gerade ausgerüstet ist. */
export const itemTravelBonus = (item: Pick<ItemDef, "travelSpeed">): number => item.travelSpeed ?? 0;

/** Summe aus ausgerüsteten Gegenständen, Begleiter und Talent — gedeckelt auf `MAX_TRAVEL_BONUS`. */
export function totalTravelBonus(o: { equippedItems: Pick<ItemDef, "travelSpeed">[]; companionId: string | null; perkBonus: number }): number {
  const items = o.equippedItems.reduce((s, i) => s + itemTravelBonus(i), 0);
  return Math.min(MAX_TRAVEL_BONUS, items + companionTravelBonus(o.companionId) + o.perkBonus);
}

/** Kurzer Hinweis für die Oberfläche ("−18 % Reisezeit"), oder null ohne Bonus. */
export const travelBonusLabel = (bonus: number): string | null => (bonus > 0 ? `−${Math.round(bonus * 100)} % Reisezeit` : null);

export const isMount = (id: string): boolean => !!getMonster(id) && !!MOUNT_BONUS[id];
