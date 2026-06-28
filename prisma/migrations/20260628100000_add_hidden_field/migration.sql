-- AlterTable: Add hidden field to Event
ALTER TABLE "Event" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add hidden field to EventSeries
ALTER TABLE "EventSeries" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
