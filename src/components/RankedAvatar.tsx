import Image from "next/image";
import { getRank, getRingClass, getRingStyle } from "@/lib/ranks";

interface RankedAvatarProps {
  rankPoints: number;
  src: string | null | undefined;
  alt: string;
  /**
   * Inner image pixel size — used for the Next.js Image width/height.
   * If you control outer size via `className` (e.g. Tailwind w-16 h-16),
   * set this to the same value in px.
   */
  size?: number;
  rounded?: "full" | "2xl" | "xl" | "lg";
  /**
   * "full" = animierter Ring mit Stufenform, "flat" = einfarbiger Rangring ohne Animation.
   * "auto" (Default) wählt anhand der Größe: unter 24px ist der Verlauf nicht mehr auflösbar.
   */
  variant?: "auto" | "full" | "flat";
  /** Stufen-Marker (I/II/III) am Ringrand. Default: ab 48px, darunter zu klein zum Lesen. */
  showTier?: boolean;
  className?: string;
  title?: string;
}

const ROUNDED = {
  full: "rounded-full",
  "2xl": "rounded-2xl",
  xl:   "rounded-xl",
  lg:   "rounded-lg",
};

/** Ab dieser Größe lohnt sich der volle Ring mit Verlauf und Stufenform. */
const FLAT_BELOW = 24;

/**
 * Ringbreite proportional zur Avatargröße — fixe px sehen bei 24px wie ein Reifen
 * und bei 80px wie ein Haar aus. Über alle Stufen gleich, damit das Bild in einer
 * Reihe überall gleich groß bleibt; die Stufe steckt in der Ringform, nicht im Padding.
 */
function getRingWidth(size: number, flat: boolean): number {
  return flat
    ? Math.max(1, Math.round(size * 0.075))
    : Math.max(2, Math.round(size * 0.06));
}

/** Lokaler Fallback statt eines externen Avatar-Dienstes — dichte Listen sollen keine Fremdrequests auslösen. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function RankedAvatar({
  rankPoints,
  src,
  alt,
  size = 40,
  rounded = "full",
  variant = "auto",
  showTier,
  className = "",
  title,
}: RankedAvatarProps) {
  const flat = variant === "flat" || (variant === "auto" && size < FLAT_BELOW);
  const r    = ROUNDED[rounded];
  const pad  = getRingWidth(size, flat);
  const rank = getRank(rankPoints);
  const pip  = (showTier ?? size >= 48) && !flat;

  return (
    <div
      className={`${getRingClass(rankPoints)}${flat ? " rr-flat" : ""} ${r} shrink-0 ${className}`}
      // `size` ist die Außenkante inkl. Ring und wird inline gesetzt, damit die Komponente
      // auch ohne Tailwind-Größenklasse misst. Ohne das hat das innere w-full/h-full keinen
      // Bezug und der Avatar zieht sich auf die Containerbreite auf.
      // Achtung: Inline schlägt Klassen — responsive Größen per className funktionieren nicht,
      // stattdessen `size` setzen.
      style={{ ...getRingStyle(rankPoints), padding: pad, width: size, height: size, boxSizing: "border-box" }}
      title={title}
    >
      <div className={`${r} overflow-hidden bg-[#0d0d0f] w-full h-full`}>
        {src ? (
          <Image
            src={src}
            alt={alt}
            width={size}
            height={size}
            className={`${r} object-cover w-full h-full`}
            unoptimized
          />
        ) : (
          <div
            className={`${r} w-full h-full flex items-center justify-center font-bold bg-zinc-800 text-zinc-400 select-none`}
            // Explizite Mindestgröße: ohne Tailwind-Größenklasse am Wrapper hätte w-full/h-full
            // keinen Bezug und der Fallback würde auf 0 zusammenfallen.
            style={{
              fontSize: Math.max(8, Math.round(size * 0.38)),
              minWidth: size - 2 * pad,
              minHeight: size - 2 * pad,
            }}
            aria-label={alt}
          >
            {getInitials(alt)}
          </div>
        )}
      </div>
      {pip && <span className="rr-pip select-none">{rank.tierLabel}</span>}
    </div>
  );
}
