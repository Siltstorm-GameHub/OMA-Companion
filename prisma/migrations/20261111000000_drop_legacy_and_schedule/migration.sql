-- Aufräumen nach der Zusammenlegung zum Content Creator + zeitgesteuertes Veröffentlichen.
-- Achtung: löscht die Archiv-Tabellen endgültig (Werbe-Posts samt Daumen, Daumen auf einzelne Bilder,
-- alte Job-Mitgliedschaften und Bewerbungen). Alle Inhalte wurden zuvor zu Beiträgen migriert.

-- Zeitgesteuertes Veröffentlichen von Entwürfen (Kampagnen-Schritte u.a.)
ALTER TABLE "JobReport" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "JobReport_scheduledAt_idx" ON "JobReport"("scheduledAt");

-- Verknüpfung "Bericht über Werbe-Post" entfällt (Werbe-Posts sind Beiträge)
ALTER TABLE "JobReport" DROP CONSTRAINT IF EXISTS "JobReport_referencedMarketingPostId_fkey";
ALTER TABLE "JobReport" DROP COLUMN IF EXISTS "referencedMarketingPostId";

-- Kommentare, die noch an alten Einzelbildern/Werbe-Posts hängen (sollten nach der Migration keine mehr sein)
DELETE FROM "CommunityBoardComment" WHERE "entityType" IN ('asset', 'marketing_post');

-- Archiv-Tabellen
DROP TABLE IF EXISTS "MarketingPostVote";
DROP TABLE IF EXISTS "MarketingPost";
DROP TABLE IF EXISTS "JobMediaAssetVote";
DROP TABLE IF EXISTS "CommunityJobApplication";
DROP TABLE IF EXISTS "CommunityJobMember";
