/**
 * Raster-Geometrie und Platzierungs-Regeln des Gaming-Zimmers.
 *
 * Reiner Code ohne Prisma: Client (Editor) und Server (PUT /api/room/layout)
 * importieren dieselben Funktionen, damit die Vorschau im Editor exakt das
 * erlaubt, was der Server auch akzeptiert — und dieselbe deutsche Fehlermeldung
 * zeigt.
 */

import { getRoomItem, isSurface, type RoomItemDef, type RoomTag } from "./room-items";
import { ISO_GRID, type RoomSurface } from "./room-grid";

export type { RoomSurface } from "./room-grid";

/**
 * Fünf Rasterflächen (vier Wände + Boden) — siehe room-3d.ts für die
 * Weltkoordinaten-Projektion. `GRID` bleibt der Name, den Validierung und
 * Editor kennen; die konkreten Größen kommen aus `ISO_GRID`, damit
 * Projektions- und Platzierungs-Raster nie auseinanderlaufen.
 *
 * `RoomItemDef.zone` (aus room-items.ts) bleibt die GROBE Katalog-Klassifikation
 * ("wall" | "floor" — welche Art Möbelstück ist das). `PlacedItem.zone` ist die
 * FEINE, tatsächliche Fläche, auf der es gerade steht/hängt (`RoomSurface`:
 * "floor" | "wall_back" | "wall_side" | "wall_front" | "wall_right") — ein
 * Wand-Objekt darf auf JEDER der vier Wände hängen, ein Boden-Objekt nur auf
 * dem Boden. Diese Entkopplung vermeidet, dass jedes Deko-Item im Katalog
 * explizit "welche Wand" festlegen muss.
 */
export const GRID = ISO_GRID;

/**
 * SVG-Einheiten pro Rasterzelle — nur noch für die REINE Sprite-Größe
 * (`RoomItemSprite.tsx`: `def.w * CELL`), nicht mehr für Positionierung. Die
 * Positionierung läuft jetzt ausschließlich über die Projektionsfunktionen in
 * room-iso.ts (`TILE_W`/`TILE_H`/`WALL_UNIT`). Zahlenwert bewusst identisch zu
 * `WALL_UNIT`, damit ein Wandobjekt mit `w:2,h:2` optisch genauso groß bleibt
 * wie vor der Umstellung.
 */
export const CELL = 64;

export interface PlacedItem {
  /** RoomItem.id — bei DEFAULT_ROOM synthetisch, z.B. "default:schreibtisch_alt". */
  id:      string;
  key:     string;
  zone:    RoomSurface;
  /** Spalte auf der jeweiligen Fläche (X-Achse in room-iso.ts). */
  x:       number;
  /**
   * Zweite Achse — ihre Bedeutung hängt von `zone` ab: auf "floor" ist es die
   * Tiefe (Z, 0 = an der Rückwand), auf "wall_back"/"wall_side" ist es die
   * Höhe ab Boden (Y). Bewusst weiter `y` genannt (nicht `z`/`depth`) statt
   * eines dritten Feldes, damit sich am RoomItem-DB-Schema (x/y, kein z)
   * nichts ändern muss — nur die Interpretation ist neu.
   */
  y:       number;
  flipped: boolean;
  starter: boolean;
}

export interface StoredItem {
  id:  string;
  key: string;
}

export interface RoomState {
  wallpaperKey: string;
  floorKey:     string;
  doorSign:     string | null;
  placed:       PlacedItem[];
  stored:       StoredItem[];
  /** false = reines Default-Layout, es existiert noch keine Room-Zeile. */
  materialized: boolean;
}

/** Obergrenze, damit ein fehlerhafter Client keine unbegrenzten Zeilen erzeugt. */
export const MAX_PLACED_ITEMS = 200;

// ── Grundausstattung ─────────────────────────────────────────────────────────

/**
 * Das Zimmer, das JEDER User sieht, solange er nichts verändert hat —
 * gerendert ohne einen einzigen Datenbankzugriff. Sobald er etwas kauft oder
 * umstellt, legt materializeRoom() genau diese Möbel als echte Zeilen an.
 */
/**
 * Die Grundausstattung sitzt bewusst mit deutlichem Rand nach links UND rechts:
 * bei 28 Spalten bleiben so reichlich Bodenspalten frei, damit sich gekaufte
 * Möbel sofort aufstellen lassen, ohne vorher etwas einlagern zu müssen. Schon
 * die 120-Münzen-Steckdosenleiste wäre sonst eine Sackgasse.
 *
 * Boden-Objekte (mustStandOn:"floor") stehen mit der Unterkante in der
 * letzten Zeile (y + h === GRID.floor.rows === 9) — es gibt keine separate
 * Bodenzone mehr, "unten" ist einfach die unterste Zeile des gemeinsamen
 * Rasters. Der Schreibtisch ist bewusst groß (siehe room-items.ts) und bildet
 * das Herzstück; der (ebenfalls große, 2×2) Röhrenmonitor steht mit der
 * Unterkante exakt auf seiner Tischplatte (mustStandOn:"desk").
 *
 * Kein Jobbrett mehr: die Jobbörse öffnet sich über den Button in der
 * Aktionsleiste unter dem Zimmer, ein zusätzliches Wand-Objekt dafür war
 * redundant (siehe room-items.ts). Ebenso kein Bett mehr — das Zimmer ist
 * als Gaming-/Streaming-Setup gedacht, kein Schlafzimmer.
 */
export const DEFAULT_PLACEMENTS: { key: string; zone: RoomSurface; x: number; y: number }[] = [
  // Boden: x = Spalte, y = Tiefe (0 = an der Rückwand). Der Schreibtisch
  // steht mit der Vorderkante nah am Betrachter (großes y), der Monitor
  // teilt sich dieselbe (x,y)-Grundfläche — er "steht" auf dem Tisch, siehe
  // mustStandOn:"desk" in validatePlacement.
  { key: "schreibtisch_alt", zone: "floor", x: 2, y: 3 },
  { key: "roehrenmonitor",   zone: "floor", x: 4, y: 3 },
  { key: "pc_billig",        zone: "floor", x: 0, y: 4 },
  // Vitrine bewusst NICHT hier: sie ist ein festes Bühnenelement mit fixer
  // Position (siehe RoomStage.tsx, VitrinePanel), kein Katalog-Platzierung.
];

/**
 * Präfix der synthetischen IDs im Standard-Zimmer. Für diese Möbel gibt es noch
 * keine Datenbankzeilen — beim ersten Speichern bildet saveLayout() sie auf die
 * dann angelegten echten Zeilen ab.
 */
export const DEFAULT_ID_PREFIX = "default:";

export const DEFAULT_ROOM: RoomState = {
  wallpaperKey: "tapete_raufaser",
  floorKey:     "boden_linoleum",
  doorSign:     null,
  placed: DEFAULT_PLACEMENTS.map(p => ({
    id: `${DEFAULT_ID_PREFIX}${p.key}`, key: p.key, zone: p.zone, x: p.x, y: p.y,
    flipped: false, starter: true,
  })),
  stored:       [],
  materialized: false,
};

// ── Geometrie ────────────────────────────────────────────────────────────────

interface Rect { x: number; y: number; w: number; h: number }

function rectOf(item: PlacedItem, def: RoomItemDef): Rect {
  return { x: item.x, y: item.y, w: def.w, h: def.h };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function fitsGrid(def: RoomItemDef, x: number, y: number, zone: RoomSurface): boolean {
  const grid = GRID[zone];
  return Number.isInteger(x) && Number.isInteger(y)
    && x >= 0 && y >= 0
    && x + def.w <= grid.cols
    && y + def.h <= grid.rows;
}

/**
 * Alle Boden-Zellen (x,y=Tiefe), die von einem Tisch belegt sind — Basis für
 * mustStandOn:"desk". In der isometrischen Ansicht "steht" ein Monitor auf
 * einem Tisch, indem er dieselbe Grundfläche (x,y) belegt wie der Tisch
 * selbst (visuell angehoben rendert RoomStage.tsx über einen festen
 * Y-Höhenversatz, das ist reine Optik und fließt hier nicht mit ein).
 */
function deskCells(placed: PlacedItem[]): Set<string> {
  const cells = new Set<string>();
  for (const item of placed) {
    const def = getRoomItem(item.key);
    if (!def || item.zone !== "floor" || !def.tags.includes("desk")) continue;
    for (let dx = 0; dx < def.w; dx++) {
      for (let dy = 0; dy < def.h; dy++) cells.add(`${item.x + dx},${item.y + dy}`);
    }
  }
  return cells;
}

/**
 * Prüft EINE Platzierung gegen Raster, Zone, Überlappung und Untergrund.
 * `placed` ist der Bestand OHNE den Kandidaten (gleiche id wird ignoriert).
 */
export function validatePlacement(
  placed: PlacedItem[],
  candidate: PlacedItem,
): { ok: true } | { ok: false; error: string } {
  const def = getRoomItem(candidate.key);
  if (!def)               return { ok: false, error: "Unbekanntes Möbelstück" };
  if (isSurface(def))     return { ok: false, error: "Tapeten und Böden werden nicht aufgestellt" };

  // Katalog-Klassifikation (def.zone: grob "wall"/"floor") gegen die
  // tatsächliche Fläche (candidate.zone: "floor"/"wall_back"/"wall_side") —
  // ein Wand-Objekt darf auf JEDER der beiden Wände stehen, ein Boden-Objekt
  // ausschließlich auf dem Boden.
  const zoneOk = def.zone === "floor" ? candidate.zone === "floor" : candidate.zone !== "floor";
  if (!zoneOk) {
    return {
      ok: false,
      error: def.zone === "wall"
        ? `${def.label} gehört an die Wand`
        : `${def.label} gehört auf den Boden`,
    };
  }
  if (!fitsGrid(def, candidate.x, candidate.y, candidate.zone)) {
    return { ok: false, error: `${def.label} passt nicht ins Raster` };
  }

  // Überlappung nur zwischen Objekten auf DERSELBEN Fläche — Rückwand,
  // Seitenwand und Boden sind jetzt drei getrennte Koordinatenräume, ein
  // Wandobjekt bei (2,1) kann kein Bodenobjekt bei (2,1) überdecken.
  //
  // Ausnahme: ein mustStandOn:"desk"-Objekt (Monitor & Co.) TEILT sich
  // absichtlich die Grundfläche mit seinem Tisch (siehe deskCells weiter
  // unten) — das ist kein Konflikt, sondern "steht auf dem Tisch". Nur die
  // Überlappung mit ANDEREN, nicht-desk-tragenden Objekten zählt.
  const others = placed.filter(p => p.id !== candidate.id && p.zone === candidate.zone);
  const rect    = rectOf(candidate, def);
  for (const other of others) {
    const otherDef = getRoomItem(other.key);
    if (!otherDef) continue;
    const isDeskPairing =
      (def.mustStandOn === "desk" && otherDef.tags.includes("desk")) ||
      (otherDef.mustStandOn === "desk" && def.tags.includes("desk"));
    if (isDeskPairing) continue;
    if (rectsOverlap(rect, rectOf(other, otherDef))) {
      return { ok: false, error: `Da steht schon etwas: ${otherDef.label}` };
    }
  }

  // mustStandOn:"floor" braucht keine geometrische Prüfung mehr: Boden-Objekte
  // sind durch den Zonen-Check oben bereits zwingend auf der Bodenfläche.
  if (def.mustStandOn === "desk") {
    const desks = deskCells(placed.filter(p => p.id !== candidate.id));
    for (let dx = 0; dx < def.w; dx++) {
      for (let dy = 0; dy < def.h; dy++) {
        if (!desks.has(`${candidate.x + dx},${candidate.y + dy}`)) {
          return { ok: false, error: `${def.label} muss auf einem Tisch stehen` };
        }
      }
    }
  }

  return { ok: true };
}

/** Validiert ein KOMPLETTES Layout — der verbindliche Server-Pfad. */
export function validateLayout(placed: PlacedItem[]): { ok: true } | { ok: false; error: string } {
  if (placed.length > MAX_PLACED_ITEMS) {
    return { ok: false, error: "Zu viele Möbelstücke im Raum" };
  }

  const seen = new Set<string>();
  for (const item of placed) {
    if (seen.has(item.id)) return { ok: false, error: "Ein Möbelstück wurde doppelt platziert" };
    seen.add(item.id);
  }

  // Raster, Zone und Überlappung: jedes Item gegen alle bereits geprüften.
  for (let i = 0; i < placed.length; i++) {
    const rest   = placed.filter((_, j) => j !== i);
    const result = validatePlacement(rest, placed[i]);
    if (!result.ok) return result;
  }

  return { ok: true };
}

/** Zählt platzierte Tags — Grundlage der Job-Setup-Anforderungen. */
export function countTags(placed: PlacedItem[]): Partial<Record<RoomTag, number>> {
  // Die Vitrine steht als festes Bühnenelement fest, unabhängig von `placed`
  // (siehe RoomStage.tsx, FixedVitrine) — für Job-Anforderungen zählt sie
  // trotzdem immer als vorhanden, sonst würde z.B. "clan_boss" nie erfüllbar.
  const counts: Partial<Record<RoomTag, number>> = { vitrine: 1 };
  for (const item of placed) {
    const def = getRoomItem(item.key);
    if (!def) continue;
    for (const tag of def.tags) counts[tag] = (counts[tag] ?? 0) + 1;
  }
  return counts;
}

/**
 * Investitions-Stufe des Zimmers: Fenster und Deckenlampe (feste
 * Bühnenelemente, siehe RoomStage.tsx, RoomWindow/CeilingLamp) werten sich
 * automatisch auf, je mehr Münzen aktuell in aufgestellte Möbel stecken —
 * kein eigenes Katalog-Item, sondern ein Nebeneffekt des Einrichtens selbst.
 * Bewusst nur AUFGESTELLTE Möbel zählen (nicht das Lager): die Stufe soll
 * widerspiegeln, wie das Zimmer gerade tatsächlich AUSSIEHT, nicht was der
 * User insgesamt besitzt. Grundausstattung kostet 0 und zieht die Stufe
 * dadurch automatisch nicht hoch.
 *
 * Schwellen an der Preisspanne des Katalogs ausgerichtet (Summe aller
 * kaufbaren Items ≈ 70.000): Stufe 1 ist mit ein bis zwei mittleren Käufen
 * erreichbar, Stufe 3 verlangt einen echten Endgame-Einsatz (z.B. High-End-PC
 * oder LED-Wand).
 */
export const ROOM_LEVEL_THRESHOLDS = [0, 2000, 8000, 20000] as const;

/** Summe der Kaufpreise aller aktuell AUFGESTELLTEN (nicht eingelagerten) Möbel. */
export function roomInvestment(placed: PlacedItem[]): number {
  let total = 0;
  for (const item of placed) {
    const def = getRoomItem(item.key);
    if (def) total += def.price;
  }
  return total;
}

/** 0 (Grundausstattung) bis ROOM_LEVEL_THRESHOLDS.length - 1 (voll ausgebaut). */
export function roomLevel(placed: PlacedItem[]): number {
  const total = roomInvestment(placed);
  let level = 0;
  for (let i = ROOM_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (total >= ROOM_LEVEL_THRESHOLDS[i]) { level = i; break; }
  }
  return level;
}

/**
 * Freie Zielzellen für ein Item — der Editor leuchtet damit die erlaubten
 * Plätze aus, ohne eine zweite Regel-Implementierung zu brauchen. Boden-Items
 * durchsuchen nur die Bodenfläche; Wand-Items durchsuchen BEIDE Wände (ein
 * Wandobjekt darf frei zwischen Rückwand und Seitenwand wechseln).
 */
export function legalCells(
  placed: PlacedItem[], candidate: PlacedItem,
): { zone: RoomSurface; x: number; y: number }[] {
  const def = getRoomItem(candidate.key);
  if (!def) return [];
  const surfaces: RoomSurface[] = def.zone === "floor"
    ? ["floor"]
    : ["wall_back", "wall_side", "wall_front", "wall_right"];
  const cells: { zone: RoomSurface; x: number; y: number }[] = [];
  for (const zone of surfaces) {
    const grid = GRID[zone];
    for (let y = 0; y + def.h <= grid.rows; y++) {
      for (let x = 0; x + def.w <= grid.cols; x++) {
        if (validatePlacement(placed, { ...candidate, zone, x, y }).ok) cells.push({ zone, x, y });
      }
    }
  }
  return cells;
}
