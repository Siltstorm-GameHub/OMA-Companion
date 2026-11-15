// Seitenverhältnis (Breite/Höhe) der PNGs — feste Breite statt "auto", damit die Medaille in
// schmalen Tabellenspalten (mobil) nicht gestaucht wird.
const MEDALS = {
  1: { src: "/icons/medals/gold.png", label: "1. Platz", ratio: 124 / 108 },
  2: { src: "/icons/medals/silver.png", label: "2. Platz", ratio: 111 / 108 },
  3: { src: "/icons/medals/bronze.png", label: "3. Platz", ratio: 82 / 108 },
} as const;

const HEIGHT_EM = 1.2;

/**
 * Medaille für Platz 1–3 (ersetzt 🥇🥈🥉). Die Größe folgt der Schriftgröße des Umfelds (em),
 * damit sie in Text, Listen und Podium ohne eigene Größenangabe passt. Ab Platz 4: nichts.
 * `max-width: none` hebt Tailwinds `img { max-width: 100% }` auf — sonst schrumpft das Bild in
 * engen Tabellenzellen in der Breite, während die Höhe fix bleibt (verzerrt).
 */
export default function PlaceMedal({ place, className = "" }: { place: number; className?: string }) {
  const m = MEDALS[place as 1 | 2 | 3];
  if (!m) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={m.src} alt={m.label} draggable={false}
      className={`inline-block shrink-0 select-none ${className}`}
      style={{
        height: `${HEIGHT_EM}em`,
        width: `${(HEIGHT_EM * m.ratio).toFixed(3)}em`,
        maxWidth: "none",
        objectFit: "contain",
        verticalAlign: "-0.2em",
      }} />
  );
}
