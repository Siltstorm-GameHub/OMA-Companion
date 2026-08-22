import type { RoomCategory } from "@/lib/room-items";

export interface MancaveScreenRect { x0: number; y0: number; x1: number; y1: number; }

/**
 * Kategorien, die "sinnvoll auf/um den Schreibtisch" stehen — genau die
 * Teilmenge der Gaming-Zimmer-Möbel, die in der Mancave-Szene als Gadgets
 * auftauchen. Tapeten/Böden/Poster/Pflanzen/Vitrine etc. bleiben draußen.
 * "schreibtisch" bewusst NICHT dabei — der Tisch IST die Bühne selbst.
 * "sitzen" (Stuhl) bewusst NICHT dabei — die Ego-Perspektive sitzt der User
 * SELBST auf dem Stuhl, der taucht im eigenen Blickfeld nicht auf.
 */
export const MANCAVE_GADGET_CATEGORIES: RoomCategory[] = [
  "rechner", "bildschirm", "peripherie", "licht", "konsole",
];

/** Wo in der Ego-Szene das echte Foto dieses Items landet. */
export type MancaveRenderZone = "monitor" | "other";

export function renderZoneFor(category: RoomCategory): MancaveRenderZone {
  return category === "bildschirm" ? "monitor" : "other";
}

export interface MancaveGadget {
  key:         string;
  label:       string;
  description: string;
  imageUrl?:   string;
  accent:      "violet" | "teal" | "amber" | "rose" | "slate";
  category:    RoomCategory;
  zone:        MancaveRenderZone;
  /** Rastergröße aus dem Katalog (RoomItemDef.w/.h) — für das Seitenverhältnis der Foto-Box. */
  w:           number;
  h:           number;
  /** Nur bei Monitoren: wo im Foto die tatsächliche Anzeigefläche liegt (siehe room-items.ts). */
  screenRect?: MancaveScreenRect;
  price:       number;
}

export interface MancaveBadge {
  key:  string;
  icon: string;
  name: string;
  desc: string;
}

export interface MancavePokal {
  id:        string;
  title:     string;
  isSeries:  boolean;
  awardedAt: string;
}

export interface MancaveData {
  displayName:     string;
  avatarUrl:       string | null;
  rankPoints:      number;
  totalPoints:      number;
  rankLabel:       string;
  rankColor:       string;
  rankPct:         number;
  nextRankLabel:   string | null;
  leaderboardRank: number;
  totalUsers:      number;
  memberSince:     string;
  eventCount:      number;
  eventWins:       number;
  pollMasterCount: number;
  pokaleCount:     number;
  voiceHours:      number;
  messageCount:    number;
  topGames:        string[];
  badges:          MancaveBadge[];
  pokale:          MancavePokal[];
  gadgets:         MancaveGadget[];
}

/**
 * Die feste Hero-Kulisse der Desktop-Ego-Ansicht: ein einziges, in Blender aus
 * dem echten Schreibtisch+Monitor+Tastatur-Aufbau (`3DAssetsRoom/LP_Ortographic_Gaming_Room.glb`)
 * gerendertes Foto-Set, statt einer handgezeichneten SVG-Szene — mehrere
 * Blickrichtungen von DERSELBEN Sitzposition aus (Kamera nur um die
 * Hochachse gedreht), zwischen denen beim Umschauen weich überblendet wird.
 * `screenRect`/`pcHotspot` beziehen sich nur auf den Schreibtisch-Blick
 * (`DESK_TOUR_HOME_INDEX`) — dort liegt das Live-Dashboard direkt auf dem
 * Foto. Der Raum-Asset selbst ist als Eck-Diorama gebaut (nur zwei Wände
 * modelliert, siehe [[mancave-front-photos-project]]), deckt also keinen
 * vollen 360°-Rundumblick ab — der Bogen 240°→330°→0° ist bewusst der
 * gesamte tatsächlich möblierte/beleuchtete Bereich.
 */
export interface MancaveTourFrame {
  /** Gierwinkel relativ zur Home-Ansicht, nur zur Doku/Sortierung. */
  deg:      number;
  imageUrl: string;
  w:        number;
  h:        number;
}

export const DESK_TOUR_FRAMES: MancaveTourFrame[] = [
  { deg: 240, imageUrl: "/room-items/front/tour/desk_tour_240.jpg", w: 1200, h: 1200 },
  { deg: 270, imageUrl: "/room-items/front/tour/desk_tour_270.jpg", w: 1200, h: 1200 },
  { deg: 300, imageUrl: "/room-items/front/tour/desk_tour_300.jpg", w: 1200, h: 1200 },
  { deg: 330, imageUrl: "/room-items/front/tour/desk_tour_330.jpg", w: 1200, h: 1200 },
  { deg: 0,   imageUrl: "/room-items/front/tour/desk_tour_0.jpg",   w: 1200, h: 1200 },
];

/** Index der Schreibtisch-Ansicht (der "Home"-Blick, wo Dashboard/Hotspots sitzen). */
export const DESK_TOUR_HOME_INDEX = DESK_TOUR_FRAMES.length - 1;

export const DESK_SCENE = {
  screenRect: { x0: 0.4734, y0: 0.3609, x1: 0.7321, y1: 0.5088 } satisfies MancaveScreenRect,
  /** Ungefähre Bildposition (Bruchteile) des PC-Towers im Home-Blick, für den Gadgets-Hotspot. */
  pcHotspot: { x: 0.855, y: 0.484 },
};

/** Generischer Notfall-Bildschirmbereich für Monitore ohne ausgemessenes screenRect. */
export const FALLBACK_SCREEN_RECT: MancaveScreenRect = { x0: 0.22, y0: 0.2, x1: 0.78, y1: 0.56 };

export interface MancaveFrontPhoto {
  imageUrl:    string;
  w:           number;
  h:           number;
  screenRect?: MancaveScreenRect;
}

/**
 * Echte, in Blender aus den 3D-Assets (`3DAssetsRoom/`) frontal gerenderte
 * Fotos — pro Katalog-Item-Key. Die Ego-Perspektive der Mancave braucht
 * frontale Objekte, aber der bestehende `room-items.ts`-Katalog liefert nur
 * 3/4-Winkel-Fotos für die isometrische Zimmer-Ansicht (siehe [[mancave-front-photos-project]]).
 * Wird schrittweise befüllt — noch nicht vermessene Keys fallen auf
 * `MANCAVE_FRONT_FALLBACK` (pro Kategorie) und zuletzt auf das Iso-Foto zurück.
 */
export const MANCAVE_FRONT_PHOTOS: Partial<Record<string, MancaveFrontPhoto>> = {};

/** Fallback pro Kategorie, solange für den konkreten Item-Key noch kein eigenes Frontal-Render existiert. */
export const MANCAVE_FRONT_FALLBACK: Partial<Record<RoomCategory, MancaveFrontPhoto>> = {
  bildschirm: {
    imageUrl: "/room-items/front/monitor_generic_front.png",
    w: 962, h: 718,
    screenRect: { x0: 0.0402, y0: 0.0408, x1: 0.9598, y1: 0.6497 },
  },
  rechner: {
    imageUrl: "/room-items/front/pc_generic_front.png",
    w: 426, h: 931,
  },
  konsole: {
    imageUrl: "/room-items/front/controller_generic_front.png",
    w: 962, h: 659,
  },
};

/** Bestes verfügbares Frontal-Foto für ein Item — Key-genau, sonst Kategorie-Fallback, sonst nichts (Aufrufer fällt dann selbst auf das Iso-Foto zurück). */
export function frontPhotoFor(key: string, category: RoomCategory): MancaveFrontPhoto | undefined {
  return MANCAVE_FRONT_PHOTOS[key] ?? MANCAVE_FRONT_FALLBACK[category];
}
