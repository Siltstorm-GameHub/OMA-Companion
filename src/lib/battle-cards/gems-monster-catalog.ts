// ============================================
// OMA-Gems-Monster-Katalog — für Admin-Auswahl bei Turnier-Boss-Teams
// ============================================
// Kombiniert die beiden bestehenden, fest hinterlegten Gegner-Riegen
// (puzzle-monsters.ts + campaign-monsters.ts) zu einem gemeinsamen, per
// cardId adressierbaren Katalog — Admins wählen daraus im Event-Wizard/
// Edit-Formular ein eigenes Boss-Team für ein OMA-Gems-Turnier zusammen,
// statt sich auf die bisherige rein zufällige Auswahl verlassen zu müssen
// (siehe generateGemsTournamentBossTeam in gems-tournament.ts). Rein
// clientseitig unbedenklich importierbar — keine Server-Abhängigkeiten
// (siehe monster-content.ts), nur Kartendaten.

import { QUICKPLAY_MONSTER_TEMPLATES } from "./puzzle-monsters";
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
import type { MonsterTemplate } from "./monster-content";

export const GEMS_MONSTER_CATALOG: MonsterTemplate[] = [
  ...QUICKPLAY_MONSTER_TEMPLATES,
  TUTORIAL_SLIME,
  SESSION_TIMEOUT_ZOMBIE,
  SERVERABSTURZ_KRAKEN,
  RAGE_QUIT_CONTROLLER,
  LAG_SPIKE,
  LOOT_GOBLIN,
  GRIEFER_IMP,
  PAY2WIN_TRUHE,
  AFK_FARMER,
  SEASON_PASS_DRACHE,
];

/** Maximale Team-Größe für ein Turnier-Boss-Team — dieselbe Grenze wie die
 *  bisherige Zufallsauswahl (siehe TEAM_SIZE in gems-tournament.ts). */
export const GEMS_MONSTER_TEAM_MAX = 5;

export function findGemsMonsterTemplate(cardId: string): MonsterTemplate | undefined {
  return GEMS_MONSTER_CATALOG.find((m) => m.cardId === cardId);
}
