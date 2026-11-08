-- Clip-Gewinner automatisch zuordnen: Twitch-IDs, dauerhafte Admin-Verknüpfungen, vorgemerkte Belohnungen.
-- Rein additiv — kann jederzeit (auch mehrfach) ausgeführt werden.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twitchUserId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_twitchUserId_key" ON "User"("twitchUserId");

ALTER TABLE "ClipNomination" ADD COLUMN IF NOT EXISTS "twitchCreatorId" TEXT;

CREATE TABLE IF NOT EXISTS "TwitchClipperLink" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "twitchLogin" TEXT NOT NULL,
  "twitchUserId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TwitchClipperLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TwitchClipperLink_twitchLogin_key" ON "TwitchClipperLink"("twitchLogin");
CREATE UNIQUE INDEX IF NOT EXISTS "TwitchClipperLink_twitchUserId_key" ON "TwitchClipperLink"("twitchUserId");
CREATE INDEX IF NOT EXISTS "TwitchClipperLink_userId_idx" ON "TwitchClipperLink"("userId");
DO $$ BEGIN
  ALTER TABLE "TwitchClipperLink" ADD CONSTRAINT "TwitchClipperLink_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PendingClipReward" (
  "id" TEXT NOT NULL,
  "contestKind" TEXT NOT NULL,
  "contestId" TEXT NOT NULL,
  "nominationId" TEXT NOT NULL,
  "twitchLogin" TEXT NOT NULL,
  "twitchUserId" TEXT,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "claimedByUserId" TEXT,
  "claimedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PendingClipReward_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PendingClipReward_contestKind_contestId_twitchLogin_key"
  ON "PendingClipReward"("contestKind", "contestId", "twitchLogin");
CREATE INDEX IF NOT EXISTS "PendingClipReward_twitchLogin_idx" ON "PendingClipReward"("twitchLogin");
CREATE INDEX IF NOT EXISTS "PendingClipReward_twitchUserId_idx" ON "PendingClipReward"("twitchUserId");
