// Zahlen für die Anzeige im deutschen Format: Komma als Dezimaltrennzeichen ("12,5"), Punkt als
// Tausendertrenner ("1.234"). Statt n.toFixed(…) — das liefert immer einen Punkt ("12.5").
// Nur für sichtbare Texte; für Schlüssel, CSS-Werte, URLs o.ä. weiter toFixed/String verwenden.

const cache = new Map<string, Intl.NumberFormat>();
function nf(min: number, max: number) {
  const key = `${min}:${max}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat("de-DE", { minimumFractionDigits: min, maximumFractionDigits: max });
    cache.set(key, f);
  }
  return f;
}

/** Feste Nachkommastellen wie toFixed, aber mit Komma: formatFixed(3.5, 2) → "3,50" */
export function formatFixed(n: number, digits: number): string {
  if (!Number.isFinite(n)) return "–";
  return nf(digits, digits).format(n);
}

/** Bis zu maxDigits Nachkommastellen, ohne überflüssige Nullen: formatDecimal(12.5) → "12,5", formatDecimal(4) → "4" */
export function formatDecimal(n: number, maxDigits = 2): string {
  if (!Number.isFinite(n)) return "–";
  return nf(0, maxDigits).format(n);
}
