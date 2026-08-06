/** Bild-Registry für Rang-Medaillen.
 *
 *  Analog zu lib/badge-art.ts: eigenes Bild einhängen, ohne Aufrufstellen
 *  anzufassen. Die Zuordnung ist hier aber vollständig — anders als bei den
 *  Abzeichen hat jeder der 6 Ränge sein eigenes Motiv, keine geteilten
 *  Familien. Erzeugt von scripts/process-rank-art.ts.
 *
 *  Eigenes Bild einhängen — zwei Schritte, kein Code:
 *    1. Rohmotiv nach public/ranks/_raw/<motiv>.png legen
 *    2. Zuordnung in RANKS (process-rank-art.ts) auf das neue Motiv zeigen
 *       lassen und das Skript erneut laufen lassen
 */
const RANK_MEDAL: Record<number, string> = {
  1: "/ranks/rank-1.png", // Zivi-Anwärter — Klemmbrett
  2: "/ranks/rank-2.png", // Rollator-Raser — Gehstock
  3: "/ranks/rank-3.png", // Krawall-Rentner — Faust
  4: "/ranks/rank-4.png", // Denkmalschutz — Säule
  5: "/ranks/rank-5.png", // Heimleitung — Haus
  6: "/ranks/rank-6.png", // Old Master — Krone
};

/** Liefert den Bildpfad zur Medaille eines Rang-Tiers (1–6), oder null für
 *  den Emoji-Fallback. */
export function rankMedal(tier: number): string | null {
  return RANK_MEDAL[tier] ?? null;
}
