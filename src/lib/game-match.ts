/** Grober Abgleich zweier Spielnamen, z.B. Twitch-Kategorie ↔ Event-Spiel — Groß-/Kleinschreibung,
 *  Sonderzeichen und Jahreszahlen egal ("EA SPORTS FC 25" passt zu "EA Sports FC"). */
export function sameGame(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\b(19|20)?\d{2}\b/g, "").replace(/[^a-z0-9äöüß]+/g, "");
  const x = norm(a), y = norm(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
}
