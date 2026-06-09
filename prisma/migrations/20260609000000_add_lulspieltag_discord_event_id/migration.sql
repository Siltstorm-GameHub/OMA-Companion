-- AlterTable: discordEventId zu LulSpieltag hinzufügen
ALTER TABLE "LulSpieltag" ADD COLUMN "discordEventId" TEXT;
CREATE UNIQUE INDEX "LulSpieltag_discordEventId_key" ON "LulSpieltag"("discordEventId");
