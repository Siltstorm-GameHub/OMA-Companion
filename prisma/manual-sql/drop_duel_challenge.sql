-- Münzen-Duell (1v1-Münzwurf mit Einsatz) komplett entfernt.
-- VOR dem nächsten Production-Deploy im Supabase SQL-Editor ausführen — db push löscht
-- Tabellen mit Daten nicht selbst und würde den Build sonst abbrechen.
--
-- Offene Herausforderungen hatten den Einsatz des Herausforderers bereits abgebucht (Escrow).
-- Diese Einsätze werden hier zuerst zurückerstattet, danach wird die Tabelle gelöscht.

BEGIN;

INSERT INTO "PointTransaction" ("id", "userId", "amount", "reason", "createdAt")
SELECT gen_random_uuid()::text, "challengerId", "wager", '↩️ Duell-Einsatz erstattet (Duelle eingestellt)', NOW()
FROM "DuelChallenge"
WHERE "status" = 'pending';

UPDATE "User" u
SET "points" = u."points" + d.total
FROM (
  SELECT "challengerId", SUM("wager") AS total
  FROM "DuelChallenge"
  WHERE "status" = 'pending'
  GROUP BY "challengerId"
) d
WHERE u."id" = d."challengerId";

DROP TABLE IF EXISTS "DuelChallenge";

-- Admin-Einstellungen der Duelle
DELETE FROM "BotConfig" WHERE "key" LIKE 'minigames_duel_%';

COMMIT;
