-- Terminplanung von Eventreihen (lib/series-schedule.ts): Ablaufart "termine" | "runden" an der Reihe,
-- Soll-Platz in der Regel am Termin. Alte Reihen behalten recurrenceType/cycleConfigJson, bis sie in
-- den Reihen-Einstellungen umgestellt werden.

-- AlterTable
ALTER TABLE "EventSeries" ADD COLUMN "scheduleMode" TEXT;
ALTER TABLE "EventSeries" ADD COLUMN "scheduleJson" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "slotIndex" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Event_seriesId_slotIndex_key" ON "Event"("seriesId", "slotIndex");
