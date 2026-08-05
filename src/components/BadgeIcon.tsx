import { badgeArt, isImageIcon } from "@/lib/badge-art";

interface BadgeIconProps {
  /** Emoji aus badges.ts bzw. CustomBadge.icon — der Fallback. */
  icon: string;
  /** Abzeichen-Schlüssel ("welcome" oder "custom:<id>") für die Bild-Registry.
   *  Ohne Schlüssel greift nur die Erkennung anhand von `icon` selbst. */
  badgeKey?: string | null;
  /** Kantenlänge in px. Emoji-Fallback skaliert über fontSize mit. */
  size?: number;
  className?: string;
  alt?: string;
}

/**
 * Rendert ein Abzeichen als Bild, wenn eins hinterlegt ist — sonst als Emoji.
 *
 * Der Sinn dieser Komponente ist die Austauschbarkeit: eigene Motive kommen
 * über die Registry in lib/badge-art.ts dazu, ohne dass eine der sieben
 * Aufrufstellen angefasst werden muss.
 *
 * Bewusst ein rohes <img> statt next/image: die Bilder liegen unter /public,
 * sind winzig (~128 px) und werden teils in Listen mit dutzenden Einträgen
 * gerendert — der next/image-Overhead lohnt bei der Grösse nicht, und
 * next/image bräuchte für künftige externe URLs zusätzlich remotePatterns.
 */
export default function BadgeIcon({
  icon,
  badgeKey,
  size = 24,
  className = "",
  alt,
}: BadgeIconProps) {
  const src = badgeArt(badgeKey) ?? (isImageIcon(icon) ? icon : null);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ""}
        width={size}
        height={size}
        className={`inline-block object-contain shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center leading-none shrink-0 ${className}`}
      style={{ fontSize: size * 0.9, width: size, height: size }}
      role="img"
      aria-label={alt}
    >
      {icon}
    </span>
  );
}
