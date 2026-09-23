import type { EventCategory } from "@prisma/client";

/** Eigene Icons je Spielkategorie. Kategorien ohne Eintrag zeigen weiter ihr Emoji. */
const CATEGORY_ICON_SRC: Partial<Record<EventCategory, string>> = {
  competitive: "/icons/categories/competitive.png",
  fun: "/icons/categories/fun.png",
  special: "/icons/categories/special.png",
};

interface Props {
  category: EventCategory;
  emoji: string;
  size?: number;
  className?: string;
}

export default function CategoryIcon({ category, emoji, size = 16, className = "" }: Props) {
  const src = CATEGORY_ICON_SRC[category];
  if (!src) return <span className={className}>{emoji}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} className={`inline-block object-contain ${className}`} />;
}
