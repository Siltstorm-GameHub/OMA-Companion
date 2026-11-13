-- ============================================
-- OMA Gems entfernen: alle Tabellen von OMA Gems und dem früheren Karten-/Kampfsystem
-- ============================================
-- Passt zum bereinigten prisma/schema.prisma (OMA Gems ist komplett aus der App entfernt, OMA Blocks
-- liegt jetzt unter /games). Der Production-Build (scripts/db-push.mjs, ohne --accept-data-loss)
-- bricht ab, solange diese Tabellen noch Daten enthalten — deshalb zuerst dieses Skript.
--
-- ACHTUNG: Nicht wiederherstellbar. Es gibt keine automatischen Datenbank-Backups. Wer die Daten
-- aufheben will, exportiert die Tabellen vorher (Supabase: Table Editor → Export as CSV, oder pg_dump).
--
-- REIHENFOLGE:
--   1. Optional: Tabellen exportieren (siehe oben).
--   2. Dieses Skript im Supabase SQL-Editor ausführen (kompletter Block).
--   3. Direkt danach deployen. Bis der neue Stand live ist, zeigt die alte Version unter /gems Fehler
--      (die Tabellen fehlen dann schon) — OMA Blocks und der Rest der App laufen weiter.
--
-- Gelöscht werden:
--   OMA Gems:            "GemsRun", "GemsBest", "GemsMonth"
--   Früheres Kartenspiel: "Card", "UserCard", "CardPack", "Battle", "LiveBattle", "UserCampaignProgress",
--                        "GemsTournament", "GemsTournamentAttempt", "GemsDailyStats", "GemsPlayer",
--                        "UserRelic", "GemsTowerClear", "GemsTowerSeason", "GemsWaveBest", "GemsWaveSeason"
--   Enums:               "CardClass", "CardRarity", "ActivityTier", "NormalAttackTargetRule",
--                        "BattleResult", "CardPackSource", "CardPackKind"
--   Einstellungen:       BotConfig "gems_monthly_rewards" (Monatssieger-Belohnung von OMA Gems)
--   Quest:               die Quest „OMA Gems“ (Typ BATTLE_CARD_DUEL) des laufenden Monats samt
--                        Fortschritt — sie wäre nicht mehr erfüllbar. Quests früherer Monate bleiben.
--
-- Bleibt: "UserCosmetic" (gehört zum Kosmetik-Shop), alle OMA-Blocks-Tabellen.
--
-- Idempotent: mehrfaches Ausführen ist unproblematisch. Läuft in einer Transaktion — bricht ein
-- Schritt ab, bleibt alles unverändert.

BEGIN;

-- ---------- OMA Gems ----------
DROP TABLE IF EXISTS "GemsRun" CASCADE;
DROP TABLE IF EXISTS "GemsBest" CASCADE;
DROP TABLE IF EXISTS "GemsMonth" CASCADE;

-- ---------- Früheres Karten-/Kampfsystem ----------
DROP TABLE IF EXISTS "GemsTournamentAttempt" CASCADE;
DROP TABLE IF EXISTS "GemsTournament" CASCADE;
DROP TABLE IF EXISTS "GemsDailyStats" CASCADE;
DROP TABLE IF EXISTS "GemsPlayer" CASCADE;
DROP TABLE IF EXISTS "UserRelic" CASCADE;
DROP TABLE IF EXISTS "GemsTowerClear" CASCADE;
DROP TABLE IF EXISTS "GemsTowerSeason" CASCADE;
DROP TABLE IF EXISTS "GemsWaveBest" CASCADE;
DROP TABLE IF EXISTS "GemsWaveSeason" CASCADE;
DROP TABLE IF EXISTS "UserCampaignProgress" CASCADE;
DROP TABLE IF EXISTS "LiveBattle" CASCADE;
DROP TABLE IF EXISTS "Battle" CASCADE;
DROP TABLE IF EXISTS "CardPack" CASCADE;
DROP TABLE IF EXISTS "UserCard" CASCADE;
DROP TABLE IF EXISTS "Card" CASCADE;

-- ---------- Enums (erst nach den Tabellen, die sie nutzen) ----------
DROP TYPE IF EXISTS "CardClass";
DROP TYPE IF EXISTS "CardRarity";
DROP TYPE IF EXISTS "ActivityTier";
DROP TYPE IF EXISTS "NormalAttackTargetRule";
DROP TYPE IF EXISTS "BattleResult";
DROP TYPE IF EXISTS "CardPackSource";
DROP TYPE IF EXISTS "CardPackKind";

-- ---------- Einstellungen und laufende Quest ----------
DELETE FROM "BotConfig" WHERE "key" = 'gems_monthly_rewards';

DELETE FROM "Quest"
WHERE "type" = 'BATTLE_CARD_DUEL'
  AND "year" = EXTRACT(YEAR FROM (now() AT TIME ZONE 'Europe/Berlin'))::int
  AND "month" = EXTRACT(MONTH FROM (now() AT TIME ZONE 'Europe/Berlin'))::int;
-- (Fortschritte hängen per ON DELETE CASCADE an der Quest und verschwinden mit.)

COMMIT;

-- Kontrolle (soll keine Zeile liefern):
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name IN ('GemsRun','GemsBest','GemsMonth','Card','UserCard','CardPack','Battle','LiveBattle',
--       'UserCampaignProgress','GemsTournament','GemsTournamentAttempt','GemsDailyStats','GemsPlayer',
--       'UserRelic','GemsTowerClear','GemsTowerSeason','GemsWaveBest','GemsWaveSeason');
