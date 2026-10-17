-- ============================================
-- OMA Gems Phase 4: Datenbank aufräumen (OMA Quest, OMA Duels, PvP/Elo, Held, Karten-Stufen)
-- ============================================
-- Entfernt alle Tabellen und Spalten, die seit der Reduktion auf OMA Gems kein Code mehr
-- nutzt (siehe docs/gems-reduktion-plan.md, Phase 4). Passt zum bereinigten prisma/schema.prisma —
-- erst danach kann der Production-Build (scripts/db-push.mjs, ohne --accept-data-loss) wieder
-- durchlaufen.
--
-- REIHENFOLGE — unbedingt einhalten:
--   1. Sicherung ziehen (pg_dump der kompletten DB).
--   2. Karten-Stufen und Duplikate in Münzen umwandeln — im SQL-Editor:
--        convert_card_levels_1_preview.sql   (Vorschau, Summen prüfen)
--        convert_card_levels_2_apply.sql     (anwenden)
--      oder lokal mit Produktions-DATABASE_URL: npx tsx scripts/convert-card-levels.ts [--apply]
--      Es erstattet Karten-Stufen und Duplikate als Münzen. Danach stehen alle Karten auf
--      Stufe 1 / 1 Kopie — genau das prüft dieses Skript unten und bricht sonst ab.
--   3. Dieses Skript im Supabase SQL-Editor ausführen (kompletter Block).
--   4. Phase 4 deployen.
--
-- Idempotent: mehrfaches Ausführen ist unproblematisch. Läuft in einer Transaktion — bricht
-- ein Schritt ab, bleibt alles unverändert.
--
-- Bewusst NICHT entfernt: die Enum-Werte GEMS_PVP_CHEST/QUEST_MILESTONE/TUTORIAL in
-- "CardPackSource" (alte Pack-Datensätze verweisen darauf, Postgres kann Enum-Werte nicht
-- einfach löschen) und "LiveBattle"."playerBId" (gefüllt bei Alt-Kämpfen aus dem PvP).

BEGIN;

-- ---------- 0) Sicherheitsprüfung: Umstellungs-Skript gelaufen? ----------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'UserCard' AND column_name = 'level'
  ) THEN
    IF EXISTS (SELECT 1 FROM "UserCard" WHERE "level" > 1 OR "duplicates" > 1) THEN
      RAISE EXCEPTION 'Es gibt noch Karten über Stufe 1 bzw. mit Duplikaten — zuerst scripts/convert-card-levels.ts --apply ausführen.';
    END IF;
  END IF;
END $$;

-- ---------- 1) OMA Quest: Tabellen (Kinder vor Eltern) ----------
DROP TABLE IF EXISTS "DndGroupFightMember";
DROP TABLE IF EXISTS "DndGroupFight";
DROP TABLE IF EXISTS "DndPartyMember";
DROP TABLE IF EXISTS "DndPartyInvite";
DROP TABLE IF EXISTS "DndParty";
DROP TABLE IF EXISTS "DndWorldEventRoll";
DROP TABLE IF EXISTS "DndWorldEvent";
DROP TABLE IF EXISTS "DndEventLog";
DROP TABLE IF EXISTS "DndStoryNode";
DROP TABLE IF EXISTS "DndQuestProgress";
DROP TABLE IF EXISTS "DndQuest";
DROP TABLE IF EXISTS "DndInventoryItem";
DROP TABLE IF EXISTS "DndPresence";
DROP TABLE IF EXISTS "DndChatReport";
DROP TABLE IF EXISTS "DndChatMute";
DROP TABLE IF EXISTS "DndChatMessage";
DROP TABLE IF EXISTS "DndChronicle";
DROP TABLE IF EXISTS "DndRemovedContent";
DROP TABLE IF EXISTS "DndCustomWorld";
DROP TABLE IF EXISTS "DndTitleDef";
DROP TABLE IF EXISTS "DndSeasonEvent";

-- Card verweist per currentLocationId auf DndLocation — Spalte zuerst, dann die Tabelle.
ALTER TABLE "Card" DROP COLUMN IF EXISTS "currentLocationId";
DROP TABLE IF EXISTS "DndLocation";
DROP TYPE IF EXISTS "DndLocationType";

-- ---------- 2) Card: Charakterbogen, Helden-Einrichtung, Reise, Rollenspiel ----------
ALTER TABLE "Card"
  DROP COLUMN IF EXISTS "dndRace",
  DROP COLUMN IF EXISTS "dndClass",
  DROP COLUMN IF EXISTS "abilityScores",
  DROP COLUMN IF EXISTS "backstory",
  DROP COLUMN IF EXISTS "dndCreatedAt",
  DROP COLUMN IF EXISTS "heroRolledAt",
  DROP COLUMN IF EXISTS "heroPackAt",
  DROP COLUMN IF EXISTS "dndRerollCredits",
  DROP COLUMN IF EXISTS "dndXp",
  DROP COLUMN IF EXISTS "currentHexCol",
  DROP COLUMN IF EXISTS "currentHexRow",
  DROP COLUMN IF EXISTS "travelToCol",
  DROP COLUMN IF EXISTS "travelToRow",
  DROP COLUMN IF EXISTS "travelPath",
  DROP COLUMN IF EXISTS "travelDepartedAt",
  DROP COLUMN IF EXISTS "travelArrivesAt",
  DROP COLUMN IF EXISTS "dndGold",
  DROP COLUMN IF EXISTS "dndAttrPoints",
  DROP COLUMN IF EXISTS "dndPerkPicks",
  DROP COLUMN IF EXISTS "dndPerks",
  DROP COLUMN IF EXISTS "dndAbilityBonus",
  DROP COLUMN IF EXISTS "dndLevelClaimed",
  DROP COLUMN IF EXISTS "dndOwnedTitles",
  DROP COLUMN IF EXISTS "dndTitle",
  DROP COLUMN IF EXISTS "dndCoinPerkBuys",
  DROP COLUMN IF EXISTS "dndCombat",
  DROP COLUMN IF EXISTS "dndCombatV",
  DROP COLUMN IF EXISTS "dndSkills",
  DROP COLUMN IF EXISTS "cardUnlocks",
  DROP COLUMN IF EXISTS "dndCompanions",
  DROP COLUMN IF EXISTS "dndCompanion",
  DROP COLUMN IF EXISTS "dndFlags";

-- ---------- 3) OMA Duels, PvP, Tutorial ----------
DROP TABLE IF EXISTS "UserTacticCard";
DROP TABLE IF EXISTS "TacticCard";
DROP TYPE IF EXISTS "TacticCardKind";
DROP TABLE IF EXISTS "DuelDeck";
DROP TABLE IF EXISTS "BattleChallenge";
DROP TABLE IF EXISTS "BattleQueueEntry";
DROP TABLE IF EXISTS "UserTutorialProgress";

-- ---------- 4) User: Elo und Sieges-Serie ----------
ALTER TABLE "User"
  DROP COLUMN IF EXISTS "battleWinStreak",
  DROP COLUMN IF EXISTS "battleBestWinStreak",
  DROP COLUMN IF EXISTS "eloDuels",
  DROP COLUMN IF EXISTS "eloDuelsMatches",
  DROP COLUMN IF EXISTS "eloGems",
  DROP COLUMN IF EXISTS "eloGemsMatches";

-- ---------- 5) UserCard: keine Stufen/Duplikate mehr ----------
ALTER TABLE "UserCard"
  DROP COLUMN IF EXISTS "level",
  DROP COLUMN IF EXISTS "duplicates";

COMMIT;
