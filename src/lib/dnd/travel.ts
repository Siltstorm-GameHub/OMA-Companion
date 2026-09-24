// ============================================
// Reise-Mechanik: Resolve-on-Read, Commit-on-Next-Write
// ============================================
// Kein Ticking-Backend-Prozess: die Weltkarte berechnet "in Transit" immer
// live aus now() vs. travelDepartedAt/travelArrivesAt (resolveCharacterLocation,
// reine Funktion, kein DB-Schreibvorgang). Die eigentliche Ankunft wird erst
// beim nächsten authentifizierten Zugriff des betroffenen Charakters commitet
// (commitArrivalIfDue) — gleicher Trigger wie der Story-Tick selbst (plan
// Abschnitt 3.3). Ein täglicher Cron räumt liegen gebliebene Ankünfte
// zusätzlich auf (nicht korrektheitsrelevant, siehe cron/dnd-travel-sweep).

import type { Card } from "@prisma/client";
import { prisma } from "../prisma";

export interface ResolvedLocation {
  inTransit: boolean;
  locationId: string | null;
  fromId?: string | null;
  toId?: string | null;
  departedAt?: Date | null;
  arrivesAt?: Date | null;
  /** 0..1, nur wenn inTransit */
  progress?: number;
}

/** Reine Berechnung (kein DB-Zugriff) — ob die Karte gerade unterwegs ist. */
export function resolveCharacterLocation(
  card: Pick<Card, "currentLocationId" | "travelRouteId" | "travelFromLocationId" | "travelDepartedAt" | "travelArrivesAt">,
  now: Date = new Date()
): ResolvedLocation {
  if (!card.travelRouteId || !card.travelArrivesAt || !card.travelDepartedAt) {
    return { inTransit: false, locationId: card.currentLocationId };
  }
  if (now >= card.travelArrivesAt) {
    // Ankunft ist fällig, aber noch nicht commitet — für Lese-Zwecke schon "angekommen".
    return { inTransit: false, locationId: card.currentLocationId };
  }
  const total = card.travelArrivesAt.getTime() - card.travelDepartedAt.getTime();
  const elapsed = now.getTime() - card.travelDepartedAt.getTime();
  const progress = total > 0 ? Math.min(1, Math.max(0, elapsed / total)) : 1;
  return {
    inTransit: true,
    locationId: null,
    fromId: card.travelFromLocationId ?? card.currentLocationId,
    toId: undefined, // vom Aufrufer über travelRoute.toId aufgelöst (siehe world-map route)
    departedAt: card.travelDepartedAt,
    arrivesAt: card.travelArrivesAt,
    progress,
  };
}

/**
 * Committet eine fällige Ankunft für genau diese Karte: currentLocationId =
 * Ziel der Route, Reisefelder werden geleert. No-op, falls nicht (mehr) in
 * Transit oder Ankunftszeit noch nicht erreicht. Gibt true zurück, wenn eine
 * Ankunft committet wurde (Aufrufer kann dann LOCATION_VISITED triggern).
 */
export async function commitArrivalIfDue(cardId: string): Promise<{ arrived: boolean; locationId?: string }> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { id: true, travelRouteId: true, travelArrivesAt: true, travelRoute: { select: { toId: true } } },
  });
  if (!card?.travelRouteId || !card.travelArrivesAt || !card.travelRoute) return { arrived: false };
  if (new Date() < card.travelArrivesAt) return { arrived: false };

  const toId = card.travelRoute.toId;
  await prisma.card.update({
    where: { id: card.id },
    data: {
      currentLocationId: toId,
      travelRouteId: null,
      travelFromLocationId: null,
      travelDepartedAt: null,
      travelArrivesAt: null,
    },
  });
  return { arrived: true, locationId: toId };
}

/** Committet fällige Ankünfte für ALLE Karten — für den täglichen Cleanup-Cron. */
export async function commitAllDueArrivals(): Promise<number> {
  const due = await prisma.card.findMany({
    where: { travelRouteId: { not: null }, travelArrivesAt: { lte: new Date() } },
    select: { id: true },
  });
  let committed = 0;
  for (const c of due) {
    const result = await commitArrivalIfDue(c.id);
    if (result.arrived) committed++;
  }
  return committed;
}
