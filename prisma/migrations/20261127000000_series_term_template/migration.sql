-- Termin-Vorlage einer Reihe (lib/series-term-template.ts): Einstellungen, die jeder neue Termin übernimmt.

-- AlterTable
ALTER TABLE "EventSeries" ADD COLUMN "termTemplateJson" TEXT;
