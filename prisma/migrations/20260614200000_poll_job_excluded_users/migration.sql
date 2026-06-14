-- Add excludedUserIds array to PollJob
ALTER TABLE "PollJob" ADD COLUMN IF NOT EXISTS "excludedUserIds" TEXT[] NOT NULL DEFAULT '{}';
