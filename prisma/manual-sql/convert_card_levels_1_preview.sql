-- ============================================
-- OMA Gems: Karten-Stufen und Duplikate → Münzen — 1) VORSCHAU (ändert nichts)
-- ============================================
-- SQL-Variante von scripts/convert-card-levels.ts für den Supabase SQL-Editor. Zeigt je
-- Spieler, wie viele Münzen die Umstellung gutschreiben würde. Danach
-- convert_card_levels_2_apply.sql ausführen, dann drop_oma_quest_duels_levels.sql.
--
-- Erstattung je Karte (siehe lib/battle-cards/card-coins.ts):
--  - bezahlte Upgrade-Kosten für jede Stufe über 1 (Admin-Override aus BotConfig, sonst Standard)
--  - 25 Münzen je überzähliger Kopie (Community-Karten: 50)

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
       FROM generate_series(0, LEAST(uc."level", 5) - 2) AS s) AS upgrade_coins,
    GREATEST(uc."duplicates" - 1, 0) * CASE WHEN c."rarity"::text = 'COMMUNITY' THEN 50 ELSE 25 END AS duplicate_coins
  FROM "UserCard" uc
  JOIN "Card" c ON c."id" = uc."cardId"
  CROSS JOIN cfg
  WHERE uc."level" > 1 OR uc."duplicates" > 1
)
SELECT
  COALESCE(u."username", u."name", p."userId") AS spieler,
  COUNT(*) AS karten,
  SUM(p.upgrade_coins) AS muenzen_upgrades,
  SUM(p.duplicate_coins) AS muenzen_duplikate,
  SUM(p.upgrade_coins + p.duplicate_coins) AS muenzen_gesamt
FROM per_card p
JOIN "User" u ON u."id" = p."userId"
GROUP BY p."userId", u."username", u."name"
ORDER BY muenzen_gesamt DESC;
