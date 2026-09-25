// ============================================
// OMA-Quest-Weltkarte: 10 feste Locations auf der Hex-Karte
// ============================================
// Hartcodierte Struktur (Namen, Typ, Beschreibung) — abgenickte Liste aus der
// Planung, humoristischer Ton statt episch-ernstem High-Fantasy. Das Hex-Feld
// jeder Location steht in src/lib/dnd/hex/world.json (vom Kartengenerator
// gesetzt). Alle anderen Felder sind freie Felder ohne Location.
// Wird über ensureDndWorldSeeded() idempotent in DndLocation gespiegelt
// (gleiches "hartcodiert in TS, DB nur für Laufzeit-Zustand"-Prinzip wie
// CAMPAIGN_LEVELS).

import type { DndLocationType } from "@prisma/client";
import { prisma } from "../prisma";
import { LOCATION_HEXES } from "./hex/world";

export interface DndLocationDef {
  slug: string;
  name: string;
  description: string;
  locationType: DndLocationType;
}

export const START_LOCATION_SLUG = "hafenstadt";

export const DND_LOCATIONS: DndLocationDef[] = [
  {
    slug: "hafenstadt",
    name: "Alt-Hafenstadt",
    description: "Die Hauptstadt, riecht nach Fisch und schlechten Entscheidungen. Jeder fängt hier an.",
    locationType: "SETTLEMENT",
  },
  {
    slug: "waldpfad",
    name: "Der Krähwald",
    description: "Ein Wald, in dem angeblich noch nie jemand den direkten Weg gefunden hat.",
    locationType: "WILDERNESS",
  },
  {
    slug: "kuestenstrasse",
    name: "Küste der 1000 Ausreden",
    description: "Hier warten Schmuggler auf \"eigentlich nur eine letzte\" Lieferung.",
    locationType: "WILDERNESS",
  },
  {
    slug: "bergpass",
    name: "Schnarchpass",
    description: "Steil, kalt, und benannt nach dem Geräusch, das man beim Erklimmen macht.",
    locationType: "WILDERNESS",
  },
  {
    slug: "ruinen",
    name: "Ruine des Ewigen Praktikanten",
    description: "Niemand weiß, wer hier was gebaut hat — der Praktikant hat's wohl nicht dokumentiert.",
    locationType: "DUNGEON",
  },
  {
    slug: "verlassenes_dorf",
    name: "Dorf Nirgendwo",
    description: "Einwohnerzahl: unklar. Postleitzahl: existiert nicht.",
    locationType: "SETTLEMENT",
  },
  {
    slug: "schmugglerhoehle",
    name: "Höhle der Zweiten Meinung",
    description: "Hierher kommt man, wenn Plan A schlecht war. Sackgasse — im wahrsten Sinne.",
    locationType: "DUNGEON",
  },
  {
    slug: "zwergenfeste",
    name: "Bierbart-Feste",
    description: "Zwergenfestung, deren Verteidigungsplan hauptsächlich aus Met besteht.",
    locationType: "SETTLEMENT",
  },
  {
    slug: "frostgipfel",
    name: "Frostgipfel des ewigen Aufschubs",
    description: "\"Wir erklimmen ihn nächste Woche\" sagt man hier seit Generationen. Sackgasse.",
    locationType: "LANDMARK",
  },
  {
    slug: "sumpf",
    name: "Sumpf der verlorenen Socken",
    description: "Wo Ausrüstung hingeht, um nie wiederzukommen. Sackgasse.",
    locationType: "WILDERNESS",
  },
];

export function getLocationDef(slug: string): DndLocationDef | undefined {
  return DND_LOCATIONS.find((l) => l.slug === slug);
}

/** Hex-Feld einer Location (aus world.json). */
export function getLocationHex(slug: string) {
  const hex = LOCATION_HEXES[slug];
  if (!hex) throw new Error(`Location "${slug}" hat kein Hex-Feld in world.json`);
  return hex;
}

/**
 * Idempotent: legt fehlende DndLocation-Datensätze aus DND_LOCATIONS an bzw.
 * aktualisiert sie (inkl. Hex-Feld). Wird lazy beim ersten world-map/character-
 * Aufruf aufgerufen (kein separates Seed-Skript nötig, kein Ticking-Prozess).
 */
export async function ensureDndWorldSeeded(): Promise<void> {
  // Admin-Änderungen respektieren: gelöschte Orte nicht neu anlegen, im Editor bearbeitete (DndCustomWorld mit
  // demselben Slug) nicht mit den Code-Texten überschreiben.
  const [removed, overridden] = await Promise.all([
    prisma.dndRemovedContent.findMany({ where: { kind: "LOCATION" }, select: { slug: true } }),
    prisma.dndCustomWorld.findMany({ where: { slug: { in: DND_LOCATIONS.map((l) => l.slug) } }, select: { slug: true } }),
  ]);
  const skip = new Set(removed.map((r) => r.slug));
  const edited = new Set(overridden.map((r) => r.slug));
  for (const [order, loc] of DND_LOCATIONS.entries()) {
    if (skip.has(loc.slug)) continue;
    const hex = getLocationHex(loc.slug);
    const data = {
      name: loc.name,
      description: loc.description,
      locationType: loc.locationType,
      hexCol: hex.col,
      hexRow: hex.row,
      order,
    };
    await prisma.dndLocation.upsert({
      where: { slug: loc.slug },
      create: { slug: loc.slug, ...data },
      update: edited.has(loc.slug) ? {} : data,
    });
  }
}
