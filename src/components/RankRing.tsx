import type { CSSProperties, ReactNode } from "react";
import { getRank, getRingClass, getRingStyle } from "@/lib/ranks";

/** "I" → 1, "II" → 2, "III" → 3 */
function getTierCount(tierLabel: string): number {
  return tierLabel.length;
}

interface RankRingProps {
  rankPoints: number;
  /** Ringbreite in px. Wird als Padding gesetzt — das Padding IST der Ring. */
  width: number;
  /** Tailwind-Rundungsklasse, z.B. "rounded-full". Vererbt sich an die Ringschicht. */
  rounded: string;
  /** Einfarbiger Ring ohne Animation — für sehr kleine Avatare. */
  flat?: boolean;
  /** Stufenanzeige (1–3 Punkte) am unteren Rand. */
  showTier?: boolean;
  /** Klassen für den Bild-Container. Trägt die Größe und ggf. eine Sonderform. */
  faceClassName?: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
  children: ReactNode;
}

/**
 * Der Rang-Rahmen als eigenständiger Wrapper.
 *
 * Existiert, damit die dreiteilige Struktur (Ringschicht / Bild / Punkte) nur an einer
 * Stelle steht. Wer den Ring von Hand aus getRingClass() + getRingStyle() zusammenbaut,
 * vergisst sonst die .rr-ring-layer — und bekommt einen Rahmen ganz ohne Gradient.
 */
export default function RankRing({
  rankPoints,
  width,
  rounded,
  flat = false,
  showTier = false,
  faceClassName = "",
  className = "",
  style,
  title,
  children,
}: RankRingProps) {
  const tierCount = getTierCount(getRank(rankPoints).tierLabel);

  return (
    <div
      className={`${getRingClass(rankPoints)}${flat ? " rr-flat" : ""} ${rounded} ${className}`}
      style={{ ...getRingStyle(rankPoints), padding: width, ...style }}
      title={title}
    >
      <span className="rr-ring-layer" aria-hidden="true" />
      <div className={`rr-face ${rounded} ${faceClassName}`}>{children}</div>
      {showTier && !flat && (
        <span className="rr-dots" aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <span key={i} className={`rr-dot${i <= tierCount ? " rr-dot--on" : ""}`} />
          ))}
        </span>
      )}
    </div>
  );
}
