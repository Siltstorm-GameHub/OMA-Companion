-- AlterTable: Add Special Event fields to LulSpieltag
ALTER TABLE "LulSpieltag" ADD COLUMN "isSpecial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LulSpieltag" ADD COLUMN "title" TEXT;
ALTER TABLE "LulSpieltag" ADD COLUMN "description" TEXT;
ALTER TABLE "LulSpieltag" ADD COLUMN "maxPlayers" INTEGER;
ALTER TABLE "LulSpieltag" ALTER COLUMN "game" DROP NOT NULL;
