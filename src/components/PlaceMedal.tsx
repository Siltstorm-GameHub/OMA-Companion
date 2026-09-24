const MEDALS = {
  1: { src: "/icons/medals/gold.png", label: "1. Platz" },
  2: { src: "/icons/medals/silver.png", label: "2. Platz" },
  3: { src: "/icons/medals/bronze.png", label: "3. Platz" },
} as const;

/**
 * Medaille für Platz 1–3 (ersetzt 🥇🥈🥉). Die Größe folgt der Schriftgröße des Umfelds (em),
 * damit sie in Text, Listen und Podium ohne eigene Größenangabe passt. Ab Platz 4: nichts.
 */
export default function PlaceMedal({ place, className = "" }: { place: number; className?: string }) {
  const m = MEDALS[place as 1 | 2 | 3];
  if (!m) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={m.src} alt={m.label} draggable={false}
      className={`inline-block shrink-0 select-none ${className}`}
      style={{ height: "1.2em", width: "auto", verticalAlign: "-0.2em" }} />
  );
}
