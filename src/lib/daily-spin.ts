// Tägliches Glücksrad: welcher "Tag" gilt. Ein Spin pro Nutzer und Tag (DailySpin.date) — API, Games-Seite
// und der Hinweis auf Home müssen denselben Tag verwenden, sonst widersprechen sie sich.

/** Tag des Glücksrads als "YYYY-MM-DD" (UTC, wie seit Einführung des Rads gespeichert). */
export function spinDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
