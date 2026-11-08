// Body für einen erneuten Aufruf von POST /api/admin/events/[id]/complete mit den zuletzt
// gespeicherten Werten (completionData) — inhaltlich ändert sich dadurch nichts an Sieger,
// Platzierung, MVP, Ausschlüssen oder Umfrage-Siegern. Der Abschluss rechnet dabei aber mit der
// AKTUELLEN Reihen-Konfiguration neu und bucht Unterschiede per Diff nach bzw. zurück.
// Genutzt vom Umfrage-Cron (close-event-polls) und von "Abgeschlossene Events neu berechnen".

export function buildRecompleteBody(completionData: string | null | undefined, finalRankingNote: string | null | undefined) {
  const old = (() => {
    try { return JSON.parse(completionData ?? "{}") as Record<string, unknown>; }
    catch { return {} as Record<string, unknown>; }
  })();
  return {
    mvpUserId:               old.mvpUserId ?? undefined,
    winnerStatField:         old.winnerStatField ?? undefined,
    avgWinnerDirection:      old.avgWinnerDirection ?? undefined,
    seriesWinnerTargetField: old.seriesWinnerTargetField ?? undefined,
    pollWinnerIds:           old.pollWinnerIds ?? undefined,
    pollLabel:               old.pollLabel ?? undefined,
    pollBonusCoins:          old.pollBonusCoins ?? undefined,
    pollBonusRankPoints:     old.pollBonusRankPoints ?? undefined,
    pollExcludedUserIds:     old.pollExcludedUserIds ?? undefined,
    spectatorAttendedIds:    old.spectatorAttendedIds ?? undefined,
    finalRanking:            old.finalRanking ?? undefined,
    finalRankingGroups:      old.finalRankingGroups ?? undefined,
    finalRankingNote:        finalRankingNote ?? undefined,
    excludedUserIds:         old.excludedUserIds ?? undefined,
  };
}
