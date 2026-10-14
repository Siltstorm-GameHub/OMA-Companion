-- AlterTable
ALTER TABLE "Match" ADD COLUMN "resultConfirmed" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "MatchResultSubmission" ADD COLUMN "applied" BOOLEAN NOT NULL DEFAULT false;
