-- Offene Community-Jobs (Phase 1+2): jeder User darf alle Jobs ausüben, keine Mitgliedschaft mehr nötig.
-- Tageslimit: nur die ersten N Beiträge pro Berliner Tag (über alle Jobs) zählen fürs Gehalt.

-- Kennzeichen je Inhalt, ob er innerhalb des Tageslimits eingereicht wurde (Bestand zählt weiter).
ALTER TABLE "JobReport" ADD COLUMN "countsForScore" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "JobReportContribution" ADD COLUMN "countsForScore" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "JobMediaAsset" ADD COLUMN "countsForScore" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MarketingPost" ADD COLUMN "countsForScore" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CoachTrainingSession" ADD COLUMN "countsForScore" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CoachGuide" ADD COLUMN "countsForScore" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CommunityIdea" ADD COLUMN "countsForScore" BOOLEAN NOT NULL DEFAULT true;

-- Coach-Verfügbarkeit/Spezialgebiete wandern von der Mitgliedschaft auf den User.
ALTER TABLE "User" ADD COLUMN "coachAvailableUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "coachSpecialties" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "User" u
SET "coachSpecialties" = m."specialties"
FROM (
  SELECT DISTINCT ON ("userId") "userId", "specialties"
  FROM "CommunityJobMember"
  WHERE "jobKey" = 'coach' AND cardinality("specialties") > 0
  ORDER BY "userId", "assignedAt" DESC
) m
WHERE u."id" = m."userId";

-- Beitrags-Ledger fürs Tageslimit
CREATE TABLE "CommunityJobContribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entityIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "counted" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityJobContribution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunityJobContribution_userId_createdAt_idx" ON "CommunityJobContribution"("userId", "createdAt");
CREATE INDEX "CommunityJobContribution_jobKey_createdAt_idx" ON "CommunityJobContribution"("jobKey", "createdAt");

ALTER TABLE "CommunityJobContribution" ADD CONSTRAINT "CommunityJobContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
