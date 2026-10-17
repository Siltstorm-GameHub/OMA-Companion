// ============================================
// OMA Gems — Relikte: Besitz und Ausrüstung (DB-Seite zu relics.ts)
// ============================================

import { prisma } from "@/lib/prisma";
import { RELIC_SLOTS, relicById, type RelicDef } from "./relics";

export class RelicError extends Error {}

/** Vergibt ein Relikt (idempotent). Ist noch ein Platz frei, wird es gleich ausgerüstet. */
export async function grantRelic(userId: string, relic: RelicDef): Promise<boolean> {
  const existing = await prisma.userRelic.findUnique({ where: { userId_relicId: { userId, relicId: relic.id } } });
  if (existing) return false;
  const equippedCount = await prisma.userRelic.count({ where: { userId, equipped: true } });
  await prisma.userRelic
    .create({ data: { userId, relicId: relic.id, equipped: equippedCount < RELIC_SLOTS } })
    .catch(() => null);
  return true;
}

export async function getEquippedRelicIds(userId: string): Promise<string[]> {
  const rows = await prisma.userRelic.findMany({ where: { userId, equipped: true }, select: { relicId: true } });
  return rows.map((r) => r.relicId).filter((id) => relicById(id)).slice(0, RELIC_SLOTS);
}

export async function getOwnedRelics(userId: string): Promise<{ relicId: string; equipped: boolean }[]> {
  return prisma.userRelic.findMany({
    where: { userId },
    select: { relicId: true, equipped: true },
    orderBy: { acquiredAt: "asc" },
  });
}

/** Rüstet genau diese Relikte aus (höchstens RELIC_SLOTS, nur eigene). */
export async function setEquippedRelics(userId: string, relicIds: string[]): Promise<void> {
  const unique = [...new Set(relicIds)];
  if (unique.length > RELIC_SLOTS) throw new RelicError(`Höchstens ${RELIC_SLOTS} Relikte gleichzeitig.`);
  const owned = new Set((await getOwnedRelics(userId)).map((r) => r.relicId));
  if (unique.some((id) => !owned.has(id))) throw new RelicError("Dieses Relikt besitzt du nicht.");
  await prisma.$transaction([
    prisma.userRelic.updateMany({ where: { userId }, data: { equipped: false } }),
    prisma.userRelic.updateMany({ where: { userId, relicId: { in: unique } }, data: { equipped: true } }),
  ]);
}
