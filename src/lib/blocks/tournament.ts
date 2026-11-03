// ============================================
// OMA Blocks — Live-Turnier als Event (Vorrunde in Gruppen + Finale)
// ============================================
// Ablauf:
//  1. Admin startet das Turnier (Event-Seite): Alle angemeldeten Spieler (bei aktivem Check-in nur die
//     eingecheckten) werden zufällig auf Gruppen à max. 8 verteilt. Bei ≤ 8 Spielern geht es direkt ins Finale.
//  2. Spieler holen sich ein signiertes Ticket (issueTicket) und betreten damit ihren Turnier-Raum auf dem
//     Versus-Server. Der spielt die Runden automatisch und meldet jede wie gewohnt an /api/blocks/match-result
//     — mit eventId/Phase/Gruppe. Gezählt werden je Gruppe nur die ersten `groupRounds` Runden.
//  3. Sobald alle Gruppen fertig sind, steigen die Besten jeder Gruppe ins Finale auf (advanceTournament).
//     Nach dem Finale steht die Endrangliste in Event.finalRankingJson — der Admin schließt das Event dann
//     wie jedes andere ab (Teilnahme-/Platzierungsbelohnungen aus placementRewardsJson, Pokale usw.).
// Admins können jede Phase vorzeitig beenden (z.B. wenn eine Gruppe hängt) — es zählt dann der Stand.

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { MAX_ROOM_PLAYERS } from "./protocol";
import type { TournamentStage, TournamentTicket } from "./mp-token";
import {
  advanceCount, groupLabel, pointsForPlace, type StageView, type StandingRow, type TournamentPhase, type TournamentState,
} from "./tournament-shared";

export * from "./tournament-shared";

interface MatchRow {
  stage: string | null;
  groupNo: number | null;
  players: { userId: string; place: number }[];
}

function parseIds(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function parseGroups(json: string | null): string[][] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map((g) => (Array.isArray(g) ? g.filter((x): x is string => typeof x === "string") : [])) : [];
  } catch {
    return [];
  }
}

function compareRows(a: Omit<StandingRow, "name" | "image">, b: Omit<StandingRow, "name" | "image">): number {
  return b.points - a.points || b.wins - a.wins || (a.avgPlace ?? 99) - (b.avgPlace ?? 99);
}

/** Punktestand einer Gruppe/des Finales aus den (bereits auf die Rundenzahl gekürzten) Runden. */
function standings(roster: string[], matches: MatchRow[]): Omit<StandingRow, "name" | "image">[] {
  const acc = new Map(roster.map((id) => [id, { userId: id, points: 0, wins: 0, rounds: 0, placeSum: 0 }]));
  for (const m of matches) {
    for (const p of m.players) {
      const r = acc.get(p.userId);
      if (!r) continue;
      r.points += pointsForPlace(p.place);
      r.rounds++;
      r.placeSum += p.place;
      if (p.place === 1) r.wins++;
    }
  }
  return [...acc.values()]
    .map((r) => ({ userId: r.userId, points: r.points, wins: r.wins, rounds: r.rounds, avgPlace: r.rounds ? r.placeSum / r.rounds : null }))
    .sort(compareRows);
}

async function loadTournament(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      startAt: true,
      checkInEnabled: true,
      registrations: { where: { role: "player" }, select: { userId: true, checkedInAt: true } },
      blocksTournament: true,
    },
  });
}

type LoadedEvent = NonNullable<Awaited<ReturnType<typeof loadTournament>>>;

function eligibleIds(event: LoadedEvent): string[] {
  return event.registrations.filter((r) => !event.checkInEnabled || r.checkedInAt).map((r) => r.userId);
}

/** Gewertete Runden je Phase/Gruppe (älteste zuerst, auf die Rundenzahl gekürzt). */
async function stageMatches(eventId: string, groupRounds: number, finalRounds: number) {
  const all = await prisma.blocksMatch.findMany({
    where: { eventId },
    orderBy: { endedAt: "asc" },
    select: { stage: true, groupNo: true, players: { select: { userId: true, place: true } } },
  });
  const groups = new Map<number, MatchRow[]>();
  const final: MatchRow[] = [];
  for (const m of all) {
    if (m.stage === "group" && m.groupNo !== null) {
      const list = groups.get(m.groupNo) ?? [];
      if (list.length < groupRounds) list.push(m);
      groups.set(m.groupNo, list);
    } else if (m.stage === "final" && final.length < finalRounds) {
      final.push(m);
    }
  }
  return { groups, final };
}

async function names(ids: string[]) {
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true, name: true, image: true } });
  return new Map(users.map((u) => [u.id, { name: u.username ?? u.name ?? "Spieler", image: u.image }]));
}

/** Endrangliste: Finalisten nach Finalstand, danach alle übrigen nach ihrem Vorrunden-Stand. */
function finalRanking(
  groupRows: Omit<StandingRow, "name" | "image">[][],
  finalRows: Omit<StandingRow, "name" | "image">[],
): Omit<StandingRow, "name" | "image">[] {
  const finalists = new Set(finalRows.map((r) => r.userId));
  const rest = groupRows.flat().filter((r) => !finalists.has(r.userId)).sort(compareRows);
  return [...finalRows, ...rest];
}

export async function getTournamentState(eventId: string, viewerId: string | null): Promise<TournamentState | null> {
  const event = await loadTournament(eventId);
  const t = event?.blocksTournament;
  if (!event || !t) return null;

  const phase = t.stage as TournamentPhase;
  const groupIds = parseGroups(t.groupsJson);
  const finalists = parseIds(t.finalistsJson);
  const { groups: gm, final: fm } = await stageMatches(eventId, t.groupRounds, t.finalRounds);
  const eligible = eligibleIds(event);
  const users = await names([...new Set([...groupIds.flat(), ...finalists, ...(viewerId ? [viewerId] : [])])]);
  const named = (rows: Omit<StandingRow, "name" | "image">[]): StandingRow[] =>
    rows.map((r) => ({ ...r, name: users.get(r.userId)?.name ?? "Spieler", image: users.get(r.userId)?.image ?? null }));

  const groupRaw = groupIds.map((ids, i) => standings(ids, gm.get(i) ?? []));
  const groups: StageView[] = groupRaw.map((rows, i) => ({
    label: groupLabel(i),
    rounds: t.groupRounds,
    roundsPlayed: gm.get(i)?.length ?? 0,
    rows: named(rows),
  }));
  const finalRaw = finalists.length ? standings(finalists, fm) : [];
  const final: StageView | null = finalists.length
    ? { label: "Finale", rounds: t.finalRounds, roundsPlayed: fm.length, rows: named(finalRaw) }
    : null;

  const myGroup = viewerId ? groupIds.findIndex((g) => g.includes(viewerId)) : -1;
  const finalist = !!viewerId && finalists.includes(viewerId);
  const canPlay =
    (phase === "groups" && myGroup >= 0 && (gm.get(myGroup)?.length ?? 0) < t.groupRounds) ||
    (phase === "final" && finalist && fm.length < t.finalRounds);

  return {
    eventId: event.id,
    title: event.title,
    startAt: event.startAt.toISOString(),
    phase,
    groupRounds: t.groupRounds,
    finalRounds: t.finalRounds,
    advancePerGroup: t.advancePerGroup,
    checkInEnabled: event.checkInEnabled,
    eligibleCount: eligible.length,
    groups,
    final,
    ranking: phase === "done" ? named(finalRanking(groupRaw, finalRaw)) : [],
    me: {
      eligible: !!viewerId && eligible.includes(viewerId),
      group: myGroup >= 0 ? myGroup : null,
      finalist,
      canPlay,
    },
  };
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Lost die Gruppen aus und startet das Turnier. Gibt eine Fehlermeldung zurück oder null. */
export async function startTournament(eventId: string): Promise<string | null> {
  const event = await loadTournament(eventId);
  const t = event?.blocksTournament;
  if (!event || !t) return "Kein OMA-Blocks-Turnier.";
  if (t.stage !== "pending") return "Das Turnier läuft bereits.";
  const players = shuffle(eligibleIds(event));
  if (players.length < 2) {
    return event.checkInEnabled ? "Mindestens 2 eingecheckte Spieler nötig." : "Mindestens 2 angemeldete Spieler nötig.";
  }

  const groupCount = Math.ceil(players.length / MAX_ROOM_PLAYERS);
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  players.forEach((id, i) => groups[i % groupCount].push(id));
  // Bei nur einer Gruppe direkt ins Finale — eine Vorrunde mit denselben Leuten wäre sinnlos.
  const direct = groupCount === 1;

  const claim = await prisma.blocksTournament.updateMany({
    where: { id: t.id, stage: "pending" },
    data: {
      stage: direct ? "final" : "groups",
      groupsJson: direct ? null : JSON.stringify(groups),
      finalistsJson: direct ? JSON.stringify(players) : null,
      startedAt: new Date(),
    },
  });
  if (claim.count !== 1) return "Das Turnier läuft bereits.";

  await prisma.event.update({ where: { id: eventId }, data: { status: "active" } }).catch(() => {});
  const url = `/gems/blocks/turnier/${eventId}`;
  await Promise.all(
    players.map((id) => {
      const g = groups.findIndex((list) => list.includes(id));
      return createNotification(id, {
        type: "event_start",
        title: `${event.title}: Es geht los!`,
        body: direct ? "Das Finale startet — ab in den Turnier-Raum." : `Du spielst in ${groupLabel(g)}. Ab in den Turnier-Raum!`,
        url,
      }).catch(() => {});
    }),
  );
  return null;
}

/**
 * Prüft, ob die aktuelle Phase fertig ist, und schaltet weiter (Gruppen → Finale → Ende).
 * `force` beendet die Phase sofort mit dem aktuellen Stand (Admin). Idempotent über die Phase.
 */
export async function advanceTournament(eventId: string, force = false): Promise<string | null> {
  const event = await loadTournament(eventId);
  const t = event?.blocksTournament;
  if (!event || !t) return "Kein OMA-Blocks-Turnier.";
  const { groups: gm, final: fm } = await stageMatches(eventId, t.groupRounds, t.finalRounds);

  if (t.stage === "groups") {
    const groupIds = parseGroups(t.groupsJson);
    const complete = groupIds.every((_, i) => (gm.get(i)?.length ?? 0) >= t.groupRounds);
    if (!complete && !force) return null;
    const take = advanceCount(groupIds.length, t.advancePerGroup);
    const finalists = groupIds.flatMap((ids, i) => standings(ids, gm.get(i) ?? []).slice(0, take).map((r) => r.userId));
    const claim = await prisma.blocksTournament.updateMany({
      where: { id: t.id, stage: "groups" },
      data: { stage: "final", finalistsJson: JSON.stringify(finalists) },
    });
    if (claim.count === 1) {
      await Promise.all(
        finalists.map((id) =>
          createNotification(id, {
            type: "event_start",
            title: `${event.title}: Du bist im Finale!`,
            body: "Das Finale startet, sobald alle im Turnier-Raum sind.",
            url: `/gems/blocks/turnier/${eventId}`,
          }).catch(() => {}),
        ),
      );
    }
    return null;
  }

  if (t.stage === "final") {
    if (fm.length < t.finalRounds && !force) return null;
    const groupIds = parseGroups(t.groupsJson);
    const groupRaw = groupIds.map((ids, i) => standings(ids, gm.get(i) ?? []));
    const ranking = finalRanking(groupRaw, standings(parseIds(t.finalistsJson), fm));
    const claim = await prisma.blocksTournament.updateMany({
      where: { id: t.id, stage: "final" },
      data: { stage: "done", finalizedAt: new Date() },
    });
    if (claim.count !== 1) return null;
    // Endrangliste für den normalen Event-Abschluss (Admin → Event abschließen übernimmt sie als Vorbelegung)
    await prisma.event.update({ where: { id: eventId }, data: { finalRankingJson: JSON.stringify(ranking.map((r) => r.userId)) } });
    await Promise.all(
      ranking.slice(0, 3).map((r, i) =>
        createNotification(r.userId, {
          type: "badge",
          title: `${event.title}: Platz ${i + 1}!`,
          body: `Mit ${r.points} Punkten im Finale. Die Belohnung kommt mit dem Event-Abschluss.`,
          url: `/tournament/${eventId}`,
        }).catch(() => {}),
      ),
    );
    return null;
  }

  return force ? "In dieser Phase gibt es nichts weiterzuschalten." : null;
}

/** Ticket-Daten für den Turnier-Raum des Spielers — oder eine Fehlermeldung. */
export async function ticketFor(eventId: string, userId: string): Promise<Omit<TournamentTicket, "exp" | "uid"> | string> {
  const event = await loadTournament(eventId);
  const t = event?.blocksTournament;
  if (!event || !t) return "Kein OMA-Blocks-Turnier.";
  const { groups: gm, final: fm } = await stageMatches(eventId, t.groupRounds, t.finalRounds);

  if (t.stage === "pending") return "Das Turnier wurde noch nicht gestartet.";
  if (t.stage === "done") return "Das Turnier ist beendet.";
  if (t.stage === "groups") {
    const groupIds = parseGroups(t.groupsJson);
    const g = groupIds.findIndex((ids) => ids.includes(userId));
    if (g < 0) return "Du bist in keiner Gruppe ausgelost.";
    const done = gm.get(g)?.length ?? 0;
    if (done >= t.groupRounds) return "Deine Gruppe ist fertig — warte auf das Finale.";
    return { ev: eventId, st: "group" as TournamentStage, g, n: t.groupRounds, done, roster: groupIds[g] };
  }
  const finalists = parseIds(t.finalistsJson);
  if (!finalists.includes(userId)) return "Du bist nicht im Finale.";
  if (fm.length >= t.finalRounds) return "Das Finale ist gespielt.";
  return { ev: eventId, st: "final" as TournamentStage, g: 0, n: t.finalRounds, done: fm.length, roster: finalists };
}

export interface TournamentTeaserInfo {
  eventId: string;
  title: string;
  startAt: string;
  phase: TournamentPhase;
  registered: number;
}

/** Laufende und in den nächsten 7 Tagen startende Live-Turniere (für den Blocks-Bereich im Games-Hub). */
export async function getActiveTournaments(): Promise<TournamentTeaserInfo[]> {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      hidden: false,
      status: { notIn: ["finished", "closed"] },
      blocksTournament: { stage: { not: "done" } },
      startAt: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { startAt: "asc" },
    take: 3,
    select: {
      id: true,
      title: true,
      startAt: true,
      blocksTournament: { select: { stage: true } },
      _count: { select: { registrations: { where: { role: "player" } } } },
    },
  });
  return events.map((e) => ({
    eventId: e.id,
    title: e.title,
    startAt: e.startAt.toISOString(),
    phase: (e.blocksTournament?.stage ?? "pending") as TournamentPhase,
    registered: e._count.registrations,
  }));
}
