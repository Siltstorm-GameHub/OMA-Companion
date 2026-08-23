import { prisma } from "./prisma";
import { getRoomItem } from "./room-items";
import {
  DEFAULT_ROOM, DEFAULT_PLACEMENTS, fitsGrid, footprint, rectsOverlap,
  type PlacedItem, type RoomState, type StoredItem, type RoomSurface,
} from "./room-layout";

/**
 * Ordnet einen rohen DB-Zonenstring einer gültigen RoomSurface zu. Vor der
 * isometrischen Eck-Ansicht gab es nur "wall"/"floor" — solche Altzeilen
 * (und alles sonst Unerwartete) werden defensiv auf "wall_back" bzw. "floor"
 * abgebildet, statt einen Typfehler zu riskieren.
 */
function coerceSurface(raw: string): RoomSurface {
  if (raw === "floor" || raw === "wall_back" || raw === "wall_side" || raw === "wall_front" || raw === "wall_right") {
    return raw;
  }
  return raw === "wall" ? "wall_back" : "floor";
}

/**
 * Nur-Lese-Zugriff auf das (ehemalige) Gaming-Zimmer.
 *
 * Das Gaming-Zimmer selbst (Kauf, Editor, Admin-Panel) wurde entfernt — die
 * Room-/RoomItem-Tabellen und dieser Lader bleiben, weil die Mancave ihr
 * "Gadgets"-Panel (siehe mancave/page.tsx) weiterhin aus den historisch
 * besessenen/aufgestellten Möbeln speist. Es gibt keinen Schreibpfad mehr
 * (Kauf/Einrichten) — bestehende Zeilen sind eingefroren.
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
    // Die Vitrine und der runde OMA-Teppich waren feste Bühnenelemente
    // außerhalb des Rasters (siehe alte RoomStage3D.tsx) — Altzeilen aus der
    // Zeit, als sie noch normale Raster-Items waren, werden beim Laden
    // ignoriert.
    if (row.itemKey === "vitrine" || row.itemKey === "teppich_rund_logo") continue;
    if (row.placed) {
      const def  = getRoomItem(row.itemKey)!;
      const zone = coerceSurface(row.zone);
      if (fitsGrid(def, row.x, row.y, zone)) {
        placed.push({
          id: row.id, key: row.itemKey, zone, x: row.x, y: row.y,
          flipped: row.flipped, rotation: row.rotation, starter: row.starter,
        });
      } else {
        stored.push({ id: row.id, key: row.itemKey });
      }
    } else {
      stored.push({ id: row.id, key: row.itemKey });
    }
  }

  // Nachträglich zu DEFAULT_PLACEMENTS hinzugekommene Grundausstattung fehlt
  // bei Usern, deren Zimmer vor dieser Ergänzung materialisiert wurde,
  // komplett — ohne dieses Nachholen bliebe ein Katalog-Item mit
  // starter:true für Bestandsnutzer für immer unsichtbar.
  const existingKeys = new Set(items.map(i => i.itemKey));
  const missing = DEFAULT_PLACEMENTS.filter(p => !existingKeys.has(p.key));
  for (const p of missing) {
    const def = getRoomItem(p.key);
    if (!def) continue;
    const wantRect = { x: p.x, y: p.y, ...footprint(def, p.zone, 0) };
    const overlaps = placed.some(existing => {
      if (existing.zone !== p.zone) return false;
      const existingDef = getRoomItem(existing.key);
      if (!existingDef) return false;
      const existingRect = { x: existing.x, y: existing.y, ...footprint(existingDef, existing.zone, existing.rotation) };
      return rectsOverlap(existingRect, wantRect);
    });
    const canPlace = !overlaps && fitsGrid(def, p.x, p.y, p.zone);
    const row = await prisma.roomItem.create({
      data: {
        userId, itemKey: p.key, zone: p.zone, x: p.x, y: p.y,
        flipped: false, placed: canPlace, starter: true,
      },
    });
    if (canPlace) {
      placed.push({ id: row.id, key: p.key, zone: p.zone, x: p.x, y: p.y, flipped: false, rotation: 0, starter: true });
    } else {
      stored.push({ id: row.id, key: p.key });
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
