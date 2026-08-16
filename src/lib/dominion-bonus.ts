import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type DominionCfg = {
  enabled: boolean;
  triggerStats?: string[];
  triggerStat?: string;
  threshold: number;
  coins: number;
  seriesPoints: number;
};

type SeriesStatConfigForDominion = {
  dominionBonus?: DominionCfg;
  winnerStatKeys?: string[];
  winnerSeriesStatKey?: string;
  transferToGlobalRanking?: boolean;
};

type DominionChange = { streakBefore: number; streakAfter: number; bonusAwarded: boolean; coins: number; seriesPoints: number };

type StandingsRaw = Record<string, Record<string, number>>;
type SeriesStandings = { lastUpdated: string; processedEventIds: string[]; raw: StandingsRaw };

/**
 * Berechnet den Dominion-Bonus ALLER Events einer Reihe neu, streng chronologisch nach dem
 * geplanten Event-Termin (event.startAt) — NICHT nach der Reihenfolge, in der die Events zuletzt
 * gespeichert/abgeschlossen wurden. Der Streak ist inhärent reihenfolgeabhängig: wird ein früher
 * stattgefundenes Event nachträglich korrigiert (z.B. nach Zurücksetzen auf "aktiv" und erneutem
 * Abschließen), muss sich das exakt so auswirken, als hätte es von Anfang an in der richtigen
 * zeitlichen Reihenfolge gestanden — inklusive einer möglichen Verschiebung, welches Event genau
 * den Bonus auslöst.
 *
 * Ersetzt die alte pro-Event-inkrementelle Logik vollständig: statt bei jedem Abschluss nur den
 * aktuell gespeicherten Streak-Wert um ein Delta zu verschieben (was bei nachträglich korrigierten
 * früheren Events zu falscher Reihenfolge führte), wird hier jedes Mal die komplette Event-Historie
 * der Reihe neu durchgerechnet. Bucht Korrektur-Münzen/-Rang-Punkte für jedes Event, dessen
 * tatsächlich ausgezahlter Bonus sich durch die Neuberechnung ändert, aktualisiert dessen
 * completionData.dominionChanges und schreibt den aktuellen (letzten) Streak-Stand in
 * seriesStandingsJson für die Live-Anzeige (Admin-Formular + öffentliche Reihen-Tabelle).
 *
 * Aufrufen nach JEDEM Abschluss eines Events dieser Reihe (siehe complete/route.ts) sowie nach
 * revertEventCompletion (dort ist die Reihenfolge relevant, weil ein zurückgesetztes Event aus der
 * Kette herausfällt) — jeweils NACHDEM die eigentliche completionData-Änderung bereits committet ist,
 * da hier die komplette Historie frisch aus der DB gelesen wird.
 */
export async function recomputeSeriesDominionBonus(seriesId: string): Promise<void> {
  const series = await prisma.eventSeries.findUnique({
    where: { id: seriesId },
    select: { id: true, name: true, seriesStatConfig: true, seriesStandingsJson: true },
  });
  if (!series?.seriesStatConfig) return;

  let statCfg: SeriesStatConfigForDominion;
  try { statCfg = JSON.parse(series.seriesStatConfig); } catch { return; }
  const dominionCfg = statCfg.dominionBonus;
  const triggerStats = dominionCfg?.triggerStats ?? (dominionCfg?.triggerStat ? [dominionCfg.triggerStat] : []);
  if (!dominionCfg?.enabled || triggerStats.length === 0) return;
  const streakKey = `_streak_[${triggerStats.join(",")}]`;
  const winnerTargetKeys = statCfg.winnerStatKeys?.length
    ? statCfg.winnerStatKeys
    : (statCfg.winnerSeriesStatKey ? [statCfg.winnerSeriesStatKey] : []);

  // Chronologisch nach dem geplanten Event-Termin, nicht nach zuletzt bearbeitet.
  const events = await prisma.event.findMany({
    where: { seriesId, completionData: { not: null } },
    orderBy: { startAt: "asc" },
    select: {
      id: true, completionData: true,
      registrations: { select: { userId: true, role: true } },
      matches: { select: { entries: { select: { userId: true, statsJson: true } } } },
    },
  });

  const streak: Record<string, number> = {};
  // Kumulierte Dominion-Bonus-Liga-Punkte über die gesamte (neu berechnete) Historie — wird als
  // "Dominion Bonus Punkte" in raw geschrieben, dieselbe Stelle, die computeKeptSeriesRankPoints
  // (siehe reset-selective.ts) beim selektiven Reset ausliest.
  const bonusPointsTotal: Record<string, number> = {};
  const txns: Prisma.PrismaPromise<unknown>[] = [];

  function reverse(userId: string, coins: number, seriesPoints: number, reason: string) {
    if (coins > 0) {
      txns.push(
        prisma.user.update({ where: { id: userId }, data: { points: { increment: -coins } } }),
        prisma.pointTransaction.create({ data: { userId, amount: -coins, reason } }),
      );
    }
    if (seriesPoints > 0 && statCfg.transferToGlobalRanking) {
      txns.push(
        prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: -seriesPoints } } }),
        prisma.pointTransaction.create({ data: { userId, amount: -seriesPoints, reason } }),
      );
    }
  }
  function award(userId: string, coins: number, seriesPoints: number, reason: string) {
    if (coins > 0) {
      txns.push(
        prisma.user.update({ where: { id: userId }, data: { points: { increment: coins } } }),
        prisma.pointTransaction.create({ data: { userId, amount: coins, reason } }),
      );
    }
    if (seriesPoints > 0 && statCfg.transferToGlobalRanking) {
      txns.push(
        prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: seriesPoints } } }),
        prisma.pointTransaction.create({ data: { userId, amount: seriesPoints, reason } }),
      );
    }
  }

  for (const ev of events) {
    let cd: Record<string, unknown>;
    try { cd = JSON.parse(ev.completionData as string); } catch { continue; }
    if (!cd.gamePhaseComplete) continue;

    const excludedSet = new Set<string>((cd.excludedUserIds as string[] | undefined) ?? []);
    const userStats: Record<string, Record<string, number>> = {};
    for (const match of ev.matches) {
      for (const entry of match.entries) {
        if (!entry.userId || !entry.statsJson) continue;
        let parsed: Record<string, number> = {};
        try { parsed = JSON.parse(entry.statsJson); } catch { continue; }
        if (!userStats[entry.userId]) userStats[entry.userId] = {};
        for (const [field, val] of Object.entries(parsed)) {
          userStats[entry.userId][field] = (userStats[entry.userId][field] ?? 0) + Number(val);
        }
      }
    }
    const eventWinnerIds: string[] = (cd.eventWinnerIds as string[] | undefined)
      ?? ((cd.eventWinnerId as string | undefined) ? [cd.eventWinnerId as string] : []);
    const eventPollRewards: Array<{ label: string; winnerIds: string[] }> =
      (cd.eventPollRewards as Array<{ label: string; winnerIds: string[] }> | undefined) ?? [];
    const legacyPollResults: Array<{ label: string; winnerIds?: string[] }> =
      (cd.pollResults as Array<{ label: string; winnerIds?: string[] }> | undefined) ?? [];
    const spectatorAttendedIds: string[] = (cd.spectatorAttendedIds as string[] | undefined) ?? [];

    const oldChanges = (cd.dominionChanges as Record<string, DominionChange> | null | undefined) ?? {};
    const newChanges: Record<string, DominionChange> = {};

    const allUserIds = new Set([
      ...ev.registrations.map(r => r.userId),
      ...Object.keys(streak),
      ...Object.keys(oldChanges),
    ]);

    for (const userId of allUserIds) {
      if (excludedSet.has(userId)) continue; // ausgeschlossene User: Streak bleibt unangetastet, kein Bonus
      const before = streak[userId] ?? 0;

      const gotTrigger = triggerStats.some(t => {
        if (t === "Teilnahmen") return ev.registrations.some(r => r.userId === userId && r.role === "player");
        if (t === "Zuschauer-Teilnahmen") return spectatorAttendedIds.includes(userId);
        const pollMatch = eventPollRewards.find(ep => ep.label === t);
        if (pollMatch) return pollMatch.winnerIds.includes(userId);
        if ((userStats[userId]?.[t] ?? 0) > 0) return true;
        if (winnerTargetKeys.includes(t) && eventWinnerIds.includes(userId)) return true;
        const pollResult = legacyPollResults.find(p => p.label === t);
        if (pollResult) return (pollResult.winnerIds ?? []).includes(userId);
        return false;
      });

      let after: number;
      let bonusAwarded = false;
      if (gotTrigger) {
        after = before + 1;
        if (after >= dominionCfg.threshold) { bonusAwarded = true; after = 0; }
      } else {
        after = 0;
      }
      streak[userId] = after;
      if (bonusAwarded && dominionCfg.seriesPoints > 0) {
        bonusPointsTotal[userId] = (bonusPointsTotal[userId] ?? 0) + dominionCfg.seriesPoints;
      }

      if (before !== after || bonusAwarded || oldChanges[userId]) {
        newChanges[userId] = { streakBefore: before, streakAfter: after, bonusAwarded, coins: dominionCfg.coins, seriesPoints: dominionCfg.seriesPoints };
      }
    }

    // Korrektur-Buchungen: nur wenn sich der tatsächlich ausgezahlte Bonus (bonusAwarded) ändert —
    // reine Streak-Verschiebungen ohne Bonuswechsel lösen keine Münzen-/Punkte-Korrektur aus, werden
    // aber trotzdem im Event gespeichert, damit dessen eigene Badge-Anzeige korrekt bleibt.
    let changed = false;
    for (const uid of new Set([...Object.keys(oldChanges), ...Object.keys(newChanges)])) {
      const o = oldChanges[uid];
      const n = newChanges[uid];
      if (o?.bonusAwarded && !n?.bonusAwarded) {
        reverse(uid, o.coins, o.seriesPoints, `[Korrektur] Dominion Bonus (Neuberechnung): ${series.name}`);
        changed = true;
      } else if (!o?.bonusAwarded && n?.bonusAwarded) {
        award(uid, n.coins, n.seriesPoints, `[Münzen] Dominion Bonus: ${series.name}`);
        changed = true;
      }
      if ((o?.streakBefore ?? 0) !== (n?.streakBefore ?? 0) || (o?.streakAfter ?? 0) !== (n?.streakAfter ?? 0)) changed = true;
    }

    if (changed) {
      cd.dominionChanges = Object.keys(newChanges).length > 0 ? newChanges : null;
      txns.push(prisma.event.update({ where: { id: ev.id }, data: { completionData: JSON.stringify(cd) } }));
    }
  }

  // Aktuellen (letzten) Streak-Stand + kumulierte Dominion-Bonus-Liga-Punkte für die Live-Anzeige
  // schreiben (Admin-Abschluss-Formular + öffentliche Reihen-Tabelle lesen beide _streak_[...] aus
  // seriesStandingsJson.raw; "Dominion Bonus Punkte" liest reset-selective.ts für den Reset).
  const existingJson: SeriesStandings = (() => {
    try {
      return series.seriesStandingsJson
        ? JSON.parse(series.seriesStandingsJson)
        : { lastUpdated: "", processedEventIds: [], raw: {} };
    } catch { return { lastUpdated: "", processedEventIds: [], raw: {} }; }
  })();
  const allTouchedUids = new Set([...Object.keys(existingJson.raw), ...Object.keys(streak), ...Object.keys(bonusPointsTotal)]);
  for (const uid of allTouchedUids) {
    const row = existingJson.raw[uid];
    if (row) { delete row[streakKey]; delete row["Dominion Bonus Punkte"]; }
    const streakVal = streak[uid] ?? 0;
    const pointsVal = bonusPointsTotal[uid] ?? 0;
    if (streakVal <= 0 && pointsVal <= 0) continue;
    if (!existingJson.raw[uid]) existingJson.raw[uid] = {};
    if (streakVal > 0) existingJson.raw[uid][streakKey] = streakVal;
    if (pointsVal > 0) existingJson.raw[uid]["Dominion Bonus Punkte"] = pointsVal;
  }
  existingJson.lastUpdated = new Date().toISOString();
  txns.push(prisma.eventSeries.update({ where: { id: seriesId }, data: { seriesStandingsJson: JSON.stringify(existingJson) } }));

  if (txns.length > 0) await prisma.$transaction(txns);
}
