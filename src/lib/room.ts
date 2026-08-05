import { prisma } from "./prisma";
import { getRoomItem, isSurface, STARTER_ITEM_KEYS } from "./room-items";
import {
  DEFAULT_ROOM, DEFAULT_PLACEMENTS,
  type PlacedItem, type RoomState, type StoredItem,
} from "./room-layout";

/**
 * Datenbank-Zugriff auf das Gaming-Zimmer.
 *
 * Kernidee "faule Materialisierung": Wer die Seite nur anschaut, bekommt
 * DEFAULT_ROOM aus dem Code zurück — ohne einen einzigen Schreibzugriff.
 * Erst der erste echte Eingriff (Kauf oder Umstellen) legt Room- und
 * RoomItem-Zeilen an. Millionen ungenutzter Zimmer kosten so nichts.
 */

/**
 * Lädt das Zimmer eines Users. Existiert keine Room-Zeile, ist das Ergebnis
 * das unveränderte Standard-Zimmer (materialized: false).
 */
export async function loadRoom(userId: string): Promise<RoomState> {
  const [room, items] = await Promise.all([
    prisma.room.findUnique({ where: { userId } }).catch(() => null),
    prisma.roomItem.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }).catch(() => []),
  ]);

  if (!room) return DEFAULT_ROOM;

  const placed: PlacedItem[] = [];
  const stored: StoredItem[] = [];

  for (const row of items) {
    // Items, deren Katalog-Eintrag entfernt wurde, werden still übersprungen —
    // ein umbenannter Schlüssel darf nie die ganze Seite kippen.
    if (!getRoomItem(row.itemKey)) continue;
    if (row.placed) {
      placed.push({
        id: row.id, key: row.itemKey, zone: row.zone === "wall" ? "wall" : "floor",
        x: row.x, y: row.y, flipped: row.flipped, starter: row.starter,
      });
    } else {
      stored.push({ id: row.id, key: row.itemKey });
    }
  }

  return {
    wallpaperKey: room.wallpaperKey,
    floorKey:     room.floorKey,
    doorSign:     room.doorSign,
    placed,
    stored,
    materialized: true,
  };
}

/**
 * Legt Room-Zeile plus Grundausstattung an, falls noch nicht vorhanden.
 * Idempotent: ein zweiter Aufruf tut nichts.
 *
 * Läuft innerhalb einer bestehenden Transaktion, wenn `tx` übergeben wird —
 * damit ein Kauf und die Materialisierung gemeinsam gelingen oder gemeinsam
 * scheitern.
 */
type TxClient = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function materializeRoom(userId: string, tx: TxClient = prisma): Promise<void> {
  const existing = await tx.room.findUnique({ where: { userId }, select: { userId: true } });
  if (existing) return;

  await tx.room.create({
    data: {
      userId,
      wallpaperKey: DEFAULT_ROOM.wallpaperKey,
      floorKey:     DEFAULT_ROOM.floorKey,
    },
  });

  await tx.roomItem.createMany({
    data: DEFAULT_PLACEMENTS.map(p => ({
      userId, itemKey: p.key, zone: p.zone, x: p.x, y: p.y,
      flipped: false, placed: true, starter: true,
    })),
  });
}

/**
 * Wie viele Exemplare je itemKey der User besitzt (aufgestellt + im Lager).
 * Der Shop braucht das für "Davon hast du schon genug" und die Besitz-Anzeige.
 */
export async function ownedItemCounts(userId: string): Promise<Record<string, number>> {
  const rows = await prisma.roomItem
    .groupBy({ by: ["itemKey"], where: { userId }, _count: { itemKey: true } })
    .catch(() => [] as { itemKey: string; _count: { itemKey: number } }[]);

  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.itemKey] = row._count.itemKey;

  // Wer noch kein materialisiertes Zimmer hat, besitzt trotzdem die
  // Grundausstattung — sonst zeigt der Shop sie fälschlich als "nicht besessen".
  if (rows.length === 0) {
    for (const key of STARTER_ITEM_KEYS) counts[key] = (counts[key] ?? 0) + 1;
    for (const def of [DEFAULT_ROOM.wallpaperKey, DEFAULT_ROOM.floorKey]) {
      counts[def] = (counts[def] ?? 0) + 1;
    }
  }
  return counts;
}

/** Besitzt der User diese Fläche (Tapete/Boden)? Grundausstattung zählt immer. */
export async function ownsSurface(userId: string, key: string): Promise<boolean> {
  const def = getRoomItem(key);
  if (!def || !isSurface(def)) return false;
  if (def.price === 0) return true;
  const row = await prisma.roomItem.findFirst({ where: { userId, itemKey: key }, select: { id: true } });
  return !!row;
}
