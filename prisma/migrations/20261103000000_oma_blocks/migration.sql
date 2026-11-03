-- CreateTable
CREATE TABLE "BlocksRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "season" TEXT,
    "score" INTEGER,
    "lines" INTEGER,
    "level" INTEGER,
    "pieces" INTEGER,
    "frames" INTEGER,

    CONSTRAINT "BlocksRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlocksBest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "lines" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "runId" TEXT NOT NULL,
    "reachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlocksBest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlocksSeason" (
    "season" TEXT NOT NULL,
    "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rankingJson" TEXT NOT NULL,

    CONSTRAINT "BlocksSeason_pkey" PRIMARY KEY ("season")
);

-- CreateTable
CREATE TABLE "BlocksMatch" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "season" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "winnerId" TEXT,

    CONSTRAINT "BlocksMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlocksMatchPlayer" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "place" INTEGER NOT NULL,

    CONSTRAINT "BlocksMatchPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlocksRun_userId_createdAt_idx" ON "BlocksRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BlocksRun_finishedAt_idx" ON "BlocksRun"("finishedAt");

-- CreateIndex
CREATE INDEX "BlocksBest_season_score_idx" ON "BlocksBest"("season", "score");

-- CreateIndex
CREATE UNIQUE INDEX "BlocksBest_userId_season_key" ON "BlocksBest"("userId", "season");

-- CreateIndex
CREATE INDEX "BlocksMatch_season_idx" ON "BlocksMatch"("season");

-- CreateIndex
CREATE UNIQUE INDEX "BlocksMatch_roomCode_round_startedAt_key" ON "BlocksMatch"("roomCode", "round", "startedAt");

-- CreateIndex
CREATE INDEX "BlocksMatchPlayer_userId_idx" ON "BlocksMatchPlayer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BlocksMatchPlayer_matchId_userId_key" ON "BlocksMatchPlayer"("matchId", "userId");

-- AddForeignKey
ALTER TABLE "BlocksRun" ADD CONSTRAINT "BlocksRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlocksBest" ADD CONSTRAINT "BlocksBest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlocksMatchPlayer" ADD CONSTRAINT "BlocksMatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "BlocksMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlocksMatchPlayer" ADD CONSTRAINT "BlocksMatchPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

