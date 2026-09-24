// ============================================
// Story-Ereignis-Templates (prozedural, kein LLM)
// ============================================
// Gewichtete Zufallstabellen je DndLocationType — Platzhalter-Content für v1,
// vom Team später erweiterbar. Wird über ensureDndStoryContentSeeded() als
// DndStoryNode-Pool-Einträge (locationType-weit, kein locationId) gespiegelt;
// der Story-Tick (src/lib/dnd/story.ts) zieht daraus gewichtet.

import type { DndLocationType } from "@prisma/client";
import { prisma } from "../prisma";

export interface StoryTemplateDef {
  slug: string;
  locationType: DndLocationType;
  weight: number;
  title: string;
  text: string;
  xpReward: number;
}

export const STORY_TEMPLATES: StoryTemplateDef[] = [
  // ── SETTLEMENT: Handel, NPC-Dialoge, sichere Zone ──────────────────────
  {
    slug: "settlement-haendler",
    locationType: "SETTLEMENT",
    weight: 10,
    title: "Ein zwielichtiges Angebot",
    text: "Ein Händler am Marktstand flüstert dir ein \"garantiert legales\" Angebot zu. Du hörst höflich zu und kaufst nichts — diesmal.",
    xpReward: 8,
  },
  {
    slug: "settlement-geruecht",
    locationType: "SETTLEMENT",
    weight: 10,
    title: "Gerüchte in der Taverne",
    text: "In der Taverne wird getuschelt: irgendwo in der Nähe soll wieder etwas Seltsames vor sich gehen. Du merkst es dir für später.",
    xpReward: 6,
  },
  {
    slug: "settlement-streit",
    locationType: "SETTLEMENT",
    weight: 6,
    title: "Schlichtung nötig",
    text: "Zwei Marktstandbesitzer streiten sich lautstark um einen Meter Standfläche. Du schlichtest — mit gemischtem Erfolg, aber guten Absichten.",
    xpReward: 10,
  },
  {
    slug: "settlement-auftrag",
    locationType: "SETTLEMENT",
    weight: 8,
    title: "Ein kleiner Auftrag",
    text: "Der Vorsteher der Siedlung hat eine Kleinigkeit zu erledigen und fragt genau dich. Du erledigst es, mehr aus Höflichkeit als aus Ehrgeiz.",
    xpReward: 12,
  },

  // ── DUNGEON: Kämpfe, Loot, klassische Encounter ────────────────────────
  {
    slug: "dungeon-falle",
    locationType: "DUNGEON",
    weight: 10,
    title: "Eine offensichtliche Falle",
    text: "Der Boden vor dir sieht verdächtig sauber aus. Du gehst drumherum. Die Falle bleibt beleidigt ungenutzt.",
    xpReward: 10,
  },
  {
    slug: "dungeon-monster",
    locationType: "DUNGEON",
    weight: 12,
    title: "Ein Scharmützel im Dunkeln",
    text: "Etwas Klauriges greift aus dem Schatten an. Nach einem kurzen, unwürdigen Gerangel liegt es besiegt am Boden.",
    xpReward: 18,
  },
  {
    slug: "dungeon-loot",
    locationType: "DUNGEON",
    weight: 8,
    title: "Ein verstaubter Fund",
    text: "In einer Nische findest du etwas Glänzendes. Ob es etwas taugt, wird sich zeigen — hübsch ist es allemal.",
    xpReward: 14,
  },
  {
    slug: "dungeon-echo",
    locationType: "DUNGEON",
    weight: 6,
    title: "Ein Echo aus der Vergangenheit",
    text: "In den Ruinen findest du eingeritzte Notizen des berüchtigten Praktikanten. Sie erklären nichts, aber sie sind faszinierend chaotisch.",
    xpReward: 10,
  },

  // ── WILDERNESS: Erkundung, Sammeln, Zufallsbegegnungen ─────────────────
  {
    slug: "wilderness-kraeuter",
    locationType: "WILDERNESS",
    weight: 10,
    title: "Seltene Kräuter",
    text: "Am Wegesrand entdeckst du eine Handvoll nützlicher Kräuter. Nicht spektakulär, aber immer gut zu haben.",
    xpReward: 8,
  },
  {
    slug: "wilderness-verirrt",
    locationType: "WILDERNESS",
    weight: 10,
    title: "Kurz die Orientierung verloren",
    text: "Der Weg verzweigt sich mal wieder unerwartet. Nach einem kurzen Umweg findest du zurück — und ein bisschen Erfahrung dabei.",
    xpReward: 6,
  },
  {
    slug: "wilderness-begegnung",
    locationType: "WILDERNESS",
    weight: 8,
    title: "Zufällige Begegnung",
    text: "Ein wildes Tier beäugt dich neugierig, entscheidet sich dann aber für Desinteresse statt Angriff.",
    xpReward: 12,
  },
  {
    slug: "wilderness-wetter",
    locationType: "WILDERNESS",
    weight: 6,
    title: "Umschlagendes Wetter",
    text: "Ein plötzlicher Regenschauer zwingt dich zum Unterstellen. Die Wartezeit nutzt du, um deine Ausrüstung zu prüfen.",
    xpReward: 8,
  },

  // ── LANDMARK: Story-/Lore-lastige Einzelereignisse ─────────────────────
  {
    slug: "landmark-aussicht",
    locationType: "LANDMARK",
    weight: 8,
    title: "Ein Moment der Aussicht",
    text: "Von hier oben siehst du die ganze Region auf einmal. Für einen Augenblick fühlt sich das Abenteuer größer an als der Alltag zuhause.",
    xpReward: 15,
  },
  {
    slug: "landmark-inschrift",
    locationType: "LANDMARK",
    weight: 6,
    title: "Eine verwitterte Inschrift",
    text: "Ein Stein trägt Worte in einer Sprache, die längst niemand mehr spricht. Du entzifferst nur ein Wort: \"später\".",
    xpReward: 12,
  },
  {
    slug: "landmark-legende",
    locationType: "LANDMARK",
    weight: 6,
    title: "Eine lokale Legende",
    text: "Ein alter Wegweiser erzählt eine Geschichte, die garantiert übertrieben ist — aber gut genug, um sie weiterzuerzählen.",
    xpReward: 10,
  },
];

/**
 * Idempotent: spiegelt STORY_TEMPLATES als DndStoryNode-Pool-Einträge
 * (locationId = null, locationType gesetzt → gilt für alle Locations dieses
 * Typs, siehe Schema-Kommentar). Lazy aufgerufen, kein Seed-Skript nötig.
 */
export async function ensureDndStoryContentSeeded(): Promise<void> {
  for (const t of STORY_TEMPLATES) {
    await prisma.dndStoryNode.upsert({
      where: { slug: t.slug },
      create: {
        slug: t.slug,
        locationType: t.locationType,
        weight: t.weight,
        title: t.title,
        text: t.text,
        xpReward: t.xpReward,
      },
      update: {
        locationType: t.locationType,
        weight: t.weight,
        title: t.title,
        text: t.text,
        xpReward: t.xpReward,
      },
    });
  }
}

/** Gewichtete Zufallsauswahl aus einer Liste von Story-Nodes. */
export function weightedPick<T extends { weight: number }>(pool: T[], rng: () => number = Math.random): T | null {
  if (!pool.length) return null;
  const total = pool.reduce((sum, p) => sum + Math.max(1, p.weight), 0);
  let roll = rng() * total;
  for (const item of pool) {
    roll -= Math.max(1, item.weight);
    if (roll <= 0) return item;
  }
  return pool[pool.length - 1];
}
