import Image from "next/image";
import RankRing from "@/components/RankRing";
import type { UserLook } from "@/lib/cosmetics/catalog";

interface RankedAvatarProps {
  /** User, dessen ausgerüsteter Rahmen (+ Aura) aus dem Kosmetik-Shop gezeigt wird. Ohne ID: schlichter grauer Ring. */
  userId?: string | null;
  /** Schon bekanntes Aussehen (spart den Abruf). null = nicht laden, schlichter Ring (z.B. OBS-Overlays). */
  look?: UserLook | null;
  /** Veraltet, wird nicht mehr gebraucht. */
  rankPoints?: number;
  src: string | null | undefined;
  alt: string;
  /**
   * Außenkante des Avatars in px, inklusive Ring. Wird inline gesetzt, damit die
   * Komponente auch ohne Tailwind-Größenklasse misst.
   * Achtung: Inline schlägt Klassen — für andere Größen `size` setzen, nicht `className`.
   */
  size?: number;
  rounded?: "full" | "2xl" | "xl" | "lg";
  /**
   * "full" = animierter Ring mit Aura, "flat" = einfarbiger Ring ohne Animation und Aura.
   * "auto" (Default) wählt anhand der Größe: unter 24px ist der Verlauf nicht mehr auflösbar.
   */
  variant?: "auto" | "full" | "flat";
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
 * Das +1 beim vollen Ring ist Platz für die Haarlinie zwischen Ring und Bild.
 */
function getRingWidth(size: number, flat: boolean): number {
  return flat
    ? Math.max(1, Math.round(size * 0.075))
    : Math.max(2, Math.round(size * 0.06)) + 1;
}

/** Lokaler Fallback statt eines externen Avatar-Dienstes — dichte Listen sollen keine Fremdrequests auslösen. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function RankedAvatar({
  userId,
  look,
  src,
  alt,
  size = 40,
  rounded = "full",
  variant = "auto",
  className = "",
  title,
}: RankedAvatarProps) {
  const flat = variant === "flat" || (variant === "auto" && size < FLAT_BELOW);
  const r    = ROUNDED[rounded];
  const pad  = getRingWidth(size, flat);

  return (
    <RankRing
      userId={userId}
      look={look}
      width={pad}
      rounded={r}
      flat={flat}
      faceClassName="w-full h-full"
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size, boxSizing: "border-box" }}
      title={title}
    >
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
    </RankRing>
  );
}
