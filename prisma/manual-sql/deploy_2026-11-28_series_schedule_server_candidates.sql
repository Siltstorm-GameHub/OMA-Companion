-- VOR dem nächsten Production-Deploy ausführen, sonst bricht prisma db push ab.
-- Grund: Der neue eindeutige Index "Event_seriesId_slotIndex_key" gilt für Prisma als mögliche
-- Datenverlust-Warnung (db push läuft ohne --accept-data-loss). Hier legen wir ihn selbst an —
-- slotIndex ist neu und überall NULL, Dubletten kann es also nicht geben. Danach sieht db push keine
-- Abweichung mehr.
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard → SQL Editor
-- Idempotent: mehrfaches Ausführen ist unproblematisch. Rein additiv, es wird nichts gelöscht.
-- (Nicht pending_schema_changes.sql am Stück ausführen — die Sammeldatei enthält veraltete Tabellen
--  wie "CardPack", die es nicht mehr gibt.)

-- ── Eventreihen: Terminplanung (Migration 20261126000000_series_schedule) ─────────────────────

ALTER TABLE "EventSeries" ADD COLUMN IF NOT EXISTS "scheduleMode" TEXT;
ALTER TABLE "EventSeries" ADD COLUMN IF NOT EXISTS "scheduleJson" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "slotIndex" INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS "Event_seriesId_slotIndex_key" ON "Event"("seriesId", "slotIndex");

-- ── Eventreihen: Termin-Vorlage (Migration 20261127000000_series_term_template) ───────────────

ALTER TABLE "EventSeries" ADD COLUMN IF NOT EXISTS "termTemplateJson" TEXT;

-- ── Community-Gameserver: Server-Kandidaten aus der Spieleliste ───────────────────────────────

ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "serverCapable" BOOLEAN;
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "serverSource" TEXT;

CREATE TABLE IF NOT EXISTS "GameServerInterest" (
  "userId"    TEXT         NOT NULL,
  "gameId"    TEXT         NOT NULL,
  "level"     TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GameServerInterest_pkey" PRIMARY KEY ("userId", "gameId")
);
CREATE INDEX IF NOT EXISTS "GameServerInterest_gameId_idx" ON "GameServerInterest"("gameId");

DO $$ BEGIN
  ALTER TABLE "GameServerInterest" ADD CONSTRAINT "GameServerInterest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GameServerInterest" ADD CONSTRAINT "GameServerInterest_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
