-- AddColumn: rankPoints für Prestige-Punkte (Events, Turniere, LuL)
ALTER TABLE "User" ADD COLUMN "rankPoints" INTEGER NOT NULL DEFAULT 0;

-- Backfill: LuL-Punkte aus allen LulEntry-Einträgen
UPDATE "User" u
SET "rankPoints" = COALESCE((
  SELECT SUM(le."lulPoints")
  FROM "LulEntry" le
  WHERE le."userId" = u.id
), 0);

-- Backfill: Turnier- und Event-Punkte aus PointTransaction
UPDATE "User" u
SET "rankPoints" = u."rankPoints" + COALESCE((
  SELECT SUM(pt.amount)
  FROM "PointTransaction" pt
  WHERE pt."userId" = u.id
    AND (
      pt.reason LIKE '%Turnier%'
      OR pt.reason LIKE '%Liga-Match%'
      OR pt.reason LIKE '%Platz%'
      OR pt.reason LIKE '%Event besucht%'
      OR pt.reason LIKE '%Event organisiert%'
      OR pt.reason LIKE '%Match gewonnen%'
    )
), 0);
