// ============================================
// Vollständiger Saison-Lauf — Backfill + echte Klassifizierung
// ============================================
// 1. Stellt sicher, dass jedes Discord-verknüpfte Mitglied eine Karte hat
//    (Cold-Start-Platzhalter für alle, die noch keine haben).
// 2. Baut echte Aktivitätsdaten aus der OMA-DB (lib/season/oma-data.ts).
// 3. Wendet computeSeasonResults() darauf an (lib/season/apply-season-results.ts) —
//    respektiert overriddenFields, Trägheitsregel, max. ±1 Tier-Sprung.
//
// EINSCHRÄNKUNG: Die Aktivitätszahlen sind aktuell kumulativ über die
// gesamte Historie, es gibt noch keine Saison-Fenster/Reset-Punkte. Für die
// PreSeason (einmaliger Erstlauf) ist das sinnvoll — für spätere,
// wiederkehrende Saisons müsste das auf einen Zeitraum seit der letzten
// Saison eingeschränkt werden (noch nicht gebaut).

import { prisma } from "@/lib/prisma";
import { ensureCommunityCard } from "./card-provisioning";
import { buildSeasonInputs } from "./oma-data";
import { runSeasonUpdate } from "./apply-season-results";

export interface RunSeasonResult {
  totalMembers: number;
  cardsBackfilled: number;
  updatedCount: number;
}

export async function runFullSeasonUpdate(): Promise<RunSeasonResult> {
  const members = await prisma.user.findMany({
    where: { discordId: { not: null } },
    select: { id: true, discordId: true, username: true, name: true },
  });

  let cardsBackfilled = 0;
  for (const member of members) {
    if (!member.discordId) continue;
    const result = await ensureCommunityCard({
      userId: member.id,
      discordId: member.discordId,
      displayName: member.username ?? member.name ?? "OMA-Mitglied",
    }).catch(() => null);
    if (result?.created) cardsBackfilled++;
  }

  const inputs = await buildSeasonInputs();
  const { updatedCount } = await runSeasonUpdate(inputs);

  return { totalMembers: members.length, cardsBackfilled, updatedCount };
}
