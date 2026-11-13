-- ============================================
-- Spieleliste-Swipen: alte Markierungen übernehmen ("Hab ich" / "Würde ich zocken" → "Am Start")
-- ============================================
-- Die neuen Spalten ("GameReaction".status/"decidedAt"/"firstDecidedAt", "Game"."inCount"/"wishCount")
-- legt der Production-Build selbst an (rein additiv, siehe prisma/schema.prisma). Dieses Skript übernimmt
-- danach die alten Markierungen und berechnet die Zähler neu.
--
-- REIHENFOLGE:
--   1. Deployen (legt die Spalten an).
--   2. Dieses Skript im Supabase SQL-Editor ausführen (kompletter Block).
--
-- Bis dahin zählt die App alte Markierungen ohne Status ohnehin als "Am Start" (lib/games/swipe.ts,
-- effectiveStatus) — nur die Zähler auf den Spielen stehen bis zum Skript auf 0.
--
-- Entscheidung: Wer "Hab ich" ODER "Würde ich zocken" gesetzt hatte, ist "Am Start". Die 6-Monats-Frist,
-- nach der der Stapel erneut fragt, beginnt mit der Übernahme. Die Monats-Quest zählt übernommene
-- Spiele nicht (firstDecidedAt ist gesetzt).
--
-- Idempotent: mehrfaches Ausführen ist unproblematisch.

BEGIN;

UPDATE "GameReaction"
SET "status" = 'in',
    "decidedAt" = now(),
    "firstDecidedAt" = COALESCE("firstDecidedAt", "createdAt"),
    "owns" = false,
    "wantPlay" = false
WHERE "status" IS NULL
  AND ("owns" = true OR "wantPlay" = true);

UPDATE "Game" g
SET "inCount"   = (SELECT count(*) FROM "GameReaction" r WHERE r."gameId" = g."id" AND r."status" = 'in'),
    "wishCount" = (SELECT count(*) FROM "GameReaction" r WHERE r."gameId" = g."id" AND r."status" = 'wish');

COMMIT;

-- Kontrolle (soll 0 liefern):
--   SELECT count(*) FROM "GameReaction" WHERE "status" IS NULL AND ("owns" OR "wantPlay");
