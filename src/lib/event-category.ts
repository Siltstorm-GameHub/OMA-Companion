/**
 * Event-Kategorien — client- und serversicher, ohne React.
 * Seit 2026-11 gibt es nur noch 4 Kategorien. "casual" und "community_event" stehen als Altwerte noch im
 * Enum (alte Pokale/Wanderpokale, db push ohne Datenverlust) und gelten überall als Fun.
 */

import type { EventCategory } from "@prisma/client";

/** Die 4 Kategorien, die man wählen kann (Reihenfolge = Auswahl in Assistent und Einstellungen). */
export const ACTIVE_CATEGORIES = ["competitive", "training", "special", "fun"] as const satisfies readonly EventCategory[];
export type ActiveCategory = (typeof ACTIVE_CATEGORIES)[number];

/** Altwerte "casual"/"community_event" → "fun"; unbekannte Werte ebenfalls; leer bleibt leer. */
export function normalizeCategory(category: EventCategory | string | null | undefined): ActiveCategory | null {
  if (!category) return null;
  return (ACTIVE_CATEGORIES as readonly string[]).includes(category) ? (category as ActiveCategory) : "fun";
}
