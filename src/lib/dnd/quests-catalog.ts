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
  /** Einmalige Belohnung beim Abschluss: Ehrentitel, Karten-Hintergrund (Schlüssel wie in card-catalog), Begleiter (Monster-Id) */
  grant?: { title?: string; bg?: string; companion?: string };
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
  // Kampf-Quests: zählen Siege über Monster (targetRef = Monster-Id, ohne Angabe jedes Monster)
  { slug: "dnd-rattenplage", title: "Egelplage", description: "Besiege 5 Giftegel.", objectiveType: "MONSTER_SLAIN", targetRef: "ratte", targetCount: 5, xpReward: 60 },
  { slug: "dnd-wolfsjagd", title: "Wolfsjagd", description: "Besiege 3 Wölfe.", objectiveType: "MONSTER_SLAIN", targetRef: "wolf", targetCount: 3, xpReward: 80, coinReward: 40 },
  { slug: "dnd-goblinplage", title: "Goblin-Plage", description: "Vertreibe 3 Goblin-Plünderer.", objectiveType: "MONSTER_SLAIN", targetRef: "goblin", targetCount: 3, xpReward: 100, coinReward: 50 },
  { slug: "dnd-knochenjaeger", title: "Knochenjäger", description: "Zerlege 3 rastlose Skelette.", objectiveType: "MONSTER_SLAIN", targetRef: "skelett", targetCount: 3, xpReward: 100 },
  { slug: "dnd-banditenschreck", title: "Banditenschreck", description: "Besiege einen Banditenhauptmann.", objectiveType: "MONSTER_SLAIN", targetRef: "hauptmann", targetCount: 1, xpReward: 160, coinReward: 80 },
  { slug: "dnd-monsterjaeger", title: "Monsterjäger", description: "Besiege 10 beliebige Monster.", objectiveType: "MONSTER_SLAIN", targetCount: 10, xpReward: 220, coinReward: 100 },
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
