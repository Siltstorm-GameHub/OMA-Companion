-- CreateTable
CREATE TABLE "MatchResultSubmission" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score1" INTEGER,
    "score2" INTEGER,
    "placement" INTEGER,
    "score" INTEGER,
    "statsJson" TEXT,
    "note" TEXT,
    "screenshotUrls" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "originalJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchResultSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchResultSubmission_matchId_userId_key" ON "MatchResultSubmission"("matchId", "userId");

-- CreateIndex
CREATE INDEX "MatchResultSubmission_eventId_status_idx" ON "MatchResultSubmission"("eventId", "status");

-- AddForeignKey
ALTER TABLE "MatchResultSubmission" ADD CONSTRAINT "MatchResultSubmission_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResultSubmission" ADD CONSTRAINT "MatchResultSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
