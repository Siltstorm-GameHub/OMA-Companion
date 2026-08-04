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
  /** Stufen-Marker (I/II/III) am Ringrand. Default: ab 48px, darunter zu klein zum Lesen. */
  showTier?: boolean;
  className?: string;
}

const ROUNDED = {
  full: "rounded-full",
  "2xl": "rounded-2xl",
  xl:   "rounded-xl",
  lg:   "rounded-lg",
};

/**
 * Ringbreite proportional zur Avatargröße — fixe px sehen bei 24px wie ein Reifen
 * und bei 80px wie ein Haar aus. Über alle Stufen gleich, damit das Bild in einer
 * Reihe überall gleich groß bleibt; die Stufe steckt in der Ringform, nicht im Padding.
 */
function getRingWidth(size: number): number {
  return Math.max(2, Math.round(size * 0.055));
}

export default function RankedAvatar({
  rankPoints,
  src,
  alt,
  size = 40,
  rounded = "full",
  showTier,
  className = "",
}: RankedAvatarProps) {
  const r    = ROUNDED[rounded];
  const pad  = getRingWidth(size);
  const rank = getRank(rankPoints);
  const pip  = showTier ?? size >= 48;

  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(alt)}&background=3f3f46&color=e4e4e7&size=${size * 2}`;
  const imgSrc   = src ?? fallback;

  return (
    <div
      className={`${getRingClass(rankPoints)} ${r} shrink-0 ${className}`}
      style={{ ...getRingStyle(rankPoints), padding: pad }}
    >
      <div className={`${r} overflow-hidden bg-[#0d0d0f] w-full h-full`}>
        <Image
          src={imgSrc}
          alt={alt}
          width={size}
          height={size}
          className={`${r} object-cover w-full h-full`}
          unoptimized
        />
      </div>
      {pip && <span className="rr-pip select-none">{rank.tierLabel}</span>}
    </div>
  );
}
