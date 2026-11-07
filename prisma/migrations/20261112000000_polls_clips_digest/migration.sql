-- Umfragen in Beiträgen (mit Münz-Belohnung), Clip-Trim/Vorschaubild, tägliche Sammel-Benachrichtigung.
-- Rein additiv — kann jederzeit (auch mehrfach) ausgeführt werden.

-- Clip: Wiedergabe-Bereich und Vorschaubild
ALTER TABLE "JobMediaAsset" ADD COLUMN IF NOT EXISTS "clipStart" DOUBLE PRECISION;
ALTER TABLE "JobMediaAsset" ADD COLUMN IF NOT EXISTS "clipEnd" DOUBLE PRECISION;
ALTER TABLE "JobMediaAsset" ADD COLUMN IF NOT EXISTS "posterUrl" TEXT;

-- Sammel-Benachrichtigung
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "contentDigestSentAt" TIMESTAMP(3);

-- Umfragen
CREATE TABLE IF NOT EXISTS "PostPoll" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'opinion',
  "participationReward" INTEGER NOT NULL DEFAULT 0,
  "correctReward" INTEGER NOT NULL DEFAULT 0,
  "correctOptionId" TEXT,
  "eventId" TEXT,
  "closesAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostPoll_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PostPoll_reportId_key" ON "PostPoll"("reportId");
CREATE INDEX IF NOT EXISTS "PostPoll_resolvedAt_closesAt_idx" ON "PostPoll"("resolvedAt", "closesAt");

CREATE TABLE IF NOT EXISTS "PostPollOption" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "userId" TEXT,
  CONSTRAINT "PostPollOption_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PostPollOption_pollId_idx" ON "PostPollOption"("pollId");

CREATE TABLE IF NOT EXISTS "PostPollVote" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostPollVote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PostPollVote_pollId_userId_key" ON "PostPollVote"("pollId", "userId");
CREATE INDEX IF NOT EXISTS "PostPollVote_optionId_idx" ON "PostPollVote"("optionId");

CREATE TABLE IF NOT EXISTS "PostPollReward" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "coins" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostPollReward_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PostPollReward_pollId_userId_kind_key" ON "PostPollReward"("pollId", "userId", "kind");
CREATE INDEX IF NOT EXISTS "PostPollReward_userId_createdAt_idx" ON "PostPollReward"("userId", "createdAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PostPoll_reportId_fkey') THEN
    ALTER TABLE "PostPoll" ADD CONSTRAINT "PostPoll_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "JobReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PostPollOption_pollId_fkey') THEN
    ALTER TABLE "PostPollOption" ADD CONSTRAINT "PostPollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "PostPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PostPollVote_pollId_fkey') THEN
    ALTER TABLE "PostPollVote" ADD CONSTRAINT "PostPollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "PostPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PostPollVote_optionId_fkey') THEN
    ALTER TABLE "PostPollVote" ADD CONSTRAINT "PostPollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PostPollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PostPollVote_userId_fkey') THEN
    ALTER TABLE "PostPollVote" ADD CONSTRAINT "PostPollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PostPollReward_userId_fkey') THEN
    ALTER TABLE "PostPollReward" ADD CONSTRAINT "PostPollReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Texte der neuen Benachrichtigungen legt das Seed-Skript beim Build an (poll_reward, content_digest).
