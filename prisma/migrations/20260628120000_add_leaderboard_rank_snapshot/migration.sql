-- CreateTable
CREATE TABLE "LeaderboardRankSnapshot" (
    "id" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataJson" TEXT NOT NULL,

    CONSTRAINT "LeaderboardRankSnapshot_pkey" PRIMARY KEY ("id")
);
