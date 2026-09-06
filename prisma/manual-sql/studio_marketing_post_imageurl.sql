-- Studio-Feature: Marketing Manager kann jetzt eine eigene, im Studio erstellte
-- Grafik direkt an einen Werbe-Post anhängen (statt nur ein bestehendes
-- Fotograf-Bild aus der Mediathek wiederzuverwenden). Idempotent — überspringt
-- die Spalte, falls sie (z.B. durch ein Deploy mit `prisma db push`) bereits existiert.
ALTER TABLE "MarketingPost" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
