-- CreateTable: MonthlyClipContest
CREATE TABLE "MonthlyClipContest" (
  "id" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'voting',
  "rewardCoins" INTEGER NOT NULL DEFAULT 500,
  "winnerNominationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MonthlyClipContest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MonthlyClipContest_month_year_key" ON "MonthlyClipContest"("month", "year");

-- CreateTable: ClipNomination
CREATE TABLE "ClipNomination" (
  "id" TEXT NOT NULL,
  "contestId" TEXT NOT NULL,
  "clipUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "clipTitle" TEXT,
  "submittedByUserId" TEXT,
  "twitchCreatorLogin" TEXT,
  "partnerTwitchLogin" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClipNomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ClipContestVote
CREATE TABLE "ClipContestVote" (
  "id" TEXT NOT NULL,
  "contestId" TEXT NOT NULL,
  "nominationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClipContestVote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClipContestVote_contestId_userId_key" ON "ClipContestVote"("contestId", "userId");

-- AddForeignKey
ALTER TABLE "ClipNomination" ADD CONSTRAINT "ClipNomination_contestId_fkey"
  FOREIGN KEY ("contestId") REFERENCES "MonthlyClipContest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClipNomination" ADD CONSTRAINT "ClipNomination_submittedByUserId_fkey"
  FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClipContestVote" ADD CONSTRAINT "ClipContestVote_contestId_fkey"
  FOREIGN KEY ("contestId") REFERENCES "MonthlyClipContest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClipContestVote" ADD CONSTRAINT "ClipContestVote_nominationId_fkey"
  FOREIGN KEY ("nominationId") REFERENCES "ClipNomination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClipContestVote" ADD CONSTRAINT "ClipContestVote_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
