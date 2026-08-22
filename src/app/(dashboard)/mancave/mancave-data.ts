import type { RoomCategory } from "@/lib/room-items";

export interface MancaveScreenRect { x0: number; y0: number; x1: number; y1: number; }

/**
 * Kategorien, die "sinnvoll auf/um den Schreibtisch" stehen — genau die
 * Teilmenge der Gaming-Zimmer-Möbel, die in der Mancave-Szene als Gadgets
 * auftauchen. Tapeten/Böden/Poster/Pflanzen etc. bleiben draußen, die wirken
 * hier nur als Rauschen. "schreibtisch" bewusst NICHT dabei — der Tisch IST
 * die Bühne selbst, kein Gadget, das zusätzlich draufgestellt wird.
 */
export const MANCAVE_GADGET_CATEGORIES: RoomCategory[] = [
  "rechner", "bildschirm", "peripherie", "sitzen", "licht", "konsole",
];

/** Wo in der Ego-Szene das echte Foto dieses Items landet. */
export type MancaveRenderZone = "monitor" | "desk" | "floor";

export function renderZoneFor(category: RoomCategory): MancaveRenderZone {
  if (category === "bildschirm") return "monitor";
  if (category === "peripherie" || category === "licht") return "desk";
  return "floor"; // rechner, sitzen, konsole — steht neben/unter dem Tisch
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
    w: 1024, h: 1024,
    screenRect: { x0: 0.068, y0: 0.178, x1: 0.932, y1: 0.605 },
  },
};

/** Bestes verfügbares Frontal-Foto für ein Item — Key-genau, sonst Kategorie-Fallback, sonst nichts (Aufrufer fällt dann selbst auf das Iso-Foto zurück). */
export function frontPhotoFor(key: string, category: RoomCategory): MancaveFrontPhoto | undefined {
  return MANCAVE_FRONT_PHOTOS[key] ?? MANCAVE_FRONT_FALLBACK[category];
}
