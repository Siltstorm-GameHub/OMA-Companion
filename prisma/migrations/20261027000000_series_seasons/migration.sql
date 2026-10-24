-- Saisons: Stat-Aliase für die All-Time-Tabelle, Turniervorlage der Reihe

-- AlterTable
ALTER TABLE "EventSeries" ADD COLUMN "statAliasesJson" TEXT;
ALTER TABLE "EventSeries" ADD COLUMN "tournamentTemplateJson" TEXT;
