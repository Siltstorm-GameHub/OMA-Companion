ALTER TABLE "CollectibleCollection" ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT;
ALTER TABLE "CollectibleItem"       ADD COLUMN IF NOT EXISTS "imageUrl"      TEXT;

-- Alte Emoji-Spalten entfernen (nicht mehr benötigt)
ALTER TABLE "CollectibleCollection" DROP COLUMN IF EXISTS "coverEmoji";
ALTER TABLE "CollectibleItem"       DROP COLUMN IF EXISTS "emoji";
