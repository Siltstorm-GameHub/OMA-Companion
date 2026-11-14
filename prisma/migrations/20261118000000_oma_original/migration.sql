-- OMA Original: Kennzeichnung eigener Events und Eventreihen der Old Masters Allies.
-- Rein additiv — kann jederzeit (auch mehrfach) ausgeführt werden.

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "omaOriginal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EventSeries" ADD COLUMN IF NOT EXISTS "omaOriginal" BOOLEAN NOT NULL DEFAULT false;
