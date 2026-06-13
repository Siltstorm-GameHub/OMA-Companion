-- AlterTable EventSeries: add seriesStandingsJson
ALTER TABLE "EventSeries" ADD COLUMN "seriesStandingsJson" TEXT;

-- AlterTable Event: add completionData
ALTER TABLE "Event" ADD COLUMN "completionData" TEXT;
