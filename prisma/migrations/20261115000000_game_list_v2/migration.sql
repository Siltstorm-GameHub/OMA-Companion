-- Spieleliste V2: IGDB-Verknüpfung, "Hab ich", von Mitgliedern ergänzte Angaben.
-- Rein additiv — kann jederzeit (auch mehrfach) ausgeführt werden.

ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "igdbId" INTEGER;
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "ownCount" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "Game_igdbId_idx" ON "Game"("igdbId");

ALTER TABLE "GameReaction" ADD COLUMN IF NOT EXISTS "owns" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "GameEdit" (
  "id" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "userId" TEXT,
  "field" TEXT NOT NULL,
  "oldValue" JSONB,
  "newValue" JSONB,
  "revertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameEdit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "GameEdit_gameId_idx" ON "GameEdit"("gameId");
CREATE INDEX IF NOT EXISTS "GameEdit_userId_createdAt_idx" ON "GameEdit"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "GameEdit_createdAt_idx" ON "GameEdit"("createdAt");
DO $$ BEGIN
  ALTER TABLE "GameEdit" ADD CONSTRAINT "GameEdit_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "GameEdit" ADD CONSTRAINT "GameEdit_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
