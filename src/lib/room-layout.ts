/**
 * Raster-Geometrie und Platzierungs-Regeln des Gaming-Zimmers.
 *
 * Reiner Code ohne Prisma: Client (Editor) und Server (PUT /api/room/layout)
 * importieren dieselben Funktionen, damit die Vorschau im Editor exakt das
 * erlaubt, was der Server auch akzeptiert — und dieselbe deutsche Fehlermeldung
 * zeigt.
 */

import { getRoomItem, isSurface, type RoomItemDef, type RoomTag, type RoomZone } from "./room-items";

/**
 * EIN gemeinsames Raster für Wand und Boden, keine zwei gestapelten Zonen
 * mehr. Grund: die Bühne ist eine reine Frontalansicht ohne Bodenperspektive
 * — man sieht in dieser Logik gar keine Bodenfläche, man blickt direkt auf
 * eine Wand. Zwei separate Flächen (Wandtextur oben, Bodentextur unten mit
 * eigener Sockelleiste) suggerierten fälschlich, Möbel würden auf einem
 * sichtbaren Boden LIEGEN statt vor der Wand STEHEN. Jetzt teilen sich Wand-
 * und Boden-Objekte dieselben 28×9 Zellen; der einzige verbleibende
 * Unterschied ist keine Geometrie mehr, sondern reine Platzierungsregel:
 * `mustStandOn: "floor"` zwingt ein Möbelstück mit der Unterkante in die
 * letzte Zeile (steht "auf dem Boden"), alles andere (Wanddeko, freie
 * Peripherie) darf irgendwo im Raster hängen.
 *
 * `wall`/`floor` bleiben als IDENTISCHE Objekte bestehen (nicht zu einem
 * einzigen GRID vereinfacht), damit `GRID[zone]`-Aufrufe an anderer Stelle
 * unverändert funktionieren — die Zone existiert als Katalog-Feld weiter
 * (Shop-Gruppierung, Fehlertexte "gehört an die Wand"), bestimmt aber keine
 * eigene Koordinatenfläche mehr.
 *
 * 28 Spalten, 9 Zeilen (vorher 4 Wand- + 5 Bodenzeilen getrennt gestapelt —
 * in Summe dieselbe Bühnenhöhe wie zuvor, nur nicht mehr versetzt).
 */
export const GRID = {
  wall:  { cols: 28, rows: 9 },
  floor: { cols: 28, rows: 9 },
} as const;

/** SVG-Einheiten pro Rasterzelle. Die Bühne ist 1792 × 576 groß. */
export const CELL = 64;

export const STAGE = {
  width:      GRID.wall.cols * CELL,   // 1792
  wallHeight: GRID.wall.rows * CELL,   // 576 — jetzt die volle Bühnenhöhe
  floorTop:   0,                       // kein Versatz mehr: Boden = Wand-Ursprung
  height:     GRID.wall.rows * CELL,   // 576 (unverändert ggü. vorher 4+5 Zeilen)
} as const;

/** Rasterkoordinate → SVG-Koordinate. Wand und Boden teilen sich denselben
 *  Ursprung — `zone` bleibt Parameter für Aufrufer, beeinflusst aber die
 *  Position nicht mehr. */
export function cellToSvg(_zone: RoomZone, x: number, y: number): { x: number; y: number } {
  return { x: x * CELL, y: y * CELL };
}

export interface PlacedItem {
  /** RoomItem.id — bei DEFAULT_ROOM synthetisch, z.B. "default:schreibtisch_alt". */
  id:      string;
  key:     string;
  zone:    RoomZone;
  x:       number;
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
 * redundant (siehe room-items.ts).
 */
export const DEFAULT_PLACEMENTS: { key: string; zone: RoomZone; x: number; y: number }[] = [
  { key: "bett",             zone: "floor", x: 1, y: 7 },
  { key: "schreibtisch_alt", zone: "floor", x: 7, y: 6 },
  { key: "roehrenmonitor",   zone: "floor", x: 9, y: 4 },
  { key: "pc_billig",        zone: "floor", x: 15, y: 7 },
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

export function fitsGrid(def: RoomItemDef, x: number, y: number, zone: RoomZone): boolean {
  const grid = GRID[zone];
  return Number.isInteger(x) && Number.isInteger(y)
    && x >= 0 && y >= 0
    && x + def.w <= grid.cols
    && y + def.h <= grid.rows;
}

/** Alle Zellen, die von einem Tisch belegt sind — Basis für mustStandOn: "desk". */
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
  if (def.zone !== candidate.zone) {
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

  // Wand- und Boden-Objekte teilen sich seit der Zusammenlegung dieselbe
  // Koordinatenfläche — hier darf NICHT mehr nach Zone gefiltert werden,
  // sonst würden Objekte unterschiedlicher (Katalog-)Zone sich unbemerkt
  // überlappen dürfen.
  const others = placed.filter(p => p.id !== candidate.id);
  const rect   = rectOf(candidate, def);
  for (const other of others) {
    const otherDef = getRoomItem(other.key);
    if (!otherDef) continue;
    if (rectsOverlap(rect, rectOf(other, otherDef))) {
      return { ok: false, error: `Da steht schon etwas: ${otherDef.label}` };
    }
  }

  if (def.mustStandOn === "floor" && candidate.y + def.h !== GRID.floor.rows) {
    return { ok: false, error: `${def.label} muss auf dem Boden stehen` };
  }
  if (def.mustStandOn === "desk") {
    const desks = deskCells(others);
    for (let dx = 0; dx < def.w; dx++) {
      if (!desks.has(`${candidate.x + dx},${candidate.y + def.h}`)) {
        return { ok: false, error: `${def.label} muss auf einem Tisch stehen` };
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
 * Plätze aus, ohne eine zweite Regel-Implementierung zu brauchen.
 */
export function legalCells(placed: PlacedItem[], candidate: PlacedItem): { x: number; y: number }[] {
  const def = getRoomItem(candidate.key);
  if (!def) return [];
  const grid  = GRID[def.zone];
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y + def.h <= grid.rows; y++) {
    for (let x = 0; x + def.w <= grid.cols; x++) {
      if (validatePlacement(placed, { ...candidate, zone: def.zone, x, y }).ok) cells.push({ x, y });
    }
  }
  return cells;
}
