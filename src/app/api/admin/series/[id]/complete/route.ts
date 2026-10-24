import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { awardSeriesPokal } from "@/lib/award-pokal";
import { deleteEventRecord } from "@/lib/delete-event";
import { computeStatStandings } from "@/lib/series-event-points";
import { isOpenSeasonEvent, parseLegacyStandings, parseSeriesCompletion, parseStatConfig, type SeasonSnapshot } from "@/lib/series-seasons";
import { revalidateTag } from "next/cache";

type PlacementReward = { place: number; coins: number; rankPoints: number };
type RewardsConfig = { participationCoins: number; placements: PlacementReward[] };

const DEFAULT_REWARDS: RewardsConfig = {
  participationCoins: 10,
  placements: [
    { place: 1, coins: 500, rankPoints: 3 },
    { place: 2, coins: 250, rankPoints: 2 },
    { place: 3, coins: 100, rankPoints: 1 },
  ],
};

function parseRewards(json: string | null | undefined): RewardsConfig {
  if (!json) return DEFAULT_REWARDS;
  try { return { ...DEFAULT_REWARDS, ...JSON.parse(json) }; } catch { return DEFAULT_REWARDS; }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole("moderator");
  const { id: seriesId } = await params;

  const body = await req.json() as {
    finalRanking?: string[];
    finalRankingGroups?: string[][];
    pollWinnerIds?: string[];
    pollLabel?: string;
    pollBonusCoins?: number;
    pollBonusRankPoints?: number;
    pollExcludedUserIds?: string[];
    startNewSeason?: boolean;
    /** Nur beim ersten Abschluss: was mit noch offenen Terminen passiert */
    openEvents?: "move" | "delete" | "keep";
  };

  const series = await prisma.eventSeries.findUnique({
    where: { id: seriesId },
  });
  if (!series) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const isReEdit = series.status === "archived";
  const oldCompletion: Record<string, unknown> = (() => {
    try { return series.seriesCompletionData ? JSON.parse(series.seriesCompletionData) : {}; } catch { return {}; }
  })();

  // Termine der Saison: Grundlage der eingefrorenen Endtabelle und der Behandlung offener Termine
  const seasonEvents = await prisma.event.findMany({
    where: { seriesId },
    orderBy: { startAt: "asc" },
    select: {
      id: true, status: true, completionData: true, finalRankingJson: true,
      registrations: { select: { userId: true, role: true } },
      matches: { select: { entries: { select: { userId: true, statsJson: true } } } },
    },
  });
  const openEventIds = isReEdit ? [] : seasonEvents.filter(isOpenSeasonEvent).map(e => e.id);
  const openEventsAction = openEventIds.length > 0 ? (body.openEvents ?? "keep") : "keep";
  // Endtabelle ohne die offenen Termine, die gleich verschoben oder gelöscht werden
  const leavingIds = new Set(openEventsAction === "keep" ? [] : openEventIds);
  const finalStandings: SeasonSnapshot = {
    rows: computeStatStandings(
      seasonEvents.filter(e => !leavingIds.has(e.id)),
      parseStatConfig(series.seriesStatConfig),
      parseLegacyStandings(series.legacyStandings),
    ).rows,
    capturedAt: new Date().toISOString(),
  };

  // Belohnungsberechtigt für die Endplatzierung: Mitspieler der Reihe (Zuschauer nicht) sowie User
  // aus dem importierten Altstand. Für den Saison-Poll zählen alle Angemeldeten — er kann sich auch
  // an Zuschauer richten.
  const registrations = await prisma.eventRegistration.findMany({
    where: { event: { seriesId } },
    select: { userId: true, role: true },
  });
  const legacyUserIds: string[] = (() => {
    try { return series.legacyStandings ? (JSON.parse(series.legacyStandings) as { userId: string }[]).map(r => r.userId) : []; } catch { return []; }
  })();
  const playerSet = new Set([...registrations.filter(r => r.role !== "spectator").map(r => r.userId), ...legacyUserIds]);
  const registeredSet = new Set([...registrations.map(r => r.userId), ...legacyUserIds]);

  const rewards = parseRewards(series.placementRewardsJson);
  const pollCoins   = Math.max(0, body.pollBonusCoins ?? 0);
  const pollRankPts = Math.max(0, body.pollBonusRankPoints ?? 0);
  const newPollWinners = [...new Set((body.pollWinnerIds ?? []).filter(id => registeredSet.has(id)))];
  const groupId = series.groupId ?? randomUUID();

  // Buchungen sammeln: erst Rückbuchung der alten Vergabe (Re-Edit), dann die neue Vergabe
  const bookings: { userId: string; field: "points" | "rankPoints"; amount: number; reason: string }[] = [];
  const book = (userId: string, field: "points" | "rankPoints", amount: number, reason: string) => {
    if (amount !== 0) bookings.push({ userId, field, amount, reason });
  };

  if (isReEdit) {
    const oldWinners: string[] = (oldCompletion.pollWinnerIds as string[] | undefined) ?? [];
    const oldCoins   = (oldCompletion.pollBonusCoins as number | undefined) ?? 0;
    const oldRankPts = (oldCompletion.pollBonusRankPoints as number | undefined) ?? 0;
    for (const userId of oldWinners) {
      if (oldCoins > 0) book(userId, "points", -oldCoins, `[Korrektur] Saison-Poll: ${series.name}`);
      if (oldRankPts > 0) book(userId, "rankPoints", -oldRankPts, `[Korrektur] Saison-Poll Rang-Punkte: ${series.name}`);
    }
    const oldPlacementRewards = (oldCompletion.placementRewards as Array<{ userId: string; coins: number; rankPoints: number }> | undefined) ?? [];
    for (const { userId, coins, rankPoints } of oldPlacementRewards) {
      if (coins > 0) book(userId, "points", -coins, `[Korrektur] Endplatzierung: ${series.name}`);
      if (rankPoints > 0) book(userId, "rankPoints", -rankPoints, `[Korrektur] Endplatzierung Rang-Punkte: ${series.name}`);
    }
  }

  // ── Endplatzierung: Belohnungen ("Belohnungen (Endplatzierung der Eventreihe)") ──────
  // Die konfigurierten Platz-Belohnungen gelten für die finale Gesamtplatzierung der kompletten
  // Eventreihe, vergeben bei deren Abschluss.
  const rankingGroups: string[][] = body.finalRankingGroups?.length
    ? body.finalRankingGroups.map(g => g.filter(id => playerSet.has(id))).filter(g => g.length > 0)
    : (body.finalRanking ?? []).filter(id => playerSet.has(id)).map(id => [id]);
  const newPlacementRewards: Array<{ userId: string; place: number; coins: number; rankPoints: number }> = [];
  let place = 1;
  for (const group of rankingGroups) {
    const reward = rewards.placements.find(p => p.place === place);
    if (reward) {
      for (const userId of group) {
        if (reward.coins > 0) book(userId, "points", reward.coins, `[Münzen] Endplatzierung ${place}: ${series.name}`);
        if (reward.rankPoints > 0) book(userId, "rankPoints", reward.rankPoints, `[Rang-Punkte] Endplatzierung ${place}: ${series.name}`);
        newPlacementRewards.push({ userId, place, coins: reward.coins, rankPoints: reward.rankPoints });
      }
    }
    place += group.length;
  }

  for (const userId of newPollWinners) {
    if (pollCoins > 0) book(userId, "points", pollCoins, `[Münzen] Saison-Poll-Sieger: ${series.name}`);
    if (pollRankPts > 0) book(userId, "rankPoints", pollRankPts, `[Rang-Punkte] Saison-Poll-Sieger: ${series.name}`);
  }

  // ── seriesCompletionData zusammenbauen ───────────────────────────────────────
  const overallWinnerIds: string[] = rankingGroups[0] ?? [];

  const seriesCompletionData = {
    overallWinnerIds:    overallWinnerIds.length > 0 ? overallWinnerIds : null,
    finalRanking:        body.finalRanking ?? null,
    finalRankingGroups:  body.finalRankingGroups ?? null,
    pollWinnerIds:       newPollWinners.length > 0 ? newPollWinners : null,
    pollLabel:           body.pollLabel ?? null,
    pollBonusCoins:      pollCoins > 0 ? pollCoins : null,
    pollBonusRankPoints: pollRankPts > 0 ? pollRankPts : null,
    pollExcludedUserIds: body.pollExcludedUserIds?.length ? body.pollExcludedUserIds : null,
    pollPhaseComplete:   newPollWinners.length > 0,
    placementRewards:    newPlacementRewards.length > 0 ? newPlacementRewards : null,
    lockedAt:            new Date().toISOString(),
    finalStandings,
    pendingMoveEventIds: openEventsAction === "move"
      ? openEventIds
      : ((oldCompletion.pendingMoveEventIds as string[] | undefined) ?? null),
  };

  // ── Archivieren + Buchen in EINER Transaktion ────────────────────────────────
  // Das Status-Update ist zugleich die Sperre: es greift nur, wenn sich Status und Abschlussdaten seit
  // dem Lesen nicht geändert haben. Ein zweiter, gleichzeitiger Abschluss (Doppelklick, zwei Tabs)
  // wartet auf die Zeilensperre, findet danach keinen passenden Datensatz mehr und bricht ohne Buchung
  // ab. Scheitert etwas mittendrin, wird alles zurückgerollt — ein erneuter Versuch bucht nicht doppelt.
  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.eventSeries.updateMany({
        where: { id: seriesId, status: series.status, seriesCompletionData: series.seriesCompletionData },
        data: {
          status:               "archived",
          archivedAt:           isReEdit ? series.archivedAt ?? new Date() : new Date(),
          groupId,
          seasonNumber:         series.seasonNumber ?? 1,
          seriesCompletionData: JSON.stringify(seriesCompletionData),
        },
      });
      if (locked.count === 0) throw new CompletionConflict();
      for (const b of bookings) {
        await tx.user.update({ where: { id: b.userId }, data: { [b.field]: { increment: b.amount } } });
        await tx.pointTransaction.create({ data: { userId: b.userId, amount: b.amount, reason: b.reason } });
      }
    }, { timeout: 30_000 });
  } catch (err) {
    if (err instanceof CompletionConflict) {
      return NextResponse.json(
        { error: "Die Reihe wurde gerade parallel abgeschlossen oder geändert — bitte Seite neu laden." },
        { status: 409 },
      );
    }
    throw err;
  }

  // Offene Termine löschen (auf Wunsch). Nach dem Commit — ein Fehler hier macht den Abschluss nicht
  // ungültig, die Termine bleiben dann einfach in der archivierten Saison stehen.
  if (openEventsAction === "delete") {
    for (const eventId of openEventIds) {
      try {
        await deleteEventRecord(eventId, { revertCoins: true, revertRankPoints: true, reasonLabel: "Saisonabschluss: Termin gestrichen" });
      } catch (err) {
        console.error("[Saisonabschluss] Termin konnte nicht gelöscht werden:", eventId, err);
      }
    }
  }

  // Die neue Saison wird nicht hier angelegt, sondern über den Saison-Setup-Assistenten unter
  // /admin/series/[id]/new-season, wo der Admin alle Einstellungen vor dem Erstellen anpassen kann.

  revalidateTag("dashboard-global", { expire: 0 });

  // Pokal: digitalen (großen) Eventreihen-Pokal an die Gesamtsieger vergeben. Bewusst abgewartet —
  // ein nicht abgewartetes Promise kann auf Vercel nach der Antwort abgebrochen werden.
  // awardSeriesPokal ist idempotent; ein Fehler blockiert den bereits gebuchten Abschluss nicht.
  try {
    await awardSeriesPokal(seriesId);
  } catch (err) {
    console.error("[Pokal] Vergabe fehlgeschlagen:", err);
  }

  return NextResponse.json({
    ok: true,
    startNewSeason: !isReEdit && !!body.startNewSeason,
    groupId,
    seasonNumber: (series.seasonNumber ?? 1) + 1,
  });
}

class CompletionConflict extends Error {}

/**
 * DELETE /api/admin/series/[id]/complete — Abschluss rückgängig machen (nur Admins): die Saison wird
 * wieder aktiv, Endplatzierungs- und Abstimmungs-Belohnungen werden zurückgebucht, der Eventreihen-Pokal
 * entfällt. Nur möglich, solange in der Saison-Gruppe keine spätere Saison existiert — sonst gäbe es zwei
 * aktive Saisons bzw. eine Lücke in der Reihenfolge. Beim Abschluss gelöschte Termine kommen nicht zurück.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole("admin");
  const { id: seriesId } = await params;

  const series = await prisma.eventSeries.findUnique({ where: { id: seriesId } });
  if (!series) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  if (series.status !== "archived") return NextResponse.json({ error: "Diese Saison ist nicht abgeschlossen" }, { status: 400 });

  if (series.groupId) {
    const later = await prisma.eventSeries.count({
      where: {
        groupId: series.groupId,
        id: { not: seriesId },
        OR: [{ status: "active" }, { seasonNumber: { gt: series.seasonNumber ?? 1 } }],
      },
    });
    if (later > 0) {
      return NextResponse.json(
        { error: "Es gibt bereits eine spätere Saison — der Abschluss kann nicht mehr rückgängig gemacht werden." },
        { status: 409 },
      );
    }
  }

  const completion = parseSeriesCompletion(series.seriesCompletionData);
  const bookings: { userId: string; field: "points" | "rankPoints"; amount: number; reason: string }[] = [];
  for (const { userId, coins, rankPoints } of completion.placementRewards ?? []) {
    if (coins > 0) bookings.push({ userId, field: "points", amount: -coins, reason: `[Korrektur] Abschluss aufgehoben – Endplatzierung: ${series.name}` });
    if (rankPoints > 0) bookings.push({ userId, field: "rankPoints", amount: -rankPoints, reason: `[Korrektur] Abschluss aufgehoben – Endplatzierung Rang-Punkte: ${series.name}` });
  }
  for (const userId of completion.pollWinnerIds ?? []) {
    if ((completion.pollBonusCoins ?? 0) > 0) bookings.push({ userId, field: "points", amount: -(completion.pollBonusCoins ?? 0), reason: `[Korrektur] Abschluss aufgehoben – Saison-Poll: ${series.name}` });
    if ((completion.pollBonusRankPoints ?? 0) > 0) bookings.push({ userId, field: "rankPoints", amount: -(completion.pollBonusRankPoints ?? 0), reason: `[Korrektur] Abschluss aufgehoben – Saison-Poll Rang-Punkte: ${series.name}` });
  }

  // Gleiche Sperre wie beim Abschluss: nur wenn sich die Abschlussdaten seit dem Lesen nicht geändert haben
  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.eventSeries.updateMany({
        where: { id: seriesId, status: "archived", seriesCompletionData: series.seriesCompletionData },
        data: { status: "active", archivedAt: null, seriesCompletionData: null },
      });
      if (locked.count === 0) throw new CompletionConflict();
      for (const b of bookings) {
        await tx.user.update({ where: { id: b.userId }, data: { [b.field]: { increment: b.amount } } });
        await tx.pointTransaction.create({ data: { userId: b.userId, amount: b.amount, reason: b.reason } });
      }
    }, { timeout: 30_000 });
  } catch (err) {
    if (err instanceof CompletionConflict) {
      return NextResponse.json({ error: "Die Reihe wurde gerade parallel geändert — bitte Seite neu laden." }, { status: 409 });
    }
    throw err;
  }

  // Ohne Abschlussdaten entfernt die (idempotente) Vergabe die Eventreihen-Pokale dieser Saison
  try {
    await awardSeriesPokal(seriesId);
  } catch (err) {
    console.error("[Pokal] Entfernen fehlgeschlagen:", err);
  }
  revalidateTag("dashboard-global", { expire: 0 });

  return NextResponse.json({ ok: true, reverted: bookings.length });
}
