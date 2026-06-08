-- PollJob: Frage-Feld nachträglich hinzufügen
-- Nur ausführen wenn die PollJob-Tabelle bereits existiert (vorherige Migration war schon ausgeführt)
ALTER TABLE "PollJob" ADD COLUMN IF NOT EXISTS "question" TEXT;
