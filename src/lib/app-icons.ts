import type { EventCategory, EventGenre } from "@prisma/client";

/**
 * Zentrale Zuordnung Schlüssel → Icon. Ein Icon tauschen = eine Zeile ändern.
 * Gerendert wird über <AppIcon /> (src/components/AppIcon.tsx).
 * Bilder liegen unter public/icons/.
 */

export type GenreMeta = { value: EventGenre; label: string; icon: string };

/** Reihenfolge = Reihenfolge in den Auswahl-Dialogen. */
export const GENRES: GenreMeta[] = [
  { value: "arcade",     label: "Arcade",      icon: "/icons/genres/arcade.png" },
  { value: "beat_em_up", label: "Beat-em-Up",  icon: "/icons/genres/beat-em-up.png" },
  { value: "sport",      label: "Sport",       icon: "/icons/genres/sport.png" },
  { value: "racing",     label: "Racing",      icon: "/icons/genres/racing.png" },
  { value: "shooter",    label: "Shooter",     icon: "/icons/genres/shooter.png" },
  { value: "community",  label: "Community",   icon: "/icons/genres/community.png" },
  { value: "strategy",   label: "Strategie",   icon: "/icons/genres/strategy.png" },
  { value: "card_game",  label: "Kartenspiel", icon: "/icons/genres/card-game.png" },
  { value: "board_game", label: "Brettspiel",  icon: "/icons/genres/board-game.png" },
];

export function genreMeta(genre: string | null | undefined): GenreMeta | null {
  if (!genre) return null;
  return GENRES.find(g => g.value === genre) ?? null;
}

/** `icon` fehlt = es wird das Emoji gezeigt. */
export const CATEGORY_ICONS: Record<EventCategory, { emoji: string; icon?: string }> = {
  competitive:     { emoji: "🏆", icon: "/icons/categories/competitive.png" },
  fun:             { emoji: "🎉", icon: "/icons/categories/fun.png" },
  casual:          { emoji: "🛋️" },
  training:        { emoji: "🎓", icon: "/icons/categories/training.png" },
  community_event: { emoji: "🤝", icon: "/icons/categories/community.png" },
  special:         { emoji: "⭐", icon: "/icons/categories/special.png" },
};
