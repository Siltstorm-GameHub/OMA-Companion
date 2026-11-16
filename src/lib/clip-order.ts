// Faire Reihenfolge der Clips in einer Abstimmung: pro Person (und Wettbewerb) fest gemischt.
// Wer oben steht, bekommt sonst erfahrungsgemäß mehr Stimmen. Fest statt zufällig, damit sich die
// Liste beim Neuladen nicht ständig umsortiert. Reine Funktion — getestet in clip-order.test.ts.

/** FNV-1a 32 Bit — kleine, stabile Prüfsumme für die Sortierung */
function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Mischt `items` fest anhand von `seed` (z.B. "userId:contestId"); gleicher Seed → gleiche Reihenfolge. */
export function seededShuffle<T extends { id: string }>(items: T[], seed: string): T[] {
  return [...items]
    .map(item => ({ item, key: fnv1a(`${seed}:${item.id}`) }))
    .sort((a, b) => a.key - b.key || (a.item.id < b.item.id ? -1 : 1))
    .map(x => x.item);
}

/** Clip-Jahr eines Monats: Dezember zählt schon zum Folgejahr (Dez(Y-1)–Nov(Y) → Clip des Jahres Y). */
export function clipYearOf(month: number, year: number): number {
  return month === 12 ? year + 1 : year;
}
