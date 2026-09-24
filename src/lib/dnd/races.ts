// ============================================
// D&D-Rassen — hartcodierte Auswürfel-Tabelle
// ============================================
// Wird bei der Charaktererstellung zufällig gezogen (src/lib/dnd/index.ts /
// API-Route). Boni sind klassische D&D-Attributsboni (klein, additiv auf die
// gewürfelten Ability Scores), gleiche Konvention wie campaign-levels.ts
// (hartcodierte TS-Daten statt DB-Content).

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export interface DndRaceDef {
  id: string;
  name: string;
  description: string;
  abilityBonuses: Partial<Record<AbilityKey, number>>;
}

export const DND_RACES: DndRaceDef[] = [
  {
    id: "mensch",
    name: "Mensch",
    description: "Kein Spezialtalent, dafür überall ein bisschen dabei — der Allrounder unter den Abenteurern.",
    abilityBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
  },
  {
    id: "elf",
    name: "Elf",
    description: "Flink, wach und mit einem Hang zu spitzfindigen Bemerkungen über die Kürze menschlicher Leben.",
    abilityBonuses: { dex: 2, int: 1 },
  },
  {
    id: "zwerg",
    name: "Zwerg",
    description: "Zäh wie Granit, riecht meistens nach Schmiedeesse. Verhandelt notfalls auch mit Fäusten.",
    abilityBonuses: { con: 2, str: 1 },
  },
  {
    id: "halbling",
    name: "Halbling",
    description: "Klein, unauffällig, erstaunlich schwer zu treffen. Hat immer ein zweites Frühstück dabei.",
    abilityBonuses: { dex: 2, cha: 1 },
  },
  {
    id: "halbork",
    name: "Halbork",
    description: "Groß, laut, und ausgesprochen entschlossen, das mit dem Ruf ihrer Vorfahren wettzumachen.",
    abilityBonuses: { str: 2, con: 1 },
  },
  {
    id: "gnom",
    name: "Gnom",
    description: "Neugierig bis zur Selbstgefährdung, meist mitten in irgendeinem Experiment.",
    abilityBonuses: { int: 2, dex: 1 },
  },
];

export function rollRace(rng: () => number = Math.random): DndRaceDef {
  return DND_RACES[Math.floor(rng() * DND_RACES.length)];
}

export function getRace(id: string): DndRaceDef | undefined {
  return DND_RACES.find((r) => r.id === id);
}
