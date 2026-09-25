// ============================================
// Typen der begehbaren Welten (Karten, Akteure, Quests)
// ============================================
// Karten sind reine Daten (kein DOM, kein Server-Code): dieselben Definitionen nutzen der
// Renderer (components/te-map), die Spiel-Logik (engine.ts) und die Server-Prüfung der Quests.

import type { TeCharacterConfig } from "@/lib/te-character";
import type { Ability, Weather } from "./rpg";
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
  /** Innenraum hinter der Tür (optional) */
  interior?: Interior;
}

/** Raum hinter einer Gebäudetür: 2 Reihen Wand oben, Tür unten bei `exitX` (siehe interior.ts). */
export interface Interior {
  /** Vorlage, aus der er entstand (nur Information) */
  template: string;
  cols: number;
  rows: number;
  /** Index in INTERIOR_FLOORS / INTERIOR_WALLS */
  floor: number;
  wall: number;
  stamps: PlacedStamp[];
  actors: Actor[];
  exitX: number;
}

export interface PlacedStamp { id: StampId; x: number; y: number }

/** Ein Dialog eines Akteurs. `step` = Quest-Schritt, in dem er gilt ("*" = sonst). `advance` = nach dem
 *  Dialog rückt die Quest einen Schritt weiter (nur wenn der aktuelle Schritt genau `step` ist). Bei Schritt 0
 *  ist das das Quest-Angebot: der Spieler kann annehmen oder ablehnen. `quest` = Slug der Quest, auf die sich
 *  `step` bezieht (leer = die erste Quest der Welt). */
/** Ergebnis einer Entscheidung: Text, Quest-Fortschritt (dieser Quest/dieses Schritts), gemerkte Ereignisse (Flags),
 *  Erfahrung, Gold und Gegenstände (Schlüssel aus lib/dnd/items.ts). */
export interface Outcome {
  lines: string[];
  advance?: boolean;
  flags?: string[];
  xp?: number;
  gold?: number;
  items?: string[];
}

/** Antwortmöglichkeit am Ende eines Dialogs. Mit `check` entscheidet ein Wurf (d20 + Attribut) gegen den Schwierigkeitsgrad
 *  `dc` über `success` bzw. `fail`; bei `retry` darf man nach einem Fehlschlag erneut würfeln. */
export interface TalkChoice {
  text: string;
  check?: { ability: Ability; dc: number; retry?: boolean };
  success: Outcome;
  fail?: Outcome;
}

export interface Talk {
  step: number | "*";
  lines: string[];
  advance?: boolean;
  quest?: string;
  /** Antworten nach dem Dialog (Entscheidungen/Proben); dann rückt die Quest nur über die Ergebnisse weiter */
  choices?: TalkChoice[];
  /** Nur zeigen, wenn der Charakter alle diese Ereignisse (Flags) erlebt hat / keines davon */
  requires?: string[];
  forbids?: string[];
  /** Nur am Tag (6–21 Uhr) bzw. nur nachts */
  time?: "day" | "night";
  /** Nur bei diesem Wetter ("rain" gilt auch bei Sturm) */
  weather?: Weather;
}

export interface Actor {
  id: string;
  kind: "npc" | "chest" | "sign" | "merchant" | "monster";
  name: string;
  x: number;
  y: number;
  dir: Dir;
  /** NPCs/Händler: Aussehen (Time-Elements-Konfiguration) */
  config?: TeCharacterConfig;
  /** Händler: Gegenstände im Angebot (Schlüssel aus lib/dnd/items.ts) */
  shop?: string[];
  /** Monster: Id aus lib/dnd/combat.ts — die Figur steht auf der Karte und startet beim Ansprechen einen Kampf */
  monster?: string;
  talk: Talk[];
}

/** Ein Schritt einer Quest: mit einem Akteur der Heimat-Location reden (`talk`) oder eine andere Location
 *  besuchen (`visit`, zählt automatisch beim Betreten der Location). */
export interface QuestStep { kind: "talk" | "visit"; text: string; location?: string }

export interface WorldQuest {
  slug: string;
  title: string;
  /** Ein Text je Schritt plus der Abschlusstext: objectives.length = Schritte + 1. */
  objectives: string[];
  /** Art je Schritt (ohne Angabe: alles `talk`); gleiche Reihenfolge wie objectives ohne den Abschlusstext. */
  steps?: QuestStep[];
  xpReward: number;
}

export interface TeMap {
  cols: number;
  rows: number;
  theme: "outdoor" | "cave" | "inside";
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
  /** Erste (Haupt-)Quest der Location */
  quest: WorldQuest;
  /** Weitere Quests, die an derselben Location laufen */
  extraQuests?: WorldQuest[];
}

/** Alle Quests, die an dieser Location angeboten werden. */
export const worldQuestsOf = (w: WorldDef): WorldQuest[] => [w.quest, ...(w.extraQuests ?? [])];

/** Schritte einer Quest mit Art (fehlende Angaben = Gespräch). */
export function stepsOf(q: WorldQuest): QuestStep[] {
  return q.objectives.slice(0, -1).map((text, i) => q.steps?.[i] ?? { kind: "talk" as const, text });
}
