-- Collectibles System

CREATE TABLE "CollectibleCollection" (
  "id"          TEXT      NOT NULL,
  "name"        TEXT      NOT NULL,
  "description" TEXT,
  "game"        TEXT,
  "coverEmoji"  TEXT      NOT NULL DEFAULT '🎮',
  "active"      BOOLEAN   NOT NULL DEFAULT true,
  "sortOrder"   INTEGER   NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollectibleCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollectibleItem" (
  "id"           TEXT      NOT NULL,
  "collectionId" TEXT      NOT NULL,
  "name"         TEXT      NOT NULL,
  "description"  TEXT,
  "emoji"        TEXT      NOT NULL DEFAULT '🎮',
  "rarity"       TEXT      NOT NULL DEFAULT 'common',
  "price"        INTEGER   NOT NULL,
  "stock"        INTEGER,
  "sortOrder"    INTEGER   NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollectibleItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CollectibleItem_collectionId_fkey"
    FOREIGN KEY ("collectionId") REFERENCES "CollectibleCollection"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "UserCollectible" (
  "id"                TEXT      NOT NULL,
  "userId"            TEXT      NOT NULL,
  "collectibleItemId" TEXT      NOT NULL,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserCollectible_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserCollectible_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserCollectible_collectibleItemId_fkey"
    FOREIGN KEY ("collectibleItemId") REFERENCES "CollectibleItem"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserCollectible_userId_collectibleItemId_key"
  ON "UserCollectible"("userId", "collectibleItemId");

-- Showcase-Slots am User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "showcaseJson" TEXT;

-- Alte User-Spalten die nicht mehr benötigt werden (optional, sicher wenn vorhanden)
ALTER TABLE "User" DROP COLUMN IF EXISTS "activeTitle";
ALTER TABLE "User" DROP COLUMN IF EXISTS "profileTheme";
ALTER TABLE "User" DROP COLUMN IF EXISTS "nameColor";
ALTER TABLE "User" DROP COLUMN IF EXISTS "statusMessage";
ALTER TABLE "User" DROP COLUMN IF EXISTS "goalItemId";
