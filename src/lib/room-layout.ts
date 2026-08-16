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
  /** Zusätzliche Boden-Drehung in 90°-Schritten (0-3), on top of der festen
   *  Wand-Grundausrichtung (surfaceRotationY) — nur für Boden-Objekte
   *  gedacht, Wand-Objekte bleiben unverändert flach an der Wand. */
  rotation: number;
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
 * Quadratisches 8×8-Bodenraster (siehe ISO_GRID in room-grid.ts). Der
 * Schreibtisch ist bewusst groß (siehe room-items.ts) und bildet das
 * Herzstück; der (ebenfalls große, 2×2) Röhrenmonitor steht mit der
 * Unterkante exakt auf seiner Tischplatte (mustStandOn:"desk"). Die Vitrine
 * beansprucht als festes Bühnenelement die rechten beiden Spalten
 * (x = width-2..width-1, siehe VITRINE_MARKER in RoomStage3D.tsx) — Tisch,
 * PC und Teppich sind bewusst so platziert, dass nichts davon in dieses
 * feste Rechteck hineinragt.
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
  { key: "schreibtisch_alt", zone: "floor", x: 0, y: 4 },
  { key: "roehrenmonitor",   zone: "floor", x: 2, y: 4 },
  { key: "pc_billig",        zone: "floor", x: 6, y: 5 },
  // Runder OMA-Teppich: im offenen Bereich zwischen Rückwand und
  // Schreibtisch, links der Vitrine-Spalten.
  { key: "teppich_rund_logo", zone: "floor", x: 2, y: 0 },
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
    flipped: false, rotation: 0, starter: true,
  })),
  stored:       [],
  materialized: false,
};

// ── Geometrie ────────────────────────────────────────────────────────────────

interface Rect { x: number; y: number; w: number; h: number }

/**
 * Tatsächlicher Platzbedarf (w×h) unter Berücksichtigung der Boden-Drehung —
 * bei 90°/270° (rotation 1 oder 3) tauschen Breite und Tiefe. Ohne das blieb
 * die Kollisions-/Raster-Prüfung nach dem Drehen auf der UNGEDREHTEN Fläche
 * hängen: ein 2×1-Objekt sah nach dem Drehen visuell wie 1×2 aus, wurde aber
 * weiterhin als 2×1 kollidiert/validiert — bei nicht-quadratischen Objekten
 * genau der Grund, warum sich Drehen "falsch" anfühlte (Überlappungen bzw.
 * Rasterprüfung passten nicht zur sichtbaren Silhouette). Nur für den Boden
 * relevant — Wand-Objekte drehen sich nicht per `rotation` (siehe rotate()
 * in RoomEditor.tsx).
 */
export function footprint(def: RoomItemDef, zone: RoomSurface, rotation: number): { w: number; h: number } {
  const swapped = zone === "floor" && (((rotation % 4) + 4) % 4) % 2 === 1;
  return swapped ? { w: def.h, h: def.w } : { w: def.w, h: def.h };
}

function rectOf(item: PlacedItem, def: RoomItemDef): Rect {
  const { w, h } = footprint(def, item.zone, item.rotation);
  return { x: item.x, y: item.y, w, h };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function fitsGrid(
  def: RoomItemDef, x: number, y: number, zone: RoomSurface, rotation = 0,
): boolean {
  const grid = GRID[zone];
  const { w, h } = footprint(def, zone, rotation);
  return Number.isInteger(x) && Number.isInteger(y)
    && x >= 0 && y >= 0
    && x + w <= grid.cols
    && y + h <= grid.rows;
}

/**
 * Alle Boden-Zellen (x,y=Tiefe), die von einem Tisch ODER einer sonstigen
 * Ablagefläche (Kommode, Konsolentisch — Tag "surface") belegt sind — Basis
 * für mustStandOn:"desk". In der isometrischen Ansicht "steht" ein Monitor
 * auf seiner Unterlage, indem er dieselbe Grundfläche (x,y) belegt (visuell
 * angehoben rendert RoomStage3D.tsx über einen festen Y-Höhenversatz, das ist
 * reine Optik und fließt hier nicht mit ein). "desk" und "surface" teilen
 * sich dieselbe Prüfung — ein Monitor unterscheidet nicht, ob er auf einem
 * echten Schreibtisch oder einer Kommode steht, beides ist eine gültige
 * Stellfläche.
 */
export function standCells(placed: PlacedItem[]): Set<string> {
  const cells = new Set<string>();
  for (const item of placed) {
    const def = getRoomItem(item.key);
    if (!def || item.zone !== "floor") continue;
    if (!def.tags.includes("desk") && !def.tags.includes("surface")) continue;
    const { w, h } = footprint(def, item.zone, item.rotation);
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) cells.add(`${item.x + dx},${item.y + dy}`);
    }
  }
  return cells;
}

/**
 * Wand-Pendant zu standCells: alle Zellen, die von einem Regal (Tag "shelf"/
 * "trophy_shelf") belegt sind — Basis für mustStandOn:"shelf" (kleine Deko
 * "im" Regal). Pro Wand getrennt (Rückschlüssel `zone:x,y`), damit ein Regal
 * an der Rückwand keine Deko an der Seitenwand trägt, nur weil die (x,y)-
 * Koordinaten zufällig übereinstimmen — die vier Wände sind eigene
 * Koordinatenräume, siehe room-3d.ts.
 */
export function shelfCells(placed: PlacedItem[]): Set<string> {
  const cells = new Set<string>();
  for (const item of placed) {
    const def = getRoomItem(item.key);
    if (!def || item.zone === "floor") continue;
    if (!def.tags.includes("shelf") && !def.tags.includes("trophy_shelf")) continue;
    for (let dx = 0; dx < def.w; dx++) {
      for (let dy = 0; dy < def.h; dy++) cells.add(`${item.zone}:${item.x + dx},${item.y + dy}`);
    }
  }
  return cells;
}

/**
 * Welche Items in `placed` gerade "schweben" — ihr mustStandOn-Anspruch
 * (Tisch/Ablage bzw. Regal) ist NICHT durch den Rest von `placed` gedeckt.
 * Wird gebraucht, um beim automatischen Einlagern eines Tisch-/Regal-Upgrades
 * (siehe purchaseRoomItem in room.ts) alle darauf stehenden Objekte GLEICH
 * MIT einzulagern, statt sie unsichtbar schwebend zurückzulassen — genau das
 * ist sonst der Bug: ein neuer Schreibtisch verdrängt den alten, Monitore
 * bleiben ohne Unterlage stehen und lassen sich später nicht mehr sauber
 * speichern, weil validateLayout() jede weitere Änderung ablehnt, solange sie
 * noch schweben.
 */
export function orphanedStandItems(placed: PlacedItem[]): PlacedItem[] {
  const stands  = standCells(placed);
  const shelves = shelfCells(placed);
  return placed.filter(item => {
    const def = getRoomItem(item.key);
    if (!def) return false;
    if (def.mustStandOn === "desk") {
      const { w, h } = footprint(def, item.zone, item.rotation);
      for (let dx = 0; dx < w; dx++) {
        for (let dy = 0; dy < h; dy++) {
          if (!stands.has(`${item.x + dx},${item.y + dy}`)) return true;
        }
      }
    }
    if (def.mustStandOn === "shelf") {
      for (let dx = 0; dx < def.w; dx++) {
        for (let dy = 0; dy < def.h; dy++) {
          if (!shelves.has(`${item.zone}:${item.x + dx},${item.y + dy}`)) return true;
        }
      }
    }
    return false;
  });
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
  if (!fitsGrid(def, candidate.x, candidate.y, candidate.zone, candidate.rotation)) {
    return { ok: false, error: `${def.label} passt nicht ins Raster` };
  }

  // Überlappung nur zwischen Objekten auf DERSELBEN Fläche — Rückwand,
  // Seitenwand und Boden sind jetzt drei getrennte Koordinatenräume, ein
  // Wandobjekt bei (2,1) kann kein Bodenobjekt bei (2,1) überdecken.
  //
  // Ausnahme: ein mustStandOn:"desk"/"shelf"-Objekt (Monitor, Deko-Pokal & Co.)
  // TEILT sich absichtlich die Fläche mit seiner Unterlage (Tisch/Kommode für
  // "desk", Regal für "shelf" — siehe standCells/shelfCells weiter unten) —
  // das ist kein Konflikt, sondern "steht drauf/drin". Nur die Überlappung
  // mit ANDEREN, nicht-tragenden Objekten zählt.
  const others = placed.filter(p => p.id !== candidate.id && p.zone === candidate.zone);
  const rect    = rectOf(candidate, def);
  for (const other of others) {
    const otherDef = getRoomItem(other.key);
    if (!otherDef) continue;
    const providesStand = (d: RoomItemDef) => d.tags.includes("desk") || d.tags.includes("surface");
    const providesShelf = (d: RoomItemDef) => d.tags.includes("shelf") || d.tags.includes("trophy_shelf");
    // canAlsoStandOn erlaubt dieselbe Überlappung wie mustStandOn, ist aber
    // nicht verpflichtend — ein Headset darf auf dem Tisch stehen, MUSS aber
    // nicht (anders als ein Monitor).
    const mayStandOn = (d: RoomItemDef, kind: "desk" | "shelf") =>
      d.mustStandOn === kind || !!d.canAlsoStandOn?.includes(kind);
    const isStandPairing =
      (mayStandOn(def, "desk") && providesStand(otherDef)) ||
      (mayStandOn(otherDef, "desk") && providesStand(def)) ||
      (mayStandOn(def, "shelf") && providesShelf(otherDef)) ||
      (mayStandOn(otherDef, "shelf") && providesShelf(def));
    if (isStandPairing) continue;
    if (rectsOverlap(rect, rectOf(other, otherDef))) {
      return { ok: false, error: `Da steht schon etwas: ${otherDef.label}` };
    }
  }

  // mustStandOn:"floor" braucht keine geometrische Prüfung mehr: Boden-Objekte
  // sind durch den Zonen-Check oben bereits zwingend auf der Bodenfläche.
  if (def.mustStandOn === "desk") {
    const stands = standCells(placed.filter(p => p.id !== candidate.id));
    for (let dx = 0; dx < def.w; dx++) {
      for (let dy = 0; dy < def.h; dy++) {
        if (!stands.has(`${candidate.x + dx},${candidate.y + dy}`)) {
          return { ok: false, error: `${def.label} muss auf einem Tisch oder einer Ablage stehen` };
        }
      }
    }
  }
  if (def.mustStandOn === "shelf") {
    const shelves = shelfCells(placed.filter(p => p.id !== candidate.id));
    for (let dx = 0; dx < def.w; dx++) {
      for (let dy = 0; dy < def.h; dy++) {
        if (!shelves.has(`${candidate.zone}:${candidate.x + dx},${candidate.y + dy}`)) {
          return { ok: false, error: `${def.label} muss in einem Regal stehen` };
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
 * kaufbaren Einzel-Items ≈ 93.000, plus beliebig viel mehr durch unbegrenzt
 * nachkaufbare Deko-Items). Bewusst deutlich angehoben (vorher 2.000/8.000/
 * 20.000): seit die Rang-Schranke beim Kauf weggefallen ist (siehe
 * purchaseRoomItem in room.ts), war die Endstufe zu schnell erreicht — jetzt
 * ist Stufe 2 ein spürbares Zwischenziel, Stufe 4 ein echtes Langzeit-Ziel
 * über mehrere Wochen Idle-Job-Verdienst statt ein paar Tage.
 */
export const ROOM_LEVEL_THRESHOLDS = [0, 4000, 15000, 40000] as const;

/**
 * Summe der Kaufpreise aller besessenen Möbel — AUFGESTELLT und EINGELAGERT
 * zählen gleichermaßen. Die Ausbaustufe soll den investierten Münzwert
 * widerspiegeln, nicht die aktuelle Zimmer-Deko: Ins Lager legen (z.B. um
 * umzuräumen oder weil gerade kein Platz ist) darf die Stufe nicht wieder
 * herabsetzen, sonst bestraft Aufräumen/Umdekorieren den User für etwas, das
 * er längst bezahlt hat. `stored` ist optional (Default leer), damit ältere
 * Aufrufer, die nur `placed` kennen, weiter kompilieren — liefert dann aber
 * bewusst nur die aufgestellte Teilsumme.
 */
export function roomInvestment(placed: PlacedItem[], stored: StoredItem[] = []): number {
  let total = 0;
  for (const item of placed) {
    const def = getRoomItem(item.key);
    if (def) total += def.price;
  }
  for (const item of stored) {
    const def = getRoomItem(item.key);
    if (def) total += def.price;
  }
  return total;
}

/**
 * 0 (Grundausstattung) bis thresholds.length - 1 (voll ausgebaut). `thresholds`
 * ist optional (Default ROOM_LEVEL_THRESHOLDS) — Admins können die Stufe-1/2/3-
 * Schwellen im Admin-Panel verstellen (siehe RoomConfig.levelThresholds in
 * room-config.ts); Aufrufer mit Zugriff auf die aktuelle Config sollten
 * `[0, ...cfg.levelThresholds]` durchreichen, alle anderen (z.B. Badge-
 * Berechnung ohne geladene Config) fallen auf den Standard zurück.
 */
export function roomLevel(
  placed: PlacedItem[], stored: StoredItem[] = [], thresholds: readonly number[] = ROOM_LEVEL_THRESHOLDS,
): number {
  const total = roomInvestment(placed, stored);
  let level = 0;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (total >= thresholds[i]) { level = i; break; }
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
    // Schleifengrenzen berücksichtigen die Boden-Drehung (footprint) — sonst
    // übersieht das Absuchen Zellen nahe am Rand, die nur mit der gedrehten
    // (getauschten) Breite/Tiefe passen würden.
    const { w, h } = footprint(def, zone, candidate.rotation);
    for (let y = 0; y + h <= grid.rows; y++) {
      for (let x = 0; x + w <= grid.cols; x++) {
        if (validatePlacement(placed, { ...candidate, zone, x, y }).ok) cells.push({ zone, x, y });
      }
    }
  }
  return cells;
}
