-- Clip des Jahres: jährliche Umfrage über alle Clip-des-Monats-Gewinner
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS "YearlyClipContest" (
  "id"                  TEXT         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "year"                INTEGER      NOT NULL,
  "votingEndsAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status"              TEXT         NOT NULL DEFAULT 'voting',
  "participationCoins"  INTEGER      NOT NULL DEFAULT 10,
  "rewardCoins"         INTEGER      NOT NULL DEFAULT 1000,
  "nominationIds"       TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "winnerNominationIds" TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "YearlyClipContest_year_key" UNIQUE ("year")
);

CREATE TABLE IF NOT EXISTS "YearlyClipContestVote" (
  "id"           TEXT         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "contestId"    TEXT         NOT NULL,
  "nominationId" TEXT         NOT NULL,
  "userId"       TEXT         NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "YearlyClipContestVote_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "YearlyClipContest"("id") ON DELETE CASCADE,
  CONSTRAINT "YearlyClipContestVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "YearlyClipContestVote_contestId_userId_key" UNIQUE ("contestId", "userId")
);

CREATE INDEX IF NOT EXISTS "YearlyClipContestVote_contestId_idx" ON "YearlyClipContestVote"("contestId");
