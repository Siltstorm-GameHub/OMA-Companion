-- Migration: Merge Tournament into Event
-- Event und Tournament werden zu einer Tabelle zusammengeführt.
-- Match, TournamentParticipant, Team erhalten eventId statt tournamentId.

-- ─── Schritt 1: Neue Tournament-Felder direkt in Event anlegen (nullable) ──────
ALTER TABLE "Event" ADD COLUMN "format"           TEXT;
ALTER TABLE "Event" ADD COLUMN "tournamentStatus" TEXT;
ALTER TABLE "Event" ADD COLUMN "pointsConfig"     TEXT;
ALTER TABLE "Event" ADD COLUMN "statFields"       TEXT;
ALTER TABLE "Event" ADD COLUMN "finalRankingJson" TEXT;
ALTER TABLE "Event" ADD COLUMN "finalRankingNote" TEXT;

-- ─── Schritt 2: Daten aus Tournament in Event kopieren ───────────────────────
UPDATE "Event" e
SET
  "format"           = t.format,
  "tournamentStatus" = t.status,
  "pointsConfig"     = t."pointsConfig",
  "statFields"       = t."statFields",
  "finalRankingJson" = t."finalRankingJson",
  "finalRankingNote" = t."finalRankingNote"
FROM "Tournament" t
WHERE t."eventId" = e.id;

-- ─── Schritt 3: eventId-Spalten zu Match, TournamentParticipant, Team ────────
ALTER TABLE "Match" ADD COLUMN "eventId" TEXT;
ALTER TABLE "TournamentParticipant" ADD COLUMN "eventId" TEXT;
ALTER TABLE "Team" ADD COLUMN "eventId" TEXT;

-- ─── Schritt 4: eventId befüllen (via Tournament JOIN) ───────────────────────
UPDATE "Match" m
SET "eventId" = t."eventId"
FROM "Tournament" t
WHERE t.id = m."tournamentId";

UPDATE "TournamentParticipant" tp
SET "eventId" = t."eventId"
FROM "Tournament" t
WHERE t.id = tp."tournamentId";

UPDATE "Team" tm
SET "eventId" = t."eventId"
FROM "Tournament" t
WHERE t.id = tm."tournamentId";

-- ─── Schritt 5: NOT NULL erzwingen (nur wenn Datensätze vorhanden) ────────────
-- Zeilen ohne tournamentId (d.h. ohne eventId) würden hier scheitern.
-- Falls Matches/Participants/Teams ohne Tournament existieren: vorher bereinigen.
ALTER TABLE "Match" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "TournamentParticipant" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "Team" ALTER COLUMN "eventId" SET NOT NULL;

-- ─── Schritt 6: FK-Constraints für eventId anlegen ───────────────────────────
ALTER TABLE "Match" ADD CONSTRAINT "Match_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Team" ADD CONSTRAINT "Team_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Schritt 7: Unique-Constraint für TournamentParticipant anpassen ─────────
-- Alter: UNIQUE(tournamentId, userId) → Neu: UNIQUE(eventId, userId)
ALTER TABLE "TournamentParticipant" DROP CONSTRAINT IF EXISTS "TournamentParticipant_tournamentId_userId_key";
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_eventId_userId_key"
  UNIQUE ("eventId", "userId");

-- ─── Schritt 8: Alte tournamentId-FKs und -Spalten entfernen ─────────────────
ALTER TABLE "Match" DROP CONSTRAINT IF EXISTS "Match_tournamentId_fkey";
ALTER TABLE "Match" DROP COLUMN "tournamentId";

ALTER TABLE "TournamentParticipant" DROP CONSTRAINT IF EXISTS "TournamentParticipant_tournamentId_fkey";
ALTER TABLE "TournamentParticipant" DROP COLUMN "tournamentId";

ALTER TABLE "Team" DROP CONSTRAINT IF EXISTS "Team_tournamentId_fkey";
ALTER TABLE "Team" DROP COLUMN "tournamentId";

-- ─── Schritt 9: Tournament-Tabelle löschen ───────────────────────────────────
DROP TABLE "Tournament";
