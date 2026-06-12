/** Berechnet wie viele aufeinanderfolgende Monate (bis heute rückwärts) abgedeckt sind. */
export function calcStreak(entries: { year: number; month: number }[]): number {
  if (entries.length === 0) return 0;
  const sorted = [...entries].sort((a, b) =>
    a.year !== b.year ? b.year - a.year : b.month - a.month
  );
  const now = new Date();
  let checkYear  = now.getFullYear();
  let checkMonth = now.getMonth() + 1;
  let streak = 0;
  for (const entry of sorted) {
    if (entry.year === checkYear && entry.month === checkMonth) {
      streak++;
      checkMonth--;
      if (checkMonth === 0) { checkMonth = 12; checkYear--; }
    } else break;
  }
  return streak;
}
