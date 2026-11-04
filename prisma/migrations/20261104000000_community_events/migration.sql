-- Community-Events: normale User dürfen Events und Eventreihen anlegen.
-- createdById = Ersteller (verwaltet das Event), approvalStatus = Mod-Freigabe für Discord/Push.

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Event" ADD COLUMN "approvalStatus" TEXT;

-- AlterTable
ALTER TABLE "EventSeries" ADD COLUMN "createdById" TEXT;
ALTER TABLE "EventSeries" ADD COLUMN "approvalStatus" TEXT;

-- CreateIndex
CREATE INDEX "Event_createdById_idx" ON "Event"("createdById");
CREATE INDEX "EventSeries_createdById_idx" ON "EventSeries"("createdById");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventSeries" ADD CONSTRAINT "EventSeries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
