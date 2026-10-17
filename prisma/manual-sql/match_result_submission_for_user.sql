-- Ergebnis-Meldungen für andere Spieler: "MatchResultSubmission"."forUserId" + neuer Unique-Key
-- (matchId, userId, forUserId) statt (matchId, userId).
--
-- Warum manuell: Einen Unique-Constraint auf eine Tabelle mit Daten legt der Production-Build
-- (scripts/db-push.mjs, ohne --accept-data-loss) nicht selbst an — er bricht ab.
-- Der neue Key ist breiter als der alte, bestehende Zeilen können also nicht kollidieren.
--
-- Der alte Index "MatchResultSubmission_matchId_userId_key" bleibt hier bewusst stehen, damit die
-- laufende alte Version (upsert auf matchId+userId) bis zum Umschalten funktioniert. Das Entfernen
-- eines Index ist kein Datenverlust — das erledigt der Build beim Deploy selbst.
--
-- REIHENFOLGE:
--   1. Dieses Skript im Supabase SQL-Editor ausführen (kompletter Block).
--   2. Erneut deployen.
--
-- Idempotent: mehrfaches Ausführen ist unproblematisch, auch nach dem Deploy.

BEGIN;

ALTER TABLE "MatchResultSubmission" ADD COLUMN IF NOT EXISTS "forUserId" TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS "MatchResultSubmission_matchId_userId_forUserId_key"
  ON "MatchResultSubmission"("matchId", "userId", "forUserId");

COMMIT;
