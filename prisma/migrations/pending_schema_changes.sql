-- Ausstehende Schema-Änderungen
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard → SQL Editor

-- ═══════════════════════════════════════════════════════════════
-- EventPoll: nachträglicher Ausschluss von Kandidaten
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "EventPoll" ADD COLUMN IF NOT EXISTS "excludedUserIds" TEXT;

-- ═══════════════════════════════════════════════════════════════
-- LUL Flexibles Voting & Punktesystem (neue Saisons via Wizard)
-- ═══════════════════════════════════════════════════════════════

-- LulSeason: konfigurierbares Punktesystem
ALTER TABLE "LulSeason" ADD COLUMN IF NOT EXISTS "pointsConfig" TEXT;

-- LulLegacyEntry: flexible Poll-Statistiken für neue Saisons
ALTER TABLE "LulLegacyEntry" ADD COLUMN IF NOT EXISTS "pollStatsJson" TEXT;

-- LulEntry: gewonnene Umfragen via statKey (neue flexible Saisons)
ALTER TABLE "LulEntry" ADD COLUMN IF NOT EXISTS "pollWinsJson" TEXT;

-- LulSpieltag: status "umfrage" (zwischen active und finished) — kein ALTER nötig, TEXT-Feld

-- LulPoll: konfigurierbare In-App-Umfrage pro Spieltag
CREATE TABLE IF NOT EXISTS "LulPoll" (
  "id"              TEXT         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "spieltagId"      TEXT         NOT NULL,
  "statKey"         TEXT         NOT NULL,
  "label"           TEXT         NOT NULL,
  "question"        TEXT         NOT NULL,
  "type"            TEXT         NOT NULL,
  "endsAt"          TIMESTAMP(3) NOT NULL,
  "excludedUserIds" TEXT,
  "status"          TEXT         NOT NULL DEFAULT 'open',
  "winnerIds"       TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LulPoll_spieltagId_fkey" FOREIGN KEY ("spieltagId") REFERENCES "LulSpieltag"("id") ON DELETE CASCADE
);

-- LulPollVote: eine Stimme pro User pro Umfrage (UPSERT erlaubt, DELETE nicht)
CREATE TABLE IF NOT EXISTS "LulPollVote" (
  "id"        TEXT         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pollId"    TEXT         NOT NULL,
  "voterId"   TEXT         NOT NULL,
  "targetId"  TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LulPollVote_pollId_fkey"   FOREIGN KEY ("pollId")   REFERENCES "LulPoll"("id") ON DELETE CASCADE,
  CONSTRAINT "LulPollVote_voterId_fkey"  FOREIGN KEY ("voterId")  REFERENCES "User"("id"),
  CONSTRAINT "LulPollVote_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id"),
  CONSTRAINT "LulPollVote_pollId_voterId_key" UNIQUE ("pollId", "voterId")
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS "LulPoll_spieltagId_idx" ON "LulPoll"("spieltagId");
CREATE INDEX IF NOT EXISTS "LulPollVote_pollId_idx" ON "LulPollVote"("pollId");

-- ═══════════════════════════════════════════════════════════════
-- LUL-Saisons als normale EventSeries behandeln (neues System)
-- ═══════════════════════════════════════════════════════════════

-- LulSeason: Link zur EventSeries (wenn gesetzt → neue Saison, sichtbar als normale Eventreihe)
ALTER TABLE "LulSeason" ADD COLUMN IF NOT EXISTS "seriesId" TEXT UNIQUE;
DO $$ BEGIN
  ALTER TABLE "LulSeason" ADD CONSTRAINT "LulSeason_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "EventSeries"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- LulSpieltag: Link zum regulären Event (wenn gesetzt → Spieltag ist als normales Event sichtbar)
ALTER TABLE "LulSpieltag" ADD COLUMN IF NOT EXISTS "eventId" TEXT UNIQUE;
DO $$ BEGIN
  ALTER TABLE "LulSpieltag" ADD CONSTRAINT "LulSpieltag_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════

-- 1. User: Gruß / Bio
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;

-- 2. CollectibleItem: aktiv/inaktiv Toggle
ALTER TABLE "CollectibleItem" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- 3. CollectibleItem: zeitlich begrenzter Sale
ALTER TABLE "CollectibleItem" ADD COLUMN IF NOT EXISTS "salePrice" INTEGER;
ALTER TABLE "CollectibleItem" ADD COLUMN IF NOT EXISTS "saleUntil" TIMESTAMP(3);

-- 4. EventSeries: statFields
ALTER TABLE "EventSeries" ADD COLUMN IF NOT EXISTS "statFields" TEXT;

-- 4c. EventSeries: platform (mirrors Event.platform, benötigt von Eventreihe-Bearbeiten UI)
ALTER TABLE "EventSeries" ADD COLUMN IF NOT EXISTS "platform" TEXT;

-- 4b. EventSeries: seriesStatConfig + legacyStandings
ALTER TABLE "EventSeries" ADD COLUMN IF NOT EXISTS "seriesStatConfig" TEXT;
ALTER TABLE "EventSeries" ADD COLUMN IF NOT EXISTS "legacyStandings" TEXT;

-- 5. Geplante Discord-Umfragen
CREATE TABLE IF NOT EXISTS "PollJob" (
  "id"          TEXT      NOT NULL PRIMARY KEY,
  "type"        TEXT      NOT NULL,
  "refId"       TEXT      NOT NULL,
  "channelId"   TEXT      NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "duration"    INTEGER   NOT NULL DEFAULT 168,
  "question"    TEXT,
  "status"      TEXT      NOT NULL DEFAULT 'pending',
  "messageId"   TEXT,
  "errorMsg"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt"      TIMESTAMP(3)
);
