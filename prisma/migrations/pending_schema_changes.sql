-- Ausstehende Schema-Änderungen
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard → SQL Editor

-- 1. User: Gruß / Bio
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;

-- 2. CollectibleItem: aktiv/inaktiv Toggle
ALTER TABLE "CollectibleItem" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- 3. CollectibleItem: zeitlich begrenzter Sale
ALTER TABLE "CollectibleItem" ADD COLUMN IF NOT EXISTS "salePrice" INTEGER;
ALTER TABLE "CollectibleItem" ADD COLUMN IF NOT EXISTS "saleUntil" TIMESTAMP(3);
