-- Spieleliste: Steam-Preise/Rabatte und Abos (Game Pass & Co.).
-- Rein additiv — kann jederzeit (auch mehrfach) ausgeführt werden.

ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "priceCents" INTEGER;
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "priceInitialCents" INTEGER;
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "discountPercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "priceCurrency" TEXT;
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "priceUpdatedAt" TIMESTAMP(3);
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "saleStartedAt" TIMESTAMP(3);
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "subscriptions" TEXT[] DEFAULT ARRAY[]::TEXT[];
