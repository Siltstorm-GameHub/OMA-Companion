-- Journalist, Fotograf und Marketing Manager sind zum Job "content_creator" zusammengelegt.
-- Ältere Wochengehälter (CommunityJobWeeklyPayout) behalten bewusst ihren alten Job-Schlüssel (Historie).

-- Tageslimit-Ledger: Beiträge zählen ab jetzt für den Content Creator (Gehaltskandidaten, "zuletzt aktiv").
UPDATE "CommunityJobContribution"
SET "jobKey" = 'content_creator'
WHERE "jobKey" IN ('journalist', 'fotograf', 'marketing_manager');

-- Discord-Ankündigungskanal: der bisherige Journalisten-Kanal (sonst Fotograf, sonst Marketing) wird der Content-Creator-Kanal.
UPDATE "BotConfig"
SET "value" = (
  "value"::jsonb || jsonb_build_object('content_creator',
    COALESCE("value"::jsonb -> 'journalist', "value"::jsonb -> 'fotograf', "value"::jsonb -> 'marketing_manager'))
)::text
WHERE "key" = 'community_job_announcement_channels'
  AND NOT ("value"::jsonb ? 'content_creator')
  AND ("value"::jsonb ?| ARRAY['journalist', 'fotograf', 'marketing_manager']);
