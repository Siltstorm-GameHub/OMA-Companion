-- Content Creator: Berichte, Fotos/Clips und Werbe-Posts werden zu EINEM "Beitrag" (Tabelle JobReport).
-- Ein Beitrag hat Text, beliebig viele Bilder/Clips (JobMediaAsset.reportId), optional ein Event, eine
-- Werbe-Vorlage, eine Kampagne oder einen beworbenen Trainings-Termin.
-- Bestehende Werbe-Posts und Foto-Uploads werden zu Beiträgen umgewandelt (inkl. Daumen und Kommentare).
-- Die Tabellen MarketingPost, MarketingPostVote und JobMediaAssetVote bleiben als Archiv erhalten.

-- ── Neue Spalten ────────────────────────────────────────────────────────────
ALTER TABLE "JobReport" ALTER COLUMN "title" SET DEFAULT '';
ALTER TABLE "JobReport" ADD COLUMN IF NOT EXISTS "template" TEXT;
ALTER TABLE "JobReport" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE "JobReport" ADD COLUMN IF NOT EXISTS "trainingSessionId" TEXT;
ALTER TABLE "JobReport" ADD COLUMN IF NOT EXISTS "adminConfirmedPosted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "JobReport" ADD COLUMN IF NOT EXISTS "confirmedNotified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "JobReport" ADD COLUMN IF NOT EXISTS "legacyType" TEXT;
ALTER TABLE "JobReport" ADD COLUMN IF NOT EXISTS "legacyId" TEXT;

ALTER TABLE "JobMediaAsset" ADD COLUMN IF NOT EXISTS "reportId" TEXT;
ALTER TABLE "JobMediaAsset" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "JobReport_campaignId_idx" ON "JobReport"("campaignId");
CREATE INDEX IF NOT EXISTS "JobReport_legacyId_idx" ON "JobReport"("legacyId");
CREATE INDEX IF NOT EXISTS "JobMediaAsset_reportId_idx" ON "JobMediaAsset"("reportId");

DO $$ BEGIN
  ALTER TABLE "JobReport" ADD CONSTRAINT "JobReport_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "JobMediaAsset" ADD CONSTRAINT "JobMediaAsset_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "JobReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 1) Werbe-Posts → Beiträge (ID "mp_" + alte ID) ─────────────────────────
-- Bild: Spiel-Cover → gameCoverUrl, eigenes Bild (Upload/Studio) → neues Medium im Beitrag, Mediathek-Bild → Titelbild.
INSERT INTO "JobReport" (
  "id", "authorId", "eventId", "title", "bodyMarkdown", "coverAssetId", "publishedAt", "hiddenByAdminAt", "hiddenReason",
  "countsForScore", "discordMessageId", "isDraft", "gameCoverUrl", "template", "campaignId", "trainingSessionId",
  "adminConfirmedPosted", "confirmedNotified", "legacyType", "legacyId", "updatedAt"
)
SELECT
  'mp_' || p."id", p."authorId", p."eventId", '', p."caption", p."assetId", p."createdAt", p."hiddenByAdminAt", p."hiddenReason",
  p."countsForScore", p."discordMessageId", false,
  CASE WHEN p."imageUrl" ~ '^https://(([a-z0-9-]+\.)*steamstatic\.com|bnetcmsus-a\.akamaihd\.net|cdn1\.epicgames\.com|cdn2\.unrealengine\.com|www\.minecraft\.net|store-images\.s-microsoft\.com)/'
       THEN p."imageUrl" END,
  p."kind", p."campaignId", p."trainingSessionId",
  p."adminConfirmedPosted", p."confirmedNotified", 'marketing_post', p."id", p."createdAt"
FROM "MarketingPost" p
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "JobMediaAsset" ("id", "authorId", "eventId", "type", "url", "createdAt", "hiddenByAdminAt", "countsForScore", "reportId", "position")
SELECT 'mpimg_' || p."id", p."authorId", p."eventId", 'GRAPHIC', p."imageUrl", p."createdAt", p."hiddenByAdminAt", p."countsForScore", 'mp_' || p."id", 0
FROM "MarketingPost" p
WHERE p."imageUrl" IS NOT NULL
  AND p."imageUrl" !~ '^https://(([a-z0-9-]+\.)*steamstatic\.com|bnetcmsus-a\.akamaihd\.net|cdn1\.epicgames\.com|cdn2\.unrealengine\.com|www\.minecraft\.net|store-images\.s-microsoft\.com)/'
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "JobReportVote" ("id", "reportId", "voterId", "createdAt", "disputed", "disputeReason", "disputeResolution", "disputeResolvedById")
SELECT 'mpv_' || v."id", 'mp_' || v."postId", v."voterId", v."createdAt", v."disputed", v."disputeReason", v."disputeResolution", v."disputeResolvedById"
FROM "MarketingPostVote" v
ON CONFLICT DO NOTHING;

UPDATE "CommunityBoardComment" SET "entityType" = 'report', "entityId" = 'mp_' || "entityId"
WHERE "entityType" = 'marketing_post';

-- Erfüllte Werbe-Anfragen von Coaches zeigen jetzt auf den Beitrag.
UPDATE "PromotionRequest" SET "postId" = 'mp_' || "postId"
WHERE "postId" IS NOT NULL AND "postId" NOT LIKE 'mp\_%';

-- ── 2) Foto-/Clip-Uploads → Beiträge (ID "ma_" + erstes Bild der Gruppe) ─────
-- Ein Mehrfach-Upload (gleicher Autor, gleiches Album/Event, gleiche Minute) wird EIN Beitrag.
-- Ohne Hilfstabelle: jede Anweisung berechnet die Gruppen selbst (läuft so auch im Supabase SQL-Editor).

-- 2a) Beiträge anlegen
WITH g AS (
  SELECT
    a."id",
    first_value(a."id") OVER w AS "gid",
    (row_number() OVER w) - 1 AS "pos"
  FROM "JobMediaAsset" a
  WHERE a."reportId" IS NULL
  WINDOW w AS (
    PARTITION BY a."authorId", COALESCE(a."albumId", ''), COALESCE(a."eventId", ''), date_trunc('minute', a."createdAt")
    ORDER BY a."createdAt", a."id"
  )
)
INSERT INTO "JobReport" (
  "id", "authorId", "eventId", "title", "bodyMarkdown", "publishedAt", "hiddenByAdminAt", "countsForScore",
  "discordMessageId", "isDraft", "legacyType", "legacyId", "updatedAt"
)
SELECT
  'ma_' || g."gid",
  min(a."authorId"),
  min(a."eventId"),
  '',
  COALESCE(string_agg(NULLIF(trim(a."caption"), ''), E'\n' ORDER BY g."pos"), ''),
  min(a."createdAt"),
  CASE WHEN bool_and(a."hiddenByAdminAt" IS NOT NULL) THEN max(a."hiddenByAdminAt") END,
  bool_or(a."countsForScore"),
  max(a."discordMessageId"),
  false, 'asset_upload', g."gid", min(a."createdAt")
FROM g
JOIN "JobMediaAsset" a ON a."id" = g."id"
GROUP BY g."gid"
ON CONFLICT ("id") DO NOTHING;

-- 2b) Bilder/Clips ihrem Beitrag zuordnen (gleiche Gruppierung wie oben)
WITH g AS (
  SELECT
    a."id",
    first_value(a."id") OVER w AS "gid",
    (row_number() OVER w) - 1 AS "pos"
  FROM "JobMediaAsset" a
  WHERE a."reportId" IS NULL
  WINDOW w AS (
    PARTITION BY a."authorId", COALESCE(a."albumId", ''), COALESCE(a."eventId", ''), date_trunc('minute', a."createdAt")
    ORDER BY a."createdAt", a."id"
  )
)
UPDATE "JobMediaAsset" a SET "reportId" = 'ma_' || g."gid", "position" = g."pos"
FROM g
WHERE a."id" = g."id";

-- 2c) Daumen auf einzelne Bilder → Daumen auf den Beitrag (je Person höchstens einer, der früheste zählt)
INSERT INTO "JobReportVote" ("id", "reportId", "voterId", "createdAt", "disputed", "disputeReason", "disputeResolution", "disputeResolvedById")
SELECT DISTINCT ON (a."reportId", v."voterId")
  'mav_' || v."id", a."reportId", v."voterId", v."createdAt", v."disputed", v."disputeReason", v."disputeResolution", v."disputeResolvedById"
FROM "JobMediaAssetVote" v
JOIN "JobMediaAsset" a ON a."id" = v."assetId"
WHERE a."reportId" LIKE 'ma\_%'
ORDER BY a."reportId", v."voterId", v."createdAt"
ON CONFLICT DO NOTHING;

-- 2d) Kommentare zu einzelnen Bildern → Kommentare zum Beitrag
UPDATE "CommunityBoardComment" c SET "entityType" = 'report', "entityId" = a."reportId"
FROM "JobMediaAsset" a
WHERE c."entityType" = 'asset' AND c."entityId" = a."id" AND a."reportId" LIKE 'ma\_%';
