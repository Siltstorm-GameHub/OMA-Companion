-- Community-Jobs: alle neuen Tabellen aus dieser Implementierung
-- (Bewerbung/Mitgliedschaft/Gehalt, Journalist, Fotograf, Marketing Manager,
-- Coach/Manager, Visionär). Generiert per `prisma migrate diff` zwischen dem
-- Schema-Stand vor und nach dieser Implementierung — rein additiv, keine
-- DROP/ALTER an bestehenden Tabellen, keine Datenverluste.
--
-- Anwendung in Supabase: SQL-Editor im Dashboard öffnen, dieses Skript
-- einfügen und ausführen (läuft als eine Transaktion). Alternativ per psql:
--   psql "$DATABASE_URL" -f community_jobs_migration.sql
-- Danach `npx prisma generate` lokal/im Build laufen lassen, damit der
-- Prisma-Client die neuen Modelle kennt (macht der bestehende
-- `npm run build`-Schritt ohnehin automatisch).
--
-- WICHTIG: Vorher ein Backup/Snapshot der Datenbank ziehen, wie vor jeder
-- Schema-Änderung an einer produktiven Datenbank üblich.

-- CreateTable
CREATE TABLE "CommunityJobApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "CommunityJobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityJobMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractStartAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractEndAt" TIMESTAMP(3) NOT NULL,
    "renewedAt" TIMESTAMP(3),
    "warnedAt" TIMESTAMP(3),
    "warningReason" TEXT,
    "revokedAt" TIMESTAMP(3),
    "reapplyBlockedUntil" TIMESTAMP(3),
    "lastContributionAt" TIMESTAMP(3),
    "handedOffFromUserId" TEXT,

    CONSTRAINT "CommunityJobMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityJobWeeklyPayout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "rawScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tierLabel" TEXT,
    "baseCoins" INTEGER NOT NULL DEFAULT 0,
    "voteBonusMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "coinsAwarded" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityJobWeeklyPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobReport" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "eventId" TEXT,
    "title" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "coverAssetId" TEXT,
    "referencedMarketingPostId" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hiddenByAdminAt" TIMESTAMP(3),
    "hiddenReason" TEXT,
    "discordMessageId" TEXT,

    CONSTRAINT "JobReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobReportVote" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "disputeReason" TEXT,
    "disputeResolution" TEXT,
    "disputeResolvedById" TEXT,

    CONSTRAINT "JobReportVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobReportContribution" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "disputeReason" TEXT,
    "disputeResolution" TEXT,
    "disputeResolvedById" TEXT,

    CONSTRAINT "JobReportContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobReportContributionVote" (
    "id" TEXT NOT NULL,
    "contributionId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "disputeReason" TEXT,
    "disputeResolution" TEXT,
    "disputeResolvedById" TEXT,

    CONSTRAINT "JobReportContributionVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobMediaAsset" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "eventId" TEXT,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "hiddenByAdminAt" TIMESTAMP(3),
    "hiddenReason" TEXT,
    "discordMessageId" TEXT,

    CONSTRAINT "JobMediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobMediaAssetVote" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "disputeReason" TEXT,
    "disputeResolution" TEXT,
    "disputeResolvedById" TEXT,

    CONSTRAINT "JobMediaAssetVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "assetId" TEXT,
    "caption" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminConfirmedPosted" BOOLEAN NOT NULL DEFAULT false,
    "hiddenByAdminAt" TIMESTAMP(3),
    "hiddenReason" TEXT,
    "discordMessageId" TEXT,

    CONSTRAINT "MarketingPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingPostVote" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "disputeReason" TEXT,
    "disputeResolution" TEXT,
    "disputeResolvedById" TEXT,

    CONSTRAINT "MarketingPostVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachTrainingSession" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachTrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachTrainingSignup" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachTrainingSignup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachRating" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "trainingSessionId" TEXT,
    "stars" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "disputeReason" TEXT,
    "disputeResolution" TEXT,
    "disputeResolvedById" TEXT,

    CONSTRAINT "CoachRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityIdea" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "votingEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hiddenByAdminAt" TIMESTAMP(3),
    "hiddenReason" TEXT,
    "discordMessageId" TEXT,

    CONSTRAINT "CommunityIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityIdeaVote" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "disputeReason" TEXT,
    "disputeResolution" TEXT,
    "disputeResolvedById" TEXT,

    CONSTRAINT "CommunityIdeaVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityJobApplication_jobKey_status_idx" ON "CommunityJobApplication"("jobKey", "status");

-- CreateIndex
CREATE INDEX "CommunityJobApplication_userId_idx" ON "CommunityJobApplication"("userId");

-- CreateIndex
CREATE INDEX "CommunityJobMember_userId_jobKey_idx" ON "CommunityJobMember"("userId", "jobKey");

-- CreateIndex
CREATE INDEX "CommunityJobMember_jobKey_status_idx" ON "CommunityJobMember"("jobKey", "status");

-- CreateIndex
CREATE INDEX "CommunityJobWeeklyPayout_jobKey_weekStart_idx" ON "CommunityJobWeeklyPayout"("jobKey", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityJobWeeklyPayout_userId_jobKey_weekStart_key" ON "CommunityJobWeeklyPayout"("userId", "jobKey", "weekStart");

-- CreateIndex
CREATE INDEX "JobReport_eventId_idx" ON "JobReport"("eventId");

-- CreateIndex
CREATE INDEX "JobReport_authorId_idx" ON "JobReport"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "JobReportVote_reportId_voterId_key" ON "JobReportVote"("reportId", "voterId");

-- CreateIndex
CREATE INDEX "JobReportContribution_reportId_idx" ON "JobReportContribution"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "JobReportContributionVote_contributionId_voterId_key" ON "JobReportContributionVote"("contributionId", "voterId");

-- CreateIndex
CREATE INDEX "JobMediaAsset_eventId_idx" ON "JobMediaAsset"("eventId");

-- CreateIndex
CREATE INDEX "JobMediaAsset_authorId_idx" ON "JobMediaAsset"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "JobMediaAssetVote_assetId_voterId_key" ON "JobMediaAssetVote"("assetId", "voterId");

-- CreateIndex
CREATE INDEX "MarketingPost_eventId_idx" ON "MarketingPost"("eventId");

-- CreateIndex
CREATE INDEX "MarketingPost_authorId_idx" ON "MarketingPost"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingPostVote_postId_voterId_key" ON "MarketingPostVote"("postId", "voterId");

-- CreateIndex
CREATE INDEX "CoachTrainingSession_coachId_idx" ON "CoachTrainingSession"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachTrainingSignup_sessionId_userId_key" ON "CoachTrainingSignup"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "CoachRating_coachId_idx" ON "CoachRating"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachRating_coachId_raterId_trainingSessionId_key" ON "CoachRating"("coachId", "raterId", "trainingSessionId");

-- CreateIndex
CREATE INDEX "CommunityIdea_authorId_idx" ON "CommunityIdea"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityIdeaVote_ideaId_voterId_key" ON "CommunityIdeaVote"("ideaId", "voterId");

-- AddForeignKey
ALTER TABLE "CommunityJobApplication" ADD CONSTRAINT "CommunityJobApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityJobApplication" ADD CONSTRAINT "CommunityJobApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityJobMember" ADD CONSTRAINT "CommunityJobMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityJobWeeklyPayout" ADD CONSTRAINT "CommunityJobWeeklyPayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReport" ADD CONSTRAINT "JobReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReport" ADD CONSTRAINT "JobReport_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReport" ADD CONSTRAINT "JobReport_coverAssetId_fkey" FOREIGN KEY ("coverAssetId") REFERENCES "JobMediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReport" ADD CONSTRAINT "JobReport_referencedMarketingPostId_fkey" FOREIGN KEY ("referencedMarketingPostId") REFERENCES "MarketingPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReportVote" ADD CONSTRAINT "JobReportVote_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "JobReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReportVote" ADD CONSTRAINT "JobReportVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReportContribution" ADD CONSTRAINT "JobReportContribution_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "JobReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReportContribution" ADD CONSTRAINT "JobReportContribution_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReportContributionVote" ADD CONSTRAINT "JobReportContributionVote_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "JobReportContribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReportContributionVote" ADD CONSTRAINT "JobReportContributionVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMediaAsset" ADD CONSTRAINT "JobMediaAsset_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMediaAsset" ADD CONSTRAINT "JobMediaAsset_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMediaAssetVote" ADD CONSTRAINT "JobMediaAssetVote_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "JobMediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMediaAssetVote" ADD CONSTRAINT "JobMediaAssetVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingPost" ADD CONSTRAINT "MarketingPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingPost" ADD CONSTRAINT "MarketingPost_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingPost" ADD CONSTRAINT "MarketingPost_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "JobMediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingPostVote" ADD CONSTRAINT "MarketingPostVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "MarketingPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingPostVote" ADD CONSTRAINT "MarketingPostVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachTrainingSession" ADD CONSTRAINT "CoachTrainingSession_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachTrainingSignup" ADD CONSTRAINT "CoachTrainingSignup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CoachTrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachTrainingSignup" ADD CONSTRAINT "CoachTrainingSignup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachRating" ADD CONSTRAINT "CoachRating_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachRating" ADD CONSTRAINT "CoachRating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachRating" ADD CONSTRAINT "CoachRating_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "CoachTrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityIdea" ADD CONSTRAINT "CommunityIdea_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityIdeaVote" ADD CONSTRAINT "CommunityIdeaVote_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "CommunityIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityIdeaVote" ADD CONSTRAINT "CommunityIdeaVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

