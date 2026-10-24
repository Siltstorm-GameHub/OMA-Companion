-- "Läuft gerade"-Status je Match und Änderungsprotokoll der Ergebnisse

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MatchResultLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorLabel" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchResultLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchResultLog_matchId_createdAt_idx" ON "MatchResultLog"("matchId", "createdAt");

-- AddForeignKey
ALTER TABLE "MatchResultLog" ADD CONSTRAINT "MatchResultLog_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
