-- Add customAnswers and allowMultiselect to PollJob
ALTER TABLE "PollJob" ADD COLUMN IF NOT EXISTS "customAnswers"    TEXT[]   NOT NULL DEFAULT '{}';
ALTER TABLE "PollJob" ADD COLUMN IF NOT EXISTS "allowMultiselect" BOOLEAN  NOT NULL DEFAULT false;
