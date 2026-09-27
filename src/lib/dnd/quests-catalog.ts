// ============================================
// OMA Quest — Katalog der im Code definierten Aktivitäts-Quests (ohne Datenbank-/Welt-Abhängigkeiten)
// ============================================

import type { QuestType } from "../quests";
import type { QuestStep } from "../te-map/types";

export interface DndQuestDef {
  slug: string;
  title: string;
  description: string;
  objectiveType: string;
  targetCount: number;
  targetRef?: string;
  xpReward: number;
  coinReward?: number;
  linkedQuestType?: QuestType;
  locationSlug?: string;
  steps?: QuestStep[];
  /** Saison-Event: nur annehmbar/zählend, solange das Event läuft (Fortschritt und Belohnungen bleiben) */
  event?: "halloween" | "christmas";
  /** Slug einer Quest, die zuerst abgeschlossen sein muss (Kette) */
  requires?: string;
  /** Einmalige Belohnung beim Abschluss: Ehrentitel, Karten-Hintergrund (Schlüssel wie in card-catalog), Begleiter (Monster-Id) */
  grant?: { title?: string; bg?: string; companion?: string };
}

// Keine hartcodierten Aktivitäts-/Kampf-Quests mehr (die gibt es jetzt nur noch als tägliche/monatliche Rotation,
// siehe quests-bounty.ts) — hier stehen nur noch die zeitlich begrenzten Saison-Event-Quests (vom Admin über die
// Saison-Events-Verwaltung gesteuert, siehe season-events.ts). Alles andere kommt entweder von der Community
// (Nebenquests im Location-Editor) oder von Admins (Hauptquest, siehe Welt-Editor der festen Locations).
export const DND_QUESTS: DndQuestDef[] = [
  // Saison-Events (siehe season-events.ts)
  { slug: "dnd-ev-halloween-geister", title: "Geisterstunde", description: "Vertreibe 5 Spukgeister (nur zu Halloween).", objectiveType: "MONSTER_SLAIN", targetRef: "geist", targetCount: 5, xpReward: 120, coinReward: 40, event: "halloween" },
  { slug: "dnd-ev-halloween-kuerbis", title: "Kürbisernte", description: "Besiege 3 Kürbisköpfe (nur zu Halloween).", objectiveType: "MONSTER_SLAIN", targetRef: "kuerbiskopf", targetCount: 3, xpReward: 160, coinReward: 50, event: "halloween" },
  { slug: "dnd-ev-halloween-tanz", title: "Tanz der Knochen", description: "Zerlege 4 Tanzende Skelette (nur zu Halloween). Belohnung: Titel „Kürbiskönig“, Karten-Hintergrund und der Spukgeist als Begleiter.", objectiveType: "MONSTER_SLAIN", targetRef: "tanzskelett", targetCount: 4, xpReward: 200, coinReward: 80, event: "halloween", grant: { title: "Kürbiskönig", bg: "night7", companion: "geist" } },
  { slug: "dnd-ev-weihnacht-wichtel", title: "Wichtelärger", description: "Vertreibe 5 Freche Wichtel (nur zu Weihnachten).", objectiveType: "MONSTER_SLAIN", targetRef: "wichtel", targetCount: 5, xpReward: 100, coinReward: 30, event: "christmas" },
  { slug: "dnd-ev-weihnacht-baer", title: "Eisige Begegnung", description: "Besiege 3 Eisbären (nur zu Weihnachten).", objectiveType: "MONSTER_SLAIN", targetRef: "eisbaer", targetCount: 3, xpReward: 180, coinReward: 60, event: "christmas" },
  { slug: "dnd-ev-weihnacht-rentier", title: "Rentierhirte", description: "Beruhige 4 Wilde Rentiere (nur zu Weihnachten). Belohnung: Titel „Weihnachtsheld“, Karten-Hintergrund und ein Rentier als Begleiter.", objectiveType: "MONSTER_SLAIN", targetRef: "rentier", targetCount: 4, xpReward: 200, coinReward: 80, event: "christmas", grant: { title: "Weihnachtsheld", bg: "night2", companion: "rentier" } },
  { slug: "dnd-ev-halloween-reiter", title: "Kopflos in der Nacht", description: "Besiege mit deiner Gruppe den Kopflosen Reiter (Raid, nur zu Halloween). Belohnung: Titel „Reiter-Bezwinger“ und ein Karten-Hintergrund.", objectiveType: "MONSTER_SLAIN", targetRef: "reiter", targetCount: 1, xpReward: 400, coinReward: 150, event: "halloween", grant: { title: "Reiter-Bezwinger", bg: "urban-night1" } },
  { slug: "dnd-ev-weihnacht-rudolph", title: "Rudolphs Rache", description: "Besiege mit deiner Gruppe Rudolph den Rotnasigen (Raid, nur zu Weihnachten). Belohnung: Titel „Rotnasen-Bezwinger“ und ein Karten-Hintergrund.", objectiveType: "MONSTER_SLAIN", targetRef: "rudolph", targetCount: 1, xpReward: 400, coinReward: 150, event: "christmas", grant: { title: "Rotnasen-Bezwinger", bg: "urban-night2" } },
];
