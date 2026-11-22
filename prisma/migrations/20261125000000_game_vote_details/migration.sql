-- Spielwahl: wie entschieden wurde, Erinnerung vor dem Ende
ALTER TABLE "GameVote" ADD COLUMN "decidedBy" TEXT;
ALTER TABLE "GameVote" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
