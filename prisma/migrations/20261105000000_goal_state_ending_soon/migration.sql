-- Community-Ziele (Meilensteine/Belohnung) und "Endet bald"-Erinnerung für Zeitraum-Events

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "endingSoonSentAt" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN "goalStateJson" TEXT;
