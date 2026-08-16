import { prisma } from "./prisma";
import { COIN_PREFIX } from "./points";
import { getRoomItem, isFixed, isSeasonalActive, isSurface, STARTER_ITEM_KEYS } from "./room-items";
import {
  DEFAULT_ROOM, DEFAULT_PLACEMENTS, DEFAULT_ID_PREFIX, MAX_PLACED_ITEMS,
  countTags, validateLayout, fitsGrid,
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
import { checkRequirements, formatMissing, getJob } from "./jobs";

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
    // Die Vitrine ist kein Raster-Platzierungsobjekt mehr, sondern ein fest
    // positioniertes Element außerhalb des Rasters (siehe RoomStage.tsx,
    // VitrinePanel). Ältere Zeilen aus der Zeit davor hätten hier noch ihre
    // damalige Position/Größe — beim Speichern würde validateLayout() sie
    // gegen die inzwischen viel größere Katalog-Größe prüfen und ablehnen
    // ("passt nicht ins Raster"). Deshalb werden sie beim Laden ignoriert.
    if (row.itemKey === "vitrine") continue;
    if (row.placed) {
      // Zeilen aus der Zeit vor der isometrischen Eck-Ansicht (flaches
      // 28×9-Raster) haben Koordinaten, die im neuen, kleineren Drei-Flächen-
      // Raster oft nicht mehr passen. Statt die ganze Seite mit einem
      // Validierungsfehler kippen zu lassen, wandern nicht mehr passende
      // Altzeilen defensiv ins Lager — der User platziert sie einmal neu,
      // verliert das Möbelstück aber nicht (gleiches Prinzip wie beim
      // Vitrine-Rasterwechsel weiter oben).
      const def  = getRoomItem(row.itemKey)!;
      const zone = coerceSurface(row.zone);
      if (fitsGrid(def, row.x, row.y, zone)) {
        placed.push({ id: row.id, key: row.itemKey, zone, x: row.x, y: row.y, flipped: row.flipped, starter: row.starter });
      } else {
        stored.push({ id: row.id, key: row.itemKey });
      }
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

// ── Kauf ─────────────────────────────────────────────────────────────────────

export type PurchaseResult =
  | { ok: true; roomItemId: string; points: number; label: string }
  | { error: string };

/**
 * Kauft ein Möbelstück: erst lesen und validieren, dann genau eine
 * Transaktion, die Münzen abbucht, das Ledger schreibt und das Möbelstück anlegt.
 *
 * Gekaufte Möbel landen im LAGER (placed: false) — aufgestellt wird im Zimmer.
 */
export async function purchaseRoomItem(userId: string, itemKey: string): Promise<PurchaseResult> {
  const def = getRoomItem(itemKey);
  if (!def)            return { error: "Unbekanntes Möbelstück" };
  if (def.price <= 0)  return { error: "Das gibt es nicht zu kaufen" };
  if (!isSeasonalActive(def)) return { error: "Gerade nicht erhältlich — saisonales Objekt" };

  // Upgrade-Slot-Items (Schreibtisch/Rechner/Sitzmöbel) brauchen echte Zeilen,
  // um das aktuell aufgestellte Vorgänger-Objekt zu finden — sonst würde bei
  // der allerersten Aktion eines Users (Kauf vor jeder Materialisierung) der
  // Slot-Abgleich die noch virtuelle Grundausstattung übersehen.
  if (def.upgradeSlot) await materializeRoom(userId);

  const [user, owned, placedRows, userJob] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { points: true, rankPoints: true } }),
    prisma.roomItem.count({ where: { userId, itemKey } }),
    def.upgradeSlot
      ? prisma.roomItem.findMany({ where: { userId, placed: true } })
      : Promise.resolve([]),
    def.upgradeSlot
      ? prisma.userJob.findUnique({ where: { userId }, select: { jobKey: true } }).catch(() => null)
      : Promise.resolve(null),
  ]);
  if (!user) return { error: "Nicht eingeloggt" };

  // Bewusst KEINE Rang-Schranke mehr beim Kauf (anders als bei Jobs, siehe
  // jobUnlockState in jobs.ts) — Münzen sind die einzige Hürde. `minTier`
  // bleibt als Feld im Katalog stehen (siehe room-items.ts), hat aber keine
  // Kauf-Sperrwirkung mehr.
  if (owned >= def.maxOwned) {
    return { error: def.maxOwned === 1 ? "Das besitzt du schon" : "Davon hast du schon genug" };
  }
  if (user.points < def.price)  return { error: "Nicht genug Münzen" };

  // Upgrade-Slot: das aktuell aufgestellte Vorgänger-Objekt automatisch
  // einlagern, damit nicht z.B. zwei Schreibtische gleichzeitig im Zimmer
  // stehen — außer ein aktiver Job braucht genau dieses Objekt gerade (dann
  // bleibt es stehen, der Kauf klappt trotzdem, wie beim manuellen Einlagern
  // in saveLayout).
  let slotRowToStore: string | null = null;
  if (def.upgradeSlot) {
    const oldRow = placedRows.find(r => getRoomItem(r.itemKey)?.upgradeSlot === def.upgradeSlot);
    if (oldRow) {
      const activeJob = getJob(userJob?.jobKey);
      if (!activeJob) {
        slotRowToStore = oldRow.id;
      } else {
        const remaining: PlacedItem[] = placedRows
          .filter(r => r.id !== oldRow.id)
          .map(r => ({
            id: r.id, key: r.itemKey, zone: coerceSurface(r.zone),
            x: r.x, y: r.y, flipped: r.flipped, starter: r.starter,
          }));
        if (checkRequirements(activeJob, countTags(remaining)).met) slotRowToStore = oldRow.id;
      }
    }
  }

  const created = await prisma.$transaction(async tx => {
    // Wer noch nie etwas verändert hat, bekommt hier sein Zimmer als echte Zeilen.
    await materializeRoom(userId, tx);

    if (slotRowToStore) {
      await tx.roomItem.update({ where: { id: slotRowToStore }, data: { placed: false } });
    }

    const row = await tx.roomItem.create({
      data: {
        // Solange placed:false (Lager), ist die Zone nur ein Platzhalter —
        // der Editor setzt beim Aufstellen eine echte Fläche. Trotzdem ein
        // gültiger RoomSurface-Wert, damit keine Altwerte ("wall") entstehen.
        userId, itemKey, zone: def.zone === "floor" ? "floor" : "wall_back", x: 0, y: 0,
        flipped: false, placed: false, starter: false,
      },
      select: { id: true },
    });
    const updated = await tx.user.update({
      where: { id: userId },
      data:  { points: { decrement: def.price } },
      select: { points: true },
    });
    await tx.pointTransaction.create({
      data: { userId, amount: -def.price, reason: `${COIN_PREFIX} Zimmer: ${def.label} gekauft` },
    });
    return { id: row.id, points: updated.points };
  });

  return { ok: true, roomItemId: created.id, points: created.points, label: def.label };
}

// ── Einrichten ───────────────────────────────────────────────────────────────

export interface LayoutInput {
  id: string; zone: RoomSurface; x: number; y: number; flipped: boolean;
}

/**
 * Speichert ein komplettes Layout. Der Client schickt, was wo steht und was ins
 * Lager soll — der Server prüft alles noch einmal, denn der Editor ist nur die
 * Vorschau, nicht die Instanz, die entscheidet.
 */
export async function saveLayout(
  userId: string,
  placedInput: LayoutInput[],
  storedIds: string[],
): Promise<{ ok: true } | { error: string }> {
  if (!Array.isArray(placedInput) || !Array.isArray(storedIds)) {
    return { error: "Ungültige Daten" };
  }
  if (placedInput.length > MAX_PLACED_ITEMS) {
    return { error: "Zu viele Möbelstücke im Raum" };
  }

  await materializeRoom(userId);

  const rows = await prisma.roomItem.findMany({ where: { userId } });
  const byId = new Map(rows.map(r => [r.id, r]));

  // Wer sein Zimmer noch nie verändert hat, hat DEFAULT_ROOM gesehen — mit
  // synthetischen IDs ("default:bett"), weil es dafür keine Zeilen gab. Genau
  // dieser Aufruf hat sie eben angelegt, also werden die Platzhalter jetzt auf
  // die echten Zeilen abgebildet. Ohne das schlüge der allererste Speichervorgang
  // jedes neuen Users mit "Gehört dir nicht" fehl.
  const starterByKey = new Map(rows.filter(r => r.starter).map(r => [r.itemKey, r.id]));
  const resolveId = (id: string): string => {
    if (!id.startsWith(DEFAULT_ID_PREFIX)) return id;
    return starterByKey.get(id.slice(DEFAULT_ID_PREFIX.length)) ?? id;
  };
  placedInput = placedInput.map(p => ({ ...p, id: resolveId(p.id) }));
  storedIds   = storedIds.map(resolveId);

  // Nur Möbel, die der Katalog kennt und die überhaupt aufstellbar sind,
  // müssen im Payload auftauchen. Flächen liegen auf der Room-Zeile, die
  // Vitrine steht fest außerhalb des Rasters (siehe loadRoom) und taucht im
  // Editor darum nie im Payload auf.
  const relevant = rows.filter(r => {
    const def = getRoomItem(r.itemKey);
    return !!def && !isSurface(def) && r.itemKey !== "vitrine";
  });

  const mentioned = new Set<string>();
  for (const id of [...placedInput.map(p => p.id), ...storedIds]) {
    if (mentioned.has(id))  return { error: "Ein Möbelstück wurde doppelt geschickt" };
    if (!byId.has(id))      return { error: "Gehört dir nicht" };
    mentioned.add(id);
  }
  if (relevant.some(r => !mentioned.has(r.id))) {
    return { error: "Es fehlen Möbelstücke — bitte Seite neu laden" };
  }

  // Fest eingebaute Möbel (Röhrenmonitor, Vitrine, Jobbrett) sind der Zugang zu
  // Profil, Sammlung und Jobbörse — sie dürfen nie im Lager verschwinden.
  for (const id of storedIds) {
    const def = getRoomItem(byId.get(id)!.itemKey);
    if (def && isFixed(def)) {
      return { error: `${def.label} kann nicht eingelagert werden` };
    }
  }

  const placed: PlacedItem[] = placedInput.map(p => {
    const row = byId.get(p.id)!;
    return {
      // `p.zone` ist die vom Client gewählte Fläche (Boden oder EINE der
      // beiden Wände) — validateLayout() gleich danach prüft, ob sie zur
      // Katalog-Klassifikation des Items passt (def.zone "wall"/"floor").
      id: p.id, key: row.itemKey, zone: p.zone,
      x: Math.trunc(p.x), y: Math.trunc(p.y),
      flipped: !!p.flipped, starter: row.starter,
    };
  });

  const geometry = validateLayout(placed);
  if (!geometry.ok) return { error: geometry.error };

  // ── Einlagerungs-Sperre ──────────────────────────────────────────────
  // Wer einen Job hat, darf die Möbel nicht wegräumen, die dieser Job
  // voraussetzt. Verhindern statt bestrafen: so kann niemand ein Setup
  // kaufen, sich anstellen lassen und es danach wieder abbauen.
  const job = await prisma.userJob
    .findUnique({ where: { userId }, select: { jobKey: true } })
    .catch(() => null);
  const activeJob = getJob(job?.jobKey);
  if (activeJob) {
    const { met, missing } = checkRequirements(activeJob, countTags(placed));
    if (!met) {
      return {
        error: `Das braucht dein Job "${activeJob.label}" gerade: ${formatMissing(missing)} — erst kündigen oder einen anderen Job wählen`,
      };
    }
  }

  const storedSet = new Set(storedIds);
  await prisma.$transaction([
    ...placed.map(p =>
      prisma.roomItem.update({
        where: { id: p.id },
        data:  { placed: true, zone: p.zone, x: p.x, y: p.y, flipped: p.flipped },
      })
    ),
    ...[...storedSet].map(id =>
      prisma.roomItem.update({ where: { id }, data: { placed: false } })
    ),
    prisma.room.update({ where: { userId }, data: { updatedAt: new Date() } }),
  ]);

  return { ok: true };
}

// ── Flächen ──────────────────────────────────────────────────────────────────

const MAX_DOOR_SIGN = 24;

export async function setRoomSurfaces(
  userId: string,
  patch: { wallpaperKey?: string; floorKey?: string; doorSign?: string | null },
): Promise<{ ok: true } | { error: string }> {
  const data: { wallpaperKey?: string; floorKey?: string; doorSign?: string | null } = {};

  if (patch.wallpaperKey !== undefined) {
    const def = getRoomItem(patch.wallpaperKey);
    if (!def || def.category !== "tapete")               return { error: "Das ist keine Tapete" };
    if (!(await ownsSurface(userId, patch.wallpaperKey))) return { error: "Diese Tapete besitzt du nicht" };
    data.wallpaperKey = patch.wallpaperKey;
  }

  if (patch.floorKey !== undefined) {
    const def = getRoomItem(patch.floorKey);
    if (!def || def.category !== "bodenbelag")        return { error: "Das ist kein Bodenbelag" };
    if (!(await ownsSurface(userId, patch.floorKey))) return { error: "Diesen Bodenbelag besitzt du nicht" };
    data.floorKey = patch.floorKey;
  }

  if (patch.doorSign !== undefined) {
    if (patch.doorSign === null) {
      data.doorSign = null;
    } else {
      if (typeof patch.doorSign !== "string") return { error: "Ungültiges Türschild" };
      const clean = patch.doorSign.trim();
      if (clean.length > MAX_DOOR_SIGN) {
        return { error: `Türschild darf höchstens ${MAX_DOOR_SIGN} Zeichen haben` };
      }
      data.doorSign = clean || null;
    }
  }

  if (Object.keys(data).length === 0) return { error: "Nichts zu ändern" };

  await materializeRoom(userId);
  await prisma.room.update({ where: { userId }, data });
  return { ok: true };
}
