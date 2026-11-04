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

/** Stat-Felder, die ein Termin einer Reihe erfasst — aus der gespeicherten seriesStatConfig
 *  (abgeleitet aus stats, plus Altbestand eventStatFields). */
export function seriesEventStatFieldsFromConfig(seriesStatConfig: string | null | undefined): string[] {
  if (!seriesStatConfig) return [];
  try {
    const cfg = JSON.parse(seriesStatConfig) as { stats?: SeriesStatRowLike[]; eventStatFields?: string[] };
    const fields = deriveEventStatFields(cfg.stats ?? []);
    for (const f of cfg.eventStatFields ?? []) if (typeof f === "string" && f.trim() && !fields.includes(f.trim())) fields.push(f.trim());
    return fields;
  } catch { return []; }
}
