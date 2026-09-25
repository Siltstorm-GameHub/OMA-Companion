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
}

// Hartcodierte Quest-Definitionen (v1) — Discord-/App-Aktivität + ein paar
// standortgebundene. Weitere Quests sind reine Content-Arbeit (neuer Eintrag).
export const DND_QUESTS: DndQuestDef[] = [
  {
    slug: "dnd-plaudertasche",
    title: "Die Plaudertasche",
    description: "Schreibe 30 Nachrichten im Discord — dein Charakter hört überall mit.",
    objectiveType: "MESSAGE_SENT",
    targetCount: 30,
    xpReward: 50,
  },
  {
    slug: "dnd-stammgast",
    title: "Stammgast im Sprachkanal",
    description: "Verbringe 60 Minuten im Voice-Chat.",
    objectiveType: "VOICE_MINUTES",
    targetCount: 60,
    xpReward: 60,
  },
  {
    slug: "dnd-event-teilnehmer",
    title: "Auf zum nächsten Event",
    description: "Melde dich bei einem Community-Event an.",
    objectiveType: "EVENT_ATTEND",
    targetCount: 1,
    xpReward: 40,
    coinReward: 50,
  },
  {
    slug: "dnd-demokrat",
    title: "Demokratisches Prinzip",
    description: "Stimme bei einer Event-Umfrage ab.",
    objectiveType: "POLL_VOTE",
    targetCount: 1,
    xpReward: 20,
  },
  {
    slug: "dnd-arena-kaempfer",
    title: "Arena-Kämpfer",
    description: "Bestreite 3 Battle-Cards-Duelle.",
    objectiveType: "BATTLE_CARD_DUEL",
    targetCount: 3,
    xpReward: 80,
    coinReward: 100,
  },
  {
    slug: "dnd-weltenbummler",
    title: "Weltenbummler",
    description: "Besuche 3 verschiedene Locations.",
    objectiveType: "LOCATION_VISITED",
    targetCount: 3,
    xpReward: 70,
  },
  {
    slug: "dnd-geschichtenerzaehler",
    title: "Geschichtensammler",
    description: "Erlebe 5 Story-Ereignisse an deinen Reisezielen.",
    objectiveType: "STORY_NODE_COMPLETED",
    targetCount: 5,
    xpReward: 90,
    coinReward: 75,
  },
];
