-- Event-Verwaltung: Ablehnung von Mitglieder-Events (mit Grund) und Ausblenden durch Mods,
-- das der Ersteller nicht selbst rückgängig machen kann.

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "approvalNote" TEXT;
ALTER TABLE "Event" ADD COLUMN "hiddenByModAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EventSeries" ADD COLUMN "approvalNote" TEXT;
ALTER TABLE "EventSeries" ADD COLUMN "hiddenByModAt" TIMESTAMP(3);
