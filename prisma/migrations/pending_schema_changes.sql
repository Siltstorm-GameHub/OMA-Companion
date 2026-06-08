-- Ausstehende Schema-Änderungen
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard → SQL Editor

-- 1. User: Gruß / Bio
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;

-- 2. CollectibleItem: aktiv/inaktiv Toggle
ALTER TABLE "CollectibleItem" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- 3. CollectibleItem: zeitlich begrenzter Sale
ALTER TABLE "CollectibleItem" ADD COLUMN IF NOT EXISTS "salePrice" INTEGER;
ALTER TABLE "CollectibleItem" ADD COLUMN IF NOT EXISTS "saleUntil" TIMESTAMP(3);

-- 4. Geplante Discord-Umfragen
CREATE TABLE IF NOT EXISTS "PollJob" (
  "id"          TEXT      NOT NULL PRIMARY KEY,
  "type"        TEXT      NOT NULL,
  "refId"       TEXT      NOT NULL,
  "channelId"   TEXT      NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "duration"    INTEGER   NOT NULL DEFAULT 168,
  "status"      TEXT      NOT NULL DEFAULT 'pending',
  "messageId"   TEXT,
  "errorMsg"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt"      TIMESTAMP(3)
);
