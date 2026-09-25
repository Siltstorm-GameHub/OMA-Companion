// ============================================
// Typen der begehbaren Welten (Karten, Akteure, Quests)
// ============================================
// Karten sind reine Daten (kein DOM, kein Server-Code): dieselben Definitionen nutzen der
// Renderer (components/te-map), die Spiel-Logik (engine.ts) und die Server-Prüfung der Quests.

import type { TeCharacterConfig } from "@/lib/te-character";
import type { StampId } from "./stamps";

/** Bodenarten. Welche Kachelblöcke dahinterstehen, bestimmt das Thema (themes.ts). */
export const GROUND = { base: 0, dirt: 1, cobble: 2, stone: 3, sand: 4 } as const;
export type GroundType = (typeof GROUND)[keyof typeof GROUND];

export type Dir = "down" | "left" | "right" | "up";

/** Block-Koordinaten (in Blöcken) im A3-Sheet: Dachblöcke Zeile 0/2, Wandblöcke Zeile 1/3. */
export interface BlockRef { k: number; r: number }

export interface Building {
  x: number;
  y: number;
  /** Breite in Kacheln (mindestens 3) */
  w: number;
  roofRows: number;
  roof: BlockRef;
  wall: BlockRef;
  /** Kachel-Versatz von x für Tür (Zeile unterhalb der Wand) und Fenster (obere Wandzeile) */
  doorDx: number;
  windowDx: number[];
  sign?: StampId;
  name: string;
}

export interface PlacedStamp { id: StampId; x: number; y: number }

/** Ein Dialog eines Akteurs. `step` = Quest-Schritt, in dem er gilt ("*" = sonst). `advance` = nach dem
 *  Dialog rückt die Quest einen Schritt weiter (nur wenn der aktuelle Schritt genau `step` ist). */
export interface Talk {
  step: number | "*";
  lines: string[];
  advance?: boolean;
}

export interface Actor {
  id: string;
  kind: "npc" | "chest" | "sign";
  name: string;
  x: number;
  y: number;
  dir: Dir;
  /** Nur NPCs: Aussehen (Time-Elements-Konfiguration) */
  config?: TeCharacterConfig;
  talk: Talk[];
}

export interface WorldQuest {
  slug: string;
  title: string;
  /** Ein Text je Schritt plus der Abschlusstext: objectives.length = Schritte + 1. */
  objectives: string[];
  xpReward: number;
}

export interface TeMap {
  cols: number;
  rows: number;
  theme: "outdoor" | "cave";
  ground: GroundType[][];
  buildings: Building[];
  stamps: PlacedStamp[];
  actors: Actor[];
  /** Gesperrte Rechtecke [x, y, w, h] (Rand, Felsen) */
  blocked: [number, number, number, number][];
  /** Höhlen-/Felswand-Bereiche, die als Wandkacheln gezeichnet werden (Teilmenge von blocked) */
  wallRects: [number, number, number, number][];
  spawn: { x: number; y: number };
  /** Plätze, an denen andere anwesende Spieler stehen */
  crowd: { x: number; y: number }[];
}

export interface WorldDef {
  slug: string;
  title: string;
  map: TeMap;
  quest: WorldQuest;
}
