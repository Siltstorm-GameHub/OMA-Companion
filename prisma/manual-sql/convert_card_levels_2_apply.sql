-- ============================================
-- OMA Gems: Karten-Stufen und Duplikate → Münzen — 2) ANWENDEN
-- ============================================
-- Erst convert_card_levels_1_preview.sql ausführen und die Summen prüfen. Dieses Skript
-- schreibt jedem Spieler die Erstattung gut (User.points + PointTransaction), meldet sie per
-- In-App-Benachrichtigung (außer der Spieler hat Münz-Benachrichtigungen abgeschaltet) und
-- setzt danach alle Karten auf Stufe 1 / 1 Kopie. Anschließend kann
-- drop_oma_quest_duels_levels.sql laufen.
--
-- Eine Transaktion: bricht ein Schritt ab, bleibt alles unverändert. Idempotent: ein zweiter
-- Lauf findet keine Karten über Stufe 1 bzw. mit Duplikaten mehr und schreibt nichts.

BEGIN;

CREATE TEMP TABLE card_level_refunds ON COMMIT DROP AS
WITH cfg AS (
  SELECT COALESCE(
    (SELECT "value"::jsonb FROM "BotConfig" WHERE "key" = 'battlecards_upgrade_coin_costs'),
    '{"STANDARD":[120,280,550,950],"COMMUNITY":[180,400,750,1300]}'::jsonb
  ) AS costs
),
per_card AS (
  SELECT
    uc."userId",
    (SELECT COALESCE(SUM((cfg.costs -> c."rarity"::text ->> s)::int), 0)
       FROM generate_series(0, LEAST(uc."level", 5) - 2) AS s)
    + GREATEST(uc."duplicates" - 1, 0) * CASE WHEN c."rarity"::text = 'COMMUNITY' THEN 50 ELSE 25 END AS coins
  FROM "UserCard" uc
  JOIN "Card" c ON c."id" = uc."cardId"
  CROSS JOIN cfg
  WHERE uc."level" > 1 OR uc."duplicates" > 1
)
SELECT "userId", SUM(coins)::int AS coins
FROM per_card
GROUP BY "userId"
HAVING SUM(coins) > 0;

UPDATE "User" u
SET "points" = u."points" + r.coins
FROM card_level_refunds r
WHERE u."id" = r."userId";

INSERT INTO "PointTransaction" ("id", "userId", "amount", "reason")
SELECT 'cl' || md5(r."userId" || clock_timestamp()::text || random()::text), r."userId", r.coins,
       '[Münzen] OMA Gems: Umstellung Karten-Level'
FROM card_level_refunds r;

INSERT INTO "inappnotification" ("id", "userid", "type", "title", "body", "url")
SELECT 'cl' || md5(r."userId" || clock_timestamp()::text || random()::text), r."userId", 'coins',
       'OMA Gems: Karten-Stufen umgestellt',
       'Karten haben keine Stufen mehr. Für deine Upgrades und Duplikate hast du ' || r.coins || ' Münzen erhalten.',
       '/gems?tab=sammlung'
FROM card_level_refunds r
JOIN "User" u ON u."id" = r."userId"
WHERE COALESCE(u."notificationPrefs", '') NOT LIKE '%"points":false%';

UPDATE "UserCard"
SET "level" = 1, "duplicates" = 1
WHERE "level" > 1 OR "duplicates" > 1;

-- Kontrolle: muss 0 ergeben.
SELECT COUNT(*) AS verbleibende_karten_mit_stufe_oder_duplikat
FROM "UserCard"
WHERE "level" > 1 OR "duplicates" > 1;

COMMIT;
