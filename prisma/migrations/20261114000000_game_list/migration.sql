-- Spieleliste (/spiele): gemeinsame Spiele-Datenbank mit Sterne-Bewertungen.
-- Rein additiv — kann jederzeit (auch mehrfach) ausgeführt werden.

CREATE TABLE IF NOT EXISTS "Game" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "nameKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "steamAppId" INTEGER,
  "coverUrl" TEXT,
  "description" TEXT,
  "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "modes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "crossplay" BOOLEAN NOT NULL DEFAULT false,
  "isFree" BOOLEAN,
  "minPlayers" INTEGER,
  "maxPlayers" INTEGER,
  "sessionLength" TEXT,
  "releaseYear" INTEGER,
  "fieldSources" JSONB,
  "enrichedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'APPROVED',
  "ratingSum" INTEGER NOT NULL DEFAULT 0,
  "ratingCount" INTEGER NOT NULL DEFAULT 0,
  "wantCount" INTEGER NOT NULL DEFAULT 0,
  "addedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Game_slug_key" ON "Game"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Game_nameKey_key" ON "Game"("nameKey");
CREATE UNIQUE INDEX IF NOT EXISTS "Game_steamAppId_key" ON "Game"("steamAppId");
CREATE INDEX IF NOT EXISTS "Game_status_idx" ON "Game"("status");
DO $$ BEGIN
  ALTER TABLE "Game" ADD CONSTRAINT "Game_addedById_fkey"
    FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "GameReaction" (
  "userId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "rating" INTEGER,
  "wantPlay" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GameReaction_pkey" PRIMARY KEY ("userId","gameId")
);
CREATE INDEX IF NOT EXISTS "GameReaction_gameId_idx" ON "GameReaction"("gameId");
DO $$ BEGIN
  ALTER TABLE "GameReaction" ADD CONSTRAINT "GameReaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "GameReaction" ADD CONSTRAINT "GameReaction_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
