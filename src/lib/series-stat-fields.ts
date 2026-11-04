// Statistiken einer Eventreihe: Es gibt nur noch EINE Liste (StatConfig.stats). Welche Stat-Spalten
// je Event erfasst werden (StatConfig.eventStatFields), wird daraus abgeleitet — vorher war das eine
// zweite, von Hand gleichnamig zu pflegende Liste ("Trackte Statistiken je Event").
//
// Nicht erfasst werden Stats, die automatisch entstehen: 🏆 Sieger-Stats (+1 bei Event-Sieg) und
// ⚔️ Match-Win-Stats (+1 pro Match Win aus den Runden).

export type SeriesStatRowLike = { field: string; isWinnerStat?: boolean; isMatchWinStat?: boolean };

export function deriveEventStatFields(rows: SeriesStatRowLike[]): string[] {
  const fields = rows
    .filter(r => !r.isWinnerStat && !r.isMatchWinStat)
    .map(r => r.field.trim())
    .filter(Boolean);
  return [...new Set(fields)];
}
