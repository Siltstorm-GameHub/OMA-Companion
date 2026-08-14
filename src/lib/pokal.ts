import type { EventCategory } from "@prisma/client";
import { CATEGORY_CONFIG } from "@/lib/wanderpocal";

/** Pfad zum Pokal-Icon (480×480, transparenter Hintergrund) je Event-Kategorie. */
export const POKAL_CATEGORY_IMAGE: Record<EventCategory, string> = {
  competitive: "/room-items/pokale/competitive.png",
  fun: "/room-items/pokale/fun.png",
  casual: "/room-items/pokale/casual.png",
  training: "/room-items/pokale/training.png",
  community_event: "/room-items/pokale/community_event.png",
  special: "/room-items/pokale/special.png",
};

/** Anzeigename der Kategorie (wiederverwendet aus dem Wanderpokal-Konfig, konsistente Titel). */
export function getPokalCategoryLabel(category: EventCategory): string {
  return CATEGORY_CONFIG[category]?.title ?? category;
}
