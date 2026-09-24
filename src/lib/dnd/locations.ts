// ============================================
// D&D-Weltkarte: 10 Locations, freies Netz
// ============================================
// Hartcodierte Struktur (Namen, Typ, Nachbarn, Positionen) — abgenickte Liste
// aus der Planung, humoristischer Ton statt episch-ernstem High-Fantasy.
// Wird über ensureDndWorldSeeded() idempotent in DndLocation/DndRoute
// gespiegelt (gleiches "hartcodiert in TS, DB nur für Laufzeit-Zustand"-
// Prinzip wie CAMPAIGN_LEVELS).

import type { DndLocationType } from "@prisma/client";
import { prisma } from "../prisma";

export interface DndLocationDef {
  slug: string;
  name: string;
  description: string;
  locationType: DndLocationType;
  /** Prozentuale Position auf der Weltkarte (0-100). */
  mapX: number;
  mapY: number;
  neighbors: string[];
  /** Feste Reisedauer in Minuten je Nachbarschaftskante (mittel: 30min-2h). */
  travelMinutesToNeighbor: Record<string, number>;
}

export const START_LOCATION_SLUG = "hafenstadt";

export const DND_LOCATIONS: DndLocationDef[] = [
  {
    slug: "hafenstadt",
    name: "Alt-Hafenstadt",
    description: "Die Hauptstadt, riecht nach Fisch und schlechten Entscheidungen. Jeder fängt hier an.",
    locationType: "SETTLEMENT",
    mapX: 50,
    mapY: 80,
    neighbors: ["waldpfad", "kuestenstrasse", "bergpass"],
    travelMinutesToNeighbor: { waldpfad: 45, kuestenstrasse: 40, bergpass: 60 },
  },
  {
    slug: "waldpfad",
    name: "Der Krähwald",
    description: "Ein Wald, in dem angeblich noch nie jemand den direkten Weg gefunden hat.",
    locationType: "WILDERNESS",
    mapX: 28,
    mapY: 58,
    neighbors: ["hafenstadt", "ruinen", "verlassenes_dorf"],
    travelMinutesToNeighbor: { hafenstadt: 45, ruinen: 35, verlassenes_dorf: 50 },
  },
  {
    slug: "kuestenstrasse",
    name: "Küste der 1000 Ausreden",
    description: "Hier warten Schmuggler auf \"eigentlich nur eine letzte\" Lieferung.",
    locationType: "WILDERNESS",
    mapX: 75,
    mapY: 68,
    neighbors: ["hafenstadt", "schmugglerhoehle"],
    travelMinutesToNeighbor: { hafenstadt: 40, schmugglerhoehle: 55 },
  },
  {
    slug: "bergpass",
    name: "Schnarchpass",
    description: "Steil, kalt, und benannt nach dem Geräusch, das man beim Erklimmen macht.",
    locationType: "WILDERNESS",
    mapX: 55,
    mapY: 42,
    neighbors: ["hafenstadt", "zwergenfeste", "frostgipfel"],
    travelMinutesToNeighbor: { hafenstadt: 60, zwergenfeste: 50, frostgipfel: 65 },
  },
  {
    slug: "ruinen",
    name: "Ruine des Ewigen Praktikanten",
    description: "Niemand weiß, wer hier was gebaut hat — der Praktikant hat's wohl nicht dokumentiert.",
    locationType: "DUNGEON",
    mapX: 15,
    mapY: 40,
    neighbors: ["waldpfad", "verlassenes_dorf"],
    travelMinutesToNeighbor: { waldpfad: 35, verlassenes_dorf: 45 },
  },
  {
    slug: "verlassenes_dorf",
    name: "Dorf Nirgendwo",
    description: "Einwohnerzahl: unklar. Postleitzahl: existiert nicht.",
    locationType: "SETTLEMENT",
    mapX: 22,
    mapY: 25,
    neighbors: ["waldpfad", "ruinen", "sumpf"],
    travelMinutesToNeighbor: { waldpfad: 50, ruinen: 45, sumpf: 40 },
  },
  {
    slug: "schmugglerhoehle",
    name: "Höhle der Zweiten Meinung",
    description: "Hierher kommt man, wenn Plan A schlecht war. Sackgasse — im wahrsten Sinne.",
    locationType: "DUNGEON",
    mapX: 90,
    mapY: 55,
    neighbors: ["kuestenstrasse"],
    travelMinutesToNeighbor: { kuestenstrasse: 55 },
  },
  {
    slug: "zwergenfeste",
    name: "Bierbart-Feste",
    description: "Zwergenfestung, deren Verteidigungsplan hauptsächlich aus Met besteht.",
    locationType: "SETTLEMENT",
    mapX: 68,
    mapY: 22,
    neighbors: ["bergpass", "frostgipfel"],
    travelMinutesToNeighbor: { bergpass: 50, frostgipfel: 35 },
  },
  {
    slug: "frostgipfel",
    name: "Frostgipfel des ewigen Aufschubs",
    description: "\"Wir erklimmen ihn nächste Woche\" sagt man hier seit Generationen. Sackgasse.",
    locationType: "LANDMARK",
    mapX: 55,
    mapY: 10,
    neighbors: ["bergpass", "zwergenfeste"],
    travelMinutesToNeighbor: { bergpass: 65, zwergenfeste: 35 },
  },
  {
    slug: "sumpf",
    name: "Sumpf der verlorenen Socken",
    description: "Wo Ausrüstung hingeht, um nie wiederzukommen. Sackgasse.",
    locationType: "WILDERNESS",
    mapX: 8,
    mapY: 10,
    neighbors: ["verlassenes_dorf"],
    travelMinutesToNeighbor: { verlassenes_dorf: 40 },
  },
];

export function getLocationDef(slug: string): DndLocationDef | undefined {
  return DND_LOCATIONS.find((l) => l.slug === slug);
}

/**
 * Idempotent: legt fehlende DndLocation/DndRoute-Datensätze aus DND_LOCATIONS
 * an bzw. aktualisiert sie. Wird lazy beim ersten world-map/character-Aufruf
 * aufgerufen (kein separates Seed-Skript nötig, kein Ticking-Prozess).
 */
export async function ensureDndWorldSeeded(): Promise<void> {
  for (const [order, loc] of DND_LOCATIONS.entries()) {
    await prisma.dndLocation.upsert({
      where: { slug: loc.slug },
      create: {
        slug: loc.slug,
        name: loc.name,
        description: loc.description,
        locationType: loc.locationType,
        mapX: loc.mapX,
        mapY: loc.mapY,
        order,
      },
      update: {
        name: loc.name,
        description: loc.description,
        locationType: loc.locationType,
        mapX: loc.mapX,
        mapY: loc.mapY,
        order,
      },
    });
  }

  const all = await prisma.dndLocation.findMany({ select: { id: true, slug: true } });
  const idBySlug = new Map(all.map((l) => [l.slug, l.id]));

  for (const loc of DND_LOCATIONS) {
    const fromId = idBySlug.get(loc.slug);
    if (!fromId) continue;
    for (const neighborSlug of loc.neighbors) {
      const toId = idBySlug.get(neighborSlug);
      if (!toId) continue;
      const travelMinutes = loc.travelMinutesToNeighbor[neighborSlug] ?? 60;
      await prisma.dndRoute.upsert({
        where: { fromId_toId: { fromId, toId } },
        create: { fromId, toId, travelMinutes, label: `${loc.name} → ${getLocationDef(neighborSlug)?.name ?? neighborSlug}` },
        update: { travelMinutes },
      });
    }
  }
}
