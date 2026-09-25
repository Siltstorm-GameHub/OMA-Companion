// ============================================
// OMA-Quest-Klassen — hartcodierte Auswürfel-Tabelle
// ============================================
// Volle OMA-Quest-Klasse (feingranularer als die 3 Battle-Engine-Rollen). Bestimmt
// Story-/Quest-Content (z.B. Magier bekommt andere Ereignisse als Krieger),
// wird zur Auswürfel-Zeit fix über DND_CLASS_TO_CARD_CLASS (class-mapping.ts)
// auf class: CardClass abgebildet, damit die bestehende Kampf-Engine
// unverändert weiterläuft.

import type { AbilityKey } from "./races";

export interface DndClassDef {
  id: string;
  name: string;
  description: string;
  /** Welches Attribut bei der Stat-Ableitung (ability-scores.ts) am stärksten einfließt. */
  primaryAbility: AbilityKey;
}

export const DND_CLASSES: DndClassDef[] = [
  {
    id: "krieger",
    name: "Krieger",
    description: "Geht vorneweg rein, fragt später. Meistens klappt das.",
    primaryAbility: "str",
  },
  {
    id: "paladin",
    name: "Paladin",
    description: "Steht vorne, hält durch und segnet nebenbei die Verbündeten — meistens ungefragt.",
    primaryAbility: "con",
  },
  {
    id: "magier",
    name: "Magier",
    description: "Hat für jedes Problem einen Zauberspruch — und für jeden Zauberspruch eine Fußnote.",
    primaryAbility: "int",
  },
  {
    id: "kleriker",
    name: "Kleriker",
    description: "Hält die Gruppe am Leben, meistens gegen deren ausdrücklichen Willen.",
    primaryAbility: "wis",
  },
  {
    id: "schurke",
    name: "Schurke",
    description: "War schon da, bevor du reingekommen bist, und wieder weg, bevor du's merkst.",
    primaryAbility: "dex",
  },
  {
    id: "waldlaeufer",
    name: "Waldläufer",
    description: "Kennt jeden Trampelpfad, jede Fährte und mindestens ein zu viel Rezept mit Wurzeln.",
    primaryAbility: "dex",
  },
  {
    id: "barde",
    name: "Barde",
    description: "Löst die Hälfte aller Probleme mit einem guten Lied und die andere Hälfte mit Überredungskunst.",
    primaryAbility: "cha",
  },
];

export function rollClass(rng: () => number = Math.random): DndClassDef {
  return DND_CLASSES[Math.floor(rng() * DND_CLASSES.length)];
}

export function getDndClass(id: string): DndClassDef | undefined {
  return DND_CLASSES.find((c) => c.id === id);
}
