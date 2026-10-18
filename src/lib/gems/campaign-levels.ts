// ============================================
// Kampagnen-Level — Kampagne im "OMA Gems"-Modus
// ============================================
// Level-Inhalte sind bewusst hart in TypeScript hinterlegt (wie
// puzzle-monsters.ts) statt admin-editierbar — Balancing läuft über Code-
// Änderung/Deploy. Nur der Spieler-FORTSCHRITT (Sterne/Freischaltung) landet
// in der DB (siehe UserCampaignProgress in schema.prisma + campaign.ts).
//
// Ein Kapitel, 12 Level, steigende Schwierigkeit über drei Stellschrauben:
//  - `level` (1-5): Monster-Stufe (LEVEL_STAT_MULTIPLIER)
//  - `statMultiplier`: zusätzliche Basis-Stat-Skalierung (siehe monster-content.ts)
//  - Team-Größe/-Zusammensetzung: startet bei einem einzelnen schwachen Gegner,
//    endet bei einem vollen 5er-Team samt Endgegner
//
// Die `statMultiplier`-Werte sind gegen Spieler-Teams ohne Karten-Stufen kalibriert
// (scripts/simulate-campaign-balance.ts --calibrate): Die Siegquote eines einfachen
// automatischen Spielers fällt von 100 % (Level 1–5, Einstieg) über 90 % beim ersten
// Boss gleichmäßig auf rund 65 % beim Endboss. Weil die Monster-Zusammensetzung je
// Level stark schwankt, sind die Werte bewusst NICHT monoton — maßgeblich ist die
// Siegquote, nicht der Multiplikator.

import type { MonsterTemplate } from "./monster-content";
import { generateEndlessLevel, parseEndlessStage } from "./endless-levels";
import {
  AFK_FARMER,
  GRIEFER_IMP,
  LAG_SPIKE,
  LOOT_GOBLIN,
  PAY2WIN_TRUHE,
  RAGE_QUIT_CONTROLLER,
  SEASON_PASS_DRACHE,
  SERVERABSTURZ_KRAKEN,
  SESSION_TIMEOUT_ZOMBIE,
  TUTORIAL_SLIME,
} from "./campaign-monsters";

export interface CampaignLevelDef {
  id: string;
  order: number;
  name: string;
  /** Kurzer, humorvoller Untertitel — erscheint auf dem Karten-Knoten. */
  tagline: string;
  monsters: MonsterTemplate[];
  level: number;
  statMultiplier: number;
  /** Eigener Angriffs-Multiplikator (sonst wie statMultiplier). Im Kapitel hält er einen
   *  einzelnen Gegnertreffer bei einem festen Anteil der Leben eines Helden (siehe
   *  CHAPTER_HIT_TARGET in scripts/simulate-campaign-balance.ts), im Turm wächst er langsamer als die Leben. */
  attackMultiplier?: number;
  /** Eigener Verteidigungs-Multiplikator (sonst wie statMultiplier). Bleibt flach — die
   *  Schadensformel zieht die halbe Verteidigung ab, sonst würde fast jeder Treffer des Spielers an der
   *  Panzerung abprallen (nur noch Mindestschaden). */
  defenseMultiplier?: number;
  isBoss?: boolean;
  /** Wächter (jede 10. Stufe ab 20, siehe tower-rules.ts). */
  isGuardian?: boolean;
}

export const CAMPAIGN_CHAPTER_NAME = "Kapitel 1: Server-Neustart";

/** Kurze Story-Einführung, unter dem Kapitel-Titel auf der Kampagnen-Karte
 *  angezeigt (siehe CampaignMap.tsx) — reiner Flavor-Text, keine Spiellogik. */
export const CAMPAIGN_CHAPTER_INTRO =
  "Mitten in der Nacht ist der Community-Server abgestürzt — und alles, was sonst nur nervt, ist plötzlich lebendig geworden. Tutorial-Slimes, Lag-Spikes, Rage-Quit-Controller: Sie alle wollen nur eins, dass du aufgibst, bevor der Neustart durch ist. Kämpf dich durch, bevor der nächste Patch alles wieder zurücksetzt.";

/** Kapitel-Hintergrundbild für die Kampagnen-Karte (siehe CampaignMap.tsx) —
 *  optionale Ablage unter public/gems-assets/backgrounds/, siehe README dort
 *  für Stilvorgabe. Fehlt die Datei (noch), fällt die UI automatisch auf den
 *  bisherigen reinen Verlaufshintergrund zurück (onError-Pattern, wie bei
 *  monsterImagePath). */
export const CAMPAIGN_CHAPTER_BACKGROUND = "/gems-assets/backgrounds/kapitel-1-server-neustart.png";

export const CAMPAIGN_LEVELS: CampaignLevelDef[] = [
  {
    id: "lvl-01",
    order: 1,
    name: "Der Tutorial-Sumpf",
    tagline: "Zum Aufwärmen: noch nicht mal ein Boss-Balken.",
    monsters: [TUTORIAL_SLIME],
    level: 1,
    statMultiplier: 50,
    attackMultiplier: 1.86,
    defenseMultiplier: 1.86,
  },
  {
    id: "lvl-02",
    order: 2,
    name: "Das Wartungsfenster",
    tagline: "Kurz offline, dann geht's weiter.",
    monsters: [TUTORIAL_SLIME, SESSION_TIMEOUT_ZOMBIE],
    level: 1,
    statMultiplier: 14,
    attackMultiplier: 1.3,
    defenseMultiplier: 1.3,
  },
  {
    id: "lvl-03",
    order: 3,
    name: "Ping-Trouble-Pass",
    tagline: "Willkommen bei 300ms Verzögerung.",
    monsters: [LAG_SPIKE, RAGE_QUIT_CONTROLLER],
    level: 2,
    statMultiplier: 54,
    attackMultiplier: 0.72,
    defenseMultiplier: 0.72,
  },
  {
    id: "lvl-04",
    order: 4,
    name: "Die Loot-Höhle",
    tagline: "Alles glänzt, nichts ist geschenkt.",
    monsters: [LOOT_GOBLIN, PAY2WIN_TRUHE, TUTORIAL_SLIME],
    level: 2,
    statMultiplier: 29.7,
    attackMultiplier: 0.97,
    defenseMultiplier: 0.97,
  },
  {
    id: "lvl-05",
    order: 5,
    name: "Griefer-Gasse",
    tagline: "Hier wird nicht gespielt, hier wird getrollt.",
    monsters: [GRIEFER_IMP, GRIEFER_IMP, AFK_FARMER],
    level: 2,
    statMultiplier: 35.7,
    attackMultiplier: 1.2,
    defenseMultiplier: 1.2,
  },
  {
    id: "lvl-06",
    order: 6,
    name: "Boss: Der Serverabsturz",
    tagline: "504 Gateway Timeout — und keine Gnade.",
    monsters: [SERVERABSTURZ_KRAKEN, LAG_SPIKE, LAG_SPIKE],
    level: 3,
    statMultiplier: 30,
    attackMultiplier: 1.6,
    defenseMultiplier: 1.05,
    isBoss: true,
  },
  {
    id: "lvl-07",
    order: 7,
    name: "Nerf-Patch-Tal",
    tagline: "Wurde offiziell schwächer designt. Merkt man kaum.",
    monsters: [RAGE_QUIT_CONTROLLER, RAGE_QUIT_CONTROLLER, GRIEFER_IMP, AFK_FARMER],
    level: 3,
    statMultiplier: 23.9,
    attackMultiplier: 1.15,
    defenseMultiplier: 1.01,
  },
  {
    id: "lvl-08",
    order: 8,
    name: "Pay2Win-Palast",
    tagline: "Hier kauft man sich den Sieg. Fast.",
    monsters: [PAY2WIN_TRUHE, PAY2WIN_TRUHE, LOOT_GOBLIN, LOOT_GOBLIN],
    level: 3,
    statMultiplier: 18,
    attackMultiplier: 1.95,
    defenseMultiplier: 1.3,
  },
  {
    id: "lvl-09",
    order: 9,
    name: "Der Grinding-Grat",
    tagline: "Noch drei Level bis zum nächsten Item. Ehrlich.",
    monsters: [SESSION_TIMEOUT_ZOMBIE, SESSION_TIMEOUT_ZOMBIE, SESSION_TIMEOUT_ZOMBIE, GRIEFER_IMP],
    level: 4,
    statMultiplier: 13,
    attackMultiplier: 1.82,
    defenseMultiplier: 1.37,
  },
  {
    id: "lvl-10",
    order: 10,
    name: "Sweat-Lobby",
    tagline: "Alle haben Ranked-Erfahrung. Nur du nicht.",
    monsters: [RAGE_QUIT_CONTROLLER, LAG_SPIKE, GRIEFER_IMP, PAY2WIN_TRUHE, AFK_FARMER],
    level: 4,
    statMultiplier: 12.8,
    attackMultiplier: 1.38,
    defenseMultiplier: 1.14,
  },
  {
    id: "lvl-11",
    order: 11,
    name: "Vorzimmer des Endbosses",
    tagline: "Die Ladebildschirm-Musik wird schon bedrohlich.",
    monsters: [SERVERABSTURZ_KRAKEN, SERVERABSTURZ_KRAKEN, RAGE_QUIT_CONTROLLER, RAGE_QUIT_CONTROLLER, GRIEFER_IMP],
    level: 5,
    statMultiplier: 5.2,
    attackMultiplier: 1.17,
    defenseMultiplier: 1.08,
  },
  {
    id: "lvl-12",
    order: 12,
    name: "Boss: Der Season-Pass-Drache",
    tagline: "End of Season. Kein Extra-Leben mehr.",
    monsters: [SEASON_PASS_DRACHE, SERVERABSTURZ_KRAKEN, SERVERABSTURZ_KRAKEN],
    level: 5,
    statMultiplier: 5.2,
    attackMultiplier: 1.7,
    defenseMultiplier: 1.5,
    isBoss: true,
  },
];

/** Kapitel-Level oder (nach Level 12) eine Stufe, siehe endless-levels.ts. */
export function getCampaignLevel(levelId: string): CampaignLevelDef | undefined {
  const chapterLevel = CAMPAIGN_LEVELS.find((l) => l.id === levelId);
  if (chapterLevel) return chapterLevel;
  const stage = parseEndlessStage(levelId);
  return stage !== null ? generateEndlessLevel(stage) : undefined;
}
