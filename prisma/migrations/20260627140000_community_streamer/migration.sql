-- Add userId link to Partner (one-to-one optional)
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "userId" TEXT UNIQUE;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Partner_userId_fkey' AND table_name = 'Partner'
  ) THEN
    ALTER TABLE "Partner" ADD CONSTRAINT "Partner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Create EventCommunityStreamer table
CREATE TABLE IF NOT EXISTS "EventCommunityStreamer" (
  "id"        TEXT NOT NULL,
  "eventId"   TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventCommunityStreamer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EventCommunityStreamer_eventId_userId_key" UNIQUE ("eventId", "userId"),
  CONSTRAINT "EventCommunityStreamer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EventCommunityStreamer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
