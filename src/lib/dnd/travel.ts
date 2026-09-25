// ============================================
// Reise-Mechanik auf dem Hex-Raster: Resolve-on-Read, Commit-on-Next-Write
// ============================================
// Kein Ticking-Backend-Prozess: die Weltkarte berechnet "unterwegs" immer live
// aus now() vs. travelDepartedAt/travelArrivesAt und dem gespeicherten Pfad
// (resolveCharacterPosition, reine Funktion, kein DB-Schreibvorgang). Die
// eigentliche Ankunft wird erst beim nächsten authentifizierten Zugriff des
// betroffenen Charakters commitet (commitArrivalIfDue) — gleicher Trigger wie
// der Story-Tick selbst. Ein täglicher Cron räumt liegen gebliebene Ankünfte
// zusätzlich auf (nicht korrektheitsrelevant, siehe cron/dnd-travel-sweep).
//
// Man darf zu jedem betretbaren Feld reisen (Ozean/See/Lava nicht); eine feste
// Location entsteht nur, wenn das Zielfeld eine hat — sonst ist es ein freies
// Feld (currentLocationId = null), auf dem später Story-Ereignisse stattfinden
// können.

import { Prisma, type Card } from "@prisma/client";
import { prisma } from "../prisma";
import { positionAlongPath } from "./hex/pathfinding";
import { stepMinutesOf } from "./hex/world";
import type { Hex } from "./hex/grid";

type PositionCard = Pick<
  Card,
  "currentHexCol" | "currentHexRow" | "travelToCol" | "travelToRow" | "travelPath" | "travelDepartedAt" | "travelArrivesAt"
>;

export interface ResolvedPosition {
  inTransit: boolean;
  /** Feld, auf dem der Charakter steht bzw. von dem er abgereist ist (null = noch keine Position, siehe Backfill). */
  hex: Hex | null;
  /** Nur unterwegs: Zielfeld, Pfad ([[col,row],…] inkl. Start) und Zeiten. */
  to?: Hex;
  path?: Hex[];
  departedAt?: Date;
  arrivesAt?: Date;
  /** 0..1 über die gesamte Reise, nur unterwegs. */
  progress?: number;
  /** Aktuell (interpoliert) erreichtes Feld des Pfads und Anteil zum nächsten, nur unterwegs. */
  pathIndex?: number;
  pathT?: number;
}

/** Pfad aus der DB (Json) → Hex[]; ungültige Inhalte → null. */
export function parseTravelPath(value: unknown): Hex[] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const out: Hex[] = [];
  for (const p of value) {
    if (!Array.isArray(p) || p.length !== 2 || !Number.isInteger(p[0]) || !Number.isInteger(p[1])) return null;
    out.push({ col: p[0], row: p[1] });
  }
  return out;
}

/** Reine Berechnung (kein DB-Zugriff): wo ist die Karte gerade? */
export function resolveCharacterPosition(card: PositionCard, now: Date = new Date()): ResolvedPosition {
  const here: Hex | null = card.currentHexCol != null && card.currentHexRow != null
    ? { col: card.currentHexCol, row: card.currentHexRow }
    : null;
  const path = parseTravelPath(card.travelPath);
  if (card.travelToCol == null || card.travelToRow == null || !path || !card.travelDepartedAt || !card.travelArrivesAt) {
    return { inTransit: false, hex: here };
  }
  if (now >= card.travelArrivesAt) {
    // Ankunft ist fällig, aber noch nicht commitet — für Lese-Zwecke schon "angekommen".
    return { inTransit: false, hex: here };
  }
  const total = card.travelArrivesAt.getTime() - card.travelDepartedAt.getTime();
  const elapsed = now.getTime() - card.travelDepartedAt.getTime();
  const progress = total > 0 ? Math.min(1, Math.max(0, elapsed / total)) : 1;
  const pos = positionAlongPath(stepMinutesOf(path), elapsed / 60000);
  return {
    inTransit: true,
    hex: here ?? path[0],
    to: { col: card.travelToCol, row: card.travelToRow },
    path,
    departedAt: card.travelDepartedAt,
    arrivesAt: card.travelArrivesAt,
    progress,
    pathIndex: pos.index,
    pathT: pos.t,
  };
}

/** Feste Location auf einem Feld (oder null = freies Feld). */
export async function locationAtHex(hex: Hex): Promise<{ id: string } | null> {
  return prisma.dndLocation.findFirst({ where: { hexCol: hex.col, hexRow: hex.row }, select: { id: true } });
}

/**
 * Committet eine fällige Ankunft für genau diese Karte: Position = Zielfeld,
 * currentLocationId = Location dort (oder null), Reisefelder werden geleert.
 * No-op, falls nicht (mehr) unterwegs oder Ankunftszeit noch nicht erreicht.
 * Gibt zurück, ob angekommen wurde und ob das Zielfeld eine feste Location hat.
 */
export async function commitArrivalIfDue(
  cardId: string,
): Promise<{ arrived: boolean; hex?: Hex; locationId?: string | null }> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { id: true, travelToCol: true, travelToRow: true, travelArrivesAt: true },
  });
  if (card?.travelToCol == null || card.travelToRow == null || !card.travelArrivesAt) return { arrived: false };
  if (new Date() < card.travelArrivesAt) return { arrived: false };

  const hex = { col: card.travelToCol, row: card.travelToRow };
  const location = await locationAtHex(hex);
  await prisma.card.update({
    where: { id: card.id },
    data: {
      currentHexCol: hex.col,
      currentHexRow: hex.row,
      currentLocationId: location?.id ?? null,
      travelToCol: null,
      travelToRow: null,
      travelPath: Prisma.DbNull,
      travelDepartedAt: null,
      travelArrivesAt: null,
    },
  });
  return { arrived: true, hex, locationId: location?.id ?? null };
}

/** Committet fällige Ankünfte für ALLE Karten — für den täglichen Cleanup-Cron. */
export async function commitAllDueArrivals(): Promise<number> {
  const due = await prisma.card.findMany({
    where: { travelToCol: { not: null }, travelArrivesAt: { lte: new Date() } },
    select: { id: true },
  });
  let committed = 0;
  for (const c of due) {
    const result = await commitArrivalIfDue(c.id);
    if (result.arrived) committed++;
  }
  return committed;
}
