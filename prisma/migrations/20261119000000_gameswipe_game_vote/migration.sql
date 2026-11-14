-- GameSwipe (Drop der Woche, Empfehlungen, Entdecken-Swipes, Benachrichtigungs-Stand, "neu im Abo")
-- und Spielwahl für Eventreihen (GameVote, Kandidaten, Stimmen, Regeln je Spiel).
-- Rein additiv — kann jederzeit (auch mehrfach) ausgeführt werden. Der Build gleicht das Schema
-- ohnehin per db push ab (scripts/db-push.mjs).

-- AlterTable
ALTER TABLE "EventSeries" ADD COLUMN IF NOT EXISTS "gameRulesJson" TEXT,
ADD COLUMN IF NOT EXISTS "gameVoteJson" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "gameRulesPending" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "subscriptionsAddedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GameVote" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'prepared',
    "winnerGameId" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GameVoteCandidate" (
    "id" TEXT NOT NULL,
    "voteId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "fitScore" INTEGER NOT NULL DEFAULT 0,
    "fitLabel" TEXT,
    "approvals" INTEGER,
    "place" INTEGER,

    CONSTRAINT "GameVoteCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GameVoteBallot" (
    "voteId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameVoteBallot_pkey" PRIMARY KEY ("candidateId","userId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IgdbSwipe" (
    "userId" TEXT NOT NULL,
    "igdbId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IgdbSwipe_pkey" PRIMARY KEY ("userId","igdbId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GameTip" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "byId" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "usedWeek" TEXT,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "GameTip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GameSwipeState" (
    "userId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "dropNotifiedWeek" TEXT,

    CONSTRAINT "GameSwipeState_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GameVote_eventId_key" ON "GameVote"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GameVote_seriesId_idx" ON "GameVote"("seriesId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GameVote_status_closesAt_idx" ON "GameVote"("status", "closesAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GameVoteCandidate_voteId_gameId_key" ON "GameVoteCandidate"("voteId", "gameId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GameVoteBallot_voteId_userId_idx" ON "GameVoteBallot"("voteId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IgdbSwipe_igdbId_idx" ON "IgdbSwipe"("igdbId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GameTip_status_idx" ON "GameTip"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GameTip_gameId_idx" ON "GameTip"("gameId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GameVote" ADD CONSTRAINT "GameVote_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GameVote" ADD CONSTRAINT "GameVote_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "EventSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GameVoteCandidate" ADD CONSTRAINT "GameVoteCandidate_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "GameVote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GameVoteCandidate" ADD CONSTRAINT "GameVoteCandidate_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GameVoteBallot" ADD CONSTRAINT "GameVoteBallot_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "GameVote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GameVoteBallot" ADD CONSTRAINT "GameVoteBallot_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "GameVoteCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GameVoteBallot" ADD CONSTRAINT "GameVoteBallot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "IgdbSwipe" ADD CONSTRAINT "IgdbSwipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GameTip" ADD CONSTRAINT "GameTip_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GameTip" ADD CONSTRAINT "GameTip_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GameTip" ADD CONSTRAINT "GameTip_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GameSwipeState" ADD CONSTRAINT "GameSwipeState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

