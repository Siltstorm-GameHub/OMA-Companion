import type { EventCategory } from "@prisma/client";
import { CATEGORY_CONFIG } from "@/lib/wanderpocal";

/** Pfad zum Pokal-Icon (480×480, transparenter Hintergrund) je Event-Kategorie. */
export const POKAL_CATEGORY_IMAGE: Record<EventCategory, string> = {
  competitive: "/pokale/competitive.png",
  fun: "/pokale/fun.png",
  casual: "/pokale/casual.png",
  training: "/pokale/training.png",
  community_event: "/pokale/community_event.png",
  special: "/pokale/special.png",
};

/** Anzeigename der Kategorie (wiederverwendet aus dem Wanderpokal-Konfig, konsistente Titel). */
export function getPokalCategoryLabel(category: EventCategory): string {
  return CATEGORY_CONFIG[category]?.title ?? category;
}
