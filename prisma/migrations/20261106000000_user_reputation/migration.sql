-- Offene Community-Jobs, Phase 3: Ansehen pro User (statt pro Job-Mitgliedschaft).
-- Alle starten bei Stufe 1; der wöchentliche Cron berechnet die Stufe aus allen Jobs + Kommentar-Daumen.
ALTER TABLE "User" ADD COLUMN "reputationLevel" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "User" ADD COLUMN "reputationPeakLevel" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "User" ADD COLUMN "reputationPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "reputationOverrideUntil" TIMESTAMP(3);
