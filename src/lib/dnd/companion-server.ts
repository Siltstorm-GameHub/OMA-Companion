// ============================================
// OMA Quest — Begleiter (Server): Sammlung anzeigen, einen ausrüsten
// ============================================

import type { Card } from "@prisma/client";
import { prisma } from "../prisma";
import { getMonster } from "./combat";
import { bonusOf, ownedCompanions } from "./companions";

export interface CompanionEntry { id: string; name: string; emoji: string; level: number; bonus: string }
export interface CompanionView { owned: CompanionEntry[]; equipped: string | null }

export function companionView(card: Pick<Card, "dndCompanions" | "dndCompanion">): CompanionView {
  const owned = ownedCompanions(card.dndCompanions);
  const list = owned.flatMap((id) => { const m = getMonster(id); const b = bonusOf(id); return m && b ? [{ id, name: m.name, emoji: m.emoji, level: m.level, bonus: b.label }] : []; });
  return { owned: list, equipped: card.dndCompanion && owned.includes(card.dndCompanion) ? card.dndCompanion : null };
}

/** Begleiter ausrüsten (null = keinen). Nur einer zur Zeit, nur gezähmte. */
export async function equipCompanion(card: Card, id: string | null): Promise<{ ok: true } | { error: string }> {
  if (id !== null && !ownedCompanions(card.dndCompanions).includes(id)) return { error: "Diesen Begleiter hast du nicht." };
  await prisma.card.update({ where: { id: card.id }, data: { dndCompanion: id } });
  return { ok: true };
}
