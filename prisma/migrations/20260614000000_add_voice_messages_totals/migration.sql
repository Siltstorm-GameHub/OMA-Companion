-- Neue Felder für kumulierte Discord-Aktivität
ALTER TABLE "User" ADD COLUMN "voiceMinutesTotal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "messagesTotal"     INTEGER NOT NULL DEFAULT 0;

-- Backfill: Annäherung aus bestehenden PointTransactions
-- VOICE_HOUR = 1 Stunde = 60 Minuten
UPDATE "User" u SET "voiceMinutesTotal" = (
  SELECT COALESCE(COUNT(*), 0) * 60
  FROM "PointTransaction" pt
  WHERE pt."userId" = u.id AND pt.reason LIKE '%Sprachkanal%'
);
-- MESSAGE_10 = 10 Nachrichten
UPDATE "User" u SET "messagesTotal" = (
  SELECT COALESCE(COUNT(*), 0) * 10
  FROM "PointTransaction" pt
  WHERE pt."userId" = u.id AND pt.reason LIKE '%Nachrichten%'
);
