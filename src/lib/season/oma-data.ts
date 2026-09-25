// ============================================
// Echte OMA-Aktivitätsdaten → MemberSeasonInput
// ============================================
// Aggregiert die tatsächlichen Community-Daten (besuchte Events, abgeschlossene Quests) für alle
// Discord-verknüpften Mitglieder — Grundlage der Aktivitäts-Stufe. Aktuell kumulativ über die gesamte Historie (keine
// Saison-Fenster/Reset-Punkte) — siehe runFullSeasonUpdate()-Kommentar für
// die Einschränkung, die das für spätere Saisons bedeutet.

import { prisma } from "@/lib/prisma";
import type { MemberSeasonInput } from "./season-engine";

export async function buildSeasonInputs(): Promise<MemberSeasonInput[]> {
  const members = await prisma.user.findMany({
    where: { discordId: { not: null } },
    select: { id: true, discordId: true },
  });
  if (members.length === 0) return [];
  const userIds = members.map((m) => m.id);
  const discordIds = members.map((m) => m.discordId!);

  const [eventCounts, questCounts, existingCards] = await Promise.all([
    prisma.eventRegistration.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, attended: true },
      _count: { _all: true },
    }),
    prisma.userQuestProgress.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, completed: true },
      _count: { _all: true },
    }),
    prisma.card.findMany({
      where: { linkedDiscordId: { in: discordIds } },
      select: { linkedDiscordId: true, activityTier: true },
    }),
  ]);

  const eventCountMap = new Map(eventCounts.map((r) => [r.userId, r._count._all]));
  const questCountMap = new Map(questCounts.map((r) => [r.userId, r._count._all]));
  const cardByDiscordId = new Map(existingCards.map((c) => [c.linkedDiscordId!, c]));

  return members.map((m) => ({
    userId: m.id,
    discordId: m.discordId!,
    currentTier: cardByDiscordId.get(m.discordId!)?.activityTier ?? null,
    eventCount: eventCountMap.get(m.id) ?? 0,
    questCount: questCountMap.get(m.id) ?? 0,
  }));
}
