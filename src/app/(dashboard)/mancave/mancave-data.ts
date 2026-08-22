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
 * gerendertes Sitzperspektiven-Foto, statt einer handgezeichneten SVG-Szene.
 * `screenRect` markiert den sichtbaren Anzeigebereich des rechten/Haupt-
 * Monitors darin — dort liegt das Live-Dashboard direkt auf dem Foto.
 */
export const DESK_SCENE = {
  imageUrl: "/room-items/front/desk_scene_generic.png",
  w: 1600, h: 900,
  screenRect: { x0: 0.3737, y0: 0, x1: 1.0, y1: 0.5039 } satisfies MancaveScreenRect,
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
