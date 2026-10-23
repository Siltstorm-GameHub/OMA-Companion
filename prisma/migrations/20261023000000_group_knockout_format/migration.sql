-- Turnierformat "group_knockout" (Gruppenphase + K.O.-Runde)

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "groupStageJson" TEXT;

-- AlterTable
ALTER TABLE "TournamentParticipant" ADD COLUMN "groupIndex" INTEGER;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "groupIndex" INTEGER;
