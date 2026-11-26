/**
 * Community-Gameserver aus der Spieleliste — client-sicher (keine Imports aus Prisma/Server).
 *
 * Ein Spiel ist "server-tauglich", wenn man dafür einen eigenen OMA-Server betreiben kann. Das setzen
 * Mitglieder und das Team (jede Änderung im Protokoll GameEdit), automatisch nur über die Liste
 * bekannter Server-Spiele unten. Online-Mehrspieler allein ist kein Beweis — dann fragt die Spielseite
 * nur nach ("Könnte das auf einen OMA-Server?").
 *
 * Server-taugliche Spiele ohne bestehenden Server sind Kandidaten auf /servers, sortiert nach einem
 * sichtbaren Score aus GameSwipe und "Ich wäre dabei"-Zusagen. Erreicht ein Kandidat die Schwelle, ist er
 * "bereit zum Einrichten" und taucht im Admin-Posteingang auf.
 */

import { gameNameKey } from "./slug";

export type ServerSource = "auto" | "user" | "team";

export const SERVER_INTEREST_LEVELS = ["casual", "regular"] as const;
export type ServerInterestLevel = (typeof SERVER_INTEREST_LEVELS)[number];

export const SERVER_INTEREST_LABELS: Record<ServerInterestLevel, string> = {
  casual: "Gelegentlich",
  regular: "Regelmäßig",
};

export function isServerInterestLevel(v: unknown): v is ServerInterestLevel {
  return typeof v === "string" && (SERVER_INTEREST_LEVELS as readonly string[]).includes(v);
}

export const SERVER_SOURCE_LABELS: Record<ServerSource, string> = {
  auto: "automatisch erkannt",
  user: "von einem Mitglied eingetragen",
  team: "vom Team bestätigt",
};

export function isServerSource(v: unknown): v is ServerSource {
  return v === "auto" || v === "user" || v === "team";
}

// ── Score und Schwelle ───────────────────────────────────────────────────────

/** Gewichte des Kandidaten-Scores — so auch auf /servers erklärt */
export const SERVER_SCORE_WEIGHTS = { regular: 4, casual: 3, in: 2, wish: 1 } as const;

/** Ab so vielen Zusagen (davon so vielen regelmäßigen) gilt ein Kandidat als bereit zum Einrichten */
export const SERVER_READY_MIN_INTEREST = 6;
export const SERVER_READY_MIN_REGULAR = 3;

export interface CandidateCounts { regular: number; casual: number; inCount: number; wishCount: number }

export function candidateScore(c: CandidateCounts): number {
  const w = SERVER_SCORE_WEIGHTS;
  return c.regular * w.regular + c.casual * w.casual + c.inCount * w.in + c.wishCount * w.wish;
}

export function isReadyForServer(c: Pick<CandidateCounts, "regular" | "casual">): boolean {
  return c.regular + c.casual >= SERVER_READY_MIN_INTEREST && c.regular >= SERVER_READY_MIN_REGULAR;
}

/** Was bis zur Schwelle noch fehlt ("noch 2 Zusagen, davon 1 regelmäßig") — null, wenn erreicht */
export function missingForReady(c: Pick<CandidateCounts, "regular" | "casual">): { total: number; regular: number } | null {
  if (isReadyForServer(c)) return null;
  return {
    total: Math.max(0, SERVER_READY_MIN_INTEREST - c.regular - c.casual),
    regular: Math.max(0, SERVER_READY_MIN_REGULAR - c.regular),
  };
}

// ── Wer darf ändern? ─────────────────────────────────────────────────────────

/**
 * Mitglieder dürfen setzen, solange der Wert unbekannt oder nur automatisch erkannt ist, und ihre eigene
 * Angabe korrigieren. Was ein anderes Mitglied oder das Team eingetragen hat, ändert nur das Team.
 */
export function canMemberSetServer(
  current: { serverCapable: boolean | null; serverSource: string | null },
  lastEditorIsMe: boolean,
): boolean {
  if (current.serverCapable === null) return true;
  if (current.serverSource === "auto" || current.serverSource === null) return true;
  return current.serverSource === "user" && lastEditorIsMe;
}

// ── Automatische Erkennung ───────────────────────────────────────────────────

/**
 * Spiele, für die es bekanntermaßen eigene (selbst betreibbare) Server gibt. Abgleich über den
 * normalisierten Namen und die anderen Schreibweisen eines Spiels. Erweitern: einfach Namen ergänzen.
 * (Steam bietet ohne API-Schlüssel keine Liste der "Dedicated Server"-Apps mehr an — daher diese Liste.)
 */
export const KNOWN_SERVER_GAMES = [
  "Minecraft", "Minecraft: Java Edition", "Minecraft: Bedrock Edition",
  "Valheim", "Palworld", "Enshrouded", "V Rising", "Conan Exiles", "Soulmask", "Abiotic Factor",
  "ARK: Survival Evolved", "ARK: Survival Ascended", "Rust", "DayZ", "Unturned", "7 Days to Die",
  "Project Zomboid", "Sons of the Forest", "The Forest", "Core Keeper", "Night of the Dead",
  "Satisfactory", "Factorio", "Terraria", "Starbound", "Don't Starve Together", "Space Engineers",
  "Empyrion - Galactic Survival", "Astroneer", "Eco", "Vintage Story", "Necesse", "Icarus",
  "Garry's Mod", "Counter-Strike 2", "Team Fortress 2", "Left 4 Dead 2", "Killing Floor 2",
  "Arma 3", "Arma Reforger", "Squad", "Insurgency: Sandstorm", "Mordhau", "Hell Let Loose",
  "Assetto Corsa", "Assetto Corsa Competizione", "Euro Truck Simulator 2", "American Truck Simulator",
  "Farming Simulator 22", "Farming Simulator 25", "Avorion", "Barotrauma", "Stormworks: Build and Rescue",
  "The Front", "Myth of Empires", "Once Human",
] as const;

const KNOWN_KEYS = new Set(KNOWN_SERVER_GAMES.map(gameNameKey));

export function isKnownServerGame(game: { nameKey: string; aliases: string[] }): boolean {
  return KNOWN_KEYS.has(game.nameKey) || game.aliases.some(a => KNOWN_KEYS.has(gameNameKey(a)));
}

/**
 * Könnte das Spiel server-tauglich sein? Schwaches Signal (Koop/PvP und nicht nur zu zweit) — setzt nie
 * einen Wert, sondern blendet auf der Spielseite die Frage ein.
 */
export function mightBeServerGame(game: { modes: string[]; maxPlayers: number | null }): boolean {
  const multiplayer = game.modes.includes("coop") || game.modes.includes("pvp");
  return multiplayer && (game.maxPlayers === null || game.maxPlayers >= 4);
}

/**
 * Was die automatische Erkennung setzen würde: true bei bekannten Server-Spielen, sonst nichts (null).
 * Überschreibt nie, was ein Mitglied oder das Team eingetragen hat.
 */
export function autoServerValue(game: {
  nameKey: string; aliases: string[]; serverCapable: boolean | null; serverSource: string | null;
}): true | null {
  if (game.serverSource === "user" || game.serverSource === "team") return null;
  if (game.serverCapable !== null) return null;
  return isKnownServerGame(game) ? true : null;
}
